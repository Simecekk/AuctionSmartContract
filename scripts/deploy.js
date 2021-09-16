
const hre = require("hardhat");

async function main() {
  const AuctionCreator = await hre.ethers.getContractFactory("auctionCreator");
  const auctionCreator = await AuctionCreator.deploy();

  await auctionCreator.deployed();
  console.log("auctionCreator deployed to:", auctionCreator.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
