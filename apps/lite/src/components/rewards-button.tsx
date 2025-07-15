import { Avatar, AvatarImage, AvatarFallback } from "@morpho-org/uikit/components/shadcn/avatar";
import { Button } from "@morpho-org/uikit/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@morpho-org/uikit/components/shadcn/dialog";
import { formatBalance, formatBalanceWithSymbol } from "@morpho-org/uikit/lib/utils";
import { blo } from "blo";
import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { type Address } from "viem";
import { useAccount } from "wagmi";

import { NewsTicker } from "@/components/news-ticker";
import { useMerklCampaigns } from "@/hooks/use-merkl-campaigns";
import { useMerklRewards } from "@/hooks/use-merkl-rewards";
import { getTokenURI } from "@/lib/tokens";

export function RewardsButton({ chainId }: { chainId: number | undefined }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { address: userAddress } = useAccount();
  const { data: morphoCampaigns } = useMerklCampaigns({ chainId, side: undefined, withOpportunity: false });
  const rewards = useMerklRewards({
    chainId,
    address: userAddress,
    campaignIds: morphoCampaigns?.map((campaign) => campaign.campaignId) ?? [],
  });
  const claimables = useMemo(
    () =>
      rewards
        ?.map((reward) => ({
          ...reward,
          claimable: BigInt(reward.amount) - BigInt(reward.claimed),
        }))
        .filter((reward) => reward.claimable > 0n),
    [rewards],
  );

  if (userAddress === undefined || !claimables?.length) {
    return undefined;
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Button variant="tertiary" size="lg" className="rounded-full px-4 font-light">
          <Sparkles className="animate-rainbow h-4 w-4 fill-current" />
          <div className="hidden md:block">
            <NewsTicker width={110} spacing={16}>
              {claimables.map((reward) => (
                <span key={reward.token.address}>
                  {formatBalanceWithSymbol(reward.claimable, reward.token.decimals, reward.token.symbol, 3, true)}
                </span>
              ))}
            </NewsTicker>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-3 text-2xl font-light">Rewards</DialogTitle>
        </DialogHeader>
        <div className="bg-secondary text-primary-foreground rounded-lg p-4 font-light">
          {claimables.map((reward) => (
            <div
              key={reward.token.address}
              className="border-tertiary flex items-center justify-start gap-2 border-b p-2"
            >
              <Avatar className="h-4 w-4 rounded-full">
                <AvatarImage
                  src={getTokenURI({
                    symbol: reward.token.symbol,
                    address: reward.token.address as Address,
                    chainId: reward.token.chainId,
                  })}
                  alt="Avatar"
                />
                <AvatarFallback delayMs={200}>
                  <img src={blo(reward.token.address as Address)} />
                </AvatarFallback>
              </Avatar>
              <span className="font-normal">{reward.token.symbol}</span>
              <span className="ml-auto font-mono font-extrabold">
                {formatBalance(reward.claimable, reward.token.decimals, 8, false)}
              </span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            className="w-full rounded-full"
            variant="blue"
            onClick={() => window.open("https://app.merkl.xyz/", "_blank", "noopener,noreferrer")}
          >
            Claim in the Merkl App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
