import React, { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Edit3,
  Power,
  Building2,
  FolderPlus,
  Settings,
  HelpCircle,
  Lock,
  UserCheck
} from "lucide-react";
import { Contract } from "ethers";
import { Campaign, friendly } from "./chain";
import { CONFIG } from "./config";
import { GIVECLEAR_ABI } from "./abi";
import type { WalletState } from "./wallet";
import { Notice, NoticeKind, StatusBadge, fmt, short } from "./ui";
import { createSampleReceiptImage } from "./sampleReceipts";
import { useAuth } from "./auth";

interface DisbursementItem {
  id: number;
  campaignId: number;
  amount: number;
  purpose: string;
  recipient: string;
  status: 0 | 1 | 2;
  note: string;
  createdAt: string;
  txHash: string;
  merchant?: string | null;
  items?: Array<{ name: string; qty: number; price: number }>;
}

export function OrganizerPage({
  campaigns,
  wallet,
  onChanged,
  onOpenAuth,
}: {
  campaigns: Campaign[];
  wallet: WalletState;
  onChanged: () => void;
  onOpenAuth?: () => void;
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"drives" | "advance" | "liquidate">("drives");
  const [disbursements, setDisbursements] = useState<DisbursementItem[]>([]);

  // Filter campaigns and disbursements strictly to the logged-in organization
  const myCampaigns = useMemo(() => {
    if (!user || user.role !== "organization") return [];
    const orgName = (user.organizationName || "").toLowerCase().trim();
    return campaigns.filter((c) => (c.organization || "").toLowerCase().trim() === orgName);
  }, [campaigns, user]);

  const myDisbursements = useMemo(() => {
    if (!user || user.role !== "organization") return [];
    return disbursements.filter((d) => myCampaigns.some((c) => c.id === d.campaignId));
  }, [disbursements, myCampaigns, user]);

  // CRUD Create Drive Form State
  const [newDriveName, setNewDriveName] = useState("");
  const [newDrivePurpose, setNewDrivePurpose] = useState("");
  const [useOnChain, setUseOnChain] = useState(false);

  // CRUD Update Drive State
  const [editingDrive, setEditingDrive] = useState<Campaign | null>(null);
  const [editName, setEditName] = useState("");
  const [editPurpose, setEditPurpose] = useState("");

  // Cash Advance State
  const [campaignId, setCampaignId] = useState("");
  const [amount, setAmount] = useState("500");
  const [purpose, setPurpose] = useState("5 bags of 5kg rice and canned goods for family packs");
  const [supplierQrAccount, setSupplierQrAccount] = useState("GCash / Maya: 0917-555-0199 (Puregold Supermarket)");

  // Status and messages
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: NoticeKind; title: string; body?: string } | null>(null);

  // Selected disbursement for liquidation
  const [selectedDisbursementId, setSelectedDisbursementId] = useState<number | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Load disbursements from backend
  const fetchDisbursements = async () => {
    try {
      const res = await fetch(`${CONFIG.api}/api/disbursements`);
      if (res.ok) {
        setDisbursements(await res.json());
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchDisbursements();
  }, []);

  // Update selected campaignId when organization drives are ready
  useEffect(() => {
    if (myCampaigns.length > 0 && !myCampaigns.some((c) => String(c.id) === campaignId)) {
      setCampaignId(String(myCampaigns[0].id));
    }
  }, [myCampaigns, campaignId]);

  // If user is not logged in or is a donor, show the Organization Registration / Login Gate
  if (!user || user.role !== "organization") {
    return (
      <div className="mx-auto max-w-xl card border-2 border-evergreen/15 text-center space-y-6 py-10 my-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-mint text-evergreen">
          <Building2 className="h-8 w-8 text-passed" />
        </div>

        <div className="space-y-2">
          <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-evergreen">
            Organization Portal
          </span>
          <h1 className="text-page font-extrabold text-evergreen">
            Manage Your Organization's Relief Drives
          </h1>
          <p className="text-small text-evergreen/80 max-w-md mx-auto">
            This space is restricted to registered non-profit organizations. Each organization only accesses
            and manages its own campaigns, cash advances, and receipt audits.
          </p>
        </div>

        <div className="rounded-xl border border-evergreen/15 bg-paper p-4 text-left space-y-2 text-xs text-evergreen/80">
          <p className="font-bold text-evergreen flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-wait" />
            Features available once signed in:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Launch new donation drives with stated relief purposes</li>
            <li>Edit, pause, or re-activate your organization's campaigns</li>
            <li>Disburse emergency advance funds directly from the BNB Chain safe</li>
            <li>Liquidate purchases with Gemini 3.5 Flash receipt verification</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <button
            onClick={onOpenAuth}
            className="btn btn-primary text-small"
          >
            Register Your Organization or Sign In
          </button>
        </div>
      </div>
    );
  }

  // --- CRUD 1: CREATE DONATION DRIVE ---
  async function handleCreateDrive(e: React.FormEvent) {
    e.preventDefault();
    if (!newDriveName.trim() || !newDrivePurpose.trim()) {
      return setMsg({
        kind: "error",
        title: "Missing drive details",
        body: "Please enter the drive title and stated purpose.",
      });
    }

    const orgToUse = user?.organizationName || "Philippine Red Cross";

    setBusy(true);
    setMsg({
      kind: "wait",
      title: "Creating Donation Drive...",
      body: `Registering '${newDriveName}' under ${orgToUse}.`,
    });

    try {
      if (useOnChain && wallet.account) {
        const signer = await wallet.getSigner();
        const contract = new Contract(CONFIG.giveClear, GIVECLEAR_ABI, signer);
        const tx = await contract.createDrive(newDriveName.trim(), orgToUse, newDrivePurpose.trim());
        await tx.wait();
      }

      const res = await fetch(`${CONFIG.api}/api/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDriveName.trim(),
          organization: orgToUse,
          purpose: newDrivePurpose.trim(),
          organizer: wallet.account || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to register campaign");
      }

      setMsg({
        kind: "success",
        title: "Donation Drive Created Successfully!",
        body: `'${newDriveName}' is now live under ${orgToUse}! Donors can now contribute and follow its disbursements.`,
      });

      setNewDriveName("");
      setNewDrivePurpose("");
      onChanged();
    } catch (err: any) {
      setMsg({ kind: "error", title: "Could not create drive", body: friendly(err) });
    } finally {
      setBusy(false);
    }
  }

  // --- CRUD 2: UPDATE DONATION DRIVE ---
  function startEditing(c: Campaign) {
    setEditingDrive(c);
    setEditName(c.name);
    setEditPurpose(c.purpose || "");
  }

  async function handleUpdateDrive(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDrive) return;

    setBusy(true);
    setMsg({
      kind: "wait",
      title: "Updating Drive Details...",
      body: `Saving changes for '${editName}'...`,
    });

    try {
      if (useOnChain && wallet.account) {
        const signer = await wallet.getSigner();
        const contract = new Contract(CONFIG.giveClear, GIVECLEAR_ABI, signer);
        const tx = await contract.updateDrive(BigInt(editingDrive.id), editName.trim(), user?.organizationName || editingDrive.organization, editPurpose.trim());
        await tx.wait();
      }

      const res = await fetch(`${CONFIG.api}/api/campaigns/${editingDrive.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          organization: user?.organizationName || editingDrive.organization,
          purpose: editPurpose.trim(),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Update failed");
      }

      setMsg({
        kind: "success",
        title: "Drive Updated",
        body: `Drive #${editingDrive.id} details and purpose updated successfully.`,
      });

      setEditingDrive(null);
      onChanged();
    } catch (err: any) {
      setMsg({ kind: "error", title: "Could not update drive", body: friendly(err) });
    } finally {
      setBusy(false);
    }
  }

  // --- CRUD 3: TOGGLE DRIVE STATUS (PAUSE / ACTIVATE) ---
  async function handleToggleStatus(c: Campaign) {
    const nextStatus = !c.active;
    setBusy(true);
    setMsg({
      kind: "wait",
      title: nextStatus ? "Re-opening Drive..." : "Pausing Drive...",
      body: `Updating status for '${c.name}'...`,
    });

    try {
      if (useOnChain && wallet.account) {
        const signer = await wallet.getSigner();
        const contract = new Contract(CONFIG.giveClear, GIVECLEAR_ABI, signer);
        const tx = await contract.setDriveActive(BigInt(c.id), nextStatus);
        await tx.wait();
      }

      await fetch(`${CONFIG.api}/api/campaigns/${c.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextStatus }),
      });

      setMsg({
        kind: "success",
        title: nextStatus ? "Drive Re-activated" : "Drive Paused",
        body: nextStatus ? `'${c.name}' is now open for donations.` : `'${c.name}' is temporarily closed.`,
      });

      onChanged();
    } catch (err: any) {
      setMsg({ kind: "error", title: "Could not update status", body: friendly(err) });
    } finally {
      setBusy(false);
    }
  }

  // --- 4. ADVANCE DISBURSEMENT ---
  async function handleDisburse(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      return setMsg({ kind: "error", title: "Enter a valid amount", body: "Please enter numbers only (e.g. 500 or 1000)." });
    }
    if (!purpose.trim()) {
      return setMsg({ kind: "error", title: "Enter purpose of advance", body: "Specify what relief supplies will be bought." });
    }

    setBusy(true);
    setMsg({
      kind: "wait",
      title: "Releasing Advance Funds from Safe...",
      body: `Releasing ₱${Number(amount).toFixed(2)} to organizer for '${purpose}'.`,
    });

    try {
      const res = await fetch(`${CONFIG.api}/api/disburse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: Number(campaignId),
          amount: Number(amount),
          purpose: purpose.trim(),
          recipient: supplierQrAccount.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Disbursement failed.");

      const c = myCampaigns.find((x) => x.id === Number(campaignId));
      if (c) c.spent += Number(amount);

      setMsg({
        kind: "success",
        title: `Funds Disbursed: ₱${Number(amount).toFixed(2)} Released`,
        body: `Money is now with the organizer for emergency relief purchases. This disbursement is recorded publicly with status 'Disbursed · Awaiting Receipt'.`,
      });

      await fetchDisbursements();
      onChanged();
    } catch (err: any) {
      setMsg({ kind: "error", title: "Could not disburse funds", body: err.message });
    } finally {
      setBusy(false);
    }
  }

  // --- 5. LIQUIDATION WITH RECEIPT (GEMINI AUDIT) ---
  async function handleLiquidate(disbursementId: number) {
    if (!receiptFile) {
      return setMsg({ kind: "error", title: "No receipt photo selected", body: "Attach a receipt photo or click a sample below." });
    }

    setBusy(true);
    setMsg({
      kind: "wait",
      title: "Gemini 3.5 Flash Auditing Receipt...",
      body: "AI is inspecting store name, items, date, and totals to verify they match the relief purpose.",
    });

    try {
      const form = new FormData();
      form.append("receipt", receiptFile);
      form.append("disbursementId", String(disbursementId));

      const res = await fetch(`${CONFIG.api}/api/liquidate`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Receipt check failed.");

      const item = data.item as DisbursementItem;
      if (item.status === 1) {
        setMsg({
          kind: "success",
          title: "✅ 100% Accounted & Verified by Gemini",
          body: `Gemini verified ${item.merchant || "the store"} receipt. Disbursed funds are now fully accounted for!`,
        });
      } else {
        setMsg({
          kind: "error",
          title: "⚠️ Audit Flagged / Discrepancy",
          body: item.note,
        });
      }

      setReceiptFile(null);
      setSelectedDisbursementId(null);
      await fetchDisbursements();
      onChanged();
    } catch (err: any) {
      setMsg({ kind: "error", title: "Audit failed", body: err.message });
    } finally {
      setBusy(false);
    }
  }

  function loadSample(kind: "matching" | "mismatch") {
    const f = createSampleReceiptImage(kind);
    setReceiptFile(f);
    if (kind === "matching") {
      setMsg({ kind: "info", title: "Attached Sample 1: Matching Grocery Receipt (₱500.00)" });
    } else {
      setMsg({
        kind: "info",
        title: "Attached Sample 2: Mismatching Electronics Receipt (₱1,500.00)",
        body: "Watch Gemini flag this discrepancy!",
      });
    }
  }

  const selectedCampaign = myCampaigns.find((c) => c.id === Number(campaignId));
  const availableInSafe = selectedCampaign ? Math.max(0, selectedCampaign.raised - selectedCampaign.spent) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Organization Verified Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 border-2 border-evergreen/15 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint text-evergreen font-bold text-section">
            <Building2 className="h-6 w-6 text-evergreen" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-section font-extrabold text-evergreen">
                {user.organizationName}
              </h1>
              <span className="rounded-full bg-passed/10 px-2.5 py-0.5 text-xs font-bold text-passed border border-passed/30 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified Non-Profit
              </span>
            </div>
            <p className="text-xs text-evergreen/70">
              Account Owner: <strong className="text-evergreen">{user.name}</strong> ({user.email})
            </p>
            {user.organizationDescription && (
              <p className="text-xs text-evergreen/80 mt-1 max-w-xl italic">
                "{user.organizationDescription}"
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-paper px-4 py-2 border border-evergreen/10 text-right">
          <p className="text-[11px] font-semibold text-evergreen/60 uppercase">Your Organization's Drives</p>
          <p className="text-section font-black text-evergreen">{myCampaigns.length}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 pt-1 border-b border-evergreen/10">
        <button
          onClick={() => setActiveTab("drives")}
          className={`btn text-xs py-2 px-4 rounded-b-none ${
            activeTab === "drives" ? "btn-primary" : "btn-secondary"
          }`}
        >
          <FolderPlus className="h-4 w-4" />
          1. Manage Your Drives ({myCampaigns.length})
        </button>
        <button
          onClick={() => setActiveTab("advance")}
          className={`btn text-xs py-2 px-4 rounded-b-none ${
            activeTab === "advance" ? "btn-primary" : "btn-secondary"
          }`}
        >
          <Upload className="h-4 w-4" />
          2. Disburse Advance Funds
        </button>
        <button
          onClick={() => setActiveTab("liquidate")}
          className={`btn text-xs py-2 px-4 rounded-b-none ${
            activeTab === "liquidate" ? "btn-primary" : "btn-secondary"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          3. Liquidate Receipts ({myDisbursements.filter((d) => d.status === 0).length} pending)
        </button>
      </div>

      {/* Notifications */}
      {msg && (
        <Notice kind={msg.kind} title={msg.title}>
          {msg.body}
        </Notice>
      )}

      {/* TAB 1: DRIVES CRUD */}
      {activeTab === "drives" && (
        <div className="space-y-6">
          {/* Create New Donation Drive Form */}
          <section className="card space-y-4 border-2 border-evergreen/15">
            <div className="flex items-center gap-2 border-b border-evergreen/10 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mint text-small font-bold text-evergreen">
                +
              </span>
              <div>
                <h2 className="text-section font-bold text-evergreen">
                  Launch a New Donation Drive for {user.organizationName}
                </h2>
                <p className="text-xs text-evergreen/70">
                  Specify the relief purpose so donors can track where their money goes.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateDrive} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="driveOrg" className="label">
                    Organization
                  </label>
                  <input
                    id="driveOrg"
                    className="field bg-paper/60 cursor-not-allowed font-semibold text-evergreen/80"
                    value={user.organizationName}
                    readOnly
                    disabled
                  />
                  <p className="text-[11px] text-evergreen/60 mt-1">Locked to your verified organization.</p>
                </div>

                <div>
                  <label htmlFor="driveName" className="label">
                    Drive Title / Campaign Name
                  </label>
                  <input
                    id="driveName"
                    className="field"
                    value={newDriveName}
                    onChange={(e) => setNewDriveName(e.target.value)}
                    placeholder="e.g. Typhoon Relief Food & Medical Packs"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="drivePurpose" className="label">
                  Stated Purpose of this Drive (What will the funds buy?)
                </label>
                <textarea
                  id="drivePurpose"
                  className="field min-h-20"
                  value={newDrivePurpose}
                  onChange={(e) => setNewDrivePurpose(e.target.value)}
                  placeholder="Explain exactly how donations will be used (e.g. Procuring 1,000 sacks of 5kg rice, bottled drinking water, and hygiene kits for evacuation centers)."
                  required
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs text-evergreen font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useOnChain}
                    onChange={(e) => setUseOnChain(e.target.checked)}
                    className="h-4 w-4 rounded border-evergreen/30"
                  />
                  <span>Publish directly on BNB Chain Smart Contract (Requires MetaMask Gas)</span>
                </label>

                <button className="btn btn-primary text-small" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                  Launch Donation Drive
                </button>
              </div>
            </form>
          </section>

          {/* Edit Drive Modal / Card */}
          {editingDrive && (
            <section className="card space-y-4 border-2 border-passed bg-passed/5">
              <div className="flex items-center justify-between border-b border-passed/20 pb-2">
                <h3 className="font-bold text-evergreen flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-passed" />
                  Edit Drive #{editingDrive.id}: {editingDrive.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingDrive(null)}
                  className="text-xs font-semibold text-evergreen/60 hover:text-evergreen"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleUpdateDrive} className="space-y-3">
                <div>
                  <label className="label">Drive Title</label>
                  <input
                    className="field"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">Stated Purpose</label>
                  <textarea
                    className="field min-h-16"
                    value={editPurpose}
                    onChange={(e) => setEditPurpose(e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDrive(null)}
                    className="btn btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary text-xs" disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* List of Existing Drives (CRUD Read, Update, Toggle) */}
          <section className="card space-y-4 border-2 border-evergreen/15">
            <div className="flex items-center justify-between border-b border-evergreen/10 pb-3">
              <h2 className="text-section font-bold text-evergreen">
                Your Organization's Drives ({myCampaigns.length})
              </h2>
              <span className="text-xs text-evergreen/60">
                Only {user.organizationName} drives appear in your portal
              </span>
            </div>

            {myCampaigns.length === 0 ? (
              <div className="p-6 text-center text-small text-evergreen/70 space-y-2">
                <p>No donation drives created for <strong>{user.organizationName}</strong> yet.</p>
                <p className="text-xs">Use the form above to launch your organization's first campaign!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myCampaigns.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-xl border p-4 transition-all ${
                      c.active ? "border-evergreen/20 bg-white" : "border-attention/20 bg-paper/60 opacity-80"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-mint px-2 py-0.5 text-xs font-bold text-evergreen flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" /> {c.organization}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              c.active
                                ? "bg-passed/10 text-passed border border-passed/30"
                                : "bg-attention/10 text-attention border border-attention/30"
                            }`}
                          >
                            {c.active ? "Active" : "Paused"}
                          </span>
                        </div>
                        <h3 className="font-bold text-body text-evergreen">{c.name}</h3>
                        <p className="text-xs text-evergreen/80 max-w-prose">
                          <strong className="text-evergreen">Purpose:</strong> {c.purpose || "Relief distribution and charity operations"}
                        </p>
                        <p className="text-[11px] font-mono text-evergreen/60">
                          Organizer safe: {short(c.organizer)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <p className="text-xs text-evergreen/60">Raised / Disbursed</p>
                          <p className="text-small font-bold text-evergreen">
                            {fmt(c.raised)} <span className="text-xs text-passed">({fmt(c.spent)} disbursed)</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(c)}
                            className="btn btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-evergreen/70" />
                            Edit Details
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(c)}
                            className={`btn text-xs py-1 px-2.5 inline-flex items-center gap-1 ${
                              c.active ? "btn-secondary text-attention" : "btn-primary text-xs"
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                            {c.active ? "Pause" : "Activate"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: ADVANCE DISBURSEMENT */}
      {activeTab === "advance" && (
        <section className="card space-y-4 border-2 border-evergreen/15">
          <div className="flex items-center gap-2 border-b border-evergreen/10 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mint text-small font-bold text-evergreen">
              2
            </span>
            <div>
              <h2 className="text-section font-bold text-evergreen">Disburse Advance Funds (Need Money Upfront)</h2>
              <p className="text-xs text-evergreen/70">
                In disaster relief, you can release money directly to the organizer or supplier for immediate procurement.
              </p>
            </div>
          </div>

          {myCampaigns.length === 0 ? (
            <p className="text-small text-evergreen/70">
              You have no drives registered yet. Create a drive in Tab 1 first before requesting advances.
            </p>
          ) : (
            <form onSubmit={handleDisburse} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="camp" className="label">
                    Target Donation Drive
                  </label>
                  <select
                    id="camp"
                    className="field"
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    required
                  >
                    {myCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-passed font-semibold">Available in Safe: {fmt(availableInSafe)}</p>
                </div>

                <div>
                  <label htmlFor="amt" className="label">
                    Advance Amount (PHP)
                  </label>
                  <input
                    id="amt"
                    className="field font-bold"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="purpose" className="label">
                  Stated Purchase Purpose (What will be bought?)
                </label>
                <input
                  id="purpose"
                  className="field"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. 5 bags 5kg rice and canned goods for disaster relief"
                  required
                />
              </div>

              <div>
                <label htmlFor="payout" className="label">
                  Disburse directly to (Organizer / Supplier Account)
                </label>
                <input
                  id="payout"
                  className="field text-small"
                  value={supplierQrAccount}
                  onChange={(e) => setSupplierQrAccount(e.target.value)}
                  placeholder="GCash / Maya account or 0x wallet"
                  required
                />
              </div>

              <button className="btn btn-primary w-full" disabled={busy}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                Disburse Funds for Emergency Purchase ({fmt(Number(amount) || 0)})
              </button>
            </form>
          )}
        </section>
      )}

      {/* TAB 3: RECEIPT LIQUIDATION */}
      {activeTab === "liquidate" && (
        <section className="card space-y-4 border-2 border-evergreen/15" aria-labelledby="liquidation-h">
          <div className="flex items-center gap-2 border-b border-evergreen/10 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mint text-small font-bold text-evergreen">
              3
            </span>
            <div>
              <h2 id="liquidation-h" className="text-section font-bold text-evergreen">
                Liquidate Expenses for {user.organizationName}
              </h2>
              <p className="text-xs text-evergreen/70">
                Upload the store receipt for disbursed money. Gemini 3.5 Flash will audit the items and total to turn status into '100% Accounted'.
              </p>
            </div>
          </div>

          {/* Quick Sample Receipts Bar */}
          <div className="rounded-xl bg-paper p-3 space-y-2">
            <p className="text-xs font-bold text-evergreen flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-wait" />
              1-Click Sample Receipts for Demonstration:
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn btn-secondary flex-1 text-xs py-1"
                onClick={() => loadSample("matching")}
              >
                ✅ Use Matching Sample (Grocery ₱500.00)
              </button>
              <button
                type="button"
                className="btn btn-secondary flex-1 text-xs py-1"
                onClick={() => loadSample("mismatch")}
              >
                ❌ Use Mismatch Sample (Electronics ₱1,500.00)
              </button>
            </div>
          </div>

          {/* Disbursement List for THIS organization only */}
          <div className="space-y-3">
            {myDisbursements.length === 0 ? (
              <p className="text-small text-evergreen/70">
                No active disbursements for {user.organizationName}. Request an advance in Tab 2 first!
              </p>
            ) : (
              myDisbursements.map((d) => (
                <div
                  key={d.id}
                  className={`space-y-3 rounded-xl border-2 p-4 transition-all ${
                    d.status === 0
                      ? "border-wait/40 bg-wait/5"
                      : d.status === 1
                      ? "border-passed/40 bg-passed/5"
                      : "border-attention/40 bg-attention/5"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-body">{d.purpose}</h3>
                      <p className="text-xs text-evergreen/70">
                        Disbursed on {d.createdAt} to {short(d.recipient)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-section font-extrabold">{fmt(d.amount)}</span>
                      <div className="mt-1">
                        <StatusBadge status={d.status} />
                      </div>
                    </div>
                  </div>

                  {d.note && <p className="text-xs font-semibold text-evergreen/90">{d.note}</p>}

                  {/* If verified by Gemini, show merchant and item breakdown */}
                  {d.merchant && d.items && d.items.length > 0 && (
                    <div className="rounded-lg border border-evergreen/10 bg-white p-2.5 text-xs">
                      <p className="font-bold text-evergreen">Store: {d.merchant}</p>
                      <ul className="mt-1 space-y-0.5 text-evergreen/80">
                        {d.items.map((it, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>
                              {it.qty}x {it.name}
                            </span>
                            <span className="font-mono">₱{it.price}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* If still awaiting receipt, show upload input */}
                  {d.status === 0 && (
                    <div className="border-t border-evergreen/10 pt-3 space-y-2">
                      <label className="text-xs font-bold text-evergreen">Upload Store Receipt for this ₱{d.amount}:</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="field py-2 text-xs flex-1"
                          onChange={(e) => {
                            setSelectedDisbursementId(d.id);
                            setReceiptFile(e.target.files?.[0] ?? null);
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-primary text-xs shrink-0"
                          onClick={() => handleLiquidate(d.id)}
                          disabled={busy}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          Submit & Verify with Gemini AI
                        </button>
                      </div>
                      {receiptFile && selectedDisbursementId === d.id && (
                        <p className="text-xs text-passed font-semibold">Attached: {receiptFile.name}</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
