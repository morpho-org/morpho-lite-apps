import { metaMorphoAbi } from "@morpho-org/uikit/assets/abis/meta-morpho";
import { metaMorphoFactoryAbi } from "@morpho-org/uikit/assets/abis/meta-morpho-factory";
import { Avatar, AvatarFallback, AvatarImage } from "@morpho-org/uikit/components/shadcn/avatar";
import { Card, CardContent } from "@morpho-org/uikit/components/shadcn/card";
import { Progress } from "@morpho-org/uikit/components/shadcn/progress";
import { Sheet, SheetTrigger } from "@morpho-org/uikit/components/shadcn/sheet";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@morpho-org/uikit/components/shadcn/table";
import useContractEvents from "@morpho-org/uikit/hooks/use-contract-events/use-contract-events";
import { getContractDeploymentInfo } from "@morpho-org/uikit/lib/deployments";
import { abbreviateAddress, formatBalanceWithSymbol, getTokenSymbolURI, Token } from "@morpho-org/uikit/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import { blo } from "blo";
// @ts-expect-error: this package lacks types
import humanizeDuration from "humanize-duration";
import { useMemo } from "react";
import { Address, erc20Abi, erc4626Abi } from "viem";
import { useAccount, useChainId, useReadContracts } from "wagmi";

import { CtaCard } from "@/components/cta-card";
import { EarnSheetContent } from "@/components/earn-sheet-content";
import { RequestChart } from "@/components/request-chart";

function TokenTableCell({ address, symbol, imageSrc }: Token) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-4 w-4 rounded-sm">
        <AvatarImage src={imageSrc} alt="Avatar" />
        <AvatarFallback delayMs={500}>
          <img src={blo(address)} />
        </AvatarFallback>
      </Avatar>
      {symbol ?? "－"}
      <span className="text-tertiary-foreground font-mono">{abbreviateAddress(address)}</span>
    </div>
  );
}

export function EarnSubPage() {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  const urlSearchParams = new URLSearchParams(window.location.search);
  const isDev = urlSearchParams.has("dev");

  const [factory, factoryV1_1] = useMemo(
    () => [
      getContractDeploymentInfo(chainId, "MetaMorphoFactory"),
      getContractDeploymentInfo(chainId, "MetaMorphoV1_1Factory"),
    ],
    [chainId],
  );

  // MARK: Fetch `MetaMorphoFactory.CreateMetaMorpho` on all factory versions so that we have all deployments
  const {
    logs: { all: createMetaMorphoEvents },
    isFetching: isFetchingCreateMetaMorphoEvents,
    fractionFetched: ffCreateMetaMorphoEvents,
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

  // MARK: Fetch `ERC4626.Deposit` so that we know where user has deposited. Includes non-MetaMorpho ERC4626 deposits
  const {
    logs: { all: depositEvents },
    isFetching: isFetchingDepositEvents,
    fractionFetched: ffDepositEvents,
  } = useContractEvents({
    chainId,
    abi: erc4626Abi,
    fromBlock: factory?.fromBlock ?? factoryV1_1?.fromBlock,
    reverseChronologicalOrder: true,
    eventName: "Deposit", // ERC-4626
    args: { receiver: userAddress },
    strict: true,
    query: {
      enabled:
        chainId !== undefined &&
        userAddress !== undefined &&
        // Wait to fetch so we don't get rate-limited.
        !isFetchingCreateMetaMorphoEvents,
    },
  });

  // MARK: Figure out what vaults the user is actually in, and the set of assets involved
  const [filteredCreateMetaMorphoArgs, assets] = useMemo(() => {
    const args = createMetaMorphoEvents
      .filter((ev) => depositEvents.some((deposit) => deposit.address === ev.args.metaMorpho.toLowerCase()))
      .map((ev) => ev.args);
    const unique = Array.from(new Set(args.map((x) => x.asset)));
    return [args, unique];
  }, [createMetaMorphoEvents, depositEvents]);

  // MARK: Fetch metadata for every ERC20 asset
  const { data: assetsInfo, isFetching: isFetchingAssetsInfo } = useReadContracts({
    contracts: assets
      .map((asset) => [
        { chainId, address: asset, abi: erc20Abi, functionName: "symbol" } as const,
        { chainId, address: asset, abi: erc20Abi, functionName: "decimals" } as const,
      ])
      .flat(),
    allowFailure: true,
    query: { staleTime: Infinity, gcTime: Infinity },
  });

  // MARK: Fetch metadata for every MetaMorpho vault
  const { data: vaultsInfo, isFetching: isFetchingVaultsInfo } = useReadContracts({
    contracts: filteredCreateMetaMorphoArgs
      .map((args) => [
        { chainId, address: args.metaMorpho, abi: metaMorphoAbi, functionName: "owner" } as const,
        { chainId, address: args.metaMorpho, abi: metaMorphoAbi, functionName: "curator" } as const,
        { chainId, address: args.metaMorpho, abi: metaMorphoAbi, functionName: "guardian" } as const,
        { chainId, address: args.metaMorpho, abi: metaMorphoAbi, functionName: "timelock" } as const,
        { chainId, address: args.metaMorpho, abi: metaMorphoAbi, functionName: "name" } as const,
        { chainId, address: args.metaMorpho, abi: metaMorphoAbi, functionName: "totalAssets" } as const,
        { chainId, address: args.metaMorpho, abi: metaMorphoAbi, functionName: "totalSupply" } as const,
        {
          chainId,
          address: args.metaMorpho,
          abi: metaMorphoAbi,
          functionName: "balanceOf",
          args: [userAddress ?? "0x"],
        } as const,
      ])
      .flat(),
    allowFailure: false,
    query: { staleTime: 10 * 60 * 1000, gcTime: Infinity, placeholderData: keepPreviousData },
  });

  const vaults = useMemo(() => {
    const arr = filteredCreateMetaMorphoArgs.map((args, idx) => {
      const assetIdx = assets.indexOf(args.asset);
      const symbol = assetIdx > -1 ? (assetsInfo?.[assetIdx * 2 + 0].result as string) : undefined;
      const decimals = assetIdx > -1 ? (assetsInfo?.[assetIdx * 2 + 1].result as number) : undefined;
      const chunkIdx = idx * 8;
      return {
        address: args.metaMorpho,
        imageSrc: blo(args.metaMorpho),
        info: vaultsInfo
          ? {
              owner: vaultsInfo[chunkIdx + 0] as Address,
              curator: vaultsInfo[chunkIdx + 1] as Address,
              guardian: vaultsInfo[chunkIdx + 2] as Address,
              timelock: vaultsInfo[chunkIdx + 3] as bigint,
              name: vaultsInfo[chunkIdx + 4] as string,
              totalAssets: vaultsInfo[chunkIdx + 5] as bigint,
              totalSupply: vaultsInfo[chunkIdx + 6] as bigint,
              userShares: vaultsInfo[chunkIdx + 7] as bigint,
            }
          : undefined,
        asset: {
          address: args.asset,
          imageSrc: getTokenSymbolURI(symbol),
          symbol,
          decimals,
        } as Token,
      };
    });
    // Sort vaults so that ones with an open balance appear first
    arr.sort((a, b) => {
      if (!a.info?.userShares && !b.info?.userShares) return 0;
      if (!a.info?.userShares) return 1;
      if (!b.info?.userShares) return -1;
      return 0;
    });
    return arr;
  }, [filteredCreateMetaMorphoArgs, assets, assetsInfo, vaultsInfo]);

  let totalProgress = isFetchingCreateMetaMorphoEvents
    ? ffCreateMetaMorphoEvents
    : isFetchingDepositEvents
      ? 1 + ffDepositEvents
      : isFetchingAssetsInfo
        ? 2
        : isFetchingVaultsInfo
          ? 3
          : 4;
  if (!userAddress) totalProgress = 0;

  const progressCard = (
    <Card className="bg-primary h-min md:h-full">
      <CardContent className="flex h-full flex-col gap-2 p-6 text-xs font-light">
        <div className="flex justify-between">
          <span>Indexing vaults</span>
          {(ffCreateMetaMorphoEvents * 100).toFixed(2)}%
        </div>
        <Progress
          progressColor="bg-secondary-foreground"
          finalColor="bg-green-400"
          value={ffCreateMetaMorphoEvents * 100}
          className="bg-secondary"
        />
        <div className="flex justify-between">
          <span>Indexing your deposits</span>
          {(ffDepositEvents * 100).toFixed(2)}%
        </div>
        <Progress
          progressColor="bg-secondary-foreground"
          finalColor="bg-green-400"
          value={ffDepositEvents * 100}
          className="bg-secondary mb-auto"
        />
        <div className="bottom-0 flex justify-between">
          <i>Total Progress</i>
          {((totalProgress * 100) / 4).toFixed(2)}%
        </div>
        <Progress
          progressColor="bg-secondary-foreground"
          finalColor="bg-green-400"
          value={(totalProgress * 100) / 4}
          className="bg-secondary"
        />
      </CardContent>
    </Card>
  );

  return (
    <div className="flex min-h-screen flex-col px-2.5">
      {userAddress === undefined ? (
        <CtaCard
          className="flex w-full max-w-5xl flex-col gap-4 px-8 pb-14 pt-24 md:m-auto md:grid md:grid-cols-[50%_50%] md:px-0 md:pt-32 dark:bg-neutral-900"
          bigText="Earn on your terms"
          littleText="Connect wallet to get started"
          videoSrc={{
            mov: "https://cdn.morpho.org/v2/assets/videos/earn-animation.mov",
            webm: "https://cdn.morpho.org/v2/assets/videos/earn-animation.webm",
          }}
        />
      ) : isDev ? (
        <div className="flex w-full max-w-5xl flex-col gap-4 px-8 pb-14 pt-24 md:m-auto md:grid md:grid-cols-[40%_60%] md:px-0 md:pt-32 dark:bg-neutral-900">
          {progressCard}
          <RequestChart />
        </div>
      ) : (
        <div className="flex h-96 w-full max-w-5xl flex-col gap-4 px-8 pb-14 pt-24 md:m-auto md:px-0 md:pt-32 dark:bg-neutral-900">
          {progressCard}
        </div>
      )}
      <div className="bg-background dark:bg-background/30 flex grow justify-center rounded-t-xl">
        <div className="text-primary-foreground w-full max-w-5xl px-8 pb-32 pt-8">
          <Table className="border-separate border-spacing-y-3">
            <TableCaption>
              Showing vaults where you've deposited.
              <br />
              Click on a vault to manage your deposit.
            </TableCaption>
            <TableHeader className="bg-primary text-secondary-foreground">
              <TableRow>
                <TableHead className="rounded-l-lg pl-4 text-xs font-light">Vault</TableHead>
                <TableHead className="text-xs font-light">Asset</TableHead>
                <TableHead className="text-nowrap text-xs font-light">Total Supply</TableHead>
                <TableHead className="text-nowrap text-xs font-light">Balance</TableHead>
                <TableHead className="text-xs font-light">Curator</TableHead>
                <TableHead className="rounded-r-lg text-xs font-light">Timelock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vaults.map((vault) => (
                <Sheet key={vault.address}>
                  <SheetTrigger asChild>
                    <TableRow className="bg-primary">
                      <TableCell className="rounded-l-lg p-5">
                        <TokenTableCell address={vault.address} symbol={vault.info?.name} imageSrc={vault.imageSrc} />
                      </TableCell>
                      <TableCell>
                        <TokenTableCell {...vault.asset} />
                      </TableCell>
                      <TableCell>
                        {vault.info?.totalAssets && vault.asset.decimals
                          ? formatBalanceWithSymbol(
                              vault.info.totalAssets,
                              vault.asset.decimals,
                              vault.asset.symbol,
                              5,
                              true,
                            )
                          : "－"}
                      </TableCell>
                      <TableCell>
                        {vault.info && vault.asset.decimals
                          ? formatBalanceWithSymbol(
                              (vault.info.userShares * vault.info.totalAssets) / vault.info.totalSupply,
                              vault.asset.decimals,
                              vault.asset.symbol,
                              5,
                              true,
                            )
                          : "－"}
                      </TableCell>
                      <TableCell>{vault.info?.owner ? abbreviateAddress(vault.info.owner) : "－"}</TableCell>
                      <TableCell className="rounded-r-lg">
                        {vault.info ? humanizeDuration(Number(vault.info.timelock) * 1000) : "－"}
                      </TableCell>
                    </TableRow>
                  </SheetTrigger>
                  <EarnSheetContent vaultAddress={vault.address} asset={vault.asset} />
                </Sheet>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
