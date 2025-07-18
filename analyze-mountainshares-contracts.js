// analyze-mountainshares-contracts.js
// Deep dive into MountainShares contracts to extract current system state

require('dotenv').config();
const { ethers } = require('ethers');

async function analyzeMountainSharesContracts() {
  console.log('🔍 DEEP DIVE: MOUNTAINSHARES CONTRACT ANALYSIS');
  console.log('============================================');
  
  const contractsToAnalyze = [
    {
      name: 'MountainShares Phase 1',
      address: process.env.MOUNTAINSHARES_PHASE1_ADDRESS,
      purpose: 'Original Phase 1 contract - might contain PMS count'
    },
    {
      name: 'MountainShares Token (Primary)',
      address: process.env.MOUNTAINSHARES_TOKEN,
      purpose: 'Main token contract - current supply and mechanics'
    },
    {
      name: 'MountainShares Token (Merkle Tree)',
      address: process.env.MERKLE_TREE_ADDRESS,
      purpose: 'Alternative token contract - compare functionality'
    },
    {
      name: 'MS Token Customer Purchase',
      address: process.env.MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS,
      purpose: 'Purchase mechanism - tracks total purchases'
    },
    {
      name: 'MockV3 Aggregator',
      address: process.env.MOCKV3_AGGREGATOR_ADDRESS,
      purpose: 'Price aggregator - might track PMS/EMS data'
    },
    {
      name: 'Secondary Token',
      address: process.env.SECONDARY_TOKEN_ADDRESS,
      purpose: 'Secondary token system'
    }
  ];

  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
  
  // Extended function signatures for MountainShares analysis
  const mountainSharesFunctions = [
    // Standard ERC20
    { sig: '0x18160ddd', name: 'totalSupply()' },
    { sig: '0x70a08231', name: 'balanceOf(address)' },
    { sig: '0x06fdde03', name: 'name()' },
    { sig: '0x95d89b41', name: 'symbol()' },
    { sig: '0x313ce567', name: 'decimals()' },
    
    // Ownership and control
    { sig: '0x8da5cb5b', name: 'owner()' },
    { sig: '0xf2fde38b', name: 'transferOwnership(address)' },
    
    // Minting/burning
    { sig: '0x40c10f19', name: 'mint(address,uint256)' },
    { sig: '0x42966c68', name: 'burn(uint256)' },
    { sig: '0x79cc6790', name: 'burnFrom(address,uint256)' },
    
    // Custom MountainShares functions (guessing common patterns)
    { sig: '0x1a686502', name: 'totalPurchased()' },
    { sig: '0x9dc29fac', name: 'purchasedAmount()' },
    { sig: '0x3950935f', name: 'totalEarned()' },
    { sig: '0x8b876347', name: 'earned(address)' },
    { sig: '0x4f64b2be', name: 'purchased(address)' },
    { sig: '0x54fd4d50', name: 'version()' },
    { sig: '0x630afb8c', name: 'purchaseHistory(address)' },
    { sig: '0x2f54bf6e', name: 'isActive()' },
    { sig: '0x47e7ef24', name: 'phase()' },
    { sig: '0x158ef93e', name: 'nextPhase()' },
    
    // Aggregator functions
    { sig: '0x50d25bcd', name: 'latestAnswer()' },
    { sig: '0x8205bf6a', name: 'latestTimestamp()' },
    { sig: '0x9a6fc8f5', name: 'getRoundData(uint80)' },
    { sig: '0xfeaf968c', name: 'latestRoundData()' },
    
    // Purchase contract functions
    { sig: '0xd96a094a', name: 'purchase(uint256)' },
    { sig: '0xa8b89614', name: 'purchaseWithUSDC(uint256)' },
    { sig: '0x4725020', name: 'setPrice(uint256)' },
    { sig: '0xa035b1fe', name: 'price()' },
    { sig: '0x372500ab', name: 'minimumPurchase()' },
    
    // Vault/staking functions
    { sig: '0x2e1a7d4d', name: 'withdraw(uint256)' },
    { sig: '0x3ccfd60b', name: 'withdraw()' },
    { sig: '0xa694fc3a', name: 'stake(uint256)' },
    { sig: '0x51cff8d9', name: 'stake()' },
    { sig: '0x8dbdbe6d', name: 'reward()' },
    { sig: '0x3d18b912', name: 'claimReward()' }
  ];

  for (const contract of contractsToAnalyze) {
    if (!contract.address) {
      console.log(`\n❌ ${contract.name}: No address in environment`);
      continue;
    }
    
    console.log(`\n📋 ${contract.name}`);
    console.log(`📍 ${contract.address}`);
    console.log(`🎯 ${contract.purpose}`);
    
    try {
      // Check if contract exists
      const code = await provider.getCode(contract.address);
      if (code === '0x') {
        console.log('❌ Contract not found');
        continue;
      }
      
      console.log(`✅ Contract exists (${code.length} bytes)`);
      
      // Analyze functions and extract data
      console.log('🔍 Function Analysis:');
      let contractData = {};
      
      for (const func of mountainSharesFunctions) {
        try {
          const result = await provider.call({
            to: contract.address,
            data: func.sig
          });
          
          if (result !== '0x') {
            // Try to decode based on function name patterns
            try {
              if (func.name.includes('Supply') || func.name.includes('Amount') || 
                  func.name.includes('Purchased') || func.name.includes('Earned') ||
                  func.name.includes('Answer') || func.name.includes('price')) {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], result);
                const value = decoded[0].toString();
                console.log(`   ✅ ${func.name}: ${value} (${ethers.formatEther(value)} if 18 decimals)`);
                contractData[func.name] = value;
              } else if (func.name.includes('name') || func.name.includes('symbol') || 
                        func.name.includes('version')) {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string'], result);
                console.log(`   ✅ ${func.name}: "${decoded[0]}"`);
                contractData[func.name] = decoded[0];
              } else if (func.name.includes('owner') || func.name.includes('address')) {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['address'], result);
                console.log(`   ✅ ${func.name}: ${decoded[0]}`);
                contractData[func.name] = decoded[0];
                
                // Check if owned by compromised wallet
                const compromised = '0xdE75F5168E33db23FA5601b5fc88545be7b287a4';
                const secure = '0xBf1bD0A0DA1B64Ec6128B91a39AD8a0c88B83330';
                
                if (decoded[0].toLowerCase() === compromised.toLowerCase()) {
                  console.log('     🚨 OWNED BY COMPROMISED WALLET!');
                } else if (decoded[0].toLowerCase() === secure.toLowerCase()) {
                  console.log('     ✅ Owned by secure wallet');
                }
              } else if (func.name.includes('decimals')) {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint8'], result);
                console.log(`   ✅ ${func.name}: ${decoded[0]}`);
                contractData[func.name] = decoded[0];
              } else if (func.name.includes('isActive') || func.name.includes('paused')) {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['bool'], result);
                console.log(`   ✅ ${func.name}: ${decoded[0]}`);
                contractData[func.name] = decoded[0];
              } else {
                console.log(`   ✅ ${func.name}: Found (${result.slice(0, 20)}...)`);
              }
            } catch (decodeError) {
              console.log(`   ✅ ${func.name}: Found (decode failed)`);
            }
          }
        } catch (error) {
          // Function doesn't exist
        }
      }
      
      // Special analysis for this contract
      if (contractData['totalSupply()']) {
        const supply = contractData['totalSupply()'];
        console.log(`\n📊 SUPPLY ANALYSIS:`);
        console.log(`   Total Supply: ${supply} wei`);
        console.log(`   As 18-decimal tokens: ${ethers.formatEther(supply)}`);
        console.log(`   As 6-decimal tokens: ${ethers.formatUnits(supply, 6)}`);
      }
      
      // Check for compromised address in bytecode
      const compromisedHex = '0xdE75F5168E33db23FA5601b5fc88545be7b287a4'.slice(2).toLowerCase();
      if (code.toLowerCase().includes(compromisedHex)) {
        console.log('🚨 WARNING: Compromised address found in bytecode!');
      }
      
    } catch (error) {
      console.log(`❌ Error analyzing: ${error.message}`);
    }
  }
  
  console.log('\n🎯 ANALYSIS SUMMARY');
  console.log('==================');
  console.log('Use this data to determine:');
  console.log('1. Current PMS (Purchased MountainShares) count');
  console.log('2. Current EMS (Earned MountainShares) count');
  console.log('3. Phase 2 trigger threshold: (PMS + EMS) × 125');
  console.log('4. Which contracts are safe vs compromised');
  console.log('5. Current token supply and distribution');
}

analyzeMountainSharesContracts().catch(console.error);
