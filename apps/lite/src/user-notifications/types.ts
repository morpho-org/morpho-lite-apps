export type JobType = "HEALTH_FACTOR" | "MARKET_YIELD";

export interface HealthFactor {
  chainId: number;
  address: string;
  borrowId: string;
}

export interface MarketYield {
  chainId: number;
  marketId: string;
}

export type JobPayload = HealthFactor | MarketYield;

export type SWMessage =
  | {
      type: "HEALTH_FACTOR";
      payload: HealthFactor[];
    }
  | {
      type: "MARKET_YIELD";
      payload: MarketYield[];
    };
