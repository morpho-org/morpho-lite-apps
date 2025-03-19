import React, { useEffect, useState } from "react";
import { Abi, ContractFunctionArgs, ContractFunctionName, extractChain, Hash, TransactionReceipt } from "viem";
import {
  BaseError,
  Config,
  ResolvedRegister,
  useChainId,
  useChains,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { type WriteContractVariables } from "wagmi/query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader } from "lucide-react";

export function TransactionButton<
  const abi extends Abi | readonly unknown[],
  functionName extends ContractFunctionName<abi, "nonpayable" | "payable">,
  args extends ContractFunctionArgs<abi, "nonpayable" | "payable", functionName>,
  chainId extends config["chains"][number]["id"],
  config extends Config = ResolvedRegister["config"],
>({
  children,
  variables,
  disabled,
  onTxnReceipt,
}: {
  children: React.ReactNode;
  variables?: WriteContractVariables<abi, functionName, args, config, chainId>;
  disabled: boolean;
  onTxnReceipt?: (receipt: TransactionReceipt) => void;
}) {
  const [isWaitingForUser, setIsWaitingForUser] = useState(false);
  const [txnHash, setTxnHash] = useState<Hash | undefined>(undefined);

  const chainId = useChainId();
  const chains = useChains();
  const chain = extractChain({ chains, id: chainId });
  const { writeContract } = useWriteContract();
  const { data: txnReceipt } = useWaitForTransactionReceipt({ hash: txnHash, confirmations: 1 });

  useEffect(() => {
    if (txnReceipt === undefined) return;

    console.log(txnReceipt);
    onTxnReceipt?.(txnReceipt);

    if (txnReceipt.status === "success") {
      toast.success(`Transaction ${txnHash?.slice(0, 8)} was successful.`, { duration: 10_0000 });
    } else {
      toast.error(`Transaction ${txnHash?.slice(0, 8)} reverted.`, { duration: 10_0000 });
    }
    setTxnHash(undefined);
  }, [txnReceipt, txnHash, onTxnReceipt]);

  return (
    <Button
      className="text-md mt-3 h-12 w-full rounded-full font-light"
      variant="blue"
      onClick={() => {
        setIsWaitingForUser(true);
        setTxnHash(undefined);
        // @ts-expect-error wagmi is weird
        writeContract(variables, {
          onSettled(txnHash, err: BaseError) {
            setIsWaitingForUser(false);
            if (err != null) {
              toast.error(err.shortMessage);
              console.log(err.message);
            } else {
              toast(`Broadcasted transaction ${txnHash?.slice(0, 8)}.`, {
                duration: 10_0000,
                action: chain.blockExplorers
                  ? {
                      label: "Explorer ↗︎",
                      onClick: () =>
                        window.open(
                          `${chain.blockExplorers!.default.url}/tx/${txnHash}`,
                          "_blank",
                          "noopener,noreferrer",
                        ),
                    }
                  : undefined,
              });
              setTxnHash(txnHash);
            }
          },
        });
      }}
      disabled={disabled || variables === undefined || isWaitingForUser || txnHash !== undefined}
    >
      {isWaitingForUser || txnHash !== undefined ? <Loader className="h-4 w-4 animate-spin" /> : undefined}{" "}
      {isWaitingForUser ? "Check your wallet" : children}
    </Button>
  );
}
