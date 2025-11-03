import {
  type Address,
  type ContractFunctionReturnType,
  getContractAddress,
  type Hex,
  hexToBigInt,
  type StateOverride,
} from "viem";

import { CREATE2_FACTORY, CREATE2_SALT } from "@/lens/constants";
import { Lens } from "@/lens/read-vaults.s.sol";

const address = getContractAddress({
  bytecode: Lens.bytecode,
  from: CREATE2_FACTORY,
  opcode: "CREATE2",
  salt: CREATE2_SALT,
});

// NOTE: If type inference isn't working, ensure contract *does not* use named return values!

/**
 * Reads vault data for each `IMetaMorpho` entry that has an owner in `includedOwners`. For non-included ones,
 * only the `owner` field is read to save gas.
 *
 * @param metaMorphos Array of `IMetaMorpho`s to search through and (possibly) read as a vault.
 * @param includedOwners Array of owners whose vaults should be included in the returned array.
 * This helper function will make sure it's unique and sorted before passing to contract.
 *
 * @example
 * // Use with viem's deployless option (special bytecode `data` for `eth_call`; `to` is left undefined)
 * const { data } = useReadContract({
 *   chainId,
 *   ...readAccrualVaults(morphoAddress, metaMorphoAddresses, includedOwnersList, true),
 * });
 *
 * @example
 * // Use with `stateOverride`
 * const { data } = useReadContract({
 *   chainId,
 *   ...readAccrualVaults(morphoAddress, metaMorphoAddresses, includedOwnersList),
 *   stateOverride: [readAccrualVaultsStateOverride()],
 * });
 *
 * @example
 * // Use with multicall -- MUST use `stateOverride` rather than viem's deployless option
 * const { data } = useReadContracts({
 *   contracts: includedOwnersLists
 *     .map((includedOwnersList) => [
 *       { chainId, ...readAccrualVaults(morphoAddress, metaMorphoAddresses, includedOwnersList) },
 *     ])
 *     .flat(),
 *   allowFailure: false,
 *   stateOverride: [readAccrualVaultsStateOverride()],
 * });
 */
export function readAccrualVaults(
  morpho: Address,
  metaMorphos: Address[],
  includedOwners: Address[],
  deployless?: false,
): Omit<ReturnType<typeof Lens.read.getAccrualVaults>, "humanReadableAbi"> & { address: Address };
export function readAccrualVaults(
  morpho: Address,
  metaMorphos: Address[],
  includedOwners: Address[],
  deployless: true,
): Omit<ReturnType<typeof Lens.read.getAccrualVaults>, "humanReadableAbi"> & { code: Hex };
export function readAccrualVaults(
  morpho: Address,
  metaMorphos: readonly Address[],
  includedOwners: readonly Address[],
  deployless: boolean = false,
) {
  const uniqueOwners = [...new Set(includedOwners)];
  uniqueOwners.sort((a, b) => (hexToBigInt(a) - hexToBigInt(b) > 0 ? 1 : -1));
  const sortedOwners = Object.freeze(uniqueOwners);

  const { humanReadableAbi, ...action } = Lens.read.getAccrualVaults(morpho, metaMorphos, sortedOwners);
  if (deployless) {
    return { ...action, code: Lens.bytecode } as const;
  } else {
    return { ...action, address } as const;
  }
}

export function readAccrualVaultsStateOverride(): StateOverride[number] {
  return {
    address,
    code: Lens.deployedBytecode,
  };
}

/*//////////////////////////////////////////////////////////////
                            HELPERS
//////////////////////////////////////////////////////////////*/

/**
 * Converts the raw `uint256`/BigInt representation of the dead deposits bitmap to a string of 1s and 0s,
 * with 1 indicating sufficiently-protective dead balance, and 0 indicating otherwise.
 *
 * The bitmap is structured like so:
 * ```
 *     ┏╾ withdrawQueue[2]: market protected
 *     ┃┏╾ withdrawQueue[3]: market NOT protected
 *     ┃┃┏╾ withdrawQueue[4]: market protected
 * "001101"
 *  ┃┃┗╾ withdrawQueue[1]: market protected
 *  ┃┗╾ withdrawQueue[0]: market NOT protected
 *  ┗╾ vault shares NOT protected
 * ```
 */
export function getDeadDepositsBitmap(
  accrualVault: ContractFunctionReturnType<
    typeof Lens.read.getAccrualVault.abi,
    "view",
    typeof Lens.read.getAccrualVault.functionName
  >,
) {
  const withdrawQueue = accrualVault.vault.withdrawQueue;
  // `toString(2)` creates a binary string, but if N highest bits are 0, the string will be too
  // short by N. Therefore we have to pad to the expected size of the bitmap -- 1 bit per market
  // in the `withdrawQueue`, +1 for the vault itself.
  return accrualVault.deadDepositsBitmap.toString(2).padStart(withdrawQueue.length + 1, "0");
}

/**
 * Whether the vault itself AND all markets it's allocated to have sufficient dead deposits
 * for inflation protection.
 */
export function vaultHasDeadDeposits(
  accrualVault: ContractFunctionReturnType<
    typeof Lens.read.getAccrualVault.abi,
    "view",
    typeof Lens.read.getAccrualVault.functionName
  >,
) {
  // Assert that the dead deposits bitmap does NOT contain any zeros (falsy values)
  return !getDeadDepositsBitmap(accrualVault).includes("0");
}

/**
 * Whether the market (specified by `marketId`) has a sufficient dead deposit for
 * inflation protection.
 */
export function marketHasDeadDeposit(
  accrualVault: ContractFunctionReturnType<
    typeof Lens.read.getAccrualVault.abi,
    "view",
    typeof Lens.read.getAccrualVault.functionName
  >,
  marketId: Hex,
) {
  const deadDepositsBitmap = getDeadDepositsBitmap(accrualVault);
  // Locate `marketId` within the vault's withdrawQueue, as this tells us where its designated
  // bit is in the bitmap.
  const marketIdx = accrualVault.vault.withdrawQueue.findIndex((x) => x === marketId);
  // See if the market's bit is truthy. We skip 1 (`marketIdx + 1`) since the first
  // entry corresponds to the vault itself -- all others are for markets in the `withdrawQueue`.
  return marketIdx > -1 && deadDepositsBitmap[marketIdx + 1] === "1";
}
