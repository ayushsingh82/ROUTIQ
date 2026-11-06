// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HegotaSupport, Devnet, Scope, TxParam, FrameParam, FrameMode} from "@forshtat/hegota-support/contracts/HegotaSupport.sol";
import {IERC20Min} from "./IERC20Min.sol";

/// Pays an agent's gas and is repaid in an ERC-20.
///
/// Transaction shape:  [0] VERIFY(vault)            approves EXECUTION
///                     [1] VERIFY(paymaster)        this contract's fallback, approves PAYMENT
///                     [2] SENDER(vault.pay(...))   the actual inference payment
///                     [3] SENDER(vault.payFee(paymaster, fee))   repays the paymaster in tokens
/// The paymaster only approves when frame 3 really pays it at least `maxCost * tokensPerEth` and the sender holds
/// enough tokens. It reads the token's storage during validation, so on the Alternative Mempool it must be a staked
/// entity (see docs.altmempool.wtf / Staking).
contract TokenPaymaster is HegotaSupport(Devnet.ERC8421_WORKSHOP) {
    address public immutable owner;
    IERC20Min public immutable token;
    uint256 public tokensPerEth; // token base units per 1e18 wei

    bytes4 private constant PAY_FEE = bytes4(keccak256("payFee(address,uint256)"));

    error Rejected(string reason);

    /// Payable so the paymaster can be funded with ETH at creation (a plain transfer would run `fallback`).
    constructor(address owner_, IERC20Min token_, uint256 tokensPerEth_) payable {
        owner = owner_;
        token = token_;
        tokensPerEth = tokensPerEth_;
    }

    function setRate(uint256 tokensPerEth_) external {
        require(msg.sender == owner, "owner");
        tokensPerEth = tokensPerEth_;
    }

    function withdraw(address to, uint256 amount) external {
        require(msg.sender == owner, "owner");
        require(token.transfer(to, amount), "transfer");
    }

    fallback() external {
        uint256 cur = txparam(TxParam.CURRENT_FRAME_INDEX);
        if (FrameMode(frameparam(cur, FrameParam.MODE)) != FrameMode.VERIFY) revert Rejected("only VERIFY");

        address sender = address(uint160(txparam(TxParam.SENDER)));
        uint256 required = (txparam(TxParam.MAX_COST) * tokensPerEth + 1e18 - 1) / 1e18;

        uint256 n = txparam(TxParam.FRAME_COUNT);
        uint256 repaid;
        for (uint256 i = cur + 1; i < n; i++) {
            if (FrameMode(frameparam(i, FrameParam.MODE)) != FrameMode.SENDER) continue;
            if (address(uint160(frameparam(i, FrameParam.RESOLVED_TARGET))) != sender) continue;
            if (frameparam(i, FrameParam.DATA_LENGTH) != 68) continue;
            bytes memory d = framedatacopy(0, 68, i);
            bytes4 sel;
            address to;
            uint256 amount;
            assembly {
                sel := mload(add(d, 32))
                to := mload(add(d, 36))
                amount := mload(add(d, 68))
            }
            if (sel == PAY_FEE && to == address(this)) repaid += amount;
        }
        if (repaid < required) revert Rejected("fee not repaid in tokens");
        if (token.balanceOf(sender) < required) revert Rejected("sender cannot cover fee");
        approve(Scope.PAYMENT);
    }
}
