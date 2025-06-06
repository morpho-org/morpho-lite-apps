import { MerklApi } from "@merkl/api";
import { useDeepMemo } from "@morpho-org/uikit/hooks/use-deep-memo";
import { type QueryKey, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { type Address } from "viem";

const merkl = MerklApi("https://api.merkl.xyz").v4;

async function queryFn({ queryKey }: { queryKey: QueryKey }) {
  const [chainId, address] = queryKey.slice(2) as [number, Address];

  // TODO: supports 1000 campaign breakdown items, but technically should be paginated
  const rewards = await merkl.users({ address }).rewards.get({
    query: { chainId: [chainId.toFixed(0)], claimableOnly: true },
  });

  if (rewards.error) {
    console.error("Error fetching user rewards from Merkl API");
    throw new Error(JSON.stringify(rewards.error));
  }

  return rewards.data[0].rewards;
}

export function useMerklRewards({
  chainId,
  address,
  campaignIds,
}: {
  chainId: number | undefined;
  address: Address | undefined;
  campaignIds?: string[];
}) {
  const { data: rewards } = useQuery({
    queryKey: ["merkl", "users", chainId, address, "claimableOnly"],
    queryFn,
    staleTime: 5 * 60 * 1_000,
    enabled: chainId !== undefined && address !== undefined,
  });

  const campaignIdsSet = useDeepMemo(
    () => (campaignIds === undefined ? undefined : new Set(campaignIds)),
    [campaignIds],
  );

  // Filter out rewards for campaigns that don't match `campaignIds`
  return useMemo(() => {
    return campaignIdsSet === undefined
      ? rewards
      : rewards?.filter((reward) => reward.breakdowns.some((breakdown) => campaignIdsSet.has(breakdown.campaignId)));
  }, [rewards, campaignIdsSet]);
}
