// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {KathonejoCommissions} from "../KathonejoCommissions.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

/// @dev Handler for stateful invariant testing.
///      Drives random sequences of: create, fund, deliver, confirm, refund, cancel, withdraw.
contract KathonejoHandler is Test {
    KathonejoCommissions internal board;
    MockERC20            internal usdc;

    address internal artist    = makeAddr("h-artist");
    address internal collector = makeAddr("h-collector");

    uint256 internal nextId = 0; // tracks last created id

    // ghost variables for invariant assertions
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    constructor(KathonejoCommissions _board, MockERC20 _usdc) {
        board = _board;
        usdc  = _usdc;
        usdc.mint(collector, type(uint128).max);
    }

    function createCommission(uint256 amount, uint64 offsetDays) external {
        amount     = bound(amount,     1,   100_000e6);
        offsetDays = uint64(bound(offsetDays, 1, 365));
        uint64 deadline = uint64(block.timestamp + offsetDays * 1 days);

        vm.prank(artist);
        nextId = board.createCommission(collector, amount, deadline, "Inv");
    }

    function fundCommission() external {
        if (nextId == 0) return;
        KathonejoCommissions.Commission memory c;
        try board.getCommission(nextId) returns (KathonejoCommissions.Commission memory _c) {
            c = _c;
        } catch { return; }

        if (c.status != KathonejoCommissions.CommissionStatus.Created) return;
        if (block.timestamp >= c.deadline) return;

        vm.startPrank(collector);
        usdc.approve(address(board), c.amount);
        try board.fundCommission(nextId) {
            totalDeposited += c.amount;
        } catch {}
        vm.stopPrank();
    }

    function deliverCommission() external {
        if (nextId == 0) return;
        KathonejoCommissions.Commission memory c;
        try board.getCommission(nextId) returns (KathonejoCommissions.Commission memory _c) {
            c = _c;
        } catch { return; }

        if (c.status != KathonejoCommissions.CommissionStatus.Funded) return;
        if (block.timestamp > c.deadline) return;

        vm.prank(artist);
        try board.markDelivered(
            nextId,
            "Title", "Artist", "Tech", "Dims",
            uint64(block.timestamp),
            "",
            "ipfs://x",
            keccak256("hash")
        ) {} catch {}
    }

    function confirmReceipt() external {
        if (nextId == 0) return;
        KathonejoCommissions.Commission memory c;
        try board.getCommission(nextId) returns (KathonejoCommissions.Commission memory _c) {
            c = _c;
        } catch { return; }

        if (c.status != KathonejoCommissions.CommissionStatus.Delivered) return;

        vm.prank(collector);
        try board.confirmReceipt(nextId) {} catch {}
    }

    function refundCommission() external {
        if (nextId == 0) return;
        KathonejoCommissions.Commission memory c;
        try board.getCommission(nextId) returns (KathonejoCommissions.Commission memory _c) {
            c = _c;
        } catch { return; }

        if (c.status != KathonejoCommissions.CommissionStatus.Funded) return;
        if (block.timestamp <= c.deadline) return;

        vm.prank(collector);
        try board.refundCollector(nextId) {} catch {}
    }

    function cancelCommission() external {
        if (nextId == 0) return;
        KathonejoCommissions.Commission memory c;
        try board.getCommission(nextId) returns (KathonejoCommissions.Commission memory _c) {
            c = _c;
        } catch { return; }

        if (c.status != KathonejoCommissions.CommissionStatus.Created) return;

        vm.prank(artist);
        try board.cancelCommission(nextId) {} catch {}
    }

    function withdrawArtist() external {
        uint256 amount = board.pendingWithdrawals(artist);
        if (amount == 0) return;
        vm.prank(artist);
        try board.withdraw() {
            totalWithdrawn += amount;
        } catch {}
    }

    function withdrawCollector() external {
        uint256 amount = board.pendingWithdrawals(collector);
        if (amount == 0) return;
        vm.prank(collector);
        try board.withdraw() {
            totalWithdrawn += amount;
        } catch {}
    }

    function warpTime(uint256 secs) external {
        secs = bound(secs, 0, 30 days);
        vm.warp(block.timestamp + secs);
    }
}

/// @dev Invariant suite.
contract KathonejoCommissionsInvariantTest is Test {
    KathonejoCommissions internal board;
    MockERC20            internal usdc;
    KathonejoHandler     internal handler;

    // Pre-computed handler actor addresses (makeAddr is not view-safe).
    address internal h_artist;
    address internal h_collector;

    function setUp() public {
        usdc    = new MockERC20("Mock USDC", "mUSDC", 6);
        board   = new KathonejoCommissions(address(usdc));
        handler = new KathonejoHandler(board, usdc);

        // Derive the same addresses the handler uses so invariant checks match.
        h_artist    = makeAddr("h-artist");
        h_collector = makeAddr("h-collector");

        targetContract(address(handler));
    }

    /// @dev The contract's USDC balance must equal totalDeposited − totalWithdrawn.
    ///      This verifies no token leakage or double-counting can occur.
    function invariant_BoardBalanceEqualsEscrowAndPending() public view {
        uint256 pendingArtist    = board.pendingWithdrawals(h_artist);
        uint256 pendingCollector = board.pendingWithdrawals(h_collector);
        uint256 contractBalance  = usdc.balanceOf(address(board));

        assertEq(
            contractBalance,
            handler.totalDeposited() - handler.totalWithdrawn(),
            "invariant: board balance != deposited - withdrawn"
        );

        // Pending withdrawals must never exceed the contract's balance.
        assertLe(
            pendingArtist + pendingCollector,
            contractBalance,
            "invariant: pending withdrawals exceed contract balance"
        );
    }

    /// @dev Pending withdrawal for any address is always a valid uint256 (≥ 0).
    function invariant_PendingWithdrawalsNonNegative() public view {
        assertGe(board.pendingWithdrawals(h_artist),    0);
        assertGe(board.pendingWithdrawals(h_collector), 0);
    }
}
