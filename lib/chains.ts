import type { ChainInfo } from "./types";

// 32 chain EVM: 16 jaringan x mainnet + testnet.
// Chain ID dan simbol diverifikasi dari registry chainid.network (chainid.network/chains.json).
export const CHAINS: ChainInfo[] = [
  // Ethereum
  { id: 1, name: "Ethereum", network: "Ethereum", testnet: false, symbol: "ETH", explorer: "https://etherscan.io" },
  { id: 11155111, name: "Sepolia", network: "Ethereum", testnet: true, symbol: "ETH", explorer: "https://sepolia.etherscan.io" },
  // Base
  { id: 8453, name: "Base", network: "Base", testnet: false, symbol: "ETH", explorer: "https://basescan.org" },
  { id: 84532, name: "Base Sepolia", network: "Base", testnet: true, symbol: "ETH", explorer: "https://sepolia.basescan.org" },
  // Arbitrum
  { id: 42161, name: "Arbitrum One", network: "Arbitrum", testnet: false, symbol: "ETH", explorer: "https://arbiscan.io" },
  { id: 421614, name: "Arbitrum Sepolia", network: "Arbitrum", testnet: true, symbol: "ETH", explorer: "https://sepolia.arbiscan.io" },
  // Optimism
  { id: 10, name: "OP Mainnet", network: "Optimism", testnet: false, symbol: "ETH", explorer: "https://optimistic.etherscan.io" },
  { id: 11155420, name: "OP Sepolia", network: "Optimism", testnet: true, symbol: "ETH", explorer: "https://sepolia-optimism.etherscan.io" },
  // Polygon
  { id: 137, name: "Polygon", network: "Polygon", testnet: false, symbol: "POL", explorer: "https://polygonscan.com" },
  { id: 80002, name: "Polygon Amoy", network: "Polygon", testnet: true, symbol: "POL", explorer: "https://amoy.polygonscan.com" },
  // BNB Smart Chain
  { id: 56, name: "BNB Smart Chain", network: "BNB Chain", testnet: false, symbol: "BNB", explorer: "https://bscscan.com" },
  { id: 97, name: "BNB Testnet", network: "BNB Chain", testnet: true, symbol: "tBNB", explorer: "https://testnet.bscscan.com" },
  // Avalanche
  { id: 43114, name: "Avalanche C-Chain", network: "Avalanche", testnet: false, symbol: "AVAX", explorer: "https://snowtrace.io" },
  { id: 43113, name: "Avalanche Fuji", network: "Avalanche", testnet: true, symbol: "AVAX", explorer: "https://testnet.snowtrace.io" },
  // Linea
  { id: 59144, name: "Linea", network: "Linea", testnet: false, symbol: "ETH", explorer: "https://lineascan.build" },
  { id: 59141, name: "Linea Sepolia", network: "Linea", testnet: true, symbol: "ETH", explorer: "https://sepolia.lineascan.build" },
  // zkSync Era
  { id: 324, name: "zkSync Era", network: "zkSync", testnet: false, symbol: "ETH", explorer: "https://explorer.zksync.io" },
  { id: 300, name: "zkSync Sepolia", network: "zkSync", testnet: true, symbol: "ETH", explorer: "https://sepolia.explorer.zksync.io" },
  // Scroll
  { id: 534352, name: "Scroll", network: "Scroll", testnet: false, symbol: "ETH", explorer: "https://scrollscan.com" },
  { id: 534351, name: "Scroll Sepolia", network: "Scroll", testnet: true, symbol: "ETH", explorer: "https://sepolia.scrollscan.com" },
  // Blast
  { id: 81457, name: "Blast", network: "Blast", testnet: false, symbol: "ETH", explorer: "https://blastscan.io" },
  { id: 168587773, name: "Blast Sepolia", network: "Blast", testnet: true, symbol: "ETH", explorer: "https://sepolia.blastscan.io" },
  // Mantle
  { id: 5000, name: "Mantle", network: "Mantle", testnet: false, symbol: "MNT", explorer: "https://explorer.mantle.xyz" },
  { id: 5003, name: "Mantle Sepolia", network: "Mantle", testnet: true, symbol: "MNT", explorer: "https://sepolia.explorer.mantle.xyz" },
  // Gnosis
  { id: 100, name: "Gnosis", network: "Gnosis", testnet: false, symbol: "XDAI", explorer: "https://gnosisscan.io" },
  { id: 10200, name: "Gnosis Chiado", network: "Gnosis", testnet: true, symbol: "XDAI", explorer: "https://chiado.gnosisscan.io" },
  // Fantom
  { id: 250, name: "Fantom Opera", network: "Fantom", testnet: false, symbol: "FTM", explorer: "https://ftmscan.com" },
  { id: 4002, name: "Fantom Testnet", network: "Fantom", testnet: true, symbol: "FTM", explorer: "https://testnet.ftmscan.com" },
  // Celo
  { id: 42220, name: "Celo", network: "Celo", testnet: false, symbol: "CELO", explorer: "https://celoscan.io" },
  { id: 44787, name: "Celo Alfajores", network: "Celo", testnet: true, symbol: "CELO", explorer: "https://alfajores.celoscan.io" },
  // Mode
  { id: 34443, name: "Mode", network: "Mode", testnet: false, symbol: "ETH", explorer: "https://explorer.mode.network" },
  { id: 919, name: "Mode Sepolia", network: "Mode", testnet: true, symbol: "ETH", explorer: "https://sepolia.explorer.mode.network" },
];

export function getChain(chainId: number): ChainInfo {
  return CHAINS.find((c) => c.id === chainId) ?? CHAINS[0];
}

export function chainLabel(chainId: number): string {
  const c = getChain(chainId);
  return `${c.name} (${c.id})`;
}
