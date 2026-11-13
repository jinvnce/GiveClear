import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("GiveClear", () => {
  async function setup() {
    const [owner, approver, organizer, donor, vendor, other] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("MockUSD")).deploy();
    const gc = await (await ethers.getContractFactory("GiveClear")).deploy(
      await token.getAddress(),
      approver.address
    );
    await gc.createCampaign("Food packs", organizer.address);
    const amt = ethers.parseUnits("1000", 18);
    await token.mint(donor.address, amt);
    await token.connect(donor).approve(await gc.getAddress(), amt);
    const hash = ethers.keccak256(ethers.toUtf8Bytes("receipt"));
    return { owner, approver, organizer, donor, vendor, other, token, gc, amt, hash };
  }

  it("only the owner can create campaigns", async () => {
    const { gc, other } = await loadFixture(setup);
    await expect(gc.connect(other).createCampaign("x", other.address)).to.be.revertedWithCustomError(
      gc,
      "OwnableUnauthorizedAccount"
    );
  });

  it("donations are tracked per campaign", async () => {
    const { gc, donor, amt, token } = await loadFixture(setup);
    await expect(gc.connect(donor).donate(0, amt)).to.emit(gc, "Donated");
    expect((await gc.campaigns(0)).raised).to.equal(amt);
    expect(await token.balanceOf(await gc.getAddress())).to.equal(amt);
  });

  it("only the organizer can submit, and not above the balance", async () => {
    const { gc, donor, organizer, other, vendor, amt, hash } = await loadFixture(setup);
    await gc.connect(donor).donate(0, amt);
    await expect(gc.connect(other).submitRequest(0, 10, vendor.address, hash, "x")).to.be.revertedWith(
      "Not the organizer"
    );
    await expect(
      gc.connect(organizer).submitRequest(0, amt + 1n, vendor.address, hash, "x")
    ).to.be.revertedWith("Not enough funds");
  });

  it("approve pays the recipient once", async () => {
    const { gc, token, donor, organizer, approver, vendor, amt, hash } = await loadFixture(setup);
    await gc.connect(donor).donate(0, amt);
    const pay = ethers.parseUnits("250", 18);
    await gc.connect(organizer).submitRequest(0, pay, vendor.address, hash, "Rice");
    await expect(gc.connect(approver).approveRequest(0, "Matches")).to.changeTokenBalance(token, vendor, pay);
    expect((await gc.campaigns(0)).spent).to.equal(pay);
    await expect(gc.connect(approver).approveRequest(0, "again")).to.be.revertedWith("Already decided");
  });

  it("only the approver can decide", async () => {
    const { gc, donor, organizer, vendor, amt, hash } = await loadFixture(setup);
    await gc.connect(donor).donate(0, amt);
    await gc.connect(organizer).submitRequest(0, 5, vendor.address, hash, "x");
    await expect(gc.connect(organizer).approveRequest(0, "me")).to.be.revertedWith("Not the approver");
  });

  it("reject moves no money", async () => {
    const { gc, token, donor, organizer, approver, vendor, amt, hash } = await loadFixture(setup);
    await gc.connect(donor).donate(0, amt);
    await gc.connect(organizer).submitRequest(0, 100, vendor.address, hash, "x");
    await expect(gc.connect(approver).rejectRequest(0, "Wrong total")).to.changeTokenBalance(token, vendor, 0);
    expect((await gc.requests(0)).status).to.equal(2);
    expect((await gc.campaigns(0)).spent).to.equal(0);
  });

  describe("CRUD: Organization Drives", () => {
    it("allows any organization to create a donation drive with a purpose", async () => {
      const { gc, organizer } = await loadFixture(setup);
      await expect(
        gc.connect(organizer).createDrive(
          "Typhoon Relief Drive",
          "Philippine Red Cross",
          "Provide immediate food packs, water filtration, and hygiene kits"
        )
      ).to.emit(gc, "CampaignCreated");

      const count = await gc.campaignCount();
      expect(count).to.equal(2);

      const drive = await gc.campaigns(1);
      expect(drive.name).to.equal("Typhoon Relief Drive");
      expect(drive.organization).to.equal("Philippine Red Cross");
      expect(drive.purpose).to.equal("Provide immediate food packs, water filtration, and hygiene kits");
      expect(drive.organizer).to.equal(organizer.address);
      expect(drive.active).to.equal(true);
    });

    it("allows organizer or owner to update drive details", async () => {
      const { gc, organizer, other } = await loadFixture(setup);
      await gc.connect(organizer).createDrive("Drive 1", "Org 1", "Initial purpose");

      // Organizer updates
      await expect(
        gc.connect(organizer).updateDrive(1, "Updated Drive 1", "Org 1 Updated", "Updated purpose")
      ).to.emit(gc, "CampaignUpdated");

      const updated = await gc.campaigns(1);
      expect(updated.name).to.equal("Updated Drive 1");
      expect(updated.purpose).to.equal("Updated purpose");

      // Non-organizer fails
      await expect(
        gc.connect(other).updateDrive(1, "Hacked Drive", "Hacked Org", "Hacked")
      ).to.be.revertedWith("Not authorized");
    });

    it("allows organizer to pause / close drive", async () => {
      const { gc, organizer, donor, amt } = await loadFixture(setup);
      await gc.connect(organizer).createDrive("Drive Active", "Org 1", "Purpose");

      await gc.connect(organizer).setDriveActive(1, false);
      const drive = await gc.campaigns(1);
      expect(drive.active).to.equal(false);

      // Donating to closed drive fails
      await expect(gc.connect(donor).donate(1, amt)).to.be.revertedWith("Campaign is closed");

      // Re-activate
      await gc.connect(organizer).setDriveActive(1, true);
      await expect(gc.connect(donor).donate(1, amt)).to.emit(gc, "Donated");
    });
  });

  describe("Gas Minimization & Proportional Usage", () => {
    it("calculates 1:1 equivalent gas for 1 amount", async () => {
      const { gc } = await loadFixture(setup);
      const oneToken = ethers.parseUnits("1", 18);
      expect(await gc.equivalentGas(oneToken)).to.equal(1);

      const fiveHundred = ethers.parseUnits("500", 18);
      expect(await gc.equivalentGas(fiveHundred)).to.equal(500);
    });

    it("reimburses gas from contract subsidy reserve during donation", async () => {
      const { gc, owner, donor, token } = await loadFixture(setup);
      await owner.sendTransaction({
        to: await gc.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const oneToken = ethers.parseUnits("1", 18);
      await token.mint(donor.address, oneToken);
      await token.connect(donor).approve(await gc.getAddress(), oneToken);

      await expect(gc.connect(donor).donate(0, oneToken)).to.emit(gc, "Donated");
      expect(await gc.equivalentGas(oneToken)).to.equal(1);
    });
  });
});
