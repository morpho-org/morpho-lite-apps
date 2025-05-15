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
import LiskSvg from "@/assets/chains/lisk.svg?react";
import ModeSvg from "@/assets/chains/mode.svg?react";
import OptimismSvg from "@/assets/chains/op.svg?react";
import PlumeSvg from "@/assets/chains/plume.svg?react";
import PolygonSvg from "@/assets/chains/polygon.svg?react";
import ScrollSvg from "@/assets/chains/scroll.svg?react";
import SoneiumSvg from "@/assets/chains/soneium.svg?react";
import SonicSvg from "@/assets/chains/sonic.svg?react";
import UnichainSvg from "@/assets/chains/unichain.svg?react";
import WorldchainSvg from "@/assets/chains/worldchain.svg?react";
import * as customChains from "@/lib/chains";

export function ChainIcon({ id }: { id: number | undefined }): JSX.Element {
  switch (id) {
    case mainnet.id:
      return <EthereumChainSvg />;
    case base.id:
      return <BaseChainSvg />;
    case arbitrum.id:
      return <ArbitrumSvg />;
    case fraxtal.id:
      return <FraxtalSvg />;
    case ink.id:
      return <InkSvg />;
    case optimism.id:
      return <OptimismSvg />;
    case plumeMainnet.id:
      return <PlumeSvg />;
    case polygon.id:
      return <PolygonSvg />;
    case scrollMainnet.id:
      return <ScrollSvg />;
    case worldchain.id:
      return <WorldchainSvg className="text-white" />;
    case unichain.id:
      return <UnichainSvg className="rounded-sm" />;
    case sonic.id:
      return <SonicSvg />;
    case modeMainnet.id:
      return <ModeSvg />;
    case hemi.id:
      return <HemiSvg />;
    case corn.id:
      return <CornSvg />;
    case customChains.basecamp.id:
      return <CampSvg />;
    case flame.id:
      return <FlameSvg />;
    case customChains.hyperevm.id:
      return <HyperliquidSvg />;
    case lisk.id:
      return <LiskSvg />;
    case soneium.id:
      return <SoneiumSvg />;
    default:
      return <CircleHelpIcon />;
  }
}
