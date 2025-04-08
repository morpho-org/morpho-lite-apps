import { metaMorphoAbi } from "@morpho-blue-offchain-public/uikit/assets/abis/meta-morpho";
import { metaMorphoFactoryAbi } from "@morpho-blue-offchain-public/uikit/assets/abis/meta-morpho-factory";
import useContractEvents from "@morpho-blue-offchain-public/uikit/hooks/use-contract-events/use-contract-events";
import { readAccrualVaults, readAccrualVaultsStateOverride } from "@morpho-blue-offchain-public/uikit/lens/read-vaults";
import { getTokenSymbolURI, Token } from "@morpho-blue-offchain-public/uikit/lib/utils";
import {
  AccrualPosition,
  AccrualVault,
  MarketId,
  Vault,
  VaultMarketAllocation,
  VaultMarketConfig,
  VaultMarketPublicAllocatorConfig,
} from "@morpho-org/blue-sdk";
import { useMemo } from "react";
import { useOutletContext } from "react-router";
import { Address, Chain, erc20Abi, isAddressEqual, zeroAddress } from "viem";
import { useAccount, useReadContract, useReadContracts } from "wagmi";

import { CtaCard } from "@/components/cta-card";
import { EarnTable, Row } from "@/components/earn-table";
import { useMarkets } from "@/hooks/use-markets";
import { useTopNCurators } from "@/hooks/use-top-n-curators";
import { CORE_DEPLOYMENTS, getContractDeploymentInfo, MIN_TIMELOCK } from "@/lib/constants";

const STALE_TIME = 5 * 60 * 1000;

export function EarnSubPage() {
  const { status, address: userAddress } = useAccount();
  const { chain } = useOutletContext() as { chain?: Chain };
  const chainId = chain?.id;

  const [morpho, factory, factoryV1_1] = useMemo(
    () => [
      getContractDeploymentInfo(chainId, "Morpho"),
      getContractDeploymentInfo(chainId, "MetaMorphoFactory"),
      getContractDeploymentInfo(chainId, "MetaMorphoV1_1Factory"),
    ],
    [chainId],
  );

  // MARK: Index `MetaMorphoFactory.CreateMetaMorpho` on all factory versions to get a list of all vault addresses
  const {
    logs: { all: createMetaMorphoEvents },
    fractionFetched,
  } = useContractEvents({
    chainId,
    abi: metaMorphoFactoryAbi,
    address: factoryV1_1 ? [factoryV1_1.address].concat(factory ? [factory.address] : []) : [],
    fromBlock: factory?.fromBlock ?? factoryV1_1?.fromBlock,
    reverseChronologicalOrder: true,
    eventName: "CreateMetaMorpho",
    strict: true,
    query: { enabled: chainId !== undefined },
  });

  // MARK: Fetch additional data for vaults owned by the top 5 curators from core deployments
  const top5Curators = useTopNCurators({ n: 5, verifiedOnly: true, chainIds: [...CORE_DEPLOYMENTS] });
  const { data: vaultsData } = useReadContract({
    chainId,
    ...readAccrualVaults(
      morpho?.address ?? "0x",
      createMetaMorphoEvents.map((ev) => ev.args.metaMorpho),
      // NOTE: This assumes that if a curator controls an address on one chain, they control it across all chains.
      top5Curators.flatMap((curator) => curator.addresses?.map((entry) => entry.address as Address) ?? []),
    ),
    stateOverride: [readAccrualVaultsStateOverride()],
    query: {
      enabled: chainId !== undefined && fractionFetched > 0.99 && !!morpho?.address,
      staleTime: STALE_TIME,
      gcTime: Infinity,
      notifyOnChangeProps: ["data"],
    },
  });

  const marketIds = useMemo(() => [...new Set(vaultsData?.flatMap((d) => d.vault.withdrawQueue) ?? [])], [vaultsData]);
  const markets = useMarkets({ chainId, marketIds, staleTime: STALE_TIME });
  const vaults = useMemo(() => {
    const vaults: AccrualVault[] = [];
    vaultsData?.forEach((vaultData) => {
      const { vault: address, supplyQueue, withdrawQueue, ...iVault } = vaultData.vault;
      // NOTE: pending values are placeholders
      const vault = new Vault({
        ...iVault,
        address,
        supplyQueue: supplyQueue as MarketId[],
        withdrawQueue: withdrawQueue as MarketId[],
        pendingOwner: zeroAddress,
        pendingGuardian: { value: zeroAddress, validAt: 0n },
        pendingTimelock: { value: 0n, validAt: 0n },
      });

      if (
        vault.name === "" ||
        vault.totalAssets === 0n ||
        vault.timelock < MIN_TIMELOCK ||
        markets === undefined ||
        vaultData.allocations.some((allocation) => markets[allocation.id] === undefined)
      ) {
        return;
      }

      // NOTE: pending values and `publicAllocatorConfig` are placeholders
      const allocations = vaultData.allocations.map((allocation) => {
        const market = markets[allocation.id];

        return new VaultMarketAllocation({
          config: new VaultMarketConfig({
            vault: address,
            marketId: allocation.id as MarketId,
            cap: allocation.config.cap,
            pendingCap: { value: 0n, validAt: 0n },
            removableAt: allocation.config.removableAt,
            enabled: allocation.config.enabled,
            publicAllocatorConfig: new VaultMarketPublicAllocatorConfig({
              vault: address,
              marketId: allocation.id as MarketId,
              maxIn: 0n,
              maxOut: 0n,
            }),
          }),
          position: new AccrualPosition({ user: address, ...allocation.position }, market),
        });
      });

      vaults.push(new AccrualVault(vault, allocations));
    });
    vaults.sort((a, b) => (a.netApy > b.netApy ? -1 : 1));
    return vaults;
  }, [vaultsData, markets]);

  // MARK: Fetch metadata for every ERC20 asset
  const tokenAddresses = useMemo(() => {
    const tokenAddressesSet = new Set(
      vaults.map((vault) => [vault.asset, ...vault.collateralAllocations.keys()]).flat(),
    );
    tokenAddressesSet.delete(zeroAddress);
    const tokenAddresses = [...tokenAddressesSet];
    tokenAddresses.sort(); // sort so that any query keys derived from this don't change
    return tokenAddresses;
  }, [vaults]);

  const { data: tokenData } = useReadContracts({
    contracts: tokenAddresses
      .map((asset) => [
        { chainId, address: asset, abi: erc20Abi, functionName: "symbol" } as const,
        { chainId, address: asset, abi: erc20Abi, functionName: "decimals" } as const,
      ])
      .flat(),
    allowFailure: true,
    query: { staleTime: Infinity, gcTime: Infinity },
  });

  const tokens = useMemo(() => {
    const tokens = new Map<Address, { decimals?: number; symbol?: string }>();
    tokenAddresses.forEach((tokenAddress, idx) => {
      const symbol = tokenData?.[idx * 2 + 0].result as string | undefined;
      const decimals = tokenData?.[idx * 2 + 1].result as number | undefined;
      tokens.set(tokenAddress, { decimals, symbol });
    });
    return tokens;
  }, [tokenAddresses, tokenData]);

  // MARK: Fetch user's balance in each vault
  const { data: maxWithdrawsData, refetch: refetchMaxWithdraws } = useReadContracts({
    contracts: vaultsData?.map(
      (vaultData) =>
        ({
          chainId,
          address: vaultData.vault.vault,
          abi: metaMorphoAbi,
          functionName: "maxWithdraw",
          args: userAddress && [userAddress],
        }) as const,
    ),
    allowFailure: false,
    query: {
      enabled: chainId !== undefined && !!userAddress,
      staleTime: STALE_TIME,
      gcTime: Infinity,
    },
  });

  const maxWithdraws = useMemo(
    () =>
      Object.fromEntries(vaultsData?.map((vaultData, idx) => [vaultData.vault.vault, maxWithdrawsData?.[idx]]) ?? []),
    [vaultsData, maxWithdrawsData],
  ) as { [vault: Address]: bigint | undefined };

  const rows = useMemo(() => {
    return vaults.map((vault) => {
      const { decimals, symbol } = tokens.get(vault.asset) ?? { decimals: undefined, symbol: undefined };

      const curators: Row["curators"] = {};
      for (const curator of top5Curators) {
        for (const roleName of ["owner", "curator", "guardian"] as const) {
          const address = curator.addresses
            ?.map((entry) => entry.address as Address)
            .find((a) => isAddressEqual(a, vault[roleName]));
          if (!address) continue;

          const roleNameCapitalized = `${roleName.charAt(0).toUpperCase()}${roleName.slice(1)}`;
          if (curators[curator.name]) {
            curators[curator.name].roles.push({ name: roleNameCapitalized, address });
          } else {
            curators[curator.name] = {
              name: curator.name,
              roles: [{ name: roleNameCapitalized, address }],
              url: curator.url,
              imageSrc: curator.image,
            };
          }
        }
      }

      return {
        vault,
        asset: {
          address: vault.asset,
          imageSrc: getTokenSymbolURI(symbol),
          symbol,
          decimals,
        } as Token,
        curators,
        maxWithdraw: maxWithdraws[vault.address],
        imageSrc: getTokenSymbolURI(symbol),
      };
    });
  }, [vaults, tokens, maxWithdraws, top5Curators]);

  const userRows = rows.filter((row) => (row.maxWithdraw ?? 0n) > 0n);

  if (status === "reconnecting") return undefined;

  return (
    <div className="flex min-h-screen flex-col px-2.5 pt-16">
      {status === "disconnected" ? (
        <CtaCard
          className="flex w-full max-w-5xl flex-col gap-4 px-8 pb-14 pt-8 md:m-auto md:grid md:grid-cols-[50%_50%] md:px-0 dark:bg-neutral-900"
          bigText="Earn on your terms"
          littleText="Connect wallet to get started"
          videoSrc={{
            mov: "https://cdn.morpho.org/v2/assets/videos/earn-animation.mov",
            webm: "https://cdn.morpho.org/v2/assets/videos/earn-animation.webm",
          }}
        />
      ) : (
        userRows.length > 0 && (
          <div className="flex h-fit w-full max-w-5xl flex-col gap-4 px-8 pb-14 pt-8 md:m-auto md:px-0 dark:bg-neutral-900">
            <EarnTable
              chain={chain}
              rows={userRows}
              depositsMode="maxWithdraw"
              tokens={tokens}
              refetchPositions={refetchMaxWithdraws}
            />
          </div>
        )
      )}
      <div className="bg-background dark:bg-background/30 flex grow justify-center rounded-t-xl pb-32">
        <EarnTable
          chain={chain}
          rows={rows}
          depositsMode="totalAssets"
          tokens={tokens}
          refetchPositions={refetchMaxWithdraws}
        />
      </div>
    </div>
  );
}
