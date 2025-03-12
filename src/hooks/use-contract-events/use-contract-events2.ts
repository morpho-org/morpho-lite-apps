import { useQueries } from "@tanstack/react-query";
import {
  type EncodeEventTopicsParameters,
  type Abi,
  type BlockNumber,
  type BlockTag,
  type ContractEventName,
  type GetContractEventsParameters,
} from "viem";
import { serialize, usePublicClient } from "wagmi";
import { cyrb64Hash } from "@/lib/cyrb64";
import { useEffect, useMemo, useState } from "react";
import { useEIP1193Transports } from "@/hooks/use-contract-events/use-transports";
import { getRemainingSegments } from "@/hooks/use-contract-events/helpers";
import { hash } from "ohash";
import { getStrategyBasedOn, RequestStats } from "@/hooks/use-contract-events/strategy";
import { useBlockNumbers } from "@/hooks/use-contract-events/use-block-numbers";
import { getQueryFn } from "@/hooks/use-contract-events/query";

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

const NUM_SUCCESSES_BEFORE_SCHEDULING = 5000; // Wait to schedule parallel calls until after this many `eth_getLogs` calls have been successful (helps avoid thousands of setTimeout handlers when in a low bin)
const REQUESTS_PER_SECOND = 33;

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
  const transports = useEIP1193Transports({ publicClient });

  const blockNumbersOrTags = useMemo(
    () => [args.fromBlock ?? "earliest", args.toBlock ?? "latest"] as const,
    [args.fromBlock, args.toBlock],
  );
  const requiredRange = useBlockNumbers({ publicClient, blockNumbersOrTags });

  useEffect(() => console.log("transports changed"), [transports]);
  useEffect(() => console.log("requiredRange changed", requiredRange), [requiredRange]);

  // The `fromBlock`s in `seeds` determine what tanstack queries will be made
  const [seeds, setSeeds] = useState(new Map<FromBlockNumber, ToBlockNumber>());
  // `knownRanges` are updated based on the results of tanstack queries
  const [knownRanges, setKnownRanges] = useState(new Map<FromBlockNumber, ToBlockNumber>());
  // `requestStats` are tracked so that we can update our `requestStrategy` to fetch events as quickly as possible
  // Array order has no semantic meaning
  const [requestStats, setRequestStats] = useState<RequestStats>([]);

  // MARK: Define transport request strategy
  const { strategy, maxNumBlocksOptimistic } = useMemo(
    () => getStrategyBasedOn(transports, requestStats),
    [transports, requestStats],
  );

  // MARK: Schedule block ranges to be added to `seeds`
  useEffect(() => {
    if (!requiredRange || maxNumBlocksOptimistic === undefined) return;

    // If `requestStats.length === 0`, we're still querying the cache serially.
    // After that, we continue fetching serially a few times to build up data/stats
    if (requestStats.length < NUM_SUCCESSES_BEFORE_SCHEDULING) {
      // TODO: fix -- not counting successes only here
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

    const remainingRanges = getRemainingSegments(requiredRange, knownRanges, maxNumBlocksOptimistic);
    console.log("remainingRanges", remainingRanges);

    if (args.reverseChronologicalOrder) {
      remainingRanges.reverse();
    }

    const timeouts: NodeJS.Timeout[] = [];

    for (let i = 0; i < Math.ceil(remainingRanges.length / REQUESTS_PER_SECOND); i += 1) {
      const batch = remainingRanges.slice(i * REQUESTS_PER_SECOND, (i + 1) * REQUESTS_PER_SECOND);
      const delay = i * 1_000;

      timeouts.push(
        setTimeout(() => {
          console.log(`Adding batch ${i} to seeds`);
          setSeeds((x) => {
            const y = new Map(x);
            batch.forEach((v) => y.set(v.fromBlock, v.isGap ? v.toBlock : requiredRange[1]));
            return y;
          });
        }, delay),
      );
    }

    return () => {
      console.log("Clearing timeouts");
      for (const timeout of timeouts) {
        clearTimeout(timeout);
      }
    };
  }, [args.reverseChronologicalOrder, requiredRange, knownRanges, requestStats, maxNumBlocksOptimistic]);

  const queryFn = useMemo(
    () =>
      getQueryFn({
        abi: args.abi,
        eventName: args.eventName,
        args: args.args,
      } as EncodeEventTopicsParameters<abi, eventName>),
    [args.abi, args.eventName, args.args],
  );

  const queryResults = useQueries({
    queries: [...seeds.entries()].map((seed) => {
      const queryKey = [
        "useBetterContractEvents",
        publicClient?.chain.id,
        {
          abi: hash(args.abi),
          address: args.address,
          args: args.args,
          eventName: args.eventName,
          strict: args.strict,
        },
        seed[0],
      ];
      return {
        queryKey,
        queryFn,
        queryKeyHashFn(queryKey: unknown) {
          return cyrb64Hash(serialize(queryKey));
        },
        // refetchOnMount: "always" as const,
        staleTime: Infinity,
        gcTime: Infinity,
        enabled: args.query?.enabled && strategy.length > 0,
        meta: { strategy, toBlockMax: seed[1] },
        retry: false,
        notifyOnChangeProps: ["data" as const],
      };
    }),
  });

  useEffect(() => {
    const newRequestStats: typeof requestStats = [];
    const newKnownRanges = new Map<FromBlockNumber, ToBlockNumber>();

    queryResults.forEach((result) => {
      if (result.data === undefined) return;

      if (result.isFetchedAfterMount) {
        newRequestStats.push(...result.data.stats);
      }

      if (result.data.logs !== undefined) {
        newKnownRanges.set(result.data.fromBlock, result.data.toBlock);
      }
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
}
