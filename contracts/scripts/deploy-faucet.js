const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  const deployedPath = path.join(__dirname, "..", "deployed", `${network}.json`);

  if (!fs.existsSync(deployedPath)) {
    throw new Error(`Arquivo de deploy não encontrado: ${deployedPath}. Rode o deploy principal primeiro.`);
  }

  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  const tkaAddress = deployed.tokens.TKA;

  if (!tkaAddress) {
    throw new Error("Endereço do TKA não encontrado no arquivo de deploy.");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployando Faucet com a conta: ${deployer.address}`);

  const CLAIM_AMOUNT = hre.ethers.parseEther("10");
  const COOLDOWN = 24 * 60 * 60; // 24h
  const FUNDING_AMOUNT = hre.ethers.parseEther("1000");

  console.log("1/2 - Deployando Faucet...");
  const Faucet = await hre.ethers.getContractFactory("Faucet");
  const faucet = await Faucet.deploy(tkaAddress, CLAIM_AMOUNT, COOLDOWN);
  await faucet.waitForDeployment();
  const faucetAddress = await faucet.getAddress();
  console.log(`   -> Faucet: ${faucetAddress}`);

  console.log(`2/2 - Financiando faucet com ${hre.ethers.formatEther(FUNDING_AMOUNT)} TKA...`);
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  const tka = TestToken.attach(tkaAddress);

  const deployerBalance = await tka.balanceOf(deployer.address);
  if (deployerBalance < FUNDING_AMOUNT) {
    throw new Error(
      `Saldo insuficiente de TKA no deployer. Saldo: ${hre.ethers.formatEther(deployerBalance)}, necessário: ${hre.ethers.formatEther(FUNDING_AMOUNT)}`
    );
  }

  const tx = await tka.transfer(faucetAddress, FUNDING_AMOUNT);
  await tx.wait();
  console.log("   -> Faucet financiado com sucesso!");

  const faucetBalance = await faucet.faucetBalance();
  console.log(`   -> Saldo confirmado no faucet: ${hre.ethers.formatEther(faucetBalance)} TKA`);

  deployed.faucet = faucetAddress;
  deployed.faucetConfig = {
    claimAmount: "10",
    cooldownSeconds: COOLDOWN,
    initialFunding: "1000",
  };
  deployed.faucetDeployedAt = new Date().toISOString();

  fs.writeFileSync(deployedPath, JSON.stringify(deployed, null, 2));

  console.log("\n=================================================");
  console.log("FAUCET DEPLOYADO COM SUCESSO!");
  console.log("=================================================");
  console.log(JSON.stringify({ faucet: faucetAddress }, null, 2));
  console.log(`\nEndereço atualizado em: ${deployedPath}`);
  console.log("\nAdicione ao .env.local do frontend:");
  console.log(`NEXT_PUBLIC_FAUCET_ADDRESS=${faucetAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});