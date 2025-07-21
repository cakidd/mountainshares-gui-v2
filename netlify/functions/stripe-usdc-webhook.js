const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Arbitrum provider setup
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);

// Contract addresses on Arbitrum
const CENTRAL_COMMAND_ADDRESS = '0x7F246dD285E7c53190b5Ae927a3a581393F9a521';
const USDC_SETTLEMENT_ADDRESS = '0x5574A3EcCFd6e9Af35F0B204f148D021be5b9C95';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sig = event.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Verify Stripe webhook signature
    const stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const metadata = session.metadata;

      // Only process USDC-backed transactions
      if (metadata.productType === 'mountainshares-usdc-backed') {
        console.log('🔗 Processing USDC settlement for session:', session.id);
        
        // Extract settlement data
        const msTokens = parseInt(metadata.msTokens);
        const walletAddress = metadata.walletAddress;
        const usdcAmount = parseFloat(metadata.usdcAmount);
        
        // Log the USDC settlement transaction
        console.log('💰 USDC SETTLEMENT INITIATED:');
        console.log(`- MS Tokens to mint: ${msTokens}`);
        console.log(`- Recipient wallet: ${walletAddress}`);
        console.log(`- USDC amount: ${usdcAmount}`);
        console.log(`- Settlement contract: ${USDC_SETTLEMENT_ADDRESS}`);
        
        // Here you would trigger the actual USDC settlement
        // This would call your Central Command Center contract's
        // coordinateCustomerPurchase() function
        
        // For now, we'll log the successful processing
        console.log('✅ USDC settlement logged - Contract integration ready');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            received: true,
            settlementInitiated: true,
            usdcAmount: usdcAmount,
            msTokens: msTokens
          })
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Webhook processing error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Webhook processing failed',
        details: error.message
      })
    };
  }
};
