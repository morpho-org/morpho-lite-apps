import { Address } from "viem";
import {
  arbitrum,
  base,
  corn,
  fraxtal,
  hemi,
  ink,
  mainnet,
  mode as modeMainnet,
  optimism,
  plumeMainnet,
  polygon,
  scroll as scrollMainnet,
  sonic,
  unichain,
  worldchain,
} from "wagmi/chains";

type MorphoContractName = "Morpho" | "MetaMorphoFactory" | "MetaMorphoV1_1Factory";

type OptionalContracts = "MetaMorphoFactory";
type RequiredContracts = Exclude<MorphoContractName, OptionalContracts>;
type DeploymentDetails = { address: Address; fromBlock: bigint };
type Deployments = {
  [chainId: number]: {
    [name in RequiredContracts]-?: DeploymentDetails;
  } & {
    [name in OptionalContracts]?: DeploymentDetails;
  };
};

export const GITHUB_OWNER = "morpho-org";
export const GITHUB_REPO = "morpho-lite-apps";
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;

export const TERMS_OF_USE = "https://cdn.morpho.org/documents/Morpho_Terms_of_Use.pdf";

export const DEPLOYMENTS: Deployments = {
  [mainnet.id]: {
    Morpho: { address: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb", fromBlock: 18883124n },
    MetaMorphoFactory: { address: "0xA9c3D3a366466Fa809d1Ae982Fb2c46E5fC41101", fromBlock: 18925584n },
    MetaMorphoV1_1Factory: { address: "0x1897A8997241C1cD4bD0698647e4EB7213535c24", fromBlock: 21439510n },
  },
  [base.id]: {
    Morpho: { address: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb", fromBlock: 13977148n },
    MetaMorphoFactory: { address: "0xA9c3D3a366466Fa809d1Ae982Fb2c46E5fC41101", fromBlock: 13978134n },
    MetaMorphoV1_1Factory: { address: "0xFf62A7c278C62eD665133147129245053Bbf5918", fromBlock: 23928808n },
  },
  [ink.id]: {
    Morpho: { address: "0x857f3EefE8cbda3Bc49367C996cd664A880d3042", fromBlock: 4078776n },
    MetaMorphoV1_1Factory: { address: "0xd3f39505d0c48AFED3549D625982FdC38Ea9904b", fromBlock: 4078830n },
  },
  [arbitrum.id]: {
    Morpho: { address: "0x6c247b1F6182318877311737BaC0844bAa518F5e", fromBlock: 296446593n },
    MetaMorphoV1_1Factory: { address: "0x878988f5f561081deEa117717052164ea1Ef0c82", fromBlock: 296447195n },
  },
  [optimism.id]: {
    Morpho: { address: "0xce95AfbB8EA029495c66020883F87aaE8864AF92", fromBlock: 130770075n },
    MetaMorphoV1_1Factory: { address: "0x3Bb6A6A0Bc85b367EFE0A5bAc81c5E52C892839a", fromBlock: 130770189n },
  },
  [polygon.id]: {
    Morpho: { address: "0x1bF0c2541F820E775182832f06c0B7Fc27A25f67", fromBlock: 66931042n },
    MetaMorphoV1_1Factory: { address: "0xa9c87daB340631C34BB738625C70499e29ddDC98", fromBlock: 66931118n },
  },
  [worldchain.id]: {
    Morpho: { address: "0xE741BC7c34758b4caE05062794E8Ae24978AF432", fromBlock: 9025669n },
    MetaMorphoV1_1Factory: { address: "0x4DBB3a642a2146d5413750Cca3647086D9ba5F12", fromBlock: 9025733n },
  },
  [scrollMainnet.id]: {
    Morpho: { address: "0x2d012EdbAdc37eDc2BC62791B666f9193FDF5a55", fromBlock: 12842868n },
    MetaMorphoV1_1Factory: { address: "0x56b65742ade55015e6480959808229Ad6dbc9295", fromBlock: 12842903n },
  },
  [fraxtal.id]: {
    Morpho: { address: "0xa6030627d724bA78a59aCf43Be7550b4C5a0653b", fromBlock: 15317931n },
    MetaMorphoV1_1Factory: { address: "0x27D4Af0AC9E7FDfA6D0853236f249CC27AE79488", fromBlock: 15318007n },
  },
  [unichain.id]: {
    Morpho: { address: "0x8f5ae9CddB9f68de460C77730b018Ae7E04a140A", fromBlock: 9139027n },
    MetaMorphoV1_1Factory: { address: "0xe9EdE3929F43a7062a007C3e8652e4ACa610Bdc0", fromBlock: 9316789n },
  },
  [corn.id]: {
    Morpho: { address: "0xc2B1E031540e3F3271C5F3819F0cC7479a8DdD90", fromBlock: 251401n },
    MetaMorphoV1_1Factory: { address: "0xe430821595602eA5DD0cD350f86987437c7362fA", fromBlock: 253027n },
  },
  [modeMainnet.id]: {
    Morpho: { address: "0xd85cE6BD68487E0AaFb0858FDE1Cd18c76840564", fromBlock: 19983370n },
    MetaMorphoV1_1Factory: { address: "0xae5b0884bfff430493D6C844B9fd052Af7d79278", fromBlock: 19983443n },
  },
  [hemi.id]: {
    Morpho: { address: "0xa4Ca2c2e25b97DA19879201bA49422bc6f181f42", fromBlock: 1188872n },
    MetaMorphoV1_1Factory: { address: "0x8e52179BeB18E882040b01632440d8Ca0f01da82", fromBlock: 1188885n },
  },
  [sonic.id]: {
    Morpho: { address: "0xd6c916eB7542D0Ad3f18AEd0FCBD50C582cfa95f", fromBlock: 9100931n },
    MetaMorphoV1_1Factory: { address: "0x0cE9e3512CB4df8ae7e265e62Fb9258dc14f12e8", fromBlock: 9101319n },
  },
  [plumeMainnet.id]: {
    Morpho: { address: "0x42b18785CE0Aed7BF7Ca43a39471ED4C0A3e0bB5", fromBlock: 765994n },
    MetaMorphoV1_1Factory: { address: "0x2525D453D9BA13921D5aB5D8c12F9202b0e19456", fromBlock: 766078n },
  },
};

export const CORE_DEPLOYMENTS = new Set<keyof Deployments>([mainnet.id, base.id]);

export const BATCH1_DEPLOYMENTS = new Set<keyof Deployments>([
  ink.id,
  arbitrum.id,
  optimism.id,
  polygon.id,
  worldchain.id,
  scrollMainnet.id,
  fraxtal.id,
]);

export const BATCH2_DEPLOYMENTS = new Set<keyof Deployments>([unichain.id, corn.id, modeMainnet.id, hemi.id, sonic.id]);

export const BATCH3_DEPLOYMENTS = new Set<keyof Deployments>([plumeMainnet.id]);

export function getContractDeploymentInfo(chainId: number, name: OptionalContracts): DeploymentDetails | undefined;
export function getContractDeploymentInfo(chainId: number, name: RequiredContracts): DeploymentDetails;
export function getContractDeploymentInfo(
  chainId: number | undefined,
  name: MorphoContractName,
): DeploymentDetails | undefined;
export function getContractDeploymentInfo(chainId: number | undefined, name: MorphoContractName) {
  return chainId !== undefined ? DEPLOYMENTS[chainId][name] : undefined;
}
