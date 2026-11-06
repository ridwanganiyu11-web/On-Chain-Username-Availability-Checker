import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  AtSign,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Globe,
  ShieldCheck,
  Search,
  Sparkles,
  Loader2,
  Share2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import type { Address } from 'viem';
import {
  botchainPublicClient,
  BOTCHAIN_NETWORK_METADATA,
} from '../config/web3';
import { BOT_USERNAME_REGISTRY_ABI } from '../contracts/BotUsernameRegistryArtifact';
import { useRegistryConfig } from '../context/RegistryConfigContext';
import {
  cleanUsernameInput,
  validateUsername,
  shortenAddress,
  formatBlockchainTimestamp,
  buildPublicProfileUrl,
} from '../utils/username';
import { QrCodeCard } from '../components/QrCodeCard';

export const PublicProfilePage: React.FC = () => {
  const { username: rawParam } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const normalizedUsername = cleanUsernameInput(rawParam || 'ganiyu').toLowerCase();
  const validation = validateUsername(normalizedUsername);

  const {
    contractAddress,
    isContractVerifiedOnChain,
    setIsConfigModalOpen,
  } = useRegistryConfig();

  const [lookupInput, setLookupInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<{
    wallet: Address | null;
    registeredAt: bigint | null;
    exists: boolean;
    queriedOnChain: boolean;
  }>({
    wallet: null,
    registeredAt: null,
    exists: false,
    queriedOnChain: false,
  });

  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedProfileUrl, setCopiedProfileUrl] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!validation.isValid || !contractAddress || !isContractVerifiedOnChain) {
      setProfile({
        wallet: null,
        registeredAt: null,
        exists: false,
        queriedOnChain: false,
      });
      return;
    }

    setIsLoading(true);
    try {
      const [wallet, registeredAt, exists] = await botchainPublicClient.readContract({
        address: contractAddress,
        abi: BOT_USERNAME_REGISTRY_ABI,
        functionName: 'getProfile',
        args: [normalizedUsername],
      });

      setProfile({
        wallet: exists ? wallet : null,
        registeredAt: exists ? registeredAt : null,
        exists,
        queriedOnChain: true,
      });
    } catch {
      setProfile({
        wallet: null,
        registeredAt: null,
        exists: false,
        queriedOnChain: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [normalizedUsername, validation.isValid, contractAddress, isContractVerifiedOnChain]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleCopyWallet = async () => {
    if (!profile.wallet) return;
    try {
      await navigator.clipboard.writeText(profile.wallet);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(buildPublicProfileUrl(normalizedUsername));
      setCopiedProfileUrl(true);
      setTimeout(() => setCopiedProfileUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanUsernameInput(lookupInput).toLowerCase();
    if (cleaned) {
      navigate(`/u/${cleaned}`);
      setLookupInput('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Top Bar: Back + Quick Username Lookup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Username Availability Checker</span>
        </Link>

        <form onSubmit={handleLookupSubmit} className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-mono text-xs">
              @
            </span>
            <input
              type="text"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              placeholder="Look up another username..."
              className="pl-7 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500 text-xs font-mono text-white outline-none w-56"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
        </form>
      </div>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <div className="glass-panel-emerald rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Identity Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-slate-950 font-extrabold text-2xl shadow-lg shadow-emerald-500/20 shrink-0">
                  <AtSign className="w-8 h-8 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-mono font-extrabold text-white">
                      @{normalizedUsername}
                    </h1>
                    {isLoading ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Querying Chain 968</span>
                      </span>
                    ) : profile.exists ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Registered on Botchain</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Unclaimed Identity</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Username identity profile • Botchain Testnet (Chain ID 968)
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                <p className="text-xs">Reading profile from BotUsernameRegistry on Botchain...</p>
              </div>
            ) : profile.exists && profile.wallet ? (
              <div className="mt-6 space-y-4">
                {/* Wallet Address Card */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Wallet Address
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyWallet}
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer"
                      >
                        {copiedWallet ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Address</span>
                          </>
                        )}
                      </button>
                      <a
                        href={`${BOTCHAIN_NETWORK_METADATA.explorerUrl}/address/${profile.wallet}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <div className="font-mono text-sm sm:text-base text-white break-all">
                    {profile.wallet}
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-1">
                    Shortened: {shortenAddress(profile.wallet, 4)}
                  </div>
                </div>

                {/* Network & Registration Date Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Network</span>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {BOTCHAIN_NETWORK_METADATA.name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 font-mono">
                      Chain ID {BOTCHAIN_NETWORK_METADATA.chainId} • Token: {BOTCHAIN_NETWORK_METADATA.nativeCurrency.symbol}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Registration Date</span>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {formatBlockchainTimestamp(profile.registeredAt)}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Retrieved from blockchain
                    </div>
                  </div>
                </div>

                {/* Share Profile Bar */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="overflow-hidden">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Share this username profile
                    </span>
                    <span className="text-xs font-mono text-emerald-300 truncate block mt-0.5">
                      {buildPublicProfileUrl(normalizedUsername)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyProfileLink}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    {copiedProfileUrl ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>Copy Profile URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Unclaimed / Sample Preview State */
              <div className="mt-6 space-y-5">
                {!contractAddress || !isContractVerifiedOnChain ? (
                  <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-200 space-y-2">
                      <p className="font-semibold text-amber-300">
                        Preview Mode — Registry Contract Not Yet Configured
                      </p>
                      <p>
                        Below is how <code className="font-mono text-white">@{normalizedUsername}</code>&apos;s public identity profile looks. Connect or deploy <code className="font-mono text-emerald-300">BotUsernameRegistry.sol</code> on Botchain Testnet (Chain ID 968) to query live on-chain ownership.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsConfigModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold cursor-pointer"
                      >
                        Deploy / Setup Contract
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 text-center space-y-3">
                    <div className="text-base font-bold text-white">
                      @{normalizedUsername} is currently available on Botchain!
                    </div>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      No wallet has claimed <code className="font-mono text-emerald-300">@{normalizedUsername}</code> yet. Claim it now to link it permanently to your Botchain wallet address.
                    </p>
                    {validation.isValid && (
                      <Link
                        to={`/?claim=${normalizedUsername}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Claim @{normalizedUsername} Now</span>
                      </Link>
                    )}
                  </div>
                )}

                {/* Illustrative Profile Specification Preview when unclaimed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-85">
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Network</span>
                    <span className="text-sm font-bold text-white">
                      {BOTCHAIN_NETWORK_METADATA.name} (Chain ID {BOTCHAIN_NETWORK_METADATA.chainId})
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Registration Date</span>
                    <span className="text-sm font-bold text-slate-300">
                      Retrieved from blockchain upon claim
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: QR Code Identity Sharing */}
        <div className="lg:col-span-5">
          <QrCodeCard
            username={normalizedUsername}
            walletAddress={profile.wallet || undefined}
          />
        </div>
      </div>
    </div>
  );
};

