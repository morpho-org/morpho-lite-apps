import { promiseWithTimeout } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  type BlockNumber,
  type BlockTag,
  encodeEventTopics,
  numberToHex,
  zeroAddress,
  type EIP1193RequestFn,
  type Transport,
  type TransportConfig,
  erc20Abi,
} from "viem";
import { type UsePublicClientReturnType } from "wagmi";

/**
 * NOTE: These should be sorted lowest to highest for best performance.
 * The first entry should be chosen such that it always succeeds.
 */
const TEST_RANGES: readonly (bigint | "unconstrained")[] = [1_000n, 10_000n, 100_000n, "unconstrained"];

type Transportish = (TransportConfig<"http", EIP1193RequestFn> | ReturnType<Transport<"http">>) &
  Record<string, unknown>;

function isHttpTransport(transportish: Transportish): transportish is TransportConfig<"http", EIP1193RequestFn> {
  return transportish.type === "http";
}

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
  const transports = useMemo(() => {
    if (publicClient?.transport === undefined) return [];

    if (publicClient.transport.type === "fallback") {
      return publicClient.transport["transports"] as Transportish[];
    }

    return [publicClient.transport] as Transportish[];
  }, [publicClient?.transport]);

  const transportsKey = useMemo(() => {
    const ids = transports.map((t) => {
      if (isHttpTransport(t)) {
        return t.url ?? t.key;
      } else {
        return t.value?.url ?? t.config.key;
      }
    });
    return `fallback(${ids.join(", ")})`;
  }, [transports]);

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
  fn: EIP1193RequestFn,
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
    await promiseWithTimeout(
      fn(
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
        { retryCount, retryDelay },
      ),
      timeout,
    );
    return true;
  } catch {
    return false;
  }
}
