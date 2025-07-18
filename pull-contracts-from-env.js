// pull-contracts-from-env.js
// Pull contract source code using addresses from your environment

const https = require('https');
const fs = require('fs');

async function pullContractsFromEnv() {
  console.log('🔍 Pulling Contract Source Code from Environment Variables');
  console.log('========================================================');

  // Contract addresses from your environment file
  const contracts = [
    { name: 'Business Registry', address: '0x390f08352023De0829e279d3FEBf8B9afaf2Ccc3' },
    { name: 'Employee Reward Vault', address: '0x664D1FD1A882E3cc961314667211149e2557bea3' },
    { name: 'Heritage Clio Revenue', address: '0xF19775116821dc36975F3C3A625B53e7F68ab1E6' },
    { name: 'Gift Card Manager', address: '0xE16888bf994a8668516aCfF46C44e955B07346B3' },
    { name: 'Old Purchase Contract', address: '0x2a36e8775EbfaAb18E25Df81EF6Eab05E026f400' },
    { name: 'MountainShares Token', address: '0xE8A9c6fFE6b2344147D886EcB8608C5F7863B20D' },
    { name: 'Backbone Controller', address: '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f' },
    { name: 'Merkle Tree', address: '0xb663DCB090E83BD625E42C613A8f3aE432C6f2B5' },
    { name: 'KYC Contract', address: '0x8CFF221E2e6327560E2a6EeE3CD552fe26402bd2' },
    { name: 'MountainShares Phase1', address: '0xBdc5936fE0A59A5f8f5d686A9CbFDF83eA9BE1fA' },
    { name: 'Secondary Token', address: '0xb3dC07c05749dB59451028ad8ca7e1d50BF37b1B' },
    { name: 'Volunteer Manager', address: '0x80350328FB9B2Da92897da19c28C0aC4FA325949' }
  ];

  // Create contracts directory
  if (!fs.existsSync('env-contracts')) {
    fs.mkdirSync('env-contracts');
  }

  const compromisedAddress = '0xde75f5168e33db23fa5601b5fc88545be7b287a4';
  let foundCompromised = 0;
  let totalVerified = 0;

  for (const contract of contracts) {
    console.log(`\n📋 Checking: ${contract.name}`);
    console.log(`📍 Address: ${contract.address}`);

    try {
      // Use simple curl approach for Arbiscan API
      const { exec } = require('child_process');
      const apiUrl = `https://api.arbiscan.io/api?module=contract&action=getsourcecode&address=${contract.address}`;
      
      exec(`curl -s "${apiUrl}"`, (error, stdout, stderr) => {
        if (error) {
          console.log(`❌ Error fetching: ${error.message}`);
          return;
        }

        try {
          const data = JSON.parse(stdout);
          
          if (data.status === '1' && data.result[0].SourceCode) {
            const sourceCode = data.result[0].SourceCode;
            const contractName = data.result[0].ContractName || 'Unknown';
            
            // Save source code to file
            const filename = `env-contracts/${contract.name.replace(/\s+/g, '_')}_${contract.address.slice(0,8)}.sol`;
            fs.writeFileSync(filename, sourceCode);
            
            console.log(`✅ Source code saved: ${filename}`);
            console.log(`📄 Contract Name: ${contractName}`);
            totalVerified++;
            
            // Search for compromised address (case insensitive)
            const lowerSourceCode = sourceCode.toLowerCase();
            const searchAddress = compromisedAddress.toLowerCase();
            
            if (lowerSourceCode.includes(searchAddress)) {
              console.log('🚨 CONTAINS COMPROMISED ADDRESS!');
              foundCompromised++;
              
              // Find the lines containing it
              const lines = sourceCode.split('\n');
              lines.forEach((line, index) => {
                if (line.toLowerCase().includes(searchAddress)) {
                  console.log(`🔍 Line ${index + 1}: ${line.trim()}`);
                }
              });
            } else {
              console.log('✅ No compromised address found in source code');
            }
            
          } else {
            console.log('❌ Contract not verified or source code unavailable');
          }
          
        } catch (parseError) {
          console.log(`❌ Error parsing response: ${parseError.message}`);
        }
      });
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  // Summary after delay
  setTimeout(() => {
    console.log('\n🎯 ENVIRONMENT CONTRACT ANALYSIS COMPLETE!');
    console.log('==========================================');
    console.log(`📊 Total contracts checked: ${contracts.length}`);
    console.log(`✅ Verified contracts found: ${totalVerified}`);
    console.log(`🚨 Contracts with compromised address: ${foundCompromised}`);
    console.log('📁 Source code saved in env-contracts/ directory');
    
    if (foundCompromised > 0) {
      console.log('\n🚨 CRITICAL: Some contracts contain the compromised address!');
      console.log('These contracts may have hardcoded references to the stolen wallet.');
    }
  }, 10000); // Wait 10 seconds for all requests to complete
}

pullContractsFromEnv();
