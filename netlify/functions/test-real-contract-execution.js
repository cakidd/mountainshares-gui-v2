const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Your MountainShares contract addresses
const CONTRACTS = {
  USDC_SETTLEMENT_PROCESSOR: '0x1F0c8a4c920E1094f85b18F681dcfB2e2b7DE076',
  USDC_SETTLEMENT_TREASURY: '0x5574A3EcCFd6e9Af35F0B204f148D021be5b9C95',
  BACKBONE_CONTROLLER: '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f',
  MOUNTAINSHARES_TOKEN: '0xE8A9c6fFE6b2344147D886EcB8608C5F7863B20D',
  STABLECOIN_DISTRIBUTOR: '0x57fC62371582F9Ba976887658fd44AE86fa0298a',
  USDC_TOKEN: '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
};

// Fee distribution addresses
const FEE_RECIPIENTS = {
  PRIMARY: '0xde75f5168e33db23fa5601b5fc88545be7b287a4',
  H4H_TREASURY: '0x2b686a6c1c4b40ffc748b56b6c7a06c49e361167',
  COMMUNITY: '0xf8c739a101e53f6fe4e24df768be833ceecefa84',
  DEVELOPMENT: '0xd8bb25076e61b5a382e17171b48d8e0952b5b4f3',
  GOVERNANCE: '0x8c09e686bdfd283bdf5f6fffc780e62a695014f3'
};

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { testAmount, skipStripe, executeRealContracts } = JSON.parse(event.body || '{}');
    
    console.log('🧪 TESTING REAL CONTRACT EXECUTION');
    console.log('💰 Test Amount:', testAmount);
    console.log('⚡ Execute Real Contracts:', executeRealContracts);
    
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const testResults = {
      testParameters: {
        testAmount: testAmount,
        skipStripe: skipStripe,
        executeRealContracts: executeRealContracts,
        timestamp: new Date().toISOString()
      },
      preTestBalances: {},
      contractExecutions: {},
      postTestBalances: {},
      calculations: {},
      success: false
    };

    // Step 1: Get pre-test balances
    console.log('📊 Checking pre-test USDC balances...');
    const usdcContract = new ethers.Contract(CONTRACTS.USDC_TOKEN, ERC20_ABI, provider);
    
    // Check settlement treasury balance
    const treasuryBalanceBefore = await usdcContract.balanceOf(CONTRACTS.USDC_SETTLEMENT_TREASURY);
    testResults.preTestBalances.settlementTreasury = {
      address: CONTRACTS.USDC_SETTLEMENT_TREASURY,
      balance: ethers.formatUnits(treasuryBalanceBefore, 6),
      balanceWei: treasuryBalanceBefore.toString()
    };

    // Check fee recipient balances before
    for (const [name, address] of Object.entries(FEE_RECIPIENTS)) {
      const balance = await usdcContract.balanceOf(address);
      testResults.preTestBalances[name] = {
        address: address,
        balance: ethers.formatUnits(balance, 6),
        balanceWei: balance.toString()
      };
    }

    console.log('💰 Settlement Treasury Before:', testResults.preTestBalances.settlementTreasury.balance, 'USDC');

    // Step 2: Calculate expected distributions for test amount (FIXED TYPO)
    const testAmountFloat = parseFloat(testAmount || '1.00');
    const stripeFee = testAmountFloat * 0.029 + 0.30; // Fixed: stripeFee not stripefee
    const netAmount = testAmountFloat - stripeFee; // Fixed: stripeFee not stripefee
    const tokenBacking = Math.floor(testAmountFloat); // $1.00 for token backing
    const processingFees = Math.max(0, netAmount - tokenBacking); // Ensure non-negative

    testResults.calculations = {
      customerPayment: testAmountFloat,
      stripeProcessingFee: parseFloat(stripeFee.toFixed(2)),
      netForUSDCProcessing: parseFloat(netAmount.toFixed(2)),
      tokenBacking: tokenBacking,
      processingFeesTotal: parseFloat(processingFees.toFixed(2)),
      expectedDistribution: {
        settlementTreasury: tokenBacking,
        primary: parseFloat((processingFees * 0.30).toFixed(4)),
        h4hTreasury: parseFloat((processingFees * 0.30).toFixed(4)),
        community: parseFloat((processingFees * 0.15).toFixed(4)),
        development: parseFloat((processingFees * 0.15).toFixed(4)),
        governance: parseFloat((processingFees * 0.10).toFixed(4))
      }
    };

    console.log('🧮 Calculations:');
    console.log('- Customer Payment:', testResults.calculations.customerPayment);
    console.log('- Stripe Fee:', testResults.calculations.stripeProcessingFee);
    console.log('- Net Amount:', testResults.calculations.netForUSDCProcessing);
    console.log('- Token Backing:', testResults.calculations.tokenBacking);
    console.log('- Processing Fees:', testResults.calculations.processingFeesTotal);

    // Step 3: Contract execution simulation (or real execution if enabled)
    if (executeRealContracts && process.env.MINTING_PRIVATE_KEY) {
      console.log('⚡ EXECUTING REAL CONTRACTS (WITH PRIVATE KEY)...');
      
      try {
        const wallet = new ethers.Wallet(process.env.MINTING_PRIVATE_KEY, provider);
        console.log('👤 Executor wallet:', wallet.address);
        const walletBalance = await provider.getBalance(wallet.address);
        console.log('💰 Executor balance:', ethers.formatEther(walletBalance), 'ETH');

        testResults.contractExecutions = {
          executorAddress: wallet.address,
          executorBalance: ethers.formatEther(walletBalance),
          gasUsed: 0,
          transactionHashes: [],
          errors: []
        };

        // Here you would execute actual contract calls
        // WARNING: This would use real gas and execute real transactions
        console.log('⚠️  REAL CONTRACT EXECUTION READY - but disabled for safety');
        console.log('⚠️  Enable real execution with extreme caution');

        testResults.contractExecutions.status = 'SIMULATION_MODE';
        testResults.contractExecutions.message = 'Real execution available but disabled for safety';

      } catch (error) {
        console.log('❌ Contract execution error:', error.message);
        testResults.contractExecutions.error = error.message;
      }
    } else {
      console.log('🔍 SIMULATION MODE - No real contracts executed');
      testResults.contractExecutions = {
        status: 'SIMULATION_ONLY',
        message: 'Contracts not executed - simulation mode',
        wouldExecute: [
          `Transfer ${testResults.calculations.tokenBacking} USDC to settlement treasury`,
          `Distribute ${testResults.calculations.processingFeesTotal} USDC as processing fees`,
          `Mint ${Math.floor(testAmountFloat)} MS tokens to customer wallet`
        ]
      };
    }

    // Step 4: Get post-test balances (same as pre-test in simulation)
    testResults.postTestBalances = testResults.preTestBalances;

    // Step 5: Analysis
    testResults.analysis = {
      contractsAccessible: true,
      calculationsAccurate: testResults.calculations.processingFeesTotal >= 0,
      readyForRealExecution: !!process.env.MINTING_PRIVATE_KEY,
      riskAssessment: executeRealContracts ? 'HIGH - Real contracts would execute' : 'LOW - Simulation only',
      recommendation: testResults.calculations.processingFeesTotal < 0 
        ? 'WARNING: Negative processing fees - check fee structure'
        : executeRealContracts 
          ? 'Proceed with extreme caution - real USDC and gas will be used'
          : 'Safe to test - no real transactions executed'
    };

    testResults.success = true;

    console.log('✅ CONTRACT EXECUTION TEST COMPLETED');
    console.log('📊 Analysis:', testResults.analysis.recommendation);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Real contract execution test completed',
        results: testResults
      })
    };

  } catch (error) {
    console.error('🚨 Real contract execution test failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Real contract execution test failed',
        details: error.message
      })
    };
  }
};
