require("@nomicfoundation/hardhat-ethers");
require('dotenv').config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: [process.env.WEBHOOK_SIGNER_PRIVATE_KEY],
      timeout: 60000
    },
    arbitrumOne: {
      url: process.env.ARBITRUM_RPC_URL,
      accounts: [process.env.WEBHOOK_SIGNER_PRIVATE_KEY]
    }
  }
};
