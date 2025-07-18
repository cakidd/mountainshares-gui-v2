require('dotenv').config();

async function checkEnvironmentReferences() {
  console.log('🔍 CHECKING ENVIRONMENT FOR COMPROMISED CONTRACT REFERENCES');
  console.log('==========================================================');
  
  const compromisedContracts = {
    'Business Registry': '0x67E344a548C67cD2BC709166E018e94F3c336798',
    'Heritage NFT Complex': '0x390f08352023De0829e279d3FEBf8B9afaf2Ccc3',
    'Volunteer Hours Manager': '0xc900dE9d1BB1Fb94055bbeEe93D248bDD21f1C4F',
    'Subscription Service': '0x664D1FD1A882E3cc961314667211149e2557bea3',
    'StableCoin': '0x57fC62371582F9Ba976887658fd44AE86fa0298a',
    'USDC Management': '0x5574A3EcCFd6e9Af35F0B204f148D021be5b9C95',
    'USDC Settlement Processor': '0x1F0c8a4c920E1094f85b18F681dcfB2e2b7DE076',
    'H4H Fee Distribution ETH': '0x5aed93B8B60674d2Cd993E610d5df5C21c71f863'
  };

  const envVars = [
    'BACKBONE_CONTROLLER',
    'BUSINESS_REGISTRY_ADDRESS', 
    'EMPLOYEE_REWARD_VAULT_SIMPLE_ADDRESS',
    'H4H_NONPROFIT_ADDRESS',
    'HERITAGE_CLIO_REVENUE_ADDRESS',
    'MS_GIFT_CARD_MANAGER_ADDRESS',
    'MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS',
    'SECONDARY_TOKEN_ADDRESS',
    'VOLUNTEER_ORGANIZATION_MANAGER_ADDRESS'
  ];

  console.log('🔍 Checking environment variables for compromised contracts:');
  console.log('');

  let foundCompromised = [];

  envVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      console.log(`${envVar}: ${value}`);
      
      // Check if this matches any compromised contract
      Object.entries(compromisedContracts).forEach(([name, address]) => {
        if (value.toLowerCase() === address.toLowerCase()) {
          console.log(`🚨 ALERT: ${envVar} points to compromised ${name}!`);
          foundCompromised.push({ envVar, name, address });
        }
      });
    } else {
      console.log(`${envVar}: Not set`);
    }
  });

  console.log('');
  if (foundCompromised.length === 0) {
    console.log('✅ GOOD NEWS: No environment variables point to compromised contracts!');
  } else {
    console.log(`🚨 FOUND ${foundCompromised.length} ENVIRONMENT VARIABLES POINTING TO COMPROMISED CONTRACTS:`);
    foundCompromised.forEach(item => {
      console.log(`   - ${item.envVar} → ${item.name} (${item.address})`);
    });
  }

  // Check for the old compromised wallet
  console.log('');
  console.log('🔍 Checking for old compromised wallet references:');
  const compromisedWallet = '0xdE75F5168E33db23FA5601b5fc88545be7b287a4';
  
  envVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value && value.toLowerCase() === compromisedWallet.toLowerCase()) {
      console.log(`🚨 ALERT: ${envVar} still references old compromised wallet!`);
    }
  });

  // Check WEBHOOK_SIGNER_PRIVATE_KEY
  const privateKey = process.env.WEBHOOK_SIGNER_PRIVATE_KEY;
  if (privateKey === '3ca85ca7c902f695abf8d7c49b860dca0f4955fa3f278b47526f37eb9c439402') {
    console.log('✅ WEBHOOK_SIGNER_PRIVATE_KEY: Using secure key');
  } else {
    console.log('🚨 WEBHOOK_SIGNER_PRIVATE_KEY: Not using expected secure key!');
  }
}

checkEnvironmentReferences().catch(console.error);
