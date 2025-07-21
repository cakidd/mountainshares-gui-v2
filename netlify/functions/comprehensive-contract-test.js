const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Your exact MountainShares contract addresses from the analysis
const CONTRACTS = {
  COMMONS_BRIDGE: '0x4959773c4D1B49c417C0e3965e990013Cc9138f0',
  STRIPE_GATEWAY: '0x7228BA9E8179fF04d1DacD8Bb3D1a62391360D11',
  USDC_SETTLEMENT_TREASURY: '0x5574A3EcCFd6e9Af35F0B204f148D021be5b9C95',
  STABLECOIN_DISTRIBUTOR: '0x57fC62371582F9Ba976887658fd44AE86fa0298a',
  USDC_SETTLEMENT_PROCESSOR: '0x1F0c8a4c920E1094f85b18F681dcfB2e2b7DE076',
  MOUNTAINSHARES_TOKEN: '0xE8A9c6fFE6b2344147D886EcB8608C5F7863B20D',
  CENTRAL_COMMAND: '0x7F246dD285E7c53190b5Ae927a3a581393F9a521',
  BACKBONE_CONTROLLER: '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f',
  USDC_TOKEN: '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
};

// 5-way USDC distribution recipients from your contract analysis
const FEE_RECIPIENTS = {
  PRIMARY: '0xde75f5168e33db23fa5601b5fc88545be7b287a4',    // 30%
  H4H_TREASURY: '0x2b686a6c1c4b40ffc748b56b6c7a06c49e361167',  // 30%
  COMMUNITY: '0xf8c739a101e53f6fe4e24df768be833ceecefa84',    // 15%
  DEVELOPMENT: '0xd8bb25076e61b5a382e17171b48d8e0952b5b4f3',  // 15%
  GOVERNANCE: '0x8c09e686bdfd283bdf5f6fffc780e62a695014f3'     // 10%
};

// Contract ABIs for testing
const ABIS = {
  ERC20: ['function balanceOf(address) view returns (uint256)', 'function totalSupply() view returns (uint256)'],
  ACCESS_CONTROL: ['function hasRole(bytes32 role, address account) view returns (bool)'],
  MINTING: ['function mint(address to, uint256 amount)', 'function coordinateTokenMint(address recipient, uint256 amount, string reason)'],
  SETTLEMENT: ['function unknown668d3306(uint256 amount, address recipient)']
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🧪 COMPREHENSIVE MOUNTAINSHARES CONTRACT TEST');
    console.log('📍 Testing all contracts on Arbitrum mainnet...');

    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const results = {
      networkStatus: {},
      contractAccessibility: {},
      balanceChecks: {},
      roleVerification: {},
      feeDistributionTest: {},
      mintingCapabilities: {},
      timestamp: new Date().toISOString()
    };

    // Test 1: Network Connection & Block Status
    console.log('🌐 Testing Arbitrum network connection...');
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const gasPrice = await provider.getFeeData();

    results.networkStatus = {
      connected: network.chainId.toString() === '42161',
      chainId: network.chainId.toString(),
      chainName: network.name,
      blockNumber: blockNumber,
      gasPrice: gasPrice.gasPrice?.toString() || 'N/A',
      maxFeePerGas: gasPrice.maxFeePerGas?.toString() || 'N/A'
    };

    console.log(`✅ Network: ${results.networkStatus.chainName} (${results.networkStatus.chainId})`);
    console.log(`📦 Block: ${results.networkStatus.blockNumber}`);

    // Test 2: Contract Accessibility
    console.log('📋 Testing contract accessibility...');
    for (const [name, address] of Object.entries(CONTRACTS)) {
      try {
        const code = await provider.getCode(address);
        results.contractAccessibility[name] = {
          address: address,
          deployed: code !== '0x',
          codeSize: code.length
        };
        console.log(`${results.contractAccessibility[name].deployed ? '✅' : '❌'} ${name}: ${address}`);
      } catch (error) {
        results.contractAccessibility[name] = { 
          address: address, 
          deployed: false, 
          error: error.message 
        };
        console.log(`❌ ${name}: ERROR - ${error.message}`);
      }
    }

    // Test 3: USDC Balance Checks
    console.log('💰 Testing USDC balances...');
    try {
      const usdcContract = new ethers.Contract(CONTRACTS.USDC_TOKEN, ABIS.ERC20, provider);
      
      // Check settlement treasury balance
      const treasuryBalance = await usdcContract.balanceOf(CONTRACTS.USDC_SETTLEMENT_TREASURY);
      results.balanceChecks.settlementTreasury = {
        address: CONTRACTS.USDC_SETTLEMENT_TREASURY,
        balance: ethers.formatUnits(treasuryBalance, 6),
        balanceWei: treasuryBalance.toString()
      };

      // Check fee recipient balances
      for (const [name, address] of Object.entries(FEE_RECIPIENTS)) {
        const balance = await usdcContract.balanceOf(address);
        results.balanceChecks[`feeRecipient_${name}`] = {
          address: address,
          balance: ethers.formatUnits(balance, 6),
          balanceWei: balance.toString()
        };
        console.log(`💰 ${name}: ${ethers.formatUnits(balance, 6)} USDC`);
      }

      // Check USDC total supply
      const totalSupply = await usdcContract.totalSupply();
      results.balanceChecks.usdcTotalSupply = ethers.formatUnits(totalSupply, 6);
      console.log(`💰 USDC Total Supply: ${results.balanceChecks.usdcTotalSupply}`);

    } catch (error) {
      results.balanceChecks.error = error.message;
      console.log('❌ USDC balance check failed:', error.message);
    }

    // Test 4: Role Verification
    console.log('🔐 Testing role permissions...');
    try {
      const backboneContract = new ethers.Contract(CONTRACTS.BACKBONE_CONTROLLER, ABIS.ACCESS_CONTROL, provider);
      const COORDINATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COORDINATOR_ROLE"));
      
      // Check if your function executor has COORDINATOR_ROLE
      const coordinatorAddress = '0xdE75F5168E33db23FA5601b5fc88545be7b287a4';
      const hasCoordinatorRole = await backboneContract.hasRole(COORDINATOR_ROLE, coordinatorAddress);
      
      results.roleVerification = {
        coordinatorAddress: coordinatorAddress,
        hasCoordinatorRole: hasCoordinatorRole,
        coordinatorRoleHash: COORDINATOR_ROLE
      };

      console.log(`🔐 COORDINATOR_ROLE for ${coordinatorAddress}: ${hasCoordinatorRole ? '✅ GRANTED' : '❌ NOT GRANTED'}`);

    } catch (error) {
      results.roleVerification.error = error.message;
      console.log('❌ Role verification failed:', error.message);
    }

    // Test 5: MountainShares Token Status
    console.log('🪙 Testing MountainShares token contract...');
    try {
      const msContract = new ethers.Contract(CONTRACTS.MOUNTAINSHARES_TOKEN, ABIS.ERC20, provider);
      const totalSupply = await msContract.totalSupply();
      
      results.tokenStatus = {
        contract: CONTRACTS.MOUNTAINSHARES_TOKEN,
        totalSupply: ethers.formatUnits(totalSupply, 18),
        totalSupplyWei: totalSupply.toString()
      };

      console.log(`🪙 MountainShares Total Supply: ${results.tokenStatus.totalSupply} MS`);

    } catch (error) {
      results.tokenStatus = { error: error.message };
      console.log('❌ Token status check failed:', error.message);
    }

    // Test 6: Simulate Purchase Flow
    console.log('🔄 Testing purchase flow simulation...');
    const purchaseSimulation = {
      customerPayment: 10.92,
      stripeProcessingFee: 0.59,
      netForUSDC: 10.33,
      expectedUSDCDistribution: {
        primary: (10.33 * 0.30).toFixed(2),
        h4hTreasury: (10.33 * 0.30).toFixed(2),
        community: (10.33 * 0.15).toFixed(2),
        development: (10.33 * 0.15).toFixed(2),
        governance: (10.33 * 0.10).toFixed(2)
      },
      msTokensToMint: 10,
      contractCallSequence: [
        'Stripe processes $10.92 USD',
        'Webhook triggers settlement processor',
        'USDC Settlement Processor (0x1F0c...076) executes unknown668d3306',
        'StableCoin Distributor (0x57fC...98a) performs 5-way split',
        'Backbone Controller (0x746d...67f) executes coordinateTokenMint',
        '10 MS tokens minted to customer wallet'
      ]
    };

    results.purchaseFlowSimulation = purchaseSimulation;

    console.log('🔄 Purchase Flow Test:');
    console.log(`💳 Customer pays: $${purchaseSimulation.customerPayment}`);
    console.log(`⚡ Net for USDC: $${purchaseSimulation.netForUSDC}`);
    console.log(`🪙 MS tokens to mint: ${purchaseSimulation.msTokensToMint}`);

    // Final Assessment
    const allContractsAccessible = Object.values(results.contractAccessibility).every(c => c.deployed);
    const networkCorrect = results.networkStatus.connected;
    const rolesConfigured = results.roleVerification.hasCoordinatorRole;

    results.finalAssessment = {
      allContractsAccessible: allContractsAccessible,
      networkCorrect: networkCorrect,
      rolesConfigured: rolesConfigured,
      readyForProduction: allContractsAccessible && networkCorrect && rolesConfigured,
      confidence: allContractsAccessible && networkCorrect && rolesConfigured ? 'HIGH' : 'MEDIUM'
    };

    console.log('🏁 FINAL ASSESSMENT:');
    console.log(`📋 All Contracts Accessible: ${allContractsAccessible ? '✅' : '❌'}`);
    console.log(`🌐 Network Correct: ${networkCorrect ? '✅' : '❌'}`);
    console.log(`🔐 Roles Configured: ${rolesConfigured ? '✅' : '❌'}`);
    console.log(`🚀 Ready for Production: ${results.finalAssessment.readyForProduction ? '✅' : '❌'}`);
    console.log(`📊 Confidence Level: ${results.finalAssessment.confidence}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Comprehensive MountainShares contract test completed',
        results: results,
        productionReady: results.finalAssessment.readyForProduction
      })
    };

  } catch (error) {
    console.error('🚨 Comprehensive test failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Comprehensive contract test failed',
        details: error.message
      })
    };
  }
};
