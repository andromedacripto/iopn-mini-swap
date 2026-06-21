const { expect } = require("chai");
const { ethers } = require("hardhat");

// Estes testes cobrem o fluxo funcional completo (deploy, par, liquidez,
// swap) e, mais importante, as PROTEÇÕES DE SEGURANÇA do Router:
// deadline expirado e slippage (amountOutMin) devem reverter a transação.
describe("OPN Mini Swap", function () {
  let factory, router, wopn, tokenA, tokenB;
  let owner, user;

  const parseEther = ethers.parseEther;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("OPNSwapFactory");
    factory = await Factory.deploy(owner.address);
    await factory.waitForDeployment();

    const WOPN = await ethers.getContractFactory("WOPN");
    wopn = await WOPN.deploy();
    await wopn.waitForDeployment();

    const Router = await ethers.getContractFactory("OPNSwapRouter");
    router = await Router.deploy(await factory.getAddress(), await wopn.getAddress());
    await router.waitForDeployment();

    const TestToken = await ethers.getContractFactory("TestToken");
    tokenA = await TestToken.deploy("Token A", "TKA", parseEther("1000000"));
    await tokenA.waitForDeployment();
    tokenB = await TestToken.deploy("Token B", "TKB", parseEther("1000000"));
    await tokenB.waitForDeployment();

    // cria o par e adiciona liquidez inicial
    await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());

    await tokenA.approve(await router.getAddress(), parseEther("100000"));
    await tokenB.approve(await router.getAddress(), parseEther("100000"));

    const deadline = (await time()) + 3600;
    await router.addLiquidity(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      parseEther("10000"),
      parseEther("10000"),
      0,
      0,
      owner.address,
      deadline
    );
  });

  async function time() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }

  it("cria o par corretamente e registra na factory", async function () {
    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    expect(pairAddress).to.not.equal(ethers.ZeroAddress);
  });

  it("executa um swap exato de TokenA -> TokenB com sucesso", async function () {
    const amountIn = parseEther("100");
    const deadline = (await time()) + 3600;

    const balanceBefore = await tokenB.balanceOf(owner.address);

    await tokenA.approve(await router.getAddress(), amountIn);
    await router.swapExactTokensForTokens(
      amountIn,
      0, // sem slippage mínima nesse teste de fluxo feliz
      [await tokenA.getAddress(), await tokenB.getAddress()],
      owner.address,
      deadline
    );

    const balanceAfter = await tokenB.balanceOf(owner.address);
    expect(balanceAfter).to.be.gt(balanceBefore);
  });

  it("REVERTE o swap se o deadline já expirou (proteção contra tx atrasada)", async function () {
    const amountIn = parseEther("100");
    const expiredDeadline = (await time()) - 10; // já passou

    await tokenA.approve(await router.getAddress(), amountIn);
    await expect(
      router.swapExactTokensForTokens(
        amountIn,
        0,
        [await tokenA.getAddress(), await tokenB.getAddress()],
        owner.address,
        expiredDeadline
      )
    ).to.be.revertedWith("OPNSwapRouter: EXPIRED");
  });

  it("REVERTE o swap se o amountOutMin (slippage) não for atingido", async function () {
    const amountIn = parseEther("100");
    const deadline = (await time()) + 3600;

    // pede um amountOutMin absurdamente alto, impossível de atingir
    const impossibleMin = parseEther("999999");

    await tokenA.approve(await router.getAddress(), amountIn);
    await expect(
      router.swapExactTokensForTokens(
        amountIn,
        impossibleMin,
        [await tokenA.getAddress(), await tokenB.getAddress()],
        owner.address,
        deadline
      )
    ).to.be.revertedWith("OPNSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
  });

  it("REVERTE addLiquidity com deadline expirado", async function () {
    const expiredDeadline = (await time()) - 10;
    await tokenA.approve(await router.getAddress(), parseEther("10"));
    await tokenB.approve(await router.getAddress(), parseEther("10"));

    await expect(
      router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        parseEther("10"),
        parseEther("10"),
        0,
        0,
        owner.address,
        expiredDeadline
      )
    ).to.be.revertedWith("OPNSwapRouter: EXPIRED");
  });

  it("permite que outro usuário (não o LP original) também faça swap", async function () {
    const amountIn = parseEther("50");
    const deadline = (await time()) + 3600;

    // transfere alguns tokens para `user` simular outro participante
    await tokenA.transfer(user.address, amountIn);

    await tokenA.connect(user).approve(await router.getAddress(), amountIn);
    await router
      .connect(user)
      .swapExactTokensForTokens(
        amountIn,
        0,
        [await tokenA.getAddress(), await tokenB.getAddress()],
        user.address,
        deadline
      );

    const userBalanceB = await tokenB.balanceOf(user.address);
    expect(userBalanceB).to.be.gt(0);
  });

  it("respeita o invariante de produto constante (k não pode diminuir)", async function () {
    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    const Pair = await ethers.getContractFactory("OPNSwapPair");
    const pair = Pair.attach(pairAddress);

    const [r0Before, r1Before] = await pair.getReserves();
    const kBefore = r0Before * r1Before;

    const amountIn = parseEther("200");
    const deadline = (await time()) + 3600;
    await tokenA.approve(await router.getAddress(), amountIn);
    await router.swapExactTokensForTokens(
      amountIn,
      0,
      [await tokenA.getAddress(), await tokenB.getAddress()],
      owner.address,
      deadline
    );

    const [r0After, r1After] = await pair.getReserves();
    const kAfter = r0After * r1After;

    // k deve aumentar ou manter (nunca diminuir) por causa da taxa de 0.3%
    expect(kAfter).to.be.gte(kBefore);
  });

  it("apenas o owner do TestToken pode mintar novos tokens", async function () {
    await expect(tokenA.connect(user).mint(user.address, parseEther("1"))).to.be.revertedWith(
      "TestToken: NOT_OWNER"
    );
  });
});
