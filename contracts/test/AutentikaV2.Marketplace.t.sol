// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AutentikaV2TestBase} from "./AutentikaV2.Base.t.sol";
import {AutentikaV2} from "../AutentikaV2.sol";

/// @dev Resale marketplace: list / cancel / purchase. Legalization.
contract AutentikaV2MarketplaceTest is AutentikaV2TestBase {

    uint256 internal constant LIST_PRICE = 2_000e6; // 2000 USDC

    // ─── helper: mint NFT and list it ────────────────────────────────────────

    function _listCert() internal returns (uint256 tokenId, bytes32 certId) {
        (, certId, tokenId) = _releaseCommission();
        vm.prank(collector);
        autentika.listCertificate(tokenId, LIST_PRICE);
    }

    // ─── listCertificate ─────────────────────────────────────────────────────

    function test_List_HappyPath() public {
        (, , uint256 tokenId) = _releaseCommission();
        vm.prank(collector);
        autentika.listCertificate(tokenId, LIST_PRICE);

        AutentikaV2.Listing memory listing = autentika.getActiveListing(tokenId);
        assertTrue(listing.active);
        assertEq(listing.seller, collector);
        assertEq(listing.priceUsdc, LIST_PRICE);
    }

    function test_List_EmitsEvent() public {
        (, , uint256 tokenId) = _releaseCommission();
        vm.prank(collector);
        vm.expectEmit(true, true, false, true, address(autentika));
        emit AutentikaV2.CertificateListed(tokenId, collector, LIST_PRICE);
        autentika.listCertificate(tokenId, LIST_PRICE);
    }

    function test_List_RevertNonOwner() public {
        (, , uint256 tokenId) = _releaseCommission();
        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.Unauthorized.selector);
        autentika.listCertificate(tokenId, LIST_PRICE);
    }

    function test_List_RevertZeroPrice() public {
        (, , uint256 tokenId) = _releaseCommission();
        vm.prank(collector);
        vm.expectRevert(AutentikaV2.InvalidAmount.selector);
        autentika.listCertificate(tokenId, 0);
    }

    function test_List_RevertDuplicateListing() public {
        (uint256 tokenId,) = _listCert();
        vm.prank(collector);
        vm.expectRevert(AutentikaV2.InvalidStatus.selector);
        autentika.listCertificate(tokenId, LIST_PRICE);
    }

    // ─── cancelListing ───────────────────────────────────────────────────────

    function test_Cancel_HappyPath() public {
        (uint256 tokenId,) = _listCert();
        vm.prank(collector);
        autentika.cancelListing(tokenId);

        AutentikaV2.Listing memory listing = autentika.getActiveListing(tokenId);
        assertFalse(listing.active);
    }

    function test_Cancel_EmitsEvent() public {
        (uint256 tokenId,) = _listCert();
        vm.prank(collector);
        vm.expectEmit(true, false, false, false, address(autentika));
        emit AutentikaV2.ListingCancelled(tokenId);
        autentika.cancelListing(tokenId);
    }

    function test_Cancel_RevertNonSeller() public {
        (uint256 tokenId,) = _listCert();
        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.Unauthorized.selector);
        autentika.cancelListing(tokenId);
    }

    function test_Cancel_RevertNotListed() public {
        (, , uint256 tokenId) = _releaseCommission();
        vm.prank(collector);
        vm.expectRevert(AutentikaV2.NotListed.selector);
        autentika.cancelListing(tokenId);
    }

    // ─── purchaseCertificate ─────────────────────────────────────────────────

    function test_Purchase_HappyPath() public {
        // _listCert calls _releaseCommission internally which credits artist net +
        // fee from confirmReceipt into pendingWithdrawals. Drain those first so the
        // assertions below measure only the marketplace amounts.
        (, bytes32 certId, uint256 tokenId) = _releaseCommission();

        // Drain all pending from the initial confirmReceipt before listing.
        vm.prank(artist);
        autentika.withdraw();
        vm.prank(feeRcpt);
        autentika.withdraw();

        uint256 royaltyBps    = ROYALTY_BPS;                   // 250
        uint256 resaleBps     = autentika.platformResaleBps(); // 25
        uint256 royaltyAmt    = (LIST_PRICE * royaltyBps) / 10_000;
        uint256 resaleFee     = (LIST_PRICE * resaleBps)  / 10_000;
        uint256 sellerAmount  = LIST_PRICE - royaltyAmt - resaleFee;

        vm.prank(collector);
        autentika.listCertificate(tokenId, LIST_PRICE);

        vm.startPrank(buyer);
        usdc.approve(address(autentika), LIST_PRICE);
        autentika.purchaseCertificate(tokenId);
        vm.stopPrank();

        // NFT ownership transferred
        assertEq(autentika.ownerOf(tokenId), buyer);

        // Cert currentOwner updated
        AutentikaV2.Certificate memory cert = autentika.getCertificate(certId);
        assertEq(cert.currentOwner, buyer);

        // Pull payments (only from resale, pre-existing balances drained)
        assertEq(autentika.pendingWithdrawals(artist),    royaltyAmt);
        assertEq(autentika.pendingWithdrawals(feeRcpt),   resaleFee);
        assertEq(autentika.pendingWithdrawals(collector),  sellerAmount);

        // Listing cleared
        assertFalse(autentika.getActiveListing(tokenId).active);
    }

    function test_Purchase_EmitsEvents() public {
        (uint256 tokenId, bytes32 certId) = _listCert();

        vm.startPrank(buyer);
        usdc.approve(address(autentika), LIST_PRICE);
        vm.expectEmit(true, true, false, true, address(autentika));
        emit AutentikaV2.CertificatePurchased(tokenId, buyer, LIST_PRICE);
        autentika.purchaseCertificate(tokenId);
        vm.stopPrank();
        (certId);
    }

    function test_Purchase_RevertNotListed() public {
        (, , uint256 tokenId) = _releaseCommission();
        vm.startPrank(buyer);
        usdc.approve(address(autentika), LIST_PRICE);
        vm.expectRevert(AutentikaV2.NotListed.selector);
        autentika.purchaseCertificate(tokenId);
        vm.stopPrank();
    }

    function test_Purchase_RevertSellerCannotBuy() public {
        (uint256 tokenId,) = _listCert();
        vm.startPrank(collector);
        usdc.approve(address(autentika), LIST_PRICE);
        vm.expectRevert(AutentikaV2.InvalidAddress.selector);
        autentika.purchaseCertificate(tokenId);
        vm.stopPrank();
    }

    function test_GetActiveListing_ReturnsCorrectData() public {
        (uint256 tokenId,) = _listCert();
        AutentikaV2.Listing memory listing = autentika.getActiveListing(tokenId);
        assertEq(listing.seller, collector);
        assertEq(listing.priceUsdc, LIST_PRICE);
        assertTrue(listing.active);
    }

    // ─── legalize ────────────────────────────────────────────────────────────

    function test_Legalize_HappyPath() public {
        (, , uint256 tokenId) = _releaseCommission();
        bytes32 docHash = keccak256("legal-doc");
        string memory note = "Notarized by XYZ";

        vm.prank(artist);
        autentika.legalize(tokenId, docHash, note);

        (bytes32 storedHash,, , bool exists) = autentika.legalRecords(tokenId);
        assertTrue(exists);
        assertEq(storedHash, docHash);
    }

    function test_Legalize_EmitsEvent() public {
        (, , uint256 tokenId) = _releaseCommission();
        bytes32 docHash = keccak256("legal-doc");
        string memory note = "Note";

        vm.prank(artist);
        vm.expectEmit(true, false, false, true, address(autentika));
        emit AutentikaV2.CertificateLegalized(tokenId, docHash, note);
        autentika.legalize(tokenId, docHash, note);
    }

    function test_Legalize_RevertAlreadyLegalized() public {
        (, , uint256 tokenId) = _releaseCommission();
        bytes32 docHash = keccak256("doc");
        vm.prank(artist);
        autentika.legalize(tokenId, docHash, "");
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.AlreadyLegalized.selector);
        autentika.legalize(tokenId, docHash, "");
    }

    function test_Legalize_RevertNonArtist() public {
        (, , uint256 tokenId) = _releaseCommission();
        vm.prank(stranger);
        vm.expectRevert(AutentikaV2.Unauthorized.selector);
        autentika.legalize(tokenId, keccak256("doc"), "");
    }

    function test_Legalize_RevertZeroDocumentHash() public {
        (, , uint256 tokenId) = _releaseCommission();
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.InvalidPhotoHash.selector);
        autentika.legalize(tokenId, bytes32(0), "");
    }

    function test_Legalize_RevertNoCertificate() public {
        // tokenId 999 doesn't exist in certTokenId mapping
        vm.prank(artist);
        vm.expectRevert(AutentikaV2.CertificateNotFound.selector);
        autentika.legalize(999, keccak256("doc"), "");
    }
}
