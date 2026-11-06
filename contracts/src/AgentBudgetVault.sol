// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HegotaSupport, Devnet, Scope, TxParam, FrameParam, FrameMode, SigParam} from "@forshtat/hegota-support/contracts/HegotaSupport.sol";
import {IERC20Min, IProviderRegistry} from "./IERC20Min.sol";

/// An AI agent's spending account (EIP-8141 smart account).
///
/// Every transaction the account sends is a Frame Transaction. The VERIFY frame (this contract's `fallback`) approves
/// execution only if
///   1. the signature resolves to `owner` (the agent's key),
///   2. every later SENDER frame is one of `pay(provider, amount)` / `payFee(paymaster, amount)` on this account,
///   3. `provider` is active in the ProviderRegistry          <- reads another contract's storage (staked entity),
///   4. `amount` <= perRequestCap and today's spend + amount <= dailyQuota.
/// VERIFY frames are static, so the quota is *committed* by the SENDER frame (`pay`), which re-checks every rule and
/// reverts on violation. A request that breaks a rule is therefore rejected before it is ever included.
contract AgentBudgetVault is HegotaSupport(Devnet.ERC8421_WORKSHOP) {
    address public immutable owner; // the agent's signing key
    IERC20Min public immutable token;
    IProviderRegistry public immutable registry;
    address public immutable paymaster; // the only address payFee may pay (address(0) = no sponsored gas)

    uint256 public perRequestCap;
    uint256 public dailyQuota;
    uint256 public spentToday;
    uint256 public day;

    event Paid(address indexed provider, uint256 amount, uint256 spentToday);
    event FeePaid(address indexed paymaster, uint256 amount);
    event PolicyChanged(uint256 perRequestCap, uint256 dailyQuota);

    error Policy(string reason);

    bytes4 private constant PAY = bytes4(keccak256("pay(address,uint256)"));
    bytes4 private constant NEW_DAY = bytes4(keccak256("newDay()"));
    bytes4 private constant PAY_FEE = bytes4(keccak256("payFee(address,uint256)"));

    constructor(address owner_, IERC20Min token_, IProviderRegistry registry_, address paymaster_, uint256 perRequestCap_, uint256 dailyQuota_) payable {
        owner = owner_;
        token = token_;
        registry = registry_;
        paymaster = paymaster_;
        perRequestCap = perRequestCap_;
        dailyQuota = dailyQuota_;
        day = block.timestamp / 1 days;
    }

    // ------------------------------------------------------------------------------- SENDER-frame entry points

    function pay(address provider, uint256 amount) external {
        require(msg.sender == address(this), "self only");
        _checkPay(provider, amount, _spentNow());
        _rollDay();
        spentToday += amount;
        require(token.transfer(provider, amount), "transfer");
        emit Paid(provider, amount, spentToday);
    }

    function payFee(address to, uint256 amount) external {
        require(msg.sender == address(this), "self only");
        require(to == paymaster && to != address(0), "paymaster");
        require(token.transfer(to, amount), "transfer");
        emit FeePaid(to, amount);
    }

    /// Starts a new accounting day (SENDER frame; VERIFY cannot read the clock).
    function newDay() external {
        require(msg.sender == address(this), "self only");
        _rollDay();
    }

    /// Only the agent's own signature (checked in VERIFY by a self-call) may change the policy.
    function setPolicy(uint256 perRequestCap_, uint256 dailyQuota_) external {
        require(msg.sender == address(this), "self only");
        perRequestCap = perRequestCap_;
        dailyQuota = dailyQuota_;
        emit PolicyChanged(perRequestCap_, dailyQuota_);
    }

    function remainingToday() public view returns (uint256) {
        uint256 s = _spentNow();
        return dailyQuota > s ? dailyQuota - s : 0;
    }

    // ------------------------------------------------------------------------------------------- VERIFY frame

    fallback() external {
        uint256 cur = txparam(TxParam.CURRENT_FRAME_INDEX);
        if (FrameMode(frameparam(cur, FrameParam.MODE)) != FrameMode.VERIFY) revert Policy("only VERIFY");

        if (address(uint160(sigparam(0, SigParam.RESOLVED_SIGNER))) != owner) revert Policy("bad signer");

        uint256 n = txparam(TxParam.FRAME_COUNT);
        // TIMESTAMP is banned during validation, so VERIFY conservatively uses the stored counter. The SENDER frame
        // (`pay`) rolls the day exactly; after midnight UTC an agent sends `newDay()` first to reset the counter.
        uint256 spent = spentToday;
        uint256 requested;
        bool sponsored;
        for (uint256 i = cur + 1; i < n; i++) {
            FrameMode m = FrameMode(frameparam(i, FrameParam.MODE));
            if (m == FrameMode.VERIFY) {
                sponsored = true; // a paymaster VERIFY frame will approve payment
                continue;
            }
            if (m != FrameMode.SENDER) revert Policy("unexpected frame mode");
            if (address(uint160(frameparam(i, FrameParam.RESOLVED_TARGET))) != address(this)) revert Policy("sender frame must target the vault");
            if (frameparam(i, FrameParam.VALUE) != 0) revert Policy("no ETH value");
            uint256 len = frameparam(i, FrameParam.DATA_LENGTH);
            if (len == 4) {
                if (bytes4(framedatacopy(0, 4, i)) != NEW_DAY) revert Policy("unknown selector");
                continue;
            }
            if (len != 68) revert Policy("bad calldata");
            bytes memory d = framedatacopy(0, 68, i);
            bytes4 sel;
            address who;
            uint256 amount;
            assembly {
                sel := mload(add(d, 32))
                who := mload(add(d, 36))
                amount := mload(add(d, 68))
            }
            if (sel == PAY) {
                _checkPay(who, amount, spent + requested);
                requested += amount;
            } else if (sel == PAY_FEE) {
                if (who != paymaster || paymaster == address(0)) revert Policy("fee payee is not the paymaster");
            } else {
                revert Policy("unknown selector");
            }
        }
        approve(sponsored ? Scope.EXECUTION : Scope.EXECUTION_AND_PAYMENT);
    }

    // ------------------------------------------------------------------------------------------------ helpers

    function _checkPay(address provider, uint256 amount, uint256 spentBefore) private view {
        if (!registry.isActive(provider)) revert Policy("provider not registered");
        if (amount > perRequestCap) revert Policy("over per-request cap");
        if (spentBefore + amount > dailyQuota) revert Policy("over daily quota");
    }

    function _spentNow() private view returns (uint256) {
        return block.timestamp / 1 days == day ? spentToday : 0;
    }

    function _rollDay() private {
        uint256 d = block.timestamp / 1 days;
        if (d != day) {
            day = d;
            spentToday = 0;
        }
    }
}
