const { expect } = require("chai");
const ethers = require("hardhat").ethers;
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const  Web3 = require('web3');


describe("Offer contract", function () {
  //using hardhat fixtures
  async function deployContractFixture() {
        //Deploys contract to hardhat network
        const [owner, userAddress, otherAddress, houseAddress] = await ethers.getSigners();
        const snc = await ethers.getContractFactory("SNC");
        const nft = await ethers.getContractFactory("NFTMinter");
        const offer = await ethers.getContractFactory("Offer");
        //deploying the contract
        const sncToken = await snc.deploy();
        const nftToken = await nft.deploy(owner.address);
        const offerToken = await offer.deploy(sncToken.address, nftToken.address, houseAddress.address, 150, 150);
        //fund the user address with sufficient tokens
        await sncToken.transfer(userAddress.address,  Web3.utils.toWei('9000000000', 'ether'))
        await sncToken.transfer(otherAddress.address,  Web3.utils.toWei('9000000000', 'ether'))
        //first give approval for the offer contract to spend your tokens
        await sncToken.approve(offerToken.address, Web3.utils.toWei('9000000000', 'ether'));
        await sncToken.connect(userAddress).approve(offerToken.address, Web3.utils.toWei('9000000000', 'ether'));
        await sncToken.connect(otherAddress).approve(offerToken.address, Web3.utils.toWei('9000000000', 'ether'));
        //mint nft
        await nftToken.mint((new Date(Date())).getTime());
        await nftToken.setApprovalForAll(offerToken.address, true);
        // Fixtures can return anything you consider useful for your tests
        return {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress};
  }
  
  it("Verifying that Buyers can send buy request for NFTs to the seller", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    expect((await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'))).value).to.equal(0);
  });
  
  it("Verifying that SNCs are locked in escrow after an offer was made", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, owner.address, owner.address, Web3.utils.toWei('10', 'ether'));
    const recent_offer = await offerToken.NFT_OFFERS(1, 0);
    expect(await sncToken.balanceOf(recent_offer.escrow)).to.equal(Web3.utils.toWei('110', 'ether'));
  });
  
  it("Verifying that Buyer can send offer with amount and date", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, owner.address, owner.address, Web3.utils.toWei('10', 'ether'));
    const recent_offer = await offerToken.NFT_OFFERS(1, 0);
    expect(await recent_offer.duration).to.equal(duration);
  });
  
  it("Verifying that details like price, date of offers made are correct", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, owner.address, owner.address, Web3.utils.toWei('10', 'ether'));
    const recent_offer = await offerToken.NFT_OFFERS(1, 0);
    expect(await recent_offer.price).to.equal(Web3.utils.toWei('100', 'ether'));
  });

  it("Verifying that multiple offers can be made on a NFT", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, owner.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    const recent_offers = await offerToken.viewAllOffer(1);
    expect(await recent_offers.length).to.equal(2);
  });

  it("Verifying that a buyer can  make multiple offers on the same NFT", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, owner.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, owner.address, owner.address, Web3.utils.toWei('10', 'ether'));
    expect(false).to.equal(true);
  });

  it("Verify after the offer duration is over the offer request will not be visiable in the sellers portfolio.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 500
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    setTimeout(async () => {
      await offerToken.monitorNftOffer(1, 0);
      const recent_offer = await offerToken.NFT_OFFERS(1, 0);
      expect(recent_offer.buyer).to.equal('00000000000000000000');
    }, 1000)
    
  });

  it("Verify after offer request duration is over and request is not accepted than SNC's and Transaction fees will be returned back ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 500
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    setTimeout(async () => {
      await offerToken.monitorNftOffer(1, 0);
      expect(await sncToken.balanceOf(houseAddress.address)).to.equal(Web3.utils.toWei('23', 'ether'));
    }, 1000)
    
  });

  it("Verifying that a buyer can  make offer after it has been cancelled by the seller", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.cancelOfferSeller(1, 0, owner.address) 
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    const recent_offer = await offerToken.NFT_OFFERS(1, 0);
    expect(await recent_offer.buyer).to.equal(userAddress.address);
 
  });

  it("Verifying that when an offer is accepted, other offers fees are returned to the buyers and house address", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.connect(otherAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, owner.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.acceptOffer(1, 0, owner.address, true)
    expect(await sncToken.balanceOf(houseAddress.address)).to.equal(Web3.utils.toWei('23', 'ether'));
  });

  it("Verify after accepting the offer NFT,SNC and transaction fees is crediting to correct account. ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.connect(otherAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, owner.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.acceptOffer(1, 0, owner.address, true)
    expect(await sncToken.balanceOf(owner.address)).to.equal(Web3.utils.toWei('1782000000187', 'ether'));  
  });

  it("Verify the values like NFTs, Fees and SNC amount is correctly Credited after r sell of the nft to buyer, house, and seller respectively ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.connect(otherAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, owner.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.acceptOffer(1, 0, owner.address, true)
    expect(await nftToken.balanceOf(userAddress.address , 1)).to.equal(1);  
  });
 
  it("Verify after cancelling the offer from buyer SNC and transaction fees will be returned back to the buyer account and house wallet respectively", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.cancelOfferBuyer(userAddress.address, 1)
    expect(await sncToken.balanceOf(houseAddress.address)).to.equal(Web3.utils.toWei('10', 'ether'));
  });
  
  it("Verify correct Values of snc and fees is returned after cancelling of the request. ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.cancelOfferBuyer(userAddress.address, 1)
    expect(await sncToken.balanceOf(houseAddress.address)).to.equal(Web3.utils.toWei('10', 'ether'));
  });
  
  it("Verify at the same time when buyers cancels the request and seller is accepting the request.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.connect(userAddress).cancelOfferBuyer(userAddress.address, 1)
    await offerToken.acceptOffer(1, 0, owner.address, true)
    const recent_offer = await offerToken.viewAllOffer(1);
    expect(await recent_offer.length).to.equal(0);
  });

  it("Verify after cancelling the offer from buyer side request should not show in the sellers account.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.connect(userAddress).cancelOfferBuyer(userAddress.address, 1)
    const recent_offer = await offerToken.viewAllOffer(1);
    expect(await recent_offer.length).to.equal(0);
  });

  it("Verify after cancelling the request snc and fees will be released from the escrow account.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    const _escrow = (await offerToken.NFT_OFFERS(1, 0)).escrow;
    await offerToken.cancelOfferSeller(1, 0, owner.address)
    expect(await sncToken.balanceOf(_escrow)).to.equal(0);
  });
  
  it(" Verify All offering will be shown to the Seller's portfolio.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.connect(otherAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, otherAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    const recent_offer = await offerToken.viewAllOffer(1);
    expect(await recent_offer.length).to.equal(2);
  });
 
  it("Verify Details of all the offering should be correct", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    const recent_offer = await offerToken.NFT_OFFERS(1, 0)
    expect(await recent_offer.tokenId).to.equal(1);
  });
  
  it("Verify when seller accepts the offer seller's NFT will move to the escrow account.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.acceptOffer(1, 0, owner.address, true)
    expect(await nftToken.balanceOf(userAddress.address , 1)).to.equal(1);  
  });

  it("Verify correct transaction fees is appilied on the seller NFTs when offer is accepted by the seller.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.acceptOffer(1, 0, owner.address, true)  
    expect(await sncToken.balanceOf(houseAddress.address)).to.equal(Web3.utils.toWei('13', 'ether'));
  });
  
  it(" Verify SNC and transaction fees is credited to the sellers account and fees will be credited to the house after sell is executed.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.connect(otherAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, otherAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.acceptOffer(1, 0, owner.address, true) 
    expect(await sncToken.balanceOf(owner.address)).to.equal(Web3.utils.toWei('1782000000197', 'ether'));  
  });
 
  it("Verify seller can be able to reject all the offers when he does't want to sell the nft.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.connect(otherAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, otherAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.cancelAll(1)
    const recent_offer = await offerToken.viewAllOffer(1);
    expect(await recent_offer.length).to.equal(0);
  });

  it("Verify after accepting one offer seller can be able to reject all the other offers. ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.connect(otherAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, otherAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.acceptOffer(1, 0, owner.address, false)  
    await offerToken.cancelAll(1)
    const recent_offer = await offerToken.viewAllOffer(1);
    expect(await recent_offer.length).to.equal(0);
  });
  
  it(` Verify after sell is successfully completed than SNC, Nft and
  fees will be transferred to Seller , Buyer and house respectively`, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.connect(otherAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, otherAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.acceptOffer(1, 0, owner.address, false)  
    const recent_offer = await offerToken.viewAllOffer(1);
    expect(await nftToken.balanceOf(userAddress.address , 1)).to.equal(1);  
  });

  it("Verify due to any reason sell is cancelled than snc , nft and fees will be returned back to the buyer , seller and house respectively", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.connect(otherAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, otherAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.cancelAll(1)
    expect(await nftToken.balanceOf(owner.address , 1)).to.equal(1);  
  });
  
  it("Verify due to any reason sell is cancelled than snc , nft and fees will be returned back to the buyer , seller and house respectively, but not in the escrow account.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.connect(otherAddress).makeOffer(1, Web3.utils.toWei('100', 'ether'), duration, otherAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.cancelAll(1)
    expect(await nftToken.balanceOf(owner.address , 1)).to.equal(1);  
  });

  it("Verify seller is able to cancel the offer.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    const _escrow = (await offerToken.NFT_OFFERS(1, 0)).escrow;
    await offerToken.cancelOfferSeller(1, 0, owner.address)
    const recent_offer = await offerToken.viewAllOffer(1);
    expect(recent_offer.length).to.equal(0);
  });
  
  it("Verify After cancelling the offer, offer should not show in the activity page.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    const _escrow = (await offerToken.NFT_OFFERS(1, 0)).escrow;
    await offerToken.cancelOfferSeller(1, 0, owner.address)
    const recent_offer = await offerToken.viewAllOffer(1);
    expect(recent_offer.length).to.equal(0);
  });

  it(`
  verify after cancelling the offer SNC and transaction fees should
  return to the Buyers and house wallet respectively from escrow account. 
  `, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    const _escrow = (await offerToken.NFT_OFFERS(1, 0)).escrow;
    await offerToken.cancelOfferSeller(1, 0, owner.address)
    expect(await sncToken.balanceOf(_escrow)).to.equal(0);
  });

  it("Verify correct Amount of SNC and fees is returend to buyers and house wallet after offer is rejected. ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    await offerToken.cancelOfferBuyer(userAddress.address, 1)
    expect(await sncToken.balanceOf(houseAddress.address)).to.equal(Web3.utils.toWei('10', 'ether'));
  });

  it("Verify SNC and Fees should be in locked state and buyer cannot use that snc to another purpose.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, offerToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await offerToken.connect(userAddress).makeOffer(1, Web3.utils.toWei('200', 'ether'), duration, userAddress.address, owner.address, Web3.utils.toWei('10', 'ether'));
    //do simple transfer of SNC tokens and check if it affects the locked tokens
    await sncToken.connect(userAddress).transfer(otherAddress.address,  Web3.utils.toWei('90', 'ether'))
    const _escrow = (await offerToken.NFT_OFFERS(1, 0)).escrow;
    expect(await sncToken.balanceOf(_escrow)).to.equal(Web3.utils.toWei('210', 'ether'));  
  });
  
});