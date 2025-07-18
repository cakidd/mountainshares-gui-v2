// check-upgrade-ability.js
// Check if your contract is upgradeable

require('dotenv').config();
const { ethers } = require('ethers');

async function checkUpgradeAbility() {
  console.log('🔍 Checking Contract Upgrade Capability');
  console.log('======================================');

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const contractAddress = process.env.MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS;

    console.log(`📋 Contract: ${contractAddress}`);

    // Check for common proxy patterns
    console.log('\n1️⃣ Checking for Proxy Patterns:');

    const proxyPatterns = [
      {
        name: 'OpenZeppelin Proxy',
        selector: '0x5c60da1b', // implementation() 
        description: 'Standard upgradeable proxy'
      },
      {
        name: 'EIP-1967 Proxy',
        slot: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
        description: 'Standard proxy storage slot'
      },
      {
        name: 'Admin Slot',
        slot: '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103',
        description: 'Proxy admin storage slot'
      }
    ];

    // Test common proxy functions
    const commonProxyABI = [
      "function implementation() view returns (address)",
      "function admin() view returns (address)",
      "function upgradeToAndCall(address,bytes) payable",
      "function upgradeTo(address)",
      "function owner() view returns (address)"
    ];

    const contract = new ethers.Contract(contractAddress, commonProxyABI, provider);

    for (const func of commonProxyABI) {
      try {
        const funcName = func.split('(')[0].replace('function ', '');
        console.log(`   🔍 Testing ${funcName}()...`);
        
        const result = await contract[funcName]();
        console.log(`   ✅ FOUND: ${funcName}() = ${result}`);
        
        if (funcName === 'implementation') {
          console.log(`   🎯 This is a PROXY contract!`);
          console.log(`   📍 Implementation: ${result}`);
        }
        
      } catch (error) {
        // Function doesn't exist - not necessarily bad
      }
    }

    // Check storage slots for proxy patterns
    console.log('\n2️⃣ Checking Proxy Storage Slots:');
    
    for (const pattern of proxyPatterns) {
      if (pattern.slot) {
        try {
          const value = await provider.getStorage(contractAddress, pattern.slot);
          if (value !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            console.log(`   ✅ FOUND: ${pattern.name}`);
            console.log(`   📍 ${pattern.description}`);
            console.log(`   📋 Value: ${value}`);
            
            // If it's an address, show it
            if (value.length === 66) {
              const address = '0x' + value.slice(-40);
              console.log(`   📍 Address: ${address}`);
            }
          }
        } catch (error) {
          // Slot read failed
        }
      }
    }

    // Check contract bytecode for proxy indicators
    console.log('\n3️⃣ Bytecode Analysis:');
    const code = await provider.getCode(contractAddress);
    
    // Look for common proxy bytecode patterns
    const proxyIndicators = [
      '363d3d373d3d3d363d73', // Minimal proxy pattern
      '6080604052', // Standard contract constructor
      'a2646970667358221220' // IPFS hash in metadata
    ];

    proxyIndicators.forEach(pattern => {
      if (code.includes(pattern)) {
        console.log(`   ✅ Found pattern: ${pattern}`);
        if (pattern === '363d3d373d3d3d363d73') {
          console.log(`   🎯 This appears to be a minimal proxy!`);
        }
      }
    });

    console.log(`   📊 Bytecode size: ${code.length} characters`);

    // Final assessment
    console.log('\n4️⃣ Upgrade Assessment:');
    
    // Check if we found any proxy indicators
    let isUpgradeable = false;
    let upgradeMethod = null;

    if (code.includes('363d3d373d3d3d363d73')) {
      isUpgradeable = true;
      upgradeMethod = 'Minimal Proxy (Clone Factory)';
    }

    console.log(`   📋 Contract Type: ${isUpgradeable ? 'Upgradeable Proxy' : 'Regular Contract'}`);
    
    if (isUpgradeable) {
      console.log(`   ✅ GOOD NEWS: Contract appears upgradeable!`);
      console.log(`   🔧 Method: ${upgradeMethod}`);
      console.log(`   💡 You can deploy new implementation`);
    } else {
      console.log(`   ❌ Contract appears to be non-upgradeable`);
      console.log(`   🔧 Solution: Deploy new contract`);
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (isUpgradeable) {
      console.log('   ✅ Upgrade existing contract:');
      console.log('   • Deploy new implementation accepting USDC');
      console.log('   • Update proxy to point to new implementation');
      console.log('   • Maintain same contract address');
    } else {
      console.log('   🚀 Deploy new contract:');
      console.log('   • Create USDC-based purchase contract');
      console.log('   • Deploy on Arbitrum using Sepolia ETH');
      console.log('   • Update environment variables');
      console.log('   • Migrate users to new contract');
    }

    return {
      isUpgradeable,
      upgradeMethod,
      contractAddress
    };

  } catch (error) {
    console.error('\n❌ Upgrade check failed:', error.message);
  }
}

// Run the check
checkUpgradeAbility();
