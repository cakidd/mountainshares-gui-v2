// Add this validation function at the top
function validateNumber(value, name) {
    if (value === undefined || value === null || isNaN(value)) {
        throw new Error(`Invalid ${name}: ${value}`);
    }
    return value;
}

// Update calculateVariableTotal function
async function calculateVariableTotal(quantity) {
    try {
        // Validate inputs
        validateNumber(quantity, 'quantity');
        
        const baseTokenPrice = 1.00; // Fixed base price
        const subtotal = quantity * baseTokenPrice;
        
        validateNumber(subtotal, 'subtotal');
        
        const fees = {
            platformBaseFee: validateNumber(subtotal * 0.02 + 0.03, 'platformBaseFee'),
            processingAdjustment: validateNumber(Math.round((subtotal * 0.005) * 100) / 100, 'processingAdjustment'),
            stripeProcessing: validateNumber(Math.round((subtotal * 0.029 + 0.30) * 100) / 100, 'stripeProcessing'),
            regulatoryFee: validateNumber(Math.round((subtotal * 0.005) * 100) / 100, 'regulatoryFee'),
            totalFees: 0
        };
        
        fees.totalFees = fees.platformBaseFee + fees.processingAdjustment + 
                        fees.stripeProcessing + fees.regulatoryFee;
        
        const total = subtotal + fees.totalFees;
        
        validateNumber(total, 'total');
        
        return {
            baseTokenPrice,
            quantity,
            subtotal,
            totalFees: fees.totalFees,
            total,
            fees: fees
        };
        
    } catch (error) {
        console.error('Calculation error:', error);
        throw new Error(`Price calculation failed: ${error.message}`);
    }
}
