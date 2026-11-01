// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AutentikaV2TestBase} from "./AutentikaV2.Base.t.sol";
import {AutentikaV2} from "../AutentikaV2.sol";

contract AutentikaV2DeployTest is AutentikaV2TestBase {

    // ─── constructor happy path ──────────────────────────────────────────────

    function test_Deploy_SetsUsdcToken() public view {
        assertEq(autentika.usdcToken(), USDC_ADDR);
    }

    function test_Deploy_SetsOwner() public view {
        assertEq(autentika.owner(), owner);
    }

    function test_Deploy_SetsFeeRecipient() public view {
        assertEq(autentika.feeRecipient(), feeRcpt);
    }

    function test_Deploy_DefaultPlatformFeeBps() public view {
        assertEq(autentika.platformFeeBps(), 50); // 0.5%
    }

    function test_Deploy_DefaultResaleBps() public view {
        assertEq(autentika.platformResaleBps(), 25);
    }

    function test_Deploy_ERC721Name() public view {
        assertEq(autentika.name(), "Autentika Certificate");
    }

    function test_Deploy_ERC721Symbol() public view {
        assertEq(autentika.symbol(), "AUTC");
    }

    // ─── constructor revert paths ────────────────────────────────────────────

    function test_Deploy_RevertZeroUsdc() public {
        vm.expectRevert(AutentikaV2.InvalidAddress.selector);
        new AutentikaV2(address(0), owner, feeRcpt);
    }

    function test_Deploy_RevertZeroOwner() public {
        // OZ Ownable fires OwnableInvalidOwner before our InvalidAddress check
        // (the base constructor runs first). This is expected behaviour: the
        // constructor is still guarded, just by the OZ error.
        vm.expectRevert();
        new AutentikaV2(USDC_ADDR, address(0), feeRcpt);
    }

    function test_Deploy_RevertZeroFeeRecipient() public {
        vm.expectRevert(AutentikaV2.InvalidAddress.selector);
        new AutentikaV2(USDC_ADDR, owner, address(0));
    }

    // ─── supportsInterface ───────────────────────────────────────────────────

    function test_SupportsInterface_ERC721() public view {
        assertTrue(autentika.supportsInterface(0x80ac58cd)); // ERC-721
    }

    function test_SupportsInterface_ERC2981() public view {
        assertTrue(autentika.supportsInterface(0x2a55205a)); // ERC-2981
    }

    function test_SupportsInterface_ERC165() public view {
        assertTrue(autentika.supportsInterface(0x01ffc9a7)); // ERC-165
    }

    // ─── admin setters ───────────────────────────────────────────────────────

    function test_SetPlatformFeeBps_OwnerCanSet() public {
        vm.prank(owner);
        autentika.setPlatformFeeBps(100);
        assertEq(autentika.platformFeeBps(), 100);
    }

    function test_SetPlatformFeeBps_EmitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true, address(autentika));
        emit AutentikaV2.FeeUpdated(100);
        autentika.setPlatformFeeBps(100);
    }

    function test_SetPlatformFeeBps_RevertNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        autentika.setPlatformFeeBps(100);
    }

    function test_SetPlatformFeeBps_RevertTooHigh() public {
        vm.prank(owner);
        vm.expectRevert(AutentikaV2.FeeTooHigh.selector);
        autentika.setPlatformFeeBps(201); // MAX_PLATFORM_FEE_BPS = 200
    }

    function test_SetFeeRecipient_OwnerCanSet() public {
        address newRcpt = makeAddr("newRcpt");
        vm.prank(owner);
        autentika.setFeeRecipient(newRcpt);
        assertEq(autentika.feeRecipient(), newRcpt);
    }

    function test_SetFeeRecipient_RevertNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        autentika.setFeeRecipient(makeAddr("x"));
    }

    function test_SetFeeRecipient_RevertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(AutentikaV2.InvalidAddress.selector);
        autentika.setFeeRecipient(address(0));
    }

    function test_SetPlatformResaleBps_OwnerCanSet() public {
        vm.prank(owner);
        autentika.setPlatformResaleBps(50);
        assertEq(autentika.platformResaleBps(), 50);
    }

    function test_SetPlatformResaleBps_RevertNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        autentika.setPlatformResaleBps(50);
    }

    function test_SetPlatformResaleBps_RevertTooHigh() public {
        vm.prank(owner);
        vm.expectRevert(AutentikaV2.FeeTooHigh.selector);
        autentika.setPlatformResaleBps(101); // MAX_RESALE_BPS = 100
    }
}
