// contract-explorer.js
// Discover the correct functions in your purchase contract

require('dotenv').config();
const { ethers } = require('ethers');

async function exploreContract() {
  console.log('🔍 Exploring Your Purchase Contract Functions');
  console.log('============================================');

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const contractAddress = process.env.MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS;
    
    console.log(`📋 Contract: ${contractAddress}`);

    // Method 1: Try common purchase function signatures
    console.log('\n1️⃣ Testing Common Function Signatures:');
    
    const commonFunctions = [
      "function processPayment() payable",
      "function processPayment(uint256 amount) payable", 
      "function purchaseTokens() payable",
      "function purchaseTokens(uint256 amount) payable",
      "function buyTokens() payable",
      "function buyTokens(uint256 amount) payable",
      "function processUSDPayment(uint256 usdAmount) payable",
      "function purchase() payable",
      "function purchase(uint256 amount) payable",
      "function deposit() payable",
      "function deposit(uint256 amount) payable",
      "function mint() payable",
      "function mint(uint256 amount) payable",
      "function convert() payable",
      "function convert(uint256 amount) payable"
    ];

    const wallet = new ethers.Wallet(process.env.WEBHOOK_SIGNER_PRIVATE_KEY, provider);
    
    for (const funcSig of commonFunctions) {
      try {
        const contract = new ethers.Contract(contractAddress, [funcSig], wallet);
        const funcName = funcSig.split('(')[0].replace('function ', '');
        
        console.log(`   🔍 Testing: ${funcName}`);
        
        // Try to estimate gas (this will tell us if function exists)
        if (funcSig.includes('uint256 amount')) {
          // Function with amount parameter
          const testAmount = ethers.parseUnits("1.40", 18); // Test with $1.40
          await contract[funcName].estimateGas(testAmount, { value: ethers.parseEther("0.001") });
          console.log(`   ✅ FOUND: ${funcName}(amount) - accepts amount parameter`);
        } else {
          // Function without parameters  
          await contract[funcName].estimateGas({ value: ethers.parseEther("0.001") });
          console.log(`   ✅ FOUND: ${funcName}() - no parameters needed`);
        }
        
      } catch (error) {
        // Function doesn't exist or has different signature
        if (error.message.includes('no contract code')) {
          console.log(`   ❌ Contract not deployed`);
          break;
        }
        // Continue trying other functions
      }
    }

    // Method 2: Try to get contract code and analyze
    console.log('\n2️⃣ Contract Code Analysis:');
    const code = await provider.getCode(contractAddress);
    
    if (code === '0x') {
      console.log('   ❌ No contract code found - contract not deployed');
      return;
    }
    
    console.log(`   ✅ Contract deployed with ${code.length} bytes of code`);
    
    // Method 3: Look for events that might indicate function names
    console.log('\n3️⃣ Recent Transaction Analysis:');
    console.log('   💡 Checking recent transactions to this contract...');
    
    try {
      // Get recent transactions to this contract
      const latestBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 1000); // Last 1000 blocks
      
      console.log(`   🔍 Scanning blocks ${fromBlock} to ${latestBlock}...`);
      
      // This is a simplified approach - in practice you'd use event filters
      console.log('   💡 For detailed transaction history, check:');
      console.log(`   📱 https://arbiscan.io/address/${contractAddress}`);
      
    } catch (error) {
      console.log(`   ⚠️ Transaction scan failed: ${error.message}`);
    }

    // Method 4: Test with the aggregator contract
    console.log('\n4️⃣ Testing Price Aggregator:');
    const aggregatorAddress = process.env.MOCKV3_AGGREGATOR_ADDRESS;
    console.log(`   📋 Aggregator: ${aggregatorAddress}`);
    
    try {
      const aggregatorABI = [
        "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
        "function decimals() view returns (uint8)"
      ];
      
      const aggregator = new ethers.Contract(aggregatorAddress, aggregatorABI, provider);
      const roundData = await aggregator.latestRoundData();
      const decimals = await aggregator.decimals();
      
      const price = ethers.formatUnits(roundData[1], decimals);
      console.log(`   ✅ Price feed working: $${price} (${decimals} decimals)`);
      
    } catch (error) {
      console.log(`   ❌ Aggregator test failed: ${error.message}`);
    }

    // Method 5: Provide manual inspection guidance
    console.log('\n5️⃣ Manual Inspection Guidance:');
    console.log('   🔧 Next steps to find the correct function:');
    console.log(`   1. Visit: https://arbiscan.io/address/${contractAddress}#code`);
    console.log(`   2. Look for "Contract" tab to see verified source code`);
    console.log(`   3. Check "Read Contract" and "Write Contract" tabs`);
    console.log(`   4. Look for functions containing "purchase", "process", "buy", or "payment"`);
    console.log(`   5. Check recent transactions for successful calls`);

  } catch (error) {
    console.error('\n❌ Exploration failed:', error.message);
  }
}

// Run the exploration
exploreContract();
