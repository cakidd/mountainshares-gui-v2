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

        // CORRECTED TRANSACTION-BASED PRICING WITH ERROR HANDLING
        const baseTokenPrice = 1.00; // Fixed $1.00 base price per token
        const subtotal = tokenQuantity * baseTokenPrice;
        
        // Validate subtotal is a valid number
        if (!subtotal || isNaN(subtotal)) {
            throw new Error('Invalid subtotal calculation');
        }

        // Transaction-based fee structure with NULL CHECKS
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

        // Validate all fees are valid numbers before using toFixed()
        Object.keys(fees).forEach(key => {
            if (key !== 'totalFees' && (isNaN(fees[key]) || fees[key] === undefined)) {
                throw new Error(`Invalid fee calculation for ${key}`);
            }
        });

        fees.totalFees = fees.platformBaseFee + fees.processingAdjustment + 
                        fees.stripeProcessing + fees.regulatoryFee;

        const total = subtotal + fees.totalFees;
        const totalCents = Math.round(total * 100);

        // Validate final calculations before using toFixed()
        if (isNaN(total) || total === undefined || isNaN(totalCents)) {
            throw new Error('Invalid final calculation');
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                tokenQuantity: tokenQuantity,
                baseTokenPrice: parseFloat(baseTokenPrice.toFixed(2)),
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
                pricingModel: 'transaction-based-corrected',
                calculation: `${tokenQuantity} tokens × $${baseTokenPrice.toFixed(2)} = $${subtotal.toFixed(2)} + $${fees.totalFees.toFixed(2)} fees = $${total.toFixed(2)}`
            })
        };

    } catch (error) {
        console.error('Price calculation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Price calculation failed',
                message: error.message,
                debug: 'Check for undefined variables in fee calculations'
            })
        };
    }
};
