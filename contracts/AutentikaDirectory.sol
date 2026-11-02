// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Minimal read surface of AutentikaV2 used by the directory companion.
interface IAutentikaV2Views {
    struct Commission {
        uint256 id;
        address artist;
        address collector;
        uint256 amount;
        uint256 releasedSoFar;
        uint64 deadline;
        string title;
        uint8 status;
        uint64 deliveredAt;
        bytes32 certificateId;
    }

    struct Certificate {
        bytes32 id;
        uint256 commissionId;
        string artworkTitle;
        string artistName;
        string technique;
        string dimensions;
        uint64 creationDate;
        string careInstructions;
        string signatureUrl;
        string sealUrl;
        string instagramHandle;
        string photoUrl;
        bytes32 photoHash;
        uint256 amountPaid;
        bytes32 paymentTxHash;
        uint64 releasedAt;
        address collector;
        address currentOwner;
        address[] owners;
        uint256[] prices;
    }

    function getCommission(uint256 id) external view returns (Commission memory);
    function getCertificateByTokenId(uint256 tokenId) external view returns (Certificate memory);
    function ownerOf(uint256 tokenId) external view returns (address);
}

/// @title AutentikaDirectory
/// @notice Companion to AutentikaV2: public artist registry, commission requests
///         (max 280 bytes), and one-time physical-artwork redemption tied to
///         Autentika certificate NFTs. Does not modify AutentikaV2.
contract AutentikaDirectory is ReentrancyGuard {
    uint256 public constant MAX_REQUEST_BYTES = 280;

    IAutentikaV2Views public immutable autentika;

    struct ArtistListing {
        string bio;
        uint256 basePriceUsdc;
        string pitch;
        bool registered;
        uint64 registeredAt;
    }

    struct CommissionRequest {
        uint256 id;
        address collector;
        address artist;
        string message;
        uint64 createdAt;
        bool cancelled;
    }

    struct PhysicalRecord {
        bool accompaniesPhysical;
        bool redeemed;
        bool shipped;
        address artist;
        uint64 redeemedAt;
        uint64 shippedAt;
    }

    address[] private _artists;
    mapping(address => ArtistListing) private _listings;
    mapping(address => bool) private _isListed;

    uint256 private _requestCounter = 1;
    mapping(uint256 => CommissionRequest) private _requests;
    mapping(address => uint256[]) private _requestsToArtist;
    mapping(address => uint256[]) private _requestsFromCollector;

    mapping(uint256 => PhysicalRecord) private _physicalByCommission;
    mapping(uint256 => uint256) private _tokenToCommission;

    error InvalidAddress();
    error EmptyString();
    error MessageTooLong();
    error NotRegistered();
    error Unauthorized();
    error AlreadyCancelled();
    error NoPhysical();
    error AlreadyRedeemed();
    error AlreadyShipped();
    error NotTokenOwner();
    error CommissionNotFound();

    event ArtistRegistered(address indexed artist, uint256 basePriceUsdc);
    event ArtistUpdated(address indexed artist, uint256 basePriceUsdc);
    event CommissionRequested(
        uint256 indexed requestId,
        address indexed collector,
        address indexed artist,
        string message
    );
    event CommissionRequestCancelled(uint256 indexed requestId, address indexed by);
    event PhysicalFlagSet(uint256 indexed commissionId, address indexed artist, bool accompanies);
    event PhysicalRedeemed(uint256 indexed tokenId, uint256 indexed commissionId, address indexed collector);
    event PhysicalShipped(uint256 indexed tokenId, uint256 indexed commissionId, address indexed artist);

    constructor(address autentikaV2) {
        if (autentikaV2 == address(0)) revert InvalidAddress();
        autentika = IAutentikaV2Views(autentikaV2);
    }

    // ─── Artist registry ────────────────────────────────────────────────────

    /// @notice Register or update the caller's public directory listing.
    function registerArtist(string calldata bio, uint256 basePriceUsdc, string calldata pitch)
        external
        nonReentrant
    {
        ArtistListing storage listing = _listings[msg.sender];
        listing.bio = bio;
        listing.basePriceUsdc = basePriceUsdc;
        listing.pitch = pitch;
        if (!listing.registered) {
            listing.registered = true;
            listing.registeredAt = uint64(block.timestamp);
            _artists.push(msg.sender);
            _isListed[msg.sender] = true;
            emit ArtistRegistered(msg.sender, basePriceUsdc);
        } else {
            emit ArtistUpdated(msg.sender, basePriceUsdc);
        }
    }

    function getArtistListing(address artist) external view returns (ArtistListing memory) {
        return _listings[artist];
    }

    function getArtists() external view returns (address[] memory) {
        return _artists;
    }

    function artistCount() external view returns (uint256) {
        return _artists.length;
    }

    function isArtistRegistered(address artist) external view returns (bool) {
        return _listings[artist].registered;
    }

    // ─── Commission requests (280-byte pitch box) ───────────────────────────

    /// @notice Collector asks a registered artist for a commission. Message ≤ 280 bytes.
    function requestCommission(address artist, string calldata message) external nonReentrant returns (uint256 id) {
        if (artist == address(0)) revert InvalidAddress();
        if (!_listings[artist].registered) revert NotRegistered();
        if (bytes(message).length == 0) revert EmptyString();
        if (bytes(message).length > MAX_REQUEST_BYTES) revert MessageTooLong();

        id = _requestCounter;
        unchecked {
            _requestCounter = id + 1;
        }

        _requests[id] = CommissionRequest({
            id: id,
            collector: msg.sender,
            artist: artist,
            message: message,
            createdAt: uint64(block.timestamp),
            cancelled: false
        });
        _requestsToArtist[artist].push(id);
        _requestsFromCollector[msg.sender].push(id);

        emit CommissionRequested(id, msg.sender, artist, message);
    }

    function cancelRequest(uint256 requestId) external nonReentrant {
        CommissionRequest storage req = _requests[requestId];
        if (req.id == 0) revert CommissionNotFound();
        if (req.cancelled) revert AlreadyCancelled();
        if (msg.sender != req.collector && msg.sender != req.artist) revert Unauthorized();
        req.cancelled = true;
        emit CommissionRequestCancelled(requestId, msg.sender);
    }

    function getRequest(uint256 requestId) external view returns (CommissionRequest memory) {
        return _requests[requestId];
    }

    function getRequestsToArtist(address artist) external view returns (uint256[] memory) {
        return _requestsToArtist[artist];
    }

    function getRequestsFromCollector(address collector) external view returns (uint256[] memory) {
        return _requestsFromCollector[collector];
    }

    // ─── Physical artwork (redeem once by current NFT holder) ───────────────

    /// @notice Artist of an AutentikaV2 commission marks whether its certificate NFT
    ///         accompanies a physical artwork redeemable once by the current holder.
    function setPhysicalForCommission(uint256 commissionId, bool accompanies) external nonReentrant {
        IAutentikaV2Views.Commission memory c = autentika.getCommission(commissionId);
        if (c.id == 0 || c.artist == address(0)) revert CommissionNotFound();
        if (msg.sender != c.artist) revert Unauthorized();

        PhysicalRecord storage rec = _physicalByCommission[commissionId];
        if (rec.redeemed) revert AlreadyRedeemed();
        rec.accompaniesPhysical = accompanies;
        rec.artist = c.artist;
        emit PhysicalFlagSet(commissionId, c.artist, accompanies);
    }

    /// @notice Bind a minted certificate token to its commission for redemption lookups.
    /// @dev Callable by the commission artist after the NFT exists.
    function bindTokenToCommission(uint256 tokenId, uint256 commissionId) external nonReentrant {
        IAutentikaV2Views.Commission memory c = autentika.getCommission(commissionId);
        if (c.id == 0 || c.artist == address(0)) revert CommissionNotFound();
        if (msg.sender != c.artist) revert Unauthorized();
        // Confirm token belongs to this commission via Autentika certificate.
        IAutentikaV2Views.Certificate memory cert = autentika.getCertificateByTokenId(tokenId);
        if (cert.commissionId != commissionId) revert Unauthorized();
        _tokenToCommission[tokenId] = commissionId;
        PhysicalRecord storage rec = _physicalByCommission[commissionId];
        if (rec.artist == address(0)) rec.artist = c.artist;
    }

    /// @notice Current ERC-721 owner redeems the physical artwork at most once.
    function redeemPhysical(uint256 tokenId) external nonReentrant {
        address owner = autentika.ownerOf(tokenId);
        if (owner != msg.sender) revert NotTokenOwner();

        uint256 commissionId = _resolveCommissionId(tokenId);
        PhysicalRecord storage rec = _physicalByCommission[commissionId];
        if (!rec.accompaniesPhysical) revert NoPhysical();
        if (rec.redeemed) revert AlreadyRedeemed();

        rec.redeemed = true;
        rec.redeemedAt = uint64(block.timestamp);
        emit PhysicalRedeemed(tokenId, commissionId, msg.sender);
    }

    /// @notice Artist marks the physical piece as shipped after a redemption.
    function markShipped(uint256 tokenId) external nonReentrant {
        uint256 commissionId = _resolveCommissionId(tokenId);
        PhysicalRecord storage rec = _physicalByCommission[commissionId];
        if (!rec.accompaniesPhysical) revert NoPhysical();
        if (!rec.redeemed) revert NoPhysical();
        if (rec.shipped) revert AlreadyShipped();

        IAutentikaV2Views.Commission memory c = autentika.getCommission(commissionId);
        if (msg.sender != c.artist) revert Unauthorized();

        rec.shipped = true;
        rec.shippedAt = uint64(block.timestamp);
        emit PhysicalShipped(tokenId, commissionId, msg.sender);
    }

    function getPhysicalByCommission(uint256 commissionId) external view returns (PhysicalRecord memory) {
        return _physicalByCommission[commissionId];
    }

    function getCommissionIdForToken(uint256 tokenId) external view returns (uint256) {
        return _resolveCommissionId(tokenId);
    }

    function _resolveCommissionId(uint256 tokenId) internal view returns (uint256 commissionId) {
        commissionId = _tokenToCommission[tokenId];
        if (commissionId != 0) return commissionId;
        IAutentikaV2Views.Certificate memory cert = autentika.getCertificateByTokenId(tokenId);
        commissionId = cert.commissionId;
        if (commissionId == 0) revert CommissionNotFound();
    }
}
