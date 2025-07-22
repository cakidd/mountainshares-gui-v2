const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { 
      msTokens, 
      walletAddress, 
      customerEmail, 
      testMode = false,
      darwinGoedelOptimized = false 
    } = JSON.parse(event.body || '{}');

    console.log('🛒 Creating checkout session');
    console.log('🏔️ MS Tokens:', msTokens);
    console.log('👛 Wallet:', walletAddress);
    console.log('🤖 Darwin optimized:', darwinGoedelOptimized);

    // Calculate price using Darwin Gödel Machine pricing
    const pricePerToken = 140; // $1.40 in cents
    const totalAmount = msTokens * pricePerToken;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${msTokens} MountainShares Token${msTokens > 1 ? 's' : ''}`,
              description: `Purchase ${msTokens} MountainShares tokens at $1.40 USD each`,
            },
            unit_amount: pricePerToken,
          },
          quantity: msTokens,
        },
      ],
      mode: 'payment',
      success_url: `${event.headers.origin || 'https://buy.mountainshares.us'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${event.headers.origin || 'https://buy.mountainshares.us'}?canceled=true`,
      customer_email: customerEmail,
      metadata: {
        msTokens: msTokens.toString(),
        walletAddress: walletAddress || '',
        darwinGoedelOptimized: darwinGoedelOptimized.toString(),
        testMode: testMode.toString(),
        platform: 'MountainShares',
        location: 'Mount Hope, WV'
      }
    });

    console.log('✅ Checkout session created:', session.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url
      })
    };

  } catch (error) {
    console.error('❌ Checkout session creation failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create checkout session',
        details: error.message
      })
    };
  }
};
