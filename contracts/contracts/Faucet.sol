// SPDX-License-Identifier: MIT
pragma solidity =0.8.20;

// Faucet de TKA para a demo de swap na OPN Testnet.
//
// SEGURANÇA:
// - Não tem poder de mint: só distribui um saldo que o owner depositou
//   manualmente fora deste contrato. Mesmo comprometido, o dano máximo
//   é o saldo guardado aqui, nunca a supply total do token.
// - Cooldown por carteira evita que um único endereço esvazie o faucet.
// - Checks-Effects-Interactions: o timestamp do claim é atualizado
//   ANTES da chamada externa de transfer, fechando a janela de
//   reentrância por padrão (defesa em profundidade).
// - `rescueTokens` é uma válvula de emergência só do owner, que recupera
//   apenas o saldo do próprio faucet, nunca fundos de terceiros.

interface IERC20Like {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Faucet {
    IERC20Like public immutable token;
    uint256 public immutable claimAmount;
    uint256 public immutable cooldown;
    address public owner;

    mapping(address => uint256) public lastClaimAt;

    event Claimed(address indexed user, uint256 amount, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Rescued(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Faucet: NOT_OWNER");
        _;
    }

    constructor(address _token, uint256 _claimAmount, uint256 _cooldown) {
        require(_token != address(0), "Faucet: ZERO_TOKEN");
        require(_claimAmount > 0, "Faucet: ZERO_AMOUNT");
        require(_cooldown > 0, "Faucet: ZERO_COOLDOWN");
        token = IERC20Like(_token);
        claimAmount = _claimAmount;
        cooldown = _cooldown;
        owner = msg.sender;
    }

    function claim() external {
        uint256 nextClaimAt = lastClaimAt[msg.sender] + cooldown;
        require(block.timestamp >= nextClaimAt, "Faucet: COOLDOWN_ACTIVE");
        require(token.balanceOf(address(this)) >= claimAmount, "Faucet: EMPTY");

        lastClaimAt[msg.sender] = block.timestamp;

        bool success = token.transfer(msg.sender, claimAmount);
        require(success, "Faucet: TRANSFER_FAILED");

        emit Claimed(msg.sender, claimAmount, block.timestamp);
    }

    function timeUntilNextClaim(address user) external view returns (uint256) {
        uint256 nextClaimAt = lastClaimAt[user] + cooldown;
        if (block.timestamp >= nextClaimAt) {
            return 0;
        }
        return nextClaimAt - block.timestamp;
    }

    function faucetBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Faucet: ZERO_ADDRESS");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function rescueTokens(uint256 amount) external onlyOwner {
        bool success = token.transfer(owner, amount);
        require(success, "Faucet: RESCUE_FAILED");
        emit Rescued(owner, amount);
    }
}
