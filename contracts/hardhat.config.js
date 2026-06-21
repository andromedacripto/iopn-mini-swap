require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
const path = require("path");
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

// Usa o solc instalado via npm (pacote `solc`) em vez de baixar o
// binário nativo de binaries.soliditylang.org. Isso torna o build
// 100% reprodutível em ambientes com rede restrita (CI, sandboxes,
// firewalls corporativos) sem abrir mão da versão exata 0.8.20.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async (args, hre, runSuper) => {
  if (args.solcVersion === "0.8.20") {
    const compilerPath = path.join(__dirname, "node_modules", "solc", "soljson.js");
    return {
      compilerPath,
      isSolcJs: true,
      version: args.solcVersion,
      longVersion: "0.8.20+commit.a1b79de6",
    };
  }
  return runSuper(args);
});

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Rede oficial de testes da OPN Chain (IOPn)
    // Docs: https://iopn.gitbook.io/iopn/developer-docs
    opnTestnet: {
      url: "https://testnet-rpc.iopn.tech",
      chainId: 984,
      accounts: [PRIVATE_KEY],
      gasPrice: 7000000000, // 7 Gwei - gas mínimo exigido pela OPN Chain
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
};
