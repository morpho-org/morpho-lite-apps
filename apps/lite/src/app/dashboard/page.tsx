import WatermarkSvg from "@morpho-org/uikit/assets/powered-by-morpho.svg?react";
import { Button } from "@morpho-org/uikit/components/shadcn/button";
import { WalletMenu } from "@morpho-org/uikit/components/wallet-menu";
import { getChainSlug } from "@morpho-org/uikit/lib/utils";
import { ConnectKitButton } from "connectkit";
import { useCallback, useEffect, useMemo } from "react";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router";
import { useChains } from "wagmi";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { MorphoMenu } from "@/components/morpho-menu";
import { RewardsButton } from "@/components/rewards-button";
import { WelcomeModal } from "@/components/welcome-modal";
import { APP_DETAILS, CORE_DEPLOYMENTS, WORDMARK } from "@/lib/constants";

enum SubPage {
  Earn = "earn",
  Borrow = "borrow",
}

function ConnectWalletButton() {
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

export default function Page() {
  const navigate = useNavigate();
  const { chain: selectedChainSlug } = useParams();

  const location = useLocation();
  const locationSegments = location.pathname.toLowerCase().split("/").slice(1);
  const selectedSubPage = locationSegments.at(1) === SubPage.Borrow ? SubPage.Borrow : SubPage.Earn;

  const chains = useChains();
  const chain = useMemo(
    () => chains.find((chain) => getChainSlug(chain) === selectedChainSlug),
    [chains, selectedChainSlug],
  );

  const setSelectedChainSlug = useCallback(
    (value: string) => {
      void navigate(`../${value}/${selectedSubPage}`, { replace: true, relative: "path" });
      // If selected chain is a core deployment, open main app in a new tab (we don't navigate away in
      // case they're using this because the main app is down).
      // if ([...CORE_DEPLOYMENTS].map((id) => getChainSlug(extractChain({ chains, id }))).includes(value)) {
      //   window.open(`https://app.morpho.org/${value}/${selectedSubPage}`, "_blank", "noopener,noreferrer");
      // }
    },
    [navigate, selectedSubPage],
  );

  useEffect(() => {
    document.title = `${APP_DETAILS.name} | ${selectedSubPage.charAt(0).toUpperCase()}${selectedSubPage.slice(1)}`;
  }, [selectedSubPage]);

  return (
    <div className="bg-background">
      <Header className="flex items-center justify-between px-5 py-3" chainId={chain?.id}>
        <div className="text-primary-foreground flex items-center gap-4">
          {WORDMARK.length > 0 ? (
            <>
              <img className="max-h-[24px]" src={WORDMARK} />
              <WatermarkSvg height={24} className="text-primary-foreground/50 w-[170px] min-w-[170px]" />
            </>
          ) : (
            <MorphoMenu />
          )}
          <div className="flex items-center gap-0.5 rounded-full bg-transparent p-1 md:gap-2">
            <Link to={SubPage.Earn} relative="path">
              <Button
                variant={selectedSubPage === SubPage.Earn ? "tertiary" : "secondaryTab"}
                size="lg"
                className="rounded-full px-4 font-light md:px-6"
              >
                Earn
              </Button>
            </Link>
            <Link to={SubPage.Borrow} relative="path">
              <Button
                variant={selectedSubPage === SubPage.Borrow ? "tertiary" : "secondaryTab"}
                size="lg"
                className="rounded-full px-4 font-light md:px-6"
              >
                Borrow
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RewardsButton chainId={chain?.id} />
          <WalletMenu
            selectedChainSlug={selectedChainSlug!}
            setSelectedChainSlug={setSelectedChainSlug}
            connectWalletButton={<ConnectWalletButton />}
            coreDeployments={CORE_DEPLOYMENTS}
          />
        </div>
      </Header>
      <WelcomeModal />
      <Outlet context={{ chain }} />
      <Footer />
    </div>
  );
}
