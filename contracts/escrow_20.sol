// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/*
    This acts as an escrow contract to hold ERC20 SNC
*/
contract Escrow  {
    
    IERC20 token; //NFT contract address
     
    constructor (address sncAddress) {
        token = IERC20(sncAddress);
        require(token.balanceOf(address(this)) == 0, "Invalid ERC20 Contract address");
        //give the creator of this contract the approval to transfer the erc20
        token.approve(msg.sender, 999999999999999999999999999999999999);
    }
    //This function transfers snc from escrow to user
    function transferFromEscrowtoUser(address userAddress, uint256 amount) public returns (bool) {
        require(token.balanceOf(address(this)) >= amount, "Insufficient SNC tokens");
        token.transfer(userAddress, amount);
        return true;
    }
    //This function confirm transfers of snc from escrow user to escrow
    function transferFromUserToEscrow(uint amount) public view returns (bool) {
        require(token.balanceOf(address(this)) >= amount, "Unconfirmed transfer");
        return true;
    }
}