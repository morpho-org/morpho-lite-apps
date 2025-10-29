import { tac } from "@morpho-org/uikit/lib/chains/tac";
import { type Address } from "viem";
import { sei } from "viem/chains";

export const CREATE_METAMORPHO_EVENT_OVERRIDES: Record<number, Address[]> = {
  [sei.id]: ["0x015F10a56e97e02437D294815D8e079e1903E41C", "0x948FcC6b7f68f4830Cd69dB1481a9e1A142A4923"],
};

// TODO: For now, we use bytecode deployless reads on TAC, since the RPC doesn't support `stateOverride`.
//       This means we're forfeiting multicall in this special case, but at least it works. Once we have
//       a TAC RPC that supports `stateOverride`, remove the special case.
const DEPLOYLESS_MODE_OVERRIDES: Record<number, "deployless" | "stateOverride"> = {
  [tac.id]: "deployless",
};

export function getDeploylessMode(chainId: number | undefined): "deployless" | "stateOverride" {
  if (chainId === undefined) return "stateOverride";
  return DEPLOYLESS_MODE_OVERRIDES[chainId] ?? "stateOverride";
}
