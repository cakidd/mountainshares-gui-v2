// debug-env.js
// Debug environment variables without exposing sensitive data

require('dotenv').config();

function debugEnvironmentVariables() {
  console.log('🔍 Environment Variables Debug');
  console.log('==============================');

  // Check if .env file is being loaded
  console.log('\n📁 .env File Status:');
  const fs = require('fs');
  if (fs.existsSync('.env')) {
    console.log('   ✅ .env file exists');
  } else {
    console.log('   ❌ .env file not found');
    console.log('   💡 You may need to create a .env file with your variables');
  }

  // Check critical environment variables (without revealing values)
  console.log('\n🔑 Critical Variables Check:');
  
  const criticalVars = [
    'ARBITRUM_RPC_URL',
    'WEBHOOK_SIGNER_PRIVATE_KEY',
    'MINTING_PRIVATE_KEY',
    'MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS',
    'SETTLEMENT_RESERVE_ADDRESS',
    'MOUNTAINSHARES_TOKEN'
  ];

  criticalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: Set (${value.length} chars)`);
      
      // Check private key format
      if (varName.includes('PRIVATE_KEY')) {
        if (value.startsWith('0x')) {
          console.log(`      🔑 Format: Hex with 0x prefix (${value.length - 2} hex chars)`);
        } else if (value.length === 64 && /^[0-9a-fA-F]+$/.test(value)) {
          console.log(`      🔑 Format: Raw hex (64 hex chars)`);
        } else if (value.length === 66 && value.startsWith('0x') && /^0x[0-9a-fA-F]+$/.test(value)) {
          console.log(`      🔑 Format: Hex with 0x prefix (64 hex chars)`);
        } else {
          console.log(`      ❌ Format: Invalid private key format`);
          console.log(`      💡 Private key should be 64 hex characters (with or without 0x prefix)`);
        }
      }
      
      // Check address format
      if (varName.includes('ADDRESS')) {
        if (value.startsWith('0x') && value.length === 42) {
          console.log(`      📍 Format: Valid Ethereum address`);
        } else {
          console.log(`      ❌ Format: Invalid address format`);
        }
      }
      
    } else {
      console.log(`   ❌ ${varName}: Not set`);
    }
  });

  // Check if variables are coming from Vercel/Netlify instead of .env
  console.log('\n🌐 Deployment Platform Variables:');
  if (process.env.VERCEL) {
    console.log('   🚀 Running on Vercel - variables should be set in Vercel dashboard');
  } else if (process.env.NETLIFY) {
    console.log('   🌊 Running on Netlify - variables should be set in Netlify dashboard');
  } else {
    console.log('   💻 Running locally - variables should be in .env file');
  }

  // Provide specific guidance for private key issues
  console.log('\n🔧 Private Key Troubleshooting:');
  console.log('   💡 Private keys should be in one of these formats:');
  console.log('   • 0x1234567890abcdef... (66 characters with 0x)');
  console.log('   • 1234567890abcdef... (64 characters without 0x)');
  console.log('   💡 Make sure there are no extra spaces or quotes');
  console.log('   💡 Private keys are case-insensitive but should be hex only');

  return {
    hasEnvFile: fs.existsSync('.env'),
    criticalVarsSet: criticalVars.filter(v => process.env[v]).length,
    totalCriticalVars: criticalVars.length
  };
}

// Run the debug
const result = debugEnvironmentVariables();

console.log('\n📊 Summary:');
console.log(`   📁 Environment file: ${result.hasEnvFile ? 'Found' : 'Missing'}`);
console.log(`   🔑 Variables set: ${result.criticalVarsSet}/${result.totalCriticalVars}`);

if (result.criticalVarsSet < result.totalCriticalVars) {
  console.log('\n🎯 Next Steps:');
  console.log('   1. Create .env file with your environment variables');
  console.log('   2. Copy variables from Vercel/Netlify dashboard');
  console.log('   3. Ensure private keys are in correct hex format');
  console.log('   4. Run test again after fixing variables');
}
