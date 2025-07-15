import { MerklApi } from "@merkl/api";
import { type QueryKey, useQuery } from "@tanstack/react-query";

const merkl = MerklApi("https://api.merkl.xyz").v4;

export enum CampaignSide {
  EARN,
  BORROW,
  COLLATERALIZE,
}

export enum CampaignType {
  Old = "MORPHO",
  DepositToErc4626 = "ERC20LOGPROCESSOR",
  DepositToVaultV1 = "MORPHOVAULT",
  SupplyToMarketV1 = "MORPHOSUPPLY",
  SupplyCollateralToMarketV1 = "MORPHOCOLLATERAL",
  BorrowFromMarketV1 = "MORPHOBORROW",
}

export type CampaignSubType = 0 | 1 | 2;

export const CAMPAIGN_PARAM_KEYS: Record<CampaignType, Partial<Record<CampaignSubType, string>>> = {
  [CampaignType.Old]: { 0: "targetToken", 2: "marketId" },
  [CampaignType.DepositToErc4626]: { 0: "targetToken" },
  [CampaignType.DepositToVaultV1]: { 0: "targetToken" },
  [CampaignType.SupplyToMarketV1]: { 0: "market" },
  [CampaignType.BorrowFromMarketV1]: { 0: "market" },
  [CampaignType.SupplyCollateralToMarketV1]: { 0: "market" },
};

const SIDE_CAMPAIGN_TYPES: Record<CampaignSide, { type: CampaignType; subType?: CampaignSubType }[]> = {
  [CampaignSide.EARN]: [
    { type: CampaignType.Old, subType: 0 },
    { type: CampaignType.DepositToErc4626 },
    { type: CampaignType.DepositToVaultV1 },
    { type: CampaignType.SupplyToMarketV1 },
  ],
  [CampaignSide.BORROW]: [{ type: CampaignType.Old, subType: 2 }, { type: CampaignType.BorrowFromMarketV1 }],
  [CampaignSide.COLLATERALIZE]: [{ type: CampaignType.SupplyCollateralToMarketV1 }],
};

async function queryFn({ queryKey }: { queryKey: QueryKey }) {
  const [side, chainId, withOpportunity] = queryKey.slice(4) as [CampaignSide | undefined, number, boolean];

  // The basic query, specifying everything except `type` and `subType`
  const query = {
    chainId,
    withOpportunity,
    mainProtocolId: "morpho",
    status: "LIVE",
    items: 100,
  } as const;

  const promises: ReturnType<typeof merkl.campaigns.index.get>[] = [];

  if (side === undefined) {
    // Fetch with no type/subType filtering
    promises.push(merkl.campaigns.index.get({ query }));
  } else {
    // Fetch with type/subType filtering. `type`s that share a specific `subType`
    // can be combined for querying the Merkl API.
    const linearized = new Map<CampaignSubType | undefined, CampaignType[]>();
    for (const fields of SIDE_CAMPAIGN_TYPES[side]) {
      if (!linearized.has(fields.subType)) {
        linearized.set(fields.subType, []);
      }
      linearized.get(fields.subType)?.push(fields.type);
    }

    linearized.forEach((types, subType) =>
      promises.push(
        merkl.campaigns.index.get({
          query: {
            ...query,
            ...(types.length > 1 ? { types } : { type: types[0] }),
            ...(subType !== undefined ? { subType } : {}),
          },
        }),
      ),
    );
  }

  const results = await Promise.all(promises);
  for (const result of results) {
    if (result.error) {
      console.error("Error fetching campaigns from Merkl API");
      throw new Error(JSON.stringify(result.error));
    }
  }

  const campaigns = results.map((result) => result.data!).flat(1);

  return withOpportunity
    ? campaigns.filter((campaign) => campaign.Opportunity?.status === "LIVE" && campaign.parentCampaignId === undefined)
    : campaigns;
}

export function useMerklCampaigns({
  chainId,
  side,
  withOpportunity = true,
}: {
  chainId: number | undefined;
  side?: CampaignSide;
  withOpportunity?: boolean;
}) {
  return useQuery({
    queryKey: ["merkl", "campaigns", "LIVE", "MORPHO", side, chainId, withOpportunity],
    queryFn,
    staleTime: 5 * 60 * 1_000,
    enabled: chainId !== undefined,
  });
}
