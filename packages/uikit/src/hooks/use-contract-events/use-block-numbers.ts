import { type QueryKey, useQueries, type UseQueryOptions } from "@tanstack/react-query";
import { useMemo } from "react";
import { type BlockNumber, type BlockTag } from "viem";
import { type UsePublicClientReturnType } from "wagmi";

type Tuple<T> = readonly T[];
type Mapped<T extends Tuple<unknown>, V> = { [K in keyof T]: V };

/**
 * Concretizes an array of block numbers/tags by converting tags to numbers.
 */
export function useBlockNumbers<T extends Tuple<BlockNumber | BlockTag>, U = Mapped<T, BlockNumber>>({
  publicClient,
  blockNumbersOrTags,
  query,
}: {
  publicClient: UsePublicClientReturnType;
  blockNumbersOrTags: T;
  query?: Omit<
    UseQueryOptions<BlockNumber, Error, BlockNumber>,
    | "meta"
    | "queryKey"
    | "queryFn"
    | "queryHash"
    | "queryKeyHashFn"
    | "notifyOnChangeProps"
    | "maxPages"
    | "_defaulted"
    | "_optimisticResults"
  >;
}) {
  const blockTags = useMemo(
    () => blockNumbersOrTags.filter((blockNumberOrTag) => typeof blockNumberOrTag !== "bigint"),
    [blockNumbersOrTags],
  );

  const results = useQueries({
    queries: blockTags.map((blockTag) => ({
      ...({
        // The following options can be overridden by `query` args
        refetchOnMount: "always",
        ...(query ?? {}),
        // The following options cannot be overriden
        meta: { publicClient },
        queryKey: ["useBlockNumbers", publicClient?.chain.id, blockTag],
        async queryFn({ queryKey, meta }: { queryKey: QueryKey; meta: Record<string, unknown> | undefined }) {
          if (meta === undefined) {
            throw new Error("useBlockNumbers queryFn requires query `meta` to be defined and well-formed.");
          }
          const publicClient = meta.publicClient as NonNullable<UsePublicClientReturnType>;
          const blockTag = queryKey[2] as BlockTag;
          return (await publicClient.getBlock({ blockTag, includeTransactions: false })).number!;
        },
        enabled: publicClient !== undefined && (query?.enabled ?? true),
      } as const),
      notifyOnChangeProps: ["data" as const],
    })),
  });

  return useMemo(() => {
    const r = [...results];

    const blockNumbers: BlockNumber[] = [];

    for (const blockNumberOrTag of blockNumbersOrTags) {
      const blockNumber = typeof blockNumberOrTag === "bigint" ? blockNumberOrTag : r.splice(0, 1)[0].data;
      if (blockNumber === undefined) return { data: undefined };
      blockNumbers.push(blockNumber);
    }

    return { data: blockNumbers as U };
  }, [blockNumbersOrTags, results]);
}
