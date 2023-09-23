// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Bank is ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;

    /* ========== STATE VARIABLES ========== */

    EnumerableSet.AddressSet private supportTokens;

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

        uint daysElapsed = (block.timestamp - lastDepositTimestamp[user][token]) / (60 * 60 * 24);
        if (daysElapsed == 0) return 0;
        if (daysElapsed > 30) daysElapsed = 30;

        uint total = userAmount * (uint(102) ** daysElapsed) / (uint(100) ** daysElapsed);

        return total - userAmount;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function deposit(address token, uint amount) external payable nonReentrant {
        require(supportTokens.contains(token) == true, "Bank: Token is not supported");

        if (token == address(0)) {
            amount = msg.value;
        } else {
            (bool success, bytes memory data) = address(token).call(abi.encodeWithSelector(0x23b872dd, msg.sender, address(this), amount));
            require(success && (data.length == 0 || abi.decode(data, (bool))), "Bank: TRANSFER_FROM_FAILED");
        }

        balances[msg.sender][token] += amount;
        lastDepositTimestamp[msg.sender][token] = block.timestamp;
    }

    function withdraw(address token) external nonReentrant {
        require(supportTokens.contains(token) == true, "Bank: Token is not supported");
        require(balances[msg.sender][token] > 0, "Bank: Amount is not enough.");

        uint reward = rewards(msg.sender, token);

        _safeTransferToken(token, msg.sender, balances[msg.sender][token] + reward);

        balances[msg.sender][token] = 0;
        lastDepositTimestamp[msg.sender][token] = 0;
    }

    /* ========== PRIVATE FUNCTIONS ========== */

    function _safeTransferToken(address token, address receiver, uint amount) private {
        if (token == address(0)) {
            (bool success, ) = receiver.call{value: amount}(new bytes(0));
            require(success, "Bank: ETH_TRANSFER_FAILED");
        } else {
            (bool success, bytes memory data) = address(token).call(abi.encodeWithSelector(0xa9059cbb, receiver, amount));
            require(success && (data.length == 0 || abi.decode(data, (bool))), "Bank: TRANSFER_FAILED");
        }
    }
}