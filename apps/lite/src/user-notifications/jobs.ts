/// <reference lib="webworker" />
import type { HealthFactor, JobPayload, MarketYield } from "./types";
//import { showNotification } from "./show-notification";

// Handler for checking borrows health factors
export async function handleBorrowsCheck(values: JobPayload[]): Promise<void> {
  if (values.length === 0) {
    return;
  }

  // TODO: Implement logic to:
  // 1. Fetch health factors for all watched borrows
  // 2. Compare with threshold (e.g., 0.8)
  // 3. Send notification if health factor is below threshold

  for (const value of values) {
    const borrow = value as HealthFactor;
    // TODO: Fetch health factor for this borrow
    // const healthFactor = await fetchHealthFactor(borrow.chainId, borrow.address, borrow.borrowId);
    // if (healthFactor < threshold) {
    //   await showNotification(...);
    // }
    console.log("Health Factor Alert", borrow);
  }
}

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
    console.log("Market Yield Alert", market);
  }
}
