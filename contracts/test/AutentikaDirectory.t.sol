// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AutentikaV2} from "../AutentikaV2.sol";
import {AutentikaDirectory} from "../AutentikaDirectory.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

contract AutentikaDirectoryTest is Test {
    address internal constant USDC_ADDR = 0x3600000000000000000000000000000000000000;

    address internal owner = makeAddr("owner");
    address internal artist = makeAddr("artist");
    address internal collector = makeAddr("collector");
    address internal stranger = makeAddr("stranger");
    address internal feeRcpt = makeAddr("feeRcpt");

    MockERC20 internal usdc;
    AutentikaV2 internal autentika;
    AutentikaDirectory internal directory;

    uint256 internal constant AMOUNT = 1_000e6;
    uint16 internal constant ROYALTY_BPS = 250;

    function setUp() public {
        MockERC20 mock = new MockERC20("Mock USDC", "mUSDC", 6);
        vm.etch(USDC_ADDR, address(mock).code);
        usdc = MockERC20(USDC_ADDR);
        usdc.mint(collector, 100_000e6);

        autentika = new AutentikaV2(USDC_ADDR, owner, feeRcpt);
        directory = new AutentikaDirectory(address(autentika));
    }

    function _createFundDeliverRelease() internal returns (uint256 commissionId, uint256 tokenId) {
        vm.prank(artist);
        commissionId = autentika.createCommission(
            collector,
            AMOUNT,
            uint64(block.timestamp + 30 days),
            "Portrait",
            ROYALTY_BPS,
            new string[](0),
            new uint256[](0)
        );

        vm.startPrank(collector);
        usdc.approve(address(autentika), AMOUNT);
        autentika.fundCommission(commissionId);
        vm.stopPrank();

        bytes32 photoHash = keccak256("photo");
        vm.prank(artist);
        autentika.markDelivered(
            commissionId,
            "Sunrise",
            "ArtistA",
            "Oil",
            "40x50",
            uint64(block.timestamp),
            "Keep dry",
            "ipfs://photo",
            photoHash
        );

        vm.prank(collector);
        autentika.confirmReceipt(commissionId);

        // Token is minted on release/confirm
        bytes32 certId = autentika.getCommission(commissionId).certificateId;
        tokenId = autentika.certTokenId(certId);
        assertTrue(tokenId > 0);
    }

    function test_registerArtist() public {
        vm.prank(artist);
        directory.registerArtist("Bio corta", 500e6, "Retratos al oleo");

        AutentikaDirectory.ArtistListing memory listing = directory.getArtistListing(artist);
        assertTrue(listing.registered);
        assertEq(listing.bio, "Bio corta");
        assertEq(listing.basePriceUsdc, 500e6);
        assertEq(listing.pitch, "Retratos al oleo");
        assertEq(directory.artistCount(), 1);
        assertEq(directory.getArtists()[0], artist);
        assertTrue(directory.isArtistRegistered(artist));
    }

    function test_registerArtist_update() public {
        vm.startPrank(artist);
        directory.registerArtist("Bio", 100e6, "A");
        directory.registerArtist("Bio2", 200e6, "B");
        vm.stopPrank();

        AutentikaDirectory.ArtistListing memory listing = directory.getArtistListing(artist);
        assertEq(listing.bio, "Bio2");
        assertEq(listing.basePriceUsdc, 200e6);
        assertEq(directory.artistCount(), 1); // still one entry
    }

    function test_requestCommission_ok() public {
        vm.prank(artist);
        directory.registerArtist("Bio", 100e6, "Pitch");

        string memory msg_ = "Quiero un retrato de mi gato, fondo rosa.";
        vm.prank(collector);
        uint256 id = directory.requestCommission(artist, msg_);

        AutentikaDirectory.CommissionRequest memory req = directory.getRequest(id);
        assertEq(req.id, id);
        assertEq(req.collector, collector);
        assertEq(req.artist, artist);
        assertEq(req.message, msg_);
        assertFalse(req.cancelled);
        assertEq(directory.getRequestsToArtist(artist).length, 1);
        assertEq(directory.getRequestsFromCollector(collector).length, 1);
    }

    function test_requestCommission_max289() public {
        vm.prank(artist);
        directory.registerArtist("Bio", 1, "x");

        bytes memory ok = new bytes(289);
        for (uint256 i; i < 289; ++i) ok[i] = "a";
        vm.prank(collector);
        directory.requestCommission(artist, string(ok));

        bytes memory tooLong = new bytes(290);
        for (uint256 i; i < 290; ++i) tooLong[i] = "b";
        vm.prank(collector);
        vm.expectRevert(AutentikaDirectory.MessageTooLong.selector);
        directory.requestCommission(artist, string(tooLong));
    }

    function test_requestCommission_requiresRegistration() public {
        vm.prank(collector);
        vm.expectRevert(AutentikaDirectory.NotRegistered.selector);
        directory.requestCommission(artist, "hola");
    }

    function test_requestCommission_emptyReverts() public {
        vm.prank(artist);
        directory.registerArtist("Bio", 1, "x");
        vm.prank(collector);
        vm.expectRevert(AutentikaDirectory.EmptyString.selector);
        directory.requestCommission(artist, "");
    }

    function test_cancelRequest() public {
        vm.prank(artist);
        directory.registerArtist("Bio", 1, "x");
        vm.prank(collector);
        uint256 id = directory.requestCommission(artist, "pedido");

        vm.prank(artist);
        directory.cancelRequest(id);
        assertTrue(directory.getRequest(id).cancelled);

        vm.prank(collector);
        vm.expectRevert(AutentikaDirectory.AlreadyCancelled.selector);
        directory.cancelRequest(id);
    }

    function test_physical_redeem_and_ship() public {
        (uint256 commissionId, uint256 tokenId) = _createFundDeliverRelease();

        vm.prank(artist);
        directory.setPhysicalForCommission(commissionId, true);

        AutentikaDirectory.PhysicalRecord memory rec = directory.getPhysicalByCommission(commissionId);
        assertTrue(rec.accompaniesPhysical);
        assertFalse(rec.redeemed);

        // Stranger cannot redeem
        vm.prank(stranger);
        vm.expectRevert(AutentikaDirectory.NotTokenOwner.selector);
        directory.redeemPhysical(tokenId);

        // Collector (current owner) redeems once
        vm.prank(collector);
        directory.redeemPhysical(tokenId);
        rec = directory.getPhysicalByCommission(commissionId);
        assertTrue(rec.redeemed);

        vm.prank(collector);
        vm.expectRevert(AutentikaDirectory.AlreadyRedeemed.selector);
        directory.redeemPhysical(tokenId);

        // Artist ships
        vm.prank(artist);
        directory.markShipped(tokenId);
        rec = directory.getPhysicalByCommission(commissionId);
        assertTrue(rec.shipped);

        vm.prank(artist);
        vm.expectRevert(AutentikaDirectory.AlreadyShipped.selector);
        directory.markShipped(tokenId);
    }

    function test_physical_noFlag_reverts() public {
        (, uint256 tokenId) = _createFundDeliverRelease();
        vm.prank(collector);
        vm.expectRevert(AutentikaDirectory.NoPhysical.selector);
        directory.redeemPhysical(tokenId);
    }

    function test_setPhysical_onlyArtist() public {
        (uint256 commissionId,) = _createFundDeliverRelease();
        vm.prank(stranger);
        vm.expectRevert(AutentikaDirectory.Unauthorized.selector);
        directory.setPhysicalForCommission(commissionId, true);
    }

    function test_bindTokenToCommission() public {
        (uint256 commissionId, uint256 tokenId) = _createFundDeliverRelease();
        vm.prank(artist);
        directory.bindTokenToCommission(tokenId, commissionId);
        assertEq(directory.getCommissionIdForToken(tokenId), commissionId);
    }

    function test_constructor_rejectsZero() public {
        vm.expectRevert(AutentikaDirectory.InvalidAddress.selector);
        new AutentikaDirectory(address(0));
    }

    function testFuzz_requestMessageLength(uint8 len) public {
        vm.prank(artist);
        directory.registerArtist("Bio", 1, "x");

        bytes memory msgBytes = new bytes(len);
        for (uint256 i; i < len; ++i) msgBytes[i] = bytes1(uint8(65 + (i % 26)));

        if (len == 0) {
            vm.prank(collector);
            vm.expectRevert(AutentikaDirectory.EmptyString.selector);
            directory.requestCommission(artist, string(msgBytes));
        } else if (len > 289) {
            // fuzz uint8 max is 255, so this branch won't hit 290+; keep for clarity
            vm.prank(collector);
            vm.expectRevert(AutentikaDirectory.MessageTooLong.selector);
            directory.requestCommission(artist, string(msgBytes));
        } else {
            vm.prank(collector);
            uint256 id = directory.requestCommission(artist, string(msgBytes));
            assertEq(bytes(directory.getRequest(id).message).length, len);
        }
    }
}
