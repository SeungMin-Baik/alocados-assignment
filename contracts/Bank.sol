// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Bank is ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    EnumerableSet.AddressSet public supportTokens;

    mapping(address => mapping(address => uint)) public balances; // user => token => balances
    mapping(address => mapping(address => uint)) public lastDepositTimestamp; // user => token => timestamp

    /* ========== INITIALIZER ========== */
    receive() external payable {}

    constructor(address[] memory _supportTokens) {
        supportTokens.add(address(0));

        for(uint i = 0; i < _supportTokens.length; i++) {
            supportTokens.add(_supportTokens[i]);
        }
    }

    /* ========== VIEW FUNCTIONS ========== */

    function amountOf(address user, address token) view external returns (uint) {
        return balances[user][token];
    }

    function rewards(address user, address token) view public returns (uint) {
        uint userAmount = balances[user][token];
        if (userAmount == 0 || lastDepositTimestamp[user][token] == 0) return 0;

        uint daysElapsed = (block.timestamp - lastDepositTimestamp[user][token]) / (24 * 60 * 60);
        if (daysElapsed == 0) return 0;

        uint total = userAmount * (uint(10002) ** daysElapsed) / (uint(10000) ** daysElapsed);

        return total - userAmount;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function deposit(address token, uint amount) external payable nonReentrant {
        require(supportTokens.contains(token) == true, "Bank: Token is not supported");

        if (token == address(0)) {
            amount = msg.value;
        }

        balances[msg.sender][token] = amount;
        lastDepositTimestamp[msg.sender][token] = block.timestamp;
    }

    function withdraw(address token, uint amount) external nonReentrant {
        require(supportTokens.contains(token) == true, "Bank: Token is not supported");
        require(balances[msg.sender][token] > 0, "Bank: Amount is not enough.");

        uint reward = rewards(msg.sender, token);

        _transferToken(token, msg.sender, balances[msg.sender][token] + reward);
    }

    /* ========== PRIVATE FUNCTIONS ========== */

    function _transferToken(address token, address receiver, uint amount) private {
        if (token == address(0)) {
            SafeERC20.safeTransferETH(receiver, amount);
        } else {
            IERC20(token).safeTransfer(receiver, amount);
        }
    }
}