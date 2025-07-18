require('dotenv').config();
const hre = require("hardhat");

async function testSepoliaDeployment() {
  console.log('🧪 PHASE 2: Sepolia Test Deployment');
  console.log('==================================');
  
  const wallet = new hre.ethers.Wallet(process.env.WEBHOOK_SIGNER_PRIVATE_KEY, hre.ethers.provider);
  console.log('🔍 Deploying with wallet:', wallet.address);
  
  // Test constructor arguments
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

  console.log('📋 Constructor arguments:');
  constructorArgs.forEach((arg, i) => {
    console.log(`  ${i}: ${arg}`);
    if (arg && arg.toLowerCase() === '0xde75f5168e33db23fa5601b5fc88545be7b287a4') {
      console.log('🚨 WARNING: Compromised address detected!');
    }
  });

  // Check for any undefined or missing arguments
  const missingArgs = constructorArgs.filter((arg, i) => !arg);
  if (missingArgs.length > 0) {
    console.log('❌ Missing constructor arguments detected');
    return;
  }

  console.log('✅ Constructor args validated');
  console.log('✅ Ready for Sepolia deployment');
  
  // Test wallet balance
  try {
    const balance = await wallet.provider.getBalance(wallet.address);
    console.log('💰 Wallet balance:', hre.ethers.formatEther(balance), 'ETH');
  } catch (error) {
    console.log('❌ Could not check balance:', error.message);
  }
}

testSepoliaDeployment().catch(console.error);
