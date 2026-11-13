import { run } from "hardhat";
import fs from "fs";

async function verify(address: string, constructorArguments: unknown[]) {
  try {
    await run("verify:verify", { address, constructorArguments });
    console.log("Verified:", address);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg.toLowerCase().includes("already verified")) console.log("Already verified:", address);
    else console.error("Verification failed for", address, "\n", msg);
  }
}

async function main() {
  const d = JSON.parse(fs.readFileSync("deployments/bscTestnet.json", "utf8"));
  await verify(d.token, []);
  await verify(d.giveClear, [d.token, d.approver]);
}

main();
