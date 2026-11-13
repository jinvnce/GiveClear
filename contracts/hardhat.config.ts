import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const { BSCSCAN_API_KEY } = process.env;
const BSC_TESTNET_RPC = process.env.BSC_TESTNET_RPC || process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545";
const rawKey = process.env.PRIVATE_KEY?.trim();
const privateKey = rawKey ? (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) : undefined;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "paris" },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    bscTestnet: {
      url: BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: privateKey ? [privateKey] : [],
    },
  },
  // Etherscan API V2: one key works for BscScan too.
  etherscan: { apiKey: BSCSCAN_API_KEY || "" },
};

export default config;
