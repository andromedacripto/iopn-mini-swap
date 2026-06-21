# OPN Mini Swap — Frontend

Interface de swap em Next.js 16 (App Router) + TypeScript + Tailwind + wagmi/viem para a **OPN Testnet** (chainId `984`, IOPn).

## Pré-requisitos

- Node.js 18+ (recomendado 20+)
- Uma carteira com extensão de navegador (MetaMask, Rabby, etc.)
- Os contratos já deployados (veja `../contracts/README.md`)

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Edite `.env.local` e cole os endereços gerados pelo deploy dos contratos
(arquivo `../contracts/deployed/opnTestnet.json` após rodar o deploy):

```env
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_WOPN_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_A_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_B_ADDRESS=0x...
```

## Rodar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Build de produção

```bash
npm run build
npm run start
```

## Como testar o swap

1. Abra o app e clique em **Conectar carteira**.
2. Se a carteira não estiver na OPN Testnet, clique em **Trocar para OPN Testnet** (o app adiciona/troca a rede automaticamente via `wallet_addEthereumChain`/`wallet_switchEthereumChain`).
3. Garanta que sua conta tem TKA ou TKB de teste (quem fez o deploy recebe o supply inicial automaticamente — transfira para sua conta de teste se necessário) e um pouco de OPN para gás.
4. Digite o valor a trocar, confira a cotação estimada e o slippage (ajustável no ⚙).
5. Clique em **Aprovar** (uma única vez por token/valor) e depois em **Trocar**.

## Estrutura

```
app/                  Rotas do App Router (layout, page)
components/
  ConnectWallet.tsx   Conexão de carteira + troca de rede
  SwapCard.tsx        UI principal do swap
  Providers.tsx       Wrapper de WagmiProvider/QueryClientProvider
hooks/
  useSwap.ts          Lógica de quote, approve, swap e validação de input
lib/
  chains.ts           Definição da chain OPN Testnet (viem)
  contracts.ts        Endereços dos contratos (lidos de env vars)
  abis.ts             ABIs mínimas (somente funções usadas pelo app)
  wagmi.ts            Configuração do wagmi
```

## Notas de segurança do frontend

- Nenhuma chave privada, seed ou segredo passa pelo código do app — toda assinatura ocorre dentro da extensão da carteira do usuário.
- Todo valor digitado é validado e convertido com segurança (`safeParseAmount`) antes de qualquer chamada de contrato — entradas inválidas nunca chegam a uma transação.
- O `chainId` ativo é checado antes de qualquer interação; o app nunca assume estar na rede certa.
- `amountOutMin` (slippage) é sempre calculado e enviado on-chain — não é apenas uma exibição cosmética.
- O slippage configurável é limitado a uma faixa segura (0.01%–20%) para evitar configurações degeneradas.
