// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {KathonejoCommissionsTestBase} from "./KathonejoCommissions.Base.t.sol";
import {KathonejoCommissions} from "../KathonejoCommissions.sol";

/// @dev fundCommission, cancelCommission, and refundCollector tests.
contract KathonejoCommissionsFundTest is KathonejoCommissionsTestBase {

    // ─── fundCommission happy path ───────────────────────────────────────────

    function test_FundCommission_TransfersTokens() public {
        uint256 id = _createCommission();
        uint256 before = usdc.balanceOf(address(board));

        vm.startPrank(collector);
        usdc.approve(address(board), AMOUNT);
        board.fundCommission(id);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(board)), before + AMOUNT);
        assertEq(usdc.balanceOf(collector), 10_000e6 - AMOUNT);
    }

    function test_FundCommission_SetsStatusFunded() public {
        uint256 id = _fundCommission();
        KathonejoCommissions.Commission memory c = board.getCommission(id);
        assertEq(uint8(c.status), uint8(KathonejoCommissions.CommissionStatus.Funded));
    }

    function test_FundCommission_EmitsEvent() public {
        uint256 id = _createCommission();
        vm.startPrank(collector);
        usdc.approve(address(board), AMOUNT);
        vm.expectEmit(true, true, false, true, address(board));
        emit KathonejoCommissions.CommissionFunded(id, collector, AMOUNT);
        board.fundCommission(id);
        vm.stopPrank();
    }

    // ─── fundCommission reverts ──────────────────────────────────────────────

    function test_FundCommission_RevertsNotFound() public {
        vm.prank(collector);
        vm.expectRevert(KathonejoCommissions.CommissionNotFound.selector);
        board.fundCommission(999);
    }

    function test_FundCommission_RevertsWrongCaller() public {
        uint256 id = _createCommission();
        vm.startPrank(stranger);
        usdc.mint(stranger, AMOUNT);
        usdc.approve(address(board), AMOUNT);
        vm.expectRevert(KathonejoCommissions.Unauthorized.selector);
        board.fundCommission(id);
        vm.stopPrank();
    }

    function test_FundCommission_RevertsAlreadyFunded() public {
        uint256 id = _fundCommission();
        vm.startPrank(collector);
        usdc.approve(address(board), AMOUNT);
        vm.expectRevert(KathonejoCommissions.InvalidStatus.selector);
        board.fundCommission(id);
        vm.stopPrank();
    }

    function test_FundCommission_RevertsInsufficientApproval() public {
        uint256 id = _createCommission();
        vm.startPrank(collector);
        usdc.approve(address(board), AMOUNT - 1);
        vm.expectRevert();
        board.fundCommission(id);
        vm.stopPrank();
    }

    // ─── cancelCommission happy path ─────────────────────────────────────────

    function test_Cancel_ByArtist_SetsStatusCancelled() public {
        uint256 id = _createCommission();
        vm.prank(artist);
        board.cancelCommission(id);
        KathonejoCommissions.Commission memory c = board.getCommission(id);
        assertEq(uint8(c.status), uint8(KathonejoCommissions.CommissionStatus.Cancelled));
    }

    function test_Cancel_ByCollector_SetsStatusCancelled() public {
        uint256 id = _createCommission();
        vm.prank(collector);
        board.cancelCommission(id);
        KathonejoCommissions.Commission memory c = board.getCommission(id);
        assertEq(uint8(c.status), uint8(KathonejoCommissions.CommissionStatus.Cancelled));
    }

    function test_Cancel_EmitsEvent_ByArtist() public {
        uint256 id = _createCommission();
        vm.prank(artist);
        vm.expectEmit(true, true, false, false, address(board));
        emit KathonejoCommissions.CommissionCancelled(id, artist);
        board.cancelCommission(id);
    }

    function test_Cancel_EmitsEvent_ByCollector() public {
        uint256 id = _createCommission();
        vm.prank(collector);
        vm.expectEmit(true, true, false, false, address(board));
        emit KathonejoCommissions.CommissionCancelled(id, collector);
        board.cancelCommission(id);
    }

    // ─── cancelCommission reverts ────────────────────────────────────────────

    function test_Cancel_RevertsStranger() public {
        uint256 id = _createCommission();
        vm.prank(stranger);
        vm.expectRevert(KathonejoCommissions.Unauthorized.selector);
        board.cancelCommission(id);
    }

    function test_Cancel_RevertsWhenFunded() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.InvalidStatus.selector);
        board.cancelCommission(id);
    }

    // ─── refundCollector happy path ──────────────────────────────────────────

    function test_Refund_SetsPendingWithdrawal() public {
        uint256 id = _fundCommission();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(collector);
        board.refundCollector(id);
        assertEq(board.pendingWithdrawals(collector), AMOUNT);
    }

    function test_Refund_SetsStatusRefunded() public {
        uint256 id = _fundCommission();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(collector);
        board.refundCollector(id);
        KathonejoCommissions.Commission memory c = board.getCommission(id);
        assertEq(uint8(c.status), uint8(KathonejoCommissions.CommissionStatus.Refunded));
    }

    function test_Refund_EmitsEvent() public {
        uint256 id = _fundCommission();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(collector);
        vm.expectEmit(true, false, false, false, address(board));
        emit KathonejoCommissions.CommissionRefunded(id);
        board.refundCollector(id);
    }

    function test_Refund_WithdrawSendsTokens() public {
        uint256 id = _fundCommission();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(collector);
        board.refundCollector(id);

        uint256 beforeWithdraw = usdc.balanceOf(collector);
        vm.prank(collector);
        board.withdraw();
        assertEq(usdc.balanceOf(collector), beforeWithdraw + AMOUNT);
        assertEq(board.pendingWithdrawals(collector), 0);
    }

    // ─── refundCollector reverts ─────────────────────────────────────────────

    function test_Refund_RevertsBeforeDeadline() public {
        uint256 id = _fundCommission();
        vm.prank(collector);
        vm.expectRevert(KathonejoCommissions.InvalidDeadline.selector);
        board.refundCollector(id);
    }

    function test_Refund_RevertsWrongCaller() public {
        uint256 id = _fundCommission();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(stranger);
        vm.expectRevert(KathonejoCommissions.Unauthorized.selector);
        board.refundCollector(id);
    }

    function test_Refund_RevertsWhenNotFunded() public {
        uint256 id = _createCommission();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(collector);
        vm.expectRevert(KathonejoCommissions.InvalidStatus.selector);
        board.refundCollector(id);
    }

    // ─── withdraw reverts ────────────────────────────────────────────────────

    function test_Withdraw_RevertsNothingToWithdraw() public {
        vm.prank(stranger);
        vm.expectRevert(KathonejoCommissions.NothingToWithdraw.selector);
        board.withdraw();
    }

    function test_Withdraw_EmitsEvent() public {
        uint256 id = _fundCommission();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(collector);
        board.refundCollector(id);

        vm.prank(collector);
        vm.expectEmit(true, false, false, true, address(board));
        emit KathonejoCommissions.Withdrawn(collector, AMOUNT);
        board.withdraw();
    }

    function test_Withdraw_ClearsBalance() public {
        uint256 id = _fundCommission();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(collector);
        board.refundCollector(id);

        vm.prank(collector);
        board.withdraw();
        assertEq(board.pendingWithdrawals(collector), 0);
    }
}
