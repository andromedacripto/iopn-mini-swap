"use client";

import { useCallback, useState } from "react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits, type Address } from "viem";
import { erc20Abi, routerAbi } from "@/lib/abis";
import { CONTRACTS } from "@/lib/contracts";
import { opnTestnet } from "@/lib/chains";

const DEFAULT_SLIPPAGE_PERCENT = 0.5; // 0.5%
const DEFAULT_DEADLINE_MINUTES = 20;

/**
 * Valida e converte uma string de input numérico do usuário para
 * unidades on-chain (bigint), sem nunca confiar ciegamente no valor
 * digitado.
 *
 * Protege contra: strings vazias, não numéricas, negativas, com
 * múltiplos pontos decimais, ou valores que resultem em zero —
 * todos esses casos retornam `null` em vez de lançar exceção ou
 * produzir um BigInt incorreto.
 */
export function safeParseAmount(value: string, decimals: number): bigint | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === ".") return null;

  // só aceita dígitos e no máximo um ponto decimal, sem sinal negativo,
  // sem notação científica, sem espaços no meio
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(trimmed)) return null;

  try {
    const parsed = parseUnits(trimmed, decimals);
    if (parsed <= 0n) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useTokenBalance(tokenAddress: Address | undefined) {
  const { address } = useAccount();
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(tokenAddress && address), refetchInterval: 8000 },
  });
}

export function useNativeBalance() {
  const { address } = useAccount();
  return useBalance({ address, chainId: opnTestnet.id });
}

export function useAllowance(tokenAddress: Address | undefined, owner: Address | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: owner ? [owner, CONTRACTS.router] : undefined,
    query: { enabled: Boolean(tokenAddress && owner), refetchInterval: 8000 },
  });
}

/**
 * Busca a cotação de saída (quote) chamando a função read-only
 * `getAmountsOut` do Router. Não envolve nenhuma transação, só leitura.
 */
export function useSwapQuote(amountIn: bigint | null, path: [Address, Address] | null) {
  return useReadContract({
    address: CONTRACTS.router,
    abi: routerAbi,
    functionName: "getAmountsOut",
    args: amountIn && path ? [amountIn, path] : undefined,
    query: {
      enabled: Boolean(amountIn && amountIn > 0n && path),
      refetchInterval: 6000,
    },
  });
}

/**
 * Calcula o amountOutMin a partir do quote e do slippage configurado.
 * Sempre arredonda PARA BAIXO (proteção do usuário: nunca aceitar
 * menos do que o cálculo determina).
 */
export function applySlippage(amountOut: bigint, slippagePercent: number): bigint {
  if (slippagePercent < 0 || slippagePercent > 50) {
    // protege contra slippage configurado de forma absurda (ex: negativo
    // ou >50%, que tornaria o swap economicamente sem sentido / perigoso)
    throw new Error("Slippage inválido: deve estar entre 0% e 50%.");
  }
  const slippageBps = BigInt(Math.round(slippagePercent * 100)); // basis points * 100
  return (amountOut * (10000n - slippageBps)) / 10000n;
}

export function useApprove() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = useCallback(
    (tokenAddress: Address, amount: bigint) => {
      writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACTS.router, amount],
      });
    },
    [writeContract]
  );

  return { approve, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useSwapExecute() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const swap = useCallback(
    (params: {
      amountIn: bigint;
      amountOutMin: bigint;
      path: [Address, Address];
      to: Address;
      deadlineMinutes?: number;
    }) => {
      const deadline = BigInt(
        Math.floor(Date.now() / 1000) + 60 * (params.deadlineMinutes ?? DEFAULT_DEADLINE_MINUTES)
      );
      writeContract({
        address: CONTRACTS.router,
        abi: routerAbi,
        functionName: "swapExactTokensForTokens",
        args: [params.amountIn, params.amountOutMin, params.path, params.to, deadline],
      });
    },
    [writeContract]
  );

  return { swap, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useSlippageSetting() {
  const [slippagePercent, setSlippagePercent] = useState(DEFAULT_SLIPPAGE_PERCENT);

  const setSlippage = useCallback((value: number) => {
    if (Number.isNaN(value)) return;
    // protege a UI: nunca deixa configurar slippage fora de uma faixa segura
    const clamped = Math.min(Math.max(value, 0.01), 20);
    setSlippagePercent(clamped);
  }, []);

  return { slippagePercent, setSlippage };
}

export function formatTokenAmount(value: bigint | undefined, decimals: number, maxDecimals = 6): string {
  if (value === undefined) return "0";
  const formatted = formatUnits(value, decimals);
  const [whole, fraction] = formatted.split(".");
  if (!fraction) return whole;
  return `${whole}.${fraction.slice(0, maxDecimals)}`;
}
