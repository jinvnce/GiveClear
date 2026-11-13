import React, { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Lock,
  Building2,
  Store,
  Users,
  FileCheck,
  RefreshCw,
  Coins
} from "lucide-react";
import { CONFIG } from "./config";
import { fmt, short } from "./ui";

interface TrackerProps {
  raised: number;
  spent: number;
  campaignName: string;
  onSimulateFullCycle?: () => void;
  onOpenBridgeSimulator?: () => void;
}

export function TransparencyTracker({
  raised,
  spent,
  campaignName,
  onSimulateFullCycle,
  onOpenBridgeSimulator,
}: TrackerProps) {
  const held = Math.max(0, raised - spent);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps = [
    {
      step: 1,
      title: "1. Real Fiat Donated",
      badge: "GCash / Maya",
      amount: fmt(raised),
      desc: "Donor scans QR Ph with Philippine Pesos. No crypto knowledge needed.",
      icon: Users,
      color: "border-info/40 bg-info/5 text-info",
    },
    {
      step: 2,
      title: "2. 3rd-Party Gateway",
      badge: "Fiat ➔ Crypto Bridge",
      amount: "PayMongo / Coins.ph",
      desc: "Gateway receives PHP in bank, converts to crypto tokens (USDT/Token).",
      icon: RefreshCw,
      color: "border-wait/40 bg-wait/5 text-wait",
    },
    {
      step: 3,
      title: "3. BNB Chain Safe",
      badge: "Locked Smart Contract",
      amount: fmt(held),
      desc: "Smart contract 0x4bf689... locks funds. Nobody can withdraw without proof.",
      icon: Lock,
      color: "border-passed/40 bg-passed/5 text-passed",
      link: `${CONFIG.explorer}/address/${CONFIG.giveClear}`,
    },
    {
      step: 4,
      title: "4. Gemini AI Audit",
      badge: "Receipt Verification",
      amount: "AI Verified",
      desc: "Gemini audits store receipt against stated relief purpose before approving.",
      icon: FileCheck,
      color: "border-wait/40 bg-wait/5 text-wait",
    },
    {
      step: 5,
      title: "5. Supplier Off-Ramp",
      badge: "Direct Payout",
      amount: fmt(spent),
      desc: "Crypto is off-ramped directly to grocery store (Puregold) or supplier GCash.",
      icon: Store,
      color: "border-evergreen/40 bg-mint/30 text-evergreen",
    },
  ];

  return (
    <section className="card space-y-4 border-2 border-evergreen/15" aria-labelledby="transparency-h">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-evergreen/10 pb-3">
        <div>
          <h2 id="transparency-h" className="flex items-center gap-2 text-section font-bold text-evergreen">
            <ShieldCheck aria-hidden className="h-6 w-6 text-passed" />
            End-to-End Transparency: Fiat ➔ 3rd-Party Gateway ➔ BNB Chain Safe
          </h2>
          <p className="text-small text-evergreen/80">
            How real money (PHP) is converted by a 3rd-party gateway, secured in a BNB Chain Safe, and liquidated to suppliers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenBridgeSimulator && (
            <button
              type="button"
              onClick={onOpenBridgeSimulator}
              className="btn btn-primary py-1.5 px-3 text-xs font-bold shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Simulate 3rd-Party Gateway Bridge
            </button>
          )}

          {onSimulateFullCycle && (
            <button
              type="button"
              onClick={onSimulateFullCycle}
              className="btn btn-secondary py-1.5 px-3 text-xs font-bold shadow-sm hover:bg-mint"
            >
              <Sparkles aria-hidden className="h-3.5 w-3.5 text-wait" />
              1-Click Full Cycle Demo
            </button>
          )}
        </div>
      </div>

      {/* 5-Stage Visual Pipeline Grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.step}
              onMouseEnter={() => setActiveStep(s.step)}
              onMouseLeave={() => setActiveStep(null)}
              className={`relative rounded-xl border-2 p-3 transition-all duration-200 flex flex-col justify-between ${
                s.color
              } ${activeStep === s.step ? "scale-[1.02] shadow-md" : ""}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold">
                    {s.badge}
                  </span>
                </div>

                <div className="mt-2.5 space-y-1">
                  <h3 className="text-xs font-bold text-evergreen">{s.title}</h3>
                  <p className="text-small font-extrabold">{s.amount}</p>
                  <p className="text-[11px] leading-relaxed text-evergreen/80">{s.desc}</p>
                </div>
              </div>

              {s.link && (
                <a
                  href={s.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-info underline"
                >
                  Verify on BscScan <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Blockchain Verification Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper p-3 text-xs text-evergreen/80">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-passed animate-pulse" />
          <span>
            Network: <strong>BNB Smart Chain Testnet (Chain ID 97)</strong>
          </span>
          <span className="text-evergreen/40">|</span>
          <span>
            Safe Contract: <strong className="font-mono">{short(CONFIG.giveClear)}</strong>
          </span>
        </div>
        <a
          href={`${CONFIG.explorer}/address/${CONFIG.giveClear}`}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-info underline inline-flex items-center gap-1"
        >
          View Live On-Chain Safe on BscScan <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </section>
  );
}
