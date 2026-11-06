// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BotUsernameRegistry
 * @notice Lightweight, gas-optimized on-chain username registry for Botchain (Chain ID 968).
 * @dev Enforces a strict 1-to-1 mapping between normalized usernames (3-20 chars, [a-z0-9_])
 *      and wallet addresses. Free of token, NFT, or fee requirements.
 */
contract BotUsernameRegistry {
    // Custom errors for gas efficiency and clear revert reasons
    error InvalidUsernameFormat();
    error UsernameAlreadyClaimed();
    error WalletAlreadyHasUsername();
    error WalletHasNoUsername();
    error SameUsername();

    // Primary mappings (gas-optimized storage)
    mapping(string => address) private _usernameToWallet;
    mapping(address => string) private _walletToUsername;
    mapping(string => uint64) private _usernameRegisteredAt;

    // Counter for active registered usernames
    uint256 public totalRegistered;

    // Events
    event UsernameClaimed(
        address indexed wallet,
        string username,
        uint256 timestamp
    );
    event UsernameChanged(
        address indexed wallet,
        string oldUsername,
        string newUsername,
        uint256 timestamp
    );
    event UsernameReleased(
        address indexed wallet,
        string releasedUsername,
        uint256 timestamp
    );

    /**
     * @notice Validates whether a username adheres to registry rules:
     *         - Length between 3 and 20 characters (bytes)
     *         - Only lowercase ASCII letters (a-z), digits (0-9), and underscores (_)
     * @param username The candidate username (without leading '@')
     * @return valid True if the format is valid
     */
    function isValidUsername(string calldata username) public pure returns (bool valid) {
        bytes calldata b = bytes(username);
        uint256 len = b.length;
        if (len < 3 || len > 20) {
            return false;
        }

        for (uint256 i = 0; i < len; ) {
            bytes1 char = b[i];
            bool isLowerAlpha = (char >= 0x61 && char <= 0x7A); // 'a' - 'z'
            bool isDigit = (char >= 0x30 && char <= 0x39);      // '0' - '9'
            bool isUnderscore = (char == 0x5F);                 // '_'

            if (!isLowerAlpha && !isDigit && !isUnderscore) {
                return false;
            }
            unchecked {
                ++i;
            }
        }
        return true;
    }

    /**
     * @notice Checks whether a username is valid and currently unclaimed.
     * @param username The username to check
     * @return available True if valid format and not owned by any wallet
     */
    function isAvailable(string calldata username) public view returns (bool available) {
        if (!isValidUsername(username)) {
            return false;
        }
        return _usernameToWallet[username] == address(0);
    }

    /**
     * @notice Claims an available username for msg.sender.
     *         Caller must not already own a username.
     * @param username The normalized username to claim (3-20 chars, [a-z0-9_])
     */
    function claimUsername(string calldata username) external {
        if (!isValidUsername(username)) {
            revert InvalidUsernameFormat();
        }
        if (_usernameToWallet[username] != address(0)) {
            revert UsernameAlreadyClaimed();
        }
        if (bytes(_walletToUsername[msg.sender]).length != 0) {
            revert WalletAlreadyHasUsername();
        }

        uint64 nowTs = uint64(block.timestamp);
        _usernameToWallet[username] = msg.sender;
        _walletToUsername[msg.sender] = username;
        _usernameRegisteredAt[username] = nowTs;

        unchecked {
            ++totalRegistered;
        }

        emit UsernameClaimed(msg.sender, username, nowTs);
    }

    /**
     * @notice Changes the caller's existing username to a new available username.
     *         Releases the previous username atomically.
     * @param newUsername The new normalized username to claim
     */
    function changeUsername(string calldata newUsername) external {
        string memory currentUsername = _walletToUsername[msg.sender];
        if (bytes(currentUsername).length == 0) {
            revert WalletHasNoUsername();
        }
        if (!isValidUsername(newUsername)) {
            revert InvalidUsernameFormat();
        }
        if (keccak256(bytes(currentUsername)) == keccak256(bytes(newUsername))) {
            revert SameUsername();
        }
        if (_usernameToWallet[newUsername] != address(0)) {
            revert UsernameAlreadyClaimed();
        }

        // Release old username
        delete _usernameToWallet[currentUsername];
        delete _usernameRegisteredAt[currentUsername];

        // Assign new username
        uint64 nowTs = uint64(block.timestamp);
        _usernameToWallet[newUsername] = msg.sender;
        _walletToUsername[msg.sender] = newUsername;
        _usernameRegisteredAt[newUsername] = nowTs;

        emit UsernameChanged(msg.sender, currentUsername, newUsername, nowTs);
    }

    /**
     * @notice Releases the caller's username so it becomes available again
     *         and the caller's wallet has no linked username.
     */
    function releaseUsername() external {
        string memory currentUsername = _walletToUsername[msg.sender];
        if (bytes(currentUsername).length == 0) {
            revert WalletHasNoUsername();
        }

        delete _usernameToWallet[currentUsername];
        delete _usernameRegisteredAt[currentUsername];
        delete _walletToUsername[msg.sender];

        unchecked {
            if (totalRegistered > 0) {
                --totalRegistered;
            }
        }

        emit UsernameReleased(msg.sender, currentUsername, block.timestamp);
    }

    /**
     * @notice Returns the wallet address connected to a given username.
     * @param username The username to look up
     * @return wallet Owner address, or address(0) if unclaimed
     */
    function getWallet(string calldata username) external view returns (address wallet) {
        return _usernameToWallet[username];
    }

    /**
     * @notice Returns the username connected to a given wallet address.
     * @param wallet The wallet address to look up
     * @return username Claimed username, or empty string "" if none
     */
    function getUsername(address wallet) external view returns (string memory username) {
        return _walletToUsername[wallet];
    }

    /**
     * @notice Returns the registration timestamp (Unix seconds) for a username.
     * @param username The username to query
     * @return registeredAt Unix timestamp when claimed/changed, or 0 if unclaimed
     */
    function getRegistrationTimestamp(string calldata username) external view returns (uint256 registeredAt) {
        return uint256(_usernameRegisteredAt[username]);
    }

    /**
     * @notice Fetches full profile details for a username in a single read call.
     * @param username The username to query
     * @return wallet Owner address
     * @return registeredAt Unix timestamp when registered
     * @return exists True if currently claimed
     */
    function getProfile(string calldata username)
        external
        view
        returns (
            address wallet,
            uint256 registeredAt,
            bool exists
        )
    {
        wallet = _usernameToWallet[username];
        registeredAt = uint256(_usernameRegisteredAt[username]);
        exists = (wallet != address(0));
    }

    /**
     * @notice Fetches full profile details for a wallet address in a single read call.
     * @param wallet The wallet address to query
     * @return username Claimed username
     * @return registeredAt Unix timestamp when registered
     * @return exists True if wallet owns a username
     */
    function getWalletProfile(address wallet)
        external
        view
        returns (
            string memory username,
            uint256 registeredAt,
            bool exists
        )
    {
        username = _walletToUsername[wallet];
        exists = bytes(username).length != 0;
        if (exists) {
            registeredAt = uint256(_usernameRegisteredAt[username]);
        }
    }
}

