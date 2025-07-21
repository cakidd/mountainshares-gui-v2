const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Your Backbone Controller contract address
const BACKBONE_CONTRACT = '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f';

// OpenZeppelin AccessControl ABI for grantRole function
const ACCESS_CONTROL_ABI = [
  'function grantRole(bytes32 role, address account) external',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function COORDINATOR_ROLE() view returns (bytes32)'
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔐 GRANTING COORDINATOR_ROLE TO NETLIFY FUNCTION');
    
    // Initialize Arbitrum provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const adminWallet = new ethers.Wallet(process.env.MINTING_PRIVATE_KEY, provider);
    
    // Connect to Backbone contract
    const backboneContract = new ethers.Contract(BACKBONE_CONTRACT, ACCESS_CONTROL_ABI, adminWallet);
    
    // Generate COORDINATOR_ROLE hash (this is typically keccak256("COORDINATOR_ROLE"))
    const COORDINATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COORDINATOR_ROLE"));
    
    // The address that will receive COORDINATOR_ROLE (your serverless function executor)
    // For serverless functions, we use the admin wallet address as the executor
    const functionExecutorAddress = adminWallet.address;
    
    console.log('👤 Admin Wallet:', adminWallet.address);
    console.log('🏗️ Backbone Contract:', BACKBONE_CONTRACT);
    console.log('🎯 Granting COORDINATOR_ROLE to:', functionExecutorAddress);
    
    // Check if role is already granted
    const hasRole = await backboneContract.hasRole(COORDINATOR_ROLE, functionExecutorAddress);
    
    if (hasRole) {
      console.log('✅ COORDINATOR_ROLE already granted');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'COORDINATOR_ROLE already granted',
          grantee: functionExecutorAddress,
          contract: BACKBONE_CONTRACT
        })
      };
    }
    
    // Grant COORDINATOR_ROLE
    console.log('🚀 Executing grantRole transaction...');
    const tx = await backboneContract.grantRole(COORDINATOR_ROLE, functionExecutorAddress);
    
    console.log('📄 Transaction hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    
    console.log('✅ COORDINATOR_ROLE GRANTED SUCCESSFULLY');
    console.log('⛽ Gas used:', receipt.gasUsed.toString());
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'COORDINATOR_ROLE granted successfully',
        transactionHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        grantee: functionExecutorAddress,
        contract: BACKBONE_CONTRACT,
        blockNumber: receipt.blockNumber
      })
    };

  } catch (error) {
    console.error('❌ Failed to grant COORDINATOR_ROLE:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to grant COORDINATOR_ROLE',
        details: error.message
      })
    };
  }
};
