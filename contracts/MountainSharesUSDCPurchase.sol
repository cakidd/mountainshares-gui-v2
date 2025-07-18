// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IMountainSharesToken {
    function mint(address to, uint256 amount) external;
}

contract MountainSharesUSDCPurchase {
    
    // USDC token contract (Arbitrum native USDC) - FIXED CHECKSUM
    IERC20 public constant USDC = IERC20(0xaf88d065e77c8cC2239327C5EDb3A432268e5831);
    
    // MountainShares token contract
    IMountainSharesToken public mountainSharesToken;
    
    // Treasury wallet addresses
    address public settlementReserve;
    address public treasuryReinforcement;  
    address public h4hNonprofit;
    address public h4hCommunityPrograms;
    address public h4hTreasury;
    address public h4hGovernance;
    address public development;
    address public owner;
    
    // Fee percentage (1.25% = 125 basis points)
    uint256 public constant FEE_PERCENTAGE = 125; // 1.25%
    uint256 public constant BASIS_POINTS = 10000; // 100%
    
    // Distribution percentages (of the fee portion)
    uint256 public constant SETTLEMENT_PERCENTAGE = 40; // 40%
    uint256 public constant REINFORCEMENT_PERCENTAGE = 20; // 20%
    uint256 public constant NONPROFIT_PERCENTAGE = 15; // 15%
    uint256 public constant COMMUNITY_PERCENTAGE = 10; // 10%
    uint256 public constant TREASURY_PERCENTAGE = 8; // 8%
    uint256 public constant GOVERNANCE_PERCENTAGE = 4; // 4%
    uint256 public constant DEVELOPMENT_PERCENTAGE = 3; // 3%
    
    // Events
    event TokensPurchased(
        address indexed buyer,
        uint256 usdcAmount,
        uint256 tokensReceived,
        uint256 feeAmount,
        uint256 timestamp
    );
    
    event TreasuryDistribution(
        uint256 settlementAmount,
        uint256 reinforcementAmount,
        uint256 nonprofitAmount,
        uint256 communityAmount,
        uint256 treasuryAmount,
        uint256 governanceAmount,
        uint256 developmentAmount
    );
    
    constructor(
        address _mountainSharesToken,
        address _settlementReserve,
        address _treasuryReinforcement,
        address _h4hNonprofit,
        address _h4hCommunityPrograms,
        address _h4hTreasury,
        address _h4hGovernance,
        address _development
    ) {
        mountainSharesToken = IMountainSharesToken(_mountainSharesToken);
        settlementReserve = _settlementReserve;
        treasuryReinforcement = _treasuryReinforcement;
        h4hNonprofit = _h4hNonprofit;
        h4hCommunityPrograms = _h4hCommunityPrograms;
        h4hTreasury = _h4hTreasury;
        h4hGovernance = _h4hGovernance;
        development = _development;
        owner = msg.sender;
    }
    
    /**
     * @dev Purchase MountainShares tokens with USDC
     * @param usdcAmount Amount of USDC to spend (6 decimals)
     */
    function purchaseWithUSDC(uint256 usdcAmount) external {
        require(usdcAmount > 0, "Amount must be greater than 0");
        
        // Transfer USDC from user to this contract
        require(
            USDC.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC transfer failed"
        );
        
        // Calculate fee and net amount
        uint256 feeAmount = (usdcAmount * FEE_PERCENTAGE) / BASIS_POINTS;
        uint256 netAmount = usdcAmount - feeAmount;
        
        // Distribute fees to treasury wallets
        _distributeFees(feeAmount);
        
        // Calculate tokens to mint (1:1 ratio with net USD amount)
        // USDC has 6 decimals, MountainShares tokens have 18 decimals
        uint256 tokensToMint = netAmount * 1e12; // Convert from 6 to 18 decimals
        
        // Mint tokens to buyer
        mountainSharesToken.mint(msg.sender, tokensToMint);
        
        emit TokensPurchased(
            msg.sender,
            usdcAmount,
            tokensToMint,
            feeAmount,
            block.timestamp
        );
    }
    
    /**
     * @dev Internal function to distribute fees to treasury wallets
     */
    function _distributeFees(uint256 totalFee) internal {
        uint256 settlementAmount = (totalFee * SETTLEMENT_PERCENTAGE) / 100;
        uint256 reinforcementAmount = (totalFee * REINFORCEMENT_PERCENTAGE) / 100;
        uint256 nonprofitAmount = (totalFee * NONPROFIT_PERCENTAGE) / 100;
        uint256 communityAmount = (totalFee * COMMUNITY_PERCENTAGE) / 100;
        uint256 treasuryAmount = (totalFee * TREASURY_PERCENTAGE) / 100;
        uint256 governanceAmount = (totalFee * GOVERNANCE_PERCENTAGE) / 100;
        uint256 developmentAmount = (totalFee * DEVELOPMENT_PERCENTAGE) / 100;
        
        // Transfer to each treasury wallet
        USDC.transfer(settlementReserve, settlementAmount);
        USDC.transfer(treasuryReinforcement, reinforcementAmount);
        USDC.transfer(h4hNonprofit, nonprofitAmount);
        USDC.transfer(h4hCommunityPrograms, communityAmount);
        USDC.transfer(h4hTreasury, treasuryAmount);
        USDC.transfer(h4hGovernance, governanceAmount);
        USDC.transfer(development, developmentAmount);
        
        emit TreasuryDistribution(
            settlementAmount,
            reinforcementAmount,
            nonprofitAmount,
            communityAmount,
            treasuryAmount,
            governanceAmount,
            developmentAmount
        );
    }
}
