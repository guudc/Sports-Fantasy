// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./escrow_20_1155.sol";
import "./owner.sol";

contract MarketSale is Owner {

    /* Variable declaration */
    address public SNC_ADDRESS;
    address public NFT_ADDRESS;
    address public CHANGE_FEE; 
    uint256 public SELLER_FEE_PERCENT;
    uint256 public BUYER_FEE_PERCENT;

    /* Smart contract variable object */
    IERC20 private snc;
    IERC1155 private nft;

    /* Structs */
    struct sale {
        uint256 price;
        uint256 tokenId;
        uint256 duration;
        address buyer;
        address seller;
        address escrow;
        address marketPlace;
        bool sellerFee;
        bool complete;
    }

    /* Mappings */
    mapping(uint256 => sale) public NFT_SALES;
   
    /* Events */
    event onSale(address seller, uint price, uint duration, uint tokenId);
    event sold(address seller, address buyer, uint price, uint tokenId);
    //@cancelType: specifies if its cancelled by buyer or seller
    event expiredSale(uint tokenId, uint duration, address seller);
    event canceledSale(uint tokenId, address seller);
    //@_type: specifies what was updated
    event updatedSale(uint tokenId, address seller, string _type);
    event changeFee(uint newFee, string _type);
    event changeTreasury(address _address);
    

    /*
        @params buyerFee and sellerFee : in percentage, uses a multiplier of 100 as the bps
        i.e 1.5% should be represented as 150 and 100% should be represented as 10000
    */
    constructor (address sncAddress, address nftAddress, address _changeFee, uint256 buyerFee, uint256 sellerFee) {
        snc = IERC20(sncAddress);
        nft = IERC1155(nftAddress);
        //setting the address
        CHANGE_FEE = _changeFee;
        SNC_ADDRESS = sncAddress;
        NFT_ADDRESS = nftAddress;
        BUYER_FEE_PERCENT = buyerFee;
        SELLER_FEE_PERCENT = sellerFee;
        //setting owner
        owner = msg.sender;
        //verifying the contract address
        require(snc.balanceOf(address(this)) == 0, "Invalid ERC20 SNC Contract address");
        require(nft.balanceOf(address(this), 0) == 0, "Invalid NFT Contract");
    }

    /*
        This function put up an NFT for sale. It must be called by
        the seller of it to work. The function assumes that the caller of
        this function is the seller.
        @params duration: in seconds
    */
    function putForSale(
        address marketPlace,
        uint256 tokenId,
        uint256 price,
        uint256 duration,
        bool sellerFee
    ) public returns (bool) {
        /*
            The seller must give approval for this contract to spend it NFT token
            This can only be achieved via the NFT smart contract
        */
        //check if this NFT has been put on sale already
        require(NFT_SALES[tokenId].seller == address(0), "This NFT is on sale already");
        //move the NFT to the escrow  
        Escrow escrow = new Escrow(NFT_ADDRESS, tokenId, SNC_ADDRESS);
        //move the NFT to the escrow
        nft.safeTransferFrom(msg.sender, address(escrow),  tokenId, 1, "");
        if(duration != 0) {
            //Not using infinite wait
            duration = block.timestamp + duration;
        }
        //create a sale struct
        NFT_SALES[tokenId] = sale(
            price,
            tokenId,
            duration,
            address(0),
            msg.sender,
            address(escrow),
            marketPlace,
            sellerFee,
            false
        );
        emit onSale(msg.sender, price, duration, tokenId);
        return true;
    }

    /*
        This function helps buy NFT.  
        The function assumes that the caller of this function is the buyer.
    */
    function buyNft(
        address buyerAddress,
        uint256 tokenId,
        uint256 sncAmount,
        uint256 buyerFee
    ) public returns(bool) {
        //check if the seller has put this NFT on sale
        require(NFT_SALES[tokenId].seller != address(0), "This NFT is not on sale");
        //check if the NFT is still on sale based on duration, only if it does not uses infinite duration
        if(NFT_SALES[tokenId].duration != 0){
            require(NFT_SALES[tokenId].duration >= block.timestamp, "NFT Sale has expired");
        }
        //check if the SNC amount given is sufficient enough to cover the NFT sale price
        require(sncAmount >= NFT_SALES[tokenId].price, "SNC amount provided lesser than NFT sale price");
        //check if the buyer has enough actual SNC tokens to perform this transaction
        require(snc.balanceOf(buyerAddress) >= (buyerFee + sncAmount), "Insufficient SNC tokens");
        //use the check-effects-interaction rule to prevent reteerancy attack
        /*
            No need to send SNC tokens to escrow, as that would cost more gas fee
            Send directly to seller.
        */
        //intialize temporary variables
        Escrow escrow = Escrow(NFT_SALES[tokenId].escrow);
        uint256 price = NFT_SALES[tokenId].price;
        bool isSellerFee = NFT_SALES[tokenId].sellerFee;
        address seller = NFT_SALES[tokenId].seller;
        /*  effects */
        //reset the sale
        NFT_SALES[tokenId] = sale(
                0,
                0,
                0,
                address(0),
                address(0),
                address(0),
                address(0),
                false,
                false
            );
        //move NFT from escrow to buyer
        escrow.transferNftFromEscrowtoUser(buyerAddress);
        //move SNC with buyer fee from buyer to escrow
        snc.transferFrom(buyerAddress, address(escrow), (price + buyerFee));
        //move buyer fee to CHANGE_FEE address from escrow
        escrow.transferFromEscrowtoUser(CHANGE_FEE, buyerFee);
        if(isSellerFee) {
            /*
                deduct the seller fee from the SNC amount, and move to CHANGE_FEE address
                We are using the seller fee percent to get the seller fee equivalent
            */
            uint256 fee = (price * SELLER_FEE_PERCENT) / 10_000; 
            price = price - fee;
            //move the seller fee to CHANGE_FEE from escrow
            escrow.transferFromEscrowtoUser(CHANGE_FEE, fee);
            //move the remaining price to seller from escrow
            escrow.transferFromEscrowtoUser(seller, price);
            //emit events
            emit sold(seller, buyerAddress, (price + fee), tokenId);
        }
        else {
            //move the remaining price to seller from escrow
            escrow.transferFromEscrowtoUser(seller, price);
            //emit events
            emit sold(seller, buyerAddress, price, tokenId);
        }
        
        return true;
    }   
    /* Utilities functions */

    /*
        This function monitors NFT sale. 
        Revert sale if duration is expended.
    */
    function monitorNftSale(uint256 tokenId) external returns (bool) {
        //only work if not using infinite duration
        if(NFT_SALES[tokenId].duration != 0){
            require(NFT_SALES[tokenId].duration <= block.timestamp, "NFT Sale has not expired");
            //has expired, revert back to seller
            Escrow escrow = Escrow(NFT_SALES[tokenId].escrow);
            escrow.transferNftFromEscrowtoUser(NFT_SALES[tokenId].seller);
            //delete the NFT SALE DATA
            uint256 duration = NFT_SALES[tokenId].duration;
            address seller = NFT_SALES[tokenId].seller;
            NFT_SALES[tokenId] = sale(
            0,
                0,
                0,
                address(0),
                address(0),
                address(0),
                address(0),
                false,
                false
            );
            emit expiredSale(tokenId, duration, seller);
        }
        return true;
    }
    /*
        This function sets the buyer fee
        can only be called by the owner of the smart contract
        @params feePercent: the buyer fee in terms of percent(0-100)
    */
    function setBuyerFee(uint feePercent) external isOwner returns(bool) {
        require(feePercent > 0, "Cannot set zero fees");
        BUYER_FEE_PERCENT = feePercent;
        emit changeFee(feePercent, "BUYER FEE PERCENT");
        return true;
    }
    /*
        This function update the duration of sale
        can only be called by the seller of the NFT.
        It adds this new duration to the previous duration, it assumes
        that this function is called by the seller
        @params duration: in seconds
        returns new duration
    */
    function updateDuration(uint duration, uint256 tokenId) external returns(uint) {
        require(NFT_SALES[tokenId].seller == msg.sender, "Not the seller of this NFT");
        if(NFT_SALES[tokenId].duration != 0){
            require(NFT_SALES[tokenId].duration >= block.timestamp, "NFT Sale has expired");
        }  
        //update the duration
        if(NFT_SALES[tokenId].duration != 0){
             if(duration != 0) {
                 NFT_SALES[tokenId].duration += duration;
             }
             else {
                 //using zero duration
                 NFT_SALES[tokenId].duration = 0;
             }
        }
        else {
            //was using zero duration earlier
            if(duration != 0) {
                 NFT_SALES[tokenId].duration = block.timestamp + duration;
             }
             else {
                 //using zero duration
                 NFT_SALES[tokenId].duration = 0;
             }
        }   
        emit updatedSale(tokenId, NFT_SALES[tokenId].seller, "UPDATE DURATION"); 
        return  NFT_SALES[tokenId].duration;
    }
    /*
        This function update the price  of the NFT
        can only be called by the seller of the NFT.
    */
    function updateSalePrice(uint price, uint256 tokenId) external returns(bool) {
        require(NFT_SALES[tokenId].seller == msg.sender, "Not the seller of this NFT");
        if(NFT_SALES[tokenId].duration != 0){
            require(NFT_SALES[tokenId].duration >= block.timestamp, "NFT Sale has expired");
        }  
        //update the duration
        NFT_SALES[tokenId].price = price;
        emit updatedSale(tokenId, NFT_SALES[tokenId].seller, "UPDATE PRICE");
        return true;
    }
    /*
        This function sets the seller fee
        can only be called by the owner of the smart contract
        @params feePercent: the seller fee in terms of percent(0-100)
    */
    function setSellerFee(uint feePercent) external isOwner returns(bool) {
        require(feePercent > 0, "Cannot set zero fees");
        SELLER_FEE_PERCENT = feePercent;
        emit changeFee(feePercent, "SELLER FEE PERCENT");
        return true;
    }
    /*
        This function cancels a sale
        can only be called by the owner of the smart contract
    */
    function cancelSale(uint tokenId) external returns(bool) {
        require(NFT_SALES[tokenId].seller == msg.sender, "Not the seller of this NFT");
        Escrow escrow = Escrow(NFT_SALES[tokenId].escrow);
        NFT_SALES[tokenId] = sale(
            0,
                0,
                0,
                address(0),
                address(0),
                address(0),
                address(0),
                false,
                false
        );
        escrow.transferNftFromEscrowtoUser(msg.sender);
        emit canceledSale(tokenId, msg.sender);
        return true;
    }
    /*
        This function sets the change_fee address
        can only be called by the owner of the smart contract
    */
    function changeFeeAddress(address _changeFee) external isOwner returns(bool) {
        require(_changeFee != address(0), "Cannot set zero address");
        CHANGE_FEE = _changeFee;
        emit changeTreasury(_changeFee);
        return true;
    }
    /*
        Returns buyer fee 
    */
    function getBuyerFee() public view returns(uint256) {
        return BUYER_FEE_PERCENT;
    }
    
    

}