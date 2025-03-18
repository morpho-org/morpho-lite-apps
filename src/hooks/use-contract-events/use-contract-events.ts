import { keepPreviousData, QueryKey, useQueries, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  type EncodeEventTopicsParameters,
  type Abi,
  type BlockNumber,
  type BlockTag,
  type ContractEventName,
  type GetContractEventsParameters,
  type RpcLog,
  hexToBigInt,
  parseEventLogs,
  ParseEventLogsParameters,
} from "viem";
import { usePublicClient } from "wagmi";
import { useEffect, useMemo, useState } from "react";
import { useEIP1193Transports } from "@/hooks/use-contract-events/use-transports";
import { getRemainingSegments } from "@/hooks/use-contract-events/helpers";
import { getStrategyBasedOn, RequestStats } from "@/hooks/use-contract-events/strategy";
import { useBlockNumbers } from "@/hooks/use-contract-events/use-block-numbers";
import { getQueryFn } from "@/hooks/use-contract-events/query";
import { compareBigInts } from "@/lib/utils";
import { useDeepMemo } from "@/hooks/use-deep-memo";
import { usePing } from "@/hooks/use-contract-events/use-ping";

/**
 * 1. a. useState - {fromBlock: bigint, toBlockMax: bigint}[] **Order determines fetch order for queryFn within a given EventLoop**
 *    b. useState - Record<fromBlock, actualToBlock>
 * 2. useState that holds transport stats
 * 3. useMemo to compute optimal strategy given current transport stats -- this includes the wait time / backoff for each one, as well as best block range
 * 4. useEffect to schedule (setTimeout) updates to queue based on optimal strategy
 *    - update on: [toBlocks record, strategy]
 *    - if transport stats is undefined, that means we're still querying cache serially. only schedule ONE item, with fromBlock=previous.toBlock
 *    - if transport stats is defined
 *      - determine remaining ranges (including any gaps between existing ranges)
 *      - divide them up OPTIMISTICALLY based on transport stats / strategy
 *      - place fromBlocks on queue -- only specify toBlock if optimistic range is less than strategy's best block range
 *    - on change, make sure to `clearTimeout`
 * 5. useQueries similar to current hook, except queryKey contains only the fromBlock (NO TOBLOCK)
 *    - meta is { toBlockMax, transportStats } -- but note that toBlockMax may be undefined
 *    - queryFn should essentially always be successful. is starts fetching using optimal strategy, but falls back to lower block ranges if necessary
 *    - if toBlockMax is specified, it should be respected
 *    - return logs, new transport stats, and actualToBlock
 * 6. useEffect to update toBlocks record, and [iff isFetchedAfterMount] set new transport stats
 * 7. [OPTIONAL] once fetching is complete, could concatenate+compress to a single query, then garbage collect the other ones. Then on next page load the serial fetching would only take one render rather than many
 * 7. combine all logs, make sure they're sorted, and return
 *
 *
 * Mental model:
 * - While retrieving from cache, we expect only a single `fromBlock` to be fetched at once -- everything happens sequentially
 * - Once done with cache, scheduler lets us start fetching in parallel while also gradually improving our strategy.
 * - Allowing the scheduler to specify toBlockMax helps avoid duplicates when backfilling gaps
 * - Gaps can occur when the scheduler was too optimistic with either maxBlockRange or parallelism
 * - Scheduler can (optionally) have different modes for earliest->latest, latest->earliest, or random fetching order
 */

type FromBlockNumber = BlockNumber;
type ToBlockNumber = BlockNumber;
type QueryData = UseQueryResult<Awaited<ReturnType<ReturnType<typeof getQueryFn>>>, Error>["data"];

const REQUESTS_PER_BATCH = 33;
const MAX_REQUESTS_TO_TRACK = 512;

/**
 *
 * Wraps around `publicClient.getContractEvents`
 * @param args Arguments to pass through to `publicClient.getContractEvents`, along with some extra fields (see below)
 * @param args.query Subset of tanstack query params, specifically `{ enabled: boolean }`
 */
export default function useContractEvents<
  const abi extends Abi | readonly unknown[],
  eventName extends ContractEventName<abi> | undefined = undefined,
  strict extends boolean | undefined = undefined,
  fromBlock extends BlockNumber | BlockTag = "earliest",
  toBlock extends BlockNumber | BlockTag = "latest",
>(
  args: Omit<GetContractEventsParameters<abi, eventName, strict, fromBlock, toBlock>, "blockHash"> & {
    query?: { enabled?: boolean; debug?: boolean };
    reverseChronologicalOrder?: boolean;
  },
) {
  const publicClient = usePublicClient();

  // MARK: Ephemeral state

  const [isBrowserReady, setIsBrowserReady] = useState(false);
  // Whether we've read from cache yet. `seeds` and `knownRanges` should not be used until this is done.
  const [didReadCache, setDidReadCache] = useState(false);
  // The keys of `seeds` are our desired `fromBlock`s, and values are the *maximum* `toBlock` to try to fetch.
  // This `toBlock` SHOULD NOT be based on a given RPC's capabilities. Rather, it is intended to (a) fill gaps
  // in `knownRanges` without overlapping existing data and (b) prevent fetching past the global `args.fromBlock`.
  // TanStack query keys are derived from these `fromBlock`s.
  const [seeds, setSeeds] = useState(new Map<FromBlockNumber, ToBlockNumber>());
  // `knownRanges` are updated based on the results of TanStack queries.
  const [knownRanges, setKnownRanges] = useState(new Map<FromBlockNumber, ToBlockNumber>());
  // `requestStats` are tracked so that we can update our `requestStrategy` to fetch events as quickly as possible
  // Array order has no semantic meaning
  const [requestStats, setRequestStats] = useState<RequestStats>([]);

  // MARK: Detect when the browser is ready (for localStorage)

  useEffect(() => {
    if (document.readyState === "complete") {
      setIsBrowserReady(true);
    }
    const listener = () => setIsBrowserReady(document.readyState === "complete");
    document.addEventListener("readystatechange", listener);
    return () => document.removeEventListener("readystatechange", listener);
  }, []);

  // MARK: Reset state when changing chains

  useEffect(() => {
    setSeeds(new Map());
    setKnownRanges(new Map());
    setRequestStats([]);
  }, [publicClient?.chain.id]);

  // MARK: Computed state -- MUST stay synced with chain (useMemo, or see `useBlockNumbers` for async example)

  // The `queryKey` prefix to which each `seeds`' `fromBlock` is appended
  const queryKeyRoot = useDeepMemo(
    () =>
      [
        "useBetterContractEvents",
        publicClient?.chain.id,
        {
          address: args.address,
          args: args.args,
          eventName: args.eventName,
        },
      ] as const,
    [publicClient?.chain.id, args.address, args.args, args.eventName],
  );

  const { data: requiredRange } = useBlockNumbers({
    publicClient,
    blockNumbersOrTags: useMemo(
      () => [args.fromBlock ?? "earliest", args.toBlock ?? "latest"] as const,
      [args.fromBlock, args.toBlock],
    ),
    query: { placeholderData: keepPreviousData }, // TODO: polling
  });

  const { data: finalizedBlockNumber } = useBlockNumbers({
    publicClient,
    blockNumbersOrTags: useMemo(() => ["finalized"] as const, []),
    query: { placeholderData: keepPreviousData }, // TODO: polling
  });

  // MARK: On mount, check for cached data and coalesce all adjacent or overlapping ranges

  {
    const queryClient = useQueryClient();
    useEffect(() => {
      if (!isBrowserReady) return;

      // Cleanup by coalescing queries
      const data = queryClient.getQueriesData({ queryKey: queryKeyRoot, fetchStatus: "idle" }) as [
        QueryKey,
        (typeof queryResults)[number]["data"],
      ][];

      if (data.length) {
        const coalesced = coalesceQueries(data);

        // Set coalesced query data *before* removing old query keys in case browser interrupts us
        queryClient.setQueriesData(
          {
            queryKey: queryKeyRoot,
            fetchStatus: "idle",
          },
          (oldData?: { fromBlock: BlockNumber }) => {
            const x = coalesced.find(([, newData]) => newData.fromBlock === oldData?.fromBlock);
            return x?.[1];
          },
        );

        // Remove old query keys to save space and speed up future coalescing
        queryClient.removeQueries({
          queryKey: queryKeyRoot,
          fetchStatus: "idle",
          predicate({ queryKey }) {
            const shouldKeep = coalesced.some(
              ([coalescedQueryKey]) => queryKey[queryKeyRoot.length] === coalescedQueryKey[queryKeyRoot.length],
            );
            return !shouldKeep;
          },
        });

        // Update `seeds` and `knownRanges` to make sure cache is used
        const map = new Map<FromBlockNumber, ToBlockNumber>();
        coalesced.forEach(([, queryValue]) => map.set(queryValue.fromBlock, queryValue.toBlock));
        setSeeds(map);
        setKnownRanges(map);
      }

      setDidReadCache(true);
    }, [isBrowserReady, queryClient, queryKeyRoot]);
  }

  // MARK: Define transport request strategy

  const { data: ping } = usePing({ query: { staleTime: 30_000, gcTime: 0 } });
  const transports = useEIP1193Transports({ publicClient });
  const strategy = useMemo(() => getStrategyBasedOn(transports, requestStats, ping), [transports, requestStats, ping]);
  const strategyMetadata = useDeepMemo(
    () => ({
      strategyLastUpdatedTime: Date.now(),
      maxNumBlocksOptimistic: strategy.at(0)?.maxNumBlocks,
    }),
    [strategy],
    (a, b) => a[0].at(0)?.maxNumBlocks === b[0].at(0)?.maxNumBlocks,
  );

  // MARK: Schedule blocks to be added to `seeds`

  useEffect(() => {
    if (!didReadCache || !requiredRange || strategyMetadata.maxNumBlocksOptimistic === undefined) return;

    const numSeedsToCreate = Date.now() - strategyMetadata.strategyLastUpdatedTime > 2_000 ? REQUESTS_PER_BATCH : 1;

    // TODO: Refactor `getRemainingSegments` to allow for reverse-chronological-fetching
    const remainingRanges = getRemainingSegments(
      requiredRange,
      knownRanges,
      strategyMetadata.maxNumBlocksOptimistic,
      numSeedsToCreate,
    );

    if (remainingRanges.length === 0) return;

    setSeeds((x) => {
      const y = new Map(x);
      remainingRanges
        .slice(0, numSeedsToCreate)
        .forEach((v) => y.set(v.fromBlock, v.isGap ? v.toBlock : requiredRange[1]));
      return y;
    });
  }, [args.reverseChronologicalOrder, didReadCache, requiredRange, knownRanges, requestStats, strategyMetadata]);

  // MARK: Run queries

  const queryResults = useQueries({
    queries: [...seeds.entries()].map((seed) => ({
      queryKey: [...queryKeyRoot, seed[0]] as const,
      queryFn: getQueryFn({
        abi: args.abi,
        eventName: args.eventName,
        args: args.args,
      } as EncodeEventTopicsParameters<abi, eventName>),
      staleTime: Infinity,
      gcTime: Infinity,
      enabled: args.query?.enabled && strategy.length > 0 && finalizedBlockNumber !== undefined,
      meta: { strategy, toBlockMax: seed[1], finalizedBlockNumber: finalizedBlockNumber?.[0] },
      retry: true, // TODO: If strategy were perfect, this could be `false`. Temporary crutch!
      notifyOnChangeProps: ["data" as const],
    })),
  });

  // MARK: Update `knownRanges` and `requestStats` based on query results

  useEffect(() => {
    const newKnownRanges: typeof knownRanges = new Map();
    const newRequestStats: typeof requestStats = [];

    queryResults.forEach((result) => {
      if (result.data === undefined) return;
      if (result.data.logs !== undefined) newKnownRanges.set(result.data.fromBlock, result.data.toBlock);
      if (result.isFetchedAfterMount) newRequestStats.push(...result.data.stats);
    });
    newRequestStats.sort((a, b) => a.timestamp0 - b.timestamp0);

    // Apply 0-delay timeout just to get updates off the main React component cycle,
    // otherwise React [wrongly] thinks that we're stuck in an infinite loop when
    // loading from cache
    const timeout = setTimeout(() => {
      setRequestStats((value) => {
        return newRequestStats.at(-1) !== value.at(-1) ? newRequestStats.slice(-MAX_REQUESTS_TO_TRACK) : value;
      });
      setKnownRanges((value) => {
        let shouldUpdate = false;

        const fromBlocks = new Set([...value.keys(), ...newKnownRanges.keys()]);
        for (const fromBlock of fromBlocks) {
          if (!value.has(fromBlock)) {
            // `newKnownRanges` contains a new `fromBlock`, so we should definitely update.
            shouldUpdate = true;
            if (args.query?.debug) continue;
            break;
          }

          if (!newKnownRanges.has(fromBlock)) {
            // `newKnownRanges` dropped some `fromBlock` that previously existed. Probably a bug,
            // but it _is_ different, so we update.
            console.warn(
              `[fromBlock: ${fromBlock} → toBlock: ${value.get(fromBlock)}] was dropped from known block ranges.`,
            );
            shouldUpdate = true;
            if (args.query?.debug) continue;
            break;
          } else if (newKnownRanges.get(fromBlock) !== value.get(fromBlock)) {
            const toBlock = value.get(fromBlock);
            const toBlockNew = newKnownRanges.get(fromBlock);
            console.warn(
              `[fromBlock: ${fromBlock}] known range changed from [toBlock: ${toBlock}] to [toBlock: ${toBlockNew}]`,
            );
            // `newKnownRanges` maps an existing `fromBlock` to a new `toBlock`. Probably a bug,
            // but it _is_ different, so we update.
            shouldUpdate = true;
            if (args.query?.debug) continue;
            break;
          }
        }

        return shouldUpdate ? newKnownRanges : value;
      });
    }, 0);

    return () => clearTimeout(timeout);
  }, [queryResults, args.query?.debug]);

  // MARK: Return

  return useMemo(() => {
    // TODO: allow consumer to pass in an arg that determines whether we return only the first coalesced/contiguous chunk,
    // or all ordered chunks.
    const dataRaw = queryResults.flatMap((result) => result.data?.logs ?? []);
    const isFetching = queryResults.reduce((a, b) => a || b.isFetching, false);
    const [fromBlock, toBlock] = requiredRange ?? [0n, 0n];
    const latestFetched = queryResults.reduce(
      (a, b) => (a > (b.data?.toBlock ?? 0n) ? a : (b.data?.toBlock ?? 0n)),
      fromBlock,
    );
    const fractionFetched = Number(latestFetched - fromBlock) / Number(toBlock - fromBlock); // TODO: not quite right

    const data = parseEventLogs<abi, strict, eventName>({
      abi: args.abi,
      logs: dataRaw,
      args: args.args,
      eventName: args.eventName,
      strict: args.strict,
    } as ParseEventLogsParameters<abi, eventName, strict>);

    data.sort((a, b) => {
      // Handle case where one or both events are pending
      if (a.blockNumber == null && b.blockNumber == null) return 0;
      else if (a.blockNumber == null) return 1;
      else if (b.blockNumber == null) return -1;
      // Handle standard cases
      if (a.blockNumber !== b.blockNumber) return compareBigInts(a.blockNumber, b.blockNumber);
      if (a.transactionIndex !== b.transactionIndex) return a.transactionIndex! - b.transactionIndex!;
      if (a.logIndex !== b.logIndex) return a.logIndex! - b.logIndex!;
      return 0;
    });

    return { data, isFetching, fractionFetched };
  }, [queryResults]);
}

function coalesceQueries(queries: [QueryKey, QueryData][]) {
  // Filter out any unsuccessful queries
  const sorted = queries.filter((query) => query[1]?.logs !== undefined) as [
    QueryKey,
    Extract<QueryData, { logs: RpcLog[] }>,
  ][];
  // Sort by `fromBlock` in chronological order
  sorted.sort((a, b) => compareBigInts(a[1].fromBlock, b[1].fromBlock));

  const coalesced: typeof sorted = [];

  for (const [queryKey, queryData] of sorted) {
    // eslint-disable-next-line prefer-const
    let { fromBlock, toBlock, logs, finalizedBlockNumber } = queryData;
    if (toBlock > finalizedBlockNumber) {
      toBlock = finalizedBlockNumber;
      logs = logs.filter((log) => log.blockNumber != null && hexToBigInt(log.blockNumber) <= finalizedBlockNumber);
    } else {
      logs = [...logs];
    }

    if (coalesced.length === 0) {
      coalesced.push([queryKey, { fromBlock, toBlock, logs, finalizedBlockNumber, stats: [] }]);
      continue;
    }

    const last = coalesced[coalesced.length - 1][1];

    if (toBlock > last.toBlock) {
      if (fromBlock < last.toBlock + 1n) {
        // Data has some overlap
        last.toBlock = toBlock;
        last.logs.push(...logs.filter((log) => hexToBigInt(log.blockNumber!) > last.toBlock));
      } else if (fromBlock === last.toBlock + 1n) {
        // Data aligns perfectly
        last.toBlock = toBlock;
        last.logs.push(...logs);
      } else {
        // Data has no overlap
        coalesced.push([queryKey, { fromBlock, toBlock, logs, finalizedBlockNumber, stats: [] }]);
      }
    }
  }

  return coalesced;
}
