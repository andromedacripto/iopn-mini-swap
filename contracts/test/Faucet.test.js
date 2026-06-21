const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Faucet", function () {
  let token, faucet, owner, user1, user2;
  const CLAIM_AMOUNT = ethers.parseEther("10");
  const COOLDOWN = 24 * 60 * 60; // 24h em segundos
  const FAUCET_FUNDING = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const TestToken = await ethers.getContractFactory("TestToken");
    token = await TestToken.deploy("OPN Test Token A", "TKA", ethers.parseEther("100000"));
    await token.waitForDeployment();

    const Faucet = await ethers.getContractFactory("Faucet");
    faucet = await Faucet.deploy(await token.getAddress(), CLAIM_AMOUNT, COOLDOWN);
    await faucet.waitForDeployment();

    // financia o faucet (transferência simples do owner, sem mint extra)
    await token.transfer(await faucet.getAddress(), FAUCET_FUNDING);
  });

  it("deve permitir o primeiro claim de um usuário novo", async function () {
    await expect(faucet.connect(user1).claim())
      .to.emit(faucet, "Claimed");

    expect(await token.balanceOf(user1.address)).to.equal(CLAIM_AMOUNT);
  });

  it("deve bloquear um segundo claim antes do cooldown passar", async function () {
    await faucet.connect(user1).claim();

    await expect(faucet.connect(user1).claim())
      .to.be.revertedWith("Faucet: COOLDOWN_ACTIVE");
  });

  it("deve permitir novo claim após o cooldown passar", async function () {
    await faucet.connect(user1).claim();

    await ethers.provider.send("evm_increaseTime", [COOLDOWN + 1]);
    await ethers.provider.send("evm_mine");

    await expect(faucet.connect(user1).claim())
      .to.emit(faucet, "Claimed");

    expect(await token.balanceOf(user1.address)).to.equal(CLAIM_AMOUNT * 2n);
  });

  it("cooldown de uma carteira não deve afetar outra carteira", async function () {
    await faucet.connect(user1).claim();

    await expect(faucet.connect(user2).claim())
      .to.emit(faucet, "Claimed");
  });

  it("deve reverter quando o faucet está vazio", async function () {
    const Faucet = await ethers.getContractFactory("Faucet");
    const emptyFaucet = await Faucet.deploy(await token.getAddress(), CLAIM_AMOUNT, COOLDOWN);
    await emptyFaucet.waitForDeployment();

    await expect(emptyFaucet.connect(user1).claim())
      .to.be.revertedWith("Faucet: EMPTY");
  });

  it("timeUntilNextClaim deve retornar 0 para usuário que nunca fez claim", async function () {
    expect(await faucet.timeUntilNextClaim(user1.address)).to.equal(0);
  });

  it("timeUntilNextClaim deve retornar valor > 0 logo após um claim", async function () {
    await faucet.connect(user1).claim();
    const remaining = await faucet.timeUntilNextClaim(user1.address);
    expect(remaining).to.be.greaterThan(0);
    expect(remaining).to.be.lessThanOrEqual(COOLDOWN);
  });

  it("apenas o owner pode chamar rescueTokens", async function () {
    await expect(faucet.connect(user1).rescueTokens(CLAIM_AMOUNT))
      .to.be.revertedWith("Faucet: NOT_OWNER");
  });

  it("owner deve conseguir resgatar tokens do faucet", async function () {
    const balanceBefore = await token.balanceOf(owner.address);

    await faucet.rescueTokens(FAUCET_FUNDING);

    const balanceAfter = await token.balanceOf(owner.address);
    expect(balanceAfter - balanceBefore).to.equal(FAUCET_FUNDING);
    expect(await faucet.faucetBalance()).to.equal(0);
  });

  it("apenas o owner pode transferir ownership", async function () {
    await expect(faucet.connect(user1).transferOwnership(user2.address))
      .to.be.revertedWith("Faucet: NOT_OWNER");
  });

  it("construtor deve rejeitar endereço de token zero", async function () {
    const Faucet = await ethers.getContractFactory("Faucet");
    await expect(
      Faucet.deploy(ethers.ZeroAddress, CLAIM_AMOUNT, COOLDOWN)
    ).to.be.revertedWith("Faucet: ZERO_TOKEN");
  });
});