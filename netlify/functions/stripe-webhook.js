const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sig = event.headers['stripe-signature'];
    const body = event.body;

    console.log('🔔 Webhook received');
    console.log('📝 Signature present:', !!sig);
    console.log('📦 Body present:', !!body);

    // Verify webhook signature with raw body
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
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    console.log('✅ Webhook verified successfully, type:', stripeEvent.type);

    // Handle checkout.session.completed event
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      
      console.log('💰 MountainShares payment completed:');
      console.log('- Session ID:', session.id);
      console.log('- Amount:', session.amount_total / 100, 'USD');
      console.log('- Customer:', session.customer_details?.email);
      
      // Extract MountainShares token details from metadata
      const metadata = session.metadata || {};
      const msTokens = parseInt(metadata.msTokens) || 1;
      const walletAddress = metadata.walletAddress;
      const customerTotal = parseFloat(metadata.customerTotal) || 0;
      
      console.log('🏔️ Token details:');
      console.log('- MS Tokens to deliver:', msTokens);
      console.log('- Recipient wallet:', walletAddress);
      console.log('- Total paid:', customerTotal);
      
      // TODO: Add smart contract integration here
      // - Execute USDC settlement via 0x1F0c8a4c920E1094f85b18F681dcfB2e2b7DE076
      // - Mint tokens via 0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f
      // - Distribute fees to 5-way split recipients
      
      console.log('✅ Webhook processed successfully - token delivery pending contract integration');
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          received: true,
          sessionId: session.id,
          msTokens: msTokens,
          processed: true
        })
      };
    }

    // Handle other event types
    console.log('ℹ️ Unhandled event type:', stripeEvent.type);
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, type: stripeEvent.type })
    };

  } catch (error) {
    console.error('🚨 Webhook processing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook processing failed', details: error.message })
    };
  }
};
