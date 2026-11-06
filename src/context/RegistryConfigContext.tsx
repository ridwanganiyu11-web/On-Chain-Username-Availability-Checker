import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isAddress, type Address } from 'viem';
import { useAccount, useWalletClient } from 'wagmi';
import {
  botchainPublicClient,
  BOTCHAIN_CHAIN_ID,
  switchOrAddBotchainNetwork,
} from '../config/web3';
import {
  BOT_USERNAME_REGISTRY_ABI,
  BOT_USERNAME_REGISTRY_BYTECODE,
} from '../contracts/BotUsernameRegistryArtifact';

const STORAGE_KEY = 'botname_registry_contract_968';

export interface OnChainUsernameProfile {
  username: string;
  wallet: Address;
  registeredAt: bigint;
  exists: boolean;
}

interface RegistryConfigContextValue {
  contractAddress: Address | null;
  isContractVerifiedOnChain: boolean;
  isCheckingBytecode: boolean;
  totalRegistered: number | null;
  setContractAddress: (addr: string) => boolean;
  deployRegistryContract: () => Promise<{ contractAddress: Address; txHash: `0x${string}` }>;
  isDeploying: boolean;
  deployError: string | null;
  refreshContractStats: () => Promise<void>;
  isConfigModalOpen: boolean;
  setIsConfigModalOpen: (open: boolean) => void;
}

const RegistryConfigContext = createContext<RegistryConfigContextValue | undefined>(undefined);

export const DEFAULT_DEPLOYED_REGISTRY_ADDRESS =
  '0xce6a2000e6baff95a4824c17e1094777010240b0';

export const RegistryConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const envAddress = (
    import.meta.env.VITE_REGISTRY_CONTRACT_ADDRESS || DEFAULT_DEPLOYED_REGISTRY_ADDRESS
  ).trim();
  const [contractAddress, setContractAddressState] = useState<Address | null>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved && isAddress(saved)) return saved as Address;
    if (envAddress && isAddress(envAddress)) return envAddress as Address;
    return null;
  });

  const [isContractVerifiedOnChain, setIsContractVerifiedOnChain] = useState(false);
  const [isCheckingBytecode, setIsCheckingBytecode] = useState(false);
  const [totalRegistered, setTotalRegistered] = useState<number | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const { chainId, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const refreshContractStats = useCallback(async () => {
    if (!contractAddress || !isAddress(contractAddress)) {
      setIsContractVerifiedOnChain(false);
      setTotalRegistered(null);
      return;
    }

    setIsCheckingBytecode(true);
    try {
      const code = await botchainPublicClient.getBytecode({ address: contractAddress });
      const hasCode = Boolean(code && code !== '0x' && code.length > 2);
      setIsContractVerifiedOnChain(hasCode);

      if (hasCode) {
        try {
          const count = await botchainPublicClient.readContract({
            address: contractAddress,
            abi: BOT_USERNAME_REGISTRY_ABI,
            functionName: 'totalRegistered',
          });
          setTotalRegistered(Number(count));
        } catch {
          setTotalRegistered(null);
        }
      } else {
        setTotalRegistered(null);
      }
    } catch {
      setIsContractVerifiedOnChain(false);
      setTotalRegistered(null);
    } finally {
      setIsCheckingBytecode(false);
    }
  }, [contractAddress]);

  useEffect(() => {
    refreshContractStats();
  }, [refreshContractStats]);

  const setContractAddress = useCallback((addr: string): boolean => {
    const trimmed = addr.trim();
    if (!trimmed) {
      localStorage.removeItem(STORAGE_KEY);
      setContractAddressState(null);
      return true;
    }
    if (!isAddress(trimmed)) {
      return false;
    }
    localStorage.setItem(STORAGE_KEY, trimmed);
    setContractAddressState(trimmed as Address);
    return true;
  }, []);

  const deployRegistryContract = useCallback(async () => {
    setDeployError(null);
    if (!isConnected || !walletClient) {
      throw new Error('Please connect your wallet first.');
    }

    if (
      !BOT_USERNAME_REGISTRY_BYTECODE ||
      BOT_USERNAME_REGISTRY_BYTECODE === '0x' ||
      BOT_USERNAME_REGISTRY_BYTECODE.length < 10
    ) {
      throw new Error('Contract bytecode not compiled. Run `npm run compile:contract`.');
    }

    setIsDeploying(true);
    try {
      if (chainId !== BOTCHAIN_CHAIN_ID) {
        await switchOrAddBotchainNetwork();
      }

      const txHash = await walletClient.deployContract({
        abi: BOT_USERNAME_REGISTRY_ABI,
        bytecode: BOT_USERNAME_REGISTRY_BYTECODE,
        account: walletClient.account,
      });

      const receipt = await botchainPublicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      if (!receipt.contractAddress) {
        throw new Error('Deployment succeeded but no contract address was returned in receipt.');
      }

      const deployedAddr = receipt.contractAddress as Address;
      localStorage.setItem(STORAGE_KEY, deployedAddr);
      setContractAddressState(deployedAddr);
      setIsContractVerifiedOnChain(true);
      setTotalRegistered(0);

      return { contractAddress: deployedAddr, txHash };
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || 'Failed to deploy BotUsernameRegistry';
      setDeployError(msg);
      throw err;
    } finally {
      setIsDeploying(false);
    }
  }, [isConnected, walletClient, chainId]);

  return (
    <RegistryConfigContext.Provider
      value={{
        contractAddress,
        isContractVerifiedOnChain,
        isCheckingBytecode,
        totalRegistered,
        setContractAddress,
        deployRegistryContract,
        isDeploying,
        deployError,
        refreshContractStats,
        isConfigModalOpen,
        setIsConfigModalOpen,
      }}
    >
      {children}
    </RegistryConfigContext.Provider>
  );
};

export function useRegistryConfig(): RegistryConfigContextValue {
  const ctx = useContext(RegistryConfigContext);
  if (!ctx) {
    throw new Error('useRegistryConfig must be used inside RegistryConfigProvider');
  }
  return ctx;
}

