import { type Token } from "@morpho-org/uikit/lib/utils";
import { useMemo } from "react";
import { type Hex, type Address } from "viem";

import * as Merkl from "@/hooks/use-merkl-campaigns";

export type MerklOpportunities = {
  campaignId: string;
  opportunityId: string;
  startTimestamp: number;
  endTimestamp: number;
  name: string;
  description: string;
  depositUrl: string | null;
  tags: string[];
  rewardToken: Token;
  apr: number;
  dailyRewards: number;
}[];

export function useMerklOpportunities({ chainId, subType }: { chainId: number | undefined; subType: Merkl.SubType }) {
  const { data: campaigns } = Merkl.useMerklCampaigns({ chainId, subType });

  const paramKey = useMemo(() => {
    let paramKey = "";
    switch (subType) {
      case Merkl.SubType.LEND:
        paramKey = "targetToken";
        break;
      case Merkl.SubType.BORROW:
        paramKey = "marketId";
        break;
    }
    return paramKey;
  }, [subType]);

  return useMemo(() => {
    const rewardsMap = new Map<Hex, MerklOpportunities>();

    campaigns?.forEach((campaign) => {
      const {
        campaignId,
        startTimestamp,
        endTimestamp,
        rewardToken,
        params: { blacklist, whitelist, ...params },
        Opportunity: opportunity,
      } = campaign;
      const paramKeyValue = params[paramKey] as Hex;

      if (blacklist.length > 0 && whitelist.length > 0) {
        console.warn(`Skipping campaignId ${campaignId} because blacklist/whitelist isn't implemented.`);
        return;
      }

      if (!rewardsMap.has(paramKeyValue)) {
        rewardsMap.set(paramKeyValue, []);
      }

      if (rewardsMap.get(paramKeyValue)!.some((item) => item.opportunityId === opportunity.id)) {
        // Multiple campaigns can reference the same `opportunity.id`
        return;
      }

      const reportedApr = opportunity.apr;
      const computedApr = (100 * (opportunity.dailyRewards * 365)) / opportunity.tvl;
      if (computedApr * 1.0001 < reportedApr) {
        console.warn(
          `Skipping opportunity ${opportunity.id} because reported APR doesn't apply to full deposit amount.`,
          opportunity,
        );
        return;
      }

      rewardsMap.get(paramKeyValue)!.push({
        campaignId,
        opportunityId: opportunity.id,
        startTimestamp,
        endTimestamp,
        name: opportunity.name,
        description: opportunity.description,
        depositUrl: opportunity.depositUrl,
        tags: opportunity.tags,
        rewardToken: {
          address: rewardToken.address as Address,
          symbol: rewardToken.symbol,
          decimals: rewardToken.decimals,
          imageSrc: rewardToken.icon,
        },
        apr: opportunity.apr,
        dailyRewards: opportunity.dailyRewards,
      });
    });

    return rewardsMap;
  }, [campaigns, paramKey]);
}
