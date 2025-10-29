import * as customChains from "@morpho-org/uikit/lib/chains";
import { Address, isAddressEqual } from "viem";
import { celo, hemi, lisk, optimism, plumeMainnet, sei, soneium, worldchain } from "wagmi/chains";

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
    addresses: [
      { address: "0x6D3AB84Fb7Fc04961a15663C980feC275b889402", chainId: customChains.tac.id },
      { address: "0xd6316AE37dDE77204b9A94072544F1FF9f3d6d54", chainId: plumeMainnet.id },
      { address: "0x4681fbeD0877815D5869Cf16e8A6C6Ceee365c02", chainId: lisk.id },
      { address: "0x6D3AB84Fb7Fc04961a15663C980feC275b889402", chainId: soneium.id },
      { address: "0xD8B0F4e54a8dac04E0A57392f5A630cEdb99C940", chainId: worldchain.id },
    ],
    image: "https://cdn.morpho.org/v2/assets/images/re7.png",
    name: "RE7 Labs",
    url: "https://www.re7labs.xyz/",
  },
  {
    addresses: [
      { address: "0x4F08D2A771aCe406C733EC3E722827E857A33Db5", chainId: plumeMainnet.id },
      { address: "0xf452caAaF039E8E40A10861f84d1191e84693951", chainId: plumeMainnet.id },
      { address: "0xB672Ea44A1EC692A9Baf851dC90a1Ee3DB25F1C4", chainId: celo.id },
    ],
    image: "https://cdn.morpho.org/v2/assets/images/mevcapital.png",
    name: "MEV Capital",
    url: "https://mevcapital.com/",
  },
  {
    addresses: [{ address: "0x1280e86Cd7787FfA55d37759C0342F8CD3c7594a", chainId: customChains.tac.id }],
    image: "https://cdn.morpho.org/v2/assets/images/edge-capital-ultrayield.svg",
    name: "Edge Capital UltraYield",
    url: "https://edgecapital.xyz/",
  },
  {
    addresses: [{ address: "0x17C9ba3fDa7EC71CcfD75f978Ef31E21927aFF3d", chainId: optimism.id }],
    image: "https://cdn.morpho.org/v2/assets/images/moonwell.svg",
    name: "Moonwell",
    url: "https://moonwell.fi/",
  },
  {
    addresses: [{ address: "0x5D845540D2e05422E8ef10CEDEd7C0bFB5Aac4A2", chainId: plumeMainnet.id }],
    image: "/mystic.jpg",
    name: "Mystic",
    url: "https://mysticfinance.xyz",
  },
  {
    addresses: [{ address: "0x4e16eF0278E89f4A79f3581aB0afDF467b1754cD", chainId: plumeMainnet.id }],
    image: "/solera.svg",
    name: "Solera",
    url: "https://solera.market",
  },
  {
    addresses: [{ address: "0xF8eCAefD0349a9f2138Bd5958e581A251278d54c", chainId: soneium.id }],
    image: "https://pbs.twimg.com/profile_images/1867495819018219525/4sM6lVef_400x400.jpg",
    name: "Untitled Bank",
    url: "https://untitledbank.co",
  },
  {
    addresses: [
      { address: "0x23E6aecB76675462Ad8f2B31eC7C492060c2fAEF", chainId: customChains.tac.id },
      { address: "0xC868BFb240Ed207449Afe71D2ecC781D5E10C85C", chainId: customChains.tac.id },
    ],
    image: "https://cdn.morpho.org/v2/assets/images/9summits.png",
    name: "9Summits",
    url: "https://9summits.io/",
  },
  {
    addresses: [{ address: "0x46057881E0B9d190920FB823F840B837f65745d5", chainId: customChains.tac.id }],
    image: "https://cdn.morpho.org/v2/assets/images/singularv.svg",
    name: "SingularV",
    url: "https://www.singularv.xyz/",
  },
  {
    addresses: [
      { address: "0x30988479C2E6a03E7fB65138b94762D41a733458", chainId: hemi.id },
      { address: "0x72882eb5D27C7088DFA6DDE941DD42e5d184F0ef", chainId: hemi.id },
    ],
    image: "https://cdn.morpho.org/v2/assets/images/clearstar.svg",
    name: "Clearstar",
    url: "https://www.clearstar.xyz/",
  },
  {
    addresses: [{ address: "0xf7F66970Cf68Cad32D321A37F6FF55Ad27d0b83D", chainId: sei.id }],
    image: "/feather.svg",
    name: "Feather",
    url: "https://feather.zone",
  },
];

export const ADDITIONAL_OFFCHAIN_CURATORS: Record<Address, DisplayableCurators> = {
  "0x0b14D0bdAf647c541d3887c5b1A4bd64068fCDA7": {
    Cicada: {
      name: "Cicada",
      roles: [],
      url: "https://www.cicada.partners/",
      imageSrc:
        "https://static.wixstatic.com/media/f9d184_1702c7c11ec647f480ad8e0c8c4859c3~mv2.png/v1/fill/w_120,h_155,al_c,lg_1,q_85,enc_avif,quality_auto/Cicada%20Image_Black%20on%20White_25%25.png",
      shouldAlwaysShow: true,
    },
  },
};

export type DisplayableCurators = {
  [name: string]: {
    name: string;
    roles: { name: string; address: Address }[];
    url: string | null;
    imageSrc: string | null;
    shouldAlwaysShow: boolean;
  };
};

const ROLE_NAMES = ["owner", "curator", "guardian"] as const;
export function getDisplayableCurators(
  vault: { [role in (typeof ROLE_NAMES)[number]]: Address } & { address: Address },
  curators: FragmentOf<typeof CuratorFragment>[],
  chainId: number | undefined,
) {
  const result: DisplayableCurators = {};
  for (const roleName of ROLE_NAMES) {
    for (const curator of curators) {
      const address = curator.addresses?.find(
        (entry) => entry.chainId === chainId && isAddressEqual(entry.address as Address, vault[roleName]),
      )?.address as Address | undefined;
      if (!address) continue;

      const roleNameCapitalized = `${roleName.charAt(0).toUpperCase()}${roleName.slice(1)}`;
      const shouldAlwaysShow = roleName === "owner" || roleName === "curator";
      if (result[curator.name]) {
        result[curator.name].shouldAlwaysShow ||= shouldAlwaysShow;
        result[curator.name].roles.push({ name: roleNameCapitalized, address });
      } else {
        result[curator.name] = {
          name: curator.name,
          roles: [{ name: roleNameCapitalized, address }],
          url: curator.url,
          imageSrc: curator.image,
          shouldAlwaysShow,
        };
      }
    }
  }
  if (ADDITIONAL_OFFCHAIN_CURATORS[vault.address]) {
    return { ...result, ...ADDITIONAL_OFFCHAIN_CURATORS[vault.address] };
  }
  return result;
}
