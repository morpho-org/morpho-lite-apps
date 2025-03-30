import { type useEIP1193Transports } from "@/hooks/use-contract-events/use-transports";

type EIP1193Transport = ReturnType<typeof useEIP1193Transports>[number];

export type RequestStats = {
  transportId: EIP1193Transport["id"];
  status: "success" | "failure";
  timestamp0: number;
  timestamp1: number;
  numBlocks: bigint;
}[];

export type AnnotatedTransport = EIP1193Transport & {
  timeout: number;
  retryCount: number;
  retryDelay: number;
  maxNumBlocks: bigint | "unconstrained";
};

// TODO: Add fields for requests-per-second (see other TODO) and return transport tiers/groups rather than individuals.
//       Each tier/group would have an associated property that indicates whether a transport should be randomly
//       selected (potentially weighted by score) or if transports should be called in parallel with Promise.race.
//       Random selection would be useful when we have multiple "good" transports to choose from, and Promise.race
//       would be helpful when 1 or more transports aren't covered by `supportsNumBlocks` and fail to respond --
//       i.e. they just timeout rather than erroring when asked for eth_getLogs. The race could eliminate these
//       unnecessary timeouts.
//
//       These tweaks mainly improve the worst-case-scenario (slow or novel/untested/user-specified RPCs), so I'm
//       opting not to implement them for now.
export type Strategy = AnnotatedTransport[];

const BLOCK_BINS = [1n, 1_000n, 2_000n, 5_000n, 10_000n, "unconstrained" as const];
const ORDINARY_RETRIES = 4; // Num of `eth_getLogs` retries in bins that have succeeded before
const EXPLORATORY_RETRIES = 1; // Num of `eth_getLogs` retries in untested bins
const ORDINARY_RETRY_DELAY = 50; // Delay to pass to viem if retrying in bins that have have succeeded before (ms)
const EXPLORATORY_RETRY_DELAY = 50; // Delay to pass to viem if retrying in untested bins (ms)
const LOOKBACK_WINDOW = 30_000; // How far into the past to look when computing stats (ms)
const ALPHA = 0.8; // EMA decay constant (should be between 0 and 1)

function ema(x: number, update: number, alpha: number) {
  return alpha * x + (1 - alpha) * update;
}

function supportsNumBlocks(transportId: string, numBlocks: bigint | "unconstrained") {
  if (transportId.includes("no-events")) return false;
  if (transportId.includes("alchemy")) return true;
  if (transportId.includes("tenderly.co")) return true;
  if (
    transportId.includes("drpc") ||
    transportId.includes("nodies.app") ||
    transportId.includes("mainnet.base.org") ||
    transportId.includes("lava.build")
  ) {
    return numBlocks !== "unconstrained" && numBlocks <= 10_000n;
  }

  // default: assume it's supported and allow strategy to figure it out on the fly
  return true;
}

export function getStrategyBasedOn<Transport extends EIP1193Transport>(
  transports: Transport[],
  requestStats: RequestStats,
  ping: number | undefined,
) {
  if (!ping) return [];

  const transportStats = new Map<
    EIP1193Transport["id"],
    {
      // Track successes and failures to determine whether to use each bin.
      // Track latency to set future request timeouts.
      // Track throughput to sort transports within a given bin.
      // TODO: Measure wall clock throughput rather than per-request throughput, specify requests-per-second
      //       as part of returned obj, and then gradually increase it as long as throughput doesn't suffer.
      blockBinsStats: (
        | {
            success: number;
            failure: number;
            reliabilityEma: number;
            latencyEma: number;
            throughputEma: number;
          }
        | undefined
      )[];
    }
  >();

  // Sort `requestStats` chronologically by the time each request was sent
  const sortedRequestStats = [...requestStats];
  sortedRequestStats.sort((a, b) => a.timestamp0 - b.timestamp0);

  let totalRequestCount = 0;

  // Populate `transportStats` using `requestStats`
  const now = Date.now();
  sortedRequestStats.forEach((r) => {
    if (r.timestamp0 < now - LOOKBACK_WINDOW) return;
    totalRequestCount += 1;

    const reliability = r.status === "success" ? 1 : 0;
    const latency = r.timestamp1 - r.timestamp0;
    const throughput = Number(r.status === "success" ? r.numBlocks : 0n) / (latency + 1);

    const mapEntry: ReturnType<typeof transportStats.get> = transportStats.get(r.transportId) ?? {
      blockBinsStats: new Array(BLOCK_BINS.length).fill(undefined),
    };

    // Figure out which bin the request corresponds to
    const blockBinsIdx = BLOCK_BINS.findIndex((bin) => bin === "unconstrained" || r.numBlocks <= bin);

    if (mapEntry.blockBinsStats[blockBinsIdx] === undefined) {
      mapEntry.blockBinsStats[blockBinsIdx] = {
        success: 0,
        failure: 0,
        reliabilityEma: reliability,
        latencyEma: latency,
        throughputEma: throughput,
      };
    }

    // Update bin stats
    const arrEntry = mapEntry.blockBinsStats[blockBinsIdx];
    arrEntry[r.status] += 1;
    arrEntry.reliabilityEma = ema(arrEntry.reliabilityEma, reliability, ALPHA);
    arrEntry.latencyEma = ema(arrEntry.latencyEma, latency, ALPHA);
    arrEntry.throughputEma = ema(arrEntry.throughputEma, throughput, ALPHA);

    // Update map (in case this was a new entry obj)
    transportStats.set(r.transportId, mapEntry);
  });

  const strategy: (AnnotatedTransport & { score: number })[] = [];

  for (let i = BLOCK_BINS.length - 1; i >= 0; i -= 1) {
    const maxNumBlocks = BLOCK_BINS[i];

    for (const transport of transports) {
      if (!supportsNumBlocks(transport.id, maxNumBlocks)) continue;

      const stats = transportStats.get(transport.id);

      const successes = stats?.blockBinsStats[i]?.success ?? 0;
      const failures = stats?.blockBinsStats[i]?.failure ?? 0;
      const reliability = stats?.blockBinsStats[i]?.reliabilityEma;
      const latency = stats?.blockBinsStats[i]?.latencyEma;
      const throughput = stats?.blockBinsStats[i]?.throughputEma;

      let retryCount = EXPLORATORY_RETRIES;
      let retryDelay = EXPLORATORY_RETRY_DELAY;
      if (i === 0 || ((reliability ?? 0) > 0.5 && maxNumBlocks !== "unconstrained")) {
        retryCount = ORDINARY_RETRIES;
        retryDelay = ORDINARY_RETRY_DELAY;
      }

      const timeout = latency ? latency * 5 : ping * 20;
      const c = 0.75; // UCB coefficient (1.0 is standard, lower means less exploration)
      const k = (maxNumBlocks === "unconstrained" ? 1_000_000 : Number(maxNumBlocks)) / timeout; // UCB scaler
      const ucbValue = k * c * Math.sqrt(Math.log(totalRequestCount) / (successes + failures));
      const shouldUseUcb = i > BLOCK_BINS.length / 2 && (successes > 0 || failures < 3);

      strategy.push({
        ...transport,
        timeout,
        retryCount,
        retryDelay,
        maxNumBlocks,
        score: (throughput ?? 0) + (shouldUseUcb ? ucbValue : 0),
      });
    }
  }

  strategy.sort((a, b) => {
    if (a.score === b.score) {
      if (a.maxNumBlocks === b.maxNumBlocks) return a.timeout - b.timeout;
      if (a.maxNumBlocks === "unconstrained") return -1;
      if (b.maxNumBlocks === "unconstrained") return +1;
      return Number(b.maxNumBlocks - a.maxNumBlocks);
    }
    return b.score - a.score;
  });

  return strategy as Strategy;
}
