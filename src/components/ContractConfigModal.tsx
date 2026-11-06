import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Rocket,
  Loader2,
  ShieldCheck,
  PlusCircle,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useRegistryConfig } from '../context/RegistryConfigContext';
import {
  BOTCHAIN_NETWORK_METADATA,
  BOTCHAIN_CHAIN_ID,
  switchOrAddBotchainNetwork,
} from '../config/web3';

export const ContractConfigModal: React.FC = () => {
  const {
    contractAddress,
    isContractVerifiedOnChain,
    isCheckingBytecode,
    totalRegistered,
    setContractAddress,
    deployRegistryContract,
    isDeploying,
    deployError,
    isConfigModalOpen,
    setIsConfigModalOpen,
  } = useRegistryConfig();

  const { isConnected, chainId } = useAccount();
  const { open: openAppKit } = useAppKit();

  const [inputAddr, setInputAddr] = useState(contractAddress || '');
  const [inputError, setInputError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastDeployTx, setLastDeployTx] = useState<string | null>(null);

  useEffect(() => {
    setInputAddr(contractAddress || '');
  }, [contractAddress, isConfigModalOpen]);

  if (!isConfigModalOpen) return null;

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    setSaveSuccess(false);
    const ok = setContractAddress(inputAddr);
    if (!ok) {
      setInputError('Please enter a valid 0x Ethereum/Botchain contract address.');
      return;
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDeployClick = async () => {
    setInputError(null);
    try {
      const res = await deployRegistryContract();
      setInputAddr(res.contractAddress);
      setLastDeployTx(res.txHash);
    } catch {
      // handled in context
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl max-w-xl w-full p-6 border border-slate-700/70 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={() => setIsConfigModalOpen(false)}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/70 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Botchain Testnet &amp; Registry Contract
            </h2>
            <p className="text-xs text-slate-400">
              BotUsernameRegistry.sol on Chain ID {BOTCHAIN_NETWORK_METADATA.chainId}
            </p>
          </div>
        </div>

        {/* Network Specs Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Botchain Testnet Parameters
            </span>
            <button
              type="button"
              onClick={() => switchOrAddBotchainNetwork().catch(() => {})}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add / Switch in MetaMask</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
            <div>
              <span className="text-slate-400 block">Network Name</span>
              <span className="font-medium text-slate-100">{BOTCHAIN_NETWORK_METADATA.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Chain ID</span>
              <span className="font-mono font-semibold text-emerald-400">
                {BOTCHAIN_NETWORK_METADATA.chainId} ({BOTCHAIN_NETWORK_METADATA.chainIdHex})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">RPC Endpoint</span>
              <span className="font-mono text-slate-200">{BOTCHAIN_NETWORK_METADATA.rpcUrl}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Native Token &amp; Supply</span>
              <span className="font-medium text-slate-100">
                {BOTCHAIN_NETWORK_METADATA.nativeCurrency.symbol} ({BOTCHAIN_NETWORK_METADATA.totalSupply})
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block">Block Explorer</span>
              <a
                href={BOTCHAIN_NETWORK_METADATA.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:underline"
              >
                <span>{BOTCHAIN_NETWORK_METADATA.explorerUrl}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Active Contract Status */}
        <div className="mb-5">
          <form onSubmit={handleSaveAddress} className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              BotUsernameRegistry Contract Address (Chain ID 968)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputAddr}
                onChange={(e) => setInputAddr(e.target.value)}
                placeholder="0x... (Paste existing or deploy below)"
                className="flex-1 bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-600 transition cursor-pointer"
              >
                Save Address
              </button>
            </div>
            {inputError && <p className="text-xs text-rose-400">{inputError}</p>}
            {saveSuccess && (
              <p className="text-xs text-emerald-400">Contract address saved and verified!</p>
            )}
          </form>

          <div className="mt-3 flex items-center justify-between text-xs bg-slate-900/60 border border-slate-800/80 rounded-xl px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              {isCheckingBytecode ? (
                <>
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span className="text-slate-300">Checking contract bytecode on Botchain...</span>
                </>
              ) : contractAddress && isContractVerifiedOnChain ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 font-medium">
                    Live Contract Verified on Chain 968
                    {totalRegistered !== null ? ` • ${totalRegistered} Usernames Claimed` : ''}
                  </span>
                </>
              ) : contractAddress ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-amber-300">
                    No bytecode found at this address on Chain 968.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-slate-300">
                    No contract address set yet. Deploy below in 1 click or paste an address.
                  </span>
                </>
              )}
            </div>

            {contractAddress && (
              <a
                href={`${BOTCHAIN_NETWORK_METADATA.explorerUrl}/address/${contractAddress}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:underline ml-2 shrink-0"
              >
                <span>Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* One-Click Browser Deployment */}
        <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Rocket className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">
                1-Click Deploy <code className="font-mono text-emerald-300">BotUsernameRegistry.sol</code>
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Don&apos;t have a deployed registry address yet? Deploy the compiled{' '}
                <code className="font-mono text-emerald-300">BotUsernameRegistry.sol</code> smart
                contract directly to Botchain Testnet (Chain ID 968) from your connected wallet.
              </p>

              {deployError && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
                  {deployError}
                </div>
              )}

              {lastDeployTx && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between">
                  <span>Deployed successfully on Botchain!</span>
                  <a
                    href={`${BOTCHAIN_NETWORK_METADATA.explorerUrl}/tx/${lastDeployTx}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline font-mono"
                  >
                    <span>View Tx</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="mt-3">
                {!isConnected ? (
                  <button
                    type="button"
                    onClick={() => openAppKit()}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition cursor-pointer"
                  >
                    Connect Wallet to Deploy
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeployClick}
                    disabled={isDeploying}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isDeploying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Deploying on Chain 968 (Confirm in Wallet)...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          {chainId !== BOTCHAIN_CHAIN_ID
                            ? 'Switch to Chain 968 & Deploy Contract'
                            : 'Deploy BotUsernameRegistry Now'}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

