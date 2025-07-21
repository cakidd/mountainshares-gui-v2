const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);

const headers = {
  'Access-Control-Allow-Origin': 'https://buy.mountainshares.us',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { msTokens, walletAddress } = JSON.parse(event.body || '{}');
    
    console.log('TEST MODE: Creating checkout session for', msTokens, 'tokens');
    console.log('TEST MODE: Wallet address:', walletAddress);
    
    if (!msTokens || msTokens <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid token quantity' })
      };
    }

    // Calculate pricing using your existing logic
    const baseTokenPrice = 1.00;
    const subtotal = msTokens * baseTokenPrice;
    const fees = {
      platformBaseFee: subtotal * 0.02 + 0.03,
      processingAdjustment: Math.round((subtotal * 0.005) * 100) / 100,
      stripeProcessing: Math.round((subtotal * 0.029 + 0.30) * 100) / 100,
      regulatoryFee: Math.round((subtotal * 0.005) * 100) / 100
    };
    
    const totalFees = fees.platformBaseFee + fees.processingAdjustment + fees.stripeProcessing + fees.regulatoryFee;
    const total = subtotal + totalFees;
    const totalCents = Math.round(total * 100);

    // Create Stripe TEST checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `TEST: ${msTokens} MountainShares Tokens`,
            description: `TEST PURCHASE: ${msTokens} MountainShares tokens at $1.00 USD each`,
            images: ['https://buy.mountainshares.us/mountainshares-logo.png']
          },
          unit_amount: totalCents,
        },
        quantity: 1,
      }],
      metadata: {
        msTokens: msTokens,
        walletAddress: walletAddress || '',
        productType: 'mountainshares-tokens-test',
        testMode: 'true'
      },
      mode: 'payment',
      success_url: 'https://buy.mountainshares.us/test-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://buy.mountainshares.us/?canceled=true&test=true',
    });

    console.log('TEST MODE: Stripe session created:', session.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        sessionId: session.id,
        url: session.url,
        testMode: true,
        walletAddress: walletAddress,
        amount: totalCents / 100
      })
    };

  } catch (error) {
    console.error('TEST MODE: Stripe session creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Test payment processing failed',
        details: error.message 
      })
    };
  }
};
