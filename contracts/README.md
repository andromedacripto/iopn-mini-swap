# OPN Mini Swap — Contratos

Contratos do mini swap (estilo Uniswap V2) para a **OPN Testnet** (IOPn), escritos em Solidity 0.8.20 e gerenciados com Hardhat.

Docs oficiais da rede: https://iopn.gitbook.io/iopn/developer-docs

| Parâmetro     | Valor                              |
| ------------- | ----------------------------------- |
| Rede          | OPN Testnet                         |
| Chain ID      | 984 (0x3d8)                         |
| RPC URL       | https://testnet-rpc.iopn.tech       |
| Gas mínimo    | 7 Gwei                              |
| Faucet        | https://faucet.iopn.tech            |
| Explorer      | https://testnet.iopn.tech           |

## Contratos

| Contrato         | Descrição                                                              |
| ----------------- | ----------------------------------------------------------------------- |
| `OPNSwapFactory`   | Cria e indexa pares de liquidez (CREATE2)                              |
| `OPNSwapPair`      | Par de liquidez (AMM x\*y=k, taxa de 0.3%)                              |
| `OPNSwapRouter`    | Ponto de entrada: swap, add/remove liquidez, proteção de slippage/deadline |
| `WOPN`             | Wrap do token nativo OPN (padrão WETH9)                                 |
| `TestToken`        | Token ERC-20 de teste (TKA/TKB) com mint restrito ao owner               |

## Setup

```bash
npm install
cp .env.example .env
```

Edite `.env` com a chave privada de uma carteira de **teste** (nunca uma carteira com fundos reais):

```env
PRIVATE_KEY=0xSUACHAVEPRIVADADETESTE
```

Pegue OPN de teste no faucet: https://faucet.iopn.tech

## Compilar

```bash
npm run compile
```

## Rodar os testes

```bash
npx hardhat test
```

Os testes cobrem o fluxo completo (criação de par, liquidez, swap) e,
principalmente, as **proteções de segurança**:

- reversão quando o `deadline` já expirou;
- reversão quando o `amountOutMin` (slippage) não é atingido;
- invariante de produto constante (`k` nunca diminui);
- restrição de `mint` do token de teste ao owner.

## Deploy na OPN Testnet

```bash
npm run deploy:testnet
```

O script (`scripts/deploy.js`) faz, em ordem:

1. Deploy da `OPNSwapFactory`
2. Deploy do `WOPN`
3. Deploy do `OPNSwapRouter`
4. Deploy dos tokens de teste `TKA` e `TKB`
5. Criação do par `TKA/TKB`
6. Adição de liquidez inicial (1000 TKA + 1000 TKB)

Ao final, os endereços são salvos em `deployed/opnTestnet.json` — copie-os
para o `.env.local` do frontend (`../frontend/.env.local.example`).

## Deploy local (para testar sem gastar OPN de teste)

```bash
# terminal 1
npx hardhat node

# terminal 2
npm run deploy:local
```

## Segurança — pontos de design

- **Reentrância**: `OPNSwapPair` usa um modifier `lock` em todas as funções de estado (`mint`, `burn`, `swap`, `skim`, `sync`).
- **Slippage real**: o Router valida `amountOutMin`/`amountInMax` on-chain com `require` — não é apenas uma sugestão da UI.
- **Deadline**: toda função do Router que move fundos exige um `deadline` válido (`ensure` modifier), prevenindo execução tardia de transações pendentes.
- **Sem custódia no Router**: tokens vão direto do usuário para o Pair via `transferFrom`; o Router nunca fica de posse de fundos de terceiros.
- **CREATE2 determinístico**: o endereço de cada par é previsível e não pode ser sequestrado por front-running.
- **Sem upgradeability/proxy**: menor superfície de ataque possível para um projeto didático — não há lógica de upgrade que possa ser comprometida.
- **Mint restrito**: os tokens de teste só podem ser mintados pelo owner do deploy, evitando inflação descontrolada que invalidaria a demonstração de preço.

## Aviso importante

Este é um projeto de **demonstração / testnet**. Os contratos seguem o
design auditado do Uniswap V2, mas **não foram auditados de forma
independente** nesta implementação específica. Não utilize em mainnet
ou com fundos reais sem uma auditoria de segurança profissional.
