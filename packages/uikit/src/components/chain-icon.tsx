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
  unichain,
  worldchain,
} from "wagmi/chains";

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
    default:
      return <CircleHelpIcon />;
  }
}
