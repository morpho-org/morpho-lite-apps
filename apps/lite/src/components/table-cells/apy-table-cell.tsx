import { SafeLink } from "@morpho-org/uikit/components/safe-link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@morpho-org/uikit/components/shadcn/tooltip";
import { formatApy, getDomain } from "@morpho-org/uikit/lib/utils";
import { Sparkles, SignalHigh, ExternalLink, DollarSign } from "lucide-react";
import { parseUnits } from "viem";

import { type MerklOpportunities } from "@/hooks/use-merkl-opportunities";

export function ApyTableCell({
  nativeApy,
  fee = 0n,
  rewards,
  mode,
}: {
  nativeApy: bigint;
  fee?: bigint;
  rewards: MerklOpportunities;
  mode: "earn" | "owe";
}) {
  if (mode === "owe" && fee > 0n) {
    console.warn(`You've specified a fee of ${fee} for borrowing. Are you sure that's right?`);
  }

  // NOTE: To lower-bound, we assume rewards do not compound, so APR=APY.
  const rewardsApy = parseUnits(rewards.reduce((acc, x) => acc + x.apr, 0).toString(), 16);
  const feeApy = (fee * nativeApy) / 10n ** 18n;
  const netApy = mode === "earn" ? nativeApy - feeApy + rewardsApy : nativeApy + feeApy - rewardsApy;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="hover:bg-secondary ml-[-8px] flex w-min items-center gap-2 rounded-sm p-2">
            {formatApy(netApy)}
            {rewards.length > 0 && <Sparkles className="text-morpho-brand h-4 w-4" />}
          </div>
        </TooltipTrigger>
        <TooltipContent
          className="text-primary-foreground rounded-3xl p-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex w-[240px] min-w-max flex-col gap-3">
            <div className="flex justify-between">
              <div className="flex items-end font-light">
                <SignalHigh size={18} />
                Native APY
              </div>
              {formatApy(nativeApy)}
            </div>
            {rewards.map((reward) => (
              <div className="flex justify-between gap-1" key={reward.opportunityId}>
                <div className="flex items-end gap-1 font-light">
                  <img height={16} width={16} src={reward.rewardToken.imageSrc} />
                  {reward.rewardToken.symbol}
                  {reward.depositUrl && getDomain(reward.depositUrl) !== window.location.hostname && (
                    <SafeLink
                      href={reward.depositUrl}
                      className="bg-morpho-brand flex items-center gap-1 rounded-sm px-1"
                    >
                      {getDomain(reward.depositUrl)}
                      <ExternalLink className="h-3 w-3" />
                    </SafeLink>
                  )}
                </div>
                {mode === "earn" ? "+" : "-"}
                {formatApy(parseUnits(reward.apr.toFixed(18), 16))}
              </div>
            ))}
            {fee > 0n || mode === "earn" ? (
              <div className="flex justify-between">
                <div className="flex items-end font-light">
                  <DollarSign size={18} />
                  Performance Fee
                  <div className="bg-foreground/25 mx-1 rounded-sm px-1">{formatApy(fee)}</div>
                </div>
                {formatApy(feeApy)}
              </div>
            ) : undefined}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
