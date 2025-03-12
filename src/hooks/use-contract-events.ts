import { useQueries } from "@tanstack/react-query";
import {
  type Abi,
  type BlockNumber,
  type BlockTag,
  type ContractEventName,
  type GetContractEventsParameters,
} from "viem";
import { serialize, usePublicClient } from "wagmi";
import { hash } from "ohash";
import { useMemo } from "react";
import { useBenchmark_eth_getLogs } from "@/hooks/use-benchmark-eth-getLogs";
import { cyrb64Hash } from "@/lib/cyrb64";

type BlockRangeBound = BlockNumber | BlockTag | undefined;
type BlockRange = [BlockRangeBound, BlockRangeBound];

/**
 *
 * Wraps around `publicClient.getContractEvents`
 * @param args Arguments to pass through to `publicClient.getContractEvents`, along with some extra fields (see below)
 * @param args.query Subset of tanstack query params, specifically `{ enabled: boolean }`
 * @param args.reverseChronologicalOrder All initial `eth_getLogs` requests are sent in the same EventLoop. Response
 * ordering is probablistic, but can be influenced slightly by sending those first requests in reverse order. Returned
 * events are always sorted earliest-to-latest by blockNumber>txnIndex>logIndex.
 */
export default function useContractEvents<
  const abi extends Abi | readonly unknown[],
  eventName extends ContractEventName<abi> | undefined = undefined,
  strict extends boolean | undefined = undefined,
  fromBlock extends BlockNumber | BlockTag = "earliest",
  toBlock extends BlockNumber | BlockTag = "latest",
>(
  args: Omit<GetContractEventsParameters<abi, eventName, strict, fromBlock, toBlock>, "blockHash"> & {
    query?: { enabled?: boolean };
    reverseChronologicalOrder?: boolean;
  },
) {
  const publicClient = usePublicClient();
  const { data: maxBlockRange } = useBenchmark_eth_getLogs({
    publicClient,
    retryCount: 1,
    retryDelay: 200,
    timeout: 6_000,
    latestBlockNumber: typeof args.toBlock === "bigint" ? args.toBlock : undefined,
  });

  args = { ...args };
  if (args.fromBlock === undefined) args.fromBlock = "earliest";
  if (args.toBlock === undefined) args.toBlock = "latest";

  // Extract and remove these fields from `args` since we don't want them in the `queryKey`.
  const { fromBlock, toBlock, query, reverseChronologicalOrder } = args;
  delete args.fromBlock;
  delete args.toBlock;
  delete args.query;
  delete args.reverseChronologicalOrder;

  // Initialize standard block range...
  let blockRanges: BlockRange[] = [[fromBlock, toBlock]];

  // ...slice it if necessary...
  if (query?.enabled && typeof maxBlockRange === "bigint") {
    if (typeof toBlock !== "bigint" || typeof fromBlock !== "bigint") {
      throw new Error(
        `Tried to query contract events with \`maxBlockRange\` constraint without explicit \`fromBlock\` or \`toBlock\`.`,
      );
    }
    blockRanges = sliceBlockRange([fromBlock, toBlock], maxBlockRange);
  }

  // ...and finally reverse it if necessary.
  if (reverseChronologicalOrder) blockRanges.reverse();

  const queryFn = async ([fromBlock, toBlock]: BlockRange) => {
    if (publicClient === undefined) {
      throw new Error(`Tried to query contract events when publicClient was undefined.`);
    }
    // TODO: Could add binary slicing retries to account for num-returned-events constraint in addition to
    // block-range constraint.
    return publicClient.getContractEvents({ ...args, fromBlock, toBlock } as GetContractEventsParameters<
      abi,
      eventName,
      strict,
      fromBlock,
      toBlock
    >);
  };

  const results = useQueries({
    queries: blockRanges.map((blockRange) => {
      return {
        queryKey: ["useContractEvents", publicClient?.chain.id, { ...args, abi: hash(args.abi) }, blockRange],
        queryFn: () => queryFn(blockRange),
        queryKeyHashFn(queryKey: unknown) {
          return cyrb64Hash(serialize(queryKey));
        },
        staleTime: typeof blockRange[1] !== "bigint" ? 5 * 60 * 1000 : Infinity,
        gcTime: typeof blockRange[1] !== "bigint" ? 10 * 60 * 1000 : Infinity,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        placeholderData: [],
        enabled: query?.enabled && maxBlockRange !== undefined,
      };
    }),
  });

  return useMemo(() => {
    const data = results.flatMap((result) => result.data ?? []);
    const isFetching = results.reduce((a, b) => a || b.isFetching, false);
    const fractionFetched = results.reduce((a, result) => a + (result.isFetched ? 1 : 0), 0) / (results.length || 1);

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
  }, [results]);
}

function sliceBlockRange([fromBlock, toBlock]: [bigint, bigint], rangeConstraint: bigint) {
  const bounds: [bigint, bigint][] = [];

  for (let i = fromBlock; i < toBlock; i += rangeConstraint) {
    bounds.push([i, i + rangeConstraint < toBlock ? i + rangeConstraint : toBlock]);
  }

  return bounds;
}
