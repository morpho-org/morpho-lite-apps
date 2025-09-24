import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useClient as useUrqlClient } from "urql";

import { graphql } from "@/graphql/graphql";
import { CuratorFragment, MANUALLY_WHITELISTED_CURATORS } from "@/lib/curators";

// NOTE: `state` is currently null; it's a work in progress on API side.
// Once that's done we can use this (with an orderBy) to get top N by AUM.
const curatorsQuery = graphql(
  `
    query CuratorsQuery($first: Int, $verified: Boolean) {
      curators(first: $first, where: { verified: $verified }) {
        items {
          ...Curator
          id
          state {
            aum
            curatorId
          }
        }
      }
    }
  `,
  [CuratorFragment],
);

// NOTE: `curators` is marked as work in progress, but `state` seems to actually populate correctly,
// so we're using this for now.
const vaultsQuery = graphql(`
  query VaultsQuery($first: Int, $chainIds: [Int!]) {
    vaults(where: { whitelisted: true, chainId_in: $chainIds }, orderBy: TotalAssetsUsd, first: $first) {
      items {
        chain {
          id
        }
        state {
          curators {
            id
            state {
              aum
              curatorId
            }
            verified
          }
        }
      }
    }
  }
`);

export function useTopNCurators({
  n,
  verifiedOnly = true,
  chainIds,
  staleTime = 1 * 60 * 60 * 1_000,
}: {
  n: number | "all";
  verifiedOnly?: boolean;
  chainIds: number[];
  staleTime?: number;
}) {
  const urqlClient = useUrqlClient();

  const { data: topNCuratorIds } = useQuery({
    queryKey: ["useTopNCurators", "vaultsQuery", chainIds, verifiedOnly],
    queryFn: async () => {
      const { data, error } = await urqlClient.query(vaultsQuery, { first: 1000, chainIds });
      if (error || data === undefined || data.vaults.items == null) {
        throw error ?? new Error("vaultsQuery GraphQL data was undefined or null.");
      }

      const vaultCuratorArrs = data.vaults.items.map((item) => item.state?.curators ?? []);
      const curatorsSet = new Set<string>();
      const curatorsArr: (typeof vaultCuratorArrs)[number] = [];

      for (const vaultCuratorArr of vaultCuratorArrs) {
        for (const curator of vaultCuratorArr) {
          if (curator.state == null || curatorsSet.has(curator.id) || (verifiedOnly && !curator.verified)) continue;

          curatorsSet.add(curator.id);
          curatorsArr.push(curator);
        }
      }

      // Sort by AUM, highest to lowest
      curatorsArr.sort((a, b) => b.state!.aum - a.state!.aum);
      return curatorsArr;
    },
    select: useCallback(
      (data: { id: string }[]) => {
        return new Set(data.slice(0, Number(n)).map((curator) => curator.id));
      },
      [n],
    ),
    staleTime,
    gcTime: Infinity,
    notifyOnChangeProps: ["data"],
    enabled: n !== "all" && chainIds.length > 0,
  });

  const { data: curators } = useQuery({
    queryKey: ["useTopNCurators", "curatorsQuery", verifiedOnly],
    queryFn: async () => {
      const { data, error } = await urqlClient.query(curatorsQuery, { first: 1000, verified: verifiedOnly });
      if (error || data === undefined || data.curators.items == null) {
        throw error ?? new Error("curatorsQuery GraphQL data was undefined or null.");
      }

      return data.curators.items;
    },
    staleTime,
    gcTime: Infinity,
    notifyOnChangeProps: ["data"],
  });

  return useMemo(() => {
    if (curators === undefined || (n !== "all" && topNCuratorIds === undefined)) return [];
    const filtered = n === "all" ? curators : curators.filter((curator) => topNCuratorIds?.has(curator.id));
    return filtered.concat(MANUALLY_WHITELISTED_CURATORS.map((curator) => ({ ...curator, id: "", state: null })));
  }, [topNCuratorIds, curators, n]);
}
