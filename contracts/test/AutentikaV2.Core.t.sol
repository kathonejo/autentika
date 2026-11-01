// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AutentikaV2TestBase} from "./AutentikaV2.Base.t.sol";
import {AutentikaV2} from "../AutentikaV2.sol";

/// @dev Core commission flow: create / fund / deliver / release / refund / cancel / autoclaim / profile.
contract AutentikaV2CoreTest is AutentikaV2TestBase {

    // ─── createCommission ────────────────────────────────────────────────────

    function test_CreateCommission_HappyPath() public {
        vm.prank(artist);
        uint256 id = autentika.createCommission(
            collector, AMOUNT,
            uint64(block.timestamp + DEADLINE_OFFSET),
            TITLE, ROYALTY_BPS,
            new string[](0), new uint256[](0)
        );
        assertEq(id, 1);
        AutentikaV2.Commission memory c = autentika.getCommission(id);
        assertEq(c.artist, artist);
        assertEq(c.collector, collector);
        assertEq(c.amount, AMOUNT);
        assertEq(uint8(c.status), uint8(AutentikaV2.CommissionStatus.Created));
    }

    function test_CreateCommission_EmitsEvent() public {
        uint64 dl = uint64(block.timestamp + DEADLINE_OFFSET);
        vm.prank(artist);
        vm.expectEmit(true, true, true, true, address(autentika));
        emit AutentikaV2.CommissionCreated(1, artist, collector, AMOUNT, dl, TITLE);
        autentika.createCommission(collector, AMOUNT, dl, TITLE, ROYALTY_BPS,
            new string[](0), new uint256[](0));
    }

    function test_CreateCommission_RevertZeroCollector() public {
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidAddress.selector);
        autentika.createCommission(address(0), AMOUNT,
            uint64(block.timestamp + 1 days), TITLE, 0,
            new string[](0), new uint256[](0));
    }

    function test_CreateCommission_RevertZeroAmount() public {
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidAmount.selector);
        autentika.createCommission(collector, 0,
            uint64(block.timestamp + 1 days), TITLE, 0,
            new string[](0), new uint256[](0));
    }

    function test_CreateCommission_RevertDeadlineInPast() public {
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidDeadline.selector);
        autentika.createCommission(collector, AMOUNT,
            uint64(block.timestamp), TITLE, 0,
            new string[](0), new uint256[](0));
    }

    function test_CreateCommission_RevertEmptyTitle() public {
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.EmptyString.selector);
        autentika.createCommission(collector, AMOUNT,
            uint64(block.timestamp + 1 days), "", 0,
            new string[](0), new uint256[](0));
    }

    function test_CreateCommission_RevertRoyaltyBpsTooHigh() public {
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidFee.selector);
        autentika.createCommission(collector, AMOUNT,
            uint64(block.timestamp + 1 days), TITLE, 1001,
            new string[](0), new uint256[](0));
    }

    // ─── fundCommission ──────────────────────────────────────────────────────

    function test_FundCommission_HappyPath() public {
        uint256 id = _createCommission();
        uint256 balBefore = usdc.balanceOf(address(autentika));
        vm.startPrank(collector);
        usdc.approve(address(autentika), AMOUNT);
        autentika.fundCommission(id);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(autentika)), balBefore + AMOUNT);
        AutentikaV2.Commission memory c = autentika.getCommission(id);
        assertEq(uint8(c.status), uint8(AutentikaV2.CommissionStatus.Funded));
    }

    function test_FundCommission_EmitsEvent() public {
        uint256 id = _createCommission();
        vm.startPrank(collector);
        usdc.approve(address(autentika), AMOUNT);
        vm.expectEmit(true, true, false, true, address(autentika));
        emit AutentikaV2.CommissionFunded(id, collector, AMOUNT);
        autentika.fundCommission(id);
        vm.stopPrank();
    }

    function test_FundCommission_RevertWrongCaller() public {
        uint256 id = _createCommission();
        vm.prank(stranger);
        usdc.approve(address(autentika), AMOUNT);
        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.Unauthorized.selector);
        autentika.fundCommission(id);
    }

    function test_FundCommission_RevertWrongStatus() public {
        uint256 id = _fundCommission(); // already Funded
        vm.startPrank(collector);
        usdc.approve(address(autentika), AMOUNT);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.fundCommission(id);
        vm.stopPrank();
    }

    // ─── markDelivered ───────────────────────────────────────────────────────

    function test_MarkDelivered_HappyPath() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        autentika.markDelivered(id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE,
            DIMENSIONS, CREATION_DATE, CARE, PHOTO_URL, PHOTO_HASH);

        AutentikaV2.Commission memory c = autentika.getCommission(id);
        assertEq(uint8(c.status), uint8(AutentikaV2.CommissionStatus.Delivered));
        assertTrue(c.certificateId != bytes32(0));
        assertTrue(autentika.certificateExists(c.certificateId));
    }

    function test_MarkDelivered_EmitsEvent() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        vm.expectEmit(true, false, false, true, address(autentika));
        emit AutentikaV2.CommissionDelivered(id, bytes32(0), PHOTO_URL); // certId unknown; only check id+photoUrl
        // Re-call with less strict matching: only check commissionId (topic1) and photoUrl (data)
        // We'll use a softer check here
        autentika.markDelivered(id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE,
            DIMENSIONS, CREATION_DATE, CARE, PHOTO_URL, PHOTO_HASH);
    }

    function test_MarkDelivered_RevertWrongCaller() public {
        uint256 id = _fundCommission();
        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.Unauthorized.selector);
        autentika.markDelivered(id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE,
            DIMENSIONS, CREATION_DATE, CARE, PHOTO_URL, PHOTO_HASH);
    }

    function test_MarkDelivered_RevertWrongStatus() public {
        uint256 id = _createCommission(); // not funded
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.markDelivered(id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE,
            DIMENSIONS, CREATION_DATE, CARE, PHOTO_URL, PHOTO_HASH);
    }

    function test_MarkDelivered_RevertAfterDeadline() public {
        uint256 id = _fundCommission();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidDeadline.selector);
        autentika.markDelivered(id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE,
            DIMENSIONS, CREATION_DATE, CARE, PHOTO_URL, PHOTO_HASH);
    }

    function test_MarkDelivered_RevertEmptyStrings() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.EmptyString.selector);
        autentika.markDelivered(id, "", ARTIST_NAME, TECHNIQUE,
            DIMENSIONS, CREATION_DATE, CARE, PHOTO_URL, PHOTO_HASH);
    }

    function test_MarkDelivered_RevertZeroPhotoHash() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidPhotoHash.selector);
        autentika.markDelivered(id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE,
            DIMENSIONS, CREATION_DATE, CARE, PHOTO_URL, bytes32(0));
    }

    // ─── confirmReceipt ──────────────────────────────────────────────────────

    function test_ConfirmReceipt_HappyPath() public {
        (uint256 id, bytes32 certId) = _deliverCommission();

        uint256 feeBps = autentika.platformFeeBps();
        uint256 expectedFee = (AMOUNT * feeBps) / 10_000;
        uint256 expectedNet = AMOUNT - expectedFee;

        vm.prank(collector);
        autentika.confirmReceipt(id);

        assertEq(autentika.pendingWithdrawals(artist),  expectedNet);
        assertEq(autentika.pendingWithdrawals(feeRcpt), expectedFee);

        AutentikaV2.Commission memory c = autentika.getCommission(id);
        assertEq(uint8(c.status), uint8(AutentikaV2.CommissionStatus.Released));
        assertTrue(autentika.certTokenId(certId) != 0);
    }

    function test_ConfirmReceipt_EmitsEvent() public {
        (uint256 id, bytes32 certId) = _deliverCommission();
        vm.prank(collector);
        vm.expectEmit(true, true, false, false, address(autentika));
        emit AutentikaV2.CommissionReleased(id, certId);
        autentika.confirmReceipt(id);
    }

    function test_ConfirmReceipt_RevertWrongCaller() public {
        (uint256 id,) = _deliverCommission();
        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.Unauthorized.selector);
        autentika.confirmReceipt(id);
    }

    function test_ConfirmReceipt_RevertWrongStatus() public {
        uint256 id = _fundCommission(); // Funded not Delivered
        vm.prank(collector);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.confirmReceipt(id);
    }

    // ─── autoClaimAfterDelivery ──────────────────────────────────────────────

    function test_AutoClaimAfterDelivery_HappyPath() public {
        (uint256 id,) = _deliverCommission();
        AutentikaV2.Commission memory c0 = autentika.getCommission(id);
        vm.warp(uint256(c0.deliveredAt) + 14 days + 1);

        uint256 feeBps = autentika.platformFeeBps();
        uint256 expectedFee = (AMOUNT * feeBps) / 10_000;
        uint256 expectedNet = AMOUNT - expectedFee;

        vm.prank(artist);
        autentika.autoClaimAfterDelivery(id);

        assertEq(autentika.pendingWithdrawals(artist),  expectedNet);
        assertEq(autentika.pendingWithdrawals(feeRcpt), expectedFee);
    }

    function test_AutoClaimAfterDelivery_RevertTooSoon() public {
        (uint256 id,) = _deliverCommission();
        AutentikaV2.Commission memory c = autentika.getCommission(id);
        vm.warp(uint256(c.deliveredAt) + 13 days);
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.DeliveryClaimNotReady.selector);
        autentika.autoClaimAfterDelivery(id);
    }

    function test_AutoClaimAfterDelivery_RevertWrongCaller() public {
        (uint256 id,) = _deliverCommission();
        AutentikaV2.Commission memory c = autentika.getCommission(id);
        vm.warp(uint256(c.deliveredAt) + 14 days + 1);
        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.Unauthorized.selector);
        autentika.autoClaimAfterDelivery(id);
    }

    // ─── refundCollector ────────────────────────────────────────────────────

    function test_RefundCollector_HappyPath() public {
        uint256 id = _fundCommission();
        // Warp past deadline
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);

        vm.prank(collector);
        autentika.refundCollector(id);

        assertEq(autentika.pendingWithdrawals(collector), AMOUNT);
        AutentikaV2.Commission memory c = autentika.getCommission(id);
        assertEq(uint8(c.status), uint8(AutentikaV2.CommissionStatus.Refunded));
    }

    function test_RefundCollector_NoFee() public {
        uint256 id = _fundCommission();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(collector);
        autentika.refundCollector(id);
        // Fee recipient gets nothing
        assertEq(autentika.pendingWithdrawals(feeRcpt), 0);
    }

    function test_RefundCollector_EmitsEvent() public {
        uint256 id = _fundCommission();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(collector);
        vm.expectEmit(true, false, false, false, address(autentika));
        emit AutentikaV2.CommissionRefunded(id);
        autentika.refundCollector(id);
    }

    function test_RefundCollector_RevertBeforeDeadline() public {
        uint256 id = _fundCommission();
        vm.prank(collector);
        vm.expectRevert(AutentikaV2.InvalidDeadline.selector);
        autentika.refundCollector(id);
    }

    function test_RefundCollector_RevertWrongCaller() public {
        uint256 id = _fundCommission();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.Unauthorized.selector);
        autentika.refundCollector(id);
    }

    function test_RefundCollector_RevertWrongStatus() public {
        uint256 id = _createCommission(); // Created not Funded
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(collector);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.refundCollector(id);
    }

    // ─── cancelCommission ───────────────────────────────────────────────────

    function test_CancelCommission_ByArtist() public {
        uint256 id = _createCommission();
        vm.prank(artist);
        autentika.cancelCommission(id);
        AutentikaV2.Commission memory c = autentika.getCommission(id);
        assertEq(uint8(c.status), uint8(AutentikaV2.CommissionStatus.Cancelled));
    }

    function test_CancelCommission_ByCollector() public {
        uint256 id = _createCommission();
        vm.prank(collector);
        autentika.cancelCommission(id);
        AutentikaV2.Commission memory c = autentika.getCommission(id);
        assertEq(uint8(c.status), uint8(AutentikaV2.CommissionStatus.Cancelled));
    }

    function test_CancelCommission_EmitsEvent() public {
        uint256 id = _createCommission();
        vm.prank(artist);
        vm.expectEmit(true, true, false, false, address(autentika));
        emit AutentikaV2.CommissionCancelled(id, artist);
        autentika.cancelCommission(id);
    }

    function test_CancelCommission_RevertWrongCaller() public {
        uint256 id = _createCommission();
        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.Unauthorized.selector);
        autentika.cancelCommission(id);
    }

    function test_CancelCommission_RevertWrongStatus() public {
        uint256 id = _fundCommission(); // Funded not Created
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.cancelCommission(id);
    }

    // ─── setArtistProfile + snapshot ────────────────────────────────────────

    function test_SetArtistProfile_Stores() public {
        vm.prank(artist);
        autentika.setArtistProfile("Alice", "@alice", "seal.png", "sig.png");

        AutentikaV2.ArtistProfile memory p = autentika.getArtistProfile(artist);
        assertEq(p.displayName, "Alice");
        assertEq(p.instagramHandle, "@alice");
        assertEq(p.sealUrl, "seal.png");
        assertEq(p.signatureUrl, "sig.png");
        assertTrue(p.exists);
    }

    function test_SetArtistProfile_EmitsEvent() public {
        vm.prank(artist);
        vm.expectEmit(true, false, false, false, address(autentika));
        emit AutentikaV2.ArtistProfileUpdated(artist);
        autentika.setArtistProfile("Alice", "@alice", "seal.png", "sig.png");
    }

    function test_SetArtistProfile_SnapshotInCertificate() public {
        // Set profile before delivering
        vm.prank(artist);
        autentika.setArtistProfile("Alice", "@alice", "seal.png", "sig.png");

        (uint256 id, bytes32 certId) = _deliverCommission();

        // Update profile AFTER delivery — cert should still have original
        vm.prank(artist);
        autentika.setArtistProfile("New Name", "@new", "seal2.png", "sig2.png");

        AutentikaV2.Certificate memory cert = autentika.getCertificate(certId);
        assertEq(cert.sealUrl, "seal.png");
        assertEq(cert.signatureUrl, "sig.png");
        assertEq(cert.instagramHandle, "@alice");

        // Suppress unused variable warning
        (id);
    }

    // ─── withdraw pull pattern ───────────────────────────────────────────────

    function test_Withdraw_ArtistReceivesFunds() public {
        (, , uint256 tokenId) = _releaseCommission();
        (tokenId); // silence unused

        uint256 pending = autentika.pendingWithdrawals(artist);
        assertGt(pending, 0);

        uint256 balBefore = usdc.balanceOf(artist);
        vm.prank(artist);
        autentika.withdraw();
        assertEq(usdc.balanceOf(artist), balBefore + pending);
        assertEq(autentika.pendingWithdrawals(artist), 0);
    }

    function test_Withdraw_EmitsEvent() public {
        (, , uint256 tokenId) = _releaseCommission();
        (tokenId);
        uint256 pending = autentika.pendingWithdrawals(artist);

        vm.prank(artist);
        vm.expectEmit(true, false, false, true, address(autentika));
        emit AutentikaV2.Withdrawn(artist, pending);
        autentika.withdraw();
    }

    function test_Withdraw_RevertNothingToWithdraw() public {
        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.NothingToWithdraw.selector);
        autentika.withdraw();
    }
}
