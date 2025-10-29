// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {FixedPointMathLib} from "solady/src/utils/FixedPointMathLib.sol";
import {LibSort} from "solady/src/utils/LibSort.sol";

type Id is bytes32;

struct MarketParams {
    address loanToken;
    address collateralToken;
    address oracle;
    address irm;
    uint256 lltv;
}

struct Position {
    uint256 supplyShares;
    uint128 borrowShares;
    uint128 collateral;
}

struct Market {
    uint128 totalSupplyAssets;
    uint128 totalSupplyShares;
    uint128 totalBorrowAssets;
    uint128 totalBorrowShares;
    uint128 lastUpdate;
    uint128 fee;
}

struct MarketConfig {
    uint184 cap;
    bool enabled;
    uint64 removableAt;
}

interface IMorpho {
    function position(Id id, address user) external view returns (Position memory p);
    function market(Id id) external view returns (Market memory m);
}

interface IMetaMorpho {
    function DECIMALS_OFFSET() external view returns (uint8);
    function curator() external view returns (address);
    function owner() external view returns (address);
    function guardian() external view returns (address);
    function fee() external view returns (uint96);
    function feeRecipient() external view returns (address);
    function skimRecipient() external view returns (address);
    function timelock() external view returns (uint256);
    function supplyQueue(uint256) external view returns (Id);
    function supplyQueueLength() external view returns (uint256);
    function withdrawQueue(uint256) external view returns (Id);
    function withdrawQueueLength() external view returns (uint256);
    function lastTotalAssets() external view returns (uint256);
    function config(Id) external view returns (MarketConfig memory);

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function asset() external view returns (address);
    function totalSupply() external view returns (uint256);
    function totalAssets() external view returns (uint256);
    function balanceOf(address user) external view returns (uint256);
}

contract Lens {
    uint256 constant MAX_SAFE_SHARE_PRICE = 100e6;
    uint256 constant MIN_SAFE_DEAD_BALANCE = 1e9;
    address constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    struct Vault {
        IMetaMorpho vault;
        string name;
        string symbol;
        uint8 decimalsOffset;
        address asset;
        address curator;
        address owner;
        address guardian;
        uint96 fee;
        address feeRecipient;
        address skimRecipient;
        uint256 timelock;
        Id[] supplyQueue;
        Id[] withdrawQueue;
        uint256 totalSupply;
        uint256 totalAssets;
        uint256 lastTotalAssets;
    }

    struct VaultMarketAllocation {
        Id id;
        Position position;
        MarketConfig config;
    }

    struct AccrualVault {
        Vault vault;
        VaultMarketAllocation[] allocations;
        bool isInflatable;
    }

    /**
     * Reads vault data for each `IMetaMorpho` entry that has an owner in `includedOwners`. For non-included ones,
     * only the `owner` field is read to save gas.
     *
     * @param metaMorphos Array of `IMetaMorpho`s to search through and (possibly) read as a vault.
     * @param includedOwners Array of owners whose vaults should be included in the returned array.
     * MUST be strictly ascending (sorted and unique).
     */
    function getAccrualVaults(IMorpho morpho, IMetaMorpho[] calldata metaMorphos, address[] memory includedOwners)
        external
        view
        returns (AccrualVault[] memory)
    {
        require(LibSort.isSortedAndUniquified(includedOwners), "sort");

        bool[] memory include = new bool[](metaMorphos.length);
        uint256 count;
        for (uint256 i; i < metaMorphos.length; i++) {
            if (LibSort.inSorted(includedOwners, metaMorphos[i].owner())) {
                include[i] = true;
                count++;
            }
        }

        AccrualVault[] memory vaults = new AccrualVault[](count);
        count = 0;
        for (uint256 i; i < metaMorphos.length; i++) {
            if (include[i]) {
                vaults[count] = getAccrualVault(morpho, metaMorphos[i]);
                count++;
            }
        }
        return vaults;
    }

    function getAccrualVault(IMorpho morpho, IMetaMorpho metaMorpho) public view returns (AccrualVault memory) {
        Vault memory vault = getVault(metaMorpho);
        VaultMarketAllocation[] memory allocations = new VaultMarketAllocation[](vault.withdrawQueue.length);
        bool isInflatable = _isVaultInflatable(vault.vault, vault.decimalsOffset);

        for (uint256 i; i < allocations.length; i++) {
            Id id = vault.withdrawQueue[i];
            allocations[i] = VaultMarketAllocation({
                id: id,
                position: morpho.position(id, address(metaMorpho)),
                config: metaMorpho.config(id)
            });

            if (!isInflatable) {
                if (_isMarketInflatable(morpho, id)) isInflatable = true;
            }
        }

        return AccrualVault({vault: vault, allocations: allocations, isInflatable: isInflatable});
    }

    function getVault(IMetaMorpho metaMorpho) public view returns (Vault memory) {
        return Vault({
            vault: metaMorpho,
            name: metaMorpho.name(),
            symbol: metaMorpho.symbol(),
            decimalsOffset: metaMorpho.DECIMALS_OFFSET(),
            asset: metaMorpho.asset(),
            curator: metaMorpho.curator(),
            owner: metaMorpho.owner(),
            guardian: metaMorpho.guardian(),
            fee: metaMorpho.fee(),
            feeRecipient: metaMorpho.feeRecipient(),
            skimRecipient: metaMorpho.skimRecipient(),
            timelock: metaMorpho.timelock(),
            supplyQueue: _getSupplyQueue(metaMorpho),
            withdrawQueue: _getWithdrawQueue(metaMorpho),
            totalSupply: metaMorpho.totalSupply(),
            totalAssets: metaMorpho.totalAssets(),
            lastTotalAssets: metaMorpho.lastTotalAssets()
        });
    }

    function _isVaultInflatable(IMetaMorpho metaMorpho, uint8 decimalsOffset) private view returns (bool) {
        uint256 deadShares = metaMorpho.balanceOf(DEAD_ADDRESS);
        if (deadShares < MIN_SAFE_DEAD_BALANCE) return true;

        uint256 sharePrice =
            FixedPointMathLib.fullMulDiv(metaMorpho.totalAssets(), 10 ** (6 + decimalsOffset), metaMorpho.totalSupply());
        if (sharePrice > MAX_SAFE_SHARE_PRICE) return true;

        return false;
    }

    function _isMarketInflatable(IMorpho morpho, Id id) private view returns (bool) {
        uint256 deadShares = morpho.position(id, DEAD_ADDRESS).supplyShares;
        if (deadShares < MIN_SAFE_DEAD_BALANCE) return true;

        Market memory market = morpho.market(id);
        uint256 sharePrice =
            FixedPointMathLib.fullMulDiv(market.totalSupplyAssets + 1, 1e6, market.totalSupplyShares + 1e6);
        if (sharePrice > MAX_SAFE_SHARE_PRICE) return true;

        return false;
    }

    function _getSupplyQueue(IMetaMorpho metaMorpho) private view returns (Id[] memory ids) {
        uint256 length = metaMorpho.supplyQueueLength();

        ids = new Id[](length);
        for (uint256 i; i < length; i++) {
            ids[i] = metaMorpho.supplyQueue(i);
        }
    }

    function _getWithdrawQueue(IMetaMorpho metaMorpho) private view returns (Id[] memory ids) {
        uint256 length = metaMorpho.withdrawQueueLength();

        ids = new Id[](length);
        for (uint256 i; i < length; i++) {
            ids[i] = metaMorpho.withdrawQueue(i);
        }
    }
}
