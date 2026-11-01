// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AutentikaV2} from "../AutentikaV2.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

/// @dev Shared setup, actors, constants, and helpers inherited by every category file.
abstract contract AutentikaV2TestBase is Test {

    // ─── canonical USDC address ─────────────────────────────────────────────
    address internal constant USDC_ADDR = 0x3600000000000000000000000000000000000000;

    // ─── actors ─────────────────────────────────────────────────────────────
    address internal owner     = makeAddr("owner");
    address internal artist    = makeAddr("artist");
    address internal collector = makeAddr("collector");
    address internal buyer     = makeAddr("buyer");
    address internal stranger  = makeAddr("stranger");
    address internal feeRcpt   = makeAddr("feeRcpt");

    // ─── contracts ──────────────────────────────────────────────────────────
    MockERC20    internal usdc;
    AutentikaV2  internal autentika;

    // ─── commission defaults ────────────────────────────────────────────────
    uint256 internal constant AMOUNT          = 1_000e6;   // 1000 USDC
    uint64  internal constant DEADLINE_OFFSET = 30 days;
    uint16  internal constant ROYALTY_BPS     = 250;       // 2.5 %

    // ─── certificate / delivery defaults ────────────────────────────────────
    string  internal constant TITLE          = "Test Commission";
    string  internal constant ARTWORK_TITLE  = "Sunrise";
    string  internal constant ARTIST_NAME    = "ArtistA";
    string  internal constant TECHNIQUE      = "Oil on canvas";
    string  internal constant DIMENSIONS     = "60x80cm";
    uint64  internal constant CREATION_DATE  = 1_700_000_000;
    string  internal constant CARE           = "Keep dry";
    string  internal constant PHOTO_URL      = "ipfs://QmPhoto";
    bytes32 internal constant PHOTO_HASH     = keccak256("photo");

    // ─── setUp ──────────────────────────────────────────────────────────────
    function setUp() public virtual {
        // Deploy a real MockERC20 and etch it at the canonical USDC address.
        MockERC20 mock = new MockERC20("Mock USDC", "mUSDC", 6);
        vm.etch(USDC_ADDR, address(mock).code);
        usdc = MockERC20(USDC_ADDR);

        // Seed balances.
        usdc.mint(collector, 100_000e6);
        usdc.mint(buyer,     100_000e6);
        usdc.mint(stranger,  100_000e6);

        autentika = new AutentikaV2(USDC_ADDR, owner, feeRcpt);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    function _createCommission() internal returns (uint256 id) {
        vm.prank(artist);
        id = autentika.createCommission(
            collector,
            AMOUNT,
            uint64(block.timestamp + DEADLINE_OFFSET),
            TITLE,
            ROYALTY_BPS,
            new string[](0),
            new uint256[](0)
        );
    }

    function _fundCommission() internal returns (uint256 id) {
        id = _createCommission();
        vm.startPrank(collector);
        usdc.approve(address(autentika), AMOUNT);
        autentika.fundCommission(id);
        vm.stopPrank();
    }

    function _deliverCommission() internal returns (uint256 id, bytes32 certId) {
        id = _fundCommission();
        vm.prank(artist);
        autentika.markDelivered(
            id,
            ARTWORK_TITLE,
            ARTIST_NAME,
            TECHNIQUE,
            DIMENSIONS,
            CREATION_DATE,
            CARE,
            PHOTO_URL,
            PHOTO_HASH
        );
        AutentikaV2.Commission memory c = autentika.getCommission(id);
        certId = c.certificateId;
    }

    function _releaseCommission() internal returns (uint256 id, bytes32 certId, uint256 tokenId) {
        (id, certId) = _deliverCommission();
        vm.prank(collector);
        autentika.confirmReceipt(id);
        tokenId = autentika.certTokenId(certId);
    }

    /// Creates a commission with 2 milestones summing to AMOUNT.
    function _createMilestoneCommission() internal returns (uint256 id) {
        string[]  memory descs    = new string[](2);
        uint256[] memory amounts  = new uint256[](2);
        descs[0]   = "Sketch";
        descs[1]   = "Final";
        amounts[0] = 400e6;
        amounts[1] = 600e6;

        vm.prank(artist);
        id = autentika.createCommission(
            collector,
            AMOUNT,
            uint64(block.timestamp + DEADLINE_OFFSET),
            TITLE,
            ROYALTY_BPS,
            descs,
            amounts
        );
    }

    /// Fund + deliver a milestone commission (certificateId set, status Funded).
    function _fundAndDeliverMilestoneCommission()
        internal returns (uint256 id, bytes32 certId)
    {
        id = _createMilestoneCommission();
        vm.startPrank(collector);
        usdc.approve(address(autentika), AMOUNT);
        autentika.fundCommission(id);
        vm.stopPrank();

        vm.prank(artist);
        autentika.markDelivered(
            id,
            ARTWORK_TITLE,
            ARTIST_NAME,
            TECHNIQUE,
            DIMENSIONS,
            CREATION_DATE,
            CARE,
            PHOTO_URL,
            PHOTO_HASH
        );
        AutentikaV2.Commission memory c = autentika.getCommission(id);
        certId = c.certificateId;
    }
}
