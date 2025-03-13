import { Abi, ContractEventName, encodeEventTopics, EncodeEventTopicsParameters, numberToHex } from "viem";
import { RequestStats, Strategy } from "./strategy";
import { QueryClient, QueryKey } from "@tanstack/react-query";

export function getQueryFn<
  const abi extends Abi | readonly unknown[],
  eventName extends ContractEventName<abi> | undefined = undefined,
>(args: EncodeEventTopicsParameters<abi, eventName>) {
  return async ({
    queryKey,
    meta,
  }: {
    queryKey: QueryKey;
    client: QueryClient;
    signal?: AbortSignal;
    meta: Record<string, unknown> | undefined;
  }) => {
    if (meta === undefined) {
      throw new Error("useContractEvents queryFn requires query `meta` to be defined and well-formed.");
    }

    // TODO: `chainId = queryKey[1]` so could verify that each transport is on the right chain
    // TODO: return "finalized" block number at time of call

    const fromBlock = queryKey[3] as bigint;
    const { strategy, toBlockMax } = meta as { strategy: Strategy; toBlockMax: bigint };

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

      const numBlocks = 1n + toBlock - fromBlock;
      const timestamp = Date.now();

      try {
        const logs = await transport.request(
          {
            method: "eth_getLogs",
            params: [
              { topics: encodeEventTopics(args), fromBlock: numberToHex(fromBlock), toBlock: numberToHex(toBlock) },
            ],
          },
          { timeout: transport.timeout, retryCount: transport.retryCount, retryDelay: transport.retryDelay },
        );

        stats.push({
          transportId: transport.id,
          status: "success",
          numBlocks,
          timestamp,
          latency: Date.now() - timestamp,
        });
        console.log(`Successfully fetched ${fromBlock}->${toBlock} with`, transport);
        return { logs, stats, fromBlock, toBlock };
      } catch {
        stats.push({
          transportId: transport.id,
          status: "failure",
          numBlocks,
          timestamp,
          latency: Date.now() - timestamp,
        });
        console.log(`Failed to fetch ${fromBlock}->${toBlock} with`, transport);
      }
    }
    return { logs: undefined, stats, fromBlock: undefined, toBlock: undefined };
  };
}
