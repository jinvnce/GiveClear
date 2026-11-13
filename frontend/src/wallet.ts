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

/** Ask MetaMask to display the mUSD token so balance changes are visible */
async function watchMuSDToken() {
  try {
    await eth()?.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: CONFIG.token,
          symbol: "mUSD",
          decimals: 18,
        },
      },
    });
  } catch {
    // user declined or unsupported — ignore
  }
}

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
      const addr = await signer.getAddress();
      setAccount(addr);
      setError("");

      // Auto-import mUSD token into MetaMask so the user sees balance changes
      watchMuSDToken();
    } catch (e) {
      setError(friendly(e));
    }
  }, []);

  useEffect(() => {
    const e = eth();
    if (!e) return;
    e.request({ method: "eth_accounts" })
      .then((accs: string[]) => {
        if (accs && accs[0]) {
          setAccount(accs[0]);
          // Also import mUSD token if already connected
          watchMuSDToken();
        }
      })
      .catch(() => {});
    if (!e.on) return;
    const onChange = (accs: string[]) => setAccount(accs[0] ?? null);
    e.on("accountsChanged", onChange);
    return () => e.removeListener?.("accountsChanged", onChange);
  }, []);

  const getSigner = useCallback(() => new BrowserProvider(eth()).getSigner(), []);

  return { account, error, connect, getSigner };
}
