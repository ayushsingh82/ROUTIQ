// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// Onchain identity for inference providers. A provider registers the address it wants to be paid at together with
/// the hash of its signed manifest (the same sha256 the ROUTIQ gateway verifies offchain). Agent vaults read
/// `isActive(payTo)` during Frame Transaction validation so an agent can only pay registered providers.
contract ProviderRegistry {
    struct Provider {
        address operator; // who may update the entry
        bytes32 manifestHash;
        string endpoint;
        bool active;
    }

    mapping(address payTo => Provider) public providers;

    event ProviderRegistered(address indexed payTo, address indexed operator, bytes32 manifestHash, string endpoint);
    event ProviderStatus(address indexed payTo, bool active);

    function register(address payTo, bytes32 manifestHash, string calldata endpoint) external {
        Provider storage p = providers[payTo];
        require(p.operator == address(0) || p.operator == msg.sender, "not operator");
        require(payTo != address(0), "zero payTo");
        p.operator = msg.sender;
        p.manifestHash = manifestHash;
        p.endpoint = endpoint;
        p.active = true;
        emit ProviderRegistered(payTo, msg.sender, manifestHash, endpoint);
    }

    function setActive(address payTo, bool active) external {
        require(providers[payTo].operator == msg.sender, "not operator");
        providers[payTo].active = active;
        emit ProviderStatus(payTo, active);
    }

    function isActive(address payTo) external view returns (bool) {
        return providers[payTo].active;
    }
}
