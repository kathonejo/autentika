// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AutentikaV2TestBase} from "./AutentikaV2.Base.t.sol";
import {AutentikaV2} from "../AutentikaV2.sol";

contract AutentikaV2FuzzTest is AutentikaV2TestBase {

    // ─── fuzz: createCommission amount and deadline ───────────────────────────

    function testFuzz_CreateCommission_AnyValidAmountDeadline(
        uint256 amount,
        uint64  deadlineOffset
    ) public {
        amount         = bound(amount, 1, 1_000_000e6);
        deadlineOffset = uint64(bound(deadlineOffset, 1, 365 days));
        uint64 deadline = uint64(block.timestamp) + deadlineOffset;

        usdc.mint(collector, amount);

        vm.prank(artist);
        uint256 id = autentika.createCommission(
            collector, amount, deadline, TITLE, 0,
            new string[](0), new uint256[](0)
        );

        AutentikaV2.Commission memory c = autentika.getCommission(id);
        assertEq(c.amount, amount);
        assertEq(c.deadline, deadline);
        assertEq(uint8(c.status), uint8(AutentikaV2.CommissionStatus.Created));
    }

    // ─── fuzz: fee + net always sum to full amount ────────────────────────────

    function testFuzz_FeeSplit_FeeAndNetSumToAmount(uint16 feeBps, uint256 amount) public {
        feeBps = uint16(bound(feeBps, 0, autentika.MAX_PLATFORM_FEE_BPS())); // 0..200
        amount = bound(amount, 1, 10_000_000e6);

        // Set the fee
        vm.prank(owner);
        autentika.setPlatformFeeBps(feeBps);

        // Seed and create commission
        usdc.mint(collector, amount);

        vm.prank(artist);
        uint256 id = autentika.createCommission(
            collector, amount,
            uint64(block.timestamp + 30 days),
            TITLE, 0,
            new string[](0), new uint256[](0)
        );

        vm.startPrank(collector);
        usdc.approve(address(autentika), amount);
        autentika.fundCommission(id);
        vm.stopPrank();

        vm.prank(artist);
        autentika.markDelivered(id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE,
            DIMENSIONS, CREATION_DATE, CARE, PHOTO_URL, PHOTO_HASH);

        vm.prank(collector);
        autentika.confirmReceipt(id);

        uint256 artistPending = autentika.pendingWithdrawals(artist);
        uint256 feePending    = autentika.pendingWithdrawals(feeRcpt);

        // PROPERTY: artist net + fee == full amount
        assertEq(artistPending + feePending, amount);
    }

    // ─── fuzz: milestone amounts sum equals total ─────────────────────────────

    function testFuzz_Milestones_AmountsSumToTotal(
        uint256 amount0,
        uint256 amount1,
        uint256 amount2
    ) public {
        // Clamp so amounts are non-zero and fit in USDC range
        amount0 = bound(amount0, 1e6, 100_000e6);
        amount1 = bound(amount1, 1e6, 100_000e6);
        amount2 = bound(amount2, 1e6, 100_000e6);
        uint256 total = amount0 + amount1 + amount2;

        usdc.mint(collector, total);

        string[]  memory descs   = new string[](3);
        uint256[] memory amounts = new uint256[](3);
        descs[0] = "M0"; descs[1] = "M1"; descs[2] = "M2";
        amounts[0] = amount0; amounts[1] = amount1; amounts[2] = amount2;

        vm.prank(artist);
        uint256 id = autentika.createCommission(
            collector, total,
            uint64(block.timestamp + 30 days),
            TITLE, 0,
            descs, amounts
        );

        // Fund and confirm milestones were stored
        AutentikaV2.Milestone[] memory ms = autentika.getMilestones(id);
        assertEq(ms.length, 3);
        assertEq(ms[0].amount + ms[1].amount + ms[2].amount, total);
    }

    // ─── fuzz: wrong amounts sum reverts ─────────────────────────────────────

    function testFuzz_Milestones_WrongSumReverts(
        uint256 amount0,
        uint256 amount1,
        uint256 total
    ) public {
        amount0 = bound(amount0, 1e6, 500_000e6);
        amount1 = bound(amount1, 1e6, 500_000e6);
        // Ensure total != amount0 + amount1
        uint256 correctSum = amount0 + amount1;
        total = bound(total, 1, type(uint128).max);
        vm.assume(total != correctSum);

        string[]  memory descs   = new string[](2);
        uint256[] memory amounts = new uint256[](2);
        descs[0] = "A"; descs[1] = "B";
        amounts[0] = amount0; amounts[1] = amount1;

        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidAmount.selector);
        autentika.createCommission(
            collector, total,
            uint64(block.timestamp + 30 days),
            TITLE, 0,
            descs, amounts
        );
    }

    // ─── fuzz: resale marketplace fee split correctness ──────────────────────

    function testFuzz_ResalePurchase_FeeSplit(
        uint256 price,
        uint16  royaltyBps,
        uint16  resaleBps
    ) public {
        royaltyBps = uint16(bound(royaltyBps, 0, 1000));
        resaleBps  = uint16(bound(resaleBps,  0, autentika.MAX_RESALE_BPS()));
        // Ensure royalty + resale fee doesn't exceed price
        price = bound(price, 10_000, 10_000e6);

        // Only valid if royalty + resale <= price
        uint256 royaltyAmt = (price * royaltyBps) / 10_000;
        uint256 resaleFee  = (price * resaleBps)  / 10_000;
        vm.assume(royaltyAmt + resaleFee <= price);

        // Set resale bps
        vm.prank(owner);
        autentika.setPlatformResaleBps(resaleBps);

        // Create commission with royaltyBps
        usdc.mint(collector, AMOUNT);
        vm.prank(artist);
        uint256 id = autentika.createCommission(
            collector, AMOUNT,
            uint64(block.timestamp + 30 days),
            TITLE, royaltyBps,
            new string[](0), new uint256[](0)
        );
        vm.startPrank(collector);
        usdc.approve(address(autentika), AMOUNT);
        autentika.fundCommission(id);
        vm.stopPrank();

        vm.prank(artist);
        autentika.markDelivered(id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE,
            DIMENSIONS, CREATION_DATE, CARE, PHOTO_URL, PHOTO_HASH);

        vm.prank(collector);
        autentika.confirmReceipt(id);

        AutentikaV2.Commission memory c = autentika.getCommission(id);
        uint256 tokenId = autentika.certTokenId(c.certificateId);

        // drain artist's pending (from confirmReceipt) before listing to keep accounting clean
        vm.prank(artist);
        autentika.withdraw();
        vm.prank(feeRcpt);
        autentika.withdraw();

        // List and purchase
        vm.prank(collector);
        autentika.listCertificate(tokenId, price);

        usdc.mint(buyer, price);
        vm.startPrank(buyer);
        usdc.approve(address(autentika), price);
        autentika.purchaseCertificate(tokenId);
        vm.stopPrank();

        uint256 artistPending   = autentika.pendingWithdrawals(artist);
        uint256 feePending      = autentika.pendingWithdrawals(feeRcpt);
        uint256 collectorPending= autentika.pendingWithdrawals(collector);

        // PROPERTY: royalty + resaleFee + sellerAmount == price
        assertEq(artistPending + feePending + collectorPending, price);
    }
}
