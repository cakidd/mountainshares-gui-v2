require('dotenv').config();
const { ethers } = require('ethers');

async function emergencyExtraction() {
  console.log('🚨 EMERGENCY FUND EXTRACTION ATTEMPT');
  console.log('===================================');
  
  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
  const wallet = new ethers.Wallet(process.env.WEBHOOK_SIGNER_PRIVATE_KEY, provider);
  
  console.log('🔍 Your current wallet:', wallet.address);
  console.log('🚨 Compromised contract: 0x5aed93B8B60674d2Cd993E610d5df5C21c71f863');
  
  // Try basic owner functions
  const contractABI = [
    "function owner() view returns (address)",
    "function withdraw() external",
    "function emergencyWithdraw() external",
    "function transferOwnership(address) external"
  ];
  
  const contract = new ethers.Contract(
    '0x5aed93B8B60674d2Cd993E610d5df5C21c71f863', 
    contractABI, 
    wallet
  );
  
  try {
    const owner = await contract.owner();
    console.log('👤 Contract owner:', owner);
    
    if (owner.toLowerCase() === wallet.address.toLowerCase()) {
      console.log('✅ You still own this contract!');
      console.log('🚨 But it will still pay to compromised address when called');
    } else {
      console.log('❌ You no longer own this contract');
    }
  } catch (error) {
    console.log('❌ Cannot check ownership:', error.message);
  }
}

emergencyExtraction().catch(console.error);
