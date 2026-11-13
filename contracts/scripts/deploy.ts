import { ethers, network } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  const approver = process.env.APPROVER_ADDRESS || deployer.address;
  const organizer = process.env.ORGANIZER_ADDRESS || deployer.address;
  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);
  console.log("Approver:", approver);
  console.log("Organizer:", organizer);

  const token = await (await ethers.getContractFactory("MockUSD")).deploy();
  await token.waitForDeployment();
  const gc = await (await ethers.getContractFactory("GiveClear")).deploy(await token.getAddress(), approver);
  const receipt = await gc.deploymentTransaction()!.wait();
  const tokenAddress = await token.getAddress();
  const gcAddress = await gc.getAddress();

  for (const name of ["Food packs for 120 families", "School supplies drive", "Typhoon relief fund"]) {
    await (await gc.createCampaign(name, organizer)).wait();
  }
  await (await token.mint(deployer.address, ethers.parseUnits("10000", 18))).wait();

  const out = { token: tokenAddress, giveClear: gcAddress, approver, organizer, deployBlock: receipt!.blockNumber };
  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync(`deployments/${network.name}.json`, JSON.stringify(out, null, 2));
  fs.writeFileSync("deployments/bscTestnet.json", JSON.stringify(out, null, 2));
  console.log(out);
  console.log("\nDeployment completed successfully.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
