import type { JobPayload, MarketYield } from "../types";

// Handler for checking market yields
export async function handleMarketYieldCheck(values: JobPayload[]): Promise<void> {
  if (values.length === 0) {
    return;
  }

  // TODO: Implement logic to:
  // 1. Fetch yields for all watched markets
  // 2. Compare with threshold or previous value
  // 3. Send notification if yield changed significantly

  for (const value of values) {
    const market = value as MarketYield;
    // TODO: Fetch yield for this market
    // const yield = await fetchMarketYield(market.chainId, market.marketId);
    // if (yield changed significantly) {
    //   await showNotification(...);
    // }
    console.log("Market yield check:", market);
  }
}
