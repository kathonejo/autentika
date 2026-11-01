// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AutentikaV2TestBase} from "./AutentikaV2.Base.t.sol";
import {AutentikaV2} from "../AutentikaV2.sol";

contract AutentikaV2MilestonesTest is AutentikaV2TestBase {

    // ─── createCommission with milestones ────────────────────────────────────

    function test_Milestones_CreateStoresMilestones() public {
        uint256 id = _createMilestoneCommission();
        AutentikaV2.Milestone[] memory ms = autentika.getMilestones(id);
        assertEq(ms.length, 2);
        assertEq(ms[0].description, "Sketch");
        assertEq(ms[0].amount, 400e6);
        assertFalse(ms[0].artistDone);
        assertFalse(ms[0].collectorApproved);
        assertEq(ms[1].description, "Final");
        assertEq(ms[1].amount, 600e6);
    }

    function test_Milestones_MismatchedLengthsRevert() public {
        string[]  memory descs   = new string[](2);
        uint256[] memory amounts = new uint256[](1);
        descs[0]   = "A"; descs[1] = "B";
        amounts[0] = AMOUNT;

        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidAmount.selector);
        autentika.createCommission(collector, AMOUNT,
            uint64(block.timestamp + DEADLINE_OFFSET), TITLE, 0, descs, amounts);
    }

    function test_Milestones_SumNotEqualTotalReverts() public {
        string[]  memory descs   = new string[](2);
        uint256[] memory amounts = new uint256[](2);
        descs[0]   = "A"; descs[1] = "B";
        amounts[0] = 300e6; amounts[1] = 600e6; // sum = 900, not 1000

        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidAmount.selector);
        autentika.createCommission(collector, AMOUNT,
            uint64(block.timestamp + DEADLINE_OFFSET), TITLE, 0, descs, amounts);
    }

    function test_Milestones_ExceedsMaxReverts() public {
        uint8 maxMs = autentika.MAX_MILESTONES(); // 20
        string[]  memory descs   = new string[](uint256(maxMs) + 1);
        uint256[] memory amounts = new uint256[](uint256(maxMs) + 1);
        uint256 each = AMOUNT / (uint256(maxMs) + 1);
        for (uint256 i = 0; i < descs.length; i++) {
            descs[i]   = "M";
            amounts[i] = each;
        }
        // Adjust last to make sum == AMOUNT
        amounts[descs.length - 1] = AMOUNT - each * maxMs;

        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidAmount.selector);
        autentika.createCommission(collector, AMOUNT,
            uint64(block.timestamp + DEADLINE_OFFSET), TITLE, 0, descs, amounts);
    }

    // ─── completeMilestone ───────────────────────────────────────────────────

    function test_Milestones_CompleteMilestoneHappyPath() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        vm.prank(artist);
        autentika.completeMilestone(id, 0);
        AutentikaV2.Milestone[] memory ms = autentika.getMilestones(id);
        assertTrue(ms[0].artistDone);
    }

    function test_Milestones_CompleteMilestone_EmitsEvent() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        vm.prank(artist);
        vm.expectEmit(true, true, false, false, address(autentika));
        emit AutentikaV2.MilestoneCompleted(id, 0);
        autentika.completeMilestone(id, 0);
    }

    function test_Milestones_CompleteMilestone_RevertWrongCaller() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.Unauthorized.selector);
        autentika.completeMilestone(id, 0);
    }

    function test_Milestones_CompleteMilestone_RevertWrongStatus() public {
        // Only Funded status is accepted
        uint256 id = _createMilestoneCommission();
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.completeMilestone(id, 0);
    }

    function test_Milestones_CompleteMilestone_RevertAlreadyDone() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        vm.prank(artist);
        autentika.completeMilestone(id, 0);
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.completeMilestone(id, 0);
    }

    function test_Milestones_CompleteMilestone_RevertOutOfBounds() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.completeMilestone(id, 99);
    }

    // ─── approveMilestone ────────────────────────────────────────────────────

    function test_Milestones_ApproveMilestone_PartialRelease() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();

        // Artist completes milestone 0
        vm.prank(artist);
        autentika.completeMilestone(id, 0);

        uint256 feeBps = autentika.platformFeeBps();
        uint256 amount0 = 400e6;
        uint256 fee0 = (amount0 * feeBps) / 10_000;
        uint256 net0 = amount0 - fee0;

        // Collector approves milestone 0
        vm.prank(collector);
        autentika.approveMilestone(id, 0);

        assertEq(autentika.pendingWithdrawals(artist),  net0);
        assertEq(autentika.pendingWithdrawals(feeRcpt), fee0);

        // Commission still Funded (not all milestones done)
        AutentikaV2.Commission memory c = autentika.getCommission(id);
        assertEq(uint8(c.status), uint8(AutentikaV2.CommissionStatus.Funded));
    }

    function test_Milestones_ApproveMilestone_EmitsEvent() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        vm.prank(artist);
        autentika.completeMilestone(id, 0);

        uint256 feeBps = autentika.platformFeeBps();
        uint256 net0 = 400e6 - (400e6 * feeBps) / 10_000;

        vm.prank(collector);
        vm.expectEmit(true, true, false, true, address(autentika));
        emit AutentikaV2.MilestoneApproved(id, 0, net0);
        autentika.approveMilestone(id, 0);
    }

    function test_Milestones_AllMilestonesApproved_ReleasesAndMintsNFT() public {
        (uint256 id, bytes32 certId) = _fundAndDeliverMilestoneCommission();

        // Complete + approve both milestones
        vm.prank(artist);
        autentika.completeMilestone(id, 0);
        vm.prank(collector);
        autentika.approveMilestone(id, 0);

        vm.prank(artist);
        autentika.completeMilestone(id, 1);
        vm.prank(collector);
        autentika.approveMilestone(id, 1);

        AutentikaV2.Commission memory c = autentika.getCommission(id);
        assertEq(uint8(c.status), uint8(AutentikaV2.CommissionStatus.Released));

        // NFT minted
        uint256 tokenId = autentika.certTokenId(certId);
        assertGt(tokenId, 0);
        assertEq(autentika.ownerOf(tokenId), collector);
    }

    function test_Milestones_ApproveMilestone_RevertWrongCaller() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        vm.prank(artist);
        autentika.completeMilestone(id, 0);

        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.Unauthorized.selector);
        autentika.approveMilestone(id, 0);
    }

    function test_Milestones_ApproveMilestone_RevertNotArtistDone() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        // artist hasn't called completeMilestone yet
        vm.prank(collector);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.approveMilestone(id, 0);
    }

    function test_Milestones_ApproveMilestone_RevertAlreadyApproved() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        vm.prank(artist);
        autentika.completeMilestone(id, 0);
        vm.prank(collector);
        autentika.approveMilestone(id, 0);
        vm.prank(collector);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.approveMilestone(id, 0);
    }

    function test_Milestones_ApproveMilestone_RevertNoCertificate() public {
        // Fund but do NOT call markDelivered → certificateId == 0
        uint256 id = _createMilestoneCommission();
        vm.startPrank(collector);
        usdc.approve(address(autentika), AMOUNT);
        autentika.fundCommission(id);
        vm.stopPrank();

        vm.prank(artist);
        autentika.completeMilestone(id, 0);

        vm.prank(collector);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.approveMilestone(id, 0);
    }

    // ─── confirmReceipt reverts with UseMilestoneFlow ────────────────────────

    function test_Milestones_ConfirmReceiptRevertsWithUseMilestoneFlow() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        // status is still Funded for milestone commissions
        // need Delivered; but milestone commissions stay Funded after markDelivered
        // So we expect UseMilestoneFlow regardless
        vm.prank(collector);
        vm.expectRevert(AutentikaV2.UseMilestoneFlow.selector);
        autentika.confirmReceipt(id);
    }

    // ─── partial milestone approved → refund reduced amount ─────────────────

    function test_Milestones_PartialApproval_RefundReducedAmount() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();

        // Approve milestone 0 (400 USDC)
        vm.prank(artist);
        autentika.completeMilestone(id, 0);
        vm.prank(collector);
        autentika.approveMilestone(id, 0);

        // Warp past deadline
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);

        // Collector refunds remaining
        vm.prank(collector);
        autentika.refundCollector(id);

        // releasedSoFar = 400e6, amount = 1000e6, refund = 600e6
        assertEq(autentika.pendingWithdrawals(collector), 600e6);
    }

    // ─── autoClaimMilestone ──────────────────────────────────────────────────

    function test_AutoClaimMilestone_AfterWindow() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        vm.prank(artist);
        autentika.completeMilestone(id, 0);

        // Warp 14 days after last action
        uint64 lastAction = autentika.lastMilestoneActionAt(id);
        vm.warp(uint256(lastAction) + 14 days + 1);

        uint256 feeBps = autentika.platformFeeBps();
        uint256 fee0 = (400e6 * feeBps) / 10_000;
        uint256 net0 = 400e6 - fee0;

        vm.prank(artist);
        autentika.autoClaimMilestone(id, 0);

        assertEq(autentika.pendingWithdrawals(artist),  net0);
    }

    function test_AutoClaimMilestone_AfterDeadline() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        vm.prank(artist);
        autentika.completeMilestone(id, 0);

        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);

        vm.prank(artist);
        autentika.autoClaimMilestone(id, 0);

        assertGt(autentika.pendingWithdrawals(artist), 0);
    }

    function test_AutoClaimMilestone_RevertWindowNotPassed() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        vm.prank(artist);
        autentika.completeMilestone(id, 0);

        // Only 1 day after last action — not enough
        vm.warp(block.timestamp + 1 days);

        vm.prank(artist);
        vm.expectRevert(AutentikaV2.MilestoneClaimNotReady.selector);
        autentika.autoClaimMilestone(id, 0);
    }

    function test_AutoClaimMilestone_RevertNoCertificate() public {
        // Fund but no markDelivered
        uint256 id = _createMilestoneCommission();
        vm.startPrank(collector);
        usdc.approve(address(autentika), AMOUNT);
        autentika.fundCommission(id);
        vm.stopPrank();

        vm.prank(artist);
        autentika.completeMilestone(id, 0);

        uint64 lastAction = autentika.lastMilestoneActionAt(id);
        vm.warp(uint256(lastAction) + 14 days + 1);

        vm.prank(artist);
        vm.expectRevert(AutentikaV2.CertificateNotFound.selector);
        autentika.autoClaimMilestone(id, 0);
    }

    function test_AutoClaimMilestone_RevertArtistNotDone() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        // Don't call completeMilestone
        uint64 lastAction = autentika.lastMilestoneActionAt(id);
        vm.warp(uint256(lastAction) + 14 days + 1);

        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.autoClaimMilestone(id, 0);
    }

    function test_AutoClaimMilestone_RevertWrongCaller() public {
        (uint256 id,) = _fundAndDeliverMilestoneCommission();
        vm.prank(artist);
        autentika.completeMilestone(id, 0);

        uint64 lastAction = autentika.lastMilestoneActionAt(id);
        vm.warp(uint256(lastAction) + 14 days + 1);

        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.Unauthorized.selector);
        autentika.autoClaimMilestone(id, 0);
    }
}
