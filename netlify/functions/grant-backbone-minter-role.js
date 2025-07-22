const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';

const TOKEN_ABI = [
  'function grantRole(bytes32 role, address account) external',
  'function hasRole(bytes32 role, address account) view returns (bool)'
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔑 Granting MINTER_ROLE to Backbone Controller...');
    
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const signer = new ethers.Wallet(process.env.MINTING_PRIVATE_KEY, provider);
    
    const tokenContract = new ethers.Contract(
      '0xE8A9c6fFE6b2344147D886EcB8608C5F7863B20D',
      TOKEN_ABI,
      signer
    );
    
    const backboneAddress = '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f';
    
    // Check current role status
    const hasRole = await tokenContract.hasRole(MINTER_ROLE, backboneAddress);
    console.log('🎯 Backbone currently has MINTER_ROLE:', hasRole);
    
    if (!hasRole) {
      console.log('⚡ Granting MINTER_ROLE to Backbone Controller...');
      
      const tx = await tokenContract.grantRole(MINTER_ROLE, backboneAddress, {
        gasLimit: 200000,
        maxFeePerGas: ethers.parseUnits('0.1', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('0.01', 'gwei')
      });
      
      console.log('📝 Transaction sent:', tx.hash);
      
      const receipt = await tx.wait(1);
      console.log('✅ Role granted in block:', receipt.blockNumber);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          transaction: tx.hash,
          blockNumber: receipt.blockNumber,
          message: 'MINTER_ROLE successfully granted to Backbone Controller'
        })
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          alreadyGranted: true,
          message: 'Backbone Controller already has MINTER_ROLE'
        })
      };
    }

  } catch (error) {
    console.error('❌ Role grant failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to grant MINTER_ROLE',
        details: error.message
      })
    };
  }
};
