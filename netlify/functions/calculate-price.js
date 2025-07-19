const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

        // VARIABLE PRICING FROM YOUR CONTRACT ANALYSIS
        // Base calculation using your ETH Price Calculator formula
        const ethPriceUSD = await getETHPrice(); // From oracle
        const baseTokenValue = (100000000 * Math.pow(10, 18)) / ethPriceUSD;
        const variableTokenPrice = baseTokenValue / Math.pow(10, 18); // Convert to readable USD
        
        const subtotal = tokenQuantity * variableTokenPrice;
        
        // YOUR EXACT FEE STRUCTURE FROM CONTRACTS
        const fees = {
            // 2% + $0.03 (as you specified)
            platformBaseFee: subtotal * 0.02 + 0.03,
            // 0.5% rounded to nearest penny
            processingAdjustment: Math.round((subtotal * 0.005) * 100) / 100,
            // 2.9% + $0.30 (Stripe standard)
            stripeProcessing: Math.round((subtotal * 0.029 + 0.30) * 100) / 100,
            // SEC regulatory fee $0.01
            regulatoryFee: 0.01,
            totalFees: 0
        };
        
        // Calculate total fees matching your formula
        fees.totalFees = fees.platformBaseFee + fees.processingAdjustment + 
                        fees.stripeProcessing + fees.regulatoryFee;
        
        const total = subtotal + fees.totalFees;
        const totalCents = Math.round(total * 100);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                tokenQuantity: tokenQuantity,
                variableTokenPrice: variableTokenPrice,
                ethPriceUSD: ethPriceUSD,
                subtotal: subtotal,
                fees: {
                    platformBase: fees.platformBaseFee,
                    processingAdjustment: fees.processingAdjustment,
                    stripe: fees.stripeProcessing,
                    regulatory: fees.regulatoryFee,
                    total: fees.totalFees
                },
                total: total,
                totalCents: totalCents,
                currency: 'USD',
                pricingModel: 'variable-eth-based',
                calculation: `${tokenQuantity} tokens × $${variableTokenPrice.toFixed(4)} (ETH-based) = $${total.toFixed(2)}`
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

// Get ETH price from your oracle system (placeholder)
async function getETHPrice() {
    // This would connect to your ETH Price Calculator contract
    // at 0x4153c9b915AAb6Bf1a11Dd6F37BA9E6051a3f1f8
    // For now, return a placeholder value
    return 3000; // $3000 ETH price placeholder
}
