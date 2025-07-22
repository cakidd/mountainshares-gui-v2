const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Convert BigInt values to strings for JSON serialization
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { walletAddress } = JSON.parse(event.body || '{}');
    
    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }

    console.log('🔍 Checking wallet balance for:', walletAddress);
    
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    
    const results = {
      walletAddress: walletAddress,
      timestamp: new Date().toISOString(),
      network: 'Arbitrum One',
      balanceCheck: {}
    };

    // Get ETH balance
    try {
      const balance = await provider.getBalance(walletAddress);
      const balanceInEth = ethers.formatEther(balance);
      
      results.balanceCheck = {
        ethBalance: balanceInEth,
        ethBalanceWei: balance.toString(),
        hasFunds: parseFloat(balanceInEth) > 0
      };
      
      console.log('💰 ETH Balance:', balanceInEth);
      console.log('💰 Balance in Wei:', balance.toString());
      
    } catch (error) {
      console.error('❌ Balance check failed:', error);
      results.balanceCheck = {
        error: error.message,
        ethBalance: '0',
        hasFunds: false
      };
    }

    // Check network connectivity
    try {
      const network = await provider.getNetwork();
      results.networkInfo = {
        chainId: network.chainId.toString(),
        name: network.name
      };
    } catch (error) {
      results.networkInfo = { error: error.message };
    }

    // Serialize any BigInt values for JSON response
    const serializedResults = serializeBigInt(results);

    console.log('✅ Balance check completed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results: serializedResults,
        message: `Wallet balance check completed for ${walletAddress}`
      })
    };

  } catch (error) {
    console.error('❌ Wallet balance check failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Wallet balance check failed',
        details: error.message
      })
    };
  }
};
