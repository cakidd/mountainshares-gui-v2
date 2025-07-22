const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Your actual deployed MountainShares contract addresses
const CONTRACTS = {
  // Core settlement and coordination
  USDC_SETTLEMENT_PROCESSOR: '0x1F0c8a4c920E1094f85b18F681dcfB2e2b7DE076',
  BACKBONE_CONTROLLER: '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f',
  MOUNTAINSHARES_TOKEN: process.env.MOUNTAINSHARES_TOKEN,
  
  // Standard USDC on Arbitrum
  USDC_TOKEN: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  
  // Your settlement treasury
  SETTLEMENT_TREASURY: process.env.SETTLEMENT_WALLET_ADDRESS
};

// Based on your contract analysis - inferred function signatures
const SETTLEMENT_ABI = [
  // USDC Settlement Processor (0x1F0c8a4c920E1094f85b18F681dcfB2e2b7DE076)
  'function unknown668d3306(address customer, uint256 purchaseAmount, uint256 governanceFee) external',
  
  // Fallback for comprehensive settlement if specific function fails
  'function comprehensiveSettlementOperation(address customer, uint256 purchaseAmount, uint256 governanceFee) external'
];

const BACKBONE_ABI = [
  // Backbone Controller (0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f)
  'function coordinateCustomerPurchase() external',
  'function coordinateTokenMint(address recipient, uint256 amount, string reason) external',
  'function coordinateHeritageRevenue(address creator) external'
];

const USDC_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

async function executeRealMountainSharesContracts(sessionData, provider, signer) {
  const results = {
    usdcSettlement: { status: 'pending', txHash: null, error: null },
    backboneCoordination: { status: 'pending', txHash: null, error: null },
    tokenMinting: { status: 'pending', txHash: null, error: null }
  };

  try {
    const msTokens = parseInt(sessionData.metadata.msTokens) || 1;
    const customerWallet = sessionData.metadata.walletAddress;
    const customerTotal = parseFloat(sessionData.metadata.customerTotal) || 1.40;
    
    // Convert to wei amounts for contract calls
    const purchaseAmountWei = ethers.parseUnits(customerTotal.toString(), 6); // USDC has 6 decimals
    const governanceFeeWei = ethers.parseUnits('0.01', 6); // $0.01 governance fee

    console.log('⚡ EXECUTING REAL MOUNTAINSHARES SMART CONTRACTS');
    console.log('🏔️ Customer:', customerWallet);
    console.log('💰 Purchase amount (USDC wei):', purchaseAmountWei.toString());
    console.log('🏛️ Governance fee (USDC wei):', governanceFeeWei.toString());

    // Step 1: USDC Settlement via your Settlement Processor
    if (CONTRACTS.USDC_SETTLEMENT_PROCESSOR && customerWallet) {
      try {
        console.log('💰 Executing USDC settlement via Settlement Processor...');
        
        const settlementContract = new ethers.Contract(
          CONTRACTS.USDC_SETTLEMENT_PROCESSOR,
          SETTLEMENT_ABI,
          signer
        );

        // Try the specific function signature from your contract analysis
        let settlementTx;
        try {
          settlementTx = await settlementContract.unknown668d3306(
            customerWallet,
            purchaseAmountWei,
            governanceFeeWei,
            { gasLimit: 500000 }
          );
        } catch (specificError) {
          console.log('🔄 Trying alternative settlement function...');
          settlementTx = await settlementContract.comprehensiveSettlementOperation(
            customerWallet,
            purchaseAmountWei,
            governanceFeeWei,
            { gasLimit: 500000 }
          );
        }

        console.log('💰 USDC settlement transaction:', settlementTx.hash);
        results.usdcSettlement.status = 'success';
        results.usdcSettlement.txHash = settlementTx.hash;

      } catch (error) {
        console.error('❌ USDC settlement failed:', error.message);
        results.usdcSettlement.status = 'failed';
        results.usdcSettlement.error = error.message;
      }
    }

    // Step 2: Backbone Controller Coordination
    if (CONTRACTS.BACKBONE_CONTROLLER) {
      try {
        console.log('🎯 Coordinating via Backbone Controller...');
        
        const backboneContract = new ethers.Contract(
          CONTRACTS.BACKBONE_CONTROLLER,
          BACKBONE_ABI,
          signer
        );

        // Coordinate customer purchase
        const coordinateTx = await backboneContract.coordinateCustomerPurchase({
          gasLimit: 300000
        });

        console.log('🎯 Backbone coordination transaction:', coordinateTx.hash);
        results.backboneCoordination.status = 'success';
        results.backboneCoordination.txHash = coordinateTx.hash;

        // If coordination succeeds, mint tokens
        if (customerWallet && msTokens) {
          const mintTx = await backboneContract.coordinateTokenMint(
            customerWallet,
            msTokens,
            `Stripe purchase: ${sessionData.id}`,
            { gasLimit: 400000 }
          );

          console.log('🏔️ Token minting transaction:', mintTx.hash);
          results.tokenMinting.status = 'success';
          results.tokenMinting.txHash = mintTx.hash;
        }

      } catch (error) {
        console.error('❌ Backbone coordination failed:', error.message);
        results.backboneCoordination.status = 'failed';
        results.backboneCoordination.error = error.message;
      }
    }

    return results;

  } catch (error) {
    console.error('❌ MountainShares contract execution failed:', error);
    throw error;
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sig = event.headers['stripe-signature'];
    const body = event.body;

    console.log('🔔 MountainShares webhook received');

    // Verify webhook signature
    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    console.log('✅ Webhook verified, type:', stripeEvent.type);

    // Process MountainShares token purchase
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      
      console.log('💰 MountainShares payment completed:');
      console.log('- Session ID:', session.id);
      console.log('- Amount:', session.amount_total / 100, 'USD');
      console.log('- Customer:', session.customer_details?.email);
      
      const metadata = session.metadata || {};
      const msTokens = parseInt(metadata.msTokens) || 1;
      const walletAddress = metadata.walletAddress;
      const customerTotal = parseFloat(metadata.customerTotal) || 1.40;
      
      console.log('🏔️ Processing MountainShares delivery:');
      console.log('- MS Tokens:', msTokens);
      console.log('- Wallet:', walletAddress);
      console.log('- Total paid:', customerTotal);

      // Execute your actual deployed smart contracts
      if (walletAddress && process.env.MINTING_PRIVATE_KEY && process.env.ARBITRUM_RPC_URL) {
        try {
          console.log('🚀 EXECUTING DEPLOYED MOUNTAINSHARES CONTRACTS...');
          
          const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
          const signer = new ethers.Wallet(process.env.MINTING_PRIVATE_KEY, provider);
          
          const signerAddress = await signer.getAddress();
          console.log('🔑 Executing with signer:', signerAddress);
          
          // Check signer balance
          const signerBalance = await provider.getBalance(signerAddress);
          console.log('💰 Signer ETH balance:', ethers.formatEther(signerBalance));
          
          const contractResults = await executeRealMountainSharesContracts(session, provider, signer);
          
          console.log('✅ MountainShares contract execution completed');
          console.log('📊 Results:', JSON.stringify(contractResults, null, 2));
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              received: true,
              sessionId: session.id,
              msTokens: msTokens,
              processed: true,
              contractExecution: contractResults,
              customer: {
                email: session.customer_details?.email,
                wallet: walletAddress,
                amount: customerTotal
              },
              mountainSharesDelivery: 'EXECUTED'
            })
          };
          
        } catch (contractError) {
          console.error('❌ MountainShares contract execution failed:', contractError);
          
          // Return webhook success but log contract failure
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              received: true,
              sessionId: session.id,
              msTokens: msTokens,
              processed: false,
              error: 'MountainShares contract execution failed',
              details: contractError.message,
              customerRefundRecommended: true
            })
          };
        }
      } else {
        console.log('⚠️ MountainShares contract execution skipped');
        console.log('- Wallet address provided:', !!walletAddress);
        console.log('- Minting key available:', !!process.env.MINTING_PRIVATE_KEY);
        console.log('- RPC URL available:', !!process.env.ARBITRUM_RPC_URL);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            received: true,
            sessionId: session.id,
            msTokens: msTokens,
            processed: false,
            warning: 'MountainShares contract execution skipped - missing required configuration',
            requiredConfig: {
              walletAddress: !!walletAddress,
              mintingKey: !!process.env.MINTING_PRIVATE_KEY,
              rpcUrl: !!process.env.ARBITRUM_RPC_URL
            }
          })
        };
      }
    }

    // Handle other event types
    console.log('ℹ️ Unhandled event type:', stripeEvent.type);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true, type: stripeEvent.type })
    };

  } catch (error) {
    console.error('🚨 MountainShares webhook processing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'MountainShares webhook processing failed',
        details: error.message
      })
    };
  }
};
