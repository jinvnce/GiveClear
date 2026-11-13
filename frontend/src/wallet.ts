import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { CONFIG } from "./config";
import { friendly } from "./chain";

export type WalletState = {
  account: string | null;
  error: string;
  connect: () => Promise<void>;
  getSigner: () => Promise<JsonRpcSigner>;
};

const eth = () => (window as any).ethereum;

export function useWallet(): WalletState {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState("");

  const connect = useCallback(async () => {
    try {
      if (!eth()) {
        setError("No wallet found. Install the MetaMask extension or app, then try again.");
        return;
      }
      await eth().request({ method: "eth_requestAccounts" });
      const chainIdHex = "0x" + CONFIG.chainId.toString(16);
      try {
        await eth().request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
      } catch (e: any) {
        if (e?.code !== 4902) throw e;
        const isBsc = CONFIG.chainId === 97;
        await eth().request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
              chainName: isBsc ? "BNB Smart Chain Testnet" : `Localhost (${CONFIG.chainId})`,
              nativeCurrency: {
                name: isBsc ? "tBNB" : "ETH",
                symbol: isBsc ? "tBNB" : "ETH",
                decimals: 18,
              },
              rpcUrls: [CONFIG.rpc],
              blockExplorerUrls: CONFIG.explorer ? [CONFIG.explorer] : undefined,
            },
          ],
        });
      }
      const signer = await new BrowserProvider(eth()).getSigner();
      setAccount(await signer.getAddress());
      setError("");
    } catch (e) {
      setError(friendly(e));
    }
  }, []);

  useEffect(() => {
    const e = eth();
    if (!e?.on) return;
    const onChange = (accs: string[]) => setAccount(accs[0] ?? null);
    e.on("accountsChanged", onChange);
    return () => e.removeListener?.("accountsChanged", onChange);
  }, []);

  const getSigner = useCallback(() => new BrowserProvider(eth()).getSigner(), []);

  return { account, error, connect, getSigner };
}
