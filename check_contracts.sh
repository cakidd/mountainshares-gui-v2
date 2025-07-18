#!/bin/bash

# MountainShares Contract Balance Checker
# Checks USDC balances and recent transactions for all treasury contracts

echo "🔍 MountainShares Treasury Contract Monitor"
echo "=========================================="

# Contract addresses
SETTLEMENT_RESERVE="0xF8F09E81aD1AB49ecdFC79A5DC52931f85DdFfd4"
TREASURY_BUILDER="0x0Db55E82bcC746F839A18Efb525C3a87BF2150da"
H4H_NONPROFIT="0xde75f5168e33db23fa5601b5fc88545be7b287a4"
H4H_COMMUNITY="0xf8c739a101e53f6fe4e24df768be833ceecefa84"
H4H_TREASURY="0x2b686a6c1c4b40ffc748b56b6c7a06c49e361167"
H4H_GOVERNANCE="0x8c09e686bdfd283bdf5f6fffc780e62a695014f3"
DEVELOPMENT="0xd8bb25076e61b5a382e17171b48d8e0952b5b4f3"
MOUNTAINSHARES_TOKEN="0xE8A9c6fFE6b2344147D886EcB8608C5F7863B20D"

# USDC contract address on Arbitrum
USDC_CONTRACT="0xA0b86a33E6441b8C87A6Af893B8fC57E8b03b28a"

# Arbitrum One RPC endpoint
RPC_URL="https://arb1.arbitrum.io/rpc"

# Function to get USDC balance
get_usdc_balance() {
    local address=$1
    local name=$2
    
    echo "📊 Checking $name ($address):"
    
    # Get USDC balance using eth_call
    local balance_hex=$(curl -s -X POST $RPC_URL \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\":\"2.0\",
            \"method\":\"eth_call\",
            \"params\":[{
                \"to\":\"$USDC_CONTRACT\",
                \"data\":\"0x70a08231000000000000000000000000${address#0x}\"
            },\"latest\"],
            \"id\":1
        }" | jq -r '.result')
    
    if [ "$balance_hex" != "null" ] && [ "$balance_hex" != "" ]; then
        # Convert hex to decimal (USDC has 6 decimals)
        local balance_wei=$(printf "%d" $balance_hex 2>/dev/null || echo "0")
        local balance_usdc=$(echo "scale=6; $balance_wei / 1000000" | bc -l)
        echo "   💰 USDC Balance: $balance_usdc"
    else
        echo "   ❌ Could not fetch balance"
    fi
    
    # Get recent transactions
    echo "   🔍 Recent transactions: https://arbiscan.io/address/$address"
    echo ""
}

# Function to check transaction count (to detect recent activity)
check_recent_activity() {
    local address=$1
    local name=$2
    
    local tx_count=$(curl -s -X POST $RPC_URL \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\":\"2.0\",
            \"method\":\"eth_getTransactionCount\",
            \"params\":[\"$address\",\"latest\"],
            \"id\":1
        }" | jq -r '.result')
    
    echo "📈 $name Transaction Count: $tx_count"
}

echo "⏰ Checking balances as of: $(date)"
echo "🔗 Network: Arbitrum One"
echo "💱 USDC Contract: $USDC_CONTRACT"
echo ""

# Check all contract balances
get_usdc_balance $SETTLEMENT_RESERVE "Settlement Reserve"
get_usdc_balance $TREASURY_BUILDER "Treasury Reinforcement" 
get_usdc_balance $H4H_NONPROFIT "H4H Nonprofit"
get_usdc_balance $H4H_COMMUNITY "H4H Community Programs"
get_usdc_balance $H4H_TREASURY "H4H Treasury"
get_usdc_balance $H4H_GOVERNANCE "H4H Governance"
get_usdc_balance $DEVELOPMENT "Development"

echo "🪙 MountainShares Token Contract:"
echo "   📋 Address: $MOUNTAINSHARES_TOKEN"
echo "   🔍 Check for minting: https://arbiscan.io/address/$MOUNTAINSHARES_TOKEN"
echo ""

echo "🔍 Quick Links for Manual Verification:"
echo "======================================"
echo "Settlement Reserve: https://arbiscan.io/address/$SETTLEMENT_RESERVE"
echo "Treasury Builder: https://arbiscan.io/address/$TREASURY_BUILDER"
echo "H4H Nonprofit: https://arbiscan.io/address/$H4H_NONPROFIT"
echo "H4H Community: https://arbiscan.io/address/$H4H_COMMUNITY"
echo "H4H Treasury: https://arbiscan.io/address/$H4H_TREASURY"
echo "H4H Governance: https://arbiscan.io/address/$H4H_GOVERNANCE"
echo "Development: https://arbiscan.io/address/$DEVELOPMENT"
echo "MS Token: https://arbiscan.io/address/$MOUNTAINSHARES_TOKEN"

echo ""
echo "📋 Test Transaction ID: ms_cs_test_1752118071657_1752118072341"
echo "⏰ Test Time: 2025-07-10T03:27:52.342Z"
