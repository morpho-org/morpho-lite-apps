import { Button } from "@morpho-org/uikit/components/shadcn/button";
import { ConnectKitButton } from "connectkit";

export function ConnectWalletButton() {
  return (
    <ConnectKitButton.Custom>
      {({ show }) => {
        return (
          <Button variant="blue" size="lg" className="rounded-full px-4 font-light md:px-6" onClick={show}>
            <span className="inline md:hidden">Connect</span>
            <span className="hidden md:inline">Connect&nbsp;Wallet</span>
          </Button>
        );
      }}
    </ConnectKitButton.Custom>
  );
}
