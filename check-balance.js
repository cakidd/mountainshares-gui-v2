require('dotenv').config();
const { ethers } = require('ethers');

async function checkBalance() {
  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
  const address = "0xBf1bD0A0DA1B64Ec6128B91a39AD8a0c88B83330";
  
  const balance = await provider.getBalance(address);
  const balanceETH = ethers.formatEther(balance);
  const balanceWei = balance.toString();
  
  console.log("💰 Wallet Balance Check:");
  console.log("📍 Address:", address);
  console.log("⛽ Balance:", balanceETH, "ETH");
  console.log("🔢 Wei:", balanceWei);
  console.log("💵 USD Value:", (parseFloat(balanceETH) * 2770).toFixed(6), "USD");
  
  // Show how much more needed for deployment
  const neededWei = "21858090468750"; // Last gas requirement
  const deficit = BigInt(neededWei) - BigInt(balanceWei);
  console.log("🎯 Need for deployment:", ethers.formatEther(deficit.toString()), "ETH");
}

checkBalance().catch(console.error);
