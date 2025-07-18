const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    console.log('🏔️ MountainShares Stripe checkout session creation started');
    
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
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
        const requestData = JSON.parse(event.body);
        console.log('💰 Checkout request received:', requestData);

        // Validate MountainShares pricing
        const expectedTokenPrice = 1.00;
        const expectedProcessingFee = 0.40;
        const expectedTotalPrice = 1.40;

        const quantity = requestData.quantity || 1;
        const expectedTotal = expectedTotalPrice * quantity;

        if (Math.abs(requestData.totalAmount - expectedTotal) > 0.01) {
            throw new Error(`Invalid total amount. Expected $${expectedTotal.toFixed(2)}, received $${requestData.totalAmount.toFixed(2)}`);
        }

        console.log('✅ Pricing validation passed');
        console.log(`💰 Processing ${quantity} tokens for $${expectedTotal.toFixed(2)}`);

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            success_url: `${process.env.URL || 'https://buy.mountainshares.us'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.URL || 'https://buy.mountainshares.us'}/`,
            
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `MountainShares Tokens (${quantity})`,
                            description: `Community-controlled blockchain tokens for Mount Hope, WV`,
                            metadata: {
                                platform: 'MountainShares',
                                community: 'Mount Hope, WV',
                                tokenType: 'MS',
                                quantity: quantity.toString()
                            }
                        },
                        unit_amount: Math.round(expectedTotalPrice * 100), // $1.40 in cents
                    },
                    quantity: quantity,
                }
            ],
            
            // Enhanced metadata for webhook processing
            metadata: {
                platform: 'MountainShares',
                community: 'Mount Hope, WV',
                tokenQuantity: quantity.toString(),
                tokenPrice: expectedTokenPrice.toString(),
                processingFees: (expectedProcessingFee * quantity).toString(),
                totalAmount: expectedTotal.toString(),
                feeStructure: 'accurate_mountainshares_pricing',
                timestamp: new Date().toISOString()
            },

            // Customer data collection
            billing_address_collection: 'auto',
            customer_creation: 'always',
            
            // Payment intent metadata
            payment_intent_data: {
                metadata: {
                    platform: 'MountainShares',
                    community: 'Mount Hope, WV',
                    tokenQuantity: quantity.toString(),
                    accuratePricing: 'true'
                }
            }
        });

        console.log('✅ Stripe checkout session created successfully');
        console.log(`🔗 Session ID: ${session.id}`);
        console.log(`💰 Total: $${expectedTotal.toFixed(2)}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                sessionId: session.id,
                url: session.url,
                totalAmount: expectedTotal,
                tokenQuantity: quantity,
                community: 'Mount Hope, WV',
                platform: 'MountainShares'
            })
        };

    } catch (error) {
        console.error('❌ Stripe checkout session creation failed:', error.message);

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
