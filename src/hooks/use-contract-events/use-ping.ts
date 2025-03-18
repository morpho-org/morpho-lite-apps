import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

export function usePing({
  url = "https://www.google.com/generate_204",
  query,
}: {
  url?: string;
  query?: Omit<
    UseQueryOptions<number, Error, number>,
    "meta" | "queryKey" | "queryFn" | "queryHash" | "queryKeyHashFn" | "maxPages" | "_defaulted" | "_optimisticResults"
  >;
} = {}) {
  return useQuery({
    // The following options can be overridden by `query` args
    refetchOnMount: "always",
    ...(query ?? {}),
    // The following options cannot be overriden
    queryKey: ["usePing", url],
    async queryFn({ queryKey }) {
      const t0 = performance.now();
      await fetch(`${queryKey[1]}?cacheBuster=${Math.random()}`, { cache: "no-store", mode: "no-cors" });
      return performance.now() - t0;
    },
    enabled: query?.enabled ?? true,
  });
}
