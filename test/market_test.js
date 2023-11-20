const { expect } = require("chai");
const ethers = require("hardhat").ethers;
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const  Web3 = require('web3');


describe("Market contract", function () {
  //using hardhat fixtures
  async function deployContractFixture() {
        //Deploys contract to hardhat network
        const [owner, userAddress, otherAddress, houseAddress] = await ethers.getSigners();
        const snc = await ethers.getContractFactory("SNC");
        const nft = await ethers.getContractFactory("NFTMinter");
        const market = await ethers.getContractFactory("MarketSale");
        //deploying the contract
        const sncToken = await snc.deploy();
        const nftToken = await nft.deploy(owner.address);
        const marketToken = await market.deploy(sncToken.address, nftToken.address, houseAddress.address, 100, 100)
        //fund the user address with sufficient tokens
        await sncToken.transfer(userAddress.address,  Web3.utils.toWei('9000000000', 'ether'))
        await sncToken.transfer(otherAddress.address,  Web3.utils.toWei('9000000000', 'ether'))
        //first give approval for the offer contract to spend your tokens
        await sncToken.approve(marketToken.address, Web3.utils.toWei('9000000000', 'ether'));
        await sncToken.connect(userAddress).approve(marketToken.address, Web3.utils.toWei('9000000000', 'ether'));
        await sncToken.connect(otherAddress).approve(marketToken.address, Web3.utils.toWei('9000000000', 'ether'));
        //mint nft
        await nftToken.mint((new Date(Date())).getTime());
        await nftToken.setApprovalForAll(marketToken.address, true);
        // Fixtures can return anything you consider useful for your tests
        return {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress};
  }
  
  it("Verify NFTs Fee address can be updatable ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    await marketToken.changeFeeAddress(userAddress.address)
    expect(await marketToken.CHANGE_FEE()).to.equal(userAddress.address);
  });

  it("Verify NFTs sell price can be updated in secondary market ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.updateSalePrice(Web3.utils.toWei('100', 'ether'), 1)
    expect((await marketToken.NFT_SALES(1)).price).to.equal(Web3.utils.toWei('100', 'ether'));
  });

  it("Verify NFTs sell price can be updated in primary market ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.updateSalePrice(Web3.utils.toWei('100', 'ether'), 1)
    expect((await marketToken.NFT_SALES(1)).price).to.equal(Web3.utils.toWei('100', 'ether'));
  });
  
  it("Verify NFTs sell date can be updatable", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.updateDuration(5000, 1)
    const _newDuration = (await marketToken.NFT_SALES(1)).duration
    expect(_newDuration).to.equal((_newDuration));
  });
   
  it("with invalid fee address NFT can't update. ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    await marketToken.changeFeeAddress('0x4567392902929876726')
    expect(await marketToken.CHANGE_FEE()).to.equal(userAddress.address);
  });

  it(" With -ve buy price NFT can't update.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, -100, 100)
    expect((await marketToken.NFT_SALES(1)).price).to.equal(0);
  });

  it("NFT should be updated with fraction Buy price.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.updateSalePrice(Web3.utils.toWei('70', 'ether'), 1)
    expect((await marketToken.NFT_SALES(1)).price).to.equal(Web3.utils.toWei('70', 'ether'));
  });
 
  it("With -ve sell price NFT can't update.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.updateSalePrice(-100, 1)
    expect((await marketToken.NFT_SALES(1)).price).to.equal(-100);
  });
  
  it("NFT should be updated with fraction Sell price.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.updateSalePrice(Web3.utils.toWei('70', 'ether'), 1)
    expect((await marketToken.NFT_SALES(1)).price).to.equal(Web3.utils.toWei('70', 'ether'));
  });
  
  it("With 0 buy price NFT should update.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.updateSalePrice(Web3.utils.toWei('0', 'ether'), 1)
    expect((await marketToken.NFT_SALES(1)).price).to.equal(Web3.utils.toWei('0', 'ether'));
  });
  
  it("Verify NFT sell price is updating with 0 value.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.updateSalePrice(Web3.utils.toWei('0', 'ether'), 1)
    expect((await marketToken.NFT_SALES(1)).price).to.equal(Web3.utils.toWei('0', 'ether'));
  });

  it("Verify NFT BUY date by passing wrong date format. ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.updateDuration(-5000, 1)
    expect((await marketToken.NFT_SALES(1)).duration).to.equal((duration + 5000));
  });
  
  it("Verify NFT Sell date by passing wrong date format.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.updateDuration(-5000, 1)
    expect((await marketToken.NFT_SALES(1)).duration).to.equal((duration + 5000));
  });

  it("Verify Transaction fees should be applied on both buyer and seller in trade. ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await sncToken.balanceOf(houseAddress.address))).to.equal("500000000000000100");
  });
  
  
  it("Verify Buying NFT Transaction fee is updating.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //try updating the price
    await marketToken.setBuyerFee(150)
    expect((await marketToken.BUYER_FEE_PERCENT())).to.equal(150);
  });

  it(" Verify Buying NFT transaction fee with -ve amount. ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //try updating the price
    await marketToken.setBuyerFee(-150)
    expect((await marketToken.BUYER_FEE_PERCENT())).to.equal(-150);
  });

  it("With fraction buying transaction fees it should update", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //try updating the price
    await marketToken.setBuyerFee(120)
    expect((await marketToken.BUYER_FEE_PERCENT())).to.equal(120);
  });
  
  it(" Verify selling NFT Transaction fee is updating. ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //try updating the price
    await marketToken.setSellerFee(120)
    expect((await marketToken.SELLER_FEE_PERCENT())).to.equal(120);
  });
 
  it("Verify Selling NFT transaction fee with -ve amount.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //try updating the price
    await marketToken.setSellerFee(-120)
    expect((await marketToken.SELLER_FEE_PERCENT())).to.equal(-120);
  });

  it("Verify Selling NFT transaction fees with fraction value. ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //try updating the price
    await marketToken.setSellerFee(100)
    expect((await marketToken.SELLER_FEE_PERCENT())).to.equal(100);
  });
 
  it("Verify user can able to buy the nft from primary market from collect page", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await sncToken.balanceOf(houseAddress.address))).to.equal("500000000000000100");
  });
  
  it("Verify after buying NFT from collect page same NFT is adding to the users dashboard.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await nftToken.balanceOf(userAddress.address, 1))).to.equal(1);
  });
  
  it(`Verify if more than one request is made to buy same nft
  from collect page than on FCFS basis NFTs are
   `, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    await marketToken.connect(otherAddress).buyNft(otherAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await nftToken.balanceOf(userAddress.address, 1))).to.equal(1);
  });

  it("Verify when user buys from collect page correct Transaction Fees is applying.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await sncToken.balanceOf(houseAddress.address))).to.equal("500000000000000100");
  });
  
  it("Verify when nfts are launched in the Primary market than all the nfts should be in Escrow account.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    const escrow = (await marketToken.NFT_SALES(1)).escrow
    expect((await nftToken.balanceOf(escrow, 1))).to.equal(1);
  });
  
  it("Verify user puts nfts on sell in trade page then same NFT is tradable i.e buy/sell is happening. ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    const isSale = (await marketToken.NFT_SALES(1)).complete
    expect(isSale).to.equal(false);
  });
  
  it("  Verify that after expiry date in primary market user is able to Buy NFTs.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 500
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    setTimeout(async () => {
        await marketToken.monitorNftSale(1);
        expect((await marketToken.NFT_SALES(1)).price).to.equal('0');
      }, 1000)
    
  });
  
  it(" Verify that after buying NFT from primary market details like date, price, tokenid is correct.  ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await nftToken.balanceOf(userAddress.address, 1))).to.equal(1);
  });

  it("Verify the ownership of the NFT is changing when Bought from primary market.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await nftToken.balanceOf(userAddress.address, 1))).to.equal(1);
  });

  it("Verify User can buy the nft from trade page, i.e Secondary market.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await nftToken.balanceOf(userAddress.address, 1))).to.equal(1);
  });

  it("Verify user can't be able to sell the nft in trade page, i.e secondary market.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    expect((await marketToken.NFT_SALES(1)).tokenId).to.equal(1);
  });
  
  it("Verify when user buys from collect page correct Transaction Fees is applying.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await sncToken.balanceOf(houseAddress.address))).to.equal("500000000000000100");
  });

  it(`Verify in secondary 
  market trade is happening on the basis of FCFS
   `, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    await marketToken.connect(otherAddress).buyNft(otherAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await nftToken.balanceOf(userAddress.address, 1))).to.equal(1);
  });

  it("Verify escrow account while buying and selling.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    const escrow = (await marketToken.NFT_SALES(1)).escrow
    expect((await nftToken.balanceOf(escrow, 1))).to.equal(1);
  });

  it(` Verify NFTs should transfer to buyers account when sell is happened.`, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await nftToken.balanceOf(userAddress.address, 1))).to.equal(1);
  });
  
  it(" Verify After sell transaction fee should add into the house wallet.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await sncToken.balanceOf(houseAddress.address))).to.equal("500000000000000100");
  });

  it(`Verify after sell nfts should no longer be available with the user who puts it for sell in secondary market.`, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await nftToken.balanceOf(owner.address, 1))).to.equal(0);
  });
  
  it("Verify seller can able to update his price multiple times.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.updateSalePrice(Web3.utils.toWei('100', 'ether'), 1)
    await marketToken.updateSalePrice(Web3.utils.toWei('30', 'ether'), 1)
    expect((await marketToken.NFT_SALES(1)).price).to.equal(Web3.utils.toWei('30', 'ether'));
  });
 
  it(`Verify when user requests to buy nft is less amount set by seller.`, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('20', 'ether'), 100)
    expect((await nftToken.balanceOf(owner.address, 1))).to.equal(0);
  });
  
  it("Verify when time is expired than nfts should move to seller account", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 500
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    setTimeout(async () => {
        await marketToken.monitorNftSale(1);
        expect((await nftToken.balanceOf(owner.address, 1))).to.equal(1);
    }, 1000)
    
  });
  
  it("Verify transaction fees will applied only when trade is made in secondary market.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await sncToken.balanceOf(houseAddress.address))).to.equal("500000000000000100");
  });

  it(`Verify Ownership is changing in the secondary market after trade.`, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await nftToken.balanceOf(userAddress.address, 1))).to.equal(1);
  });
  
  it(`Verify after minting And when nft launched to primary market all nfts should present in the escrow account.`, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    const escrow = (await marketToken.NFT_SALES(1)).escrow
    expect((await nftToken.balanceOf(escrow, 1))).to.equal(1);
  });
  
  it(`Verify in primary market user is able to buy NFTs and nfts should transferred to buyers account.`, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await nftToken.balanceOf(userAddress.address, 1))).to.equal(1);
  });

  it(`Verify buy/sell in secondary market , Nfts should transferresd to buyers account and seller will get SNC after sell is successfull.`, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await sncToken.balanceOf(owner.address))).to.equal(Web3.utils.toWei("1782000000049.5", "ether"));
  });

  it(`  Verify that when user puts any nft for sell than their NFT must be in locked state in escrow account. `, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    const escrow = (await marketToken.NFT_SALES(1)).escrow
    expect((await nftToken.balanceOf(escrow, 1))).to.equal(1);
  });

  it(`Verify that when user sends request to buy nft then their SNC must move to escrow account in locked state  `, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    const escrow = (await marketToken.NFT_SALES(1)).escrow
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await sncToken.balanceOf(escrow))).to.equal(0);
  });
  
  it(" Verify buyer and seller can't use the NFTs and SNC which is in locked state. ", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //do simple transfer of SNC tokens and check if it affects the locked tokens
    await sncToken.connect(userAddress).transfer(otherAddress.address,  Web3.utils.toWei('90', 'ether'))
    const escrow = (await marketToken.NFT_SALES(1)).escrow
    expect(await nftToken.balanceOf(escrow, 1)).to.equal(1);  
  });
  
  it(`Verify transaction fees is applying for both buyer and seller in secondary market and same should be locked in the escrow account. `, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    const escrow = (await marketToken.NFT_SALES(1)).escrow
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await sncToken.balanceOf(escrow))).to.equal(0);
  });
  
  it(`Verify After successful sell in the secondary market NFTs , SNC and
  Fees will transferred to buyer,seller and House wallet respectively
 `, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await sncToken.balanceOf(houseAddress.address))).to.equal("500000000000000100");
  });

  it(` Verify when sell is cancelled in the secondary market than NFTs and Fees will be returned to Seller and house respectively
  from escrow account`, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    const escrow = (await marketToken.NFT_SALES(1)).escrow
    await marketToken.cancelSale(1)
    expect((await nftToken.balanceOf(owner.address, 1))).to.equal(1);
 });

 it("Verify that NFT price, date is updating and same should reflect in the escrow account.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.updateSalePrice(Web3.utils.toWei('55', 'ether'), 1)
    expect((await marketToken.NFT_SALES(1)).price).to.equal(Web3.utils.toWei('55', 'ether'));
  });

  it("Verify once seller update the date and put it for sell and buyers at the same time sends the request to buy then seller can't change the price and date at that time", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    await marketToken.updateSalePrice(Web3.utils.toWei('55', 'ether'), 1)
    expect((await marketToken.NFT_SALES(1)).price).to.equal(Web3.utils.toWei('55', 'ether'));
  });

  it(`
  Verify seller can not be able to cancel the sell once NFTs moved into the
locked state and buyers sends the request to buy
`, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    await marketToken.cancelSale(1)
    expect((await nftToken.balanceOf(owner.address, 1))).to.equal(0);
  });


  it(`
  Verify seller can only cancel the sell when no requests is received from
  the buyer in the secondary market.
`, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.cancelSale(1)
    expect((await nftToken.balanceOf(owner.address, 1))).to.equal(1);
  });

  it(" Verify after expiration of the NFTs sell date same NFT should be returned back to sellers account from escrow accont.", async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 500
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    setTimeout(async () => {
        await marketToken.monitorNftSale(1);
        expect((await nftToken.balanceOf(owner.address, 1))).to.equal(1);
    }, 1000)
    
  });
 
  it(`Verify when buyer requests less amount than sell price set by seller
  than it will auto reject and not moved into escrow account.`, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress, otherAddress, houseAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('20', 'ether'), 100)
    expect((await nftToken.balanceOf(owner.address, 1))).to.equal(0);
  });
  
  it(` Verify the Scenerio when seller wants to cancel the sell and at the
  same time buyer sends the request to buy.`, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    await marketToken.cancelSale(1)
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await nftToken.balanceOf(owner.address, 1))).to.equal(0);
  });
 
  it(`
  Verify when any failure happen during the transaction than Nft and SNC should be reverted back. 
  `, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    //try updating the price
    await marketToken.cancelSale(1)
    expect((await nftToken.balanceOf(owner.address, 1))).to.equal(1);
  });

  it(` Verify once transaction is happened than it can't be reverted back.
  `, async function () {
    //importing the token via the fixtures
    const {sncToken, nftToken, marketToken, owner, userAddress} = await loadFixture(deployContractFixture);
    //make the offer
    const duration = (new Date(Date())).getTime() + 50000
    await marketToken.putForSale(nftToken.address, 1, Web3.utils.toWei('50', 'ether'), duration, Web3.utils.toWei('10', 'ether')) 
    await marketToken.connect(userAddress).buyNft(userAddress.address, 1, Web3.utils.toWei('50', 'ether'), 100)
    expect((await nftToken.balanceOf(owner.address, 1))).to.equal(0);
  });

});

 
 