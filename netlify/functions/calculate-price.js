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

        // CORRECT USD TRANSACTION-BASED PRICING - NO ETH CALCULATION
        const baseTokenPrice = 1.00;  // Fixed $1.00 USD per token
        const subtotal = tokenQuantity * baseTokenPrice;
        
        // Your exact USD fee structure
        const fees = {
            // Platform fee: 2% + $0.03
            platformBaseFee: subtotal * 0.02 + 0.03,
            
            // Processing adjustment: 0.5% rounded to nearest penny
            processingAdjustment: Math.round((subtotal * 0.005) * 100) / 100,
            
            // Stripe processing: 2.9% + $0.30 rounded to nearest penny  
            stripeProcessing: Math.round((subtotal * 0.029 + 0.30) * 100) / 100,
            
            // SEC regulatory: 0.5% rounded to nearest penny (VARIABLE)
            regulatoryFee: Math.round((subtotal * 0.005) * 100) / 100,
            
            totalFees: 0
        };

        fees.totalFees = fees.platformBaseFee + fees.processingAdjustment + 
                        fees.stripeProcessing + fees.regulatoryFee;

        const total = subtotal + fees.totalFees;
        const totalCents = Math.round(total * 100);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                tokenQuantity: tokenQuantity,
                baseTokenPrice: 1.00,
                subtotal: parseFloat(subtotal.toFixed(2)),
                fees: {
                    platformBase: parseFloat(fees.platformBaseFee.toFixed(2)),
                    processingAdjustment: parseFloat(fees.processingAdjustment.toFixed(2)),
                    stripe: parseFloat(fees.stripeProcessing.toFixed(2)),
                    regulatory: parseFloat(fees.regulatoryFee.toFixed(2)),
                    total: parseFloat(fees.totalFees.toFixed(2))
                },
                total: parseFloat(total.toFixed(2)),
                totalCents: totalCents,
                currency: 'USD',
                pricingModel: 'usd-transaction-based',
                calculation: `${tokenQuantity} tokens × $1.00 USD = $${subtotal.toFixed(2)} + $${fees.totalFees.toFixed(2)} fees = $${total.toFixed(2)} USD`
            })
        };

    } catch (error) {
        console.error('Price calculation error:', error);
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
