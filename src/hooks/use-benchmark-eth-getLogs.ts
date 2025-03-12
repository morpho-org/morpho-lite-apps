import { useQuery } from "@tanstack/react-query";
import {
  type BlockNumber,
  type BlockTag,
  encodeEventTopics,
  numberToHex,
  zeroAddress,
  erc20Abi,
  type PublicRpcSchema,
} from "viem";
import { type UsePublicClientReturnType } from "wagmi";
import { EIP1193RequestFnWithTimeout, useEIP1193Transports } from "@/hooks/use-contract-events/use-transports";

/**
 * NOTE: These should be sorted lowest to highest for best performance.
 * The first entry should be chosen such that it always succeeds.
 */
const TEST_RANGES: readonly (bigint | "unconstrained")[] = [1_000n, 10_000n, 100_000n, "unconstrained"];

export function useBenchmark_eth_getLogs({
  publicClient,
  retryCount,
  retryDelay,
  timeout,
  latestBlockNumber,
}: {
  publicClient: UsePublicClientReturnType;
  timeout: number;
  retryCount?: number;
  retryDelay?: number;
  latestBlockNumber?: bigint;
}) {
  const transports = useEIP1193Transports({ publicClient });
  const transportsKey = `fallback(${transports.map((t) => t.id).join(", ")})`;

  return useQuery({
    queryKey: ["useBenchmark_eth_getLogs", publicClient?.chain.id, transportsKey],
    queryFn: async () => {
      if (publicClient === undefined) {
        throw new Error(`Tried to query nominal block range when publicClient was undefined.`);
      }

      const toBlock = latestBlockNumber ?? (await publicClient.getBlockNumber());

      let nominal = TEST_RANGES[0];
      for (const range of TEST_RANGES.slice(1)) {
        const results = await Promise.all(
          transports.map((t) =>
            test_eth_getLogs(t.request, {
              fromBlock: range === "unconstrained" ? "earliest" : toBlock - range,
              toBlock,
              timeout,
              retryCount,
              retryDelay,
            }),
          ),
        );
        if (!results.some((result) => result)) {
          break;
        }
        nominal = range;
      }

      return nominal;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: publicClient !== undefined,
    retry: false,
  });
}

async function test_eth_getLogs(
  fn: EIP1193RequestFnWithTimeout<PublicRpcSchema>,
  {
    fromBlock,
    toBlock,
    timeout,
    retryCount,
    retryDelay,
  }: {
    fromBlock: BlockNumber | BlockTag;
    toBlock: BlockNumber | BlockTag;
    timeout: number;
    retryCount?: number;
    retryDelay?: number;
  },
) {
  try {
    // Goal is to determine the transport's constraint on *input* block range. This is distinct from any
    // constraints on response size / number of logs in the output. We want logs that are "real" so as not
    // to trigger any RPC edge-cases, but also rare -- that way we can assume any errors are due to our
    // requested block range being too wide. `ERC20.Approval`s from the zero address fit this criteria.
    // NOTE: Using `publicClient.request` rather than `publicClient.getContractEvents` because it
    // allows `retryCount` override.
    await fn(
      {
        method: "eth_getLogs",
        params: [
          {
            topics: encodeEventTopics({ abi: erc20Abi, eventName: "Approval", args: { owner: zeroAddress } }),
            fromBlock: typeof fromBlock === "bigint" ? numberToHex(fromBlock) : fromBlock,
            toBlock: typeof toBlock === "bigint" ? numberToHex(toBlock) : toBlock,
          },
        ],
      },
      { timeout, retryCount, retryDelay },
    );
    return true;
  } catch {
    return false;
  }
}
