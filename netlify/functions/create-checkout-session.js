const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Your exact fee calculation formula - TRANSACTION BASED, NOT PER TOKEN
function calculateMountainSharesTransactionFees(tokenQuantity) {
  const X = tokenQuantity * 1.00; // Base token value: X = tokens * $1.00
  
  // Your exact formula: Tokens purchase = X; X(2% + $0.03) = X.05 X(0.5%)rounded to the nearest penny = X.01 X(2.9% + $.30) rounded to the nearest penney = X.33 Hidden Stripe fees due to SEC regs. $0.01 rounded to the nearest penny = X.01 X.05
  
  const platformFee = parseFloat((X * 0.02 + 0.03).toFixed(2)); // X(2% + $0.03)
  const treasuryFee = parseFloat((Math.ceil(X * 0.005 * 100) / 100).toFixed(2)); // X(0.5%) rounded to nearest penny
  const stripeProcessing = parseFloat((X * 0.029 + 0.30).toFixed(2)); // X(2.9% + $0.30) rounded to nearest penny
  const secRegulatory = 0.01; // Fixed $0.01
  const additionalFee = 0.05; // Fixed $0.05
  
  const totalFees = platformFee + treasuryFee + stripeProcessing + secRegulatory + additionalFee;
  const customerTotal = X + totalFees;
  
  return {
    tokenValue: X,
    platformFee,
    treasuryFee,
    stripeProcessing,
    secRegulatory,
    additionalFee,
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

    console.log('🛒 Creating checkout session with TRANSACTION-BASED fees');
    console.log('🏔️ MS Tokens:', msTokens);
    console.log('💰 Using your exact fee formula');

    // Calculate using YOUR EXACT FORMULA (transaction-based, not per token)
    const feeCalculation = calculateMountainSharesTransactionFees(msTokens);
    
    console.log('📊 Fee breakdown:');
    console.log('- Token value:', feeCalculation.tokenValue);
    console.log('- Platform fee:', feeCalculation.platformFee);
    console.log('- Treasury fee:', feeCalculation.treasuryFee);
    console.log('- Stripe processing:', feeCalculation.stripeProcessing);
    console.log('- SEC regulatory:', feeCalculation.secRegulatory);
    console.log('- Additional fee:', feeCalculation.additionalFee);
    console.log('- Customer total:', feeCalculation.customerTotal);

    // Convert to cents for Stripe
    const totalAmountInCents = Math.round(feeCalculation.customerTotal * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${msTokens} MountainShares Token${msTokens > 1 ? 's' : ''}`,
              description: `Purchase ${msTokens} MountainShares tokens - Transaction-based fee structure`,
            },
            unit_amount: totalAmountInCents, // TOTAL AMOUNT, NOT PER TOKEN
          },
          quantity: 1, // ALWAYS 1 - because it's the total transaction amount
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
        feeStructure: 'transaction_based',
        darwinGoedelOptimized: darwinGoedelOptimized.toString(),
        testMode: testMode.toString(),
        platform: 'MountainShares',
        location: 'Mount Hope, WV'
      }
    });

    console.log('✅ Checkout session created with correct transaction-based pricing:', session.id);
    console.log('💵 Stripe will charge:', feeCalculation.customerTotal, 'USD');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
        feeCalculation: feeCalculation
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
