const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${msTokens} MountainShares Tokens`,
            description: `Purchase ${msTokens} MountainShares tokens at $1.00 USD each`,
            images: ['https://buy.mountainshares.us/mountainshares-logo.png']
          },
          unit_amount: totalCents,
        },
        quantity: 1,
      }],
      metadata: {
        msTokens: msTokens,
        walletAddress: walletAddress || '',
        productType: 'mountainshares-tokens'
      },
      mode: 'payment',
      success_url: 'https://buy.mountainshares.us/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://buy.mountainshares.us/?canceled=true',
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        sessionId: session.id,
        url: session.url 
      })
    };

  } catch (error) {
    console.error('Stripe session creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Payment processing failed',
        details: error.message 
      })
    };
  }
};
