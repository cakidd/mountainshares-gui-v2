// test-all-32-contracts.js
// Test all 32 contracts with FULL addresses

require('dotenv').config();
const { ethers } = require('ethers');

async function testAll32Contracts() {
  console.log('🧪 Testing All 32 MountainShares Contracts (Full Addresses)');
  console.log('============================================================');
  
  // All 32 contract addresses (FULL ADDRESSES)
  const contracts = [
    { name: 'MountainShares Token', address: '0xE8A9c6fFE6b2344147D886EcB8608C5F7863B20D' },
    { name: 'COMPROMISED WALLET (!)', address: '0xdE75F5168E33db23FA5601b5fc88545be7b287a4' },
    { name: 'MockV3Aggregator', address: '0x93979a9E8674188629bAFfa960e940522AFEc841' },
    { name: 'MountainShares Phase1', address: '0xBdc5936fE0A59A5f8f5d686A9CbFDF83eA9BE1fA' },
    { name: 'Merkle Tree Component', address: '0xb3dC07c05749dB59451028ad8ca7e1d50BF37b1B' },
    { name: 'Business Registry', address: '0x67E344a548C67cD2BC709166E018e94F3c336798' },
    { name: 'Employee Reward Vault 2', address: '0x7eB60bedF1680eDe784BE25744c485c25A6Af906' },
    { name: 'Heritage NFT Complex', address: '0x390f08352023De0829e279d3FEBf8B9afaf2Ccc3' },
    { name: 'Heritage Clio Revenue', address: '0xF0c265a72A8054D99dDBEd3AE083188A3Ab431e9' },
    { name: 'Gift Card Manager', address: '0xF19775116821dc36975F3C3A625B53e7F68ab1E6' },
    { name: 'Community Governance', address: '0xE16888bf994a8668516aCfF46C44e955B07346B3' },
    { name: 'Volunteer Hours Manager', address: '0xc900dE9d1BB1Fb94055bbeEe93D248bDD21f1C4F' },
    { name: 'Employee Management', address: '0x0F86A9e30185fB47b57405b726A10Ee924d2a6aD' },
    { name: 'Employee Payroll Enhanced', address: '0x3CBeDb6D4471288B08C166bEF884c3285e111d81' },
    { name: 'Volunteer Organisation', address: '0x5E3aF75275CecE83D422a01468dB305Ae6Aa977D' },
    { name: 'Chainlink Price Oracle', address: '0x80350328FB9B2Da92897da19c28C0aC4FA325949' },
    { name: 'Employee Reward Vault', address: '0x4f24d91334E074c443F86826225AdcC66A2112Cf' },
    { name: 'Subscription Service', address: '0x664D1FD1A882E3cc961314667211149e2557bea3' },
    { name: 'Old Purchase Contract', address: '0x2a36e8775EbfaAb18E25Df81EF6Eab05E026f400' },
    { name: 'H4H Fee Distribution ETH', address: '0x5aed93B8B60674d2Cd993E610d5df5C21c71f863' },
    { name: 'High-Value Price Oracle', address: '0xf2159394485d249813DDE15099686767003540Ab' },
    { name: 'ETH Price Calculator', address: '0x4153c9b915AAb6Bf1a11Dd6F37BA9E6051a3f1f8' },
    { name: 'Donation Scheme ETH', address: '0x3B190Afe76b944E9B44D5E2D5507dD59625eaA00' },
    { name: 'Central Token Hub', address: '0xb663DCB090E83BD625E42C613A8f3aE432C6f2B5' },
    { name: 'Central Command Center', address: '0x7F246dD285E7c53190b5Ae927a3a581393F9a521' },
    { name: 'Backbone', address: '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f' },
    { name: 'KYC Merkle Tree', address: '0x08E419bA4EdDdB4Bee0E14d9FFf0d83f63ABbE07' },
    { name: 'MountainShares KYC', address: '0x8CFF221E2e6327560E2a6EeE3CD552fe26402bd2' },
    { name: 'DEX Aggregator Router', address: '0x9dDA6Ef3D919c9bC8885D5560999A3640431e8e6' },
    { name: 'StableCoin', address: '0x57fC62371582F9Ba976887658fd44AE86fa0298a' },
    { name: 'USDC Management', address: '0x5574A3EcCFd6e9Af35F0B204f148D021be5b9C95' },
    { name: 'USDC Settlement Processor', address: '0x1F0c8a4c920E1094f85b18F681dcfB2e2b7DE076' }
  ];

  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
  const oldWallet = '0xdE75F5168E33db23FA5601b5fc88545be7b287a4';
  const newWallet = '0xBf1bD0A0DA1B64Ec6128B91a39AD8a0c88B83330';

  console.log('🔍 Compromised Wallet:', oldWallet);
  console.log('🔒 New Secure Wallet:', newWallet);
  console.log('📊 Testing', contracts.length, 'contracts...');
  console.log('');

  let compromisedCount = 0;
  let secureCount = 0;
  let unknownCount = 0;
  let errorCount = 0;

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];
    console.log(`📋 [${i + 1}/${contracts.length}] ${contract.name}`);
    console.log(`📍 ${contract.address}`);

    // Special handling for wallet address
    if (contract.address.toLowerCase() === oldWallet.toLowerCase()) {
      console.log('🚨 THIS IS YOUR COMPROMISED WALLET ADDRESS - NOT A CONTRACT!');
      console.log('⚠️  Why is your wallet address in your contract list?');
      console.log('');
      continue;
    }

    try {
      // Check if contract exists
      const code = await provider.getCode(contract.address);
      if (code === '0x') {
        console.log('❌ Contract not found');
        errorCount++;
        console.log('');
        continue;
      }

      console.log('✅ Contract exists');

      // Try common ownership functions
      const commonABI = [
        "function owner() view returns (address)",
        "function getOwner() view returns (address)", 
        "function hasRole(bytes32,address) view returns (bool)",
        "function totalSupply() view returns (uint256)"
      ];

      const contractInstance = new ethers.Contract(contract.address, commonABI, provider);

      // Test ownership methods
      let ownerFound = false;

      try {
        const owner = await contractInstance.owner();
        console.log(`👤 Owner: ${owner}`);
        ownerFound = true;
        
        if (owner.toLowerCase() === oldWallet.toLowerCase()) {
          console.log('🚨 COMPROMISED - Owned by old wallet!');
          compromisedCount++;
        } else if (owner.toLowerCase() === newWallet.toLowerCase()) {
          console.log('✅ SECURE - Owned by new wallet');
          secureCount++;
        } else {
          console.log('⚠️  UNKNOWN OWNER - Different wallet controls this');
          unknownCount++;
        }
      } catch (error) {
        try {
          const owner = await contractInstance.getOwner();
          console.log(`👤 GetOwner: ${owner}`);
          ownerFound = true;
          
          if (owner.toLowerCase() === oldWallet.toLowerCase()) {
            console.log('🚨 COMPROMISED - Owned by old wallet!');
            compromisedCount++;
          } else if (owner.toLowerCase() === newWallet.toLowerCase()) {
            console.log('✅ SECURE - Owned by new wallet');
            secureCount++;
          } else {
            console.log('⚠️  UNKNOWN OWNER');
            unknownCount++;
          }
        } catch (error2) {
          console.log('📋 No standard ownership functions found');
          unknownCount++;
        }
      }

    } catch (error) {
      console.log(`❌ Error testing contract: ${error.message}`);
      errorCount++;
    }

    console.log('');
  }

  console.log('🎯 FINAL SUMMARY:');
  console.log('==================');
  console.log(`🚨 COMPROMISED (owned by old wallet): ${compromisedCount}`);
  console.log(`✅ SECURE (owned by new wallet): ${secureCount}`);
  console.log(`⚠️  UNKNOWN OWNERS: ${unknownCount}`);
  console.log(`❌ ERRORS/NOT FOUND: ${errorCount}`);
  console.log('');
  
  if (compromisedCount > 0) {
    console.log('🚨 CRITICAL ACTION REQUIRED:');
    console.log(`   ${compromisedCount} contracts are controlled by your compromised wallet!`);
    console.log('   These contracts are at risk and need immediate attention.');
  }
}

testAll32Contracts().catch(console.error);
