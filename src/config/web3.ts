import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { defineChain, type AppKitNetwork } from '@reown/appkit/networks';
import { createPublicClient, http } from 'viem';

export const BOTCHAIN_CHAIN_ID = 968;
export const BOTCHAIN_RPC_URL =
  import.meta.env.VITE_BOTCHAIN_RPC_URL || 'https://rpc.bohr.life';
export const BOTCHAIN_EXPLORER_URL =
  (import.meta.env.VITE_BOTCHAIN_EXPLORER_URL || 'https://scan.bohr.life/').replace(/\/+$/, '');

export const BOTCHAIN_NETWORK_METADATA = {
  chainId: BOTCHAIN_CHAIN_ID,
  chainIdHex: '0x3c8',
  name: 'Botchain Testnet',
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  totalSupply: '150 Million BOT',
  rpcUrl: BOTCHAIN_RPC_URL,
  explorerUrl: BOTCHAIN_EXPLORER_URL,
} as const;

export const botchainTestnet: AppKitNetwork = defineChain({
  id: BOTCHAIN_CHAIN_ID,
  caipNetworkId: `eip155:${BOTCHAIN_CHAIN_ID}`,
  chainNamespace: 'eip155',
  name: 'Botchain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BOT',
    symbol: 'BOT',
  },
  rpcUrls: {
    default: {
      http: [BOTCHAIN_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'Botchain Explorer',
      url: BOTCHAIN_EXPLORER_URL,
    },
  },
  testnet: true,
});

// Public fallback Reown/WalletConnect project ID for local/dev testing if env var is not set
export const projectId =
  import.meta.env.VITE_REOWN_PROJECT_ID || '05e6edf1e0ff1ba8a6a26c95abd820bf';

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [botchainTestnet];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
  transports: {
    [BOTCHAIN_CHAIN_ID]: http(BOTCHAIN_RPC_URL),
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Standalone read-only Viem client directly connected to https://rpc.bohr.life
// so availability checks and public profile lookups work immediately even before wallet connection!
export const botchainPublicClient = createPublicClient({
  chain: botchainTestnet as any,
  transport: http(BOTCHAIN_RPC_URL, {
    timeout: 12_000,
    retryCount: 2,
  }),
});

// Initialize Reown AppKit modal
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: botchainTestnet,
  projectId,
  metadata: {
    name: 'BotName — On-Chain Username Registry',
    description: 'Your Name. Your Wallet. Your Identity on Botchain Testnet (Chain ID 968).',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://botname.app',
    icons: ['https://avatars.githubusercontent.com/u/179229932'],
  },
  features: {
    analytics: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#10b981',
    '--w3m-border-radius-master': '2px',
  },
});

export async function switchOrAddBotchainNetwork(): Promise<void> {
  const eth = (window as any)?.ethereum;
  if (!eth?.request) {
    throw new Error('No injected EVM wallet (e.g. MetaMask) detected.');
  }
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BOTCHAIN_NETWORK_METADATA.chainIdHex }],
    });
  } catch (switchError: any) {
    // 4902 indicates the chain has not been added to MetaMask yet
    if (switchError?.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: BOTCHAIN_NETWORK_METADATA.chainIdHex,
            chainName: BOTCHAIN_NETWORK_METADATA.name,
            nativeCurrency: BOTCHAIN_NETWORK_METADATA.nativeCurrency,
            rpcUrls: [BOTCHAIN_NETWORK_METADATA.rpcUrl],
            blockExplorerUrls: [BOTCHAIN_NETWORK_METADATA.explorerUrl],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

