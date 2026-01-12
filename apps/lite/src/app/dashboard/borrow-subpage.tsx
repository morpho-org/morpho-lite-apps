import { AccrualPosition } from "@morpho-org/blue-sdk";
import { restructure } from "@morpho-org/blue-sdk-viem";
import { metaMorphoFactoryAbi } from "@morpho-org/uikit/assets/abis/meta-morpho-factory";
import { morphoAbi } from "@morpho-org/uikit/assets/abis/morpho";
import { oracleAbi } from "@morpho-org/uikit/assets/abis/oracle";
import useContractEvents from "@morpho-org/uikit/hooks/use-contract-events/use-contract-events";
import {
  marketHasDeadDeposit,
  readAccrualVaults,
  readAccrualVaultsStateOverride,
} from "@morpho-org/uikit/lens/read-vaults";
import { CORE_DEPLOYMENTS, getContractDeploymentInfo } from "@morpho-org/uikit/lib/deployments";
import { Token } from "@morpho-org/uikit/lib/utils";
import { useEffect, useMemo } from "react";
import { useOutletContext } from "react-router";
import { encodeFunctionData, type Address, erc20Abi, type Chain, zeroAddress, type Hex, multicall3Abi } from "viem";
import { useAccount, useReadContract, useReadContracts } from "wagmi";

import { BorrowPositionTable, BorrowTable } from "@/components/borrow-table";
import { CtaCard } from "@/components/cta-card";
import { useMarkets } from "@/hooks/use-markets";
import * as Merkl from "@/hooks/use-merkl-campaigns";
import { useMerklOpportunities } from "@/hooks/use-merkl-opportunities";
import { useTopNCurators } from "@/hooks/use-top-n-curators";
import { useUserNotifications } from "@/hooks/use-user-notifications";
import { type DisplayableCurators, getDisplayableCurators } from "@/lib/curators";
import { CREATE_METAMORPHO_EVENT_OVERRIDES, getDeploylessMode, getShouldEnforceDeadDeposit } from "@/lib/overrides";
import { getTokenURI } from "@/lib/tokens";
import type { HealthFactor } from "@/user-notifications/types";

const STALE_TIME = 5 * 60 * 1000;

// This cannot be inlined because TanStack needs a stable reference to avoid re-renders.
function restructurePositions(data: (readonly [bigint, bigint, bigint])[]) {
  return data.map((x) => restructure(x, { abi: morphoAbi, name: "position", args: ["0x", "0x"] }));
}

export function BorrowSubPage() {
  const { status, address: userAddress } = useAccount();
  const { chain } = useOutletContext() as { chain?: Chain };
  const chainId = chain?.id;

  const { monitorHealthFactor } = useUserNotifications();

  const DEFAULT_HEALTH_FACTOR_THRESHOLD = 3;

  const shouldOverrideCreateMetaMorphoEvents = chainId !== undefined && chainId in CREATE_METAMORPHO_EVENT_OVERRIDES;
  const shouldUseDeploylessReads = getDeploylessMode(chainId) === "deployless";
  const shouldEnforceDeadDeposit = getShouldEnforceDeadDeposit(chainId);

  const [morpho, factory, factoryV1_1] = useMemo(
    () => [
      getContractDeploymentInfo(chainId, "Morpho"),
      getContractDeploymentInfo(chainId, "MetaMorphoFactory"),
      getContractDeploymentInfo(chainId, "MetaMorphoV1_1Factory"),
    ],
    [chainId],
  );

  const borrowingRewards = useMerklOpportunities({ chainId, side: Merkl.CampaignSide.BORROW, userAddress });

  // MARK: Index `MetaMorphoFactory.CreateMetaMorpho` on all factory versions to get a list of all vault addresses
  const fromBlock = factory?.fromBlock ?? factoryV1_1?.fromBlock;
  const {
    logs: { all: createMetaMorphoEvents },
    fractionFetched,
  } = useContractEvents({
    chainId,
    abi: metaMorphoFactoryAbi,
    address: factoryV1_1 ? [factoryV1_1.address].concat(factory ? [factory.address] : []) : [],
    fromBlock,
    toBlock: "finalized",
    reverseChronologicalOrder: true,
    eventName: "CreateMetaMorpho",
    strict: true,
    query: { enabled: chainId !== undefined && !shouldOverrideCreateMetaMorphoEvents && fromBlock !== undefined },
  });
  const vaultAddresses = useMemo(
    () =>
      shouldOverrideCreateMetaMorphoEvents
        ? CREATE_METAMORPHO_EVENT_OVERRIDES[chainId]
        : createMetaMorphoEvents.map((ev) => ev.args.metaMorpho),
    [chainId, shouldOverrideCreateMetaMorphoEvents, createMetaMorphoEvents],
  );

  // MARK: Fetch additional data for whitelisted vaults
  const curators = useTopNCurators({ n: "all", verifiedOnly: true, chainIds: [...CORE_DEPLOYMENTS] });
  const { data: vaultsData } = useReadContract({
    chainId,
    ...readAccrualVaults(
      morpho?.address ?? "0x",
      vaultAddresses,
      curators.flatMap(
        (curator) =>
          curator.addresses?.filter((entry) => entry.chainId === chainId).map((entry) => entry.address as Address) ??
          [],
      ),
      // @ts-expect-error function signature overloading was meant for hard-coded `true` or `false`
      shouldUseDeploylessReads,
    ),
    stateOverride: shouldUseDeploylessReads ? undefined : [readAccrualVaultsStateOverride()],
    query: {
      enabled:
        chainId !== undefined && (fractionFetched > 0.99 || shouldOverrideCreateMetaMorphoEvents) && !!morpho?.address,
      staleTime: STALE_TIME,
      gcTime: Infinity,
      notifyOnChangeProps: ["data"],
    },
  });

  const marketIds = useMemo(() => {
    // Get a flat map of allocations[i].id across all vaults for allocations that meet certain criteria:
    // - they are actually enabled as a potential liquidity sink
    // - they have a dead deposit (or dead deposit enforcement is disabled)
    const filteredAllocationMarketIds = (vaultsData ?? []).flatMap((vd) =>
      vd.allocations
        .filter((alloc) => {
          const isEnabled = alloc.config.enabled;
          const isDeadDepositStateValid = !shouldEnforceDeadDeposit || marketHasDeadDeposit(vd, alloc.id);

          return isEnabled && isDeadDepositStateValid;
        })
        .map((alloc) => alloc.id),
    );
    return [...new Set(filteredAllocationMarketIds)];
  }, [shouldEnforceDeadDeposit, vaultsData]);
  const markets = useMarkets({ chainId, marketIds, staleTime: STALE_TIME, fetchPrices: true });
  const marketsArr = useMemo(() => {
    const marketsArr = Object.values(markets).filter(
      (market) =>
        market.totalSupplyAssets > 0n &&
        ![market.params.collateralToken, market.params.loanToken, market.params.irm, market.params.oracle].includes(
          zeroAddress,
        ),
    );
    marketsArr.sort((a, b) => {
      const primary = a.params.loanToken.localeCompare(b.params.loanToken);
      const secondary = a.liquidity > b.liquidity ? -1 : 1;
      return primary === 0 ? secondary : primary;
    });
    return marketsArr;
  }, [markets]);
  const marketVaults = useMemo(() => {
    const map = new Map<
      Hex,
      { name: string; address: Address; totalAssets: bigint; curators: DisplayableCurators }[]
    >();

    vaultsData?.forEach((vaultData) => {
      vaultData.allocations.forEach((allocation) => {
        if (!allocation.config.enabled || allocation.position.supplyShares === 0n) return;

        if (!map.has(allocation.id)) {
          map.set(allocation.id, []);
        }
        map.get(allocation.id)!.push({
          name: vaultData.vault.name,
          address: vaultData.vault.vault,
          totalAssets: vaultData.vault.totalAssets,
          curators: getDisplayableCurators({ ...vaultData.vault, address: vaultData.vault.vault }, curators, chainId),
        });
      });
    });

    return map;
  }, [vaultsData, curators, chainId]);

  const { data: erc20Symbols } = useReadContracts({
    contracts: marketsArr
      .map((market) => [
        { chainId, address: market.params.collateralToken, abi: erc20Abi, functionName: "symbol" } as const,
        { chainId, address: market.params.loanToken, abi: erc20Abi, functionName: "symbol" } as const,
      ])
      .flat(),
    allowFailure: true,
    query: { staleTime: Infinity, gcTime: Infinity },
  });

  const { data: erc20Decimals } = useReadContracts({
    contracts: marketsArr
      .map((market) => [
        { chainId, address: market.params.collateralToken, abi: erc20Abi, functionName: "decimals" } as const,
        { chainId, address: market.params.loanToken, abi: erc20Abi, functionName: "decimals" } as const,
      ])
      .flat(),
    allowFailure: true,
    query: { staleTime: Infinity, gcTime: Infinity },
  });

  const { data: positionsRaw, refetch: refetchPositionsRaw } = useReadContracts({
    contracts: marketsArr.map(
      (market) =>
        ({
          chainId,
          address: morpho?.address ?? "0x",
          abi: morphoAbi,
          functionName: "position",
          args: userAddress ? [market.id, userAddress] : undefined,
        }) as const,
    ),
    allowFailure: false,
    query: {
      staleTime: 1 * 60 * 1000,
      gcTime: Infinity,
      enabled: !!morpho,
      select: restructurePositions,
    },
  });

  const positions = useMemo(() => {
    if (marketsArr.length === 0 || positionsRaw === undefined || userAddress === undefined) {
      return undefined;
    }

    const map = new Map<Hex, AccrualPosition>();
    positionsRaw?.forEach((positionRaw, idx) => {
      const market = marketsArr[idx];
      map.set(market.id, new AccrualPosition({ user: userAddress, ...positionRaw }, market));
    });
    return map;
  }, [marketsArr, positionsRaw, userAddress]);

  const tokens = useMemo(() => {
    const map = new Map<Address, Token>();
    marketsArr.forEach((market, idx) => {
      const collateralTokenSymbol = erc20Symbols?.[idx * 2].result;
      const loanTokenSymbol = erc20Symbols?.[idx * 2 + 1].result;
      map.set(market.params.collateralToken, {
        address: market.params.collateralToken,
        symbol: collateralTokenSymbol,
        decimals: erc20Decimals?.[idx * 2].result,
        imageSrc: getTokenURI({ symbol: collateralTokenSymbol, address: market.params.collateralToken, chainId }),
      });
      map.set(market.params.loanToken, {
        address: market.params.loanToken,
        symbol: loanTokenSymbol,
        decimals: erc20Decimals?.[idx * 2 + 1].result,
        imageSrc: getTokenURI({ symbol: loanTokenSymbol, address: market.params.loanToken, chainId }),
      });
    });
    return map;
  }, [marketsArr, erc20Symbols, erc20Decimals, chainId]);

  // Enqueue borrows for monitoring when positions change
  useEffect(() => {
    if (positions && userAddress && chainId && morpho && marketsArr.length > 0) {
      const healthFactorJobs: HealthFactor[] = [];

      positions.forEach((position, marketId) => {
        const accruedPosition = position.accrueInterest(BigInt(Math.floor(Date.now() / 1000)));
        if (accruedPosition.borrowAssets > 0n) {
          const multicall3Address = chain?.contracts?.multicall3?.address;
          if (!multicall3Address) return;

          // Find the market to get oracle address
          const market = marketsArr.find((m) => m.id === marketId);
          if (!market) return;

          // Encode all required calls for health factor calculation
          const positionCalldata = encodeFunctionData({
            abi: morphoAbi,
            functionName: "position",
            args: [marketId, userAddress],
          });

          const marketParamsCalldata = encodeFunctionData({
            abi: morphoAbi,
            functionName: "idToMarketParams",
            args: [marketId],
          });

          const marketCalldata = encodeFunctionData({
            abi: morphoAbi,
            functionName: "market",
            args: [marketId],
          });

          const oraclePriceCalldata = encodeFunctionData({
            abi: oracleAbi,
            functionName: "price",
            args: [],
          });

          // Encode multicall aggregate3 with all calls (viem uses aggregate3 function)
          const multicallData = encodeFunctionData({
            abi: multicall3Abi,
            functionName: "aggregate3",
            args: [
              [
                { target: morpho.address, callData: positionCalldata, allowFailure: false },
                { target: morpho.address, callData: marketParamsCalldata, allowFailure: false },
                { target: morpho.address, callData: marketCalldata, allowFailure: false },
                { target: market.params.oracle, callData: oraclePriceCalldata, allowFailure: false },
              ],
            ],
          });

          healthFactorJobs.push({
            chainId: chainId,
            userAddress: userAddress,
            to: multicall3Address,
            data: multicallData,
            threshold: DEFAULT_HEALTH_FACTOR_THRESHOLD,
          });
        }
      });

      if (healthFactorJobs.length > 0) {
        void monitorHealthFactor(healthFactorJobs);
      }
    }
  }, [positions, userAddress, chainId, monitorHealthFactor, morpho, marketsArr, chain?.contracts?.multicall3?.address]);

  if (status === "reconnecting") return undefined;

  const userMarkets = marketsArr.filter((market) => positions?.get(market.id)?.collateral ?? 0n > 0n);

  return (
    <div className="flex min-h-screen flex-col px-2.5 pt-16">
      {status === "disconnected" ? (
        <div className="bg-linear-to-b flex w-full flex-col from-transparent to-white/[0.03] px-8 pb-20 pt-8">
          <CtaCard
            className="md:w-7xl flex flex-col gap-4 md:mx-auto md:max-w-full md:flex-row md:items-center md:justify-between"
            bigText="Provide collateral to borrow any asset"
            littleText="Connect wallet to get started"
            videoSrc={{
              mov: "https://cdn.morpho.org/v2/assets/videos/borrow-animation.mov",
              webm: "https://cdn.morpho.org/v2/assets/videos/borrow-animation.webm",
            }}
          />
        </div>
      ) : (
        userMarkets.length > 0 && (
          <div className="bg-linear-to-b lg:pt-22 flex h-fit w-full flex-col items-center from-transparent to-white/[0.03] pb-20">
            <div className="text-primary-foreground w-full max-w-7xl px-2 lg:px-8">
              <BorrowPositionTable
                chain={chain}
                markets={userMarkets}
                tokens={tokens}
                positions={positions}
                borrowingRewards={borrowingRewards}
                refetchPositions={refetchPositionsRaw}
              />
            </div>
          </div>
        )
      )}
      {/*
      Outer div ensures background color matches the end of the gradient from the div above,
      allowing rounded corners to show correctly. Inner div defines rounded corners and table background.
      */}
      <div className="flex grow flex-col bg-white/[0.03]">
        <div className="bg-linear-to-b from-background to-primary flex h-full grow justify-center rounded-t-xl pb-16 pt-8">
          <div className="text-primary-foreground w-full max-w-7xl px-2 lg:px-8">
            <BorrowTable
              chain={chain}
              markets={marketsArr}
              tokens={tokens}
              marketVaults={marketVaults}
              borrowingRewards={borrowingRewards}
              refetchPositions={refetchPositionsRaw}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
