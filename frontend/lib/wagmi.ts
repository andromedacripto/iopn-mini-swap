import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { opnTestnet } from "./chains";

/**
 * Configuração do wagmi.
 *
 * Usamos apenas o conector `injected` (MetaMask, Rabby, e qualquer
 * carteira EIP-1193 injetada no browser). Isso mantém o setup simples
 * e rápido — sem precisar de um Project ID de WalletConnect — e cobre
 * o caso de uso principal de um mini swap de testnet.
 *
 * Nenhuma chave privada, seed ou segredo de carteira passa pelo nosso
 * código em nenhum momento: toda assinatura acontece dentro da
 * extensão da carteira do usuário, fora do nosso controle.
 */
export const wagmiConfig = createConfig({
  chains: [opnTestnet],
  connectors: [injected()],
  transports: {
    [opnTestnet.id]: http(opnTestnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
