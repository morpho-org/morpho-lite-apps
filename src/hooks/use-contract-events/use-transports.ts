import { areSetsEqual, promiseWithTimeout } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  type Transport,
  type TransportConfig,
  type EIP1193Parameters,
  type EIP1193RequestFn,
  type RpcSchema,
  type PublicRpcSchema,
} from "viem";
import { type UsePublicClientReturnType } from "wagmi";

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
  const [transports, setTransports] = useState<
    {
      id: ReturnType<typeof idForTransport>;
      request: ReturnType<typeof eip1193RequestFnWithTimeout<PublicRpcSchema>>;
    }[]
  >([]);

  useEffect(() => {
    if (publicClient?.transport === undefined) return;

    const raw = extractTransports(publicClient.transport);
    const newValue = raw.map((transport) => ({
      id: idForTransport(transport),
      request: eip1193RequestFnWithTimeout<PublicRpcSchema>(transport.request),
    }));

    setTransports((value) => {
      const valueIds = new Set(value.map((transport) => transport.id));
      const newValueIds = new Set(newValue.map((transport) => transport.id));

      return areSetsEqual(valueIds, newValueIds) ? value : newValue;
    });
  }, [publicClient?.transport]);

  return transports;
}
