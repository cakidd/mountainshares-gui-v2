// test-simple-solution.js
// Test the direct USDC transfer approach

require('dotenv').config();
const SimpleWebhookSolution = require('./lib/simple-webhook-solution');

async function testSimpleSolution() {
  console.log('🎯 Testing Simple Webhook Solution');
  console.log('==================================');

  try {
    const webhook = new SimpleWebhookSolution();

    // Test 1: Check wallet status
    console.log('\n1️⃣ Wallet Status:');
    const status = await webhook.getWalletStatus();
    
    if (status.error) {
      console.log(`   ❌ Error: ${status.error}`);
      return;
    }
    
    console.log(`   📍 Address: ${status.address}`);
    console.log(`   ⛽ ETH Balance: ${status.ethBalance} ETH`);
    console.log(`   💰 USDC Balance: ${status.usdcBalance} USDC`);

    // Test 2: Simulate the $1.37 payment from Carrie
    console.log('\n2️⃣ Simulating Real $1.37 Payment:');
    console.log('   👤 Customer: Carrie A Kidd (thecakidd@gmail.com)');
    console.log('   💰 Amount: $1.37 (from real Stripe transaction)');
    
    const paymentResult = await webhook.processStripePayment(
      1.37,
      'thecakidd@gmail.com',
      null // No customer wallet address yet
    );

    // Test 3: Display results  
    console.log('\n3️⃣ Payment Processing Results:');
    console.log(`   ⏰ Timestamp: ${paymentResult.timestamp}`);
    console.log(`   💰 Amount: $${paymentResult.stripeAmount}`);
    console.log(`   🔧 Steps completed: ${paymentResult.steps.length}`);

    paymentResult.steps.forEach((step, index) => {
      console.log(`\n   Step ${index + 1}: ${step.step.replace(/_/g, ' ').toUpperCase()}`);
      
      if (step.operations) {
        // Treasury distribution step
        const successful = step.operations.filter(op => op.success).length;
        const total = step.operations.length;
        console.log(`     📊 Success rate: ${successful}/${total} operations`);
        
        step.operations.forEach(op => {
          if (op.success) {
            console.log(`     ✅ ${op.destination}: $${op.amount} → ${op.hash}`);
          } else {
            console.log(`     ❌ ${op.destination}: $${op.amount} → ${op.error}`);
          }
        });
      } else {
        // Single operation step
        if (step.success) {
          console.log(`     ✅ Success: ${step.hash || 'Completed'}`);
        } else {
          console.log(`     ❌ Failed: ${step.error}`);
        }
      }
    });

    // Test 4: Check if treasuries received funds
    console.log('\n4️⃣ Treasury Balance Check:');
    console.log('   💡 Run your balance check script to see if funds arrived:');
    console.log('   💡 ./check_contracts.sh');

    // Test 5: Recommendations
    console.log('\n🎯 NEXT STEPS:');
    
    const ethBalance = parseFloat(status.ethBalance);
    const usdcBalance = parseFloat(status.usdcBalance);
    
    if (ethBalance < 0.001) {
      console.log('   ⚠️ Fund wallet with ETH for gas fees');
    }
    
    if (usdcBalance < 1) {
      console.log('   💡 FUNDING SOLUTION NEEDED:');
      console.log('   • Option A: Manual USDC transfer to wallet');
      console.log('   • Option B: Integration with DEX for USD→USDC swap');
      console.log('   • Option C: Use existing purchase contract correctly');
    } else {
      console.log('   ✅ Wallet has sufficient USDC for testing');
    }

    const successfulOps = paymentResult.steps
      .filter(step => step.operations)
      .flatMap(step => step.operations)
      .filter(op => op.success).length;

    if (successfulOps > 0) {
      console.log('   🎉 BREAKTHROUGH: Actual blockchain transactions executed!');
      console.log('   🔧 Ready to integrate into your webhook');
    } else {
      console.log('   🔧 Code structure correct, just need proper funding');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testSimpleSolution();
