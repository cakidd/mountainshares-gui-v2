const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Role hashes from MountainShares contracts
const ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  COORDINATOR_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000001',
  MINTER_ROLE: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'
};

const ROLE_CHECK_ABI = [
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function owner() view returns (address)'
];

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
    const { walletAddress, contracts } = JSON.parse(event.body || '{}');
    
    if (!walletAddress) {
      throw new Error('Wallet address required');
    }

    console.log('🔍 Checking wallet roles for:', walletAddress);
    
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    
    const results = {
      walletAddress: walletAddress,
      timestamp: new Date().toISOString(),
      contracts: {},
      roleStatus: 'checking',
      canExecuteTransactions: false
    };

    // Check roles on Backbone Controller
    if (contracts.backbone) {
      try {
        console.log('🎯 Checking Backbone Controller roles...');
        const backboneContract = new ethers.Contract(contracts.backbone, ROLE_CHECK_ABI, provider);
        
        const roleChecks = {};
        for (const [roleName, roleHash] of Object.entries(ROLES)) {
          try {
            const hasRole = await backboneContract.hasRole(roleHash, walletAddress);
            roleChecks[roleName] = hasRole;
            console.log(`- ${roleName}: ${hasRole}`);
          } catch (error) {
            roleChecks[roleName] = `Error: ${error.message}`;
            console.log(`- ${roleName}: Error - ${error.message}`);
          }
        }

        // Check if wallet is owner
        let isOwner = false;
        try {
          const owner = await backboneContract.owner();
          isOwner = owner.toLowerCase() === walletAddress.toLowerCase();
          console.log('- Is Owner:', isOwner);
        } catch (error) {
          console.log('- Owner check failed:', error.message);
        }

        results.contracts.backbone = {
          address: contracts.backbone,
          roles: roleChecks,
          isOwner: isOwner
        };

        // Determine if wallet can execute transactions
        const canExecute = roleChecks.DEFAULT_ADMIN_ROLE === true || 
                          roleChecks.COORDINATOR_ROLE === true || 
                          roleChecks.MINTER_ROLE === true ||
                          isOwner;
        
        results.canExecuteTransactions = canExecute;
        results.roleStatus = canExecute ? 'AUTHORIZED' : 'INSUFFICIENT_PERMISSIONS';

      } catch (error) {
        console.error('❌ Backbone role check failed:', error);
        results.contracts.backbone = {
          address: contracts.backbone,
          error: error.message
        };
      }
    }

    console.log('📊 Role check complete. Status:', results.roleStatus);

    // Use serializeBigInt to handle any BigInt values
    const serializedResults = serializeBigInt(results);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        roleCheck: serializedResults,
        message: `Wallet role verification completed: ${serializedResults.roleStatus}`,
        recommendation: serializedResults.canExecuteTransactions 
          ? 'Wallet has sufficient permissions for contract execution'
          : 'Wallet needs COORDINATOR_ROLE, MINTER_ROLE, or ADMIN_ROLE to execute transactions'
      })
    };

  } catch (error) {
    console.error('❌ Wallet role check failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Wallet role check failed',
        details: error.message
      })
    };
  }
};
