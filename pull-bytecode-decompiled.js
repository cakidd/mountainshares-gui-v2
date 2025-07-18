// pull-bytecode-decompiled.js
// Pull and decompile bytecode for all contract addresses

require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

async function pullBytecodeDecompiled() {
  console.log('🔍 Pulling Bytecode and Decompiling All Contracts');
  console.log('================================================');

  // All 32 contract addresses from your list
  const addresses = [
    '0xE8A9c6fFE6b2344147D886EcB8608C5F7863B20D', // MountainShares Token
    '0xdE75F5168E33db23FA5601b5fc88545be7b287a4', // Compromised Wallet
    '0x93979a9E8674188629bAFfa960e940522AFEc841', // MockV3Aggregator
    '0xBdc5936fE0A59A5f8f5d686A9CbFDF83eA9BE1fA', // MountainShares Phase1
    '0xb3dC07c05749dB59451028ad8ca7e1d50BF37b1B', // Merkle Tree Component
    '0x67E344a548C67cD2BC709166E018e94F3c336798', // Business Registry
    '0x7eB60bedF1680eDe784BE25744c485c25A6Af906', // Employee Reward Vault 2
    '0x390f08352023De0829e279d3FEBf8B9afaf2Ccc3', // Heritage NFT Complex
    '0xF0c265a72A8054D99dDBEd3AE083188A3Ab431e9', // Heritage Clio Revenue
    '0xF19775116821dc36975F3C3A625B53e7F68ab1E6', // Gift Card Manager
    '0xE16888bf994a8668516aCfF46C44e955B07346B3', // Community Governance
    '0xc900dE9d1BB1Fb94055bbeEe93D248bDD21f1C4F', // Volunteer Hours Manager
    '0x0F86A9e30185fB47b57405b726A10Ee924d2a6aD', // Employee Management
    '0x3CBeDb6D4471288B08C166bEF884c3285e111d81', // Employee Payroll Enhanced
    '0x5E3aF75275CecE83D422a01468dB305Ae6Aa977D', // Volunteer Organisation
    '0x80350328FB9B2Da92897da19c28C0aC4FA325949', // Chainlink Price Oracle
    '0x4f24d91334E074c443F86826225AdcC66A2112Cf', // Employee Reward Vault
    '0x664D1FD1A882E3cc961314667211149e2557bea3', // Subscription Service
    '0x2a36e8775EbfaAb18E25Df81EF6Eab05E026f400', // Old Purchase Contract
    '0x5aed93B8B60674d2Cd993E610d5df5C21c71f863', // H4H Fee Distribution ETH
    '0xf2159394485d249813DDE15099686767003540Ab', // High-Value Price Oracle
    '0x4153c9b915AAb6Bf1a11Dd6F37BA9E6051a3f1f8', // ETH Price Calculator
    '0x3B190Afe76b944E9B44D5E2D5507dD59625eaA00', // Donation Scheme ETH
    '0xb663DCB090E83BD625E42C613A8f3aE432C6f2B5', // Central Token Hub
    '0x7F246dD285E7c53190b5Ae927a3a581393F9a521', // Central Command Center
    '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f', // Backbone
    '0x08E419bA4EdDdB4Bee0E14d9FFf0d83f63ABbE07', // KYC Merkle Tree
    '0x8CFF221E2e6327560E2a6EeE3CD552fe26402bd2', // MountainShares KYC
    '0x9dDA6Ef3D919c9bC8885D5560999A3640431e8e6', // DEX Aggregator Router
    '0x57fC62371582F9Ba976887658fd44AE86fa0298a', // StableCoin
    '0x5574A3EcCFd6e9Af35F0B204f148D021be5b9C95', // USDC Management
    '0x1F0c8a4c920E1094f85b18F681dcfB2e2b7DE076'  // USDC Settlement Processor
  ];

  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
  const compromisedAddress = '0xdE75F5168E33db23FA5601b5fc88545be7b287a4';

  // Create output directory
  if (!fs.existsSync('bytecode-analysis')) {
    fs.mkdirSync('bytecode-analysis');
  }

  let contractCount = 0;
  let addressFoundCount = 0;

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    console.log(`\n📋 [${i + 1}/${addresses.length}] Analyzing: ${address}`);

    // Skip if this is the compromised wallet address itself
    if (address.toLowerCase() === compromisedAddress.toLowerCase()) {
      console.log('⚠️  This is a wallet address, not a contract - skipping');
      continue;
    }

    try {
      // Get bytecode
      const code = await provider.getCode(address);
      
      if (code === '0x') {
        console.log('❌ No contract found at this address');
        continue;
      }

      console.log('✅ Contract found');
      console.log(`📏 Bytecode length: ${code.length} characters`);
      
      contractCount++;

      // Save raw bytecode
      const filename = `bytecode-analysis/contract_${i + 1}_${address.slice(0, 8)}.txt`;
      fs.writeFileSync(filename, `Contract Address: ${address}\nBytecode Length: ${code.length}\nRaw Bytecode:\n${code}`);

      // Search for compromised address in bytecode (remove 0x prefix and search)
      const searchHex = compromisedAddress.slice(2).toLowerCase();
      const codeLower = code.toLowerCase();
      
      if (codeLower.includes(searchHex)) {
        console.log('🚨 COMPROMISED ADDRESS FOUND IN BYTECODE!');
        console.log(`🔍 Searching for: ${searchHex}`);
        
        // Find all positions where the address appears
        let pos = 0;
        const positions = [];
        while ((pos = codeLower.indexOf(searchHex, pos)) !== -1) {
          positions.push(pos);
          pos++;
        }
        
        console.log(`📍 Found at positions: ${positions.join(', ')}`);
        addressFoundCount++;
        
        // Save detailed analysis
        const detailFile = `bytecode-analysis/COMPROMISED_${i + 1}_${address.slice(0, 8)}_detailed.txt`;
        let analysis = `COMPROMISED CONTRACT ANALYSIS\n`;
        analysis += `============================\n`;
        analysis += `Contract: ${address}\n`;
        analysis += `Compromised Address Found: ${compromisedAddress}\n`;
        analysis += `Positions in bytecode: ${positions.join(', ')}\n\n`;
        analysis += `Full Bytecode:\n${code}\n`;
        
        fs.writeFileSync(detailFile, analysis);
        console.log(`💾 Detailed analysis saved: ${detailFile}`);
        
      } else {
        console.log('✅ Compromised address NOT found in bytecode');
      }

      // Basic decompilation attempt (simple analysis)
      console.log('🔍 Basic Analysis:');
      
      // Look for common function signatures
      if (code.includes('a9059cbb')) console.log('  📝 Contains transfer() function');
      if (code.includes('23b872dd')) console.log('  📝 Contains transferFrom() function');
      if (code.includes('095ea7b3')) console.log('  📝 Contains approve() function');
      if (code.includes('8da5cb5b')) console.log('  📝 Contains owner() function');
      if (code.includes('f2fde38b')) console.log('  📝 Contains transferOwnership() function');

    } catch (error) {
      console.log(`❌ Error analyzing contract: ${error.message}`);
    }
  }

  console.log('\n🎯 BYTECODE ANALYSIS COMPLETE!');
  console.log('==============================');
  console.log(`📊 Total addresses checked: ${addresses.length}`);
  console.log(`✅ Contracts found: ${contractCount}`);
  console.log(`🚨 Contracts with compromised address in bytecode: ${addressFoundCount}`);
  console.log('📁 Analysis saved in bytecode-analysis/ directory');
  
  if (addressFoundCount > 0) {
    console.log('\n🚨 CRITICAL FINDING:');
    console.log(`${addressFoundCount} contracts have the compromised address hardcoded in their bytecode!`);
    console.log('This means those contracts have permanent references to the stolen wallet.');
  }
}

pullBytecodeDecompiled().catch(console.error);
