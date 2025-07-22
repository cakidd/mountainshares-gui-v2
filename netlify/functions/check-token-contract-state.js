const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// ERC721 ABI for checking contract state
const ERC721_ABI = [
  'function paused() view returns (bool)',
  'function totalSupply() view returns (uint256)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function owner() view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)'
];

// Role hash for MINTER_ROLE from your contract analysis
const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

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
    const { 
      tokenContract, 
      checkPaused = false, 
      checkSupply = false, 
      checkMinterRole = false,
      addressToCheck = null 
    } = JSON.parse(event.body || '{}');

    if (!tokenContract) {
      throw new Error('tokenContract address is required');
    }

    console.log('🔍 Checking MountainShares token contract state:', tokenContract);
    
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const contract = new ethers.Contract(tokenContract, ERC721_ABI, provider);

    const result = {
      tokenContract: tokenContract,
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // Check basic contract information
    try {
      result.name = await contract.name();
      result.symbol = await contract.symbol();
      console.log('📋 Contract info:', result.name, result.symbol);
    } catch (error) {
      result.basicInfoError = error.message;
      console.log('⚠️ Could not get basic contract info:', error.message);
    }

    // Check if contract is paused
    if (checkPaused) {
      try {
        result.checks.paused = await contract.paused();
        console.log('⏸️ Contract paused:', result.checks.paused);
      } catch (error) {
        result.checks.paused = `Function paused() not supported: ${error.message}`;
        console.log('ℹ️ Pause check failed:', error.message);
      }
    }

    // Check total supply
    if (checkSupply) {
      try {
        const supply = await contract.totalSupply();
        result.checks.totalSupply = supply.toString();
        console.log('📊 Total supply:', result.checks.totalSupply);
      } catch (error) {
        result.checks.totalSupply = `Function totalSupply() not supported: ${error.message}`;
        console.log('ℹ️ Supply check failed:', error.message);
      }
    }

    // Check minter role permissions
    if (checkMinterRole) {
      const checkAddress = addressToCheck || process.env.MINTING_PRIVATE_KEY ? 
        new ethers.Wallet(process.env.MINTING_PRIVATE_KEY).address : null;
        
      if (checkAddress) {
        try {
          const hasMinterRole = await contract.hasRole(MINTER_ROLE, checkAddress);
          const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, checkAddress);
          
          result.checks.minterRoleCheck = {
            address: checkAddress,
            hasMinterRole: hasMinterRole,
            hasAdminRole: hasAdminRole,
            canMint: hasMinterRole || hasAdminRole
          };
          
          console.log('🔑 Minter role check:', result.checks.minterRoleCheck);
        } catch (error) {
          result.checks.minterRoleCheck = `Role check failed: ${error.message}`;
          console.log('ℹ️ Role check failed:', error.message);
        }
      } else {
        result.checks.minterRoleCheck = 'No address provided for role check';
      }
    }

    // Check owner information
    try {
      result.owner = await contract.owner();
      console.log('👤 Contract owner:', result.owner);
    } catch (error) {
      result.ownerError = error.message;
      console.log('ℹ️ Owner check failed:', error.message);
    }

    // Check if Backbone Controller can interact with token contract
    if (process.env.BACKBONE_CONTROLLER) {
      try {
        const backboneHasMinterRole = await contract.hasRole(MINTER_ROLE, process.env.BACKBONE_CONTROLLER);
        const backboneHasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, process.env.BACKBONE_CONTROLLER);
        
        result.backbonePermissions = {
          backboneAddress: process.env.BACKBONE_CONTROLLER,
          hasMinterRole: backboneHasMinterRole,
          hasAdminRole: backboneHasAdminRole,
          canMintTokens: backboneHasMinterRole || backboneHasAdminRole
        };
        
        console.log('🎯 Backbone Controller permissions:', result.backbonePermissions);
      } catch (error) {
        result.backbonePermissions = `Backbone permission check failed: ${error.message}`;
      }
    }

    // Serialize any BigInt values
    const serializedResult = serializeBigInt(result);

    console.log('✅ Token contract state check completed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        result: serializedResult,
        analysis: analyzeResults(serializedResult),
        message: 'MountainShares token contract state check completed'
      })
    };

  } catch (error) {
    console.error('❌ Token contract state check failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Token contract state check failed',
        details: error.message
      })
    };
  }
};

function analyzeResults(result) {
  const issues = [];
  const recommendations = [];

  // Check for paused state
  if (result.checks.paused === true) {
    issues.push('Contract is paused - token transfers and minting are disabled');
    recommendations.push('Unpause the contract to allow token operations');
  }

  // Check for permission issues
  if (result.checks.minterRoleCheck && !result.checks.minterRoleCheck.canMint) {
    issues.push('Minting wallet lacks required permissions (MINTER_ROLE or ADMIN_ROLE)');
    recommendations.push('Grant MINTER_ROLE to the minting wallet address');
  }

  if (result.backbonePermissions && !result.backbonePermissions.canMintTokens) {
    issues.push('Backbone Controller cannot mint tokens - lacks required permissions');
    recommendations.push('Grant MINTER_ROLE to the Backbone Controller contract');
  }

  return {
    issuesFound: issues.length,
    issues: issues,
    recommendations: recommendations,
    status: issues.length === 0 ? 'NO_ISSUES_DETECTED' : 'ISSUES_REQUIRE_ATTENTION'
  };
}
