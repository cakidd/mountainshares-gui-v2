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
  COORDINATOR_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000001', // Need actual hash
  MINTER_ROLE: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
  CUSTOMER_PURCHASE_MANAGER: '0x2e8b98eef02e8df3bd27d1270ded3bea3d14db99c5234c7b14001a7fff957bcc'
};

const ROLE_CHECK_ABI = [
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function getRoleMemberCount(bytes32 role) view returns (uint256)',
  'function owner() view returns (address)',
  'function getSystemStatus() view returns (bool initialized, bool paused, uint256 operations, uint256 revenue)'
];

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

        // Check system status
        let systemStatus = null;
        try {
          systemStatus = await backboneContract.getSystemStatus();
          console.log('- System Status:', systemStatus);
        } catch (error) {
          console.log('- System status check failed:', error.message);
        }

        results.contracts.backbone = {
          address: contracts.backbone,
          roles: roleChecks,
          isOwner: isOwner,
          systemStatus: systemStatus
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

    // Get the actual minting wallet address from environment for comparison
    if (process.env.MINTING_PRIVATE_KEY) {
      try {
        const mintingWallet = new ethers.Wallet(process.env.MINTING_PRIVATE_KEY);
        const mintingAddress = await mintingWallet.getAddress();
        results.mintingWalletAddress = mintingAddress;
        results.isCorrectWallet = mintingAddress.toLowerCase() === walletAddress.toLowerCase();
        
        console.log('🔑 Environment minting wallet:', mintingAddress);
        console.log('🎯 Checking correct wallet:', results.isCorrectWallet);
      } catch (error) {
        results.mintingWalletError = error.message;
      }
    }

    console.log('📊 Role check complete. Status:', results.roleStatus);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        roleCheck: results,
        message: `Wallet role verification completed: ${results.roleStatus}`,
        recommendation: results.canExecuteTransactions 
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
