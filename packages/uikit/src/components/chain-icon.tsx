import { CircleHelpIcon } from "lucide-react";
import { JSX } from "react";
import {
  arbitrum,
  base,
  corn,
  flame,
  fraxtal,
  hemi,
  ink,
  lisk,
  mainnet,
  mode as modeMainnet,
  optimism,
  plumeMainnet,
  polygon,
  scroll as scrollMainnet,
  soneium,
  sonic,
  unichain,
  worldchain,
} from "wagmi/chains";

import ArbitrumSvg from "@/assets/chains/arb.svg?react";
import BaseChainSvg from "@/assets/chains/base.svg?react";
import CampSvg from "@/assets/chains/camp.svg?react";
import CornSvg from "@/assets/chains/corn.svg?react";
import EthereumChainSvg from "@/assets/chains/ethereum.svg?react";
import FlameSvg from "@/assets/chains/flame.svg?react";
import FraxtalSvg from "@/assets/chains/fraxtal.svg?react";
import HemiSvg from "@/assets/chains/hemi.svg?react";
import HyperliquidSvg from "@/assets/chains/hyperliquid.svg?react";
import InkSvg from "@/assets/chains/ink.svg?react";
import KatanaSvg from "@/assets/chains/katana.svg?react";
import LiskSvg from "@/assets/chains/lisk.svg?react";
import ModeSvg from "@/assets/chains/mode.svg?react";
import OptimismSvg from "@/assets/chains/op.svg?react";
import PlumeSvg from "@/assets/chains/plume.svg?react";
import PolygonSvg from "@/assets/chains/polygon.svg?react";
import ScrollSvg from "@/assets/chains/scroll.svg?react";
import SoneiumSvg from "@/assets/chains/soneium.svg?react";
import SonicSvg from "@/assets/chains/sonic.svg?react";
import TacSvg from "@/assets/chains/tac.svg?react";
import UnichainSvg from "@/assets/chains/unichain.svg?react";
import WorldchainSvg from "@/assets/chains/worldchain.svg?react";
import * as customChains from "@/lib/chains";

export function ChainIcon({ id }: { id: number | undefined }): JSX.Element {
  switch (id) {
    case arbitrum.id:
      return <ArbitrumSvg />;
    case base.id:
      return <BaseChainSvg />;
    case customChains.basecamp.id:
      return <CampSvg />;
    case corn.id:
      return <CornSvg />;
    case flame.id:
      return <FlameSvg />;
    case fraxtal.id:
      return <FraxtalSvg />;
    case hemi.id:
      return <HemiSvg />;
    case customChains.hyperevm.id:
      return <HyperliquidSvg />;
    case ink.id:
      return <InkSvg />;
    case customChains.katana.id:
      return <KatanaSvg />;
    case lisk.id:
      return <LiskSvg />;
    case mainnet.id:
      return <EthereumChainSvg />;
    case modeMainnet.id:
      return <ModeSvg />;
    case optimism.id:
      return <OptimismSvg />;
    case plumeMainnet.id:
      return <PlumeSvg />;
    case polygon.id:
      return <PolygonSvg />;
    case scrollMainnet.id:
      return <ScrollSvg />;
    case soneium.id:
      return <SoneiumSvg />;
    case sonic.id:
      return <SonicSvg />;
    case customChains.tac.id:
      return <TacSvg />;
    case unichain.id:
      return <UnichainSvg className="rounded-sm" />;
    case worldchain.id:
      return <WorldchainSvg className="text-white" />;
    default:
      return <CircleHelpIcon />;
  }
}
