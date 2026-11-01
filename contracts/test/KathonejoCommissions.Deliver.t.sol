// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {KathonejoCommissionsTestBase} from "./KathonejoCommissions.Base.t.sol";
import {KathonejoCommissions} from "../KathonejoCommissions.sol";

/// @dev markDelivered, confirmReceipt, autoClaimAfterDelivery, and certificate tests.
contract KathonejoCommissionsDeliverTest is KathonejoCommissionsTestBase {

    // ─── markDelivered happy path ────────────────────────────────────────────

    function test_MarkDelivered_SetsStatusDelivered() public {
        (uint256 id,) = _deliverCommission();
        KathonejoCommissions.Commission memory c = board.getCommission(id);
        assertEq(uint8(c.status), uint8(KathonejoCommissions.CommissionStatus.Delivered));
    }

    function test_MarkDelivered_StoresDeliveredAt() public {
        uint256 ts = block.timestamp;
        (uint256 id,) = _deliverCommission();
        KathonejoCommissions.Commission memory c = board.getCommission(id);
        assertEq(c.deliveredAt, uint64(ts));
    }

    function test_MarkDelivered_CreatesCertificate() public {
        (uint256 id, bytes32 certId) = _deliverCommission();
        KathonejoCommissions.Certificate memory cert = board.getCertificate(certId);

        assertEq(cert.id,           certId);
        assertEq(cert.commissionId, id);
        assertEq(cert.artistName,   ARTIST_NAME);
        assertEq(cert.artworkTitle, ARTWORK_TITLE);
        assertEq(cert.technique,    TECHNIQUE);
        assertEq(cert.dimensions,   DIMENSIONS);
        assertEq(cert.creationDate, CREATION_DATE);
        assertEq(cert.photoUrl,     PHOTO_URL);
        assertEq(cert.photoHash,    PHOTO_HASH);
    }

    function test_MarkDelivered_EmitsEvent() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        // We can't predict certId exactly without replicating the hash, so
        // only check topic 1 (id) and data (photoUrl) — skip topic 2 match.
        vm.expectEmit(true, false, false, true, address(board));
        // Emit a placeholder; forge checks only the fields we request.
        bytes32 anyCertId = bytes32(0); // topic2 not checked
        emit KathonejoCommissions.CommissionDelivered(id, anyCertId, PHOTO_URL);
        board.markDelivered(
            id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE, DIMENSIONS,
            CREATION_DATE, "", PHOTO_URL, PHOTO_HASH
        );
    }

    // ─── markDelivered reverts ───────────────────────────────────────────────

    function test_MarkDelivered_RevertsAfterDeadline() public {
        uint256 id = _fundCommission();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.InvalidDeadline.selector);
        board.markDelivered(
            id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE, DIMENSIONS,
            CREATION_DATE, "", PHOTO_URL, PHOTO_HASH
        );
    }

    function test_MarkDelivered_RevertsWrongCaller() public {
        uint256 id = _fundCommission();
        vm.prank(stranger);
        vm.expectRevert(KathonejoCommissions.Unauthorized.selector);
        board.markDelivered(
            id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE, DIMENSIONS,
            CREATION_DATE, "", PHOTO_URL, PHOTO_HASH
        );
    }

    function test_MarkDelivered_RevertsNotFunded() public {
        uint256 id = _createCommission();
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.InvalidStatus.selector);
        board.markDelivered(
            id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE, DIMENSIONS,
            CREATION_DATE, "", PHOTO_URL, PHOTO_HASH
        );
    }

    function test_MarkDelivered_RevertsEmptyArtworkTitle() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.EmptyString.selector);
        board.markDelivered(
            id, "", ARTIST_NAME, TECHNIQUE, DIMENSIONS,
            CREATION_DATE, "", PHOTO_URL, PHOTO_HASH
        );
    }

    function test_MarkDelivered_RevertsEmptyArtistName() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.EmptyString.selector);
        board.markDelivered(
            id, ARTWORK_TITLE, "", TECHNIQUE, DIMENSIONS,
            CREATION_DATE, "", PHOTO_URL, PHOTO_HASH
        );
    }

    function test_MarkDelivered_RevertsEmptyTechnique() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.EmptyString.selector);
        board.markDelivered(
            id, ARTWORK_TITLE, ARTIST_NAME, "", DIMENSIONS,
            CREATION_DATE, "", PHOTO_URL, PHOTO_HASH
        );
    }

    function test_MarkDelivered_RevertsEmptyDimensions() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.EmptyString.selector);
        board.markDelivered(
            id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE, "",
            CREATION_DATE, "", PHOTO_URL, PHOTO_HASH
        );
    }

    function test_MarkDelivered_RevertsEmptyPhotoUrl() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.EmptyString.selector);
        board.markDelivered(
            id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE, DIMENSIONS,
            CREATION_DATE, "", "", PHOTO_HASH
        );
    }

    function test_MarkDelivered_RevertsZeroPhotoHash() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.InvalidPhotoHash.selector);
        board.markDelivered(
            id, ARTWORK_TITLE, ARTIST_NAME, TECHNIQUE, DIMENSIONS,
            CREATION_DATE, "", PHOTO_URL, bytes32(0)
        );
    }

    // ─── confirmReceipt happy path ───────────────────────────────────────────

    function test_ConfirmReceipt_SetsStatusReleased() public {
        (uint256 id,) = _releaseCommission();
        KathonejoCommissions.Commission memory c = board.getCommission(id);
        assertEq(uint8(c.status), uint8(KathonejoCommissions.CommissionStatus.Released));
    }

    function test_ConfirmReceipt_SetsPendingWithdrawalForArtist() public {
        (uint256 id,) = _releaseCommission();
        // suppress unused var warning
        id;
        assertEq(board.pendingWithdrawals(artist), AMOUNT);
    }

    function test_ConfirmReceipt_SetsCollectorAsCertOwner() public {
        (, bytes32 certId) = _releaseCommission();
        KathonejoCommissions.Certificate memory cert = board.getCertificate(certId);
        assertEq(cert.currentOwner, collector);
        assertEq(cert.collector,    collector);
    }

    function test_ConfirmReceipt_EmitsReleased() public {
        (uint256 id, bytes32 certId) = _deliverCommission();
        vm.prank(collector);
        vm.expectEmit(true, true, false, false, address(board));
        emit KathonejoCommissions.CommissionReleased(id, certId);
        board.confirmReceipt(id);
    }

    function test_ConfirmReceipt_ArtistWithdrawReceivesTokens() public {
        _releaseCommission();
        uint256 before = usdc.balanceOf(artist);
        vm.prank(artist);
        board.withdraw();
        assertEq(usdc.balanceOf(artist), before + AMOUNT);
        assertEq(board.pendingWithdrawals(artist), 0);
    }

    // ─── confirmReceipt reverts ──────────────────────────────────────────────

    function test_ConfirmReceipt_RevertsWrongCaller() public {
        (uint256 id,) = _deliverCommission();
        vm.prank(stranger);
        vm.expectRevert(KathonejoCommissions.Unauthorized.selector);
        board.confirmReceipt(id);
    }

    function test_ConfirmReceipt_RevertsWrongStatus() public {
        uint256 id = _fundCommission();
        vm.prank(collector);
        vm.expectRevert(KathonejoCommissions.InvalidStatus.selector);
        board.confirmReceipt(id);
    }

    // ─── autoClaimAfterDelivery happy path ───────────────────────────────────

    function test_AutoClaim_AfterGracePeriod_ReleasesToArtist() public {
        (uint256 id, bytes32 certId) = _deliverCommission();
        vm.warp(block.timestamp + 14 days + 1);
        vm.prank(artist);
        board.autoClaimAfterDelivery(id);

        KathonejoCommissions.Commission memory c = board.getCommission(id);
        assertEq(uint8(c.status), uint8(KathonejoCommissions.CommissionStatus.Released));
        assertEq(board.pendingWithdrawals(artist), AMOUNT);
        // suppress unused certId
        certId;
    }

    function test_AutoClaim_EmitsReleased() public {
        (uint256 id, bytes32 certId) = _deliverCommission();
        vm.warp(block.timestamp + 14 days + 1);
        vm.prank(artist);
        vm.expectEmit(true, true, false, false, address(board));
        emit KathonejoCommissions.CommissionReleased(id, certId);
        board.autoClaimAfterDelivery(id);
    }

    // ─── autoClaimAfterDelivery reverts ──────────────────────────────────────

    function test_AutoClaim_RevertsBeforeGracePeriod() public {
        (uint256 id,) = _deliverCommission();
        vm.warp(block.timestamp + 14 days - 1);
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.DeliveryClaimNotReady.selector);
        board.autoClaimAfterDelivery(id);
    }

    function test_AutoClaim_RevertsWrongCaller() public {
        (uint256 id,) = _deliverCommission();
        vm.warp(block.timestamp + 14 days + 1);
        vm.prank(stranger);
        vm.expectRevert(KathonejoCommissions.Unauthorized.selector);
        board.autoClaimAfterDelivery(id);
    }

    function test_AutoClaim_RevertsWrongStatus() public {
        uint256 id = _fundCommission();
        vm.warp(block.timestamp + 14 days + 1);
        vm.prank(artist);
        vm.expectRevert(KathonejoCommissions.InvalidStatus.selector);
        board.autoClaimAfterDelivery(id);
    }

    // ─── certificate transfer happy path ────────────────────────────────────

    function test_TransferCertificate_ChangesOwner() public {
        (, bytes32 certId) = _releaseCommission();
        vm.prank(collector);
        board.transferCertificate(certId, stranger, 100e6);
        KathonejoCommissions.Certificate memory cert = board.getCertificate(certId);
        assertEq(cert.currentOwner, stranger);
    }

    function test_TransferCertificate_AppendsProvenance() public {
        (, bytes32 certId) = _releaseCommission();
        vm.prank(collector);
        board.transferCertificate(certId, stranger, 100e6);
        KathonejoCommissions.Certificate memory cert = board.getCertificate(certId);
        // collector is appended during _releaseFunds (index 0), then stranger (index 1)
        assertEq(cert.owners.length, 2);
        assertEq(cert.owners[1], stranger);
        assertEq(cert.prices[1], 100e6);
    }

    function test_TransferCertificate_EmitsEvent() public {
        (, bytes32 certId) = _releaseCommission();
        vm.prank(collector);
        vm.expectEmit(true, true, true, true, address(board));
        emit KathonejoCommissions.CertificateTransferred(certId, collector, stranger, 100e6);
        board.transferCertificate(certId, stranger, 100e6);
    }

    function test_TransferCertificate_ZeroPrice() public {
        (, bytes32 certId) = _releaseCommission();
        vm.prank(collector);
        board.transferCertificate(certId, stranger, 0);
        KathonejoCommissions.Certificate memory cert = board.getCertificate(certId);
        assertEq(cert.prices[1], 0);
    }

    // ─── certificate transfer reverts ───────────────────────────────────────

    function test_TransferCertificate_RevertsNotFound() public {
        vm.prank(stranger);
        vm.expectRevert(KathonejoCommissions.CertificateNotFound.selector);
        board.transferCertificate(bytes32(uint256(0xdead)), stranger, 0);
    }

    function test_TransferCertificate_RevertsUnauthorized() public {
        (, bytes32 certId) = _releaseCommission();
        vm.prank(stranger);
        vm.expectRevert(KathonejoCommissions.Unauthorized.selector);
        board.transferCertificate(certId, stranger, 0);
    }

    function test_TransferCertificate_RevertsZeroNewOwner() public {
        (, bytes32 certId) = _releaseCommission();
        vm.prank(collector);
        vm.expectRevert(KathonejoCommissions.InvalidAddress.selector);
        board.transferCertificate(certId, address(0), 0);
    }

    function test_TransferCertificate_RevertsSameOwner() public {
        (, bytes32 certId) = _releaseCommission();
        vm.prank(collector);
        vm.expectRevert(KathonejoCommissions.InvalidAddress.selector);
        board.transferCertificate(certId, collector, 0);
    }

    // ─── getCertificate revert ───────────────────────────────────────────────

    function test_GetCertificate_RevertsNotFound() public {
        vm.expectRevert(KathonejoCommissions.CertificateNotFound.selector);
        board.getCertificate(bytes32(uint256(0xdead)));
    }
}
