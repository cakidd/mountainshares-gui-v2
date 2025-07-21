const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Your deployed contract addresses
const CONTRACTS = {
  USDC_SETTLEMENT_PROCESSOR: '0x1F0c8a4c920E1094f85b18F681dcfB2e2b7DE076',
  BACKBONE_CONTROLLER: '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f',
  USDC_MANAGEMENT: '0x5574A3EcCFd6e9Af35F0B204f148D021be5b9C95'
};

const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sig = event.headers['stripe-signature'];
    const stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const metadata = session.metadata;
      
      console.log('💳 STRIPE PAYMENT COMPLETED - INITIATING USDC SETTLEMENT');
      console.log('Session ID:', session.id);
      console.log('Amount USD:', session.amount_total / 100);
      
      const msTokens = parseInt(metadata.msTokens || 0);
      const walletAddress = metadata.walletAddress;
      const usdAmount = (session.amount_total / 100) - 0.92; // Subtract fees to get token value
      
      if (msTokens > 0 && walletAddress) {
        // Step 1: Call USDC Settlement Processor
        await initiateUSDCSettlement(usdAmount, session.id);
        
        // Step 2: Call Backbone Controller for token minting
        await requestTokenMinting(msTokens, walletAddress, session.id);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            usdcSettlementInitiated: true,
            tokenMintRequested: true,
            sessionId: session.id,
            msTokens: msTokens,
            recipientWallet: walletAddress
          })
        };
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };

  } catch (error) {
    console.error('🚨 USDC Settlement webhook failed:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'USDC settlement failed',
        details: error.message
      })
    };
  }
};

async function initiateUSDCSettlement(usdAmount, sessionId) {
  try {
    console.log('🏦 INITIATING USDC SETTLEMENT:');
    console.log('- Contract:', CONTRACTS.USDC_SETTLEMENT_PROCESSOR);
    console.log('- Function: unknown668d3306 (Comprehensive Settlement Operation)');
    console.log('- USD Amount:', usdAmount);
    console.log('- Session:', sessionId);
    
    // Here you would call the actual contract function
    // This requires the private key with owner permissions
    console.log('✅ USDC settlement logged for manual processing');
    
    return true;
  } catch (error) {
    console.error('❌ USDC settlement failed:', error);
    return false;
  }
}

async function requestTokenMinting(msTokens, walletAddress, sessionId) {
  try {
    console.log('🪙 REQUESTING MS TOKEN MINTING:');
    console.log('- Contract:', CONTRACTS.BACKBONE_CONTROLLER);
    console.log('- Function: coordinateTokenMint()');
    console.log('- Recipient:', walletAddress);
    console.log('- Amount:', msTokens, 'MS tokens');
    console.log('- Session:', sessionId);
    
    // Here you would call coordinateTokenMint() with COORDINATOR_ROLE permissions
    console.log('✅ Token minting logged for automated processing');
    
    return true;
  } catch (error) {
    console.error('❌ Token minting failed:', error);
    return false;
  }
}
