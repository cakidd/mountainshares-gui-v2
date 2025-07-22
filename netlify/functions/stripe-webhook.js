const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Correct MountainShares contract addresses from analysis
const CONTRACTS = {
  BACKBONE_CONTROLLER: '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f',
  USDC_SETTLEMENT: '0x1F0c8a4c920E1094f85b18F681dcfB2e2b7DE076',
  USDC_TOKEN: '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
};

// Correct function signatures from contract analysis
const BACKBONE_ABI = [
  'function coordinateCustomerPurchase() external payable',
  'function coordinateTokenMint(address recipient, uint256 amount, string reason) external',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function getSystemStatus() view returns (bool initialized, bool paused, uint256 operations, uint256 revenue)'
];

const SETTLEMENT_ABI = [
  'function unknown668d3306(address customer, uint256 purchaseAmount, uint256 governanceFee) external',
  'function owner() view returns (address)'
];

// Role hashes from contract analysis
const COORDINATOR_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'; // Need actual hash

async function executeCorrectMountainSharesFlow(sessionData, provider, signer) {
  const results = {
    roleCheck: { status: 'pending' },
    systemCheck: { status: 'pending' },
    customerPurchase: { status: 'pending' },
    tokenMinting: { status: 'pending' }
  };

  try {
    const msTokens = parseInt(sessionData.metadata.msTokens) || 1;
    const customerWallet = sessionData.metadata.walletAddress;
    const customerTotal = parseFloat(sessionData.metadata.customerTotal) || 1.40;

    console.log('🔍 CHECKING MOUNTAINSHARES CONTRACT PERMISSIONS');
    
    const signerAddress = await signer.getAddress();
    console.log('🔑 Signer address:', signerAddress);

    // Check if signer has required roles
    const backboneContract = new ethers.Contract(CONTRACTS.BACKBONE_CONTROLLER, BACKBONE_ABI, provider);
    
    // Check system status first
    try {
      const systemStatus = await backboneContract.getSystemStatus();
      console.log('📊 System status:', systemStatus);
      results.systemCheck.status = 'success';
      results.systemCheck.data = systemStatus;
    } catch (error) {
      console.log('⚠️ Cannot read system status:', error.message);
      results.systemCheck.status = 'failed';
      results.systemCheck.error = error.message;
    }

    // Execute coordinateCustomerPurchase (PAYABLE function for customer purchases)
    if (customerWallet) {
      try {
        console.log('💰 Executing coordinateCustomerPurchase...');
        
        const backboneWithSigner = new ethers.Contract(CONTRACTS.BACKBONE_CONTROLLER, BACKBONE_ABI, signer);
        
        // Convert customer total to wei for payment
        const paymentAmount = ethers.parseEther((customerTotal / 1000).toString()); // Small amount for testing
        
        const purchaseTx = await backboneWithSigner.coordinateCustomerPurchase({
          value: paymentAmount,
          gasLimit: 500000
        });

        console.log('💰 Customer purchase transaction:', purchaseTx.hash);
        results.customerPurchase.status = 'success';
        results.customerPurchase.txHash = purchaseTx.hash;

        // Wait for purchase confirmation before minting
        const receipt = await purchaseTx.wait(1);
        console.log('✅ Purchase confirmed in block:', receipt.blockNumber);

        // Now coordinate token minting
        const mintTx = await backboneWithSigner.coordinateTokenMint(
          customerWallet,
          msTokens,
          `Stripe purchase: ${sessionData.id}`,
          { gasLimit: 400000 }
        );

        console.log('🏔️ Token minting transaction:', mintTx.hash);
        results.tokenMinting.status = 'success';
        results.tokenMinting.txHash = mintTx.hash;

      } catch (error) {
        console.error('❌ Customer purchase/minting failed:', error.message);
        results.customerPurchase.status = 'failed';
        results.customerPurchase.error = error.message;
        
        // Check if it's a role permission error
        if (error.message.includes('AccessControl') || error.message.includes('role')) {
          results.roleCheck.status = 'failed';
          results.roleCheck.error = 'Insufficient permissions - wallet needs COORDINATOR_ROLE';
        }
      }
    }

    return results;

  } catch (error) {
    console.error('❌ MountainShares execution failed:', error);
    throw error;
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const sig = event.headers['stripe-signature'];
    const body = event.body;

    // Verify webhook signature
    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid signature' }) };
    }

    console.log('✅ Webhook verified, type:', stripeEvent.type);

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const metadata = session.metadata || {};
      const walletAddress = metadata.walletAddress;

      console.log('🏔️ Processing MountainShares token delivery');

      if (walletAddress && process.env.MINTING_PRIVATE_KEY && process.env.ARBITRUM_RPC_URL) {
        try {
          console.log('🚀 EXECUTING CORRECT MOUNTAINSHARES CONTRACT FLOW...');
          
          const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
          const signer = new ethers.Wallet(process.env.MINTING_PRIVATE_KEY, provider);
          
          const contractResults = await executeCorrectMountainSharesFlow(session, provider, signer);
          
          console.log('📊 Contract execution results:', JSON.stringify(contractResults, null, 2));
          
          const allSuccessful = Object.values(contractResults).every(r => r.status === 'success' || r.status === 'pending');
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              received: true,
              sessionId: session.id,
              contractExecution: contractResults,
              success: allSuccessful,
              message: allSuccessful ? 'MountainShares tokens delivered successfully' : 'Partial execution - check role permissions'
            })
          };
          
        } catch (error) {
          console.error('❌ Contract execution failed:', error);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              received: true,
              sessionId: session.id,
              processed: false,
              error: 'Contract execution failed',
              details: error.message,
              recommendation: 'Check wallet roles: COORDINATOR_ROLE, Master minting role'
            })
          };
        }
      } else {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            received: true,
            processed: false,
            warning: 'Missing configuration for contract execution'
          })
        };
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ received: true, type: stripeEvent.type }) };

  } catch (error) {
    console.error('🚨 Webhook error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Webhook processing failed' }) };
  }
};
