import { ReactNode } from "react";
import { AlertTriangle, Building2, CheckCircle2, Clock, HeartHandshake, Info, Wallet } from "lucide-react";
import type { Campaign, Req } from "./chain";
import type { WalletState } from "./wallet";

export const fmt = (n: number) => "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

export function Banner() {
  return (
    <div role="note" className="border-b border-evergreen/10 bg-mint/30 text-evergreen">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-1.5 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <Info aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-passed" />
          <span>Safe Multisig Vault · Verified Supplier Settlement</span>
        </div>
        <span className="text-[10px] text-evergreen/70 font-mono">Chain 97 · BSC Testnet</span>
      </div>
    </div>
  );
}

const styles = {
  info: "border-info",
  success: "border-passed",
  wait: "border-wait",
  error: "border-attention",
};
const iconColor = { info: "text-info", success: "text-passed", wait: "text-wait", error: "text-attention" };
const icons = { info: Info, success: CheckCircle2, wait: Clock, error: AlertTriangle };
export type NoticeKind = keyof typeof styles;

export function Notice({ kind, title, children }: { kind: NoticeKind; title: string; children?: ReactNode }) {
  const Icon = icons[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`flex gap-3 rounded-xl border-2 bg-white p-4 ${styles[kind]}`}>
      <Icon aria-hidden className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor[kind]}`} />
      <div className="min-w-0 break-words">
        <p className="text-body font-semibold">{title}</p>
        {children && <div className="mt-1 text-small">{children}</div>}
      </div>
    </div>
  );
}

export function WalletButton({ wallet }: { wallet: WalletState }) {
  if (wallet.account) {
    return (
      <span className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-mint px-4 text-small font-semibold" aria-label={`Wallet connected: ${wallet.account}`}>
        <Wallet aria-hidden className="h-4 w-4" />
        {short(wallet.account)}
      </span>
    );
  }
  return (
    <button className="btn btn-secondary" onClick={wallet.connect}>
      <Wallet aria-hidden className="h-5 w-5" />
      Connect wallet
    </button>
  );
}

export function StatusBadge({ status }: { status: Req["status"] }) {
  const map = {
    0: { text: "Disbursed · Awaiting Receipt", Icon: Clock, cls: "text-wait border-wait bg-[#fff8e7]" },
    1: { text: "100% Accounted & Verified", Icon: CheckCircle2, cls: "text-passed border-passed bg-[#f0faf4]" },
    2: { text: "Audit Discrepancy / Flagged", Icon: AlertTriangle, cls: "text-attention border-attention bg-[#fff1f1]" },
  } as const;
  const { text, Icon, cls } = map[status] || map[0];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-small font-semibold ${cls}`}>
      <Icon aria-hidden className="h-4 w-4" />
      {text}
    </span>
  );
}

export function Totals({ c }: { c: Campaign }) {
  const held = c.raised - c.spent;
  const items = [
    ["Donated", c.raised],
    ["Paid out", c.spent],
    ["Still in the safe", held],
  ] as const;
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-xl bg-mint/50 p-3">
          <dt className="text-small">{k}</dt>
          <dd className="text-section font-bold">{fmt(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CampaignCard({ c, onOpen }: { c: Campaign; onOpen: () => void }) {
  const pct = c.raised > 0 ? Math.min(100, Math.round((c.spent / c.raised) * 100)) : 0;
  return (
    <article className="card flex flex-col gap-3 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-mint px-2.5 py-1 text-xs font-bold text-evergreen">
          <Building2 className="h-3.5 w-3.5" /> {c.organization || "Relief Partner"}
        </span>
        {!c.active && (
          <span className="rounded-full bg-attention/10 px-2 py-0.5 text-xs font-semibold text-attention">
            Paused
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="min-w-0 break-words text-cardh font-bold text-evergreen">{c.name}</h3>
        {c.purpose && (
          <p className="line-clamp-2 text-xs text-evergreen/80">
            {c.purpose}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-paper p-2.5 text-small">
        <div>
          <dt className="text-xs text-evergreen/70">Donated</dt>
          <dd className="text-body font-bold text-evergreen">{fmt(c.raised)}</dd>
        </div>
        <div>
          <dt className="text-xs text-evergreen/70">Disbursed</dt>
          <dd className="text-body font-bold text-passed">{fmt(c.spent)}</dd>
        </div>
      </dl>

      <div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Share of donations disbursed"
          className="h-2 overflow-hidden rounded-full bg-paper"
        >
          <div className="h-full bg-passed transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-evergreen/70">{pct}% disbursed to suppliers & operations</p>
      </div>

      <button className="btn btn-primary mt-auto text-small" onClick={onOpen} aria-label={`Open ${c.name}`}>
        Donate or Track Funds
      </button>
    </article>
  );
}
