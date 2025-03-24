import MorphoLogoSvg from "@morpho-blue-offchain-public/uikit/assets/morpho.svg?react";
import { Button } from "@morpho-blue-offchain-public/uikit/components/shadcn/button";
import { WalletMenu } from "@morpho-blue-offchain-public/uikit/components/wallet-menu";
import { ConnectKitButton } from "connectkit";
import { useCallback } from "react";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

enum SubPage {
  Earn = "earn",
  Borrow = "borrow",
}

function ConnectWalletButton() {
  return (
    <ConnectKitButton.Custom>
      {({ show }) => {
        return (
          <Button variant="blue" size="lg" className="rounded-full font-light" onClick={show}>
            Connect Wallet
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

  const setSelectedChainSlug = useCallback(
    (value: string) => navigate(`../${value}/${selectedSubPage}`, { replace: true, relative: "path" }),
    [navigate, selectedSubPage],
  );

  return (
    <div className="bg-gray-200 dark:bg-neutral-900">
      <Header className="flex items-center justify-between px-5 py-3">
        <div className="flex gap-4">
          <div className="text-primary flex items-center gap-2 text-xl">
            <MorphoLogoSvg width={24} height={24} />
            Morpho
          </div>
          <div className="flex items-center gap-2 rounded-full bg-transparent p-1">
            <Link to={SubPage.Earn} relative="path">
              <Button
                variant={selectedSubPage === SubPage.Earn ? "tertiary" : "secondaryTab"}
                size="lg"
                className="rounded-full font-light"
              >
                Earn
              </Button>
            </Link>
            <Link to={SubPage.Borrow} relative="path">
              <Button
                variant={selectedSubPage === SubPage.Borrow ? "tertiary" : "secondaryTab"}
                size="lg"
                className="rounded-full font-light"
              >
                Borrow
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WalletMenu
            selectedChainSlug={selectedChainSlug!}
            setSelectedChainSlug={setSelectedChainSlug}
            connectWalletButton={<ConnectWalletButton />}
          />
        </div>
      </Header>
      <Outlet />
      <Footer />
    </div>
  );
}
