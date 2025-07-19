exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': 'https://buy.mountainshares.us',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { tokenQuantity } = JSON.parse(event.body || '{}');
        
        if (!tokenQuantity || tokenQuantity <= 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid token quantity',
                    message: 'Token quantity must be a positive number'
                })
            };
        }

        // CORRECT TRANSACTION-BASED PRICING - MATCHING YOUR JAVA CODE
        const baseTokenPrice = 1.40;
        const subtotal = tokenQuantity * baseTokenPrice;
        
        // Transaction-based fee structure
        const fees = {
            processingFee: Math.max(0.30, subtotal * 0.029), // Stripe: 2.9% + $0.30
            platformFee: subtotal * 0.025, // 2.5% platform fee
            totalFees: 0
        };
        
        fees.totalFees = fees.processingFee + fees.platformFee;
        const total = subtotal + fees.totalFees;
        const totalCents = Math.round(total * 100);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                tokenQuantity: tokenQuantity,
                baseTokenPrice: baseTokenPrice,
                subtotal: subtotal,
                fees: {
                    processing: fees.processingFee,
                    platform: fees.platformFee,
                    total: fees.totalFees
                },
                total: total,
                totalCents: totalCents,
                currency: 'USD',
                pricingModel: 'transaction-based',
                calculation: `${tokenQuantity} × $${baseTokenPrice} = $${subtotal.toFixed(2)} + $${fees.totalFees.toFixed(2)} fees = $${total.toFixed(2)}`
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Price calculation failed',
                message: error.message
            })
        };
    }
};
