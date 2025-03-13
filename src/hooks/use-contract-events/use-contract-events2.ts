import { QueryKey, useQueries, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
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
import { useDeepMemo } from "../use-deep-memo";

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

const REQUESTS_PER_SECOND = 5;

// TODO: If caller holds everything constant, but moves fromBlock earlier, it'll break cache. Moving coalescing to hook start (and updating knownRanges accordingly) should fix this
/**
 *
 * Wraps around `publicClient.getContractEvents`
 * @param args Arguments to pass through to `publicClient.getContractEvents`, along with some extra fields (see below)
 * @param args.query Subset of tanstack query params, specifically `{ enabled: boolean }`
 */
export default function useContractEvents2<
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

  // MARK: Reset state when changing chains

  useEffect(() => {
    setSeeds(new Map());
    setKnownRanges(new Map());
    setRequestStats([]);
  }, [publicClient?.chain.id]);

  // MARK: Computed state -- MUST stay synced with chain (useMemo, or see `useBlockNumbers` for async example)

  // The `queryKey` prefix to which each `seeds`' `fromBlock` is added
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

  const blockNumbersOrTags = useMemo(
    () => [args.fromBlock ?? "earliest", args.toBlock ?? "latest"] as const,
    [args.fromBlock, args.toBlock],
  );
  const requiredRange = useBlockNumbers({ publicClient, blockNumbersOrTags });

  // MARK: Define transport request strategy

  const transports = useEIP1193Transports({ publicClient });
  const strategy = useMemo(() => getStrategyBasedOn(transports, requestStats), [transports, requestStats]);
  const strategyMetadata = useDeepMemo(
    () => ({
      strategyLastUpdatedTime: Date.now(),
      maxNumBlocksOptimistic: strategy.at(0)?.maxNumBlocks,
    }),
    [strategy],
    (a, b) =>  a[0].at(0)?.maxNumBlocks === b[0].at(0)?.maxNumBlocks,
  );

  useEffect(() => console.log("strat metadata changed", strategy, requestStats.length), [strategyMetadata]);

  // MARK: Schedule blocks to be added to `seeds`

  useEffect(() => {
    if (!requiredRange || strategyMetadata.maxNumBlocksOptimistic === undefined) return;

    // If `requestStats.length === 0`, we're still querying the cache serially.
    // After that, we continue fetching serially a few times to build up data/stats
    if (requestStats.length === 0 || Date.now() - strategyMetadata.strategyLastUpdatedTime < 2_000) { // TODO: constant
      // Compute latest `toBlock` that we've fetched (if we haven't fetched any, use `requiredRange[0] - 1n`)
      const latestToBlock = [...knownRanges.values()].reduce((a, b) => (a > b ? a : b), requiredRange[0] - 1n);
      // Return early if finished
      if (latestToBlock === requiredRange[1]) {
        console.log("DONE!!");
        return;
      }
      // Add a new seed with `fromBlock: latestToBlock + 1n`
      console.log("Adding single seed with fromBlock", latestToBlock + 1n);
      setSeeds((x) => {
        const y = new Map(x);
        y.set(latestToBlock + 1n, requiredRange[1]);
        return y;
      });
      return;
    }

    const remainingRanges = getRemainingSegments(requiredRange, knownRanges, strategyMetadata.maxNumBlocksOptimistic);
    console.log("REMAINING RANGES", remainingRanges);

    setSeeds((x) => {
      const y = new Map(x);
      remainingRanges.slice(0, 2).forEach((v) => y.set(v.fromBlock, v.isGap ? v.toBlock : requiredRange[1]));
      return y;
    });

    // if (seeds.size !== knownRanges.size) {
    //   console.log("Waiting for fetches to complete");
    //   return;
    // }

    // const remainingRanges = getRemainingSegments(requiredRange, knownRanges, strategyMetadata.maxNumBlocksOptimistic);
    // console.log("REMAINING RANGES", remainingRanges);

    // if (args.reverseChronologicalOrder) {
    //   remainingRanges.reverse();
    // }

    // const timeouts: NodeJS.Timeout[] = [];

    // for (let i = 0; i < Math.ceil(remainingRanges.length / REQUESTS_PER_SECOND); i += 1) {
    //   const batch = remainingRanges.slice(i * REQUESTS_PER_SECOND, (i + 1) * REQUESTS_PER_SECOND);
    //   const delay = i * 1_000;

    //   timeouts.push(
    //     setTimeout(() => {
    //       console.log(`Adding batch ${i} to seeds`);
    //       setSeeds((x) => {
    //         const y = new Map(x);
    //         batch.forEach((v) => y.set(v.fromBlock, v.isGap ? v.toBlock : requiredRange[1]));
    //         return y;
    //       });
    //     }, delay),
    //   );
    // }

    // return () => {
    //   console.log("Clearing timeouts");
    //   for (const timeout of timeouts) {
    //     clearTimeout(timeout);
    //   }
    // };
  }, [args.reverseChronologicalOrder, requiredRange, knownRanges, requestStats, strategyMetadata]);

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
      enabled: args.query?.enabled && strategy.length > 0,
      meta: { strategy, toBlockMax: seed[1] },
      retry: false,
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

    // Apply 0-delay timeout just to get updates off the main React component cycle,
    // otherwise React [wrongly] thinks that we're stuck in an infinite loop when
    // loading from cache
    const timeout = setTimeout(() => {
      setRequestStats((value) => {
        // Since `staleTime` and `gcTime` are `Infinity`, individual request stats should only change once.
        // This implies that length is a sufficient check of equality.
        return newRequestStats.length !== value.length ? newRequestStats : value;
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

  // MARK: On dismount, coalesce all adjacent or overlapping `knownRanges`

  const queryClient = useQueryClient();
  useEffect(() => {
    // Any setup would go here
    // ...
    return () => {
      // Cleanup by coalescing queries
      const data = queryClient.getQueriesData({ queryKey: queryKeyRoot, fetchStatus: "idle" }) as [
        QueryKey,
        (typeof queryResults)[number]["data"],
      ][];
      const coalesced = coalesceQueries(data);
      console.log("coalesced", coalesced);

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

      queryClient.setQueriesData(
        {
          queryKey: queryKeyRoot,
          fetchStatus: "idle",
        },
        (oldData: { fromBlock: BlockNumber }) => {
          const x = coalesced.find(([, newData]) => newData.fromBlock === oldData.fromBlock);
          return x?.[1];
        },
      );
    };
  }, [queryClient, queryKeyRoot]);

  // MARK: Return

  return useMemo(() => {
    // TODO: coalesce here and only return the first contiguous chunk (or all ordered chunks, subject to config arg)
    const dataRaw = queryResults.flatMap((result) => result.data?.logs ?? []);
    const isFetching = queryResults.reduce((a, b) => a || b.isFetching, false);
    const [fromBlock, toBlock] = requiredRange ?? [0n, 0n];
    const latestFetched = queryResults.reduce(
      (a, b) => (a > (b.data?.toBlock ?? 0n) ? a : (b.data?.toBlock ?? 0n)),
      fromBlock,
    );
    const fractionFetched = Number(latestFetched - fromBlock) / Number(toBlock - fromBlock);

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
      if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber);
      if (a.transactionIndex !== b.transactionIndex) return Number(a.transactionIndex! - b.transactionIndex!);
      if (a.logIndex !== b.logIndex) return Number(a.logIndex! - b.logIndex!);
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

  for (const [queryKey, { fromBlock, toBlock, logs }] of sorted) {
    if (coalesced.length === 0) {
      coalesced.push([queryKey, { fromBlock, toBlock, logs: [...logs], stats: [] }]);
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
        coalesced.push([queryKey, { fromBlock, toBlock, logs: [...logs], stats: [] }]);
      }
    }
  }

  return coalesced;
}
