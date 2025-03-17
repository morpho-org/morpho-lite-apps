import { useQuery } from "@tanstack/react-query";

export function usePing(url = "https://www.google.com/generate_204") {
  return useQuery({
    queryKey: ["ping", url],
    async queryFn({ queryKey }) {
      const t0 = performance.now();
      await fetch(`${queryKey[1]}?cacheBuster=${Math.random()}`, { cache: "no-store", mode: "no-cors" });
      return performance.now() - t0;
    },
    refetchOnMount: "always",
    staleTime: 60 * 1_000,
    gcTime: 0,
    retry: true,
  });
}
