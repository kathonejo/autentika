// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {KathonejoCommissionsTestBase} from "./KathonejoCommissions.Base.t.sol";
import {KathonejoCommissions} from "../KathonejoCommissions.sol";

/// @dev Deployment / initialization tests.
contract KathonejoCommissionsDeployTest is KathonejoCommissionsTestBase {

    // ─── constructor ────────────────────────────────────────────────────────

    function test_Deploy_StoresUsdcToken() public view {
        assertEq(board.usdcToken(), address(usdc));
    }

    function test_Deploy_RevertsOnZeroAddress() public {
        vm.expectRevert(KathonejoCommissions.InvalidAddress.selector);
        new KathonejoCommissions(address(0));
    }

    // ─── createCommission happy path ─────────────────────────────────────────

    function test_CreateCommission_ReturnsIdOne() public {
        uint256 id = _createCommission();
        assertEq(id, 1);
    }

    function test_CreateCommission_StoresFields() public {
        uint64 dl = uint64(block.timestamp + DEADLINE_OFFSET);
        vm.prank(artist);
        uint256 id = board.createCommission(collector, AMOUNT, dl, "My Art");

        KathonejoCommissions.Commission memory c = board.getCommission(id);
        assertEq(c.id,       id);
        assertEq(c.artist,   artist);
        assertEq(c.collector, collector);
        assertEq(c.amount,   AMOUNT);
        assertEq(c.deadline, dl);
        assertEq(c.title,    "My Art");
        assertEq(uint8(c.status), uint8(KathonejoCommissions.CommissionStatus.Created));
        assertEq(c.deliveredAt, 0);
        assertEq(c.certificateId, bytes32(0));
    }

    function test_CreateCommission_EmitsEvent() public {
        uint64 dl = uint64(block.timestamp + DEADLINE_OFFSET);
        vm.prank(artist);
        vm.expectEmit(true, true, true, true, address(board));
        emit KathonejoCommissions.CommissionCreated(1, artist, collector, AMOUNT, dl, "Ev Art");
        board.createCommission(collector, AMOUNT, dl, "Ev Art");
    }

    function test_CreateCommission_PopulatesArtistList() public {
        _createCommission();
        uint256[] memory ids = board.getArtistCommissions(artist);
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);
    }

    function test_CreateCommission_PopulatesCollectorList() public {
        _createCommission();
        uint256[] memory ids = board.getCollectorCommissions(collector);
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);
    }

    function test_CreateCommission_IncrementsId() public {
        uint64 dl = uint64(block.timestamp + DEADLINE_OFFSET);
        vm.startPrank(artist);
        uint256 id1 = board.createCommission(collector, AMOUNT, dl, "A");
        uint256 id2 = board.createCommission(collector, AMOUNT, dl, "B");
        vm.stopPrank();
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    // ─── createCommission reverts ────────────────────────────────────────────

    function test_CreateCommission_RevertsZeroCollector() public {
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.InvalidAddress.selector);
        board.createCommission(address(0), AMOUNT, uint64(block.timestamp + 1 days), "T");
    }

    function test_CreateCommission_RevertsZeroAmount() public {
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.InvalidAmount.selector);
        board.createCommission(collector, 0, uint64(block.timestamp + 1 days), "T");
    }

    function test_CreateCommission_RevertsDeadlineInPast() public {
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.InvalidDeadline.selector);
        board.createCommission(collector, AMOUNT, uint64(block.timestamp), "T");
    }

    function test_CreateCommission_RevertsEmptyTitle() public {
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.EmptyString.selector);
        board.createCommission(collector, AMOUNT, uint64(block.timestamp + 1 days), "");
    }

    // ─── getCommission revert ────────────────────────────────────────────────

    function test_GetCommission_RevertsNotFound() public {
        vm.expectRevert(KathonejoCommissions.CommissionNotFound.selector);
        board.getCommission(0);
    }

    function test_GetCommission_RevertsIdTooHigh() public {
        vm.expectRevert(KathonejoCommissions.CommissionNotFound.selector);
        board.getCommission(999);
    }
}
