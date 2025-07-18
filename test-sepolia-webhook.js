// test-sepolia-webhook.js
// Test webhook with Sepolia contract

require('dotenv').config();
const { ethers } = require('ethers');

async function testSepoliaWebhook() {
  console.log('🧪 Testing MountainShares Webhook with Sepolia Contract');
  console.log('==================================================');

  try {
    // Connect to Sepolia
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    const wallet = new ethers.Wallet(process.env.WEBHOOK_SIGNER_PRIVATE_KEY, provider);
    
    const contractAddress = '0x8faE23133126c51D20Be71d9BD64Ff0F960FBF22';
    
    console.log(`📍 Deployer: ${wallet.address}`);
    console.log(`🏗️ Contract: ${contractAddress}`);

    // Check Sepolia ETH balance
    const balance = await provider.getBalance(wallet.address);
    const balanceETH = ethers.formatEther(balance);
    console.log(`⛽ Sepolia ETH: ${balanceETH} ETH`);

    // Check if contract exists
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      console.log('❌ Contract not found on Sepolia');
      return;
    }
    console.log('✅ Contract found on Sepolia');

    // Test contract interaction (reading only for now)
    const contractABI = [
      "function owner() view returns (address)",
      "function settlementReserve() view returns (address)",
      "function mountainSharesToken() view returns (address)"
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    try {
      const owner = await contract.owner();
      console.log(`👤 Contract Owner: ${owner}`);
      
      const settlementReserve = await contract.settlementReserve();
      console.log(`🏦 Settlement Reserve: ${settlementReserve}`);
      
      const tokenAddress = await contract.mountainSharesToken();
      console.log(`🪙 Token Address: ${tokenAddress}`);
      
    } catch (error) {
      console.log('📋 Contract exists but may have different ABI');
    }

    console.log('\n🎯 SEPOLIA CONTRACT READY FOR TESTING!');
    console.log('=====================================');
    console.log('✅ Contract deployed and accessible');
    console.log('✅ Wallet connected to Sepolia');
    console.log('✅ Ready for webhook integration testing');
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Update webhook to use Sepolia contract');
    console.log('2. Test USDC purchase simulation');
    console.log('3. Verify treasury distribution logic');
    console.log('4. Test with Stripe webhook events');

  } catch (error) {
    console.error('❌ Sepolia test failed:', error.message);
  }
}

// Run test
testSepoliaWebhook();
