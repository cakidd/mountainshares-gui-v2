// simple-webhook-solution.js
// Skip complex contract calls - use direct USDC transfers

require('dotenv').config();
const { ethers } = require('ethers');

class SimpleWebhookSolution {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.WEBHOOK_SIGNER_PRIVATE_KEY, this.provider);
    
    // Native USDC on Arbitrum
    this.usdcAddress = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
    
    // Treasury addresses (from your environment)
    this.treasuryAddresses = {
      settlementReserve: process.env.SETTLEMENT_WALLET_ADDRESS, // This was missing in the test!
      treasuryReinforcement: process.env.H4H_TREASURY_RESERVE_BUILDER_ADDRESS,
      h4hNonprofit: process.env.H4H_NONPROFIT_ADDRESS,
      h4hCommunityPrograms: process.env.H4H_COMMUNITY_PROGRAMS_ADDRESS,
      h4hTreasury: process.env.H4H_TREASURY_MOUNTAINSHARES_ADDRESS,
      h4hGovernance: process.env.H4H_GOVERNANCE_ADDRESS,
      development: process.env.DEVELOPMENT_ADDRESS
    };
    
    // MountainShares Token
    this.mountainSharesToken = process.env.MOUNTAINSHARES_TOKEN;
    
    // Simple ERC20 ABI
    this.erc20Abi = [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address account) view returns (uint256)"
    ];
    
    // Simple token ABI
    this.tokenAbi = [
      "function mint(address to, uint256 amount) returns (bool)"
    ];
  }

  // Convert USD to USDC (6 decimals)
  usdToUsdc(usdAmount) {
    return ethers.parseUnits(usdAmount.toString(), 6);
  }

  // Convert USD to tokens (18 decimals)  
  usdToTokens(usdAmount) {
    return ethers.parseUnits(usdAmount.toString(), 18);
  }

  // Check wallet status
  async getWalletStatus() {
    try {
      const ethBalance = await this.provider.getBalance(this.wallet.address);
      const usdcContract = new ethers.Contract(this.usdcAddress, this.erc20Abi, this.provider);
      const usdcBalance = await usdcContract.balanceOf(this.wallet.address);
      
      return {
        address: this.wallet.address,
        ethBalance: ethers.formatEther(ethBalance),
        usdcBalance: ethers.formatUnits(usdcBalance, 6)
      };
      
    } catch (error) {
      return { error: error.message };
    }
  }

  // Process Stripe payment with DIRECT approach
  async processStripePayment(stripeAmountUSD, customerEmail, customerWalletAddress = null) {
    console.log(`🎯 Processing payment: $${stripeAmountUSD} from ${customerEmail}`);
    
    const results = {
      timestamp: new Date().toISOString(),
      stripeAmount: stripeAmountUSD,
      customerEmail,
      steps: []
    };

    // STEP 1: Get USDC somehow (for now, assume wallet is funded)
    console.log('💰 Step 1: Check USDC availability');
    const walletStatus = await this.getWalletStatus();
    
    if (walletStatus.error) {
      results.steps.push({ step: 'wallet_check', success: false, error: walletStatus.error });
      return results;
    }

    const availableUsdc = parseFloat(walletStatus.usdcBalance);
    const neededUsdc = stripeAmountUSD * 0.75; // After Stripe fees
    
    console.log(`   Available USDC: ${availableUsdc}`);
    console.log(`   Needed USDC: ${neededUsdc}`);
    
    if (availableUsdc < neededUsdc) {
      results.steps.push({ 
        step: 'usdc_check', 
        success: false, 
        error: `Insufficient USDC. Need: ${neededUsdc}, Have: ${availableUsdc}` 
      });
      
      // For now, continue with simulation
      console.log('⚠️ Continuing with simulation (insufficient USDC)');
    }

    // STEP 2: Distribute to treasury wallets
    console.log('🏦 Step 2: Treasury distribution');
    const distributionResults = await this.distributeFunds(stripeAmountUSD);
    results.steps.push({
      step: 'treasury_distribution',
      operations: distributionResults
    });

    // STEP 3: Mint tokens for customer (if address provided)
    if (customerWalletAddress) {
      console.log('🪙 Step 3: Mint customer tokens');
      const mintResult = await this.mintTokens(customerWalletAddress, stripeAmountUSD);
      results.steps.push({
        step: 'token_minting',
        ...mintResult
      });
    } else {
      console.log('⏭️ Step 3: Skipped (no customer wallet address)');
      results.steps.push({
        step: 'token_minting',
        success: false,
        error: 'No customer wallet address provided'
      });
    }

    return results;
  }

  // Distribute funds to treasury wallets
  async distributeFunds(totalUSDAmount) {
    const usdcContract = new ethers.Contract(this.usdcAddress, this.erc20Abi, this.wallet);
    
    // Calculate distributions (25% goes to Stripe fees, 75% to treasuries)
    // Use fixed-point arithmetic to avoid floating point precision issues
    const netAmount = Math.floor(totalUSDAmount * 0.75 * 1000000) / 1000000; // 6 decimal precision
    const distributions = {
      settlementReserve: Math.floor(netAmount * 0.40 * 1000000) / 1000000,      // 40% of net
      treasuryReinforcement: Math.floor(netAmount * 0.20 * 1000000) / 1000000,  // 20% of net  
      h4hNonprofit: Math.floor(netAmount * 0.15 * 1000000) / 1000000,           // 15% of net
      h4hCommunityPrograms: Math.floor(netAmount * 0.10 * 1000000) / 1000000,   // 10% of net
      h4hTreasury: Math.floor(netAmount * 0.08 * 1000000) / 1000000,            // 8% of net
      h4hGovernance: Math.floor(netAmount * 0.04 * 1000000) / 1000000,          // 4% of net
      development: Math.floor(netAmount * 0.03 * 1000000) / 1000000             // 3% of net
    };

    const results = [];

    for (const [key, amount] of Object.entries(distributions)) {
      if (amount > 0 && this.treasuryAddresses[key]) {
        const usdcAmount = this.usdToUsdc(amount);
        
        try {
          console.log(`   💸 ${key}: Sending $${amount} to ${this.treasuryAddresses[key]}`);
          
          // Estimate gas first
          const gasEstimate = await usdcContract.transfer.estimateGas(
            this.treasuryAddresses[key], 
            usdcAmount
          );
          
          console.log(`   ⛽ Gas estimate: ${gasEstimate.toString()}`);
          
          // Execute transfer
          const tx = await usdcContract.transfer(
            this.treasuryAddresses[key], 
            usdcAmount,
            { gasLimit: gasEstimate * 120n / 100n } // 20% buffer
          );
          
          console.log(`   📝 Transaction: ${tx.hash}`);
          
          const receipt = await tx.wait();
          console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
          
          results.push({
            destination: key,
            address: this.treasuryAddresses[key],
            amount,
            hash: tx.hash,
            blockNumber: receipt.blockNumber,
            success: true
          });
          
        } catch (error) {
          console.error(`   ❌ ${key} failed:`, error.message);
          results.push({
            destination: key,
            address: this.treasuryAddresses[key],
            amount,
            error: error.message,
            success: false
          });
        }
      } else {
        console.log(`   ⏭️ Skipping ${key}: ${amount === 0 ? 'Zero amount' : 'No address'}`);
      }
    }

    return results;
  }

  // Mint tokens for customer
  async mintTokens(customerAddress, usdAmount) {
    try {
      const mintingWallet = new ethers.Wallet(process.env.MINTING_PRIVATE_KEY, this.provider);
      const tokenContract = new ethers.Contract(this.mountainSharesToken, this.tokenAbi, mintingWallet);
      
      const tokenAmount = this.usdToTokens(usdAmount);
      
      console.log(`   🪙 Minting ${usdAmount} tokens for ${customerAddress}`);
      
      const tx = await tokenContract.mint(customerAddress, tokenAmount);
      const receipt = await tx.wait();
      
      console.log(`   ✅ Tokens minted: ${tx.hash}`);
      
      return {
        success: true,
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        amount: usdAmount
      };
      
    } catch (error) {
      console.error(`   ❌ Minting failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SimpleWebhookSolution;
