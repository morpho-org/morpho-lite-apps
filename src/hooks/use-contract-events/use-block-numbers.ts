import { useEffect, useState } from "react";
import { type BlockNumber, type BlockTag } from "viem";
import { type UsePublicClientReturnType } from "wagmi";

export function useBlockNumbers<T extends readonly (BlockNumber | BlockTag)[]>({
  publicClient,
  blockNumbersOrTags,
}: {
  publicClient: UsePublicClientReturnType;
  blockNumbersOrTags: T;
}) {
  const [blockNumbers, setBlockNumbers] = useState<{ [K in keyof T]: BlockNumber } | undefined>(undefined);

  useEffect(() => {
    if (publicClient === undefined) return;

    const asBlockNumber = async (b: BlockNumber | BlockTag) => {
      if (typeof b === "bigint") return b;
      return (await publicClient.getBlock({ blockTag: b, includeTransactions: false })).number!;
    };

    (async () => {
      const newValue = await Promise.all(blockNumbersOrTags.map(asBlockNumber));
      setBlockNumbers((value) => {
        if (value === undefined || newValue.length !== value.length || newValue.some((x, idx) => x !== value[idx])) {
          return newValue as { [K in keyof T]: BlockNumber };
        }
        return value;
      });
    })();
  }, [publicClient, blockNumbersOrTags]);

  return blockNumbers;
}
