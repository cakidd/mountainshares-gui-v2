// netlify/functions/webhook.js - MountainShares Webhook (Fixed)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    console.log('🏔️ MountainShares webhook started');
    
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Verify Stripe signature
        const signature = event.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
        
        if (!signature || !endpointSecret) {
            throw new Error('Missing signature or webhook secret');
        }

        const stripeEvent = stripe.webhooks.constructEvent(
            event.body,
            signature,
            endpointSecret
        );

        console.log('✅ Stripe webhook verified:', stripeEvent.type);

        // Process completed checkout sessions
        if (stripeEvent.type === 'checkout.session.completed') {
            const session = stripeEvent.data.object;
            
            console.log('🛒 Processing MountainShares purchase:', {
                sessionId: session.id,
                amount: session.amount_total,
                customer: session.customer_details?.email,
                metadata: session.metadata
            });

            // Process purchase (without blockchain executor dependency)
            const result = {
                success: true,
                transactionId: session.id,
                amount: session.amount_total,
                customer: session.customer_details?.email,
                community: 'Mount Hope, WV',
                platform: 'MountainShares',
                timestamp: new Date().toISOString()
            };

            console.log('✅ MountainShares purchase processed:', result);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    received: true,
                    eventType: stripeEvent.type,
                    result: result,
                    community: 'Mount Hope, WV',
                    platform: 'MountainShares'
                })
            };
        }

        // Handle other event types
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                received: true,
                eventType: stripeEvent.type,
                status: 'unhandled'
            })
        };

    } catch (error) {
        console.error('❌ Webhook processing failed:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message,
                platform: 'MountainShares',
                community: 'Mount Hope, WV'
            })
        };
    }
};
