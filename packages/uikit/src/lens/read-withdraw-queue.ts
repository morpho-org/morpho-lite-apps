import { type Address, getContractAddress, Hex, type StateOverride, zeroAddress } from "viem";

import { Lens } from "@/lens/read-withdraw-queue.s.sol";

const address = getContractAddress({
  bytecode: Lens.bytecode,
  from: "0x4e59b44847b379578588920cA78FbF26c0B4956C",
  opcode: "CREATE2",
  salt: `${zeroAddress}51A1E51A1E51A1E51A1E51A1`,
});

/**
 * IMPORTANT: `deployless` mode is incompatible with multicall / `useReadContracts`. In `useReadContracts`,
 * it will cause an error and resend each `eth_call` individually to try to correct it, resulting in
 * (potentially many) extra RPC calls. Instead, you should use an ordinary call with a `StateOverride` for
 * the entire multicall call. See `readWithdrawQueueStateOverride()`.
 */
export function readWithdrawQueue(
  metaMorpho: Address,
  deployless?: false,
): {
  readonly address: Address;
  readonly abi: typeof Lens.abi;
  readonly functionName: "withdrawQueue";
  readonly args: readonly [Address];
};
export function readWithdrawQueue(
  metaMorpho: Address,
  deployless: true,
): {
  readonly code: Hex;
  readonly abi: typeof Lens.abi;
  readonly functionName: "withdrawQueue";
  readonly args: readonly [Address];
};
export function readWithdrawQueue(metaMorpho: Address, deployless: boolean = false) {
  if (deployless) {
    return {
      code: Lens.bytecode,
      abi: Lens.abi,
      functionName: "withdrawQueue",
      args: [metaMorpho],
    } as const;
  } else {
    return {
      address,
      abi: Lens.abi,
      functionName: "withdrawQueue",
      args: [metaMorpho],
    } as const;
  }
}

export function readWithdrawQueueStateOverride(): StateOverride[number] {
  return {
    address,
    code: Lens.deployedBytecode,
  };
}
