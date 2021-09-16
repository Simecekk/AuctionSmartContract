const { expect } = require("chai");
const { ethers } = require("hardhat");

describe('Auction', function () {

  beforeEach(async () => {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    Auction = await ethers.getContractFactory('Auction');
    auction = await Auction.deploy(owner.address);
  });

  describe('Deployment', async () => {
    it('Should set owner to address pass to constructor', async() => {
      expect(await auction.owner()).to.be.equal(owner.address);
    });

    it('Should set Initial state to Running', async() => {
      // Running is on the index 1
      expect(await auction.auctionState()).to.be.equal(1);
    });

    it('Should set startBlock to the block number at deployment', async() => {
      expect(
        (await auction.startBlock()).toNumber()
      ).to.be.equal(
        await waffle.provider.getBlockNumber()
      );
    });

    it('Should set endBlock to block mined after 1 week', async() => {
      let blockMinedInOneWeek = (await auction.startBlock()).toNumber() + 60*60*24*7 / 15
      expect(
        (await auction.endBlock()).toNumber()
      ).to.be.equal(
        blockMinedInOneWeek
      );
    });

    it('Should set bidIncrement to 100 wei', async() => {
      expect(await auction.getBidIncrement()).to.be.equal(100);

      await expect(
        auction.connect(addr1).getBidIncrement()
      ).to.be.revertedWith(
        'You are not the owner of the auction'
      );

    });
  });

  describe('State handling methods', async () => {
    it('Should set state canceled when called cancelAuction', async () => {
      await expect(
        auction.connect(addr1).cancelAuction()
      ).to.be.revertedWith(
        'You are not the owner of the auction'
      );
      await auction.cancelAuction();
      // Canceled state is on index 3
      expect(await auction.auctionState()).to.be.equal(3)
    });
  });

  describe('Placing a bid', async() => {
    it('placeBid should not be called by owner', async () => {
      await expect(
        auction.placeBid({value: ethers.utils.parseEther("1")})
      ).to.be.revertedWith(
        'As a owner you cannot execute this function'
      );
    });

    it('Should place a bid only in running function', async () => {
      await auction.cancelAuction();
      await expect(
        auction.connect(addr1).placeBid({value: ethers.utils.parseEther("1")})
      ).to.be.revertedWith(
        'Auction is not running'
      );
    });

    it('Placed bid muset be higher than highestBindingBid', async () => {
      await auction.connect(addr1).placeBid(
        {value: ethers.utils.parseEther('2.0')}
      );
      await auction.connect(addr2).placeBid(
        {value: ethers.utils.parseEther('3.0')}
      );
      await expect(
        auction.connect(addr3).placeBid({value: ethers.utils.parseEther('1.0')})
      ).to.be.revertedWith(
        'Current bid must be higher than highestBindingBid'
      )
    });

    it('Minimum bid should be 100 wei', async () => {
      await expect(
        auction.connect(addr1).placeBid({value: 50})
      ).to.be.revertedWith(
        'Minimum bid is 100 wei'
      );
    });

    it('Should sum all the user bids', async () => {
      await auction.connect(addr1).placeBid({
        value: ethers.utils.parseEther('1.0')
      });
      await auction.connect(addr1).placeBid({
        value: ethers.utils.parseEther('5.0')
      });
      expect(
        await auction.bids(addr1.address)
      ).to.be.equal(
        ethers.utils.parseEther('6.0')
      );
    });

    it('Should set highestBindingBid to correct value', async () => {
      await auction.connect(addr1).placeBid({
        value: 200
      })

      await auction.connect(addr2).placeBid({
        value: 150
      })

      expect(
        await auction.highestBindingBid()
      ).to.be.equal(
        200
      )

      await auction.connect(addr1).placeBid({
        value: 400
      })

      expect(
        await auction.highestBindingBid()
      ).to.be.equal(
        300
      )

    });
  });

  describe('finalizeAuction auction', async () => {
    it('Auction must be canceled or finished', async () => {
      await expect(
        auction.finalizeAuction()
      ).to.be.revertedWith(
        'Auction must be canceled or finished'
      );
      await auction.cancelAuction();
      await auction.finalizeAuction();
    });

    it('Only owner or bidder can call finalizeAuction', async () => {
      await auction.connect(addr1).placeBid({value: 300});
      await auction.cancelAuction();

      await expect(
        auction.connect(addr2).finalizeAuction()
      ).to.be.revertedWith(
        'Only owner or bidder can finalize the auction'
      );

      await auction.finalizeAuction();
      await auction.connect(addr1).finalizeAuction();
    });

    it('When auction is canceled, sender can withdraw their bids', async() => {
      await auction.connect(addr1).placeBid({value: 300});
      await auction.cancelAuction();
      await auction.connect(addr1).finalizeAuction();
    });

  });

});
