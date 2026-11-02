// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AutentikaSubscriptions} from "../AutentikaSubscriptions.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

contract AutentikaSubscriptionsTest is Test {
    address internal constant USDC_ADDR = 0x3600000000000000000000000000000000000000;

    address internal owner = makeAddr("owner");
    address internal artist = makeAddr("artist");
    address internal sub = makeAddr("subscriber");
    address internal feeRcpt = makeAddr("feeRcpt");

    MockERC20 internal usdc;
    AutentikaSubscriptions internal club;

    uint256 internal constant FEE = 100e6; // 100 USDC / month

    function setUp() public {
        MockERC20 mock = new MockERC20("Mock USDC", "mUSDC", 6);
        vm.etch(USDC_ADDR, address(mock).code);
        usdc = MockERC20(USDC_ADDR);
        usdc.mint(sub, 1_000_000e6);

        club = new AutentikaSubscriptions(USDC_ADDR, owner, feeRcpt);

        vm.prank(artist);
        club.setPlan(FEE, "Club de correo");

        vm.prank(sub);
        usdc.approve(address(club), type(uint256).max);
    }

    function test_setPlan_and_deposit() public {
        vm.prank(sub);
        club.deposit(artist, 250e6);

        assertEq(club.balanceOf(artist, sub), 250e6);
        AutentikaSubscriptions.Plan memory p = club.getPlan(artist);
        assertEq(p.monthlyFeeUsdc, FEE);
        assertEq(p.title, "Club de correo");
        assertTrue(p.active);
    }

    function test_claim_after_30_days_with_fee() public {
        vm.prank(sub);
        club.deposit(artist, 500e6);

        vm.warp(block.timestamp + 30 days);
        assertEq(club.claimablePeriods(artist, sub), 1);
        assertEq(club.claimable(artist, sub), FEE);

        uint256 artistBefore = usdc.balanceOf(artist);
        uint256 feeBefore = usdc.balanceOf(feeRcpt);

        vm.prank(artist);
        club.claim(sub);

        uint256 expectedFee = (FEE * 50) / 10_000; // 0.5%
        assertEq(usdc.balanceOf(feeRcpt) - feeBefore, expectedFee);
        assertEq(usdc.balanceOf(artist) - artistBefore, FEE - expectedFee);
        assertEq(club.balanceOf(artist, sub), 500e6 - FEE);
        assertEq(club.claimablePeriods(artist, sub), 0);
    }

    function test_cannot_double_claim_same_period() public {
        vm.prank(sub);
        club.deposit(artist, 500e6);
        vm.warp(block.timestamp + 30 days);
        vm.prank(artist);
        club.claim(sub);

        vm.expectRevert(AutentikaSubscriptions.NothingClaimable.selector);
        vm.prank(artist);
        club.claim(sub);
    }

    function test_multi_period_claim() public {
        vm.prank(sub);
        club.deposit(artist, 1000e6);
        vm.warp(block.timestamp + 90 days); // 3 periods
        assertEq(club.claimablePeriods(artist, sub), 3);

        vm.prank(artist);
        club.claim(sub);
        assertEq(club.getSubscription(artist, sub).totalClaimed, 3 * FEE);
        assertEq(club.balanceOf(artist, sub), 1000e6 - 3 * FEE);
    }

    function test_withdraw_unlocked() public {
        vm.prank(sub);
        club.deposit(artist, 400e6);

        vm.prank(sub);
        club.withdraw(artist, 150e6);
        assertEq(club.balanceOf(artist, sub), 250e6);
        assertEq(usdc.balanceOf(sub), 1_000_000e6 - 400e6 + 150e6);
    }

    function test_annual_lock_discount_and_cannot_withdraw_locked() public {
        uint256 discounted = FEE - (FEE * 1000) / 10_000; // 90
        uint256 need = discounted * 12;

        vm.prank(sub);
        club.deposit(artist, need + 50e6);

        vm.prank(sub);
        club.lockMonths(artist, 12);

        assertEq(club.lockedOf(artist, sub), need);
        assertEq(club.balanceOf(artist, sub), 50e6);
        assertEq(club.getSubscription(artist, sub).lockedMonthsLeft, 12);

        // cannot withdraw locked
        vm.expectRevert(AutentikaSubscriptions.InsufficientBalance.selector);
        vm.prank(sub);
        club.withdraw(artist, 51e6);

        // can withdraw free
        vm.prank(sub);
        club.withdraw(artist, 50e6);
        assertEq(club.balanceOf(artist, sub), 0);

        // claims use discounted fee
        vm.warp(block.timestamp + 30 days);
        assertEq(club.claimable(artist, sub), discounted);

        vm.prank(artist);
        club.claim(sub);
        assertEq(club.lockedOf(artist, sub), need - discounted);
        assertEq(club.getSubscription(artist, sub).lockedMonthsLeft, 11);
    }

    function test_lockMonths_requires_12() public {
        vm.prank(sub);
        club.deposit(artist, 10_000e6);
        vm.expectRevert(AutentikaSubscriptions.NotAnnualLock.selector);
        vm.prank(sub);
        club.lockMonths(artist, 10);
    }

    function test_cancel_stops_after_current_period() public {
        vm.prank(sub);
        club.deposit(artist, 10_000e6);

        // Mid first period: cancel — current period ends at started+30d
        vm.warp(block.timestamp + 10 days);
        vm.prank(sub);
        club.cancel(artist);

        // Before period ends: nothing claimable
        assertEq(club.claimablePeriods(artist, sub), 0);

        // After first period ends: 1 claimable
        vm.warp(block.timestamp + 25 days); // total ~35d from start
        assertEq(club.claimablePeriods(artist, sub), 1);

        vm.prank(artist);
        club.claim(sub);

        // Far in the future: no more claims
        vm.warp(block.timestamp + 365 days);
        assertEq(club.claimablePeriods(artist, sub), 0);
        vm.expectRevert(AutentikaSubscriptions.NothingClaimable.selector);
        vm.prank(artist);
        club.claim(sub);
    }

    function test_owner_fee_config() public {
        vm.prank(owner);
        club.setPlatformFeeBps(100);
        assertEq(club.platformFeeBps(), 100);

        vm.expectRevert(AutentikaSubscriptions.FeeTooHigh.selector);
        vm.prank(owner);
        club.setPlatformFeeBps(201);

        address next = makeAddr("nextFee");
        vm.prank(owner);
        club.setFeeRecipient(next);
        assertEq(club.feeRecipient(), next);
    }

    function test_deposit_requires_plan() public {
        address noPlan = makeAddr("noPlan");
        vm.expectRevert(AutentikaSubscriptions.NoPlan.selector);
        vm.prank(sub);
        club.deposit(noPlan, 100e6);
    }

    function test_nextClaimAt() public {
        uint256 t0 = block.timestamp;
        vm.prank(sub);
        club.deposit(artist, 200e6);
        assertEq(club.nextClaimAt(artist, sub), t0 + 30 days);
    }
}
