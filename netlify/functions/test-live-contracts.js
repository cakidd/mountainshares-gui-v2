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
    console.log('🧪 TESTING LIVE CONTRACT CALLS ON ARBITRUM');
    
    const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    const CONTRACTS = {
      USDC_SETTLEMENT: '0x5574A3EcCFd6e9Af35F0B204f148D021be5b9C95',
      MOUNTAINSHARES_TOKEN: '0xE8A9c6fFE6b2344147D886EcB8608C5F7863B20D',
      USDC_TOKEN: '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
    };
    
    const results = {
      networkConnected: false,
      contractsAccessible: {},
      usdcBalance: '0',
      blockNumber: 0,
      timestamp: new Date().toISOString()
    };
    
    // Test 1: Network connection
    const network = await provider.getNetwork();
    results.networkConnected = network.chainId.toString() === '42161';
    results.blockNumber = await provider.getBlockNumber();
    
    console.log('🌐 Network test:', results.networkConnected ? 'PASS' : 'FAIL');
    console.log('📦 Current block:', results.blockNumber);
    
    // Test 2: Contract accessibility
    for (const [name, address] of Object.entries(CONTRACTS)) {
      try {
        const code = await provider.getCode(address);
        results.contractsAccessible[name] = code !== '0x';
        console.log(`📋 ${name}:`, results.contractsAccessible[name] ? 'ACCESSIBLE' : 'NOT FOUND');
      } catch (error) {
        results.contractsAccessible[name] = false;
        console.log(`❌ ${name}:`, error.message);
      }
    }
    
    // Test 3: USDC balance check
    try {
      const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
      const usdcContract = new ethers.Contract(CONTRACTS.USDC_TOKEN, usdcAbi, provider);
      const balance = await usdcContract.balanceOf(CONTRACTS.USDC_SETTLEMENT);
      results.usdcBalance = ethers.formatUnits(balance, 6);
      console.log('💰 USDC Balance:', results.usdcBalance);
    } catch (error) {
      console.log('❌ USDC balance check failed:', error.message);
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        liveContractTest: results,
        readyForProduction: results.networkConnected && Object.values(results.contractsAccessible).every(v => v)
      })
    };

  } catch (error) {
    console.error('🚨 Live contract test failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Live contract test failed',
        details: error.message
      })
    };
  }
};
