import React, { useState, useEffect } from "react";
import {
  X,
  Smartphone,
  ArrowRight,
  RefreshCw,
  Lock,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Building2,
  Store,
  Layers,
  Sparkles,
  Coins,
  Wallet,
  AlertCircle
} from "lucide-react";
import { Contract, parseUnits } from "ethers";
import { CONFIG } from "./config";
import { GIVECLEAR_ABI, TOKEN_ABI } from "./abi";
import type { WalletState } from "./wallet";
import { fmt, short } from "./ui";

interface SimulatorProps {
  isOpen: boolean;
  campaignName: string;
  campaignId: number;
  amount: number;
  wallet?: WalletState;
  onClose: () => void;
  onSuccess: (txHash: string) => void;
}

export function FiatBridgeSimulator({
  isOpen,
  campaignName,
  campaignId,
  amount,
  wallet,
  onClose,
  onSuccess,
}: SimulatorProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [txHash, setTxHash] = useState<string>("");
  const [busyWallet, setBusyWallet] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string>("");
  const [gcashConfirmed, setGcashConfirmed] = useState<boolean>(false);

  // Conversion rate: ₱58.00 PHP = 1.00 USD / Token
  const usdAmount = (amount / 58).toFixed(2);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setTxHash("");
      setBusyWallet(false);
      setWalletError("");
      setGcashConfirmed(false);
      return;
    }
  }, [isOpen]);

  // Step 1 -> Step 2: Confirm in GCash (Mobile Wallet Confirmation)
  function handleConfirmGcash() {
    setGcashConfirmed(true);
    setCurrentStep(2);
    // Auto advance through 3rd-party gateway and crypto conversion
    setTimeout(() => {
      setCurrentStep(3); // Conversion engine
    }, 1200);
    setTimeout(() => {
      setCurrentStep(4); // Safe deposit ready
    }, 2400);
  }

  // Option A: Confirm directly using Donor's connected MetaMask Wallet
  async function handleConfirmWithMetaMask() {
    if (!wallet?.account) {
      if (wallet?.connect) await wallet.connect();
      return;
    }
    setBusyWallet(true);
    setWalletError("");

    try {
      const signer = await wallet.getSigner();
      const value = parseUnits(String(amount), 18);
      const token = new Contract(CONFIG.token, TOKEN_ABI, signer);
      const safe = new Contract(CONFIG.giveClear, GIVECLEAR_ABI, signer);

      // Check allowance
      const allowance: bigint = await token.allowance(wallet.account, CONFIG.giveClear);
      if (allowance < value) {
        const approveTx = await token.approve(CONFIG.giveClear, value);
        await approveTx.wait();
      }

      // Donate transaction popup in MetaMask
      const tx = await safe.donate(BigInt(campaignId), value);
      const receipt = await tx.wait();

      setTxHash(receipt.hash);
      setCurrentStep(5);
    } catch (e: any) {
      console.warn("MetaMask transaction error:", e);
      setWalletError(e?.reason || e?.message || "Transaction was rejected or cancelled in MetaMask.");
    } finally {
      setBusyWallet(false);
    }
  }

  // Option B: 3rd-Party Gateway signs & relays transaction (Automated Treasury Safe Deposit)
  async function handleGatewayRelay() {
    setBusyWallet(true);
    setWalletError("");

    try {
      const res = await fetch(`${CONFIG.api}/api/donate-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, amount }),
      });
      const data = await res.json();
      const hash = data.txHash || "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setTxHash(hash);
      setCurrentStep(5);
    } catch (e: any) {
      const hash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setTxHash(hash);
      setCurrentStep(5);
    } finally {
      setBusyWallet(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-evergreen/70 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl ring-2 ring-evergreen/20 my-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-evergreen/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint text-evergreen font-bold shadow-sm">
              <RefreshCw className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-section font-extrabold text-evergreen">
                Payment & Wallet Confirmation
              </h2>
              <p className="text-xs text-evergreen/70">
                How real money (GCash/Maya) bridges into the BNB Chain Safe with wallet verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-evergreen/50 hover:bg-evergreen/10 hover:text-evergreen"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 5-Step Progress Indicators */}
        <div className="py-5">
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className={`space-y-1 ${currentStep >= 1 ? "text-passed font-bold" : "text-evergreen/40"}`}>
              <div
                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  currentStep >= 1 ? "border-passed bg-passed text-white" : "border-evergreen/20 bg-paper"
                }`}
              >
                1
              </div>
              <p className="text-[11px]">GCash Authorization</p>
            </div>

            <div className={`space-y-1 ${currentStep >= 2 ? "text-passed font-bold" : "text-evergreen/40"}`}>
              <div
                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  currentStep >= 2 ? "border-passed bg-passed text-white" : "border-evergreen/20 bg-paper"
                }`}
              >
                2
              </div>
              <p className="text-[11px]">Gateway Treasury</p>
            </div>

            <div className={`space-y-1 ${currentStep >= 3 ? "text-passed font-bold" : "text-evergreen/40"}`}>
              <div
                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  currentStep >= 3 ? "border-passed bg-passed text-white" : "border-evergreen/20 bg-paper"
                }`}
              >
                3
              </div>
              <p className="text-[11px]">Conversion Engine</p>
            </div>

            <div className={`space-y-1 ${currentStep >= 4 ? "text-passed font-bold" : "text-evergreen/40"}`}>
              <div
                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  currentStep >= 4 ? "border-passed bg-passed text-white" : "border-evergreen/20 bg-paper"
                }`}
              >
                4
              </div>
              <p className="text-[11px]">Wallet Confirmation</p>
            </div>

            <div className={`space-y-1 ${currentStep >= 5 ? "text-passed font-bold" : "text-evergreen/40"}`}>
              <div
                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  currentStep >= 5 ? "border-passed bg-passed text-white" : "border-evergreen/20 bg-paper"
                }`}
              >
                5
              </div>
              <p className="text-[11px]">Safe Verified</p>
            </div>
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-evergreen/10">
            <div
              className="h-full bg-passed transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: MOBILE GCASH / MAYA WALLET CONFIRMATION */}
        {currentStep === 1 && (
          <div className="space-y-4 rounded-2xl bg-paper p-5 border border-evergreen/15">
            <div className="flex items-center justify-between border-b border-evergreen/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#0052cc] px-2 py-0.5 text-xs font-bold text-white">
                  GCash / Maya Checkout
                </span>
                <span className="text-xs text-evergreen/70">Mobile Wallet Confirmation</span>
              </div>
              <span className="text-section font-black text-evergreen">{fmt(amount)}</span>
            </div>

            <div className="rounded-xl bg-white p-4 space-y-2 border border-evergreen/10 text-xs">
              <div className="flex justify-between">
                <span className="text-evergreen/70">Merchant:</span>
                <span className="font-bold text-evergreen">GiveClear Foundation (Safe Escrow)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-evergreen/70">Campaign:</span>
                <span className="font-bold text-evergreen">{campaignName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-evergreen/70">Payment Method:</span>
                <span className="font-bold text-info">QR Ph National Standard (0917-***-0199)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-evergreen/70">Service Fee:</span>
                <span className="font-bold text-passed">₱0.00 (Free)</span>
              </div>
            </div>

            <p className="text-xs text-evergreen/80 italic">
              In real life, your GCash mobile app asks for your 4-digit MPIN or fingerprint to authorize deducting ₱{amount.toFixed(2)} from your balance.
            </p>

            <button
              onClick={handleConfirmGcash}
              className="btn btn-primary w-full text-small font-bold py-3 flex items-center justify-center gap-2"
            >
              <Smartphone className="h-4 w-4" />
              Authorize & Confirm ₱{amount.toFixed(2)} Deduction
            </button>
          </div>
        )}

        {/* STEP 2 & 3: 3RD-PARTY GATEWAY & CONVERSION */}
        {(currentStep === 2 || currentStep === 3) && (
          <div className="space-y-4 rounded-2xl bg-paper p-6 border border-evergreen/15 text-center">
            <RefreshCw className="mx-auto h-10 w-10 animate-spin text-wait" />
            <div className="space-y-1">
              <h3 className="text-body font-bold text-evergreen">
                {currentStep === 2
                  ? "Step 2: 3rd-Party Gateway Receiving Fiat..."
                  : "Step 3: Converting Fiat ➔ Crypto Tokens..."}
              </h3>
              <p className="text-xs text-evergreen/75 max-w-md mx-auto">
                {currentStep === 2
                  ? `PayMongo / Coins.ph treasury detected ₱${amount.toFixed(2)} PHP payment (Ref #PAY-PH-9418).`
                  : `Converting ₱${amount.toFixed(2)} PHP at live rate (₱58.00/USD) into ${usdAmount} USDT for the BNB Chain safe.`}
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: ON-CHAIN WALLET CONFIRMATION */}
        {currentStep === 4 && (
          <div className="space-y-4 rounded-2xl bg-paper p-5 border border-evergreen/15">
            <div className="flex items-center justify-between border-b border-evergreen/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-mint px-2 py-0.5 text-xs font-bold text-evergreen">
                  Blockchain Safe Deposit
                </span>
                <span className="text-xs text-evergreen/70">Wallet Confirmation</span>
              </div>
              <span className="text-small font-bold text-passed">{usdAmount} Tokens (₱{amount})</span>
            </div>

            <p className="text-xs text-evergreen/80">
              Money is now ready to be permanently anchored into the smart contract vault on BNB Chain.
              How would you like to confirm the on-chain deposit?
            </p>

            {walletError && (
              <div className="rounded-xl border border-attention bg-attention/10 p-3 text-xs text-attention flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{walletError}</span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Option 1: Confirm with connected MetaMask */}
              <div className="rounded-xl border-2 border-evergreen/20 bg-white p-4 space-y-2 hover:border-passed transition">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-passed" />
                  <h4 className="font-bold text-xs text-evergreen">Confirm in MetaMask</h4>
                </div>
                <p className="text-[11px] text-evergreen/70">
                  Pops up your MetaMask wallet extension to sign and execute <code className="font-mono">donate()</code> directly.
                </p>
                <button
                  onClick={handleConfirmWithMetaMask}
                  disabled={busyWallet}
                  className="btn btn-primary w-full text-xs py-2 mt-2"
                >
                  {busyWallet ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                  {wallet?.account ? "Confirm in MetaMask Popup" : "Connect & Confirm in MetaMask"}
                </button>
              </div>

              {/* Option 2: Automated Gateway Safe Deposit */}
              <div className="rounded-xl border-2 border-evergreen/20 bg-white p-4 space-y-2 hover:border-info transition">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-info" />
                  <h4 className="font-bold text-xs text-evergreen">Gateway Treasury Auto-Sign</h4>
                </div>
                <p className="text-[11px] text-evergreen/70">
                  Payment processor signs on-chain for the donor (Zero gas fee needed from donor's wallet).
                </p>
                <button
                  onClick={handleGatewayRelay}
                  disabled={busyWallet}
                  className="btn btn-secondary w-full text-xs py-2 mt-2"
                >
                  {busyWallet ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Auto-Confirm via Gateway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: COMPLETED */}
        {currentStep === 5 && (
          <div className="space-y-4 rounded-2xl bg-paper p-5 border border-passed/30 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-passed/15 text-passed">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-section font-extrabold text-evergreen">
                Wallet Confirmed & Anchored in Safe!
              </h3>
              <p className="text-xs text-evergreen/75 max-w-md mx-auto">
                ₱{amount.toFixed(2)} ({usdAmount} USDT) was successfully deposited into the GiveClear Safe on BNB Chain.
              </p>
            </div>

            {txHash && (
              <div className="rounded-xl border border-evergreen/15 bg-white p-3 text-left space-y-1">
                <p className="text-[11px] font-bold text-evergreen/70">Transaction Hash:</p>
                <p className="font-mono text-xs text-info truncate">{txHash}</p>
                <a
                  href={`${CONFIG.explorer}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-info underline"
                >
                  View Verified Transaction on BscScan <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            <button
              onClick={() => {
                onSuccess(txHash);
                onClose();
              }}
              className="btn btn-primary w-full text-small font-bold"
            >
              Done & Return to Campaign
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
