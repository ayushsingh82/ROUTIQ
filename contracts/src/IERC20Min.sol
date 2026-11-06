// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IERC20Min {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

interface IProviderRegistry {
    function isActive(address payTo) external view returns (bool);
}

interface IStakingRegistry {
    function addStake(uint32 unstakeDelaySec) external payable;
}
