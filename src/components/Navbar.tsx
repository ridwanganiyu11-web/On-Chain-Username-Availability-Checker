import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AtSign,
  LayoutDashboard,
  Search,
  Wallet,
  Cpu,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useRegistryConfig } from '../context/RegistryConfigContext';
import {
  BOTCHAIN_CHAIN_ID,
  BOTCHAIN_NETWORK_METADATA,
  switchOrAddBotchainNetwork,
} from '../config/web3';
import { shortenAddress } from '../utils/username';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { address, isConnected, chainId } = useAccount();
  const { open } = useAppKit();
  const {
    contractAddress,
    isContractVerifiedOnChain,
    setIsConfigModalOpen,
  } = useRegistryConfig();

  const isWrongChain = isConnected && chainId !== BOTCHAIN_CHAIN_ID;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#070B14]/85 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
            <AtSign className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">BotName</span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Chain {BOTCHAIN_CHAIN_ID}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Your Name. Your Wallet. Your Identity.
            </p>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              location.pathname === '/'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Username Search</span>
          </Link>

          <Link
            to="/dashboard"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              location.pathname.startsWith('/dashboard')
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>My Username Dashboard</span>
          </Link>

          <Link
            to="/u/ganiyu"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              location.pathname.startsWith('/u/')
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Public Profile</span>
          </Link>
        </nav>

        {/* Right Actions: Contract Config + Wallet */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            title="Configure or deploy BotUsernameRegistry.sol on Botchain Testnet (968)"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono border transition cursor-pointer ${
              contractAddress && isContractVerifiedOnChain
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {contractAddress && isContractVerifiedOnChain
                ? shortenAddress(contractAddress, 3)
                : 'Setup Contract'}
            </span>
          </button>

          {isWrongChain ? (
            <button
              type="button"
              onClick={() => switchOrAddBotchainNetwork().catch(() => open({ view: 'Networks' }))}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Switch to {BOTCHAIN_NETWORK_METADATA.name}</span>
            </button>
          ) : isConnected && address ? (
            <button
              type="button"
              onClick={() => open()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700 text-xs font-mono font-medium transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{shortenAddress(address, 4)}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => open()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile bottom nav bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/70 bg-slate-950/90 py-2 px-3 text-xs">
        <Link
          to="/"
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${
            location.pathname === '/' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
        </Link>
        <Link
          to="/dashboard"
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${
            location.pathname.startsWith('/dashboard')
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>My Dashboard</span>
        </Link>
        <Link
          to="/u/ganiyu"
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${
            location.pathname.startsWith('/u/')
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Profile</span>
        </Link>
      </div>
    </header>
  );
};

