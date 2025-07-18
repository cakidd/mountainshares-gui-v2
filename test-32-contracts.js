// test-32-contracts.js
// Test all 32 deployed contracts for ownership and functionality

require('dotenv').config();
const { ethers } = require('ethers');

async function test32Contracts() {
  console.log('🧪 Testing All 32 MountainShares Contracts');
  console.log('===========================================');
  
  // All 32 contract addresses from your ecosystem
  const contracts = [
    { name: 'MountainShares Token', address: '0xE8A9c6fFE6b2344147D886EcB8608C5F7863B20D' },
    { name: 'MockV3Aggregator', address: '0x93979a9E8674188629bAFfa960e940522AFEc841' },
    { name: 'Old Purchase Contract', address: '0x2a36e8775EbfaAb18E25Df81EF6Eab05E026f400' },
    { name: 'USDC Settlement Processor', address: '0x1F0c8a4c...e2b7DE076' }, // You'll need full address
    { name: 'USDC Management & Analysis', address: '0x5574A3Ec...1be5b9C95' },
    { name: 'StableCoin', address: '0x57fC6237...86fa0298a' },
    { name: 'DEX Aggregator Router', address: '0x9dDA6Ef3...40431e8e6' },
    { name: 'MountainShares KYC', address: '0x8CFF221E...e26402bd2' },
    { name: 'KYC Merkle Tree', address: '0x08E419bA...f63ABbE07' },
    { name: 'Backbone', address: '0x746dD4D4...619dBf67f' },
    { name: 'Central Command Center', address: '0x7F246dD2...393F9a521' },
    { name: 'Central Token Hub', address: '0xb663DCB0...432C6f2B5' },
    { name: 'Donation Scheme ETH', address: '0x3B190Afe...9625eaA00' },
    { name: 'ETH Price Calculator', address: '0x4153c9b9...051a3f1f8' },
    { name: 'High-Value Price Oracle', address: '0xf2159394...7003540Ab' },
    { name: 'H4H Fee Distribution ETH', address: '0x5aed93B8...21c71f863' },
    { name: 'Subscription Service', address: '0x664D1FD1...e2557bea3' },
    { name: 'Employee Reward Vault', address: '0x4f24d913...66A2112Cf' },
    { name: 'Chainlink Price Oracle', address: '0x80350328...4FA325949' },
    { name: 'Volunteer Organisation', address: '0x5E3aF752...Ae6Aa977D' },
    { name: 'Employee Payroll Enhanced', address: '0x3CBeDb6D...85e111d81' },
    { name: 'Employee Management', address: '0x0F86A9e3...924d2a6aD' },
    { name: 'Volunteer Hours Manager', address: '0xc900dE9d...DD21f1C4F' },
    { name: 'Community Governance', address: '0xE16888bf...5B07346B3' },
    { name: 'Gift Card Manager', address: '0xF1977511...7F68ab1E6' },
    { name: 'Heritage Clio Revenue', address: '0xF0c265a7...A3Ab431e9' },
    { name: 'Heritage NFT Complex', address: '0x390f0835...afaf2Ccc3' },
    { name: 'Employee Reward Vault 2', address: '0x7eB60bed...25A6Af906' },
    { name: 'Business Registry', address: '0x67E344a5...F3c336798' },
    { name: 'Merkle Tree Component', address: '0xb3dC07c0...50BF37b1B' },
    { name: 'MountainShares Phase1', address: '0xBdc5936f...3eA9BE1fA' },
    { name: 'Sepolia Test Contract', address: '0x8faE23133126c51D20Be71d9BD64Ff0F960FBF22' }
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
        "function getRoleMember(bytes32,uint256) view returns (address)",
        "function balanceOf(address) view returns (uint256)",
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
        // Try alternative ownership method
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

      // Try to get additional info
      try {
        const totalSupply = await contractInstance.totalSupply();
        console.log(`🪙 Total Supply: ${ethers.formatEther(totalSupply)}`);
      } catch (error) {
        // Not a token contract
      }

    } catch (error) {
      console.log(`❌ Error testing contract: ${error.message}`);
      errorCount++;
    }

    console.log(''); // Blank line between contracts
  }

  console.log('🎯 FINAL SUMMARY:');
  console.log('==================');
  console.log(`🚨 COMPROMISED (owned by old wallet): ${compromisedCount}`);
  console.log(`✅ SECURE (owned by new wallet): ${secureCount}`);
  console.log(`⚠️  UNKNOWN OWNERS: ${unknownCount}`);
  console.log(`❌ ERRORS/NOT FOUND: ${errorCount}`);
  console.log('');
  
  if (compromisedCount > 0) {
    console.log('🚨 ACTION REQUIRED:');
    console.log(`   ${compromisedCount} contracts are controlled by your compromised wallet!`);
    console.log('   These contracts may be at risk and need ownership transfer.');
  }
  
  if (secureCount > 0) {
    console.log(`✅ ${secureCount} contracts are already secure with your new wallet.`);
  }
}

// Run the test
test32Contracts().catch(console.error);
