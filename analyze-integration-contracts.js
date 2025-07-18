// analyze-integration-contracts.js
// Analyze bytecode and function signatures for integration contracts

require('dotenv').config();
const { ethers } = require('ethers');

async function analyzeIntegrationContracts() {
  console.log('🔍 ANALYZING INTEGRATION CONTRACTS');
  console.log('==================================');
  
  const contracts = [
    { 
      name: 'Gift Card Manager', 
      address: '0xE16888bf994a8668516aCfF46C44e955B07346B3',
      purpose: 'Gift card purchases, redemptions, balance management'
    },
    { 
      name: 'KYC Contract', 
      address: '0x8CFF221E2e6327560E2a6EeE3CD552fe26402bd2',
      purpose: 'Customer verification, compliance checking'
    },
    { 
      name: 'Volunteer Manager', 
      address: '0x80350328FB9B2Da92897da19c28C0aC4FA325949',
      purpose: 'Volunteer hours tracking, reward distribution'
    },
    { 
      name: 'Heritage Revenue', 
      address: '0xF19775116821dc36975F3C3A625B53e7F68ab1E6',
      purpose: 'Cultural/heritage project funding'
    },
    { 
      name: 'Backbone Controller', 
      address: '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f',
      purpose: 'Central system orchestration'
    },
    { 
      name: 'Merkle Tree', 
      address: '0xb663DCB090E83BD625E42C613A8f3aE432C6f2B5',
      purpose: 'Whitelist/airdrop management'
    }
  ];

  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
  
  // Common function signatures to check for
  const commonFunctions = [
    { sig: '0x8da5cb5b', name: 'owner()' },
    { sig: '0xa9059cbb', name: 'transfer(address,uint256)' },
    { sig: '0x40c10f19', name: 'mint(address,uint256)' },
    { sig: '0x23b872dd', name: 'transferFrom(address,address,uint256)' },
    { sig: '0x095ea7b3', name: 'approve(address,uint256)' },
    { sig: '0x70a08231', name: 'balanceOf(address)' },
    { sig: '0x18160ddd', name: 'totalSupply()' },
    { sig: '0x06fdde03', name: 'name()' },
    { sig: '0x95d89b41', name: 'symbol()' },
    { sig: '0x313ce567', name: 'decimals()' },
    
    // Custom functions that might exist
    { sig: '0x5c975abb', name: 'paused()' },
    { sig: '0x8456cb59', name: 'pause()' },
    { sig: '0x3f4ba83a', name: 'unpause()' },
    { sig: '0xf2fde38b', name: 'transferOwnership(address)' },
    { sig: '0x91d14854', name: 'hasRole(bytes32,address)' },
    { sig: '0x2f2ff15d', name: 'grantRole(bytes32,address)' },
    
    // Gift card specific
    { sig: '0x945bdc1b', name: 'purchaseGiftCard(uint256)' },
    { sig: '0x84a7e65f', name: 'redeemGiftCard(bytes32)' },
    { sig: '0x1e83409a', name: 'getCardBalance(bytes32)' },
    
    // KYC specific
    { sig: '0x6352211e', name: 'ownerOf(uint256)' },
    { sig: '0xc87b56dd', name: 'tokenURI(uint256)' },
    { sig: '0x42842e0e', name: 'safeTransferFrom(address,address,uint256)' },
    { sig: '0x2131c68c', name: 'verifyCustomer(address)' },
    { sig: '0x8129fc1c', name: 'isVerified(address)' },
    
    // Volunteer specific
    { sig: '0x3ccfd60b', name: 'withdraw()' },
    { sig: '0x51cff8d9', name: 'stake(uint256)' },
    { sig: '0x2e1a7d4d', name: 'withdraw(uint256)' },
    { sig: '0x8b876347', name: 'earned(address)' },
    
    // Heritage/Revenue specific
    { sig: '0x3a98ef39', name: 'distributeFunds()' },
    { sig: '0x6a627842', name: 'mint(address)' },
    
    // Merkle tree specific
    { sig: '0x2eb4a7ab', name: 'verify(bytes32[],bytes32,bytes32)' },
    { sig: '0x7c15852c', name: 'claim(uint256,bytes32[])' }
  ];

  for (const contract of contracts) {
    console.log(`\n📋 ${contract.name}`);
    console.log(`📍 ${contract.address}`);
    console.log(`🎯 Purpose: ${contract.purpose}`);
    
    try {
      // Check if contract exists
      const code = await provider.getCode(contract.address);
      if (code === '0x') {
        console.log('❌ Contract not found');
        continue;
      }
      
      console.log(`✅ Contract exists (${code.length} bytes)`);
      
      // Check for function signatures
      console.log('🔍 Function Analysis:');
      let foundFunctions = [];
      
      for (const func of commonFunctions) {
        try {
          const result = await provider.call({
            to: contract.address,
            data: func.sig
          });
          
          if (result !== '0x') {
            foundFunctions.push(func.name);
            
            // Try to decode common return types
            if (func.name.includes('owner') || func.name.includes('address')) {
              try {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['address'], result);
                console.log(`   ✅ ${func.name}: ${decoded[0]}`);
              } catch (e) {
                console.log(`   ✅ ${func.name}: ${result}`);
              }
            } else if (func.name.includes('balance') || func.name.includes('supply')) {
              try {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], result);
                console.log(`   ✅ ${func.name}: ${decoded[0].toString()}`);
              } catch (e) {
                console.log(`   ✅ ${func.name}: ${result}`);
              }
            } else if (func.name.includes('name') || func.name.includes('symbol')) {
              try {
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string'], result);
                console.log(`   ✅ ${func.name}: "${decoded[0]}"`);
              } catch (e) {
                console.log(`   ✅ ${func.name}: ${result}`);
              }
            } else {
              console.log(`   ✅ ${func.name}: Found`);
            }
          }
        } catch (error) {
          // Function doesn't exist or failed
        }
      }
      
      if (foundFunctions.length === 0) {
        console.log('   📋 No standard functions found');
      }
      
      // Check if owned by compromised wallet
      const compromisedWallet = '0xdE75F5168E33db23FA5601b5fc88545be7b287a4';
      const secureWallet = '0xBf1bD0A0DA1B64Ec6128B91a39AD8a0c88B83330';
      
      if (foundFunctions.includes('owner()')) {
        try {
          const ownerResult = await provider.call({
            to: contract.address,
            data: '0x8da5cb5b'
          });
          const owner = ethers.AbiCoder.defaultAbiCoder().decode(['address'], ownerResult)[0];
          
          if (owner.toLowerCase() === compromisedWallet.toLowerCase()) {
            console.log('🚨 WARNING: Contract owned by COMPROMISED wallet!');
          } else if (owner.toLowerCase() === secureWallet.toLowerCase()) {
            console.log('✅ Contract owned by SECURE wallet');
          } else {
            console.log(`⚠️  Contract owned by: ${owner}`);
          }
        } catch (e) {
          // Could not determine owner
        }
      }
      
      // Search for compromised address in bytecode
      const compromisedHex = compromisedWallet.slice(2).toLowerCase();
      if (code.toLowerCase().includes(compromisedHex)) {
        console.log('🚨 WARNING: Compromised address found in bytecode!');
      }
      
    } catch (error) {
      console.log(`❌ Error analyzing contract: ${error.message}`);
    }
  }
  
  console.log('\n🎯 INTEGRATION ANALYSIS COMPLETE');
  console.log('================================');
  console.log('Use this information to determine:');
  console.log('1. Which contracts are safe to integrate with');
  console.log('2. What functions are available for webhook calls');
  console.log('3. Which contracts need to be recreated');
}

analyzeIntegrationContracts().catch(console.error);
