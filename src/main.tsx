import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './config/web3';
import { RegistryConfigProvider } from './context/RegistryConfigContext';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RegistryConfigProvider>
          <App />
        </RegistryConfigProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);

