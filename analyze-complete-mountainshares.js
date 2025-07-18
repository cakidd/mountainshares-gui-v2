// analyze-complete-mountainshares.js
// Complete analysis with all environment addresses

require('dotenv').config();
const { ethers } = require('ethers');

async function analyzeCompleteMountainShares() {
  console.log('🔍 COMPLETE MOUNTAINSHARES SYSTEM ANALYSIS');
  console.log('=========================================');
  
  const allContracts = [
    {
      name: 'MountainShares Phase 1',
      address: process.env.MOUNTAINSHARES_PHASE1_ADDRESS, // 0xBdc5936fE0A59A5f8f5d686A9CbFDF83eA9BE1fA
      purpose: 'Original Phase 1 contract - contains PMS count'
    },
    {
      name: 'MountainShares Token (Primary)',
      address: process.env.MOUNTAINSHARES_TOKEN, // 0xE8A9c6fFE6b2344147D886EcB8608C5F7863B20D
      purpose: 'Main token contract'
    },
    {
      name: 'Merkle Tree / Secondary MS Token',
      address: process.env.MERKLE_TREE_ADDRESS, // 0xb663DCB090E83BD625E42C613A8f3aE432C6f2B5
      purpose: 'Secondary token system'
    },
    {
      name: 'MS Token Customer Purchase',
      address: process.env.MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS, // 0x2a36e8775EbfaAb18E25Df81EF6Eab05E026f400
      purpose: 'Purchase tracking system'
    },
    {
      name: 'Secondary Token',
      address: process.env.SECONDARY_TOKEN_ADDRESS, // 0xb3dC07c05749dB59451028ad8ca7e1d50BF37b1B
      purpose: 'Alternative token system'
    },
    {
      name: 'H4H EarnedMS Vault',
      address: process.env.H4H_EARNEDMS_VAULT_ADDRESS, // 0x95e4c1b6aad37e610742254114216ceaf0f49acd
      purpose: 'EMS vault system - critical for volunteer rewards'
    }
  ];

  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
  
  // Extended function signatures
  const functions = [
    // Standard ERC20
    { sig: '0x18160ddd', name: 'totalSupply()' },
    { sig: '0x70a08231', name: 'balanceOf(address)' },
    { sig: '0x06fdde03', name: 'name()' },
    { sig: '0x95d89b41', name: 'symbol()' },
    { sig: '0x313ce567', name: 'decimals()' },
    { sig: '0x8da5cb5b', name: 'owner()' },
    
    // Custom MountainShares functions
    { sig: '0x1a686502', name: 'totalPurchased()' },
    { sig: '0x9dc29fac', name: 'totalPurchasedAmount()' },
    { sig: '0x3950935f', name: 'totalEarned()' },
    { sig: '0x8b876347', name: 'earned(address)' },
    { sig: '0x4f64b2be', name: 'purchased(address)' },
    { sig: '0x630afb8c', name: 'purchaseCount()' },
    { sig: '0x2f54bf6e', name: 'isActive()' },
    { sig: '0x47e7ef24', name: 'currentPhase()' },
    { sig: '0xa035b1fe', name: 'price()' },
    { sig: '0x372500ab', name: 'minimumPurchase()' },
    
    // Vault functions
    { sig: '0x2e1a7d4d', name: 'withdraw(uint256)' },
    { sig: '0x3ccfd60b', name: 'withdraw()' },
    { sig: '0xa694fc3a', name: 'stake(uint256)' },
    { sig: '0x8dbdbe6d', name: 'getReward()' },
    
    // Purchase tracking
    { sig: '0xd96a094a', name: 'purchase(uint256)' },
    { sig: '0xa8b89614', name: 'purchaseWithUSDC(uint256)' },
    { sig: '0x83197ef0', name: 'purchaseHistory(address)' },
    { sig: '0x4725020', name: 'setPrice(uint256)' }
  ];

  let systemData = {
    totalPMS: 0,
    totalEMS: 0,
    totalSupply: 0,
    treasuryBalance: 0,
    phase: 'Unknown'
  };

  for (const contract of allContracts) {
    console.log(`\n📋 ${contract.name}`);
    console.log(`📍 ${contract.address}`);
    console.log(`🎯 ${contract.purpose}`);
    
    try {
      const code = await provider.getCode(contract.address);
      if (code === '0x') {
        console.log('❌ Contract not found');
        continue;
      }
      
      console.log(`✅ Contract exists (${code.length} bytes)`);
      
      let contractData = {};
      
      for (const func of functions) {
        try {
          const result = await provider.call({
            to: contract.address,
            data: func.sig
          });
          
          if (result !== '0x') {
            try {
              if (func.name.includes('Supply') || func.name.includes('Purchased') || 
                  func.name.includes('Earned') || func.name.includes('Count') ||
                  func.name.includes('price') || func.name.includes('minimum')) {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], result);
                const value = decoded[0].toString();
                console.log(`   ✅ ${func.name}: ${value} (${ethers.formatEther(value)} tokens)`);
                contractData[func.name] = value;
                
                // Aggregate system data
                if (func.name.includes('totalPurchased')) {
                  systemData.totalPMS = Math.max(systemData.totalPMS, parseInt(ethers.formatEther(value)));
                }
                if (func.name.includes('totalEarned')) {
                  systemData.totalEMS = Math.max(systemData.totalEMS, parseInt(ethers.formatEther(value)));
                }
                if (func.name.includes('totalSupply')) {
                  systemData.totalSupply = Math.max(systemData.totalSupply, parseInt(ethers.formatEther(value)));
                }
              } else if (func.name.includes('name') || func.name.includes('symbol')) {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string'], result);
                console.log(`   ✅ ${func.name}: "${decoded[0]}"`);
                contractData[func.name] = decoded[0];
              } else if (func.name.includes('owner')) {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['address'], result);
                console.log(`   ✅ ${func.name}: ${decoded[0]}`);
                
                // Check ownership status
                const compromised = '0xdE75F5168E33db23FA5601b5fc88545be7b287a4';
                const secure = '0xBf1bD0A0DA1B64Ec6128B91a39AD8a0c88B83330';
                
                if (decoded[0].toLowerCase() === compromised.toLowerCase()) {
                  console.log('     🚨 OWNED BY COMPROMISED WALLET!');
                } else if (decoded[0].toLowerCase() === secure.toLowerCase()) {
                  console.log('     ✅ Owned by secure wallet');
                } else {
                  console.log(`     ⚠️ Owned by: ${decoded[0]}`);
                }
              } else if (func.name.includes('decimals')) {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint8'], result);
                console.log(`   ✅ ${func.name}: ${decoded[0]}`);
              } else if (func.name.includes('isActive') || func.name.includes('Phase')) {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['bool'], result);
                console.log(`   ✅ ${func.name}: ${decoded[0]}`);
              } else {
                console.log(`   ✅ ${func.name}: Found`);
              }
            } catch (decodeError) {
              console.log(`   ✅ ${func.name}: Found (decode failed)`);
            }
          }
        } catch (error) {
          // Function doesn't exist
        }
      }
      
      // Check for compromised address in bytecode
      const compromisedHex = '0xdE75F5168E33db23FA5601b5fc88545be7b287a4'.slice(2).toLowerCase();
      if (code.toLowerCase().includes(compromisedHex)) {
        console.log('🚨 WARNING: Compromised address hardcoded in bytecode!');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  // Check treasury balance
  console.log('\n💰 TREASURY ANALYSIS');
  console.log('====================');
  try {
    const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
    const usdc = new ethers.Contract('0xaf88d065e77c8cC2239327C5EDb3A432268e5831', usdcAbi, provider);
    const treasuryBalance = await usdc.balanceOf(process.env.SETTLEMENT_WALLET_ADDRESS);
    const balanceUSD = parseFloat(ethers.formatUnits(treasuryBalance, 6));
    
    console.log(`Treasury Balance: ${balanceUSD} USDC`);
    systemData.treasuryBalance = balanceUSD;
    
    // Calculate phase thresholds
    const totalMS = systemData.totalPMS + systemData.totalEMS;
    const phase2Threshold = totalMS * 125;
    const phase3Threshold = totalMS * 150;
    
    console.log(`\n📊 PHASE CALCULATION:`);
    console.log(`Total PMS: ${systemData.totalPMS}`);
    console.log(`Total EMS: ${systemData.totalEMS}`);
    console.log(`Total MS: ${totalMS}`);
    console.log(`Phase 2 Threshold: ${phase2Threshold} USDC`);
    console.log(`Phase 3 Threshold: ${phase3Threshold} USDC`);
    
    if (balanceUSD >= phase3Threshold) {
      systemData.phase = 'Phase 3 (EMS = $37.40)';
    } else if (balanceUSD >= phase2Threshold) {
      systemData.phase = 'Phase 2 (EMS = $10.00)';
    } else {
      systemData.phase = 'Phase 1 (EMS vaulted)';
    }
    
    console.log(`\n🎯 CURRENT PHASE: ${systemData.phase}`);
    
  } catch (error) {
    console.log(`❌ Treasury check failed: ${error.message}`);
  }

  console.log('\n🚀 DEPLOYMENT RECOMMENDATIONS');
  console.log('============================');
  console.log(`Deploy Volunteer Manager with:`);
  console.log(`- totalPMS: ${systemData.totalPMS || 9}`);
  console.log(`- treasuryWallet: ${process.env.SETTLEMENT_WALLET_ADDRESS}`);
  console.log(`- currentPhase: ${systemData.phase}`);
  console.log(`- owner: 0xBf1bD0A0DA1B64Ec6128B91a39AD8a0c88B83330`);
}

// FIXED: Correct function name
analyzeCompleteMountainShares().catch(console.error);
