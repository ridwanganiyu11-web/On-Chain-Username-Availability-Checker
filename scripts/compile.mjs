import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';

const contractPath = path.resolve('contracts/BotUsernameRegistry.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'BotUsernameRegistry.sol': {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const hasError = output.errors.some((err) => err.severity === 'error');
  for (const err of output.errors) {
    console.error(err.formattedMessage);
  }
  if (hasError) {
    process.exit(1);
  }
}

const contract = output.contracts['BotUsernameRegistry.sol']['BotUsernameRegistry'];
const abi = contract.abi;
const bytecode = `0x${contract.evm.bytecode.object}`;

const outDir = path.resolve('src/contracts');
fs.mkdirSync(outDir, { recursive: true });

const tsContent = `// Auto-generated from contracts/BotUsernameRegistry.sol
export const BOT_USERNAME_REGISTRY_ABI = ${JSON.stringify(abi, null, 2)} as const;

export const BOT_USERNAME_REGISTRY_BYTECODE: \`0x\${string}\` = "${bytecode}";
`;

fs.writeFileSync(path.join(outDir, 'BotUsernameRegistryArtifact.ts'), tsContent, 'utf8');
console.log('Successfully compiled BotUsernameRegistry.sol -> src/contracts/BotUsernameRegistryArtifact.ts');

