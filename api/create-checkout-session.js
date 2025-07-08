const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    // Enable CORS for your frontend domain
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { quantity, walletAddress, tokenValue, platformFee, totalAmount } = req.body;
        
        // Validation
        if (!quantity || quantity < 1) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }
        
        if (!walletAddress || !walletAddress.startsWith('0x')) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }
        
        // Calculate Stripe amount (in cents)
        const stripeAmount = Math.round(totalAmount * 100);
        
        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${quantity} MountainShare${quantity > 1 ? 's' : ''}`,
                        description: `Digital currency tokens for West Virginia communities`,
                    },
                    unit_amount: Math.round(stripeAmount / quantity),
                },
                quantity: quantity,
            }],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/purchase`,
            metadata: {
                walletAddress: walletAddress,
                tokenQuantity: quantity.toString(),
                tokenValue: tokenValue.toString(),
                platformFee: platformFee.toString(),
                totalAmount: totalAmount.toString(),
                timestamp: new Date().toISOString()
            }
        });

        console.log('✅ Vercel: Checkout session created:', {
            sessionId: session.id,
            amount: stripeAmount,
            quantity: quantity,
            walletAddress: walletAddress
        });

        res.json({ 
            id: session.id,
            url: session.url 
        });

    } catch (error) {
        console.error('❌ Vercel: Stripe session creation error:', error);
        res.status(500).json({ 
            error: 'Failed to create checkout session',
            details: error.message 
        });
    }
}
