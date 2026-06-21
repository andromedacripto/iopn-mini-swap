// SPDX-License-Identifier: MIT
pragma solidity =0.8.20;

import "./interfaces/IOPNSwapERC20.sol";

// Token ERC-20 padrão que representa a posição de liquidez (LP token).
// Solidity 0.8.20 já reverte automaticamente em overflow/underflow,
// então dispensamos SafeMath sem perder segurança.
contract OPNSwapERC20 is IOPNSwapERC20 {
    string public constant name = "OPN Swap LP Token";
    string public constant symbol = "OPN-LP";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor() {}

    function _mint(address to, uint256 value) internal {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint256 value) internal {
        balanceOf[from] -= value; // reverte automaticamente se saldo insuficiente
        totalSupply -= value;
        emit Transfer(from, address(0), value);
    }

    function _approve(address owner, address spender, uint256 value) private {
        allowance[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    function _transfer(address from, address to, uint256 value) private {
        require(to != address(0), "OPNSwap: TRANSFER_TO_ZERO_ADDRESS");
        balanceOf[from] -= value; // reverte automaticamente se saldo insuficiente
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= value, "OPNSwap: INSUFFICIENT_ALLOWANCE");
            _approve(from, msg.sender, currentAllowance - value);
        }
        _transfer(from, to, value);
        return true;
    }
}
