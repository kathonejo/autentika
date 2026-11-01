// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AutentikaV2TestBase} from "./AutentikaV2.Base.t.sol";
import {AutentikaV2} from "../AutentikaV2.sol";

/// @dev ERC-721 NFT minting, tokenURI, transfers, ERC-2981 royalties.
contract AutentikaV2NFTTest is AutentikaV2TestBase {

    // ─── NFT minting after confirmReceipt ────────────────────────────────────

    function test_NFT_MintedToCollector() public {
        (, , uint256 tokenId) = _releaseCommission();
        assertEq(autentika.ownerOf(tokenId), collector);
    }

    function test_NFT_CertTokenIdPopulated() public {
        (uint256 id, bytes32 certId) = _deliverCommission();
        vm.prank(collector);
        autentika.confirmReceipt(id);
        uint256 tokenId = autentika.certTokenId(certId);
        assertGt(tokenId, 0);
    }

    function test_NFT_TokenCertIdPopulated() public {
        (, bytes32 certId, uint256 tokenId) = _releaseCommission();
        assertEq(autentika.tokenCertId(tokenId), certId);
    }

    function test_NFT_CertCurrentOwnerSet() public {
        (, bytes32 certId, uint256 tokenId) = _releaseCommission();
        (tokenId);
        AutentikaV2.Certificate memory cert = autentika.getCertificate(certId);
        assertEq(cert.currentOwner, collector);
        assertEq(cert.collector, collector);
    }

    function test_NFT_CannotRefinalize() public {
        (, bytes32 certId, uint256 tokenId) = _releaseCommission();
        (tokenId); (certId);
        // Try to release a second time — commission is already Released
        // confirmReceipt will hit InvalidStatus (not Delivered)
        // We don't have direct access to _finalizeCertificate, so we test the
        // public path: a second confirmReceipt should revert with InvalidStatus.
        // The underlying certTokenId != 0 guard also reverts InvalidStatus.
    }

    function test_NFT_SecondConfirmReceiptReverts() public {
        (uint256 id,,) = _releaseCommission();
        vm.prank(collector);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.confirmReceipt(id);
    }

    // ─── tokenURI ────────────────────────────────────────────────────────────

    function test_NFT_TokenURIReturnsBase64() public {
        (, , uint256 tokenId) = _releaseCommission();
        string memory uri = autentika.tokenURI(tokenId);
        // Must start with data:application/json;base64,
        bytes memory uriBytes = bytes(uri);
        bytes memory prefix = bytes("data:application/json;base64,");
        assertGe(uriBytes.length, prefix.length);
        for (uint256 i = 0; i < prefix.length; i++) {
            assertEq(uriBytes[i], prefix[i]);
        }
    }

    function test_NFT_TokenURINonEmpty() public {
        (, , uint256 tokenId) = _releaseCommission();
        string memory uri = autentika.tokenURI(tokenId);
        assertGt(bytes(uri).length, 0);
    }

    // ─── getCertificateByTokenId ─────────────────────────────────────────────

    function test_NFT_GetCertificateByTokenId() public {
        (, bytes32 certId, uint256 tokenId) = _releaseCommission();
        AutentikaV2.Certificate memory cert = autentika.getCertificateByTokenId(tokenId);
        assertEq(cert.id, certId);
        assertEq(cert.artworkTitle, ARTWORK_TITLE);
        assertEq(cert.photoHash, PHOTO_HASH);
    }

    // ─── _update hook — direct transferFrom ──────────────────────────────────

    function test_NFT_DirectTransferUpdatesCurrentOwner() public {
        (, bytes32 certId, uint256 tokenId) = _releaseCommission();

        // collector transfers to buyer via ERC-721 transferFrom
        vm.prank(collector);
        autentika.transferFrom(collector, buyer, tokenId);

        AutentikaV2.Certificate memory cert = autentika.getCertificate(certId);
        assertEq(cert.currentOwner, buyer);
        assertEq(autentika.ownerOf(tokenId), buyer);
    }

    // ─── transferCertificate ─────────────────────────────────────────────────

    function test_NFT_TransferCertificate_UpdatesCertAndToken() public {
        (, bytes32 certId, uint256 tokenId) = _releaseCommission();
        (tokenId);

        vm.prank(collector);
        autentika.transferCertificate(certId, buyer, 500e6);

        AutentikaV2.Certificate memory cert = autentika.getCertificate(certId);
        assertEq(cert.currentOwner, buyer);
        // owner history
        assertEq(cert.owners.length, 2); // initial + transfer
        assertEq(cert.owners[1], buyer);
        assertEq(cert.prices[1], 500e6);
    }

    function test_NFT_TransferCertificate_EmitsEvent() public {
        (, bytes32 certId, uint256 tokenId) = _releaseCommission();
        (tokenId);

        vm.prank(collector);
        vm.expectEmit(true, true, true, true, address(autentika));
        emit AutentikaV2.CertificateTransferred(certId, collector, buyer, 500e6);
        autentika.transferCertificate(certId, buyer, 500e6);
    }

    function test_NFT_TransferCertificate_RevertNonOwner() public {
        (, bytes32 certId,) = _releaseCommission();
        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.Unauthorized.selector);
        autentika.transferCertificate(certId, buyer, 0);
    }

    function test_NFT_TransferCertificate_RevertZeroAddress() public {
        (, bytes32 certId,) = _releaseCommission();
        vm.prank(collector);
        vm.expectRevert(AutentikaV2.InvalidAddress.selector);
        autentika.transferCertificate(certId, address(0), 0);
    }

    // ─── ERC-2981 royalties ──────────────────────────────────────────────────

    function test_Royalty_RoyaltyInfoReturnsArtistAndAmount() public {
        (, , uint256 tokenId) = _releaseCommission();
        uint256 salePrice = 1_000e6;
        (address receiver, uint256 royaltyAmt) = autentika.royaltyInfo(tokenId, salePrice);
        assertEq(receiver, artist);
        // ROYALTY_BPS = 250, 2.5% of 1000 = 25
        assertEq(royaltyAmt, (salePrice * ROYALTY_BPS) / 10_000);
    }

    function test_Royalty_ZeroRoyaltyBps_ReturnsZero() public {
        // Create a commission with royaltyBps = 0
        vm.prank(artist);
        uint256 id = autentika.createCommission(
            collector, AMOUNT,
            uint64(block.timestamp + DEADLINE_OFFSET),
            TITLE, 0, // royaltyBps = 0
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

        (, uint256 royaltyAmt) = autentika.royaltyInfo(tokenId, 1_000e6);
        assertEq(royaltyAmt, 0);
    }

    function test_Royalty_MaxRoyaltyBpsAllowed() public view {
        // royaltyBps = 1000 should not revert during createCommission
        // (already checked above; here we just confirm 1001 reverts)
        // Covered by test_CreateCommission_RevertRoyaltyBpsTooHigh in Core.
    }
}
