const { ethers } = require('ethers');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const BACKBONE_ABI = [
  'function coordinateCustomerPurchase() external payable',
  'function coordinateTokenMint(address recipient, uint256 amount, string reason) external',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function paused() view returns (bool)',
  'function owner() view returns (address)'
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { testType = 'mint', recipient, amount = 1 } = JSON.parse(event.body || '{}');
    
    console.log('🧪 TESTING DIRECT CONTRACT EXECUTION');
    console.log('Test type:', testType);
    console.log('Recipient:', recipient);
    console.log('Amount:', amount);
    
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const signer = new ethers.Wallet(process.env.MINTING_PRIVATE_KEY, provider);
    
    const signerAddress = await signer.getAddress();
    const balance = await provider.getBalance(signerAddress);
    
    console.log('🔑 Signer address:', signerAddress);
    console.log('💰 Signer balance:', ethers.formatEther(balance), 'ETH');
    
    const backboneContract = new ethers.Contract(
      '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f',
      BACKBONE_ABI,
      signer
    );
    
    const results = {
      signerAddress,
      signerBalance: ethers.formatEther(balance),
      contractAddress: '0x746dD4D401ce5Bbb0Fc964E1a7b4470619dBf67f',
      testType,
      execution: {}
    };

    // Check contract state first
    try {
      const isPaused = await backboneContract.paused();
      results.contractPaused = isPaused;
      console.log('⏸️ Contract paused:', isPaused);
      
      if (isPaused) {
        throw new Error('Contract is paused - cannot execute transactions');
      }
    } catch (error) {
      console.log('ℹ️ Could not check pause status:', error.message);
    }

    // Test token minting
    if (testType === 'mint' && recipient) {
      try {
        console.log('🏔️ Testing coordinateTokenMint...');
        
        const estimatedGas = await backboneContract.coordinateTokenMint.estimateGas(
          recipient,
          amount,
          'Test mint via API'
        );
        
        console.log('⛽ Estimated gas:', estimatedGas.toString());
        
        const tx = await backboneContract.coordinateTokenMint(
          recipient,
          amount,
          'Test mint via API',
          { 
            gasLimit: estimatedGas * 12n / 10n, // 20% buffer
            maxFeePerGas: ethers.parseUnits('0.1', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('0.01', 'gwei')
          }
        );
        
        console.log('✅ Transaction sent:', tx.hash);
        results.execution.mint = {
          status: 'success',
          txHash: tx.hash,
          estimatedGas: estimatedGas.toString()
        };
        
      } catch (error) {
        console.error('❌ Token minting failed:', error.message);
        results.execution.mint = {
          status: 'failed',
          error: error.message,
          code: error.code,
          reason: error.reason
        };
      }
    }

    // Test customer purchase coordination
    if (testType === 'purchase') {
      try {
        console.log('💰 Testing coordinateCustomerPurchase...');
        
        const estimatedGas = await backboneContract.coordinateCustomerPurchase.estimateGas({
          value: ethers.parseEther('0.001') // Small test amount
        });
        
        console.log('⛽ Estimated gas:', estimatedGas.toString());
        
        const tx = await backboneContract.coordinateCustomerPurchase({
          value: ethers.parseEther('0.001'),
          gasLimit: estimatedGas * 12n / 10n,
          maxFeePerGas: ethers.parseUnits('0.1', 'gwei'),
          maxPriorityFeePerGas: ethers.parseUnits('0.01', 'gwei')
        });
        
        console.log('✅ Transaction sent:', tx.hash);
        results.execution.purchase = {
          status: 'success',
          txHash: tx.hash,
          estimatedGas: estimatedGas.toString()
        };
        
      } catch (error) {
        console.error('❌ Customer purchase failed:', error.message);
        results.execution.purchase = {
          status: 'failed',
          error: error.message,
          code: error.code,
          reason: error.reason
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        testResults: results,
        message: 'Direct contract execution test completed'
      })
    };

  } catch (error) {
    console.error('❌ Direct contract test failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Direct contract test failed',
        details: error.message
      })
    };
  }
};
