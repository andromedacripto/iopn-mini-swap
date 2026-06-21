# OPN Mini Swap

Mini swap (estilo Uniswap V2) para a **OPN Chain Testnet** (IOPn), com contratos em Solidity + Hardhat e frontend em Next.js + TypeScript + wagmi/viem.

Docs oficiais da rede: https://iopn.gitbook.io/iopn/developer-docs

## Estrutura do projeto

```
opn-mini-swap/
├── contracts/     Contratos Solidity (Factory, Pair, Router, WOPN, TestToken) + Hardhat
└── frontend/      App Next.js (TypeScript) com a interface de swap
```

## Quickstart (rodar do zero em ~5 minutos)

### 1. Pegue OPN de teste

Acesse o faucet e pegue OPN de teste para a sua carteira:
https://faucet.iopn.tech

### 2. Deploy dos contratos

```bash
cd contracts
npm install
cp .env.example .env
# edite .env com sua PRIVATE_KEY de teste

npm run deploy:testnet
```

Isso vai imprimir e salvar (em `contracts/deployed/opnTestnet.json`) os
endereços de: Factory, Router, WOPN, e os dois tokens de teste (TKA/TKB)
— já com liquidez inicial adicionada.

### 3. Configure e rode o frontend

```bash
cd ../frontend
npm install
cp .env.local.example .env.local
# edite .env.local com os endereços impressos no passo anterior

npm run dev
```

Abra http://localhost:3000, conecte sua carteira (MetaMask), confirme
que está na rede **OPN Testnet** (chainId 984) e teste o swap entre
TKA e TKB.

## O que vem pronto

- ✅ Contratos completos de AMM (Factory + Pair + Router), no padrão
  Uniswap V2, com taxa de 0.3% e proteção contra reentrância.
- ✅ Wrap do token nativo (`WOPN`) e dois tokens ERC-20 de teste
  (`TKA`/`TKB`) para já ter algo pra trocar.
- ✅ Suite de testes automatizados (Hardhat + Chai) cobrindo o fluxo
  feliz e as proteções de segurança (deadline, slippage, invariante k).
- ✅ Script de deploy único que faz tudo (deploy + criação do par +
  liquidez inicial) e salva os endereços para o frontend consumir.
- ✅ Frontend Next.js (App Router) + TypeScript, com:
  - conexão de carteira e detecção/troca automática de rede;
  - cotação em tempo real, slippage configurável e deadline;
  - validação de todo input numérico antes de qualquer transação;
  - fluxo de approve + swap com feedback de estado claro.

## Por que esse design

A OPN Chain é uma EVM chain (full Ethereum-compatible), então o padrão
mais simples, testado e seguro de AMM para uma demonstração é o
Uniswap V2 — sem dependência de um router de terceiros cujo endereço
não está publicamente documentado na rede. Os contratos são
deployados do zero por você, então você controla e entende cada peça.

## Aviso

Projeto de demonstração para **testnet**. Os tokens não têm valor
real. Não use estes contratos em mainnet ou com fundos reais sem uma
auditoria de segurança profissional independente.
