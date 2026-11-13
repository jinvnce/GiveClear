import { Contract, EventLog, JsonRpcProvider, formatUnits } from "ethers";
import { CONFIG } from "./config";
import { GIVECLEAR_ABI } from "./abi";

export const readProvider = new JsonRpcProvider(CONFIG.rpc, CONFIG.chainId, { staticNetwork: true });
export const readContract = new Contract(CONFIG.giveClear, GIVECLEAR_ABI, readProvider);

export type Campaign = {
  id: number;
  name: string;
  organization: string;
  purpose: string;
  organizer: string;
  raised: number;
  spent: number;
  active: boolean;
};

export type Req = {
  id: number;
  campaignId: number;
  amount: number;
  recipient: string;
  purpose: string;
  status: 0 | 1 | 2; // 0 waiting, 1 paid, 2 rejected
  note: string;
  txHash?: string;
};

const num = (v: bigint) => Number(formatUnits(v, 18));

export async function loadCampaigns(): Promise<Campaign[]> {
  try {
    const n = Number(await readContract.campaignCount());
    if (n > 0) {
      const all = await Promise.all(
        Array.from({ length: n }, async (_, i) => {
          try {
            const c = await readContract.campaigns(i);
            const hasOrg = c.organization !== undefined;
            return {
              id: i,
              name: (c.name ?? c[0] ?? `Donation Drive #${i + 1}`) as string,
              organization: (hasOrg ? c.organization : c.length > 4 ? c[1] : "Philippine Red Cross") as string,
              purpose: (hasOrg ? c.purpose : c.length > 4 ? c[2] : "Emergency relief and food distribution") as string,
              organizer: (hasOrg ? c.organizer : c.length > 4 ? c[3] : c[1]) as string,
              raised: num(hasOrg ? c.raised : c.length > 4 ? c[4] : c[2]),
              spent: num(hasOrg ? c.spent : c.length > 4 ? c[5] : c[3]),
              active: c.active !== undefined ? Boolean(c.active) : true,
            } as Campaign;
          } catch {
            return null;
          }
        })
      );
      const valid = all.filter((x): x is Campaign => x !== null);
      if (valid.length > 0) return valid;
    }
  } catch (e) {
    console.warn("Chain campaigns read note:", e);
  }

  // Fallback / sync from backend API (supports demo mode & zero-gas drive creation)
  try {
    const res = await fetch(`${CONFIG.api}/api/campaigns`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {
    // backend unreachable
  }

  return [
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
  ];
}

// Public RPCs limit log ranges, so we read in small chunks starting at the deploy block.
async function releasedTxs(): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!CONFIG.deployBlock) return map;
  try {
    const latest = await readProvider.getBlockNumber();
    const step = 3000;
    for (let from = CONFIG.deployBlock; from <= latest; from += step) {
      const logs = await readContract.queryFilter(readContract.filters.Released(), from, Math.min(from + step - 1, latest));
      for (const l of logs) map.set(Number((l as EventLog).args[0]), l.transactionHash);
    }
  } catch {
    /* links are optional */
  }
  return map;
}

export async function loadRequests(campaignId: number): Promise<Req[]> {
  const n = Number(await readContract.requestCount());
  const all = await Promise.all(
    Array.from({ length: n }, async (_, i) => {
      const r = await readContract.requests(i);
      return {
        id: i,
        campaignId: Number(r.campaignId),
        amount: num(r.amount),
        recipient: r.recipient as string,
        purpose: r.purpose as string,
        status: Number(r.status) as 0 | 1 | 2,
        note: r.note as string,
      } as Req;
    })
  );
  const mine = all.filter((r) => r.campaignId === campaignId).reverse();
  if (mine.some((r) => r.status === 1)) {
    const txs = await releasedTxs();
    mine.forEach((r) => (r.txHash = txs.get(r.id)));
  }
  return mine;
}

export const txUrl = (hash: string) => CONFIG.explorer ? `${CONFIG.explorer}/tx/${hash}` : `#${hash}`;

export function friendly(e: any): string {
  if (e?.code === 4001 || e?.code === "ACTION_REJECTED") return "You cancelled the request in your wallet. Nothing was sent.";
  const msg: string = e?.reason || e?.shortMessage || e?.message || "Something went wrong.";
  if (/insufficient funds/i.test(msg)) return "Your wallet needs native currency (ETH / tBNB) to pay the network fee.";
  return msg.length > 200 ? msg.slice(0, 200) + "..." : msg;
}
