const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Role hashes from your MountainShares contracts
const ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  MINTER_ROLE: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'
};

const CONTRACT_ABI = [
  'function grantRole(bytes32 role, address account) external',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function revokeRole(bytes32 role, address account) external'
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const NEW_WALLET = '0xBf1bD0A0DA1B64Ec6128B91a39AD8a0c88B83330';
    const COMPROMISED_WALLET = '0xdE75F5168E33db23FA5601b5fc88545be7b287a4';
    
    console.log('🔄 Migrating roles from compromised wallet to secure wallet');
    console.log('🆕 New wallet:', NEW_WALLET);
    console.log('❌ Compromised wallet:', COMPROMISED_WALLET);
    
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const signer = new ethers.Wallet(process.env.MINTING_PRIVATE_KEY, provider);
    
    const results = {
      newWallet: NEW_WALLET,
      compromisedWallet: COMPROMISED_WALLET,
      backboneController: {},
      mountainSharesToken: {}
    };

    // Update Backbone Controller roles
    const backboneContract = new ethers.Contract(
      '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f',
      CONTRACT_ABI,
      signer
    );

    console.log('🎯 Processing Backbone Controller roles...');
    
    // Grant DEFAULT_ADMIN_ROLE to new wallet
    try {
      const hasAdminRole = await backboneContract.hasRole(ROLES.DEFAULT_ADMIN_ROLE, NEW_WALLET);
      if (!hasAdminRole) {
        const tx = await backboneContract.grantRole(ROLES.DEFAULT_ADMIN_ROLE, NEW_WALLET, {
          gasLimit: 200000
        });
        results.backboneController.grantAdmin = tx.hash;
        console.log('✅ Granted ADMIN role to new wallet:', tx.hash);
      } else {
        results.backboneController.grantAdmin = 'already_has_role';
      }
    } catch (error) {
      results.backboneController.grantAdminError = error.message;
    }

    // Update MountainShares Token roles
    const tokenContract = new ethers.Contract(
      '0xE8A9c6fFE6b2344147D886EcB8608C5F7863B20D',
      CONTRACT_ABI,
      signer
    );

    console.log('🏔️ Processing MountainShares Token roles...');
    
    // Grant MINTER_ROLE to new wallet
    try {
      const hasMinterRole = await tokenContract.hasRole(ROLES.MINTER_ROLE, NEW_WALLET);
      if (!hasMinterRole) {
        const tx = await tokenContract.grantRole(ROLES.MINTER_ROLE, NEW_WALLET, {
          gasLimit: 200000
        });
        results.mountainSharesToken.grantMinter = tx.hash;
        console.log('✅ Granted MINTER role to new wallet:', tx.hash);
      } else {
        results.mountainSharesToken.grantMinter = 'already_has_role';
      }
    } catch (error) {
      results.mountainSharesToken.grantMinterError = error.message;
    }

    // Grant MINTER_ROLE to Backbone Controller if needed
    try {
      const backboneHasMinter = await tokenContract.hasRole(ROLES.MINTER_ROLE, '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f');
      if (!backboneHasMinter) {
        const tx = await tokenContract.grantRole(ROLES.MINTER_ROLE, '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f', {
          gasLimit: 200000
        });
        results.mountainSharesToken.grantBackboneMinter = tx.hash;
        console.log('✅ Granted MINTER role to Backbone Controller:', tx.hash);
      } else {
        results.mountainSharesToken.grantBackboneMinter = 'already_has_role';
      }
    } catch (error) {
      results.mountainSharesToken.grantBackboneMinterError = error.message;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results: results,
        message: 'Role migration to secure wallet initiated',
        nextStep: 'Fund new wallet with ETH for gas fees'
      })
    };

  } catch (error) {
    console.error('❌ Role migration failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Role migration failed',
        details: error.message
      })
    };
  }
};
