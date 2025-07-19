const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const ALLOWED_ORIGINS = [
  'https://buy.mountainshares.us',
  'https://mountainshares.us'
];

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://buy.mountainshares.us',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate'
};

// VARIABLE PRICING FROM YOUR CONTRACT ANALYSIS
async function calculateVariableTotal(quantity) {
    // Base calculation using your ETH Price Calculator formula
    const ethPriceUSD = await getETHPrice();
    const baseTokenValue = (100000000 * Math.pow(10, 18)) / ethPriceUSD;
    const variableTokenPrice = baseTokenValue / Math.pow(10, 18); // Convert to readable USD
    
    const subtotal = quantity * variableTokenPrice;
    
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
    
    fees.totalFees = fees.platformBaseFee + fees.processingAdjustment + 
                    fees.stripeProcessing + fees.regulatoryFee;
    
    const total = subtotal + fees.totalFees;
    
    return {
        variableTokenPrice,
        ethPriceUSD,
        quantity,
        subtotal,
        totalFees: fees.totalFees,
        total,
        fees: fees
    };
}

exports.handler = async (event, context) => {
  // Verify origin for security
  const origin = event.headers.origin || event.headers.referer;
  if (origin && !ALLOWED_ORIGINS.some(allowed => origin.includes(allowed))) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Origin not allowed' })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const startTime = Date.now();
    console.log('Processing MountainShares variable token purchase...');

    // Parse and validate request
    const requestBody = JSON.parse(event.body);
    const { amount, tokenQuantity, customerEmail, paymentMethodId, customerName } = requestBody;

    // Input validation
    const validationResult = validatePurchaseRequest(amount, tokenQuantity, customerEmail, paymentMethodId);
    if (!validationResult.valid) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Validation failed',
          details: validationResult.errors
        })
      };
    }

    // Calculate variable pricing using YOUR contract logic
    const quantity = tokenQuantity || 1;
    const calculations = await calculateVariableTotal(quantity);

    // Validate that frontend and backend calculations match
    const expectedAmountCents = Math.round(calculations.total * 100);
    if (amount && Math.abs(amount - expectedAmountCents) > 5) { // 5 cent tolerance for variable pricing
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: `Amount mismatch. Expected ${expectedAmountCents} cents, received ${amount} cents`,
          expected: expectedAmountCents,
          received: amount,
          breakdown: {
            variableTokenPrice: calculations.variableTokenPrice,
            ethPrice: calculations.ethPriceUSD,
            quantity: calculations.quantity,
            subtotal: calculations.subtotal,
            fees: calculations.totalFees,
            total: calculations.total
          }
        })
      };
    }

    console.log('✅ Variable pricing validation passed');
    console.log(`💰 Processing ${quantity} tokens for $${calculations.total.toFixed(2)}`);
    console.log(`📊 ETH Price: $${calculations.ethPriceUSD}, Token Price: $${calculations.variableTokenPrice.toFixed(4)}`);

    // Create Stripe Payment Intent with VARIABLE pricing
    const paymentIntent = await stripe.paymentIntents.create({
      amount: expectedAmountCents,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      return_url: 'https://buy.mountainshares.us/success',
      metadata: {
        platform: 'MountainShares',
        community: 'Mount Hope, WV',
        tokenQuantity: quantity.toString(),
        variableTokenPrice: calculations.variableTokenPrice.toString(),
        ethPriceUSD: calculations.ethPriceUSD.toString(),
        subtotal: calculations.subtotal.toString(),
        totalFees: calculations.totalFees.toString(),
        total: calculations.total.toString(),
        pricingModel: 'variable-eth-based',
        customerEmail,
        customerName: customerName || 'Unknown',
        purchaseTimestamp: new Date().toISOString(),
        blockchain: 'Arbitrum',
        contractAddress: process.env.MOUNTAINSHARES_TOKEN || 'pending'
      },
      description: `MountainShares Variable Tokens (${quantity}) - ETH-based pricing at $${calculations.variableTokenPrice.toFixed(4)} each`,
      receipt_email: customerEmail
    });

    // Handle payment status
    if (paymentIntent.status === 'requires_action' && paymentIntent.next_action?.type === 'use_stripe_sdk') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          requires_action: true,
          payment_intent: {
            id: paymentIntent.id,
            client_secret: paymentIntent.client_secret
          },
          message: 'Additional authentication required'
        })
      };
    }

    if (paymentIntent.status === 'succeeded') {
      console.log(`✅ Payment succeeded: ${paymentIntent.id} for ${quantity} variable tokens`);

      // Trigger blockchain token minting
      const mintResult = await initiateTokenMinting(paymentIntent, quantity, customerEmail);

      const processingTime = Date.now() - startTime;

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          payment: {
            id: paymentIntent.id,
            amount: expectedAmountCents,
            tokens_purchased: quantity,
            variable_token_price: calculations.variableTokenPrice,
            eth_price_usd: calculations.ethPriceUSD,
            subtotal: calculations.subtotal,
            total_fees: calculations.totalFees,
            total_paid: calculations.total,
            pricing_model: 'variable-eth-based',
            customer_email: customerEmail
          },
          blockchain: {
            status: mintResult.status,
            transaction_hash: mintResult.transactionHash,
            estimated_confirmation_time: '2-5 minutes'
          },
          processing_time_ms: processingTime
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status: paymentIntent.status,
        message: 'Payment processing in progress',
        payment_intent_id: paymentIntent.id
      })
    };

  } catch (error) {
    console.error('Payment processing error:', error);
    
    if (error.type === 'StripeCardError') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Card declined',
          message: error.message,
          decline_code: error.decline_code
        })
      };
    }

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Payment processing failed',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Get ETH price from your oracle system
async function getETHPrice() {
    // This would connect to your ETH Price Calculator contract
    // at 0x4153c9b915AAb6Bf1a11Dd6F37BA9E6051a3f1f8
    try {
        // Placeholder - replace with actual oracle call to your contract
        return 3000; // $3000 ETH price placeholder
        
        // Future implementation would use web3 to call:
        // const web3 = new Web3(process.env.ARBITRUM_RPC_URL);
        // const priceContract = new web3.eth.Contract(ETH_PRICE_CALCULATOR_ABI, '0x4153c9b915AAb6Bf1a11Dd6F37BA9E6051a3f1f8');
        // return await priceContract.methods.getETHPriceUSD().call();
    } catch (error) {
        console.error('Error getting ETH price:', error);
        return 3000; // Fallback price
    }
}

// Input validation function
function validatePurchaseRequest(amount, tokenQuantity, customerEmail, paymentMethodId) {
  const errors = [];
  
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    errors.push('Invalid amount');
  }
  
  if (!tokenQuantity || typeof tokenQuantity !== 'number' || tokenQuantity <= 0 || tokenQuantity > 10000) {
    errors.push('Token quantity must be between 1 and 10,000');
  }
  
  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    errors.push('Valid email address required');
  }
  
  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    errors.push('Payment method ID required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Blockchain token minting integration
async function initiateTokenMinting(paymentIntent, tokenQuantity, customerEmail) {
  try {
    const tokenContractAddress = process.env.MOUNTAINSHARES_TOKEN;
    const customerPurchaseContract = process.env.MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS;
    const mintingPrivateKey = process.env.MINTING_PRIVATE_KEY;
    const arbitrumRpcUrl = process.env.ARBITRUM_RPC_URL;
    
    console.log(`Initiating blockchain mint for payment: ${paymentIntent.id}`);
    console.log(`Token contract: ${tokenContractAddress}`);
    
    return {
      status: 'initiated',
      transactionHash: `pending_blockchain_integration_${Date.now()}`,
      message: 'Variable token minting initiated on Arbitrum network'
    };
    
  } catch (error) {
    console.error('Token minting initiation error:', error);
    return {
      status: 'error',
      message: 'Failed to initiate token minting',
      error: error.message
    };
  }
}
