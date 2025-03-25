import {
  keepPreviousData,
  type QueryKey,
  useQueries,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  type Abi,
  type BlockNumber,
  type BlockTag,
  type ContractEventName,
  type GetContractEventsParameters,
  hexToBigInt,
  parseEventLogs,
  type ParseEventLogsParameters,
  type RpcLog,
  type Log,
} from "viem";
import { deepEqual, usePublicClient } from "wagmi";

import { useChainStateR } from "@/hooks/use-chain-state";
import { getRemainingSegments } from "@/hooks/use-contract-events/helpers";
import { getQueryFn } from "@/hooks/use-contract-events/query";
import { getStrategyBasedOn, RequestStats } from "@/hooks/use-contract-events/strategy";
import { useBlockNumbers } from "@/hooks/use-contract-events/use-block-numbers";
import { usePing } from "@/hooks/use-contract-events/use-ping";
import { useEIP1193Transports } from "@/hooks/use-contract-events/use-transports";
import { useDeepMemo } from "@/hooks/use-deep-memo";
import { compareBigInts, max, min } from "@/lib/utils";

type FromBlockNumber = BlockNumber;
type ToBlockNumber = BlockNumber;
type QueryData = UseQueryResult<Awaited<ReturnType<ReturnType<typeof getQueryFn>>>, Error>["data"];

const STABILIZATION_TIME = 1_000; // Once the strategy's _first_ transport stays constant for this long, start batching
const REQUESTS_PER_BATCH = 33; // Number of requests to include in each batch (batches are sent on each render)
const MAX_REQUESTS_TO_TRACK = 512; // Number of requests that are kept to compute statistics and determine strategy

/**
 * Indexes and caches events using the fastest available transport(s) in the `publicClient`.
 *
 * @param args Arguments to pass through to `publicClient.getContractEvents`, along with some extra fields (see below)
 * @param args.query Subset of tanstack query params, specifically `{ enabled: boolean }`
 * @param args.returnInOrder By default (false) chunks may be non-contiguous while fetching. Set this to true to only
 * return the *first* contiguous chunk, thereby guaranteeing you have the complete chain state up to some block number.
 *
 * @dev We don't know ahead of time how many blocks can be fetched per RPC request, as it depends on RPC-specific
 * rules (an explicit limit on number of blocks, a constraint on number of logs in the response, or both). This
 * has a few implications:
 * - The `strategy` should start out requesting large ranges. Upon errors, fallback to smaller ones.
 * - TanStack queries are uniquely specified by a `fromBlock` -- NOT a `toBlock`, since that can't be known upfront.
 * - TanStack queries can be "scheduled" optimistically, i.e. if the `strategy` expects to be able to fetch an
 *   unlimited number of blocks in one request, we only need one query. If, on the other hand, the `strategy`'s
 *   fastest transport(s) can only handle 10_000 blocks, we need to create more queries. This is an interative
 *   process with performance implications -- too optimistic and you get hundreds of failed requests, but wait
 *   too long to schedule and you end up with hundreds of renders and a slow request waterfall.
 *
 * Here's an overview of the hook life cycle to help build your mental model of the state machine:
 * 1. Wait for `document.readyState === "complete"` to ensure `window.localStorage` is ready
 * 2. Read existing queries from cache. If any queries hold overlapping/adjacent block ranges,
 *    coalesce them into a single contiguous range. Update `seeds` and `knownRanges` accordingly
 *    (they match at this point) and reset `requestStats` since none have been made yet.
 * 3. Determine a request `strategy` given `publicClient` transports and current `requestStats`.
 * 4. Optimistically compute the next `fromBlock`s to fetch based on the `strategy`, and add them to `seeds`.
 * 5. Run queries for all `seeds`
 * 6. Use query results to update `knownRanges` and `requestStats`
 * 7. Coalesce and return query results.
 *
 * @historical_note The following is the author's original \[draft\] plan used to implement this hook, included here
 * for future LLM context:
 * 1. a. useState - queued ranges (Record<fromBlock, toBlockMax>)
 *    b. useState - known ranges (Record<fromBlock, toBlockActual>)
 *    c. useState - transport stats
 * 2. useMemo to determine strategy given current transport stats -- this includes wait time / backoff for each one,
 *    as well as best block range
 * 3. useEffect to schedule (setTimeout) updates to queue based on strategy
 *    - update on: [known ranges, strategy]
 *    - if transport stats is undefined, that means we're still querying cache serially. only schedule ONE item, with
 *      fromBlock=previous.toBlock
 *    - if transport stats is defined
 *      - determine remaining ranges (including any gaps between existing ranges)
 *      - divide them up OPTIMISTICALLY based on transport stats / strategy
 *      - place fromBlocks on queue -- only specify toBlock if optimistic range is less than strategy's best block range
 *    - on change, make sure to `clearTimeout`
 * 4. useQueries similar to old hook, except queryKey contains only the fromBlock (NO TOBLOCK)
 *    - meta is { toBlockMax, strategy } -- but note that toBlockMax may be undefined
 *    - queryFn should essentially always be successful since the strategy should be configured to fallback on error
 *    - if toBlockMax is specified, it should be respected
 *    - return logs, new transport stats, and toBlockActual
 * 5. useEffect to update known ranges, and [iff isFetchedAfterMount] set new transport stats
 * 6. [OPTIONAL] once fetching is complete, could concatenate+compress to a single query, then garbage collect the
 *    other ones. Then on next page load the serial fetching would only take one render rather than many
 * 7. combine all logs, make sure they're sorted, and return
 *
 * The author's original mental model:
 * - While retrieving from cache, we expect only a single `fromBlock` to be fetched at once -- everything happens sequentially
 * - Once done with cache, scheduler lets us start fetching in parallel while also gradually improving our strategy.
 * - Allowing the scheduler to specify toBlockMax helps avoid duplicates when backfilling gaps
 * - Gaps can occur when the scheduler was too optimistic with either maxBlockRange or parallelism
 * - Scheduler can (optionally) have different modes for earliest->latest, latest->earliest, or random fetching order
 */
export default function useContractEvents<
  const abi extends Abi | readonly unknown[],
  eventName extends ContractEventName<abi> | undefined = undefined,
  strict extends boolean | undefined = undefined,
  fromBlock extends BlockNumber | BlockTag = "earliest",
  toBlock extends BlockNumber | BlockTag = "latest",
>(
  args: Omit<GetContractEventsParameters<abi, eventName, strict, fromBlock, toBlock>, "blockHash"> & {
    chainId?: number;
    query?: { enabled?: boolean; debug?: boolean };
    returnInOrder?: boolean;
    reverseChronologicalOrder?: boolean;
  },
) {
  const publicClient = usePublicClient({ chainId: args.chainId });
  const chainId = publicClient?.chain.id;

  // MARK: Ephemeral state

  const [isBrowserReady, setIsBrowserReady] = useState(false);
  // Whether we've read from cache yet. `seeds` and `knownRanges` should not be used until this is done.
  const [didReadCache, setDidReadCache] = useChainStateR(false, chainId);
  // The keys of `seeds` are our desired `fromBlock`s, and values are the *maximum* `toBlock` to try to fetch.
  // This `toBlock` SHOULD NOT be based on a given RPC's capabilities. Rather, it is intended to (a) fill gaps
  // in `knownRanges` without overlapping existing data and (b) prevent fetching past the global `args.fromBlock`.
  // TanStack query keys are derived from these `fromBlock`s.
  const [seeds, setSeeds] = useChainStateR(new Map<FromBlockNumber, ToBlockNumber>(), chainId);
  // `knownRanges` are updated based on the results of TanStack queries.
  const [knownRanges, setKnownRanges] = useChainStateR(new Map<FromBlockNumber, ToBlockNumber>(), chainId);
  // `requestStats` are tracked so that we can update our `requestStrategy` to fetch events as quickly as possible.
  // Array order has no semantic meaning.
  const [requestStats, setRequestStats] = useChainStateR<RequestStats>([], chainId);

  // MARK: Detect when the browser is ready (for localStorage)

  useEffect(() => {
    if (document.readyState === "complete") {
      setIsBrowserReady(true);
    }
    const listener = () => setIsBrowserReady(document.readyState === "complete");
    document.addEventListener("readystatechange", listener);
    return () => document.removeEventListener("readystatechange", listener);
  }, []);

  // MARK: Computed state -- MUST stay synced with chain (useMemo, or see `useBlockNumbers` for async example)

  // The `queryKey` prefix to which each `seeds`' `fromBlock` is appended
  const queryKeyRoot = useDeepMemo(
    () =>
      [
        "useContractEvents",
        chainId,
        {
          // TODO: make ABI part of queryKey so it doesn't have to be passed into `queryFn` separately?
          address: args.address,
          args: args.args,
          eventName: args.eventName,
        },
      ] as const,
    [chainId, args.address, args.args, args.eventName],
  );

  const { data: blockNumbers } = useBlockNumbers({
    publicClient,
    blockNumbersOrTags: useMemo(
      () => [args.fromBlock ?? "earliest", args.toBlock ?? "latest", "finalized"] as const,
      [args.fromBlock, args.toBlock],
    ),
    query: { placeholderData: keepPreviousData }, // TODO: polling
  });

  // MARK: On mount, check for cached data and coalesce all adjacent or overlapping ranges

  {
    const queryClient = useQueryClient();
    useEffect(() => {
      if (!isBrowserReady) return;

      const data = queryClient.getQueriesData<QueryData>({ queryKey: queryKeyRoot, fetchStatus: "idle" });
      const map = new Map<FromBlockNumber, ToBlockNumber>();

      if (data.length > 0) {
        const coalesced = coalesceQueries(data);

        // Set finalized, coalesced query data *before* removing old query keys in case browser interrupts us.
        queryClient.setQueriesData<QueryData>(
          {
            queryKey: queryKeyRoot,
            fetchStatus: "idle",
          },
          (oldData) => {
            const x = coalesced.finalized.find(([, newData]) => newData.fromBlock === oldData?.fromBlock);
            return x?.[1];
          },
        );

        // Set tentative, coalesced query data *before* removing old query keys in case browser interrupts us.
        // We can't use `setQueriesData` for this since some keys may not exist yet.
        coalesced.tentative.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData<QueryData>(queryKey, queryData);
          void queryClient.invalidateQueries({ queryKey, exact: true });
        });

        // Remove old query keys to save space and speed up future coalescing
        queryClient.removeQueries({
          queryKey: queryKeyRoot,
          predicate({ queryKey }) {
            const shouldKeep = [...coalesced.finalized, ...coalesced.tentative].some(
              ([coalescedQueryKey]) => queryKey[queryKeyRoot.length] === coalescedQueryKey[queryKeyRoot.length],
            );
            return !shouldKeep;
          },
        });

        // Update `seeds` and `knownRanges` to make sure cache is used
        coalesced.finalized.forEach(([, queryData]) => map.set(queryData.fromBlock, queryData.toBlock));
        coalesced.tentative.forEach(([, queryData]) => map.set(queryData.fromBlock, queryData.toBlock));
      }

      setSeeds(map);
      setKnownRanges(new Map());
      setRequestStats([]);
      setDidReadCache(true);
    }, [isBrowserReady, queryClient, queryKeyRoot, setDidReadCache, setSeeds, setKnownRanges, setRequestStats]);
  }

  // MARK: Define transport request strategy

  const { data: ping } = usePing({ query: { staleTime: 30_000, gcTime: 30_000, placeholderData: keepPreviousData } });
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
    if (!didReadCache || !blockNumbers || strategyMetadata.maxNumBlocksOptimistic === undefined) return;

    const numSeedsToCreate =
      Date.now() - strategyMetadata.strategyLastUpdatedTime > STABILIZATION_TIME ? REQUESTS_PER_BATCH : 1;

    // TODO: Refactor `getRemainingSegments` to allow for reverse-chronological-fetching
    const remainingRanges = getRemainingSegments(
      [blockNumbers[0], blockNumbers[1]],
      knownRanges,
      strategyMetadata.maxNumBlocksOptimistic,
      numSeedsToCreate,
    );

    if (remainingRanges.length === 0) return;

    setSeeds((x) => {
      const y = new Map(x);
      let i = 0;
      for (const rr of remainingRanges) {
        const toBlockMax = rr.isGap ? rr.toBlock : blockNumbers[1];

        if (y.get(rr.fromBlock) !== toBlockMax) {
          y.set(rr.fromBlock, toBlockMax);
          i += 1;
          if (i === numSeedsToCreate) break;
        }
      }
      return i > 0 ? y : x;
    });
  }, [
    args.reverseChronologicalOrder,
    didReadCache,
    blockNumbers,
    knownRanges,
    requestStats,
    strategyMetadata,
    setSeeds,
  ]);

  // MARK: Run queries

  const queryResults = useQueries({
    queries: [...seeds.entries()].map((seed) => ({
      queryKey: [...queryKeyRoot, seed[0]] as const,
      queryFn: getQueryFn<abi, eventName>(args.abi),
      staleTime: Infinity,
      gcTime: Infinity,
      enabled: args.query?.enabled && strategy.length > 0 && blockNumbers !== undefined,
      meta: { strategy, toBlockMax: seed[1], finalizedBlock: blockNumbers?.[2] },
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
  }, [queryResults, args.query?.debug, setKnownRanges, setRequestStats]);

  // MARK: Return

  return useDeepMemo(
    () => {
      // The `coalesce` function expects entries of the form [QueryKey, QueryData]
      const fakeQueries = queryResults
        .filter((r) => r.status === "success")
        .map((result) => [[], result.data] as [QueryKey, QueryData]);

      // Coalesce queries to ensure we have the latest data with no overlapping ranges
      const coalesced = coalesceQueries(fakeQueries);
      const finalized = coalesced.finalized.map((x) => x[1]);
      const tentative = coalesced.tentative.map((x) => x[1]);

      const finalizedBlock = finalized.at(-1)?.finalizedBlock;

      // Combine `finalized` and `tentative` ranges
      const all = [...finalized];
      if (all.length > 0 && tentative.length > 0 && all.at(-1)!.toBlock + 1n === tentative.at(0)!.fromBlock) {
        all[all.length - 1] = {
          ...all[all.length - 1],
          logs: all[all.length - 1].logs.concat(tentative.at(0)!.logs),
          toBlock: tentative.at(0)!.toBlock,
        };
        all.push(...tentative.slice(1));
      } else {
        all.push(...tentative);
      }

      const parse = (rpcLogs: RpcLog[]) =>
        parseEventLogs<abi, strict, eventName>({
          abi: args.abi,
          logs: rpcLogs,
          args: args.args,
          eventName: args.eventName,
          strict: args.strict,
        } as ParseEventLogsParameters<abi, eventName, strict>);

      let logs = {
        all: <ReturnType<typeof parse>>[],
        finalized: <ReturnType<typeof parse>>[],
      };
      let isFetching = true;
      let fractionFetched = 0;
      if (blockNumbers !== undefined) {
        const [fromBlock, toBlock] = blockNumbers;
        const numBlocksFetched = all.reduce((a, b) => {
          return b.toBlock < fromBlock || toBlock < b.fromBlock
            ? a // Segment is entirely outside the requested block range, so it doesn't contribute anything
            : a + (min(b.toBlock, toBlock) - max(b.fromBlock, fromBlock) + 1n);
        }, 0n);

        // Flatten and parse logs
        logs = {
          all: parse(args.returnInOrder ? (all.at(0)?.logs ?? []) : all.flatMap((x) => x.logs)),
          finalized: parse(finalized.flatMap((x) => x.logs)),
        };
        // Filter out logs that are outside the requested block range
        {
          let key: keyof typeof logs;
          for (key in logs) {
            logs[key] = logs[key].filter((log) => fromBlock <= log.blockNumber && log.blockNumber <= toBlock);
          }
        }
        isFetching = all.length !== 1 || all[0].fromBlock > fromBlock || all[0].toBlock < toBlock;
        fractionFetched = Number(numBlocksFetched) / (Number(toBlock) - Number(fromBlock) + 1);
      }

      const sort = (a: Log<bigint, number, false>, b: Log<bigint, number, false>) => {
        if (a.blockNumber !== b.blockNumber) return compareBigInts(a.blockNumber, b.blockNumber);
        if (a.transactionIndex !== b.transactionIndex) return a.transactionIndex - b.transactionIndex;
        if (a.logIndex !== b.logIndex) return a.logIndex - b.logIndex;
        return 0;
      };

      logs.all.sort(sort);
      logs.finalized.sort(sort);

      return { logs, finalizedBlock, isFetching, fractionFetched };
    },
    [blockNumbers, queryResults, args.abi, args.args, args.eventName, args.returnInOrder, args.strict] as const,
    (a, b) => {
      return deepEqual(a[0], b[0]) && a[1] === b[1] && a[2] === b[2] && deepEqual(a.slice(3), b.slice(3));
    },
  );
}

function coalesceQueries(queries: [QueryKey, QueryData][]) {
  // Filter out any unsuccessful queries and split queries that span their self-specified `finalizedBlock` in two.
  // NOTE: For any such queries, **new query keys will be returned** for the tentative span (the part after the
  // `finalizedBlock`)
  type NonNullEntry = [QueryKey, NonNullable<QueryData>];
  const sorted = (queries.filter((query) => query[1] !== undefined) as NonNullEntry[]).flatMap(
    ([queryKey, queryData]) => {
      // Block range is either fully finalized or fully tentative
      if (queryData.toBlock <= queryData.finalizedBlock || queryData.fromBlock > queryData.finalizedBlock) {
        return [[queryKey, queryData] as NonNullEntry];
      }
      // Block range spans whatever block was finalized at fetch-time
      const finalized: NonNullEntry = [queryKey, { ...queryData, toBlock: queryData.finalizedBlock, logs: [] }];
      const tentative: NonNullEntry = [
        [...queryKey.slice(0, -1), queryData.finalizedBlock + 1n],
        { ...queryData, fromBlock: queryData.finalizedBlock + 1n, logs: [], stats: [] },
      ];

      for (const log of queryData.logs) {
        if (log.blockNumber == null) continue;
        const ref = hexToBigInt(log.blockNumber) <= finalized[1].toBlock ? finalized : tentative;
        ref[1].logs.push(log);
      }

      return [finalized, tentative];
    },
  );
  // Sort by `fromBlock` in chronological order
  sorted.sort((a, b) => compareBigInts(a[1].fromBlock, b[1].fromBlock));

  const coalesced = {
    finalized: <typeof sorted>[],
    tentative: <typeof sorted>[],
  };

  for (const [queryKey, { fromBlock, toBlock, logs, finalizedBlock }] of sorted) {
    if (toBlock < fromBlock) {
      console.warn("useContractEvents coalesce encountered toBlock < fromBlock");
      continue;
    }

    const isFinalized = toBlock <= finalizedBlock;
    const ref = isFinalized ? coalesced.finalized : coalesced.tentative;

    const last = ref.at(-1)?.[1];

    if (last === undefined || last.toBlock + 1n < fromBlock) {
      // Data covers a new range
      ref.push([
        queryKey,
        { fromBlock, toBlock, logs: [...logs], finalizedBlock: isFinalized ? toBlock : fromBlock - 1n, stats: [] },
      ]);
    } else if (last.toBlock + 1n === fromBlock) {
      // Data aligns perfectly with the previous range
      last.logs.push(...logs);
      last.toBlock = toBlock;
      if (isFinalized) last.finalizedBlock = last.toBlock;
    } else {
      // Data overlaps the previous range or is entirely inside it
      if (last.finalizedBlock < finalizedBlock) {
        // Incoming logs take precedence
        last.logs = last.logs.filter((log) => hexToBigInt(log.blockNumber!) < fromBlock).concat(logs);
      } else {
        // Existing logs take precedence
        last.logs.push(...logs.filter((log) => hexToBigInt(log.blockNumber!) > last.toBlock));
      }
      last.toBlock = max(last.toBlock, toBlock);
      if (isFinalized) last.finalizedBlock = last.toBlock;
    }
  }

  return coalesced;
}
