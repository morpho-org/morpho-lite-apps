import { tac } from "@morpho-org/uikit/lib/chains/tac";
import { CORE_DEPLOYMENTS } from "@morpho-org/uikit/lib/deployments";
import { celo } from "viem/chains";

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

// On these chains, vaults/markets must have >= 1e9 shares owned by the 0xDEAD address in order
// to show up, and contract accounts are allowed to deposit. On all other chains, the 0xDEAD
// requirement is unenforced, and contract accounts are blocked from depositing.
const ENFORCE_DEAD_DEPOSIT_CHAINS = [...CORE_DEPLOYMENTS, celo.id];

export function getShouldEnforceDeadDeposit(chainId: number | undefined) {
  return chainId !== undefined && ENFORCE_DEAD_DEPOSIT_CHAINS.includes(chainId);
}
