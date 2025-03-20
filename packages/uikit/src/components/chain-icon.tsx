import { CircleHelpIcon } from "lucide-react";
import { JSX } from "react";
import {
  arbitrum,
  base,
  corn,
  fraxtal,
  hemi,
  ink,
  mainnet,
  mode as modeMainnet,
  optimism,
  polygon,
  scroll as scrollMainnet,
  sonic,
  worldchain,
} from "viem/chains";
import { unichain } from "viem/op-stack";

import ArbitrumSvg from "@/assets/chains/arb.svg?react";
import BaseChainSvg from "@/assets/chains/base.svg?react";
import CornSvg from "@/assets/chains/corn.svg?react";
import EthereumChainSvg from "@/assets/chains/ethereum.svg?react";
import FraxtalSvg from "@/assets/chains/fraxtal.svg?react";
import HemiSvg from "@/assets/chains/hemi.svg?react";
import InkSvg from "@/assets/chains/ink.svg?react";
import ModeSvg from "@/assets/chains/mode.svg?react";
import OptimismSvg from "@/assets/chains/op.svg?react";
import PolygonSvg from "@/assets/chains/polygon.svg?react";
import ScrollSvg from "@/assets/chains/scroll.svg?react";
import SonicSvg from "@/assets/chains/sonic.svg?react";
import UnichainSvg from "@/assets/chains/unichain.svg?react";
import WorldchainSvg from "@/assets/chains/worldchain.svg?react";

export function ChainIcon({ name }: { name: string }): JSX.Element {
  switch (name) {
    case mainnet.name:
      return <EthereumChainSvg />;
    case base.name:
      return <BaseChainSvg />;
    case arbitrum.name:
      return <ArbitrumSvg />;
    case fraxtal.name:
      return <FraxtalSvg />;
    case ink.name:
      return <InkSvg />;
    case optimism.name:
      return <OptimismSvg />;
    case polygon.name:
      return <PolygonSvg />;
    case scrollMainnet.name:
      return <ScrollSvg />;
    case worldchain.name:
      return <WorldchainSvg className="text-white" />;
    case unichain.name:
      return <UnichainSvg className="rounded-sm" />;
    case sonic.name:
      return <SonicSvg />;
    case modeMainnet.name:
      return <ModeSvg />;
    case hemi.name:
      return <HemiSvg />;
    case corn.name:
      return <CornSvg />;
    default:
      return <CircleHelpIcon />;
  }
}
