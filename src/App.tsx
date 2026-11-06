import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ContractConfigModal } from './components/ContractConfigModal';
import { HomePage } from './pages/HomePage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { BOTCHAIN_NETWORK_METADATA } from './config/web3';
import { ExternalLink } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <ContractConfigModal />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/u/:username" element={<PublicProfilePage />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-800/70 bg-slate-950/60 py-6 mt-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">BotName</span>
              <span>— Your Name. Your Wallet. Your Identity on Botchain.</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 font-mono">
              <span>Chain ID: {BOTCHAIN_NETWORK_METADATA.chainId}</span>
              <span>Token: {BOTCHAIN_NETWORK_METADATA.nativeCurrency.symbol}</span>
              <a
                href={BOTCHAIN_NETWORK_METADATA.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
              >
                <span>scan.bohr.life</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;

