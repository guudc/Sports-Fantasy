// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./escrow_20_1155.sol";
import "./owner.sol";

contract Offer is Owner {

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
    struct offer {
        uint256 offerId;
        uint256 price;
        uint256 tokenId;
        uint256 duration;
        address buyer;
        address seller;
        address escrow;
    }

    /* Mappings */
    mapping(uint256 => offer[]) public NFT_OFFERS;
    mapping(uint256 => bool) public NFT_OFFER_COMPLETED;

    /* Events */
    event newOffer(address buyer, uint amount, uint duration, uint tokenId);
    //@cancelType: specifies if its cancelled by buyer or seller
    event cancelOffer(uint offerId, address buyer, string cancelType);
    event cancelAllOffer(uint tokenId, address seller);
    event acceptedOffer(uint offerId, address buyer, uint256 price);
    event expiredOffer(uint256 tokenId, uint offerId, address buyer, uint256 duration);
    event changeFee(uint newFee, string _type);
    
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
        This function helps a buyer make an offer for an NFT. 
        the offer price with the transaction fee are sennt to the escrow, until the offer is approved
        @params tokenId: The NFT token id
        offerPrice: the offer price
        duration: the duration of the offer in unix time seconds
        buyerAddress: the buyer's address
    */
    function makeOffer(uint256 tokenId, uint256 offerPrice, uint duration, address buyerAddress, address seller, uint buyerFee) public returns(uint256) {
        //check if buyer has any outstanding offer
        (bool hasMade, ) = checkIfOfferMade(buyerAddress, tokenId);
        require(!hasMade, "You have already made an offer");
        //check if the buyer has enough SNC tokens to account for its offer with transaction fee
        require(snc.balanceOf(buyerAddress) >= (offerPrice + buyerFee), "Insufficent SNC tokens for this offer");
        //check if the duration has not expired
        require(block.timestamp < duration, "Offer duration expired");
        //move the SNC to escrow
        //add offer
        Escrow escrow = new Escrow(NFT_ADDRESS, tokenId, SNC_ADDRESS);
        NFT_OFFERS[tokenId].push( offer(
            NFT_OFFERS[tokenId].length,
            offerPrice,
            tokenId,
            duration,
            buyerAddress,
            seller,
            address(escrow)
        ));
        snc.transferFrom(buyerAddress, address(escrow), (offerPrice + buyerFee));
        //emit event
        emit newOffer(buyerAddress, offerPrice, duration, tokenId);
        return  (NFT_OFFERS[tokenId].length-1);   
    }
    /*
        This function gives the seller the abilty to accep an offer
        @params tokenId: The NFT token id
        offerPrice: the offer price
        seller: the seller's address
        forceReject: a boolean flag that forces the bacth processing of all rejected offers.
        This causes the function to use more gas
    */
    function acceptOffer(uint256 tokenId, uint256 offerId, address seller, bool forceReject) public returns(bool) {
        //check if the seller has accepted any offer earlier
        require(!NFT_OFFER_COMPLETED[tokenId], "Has already accepted an offer");
        //check if buyer has made any offer, and get its offer id
        require(NFT_OFFERS[tokenId][offerId].buyer != address(0), "This offer does not exist");
        //check if this is the seller of this NFT
        require(NFT_OFFERS[tokenId][offerId].seller == seller, "This address is not the seller of this NFT");
        //getting the escrow, and buyer and offer price
        address buyer = NFT_OFFERS[tokenId][offerId].buyer;
        Escrow escrow = Escrow(NFT_OFFERS[tokenId][offerId].escrow);
        uint256 price = NFT_OFFERS[tokenId][offerId].price;
        /*
            calculating buyer fee and seller fee as the balance after the price has been taken away
            using this method as the TRANSACTION_FEE variable may have been changed
        */
        uint256 buyerFee = snc.balanceOf(address(escrow)) - price;
        uint256 fee = (price * SELLER_FEE_PERCENT) / 10_000; 
        price = price - fee;
        //using the Checks-effects-interactions pattern to prevent reteerancy
        require(snc.balanceOf(address(escrow)) >= (price + buyerFee), "Not enough SNC tokens in escrow to allow for transfer");
        /*
            Effects
            cancelling the offer, before transferring any funds to prevent reteerancy attack
        */
        doMiniCancel(tokenId, offerId, buyer, false);
        /* Interactions */
        /*
            transfer NFT to buyer
            No need to use Escrow as a middle man here, as this would just use unneccesary gas fees
            Send directly from seller to buyer
            Note: this function would ony work if this contract has been given approval to move the NFT
        */
        //transfer nft to escrow
        nft.safeTransferFrom(seller, address(escrow),  tokenId, 1, "");
        //transfer nft from escrow to buyer
        escrow.transferNftFromEscrowtoUser(buyer);
        //emit events
        emit acceptedOffer(offerId, buyer, price);
        
        //transfer the offer price to seller and buyer fee with seller feee to fee changer
        escrow.transferFromEscrowtoUser(seller, price);
        escrow.transferFromEscrowtoUser(CHANGE_FEE, buyerFee);
        escrow.transferFromEscrowtoUser(CHANGE_FEE, fee);
        
        /*
            reject all pending offers
            Note: Its not advisable to loop through and send back snc to unaccepted
            buyers, as this would use much gas, if the number of buyers are much.
            Instead, buyers should reclaim their offer by clicking the cancelOffer function.
            This contract would set a flag, preventing the seller from accepting more than one offer.
            This can be override with the forceReject flag
        */
        
        if(forceReject && NFT_OFFERS[tokenId].length > 0) {
            /*
                You want to do batch transfer, may cost more gas and its unadvisable
            */
            //loop through and do batch transfer
            uint256 _offerId = 0;
            address _buyer = address(0);
            for(uint i=0;i<NFT_OFFERS[tokenId].length;i++) {
                _buyer = NFT_OFFERS[tokenId][0].buyer; //use base offer
                doMiniCancel(tokenId, _offerId, _buyer, true);
            }       
            //reseting the has accepted flag
            NFT_OFFER_COMPLETED[tokenId] = false;
        }
        else if(NFT_OFFERS[tokenId].length > 0) {
           NFT_OFFER_COMPLETED[tokenId] = true;
        }
        else {
             NFT_OFFER_COMPLETED[tokenId] = true;
        }
        return true;
    }
    /*
        This function cancel the offer made by the buyer
        This can only be called by the buyer
    */
    function cancelOfferBuyer(address buyer, uint256 tokenId) public returns(bool) {
        //check if buyer has made any offer, and get its offer id
        (bool hasMade, uint256 offerId) = checkIfOfferMade(buyer, tokenId);
        require(hasMade, "No offer has been made by this buyer");
        doMiniCancel(tokenId, offerId, buyer, true);
        //emit event
        emit cancelOffer(offerId, buyer, "buyer");
        return true;
    }
    /*
        This function cancel the offer 
        This can only be called by the seller
    */
    function cancelOfferSeller(uint256 tokenId, uint256 offerId, address seller) public returns(bool) {
        //check if buyer has made any offer, and get its offer id
        require(NFT_OFFERS[tokenId][offerId].buyer != address(0), "This offer does not exist");
        //check if this is the seller of this NFT
        require(NFT_OFFERS[tokenId][offerId].seller == seller, "This address is not the seller of this NFT");
        address buyer = NFT_OFFERS[tokenId][offerId].buyer;
        doMiniCancel(tokenId, offerId, buyer, true);
        //emit event
        emit cancelOffer(offerId, buyer, "seller");
        return true;
    }
    /*
        This function cancel all the offer 
        This can only be called by the seller
    */
    function cancelAll(uint256 tokenId) public returns(bool) {
        //check if buyer has made any offer, and get its offer id
        if(NFT_OFFERS[tokenId].length > 0) {
            require(msg.sender == NFT_OFFERS[tokenId][0].seller, "Not the seller of this NFT");
            address _buyer;
            for(uint i=0;i<=NFT_OFFERS[tokenId].length;i++) {
                if(NFT_OFFERS[tokenId][0].buyer != address(0)){
                    _buyer = NFT_OFFERS[tokenId][0].buyer; //use base offer
                    doMiniCancel(tokenId, 0, _buyer, true);
                }
            }
            //emit event
            emit cancelAllOffer(tokenId, msg.sender);
        }
        return true;
    }
    /*
        This function monitors NFT offer. 
        Revert offer if duration is expended.
        can be called by anybody
    */
    function monitorNftOffer(uint256 tokenId, uint offerId) external returns (bool) {
       //check if offer has expired
       if(NFT_OFFERS[tokenId][offerId].duration < block.timestamp) {
           //This offer has expired
           address buyer = NFT_OFFERS[tokenId][offerId].buyer;
           uint256 duration = NFT_OFFERS[tokenId][offerId].duration;
           doMiniCancel(tokenId, offerId, buyer, true);
           emit expiredOffer(tokenId, offerId, buyer, duration);
       }
        return true;
    }
    /* Utilities functions */
 
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
        This function sets the buyer fee
        can only be called by the owner of the smart contract
        @params feePercent: the seller fee in terms of percent(0-100)
    */
    function setBuyerFee(uint feePercent) external isOwner returns(bool) {
        require(feePercent > 0, "Cannot set zero fees");
        BUYER_FEE_PERCENT = feePercent;
        emit changeFee(feePercent, "BUYER FEE PERCENT");
        return true;
    }
    /* 
        This function returns all offer for a NFT
    */
    function viewAllOffer(uint tokenId) external view returns(offer[] memory) {
        return NFT_OFFERS[tokenId];
    }
    /*
        This function checks if a buyer has made an offer
    */
    function checkIfOfferMade(address buyer, uint256 tokenId) public view returns(bool, uint) {
        for(uint i=0;i<NFT_OFFERS[tokenId].length;i++) {
            if(NFT_OFFERS[tokenId][i].buyer ==  buyer) {
                //buyer has made an offer
                return (true, i);
            }
        }
        return (false, 0);
    }
    /*
        This functions perform offer cancellation
        Which is common to both sellers and buyers cancelling
        @params doRevert: signifies if the snc tokens should be returned back to buyer
    */
    function doMiniCancel(uint tokenId, uint offerId, address buyer, bool doRevert) private returns(bool) {
        //using check-effects-interaction pattern to prevent reetrancy attack
        /* checks */
        require(NFT_OFFERS[tokenId][offerId].buyer == buyer, "This offer was not made by this buyer");
        /* Effects */
        Escrow escrow = Escrow(NFT_OFFERS[tokenId][offerId].escrow);
        uint256 buyerFee = snc.balanceOf(address(escrow)) - NFT_OFFERS[tokenId][offerId].price;
        //reset offer
        NFT_OFFERS[tokenId][offerId] = offer(
            offerId,
            0,
            0,
            0,
            address(0),
            address(0),
            address(0)
        );
        //delete this entry
        NFT_OFFERS[tokenId][offerId] = NFT_OFFERS[tokenId][NFT_OFFERS[tokenId].length - 1];
        //reset the offer id to this current index
        NFT_OFFERS[tokenId][offerId].offerId = offerId;
        NFT_OFFERS[tokenId].pop();
        //check if there is no more offer
        if(NFT_OFFERS[tokenId].length == 0) {
            /*
                all buyers has removed their offer. reset the has accepted offer flag
                read the code logic of the acceptOffer to understand more of this
            */
            NFT_OFFER_COMPLETED[tokenId] = false;
        }

        /* Interactions */
        if(doRevert) {
            //move SNC from escrow to buyer
            escrow.transferFromEscrowtoUser(buyer, (snc.balanceOf(address(escrow)) - buyerFee));
            escrow.transferFromEscrowtoUser(CHANGE_FEE, buyerFee);
        }
        return true;
    }

}