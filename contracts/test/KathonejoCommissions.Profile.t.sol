// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {KathonejoCommissionsTestBase} from "./KathonejoCommissions.Base.t.sol";
import {KathonejoCommissions} from "../KathonejoCommissions.sol";

/// @dev Tests for setArtistProfile, getArtistProfile, and markDelivered
///      behaviours that depend on the artist profile (careInstructions,
///      signatureUrl / instagramHandle snapshot) and Certificate field ordering.
contract KathonejoCommissionsProfileTest is KathonejoCommissionsTestBase {

    // ─── profile constants ───────────────────────────────────────────────────
    string internal constant DISPLAY_NAME      = "Kathonjeo";
    string internal constant INSTAGRAM_HANDLE  = "kathonjeo_art";
    string internal constant SEAL_URL          = "ipfs://seal";
    string internal constant SIGNATURE_URL     = "ipfs://sig";

    string internal constant CARE_INSTRUCTIONS = "Keep away from direct sunlight.";

    // ─── setArtistProfile happy path ────────────────────────────────────────

    /// @dev Stored fields match what was passed.
    function test_SetArtistProfile_StoresAllFields() public {
        vm.prank(artist);
        board.setArtistProfile(
            DISPLAY_NAME,
            INSTAGRAM_HANDLE,
            SEAL_URL,
            SIGNATURE_URL
        );

        KathonejoCommissions.ArtistProfile memory p = board.getArtistProfile(artist);
        assertEq(p.displayName,     DISPLAY_NAME);
        assertEq(p.instagramHandle, INSTAGRAM_HANDLE);
        assertEq(p.sealUrl,         SEAL_URL);
        assertEq(p.signatureUrl,    SIGNATURE_URL);
        assertTrue(p.exists);
    }

    /// @dev getArtistProfile returns default (empty / exists==false) for an
    ///      address that has never called setArtistProfile.
    function test_GetArtistProfile_UnknownAddressReturnsDefault() public view {
        KathonejoCommissions.ArtistProfile memory p = board.getArtistProfile(stranger);
        assertEq(p.displayName,     "");
        assertEq(p.instagramHandle, "");
        assertFalse(p.exists);
    }

    /// @dev A second call overwrites all fields and re-emits the event.
    function test_SetArtistProfile_UpdateOverwritesFields() public {
        vm.prank(artist);
        board.setArtistProfile("Old Name", "old_handle", "ipfs://old-seal", "ipfs://old-sig");

        vm.prank(artist);
        board.setArtistProfile(
            DISPLAY_NAME,
            INSTAGRAM_HANDLE,
            SEAL_URL,
            SIGNATURE_URL
        );

        KathonejoCommissions.ArtistProfile memory p = board.getArtistProfile(artist);
        assertEq(p.displayName,     DISPLAY_NAME);
        assertEq(p.instagramHandle, INSTAGRAM_HANDLE);
        assertEq(p.sealUrl,         SEAL_URL);
        assertEq(p.signatureUrl,    SIGNATURE_URL);
    }

    /// @dev setArtistProfile emits ArtistProfileUpdated with the artist's address.
    function test_SetArtistProfile_EmitsArtistProfileUpdated() public {
        vm.prank(artist);
        vm.expectEmit(true, false, false, false, address(board));
        emit KathonejoCommissions.ArtistProfileUpdated(artist);
        board.setArtistProfile(
            DISPLAY_NAME,
            INSTAGRAM_HANDLE,
            SEAL_URL,
            SIGNATURE_URL
        );
    }

    // ─── markDelivered with non-empty careInstructions ───────────────────────

    /// @dev careInstructions is stored on the certificate when a non-empty
    ///      string is supplied.
    function test_MarkDelivered_StoresCareInstructions() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        board.markDelivered(
            id,
            ARTWORK_TITLE,
            ARTIST_NAME,
            TECHNIQUE,
            DIMENSIONS,
            CREATION_DATE,
            CARE_INSTRUCTIONS,
            PHOTO_URL,
            PHOTO_HASH
        );

        KathonejoCommissions.Commission memory c = board.getCommission(id);
        KathonejoCommissions.Certificate memory cert = board.getCertificate(c.certificateId);
        assertEq(cert.careInstructions, CARE_INSTRUCTIONS);
    }

    /// @dev An empty careInstructions string is also stored without reverting.
    function test_MarkDelivered_EmptyCareInstructionsAllowed() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        board.markDelivered(
            id,
            ARTWORK_TITLE,
            ARTIST_NAME,
            TECHNIQUE,
            DIMENSIONS,
            CREATION_DATE,
            "",
            PHOTO_URL,
            PHOTO_HASH
        );

        KathonejoCommissions.Commission memory c = board.getCommission(id);
        KathonejoCommissions.Certificate memory cert = board.getCertificate(c.certificateId);
        assertEq(cert.careInstructions, "");
    }

    // ─── markDelivered snapshots signatureUrl and instagramHandle ───────────

    /// @dev When the artist has a profile, signatureUrl and instagramHandle
    ///      are snapshotted from the profile into the certificate at delivery time.
    function test_MarkDelivered_SnapshotsSignatureUrlFromProfile() public {
        // Set artist profile first
        vm.prank(artist);
        board.setArtistProfile(
            DISPLAY_NAME,
            INSTAGRAM_HANDLE,
            SEAL_URL,
            SIGNATURE_URL
        );

        uint256 id = _fundCommission();
        vm.prank(artist);
        board.markDelivered(
            id,
            ARTWORK_TITLE,
            ARTIST_NAME,
            TECHNIQUE,
            DIMENSIONS,
            CREATION_DATE,
            "",
            PHOTO_URL,
            PHOTO_HASH
        );

        KathonejoCommissions.Commission memory c = board.getCommission(id);
        KathonejoCommissions.Certificate memory cert = board.getCertificate(c.certificateId);
        assertEq(cert.signatureUrl,    SIGNATURE_URL);
        assertEq(cert.instagramHandle, INSTAGRAM_HANDLE);
    }

    /// @dev signatureUrl and instagramHandle must be empty strings on the
    ///      certificate when the artist has no profile set.
    function test_MarkDelivered_SnapshotsEmptyWhenNoProfile() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        board.markDelivered(
            id,
            ARTWORK_TITLE,
            ARTIST_NAME,
            TECHNIQUE,
            DIMENSIONS,
            CREATION_DATE,
            "",
            PHOTO_URL,
            PHOTO_HASH
        );

        KathonejoCommissions.Commission memory c = board.getCommission(id);
        KathonejoCommissions.Certificate memory cert = board.getCertificate(c.certificateId);
        assertEq(cert.signatureUrl,    "");
        assertEq(cert.instagramHandle, "");
    }

    /// @dev Updating the profile AFTER delivery does NOT change the snapshot
    ///      already baked into the certificate.
    function test_MarkDelivered_SnapshotIsImmutableAfterProfileUpdate() public {
        // Set initial profile
        vm.prank(artist);
        board.setArtistProfile(DISPLAY_NAME, INSTAGRAM_HANDLE, SEAL_URL, SIGNATURE_URL);

        uint256 id = _fundCommission();
        vm.prank(artist);
        board.markDelivered(
            id,
            ARTWORK_TITLE,
            ARTIST_NAME,
            TECHNIQUE,
            DIMENSIONS,
            CREATION_DATE,
            "",
            PHOTO_URL,
            PHOTO_HASH
        );

        // Now overwrite the profile with new values
        vm.prank(artist);
        board.setArtistProfile("New Name", "new_handle", "ipfs://new-seal", "ipfs://new-sig");

        // Certificate still holds the OLD snapshot
        KathonejoCommissions.Commission memory c = board.getCommission(id);
        KathonejoCommissions.Certificate memory cert = board.getCertificate(c.certificateId);
        assertEq(cert.signatureUrl,    SIGNATURE_URL);
        assertEq(cert.instagramHandle, INSTAGRAM_HANDLE);
    }

    // ─── Certificate struct field ordering (artworkTitle before artistName) ──

    /// @dev artworkTitle and artistName are stored in the correct fields and
    ///      neither value is swapped at rest.
    function test_Certificate_ArtworkTitleBeforeArtistName() public {
        uint256 id = _fundCommission();
        vm.prank(artist);
        board.markDelivered(
            id,
            ARTWORK_TITLE,   // param 2: artworkTitle
            ARTIST_NAME,     // param 3: artistName
            TECHNIQUE,
            DIMENSIONS,
            CREATION_DATE,
            "",
            PHOTO_URL,
            PHOTO_HASH
        );

        KathonejoCommissions.Commission memory c = board.getCommission(id);
        KathonejoCommissions.Certificate memory cert = board.getCertificate(c.certificateId);

        // artworkTitle and artistName must be distinct constants to make this
        // test meaningful — confirmed by the base constants.
        assertEq(cert.artworkTitle, ARTWORK_TITLE);
        assertEq(cert.artistName,   ARTIST_NAME);
        // Cross-check: values must not be swapped
        assertTrue(
            keccak256(bytes(cert.artworkTitle)) != keccak256(bytes(cert.artistName)),
            "artworkTitle and artistName must be distinct strings"
        );
    }
}
