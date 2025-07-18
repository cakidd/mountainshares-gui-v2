// quick-test.js
// Test with the tiny amount of USDC you actually have

require('dotenv').config();
const { ethers } = require('ethers');  // Add this import!
const SimpleWebhookSolution = require('./lib/simple-webhook-solution');

async function quickTest() {
  console.log('⚡ Quick USDC Test with Available Balance');
  console.log('========================================');

  try {
    const webhook = new SimpleWebhookSolution();

    // Check current balance
    const status = await webhook.getWalletStatus();
    console.log(`📍 Wallet: ${status.address}`);
    console.log(`💰 Available USDC: ${status.usdcBalance}`);
    
    const availableUsdc = parseFloat(status.usdcBalance);
    
    if (availableUsdc < 0.000001) {
      console.log('❌ No USDC available for testing');
      console.log('💡 Need to fund wallet with USDC first');
      return;
    }

    // Test with a tiny amount (what you actually have)
    const testAmount = availableUsdc * 0.8; // Use 80% of available balance
    
    console.log(`\n🧪 Testing with micro-payment: $${testAmount.toFixed(6)}`);
    
    // Create a simplified version that works with tiny amounts
    const usdcContract = new ethers.Contract(
      '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      ["function transfer(address to, uint256 amount) returns (bool)"],
      webhook.wallet
    );

    // Test sending to just ONE treasury (H4H Nonprofit)
    const testAddress = process.env.H4H_NONPROFIT_ADDRESS;
    const testAmountUsdc = ethers.parseUnits(testAmount.toFixed(6), 6);
    
    console.log(`📍 Test recipient: ${testAddress}`);
    console.log(`💰 Test amount: ${testAmount.toFixed(6)} USDC`);
    
    try {
      // Estimate gas
      const gasEstimate = await usdcContract.transfer.estimateGas(testAddress, testAmountUsdc);
      console.log(`⛽ Gas estimate: ${gasEstimate.toString()}`);
      
      // Execute transfer
      console.log('🚀 Executing test transfer...');
      const tx = await usdcContract.transfer(testAddress, testAmountUsdc);
      console.log(`📝 Transaction hash: ${tx.hash}`);
      
      // Wait for confirmation
      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log(`✅ SUCCESS! Confirmed in block ${receipt.blockNumber}`);
      
      console.log('\n🎉 BREAKTHROUGH ACHIEVED!');
      console.log('🔧 Your wallet can execute blockchain transactions');
      console.log('💡 Just need more USDC funding for full operation');
      
      // Check balance after
      const newStatus = await webhook.getWalletStatus();
      console.log(`\n📊 New USDC balance: ${newStatus.usdcBalance}`);
      
    } catch (error) {
      console.error(`❌ Transfer failed: ${error.message}`);
      
      if (error.message.includes('insufficient funds')) {
        console.log('💡 Need more ETH for gas fees');
      } else if (error.message.includes('transfer amount exceeds balance')) {
        console.log('💡 Calculation error - trying smaller amount');
      } else {
        console.log('💡 Check wallet permissions and network connection');
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the quick test
quickTest();
