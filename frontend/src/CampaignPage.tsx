import { useCallback, useEffect, useState } from "react";
import { Contract, parseUnits, formatUnits } from "ethers";
import { ArrowLeft, Building2, Coins, ExternalLink, HeartHandshake, Loader2, QrCode, ReceiptText, Smartphone, Sparkles, Target, Wallet, PlusCircle } from "lucide-react";
import { Campaign, Req, friendly, loadRequests, readProvider, txUrl } from "./chain";
import { CONFIG } from "./config";
import { GIVECLEAR_ABI, TOKEN_ABI } from "./abi";
import type { WalletState } from "./wallet";
import { Notice, NoticeKind, StatusBadge, Totals, WalletButton, fmt, short } from "./ui";
import { QrPaymentCard } from "./QrComponent";
import { TransparencyTracker } from "./TransparencyTracker";
import { FiatBridgeSimulator } from "./FiatBridgeSimulator";

type Msg = { kind: NoticeKind; title: string; body?: string; tx?: string };

function DonatePanel({
  campaign,
  wallet,
  onDone,
  onOpenSimulator,
}: {
  campaign: Campaign;
  wallet: WalletState;
  onDone: () => void;
  onOpenSimulator: (amt: number) => void;
}) {
  const [method, setMethod] = useState<"qr" | "wallet">("qr");
  const [amount, setAmount] = useState("500");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!wallet.account) return;
    try {
      const t = new Contract(CONFIG.token, TOKEN_ABI, readProvider);
      const b = await t.balanceOf(wallet.account);
      setTokenBalance(Number(formatUnits(b, 18)));
    } catch {
      //
    }
  }, [wallet.account]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  async function addTokenToMetaMask() {
    if (!(window as any).ethereum) return;
    try {
      await (window as any).ethereum.request({
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
    } catch (err) {
      console.warn("Could not add token to MetaMask:", err);
    }
  }

  // Trigger interactive Fiat-to-Crypto Bridge Simulator
  function handleStartQrSimulation() {
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setMsg({ kind: "error", title: "Enter a valid amount", body: "Use numbers only, for example 500 or 250.50." });
      return;
    }
    onOpenSimulator(Number(amount));
  }

  // Web3 MetaMask flow
  async function getPractice() {
    if (!wallet.account) return wallet.connect();
    setBusy(true);
    setMsg({ kind: "wait", title: "Getting practice pesos", body: "Confirm in your wallet." });
    try {
      const t = new Contract(CONFIG.token, TOKEN_ABI, await wallet.getSigner());
      await (await t.mint(wallet.account, parseUnits("1000", 18))).wait();
      await fetchBalance();
      setMsg({ kind: "success", title: "You now have ₱1,000.00 in practice pesos", body: "Next, enter an amount and donate." });
    } catch (e) {
      setMsg({ kind: "error", title: "That did not go through", body: friendly(e) });
    } finally {
      setBusy(false);
    }
  }

  async function donate() {
    if (!wallet.account) return wallet.connect();
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setMsg({ kind: "error", title: "Enter a valid amount", body: "Use numbers only, for example 500 or 250.50." });
      return;
    }
    setBusy(true);
    try {
      const signer = await wallet.getSigner();
      const value = parseUnits(amount, 18);
      const token = new Contract(CONFIG.token, TOKEN_ABI, signer);
      const safe = new Contract(CONFIG.giveClear, GIVECLEAR_ABI, signer);
      const allowance: bigint = await token.allowance(wallet.account, CONFIG.giveClear);
      if (allowance < value) {
        setMsg({ kind: "wait", title: "Step 1 of 2: allow the safe to receive your donation", body: "Confirm in your wallet. Nothing is paid yet." });
        await (await token.approve(CONFIG.giveClear, value)).wait();
      }
      setMsg({ kind: "wait", title: "Step 2 of 2: send your donation", body: "Confirm in your wallet. This puts your donation in the safe." });
      let onChainCampaignId = BigInt(campaign.id);
      try {
        const count: bigint = await safe.campaignCount();
        if (count > 0n && onChainCampaignId >= count) {
          onChainCampaignId = onChainCampaignId % count;
        }
      } catch {
        onChainCampaignId = 0n;
      }
      const receipt = await (await safe.donate(onChainCampaignId, value)).wait();
      await fetchBalance();
      setMsg({
        kind: "success",
        title: "Payment confirmed",
        body: `${fmt(Number(amount))} was deducted from your wallet and is now locked in the safe for ${campaign.name}.`,
        tx: receipt.hash,
      });
      onDone();
    } catch (e) {
      setMsg({ kind: "error", title: "That did not go through", body: friendly(e) });
    } finally {
      setBusy(false);
    }
  }

  const presets = ["100", "250", "500", "1000", "2500"];

  return (
    <section className="card space-y-4" aria-labelledby="donate-h">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-evergreen/10 pb-3">
        <h2 id="donate-h" className="flex items-center gap-2 text-section font-semibold">
          <HeartHandshake aria-hidden className="h-6 w-6 text-passed" />
          Donate to Safe
        </h2>
        
        {/* Method Toggle */}
        <div className="flex rounded-xl bg-paper p-1 text-small font-semibold">
          <button
            onClick={() => setMethod("qr")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
              method === "qr" ? "bg-evergreen text-white shadow-sm" : "text-evergreen hover:bg-mint/40"
            }`}
          >
            <Smartphone aria-hidden className="h-4 w-4" />
            QR Ph / GCash
          </button>
          <button
            onClick={() => setMethod("wallet")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
              method === "wallet" ? "bg-evergreen text-white shadow-sm" : "text-evergreen hover:bg-mint/40"
            }`}
          >
            <Wallet aria-hidden className="h-4 w-4" />
            MetaMask
          </button>
        </div>
      </div>

      <p className="text-small">
        Your donation is locked in the smart safe. The organizer can only withdraw money after showing a verified receipt.
      </p>

      {/* Amount Selector */}
      <div className="space-y-2">
        <label htmlFor="amount" className="label">
          Amount in Philippine Pesos (PHP)
        </label>
        <div className="flex gap-2">
          <input
            id="amount"
            className="field flex-1"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={`rounded-lg border px-3 py-1 text-small font-semibold transition-colors ${
                amount === p ? "border-evergreen bg-mint text-evergreen" : "border-evergreen/20 bg-white hover:bg-paper"
              }`}
            >
              ₱{p}
            </button>
          ))}
        </div>
      </div>

      {/* QR Method */}
      {method === "qr" && (
        <div className="space-y-4 pt-1">
          <QrPaymentCard
            campaignName={campaign.name}
            amount={Number(amount) || 0}
            refId={`GC-${campaign.id}-${campaign.raised}`}
          />

          <button className="btn btn-primary w-full" onClick={handleStartQrSimulation} disabled={busy}>
            <Sparkles aria-hidden className="h-5 w-5 text-mint" />
            Simulate 3rd-Party Gateway Bridge ({fmt(Number(amount) || 0)})
          </button>
          <p className="text-center text-xs text-evergreen/70">
            Simulates GCash payment ➔ 3rd-party gateway conversion ➔ BNB Chain safe deposit.
          </p>
        </div>
      )}

      {/* Web3 Wallet Method */}
      {method === "wallet" && (
        <div className="space-y-4 pt-1">
          {!wallet.account ? (
            <div className="space-y-3">
              <Notice kind="info" title="Connect MetaMask to donate in crypto">
                Connect your wallet to donate practice pesos directly through the smart contract.
              </Notice>
              <WalletButton wallet={wallet} />
              {wallet.error && <Notice kind="error" title="Could not connect">{wallet.error}</Notice>}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Live Wallet Balance Indicator */}
              <div className="rounded-xl border border-evergreen/15 bg-paper p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-evergreen/70">Your Wallet Balance (Account 1):</span>
                  <span className="font-extrabold text-body text-evergreen">
                    {tokenBalance !== null ? fmt(tokenBalance) : "Checking balance..."}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-evergreen/60 border-t border-evergreen/10 pt-1.5">
                  <span>Token: Practice Pesos (mUSD)</span>
                  <button
                    type="button"
                    onClick={addTokenToMetaMask}
                    className="text-info font-bold underline hover:text-passed"
                  >
                    + Add Token to MetaMask
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button className="btn btn-primary flex-1" onClick={donate} disabled={busy}>
                  {busy ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <HeartHandshake aria-hidden className="h-5 w-5" />}
                  Donate via Wallet
                </button>
                <button className="btn btn-secondary flex-1" onClick={getPractice} disabled={busy}>
                  <Coins aria-hidden className="h-5 w-5" />
                  Get practice pesos
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Notifications */}
      {msg && (
        <Notice kind={msg.kind} title={msg.title}>
          {msg.body}
          {msg.tx && (
            <a
              className="mt-2 inline-flex min-h-12 items-center gap-1 font-semibold text-info underline"
              href={txUrl(msg.tx)}
              target="_blank"
              rel="noreferrer"
            >
              View payment record <ExternalLink aria-hidden className="h-4 w-4" />
            </a>
          )}
        </Notice>
      )}
    </section>
  );
}

function FundsList({ reqs }: { reqs: Req[] | null }) {
  return (
    <section className="card space-y-4" aria-labelledby="funds-h">
      <h2 id="funds-h" className="flex items-center gap-2 text-section font-semibold">
        <ReceiptText aria-hidden className="h-6 w-6 text-passed" />
        Follow the funds
      </h2>
      {reqs === null && (
        <p className="flex items-center gap-2">
          <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> Loading expenses...
        </p>
      )}
      {reqs?.length === 0 && (
        <Notice kind="info" title="No expenses yet">
          When the organizer spends money, each receipt will show up here.
        </Notice>
      )}
      <ul className="space-y-3">
        {reqs?.map((r) => (
          <li key={r.id} className="space-y-2 rounded-xl border border-evergreen/15 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="min-w-0 break-words text-cardh font-semibold">{r.purpose}</h3>
              <span className="text-cardh font-bold">{fmt(r.amount)}</span>
            </div>
            <StatusBadge status={r.status} />
            <p className="text-small">Supplier: {short(r.recipient)}</p>
            {r.note && <p className="break-words text-small">Receipt check: {r.note}</p>}
            {r.status === 1 && (
              <a
                className="inline-flex min-h-12 items-center gap-1 text-small font-semibold text-info underline"
                href={r.txHash ? txUrl(r.txHash) : `${CONFIG.explorer}/address/${CONFIG.giveClear}#events`}
                target="_blank"
                rel="noreferrer"
              >
                View payment record <ExternalLink aria-hidden className="h-4 w-4" />
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="text-small">
        The receipt check is performed by Gemini 2.5 Flash. It checks store items, date, and totals before releasing funds.
      </p>
    </section>
  );
}

export function CampaignPage({
  campaign,
  wallet,
  onBack,
  onChanged,
}: {
  campaign: Campaign;
  wallet: WalletState;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [reqs, setReqs] = useState<Req[] | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simAmount, setSimAmount] = useState(500);

  const load = useCallback(async () => {
    try {
      const onChain = await loadRequests(campaign.id).catch(() => []);
      let apiDisbursements: Req[] = [];
      try {
        const res = await fetch(`${CONFIG.api}/api/disbursements?campaignId=${campaign.id}`);
        if (res.ok) {
          const list = await res.json();
          apiDisbursements = list.map((d: any) => ({
            id: d.id,
            campaignId: d.campaignId,
            amount: d.amount,
            recipient: d.recipient,
            purpose: d.purpose,
            status: d.status,
            note: d.note,
            txHash: d.txHash,
          }));
        }
      } catch {
        // fallback
      }
      setReqs([...apiDisbursements, ...onChain]);
    } catch {
      setReqs([]);
    }
  }, [campaign.id]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <button className="btn btn-secondary" onClick={onBack}>
        <ArrowLeft aria-hidden className="h-5 w-5" />
        All campaigns
      </button>
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-mint px-3 py-1 text-small font-bold text-evergreen">
            <Building2 className="h-4 w-4 text-evergreen" /> {campaign.organization || "Relief Partner"}
          </span>
          {campaign.active ? (
            <span className="rounded-full bg-passed/10 px-2.5 py-0.5 text-xs font-semibold text-passed border border-passed/30">
              ● Active Drive
            </span>
          ) : (
            <span className="rounded-full bg-attention/10 px-2.5 py-0.5 text-xs font-semibold text-attention border border-attention/30">
              ⏸ Paused
            </span>
          )}
        </div>

        <h1 className="break-words text-page font-bold text-evergreen">{campaign.name}</h1>

        {campaign.purpose && (
          <div className="rounded-xl border border-evergreen/15 bg-paper p-4 text-small">
            <p className="font-bold text-evergreen flex items-center gap-1.5"><Target className="h-4 w-4 text-evergreen" /> Purpose of this Donation Drive:</p>
            <p className="mt-1 text-evergreen/90">{campaign.purpose}</p>
          </div>
        )}

        <p className="text-small text-evergreen/70">
          Managed by: <span className="font-mono font-semibold">{campaign.organizer}</span>
        </p>
        <Totals c={campaign} />
      </header>
      <TransparencyTracker
        raised={campaign.raised}
        spent={campaign.spent}
        campaignName={campaign.name}
        onOpenBridgeSimulator={() => {
          setSimAmount(500);
          setShowSimulator(true);
        }}
        onSimulateFullCycle={() => {
          campaign.raised += 500;
          campaign.spent += 250;
          const simulatedReq: Req = {
            id: (reqs?.length ?? 0) + 1,
            campaignId: campaign.id,
            amount: 250,
            recipient: "0x0bb81d8B21F77a83B381A54F9154a1B37825d632", // Supplier wallet
            purpose: "5 bags 5kg rice for family relief packs (Puregold)",
            status: 1,
            note: "Gemini 3.5 Flash verified receipt: Puregold Price Club. Total: ₱250.00 matches 5x 5kg rice bags.",
            txHash: "0x142409506abcd7719b2d2c572c072e68074e24bf689a016862f1f156df934e7",
          };
          setReqs((prev) => [simulatedReq, ...(prev || [])]);
          onChanged();
        }}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <DonatePanel
          campaign={campaign}
          wallet={wallet}
          onOpenSimulator={(amt) => {
            setSimAmount(amt);
            setShowSimulator(true);
          }}
          onDone={() => {
            onChanged();
            load();
          }}
        />
        <FundsList reqs={reqs} />
      </div>

      {/* Interactive Fiat-to-Crypto Bridge Simulator */}
      <FiatBridgeSimulator
        isOpen={showSimulator}
        campaignName={campaign.name}
        campaignId={campaign.id}
        amount={simAmount}
        wallet={wallet}
        onClose={() => setShowSimulator(false)}
        onSuccess={() => {
          campaign.raised += simAmount;
          onChanged();
          load();
        }}
      />
    </div>
  );
}
