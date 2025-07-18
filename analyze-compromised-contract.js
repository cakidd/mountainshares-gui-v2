require('dotenv').config();
const { ethers } = require('ethers');

async function analyzeContract() {
  console.log('🔍 ANALYZING COMPROMISED H4H FEE DISTRIBUTION CONTRACT');
  console.log('===================================================');
  
  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
  const contractAddress = '0x5aed93B8B60674d2Cd993E610d5df5C21c71f863';
  
  // Try various common function signatures
  const testFunctions = [
    { name: 'owner()', sig: '0x8da5cb5b' },
    { name: 'getOwner()', sig: '0x893d20e8' }, 
    { name: 'admin()', sig: '0xf851a440' },
    { name: 'hasRole(bytes32,address)', sig: '0x91d14854' },
    { name: 'withdraw()', sig: '0x3ccfd60b' },
    { name: 'emergencyWithdraw()', sig: '0xdb2e21bc' },
    { name: 'pause()', sig: '0x8456cb59' },
    { name: 'distributeFees()', sig: '0x6029bf9f' },
    { name: 'triggerDistribution()', sig: '0x591e9ee9' }
  ];
  
  const wallet = new ethers.Wallet(process.env.WEBHOOK_SIGNER_PRIVATE_KEY, provider);
  
  console.log('🧪 Testing available functions:');
  
  for (const func of testFunctions) {
    try {
      const result = await provider.call({
        to: contractAddress,
        data: func.sig
      });
      
      if (result !== '0x') {
        console.log(`✅ ${func.name}: ${result}`);
        
        // Decode owner-like functions
        if (func.name.includes('owner') || func.name.includes('admin')) {
          try {
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['address'], result);
            console.log(`   📍 Address: ${decoded[0]}`);
          } catch (e) {
            console.log(`   📊 Raw: ${result}`);
          }
        }
      }
    } catch (error) {
      // Function doesn't exist or failed
    }
  }
  
  console.log('\n🚨 DANGER ANALYSIS:');
  console.log('==================');
  console.log('💰 Contract Balance: 0.000390005746229336 ETH');
  console.log('🔥 Hardcoded Payments To: 0xdE75F5168E33db23FA5601b5fc88545be7b287a4');
  console.log('⚠️  Anyone can potentially trigger fee distribution');
  console.log('💀 This will send funds directly to thieves');
  
  console.log('\n🎯 RECOMMENDATION:');
  console.log('==================');
  console.log('❌ NEVER interact with this contract again');
  console.log('❌ Remove from all systems immediately');
  console.log('❌ Deploy new fee distribution contract');
  console.log('💀 Consider this $1.08 as lost to thieves');
}

analyzeContract().catch(console.error);
