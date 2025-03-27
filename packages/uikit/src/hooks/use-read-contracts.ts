import { ResolvedRegister } from "@wagmi/core";
import { useMemo } from "react";
import type { ContractFunctionParameters, Hex } from "viem";
import { Config, useConfig, useChainId, UseReadContractsParameters, UseReadContractsReturnType } from "wagmi";
import { ReadContractsData, readContractsQueryOptions, structuralSharing, useQuery } from "wagmi/query";

function xor(a: boolean, b: boolean) {
  return (a || b) && !(a && b);
}

/** https://wagmi.sh/react/api/hooks/useReadContracts -- NOTE: adds deployless reads which are missing upstream */
export function useReadContracts<
  const contracts extends readonly unknown[],
  allowFailure extends boolean = true,
  config extends Config = ResolvedRegister["config"],
  selectData = ReadContractsData<contracts, allowFailure>,
>(
  parameters: UseReadContractsParameters<contracts, allowFailure, config, selectData> = {},
): UseReadContractsReturnType<contracts, allowFailure, selectData> {
  const { contracts = [], query = {} } = parameters;

  const config = useConfig(parameters);
  const chainId = useChainId({ config });

  const options = readContractsQueryOptions<config, contracts, allowFailure>(config, { ...parameters, chainId });

  const enabled = useMemo(() => {
    let isContractsValid = false;
    for (const contract of contracts) {
      const { abi, address, functionName } = contract as ContractFunctionParameters;
      // @ts-expect-error: `code` presence is dependent on generic type
      const code = contract.code as Hex | undefined;
      // NOTE: `code` check is missing upstream, so whenever `address` is undefined, query is marked invalid
      if (!abi || !xor(!!address, !!code) || !functionName) {
        isContractsValid = false;
        break;
      }
      isContractsValid = true;
    }
    return Boolean(isContractsValid && (query.enabled ?? true));
  }, [contracts, query.enabled]);

  return useQuery({
    ...options,
    ...query,
    enabled,
    structuralSharing: query.structuralSharing ?? structuralSharing,
  });
}
