// api/webhooks/stripe.js
// Updated webhook handler with actual blockchain execution

const Stripe = require('stripe');
const BlockchainExecutor = require('../../lib/blockchain-executor');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  
  let event;
  try {
    const body = JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📨 Received event: ${event.type}`);

  // Handle charge.succeeded events
  if (event.type === 'charge.succeeded') {
    try {
      await handleChargeSucceeded(event.data.object);
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('❌ Error processing charge:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    console.log(`⏭️ Unhandled event type: ${event.type}`);
    res.status(200).json({ received: true });
  }
}

async function handleChargeSucceeded(charge) {
  console.log('🎉 Processing successful charge:', charge.id);
  console.log(`💰 Amount: $${(charge.amount / 100).toFixed(2)} ${charge.currency.toUpperCase()}`);
  console.log(`👤 Customer: ${charge.billing_details.name} (${charge.billing_details.email})`);

  const purchaseAmountUSD = charge.amount / 100; // Convert cents to dollars
  const customerEmail = charge.billing_details.email;
  const customerName = charge.billing_details.name;

  // Initialize blockchain executor
  const blockchain = new BlockchainExecutor();

  // Check prerequisites
  console.log('🔍 Checking blockchain prerequisites...');
  
  const hasGas = await blockchain.checkGasBalance();
  if (!hasGas) {
    console.error('❌ Insufficient ETH for gas fees!');
    throw new Error('Insufficient gas for blockchain operations');
  }

  const usdcBalance = await blockchain.checkUsdcBalance();
  if (usdcBalance < purchaseAmountUSD) {
    console.error(`❌ Insufficient USDC balance! Need: ${purchaseAmountUSD}, Have: ${usdcBalance}`);
    throw new Error('Insufficient USDC for distribution');
  }

  // TODO: Get customer's wallet address from your database
  // For now, we'll skip customer token minting until we have their address
  const customerWalletAddress = null; // Replace with actual lookup

  // Execute blockchain distribution
  console.log('🚀 Executing blockchain operations...');
  const results = await blockchain.executeDistribution(purchaseAmountUSD, customerWalletAddress);

  // Log results
  console.log('📋 Distribution Results:');
  console.log(`⏰ Timestamp: ${results.timestamp}`);
  console.log(`💰 Purchase Amount: $${results.purchaseAmount}`);
  console.log(`🔗 Operations: ${results.operations.length}`);

  let successCount = 0;
  let failureCount = 0;

  results.operations.forEach((op, index) => {
    console.log(`\n${index + 1}. ${op.type}: ${op.destination}`);
    console.log(`   💰 Amount: $${op.amount}`);
    console.log(`   📍 Address: ${op.address}`);
    
    if (op.success) {
      console.log(`   ✅ Success: ${op.hash}`);
      successCount++;
    } else {
      console.log(`   ❌ Failed: ${op.error}`);
      failureCount++;
    }
  });

  console.log(`\n📊 Summary: ${successCount} successful, ${failureCount} failed`);

  // Store results in database (optional)
  await storeTransactionResults(charge.id, results);

  return results;
}

async function storeTransactionResults(chargeId, results) {
  // TODO: Store transaction results in your database
  // This would include:
  // - Stripe charge ID
  // - Blockchain transaction hashes
  // - Distribution amounts
  // - Success/failure status
  // - Timestamps
  
  console.log(`💾 Storing results for charge ${chargeId}`);
  
  // Example structure:
  const transactionRecord = {
    stripe_charge_id: chargeId,
    timestamp: results.timestamp,
    purchase_amount: results.purchaseAmount,
    customer_address: results.customerAddress,
    operations: results.operations,
    total_operations: results.operations.length,
    successful_operations: results.operations.filter(op => op.success).length,
    failed_operations: results.operations.filter(op => !op.success).length
  };
  
  // Insert into database here
  console.log('📝 Transaction record ready for database storage');
}
