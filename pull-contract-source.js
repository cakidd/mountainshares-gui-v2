// pull-contract-source.js
// Automatically pull source code for all compromised contracts

const https = require('https');
const fs = require('fs');

async function pullContractSource() {
  console.log('🔍 Pulling Source Code for Compromised Contracts');
  console.log('===============================================');

  const contracts = [
    { name: 'Business Registry', address: '0x67E344a548C67cD2BC709166E018e94F3c336798' },
    { name: 'Heritage NFT Complex', address: '0x390f08352023De0829e279d3FEBf8B9afaf2Ccc3' },
    { name: 'Volunteer Hours Manager', address: '0xc900dE9d1BB1Fb94055bbeEe93D248bDD21f1C4F' },
    { name: 'Subscription Service', address: '0x664D1FD1A882E3cc961314667211149e2557bea3' },
    { name: 'StableCoin', address: '0x57fC62371582F9Ba976887658fd44AE86fa0298a' },
    { name: 'USDC Management', address: '0x5574A3EcCFd6e9Af35F0B204f148D021be5b9C95' },
    { name: 'USDC Settlement Processor', address: '0x1F0c8a4c920E1094f85b18F681dcfB2e2b7DE076' }
  ];

  // Create contracts directory
  if (!fs.existsSync('pulled-contracts')) {
    fs.mkdirSync('pulled-contracts');
  }

  for (const contract of contracts) {
    console.log(`\n📋 Pulling: ${contract.name}`);
    console.log(`📍 Address: ${contract.address}`);

    try {
      // Use Arbiscan API to get source code
      const apiUrl = `https://api.arbiscan.io/api?module=contract&action=getsourcecode&address=${contract.address}&apikey=YourApiKeyToken`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status === '1' && data.result[0].SourceCode) {
        const sourceCode = data.result[0].SourceCode;
        const contractName = data.result[0].ContractName || 'Unknown';
        
        // Save source code to file
        const filename = `pulled-contracts/${contract.name.replace(/\s+/g, '_')}_${contract.address.slice(0,8)}.sol`;
        fs.writeFileSync(filename, sourceCode);
        
        console.log(`✅ Source code saved: ${filename}`);
        console.log(`📄 Contract Name: ${contractName}`);
        
        // Search for compromised address
        if (sourceCode.includes('0xdE75F5168E33db23FA5601b5fc88545be7b287a4')) {
          console.log('🚨 CONTAINS COMPROMISED ADDRESS!');
          
          // Find the lines containing it
          const lines = sourceCode.split('\n');
          lines.forEach((line, index) => {
            if (line.includes('0xdE75F5168E33db23FA5601b5fc88545be7b287a4')) {
              console.log(`🔍 Line ${index + 1}: ${line.trim()}`);
            }
          });
        } else {
          console.log('✅ No compromised address found in source code');
        }
        
      } else {
        console.log('❌ Contract not verified or source code unavailable');
      }
      
    } catch (error) {
      console.log(`❌ Error pulling contract: ${error.message}`);
    }
  }

  console.log('\n🎯 Source Code Pulling Complete!');
  console.log('📁 Check pulled-contracts/ directory for saved files');
}

// Fallback method using curl if fetch doesn't work
function curlMethod() {
  console.log('\n🔄 Alternative method using curl:');
  
  const contracts = [
    '0x67E344a548C67cD2BC709166E018e94F3c336798',
    '0x390f08352023De0829e279d3FEBf8B9afaf2Ccc3',
    '0xc900dE9d1BB1Fb94055bbeEe93D248bDD21f1C4F',
    '0x664D1FD1A882E3cc961314667211149e2557bea3',
    '0x57fC62371582F9Ba976887658fd44AE86fa0298a',
    '0x5574A3EcCFd6e9Af35F0B204f148D021be5b9C95',
    '0x1F0c8a4c920E1094f85b18F681dcfB2e2b7DE076'
  ];

  contracts.forEach((address, index) => {
    console.log(`curl "https://api.arbiscan.io/api?module=contract&action=getsourcecode&address=${address}" -o "contract_${index + 1}_${address.slice(0,8)}.json"`);
  });
}

pullContractSource().catch(() => {
  console.log('Fetch method failed, trying curl commands:');
  curlMethod();
});
