export type JobType = "HEALTH_FACTOR" | "MARKET_YIELD";

export interface HealthFactor {
  chainId: number;
  userAddress: string;
  to: string; // Multicall3 contract address
  data: string; // Encoded multicall
  threshold: number; // Health factor threshold
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
