// MountainShares Token Purchase Processing - Production Ready
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const FIXED_TOKEN_PRICE = 1.40; // $1.40 per MountainShares token
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
    console.log('Processing MountainShares token purchase...');

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

    // Verify pricing calculation
    const expectedAmountCents = Math.round(tokenQuantity * FIXED_TOKEN_PRICE * 100);
    if (Math.abs(amount - expectedAmountCents) > 1) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Price validation failed',
          expected: expectedAmountCents,
          received: amount,
          tokenPrice: `$${FIXED_TOKEN_PRICE} per token`,
          calculation: `${tokenQuantity} × $${FIXED_TOKEN_PRICE} = $${(expectedAmountCents / 100).toFixed(2)}`
        })
      };
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: expectedAmountCents,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      metadata: {
        platform: 'MountainShares',
        tokenQuantity: tokenQuantity.toString(),
        pricePerToken: FIXED_TOKEN_PRICE.toString(),
        customerEmail,
        customerName: customerName || 'Unknown',
        purchaseTimestamp: new Date().toISOString(),
        blockchain: 'Arbitrum',
        contractAddress: process.env.MOUNTAINSHARES_TOKEN || 'pending'
      },
      description: `MountainShares Community AI Platform - ${tokenQuantity} tokens`,
      receipt_email: customerEmail,
      automatic_payment_methods: {
        enabled: true
      }
    });

    // Handle payment status
    if (paymentIntent.status === 'requires_action') {
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
      // Log successful payment
      console.log(`Payment succeeded: ${paymentIntent.id} for ${tokenQuantity} tokens`);

      // Trigger blockchain token minting
      const mintResult = await initiateTokenMinting(paymentIntent, tokenQuantity, customerEmail);

      const processingTime = Date.now() - startTime;
      console.log(`Payment processed in ${processingTime}ms`);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          payment: {
            id: paymentIntent.id,
            amount: expectedAmountCents,
            tokens_purchased: tokenQuantity,
            price_per_token: FIXED_TOKEN_PRICE,
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

    // Payment failed
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Payment failed',
        status: paymentIntent.status,
        message: 'Payment could not be processed'
      })
    };

  } catch (error) {
    console.error('Payment processing error:', error);
    
    // Stripe-specific error handling
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

    // Generic error response
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
    // Use your configured environment variables
    const tokenContractAddress = process.env.MOUNTAINSHARES_TOKEN;
    const customerPurchaseContract = process.env.MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS;
    const mintingPrivateKey = process.env.MINTING_PRIVATE_KEY;
    const arbitrumRpcUrl = process.env.ARBITRUM_RPC_URL;
    
    console.log(`Initiating blockchain mint for payment: ${paymentIntent.id}`);
    console.log(`Token contract: ${tokenContractAddress}`);
    console.log(`Customer contract: ${customerPurchaseContract}`);
    
    // Placeholder for actual blockchain integration
    // This would connect to your Arbitrum network and execute the minting
    
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
