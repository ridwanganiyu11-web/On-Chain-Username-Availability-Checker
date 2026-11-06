import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  RefreshCw,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { useAccount, useWalletClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import {
  botchainPublicClient,
  BOTCHAIN_CHAIN_ID,
  BOTCHAIN_NETWORK_METADATA,
  switchOrAddBotchainNetwork,
} from '../config/web3';
import { BOT_USERNAME_REGISTRY_ABI } from '../contracts/BotUsernameRegistryArtifact';
import { useRegistryConfig } from '../context/RegistryConfigContext';
import {
  validateUsername,
  shortenAddress,
  formatBlockchainTimestamp,
  buildPublicProfileUrl,
} from '../utils/username';
import { QrCodeCard } from '../components/QrCodeCard';

export const DashboardPage: React.FC = () => {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { open: openAppKit } = useAppKit();

  const {
    contractAddress,
    isContractVerifiedOnChain,
    setIsConfigModalOpen,
    refreshContractStats,
  } = useRegistryConfig();

  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [myUsername, setMyUsername] = useState<string>('');
  const [registeredAt, setRegisteredAt] = useState<bigint | null>(null);

  // Change username state
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const newValidation = validateUsername(newUsernameInput);
  const [isNewAvailable, setIsNewAvailable] = useState<boolean | null>(null);
  const [isCheckingNew, setIsCheckingNew] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  // Release username state
  const [isReleasing, setIsReleasing] = useState(false);

  // Feedback
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadMyWalletProfile = useCallback(async () => {
    if (!address || !contractAddress || !isContractVerifiedOnChain) {
      setMyUsername('');
      setRegisteredAt(null);
      return;
    }

    setIsLoadingProfile(true);
    try {
      const [uname, regAt, exists] = await botchainPublicClient.readContract({
        address: contractAddress,
        abi: BOT_USERNAME_REGISTRY_ABI,
        functionName: 'getWalletProfile',
        args: [address],
      });

      if (exists && uname) {
        setMyUsername(uname);
        setRegisteredAt(regAt);
      } else {
        setMyUsername('');
        setRegisteredAt(null);
      }
    } catch {
      setMyUsername('');
      setRegisteredAt(null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [address, contractAddress, isContractVerifiedOnChain]);

  useEffect(() => {
    loadMyWalletProfile();
  }, [loadMyWalletProfile]);

  // Live check for newUsernameInput
  useEffect(() => {
    if (!newValidation.isValid || !contractAddress || !isContractVerifiedOnChain) {
      setIsNewAvailable(null);
      return;
    }

    if (newValidation.normalized === myUsername) {
      setIsNewAvailable(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsCheckingNew(true);
      try {
        const available = await botchainPublicClient.readContract({
          address: contractAddress,
          abi: BOT_USERNAME_REGISTRY_ABI,
          functionName: 'isAvailable',
          args: [newValidation.normalized],
        });
        if (active) setIsNewAvailable(available);
      } catch {
        if (active) setIsNewAvailable(null);
      } finally {
        if (active) setIsCheckingNew(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [newUsernameInput, newValidation.isValid, newValidation.normalized, myUsername, contractAddress, isContractVerifiedOnChain]);

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setTxHash(null);

    if (!isConnected || !walletClient || !address || !contractAddress) return;
    if (!newValidation.isValid || isNewAvailable !== true) return;

    setIsChanging(true);
    try {
      if (chainId !== BOTCHAIN_CHAIN_ID) {
        await switchOrAddBotchainNetwork();
      }

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: BOT_USERNAME_REGISTRY_ABI,
        functionName: 'changeUsername',
        args: [newValidation.normalized],
        account: address,
      });

      setTxHash(hash);
      await botchainPublicClient.waitForTransactionReceipt({ hash });

      setStatusMessage(`Username successfully changed to @${newValidation.normalized}!`);
      setNewUsernameInput('');
      await loadMyWalletProfile();
    } catch (err: any) {
      setErrorMessage(err?.shortMessage || err?.message || 'Failed to change username.');
    } finally {
      setIsChanging(false);
    }
  };

  const handleReleaseUsername = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setTxHash(null);

    if (!isConnected || !walletClient || !address || !contractAddress || !myUsername) return;

    setIsReleasing(true);
    try {
      if (chainId !== BOTCHAIN_CHAIN_ID) {
        await switchOrAddBotchainNetwork();
      }

      const oldName = myUsername;
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: BOT_USERNAME_REGISTRY_ABI,
        functionName: 'releaseUsername',
        args: [],
        account: address,
      });

      setTxHash(hash);
      await botchainPublicClient.waitForTransactionReceipt({ hash });

      setStatusMessage(`Released @${oldName}. Your wallet can now claim any available username.`);
      await loadMyWalletProfile();
      await refreshContractStats();
    } catch (err: any) {
      setErrorMessage(err?.shortMessage || err?.message || 'Failed to release username.');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleCopyProfileLink = async () => {
    if (!myUsername) return;
    try {
      await navigator.clipboard.writeText(buildPublicProfileUrl(myUsername));
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <LayoutDashboard className="w-4 h-4" />
            <span>4. My Username Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Manage Your Web3 Identity
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            View your claimed Botchain handle, change your username, or share your QR profile.
          </p>
        </div>

        {isConnected && (
          <button
            type="button"
            onClick={loadMyWalletProfile}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProfile ? 'animate-spin' : ''}`} />
            <span>Refresh On-Chain State</span>
          </button>
        )}
      </div>

      {!isConnected ? (
        <div className="glass-panel rounded-3xl p-10 text-center max-w-lg mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
            <Wallet className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
            Connect your MetaMask or Web3 wallet on Botchain Testnet (Chain ID 968) to view and manage your claimed username.
          </p>
          <button
            type="button"
            onClick={() => openAppKit()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>Connect Wallet</span>
          </button>
        </div>
      ) : !contractAddress || !isContractVerifiedOnChain ? (
        <div className="glass-panel rounded-3xl p-8 text-center max-w-xl mx-auto my-6">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">
            Deploy or Connect <code className="font-mono text-emerald-300">BotUsernameRegistry.sol</code>
          </h2>
          <p className="text-xs text-slate-300 mb-5">
            Set up the registry contract on Botchain Testnet (Chain ID 968) to manage your on-chain username.
          </p>
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
          >
            Deploy / Configure Contract
          </button>
        </div>
      ) : isLoadingProfile ? (
        <div className="glass-panel rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-slate-300">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          <span className="text-xs">Loading your identity from Botchain Testnet...</span>
        </div>
      ) : !myUsername ? (
        <div className="glass-panel rounded-3xl p-10 text-center max-w-xl mx-auto">
          <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">No Username Claimed Yet</h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-6">
            Wallet <code className="font-mono text-slate-200">{shortenAddress(address, 6)}</code> does not own a username on Botchain Testnet yet.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Search &amp; Claim Your Username</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Active Identity + Change / Release Controls */}
          <div className="lg:col-span-7 space-y-6">
            {/* Active Claimed Username Card */}
            <div className="glass-panel-emerald rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Your Active Botchain Username
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active Owner</span>
                </span>
              </div>

              <div className="text-3xl sm:text-4xl font-mono font-extrabold text-white mb-4">
                @{myUsername}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-5">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Connected Owner Wallet</span>
                  <span className="font-mono text-slate-100">{shortenAddress(address, 6)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>Registered On</span>
                  </span>
                  <span className="font-medium text-slate-100">
                    {formatBlockchainTimestamp(registeredAt)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  to={`/u/${myUsername}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>View Public Profile</span>
                </Link>

                <button
                  type="button"
                  onClick={handleCopyProfileLink}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700 font-semibold text-xs transition cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied Profile URL</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Profile Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Change Username Card */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-1">Change Your Username</h3>
              <p className="text-xs text-slate-400 mb-4">
                Atomically release <code className="font-mono text-slate-200">@{myUsername}</code> and claim a new available username on Botchain Testnet.
              </p>

              <form onSubmit={handleChangeUsername} className="space-y-3">
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-emerald-400 font-mono font-bold">@</span>
                  <input
                    type="text"
                    value={newUsernameInput}
                    onChange={(e) => setNewUsernameInput(e.target.value.replace(/^@+/, '').toLowerCase())}
                    placeholder="enter_new_username"
                    maxLength={20}
                    className="w-full pl-8 pr-28 py-3 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-emerald-500 text-sm font-mono text-white outline-none"
                  />
                  <div className="absolute right-3">
                    {isCheckingNew ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    ) : newValidation.isValid && isNewAvailable === true ? (
                      <span className="text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Available</span>
                      </span>
                    ) : newValidation.isValid && isNewAvailable === false ? (
                      <span className="text-xs font-semibold text-rose-400 inline-flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Taken</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {!newValidation.isValid && newUsernameInput.length > 0 && (
                  <p className="text-xs text-amber-300">{newValidation.reason}</p>
                )}

                <button
                  type="submit"
                  disabled={!newValidation.isValid || isNewAvailable !== true || isChanging}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {isChanging ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Username on Chain 968...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>
                        {newValidation.isValid
                          ? `Change to @${newValidation.normalized}`
                          : 'Change Username'}
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Release Username Card */}
            <div className="glass-panel rounded-2xl p-6 border border-rose-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Release Username</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Unlink <code className="font-mono text-slate-200">@{myUsername}</code> from your wallet so anyone can claim it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReleaseUsername}
                  disabled={isReleasing}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isReleasing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Releasing...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Release @{myUsername}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status / Tx Alerts */}
            {statusMessage && (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between">
                <span>{statusMessage}</span>
                {txHash && (
                  <a
                    href={`${BOTCHAIN_NETWORK_METADATA.explorerUrl}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono underline text-emerald-300"
                  >
                    <span>View Tx</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Right Column: QR Code Sharing */}
          <div className="lg:col-span-5">
            <QrCodeCard username={myUsername} walletAddress={address} />
          </div>
        </div>
      )}
    </div>
  );
};

