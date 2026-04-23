import MorphoLogoSvg from "@morpho-org/uikit/assets/morpho.svg?react";
import { Button } from "@morpho-org/uikit/components/shadcn/button";
import { WalletMenu } from "@morpho-org/uikit/components/wallet-menu";
import { getChainSlug } from "@morpho-org/uikit/lib/utils";
import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { useChains } from "wagmi";

import { BorrowSubPage } from "./borrow-subpage";
import { EarnSubPage } from "./earn-subpage";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { WelcomeModal } from "@/components/welcome-modal";

enum SubPage {
  Earn = "earn",
  Borrow = "borrow",
}

export default function Page() {
  const [selectedSubPage, setSelectedSubPage] = useState(SubPage.Earn);
  const [selectedChainSlug, setSelectedChainSlug] = useState("ethereum");

  const chains = useChains();
  const selectedChainId = useMemo(
    () => chains.find((chain) => getChainSlug(chain) === selectedChainSlug)?.id,
    [chains, selectedChainSlug],
  );

  return (
    <div className="bg-gray-200 dark:bg-neutral-900">
      <Header className="flex items-center justify-between px-5 py-3" chainId={selectedChainId}>
        <div className="flex gap-4">
          <div className="text-primary-foreground flex items-center gap-2 text-xl">
            <MorphoLogoSvg width={24} height={24} />
            Morpho
          </div>
          <div className="flex items-center gap-2 rounded-full bg-transparent p-1">
            <Button
              variant={selectedSubPage === SubPage.Earn ? "tertiary" : "secondaryTab"}
              size="lg"
              className="rounded-full font-light"
              onClick={() => setSelectedSubPage(SubPage.Earn)}
            >
              Earn
            </Button>
            <Button
              variant={selectedSubPage === SubPage.Borrow ? "tertiary" : "secondaryTab"}
              size="lg"
              className="rounded-full font-light"
              onClick={() => setSelectedSubPage(SubPage.Borrow)}
            >
              Borrow
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="lg"
            className="rounded-full font-light"
            onClick={() =>
              window.open(
                `https://app.morpho.org/${selectedChainSlug}/${selectedSubPage}`,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            Full App <ExternalLink />
          </Button>
          <WalletMenu selectedChainSlug={selectedChainSlug} setSelectedChainSlug={setSelectedChainSlug} />
        </div>
      </Header>
      {selectedSubPage === SubPage.Earn ? <EarnSubPage /> : <BorrowSubPage />}
      <WelcomeModal />
      <Footer />
    </div>
  );
}
