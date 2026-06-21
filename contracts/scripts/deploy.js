// Script de deploy do OPN Mini Swap na OPN Testnet (ou rede local).
//
// Ordem de deploy (importante por causa das dependências entre contratos):
//   1. OPNSwapFactory   (não depende de nada)
//   2. WOPN             (wrap do token nativo OPN)
//   3. OPNSwapRouter    (depende de factory + WOPN)
//   4. TestToken x2     (tokens de demonstração TKA/TKB)
//   5. createPair       (registra o par TKA/TKB na factory)
//   6. addLiquidity     (popula o par com liquidez inicial, via Router)
//
// SEGURANÇA: a private key vem de variável de ambiente (.env), nunca
// hardcoded no código. O .env.example documenta o formato esperado e
// o .gitignore impede que o .env real seja commitado por engano.
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployando com a conta:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Saldo da conta:", hre.ethers.formatEther(balance), "OPN\n");

  if (balance === 0n) {
    throw new Error(
      "A conta do deployer está com saldo zero. Pegue OPN de teste no faucet: https://faucet.iopn.tech"
    );
  }

  // 1. Factory
  console.log("1/6 - Deployando OPNSwapFactory...");
  const Factory = await hre.ethers.getContractFactory("OPNSwapFactory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("   -> Factory:", factoryAddress);

  // 2. WOPN
  console.log("2/6 - Deployando WOPN...");
  const WOPN = await hre.ethers.getContractFactory("WOPN");
  const wopn = await WOPN.deploy();
  await wopn.waitForDeployment();
  const wopnAddress = await wopn.getAddress();
  console.log("   -> WOPN:", wopnAddress);

  // 3. Router
  console.log("3/6 - Deployando OPNSwapRouter...");
  const Router = await hre.ethers.getContractFactory("OPNSwapRouter");
  const router = await Router.deploy(factoryAddress, wopnAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("   -> Router:", routerAddress);

  // 4. Tokens de teste
  console.log("4/6 - Deployando tokens de teste (TKA e TKB)...");
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  const initialSupply = hre.ethers.parseEther("1000000"); // 1.000.000 tokens, 18 decimais

  const tokenA = await TestToken.deploy("OPN Test Token A", "TKA", initialSupply);
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log("   -> TKA:", tokenAAddress);

  const tokenB = await TestToken.deploy("OPN Test Token B", "TKB", initialSupply);
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log("   -> TKB:", tokenBAddress);

  // 5. Cria o par TKA/TKB
  console.log("5/6 - Criando par TKA/TKB na Factory...");
  const createPairTx = await factory.createPair(tokenAAddress, tokenBAddress);
  await createPairTx.wait();
  const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);
  console.log("   -> Par TKA/TKB:", pairAddress);

  // 6. Adiciona liquidez inicial (1000 TKA + 1000 TKB => preço 1:1)
  console.log("6/6 - Adicionando liquidez inicial (1000 TKA + 1000 TKB)...");
  const liquidityAmount = hre.ethers.parseEther("1000");

  await (await tokenA.approve(routerAddress, liquidityAmount)).wait();
  await (await tokenB.approve(routerAddress, liquidityAmount)).wait();

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos
  const addLiquidityTx = await router.addLiquidity(
    tokenAAddress,
    tokenBAddress,
    liquidityAmount,
    liquidityAmount,
    0,
    0,
    deployer.address,
    deadline
  );
  await addLiquidityTx.wait();
  console.log("   -> Liquidez adicionada com sucesso!\n");

  // Salva os endereços num arquivo JSON que o frontend vai consumir
  const deployedAddresses = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    factory: factoryAddress,
    router: routerAddress,
    wopn: wopnAddress,
    pair: pairAddress,
    tokens: {
      TKA: tokenAAddress,
      TKB: tokenBAddress,
    },
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const outputDir = path.join(__dirname, "..", "deployed");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${hre.network.name}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deployedAddresses, null, 2));

  console.log("=================================================");
  console.log("DEPLOY CONCLUÍDO COM SUCESSO!");
  console.log("=================================================");
  console.log(JSON.stringify(deployedAddresses, null, 2));
  console.log("\nEndereços salvos em:", outputPath);
  console.log("\nCopie esses endereços para o arquivo .env.local do frontend.");
}

main().catch((error) => {
  console.error("\nERRO NO DEPLOY:");
  console.error(error);
  process.exitCode = 1;
});
