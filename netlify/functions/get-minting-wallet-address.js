const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (!process.env.MINTING_PRIVATE_KEY) {
      throw new Error('MINTING_PRIVATE_KEY not configured');
    }

    const wallet = new ethers.Wallet(process.env.MINTING_PRIVATE_KEY);
    const address = await wallet.getAddress();
    
    console.log('🔑 Minting wallet address:', address);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        mintingWalletAddress: address,
        message: 'Minting wallet address retrieved'
      })
    };

  } catch (error) {
    console.error('❌ Failed to get minting wallet:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve minting wallet address',
        details: error.message
      })
    };
  }
};
