const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying MountainSharesUSDCPurchase...");
  
  // Constructor parameters from environment variables
  const constructorArgs = [
    process.env.MOUNTAINSHARES_TOKEN,
    process.env.SETTLEMENT_WALLET_ADDRESS,
    process.env.H4H_TREASURY_RESERVE_BUILDER_ADDRESS,
    process.env.H4H_NONPROFIT_ADDRESS,
    process.env.H4H_COMMUNITY_PROGRAMS_ADDRESS,
    process.env.H4H_TREASURY_MOUNTAINSHARES_ADDRESS,
    process.env.H4H_GOVERNANCE_ADDRESS,
    process.env.DEVELOPMENT_ADDRESS
  ];

  console.log("📋 Constructor arguments:");
  console.log("  Token:", constructorArgs[0]);
  console.log("  Settlement:", constructorArgs[1]);
  console.log("  Reinforcement:", constructorArgs[2]);
  console.log("  Nonprofit:", constructorArgs[3]);
  console.log("  Community:", constructorArgs[4]);
  console.log("  Treasury:", constructorArgs[5]);
  console.log("  Governance:", constructorArgs[6]);
  console.log("  Development:", constructorArgs[7]);

  const MountainSharesUSDCPurchase = await hre.ethers.getContractFactory("MountainSharesUSDCPurchase");
  const contract = await MountainSharesUSDCPurchase.deploy(...constructorArgs);

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ Contract deployed to:", contractAddress);
  console.log("📋 Update environment: MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS=" + contractAddress);
}

main().catch(console.error);
