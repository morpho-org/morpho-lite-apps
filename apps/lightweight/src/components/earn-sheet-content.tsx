import { Button } from "@morpho-blue-offchain-public/uikit/components/shadcn/button";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@morpho-blue-offchain-public/uikit/components/shadcn/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@morpho-blue-offchain-public/uikit/components/shadcn/tabs";
import { TokenAmountInput } from "@morpho-blue-offchain-public/uikit/components/token-amount-input";
import { TransactionButton } from "@morpho-blue-offchain-public/uikit/components/transaction-button";
import { formatBalance, Token } from "@morpho-blue-offchain-public/uikit/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import { CircleArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Toaster } from "sonner";
import { Address, erc4626Abi, extractChain, parseUnits } from "viem";
import { useAccount, useChainId, useChains, useReadContracts } from "wagmi";

enum Actions {
  Deposit = "Deposit",
  Withdraw = "Withdraw",
}

export function EarnSheetContent({ vaultAddress, asset }: { vaultAddress: Address; asset: Token }) {
  const chainId = useChainId();
  const chains = useChains();
  const chain = extractChain({ chains, id: chainId });
  const { address: userAddress } = useAccount();

  const [selectedTab, setSelectedTab] = useState(Actions.Withdraw);
  const [textInputValue, setTextInputValue] = useState("");

  const { data: maxes, refetch: refetchMaxes } = useReadContracts({
    contracts: [
      { address: vaultAddress, abi: erc4626Abi, functionName: "maxWithdraw", args: [userAddress ?? "0x"] },
      { address: vaultAddress, abi: erc4626Abi, functionName: "maxRedeem", args: [userAddress ?? "0x"] },
    ],
    allowFailure: false,
    query: { enabled: !!userAddress, staleTime: 1 * 60 * 1000, placeholderData: keepPreviousData },
  });

  const { inputValue, withdrawTxnConfig } = useMemo(() => {
    const inputValue = asset.decimals !== undefined ? parseUnits(textInputValue, asset.decimals) : undefined;
    const isReadyForConfig = userAddress !== undefined && inputValue !== undefined;
    const isMaxed = inputValue === maxes?.[0];

    return {
      inputValue,
      withdrawTxnConfig: isReadyForConfig
        ? isMaxed
          ? ({
              address: vaultAddress,
              abi: erc4626Abi,
              functionName: "redeem",
              args: [maxes![1], userAddress, userAddress],
            } as const)
          : ({
              address: vaultAddress,
              abi: erc4626Abi,
              functionName: "withdraw",
              args: [inputValue, userAddress, userAddress],
            } as const)
        : undefined,
    };
  }, [vaultAddress, userAddress, asset, textInputValue, maxes]);

  return (
    <SheetContent className="z-[9999] gap-3 overflow-y-scroll dark:bg-neutral-900">
      <Toaster theme="dark" position="bottom-left" richColors />
      <SheetHeader>
        <SheetTitle>Your Position</SheetTitle>
        <SheetDescription>
          You can view and edit your position here. To access all features and understand more about risks open this
          market in the{" "}
          <a
            className="underline"
            href={`https://app.morpho.org/${chain.name.toLowerCase()}/vault/${vaultAddress}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            full app.
          </a>
        </SheetDescription>
      </SheetHeader>
      <div className="bg-secondary mx-4 flex flex-col gap-4 rounded-2xl p-4">
        <div className="text-primary/70 flex items-center justify-between text-xs font-light">
          My position {asset.symbol ? `(${asset.symbol})` : ""}
          <img className="rounded-full" height={16} width={16} src={asset.imageSrc} />
        </div>
        <p className="text-lg font-medium">
          {maxes !== undefined && asset.decimals !== undefined ? formatBalance(maxes[0], asset.decimals, 5) : "－"}
        </p>
      </div>
      <Tabs
        defaultValue={Actions.Deposit}
        className="w-full gap-3 px-4"
        value={selectedTab}
        onValueChange={(value) => {
          setSelectedTab(value as Actions);
          setTextInputValue("");
        }}
      >
        <TabsList className="grid w-full grid-cols-2 bg-transparent p-0">
          {/* <TabsTrigger className="rounded-full" value={Actions.Deposit} disabled>
            {Actions.Deposit}
          </TabsTrigger> */}
          <TabsTrigger className="col-span-2 rounded-full" value={Actions.Withdraw}>
            {Actions.Withdraw}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={Actions.Deposit}>
          <div className="bg-secondary flex flex-col gap-4 rounded-2xl p-4">
            <div className="text-primary/70 flex items-center justify-between text-xs font-light">
              Deposit {asset.symbol ?? ""}
              <img className="rounded-full" height={16} width={16} src={asset.imageSrc} />
            </div>
            <TokenAmountInput decimals={asset.decimals} value={textInputValue} onChange={setTextInputValue} />
          </div>
          <Button className="text-md mt-3 h-12 w-full rounded-full font-light" variant="blue">
            Deposit
          </Button>
        </TabsContent>
        <TabsContent value={Actions.Withdraw}>
          <div className="bg-secondary flex flex-col gap-4 rounded-2xl p-4">
            <div className="text-primary/70 flex items-center justify-between text-xs font-light">
              Withdraw {asset.symbol ?? ""}
              <img className="rounded-full" height={16} width={16} src={asset.imageSrc} />
            </div>
            <TokenAmountInput
              decimals={asset.decimals}
              value={textInputValue}
              maxValue={maxes?.[0]}
              onChange={setTextInputValue}
            />
          </div>
          <TransactionButton
            variables={withdrawTxnConfig}
            disabled={!inputValue}
            onTxnReceipt={() => {
              setTextInputValue("");
              void refetchMaxes();
            }}
          >
            Withdraw
          </TransactionButton>
        </TabsContent>
      </Tabs>
      <SheetFooter>
        <SheetClose asChild>
          <Button className="text-md h-12 w-full rounded-full font-light" type="submit">
            <CircleArrowLeft />
            Back to list
          </Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  );
}
