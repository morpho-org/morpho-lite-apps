// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

type Id is bytes32;

interface IMetaMorpho {
    /// @dev Stores the order of markets from which liquidity is withdrawn upon withdrawal.
    /// @dev Always contain all non-zero cap markets as well as all markets on which the vault supplies liquidity,
    /// without duplicate.
    function withdrawQueue(uint256) external view returns (Id);

    /// @notice Returns the length of the withdraw queue.
    function withdrawQueueLength() external view returns (uint256);
}
 
contract Lens {
    function withdrawQueue(IMetaMorpho metaMorpho) external view returns (Id[] memory) {
        uint256 length = metaMorpho.withdrawQueueLength();

        Id[] memory ids = new Id[](length);
        for (uint256 i; i < length; i++) {
            ids[i] = metaMorpho.withdrawQueue(i);
        }
        return ids;
    }
}
