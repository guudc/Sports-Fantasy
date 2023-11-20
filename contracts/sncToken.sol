// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SNC is ERC20 {
    constructor() ERC20("SNC TOKEN", "SNC") {
        _mint(msg.sender, 1800000000000000000000000000000);
    }
    //Mint tokens to the owner address
    function mint(uint256 amount) external returns(bool) {
        _mint(msg.sender, amount);
        return true;
    }
    //Burns token from the sender address
    function burn(uint256 amount) external returns(bool) {
        _burn(msg.sender, amount);
        return true;
    }

}