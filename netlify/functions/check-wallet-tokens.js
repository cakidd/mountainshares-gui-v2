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
    const { walletAddress, tokenContract } = JSON.parse(event.body || '{}');
    
    console.log('🔍 Checking wallet token balance');
    console.log('👛 Wallet:', walletAddress);
    console.log('🏔️ Token Contract:', tokenContract);
    
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    
    // ERC-721 ABI for MountainShares tokens
    const ERC721_ABI = [
      'function balanceOf(address) view returns (uint256)',
      'function totalSupply() view returns (uint256)',
      'function name() view returns (string)',
      'function symbol() view returns (string)'
    ];
    
    const tokenContractInstance = new ethers.Contract(tokenContract, ERC721_ABI, provider);
    
    const balance = await tokenContractInstance.balanceOf(walletAddress);
    const totalSupply = await tokenContractInstance.totalSupply();
    const name = await tokenContractInstance.name();
    const symbol = await tokenContractInstance.symbol();
    
    console.log('📊 Results:');
    console.log('- Balance:', balance.toString());
    console.log('- Total Supply:', totalSupply.toString());
    console.log('- Token Name:', name);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        wallet: walletAddress,
        tokenContract: tokenContract,
        tokenName: name,
        tokenSymbol: symbol,
        balance: balance.toString(),
        totalSupply: totalSupply.toString(),
        hasTokens: balance.toString() !== '0'
      })
    };

  } catch (error) {
    console.error('❌ Token balance check failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Token balance check failed',
        details: error.message
      })
    };
  }
};
