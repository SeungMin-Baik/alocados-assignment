// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

contract Lottery {

    /* ========== STATE VARIABLES ========== */
    address public manager;
    address[] public players;

    /* ========== INITIALIZER ========== */

    constructor() {}

    /* ========== MODIFIER ========== */

    modifier restricted() {
        require(manager == msg.sender, "Lottery: Sender is not manager");
        _;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function lottery() public {
        manager = msg.sender;
    }

    function enter() public payable {
        require(msg.value > .01 ether, "Lottery: Amount is less than 0.01");

        uint senderCount = 0;
        for (uint i = 0; i < players.length; i++) {
            if (players[i] == msg.sender) {
                senderCount++;
            }
        }

        require(senderCount < 3, "Lottery: A player can enter at most 3 times");

        players.push(msg.sender);
    }

    function pickWinner() public restricted {
        uint index = _random() % players.length;
        address winner = players[index];

        if (players.length > 2) {
            uint amount = address(this).balance / 3;

            _safeTransferETH(winner, amount);

            uint index1 = (index + players.length - 1) % players.length;
            uint index2 = (index + players.length - 2) % players.length;

            _safeTransferETH(players[index1], amount);
            _safeTransferETH(players[index2], amount);
        } else if (players.length == 2) {
            uint amount = address(this).balance / 2;

            _safeTransferETH(winner, amount);

            uint index1 = (index + players.length - 1) % players.length;

            _safeTransferETH(players[index1], amount);
        } else {
            _safeTransferETH(winner, address(this).balance);
        }

        players = new address[](0);
    }

    /* ========== PRIVATE FUNCTIONS ========== */

    function _random() private view returns (uint) {
        return uint(keccak256(abi.encode(block.timestamp, players)));
    }

    function _safeTransferETH(address receiver, uint amount) private {
        (bool success, ) = receiver.call{value: amount}(new bytes(0));
        require(success, "Lottery: ETH_TRANSFER_FAILED");
    }
}