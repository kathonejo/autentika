// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {KathonejoCommissions} from "../KathonejoCommissions.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

/// @dev Shared setup, actors, and helpers inherited by every category file.
abstract contract KathonejoCommissionsTestBase is Test {
    // ─── actors ────────────────────────────────────────────────────────────
    address internal artist    = makeAddr("artist");
    address internal collector = makeAddr("collector");
    address internal stranger  = makeAddr("stranger");

    // ─── contracts ─────────────────────────────────────────────────────────
    MockERC20              internal usdc;
    KathonejoCommissions   internal board;

    // ─── commission defaults ────────────────────────────────────────────────
    uint256 internal constant AMOUNT   = 500e6;   // 500 USDC (6 dp)
    uint64  internal constant DEADLINE_OFFSET = 30 days;

    // ─── certificate fields ─────────────────────────────────────────────────
    string  internal constant ARTIST_NAME   = "Kathonjeo";
    string  internal constant ARTWORK_TITLE = "Genesis";
    string  internal constant TECHNIQUE     = "Oil on canvas";
    string  internal constant DIMENSIONS    = "60x80cm";
    uint64  internal constant CREATION_DATE = 1_700_000_000;
    string  internal constant PHOTO_URL     = "ipfs://Qm123";
    bytes32 internal constant PHOTO_HASH    = keccak256("photo-content");

    // ─── setUp ──────────────────────────────────────────────────────────────
    function setUp() public virtual {
        usdc  = new MockERC20("Mock USDC", "mUSDC", 6);
        board = new KathonejoCommissions(address(usdc));

        // Seed collector with USDC
        usdc.mint(collector, 10_000e6);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    /// Creates a commission from artist and returns its id.
    function _createCommission() internal returns (uint256 id) {
        vm.prank(artist);
        id = board.createCommission(
            collector,
            AMOUNT,
            uint64(block.timestamp + DEADLINE_OFFSET),
            "Test Commission"
        );
    }

    /// Creates + funds a commission. Returns id.
    function _fundCommission() internal returns (uint256 id) {
        id = _createCommission();
        vm.startPrank(collector);
        usdc.approve(address(board), AMOUNT);
        board.fundCommission(id);
        vm.stopPrank();
    }

    /// Creates, funds, and marks delivered. Returns (id, certId).
    function _deliverCommission() internal returns (uint256 id, bytes32 certId) {
        id = _fundCommission();
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
        certId = c.certificateId;
    }

    /// Full happy path: create → fund → deliver → confirmReceipt.
    function _releaseCommission() internal returns (uint256 id, bytes32 certId) {
        (id, certId) = _deliverCommission();
        vm.prank(collector);
        board.confirmReceipt(id);
    }
}
