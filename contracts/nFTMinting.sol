// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract NFTMinter is ERC1155, Ownable, Pausable, ERC1155Supply {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    //Using on-chain duration only at this time
    struct NFT_META {
        uint256 duration;
    }

    //Mapping is required for setting duration of NFT
    mapping(uint256 => NFT_META) public NFT_DATA; 

     // Specifies House wallet address
    address public HOUSE_ADDRESS;
  



    constructor(address _houseAddress) ERC1155("https://firebasestorage.googleapis.com/v0/b/nu10nfts.appspot.com/o/metadata%2F{id}.json?alt=media")
    {   
        HOUSE_ADDRESS = _houseAddress;
    }


    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
    //to chnage house address
    function setHouseAddress(address _houseAddress) external onlyOwner {
        HOUSE_ADDRESS = _houseAddress;
    }
  
  
  // Updating Duration of token
    function updateDuration(uint256 _tokenId ,uint256 _duration)
        public
        payable
        onlyOwner
    {

        //uint256 Duration = block.timestamp + _duration ;
        NFT_DATA[_tokenId] = NFT_META(_duration); //Updating Duration of Particular token
    
    }

    //returns the duration for a particular NFT
    function getDuration(uint256 _tokenId) external view returns (uint256 duration) {
        return NFT_DATA[_tokenId].duration;
    }

    //While minting token we updating Duration of NFT and price will be zero
    function mint(uint256 _duration)
        public
        onlyOwner
        returns (uint256)
    {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _mint(HOUSE_ADDRESS, newTokenId, 1, "");
        //Setting Duration of token while minting
       // uint256 Duration = block.timestamp + _duration ;
        NFT_DATA[newTokenId] = NFT_META(_duration);
        return newTokenId;
    }
     
    /*
        Batch mint where no_of_tokens is the number
        of NFTs to be minted
        It returns an array of TokenIds minted
    */
    // function mintBatch(uint256 _no_of_token) external onlyOwner returns (uint256[] memory) {
    //     uint256[] memory ids = new uint256[](_no_of_token);
    //     uint256[] memory _amounts  = new uint256[](_no_of_token);
    //     for(uint i= 0; i<_no_of_token; i++) {
    //         _tokenIds.increment();
    //         ids[i] = _tokenIds.current();  
    //         _amounts[i] = 1;   
    //     }
    //     _mintBatch(HOUSE_ADDRESS, ids, _amounts, "");
    //     return ids;
    // }
    // function uri(uint256 _id) public view virtual override returns(string memory){
    //     require(exists(_id), "URI: non-existent token");
    //     return string(abi.encodePacked(
    //         "https://firebasestorage.googleapis.com/v0/b/nu10nfts.appspot.com/o/metadata%2F",
    //         Strings.toString(_id),
    //         ".json?alt=media"));
    // }


    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        public
        onlyOwner
    {
        _mintBatch(to, ids, amounts, data);
    }

    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        internal
        whenNotPaused
        override(ERC1155, ERC1155Supply)
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }
}
