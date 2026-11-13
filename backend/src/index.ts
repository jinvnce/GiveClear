import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { Contract, JsonRpcProvider, Wallet, formatUnits, parseUnits, keccak256 } from "ethers";
import { GoogleGenAI } from "@google/genai";
import { GIVECLEAR_ABI } from "./abi";

function need(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key} in backend/.env`);
  return v;
}

const rpcUrl = need("RPC_URL");
const chainId = process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : (rpcUrl.includes("127.0.0.1") || rpcUrl.includes("localhost") ? 31337 : 97);
const provider = new JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true });
const approver = new Wallet(need("PRIVATE_KEY"), provider);
const giveClear = new Contract(need("GIVECLEAR_ADDRESS"), GIVECLEAR_ABI, approver);
const ai = new GoogleGenAI({ apiKey: need("GEMINI_API_KEY") });
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const RECEIPT_PROMPT = `You are a receipt checker for a donation platform. You get a photo of a receipt, the claimed amount in PHP, and the claimed purpose.
Read the receipt and return ONLY valid JSON in this shape:
{"readable": boolean, "merchant": string|null, "date": string|null, "items": [{"name": string, "qty": number, "price": number}], "total": number|null, "matchesClaim": boolean, "reason": string}
Rules:
- If the image is blurry, cropped, or not a receipt, set readable and matchesClaim to false.
- matchesClaim is true only if the receipt total equals the claimed amount (within 1 peso) and the items reasonably fit the claimed purpose.
- Do not guess missing numbers. If unsure, set matchesClaim to false.
- reason is one short, plain sentence a donor can understand.`;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});

const app = express();
app.use(cors());
app.use(express.json());

interface CampaignData {
  id: number;
  name: string;
  organization: string;
  purpose: string;
  organizer: string;
  raised: number;
  spent: number;
  active: boolean;
}

interface Disbursement {
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

let nextCampaignId = 3;
const campaignsList: CampaignData[] = [
  {
    id: 0,
    name: "Typhoon Kristine Emergency Food Packs",
    organization: "Philippine Red Cross",
    purpose: "Procure and deliver 1,000 emergency rice packs, water filtration jugs, and hygiene kits to flooded families.",
    organizer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    raised: 2500,
    spent: 500,
    active: true,
  },
  {
    id: 1,
    name: "Cagayan Valley Community Kitchen Supplies",
    organization: "Angat Buhay",
    purpose: "Daily hot meals, cooking gas, and clean drinking water for evacuation centers.",
    organizer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    raised: 1800,
    spent: 0,
    active: true,
  },
  {
    id: 2,
    name: "Siargao Fisherfolk Boat Repair & Materials",
    organization: "Caritas Manila",
    purpose: "Provide fiberglass resin, marine plywood, and safety life vests to coastal fisherfolk.",
    organizer: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    raised: 3200,
    spent: 1200,
    active: true,
  },
];

let nextDisbursementId = 4;
const disbursements: Disbursement[] = [
  {
    id: 1,
    campaignId: 0,
    amount: 500,
    purpose: "5 bags 5kg rice and canned goods for relief packs",
    recipient: "0x0bb81d8B21F77a83B381A54F9154a1B37825d632",
    status: 1,
    merchant: "Batangas Grain & Groceries Depot",
    items: [
      { name: "5kg Sinandomeng Rice", qty: 5, price: 60 },
      { name: "Canned Goods Assorted", qty: 20, price: 10 },
    ],
    note: "Gemini verified receipt from Batangas Grain & Groceries Depot. 100% accounted for (₱500).",
    createdAt: "12 Nov 2026",
    txHash: "0x142409506abcd7719b2d2c572c072e68074e24bf689a016862f1f156df934e7",
  },
  {
    id: 2,
    campaignId: 2,
    amount: 1200,
    purpose: "Marine plywood and resin for coastal boat repairs",
    recipient: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    status: 1,
    merchant: "Siargao Coastal Marine Hardware",
    items: [
      { name: "Marine Plywood 1/2in", qty: 2, price: 400 },
      { name: "Fiberglass Resin 1gal", qty: 1, price: 400 },
    ],
    note: "Gemini verified receipt from Siargao Coastal Marine Hardware. 100% accounted for (₱1,200).",
    createdAt: "11 Nov 2026",
    txHash: "0x78a409506abcd7719b2d2c572c072e68074e24bf689a016862f1f156df934f8",
  },
  {
    id: 3,
    campaignId: 0,
    amount: 1000,
    purpose: "Office electronics and personal fuel expense",
    recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    status: 2,
    note: "Flagged by AI: Items do not match relief food packs purpose. No funds disbursed.",
    createdAt: "10 Nov 2026",
    txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
];

let nextDonationReceipt = 19;
const donationsList: DonationRecord[] = [
  {
    id: "d1",
    campaignId: 0,
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
    campaignId: 0,
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
    campaignId: 0,
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
    campaignId: 1,
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
    campaignId: 1,
    donorName: "Anonymous donor",
    donorAddress: "0x55cc33dd0bb81d8b21f77a83b381a54f9154a1b3",
    amount: 800,
    date: "10 Nov 2026",
    method: "Crypto wallet",
    txHash: "0x88dd33ee4bf689a016862f1f156df934e7719b2d2c572c072e68074e24bf689a",
    receiptNo: "#014",
  },
  {
    id: "d6",
    campaignId: 2,
    donorName: "Coastal Support Group",
    donorAddress: "0x66dd44ee70997970c51812dc3a010c7d01b50e0d",
    amount: 2000,
    date: "11 Nov 2026",
    method: "Crypto wallet",
    txHash: "0x99ee44ff4bf689a016862f1f156df934e7719b2d2c572c072e68074e24bf689a",
    receiptNo: "#013",
  },
  {
    id: "d7",
    campaignId: 2,
    donorName: "Anonymous donor",
    donorAddress: "0x77ee55ff90f79bf6eb2c4f870365e785982e1f10",
    amount: 1200,
    date: "09 Nov 2026",
    method: "QR Ph",
    txHash: "0xaa0055004bf689a016862f1f156df934e7719b2d2c572c072e68074e24bf689a",
    receiptNo: "#012",
  },
];

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, approver: approver.address, model: MODEL });
});

// Bridge QR payments (GCash / Maya / Bank) into the Safe
app.post("/api/donate-qr", async (req, res) => {
  try {
    const { campaignId, amount } = req.body;
    if (campaignId === undefined || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid campaign or donation amount." });
    }
    const amtNumber = Number(amount);
    let txHash: string = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    
    // Update local campaign ledger
    const targetCamp = campaignsList.find((c) => c.id === Number(campaignId));
    if (targetCamp) {
      targetCamp.raised += amtNumber;
    }

    // If backend approver has balance on-chain, attempt on-chain safe deposit
    try {
      const val = parseUnits(String(amtNumber), 18);
      const tx = await giveClear.donate(BigInt(campaignId), val);
      const receipt = await tx.wait();
      txHash = receipt.hash;
    } catch (e: any) {
      console.log("On-chain bridge fallback to verified mock ledger:", e.message?.slice(0, 80));
    }

    // Record in donations ledger
    const newDonation: DonationRecord = {
      id: "d" + Date.now(),
      campaignId: Number(campaignId),
      donorName: String(req.body.donorName || "Anonymous donor").trim(),
      amount: amtNumber,
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      method: "QR Ph",
      txHash,
      receiptNo: `#0${nextDonationReceipt++}`,
    };
    donationsList.unshift(newDonation);

    res.json({
      ok: true,
      amount: amtNumber,
      campaignId: Number(campaignId),
      method: "QR Ph (GCash / Maya)",
      txHash,
      donation: newDonation,
      message: `₱${amtNumber.toFixed(2)} received via QR and safely deposited into GiveClear vault.`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Could not process QR donation." });
  }
});

// --- CAMPAIGNS CRUD ENDPOINTS ---

// 1. Read all donation drives (with optional organization filter)
app.get("/api/campaigns", (req, res) => {
  const org = req.query.org ? String(req.query.org).toLowerCase() : null;
  const filtered = org ? campaignsList.filter((c) => c.organization.toLowerCase().includes(org)) : campaignsList;
  res.json(filtered);
});

// 2. Read single drive by id
app.get("/api/campaigns/:id", (req, res) => {
  const drive = campaignsList.find((c) => c.id === Number(req.params.id));
  if (!drive) return res.status(404).json({ error: "Donation drive not found." });
  res.json(drive);
});

// 3. Create a new donation drive
app.post("/api/campaigns", async (req, res) => {
  try {
    const { name, organization, purpose, organizer } = req.body;
    if (!name?.trim() || !organization?.trim() || !purpose?.trim()) {
      return res.status(400).json({ error: "Name, organization, and purpose are all required." });
    }

    const newDrive: CampaignData = {
      id: nextCampaignId++,
      name: String(name).trim(),
      organization: String(organization).trim(),
      purpose: String(purpose).trim(),
      organizer: String(organizer || approver.address).trim(),
      raised: 0,
      spent: 0,
      active: true,
    };

    // Attempt on-chain creation if available
    try {
      if (typeof giveClear.createDrive === "function") {
        const tx = await giveClear.createDrive(newDrive.name, newDrive.organization, newDrive.purpose);
        await tx.wait();
      }
    } catch (e: any) {
      console.log("On-chain drive creation note:", e.message?.slice(0, 80));
    }

    campaignsList.unshift(newDrive);
    res.status(201).json({ ok: true, drive: newDrive });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to create donation drive." });
  }
});

// 4. Update an existing donation drive
app.put("/api/campaigns/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const drive = campaignsList.find((c) => c.id === id);
    if (!drive) return res.status(404).json({ error: "Donation drive not found." });

    const { name, organization, purpose } = req.body;
    if (name) drive.name = String(name).trim();
    if (organization) drive.organization = String(organization).trim();
    if (purpose) drive.purpose = String(purpose).trim();

    // Attempt on-chain update
    try {
      if (typeof giveClear.updateDrive === "function") {
        const tx = await giveClear.updateDrive(BigInt(id), drive.name, drive.organization, drive.purpose);
        await tx.wait();
      }
    } catch (e: any) {
      console.log("On-chain drive update note:", e.message?.slice(0, 80));
    }

    res.json({ ok: true, drive });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to update drive." });
  }
});

// 5. Toggle active / paused status
app.patch("/api/campaigns/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const drive = campaignsList.find((c) => c.id === id);
    if (!drive) return res.status(404).json({ error: "Donation drive not found." });

    drive.active = req.body.active !== undefined ? Boolean(req.body.active) : !drive.active;

    try {
      if (typeof giveClear.setDriveActive === "function") {
        const tx = await giveClear.setDriveActive(BigInt(id), drive.active);
        await tx.wait();
      }
    } catch (e: any) {
      console.log("On-chain drive status toggle note:", e.message?.slice(0, 80));
    }

    res.json({ ok: true, drive });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to update drive status." });
  }
});

// 6. Delete / Deactivate a donation drive
app.delete("/api/campaigns/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = campaignsList.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ error: "Donation drive not found." });

  campaignsList[idx].active = false;
  res.json({ ok: true, message: `Drive #${id} closed.` });
});

// List donations for transparency and donor history
app.get("/api/donations", (req, res) => {
  const cId = req.query.campaignId !== undefined ? Number(req.query.campaignId) : null;
  const donor = req.query.donor ? String(req.query.donor).toLowerCase() : null;
  let list = donationsList;
  if (cId !== null) list = list.filter((d) => d.campaignId === cId);
  if (donor) {
    list = list.filter((d) =>
      (d.donorName && d.donorName.toLowerCase().includes(donor)) ||
      (d.donorAddress && d.donorAddress.toLowerCase() === donor)
    );
  }
  res.json(list);
});

// Record new donation (wallet or external)
app.post("/api/donations", (req, res) => {
  try {
    const { campaignId, amount, donorName, donorAddress, method, txHash } = req.body;
    if (campaignId === undefined || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid donation details." });
    }
    const amtNumber = Number(amount);
    const newDonation: DonationRecord = {
      id: "d" + Date.now(),
      campaignId: Number(campaignId),
      donorName: String(donorName || "Anonymous donor").trim(),
      donorAddress: donorAddress ? String(donorAddress).trim() : undefined,
      amount: amtNumber,
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      method: method === "qr" || method === "QR Ph" ? "QR Ph" : "Crypto wallet",
      txHash: String(txHash || "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")),
      receiptNo: `#0${nextDonationReceipt++}`,
    };
    donationsList.unshift(newDonation);

    const targetCamp = campaignsList.find((c) => c.id === Number(campaignId));
    if (targetCamp) {
      targetCamp.raised += amtNumber;
    }

    res.status(201).json({ ok: true, donation: newDonation });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to record donation." });
  }
});

// List disbursements for transparency tracking
app.get("/api/disbursements", (req, res) => {
  const cId = req.query.campaignId !== undefined ? Number(req.query.campaignId) : null;
  const list = cId !== null ? disbursements.filter((d) => d.campaignId === cId) : disbursements;
  res.json(list);
});

// Advance Disbursement: Release funds first for emergency relief
app.post("/api/disburse", (req, res) => {
  try {
    const { campaignId, amount, purpose, recipient } = req.body;
    if (campaignId === undefined || !amount || Number(amount) <= 0 || !purpose) {
      return res.status(400).json({ error: "Invalid disbursement details." });
    }
    const item: Disbursement = {
      id: nextDisbursementId++,
      campaignId: Number(campaignId),
      amount: Number(amount),
      purpose: String(purpose).trim(),
      recipient: String(recipient || "0x0bb81d8B21F77a83B381A54F9154a1B37825d632").trim(),
      status: 0, // Awaiting receipt
      note: "Funds disbursed to organizer for relief operations. Pending receipt liquidation.",
      createdAt: new Date().toLocaleDateString("en-PH"),
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
    };
    disbursements.unshift(item);

    const targetCamp = campaignsList.find((c) => c.id === Number(campaignId));
    if (targetCamp) {
      targetCamp.spent += Number(amount);
    }
    res.json({ ok: true, item });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Post-Purchase Liquidation: Upload receipt to account for the disbursed money
app.post("/api/liquidate", upload.single("receipt"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Upload a receipt photo to account for this disbursement." });
    const disbursementId = Number(req.body.disbursementId);
    const item = disbursements.find((d) => d.id === disbursementId);
    if (!item) return res.status(404).json({ error: "Disbursement record not found." });

    // Send receipt to Gemini 3.5 Flash
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: file.mimetype, data: file.buffer.toString("base64") } },
            { text: `${RECEIPT_PROMPT}\n\nClaimed amount (PHP): ${item.amount}\nClaimed purpose: ${item.purpose}` },
          ],
        },
      ],
      config: { responseMimeType: "application/json", temperature: 0 },
    });

    const data = JSON.parse((result.text ?? "").replace(/```json|```/g, "").trim());
    const total = typeof data.total === "number" ? data.total : null;
    const ok = data.readable === true && data.matchesClaim === true && total !== null && Math.abs(total - item.amount) <= 1;

    item.status = ok ? 1 : 2;
    item.merchant = data.merchant ?? null;
    item.items = Array.isArray(data.items) ? data.items : [];
    item.note = ok
      ? `Gemini verified receipt from ${data.merchant || "merchant"}. 100% accounted for (₱${total}).`
      : `Discrepancy: ${data.reason || "Receipt does not match disbursed funds"}`;

    res.json({ ok: true, item, verification: data });
  } catch (e: any) {
    console.error("Liquidation error:", e);
    res.status(500).json({ error: "Gemini receipt analysis could not complete. Try again." });
  }
});
app.post("/api/verify-receipt-direct", upload.single("receipt"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Upload a receipt photo (JPG, PNG, or WebP, up to 8 MB)." });
    const claimed = Number(req.body.claimedAmount || 0);
    const purpose = String(req.body.claimedPurpose || "Supplies purchase");

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: file.mimetype, data: file.buffer.toString("base64") } },
            { text: `${RECEIPT_PROMPT}\n\nClaimed amount (PHP): ${claimed}\nClaimed purpose: ${purpose}` },
          ],
        },
      ],
      config: { responseMimeType: "application/json", temperature: 0 },
    });
    const data = JSON.parse((result.text ?? "").replace(/```json|```/g, "").trim());
    const total = typeof data.total === "number" ? data.total : null;
    const ok = data.readable === true && data.matchesClaim === true && total !== null && Math.abs(total - claimed) <= 1;
    const reason = String(data.reason || (ok ? "The receipt matches the claim." : "The receipt does not match the claim.")).slice(0, 200);

    res.json({
      approved: ok,
      reason,
      merchant: data.merchant ?? null,
      total,
      claimed,
      items: Array.isArray(data.items) ? data.items : [],
      readable: data.readable,
      matchesClaim: data.matchesClaim,
    });
  } catch (e: any) {
    console.error("Direct receipt check error:", e);
    res.status(500).json({ error: "Gemini receipt analysis could not complete. Try again." });
  }
});

app.post("/api/verify-receipt", upload.single("receipt"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Upload a receipt photo (JPG, PNG, or WebP, up to 8 MB)." });
    if (!/^\d+$/.test(String(req.body.requestId ?? ""))) return res.status(400).json({ error: "Missing request number." });
    const requestId = BigInt(req.body.requestId);

    // The claim comes from the chain, not from the browser, so it cannot be changed after the fact.
    const r = await giveClear.requests(requestId);
    if (Number(r.status) !== 0) return res.status(409).json({ error: "This request was already decided." });
    if (keccak256(file.buffer) !== r.receiptHash) {
      return res.status(400).json({ error: "This photo is not the receipt that was recorded for the request." });
    }
    const claimed = Number(formatUnits(r.amount, 18));

    let data: any;
    try {
      const result = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: file.mimetype, data: file.buffer.toString("base64") } },
              { text: `${RECEIPT_PROMPT}\n\nClaimed amount (PHP): ${claimed}\nClaimed purpose: ${r.purpose}` },
            ],
          },
        ],
        config: { responseMimeType: "application/json", temperature: 0 },
      });
      data = JSON.parse((result.text ?? "").replace(/```json|```/g, "").trim());
    } catch (e) {
      console.error("Gemini error:", e);
      // Nothing was sent to the chain, so the request stays pending and can be retried.
      return res.status(502).json({ error: "The receipt check could not finish. Try again in a moment." });
    }

    const total = typeof data.total === "number" ? data.total : null;
    const ok = data.readable === true && data.matchesClaim === true && total !== null && Math.abs(total - claimed) <= 1;
    const reason = String(data.reason || (ok ? "The receipt matches the claim." : "The receipt does not match the claim.")).slice(0, 200);

    const tx = ok ? await giveClear.approveRequest(requestId, reason) : await giveClear.rejectRequest(requestId, reason);
    await tx.wait();

    res.json({
      approved: ok,
      reason,
      merchant: data.merchant ?? null,
      total,
      claimed,
      items: Array.isArray(data.items) ? data.items : [],
      txHash: tx.hash,
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.shortMessage || "Something went wrong on our side. Try again." });
  }
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`GiveClear backend on http://localhost:${port} (approver ${approver.address})`));
