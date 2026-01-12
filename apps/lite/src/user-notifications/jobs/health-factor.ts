import { AccrualPosition, Market, MarketParams } from "@morpho-org/blue-sdk";
import { restructure } from "@morpho-org/blue-sdk-viem";
import { morphoAbi } from "@morpho-org/uikit/assets/abis/morpho";
import { oracleAbi } from "@morpho-org/uikit/assets/abis/oracle";
import { decodeFunctionResult, multicall3Abi, type Address, type Hex } from "viem";

import { showNotification } from "../sw-handlers";
import type { HealthFactor, JobPayload } from "../types";

import { ethCall } from "@/lib/wagmi-config";

export function calculateHealthFactor(ltv: bigint | undefined, lltv: bigint): number | null {
  if (ltv === undefined || ltv === null || ltv === undefined) return null;
  return Number(lltv) / Number(ltv);
}

// Decode multicall aggregate3() result (viem uses aggregate3 function)
// aggregate3 returns: (struct Result { bool success; bytes returnData; }[] returnData)
function decodeMulticallResult(result: Hex): readonly Hex[] {
  const decoded = decodeFunctionResult({
    abi: multicall3Abi,
    functionName: "aggregate3",
    data: result,
  }) as readonly { success: boolean; returnData: Hex }[];

  // Extract returnData from each result (aggregate3 returns array of { success, returnData })
  return decoded.map((r) => r.returnData);
}

// Decode position result and restructure it
function decodePosition(result: Hex) {
  const positionTuple = decodeFunctionResult({
    abi: morphoAbi,
    functionName: "position",
    data: result,
  }) as readonly [bigint, bigint, bigint];

  return restructure(positionTuple, { abi: morphoAbi, name: "position", args: ["0x", "0x"] });
}

// Decode idToMarketParams result and restructure it
function decodeMarketParams(result: Hex) {
  const paramsTuple = decodeFunctionResult({
    abi: morphoAbi,
    functionName: "idToMarketParams",
    data: result,
  }) as readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, bigint];

  return restructure(paramsTuple, { abi: morphoAbi, name: "idToMarketParams", args: ["0x"] });
}

// Decode market result and restructure it
function decodeMarket(result: Hex) {
  const marketTuple = decodeFunctionResult({
    abi: morphoAbi,
    functionName: "market",
    data: result,
  }) as readonly [bigint, bigint, bigint, bigint, bigint, bigint];

  return restructure(marketTuple, { abi: morphoAbi, name: "market", args: ["0x"] });
}

// Decode oracle.price() result
function decodePrice(result: Hex) {
  return decodeFunctionResult({
    abi: oracleAbi,
    functionName: "price",
    data: result,
  }) as bigint;
}

// Handler for checking borrows health factors
export async function handleHealthFactor(values: JobPayload[]): Promise<void> {
  // Filter only HealthFactor jobs
  const healthFactorJobs = values.filter(
    (v): v is HealthFactor => "to" in v && "data" in v && typeof (v as HealthFactor).data === "string",
  );

  if (healthFactorJobs.length === 0) {
    return;
  }

  // Group by chainId to batch queries efficiently
  const jobsByChain = new Map<number, HealthFactor[]>();
  for (const job of healthFactorJobs) {
    if (!jobsByChain.has(job.chainId)) {
      jobsByChain.set(job.chainId, []);
    }
    jobsByChain.get(job.chainId)!.push(job);
  }

  // Process each chain
  for (const [chainId, jobs] of jobsByChain.entries()) {
    // Process each job
    for (const job of jobs) {
      try {
        // Make eth_call RPC call to multicall3 contract
        // The data is pre-encoded multicall aggregate3() with all required calls
        const multicallResult = await ethCall({
          chainId: job.chainId,
          to: job.to,
          data: job.data as `0x${string}`, // Encoded multicall aggregate3() calldata
        });

        // Decode multicall result (aggregate3 returns array of { success, returnData })
        const returnData = decodeMulticallResult(multicallResult);

        // Decode each result
        const positionRaw = decodePosition(returnData[0] as Hex);
        const marketParamsRaw = decodeMarketParams(returnData[1] as Hex);
        const marketRaw = decodeMarket(returnData[2] as Hex);
        const price = decodePrice(returnData[3] as Hex);

        // Create Market object
        const marketParams = new MarketParams(marketParamsRaw);
        const market = new Market({
          totalSupplyAssets: marketRaw.totalSupplyAssets,
          totalSupplyShares: marketRaw.totalSupplyShares,
          totalBorrowAssets: marketRaw.totalBorrowAssets,
          totalBorrowShares: marketRaw.totalBorrowShares,
          lastUpdate: marketRaw.lastUpdate,
          fee: marketRaw.fee,
          params: marketParams,
          rateAtTarget: undefined, // Not needed for LTV calculation
          price,
        });

        // Create AccrualPosition and accrue interest to get current LTV
        const accrualPosition = new AccrualPosition({ user: job.userAddress as Address, ...positionRaw }, market);
        const timestamp = BigInt(Math.floor(Date.now() / 1000));
        const accruedPosition = accrualPosition.accrueInterest(timestamp);

        const ltv = accruedPosition.ltv;
        const lltv = marketParams.lltv;

        // Calculate health factor
        const healthFactor = ltv !== null && ltv !== undefined ? calculateHealthFactor(ltv, lltv) : null;

        // Show notification if health factor is below threshold
        if (healthFactor !== null && healthFactor < job.threshold) {
          await showNotification(
            "Health Factor Alert",
            `Your position health factor is ${healthFactor.toFixed(2)} (below threshold of ${job.threshold}). Consider adding collateral or repaying debt.`,
            {
              tag: `health-factor-${chainId}`,
              requireInteraction: false, // macOS may block requireInteraction notifications
            },
          );
        }
      } catch (error) {
        console.error("Error processing health factor check:", error, {
          chainId,
          job: { chainId: job.chainId, userAddress: job.userAddress },
        });
        // Continue to next job on error
      }
    }
  }
}
