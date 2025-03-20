import {
  type Abi,
  type Address,
  type ContractEventName,
  encodeEventTopics,
  type EncodeEventTopicsParameters,
  numberToHex,
} from "viem";
import type { RequestStats, Strategy } from "@/hooks/use-contract-events/strategy";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

export function getQueryFn<
  const abi extends Abi | readonly unknown[],
  eventName extends ContractEventName<abi> | undefined = undefined,
>(abi: abi) {
  return async ({
    queryKey,
    meta,
  }: {
    queryKey: QueryKey;
    client: QueryClient;
    signal?: AbortSignal; // NOTE: Do NOT consume this, otherwise in-flight requests will be wasted on dismount
    meta: Record<string, unknown> | undefined;
  }) => {
    if (meta === undefined) {
      throw new Error("useContractEvents queryFn requires query `meta` to be defined and well-formed.");
    }

    const chainId = queryKey[1] as number | undefined;
    const topics = encodeEventTopics({ abi, ...(queryKey[2] as object) } as EncodeEventTopicsParameters<
      abi,
      eventName
    >);
    const address = (queryKey[2] as { address?: Address | Address[] }).address;
    const fromBlock = queryKey[3] as bigint;
    const { strategy, toBlockMax, finalizedBlock } = meta as {
      strategy: Strategy;
      toBlockMax: bigint;
      finalizedBlock: bigint;
    };

    const stats: RequestStats = [];

    for (const transport of strategy) {
      let toBlock = toBlockMax;
      // NOTE: `eth_getLogs` is inclusive of both `fromBlock` and `toBlock`, so if we want to fetch N
      // blocks, `toBlock - fromBlock == N - 1`
      if (transport.maxNumBlocks !== "unconstrained" && fromBlock + transport.maxNumBlocks - 1n < toBlockMax) {
        toBlock = fromBlock + transport.maxNumBlocks - 1n;
      }

      if (toBlock < fromBlock) {
        throw new Error("useContractEvents queryFn encountered toBlock < fromBlock");
      }

      if (transport.chainId !== chainId) {
        throw new Error(
          `useContractEvents queryFn got outdated transport(s) -- need chainId ${chainId}, got ${transport.chainId}`,
        );
      }

      const numBlocks = 1n + toBlock - fromBlock;
      const timestamp0 = Date.now();

      try {
        const logs = await transport.request(
          {
            method: "eth_getLogs",
            params: [{ address, topics, fromBlock: numberToHex(fromBlock), toBlock: numberToHex(toBlock) }],
          },
          { timeout: transport.timeout, retryCount: transport.retryCount, retryDelay: transport.retryDelay },
        );

        stats.push({
          transportId: transport.id,
          status: "success",
          numBlocks,
          timestamp0,
          timestamp1: Date.now(),
        });
        // console.info(`Successfully fetched ${fromBlock}->${toBlock} (${numBlocks} blocks) with`, transport);
        return { logs, stats, fromBlock, toBlock, finalizedBlock };
      } catch {
        stats.push({
          transportId: transport.id,
          status: "failure",
          numBlocks,
          timestamp0,
          timestamp1: Date.now(),
        });
        console.warn(`Failed to fetch ${fromBlock}->${toBlock} (${numBlocks} blocks) with ${transport.id}`);
      }
    }

    throw new Error(`Failed to fetch range starting at fromBlock:${fromBlock} -- all transports errored`);
  };
}
