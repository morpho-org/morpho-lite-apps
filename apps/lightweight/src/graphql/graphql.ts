import { initGraphQLTada } from "gql.tada";
import { Address, Hex } from "viem";

import type { introspection } from "@/graphql/graphql-env.d.ts";

export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: {
    BigInt: bigint;
    HexString: Hex;
    Address: Address;
    // MarketId: any;
  };
}>();

export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada";
export { readFragment } from "gql.tada";
