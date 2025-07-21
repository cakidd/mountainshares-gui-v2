const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Arbitrum mainnet contract addresses
const CONTRACTS = {
  COMMONS_BRIDGE: '0x4959773c4D1B49c417C0e3965e990013Cc9138f0',
  STRIPE_GATEWAY: '0x7228BA9E8179fF04d1DacD8Bb3D1a62391360D11',
  USDC_SETTLEMENT: '0x5574A3EcCFd6e9Af35F0B204f148D021be5b9C95',
  CENTRAL_COMMAND: '0x7F246dD285E7c53190b5Ae927a3a581393F9a521',
  MOUNTAINSHARES_TOKEN: '0xE8A9c6fFE6b2344147D886EcB8608C5F7863B20D',
  USDC_TOKEN: '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { msTokens, walletAddress } = JSON.parse(event.body || '{}');
    
    if (!msTokens || msTokens <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid token quantity' })
      };
    }

    // USDC-based pricing calculation (1 MS = 1 USDC + fees)
    const baseTokenPrice = 1.00; // 1 MS = 1 USD
    const subtotal = msTokens * baseTokenPrice;
    
    // Fee structure based on your contract analysis
    const fees = {
      // 2% convenience fee as per Stripe Gateway contract
      convenienceFee: Math.round((subtotal * 0.02) * 100) / 100,
      // 0.5% treasury fee as per contract documentation
      treasuryFee: Math.round((subtotal * 0.005) * 100) / 100,
      // Stripe processing fee (still needed for fiat processing)
      stripeProcessing: Math.round((subtotal * 0.029 + 0.30) * 100) / 100
    };
    
    const totalFees = fees.convenienceFee + fees.treasuryFee + fees.stripeProcessing;
    const total = subtotal + totalFees;
    const totalCents = Math.round(total * 100);

    // Create Stripe checkout session with USDC settlement metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${msTokens} MountainShares Tokens`,
            description: `Purchase ${msTokens} MS tokens (USDC-backed) for Mount Hope, WV community`,
            images: ['https://buy.mountainshares.us/mountainshares-logo.png']
          },
          unit_amount: totalCents,
        },
        quantity: 1,
      }],
      metadata: {
        // Core transaction data
        msTokens: msTokens.toString(),
        walletAddress: walletAddress || '',
        productType: 'mountainshares-usdc-backed',
        
        // USDC settlement data
        usdcAmount: subtotal.toString(),
        settlementWallet: CONTRACTS.USDC_SETTLEMENT,
        
        // Contract interaction data
        stripeGateway: CONTRACTS.STRIPE_GATEWAY,
        centralCommand: CONTRACTS.CENTRAL_COMMAND,
        tokenContract: CONTRACTS.MOUNTAINSHARES_TOKEN,
        
        // Fee distribution (USDC)
        convenienceFeeUSDC: fees.convenienceFee.toString(),
        treasuryFeeUSDC: fees.treasuryFee.toString(),
        
        // Settlement network
        network: 'arbitrum',
        chainId: '42161'
      },
      mode: 'payment',
      success_url: 'https://buy.mountainshares.us/success-usdc?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://buy.mountainshares.us/?canceled=true&usdc=true',
    });

    console.log('🔗 USDC-BACKED TRANSACTION CREATED:');
    console.log(`- Session: ${session.id}`);
    console.log(`- MS Tokens: ${msTokens}`);
    console.log(`- USDC Settlement: ${subtotal} USDC`);
    console.log(`- Settlement Wallet: ${CONTRACTS.USDC_SETTLEMENT}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
        usdcBacked: true,
        settlementData: {
          usdcAmount: subtotal,
          settlementWallet: CONTRACTS.USDC_SETTLEMENT,
          networkId: 42161,
          chainName: 'arbitrum'
        }
      })
    };

  } catch (error) {
    console.error('USDC checkout session creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'USDC settlement processing failed',
        details: error.message
      })
    };
  }
};
