import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  ArrowDown,
  Building2,
  Store,
  Layers,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Loader2,
  RefreshCw,
  Wallet
} from "lucide-react";
import { CONFIG } from "./config";
import { short } from "./ui";

interface SafeWalletConfirmationModalProps {
  isOpen: boolean;
  campaignName: string;
  amount: number;
  recipientName?: string;
  recipientAddress?: string;
  purpose?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function SafeWalletConfirmationModal({
  isOpen,
  campaignName,
  amount,
  recipientName = "Batangas Grain & Groceries Depot",
  recipientAddress = "0x0bb810E033735085Dc72bC5387ECb5b3F875d632",
  purpose = "5 bags 5kg rice and canned goods for relief packs",
  onConfirm,
  onClose,
}: SafeWalletConfirmationModalProps) {
  const [signing, setSigning] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleConfirm() {
    setSigning(true);
    try {
      await onConfirm();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSigning(false);
        onClose();
      }, 1400);
    } catch {
      setSigning(false);
    }
  }

  const safeAddress = CONFIG.giveClear || "0x4bf689a016862F1F156df934E74c252aC42B5316";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-[390px] max-h-[88vh] rounded-3xl bg-white border border-evergreen/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Top Wallet Header (MetaMask / Safe Multisig style) */}
        <div className="shrink-0 bg-paper p-3.5 border-b border-evergreen/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-evergreen text-white shadow-xs">
              <ShieldCheck className="h-4 w-4 text-mint" />
            </div>
            <div>
              <p className="font-extrabold text-evergreen leading-tight">Safe Vault Wallet</p>
              <p className="text-[10px] font-mono text-evergreen/60">
                {short(safeAddress)} · BSC Testnet (97)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={signing}
            className="p-1 rounded-lg text-evergreen/50 hover:bg-evergreen/10 hover:text-evergreen transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body with Dedicated Scrollbar */}
        <div className="p-4 space-y-3.5 text-evergreen flex-1 overflow-y-auto mobile-scrollbar min-h-0">
          {success ? (
            <div className="py-8 text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint/50 text-passed border border-mint">
                <CheckCircle2 className="h-8 w-8 text-passed" />
              </div>
              <p className="text-small font-black text-evergreen">Safe Vault Transaction Confirmed</p>
              <p className="text-xs text-evergreen/70">
                -{amount.toLocaleString()} mUSD transferred via 3rd-party to supplier.
              </p>
            </div>
          ) : (
            <>
              {/* Transaction Type Notice */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-evergreen">Transaction Confirmation</span>
                <span className="rounded-full bg-attention/10 text-attention px-2 py-0.5 text-[10px] font-bold border border-attention/20">
                  Vault Outflow
                </span>
              </div>

              {/* Deduction Display (Minus in Safe) */}
              <div className="rounded-2xl bg-paper p-4 text-center border border-evergreen/10 space-y-1">
                <p className="text-[11px] text-evergreen/60 font-semibold uppercase tracking-wider">
                  Safe Deduction Amount
                </p>
                <p className="text-hero font-black text-attention leading-none">
                  -{amount.toLocaleString()} mUSD
                </p>
                <p className="text-[11px] text-evergreen/70 font-medium pt-1">
                  Safe balance decreases by {amount.toLocaleString()} mUSD
                </p>
              </div>

              {/* Origin Stage 1: Donor (-) -> Safe (+) */}
              <div className="rounded-xl bg-paper p-2.5 border border-evergreen/10 flex items-center justify-between text-[10px] shadow-xs">
                <span className="font-bold text-evergreen/70">Stage 1: Donor Deposit</span>
                <div className="flex items-center gap-1.5 font-bold font-mono">
                  <span className="text-attention bg-attention/10 px-1.5 py-0.5 rounded">Donor -₱{amount.toLocaleString()}</span>
                  <span className="text-evergreen/40">➔</span>
                  <span className="text-passed bg-mint/50 px-1.5 py-0.5 rounded">Safe +₱{amount.toLocaleString()}</span>
                </div>
              </div>

              {/* 3-Hop Transfer Path: Safe -> 3rd Party Gateway -> Supplier */}
              <div className="rounded-2xl bg-mint/15 p-3.5 border border-mint space-y-2 text-xs">
                <p className="text-[11px] font-bold text-evergreen flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 text-passed" />
                  Stage 2: Safe Vault Outflow (Safe ➔ 3rd Party ➔ Supplier)
                </p>

                {/* Step A: Safe */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-evergreen/10 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-evergreen" />
                    <div>
                      <p className="font-bold text-[11px]">GiveClear Safe Vault</p>
                      <p className="text-[10px] font-mono text-evergreen/60">{short(safeAddress)}</p>
                    </div>
                  </div>
                  <span className="font-bold text-attention text-[11px]">-{amount} mUSD</span>
                </div>

                <div className="flex justify-center -my-1">
                  <ArrowDown className="h-3.5 w-3.5 text-evergreen/40" />
                </div>

                {/* Step B: 3rd Party Gateway */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-evergreen/10 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-info" />
                    <div>
                      <p className="font-bold text-[11px]">3rd Party Gateway (GCash / Maya)</p>
                      <p className="text-[10px] text-evergreen/60">Automated Crypto to Fiat Bridge</p>
                    </div>
                  </div>
                  <span className="font-bold text-info text-[10px]">Bridge Hub</span>
                </div>

                <div className="flex justify-center -my-1">
                  <ArrowDown className="h-3.5 w-3.5 text-evergreen/40" />
                </div>

                {/* Step C: Supplier */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-evergreen/10 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-passed" />
                    <div>
                      <p className="font-bold text-[11px] truncate max-w-[170px]">{recipientName}</p>
                      <p className="text-[10px] font-mono text-evergreen/60">{short(recipientAddress)}</p>
                    </div>
                  </div>
                  <span className="font-bold text-passed text-[11px]">+₱{amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Purpose & Gas Info */}
              <div className="space-y-1.5 text-[11px] text-evergreen/70 px-1">
                <div className="flex justify-between">
                  <span>Campaign:</span>
                  <span className="font-bold text-evergreen truncate max-w-[200px]">{campaignName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Purpose:</span>
                  <span className="font-bold text-evergreen truncate max-w-[200px]">{purpose}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gas Equivalent:</span>
                  <span className="font-bold text-passed flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    1 gas unit equivalent (Minimized)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={signing}
                  className="btn btn-secondary rounded-xl text-xs font-bold py-2.5"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={signing}
                  className="btn btn-primary rounded-xl text-xs font-bold py-2.5 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {signing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-mint" />
                      Confirm in Safe
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-[10px] text-evergreen/50 pt-1 font-semibold">
                Protected by Safe Multi-Signature & Gemini AI verification
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

