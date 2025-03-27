import { Address, ContractFunctionParameters } from "viem";

import { Lens } from "@/lens/read-withdraw-queue.s.sol";

export function readWithdrawQueue(metaMorpho: Address) {
  return {
    abi: Lens.abi,
    code: Lens.bytecode,
    functionName: "withdrawQueue",
    args: [metaMorpho],
  } as ContractFunctionParameters<typeof Lens.abi, "view", "withdrawQueue", readonly [Address], true>;
}
