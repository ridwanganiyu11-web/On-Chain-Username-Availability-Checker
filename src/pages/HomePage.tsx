import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Wallet,
  ArrowRight,
  ExternalLink,
  Loader2,
  Shield,
  Zap,
  Globe,
  Copy,
  Check,
  Rocket,
  Search,
  Activity,
} from 'lucide-react';
import { useAccount, useWalletClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { isAddress, parseAbiItem, type Address } from 'viem';
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

const EXAMPLE_NAMES = ['ganiyu', 'developer01', 'botbuilder', 'satoshi_bot'];

interface RecentClaimItem {
  username: string;
  wallet: Address;
  timestamp: bigint;
  txHash?: string;
}

export const HomePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialClaim = searchParams.get('claim') || 'ganiyu';

  const [query, setQuery] = useState(initialClaim);
  const validation = validateUsername(query);

  const {
    contractAddress,
    isContractVerifiedOnChain,
    setIsConfigModalOpen,
    refreshContractStats,
    totalRegistered,
  } = useRegistryConfig();

  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { open: openAppKit } = useAppKit();

  // On-chain availability & lookup state
  const [isCheckingOnChain, setIsCheckingOnChain] = useState(false);
  const [onChainState, setOnChainState] = useState<{
    checkedUsername: string;
    isAvailable: boolean | null;
    ownerWallet: Address | null;
    registeredAt: bigint | null;
    error: string | null;
  }>({
    checkedUsername: '',
    isAvailable: null,
    ownerWallet: null,
    registeredAt: null,
    error: null,
  });

  // Connected wallet's own existing username
  const [myExistingUsername, setMyExistingUsername] = useState<string>('');

  // Claim transaction state
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | null>(null);
  const [claimedSuccessUsername, setClaimedSuccessUsername] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [copiedOwner, setCopiedOwner] = useState(false);

  // Reverse wallet lookup state
  const [walletLookupInput, setWalletLookupInput] = useState('');
  const [isLookingUpWallet, setIsLookingUpWallet] = useState(false);
  const [walletLookupResult, setWalletLookupResult] = useState<{
    queriedAddress: string;
    username: string | null;
    registeredAt: bigint | null;
    error: string | null;
  } | null>(null);

  // Recent on-chain claims feed
  const [recentClaims, setRecentClaims] = useState<RecentClaimItem[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  const checkAvailability = useCallback(
    async (candidate: string) => {
      const v = validateUsername(candidate);
      if (!v.isValid) {
        setOnChainState({
          checkedUsername: v.normalized,
          isAvailable: null,
          ownerWallet: null,
          registeredAt: null,
          error: null,
        });
        return;
      }

      if (!contractAddress || !isContractVerifiedOnChain) {
        setOnChainState({
          checkedUsername: v.normalized,
          isAvailable: null,
          ownerWallet: null,
          registeredAt: null,
          error: 'Deploy or connect BotUsernameRegistry.sol on Chain 968 to query live contract state.',
        });
        return;
      }

      setIsCheckingOnChain(true);
      try {
        const [wallet, registeredAt, exists] = await botchainPublicClient.readContract({
          address: contractAddress,
          abi: BOT_USERNAME_REGISTRY_ABI,
          functionName: 'getProfile',
          args: [v.normalized],
        });

        setOnChainState({
          checkedUsername: v.normalized,
          isAvailable: !exists,
          ownerWallet: exists ? wallet : null,
          registeredAt: exists ? registeredAt : null,
          error: null,
        });
      } catch (err: any) {
        setOnChainState({
          checkedUsername: v.normalized,
          isAvailable: null,
          ownerWallet: null,
          registeredAt: null,
          error: err?.shortMessage || 'Unable to query contract on Botchain RPC.',
        });
      } finally {
        setIsCheckingOnChain(false);
      }
    },
    [contractAddress, isContractVerifiedOnChain]
  );

  const fetchMyUsername = useCallback(async () => {
    if (!address || !contractAddress || !isContractVerifiedOnChain) {
      setMyExistingUsername('');
      return;
    }
    try {
      const uname = await botchainPublicClient.readContract({
        address: contractAddress,
        abi: BOT_USERNAME_REGISTRY_ABI,
        functionName: 'getUsername',
        args: [address],
      });
      setMyExistingUsername(uname || '');
    } catch {
      setMyExistingUsername('');
    }
  }, [address, contractAddress, isContractVerifiedOnChain]);

  const fetchRecentClaims = useCallback(async () => {
    if (!contractAddress || !isContractVerifiedOnChain) {
      setRecentClaims([]);
      return;
    }
    setIsLoadingRecent(true);
    try {
      const latestBlock = await botchainPublicClient.getBlockNumber();
      const fromBlock = latestBlock > 5000n ? latestBlock - 5000n : 0n;
      const logs = await botchainPublicClient.getLogs({
        address: contractAddress,
        event: parseAbiItem(
          'event UsernameClaimed(address indexed wallet, string username, uint256 timestamp)'
        ),
        fromBlock,
        toBlock: 'latest',
      });

      const items: RecentClaimItem[] = logs
        .map((l) => ({
          username: l.args.username || '',
          wallet: (l.args.wallet || '0x0000000000000000000000000000000000000000') as Address,
          timestamp: l.args.timestamp || 0n,
          txHash: l.transactionHash,
        }))
        .filter((i) => i.username)
        .reverse()
        .slice(0, 6);

      setRecentClaims(items);
    } catch {
      setRecentClaims([]);
    } finally {
      setIsLoadingRecent(false);
    }
  }, [contractAddress, isContractVerifiedOnChain]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAvailability(query);
    }, 220);
    return () => clearTimeout(timer);
  }, [query, checkAvailability]);

  useEffect(() => {
    fetchMyUsername();
  }, [fetchMyUsername]);

  useEffect(() => {
    fetchRecentClaims();
  }, [fetchRecentClaims]);

  const handleClaimUsername = async () => {
    setClaimError(null);
    setClaimTxHash(null);
    setClaimedSuccessUsername(null);

    if (!validation.isValid) return;

    if (!isConnected || !walletClient || !address) {
      openAppKit();
      return;
    }

    if (!contractAddress || !isContractVerifiedOnChain) {
      setIsConfigModalOpen(true);
      return;
    }

    setIsClaiming(true);
    try {
      if (chainId !== BOTCHAIN_CHAIN_ID) {
        await switchOrAddBotchainNetwork();
      }

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: BOT_USERNAME_REGISTRY_ABI,
        functionName: 'claimUsername',
        args: [validation.normalized],
        account: address,
      });

      setClaimTxHash(hash);

      await botchainPublicClient.waitForTransactionReceipt({ hash });

      setClaimedSuccessUsername(validation.normalized);
      await checkAvailability(validation.normalized);
      await fetchMyUsername();
      await refreshContractStats();
      await fetchRecentClaims();
    } catch (err: any) {
      const message =
        err?.shortMessage ||
        err?.details ||
        err?.message ||
        'Transaction failed or was rejected in wallet.';
      setClaimError(message);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleWalletReverseLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = walletLookupInput.trim();
    if (!trimmed) return;

    if (!isAddress(trimmed)) {
      setWalletLookupResult({
        queriedAddress: trimmed,
        username: null,
        registeredAt: null,
        error: 'Please enter a valid 0x wallet address.',
      });
      return;
    }

    if (!contractAddress || !isContractVerifiedOnChain) {
      setWalletLookupResult({
        queriedAddress: trimmed,
        username: null,
        registeredAt: null,
        error: 'Contract not configured.',
      });
      return;
    }

    setIsLookingUpWallet(true);
    try {
      const [uname, regAt, exists] = await botchainPublicClient.readContract({
        address: contractAddress,
        abi: BOT_USERNAME_REGISTRY_ABI,
        functionName: 'getWalletProfile',
        args: [trimmed as Address],
      });

      setWalletLookupResult({
        queriedAddress: trimmed,
        username: exists && uname ? uname : null,
        registeredAt: exists ? regAt : null,
        error: null,
      });
    } catch (err: any) {
      setWalletLookupResult({
        queriedAddress: trimmed,
        username: null,
        registeredAt: null,
        error: err?.shortMessage || 'Failed to query wallet on Botchain.',
      });
    } finally {
      setIsLookingUpWallet(false);
    }
  };

  const handleCopyOwner = async (wallet: string) => {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopiedOwner(true);
      setTimeout(() => setCopiedOwner(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Contract Setup Callout if not yet deployed */}
      {(!contractAddress || !isContractVerifiedOnChain) && (
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-slate-900 border border-amber-500/40 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Rocket className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Connect or Deploy <code className="font-mono text-emerald-300">BotUsernameRegistry.sol</code> on Chain ID 968
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                To perform live on-chain availability checks and claim usernames on Botchain Testnet (
                <code className="font-mono text-amber-200">https://rpc.bohr.life</code>), deploy the contract in 1 click or enter your deployed contract address.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            Deploy / Configure Contract
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Decentralized Identity on Botchain Testnet • Chain ID 968</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Claim your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Web3 identity
          </span>
        </h1>
        <p className="mt-3 text-slate-400 text-sm sm:text-base leading-relaxed">
          Replace long hexadecimal wallet addresses like{' '}
          <code className="font-mono text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            0x71C...92A4
          </code>{' '}
          with a human-readable username like{' '}
          <code className="font-mono text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/30">
            @ganiyu
          </code>{' '}
          permanently verifiable on Botchain.
        </p>
      </div>

      {/* Main Search & Availability Checker Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel rounded-2xl p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="username-search-input"
                className="text-xs font-bold uppercase tracking-wider text-slate-400"
              >
                1. Search &amp; Check Username Availability
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                3–20 chars • a-z, 0-9, _
              </span>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center">
              <span className="absolute left-4 text-emerald-400 font-mono font-bold text-xl select-none">
                @
              </span>
              <input
                id="username-search-input"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value.replace(/^@+/, '').toLowerCase());
                  setClaimedSuccessUsername(null);
                  setClaimError(null);
                }}
                placeholder="ganiyu"
                maxLength={24}
                className="w-full pl-10 pr-28 py-4 rounded-xl bg-slate-950/90 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-lg sm:text-xl font-mono font-semibold text-white outline-none transition"
              />
              <div className="absolute right-3 flex items-center gap-1.5">
                {isCheckingOnChain ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Checking</span>
                  </span>
                ) : validation.isValid && onChainState.isAvailable === true ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Available</span>
                  </span>
                ) : validation.isValid && onChainState.isAvailable === false ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Claimed</span>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Try:</span>
              {EXAMPLE_NAMES.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setQuery(sample);
                    setClaimedSuccessUsername(null);
                    setClaimError(null);
                  }}
                  className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    validation.normalized === sample
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  @{sample}
                </button>
              ))}
            </div>

            {/* Format Validation Feedback */}
            {!validation.isValid && query.trim().length > 0 && (
              <div className="mt-5 p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Invalid Username Format
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">{validation.reason}</p>
                </div>
              </div>
            )}

            {/* Live On-Chain Result Panel */}
            {validation.isValid && (
              <div className="mt-6 pt-5 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                      YOUR USERNAME
                    </span>
                    <div className="text-2xl font-mono font-bold text-white mt-0.5">
                      @{validation.normalized}
                    </div>
                  </div>

                  {onChainState.isAvailable === true && (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Available on Botchain</span>
                    </span>
                  )}

                  {onChainState.isAvailable === false && (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold">
                      <XCircle className="w-4 h-4" />
                      <span>Already Claimed</span>
                    </span>
                  )}
                </div>

                {/* If already claimed: show owner details & link to Public Profile */}
                {onChainState.isAvailable === false && onChainState.ownerWallet && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Connected Wallet Owner</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-200">
                          {shortenAddress(onChainState.ownerWallet, 6)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyOwner(onChainState.ownerWallet!)}
                          className="text-slate-400 hover:text-emerald-400 cursor-pointer"
                          title="Copy owner wallet address"
                        >
                          {copiedOwner ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Registration Date</span>
                      <span className="text-slate-200 font-medium">
                        {formatBlockchainTimestamp(onChainState.registeredAt)}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center gap-2.5">
                      <Link
                        to={`/u/${validation.normalized}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition"
                      >
                        <span>View Public Profile (@{validation.normalized})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <a
                        href={`${BOTCHAIN_NETWORK_METADATA.explorerUrl}/address/${onChainState.ownerWallet}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1 transition"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                {onChainState.error && (
                  <div className="mt-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-3">
                    <span>{onChainState.error}</span>
                    <button
                      type="button"
                      onClick={() => setIsConfigModalOpen(true)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold cursor-pointer"
                    >
                      Setup
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reverse Wallet-to-Username Lookup Card */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Reverse Lookup: Find Username by Wallet Address
              </h3>
              <span className="text-[11px] font-mono text-emerald-400">getUsername(address)</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Enter any Botchain wallet address (`0x...`) to check if it has a registered `@username`.
            </p>
            <form onSubmit={handleWalletReverseLookup} className="flex gap-2">
              <input
                type="text"
                value={walletLookupInput}
                onChange={(e) => setWalletLookupInput(e.target.value)}
                placeholder="0x5E889b72A1464489e7df124280Ee4A5c11b039B3"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs font-mono text-white outline-none"
              />
              <button
                type="submit"
                disabled={isLookingUpWallet}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition cursor-pointer inline-flex items-center gap-1.5"
              >
                {isLookingUpWallet ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Lookup</span>
              </button>
            </form>

            {walletLookupResult && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                {walletLookupResult.error ? (
                  <span className="text-rose-400">{walletLookupResult.error}</span>
                ) : walletLookupResult.username ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block">
                        Wallet {shortenAddress(walletLookupResult.queriedAddress, 6)} owns:
                      </span>
                      <span className="text-base font-mono font-bold text-emerald-400">
                        @{walletLookupResult.username}
                      </span>
                    </div>
                    <Link
                      to={`/u/${walletLookupResult.username}`}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold hover:bg-emerald-500/30 transition"
                    >
                      Open Profile
                    </Link>
                  </div>
                ) : (
                  <span className="text-slate-300">
                    No username is currently linked to{' '}
                    <code className="font-mono text-slate-200">
                      {shortenAddress(walletLookupResult.queriedAddress, 6)}
                    </code>
                    .
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Smart Contract Rules Summary */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              On-Chain Registry Rules (BotUsernameRegistry.sol)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                  <Shield className="w-4 h-4" />
                  <span>1-to-1 Identity</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  One username per wallet and one wallet per username. Permanent until changed or released by owner.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                  <Zap className="w-4 h-4" />
                  <span>Zero Protocol Fees</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  No token, NFT, or staking requirements. Lookups are free; claiming only uses standard BOT gas.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                  <Globe className="w-4 h-4" />
                  <span>Normalized Format</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  3 to 20 characters using lowercase letters (a–z), digits (0–9), and underscores (_).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Registration Action Card, Recent Claims & Confirmation */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel-emerald rounded-2xl p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                2. Username Registration
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                Chain ID {BOTCHAIN_CHAIN_ID} ({BOTCHAIN_NETWORK_METADATA.nativeCurrency.symbol})
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 mb-5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Selected Handle</span>
                <span>Status</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xl font-mono font-bold text-white">
                  {validation.normalized ? `@${validation.normalized}` : '—'}
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                    !validation.isValid
                      ? 'bg-amber-500/20 text-amber-300'
                      : onChainState.isAvailable === true
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : onChainState.isAvailable === false
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {!validation.isValid
                    ? 'Invalid format'
                    : onChainState.isAvailable === true
                    ? 'Available'
                    : onChainState.isAvailable === false
                    ? 'Already Claimed'
                    : 'Ready'}
                </span>
              </div>
            </div>

            {/* If wallet already has a claimed username */}
            {isConnected && myExistingUsername && (
              <div className="mb-5 p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-300 font-semibold">
                    Your wallet already owns @{myExistingUsername}
                  </span>
                  <Link
                    to="/dashboard"
                    className="text-white underline font-semibold hover:text-emerald-300"
                  >
                    Manage / Change
                  </Link>
                </div>
                <p className="text-slate-300">
                  Each wallet is limited to one username at a time. Visit your{' '}
                  <Link to="/dashboard" className="text-emerald-400 underline">
                    Username Dashboard
                  </Link>{' '}
                  to change @{myExistingUsername} to @{validation.normalized || 'new_name'} or release it.
                </p>
              </div>
            )}

            {/* Primary CTA Button */}
            {!isConnected ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Connect MetaMask or any Web3 wallet to Botchain Testnet (Chain ID 968) to claim this username.
                </p>
                <button
                  type="button"
                  onClick={() => openAppKit()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Connect Wallet to Claim</span>
                </button>
              </div>
            ) : !contractAddress || !isContractVerifiedOnChain ? (
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition cursor-pointer"
              >
                <Rocket className="w-4 h-4" />
                <span>Deploy / Connect Registry Contract First</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClaimUsername}
                disabled={
                  !validation.isValid ||
                  onChainState.isAvailable !== true ||
                  isClaiming ||
                  Boolean(myExistingUsername)
                }
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:cursor-not-allowed"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirming on Botchain Testnet...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {validation.isValid
                        ? `Claim @${validation.normalized}`
                        : 'Enter a Valid Username'}
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Transaction error */}
            {claimError && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                {claimError}
              </div>
            )}

            {/* Transaction submitted link */}
            {claimTxHash && (
              <div className="mt-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs flex items-center justify-between">
                <span className="text-slate-300">Transaction Hash:</span>
                <a
                  href={`${BOTCHAIN_NETWORK_METADATA.explorerUrl}/tx/${claimTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:underline"
                >
                  <span>{shortenAddress(claimTxHash, 6)}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Registration Confirmation & Shareable Profile Link */}
            {claimedSuccessUsername && (
              <div className="mt-5 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>@{claimedSuccessUsername} is permanently yours!</span>
                </div>
                <p className="text-xs text-slate-200">
                  Your username is now linked to <code className="font-mono">{shortenAddress(address, 4)}</code> on Botchain Testnet.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs text-emerald-300 break-all">
                  {buildPublicProfileUrl(claimedSuccessUsername)}
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/u/${claimedSuccessUsername}`}
                    className="flex-1 text-center py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                  >
                    Open Public Profile
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex-1 text-center py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
              <span>Network: {BOTCHAIN_NETWORK_METADATA.name}</span>
              <span>
                {totalRegistered !== null
                  ? `${totalRegistered} Total Registered`
                  : 'RPC: rpc.bohr.life'}
              </span>
            </div>
          </div>

          {/* Instant QR Preview for the searched or claimed username */}
          {validation.isValid && (claimedSuccessUsername || onChainState.isAvailable === false) && (
            <QrCodeCard
              username={claimedSuccessUsername || validation.normalized}
              walletAddress={onChainState.ownerWallet || address}
              compact
            />
          )}

          {/* Live On-Chain Recently Claimed Usernames Feed */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Activity className="w-4 h-4" />
                <span>Recent On-Chain Claims</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {totalRegistered !== null ? `${totalRegistered} active` : 'Live Events'}
              </span>
            </div>

            {isLoadingRecent ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Syncing recent events...</span>
              </div>
            ) : recentClaims.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                No usernames claimed in recent blocks yet — be the first to claim{' '}
                <code className="font-mono text-emerald-300">@{validation.normalized || 'ganiyu'}</code>!
              </p>
            ) : (
              <div className="space-y-2">
                {recentClaims.map((item, idx) => (
                  <Link
                    key={`${item.username}-${idx}`}
                    to={`/u/${item.username}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 transition text-xs"
                  >
                    <span className="font-mono font-bold text-emerald-300">@{item.username}</span>
                    <span className="font-mono text-slate-400">{shortenAddress(item.wallet, 4)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
