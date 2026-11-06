import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';
import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Load .env file into process.env
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

const rpcUrl = process.env.VITE_BOTCHAIN_RPC_URL || 'https://rpc.bohr.life';

export const botchainTestnet = defineChain({
  id: 968,
  name: 'Botchain Testnet',
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: 'Botchain Explorer',
      url: 'https://scan.bohr.life',
    },
  },
  testnet: true,
});

function compileContract() {
  const contractPath = path.resolve('contracts/BotUsernameRegistry.sol');
  const source = fs.readFileSync(contractPath, 'utf8');
  const input = {
    language: 'Solidity',
    sources: {
      'BotUsernameRegistry.sol': { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode.object'] },
      },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contract = output.contracts['BotUsernameRegistry.sol']['BotUsernameRegistry'];
  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
  };
}

async function main() {
  const pk = (process.env.PRIVATE_KEY || '').trim();
  if (!pk) {
    console.error('Error: Please add your PRIVATE_KEY in the .env file before running `npm.cmd run deploy:testnet`.');
    process.exit(1);
  }

  const { abi, bytecode } = compileContract();

  const formattedPk = pk.startsWith('0x') ? pk : `0x${pk}`;
  const account = privateKeyToAccount(formattedPk);

  const publicClient = createPublicClient({
    chain: botchainTestnet,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: botchainTestnet,
    transport: http(rpcUrl),
  });

  console.log(`Deploying BotUsernameRegistry from ${account.address} on Botchain Testnet (Chain ID 968)...`);

  const hash = await walletClient.deployContract({
    abi,
    bytecode,
  });

  console.log(`Transaction submitted: https://scan.bohr.life/tx/${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const deployedAddress = receipt.contractAddress;

  console.log(`BotUsernameRegistry deployed at: ${deployedAddress}`);

  // Automatically save deployed contract address into .env
  if (deployedAddress && fs.existsSync(envPath)) {
    let envText = fs.readFileSync(envPath, 'utf8');
    if (/^VITE_REGISTRY_CONTRACT_ADDRESS=.*$/m.test(envText)) {
      envText = envText.replace(
        /^VITE_REGISTRY_CONTRACT_ADDRESS=.*$/m,
        `VITE_REGISTRY_CONTRACT_ADDRESS=${deployedAddress}`
      );
    } else {
      envText += `\nVITE_REGISTRY_CONTRACT_ADDRESS=${deployedAddress}\n`;
    }
    fs.writeFileSync(envPath, envText, 'utf8');
    console.log(`Updated .env with VITE_REGISTRY_CONTRACT_ADDRESS=${deployedAddress}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
