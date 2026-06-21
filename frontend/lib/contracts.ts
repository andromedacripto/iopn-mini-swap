/**
 * Endereços dos contratos do OPN Mini Swap.
 *
 * Todos vêm de variáveis de ambiente NEXT_PUBLIC_* (públicas por
 * natureza — endereços de contrato não são segredo). Validamos o
 * formato em runtime para falhar de forma clara e imediata caso o
 * .env.local esteja incompleto ou mal configurado, em vez de deixar
 * o app quebrar silenciosamente numa chamada de contrato.
 */
import { isAddress, type Address } from "viem";

function requireAddress(value: string | undefined, name: string): Address {
  if (!value || !isAddress(value)) {
    throw new Error(
      `[config] Variável de ambiente ${name} ausente ou inválida. ` +
        `Confira o arquivo .env.local (veja .env.local.example).`
    );
  }
  return value as Address;
}

export const CONTRACTS = {
  factory: requireAddress(process.env.NEXT_PUBLIC_FACTORY_ADDRESS, "NEXT_PUBLIC_FACTORY_ADDRESS"),
  router: requireAddress(process.env.NEXT_PUBLIC_ROUTER_ADDRESS, "NEXT_PUBLIC_ROUTER_ADDRESS"),
  wopn: requireAddress(process.env.NEXT_PUBLIC_WOPN_ADDRESS, "NEXT_PUBLIC_WOPN_ADDRESS"),
  tokenA: requireAddress(process.env.NEXT_PUBLIC_TOKEN_A_ADDRESS, "NEXT_PUBLIC_TOKEN_A_ADDRESS"),
  tokenB: requireAddress(process.env.NEXT_PUBLIC_TOKEN_B_ADDRESS, "NEXT_PUBLIC_TOKEN_B_ADDRESS"),
  faucet: requireAddress(process.env.NEXT_PUBLIC_FAUCET_ADDRESS, "NEXT_PUBLIC_FAUCET_ADDRESS"),
} as const;

export const TOKEN_LIST = [
  {
    address: CONTRACTS.tokenA,
    symbol: process.env.NEXT_PUBLIC_TOKEN_A_SYMBOL ?? "TKA",
    name: process.env.NEXT_PUBLIC_TOKEN_A_NAME ?? "OPN Test Token A",
    decimals: 18,
  },
  {
    address: CONTRACTS.tokenB,
    symbol: process.env.NEXT_PUBLIC_TOKEN_B_SYMBOL ?? "TKB",
    name: process.env.NEXT_PUBLIC_TOKEN_B_NAME ?? "OPN Test Token B",
    decimals: 18,
  },
] as const;

export type TokenInfo = (typeof TOKEN_LIST)[number];
