const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sig = event.headers['stripe-signature'];
    const body = event.body;

    console.log('🔔 Stripe webhook received');
    console.log('📝 Signature present:', !!sig);
    console.log('📦 Body length:', body?.length);

    // Verify webhook signature
    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    console.log('✅ Webhook verified, type:', stripeEvent.type);

    // Handle the checkout.session.completed event
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      
      console.log('💰 Payment completed for session:', session.id);
      console.log('💵 Amount:', session.amount_total / 100, 'USD');
      console.log('👤 Customer email:', session.customer_details?.email);
      
      // Extract MountainShares token details
      const metadata = session.metadata || {};
      const msTokens = parseInt(metadata.msTokens) || 1;
      const walletAddress = metadata.walletAddress;
      const darwinOptimized = metadata.darwinGoedelOptimized === 'true';
      
      console.log('🏔️ MountainShares details:');
      console.log('- Tokens purchased:', msTokens);
      console.log('- Wallet address:', walletAddress || 'Not provided');
      console.log('- Darwin Gödel optimized:', darwinOptimized);
      
      // Here you would trigger your smart contract calls
      // For now, log the successful webhook processing
      console.log('🎯 Webhook processing completed successfully');
      
      // TODO: Add smart contract integration here
      // - Call USDC settlement processor
      // - Trigger token minting via Backbone controller
      // - Execute fee distribution
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          received: true,
          type: stripeEvent.type,
          sessionId: session.id,
          msTokens: msTokens,
          processed: 'webhook_received'
        })
      };
    }

    // Handle other event types
    console.log('ℹ️ Unhandled event type:', stripeEvent.type);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true, type: stripeEvent.type })
    };

  } catch (error) {
    console.error('🚨 Webhook processing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Webhook processing failed',
        details: error.message
      })
    };
  }
};
