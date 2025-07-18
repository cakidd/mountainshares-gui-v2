// simple-webhook-solution.js
// CORRECTED - Accurate MountainShares distribution logic

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
      settlementReserve: process.env.SETTLEMENT_WALLET_ADDRESS,
      h4hTreasuryReserve: process.env.H4H_TREASURY_RESERVE_BUILDER_ADDRESS,
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

    // Business logic constants
    this.PROCESSING_FEE_RATE = 0.02;     // 2%
    this.REINFORCEMENT_FEE_RATE = 0.005; // 0.5%
  }

  // Convert USD to USDC (6 decimals)
  usdToUsdc(usdAmount) {
    return ethers.parseUnits(usdAmount.toFixed(6), 6);
  }

  // Convert USD to tokens (18 decimals)
  usdToTokens(usdAmount) {
    return ethers.parseUnits(usdAmount.toFixed(18), 18);
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

  // Process Stripe payment with CORRECTED distribution logic
  async processStripePayment(stripeNetAmountUSD, customerEmail, customerWalletAddress = null) {
    console.log(`🎯 Processing payment: $${stripeNetAmountUSD} from ${customerEmail}`);

    const results = {
      timestamp: new Date().toISOString(),
      stripeNetAmount: stripeNetAmountUSD,
      customerEmail,
      steps: []
    };

    // STEP 1: Check USDC availability
    console.log('💰 Step 1: Check USDC availability');
    const walletStatus = await this.getWalletStatus();

    if (walletStatus.error) {
      results.steps.push({ step: 'wallet_check', success: false, error: walletStatus.error });
      return results;
    }

    const availableUsdc = parseFloat(walletStatus.usdcBalance);
    console.log(`   Available USDC: ${availableUsdc}`);
    console.log(`   Needed USDC: ${stripeNetAmountUSD}`);

    if (availableUsdc < stripeNetAmountUSD) {
      results.steps.push({
        step: 'usdc_check',
        success: false,
        error: `Insufficient USDC. Need: ${stripeNetAmountUSD}, Have: ${availableUsdc}`
      });

      console.log('⚠️ Continuing with simulation (insufficient USDC)');
    }

    // STEP 2: Distribute to treasury wallets with CORRECT math
    console.log('🏦 Step 2: Treasury distribution (CORRECTED)');
    const distributionResults = await this.distributeFunds(stripeNetAmountUSD);
    results.steps.push({
      step: 'treasury_distribution',
      operations: distributionResults
    });

    // STEP 3: Mint tokens for customer (if address provided)
    if (customerWalletAddress) {
      console.log('🪙 Step 3: Mint customer tokens');
      
      // Calculate settlement amount for token minting (97.5% of net)
      const processingFee = stripeNetAmountUSD * this.PROCESSING_FEE_RATE;
      const reinforcementFee = stripeNetAmountUSD * this.REINFORCEMENT_FEE_RATE;
      const settlementAmount = stripeNetAmountUSD - processingFee - reinforcementFee;
      
      const mintResult = await this.mintTokens(customerWalletAddress, settlementAmount);
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

  // Distribute funds with CORRECTED math
  async distributeFunds(stripeNetAmountUSD) {
    const usdcContract = new ethers.Contract(this.usdcAddress, this.erc20Abi, this.wallet);

    console.log(`📊 Calculating distribution for: $${stripeNetAmountUSD}`);

    // CORRECTED - Calculate fees precisely
    const processingFeeTotal = stripeNetAmountUSD * this.PROCESSING_FEE_RATE;        // 2%
    const reinforcementFee = stripeNetAmountUSD * this.REINFORCEMENT_FEE_RATE;       // 0.5%
    const settlementAmount = stripeNetAmountUSD - processingFeeTotal - reinforcementFee; // 97.5%

    console.log(`   Processing Fee Total: $${processingFeeTotal.toFixed(6)} (2%)`);
    console.log(`   Reinforcement Fee: $${reinforcementFee.toFixed(6)} (0.5%)`);
    console.log(`   Settlement Reserve: $${settlementAmount.toFixed(6)} (97.5%)`);

    // CORRECTED - Processing fee distribution (split 5 ways)
    const distributions = {
      settlementReserve: settlementAmount,                    // 97.5%
      h4hNonprofit: processingFeeTotal * 0.30,               // 0.6% (30% of 2%)
      h4hTreasuryReserve: processingFeeTotal * 0.30,         // 0.6% (30% of 2%)
      h4hCommunityPrograms: processingFeeTotal * 0.15,       // 0.3% (15% of 2%)
      development: processingFeeTotal * 0.15,                // 0.3% (15% of 2%)
      h4hGovernance: processingFeeTotal * 0.10,              // 0.2% (10% of 2%)
      reinforcement: reinforcementFee                         // 0.5%
    };

    // Validate math
    const totalDistributed = Object.values(distributions).reduce((sum, amount) => sum + amount, 0);
    if (Math.abs(totalDistributed - stripeNetAmountUSD) > 0.000001) {
      throw new Error(`Distribution math error: ${totalDistributed} !== ${stripeNetAmountUSD}`);
    }

    console.log(`✅ Math validated: Total distributed = $${totalDistributed.toFixed(6)}`);

    const results = [];

    // Execute transfers
    for (const [key, amount] of Object.entries(distributions)) {
      // Map keys to treasury addresses
      let addressKey = key;
      if (key === 'reinforcement') addressKey = 'h4hTreasuryReserve'; // Reinforcement goes to treasury reserve
      if (key === 'h4hCommunityPrograms') addressKey = 'h4hCommunityPrograms';

      const walletAddress = this.treasuryAddresses[addressKey];

      if (amount > 0 && walletAddress) {
        const usdcAmount = this.usdToUsdc(amount);

        try {
          console.log(`   💸 ${key}: Sending $${amount.toFixed(6)} to ${walletAddress}`);

          // Estimate gas first
          const gasEstimate = await usdcContract.transfer.estimateGas(walletAddress, usdcAmount);
          console.log(`   ⛽ Gas estimate: ${gasEstimate.toString()}`);

          // Execute transfer
          const tx = await usdcContract.transfer(
            walletAddress,
            usdcAmount,
            { gasLimit: gasEstimate * 120n / 100n } // 20% buffer
          );

          console.log(`   📝 Transaction: ${tx.hash}`);

          const receipt = await tx.wait();
          console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

          results.push({
            destination: key,
            address: walletAddress,
            amount: amount,
            amountFormatted: `$${amount.toFixed(6)}`,
            hash: tx.hash,
            blockNumber: receipt.blockNumber,
            success: true
          });

        } catch (error) {
          console.error(`   ❌ ${key} failed:`, error.message);
          results.push({
            destination: key,
            address: walletAddress,
            amount: amount,
            amountFormatted: `$${amount.toFixed(6)}`,
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

  // Mint tokens for customer (1:1 with settlement amount)
  async mintTokens(customerAddress, settlementAmountUSD) {
    try {
      const mintingWallet = new ethers.Wallet(process.env.MINTING_PRIVATE_KEY, this.provider);
      const tokenContract = new ethers.Contract(this.mountainSharesToken, this.tokenAbi, mintingWallet);

      const tokenAmount = this.usdToTokens(settlementAmountUSD);

      console.log(`   🪙 Minting ${settlementAmountUSD.toFixed(6)} MS tokens for ${customerAddress}`);
      console.log(`   📊 Token amount: ${ethers.formatEther(tokenAmount)} MS`);

      const tx = await tokenContract.mint(customerAddress, tokenAmount);
      const receipt = await tx.wait();

      console.log(`   ✅ Tokens minted: ${tx.hash}`);

      return {
        success: true,
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        amount: settlementAmountUSD,
        tokenAmount: ethers.formatEther(tokenAmount)
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
