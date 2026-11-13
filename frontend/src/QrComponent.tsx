import React from "react";
import { QrCode, Smartphone, Sparkles, CheckCircle2 } from "lucide-react";
import { fmt } from "./ui";

interface QrProps {
  campaignName: string;
  amount: number;
  refId: string;
}

export function QrPaymentCard({ campaignName, amount, refId }: QrProps) {
  return (
    <div className="relative mx-auto max-w-sm overflow-hidden rounded-2xl border-2 border-evergreen/20 bg-white p-5 shadow-sm text-center">
      {/* Top Badge: QR Ph / GCash / Maya */}
      <div className="mb-4 flex items-center justify-between border-b border-evergreen/10 pb-3 text-small">
        <span className="flex items-center gap-1.5 font-bold text-[#0052cc]">
          <span className="rounded bg-[#0052cc] px-1.5 py-0.5 text-xs text-white">QR Ph</span>
          National Standard
        </span>
        <span className="text-xs text-evergreen/70">GCash · Maya · Banks</span>
      </div>

      <div className="relative mx-auto my-3 flex h-48 w-48 items-center justify-center rounded-xl border border-evergreen/15 bg-paper p-3 shadow-inner">
        {/* Decorative corner markers */}
        <div className="absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-evergreen" />
        <div className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-evergreen" />
        <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-evergreen" />
        <div className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-evergreen" />

        {/* Scalable SVG QR Matrix pattern */}
        <svg viewBox="0 0 100 100" className="h-full w-full fill-evergreen" aria-hidden="true">
          {/* Top-left position block */}
          <rect x="5" y="5" width="28" height="28" fill="#102f29" rx="2" />
          <rect x="9" y="9" width="20" height="20" fill="#f6f7f2" />
          <rect x="13" y="13" width="12" height="12" fill="#102f29" />

          {/* Top-right position block */}
          <rect x="67" y="5" width="28" height="28" fill="#102f29" rx="2" />
          <rect x="71" y="9" width="20" height="20" fill="#f6f7f2" />
          <rect x="75" y="13" width="12" height="12" fill="#102f29" />

          {/* Bottom-left position block */}
          <rect x="5" y="67" width="28" height="28" fill="#102f29" rx="2" />
          <rect x="9" y="71" width="20" height="20" fill="#f6f7f2" />
          <rect x="13" y="75" width="12" height="12" fill="#102f29" />

          {/* Data patterns (simulated QR alignment) */}
          <rect x="38" y="10" width="8" height="6" />
          <rect x="52" y="10" width="8" height="6" />
          <rect x="40" y="22" width="6" height="8" />
          <rect x="50" y="24" width="8" height="6" />
          
          <rect x="10" y="38" width="6" height="8" />
          <rect x="22" y="42" width="8" height="6" />
          <rect x="38" y="38" width="24" height="24" fill="#0052cc" rx="4" />

          <rect x="70" y="38" width="8" height="8" />
          <rect x="82" y="42" width="8" height="6" />
          <rect x="72" y="52" width="6" height="8" />

          <rect x="38" y="70" width="8" height="8" />
          <rect x="50" y="74" width="8" height="6" />
          <rect x="42" y="84" width="6" height="8" />
          
          <rect x="70" y="70" width="8" height="6" />
          <rect x="82" y="72" width="6" height="8" />
          <rect x="74" y="82" width="8" height="8" />
        </svg>

        {/* Center QR Badge */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-white p-1 shadow-md">
            <img src="/logo.png" alt="GiveClear" className="h-7 w-7 rounded-full object-contain" />
          </div>
        </div>
      </div>

      {/* Target Details */}
      <div className="space-y-1">
        <p className="text-small text-evergreen/70">Pay directly to Campaign Safe</p>
        <p className="truncate text-body font-bold text-evergreen">{campaignName}</p>
        <p className="text-hero font-extrabold text-passed">{fmt(amount)}</p>
        <p className="text-xs font-mono text-evergreen/60">Ref: {refId}</p>
      </div>
    </div>
  );
}

