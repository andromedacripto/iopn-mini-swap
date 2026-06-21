"use client";

import { useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import type { Address } from "viem";
import { faucetAbi } from "@/lib/abis";
import { CONTRACTS } from "@/lib/contracts";

/**
 * Lê quanto tempo falta (em segundos) até a carteira conectada poder
 * fazer um novo claim. Retorna 0 se já pode pedir agora.
 *
 * refetchInterval curto (10s) mantém o cooldown na UI atualizado sem
 * o usuário precisar recarregar a página manualmente.
 */
export function useFaucetCooldown(userAddress: Address | undefined) {
  return useReadContract({
    address: CONTRACTS.faucet,
    abi: faucetAbi,
    functionName: "timeUntilNextClaim",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: Boolean(userAddress), refetchInterval: 10000 },
  });
}

/**
 * Saldo atual de TKA disponível no faucet. Útil para avisar o usuário
 * se o faucet estiver vazio antes mesmo de ele tentar a transação
 * (evita gastar gás numa chamada que vai reverter).
 */
export function useFaucetBalance() {
  return useReadContract({
    address: CONTRACTS.faucet,
    abi: faucetAbi,
    functionName: "faucetBalance",
    query: { refetchInterval: 15000 },
  });
}

export function useFaucetClaimAmount() {
  return useReadContract({
    address: CONTRACTS.faucet,
    abi: faucetAbi,
    functionName: "claimAmount",
  });
}

/**
 * Executa o claim. Não recebe nenhum parâmetro do usuário (a função
 * on-chain não aceita argumentos), o que elimina qualquer superfície
 * de input malicioso nesta chamada específica.
 */
export function useFaucetClaim() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claim = useCallback(() => {
    writeContract({
      address: CONTRACTS.faucet,
      abi: faucetAbi,
      functionName: "claim",
      args: [],
    });
  }, [writeContract]);

  return { claim, hash, isPending, isConfirming, isSuccess, error, reset };
}

/**
 * Formata segundos restantes de cooldown em algo legível tipo "3h 12min"
 * ou "45min". Evita mostrar "23:59:58" cru pro usuário.
 */
export function formatCooldown(seconds: bigint | undefined): string {
  if (seconds === undefined || seconds === 0n) return "";
  const totalMinutes = Math.ceil(Number(seconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export { useAccount };