import { defineChain } from "viem";

/**
 * Definição da OPN Testnet (IOPn) para uso com viem/wagmi.
 *
 * Fonte oficial dos parâmetros:
 * https://iopn.gitbook.io/iopn/developer-docs
 *
 * SEGURANÇA: o chainId (984) é validado em tempo de execução antes de
 * qualquer transação (ver hooks/useSwap.ts), então o app nunca assina
 * ou envia uma tx assumindo estar na rede certa sem checar.
 */
export const opnTestnet = defineChain({
  id: 984,
  name: "OPN Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "OPN",
    symbol: "OPN",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.iopn.tech"],
    },
  },
  blockExplorers: {
    default: {
      name: "OPN Testnet Explorer",
      url: "https://testnet.iopn.tech",
    },
  },
  testnet: true,
});
