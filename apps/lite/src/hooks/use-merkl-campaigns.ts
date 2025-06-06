import { MerklApi } from "@merkl/api";
import { type QueryKey, useQuery } from "@tanstack/react-query";

const merkl = MerklApi("https://api.merkl.xyz").v4;

export enum SubType {
  LEND,
  UNUSED,
  BORROW,
}

// Updated 06/06/2025, subject to change by Merkl
const MERKL_LISTING_TYPES: Record<SubType, string[]> = {
  [SubType.LEND]: ["MORPHOSUPPLY", "ERC20LOGPROCESSOR"], // market and vault-based lending, respectively
  [SubType.UNUSED]: [],
  [SubType.BORROW]: ["MORPHOBORROW"],
  // TODO: MORPHOCOLLATERAL (no campaigns with this for now, and UI doesn't support it)
};

async function queryFn({ queryKey }: { queryKey: QueryKey }) {
  const [subType, chainId, withOpportunity] = queryKey.slice(4) as [SubType | undefined, number, boolean];

  const [campaignsOld, campaignsNew] = await Promise.all([
    merkl.campaigns.index.get({
      query: {
        chainId,
        status: "LIVE",
        type: "MORPHO",
        withOpportunity,
        items: 100,
        ...(subType !== undefined ? { subType } : {}),
      },
    }),
    merkl.campaigns.index.get({
      query: {
        chainId,
        status: "LIVE",
        // @ts-expect-error: This version of the Merkl API package lacks this field, even though it's supported.
        // The next major version includes it, but breaks typing on the `Opportunity` return field
        mainProtocolId: "morpho",
        withOpportunity,
        items: 100,
        ...(subType !== undefined ? { types: MERKL_LISTING_TYPES[subType] } : {}),
      },
    }),
  ]);

  if (campaignsOld.error) {
    console.error("Error fetching campaigns from Merkl API");
    throw new Error(JSON.stringify(campaignsOld.error));
  }
  if (campaignsNew.error) {
    console.error("Error fetching campaigns from Merkl API");
    throw new Error(JSON.stringify(campaignsNew.error));
  }

  const campaigns = campaignsOld.data.concat(campaignsNew.data);
  return withOpportunity
    ? campaigns.filter((campaign) => campaign.Opportunity?.status === "LIVE" && campaign.parentCampaignId === undefined)
    : campaigns;
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
