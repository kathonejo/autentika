// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {KathonejoCommissionsTestBase} from "./KathonejoCommissions.Base.t.sol";
import {KathonejoCommissions} from "../KathonejoCommissions.sol";

/// @dev Fuzz tests for key arithmetic properties.
contract KathonejoCommissionsFuzzTest is KathonejoCommissionsTestBase {

    // ─── fuzz: createCommission stores exactly what was passed ───────────────

    function testFuzz_CreateCommission_StoresAmountAndDeadline(
        uint256 amount,
        uint64 deadlineOffset
    ) public {
        amount         = bound(amount,         1,      type(uint128).max);
        deadlineOffset = uint64(bound(deadlineOffset, 1, 365 days));

        uint64 deadline = uint64(block.timestamp) + deadlineOffset;

        vm.prank(artist);
        uint256 id = board.createCommission(collector, amount, deadline, "FuzzArt");

        KathonejoCommissions.Commission memory c = board.getCommission(id);
        assertEq(c.amount,   amount);
        assertEq(c.deadline, deadline);
    }

    // ─── fuzz: fund and withdraw conserves tokens ────────────────────────────

    function testFuzz_FundAndConfirm_ArtistReceivesExactAmount(uint256 amount) public {
        amount = bound(amount, 1, 1_000_000e6);

        // Seed collector
        usdc.mint(collector, amount);
        uint64 deadline = uint64(block.timestamp + 30 days);

        vm.prank(artist);
        uint256 id = board.createCommission(collector, amount, deadline, "FuzzFund");

        vm.startPrank(collector);
        usdc.approve(address(board), amount);
        board.fundCommission(id);
        vm.stopPrank();

        // Deliver
        vm.prank(artist);
        board.markDelivered(
            id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE, DIMENSIONS,
            CREATION_DATE, "", PHOTO_URL, PHOTO_HASH
        );

        // Confirm
        vm.prank(collector);
        board.confirmReceipt(id);

        // Withdraw
        uint256 beforeWithdraw = usdc.balanceOf(artist);
        vm.prank(artist);
        board.withdraw();

        assertEq(usdc.balanceOf(artist), beforeWithdraw + amount);
        assertEq(board.pendingWithdrawals(artist), 0);
    }

    // ─── fuzz: refund conserves tokens ───────────────────────────────────────

    function testFuzz_FundAndRefund_CollectorReceivesExactAmount(uint256 amount) public {
        amount = bound(amount, 1, 1_000_000e6);

        usdc.mint(collector, amount);
        uint64 deadline = uint64(block.timestamp + 30 days);

        vm.prank(artist);
        uint256 id = board.createCommission(collector, amount, deadline, "FuzzRefund");

        vm.startPrank(collector);
        usdc.approve(address(board), amount);
        board.fundCommission(id);
        vm.stopPrank();

        uint256 balBefore = usdc.balanceOf(collector);
        vm.warp(block.timestamp + 30 days + 1);
        vm.prank(collector);
        board.refundCollector(id);
        vm.prank(collector);
        board.withdraw();

        assertEq(usdc.balanceOf(collector), balBefore + amount);
        assertEq(board.pendingWithdrawals(collector), 0);
    }

    // ─── fuzz: autoClaim 14-day window ───────────────────────────────────────

    function testFuzz_AutoClaim_RevertsInsideWindow(uint64 warpSeconds) public {
        warpSeconds = uint64(bound(warpSeconds, 0, 14 days - 1));

        (uint256 id,) = _deliverCommission();
        uint256 deliveredAt = block.timestamp;

        vm.warp(deliveredAt + warpSeconds);
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.DeliveryClaimNotReady.selector);
        board.autoClaimAfterDelivery(id);
    }

    function testFuzz_AutoClaim_SucceedsAtOrAfterWindow(uint64 extra) public {
        extra = uint64(bound(extra, 0, 365 days));

        (uint256 id,) = _deliverCommission();
        uint256 deliveredAt = block.timestamp;

        vm.warp(deliveredAt + 14 days + extra);
        vm.prank(artist);
        board.autoClaimAfterDelivery(id);
        assertEq(board.pendingWithdrawals(artist), AMOUNT);
    }

    // ─── fuzz: commission id counter always increases monotonically ──────────

    function testFuzz_CommissionIdMonotonicity(uint8 n) public {
        n = uint8(bound(n, 1, 20));
        uint64 dl = uint64(block.timestamp + 1 days);
        uint256 prevId = 0;
        for (uint256 i = 0; i < n; i++) {
            vm.prank(artist);
            uint256 id = board.createCommission(collector, AMOUNT, dl, "M");
            assertGt(id, prevId);
            prevId = id;
        }
    }
}
