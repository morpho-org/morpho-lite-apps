import { Address, isAddressEqual } from "viem";
import { optimism, polygon } from "wagmi/chains";

import { graphql, FragmentOf } from "@/graphql/graphql";

export const CuratorFragment = graphql(`
  fragment Curator on Curator @_unmask {
    addresses {
      address
      chainId
    }
    image
    name
    url
  }
`);

export const MANUALLY_WHITELISTED_CURATORS: FragmentOf<typeof CuratorFragment>[] = [
  {
    addresses: [{ address: "0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02", chainId: polygon.id }],
    image: "https://cdn.morpho.org/v2/assets/images/compound.svg",
    name: "Compound",
    url: "https://compound.finance/",
  },
  {
    addresses: [{ address: "0x17C9ba3fDa7EC71CcfD75f978Ef31E21927aFF3d", chainId: optimism.id }],
    image: "https://cdn.morpho.org/v2/assets/images/moonwell.svg",
    name: "Moonwell",
    url: "https://moonwell.fi/",
  },
];

export type DisplayableCurators = {
  [name: string]: {
    name: string;
    roles: { name: string; address: Address }[];
    url: string | null;
    imageSrc: string | null;
  };
};

const ROLE_NAMES = ["owner", "curator", "guardian"] as const;
export function getDisplayableCurators(
  vault: { [role in (typeof ROLE_NAMES)[number]]: Address },
  curators: FragmentOf<typeof CuratorFragment>[],
) {
  const result: DisplayableCurators = {};
  for (const curator of curators) {
    for (const roleName of ROLE_NAMES) {
      const address = curator.addresses
        ?.map((entry) => entry.address as Address)
        .find((a) => isAddressEqual(a, vault[roleName]));
      if (!address) continue;

      const roleNameCapitalized = `${roleName.charAt(0).toUpperCase()}${roleName.slice(1)}`;
      if (result[curator.name]) {
        result[curator.name].roles.push({ name: roleNameCapitalized, address });
      } else {
        result[curator.name] = {
          name: curator.name,
          roles: [{ name: roleNameCapitalized, address }],
          url: curator.url,
          imageSrc: curator.image,
        };
      }
    }
  }
  return result;
}
