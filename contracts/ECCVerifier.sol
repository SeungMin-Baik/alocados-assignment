// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ECCVerifier is ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;

    /* ========== STATE VARIABLES ========== */
    struct SignatureData {
        bytes32 messageHash;
        bytes signature;
        address signer;
    }

    EnumerableSet.AddressSet private supportTokens;

    mapping(address => mapping(address => uint)) public balances; // user => token => balances
    mapping(bytes32 => SignatureData) public signatures; // signatureHash를 key로 사용

    /* ========== INITIALIZER ========== */
    receive() external payable {}

    constructor(address[] memory _supportTokens) {
        supportTokens.add(address(0));

        for(uint i = 0; i < _supportTokens.length; i++) {
            supportTokens.add(_supportTokens[i]);
        }
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    // signature hash => signer address
    function withdraw(bytes32 signatureHash, address token) external nonReentrant {
        require(signatures[signatureHash].signer == msg.sender, "ECCVerifier: No deposit history");

        if (balances[msg.sender][token] > 0) {
            _safeTransferToken(token, msg.sender, balances[msg.sender][token]);
        }

        balances[msg.sender][token] = 0;
    }

    function deposit(
        bytes32 message,
        bytes memory signature,
        address token,
        uint amount
    ) external payable nonReentrant {
        require(supportTokens.contains(token) == true, "ECCVerifier: Token is not supported");

        if (token == address(0)) {
            amount = msg.value;
        } else {
            (bool success, bytes memory data) = address(token).call(abi.encodeWithSelector(0x23b872dd, msg.sender, address(this), amount));
            require(success && (data.length == 0 || abi.decode(data, (bool))), "ECCVerifier: TRANSFER_FROM_FAILED");
        }

        bytes32 r;
        bytes32 s;
        uint8 v;
        bool valid;

        // Check the signature length
        if (signature.length != 65) {
            valid = false;
        }

        // Divide the signature in r, s and v variables
        assembly {
            r := mload(add (signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
        if (v < 27) {
            v += 27;
        }

        // If the version is correct return the signer address
        address signer;

        if (v != 27 && v != 28) {
            valid = false;
        } else {
            signer = ecrecover(message, v, r, s);
            valid = true;
        }

        require(valid == true, "ECCVerifier: Invalid Signature");

        bytes32 signatureHash = keccak256(abi.encodePacked(signature));

        signatures[signatureHash] = SignatureData(message, signature, signer);
        balances[signer][token] = amount;
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