// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console2} from "forge-std/Script.sol";

import {Lens as ReadVaults} from "../../src/lens/read-vaults.s.sol";
import {Lens as ReadWithdrawQueue} from "../../src/lens/read-withdraw-queue.s.sol";

bytes32 constant SALT = 0x000000000000000000000000000000000000000051A1E51A1E51A1E51A1E51A1; // from src/lens/constants.ts

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        ReadVaults readVaults = new ReadVaults{salt: SALT}();
        console2.log(address(readVaults));

        ReadWithdrawQueue readWithdrawQueue = new ReadWithdrawQueue{salt: SALT}();
        console2.log(address(readWithdrawQueue));

        vm.stopBroadcast();
    }
}
