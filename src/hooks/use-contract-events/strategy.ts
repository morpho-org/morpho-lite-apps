import { type useEIP1193Transports } from "@/hooks/use-contract-events/use-transports";

type EIP1193Transport = ReturnType<typeof useEIP1193Transports>[number];

export type RequestStats = {
  transportId: EIP1193Transport["id"];
  status: "success" | "failure";
  timestamp: number;
  latency: number;
  numBlocks: bigint;
}[];

export type AnnotatedTransport = EIP1193Transport & {
  timeout: number;
  retryCount: number;
  retryDelay: number;
  maxNumBlocks: bigint | "unconstrained";
};

export type Strategy = AnnotatedTransport[];

const BLOCK_BINS = [1n, 1_000n, 2_000n, 5_000n, 10_000n, 100_000n, "unconstrained" as const];
const INITIAL_TIMEOUT = 30_000; // (ms)
const ORDINARY_RETRIES = 4; // Num of `eth_getLogs` retries in bins that have succeeded before
const EXPLORATORY_RETRIES = 2; // Num of `eth_getLogs` retries when stepping up to next bin
const ORDINARY_RETRY_DELAY = 50; // Delay to pass to viem if retrying in bins that have have succeeded before (ms)
const EXPLORATORY_RETRY_DELAY = 50; // Delay to pass to viem if retrying when stepping up to next bin (ms)
const EXPLORATION_INITIATION_THRESHOLD = 1; // Num successes to get in current bin before exploring next one
const EXPLORATION_CANCELLATION_THRESHOLD = 3; // Num failures to tolerate before giving up (not counting viem internals)
const MAX_TIMEOUT = 30_000;

export function getStrategyBasedOn<Transport extends EIP1193Transport>(
  transports: Transport[],
  requestStats: RequestStats,
) {
  const transportStats = new Map<
    EIP1193Transport["id"],
    {
      latencyEma: number;
      stabilityEma: number;
      blockBinsStats: { success: number; failure: number }[];
      blockBinsBestIdxs: number[];
    }
  >();

  const computeCompositeScore = (
    stats: NonNullable<ReturnType<typeof transportStats.get>>,
    timeout: number,
    blockBinsBestIdx: number,
  ) => {
    const normalizedTimeout = timeout / MAX_TIMEOUT;
    const normalizedBin =
      BLOCK_BINS[blockBinsBestIdx] === "unconstrained"
        ? 1
        : Number(BLOCK_BINS[blockBinsBestIdx]) / (10 * Number(BLOCK_BINS.at(-2)));

    const wLatency = 0.1,
      wStability = 0.5,
      wBin = 0.5;
    return wStability * stats.stabilityEma - wLatency * normalizedTimeout + wBin * normalizedBin;
  };

  const sortedRequestStats = [...requestStats];
  sortedRequestStats.sort((a, b) => a.timestamp - b.timestamp);

  // Populate `transportStats` using `requestStats`
  sortedRequestStats.forEach((r) => {
    const entry = transportStats.get(r.transportId) ?? {
      latencyEma: r.latency,
      stabilityEma: 1.0,
      blockBinsStats: new Array(BLOCK_BINS.length).fill({ success: 0, failure: 0 }),
      blockBinsBestIdxs: [0],
    };

    // Figure out which bin the request corresponds to
    const blockBinsIdx = BLOCK_BINS.findIndex((bin) => bin === "unconstrained" || r.numBlocks <= bin);

    // Update EMA, success & failure counts, and the highest bin we've succeeded in so far
    entry.latencyEma = 0.8 * entry.latencyEma + 0.2 * r.latency;
    entry.stabilityEma = 0.8 * entry.stabilityEma + 0.2 * (r.status === "success" ? 1 : 0);
    entry.blockBinsStats[blockBinsIdx][r.status] += 1;
    if (r.status === "success") {
      entry.blockBinsBestIdxs = entry.blockBinsBestIdxs.slice(-10).concat(blockBinsIdx);
    }

    // Update map (in case this was a new entry obj)
    transportStats.set(r.transportId, entry);
  });

  const strategy: (AnnotatedTransport & { compositeScore: number })[] = [];

  transports.forEach((transport) => {
    // If we don't yet know anything about the transport, default to worst-case scenario
    if (!transportStats.has(transport.id)) {
      // TODO: allow custom defaults for each transport to be passed in
      strategy.push({
        ...transport,
        timeout: INITIAL_TIMEOUT,
        retryCount: ORDINARY_RETRIES,
        retryDelay: ORDINARY_RETRY_DELAY,
        maxNumBlocks: BLOCK_BINS[0],
        compositeScore: 1,
      });
      return;
    }

    const stats = transportStats.get(transport.id)!;
    const timeout = Math.min(stats.latencyEma * 5, MAX_TIMEOUT);
    const blockBinsBestIdx = Math.max(...stats.blockBinsBestIdxs);

    if (
      blockBinsBestIdx < BLOCK_BINS.length - 1 &&
      stats.blockBinsStats[blockBinsBestIdx].success >= EXPLORATION_INITIATION_THRESHOLD &&
      stats.blockBinsStats[blockBinsBestIdx].failure < EXPLORATION_CANCELLATION_THRESHOLD
    ) {
      // Explore next bin!!
      strategy.push({
        ...transport,
        timeout,
        retryCount: EXPLORATORY_RETRIES,
        retryDelay: EXPLORATORY_RETRY_DELAY,
        maxNumBlocks: BLOCK_BINS[blockBinsBestIdx + 1],
        compositeScore: computeCompositeScore(stats, timeout, blockBinsBestIdx),
      });
    }

    // NOTE: In addition to the current bin, we push all lower bins into the strategy.
    // This is important when response size is the limiting factor, like how Alchemy
    // won't return more than 10k events unless you request <=2k blocks.
    for (let i = blockBinsBestIdx; i >= 0; i -= 1) {
      strategy.push({
        ...transport,
        timeout,
        retryCount: ORDINARY_RETRIES,
        retryDelay: ORDINARY_RETRY_DELAY,
        maxNumBlocks: BLOCK_BINS[i],
        compositeScore: computeCompositeScore(stats, timeout, i),
      });
    }
  });

  strategy.sort((a, b) => {
    if (a.maxNumBlocks === b.maxNumBlocks) return b.compositeScore - a.compositeScore;
    if (a.maxNumBlocks === "unconstrained") return -1;
    if (b.maxNumBlocks === "unconstrained") return +1;
    return b.compositeScore - a.compositeScore;
  });

  console.log("NEW STRATEGY", strategy);

  return strategy as Strategy;
}
