// SPDX-License-Identifier: MIT
pragma solidity =0.8.20;

// Wrapped OPN — versão ERC-20 do token nativo OPN, no padrão WETH9
// (mesmo design auditado e usado em praticamente toda EVM chain).
//
// SEGURANÇA:
// - `withdraw` segue checks-effects-interactions: o saldo é debitado
//   ANTES do `call` que envia o OPN nativo, prevenindo reentrância.
// - Usa `call` em vez de `transfer`/`send` para compatibilidade com
//   contratos que exigem mais de 2300 gas (carteiras multisig, etc.),
//   mas sempre valida o retorno com `require`.
contract WOPN {
    string public constant name = "Wrapped OPN";
    string public constant symbol = "WOPN";
    uint8 public constant decimals = 18;

    event Approval(address indexed src, address indexed guy, uint256 wad);
    event Transfer(address indexed src, address indexed dst, uint256 wad);
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 wad) public {
        require(balanceOf[msg.sender] >= wad, "WOPN: INSUFFICIENT_BALANCE");
        balanceOf[msg.sender] -= wad; // efeito antes da interação externa
        (bool success, ) = msg.sender.call{value: wad}("");
        require(success, "WOPN: TRANSFER_FAILED");
        emit Withdrawal(msg.sender, wad);
    }

    function totalSupply() public view returns (uint256) {
        return address(this).balance;
    }

    function approve(address guy, uint256 wad) public returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }

    function transfer(address dst, uint256 wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    function transferFrom(address src, address dst, uint256 wad) public returns (bool) {
        require(balanceOf[src] >= wad, "WOPN: INSUFFICIENT_BALANCE");

        if (src != msg.sender && allowance[src][msg.sender] != type(uint256).max) {
            require(allowance[src][msg.sender] >= wad, "WOPN: INSUFFICIENT_ALLOWANCE");
            allowance[src][msg.sender] -= wad;
        }

        balanceOf[src] -= wad;
        balanceOf[dst] += wad;
        emit Transfer(src, dst, wad);
        return true;
    }
}
