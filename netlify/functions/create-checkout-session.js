const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Your EXACT formula - NO phantom $0.05 fee
function calculateMountainSharesTransactionFees(tokenQuantity) {
  const X = tokenQuantity * 1.00; // Base token value
  
  // Your exact formula components:
  const platformFee = parseFloat((X * 0.02 + 0.03).toFixed(2)); // X(2% + $0.03)
  const treasuryFee = parseFloat((Math.ceil(X * 0.005 * 100) / 100).toFixed(2)); // X(0.5%) rounded up
  const stripeProcessing = parseFloat((X * 0.029 + 0.30).toFixed(2)); // X(2.9% + $0.30)
  const secRegulatory = 0.01; // Fixed $0.01
  
  // NO ADDITIONAL $0.05 FEE - REMOVED
  
  const totalFees = platformFee + treasuryFee + stripeProcessing + secRegulatory;
  const customerTotal = X + totalFees;
  
  return {
    tokenValue: X,
    platformFee,
    treasuryFee,
    stripeProcessing,
    secRegulatory,
    totalFees: parseFloat(totalFees.toFixed(2)),
    customerTotal: parseFloat(customerTotal.toFixed(2))
  };
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { 
      msTokens, 
      walletAddress, 
      customerEmail, 
      testMode = false,
      darwinGoedelOptimized = false 
    } = JSON.parse(event.body || '{}');

    console.log('🛒 Creating checkout session with YOUR EXACT FORMULA');
    console.log('🏔️ MS Tokens:', msTokens);

    // Use YOUR EXACT FORMULA (no phantom $0.05)
    const feeCalculation = calculateMountainSharesTransactionFees(msTokens);
    
    console.log('📊 Fee breakdown (YOUR EXACT FORMULA):');
    console.log('- Token value:', feeCalculation.tokenValue);
    console.log('- Platform fee:', feeCalculation.platformFee);
    console.log('- Treasury fee:', feeCalculation.treasuryFee);
    console.log('- Stripe processing:', feeCalculation.stripeProcessing);
    console.log('- SEC regulatory:', feeCalculation.secRegulatory);
    console.log('- Total fees:', feeCalculation.totalFees);
    console.log('- Customer total:', feeCalculation.customerTotal);

    const totalAmountInCents = Math.round(feeCalculation.customerTotal * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${msTokens} MountainShares Token${msTokens > 1 ? 's' : ''}`,
              description: `${msTokens} tokens × $1.00 + transaction fees = $${feeCalculation.customerTotal}`,
            },
            unit_amount: totalAmountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${event.headers.origin || 'https://buy.mountainshares.us'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${event.headers.origin || 'https://buy.mountainshares.us'}?canceled=true`,
      customer_email: customerEmail,
      metadata: {
        msTokens: msTokens.toString(),
        walletAddress: walletAddress || '',
        tokenValue: feeCalculation.tokenValue.toString(),
        totalFees: feeCalculation.totalFees.toString(),
        customerTotal: feeCalculation.customerTotal.toString(),
        feeStructure: 'exact_formula',
        testMode: testMode.toString()
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
        calculation: feeCalculation
      })
    };

  } catch (error) {
    console.error('❌ Checkout session creation failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create checkout session',
        details: error.message
      })
    };
  }
};
