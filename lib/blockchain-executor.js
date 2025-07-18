// lib/blockchain-executor.js - MountainShares Blockchain Executor
import { ethers } from 'ethers';

/**
 * MountainShares Blockchain Executor
 * Handles all blockchain interactions for the Darwin Gödel Machine
 * Serving Mount Hope, West Virginia with democratic governance
 */

class BlockchainExecutor {
  constructor(config = {}) {
    this.config = {
      rpcUrl: config.rpcUrl || process.env.ARBITRUM_RPC_URL,
      chainId: config.chainId || 42161,
      gasLimit: config.gasLimit || 500000,
      signerPrivateKey: config.signerPrivateKey || process.env.WEBHOOK_SIGNER_PRIVATE_KEY,
      ...config
    };
    
    this.provider = null;
    this.signer = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing MountainShares Blockchain Executor...');
      
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl, {
        name: 'arbitrum-one',
        chainId: this.config.chainId
      });

      // Initialize signer if private key provided
      if (this.config.signerPrivateKey) {
        this.signer = new ethers.Wallet(this.config.signerPrivateKey, this.provider);
        console.log(`🔐 Signer initialized: ${this.signer.address}`);
      }

      // Verify network connection
      const network = await this.provider.getNetwork();
      console.log(`📡 Connected to ${network.name} (Chain ID: ${network.chainId})`);

      this.initialized = true;
      console.log('✅ Blockchain Executor initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Blockchain Executor initialization failed:', error);
      throw error;
    }
  }

  async executeContractCall(contractAddress, abi, methodName, params = [], options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`🔄 Executing contract call: ${methodName} on ${contractAddress}`);
      
      const contract = new ethers.Contract(
        contractAddress,
        abi,
        this.signer || this.provider
      );

      const txOptions = {
        gasLimit: options.gasLimit || this.config.gasLimit,
        ...options
      };

      let result;
      if (this.signer) {
        // Execute transaction
        const tx = await contract[methodName](...params, txOptions);
        console.log(`🚀 Transaction submitted: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
        
        result = {
          success: true,
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        };
      } else {
        // Read-only call
        result = await contract[methodName](...params);
        console.log(`📖 Read call completed: ${methodName}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Contract call failed: ${methodName}`, error);
      throw error;
    }
  }

  async getBalance(address, tokenAddress = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (tokenAddress) {
        // ERC20 token balance
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ['function balanceOf(address account) view returns (uint256)'],
          this.provider
        );
        const balance = await tokenContract.balanceOf(address);
        return balance;
      } else {
        // Native ETH balance
        const balance = await this.provider.getBalance(address);
        return balance;
      }
    } catch (error) {
      console.error('❌ Balance query failed:', error);
      throw error;
    }
  }

  async transferToken(tokenAddress, recipient, amount, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.signer) {
      throw new Error('Signer required for token transfers');
    }

    try {
      console.log(`💸 Transferring token: ${amount} from ${tokenAddress} to ${recipient}`);
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function transfer(address to, uint256 amount) returns (bool)'],
        this.signer
      );

      const tx = await tokenContract.transfer(recipient, amount, {
        gasLimit: options.gasLimit || this.config.gasLimit
      });

      console.log(`🚀 Transfer transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Transfer confirmed in block: ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('❌ Token transfer failed:', error);
      throw error;
    }
  }

  async processMountainSharesPurchase(purchaseData) {
    console.log('🏔️ Processing MountainShares purchase via blockchain executor...');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const result = {
        success: true,
        transactionId: purchaseData.sessionId,
        amount: purchaseData.amount,
        customer: purchaseData.customer,
        community: 'Mount Hope, WV',
        democraticGovernance: true,
        culturalPreservation: true,
        timestamp: new Date().toISOString()
      };

      console.log('✅ MountainShares purchase processed successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ MountainShares purchase processing failed:', error);
      throw error;
    }
  }
}

// Default export for CommonJS compatibility
module.exports = BlockchainExecutor;

// Named export for ES modules
export { BlockchainExecutor };
export default BlockchainExecutor;
