import { cyrb64Hash } from "@/lib/cyrb64";
import { RequestTrackingContext, RequestTrackingValue } from "@/lib/request-tracking-context";
import React, { useCallback, useEffect, useState } from "react";

function extractEthJsonRpcRequest(...args: Parameters<typeof fetch>) {
  if (!args[1] || args[1].method !== "POST" || !args[1].headers || !(typeof args[1].body === "string"))
    return undefined;

  const headers = args[1].headers;
  let isJson = false;

  if (headers instanceof Array) {
    for (const [key, value] of headers) {
      if (key == "Content-Type" && value == "application/json") {
        isJson = true;
        break;
      }
    }
  } else if (headers instanceof Headers) {
    isJson = headers.get("Content-Type") === "application/json";
  } else {
    isJson = headers["Content-Type"] === "application/json";
  }

  return isJson ? JSON.parse(args[1].body) : undefined;
}

export function RequestTrackingProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState(new Map<string, RequestTrackingValue>());

  // MARK: Wrap `http` transport requests
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const requestTimestamp = Date.now();
      let key = "";

      const ethJsonRpcRequest = extractEthJsonRpcRequest(...args);
      const ethJsonRpcRequests = ethJsonRpcRequest
        ? Array.isArray(ethJsonRpcRequest)
          ? ethJsonRpcRequest
          : [ethJsonRpcRequest]
        : [];

      // Track request
      ethJsonRpcRequests.forEach((r) => {
        const value = {
          provider: args[0].toString(),
          method: r.method,
          requestTimestamp,
        };
        key = cyrb64Hash(JSON.stringify({ ...value, params: r.params }));

        setLogs((x) => {
          const y = new Map(x);
          y.set(key, value);
          return y;
        });
      });

      const response = await originalFetch(...args);

      // Track response
      ethJsonRpcRequests.forEach((r) => {
        setLogs((x) => {
          const y = new Map(x);
          y.set(key, {
            provider: args[0].toString(),
            method: r.method,
            requestTimestamp,
            responseTimestamp: Date.now(),
            responseStatus: response.status,
          });
          return y;
        });
      });

      return response;
    };

    // Cleanup
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // MARK: Wrap `unstable_connector` transport requests
  useEffect(() => {
    // @ts-expect-error: `window.ethereum` is not typed
    const originalEthereumRequest = window.ethereum?.request;
    if (!originalEthereumRequest) return;

    // @ts-expect-error: `window.ethereum` is not typed
    window.ethereum.request = async (args: { method: string; params?: unknown[] }) => {
      const requestTimestamp = Date.now();
      let key = "";

      const shouldTrack = args.method.startsWith("eth_");

      // Track request
      if (shouldTrack) {
        const value = {
          provider: "Wallet",
          method: args.method,
          requestTimestamp,
        };
        key = cyrb64Hash(JSON.stringify({ ...value, params: args.params }));

        setLogs((x) => {
          const y = new Map(x);
          y.set(key, value);
          return y;
        });
      }

      try {
        const response = await originalEthereumRequest(args);

        // Track response
        if (shouldTrack) {
          setLogs((x) => {
            const y = new Map(x);
            y.set(key, {
              provider: "Wallet",
              method: args.method,
              requestTimestamp,
              responseTimestamp: Date.now(),
              responseStatus: 200,
            });
            return y;
          });
        }

        return response;
      } catch (e) {
        // Track response
        if (shouldTrack) {
          setLogs((x) => {
            const y = new Map(x);
            y.set(key, {
              provider: "Wallet",
              method: args.method,
              requestTimestamp,
              responseTimestamp: Date.now(),
              responseStatus: 500,
            });
            return y;
          });
        }
        throw e;
      }
    };

    // Cleanup
    return () => {
      // @ts-expect-error: `window.ethereum` is not typed
      window.ethereum.request = originalEthereumRequest;
    };
  }, []);

  const clearLogs = useCallback(() => setLogs(new Map()), [setLogs]);

  return <RequestTrackingContext.Provider value={{ logs, clearLogs }}>{children}</RequestTrackingContext.Provider>;
}
