// sepolia-deployment-check.js
// Check Sepolia ETH balance and prepare deployment config

require('dotenv').config();
const { ethers } = require('ethers');

async function checkSepoliaDeployment() {
  console.log('🔍 Checking Sepolia Deployment Readiness');
  console.log('========================================');

  try {
    // Connect to Sepolia testnet
    const sepoliaProvider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
    const deployer = new ethers.Wallet(process.env.WEBHOOK_SIGNER_PRIVATE_KEY, sepoliaProvider);

    console.log(`📍 Deployer: ${deployer.address}`);
    
    // Check Sepolia ETH balance
    const balance = await sepoliaProvider.getBalance(deployer.address);
    const balanceETH = ethers.formatEther(balance);
    console.log(`⛽ Sepolia ETH Balance: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) >= 0.01) {
      console.log('✅ Sufficient Sepolia ETH for deployment!');
    } else {
      console.log('❌ Insufficient Sepolia ETH for deployment');
      console.log('💡 Need at least 0.01 ETH on Sepolia');
      return;
    }

    // Generate deployment configuration
    const constructorParams = {
      mountainSharesToken: process.env.MOUNTAINSHARES_TOKEN,
      settlementReserve: process.env.SETTLEMENT_WALLET_ADDRESS,
      treasuryReinforcement: process.env.H4H_TREASURY_RESERVE_BUILDER_ADDRESS,
      h4hNonprofit: process.env.H4H_NONPROFIT_ADDRESS,
      h4hCommunityPrograms: process.env.H4H_COMMUNITY_PROGRAMS_ADDRESS,
      h4hTreasury: process.env.H4H_TREASURY_MOUNTAINSHARES_ADDRESS,
      h4hGovernance: process.env.H4H_GOVERNANCE_ADDRESS,
      development: process.env.DEVELOPMENT_ADDRESS
    };

    console.log('\n📋 Constructor Parameters for Deployment:');
    console.log('==========================================');
    Object.entries(constructorParams).forEach(([key, value], index) => {
      console.log(`${index + 1}. ${key}: ${value}`);
    });

    // Create deployment configuration
    const deploymentConfig = {
      network: 'Sepolia → Arbitrum One',
      deployer: deployer.address,
      sepoliaBalance: balanceETH,
      constructorParams: constructorParams,
      deploymentOrder: [
        'mountainSharesToken',
        'settlementReserve', 
        'treasuryReinforcement',
        'h4hNonprofit',
        'h4hCommunityPrograms',
        'h4hTreasury',
        'h4hGovernance',
        'development'
      ]
    };

    // Save deployment config
    const fs = require('fs');
    fs.writeFileSync('sepolia-deployment-config.json', JSON.stringify(deploymentConfig, null, 2));
    console.log('\n💾 Saved deployment config to sepolia-deployment-config.json');

    console.log('\n🎯 Deployment Ready!');
    console.log('====================');
    console.log('✅ Sepolia ETH balance: Sufficient');
    console.log('✅ Constructor parameters: Ready');
    console.log('✅ Deployment config: Generated');

    console.log('\n🚀 Deploy through your pipeline now!');
    console.log('📋 Use constructor parameters in order from the config file');

  } catch (error) {
    console.error('❌ Sepolia check failed:', error.message);
  }
}

// Run Sepolia deployment check
checkSepoliaDeployment();
