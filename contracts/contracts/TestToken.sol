// SPDX-License-Identifier: MIT
pragma solidity =0.8.20;

// Token ERC-20 de teste para demonstrar o swap na OPN Testnet.
//
// SEGURANÇA:
// - `mint` só pode ser chamado pelo owner do deploy (sem faucet público
//   ilimitado, que inflaria a supply e quebraria a demo de preço).
// - Supply inicial cunhada direto para o deployer no constructor.
// - Sem lógica de fee-on-transfer, sem hooks externos, sem upgradeability:
//   superfície de ataque mínima, adequado para um par de testes.
contract TestToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "TestToken: NOT_OWNER");
        _;
    }

    constructor(string memory _name, string memory _symbol, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        owner = msg.sender;
        _mint(msg.sender, _initialSupply);
    }

    function _mint(address to, uint256 amount) private {
        require(to != address(0), "TestToken: MINT_TO_ZERO_ADDRESS");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    // mint restrito: apenas o owner pode cunhar tokens novos de teste
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "TestToken: ZERO_ADDRESS");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "TestToken: INSUFFICIENT_ALLOWANCE");
            allowance[from][msg.sender] = currentAllowance - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(to != address(0), "TestToken: TRANSFER_TO_ZERO_ADDRESS");
        balanceOf[from] -= amount; // reverte automaticamente se saldo insuficiente
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
