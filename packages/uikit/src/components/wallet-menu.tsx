import { blo } from "blo";
import { PowerOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Address, Chain } from "viem";
import { mainnet } from "viem/chains";
import { useAccount, useConnect, useDisconnect, useEnsAvatar, useEnsName, useSwitchChain } from "wagmi";

import { ChainIcon } from "@/components/chain-icon";
import { Avatar, AvatarImage } from "@/components/shadcn/avatar";
import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import { getChainSlug } from "@/lib/utils";

function ConnectWalletButton() {
  const { connectors, connect } = useConnect();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="blue" size="lg" className="rounded-full font-light">
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Please exercise caution. This is not the main Morpho interface. The following wallets were detected:
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {connectors.map((connector) => (
            <Button
              key={connector.uid}
              variant="outline"
              onClick={() => {
                // Manually close the modal when the connector is connecting
                // This indicates the connector's modal/popup is or will soon be open
                connector.emitter.once("connect", () => setIsDialogOpen(false));
                connect({ connector });
              }}
            >
              {connector.icon && <img width={20} height={20} src={connector.icon} alt={`${connector.name} icon`} />}
              {connector.name}
            </Button>
          ))}
        </div>
        <DialogFooter>
          <i className="text-secondary-foreground text-xs font-light">
            This tool is provided “as is”, at your own risk, and without warranties of any kind. No developer or entity
            involved in creating the tool will be liable for any claims or damages whatsoever associated with your use,
            inability to use, or your interaction with other users of, the tool, including any direct, indirect,
            incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies,
            tokens, or anything else of value.
          </i>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WalletButton({ address }: { address: Address }) {
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName ?? undefined });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="tertiary" size="lg" className="rounded-full p-4 font-light">
          <Avatar className="h-4 w-4">
            <AvatarImage src={ensAvatar ?? blo(address)} alt="Avatar" />
          </Avatar>
          {ensName ?? `${address.slice(0, 6)}...${address.slice(-4)}`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-min rounded-xl">
        <div className="flex items-center gap-2 font-mono font-light">
          <Avatar className="h-4 w-4">
            <AvatarImage src={ensAvatar ?? blo(address)} alt="Avatar" />
          </Avatar>
          {`${address.slice(0, 10)}...${address.slice(-8)}`}
          <Button variant="outline" onClick={() => disconnect()}>
            <PowerOff />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function WalletMenu({
  selectedChainSlug,
  setSelectedChainSlug,
  defaultChain = mainnet,
}: {
  selectedChainSlug: string;
  setSelectedChainSlug: (value: string) => void;
  defaultChain?: Chain;
}) {
  const { chain: chainInWallet, address, connector, isConnected } = useAccount();
  const { chains, switchChain } = useSwitchChain();

  const chainInUi = useMemo(
    () => chains.find((chain) => getChainSlug(chain) === selectedChainSlug) ?? defaultChain,
    [chains, selectedChainSlug, defaultChain],
  );

  useEffect(() => {
    if (connector?.switchChain !== undefined && chainInWallet !== undefined && chainInWallet.id !== chainInUi.id) {
      switchChain({ chainId: chainInUi.id });
    }
  }, [connector?.switchChain, chainInUi, chainInWallet, switchChain]);

  return (
    <>
      <Select
        value={selectedChainSlug}
        onValueChange={(value: string) => {
          const target = chains.find((chain) => getChainSlug(chain) === value);
          if (target && getChainSlug(target) !== selectedChainSlug) {
            setSelectedChainSlug(getChainSlug(target));
          }
        }}
      >
        <SelectTrigger className="bg-tertiary-dark h-[40px] w-16 rounded-full">
          <SelectValue aria-label={chainInWallet?.name}>
            <ChainIcon id={chainInWallet?.id} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {chains.map((chain, idx) => (
              <SelectItem key={idx} value={getChainSlug(chain)}>
                <ChainIcon id={chain.id} /> {chain.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {isConnected && address ? <WalletButton address={address} /> : <ConnectWalletButton />}
    </>
  );
}
