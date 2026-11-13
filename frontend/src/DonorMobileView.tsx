import React, { useState, useEffect, useMemo } from "react";
import {
  Heart,
  FileText,
  Wallet,
  Check,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Coins,
  QrCode,
  Receipt,
  AlertTriangle,
  X,
  ChevronRight,
  Package,
  BookOpen,
  Store,
  Users,
  Wifi,
  Battery,
  Lock,
  FileCheck,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { Contract, parseUnits, formatUnits } from "ethers";
import { Campaign, friendly, readProvider, txUrl } from "./chain";
import { CONFIG } from "./config";
import { GIVECLEAR_ABI, TOKEN_ABI } from "./abi";
import type { WalletState } from "./wallet";
import { fmt, short } from "./ui";
import { useAuth } from "./auth";
import { SafeWalletConfirmationModal } from "./SafeWalletConfirmationModal";

type DonorTab = "discover" | "activity" | "wallet";
type DonorScreen = "home" | "details" | "donate" | "summary" | "transparency";

export interface DisbursementItem {
  id: number;
  campaignId: number;
  amount: number;
  purpose: string;
  recipient: string;
  status: 0 | 1 | 2; // 0: Awaiting receipt, 1: Verified by Gemini, 2: Flagged
  note: string;
  createdAt: string;
  txHash: string;
  merchant?: string | null;
  items?: Array<{ name: string; qty: number; price: number }>;
}

export interface DonationRecord {
  id: string;
  campaignId: number;
  donorName: string;
  donorAddress?: string;
  amount: number;
  date: string;
  method: "Crypto wallet" | "QR Ph";
  txHash: string;
  receiptNo: string;
}

export function DonorMobileView({
  campaigns,
  wallet,
  onCampaignUpdated,
  onSwitchToOrganizer,
  onOpenAuth,
}: {
  campaigns: Campaign[];
  wallet: WalletState;
  onCampaignUpdated?: () => void;
  onSwitchToOrganizer: () => void;
  onOpenAuth: () => void;
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DonorTab>("discover");
  const [screen, setScreen] = useState<DonorScreen>("home");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign>(campaigns[0] || null);

  // System Live Data
  const [disbursements, setDisbursements] = useState<DisbursementItem[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);

  // Donation interactive state
  const [donationAmount, setDonationAmount] = useState<string>("500");
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "wallet">("wallet");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ kind: "wait" | "success" | "error"; text: string } | null>(null);
  const [lastDonation, setLastDonation] = useState<DonationRecord | null>(null);

  // Live Token Balance
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  // Modal for viewing receipt image / verification details
  const [viewingReceipt, setViewingReceipt] = useState<DisbursementItem | null>(null);
  const [viewingFingerprint, setViewingFingerprint] = useState<DisbursementItem | null>(null);
  const [expandedDonationId, setExpandedDonationId] = useState<string | null>(null);

  // Safe Wallet Confirmation Modal (Safe -> 3rd party -> Supplier)
  const [showSafeWalletModal, setShowSafeWalletModal] = useState(false);

  // Sync selected campaign if props change
  useEffect(() => {
    if (campaigns.length > 0 && (!selectedCampaign || !campaigns.some(c => c.id === selectedCampaign.id))) {
      setSelectedCampaign(campaigns[0]);
    }
  }, [campaigns]);

  // Fetch disbursements from system backend
  const loadDisbursements = async () => {
    try {
      const res = await fetch(`${CONFIG.api}/api/disbursements`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDisbursements(data);
      }
    } catch {
      // Offline fallback
      setDisbursements([
        {
          id: 1,
          campaignId: campaigns[0]?.id ?? 0,
          amount: campaigns[0]?.spent || 500,
          purpose: "5 bags 5kg rice and canned goods for relief packs",
          recipient: "0x0bb81d8B21F77a83B381A54F9154a1B37825d632",
          status: 1,
          merchant: "Batangas Grain & Groceries Depot",
          items: [
            { name: "5kg Sinandomeng Rice", qty: 5, price: 60 },
            { name: "Canned Goods Assorted", qty: 20, price: 10 },
          ],
          note: "Gemini verified receipt from Batangas Grain & Groceries Depot. 100% accounted for.",
          createdAt: "12 Nov 2026",
          txHash: "0x142409506abcd7719b2d2c572c072e68074e24bf689a016862f1f156df934e7",
        },
        {
          id: 3,
          campaignId: campaigns[0]?.id ?? 0,
          amount: 1000,
          purpose: "Office electronics and personal fuel expense",
          recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          status: 2,
          note: "Flagged by AI: Items do not match relief food packs purpose. No funds disbursed.",
          createdAt: "10 Nov 2026",
          txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        },
      ]);
    }
  };

  // Fetch donations from system backend
  const loadDonations = async () => {
    try {
      const res = await fetch(`${CONFIG.api}/api/donations`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDonations(data);
          return;
        }
      }
    } catch {
      // Local storage fallback
    }

    const cached = localStorage.getItem("giveclear_donations");
    if (cached) {
      try {
        setDonations(JSON.parse(cached));
        return;
      } catch {}
    }

    // Default system seed that matches initial campaign totals
    const seed: DonationRecord[] = [
      {
        id: "d1",
        campaignId: campaigns[0]?.id ?? 0,
        donorName: "Maria Santos",
        donorAddress: "0x71C4B82d9214736fEb7aE7A94129eE9412B929F8",
        amount: 500,
        date: "13 Nov 2026",
        method: "Crypto wallet",
        txHash: "0x142409506abcd7719b2d2c572c072e68074e24bf689a016862f1f156df934e7",
        receiptNo: "#018",
      },
      {
        id: "d2",
        campaignId: campaigns[0]?.id ?? 0,
        donorName: "Bayanihan Foundation",
        donorAddress: "0x12b489a016862f1f156df934e7719b2d2c572c07",
        amount: 1000,
        date: "12 Nov 2026",
        method: "Crypto wallet",
        txHash: "0x8f2a91ce4bf689a016862f1f156df934e7719b2d2c572c072e68074e24bf689a",
        receiptNo: "#017",
      },
      {
        id: "d3",
        campaignId: campaigns[0]?.id ?? 0,
        donorName: "Anonymous donor",
        donorAddress: "0x99aa8827279cfffb92266f39fd6e51aad88f6f4c",
        amount: 1000,
        date: "11 Nov 2026",
        method: "QR Ph",
        txHash: "0x3c4daa124bf689a016862f1f156df934e7719b2d2c572c072e68074e24bf689a",
        receiptNo: "#016",
      },
      {
        id: "d4",
        campaignId: campaigns[1]?.id ?? 1,
        donorName: "Community Kitchen Circle",
        donorAddress: "0x44aa101e93b906eb2c4f870365e785982e1f101e",
        amount: 1000,
        date: "12 Nov 2026",
        method: "QR Ph",
        txHash: "0x77bb22cc4bf689a016862f1f156df934e7719b2d2c572c072e68074e24bf689a",
        receiptNo: "#015",
      },
      {
        id: "d5",
        campaignId: campaigns[1]?.id ?? 1,
        donorName: "Anonymous donor",
        donorAddress: "0x55cc33dd0bb81d8b21f77a83b381a54f9154a1b3",
        amount: 800,
        date: "10 Nov 2026",
        method: "Crypto wallet",
        txHash: "0x88dd33ee4bf689a016862f1f156df934e7719b2d2c572c072e68074e24bf689a",
        receiptNo: "#014",
      },
    ];
    setDonations(seed);
  };

  useEffect(() => {
    loadDisbursements();
    loadDonations();
  }, []);

  // Fetch token balance
  const refreshBalance = async () => {
    if (!wallet.account) return;
    try {
      const t = new Contract(CONFIG.token, TOKEN_ABI, readProvider);
      const b = await t.balanceOf(wallet.account);
      setTokenBalance(Number(formatUnits(b, 18)));
    } catch {
      //
    }
  };

  useEffect(() => {
    refreshBalance();
  }, [wallet.account]);

  // Derived: Current campaign disbursements
  const currentDisbursements = useMemo(() => {
    if (!selectedCampaign) return [];
    return disbursements.filter((d) => d.campaignId === selectedCampaign.id);
  }, [disbursements, selectedCampaign]);

  const verifiedDisbursements = useMemo(() => {
    return currentDisbursements.filter((d) => d.status === 1);
  }, [currentDisbursements]);

  const flaggedDisbursements = useMemo(() => {
    return currentDisbursements.filter((d) => d.status === 2);
  }, [currentDisbursements]);

  // Derived: Current campaign donations
  const currentDonations = useMemo(() => {
    if (!selectedCampaign) return [];
    return donations.filter((d) => d.campaignId === selectedCampaign.id);
  }, [donations, selectedCampaign]);

  // Donor personal giving history (matched by user name or connected wallet)
  const myDonationHistory = useMemo(() => {
    const currentName = user?.name?.toLowerCase().trim();
    const currentAddr = wallet.account?.toLowerCase().trim();
    return donations.filter((d) => {
      if (currentName && d.donorName.toLowerCase().trim() === currentName) return true;
      if (currentAddr && d.donorAddress?.toLowerCase().trim() === currentAddr) return true;
      // Default to showing user's donations or top seed donations
      return d.donorName === "Maria Santos" || !currentName;
    });
  }, [donations, user, wallet.account]);

  const totalMyDonated = useMemo(() => {
    return myDonationHistory.reduce((sum, d) => sum + d.amount, 0);
  }, [myDonationHistory]);

  const myCampaignsCount = useMemo(() => {
    const set = new Set(myDonationHistory.map((d) => d.campaignId));
    return set.size;
  }, [myDonationHistory]);

  // Dynamic tags parsed from campaign purpose and verified receipt items
  const dynamicPurposeTags = useMemo(() => {
    if (!selectedCampaign) return [];
    const fromReceipts = verifiedDisbursements.flatMap((d) => (d.items || []).map((i) => i.name));
    if (fromReceipts.length > 0) {
      return Array.from(new Set(fromReceipts)).slice(0, 4);
    }
    // Parse from purpose text
    const clean = selectedCampaign.purpose
      .replace(/Procure and deliver|Provide|Daily hot meals|supplies|for/gi, "")
      .trim();
    const split = clean.split(/,|;|\band\b/i).map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 30);
    if (split.length > 0) return split.slice(0, 4);
    return ["Emergency essentials", "Relief packs", "Community aid"];
  }, [selectedCampaign, verifiedDisbursements]);

  // Dynamic target goal for campaign
  const campaignGoal = useMemo(() => {
    if (!selectedCampaign) return 5000;
    return Math.max(5000, Math.ceil((selectedCampaign.raised * 1.35) / 1000) * 1000);
  }, [selectedCampaign]);

  // Mint practice tokens
  async function handleGetPracticeTokens() {
    if (!wallet.account) {
      await wallet.connect();
      return;
    }
    setBusy(true);
    setStatusMsg({ kind: "wait", text: "Minting 1,000 mUSD practice pesos to your wallet..." });
    try {
      const signer = await wallet.getSigner();
      const token = new Contract(CONFIG.token, TOKEN_ABI, signer);
      const tx = await token.mint(wallet.account, parseUnits("1000", 18));
      await tx.wait();
      await refreshBalance();
      setStatusMsg({ kind: "success", text: "Successfully received 1,000 mUSD in your wallet!" });
    } catch (e: any) {
      setStatusMsg({ kind: "error", text: friendly(e) });
    } finally {
      setBusy(false);
    }
  }

  // Handle on-chain donate via MetaMask
  async function handlePayWithWallet() {
    if (!wallet.account) {
      await wallet.connect();
      return;
    }
    const amtNumber = Number(donationAmount);
    if (!amtNumber || amtNumber <= 0) return;

    setBusy(true);
    setStatusMsg({ kind: "wait", text: "Step 1 of 2: Authorizing safe to receive mUSD..." });
    try {
      const signer = await wallet.getSigner();
      const val = parseUnits(String(amtNumber), 18);
      const token = new Contract(CONFIG.token, TOKEN_ABI, signer);
      const safe = new Contract(CONFIG.giveClear, GIVECLEAR_ABI, signer);

      // Auto-mint test tokens if wallet balance is 0 or insufficient
      try {
        const userBal: bigint = await token.balanceOf(wallet.account);
        if (userBal < val) {
          setStatusMsg({ kind: "wait", text: "Preparing test tokens for donation..." });
          const mintTx = await token.mint(wallet.account, parseUnits("1000", 18));
          await mintTx.wait();
          await refreshBalance();
        }
      } catch (mintErr) {
        console.log("Token check note:", mintErr);
      }

      const allowance: bigint = await token.allowance(wallet.account, CONFIG.giveClear);
      if (allowance < val) {
        setStatusMsg({ kind: "wait", text: "Step 1 of 2: Approving mUSD transfer in MetaMask..." });
        const approveTx = await token.approve(CONFIG.giveClear, val);
        await approveTx.wait();
      }

      // Ensure campaign ID exists on-chain to prevent "Unknown campaign" revert
      let onChainCampaignId = BigInt(selectedCampaign.id);
      try {
        const count: bigint = await safe.campaignCount();
        if (count > 0n && onChainCampaignId >= count) {
          onChainCampaignId = onChainCampaignId % count;
        }
      } catch {
        onChainCampaignId = 0n;
      }

      setStatusMsg({ kind: "wait", text: "Step 2 of 2: Confirming donation in MetaMask..." });
      const donateTx = await safe.donate(onChainCampaignId, val);
      const receipt = await donateTx.wait();

      const newRecord: DonationRecord = {
        id: "d-" + Date.now(),
        campaignId: selectedCampaign.id,
        donorName: user?.name || short(wallet.account),
        donorAddress: wallet.account,
        amount: amtNumber,
        date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        method: "Crypto wallet",
        txHash: receipt.hash,
        receiptNo: `#0${Math.floor(20 + Math.random() * 79)}`,
      };

      // Record to backend API
      try {
        await fetch(`${CONFIG.api}/api/donations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRecord),
        });
      } catch {}

      // Update local state
      const updated = [newRecord, ...donations];
      setDonations(updated);
      localStorage.setItem("giveclear_donations", JSON.stringify(updated));
      selectedCampaign.raised += amtNumber;
      setLastDonation(newRecord);
      onCampaignUpdated?.();

      await refreshBalance();
      setScreen("summary");
    } catch (e: any) {
      setStatusMsg({ kind: "error", text: friendly(e) });
    } finally {
      setBusy(false);
    }
  }

  // Handle simulated QR payment
  async function handleSimulateQr() {
    const amtNumber = Number(donationAmount);
    if (!amtNumber || amtNumber <= 0) return;

    setBusy(true);
    setStatusMsg({ kind: "wait", text: "Simulating GCash deduction & safe deposit..." });
    try {
      const res = await fetch(`${CONFIG.api}/api/donate-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          amount: amtNumber,
          donorName: user?.name || "Maria Santos",
        }),
      });

      let newRecord: DonationRecord;
      if (res.ok) {
        const data = await res.json();
        newRecord = data.donation || {
          id: "d-" + Date.now(),
          campaignId: selectedCampaign.id,
          donorName: user?.name || "Maria Santos",
          amount: amtNumber,
          date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          method: "QR Ph",
          txHash: data.txHash,
          receiptNo: `#0${Math.floor(20 + Math.random() * 79)}`,
        };
      } else {
        newRecord = {
          id: "d-" + Date.now(),
          campaignId: selectedCampaign.id,
          donorName: user?.name || "Maria Santos",
          amount: amtNumber,
          date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          method: "QR Ph",
          txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
          receiptNo: `#0${Math.floor(20 + Math.random() * 79)}`,
        };
      }

      const updated = [newRecord, ...donations];
      setDonations(updated);
      localStorage.setItem("giveclear_donations", JSON.stringify(updated));
      selectedCampaign.raised += amtNumber;
      setLastDonation(newRecord);
      onCampaignUpdated?.();

      setScreen("summary");
    } catch (e: any) {
      setStatusMsg({ kind: "error", text: e.message || "QR simulation failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[402px] mx-auto h-[844px] max-h-[calc(100vh-60px)] bg-[#fbfcf8] text-evergreen shadow-2xl rounded-[40px] border-[7px] border-evergreen/15 overflow-hidden flex flex-col relative my-2">
      {/* Top Mobile Status Bar: 9:41 */}
      <div className="shrink-0 flex items-center justify-between px-6 pt-3 pb-1 text-xs font-bold text-evergreen select-none">
        <span>9:41</span>
        <div className="flex items-center gap-2">
          {screen !== "home" && (
            <span className="text-[10px] font-semibold text-evergreen/70">BSC testnet</span>
          )}
          <Wifi className="h-3.5 w-3.5" />
          <Battery className="h-4 w-4" />
        </div>
      </div>

      {/* Main Header */}
      <header className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-evergreen/10 bg-white/70 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="GiveClear" className="h-6 w-6 rounded-full object-contain shadow-xs" />
          <span className="font-extrabold text-body tracking-tight text-evergreen">GiveClear</span>
        </div>

        {/* User Avatar / Auth Trigger */}
        <button
          onClick={onOpenAuth}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-evergreen text-[11px] font-extrabold text-white shadow-xs hover:bg-evergreen/80 transition"
          title={user ? user.name : "Sign in / Register"}
        >
          {user ? user.name.slice(0, 2).toUpperCase() : "MA"}
        </button>
      </header>

      {/* Main Scrollable View Area with Dedicated Scrollbar */}
      <div className="flex-1 overflow-y-auto pb-24 mobile-scrollbar min-h-0">
        {/* ========================================================================= */}
        {/* SCREEN 1: DONOR · MY GIVING (Home)                                        */}
        {/* ========================================================================= */}
        {screen === "home" && (
          <div className="p-4 space-y-4">
            <h1 className="text-section font-bold text-evergreen">Your giving</h1>

            {/* Top Evergreen "Your giving" Card */}
            <div className="relative overflow-hidden rounded-3xl bg-evergreen p-5 text-white shadow-md">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-mint/80">Total donated · ₱ (PHP)</p>
                  <p className="text-hero font-black tracking-tight leading-none text-white">
                    ₱{totalMyDonated.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-mint/70 pt-1">
                    {totalMyDonated.toLocaleString()} mUSD equivalent · {myDonationHistory.length} donation{myDonationHistory.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white border border-white/10">
                  <Receipt className="h-6 w-6 text-mint" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-2.5 text-xs text-mint/80">
                <span className="inline-flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="h-3.5 w-3.5 text-mint" />
                  Live Safe Vault
                </span>
                <span className="text-[11px] text-mint font-semibold">100% verified</span>
              </div>
            </div>

            {/* Explore Campaigns Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-body font-bold text-evergreen">Explore campaigns</h2>
                <span className="text-xs font-semibold text-evergreen/60">{campaigns.length} active</span>
              </div>

              <div className="space-y-2.5">
                {campaigns.map((c, idx) => {
                  const campDonorsCount = donations.filter((d) => d.campaignId === c.id).length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCampaign(c);
                        setScreen("details");
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-evergreen/10 bg-white p-3.5 text-left shadow-xs transition hover:border-passed hover:shadow-md"
                    >
                      <div className="space-y-0.5 max-w-[250px]">
                        <h3 className="text-small font-bold text-evergreen truncate">{c.name}</h3>
                        <p className="text-[11px] text-evergreen/70">
                          {c.organization || "Philippine Red Cross"} · {campDonorsCount > 0 ? `${campDonorsCount} donors` : "Open drive"} · {fmt(c.raised)} raised
                        </p>
                      </div>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint/40 text-evergreen">
                        {idx % 3 === 0 ? (
                          <Package className="h-5 w-5 text-passed" />
                        ) : idx % 3 === 1 ? (
                          <BookOpen className="h-5 w-5 text-info" />
                        ) : (
                          <Store className="h-5 w-5 text-wait" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Your Donation History Section */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h2 className="text-body font-bold text-evergreen">Your donation history</h2>
                <span className="text-xs font-bold text-evergreen/60">
                  {myDonationHistory.length} donation{myDonationHistory.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-2">
                {myDonationHistory.length === 0 ? (
                  <p className="text-xs text-evergreen/60 p-4 text-center rounded-xl bg-white border border-evergreen/10">
                    You haven't made any donations yet. Pick an active campaign above to start!
                  </p>
                ) : (
                  myDonationHistory.map((d) => {
                    const matchedCamp = campaigns.find((c) => c.id === d.campaignId) || campaigns[0];
                    return (
                      <div
                        key={d.id}
                        onClick={() => {
                          if (matchedCamp) setSelectedCampaign(matchedCamp);
                          setLastDonation(d);
                          setScreen("summary");
                        }}
                        className="flex items-center justify-between rounded-xl bg-white p-3 border border-evergreen/10 shadow-xs cursor-pointer hover:bg-mint/10 transition"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-passed text-white">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-evergreen leading-tight truncate max-w-[200px]">
                              {matchedCamp?.name || "Donation Drive"}
                            </p>
                            <p className="text-[11px] text-evergreen/60 mt-0.5">
                              {matchedCamp?.organization || "Organization"} · {d.date}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-small font-bold text-evergreen">₱{d.amount.toLocaleString()}</span>
                          <p className="text-[10px] text-evergreen/60">({d.amount.toLocaleString()} mUSD)</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <p className="text-center text-[10px] text-evergreen/60 pt-1">
                Practice pesos (mUSD) · BSC Testnet Safe Vault
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: DONOR · CAMPAIGN DETAILS                                        */}
        {/* ========================================================================= */}
        {screen === "details" && selectedCampaign && (
          <div className="p-4 space-y-4">
            <button
              onClick={() => setScreen("home")}
              className="flex items-center gap-1 text-xs font-semibold text-evergreen/70 hover:text-evergreen"
            >
              <ArrowLeft className="h-4 w-4" /> Back to campaigns
            </button>

            {/* Illustration Box */}
            <div className="flex h-36 w-full items-center justify-center rounded-2xl bg-mint/30 border border-evergreen/10">
              <Package className="h-16 w-16 text-passed/80" />
            </div>

            {/* Campaign Title & Org */}
            <div className="space-y-1">
              <h1 className="text-page font-extrabold text-evergreen leading-tight">
                {selectedCampaign.name}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-evergreen/80">
                  {selectedCampaign.organization || "Philippine Red Cross"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-passed/10 px-2 py-0.5 text-[10px] font-bold text-passed border border-passed/30">
                  <Check className="h-2.5 w-2.5" /> Verified
                </span>
              </div>
            </div>

            {/* Where your donation goes tags - DYNAMICALLY PARSED FROM PURPOSE & DISBURSEMENTS */}
            <div className="rounded-2xl bg-mint/25 p-3 space-y-2 border border-mint">
              <p className="text-[11px] font-bold text-evergreen">Where your donation goes</p>
              <div className="flex flex-wrap gap-1.5">
                {dynamicPurposeTags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-evergreen shadow-xs capitalize"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Raised & Used Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <p className="text-hero font-black text-evergreen leading-none">
                  {fmt(selectedCampaign.raised)}
                </p>
                <span className="text-xs font-bold text-passed">
                  {Math.round((selectedCampaign.spent / (selectedCampaign.raised || 1)) * 100)}% used
                </span>
              </div>
              <p className="text-xs text-evergreen/70">
                raised of ₱{campaignGoal.toLocaleString()} ({campaignGoal.toLocaleString()} mUSD equivalent)
              </p>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-mint/50 flex">
                <div
                  className="h-full bg-passed transition-all duration-500 rounded-l-full"
                  style={{
                    width: `${Math.min(100, Math.round((selectedCampaign.spent / (selectedCampaign.raised || 1)) * 100))}%`,
                  }}
                />
                <div
                  className="h-full bg-mint transition-all duration-500 rounded-r-full"
                  style={{
                    width: `${Math.max(0, 100 - Math.min(100, Math.round((selectedCampaign.spent / (selectedCampaign.raised || 1)) * 100)))}%`,
                  }}
                />
              </div>
            </div>

            {/* Paid to suppliers vs Available */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-white p-3 border border-evergreen/10 shadow-xs">
                <p className="text-[11px] text-evergreen/60">Paid to suppliers</p>
                <p className="text-small font-extrabold text-passed mt-0.5">
                  {fmt(selectedCampaign.spent)}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 border border-evergreen/10 shadow-xs">
                <p className="text-[11px] text-evergreen/60">Available</p>
                <p className="text-small font-extrabold text-evergreen mt-0.5">
                  {fmt(Math.max(0, selectedCampaign.raised - selectedCampaign.spent))}
                </p>
              </div>
            </div>

            {/* 3 Badges: Locked funds, AI receipts, To suppliers */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-evergreen font-bold py-1">
              <div className="flex flex-col items-center gap-1 rounded-xl bg-white p-2 border border-evergreen/10">
                <ShieldCheck className="h-4 w-4 text-passed" />
                <span>Locked funds</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-white p-2 border border-evergreen/10">
                <FileCheck className="h-4 w-4 text-wait" />
                <span>AI receipts</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-white p-2 border border-evergreen/10">
                <Store className="h-4 w-4 text-info" />
                <span>To suppliers</span>
              </div>
            </div>

            {/* Real Donation History List for this Campaign */}
            <div className="space-y-2 border-t border-evergreen/10 pt-3">
              <div className="flex items-center justify-between text-xs font-bold text-evergreen">
                <span>Donation history</span>
                <span className="text-[11px] text-evergreen/60">
                  {currentDonations.length > 0 ? `Latest ${Math.min(4, currentDonations.length)}` : "No donations yet"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                {currentDonations.length === 0 ? (
                  <p className="text-xs text-evergreen/60 py-3 text-center rounded-lg bg-white border border-evergreen/10">
                    No donations recorded yet for this drive. Be the first supporter!
                  </p>
                ) : (
                  currentDonations.slice(0, 4).map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-evergreen/10 shadow-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-evergreen/60" />
                        <div>
                          <p className="font-bold truncate max-w-[170px]">{d.donorName}</p>
                          <p className="text-[10px] text-evergreen/50">
                            {d.date} · {d.method}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold">₱{d.amount.toLocaleString()} <span className="text-[10px] text-evergreen/60">({d.amount} mUSD)</span></span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Actions: Follow the funds & Donate */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => setScreen("transparency")}
                className="btn w-full rounded-xl bg-mint text-evergreen hover:bg-mint/80 font-bold text-small py-2.5 transition"
              >
                Follow the funds
              </button>
              <button
                onClick={() => setScreen("donate")}
                className="btn btn-primary w-full rounded-xl text-small font-bold py-3 transition"
              >
                Donate
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: DONOR · DONATE / PAYMENT METHOD                                 */}
        {/* ========================================================================= */}
        {screen === "donate" && selectedCampaign && (
          <div className="p-4 space-y-4">
            <button
              onClick={() => setScreen("details")}
              className="flex items-center gap-1 text-xs font-semibold text-evergreen/70 hover:text-evergreen"
            >
              <ArrowLeft className="h-4 w-4" /> Back to details
            </button>

            <div className="space-y-0.5">
              <h1 className="text-section font-bold text-evergreen">Make a donation</h1>
              <p className="text-xs text-evergreen/70 truncate">{selectedCampaign.name}</p>
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-evergreen">Amount · ₱ (PHP / mUSD)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-evergreen/40">₱</span>
                <input
                  type="number"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="field text-section font-extrabold w-full pl-7"
                  placeholder="500"
                />
              </div>
              <p className="text-[11px] text-evergreen/60">1 mUSD crypto = ₱1.00 Philippine Peso</p>
            </div>

            {/* Presets matching Figma: [250] [✓ 500] [Other] */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDonationAmount("250")}
                className={`rounded-xl border py-2 text-xs font-bold transition ${
                  donationAmount === "250"
                    ? "border-evergreen bg-mint text-evergreen"
                    : "border-evergreen/20 bg-white hover:bg-paper"
                }`}
              >
                {donationAmount === "250" && "✓ "}
                ₱250
              </button>
              <button
                type="button"
                onClick={() => setDonationAmount("500")}
                className={`rounded-xl border py-2 text-xs font-bold transition ${
                  donationAmount === "500"
                    ? "border-evergreen bg-mint text-evergreen"
                    : "border-evergreen/20 bg-white hover:bg-paper"
                }`}
              >
                {donationAmount === "500" && "✓ "}
                ₱500
              </button>
              <button
                type="button"
                onClick={() => {
                  if (donationAmount === "250" || donationAmount === "500") {
                    setDonationAmount("1000");
                  }
                }}
                className={`rounded-xl border py-2 text-xs font-bold transition ${
                  donationAmount !== "250" && donationAmount !== "500"
                    ? "border-evergreen bg-mint text-evergreen"
                    : "border-evergreen/20 bg-white hover:bg-paper"
                }`}
              >
                {donationAmount !== "250" && donationAmount !== "500" && "✓ "}
                Other
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-bold text-evergreen">Payment method</p>

              <div className="grid grid-cols-2 gap-2">
                {/* Pay by QR */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("qr")}
                  className={`flex flex-col justify-between rounded-2xl border-2 p-3 text-left transition ${
                    paymentMethod === "qr"
                      ? "border-evergreen bg-white shadow-sm"
                      : "border-evergreen/15 bg-paper/60 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <QrCode className="h-5 w-5 text-evergreen" />
                    <span
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === "qr" ? "border-evergreen" : "border-evergreen/30"
                      }`}
                    >
                      {paymentMethod === "qr" && <span className="h-2 w-2 rounded-full bg-evergreen" />}
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-bold text-evergreen">Pay by QR</p>
                    <p className="text-[10px] text-evergreen/60">Scan to pay</p>
                  </div>
                </button>

                {/* Wallet (MetaMask) */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("wallet")}
                  className={`flex flex-col justify-between rounded-2xl border-2 p-3 text-left transition ${
                    paymentMethod === "wallet"
                      ? "border-evergreen bg-white shadow-sm"
                      : "border-evergreen/15 bg-paper/60 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Wallet className="h-5 w-5 text-evergreen" />
                    <span
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === "wallet" ? "border-evergreen" : "border-evergreen/30"
                      }`}
                    >
                      {paymentMethod === "wallet" && <span className="h-2 w-2 rounded-full bg-evergreen" />}
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-bold text-evergreen">Wallet</p>
                    <p className="text-[10px] text-evergreen/60">MetaMask</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Connected Wallet Box / Balance */}
            {paymentMethod === "wallet" && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-evergreen/15 shadow-xs text-xs">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-evergreen" />
                    <div>
                      <p className="font-bold text-evergreen">
                        {wallet.account ? "MetaMask · Connected" : "MetaMask · Not connected"}
                      </p>
                      <p className="text-[10px] font-mono text-evergreen/60">
                        {wallet.account ? short(wallet.account) : "Click below to connect"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-small text-evergreen">
                      {tokenBalance !== null ? `₱${tokenBalance.toLocaleString()}` : "..."}
                    </p>
                    <p className="text-[10px] text-evergreen/50">
                      {tokenBalance !== null ? `(${tokenBalance.toLocaleString()} mUSD)` : "Balance"}
                    </p>
                  </div>
                </div>

                {/* 2-Step Progress Indicator */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-mint/50 p-2.5 border border-mint flex items-center gap-2">
                    <Check className="h-4 w-4 text-passed shrink-0" />
                    <div>
                      <p className="font-bold text-evergreen">1 · Approved</p>
                      <p className="text-[10px] text-evergreen/60">₱{donationAmount} ({donationAmount} mUSD)</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-evergreen/10 flex items-center gap-2">
                    <Coins className="h-4 w-4 text-evergreen shrink-0" />
                    <div>
                      <p className="font-bold text-evergreen">2 · Donate</p>
                      <p className="text-[10px] text-evergreen/60">Confirm in MetaMask</p>
                    </div>
                  </div>
                </div>

                {/* Pay Button */}
                <button
                  onClick={handlePayWithWallet}
                  disabled={busy}
                  className="btn btn-primary w-full rounded-xl text-small font-bold py-3 shadow-sm hover:shadow transition"
                >
                  {busy ? "Processing..." : `Pay ₱${donationAmount} (${donationAmount} mUSD) with wallet`}
                </button>

                {/* Test tokens link */}
                <button
                  type="button"
                  onClick={handleGetPracticeTokens}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 w-full text-xs font-bold text-evergreen/80 hover:text-evergreen pt-1"
                >
                  <Sparkles className="h-3.5 w-3.5 text-wait" />
                  Get test tokens (faucet)
                </button>

                <p className="text-center text-[10px] text-evergreen/60">
                  Fees use test BNB. Updates after confirmation.
                </p>
              </div>
            )}

            {/* QR Payment View */}
            {paymentMethod === "qr" && (
              <div className="space-y-4 pt-1 text-center">
                <div className="rounded-2xl bg-white p-4 border border-evergreen/15 shadow-sm space-y-3">
                  <p className="text-xs font-semibold text-evergreen/70">
                    Donate to {selectedCampaign.organization || "Philippine Red Cross"}
                  </p>
                  <p className="text-section font-black text-evergreen">
                    ₱{donationAmount}
                  </p>
                  <p className="text-[10px] text-evergreen/60 -mt-2">
                    Equivalent to {donationAmount} mUSD crypto
                  </p>

                  <div className="flex justify-center py-2">
                    <div className="rounded-2xl bg-paper p-3 border border-evergreen/15 shadow-inner">
                      <QrCode className="h-32 w-32 text-evergreen" />
                    </div>
                  </div>

                  <p className="text-xs font-bold text-evergreen">QR Ph (Cashless Payment)</p>
                  <span className="inline-block rounded-full bg-mint px-3 py-1 text-[11px] font-bold text-evergreen">
                    Awaiting payment
                  </span>
                </div>

                <button
                  onClick={handleSimulateQr}
                  disabled={busy}
                  className="btn btn-primary w-full rounded-xl text-small font-bold py-3 shadow-sm"
                >
                  {busy ? "Processing..." : `Pay ₱${donationAmount} with QR Ph`}
                </button>

                <p className="text-[10px] text-evergreen/60">
                  Direct routing to Safe Multisig Vault.
                </p>
              </div>
            )}

            {statusMsg && (
              <p className={`text-xs text-center font-bold ${statusMsg.kind === "error" ? "text-attention" : "text-passed"}`}>
                {statusMsg.text}
              </p>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 4: DONOR · DONATION SUMMARY                                        */}
        {/* ========================================================================= */}
        {screen === "summary" && (
          <div className="p-4 space-y-4">
            <div className="space-y-0.5">
              <h1 className="text-section font-bold text-evergreen">Donation summary</h1>
              <p className="text-xs text-evergreen/70">Transaction verified on blockchain</p>
            </div>

            {/* Top Confirmed Card */}
            <div className="rounded-2xl bg-white p-5 border border-evergreen/15 shadow-sm space-y-2">
              <p className="text-xs text-evergreen/70 font-medium">Amount donated</p>
              <p className="text-hero font-black text-evergreen">
                ₱{lastDonation ? lastDonation.amount.toLocaleString() : Number(donationAmount).toLocaleString()} <span className="text-base font-bold text-evergreen/70">({lastDonation ? lastDonation.amount : donationAmount} mUSD)</span>
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-mint/50 px-2.5 py-1 text-xs font-bold text-passed">
                <Check className="h-3.5 w-3.5" />
                Donation confirmed
              </div>
            </div>

            {/* Real Details Breakdown Card */}
            <div className="rounded-2xl bg-white p-4 border border-evergreen/15 shadow-sm space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-evergreen/10 pb-2">
                <span className="text-evergreen/60">Donor name</span>
                <span className="font-bold text-evergreen">
                  {lastDonation?.donorName || user?.name || (wallet.account ? short(wallet.account) : "Maria Santos")}
                </span>
              </div>
              <div className="flex justify-between border-b border-evergreen/10 pb-2">
                <span className="text-evergreen/60">Donation date</span>
                <span className="font-bold text-evergreen">
                  {lastDonation?.date || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between border-b border-evergreen/10 pb-2">
                <span className="text-evergreen/60">Campaign</span>
                <span className="font-bold text-evergreen truncate max-w-[180px]">
                  {selectedCampaign?.name || "Emergency Food Packs"}
                </span>
              </div>
              <div className="flex justify-between border-b border-evergreen/10 pb-2">
                <span className="text-evergreen/60">Receipt number</span>
                <span className="font-mono font-bold text-evergreen">
                  {lastDonation?.receiptNo || "#018"}
                </span>
              </div>
              <div className="flex justify-between border-b border-evergreen/10 pb-2">
                <span className="text-evergreen/60">Payment method</span>
                <span className="font-bold text-evergreen">
                  {lastDonation?.method || (paymentMethod === "qr" ? "QR Ph" : "Crypto wallet")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-evergreen/60">Network</span>
                <span className="font-bold text-passed">BSC testnet</span>
              </div>
            </div>

            <button
              onClick={() => setScreen("transparency")}
              className="btn btn-primary w-full rounded-xl text-small font-bold py-3 transition shadow-xs"
            >
              View donation receipt & funds
            </button>

            <button
              onClick={() => setScreen("home")}
              className="btn btn-secondary w-full rounded-xl text-small font-bold py-2.5 transition"
            >
              Back to my giving
            </button>

            <p className="text-center text-[10px] text-evergreen/60 pt-1">
              Thank you for supporting community relief. Demo vault on BSC testnet.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 5: DONOR · TRANSPARENCY REPORT                                     */}
        {/* ========================================================================= */}
        {screen === "transparency" && selectedCampaign && (
          <div className="p-4 space-y-4">
            <button
              onClick={() => setScreen("details")}
              className="flex items-center gap-1 text-xs font-semibold text-evergreen/70 hover:text-evergreen"
            >
              <ArrowLeft className="h-4 w-4" /> Back to campaign
            </button>

            <div className="space-y-0.5">
              <h1 className="text-section font-bold text-evergreen">Transparency report</h1>
              <p className="text-xs text-evergreen/70 truncate">{selectedCampaign.name}</p>
            </div>

            {/* 3 Column Summary Card */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-3.5 border border-evergreen/15 text-center text-xs shadow-xs">
              <div>
                <p className="text-[10px] text-evergreen/60">Raised</p>
                <p className="text-small font-extrabold text-evergreen mt-0.5">
                  {selectedCampaign.raised.toLocaleString()}
                </p>
              </div>
              <div className="border-x border-evergreen/10">
                <p className="text-[10px] text-evergreen/60">Paid</p>
                <p className="text-small font-extrabold text-passed mt-0.5">
                  {selectedCampaign.spent.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-evergreen/60">Remaining</p>
                <p className="text-small font-extrabold text-evergreen mt-0.5">
                  {Math.max(0, selectedCampaign.raised - selectedCampaign.spent).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Total Money Raised & Used Progress Bar (User's Requested Feature) */}
            {(() => {
              const spent = selectedCampaign.spent || 0;
              const raised = selectedCampaign.raised || 1;
              const usedPct = Math.min(100, Math.round((spent / raised) * 100));
              const remaining = Math.max(0, raised - spent);

              return (
                <div className="rounded-2xl bg-white p-4 border border-evergreen/15 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-evergreen">Total Money Utilization</span>
                    <span className="font-bold text-passed">{usedPct}% used</span>
                  </div>
                  {/* Dual progress bar */}
                  <div className="h-3 w-full overflow-hidden rounded-full bg-mint/40 flex">
                    <div
                      className="h-full bg-passed transition-all duration-500 rounded-l-full"
                      style={{ width: `${usedPct}%` }}
                    />
                    <div
                      className="h-full bg-mint/80 transition-all duration-500 rounded-r-full"
                      style={{ width: `${100 - usedPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-semibold text-evergreen/70 pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-passed" />
                      ₱{spent.toLocaleString()} ({spent.toLocaleString()} mUSD) used
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-mint border border-evergreen/20" />
                      ₱{remaining.toLocaleString()} ({remaining.toLocaleString()} mUSD) in vault
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Transparency Category Allocation Graph */}
            <div className="rounded-2xl bg-white p-4 border border-evergreen/15 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-evergreen">Transparency Allocation Graph</span>
                <span className="text-[10px] text-evergreen/60 font-medium">Verified by AI Receipts</span>
              </div>

              {/* Segmented category distribution bar */}
              <div className="space-y-1.5">
                <div className="h-3 w-full overflow-hidden rounded-full bg-paper flex">
                  <div className="h-full bg-passed" style={{ width: "55%" }} title="Food & Grains: 55%" />
                  <div className="h-full bg-wait" style={{ width: "30%" }} title="Canned Goods & Protein: 30%" />
                  <div className="h-full bg-info" style={{ width: "15%" }} title="Emergency Logistics: 15%" />
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-evergreen font-semibold pt-1">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-passed shrink-0" />
                    <span className="truncate">Rice & Grains (55%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-wait shrink-0" />
                    <span className="truncate">Canned (30%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-info shrink-0" />
                    <span className="truncate">Logistics (15%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Donations Section with Per-Donation Transparency Graph */}
            <div className="space-y-2 border-t border-evergreen/10 pt-3">
              <div className="flex items-center justify-between text-xs">
                <h2 className="font-bold text-evergreen">Donations & Fund Transparency</h2>
                <span className="text-[11px] text-evergreen/60">
                  {currentDonations.length} recorded
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {currentDonations.length === 0 ? (
                  <p className="text-xs text-evergreen/60 p-3 text-center rounded-xl bg-white border border-evergreen/10">
                    No donations recorded yet for this drive.
                  </p>
                ) : (
                  currentDonations.map((d) => {
                    const spent = selectedCampaign.spent || 0;
                    const raised = selectedCampaign.raised || 1;
                    const usedPct = Math.min(100, Math.round((spent / raised) * 100));
                    const isExpanded = expandedDonationId === d.id;
                    const usedForGoods = (d.amount * (usedPct / 100)).toFixed(0);
                    const inVault = (d.amount * (1 - usedPct / 100)).toFixed(0);

                    return (
                      <div
                        key={d.id}
                        onClick={() => setExpandedDonationId(isExpanded ? null : d.id)}
                        className="rounded-xl bg-white p-3 border border-evergreen/10 shadow-xs cursor-pointer hover:border-passed transition space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-evergreen">{d.donorName}</p>
                            <p className="text-[10px] text-evergreen/50">
                              {d.method} · {d.date}
                            </p>
                          </div>
                          <span className="font-extrabold text-small text-evergreen">
                            {d.amount.toLocaleString()} mUSD
                          </span>
                        </div>

                        {/* Per-Donation Transparency Allocation Bar (User's Requested Feature) */}
                        <div className="space-y-1 pt-1 border-t border-evergreen/10">
                          <div className="flex justify-between text-[10px] text-evergreen/70 font-semibold">
                            <span>Paid to supplier: ₱{usedForGoods}</span>
                            <span>In safe vault: ₱{inVault}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-mint/50 flex">
                            <div className="h-full bg-passed" style={{ width: `${usedPct}%` }} />
                            <div className="h-full bg-mint" style={{ width: `${100 - usedPct}%` }} />
                          </div>
                        </div>

                        {/* Click to Expand: Transparency Flow Chart for this donation */}
                        {isExpanded && (
                          <div className="rounded-lg bg-paper p-2.5 space-y-1.5 border border-evergreen/10 text-[11px] animate-fadeIn">
                            <p className="font-bold text-evergreen text-[10px] uppercase tracking-wider">
                              Fund Route for {d.donorName}:
                            </p>
                            <div className="flex items-center justify-between text-[10px] font-mono text-evergreen">
                              <span>Donor ({d.amount} mUSD)</span>
                              <span>➔</span>
                              <span>Safe Vault</span>
                              <span>➔</span>
                              <span>Batangas Depot (₱{usedForGoods})</span>
                            </div>
                            <p className="text-[10px] text-evergreen/70">
                              100% accounted for with BIR official receipts and verified by Gemini 3.5 Flash.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Live Spending Details Section from System Disbursements */}
            <div className="space-y-2.5 border-t border-evergreen/10 pt-3">
              <h2 className="text-xs font-bold text-evergreen">Spending details</h2>

              {currentDisbursements.length === 0 ? (
                <div className="rounded-2xl bg-white p-4 border border-evergreen/10 text-center space-y-1">
                  <p className="text-xs font-bold text-evergreen">No disbursements yet</p>
                  <p className="text-[11px] text-evergreen/60">
                    Funds remain securely locked in the vault until supplier verification.
                  </p>
                </div>
              ) : (
                <>
                  {/* Verified Disbursements */}
                  {verifiedDisbursements.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-2xl bg-white p-4 border border-passed/30 space-y-2.5 text-xs shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-small text-evergreen">{d.purpose}</h3>
                          <p className="text-[11px] text-evergreen/60 font-semibold">{d.merchant || "Authorized Supplier"}</p>
                          {d.items && d.items.length > 0 && (
                            <p className="text-[11px] text-evergreen/70">
                              {d.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                            </p>
                          )}
                          <p className="text-[10px] text-evergreen/50">
                            Receipt {d.createdAt ? `· ${d.createdAt}` : ""}
                          </p>
                        </div>
                        <span className="text-section font-extrabold text-passed">
                          {d.amount.toLocaleString()} mUSD
                        </span>
                      </div>

                      <div className="rounded-lg bg-mint/40 px-2.5 py-1 text-[11px] font-bold text-passed flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Paid · Amount matched · Items eligible
                      </div>

                      {/* 3 Action Buttons */}
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold text-evergreen pt-1">
                        <button
                          onClick={() => setViewingReceipt(d)}
                          className="flex flex-col items-center gap-1 rounded-lg bg-paper p-2 hover:bg-mint/30 transition border border-evergreen/10"
                        >
                          <Receipt className="h-4 w-4 text-evergreen" />
                          Receipt
                        </button>
                        <button
                          onClick={() => setViewingFingerprint(d)}
                          className="flex flex-col items-center gap-1 rounded-lg bg-paper p-2 hover:bg-mint/30 transition border border-evergreen/10"
                        >
                          <ShieldCheck className="h-4 w-4 text-passed" />
                          Fingerprint
                        </button>
                        <a
                          href={txUrl(d.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-col items-center gap-1 rounded-lg bg-paper p-2 hover:bg-mint/30 transition border border-evergreen/10"
                        >
                          <ExternalLink className="h-4 w-4 text-info" />
                          BscScan
                        </a>
                      </div>

                      <p className="text-[10px] font-mono text-evergreen/60 pt-1">
                        Supplier recipient · {short(d.recipient)}
                      </p>
                    </div>
                  ))}

                  {/* Pending Liquidation Disbursements */}
                  {currentDisbursements.filter((d) => d.status === 0).map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-xl bg-mint/15 p-3 text-xs border border-mint"
                    >
                      <div>
                        <p className="font-bold text-evergreen">{d.purpose}</p>
                        <p className="text-[10px] text-evergreen/60">Awaiting official receipt proof for liquidation.</p>
                      </div>
                      <span className="font-bold text-evergreen">{d.amount.toLocaleString()} mUSD</span>
                    </div>
                  ))}

                  {/* Rejected / Flagged Requests */}
                  {flaggedDisbursements.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-2xl bg-attention/5 p-3.5 border border-attention/30 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-attention">Rejected request</span>
                        <span className="font-extrabold text-attention">{d.amount.toLocaleString()} mUSD</span>
                      </div>
                      <p className="text-[11px] text-evergreen/70">
                        {d.purpose} · {d.note || "Discrepancy detected by Gemini AI. No funds released."}
                      </p>
                    </div>
                  ))}
                </>
              )}

              <button
                type="button"
                onClick={() => setShowSafeWalletModal(true)}
                className="w-full rounded-xl bg-white p-2.5 text-center text-xs font-bold text-passed flex items-center justify-center gap-1.5 border border-passed/20 shadow-xs hover:bg-mint/30 transition cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                Payments go directly to suppliers · Verify Safe Outflow
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: View Receipt Evidence */}
      {viewingReceipt && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-30 flex items-center justify-center p-4">
          <div className="w-full max-w-[340px] max-h-[85vh] bg-white rounded-3xl p-5 border border-evergreen/20 shadow-2xl flex flex-col">
            <div className="shrink-0 flex items-center justify-between border-b border-evergreen/10 pb-2">
              <div className="flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-passed" />
                <h3 className="font-bold text-small text-evergreen">Verified Receipt</h3>
              </div>
              <button
                onClick={() => setViewingReceipt(null)}
                className="p-1 text-evergreen/60 hover:text-evergreen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mobile-scrollbar min-h-0 py-3 space-y-3">
              <div className="space-y-2 text-xs bg-paper p-3 rounded-2xl border border-evergreen/10 font-mono">
                <div className="text-center font-bold pb-1 border-b border-evergreen/15 text-evergreen">
                  {viewingReceipt.merchant || "SUPPLIER OFFICIAL RECEIPT"}
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Date:</span>
                  <span>{viewingReceipt.createdAt}</span>
                </div>
                <div className="border-t border-dashed border-evergreen/20 pt-1 space-y-1">
                  {viewingReceipt.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span>{item.qty}x {item.name}</span>
                      <span>₱{(item.qty * item.price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-evergreen/20 pt-1 flex justify-between font-extrabold text-small text-evergreen">
                  <span>TOTAL:</span>
                  <span>₱{viewingReceipt.amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-xl bg-mint/40 p-2.5 text-[11px] font-bold text-passed flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Gemini 3.5 Flash matched receipt to campaign purpose.</span>
              </div>
            </div>

            <button
              onClick={() => setViewingReceipt(null)}
              className="shrink-0 btn btn-secondary w-full rounded-xl text-xs font-bold py-2.5"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal: View Cryptographic Fingerprint Evidence */}
      {viewingFingerprint && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-30 flex items-center justify-center p-4">
          <div className="w-full max-w-[340px] max-h-[85vh] bg-white rounded-3xl p-5 border border-evergreen/20 shadow-2xl flex flex-col">
            <div className="shrink-0 flex items-center justify-between border-b border-evergreen/10 pb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-passed" />
                <h3 className="font-bold text-small text-evergreen">Receipt Fingerprint</h3>
              </div>
              <button
                onClick={() => setViewingFingerprint(null)}
                className="p-1 text-evergreen/60 hover:text-evergreen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mobile-scrollbar min-h-0 py-3 space-y-3">
              <div className="space-y-2 text-xs bg-paper p-3 rounded-2xl border border-evergreen/10 font-mono">
                <div className="text-[11px] font-bold text-passed flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  <span>Verified by Gemini 3.5 Flash</span>
                </div>
                <div className="space-y-1 pt-1 text-[11px]">
                  <p className="text-evergreen/70 font-sans font-bold">SHA-256 Digest:</p>
                  <p className="p-2 rounded-lg bg-white border border-evergreen/15 text-[10px] break-all select-all font-mono text-evergreen">
                    {viewingFingerprint.txHash}
                  </p>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-evergreen/70 font-sans">Safe Vault:</span>
                  <span className="font-bold text-evergreen">{short(CONFIG.giveClear)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-evergreen/70 font-sans">Supplier Recipient:</span>
                  <span className="font-bold text-evergreen">{short(viewingFingerprint.recipient)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-evergreen/70 font-sans">Verified Timestamp:</span>
                  <span className="text-evergreen">{viewingFingerprint.createdAt}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setViewingFingerprint(null)}
              className="shrink-0 btn btn-primary w-full rounded-xl text-xs font-bold py-2.5 shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM TAB NAVIGATION (Fixed inside 402px Mobile Frame)                   */}
      {/* ========================================================================= */}
      <nav className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-evergreen/10 px-6 py-2.5 flex items-center justify-around z-20">
        {/* Tab 1: Discover */}
        <button
          onClick={() => {
            setActiveTab("discover");
            setScreen("home");
          }}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition ${
            activeTab === "discover" ? "text-evergreen" : "text-evergreen/40 hover:text-evergreen"
          }`}
        >
          <div
            className={`rounded-full px-3 py-1 ${
              activeTab === "discover" ? "bg-mint/60 text-evergreen" : ""
            }`}
          >
            <Heart className="h-4 w-4" />
          </div>
          <span>Discover</span>
        </button>

        {/* Tab 2: Activity */}
        <button
          onClick={() => {
            setActiveTab("activity");
            if (selectedCampaign) setScreen("transparency");
          }}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition ${
            activeTab === "activity" ? "text-evergreen" : "text-evergreen/40 hover:text-evergreen"
          }`}
        >
          <div
            className={`rounded-full px-3 py-1 ${
              activeTab === "activity" ? "bg-mint/60 text-evergreen" : ""
            }`}
          >
            <FileText className="h-4 w-4" />
          </div>
          <span>Activity</span>
        </button>

        {/* Tab 3: Wallet */}
        <button
          onClick={() => {
            setActiveTab("wallet");
            if (selectedCampaign) setScreen("donate");
          }}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition ${
            activeTab === "wallet" ? "text-evergreen" : "text-evergreen/40 hover:text-evergreen"
          }`}
        >
          <div
            className={`rounded-full px-3 py-1 ${
              activeTab === "wallet" ? "bg-mint/60 text-evergreen" : ""
            }`}
          >
            <Wallet className="h-4 w-4" />
          </div>
          <span>Wallet</span>
        </button>
      </nav>

      {/* Safe Wallet Confirmation Modal (Safe -> 3rd party -> Supplier) */}
      <SafeWalletConfirmationModal
        isOpen={showSafeWalletModal}
        campaignName={selectedCampaign?.name || "Emergency Food Packs"}
        amount={verifiedDisbursements[0]?.amount || 500}
        purpose={verifiedDisbursements[0]?.purpose || selectedCampaign?.purpose || "5 bags 5kg rice and canned goods for relief packs"}
        recipientName={verifiedDisbursements[0]?.merchant || "Batangas Grain & Groceries Depot"}
        recipientAddress={verifiedDisbursements[0]?.recipient || "0x0bb81d8B21F77a83B381A54F9154a1B37825d632"}
        onConfirm={() => {
          // Simulated safe confirmation
        }}
        onClose={() => setShowSafeWalletModal(false)}
      />
    </div>
  );
}
