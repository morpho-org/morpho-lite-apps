import { useEffect, useState } from "react";
import { type BlockNumber, type BlockTag } from "viem";
import { type UsePublicClientReturnType } from "wagmi";

/**
 * Concretizes an array of block numbers/tags by converting tags to numbers.
 */
export function useBlockNumbers<T extends readonly (BlockNumber | BlockTag)[]>({
  publicClient,
  blockNumbersOrTags,
}: {
  publicClient: UsePublicClientReturnType;
  blockNumbersOrTags: T;
}) {
  const [blockNumbers, setBlockNumbers] = useState<
    { data: { [K in keyof T]: BlockNumber }; chainId: number } | undefined
  >(undefined);

  useEffect(() => {
    if (publicClient === undefined) return;

    const asBlockNumber = async (b: BlockNumber | BlockTag) => {
      if (typeof b === "bigint") return b;
      return (await publicClient.getBlock({ blockTag: b, includeTransactions: false })).number!;
    };

    (async () => {
      const newValue = {
        data: (await Promise.all(blockNumbersOrTags.map(asBlockNumber))) as { [K in keyof T]: BlockNumber },
        chainId: publicClient.chain.id,
      };
      setBlockNumbers((value) => {
        if (
          value === undefined ||
          newValue.data.length !== value.data.length ||
          newValue.data.some((x, idx) => x !== value.data[idx])
        ) {
          return newValue;
        }
        return value;
      });
    })();
  }, [publicClient, blockNumbersOrTags]);

  if (blockNumbers === undefined || blockNumbers.chainId !== publicClient?.chain.id) {
    return undefined;
  } else {
    return blockNumbers.data
  }
}
