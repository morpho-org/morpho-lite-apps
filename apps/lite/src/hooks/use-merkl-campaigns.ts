import { MerklApi } from "@merkl/api";
import { type QueryKey, useQuery } from "@tanstack/react-query";

const merkl = MerklApi("https://api.merkl.xyz").v4;

export enum SubType {
  LEND,
  UNUSED,
  BORROW,
}

async function queryFn({ queryKey }: { queryKey: QueryKey }) {
  const [subType, chainId, withOpportunity] = queryKey.slice(4) as [SubType | undefined, number, boolean];

  const campaigns = await merkl.campaigns.index.get({
    query: {
      chainId,
      status: "LIVE",
      type: "MORPHO",
      withOpportunity,
      items: 100,
      ...(subType !== undefined ? { subType } : {}),
    },
  });

  if (campaigns.error) {
    console.error("Error fetching campaigns from Merkl API");
    throw new Error(JSON.stringify(campaigns.error));
  }

  return withOpportunity
    ? campaigns.data.filter((campaign) => campaign.Opportunity?.status === "LIVE")
    : campaigns.data;
}

export function useMerklCampaigns({
  chainId,
  subType,
  withOpportunity = true,
}: {
  chainId: number | undefined;
  subType?: SubType;
  withOpportunity?: boolean;
}) {
  return useQuery({
    queryKey: ["merkl", "campaigns", "LIVE", "MORPHO", subType, chainId, withOpportunity],
    queryFn,
    staleTime: 5 * 60 * 1_000,
    enabled: chainId !== undefined,
  });
}
