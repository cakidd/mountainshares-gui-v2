const { ethers } = require('ethers');

class ArbitrumUSDCConverter {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    this.signerPrivateKey = process.env.WEBHOOK_SIGNER_PRIVATE_KEY;
    this.wallet = new ethers.Wallet(this.signerPrivateKey, this.provider);
    
    // Native USDC on Arbitrum (Circle-issued)
    this.usdcAddress = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
    
    // Your existing smart contracts for purchase handling
    this.customerPurchaseContract = process.env.MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS;
    this.settlementWallet = process.env.SETTLEMENT_WALLET_ADDRESS;
    this.priceAggregator = process.env.MOCKV3_AGGREGATOR_ADDRESS;
    
    // Treasury addresses
    this.treasuryAddresses = {
      settlementReserve: process.env.SETTLEMENT_RESERVE_ADDRESS,
      treasuryReinforcement: process.env.H4H_TREASURY_RESERVE_BUILDER_ADDRESS,
      h4hNonprofit: process.env.H4H_NONPROFIT_ADDRESS,
      h4hCommunityPrograms: process.env.H4H_COMMUNITY_PROGRAMS_ADDRESS,
      h4hTreasury: process.env.H4H_TREASURY_MOUNTAINSHARES_ADDRESS,
      h4hGovernance: process.env.H4H_GOVERNANCE_ADDRESS,
      development: process.env.DEVELOPMENT_ADDRESS
    };
    
    // MountainShares Token
    this.mountainSharesToken = process.env.MOUNTAINSHARES_TOKEN;
    
    // Contract ABIs
    this.erc20Abi = [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address account) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)"
    ];
    
    this.tokenAbi = [
      "function mint(address to, uint256 amount) returns (bool)",
      "function totalSupply() view returns (uint256)"
    ];
    
    // Your existing purchase contract ABI (we need to check what functions it has)
    this.purchaseContractAbi = [
      "function processUSDPayment(uint256 usdAmount, address customer) external",
      "function convertUSDToUSDC(uint256 usdAmount) external returns (uint256)",
      "function distributeFunds(uint256 usdcAmount, address[] calldata recipients, uint256[] calldata amounts) external"
    ];
  }

  // Convert USD amount to USDC (6 decimals)
  usdToUsdc(usdAmount) {
    return ethers.parseUnits(usdAmount.toString(), 6);
  }

  // Convert USD to MountainShares tokens (18 decimals, 1:1 ratio)
  usdToTokens(usdAmount) {
    return ethers.parseUnits(usdAmount.toString(), 18);
  }

  // Check if your existing purchase contract can handle USD→USDC conversion
  async checkExistingPurchaseContract() {
    try {
      if (!this.customerPurchaseContract) {
        console.log('❌ No MS_TOKEN_CUSTOMER_PURCHASE_ADDRESS found');
        return false;
      }

      const purchaseContract = new ethers.Contract(
        this.customerPurchaseContract, 
        this.purchaseContractAbi, 
        this.provider
      );

      console.log(`🔍 Checking purchase contract: ${this.customerPurchaseContract}`);
      
      // Check if contract exists and has the functions we need
      const code = await this.provider.getCode(this.customerPurchaseContract);
      if (code === '0x') {
        console.log('❌ Purchase contract not deployed');
        return false;
      }

      console.log('✅ Purchase contract exists and is deployed');
      return true;
      
    } catch (error) {
      console.error('❌ Error checking purchase contract:', error);
      return false;
    }
  }

  // Option 1: Use your existing purchase contract (if it handles USD→USDC)
  async processUSDPaymentViaContract(usdAmount, customerAddress) {
    try {
      const purchaseContract = new ethers.Contract(
        this.customerPurchaseContract,
        this.purchaseContractAbi,
        this.wallet
      );

      console.log(`🔄 Processing $${usdAmount} USD payment via purchase contract`);
      
      const tx = await purchaseContract.processUSDPayment(
        this.usdToUsdc(usdAmount),
        customerAddress || ethers.ZeroAddress
      );
      
      console.log(`📝 Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ USD payment processed in block ${receipt.blockNumber}`);
      
      return {
        success: true,
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        method: 'existing_contract'
      };
      
    } catch (error) {
      console.error(`❌ Contract payment processing failed:`, error);
      return {
        success: false,
        error: error.message,
        method: 'existing_contract'
      };
    }
  }

  // Option 2: Manual DEX integration using Camelot/GMX
  async convertUSDToUSDCViaDEX(usdAmount) {
    try {
      // This would integrate with Camelot or GMX DEX
      // For now, this is a placeholder - you'd need to:
      // 1. Get current USD/USDC exchange rate
      // 2. Execute swap on DEX
      // 3. Return USDC amount received
      
      console.log(`🔄 Converting $${usdAmount} USD to USDC via DEX`);
      console.log('⚠️  DEX integration not yet implemented');
      
      // Simulated conversion (1:1 ratio for now)
      const usdcAmount = this.usdToUsdc(usdAmount);
      
      return {
        success: false, // Set to false until real DEX integration
        usdcAmount,
        error: 'DEX integration not implemented yet'
      };
      
    } catch (error) {
      console.error(`❌ DEX conversion failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Distribute USDC to treasury wallets
  async distributeTreasuryFunds(totalUSDAmount) {
    try {
      console.log(`🏦 Starting treasury distribution for $${totalUSDAmount}`);
      
      const usdcContract = new ethers.Contract(this.usdcAddress, this.erc20Abi, this.wallet);
      
      // Calculate distribution amounts (based on your current logic)
      const netAmount = totalUSDAmount * 0.75; // After Stripe fees
      const distributions = {
        settlementReserve: netAmount * 0.40,
        treasuryReinforcement: netAmount * 0.20,
        h4hNonprofit: netAmount * 0.15,
        h4hCommunityPrograms: netAmount * 0.10,
        h4hTreasury: netAmount * 0.08,
        h4hGovernance: netAmount * 0.04,
        development: netAmount * 0.03
      };

      const results = [];

      // Execute all transfers
      for (const [key, amount] of Object.entries(distributions)) {
        if (amount > 0 && this.treasuryAddresses[key]) {
          const usdcAmount = this.usdToUsdc(amount);
          
          try {
            const tx = await usdcContract.transfer(this.treasuryAddresses[key], usdcAmount);
            console.log(`✅ ${key}: $${amount} → ${tx.hash}`);
            
            const receipt = await tx.wait();
            results.push({
              destination: key,
              address: this.treasuryAddresses[key],
              amount,
              hash: tx.hash,
              blockNumber: receipt.blockNumber,
              success: true
            });
            
          } catch (error) {
            console.error(`❌ ${key} transfer failed:`, error);
            results.push({
              destination: key,
              address: this.treasuryAddresses[key],
              amount,
              error: error.message,
              success: false
            });
          }
        }
      }

      return results;
      
    } catch (error) {
      console.error(`❌ Treasury distribution failed:`, error);
      return [{ success: false, error: error.message }];
    }
  }

  // Main function: Process complete USD payment
  async processStripePayment(stripeAmount, customerEmail, customerAddress = null) {
    console.log(`🎯 Processing Stripe payment: $${stripeAmount}`);
    console.log(`👤 Customer: ${customerEmail}`);
    
    const results = {
      timestamp: new Date().toISOString(),
      stripeAmount,
      customerEmail,
      customerAddress,
      steps: []
    };

    // Step 1: Check if existing purchase contract can handle this
    const hasExistingContract = await this.checkExistingPurchaseContract();
    
    if (hasExistingContract) {
      console.log('🎯 Method 1: Using existing purchase contract');
      const contractResult = await this.processUSDPaymentViaContract(stripeAmount, customerAddress);
      results.steps.push({
        step: 'contract_processing',
        ...contractResult
      });
      
      if (contractResult.success) {
        console.log('✅ Payment processed successfully via existing contract!');
        return results;
      }
    }

    // Step 2: Manual conversion if contract method fails
    console.log('🎯 Method 2: Manual USD→USDC conversion + distribution');
    
    const conversionResult = await this.convertUSDToUSDCViaDEX(stripeAmount);
    results.steps.push({
      step: 'usd_to_usdc_conversion',
      ...conversionResult
    });

    if (conversionResult.success) {
      // Step 3: Distribute to treasury wallets
      const distributionResults = await this.distributeTreasuryFunds(stripeAmount);
      results.steps.push({
        step: 'treasury_distribution',
        operations: distributionResults
      });

      // Step 4: Mint tokens for customer (if address provided)
      if (customerAddress && this.mountainSharesToken) {
        const mintResult = await this.mintCustomerTokens(customerAddress, stripeAmount);
        results.steps.push({
          step: 'token_minting',
          ...mintResult
        });
      }
    }

    return results;
  }

  // Mint MountainShares tokens for customer
  async mintCustomerTokens(customerAddress, usdAmount) {
    try {
      const tokenContract = new ethers.Contract(
        this.mountainSharesToken,
        this.tokenAbi,
        new ethers.Wallet(process.env.MINTING_PRIVATE_KEY, this.provider)
      );
      
      const tokenAmount = this.usdToTokens(usdAmount);
      
      console.log(`🪙 Minting ${usdAmount} tokens for ${customerAddress}`);
      
      const tx = await tokenContract.mint(customerAddress, tokenAmount);
      const receipt = await tx.wait();
      
      console.log(`✅ Tokens minted: ${tx.hash}`);
      
      return {
        success: true,
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        amount: usdAmount
      };
      
    } catch (error) {
      console.error(`❌ Token minting failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get wallet balances for debugging
  async getWalletStatus() {
    try {
      const ethBalance = await this.provider.getBalance(this.wallet.address);
      const usdcContract = new ethers.Contract(this.usdcAddress, this.erc20Abi, this.provider);
      const usdcBalance = await usdcContract.balanceOf(this.wallet.address);
      
      return {
        address: this.wallet.address,
        ethBalance: ethers.formatEther(ethBalance),
        usdcBalance: ethers.formatUnits(usdcBalance, 6),
        hasExistingContract: await this.checkExistingPurchaseContract()
      };
      
    } catch (error) {
      console.error('❌ Error getting wallet status:', error);
      return { error: error.message };
    }
  }
}

module.exports = ArbitrumUSDCConverter;
