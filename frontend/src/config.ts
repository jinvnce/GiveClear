export const CONFIG = {
  giveClear: import.meta.env.VITE_GIVECLEAR_ADDRESS as string,
  token: import.meta.env.VITE_TOKEN_ADDRESS as string,
  rpc: (import.meta.env.VITE_RPC_URL as string) || "http://127.0.0.1:8545",
  api: (import.meta.env.VITE_API_URL as string) || "http://localhost:4000",
  deployBlock: Number(import.meta.env.VITE_DEPLOY_BLOCK || 0),
  chainId: Number(import.meta.env.VITE_CHAIN_ID || 31337),
  explorer: (import.meta.env.VITE_EXPLORER_URL as string) || "",
};
