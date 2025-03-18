import { areSetsEqual, promiseWithTimeout } from "@/lib/utils";
import type { Transport, TransportConfig, EIP1193Parameters, EIP1193RequestFn, RpcSchema, PublicRpcSchema } from "viem";
import { type UsePublicClientReturnType } from "wagmi";
import { useDeepMemo } from "@/hooks/use-deep-memo";

export type EIP1193RequestFnWithTimeout<rpcSchema extends RpcSchema | undefined = undefined> = ReturnType<
  typeof eip1193RequestFnWithTimeout<rpcSchema>
>;

type Transportish = (TransportConfig<"http", EIP1193RequestFn> | ReturnType<Transport<"http">>) &
  Record<string, unknown>;

function isHttpTransport(transportish: Transportish): transportish is TransportConfig<"http", EIP1193RequestFn> {
  return transportish.type === "http";
}

function idForTransport(transport: Transportish) {
  if (isHttpTransport(transport)) {
    return String(transport.url ?? transport.key);
  } else {
    return String(transport.value?.url ?? transport.config.key);
  }
}

function extractTransports(transport: TransportConfig<string, EIP1193RequestFn> & Record<string, unknown>) {
  switch (transport.type) {
    case "fallback":
      return transport["transports"] as Transportish[];
    default:
      return [transport as Transportish];
  }
}

function eip1193RequestFnWithTimeout<rpcSchema extends RpcSchema | undefined = undefined>(
  eip1193RequestFn: EIP1193RequestFn<rpcSchema>,
) {
  const wrapped = <
    _parameters extends EIP1193Parameters<rpcSchema> = EIP1193Parameters<rpcSchema>,
    _returnType = rpcSchema extends RpcSchema
      ? Extract<rpcSchema[number], { Method: _parameters["method"] }>["ReturnType"]
      : unknown,
  >(
    eip1193Parameters: _parameters,
    {
      timeout,
      retryCount,
      retryDelay,
      error,
    }: {
      timeout: number;
      retryCount?: number;
      retryDelay?: number;
      error?: Error;
    },
  ) => {
    return promiseWithTimeout<_returnType>(
      eip1193RequestFn(eip1193Parameters, { retryCount, retryDelay }),
      timeout,
      error,
    );
  };

  return wrapped;
}

export function useEIP1193Transports({ publicClient }: { publicClient: UsePublicClientReturnType }) {
  const raw = publicClient?.transport === undefined ? undefined : extractTransports(publicClient.transport);

  {
    const idSet = new Set<string>();
    raw?.forEach((transport) => {
      const id = idForTransport(transport);
      if (idSet.has(id)) {
        console.warn(`Transport ID ${id} was included more than once.`);
        return;
      }
      idSet.add(id);
    });
  }

  const newValue =
    raw?.map((transport) => ({
      id: idForTransport(transport),
      chainId: publicClient?.chain.id,
      request: eip1193RequestFnWithTimeout<PublicRpcSchema>(transport.request),
    })) ?? [];

  return useDeepMemo(
    () => newValue,
    [newValue],
    (a, b) => {
      const aIds = new Set(a[0].map((transport) => transport.id));
      const bIds = new Set(b[0].map((transport) => transport.id));
      return areSetsEqual(aIds, bIds);
    },
  );
}
