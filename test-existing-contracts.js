
require('dotenv').config();
const ArbitrumUSDCConverter = require('./lib/dex-usdc-converter');

async function testExistingContracts() {
  console.log('🔍 Testing Your Existing Smart Contracts');
  console.log('=========================================');

  try {
    const converter = new ArbitrumUSDCConverter();

    // Test 1: Get wallet status
    console.log('\n1️⃣ Wallet Status Check:');
    const walletStatus = await converter.getWalletStatus();
    if (walletStatus.error) {
      console.log(`   ❌ Error: ${walletStatus.error}`);
    } else {
      console.log(`   📍 Address: ${walletStatus.address}`);
      console.log(`   ⛽ ETH Balance: ${walletStatus.ethBalance} ETH`);
      console.log(`   💰 USDC Balance: ${walletStatus.usdcBalance} USDC`);
      console.log(`   🏗️ Has Purchase Contract: ${walletStatus.hasExistingContract}`);
    }

    // Test 2: Check your existing purchase contract
    console.log('\n2️⃣ Purchase Contract Analysis:');
    console.log(`   📋 MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS: ${process.env.MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS}`);
    console.log(`   📋 SETTLEMENT_WALLET_ADDRESS: ${process.env.SETTLEMENT_WALLET_ADDRESS}`);
    console.log(`   📋 MOCKV3_AGGREGATOR_ADDRESS: ${process.env.MOCKV3_AGGREGATOR_ADDRESS}`);
    
    const hasContract = await converter.checkExistingPurchaseContract();
    if (hasContract) {
      console.log('   ✅ Purchase contract exists and is deployed');
      console.log('   💡 This contract might already handle USD→USDC conversion!');
    } else {
      console.log('   ❌ Purchase contract not found or not deployed');
      console.log('   💡 We need to build DEX integration from scratch');
    }

    // Test 3: Check treasury addresses
    console.log('\n3️⃣ Treasury Addresses Validation:');
    const treasuryCheck = {
      'Settlement Reserve': process.env.SETTLEMENT_RESERVE_ADDRESS,
      'Treasury Reinforcement': process.env.H4H_TREASURY_RESERVE_BUILDER_ADDRESS,
      'H4H Nonprofit': process.env.H4H_NONPROFIT_ADDRESS,
      'H4H Community Programs': process.env.H4H_COMMUNITY_PROGRAMS_ADDRESS,
      'H4H Treasury': process.env.H4H_TREASURY_MOUNTAINSHARES_ADDRESS,
      'H4H Governance': process.env.H4H_GOVERNANCE_ADDRESS,
      'Development': process.env.DEVELOPMENT_ADDRESS
    };

    for (const [name, address] of Object.entries(treasuryCheck)) {
      if (address && address.length === 42 && address.startsWith('0x')) {
        console.log(`   ✅ ${name}: ${address}`);
      } else {
        console.log(`   ❌ ${name}: Missing or invalid`);
      }
    }

    // Test 4: Simulate a $1.37 payment processing
    console.log('\n4️⃣ Simulating $1.37 Payment Processing:');
    console.log('   💡 This will show what would happen with a real payment');
    
    const testResult = await converter.processStripePayment(
      1.37, 
      'thecakidd@gmail.com', 
      null // No customer wallet address yet
    );

    console.log(`   ⏰ Timestamp: ${testResult.timestamp}`);
    console.log(`   💰 Amount: $${testResult.stripeAmount}`);
    console.log(`   👤 Customer: ${testResult.customerEmail}`);
    console.log(`   🔧 Steps attempted: ${testResult.steps.length}`);

    testResult.steps.forEach((step, index) => {
      console.log(`\n   Step ${index + 1}: ${step.step}`);
      if (step.success) {
        console.log(`      ✅ Success: ${step.hash || 'Completed'}`);
      } else {
        console.log(`      ❌ Failed: ${step.error}`);
      }
    });

    // Test 5: Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    if (walletStatus.hasExistingContract) {
      console.log('   ✅ Use your existing MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS contract');
      console.log('   💡 It likely already handles USD→USDC conversion');
      console.log('   🔧 Just call the right function from your webhook');
    } else {
      console.log('   🏗️ Build new DEX integration with Camelot or GMX');
      console.log('   💰 Need to fund wallet with ETH for gas and initial USDC');
      console.log('   🔗 Integrate with Arbitrum native DEX for USD→USDC swaps');
    }

    if (parseFloat(walletStatus.ethBalance) < 0.001) {
      console.log('   ⚠️ Fund wallet with ETH for gas fees');
    }

    if (parseFloat(walletStatus.usdcBalance) === 0) {
      console.log('   ⚠️ Consider initial USDC funding or DEX integration');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testExistingContracts();
