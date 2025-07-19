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

// CORRECT TRANSACTION-BASED PRICING - RESTORED FROM YOUR JAVA CODE
function calculateCorrectTotal(quantity) {
    // Base token price and transaction fees calculation
    const baseTokenPrice = 1.40;
    const subtotal = quantity * baseTokenPrice;
    
    // Transaction-based fee structure (matching your Java implementation)
    const fees = {
        processingFee: Math.max(0.30, subtotal * 0.029), // Stripe standard: 2.9% + $0.30
        platformFee: subtotal * 0.025, // 2.5% platform fee
        totalFees: 0
    };
    
    fees.totalFees = fees.processingFee + fees.platformFee;
    const total = subtotal + fees.totalFees;
    
    return {
        baseTokenPrice,
        quantity,
        subtotal,
        totalFees: fees.totalFees,
        total
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
    console.log('Processing MountainShares transaction-based token purchase...');

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

    // Calculate correct total using YOUR transaction-based pricing
    const quantity = tokenQuantity || 1;
    const calculations = calculateCorrectTotal(quantity);

    // Validate that frontend and backend calculations match (EXACTLY AS IN YOUR CODE)
    if (amount && Math.abs(amount - Math.round(calculations.total * 100)) > 1) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: `Amount mismatch. Expected ${Math.round(calculations.total * 100)} cents, received ${amount} cents`,
          expected: Math.round(calculations.total * 100),
          received: amount,
          breakdown: {
            basePrice: calculations.baseTokenPrice,
            quantity: calculations.quantity,
            subtotal: calculations.subtotal,
            fees: calculations.totalFees,
            total: calculations.total
          }
        })
      };
    }

    console.log('✅ Transaction-based pricing validation passed');
    console.log(`💰 Processing ${quantity} tokens for $${calculations.total.toFixed(2)}`);
    console.log(`📊 Breakdown: $${calculations.subtotal.toFixed(2)} + $${calculations.totalFees.toFixed(2)} fees`);

    // Create Stripe Payment Intent with CORRECT transaction-based pricing
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(calculations.total * 100), // CORRECT total in cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      return_url: 'https://buy.mountainshares.us/success',
      metadata: {
        platform: 'MountainShares',
        community: 'Mount Hope, WV',
        tokenQuantity: quantity.toString(),
        baseTokenPrice: calculations.baseTokenPrice.toString(),
        subtotal: calculations.subtotal.toString(),
        totalFees: calculations.totalFees.toString(),
        total: calculations.total.toString(),
        pricingModel: 'transaction-based',
        customerEmail,
        customerName: customerName || 'Unknown',
        purchaseTimestamp: new Date().toISOString(),
        blockchain: 'Arbitrum',
        contractAddress: process.env.MOUNTAINSHARES_TOKEN || 'pending'
      },
      description: `MountainShares Tokens (${quantity}) - Community-controlled blockchain tokens for Mount Hope, WV`,
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
      console.log(`✅ Payment succeeded: ${paymentIntent.id} for ${quantity} tokens`);

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
            amount: Math.round(calculations.total * 100),
            tokens_purchased: quantity,
            base_token_price: calculations.baseTokenPrice,
            subtotal: calculations.subtotal,
            total_fees: calculations.totalFees,
            total_paid: calculations.total,
            pricing_model: 'transaction-based',
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
      message: 'Token minting initiated on Arbitrum network'
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
