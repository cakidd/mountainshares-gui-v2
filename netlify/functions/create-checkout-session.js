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

        // Transaction-based fee calculation (matches frontend)
        function roundToCents(value) {
            return Math.ceil(value * 100) / 100;
        }

        function calculateTransactionFees(subtotal) {
            const platformFee = roundToCents(subtotal * 0.02 + 0.03);
            const processingFee = roundToCents(subtotal * 0.005);
            const stripeFee = roundToCents(subtotal * 0.029 + 0.30);
            const secFee = roundToCents(subtotal * 0.005);
            
            return {
                platformFee,
                processingFee,
                stripeFee,
                secFee,
                totalFees: platformFee + processingFee + stripeFee + secFee
            };
        }

        function calculateCorrectTotal(quantity) {
            const tokenPrice = 1.00;
            const subtotal = roundToCents(quantity * tokenPrice);
            const fees = calculateTransactionFees(subtotal);
            const total = roundToCents(subtotal + fees.totalFees);
            
            return {
                subtotal,
                totalFees: fees.totalFees,
                total
            };
        }

        const quantity = requestData.quantity || 1;
        const calculations = calculateCorrectTotal(quantity);

        // Validate that frontend and backend calculations match
        if (requestData.amount && Math.abs(requestData.amount - Math.round(calculations.total * 100)) > 1) {
            throw new Error(`Amount mismatch. Expected ${Math.round(calculations.total * 100)} cents, received ${requestData.amount} cents`);
        }

        console.log('✅ Transaction-based pricing validation passed');
        console.log(`💰 Processing ${quantity} tokens for $${calculations.total.toFixed(2)}`);
        console.log(`📊 Breakdown: $${calculations.subtotal.toFixed(2)} + $${calculations.totalFees.toFixed(2)} fees`);

        // Create Stripe checkout session with correct transaction-based pricing
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
                            description: `Community-controlled blockchain tokens for Mount Hope, WV - Transaction-based fees`,
                            metadata: {
                                platform: 'MountainShares',
                                community: 'Mount Hope, WV',
                                tokenType: 'MS',
                                quantity: quantity.toString(),
                                pricingModel: 'transaction-based'
                            }
                        },
                        unit_amount: Math.round(calculations.total * 100), // Correct total in cents
                    },
                    quantity: 1, // Always 1 because we're selling the complete package
                }
            ],

            // Enhanced metadata for webhook processing
            metadata: {
                platform: 'MountainShares',
                community: 'Mount Hope, WV',
                tokenQuantity: quantity.toString(),
                subtotal: calculations.subtotal.toString(),
                totalFees: calculations.totalFees.toString(),
                totalAmount: calculations.total.toString(),
                feeStructure: 'transaction_based_accurate',
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
                    accuratePricing: 'transaction-based'
                }
            }
        });

        console.log('✅ Stripe checkout session created successfully');
        console.log(`🔗 Session ID: ${session.id}`);
        console.log(`💰 Total: $${calculations.total.toFixed(2)}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                sessionId: session.id,
                url: session.url,
                totalAmount: calculations.total,
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
