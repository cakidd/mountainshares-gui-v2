const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:8000', 'https://your-domain.com'],
    credentials: true
}));
app.use(express.json());

// Create checkout session endpoint
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { quantity, walletAddress, tokenValue, platformFee, totalAmount } = req.body;
        
        // Validation
        if (!quantity || quantity < 1) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }
        
        if (!walletAddress || !walletAddress.startsWith('0x')) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }
        
        if (!tokenValue || tokenValue <= 0) {
            return res.status(400).json({ error: 'Invalid token value' });
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
                        images: [], // Add your logo URL here if available
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
            },
            customer_email: null, // Will be filled by Stripe Checkout
            billing_address_collection: 'required',
            shipping_address_collection: null,
        });

        console.log('✅ Checkout session created:', {
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
        console.error('❌ Stripe session creation error:', error);
        res.status(500).json({ 
            error: 'Failed to create checkout session',
            details: error.message 
        });
    }
});

// Webhook endpoint for Stripe events
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('💰 Payment successful:', {
                sessionId: session.id,
                customerEmail: session.customer_email,
                walletAddress: session.metadata.walletAddress,
                quantity: session.metadata.tokenQuantity,
                amount: session.amount_total / 100
            });
            
            // Here you would typically:
            // 1. Update your database with the purchase
            // 2. Send tokens to the wallet address
            // 3. Send confirmation email to customer
            // 4. Log the transaction for accounting
            
            // Example database update (replace with your actual database logic):
            /*
            await db.purchases.create({
                sessionId: session.id,
                walletAddress: session.metadata.walletAddress,
                quantity: parseInt(session.metadata.tokenQuantity),
                tokenValue: parseFloat(session.metadata.tokenValue),
                totalAmount: parseFloat(session.metadata.totalAmount),
                customerEmail: session.customer_email,
                status: 'completed',
                createdAt: new Date()
            });
            */
            
            break;
        
        case 'payment_intent.payment_failed':
            const paymentIntent = event.data.object;
            console.log('❌ Payment failed:', {
                paymentIntentId: paymentIntent.id,
                error: paymentIntent.last_payment_error?.message
            });
            break;
        
        default:
            console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.json({received: true});
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'MountainShares Purchase API',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`
    });
});

const PORT = process.env.BACKEND_URL?.split(':')[2] || process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log('🏔️ MountainShares Purchase API Server Started');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`💎 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 Stripe configured: ${process.env.STRIPE_SECRET_KEY ? 'Yes' : 'No'}`);
});

module.exports = app;
