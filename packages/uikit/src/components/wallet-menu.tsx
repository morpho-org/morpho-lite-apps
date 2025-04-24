import { blo } from "blo";
import { ExternalLink, PowerOff } from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { type Address } from "viem";
import {
  useAccount,
  useAccountEffect,
  useConnect,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
  useSwitchChain,
} from "wagmi";

import MorphoSvg from "@/assets/morpho.svg?react";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { useModifierKey } from "@/hooks/use-modifier-key";
import { abbreviateAddress, getChainSlug } from "@/lib/utils";

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
        <Button variant="tertiary" size="lg" className="rounded-full p-3 font-light">
          <Avatar className="h-4 w-4">
            <AvatarImage src={ensAvatar ?? blo(address)} alt="Avatar" />
          </Avatar>
          <span className="hidden lg:block">{ensName ?? abbreviateAddress(address)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="bg-navbar-interactive w-min rounded-xl border-none" align="end" sideOffset={20}>
        <div className="flex items-center gap-2 font-mono text-sm font-light">
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
  connectWalletButton = <ConnectWalletButton />,
  coreDeployments = new Set(),
}: {
  selectedChainSlug: string;
  setSelectedChainSlug: (value: string) => void;
  connectWalletButton?: ReactNode;
  coreDeployments?: Set<number>;
}) {
  const [didInitialSync, setDidInitialSync] = useState(false);

  const { chain: chainInWallet, address, status } = useAccount();
  const { chains, switchChain } = useSwitchChain();
  useAccountEffect({ onDisconnect: () => setDidInitialSync(false) });

  // The chain currently selected and shown in the UI, as specified by `[selectedChainSlug, setSelectedChainSlug]`,
  // which may come from a simple `useState` or URL parsing + navigation.
  const chainInUi = useMemo(
    () => chains.find((chain) => getChainSlug(chain) === selectedChainSlug),
    [chains, selectedChainSlug],
  );

  useEffect(() => {
    // Wallet isn't connected, so we can't do anything.
    if (status !== "connected") return;

    if (!didInitialSync && chainInUi?.id !== undefined) {
      // Need initial sync (adjust wallet to match `chainInUi`)
      if (chainInUi.id !== chainInWallet?.id) {
        switchChain({ chainId: chainInUi.id }, { onSuccess: () => setDidInitialSync(true) });
      } else {
        setDidInitialSync(true);
      }
      return;
    }

    if (didInitialSync && chainInWallet?.id !== undefined && chainInWallet.id !== chainInUi?.id) {
      // After initial sync, updates flow the other way (adjust UI to match `chainInWallet`)
      setSelectedChainSlug(getChainSlug(chainInWallet));
      return;
    }
  }, [status, didInitialSync, chainInWallet, chainInUi?.id, switchChain, setSelectedChainSlug]);

  const isShiftHeld = useModifierKey("Shift");

  return (
    <>
      <Select
        value={selectedChainSlug}
        onValueChange={(value: string) => {
          const target = chains.find((chain) => getChainSlug(chain) === value);
          if (target && getChainSlug(target) !== selectedChainSlug) {
            if (status === "connected") {
              switchChain({ chainId: target.id });
            } else {
              setSelectedChainSlug(getChainSlug(target));
            }
          }
        }}
      >
        <SelectTrigger className="bg-navbar-interactive h-[40px] w-16 rounded-full">
          <SelectValue aria-label={chainInUi?.name}>
            <ChainIcon id={chainInUi?.id} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {chains
              .filter((chain) => !coreDeployments.has(chain.id))
              .map((chain, idx) => (
                <SelectItem key={idx} value={getChainSlug(chain)}>
                  <ChainIcon id={chain.id} /> {chain.name}
                </SelectItem>
              ))}
          </SelectGroup>
          {coreDeployments.size > 0 && (
            <SelectGroup>
              {(isShiftHeld || (chainInUi !== undefined && coreDeployments.has(chainInUi?.id))) && (
                <>
                  <SelectSeparator />
                  {chains
                    .filter((chain) => coreDeployments.has(chain.id))
                    .map((chain, idx) => (
                      <SelectItem
                        key={idx}
                        value={getChainSlug(chain)}
                        className="text-secondary-foreground focus:text-secondary-foreground"
                      >
                        <ChainIcon id={chain.id} /> {chain.name}
                      </SelectItem>
                    ))}
                </>
              )}
              <SelectSeparator />
              <SelectLabel
                className="bg-tertiary hover:bg-morpho-brand flex cursor-pointer items-center gap-2 rounded-sm font-normal"
                onClick={() => window.open("https://app.morpho.org/", "_blank", "noopener,noreferrer")}
              >
                <MorphoSvg height={16} width={16} /> Full App <ExternalLink className="h-4 w-4" />
              </SelectLabel>
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      {status === "connected" && address ? <WalletButton address={address} /> : connectWalletButton}
    </>
  );
}
