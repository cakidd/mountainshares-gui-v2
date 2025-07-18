const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { tokens, total_amount_cents } = req.body;
    
    if (!tokens || tokens <= 0) {
      return res.status(400).json({ error: 'Invalid token amount' });
    }

    // Use frontend amount or fallback to original calculation
    const unitAmount = total_amount_cents || (tokens * 140);

    const session = await stripe.checkout.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'MountainShares Tokens',
              description: `${tokens} Revolutionary Mountain Tokens`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://buy.mountainshares.us/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://buy.mountainshares.us/purchase.html',
      metadata: {
        tokens: tokens.toString(),
      },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
