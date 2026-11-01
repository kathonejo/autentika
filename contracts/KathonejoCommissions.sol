// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract KathonejoCommissions is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum CommissionStatus {
        Created,
        Funded,
        Delivered,
        Released,
        Refunded,
        Cancelled
    }

    struct Commission {
        uint256 id;
        address artist;
        address collector;
        uint256 amount;
        uint64 deadline;
        string title;
        CommissionStatus status;
        uint64 deliveredAt;
        bytes32 certificateId;
    }

    struct ArtistProfile {
        string displayName;
        string instagramHandle;
        string sealUrl;
        string signatureUrl;
        bool exists;
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
        string signatureUrl;   // snapshot from artist profile at delivery time
        string sealUrl;        // snapshot from artist profile at delivery time
        string instagramHandle; // snapshot from artist profile at delivery time
        string photoUrl;
        bytes32 photoHash;
        uint256 amountPaid;
        /// @notice Solidity cannot access the current tx hash at runtime; set to bytes32(0).
        /// @dev Frontend/indexer should persist the actual release tx hash.
        bytes32 paymentTxHash;
        uint64 releasedAt;
        address collector;
        address currentOwner;
        address[] owners;
        uint256[] prices;
    }

    uint256 private _commissionCounter = 1;

    address public immutable usdcToken;

    mapping(uint256 => Commission) public commissions;
    mapping(bytes32 => Certificate) public certificates;
    mapping(bytes32 => bool) public certificateExists;
    mapping(address => ArtistProfile) public artistProfiles;
    mapping(address => uint256[]) private _artistCommissions;
    mapping(address => uint256[]) private _collectorCommissions;
    mapping(address => uint256) public pendingWithdrawals;

    error InvalidAddress();
    error InvalidAmount();
    error InvalidDeadline();
    error EmptyString();
    error InvalidPhotoHash();
    error CommissionNotFound();
    error CertificateNotFound();
    error Unauthorized();
    error InvalidStatus();
    error DeliveryClaimNotReady();
    error NothingToWithdraw();

    /// @notice Emitted when a new commission is created.
    /// @param id Commission identifier.
    /// @param artist Artist address that created the commission.
    /// @param collector Collector address that will fund the commission.
    /// @param amount USDC amount in 6-decimal units.
    /// @param deadline Unix timestamp after which a funded commission can be refunded.
    /// @param title Commission title.
    event CommissionCreated(
        uint256 indexed id,
        address indexed artist,
        address indexed collector,
        uint256 amount,
        uint64 deadline,
        string title
    );

    /// @notice Emitted when a commission is funded by the collector.
    /// @param id Commission identifier.
    /// @param collector Collector address that funded the commission.
    /// @param amount USDC amount in 6-decimal units.
    event CommissionFunded(uint256 indexed id, address indexed collector, uint256 amount);

    /// @notice Emitted when an artist marks a funded commission as delivered.
    /// @param id Commission identifier.
    /// @param certificateId Newly created certificate identifier.
    /// @param photoUrl Artwork photo URL included in certificate metadata.
    event CommissionDelivered(uint256 indexed id, bytes32 indexed certificateId, string photoUrl);

    /// @notice Emitted when funds are released to the artist.
    /// @param id Commission identifier.
    /// @param certificateId Certificate identifier associated with the released commission.
    event CommissionReleased(uint256 indexed id, bytes32 indexed certificateId);

    /// @notice Emitted when a collector is refunded after deadline expiry.
    /// @param id Commission identifier.
    event CommissionRefunded(uint256 indexed id);

    /// @notice Emitted when a created (unfunded) commission is cancelled.
    /// @param id Commission identifier.
    /// @param by Address that cancelled the commission.
    event CommissionCancelled(uint256 indexed id, address indexed by);

    /// @notice Emitted when certificate ownership is transferred.
    /// @param certificateId Certificate identifier.
    /// @param from Previous owner address.
    /// @param to New owner address.
    /// @param price Transfer price associated with this provenance step.
    event CertificateTransferred(bytes32 indexed certificateId, address indexed from, address indexed to, uint256 price);

    /// @notice Emitted when an artist sets or updates their profile.
    /// @param artist Artist address.
    event ArtistProfileUpdated(address indexed artist);

    event Withdrawn(address indexed recipient, uint256 amount);

    constructor(address _usdcToken) {
        if (_usdcToken == address(0)) revert InvalidAddress();
        usdcToken = _usdcToken;
    }

    /// @notice Creates or updates the caller's artist profile.
    /// @dev All fields can be empty strings; exists is set to true on first call.
    /// @param displayName Human-readable display name.
    /// @param instagramHandle Instagram handle (without @).
    /// @param sealUrl URL to artist's seal/logo image.
    /// @param signatureUrl URL to artist's signature image.
    function setArtistProfile(
        string calldata displayName,
        string calldata instagramHandle,
        string calldata sealUrl,
        string calldata signatureUrl
    ) external nonReentrant {
        ArtistProfile storage profile = artistProfiles[msg.sender];
        profile.displayName = displayName;
        profile.instagramHandle = instagramHandle;
        profile.sealUrl = sealUrl;
        profile.signatureUrl = signatureUrl;
        profile.exists = true;
        emit ArtistProfileUpdated(msg.sender);
    }

    /// @notice Returns artist profile data.
    /// @param artist Artist address.
    /// @return profile ArtistProfile struct.
    function getArtistProfile(address artist) external view returns (ArtistProfile memory profile) {
        profile = artistProfiles[artist];
    }

    /// @notice Creates a new commission to be funded in USDC.
    /// @param collector Collector wallet that will fund and later confirm receipt.
    /// @param amount USDC amount in 6-decimal units.
    /// @param deadline Unix timestamp deadline for delivery/refund logic.
    /// @param title Human-readable commission title.
    /// @return commissionId Newly created commission id.
    function createCommission(
        address collector,
        uint256 amount,
        uint64 deadline,
        string calldata title
    ) external nonReentrant returns (uint256 commissionId) {
        if (collector == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (bytes(title).length == 0) revert EmptyString();

        commissionId = _commissionCounter;
        unchecked {
            _commissionCounter = commissionId + 1;
        }

        commissions[commissionId] = Commission({
            id: commissionId,
            artist: msg.sender,
            collector: collector,
            amount: amount,
            deadline: deadline,
            title: title,
            status: CommissionStatus.Created,
            deliveredAt: 0,
            certificateId: bytes32(0)
        });

        _artistCommissions[msg.sender].push(commissionId);
        _collectorCommissions[collector].push(commissionId);

        emit CommissionCreated(commissionId, msg.sender, collector, amount, deadline, title);
    }

    /// @notice Funds an existing commission by transferring approved USDC into escrow.
    /// @param commissionId Commission identifier.
    function fundCommission(uint256 commissionId) external nonReentrant {
        Commission storage commission = _requireCommission(commissionId);

        if (commission.status != CommissionStatus.Created) revert InvalidStatus();
        if (msg.sender != commission.collector) revert Unauthorized();

        commission.status = CommissionStatus.Funded;

        uint256 balanceBefore = IERC20(usdcToken).balanceOf(address(this));
        IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), commission.amount);
        uint256 received = IERC20(usdcToken).balanceOf(address(this)) - balanceBefore;
        if (received != commission.amount) revert InvalidAmount();

        emit CommissionFunded(commissionId, msg.sender, commission.amount);
    }

    /// @notice Marks a funded commission as delivered and mints its on-chain certificate.
    /// @param commissionId Commission identifier.
    /// @param artworkTitle Title of the delivered artwork.
    /// @param artistName Display name of the artist.
    /// @param technique Technique/materials used.
    /// @param dimensions Artwork dimensions.
    /// @param creationDate Unix timestamp representing artwork creation date.
    /// @param careInstructions Care instructions for the artwork (may be empty, front-end prefills a default).
    /// @param photoUrl URL to artwork photo.
    /// @param photoHash Content hash of the artwork photo.
    function markDelivered(
        uint256 commissionId,
        string calldata artworkTitle,
        string calldata artistName,
        string calldata technique,
        string calldata dimensions,
        uint64 creationDate,
        string calldata careInstructions,
        string calldata photoUrl,
        bytes32 photoHash
    ) external nonReentrant {
        Commission storage commission = _requireCommission(commissionId);

        if (block.timestamp > commission.deadline) revert InvalidDeadline();
        if (commission.status != CommissionStatus.Funded) revert InvalidStatus();
        if (msg.sender != commission.artist) revert Unauthorized();
        if (
            bytes(artworkTitle).length == 0 ||
            bytes(artistName).length == 0 ||
            bytes(technique).length == 0 ||
            bytes(dimensions).length == 0 ||
            bytes(photoUrl).length == 0
        ) revert EmptyString();
        if (photoHash == bytes32(0)) revert InvalidPhotoHash();

        bytes32 certificateId = keccak256(abi.encodePacked(commissionId, msg.sender, block.timestamp));
        Certificate storage cert = certificates[certificateId];

        cert.id = certificateId;
        cert.commissionId = commissionId;
        cert.artworkTitle = artworkTitle;
        cert.artistName = artistName;
        cert.technique = technique;
        cert.dimensions = dimensions;
        cert.creationDate = creationDate;
        cert.careInstructions = careInstructions;
        // Snapshot artist profile fields at delivery time
        ArtistProfile storage profile = artistProfiles[msg.sender];
        cert.signatureUrl = profile.signatureUrl;
        cert.sealUrl = profile.sealUrl;
        cert.instagramHandle = profile.instagramHandle;
        cert.photoUrl = photoUrl;
        cert.photoHash = photoHash;

        certificateExists[certificateId] = true;
        commission.deliveredAt = uint64(block.timestamp);
        commission.status = CommissionStatus.Delivered;
        commission.certificateId = certificateId;

        emit CommissionDelivered(commissionId, certificateId, photoUrl);
    }

    /// @notice Confirms receipt by collector and releases escrowed USDC to artist.
    /// @dev paymentTxHash is stored as bytes32(0) because Solidity cannot access the current tx hash at runtime.
    /// @param commissionId Commission identifier.
    function confirmReceipt(uint256 commissionId) external nonReentrant {
        Commission storage commission = _requireCommission(commissionId);

        if (commission.status != CommissionStatus.Delivered) revert InvalidStatus();
        if (msg.sender != commission.collector) revert Unauthorized();

        _releaseFunds(commissionId);

        emit CommissionReleased(commissionId, commission.certificateId);
    }

    /// @notice Allows artist to auto-claim funds 14 days after delivery if collector does not confirm.
    /// @dev paymentTxHash is stored as bytes32(0) because Solidity cannot access the current tx hash at runtime.
    /// @param commissionId Commission identifier.
    function autoClaimAfterDelivery(uint256 commissionId) external nonReentrant {
        Commission storage commission = _requireCommission(commissionId);

        if (commission.status != CommissionStatus.Delivered) revert InvalidStatus();
        if (msg.sender != commission.artist) revert Unauthorized();
        if (block.timestamp < uint256(commission.deliveredAt) + 14 days) revert DeliveryClaimNotReady();

        _releaseFunds(commissionId);

        emit CommissionReleased(commissionId, commission.certificateId);
    }

    /// @notice Refunds collector after deadline expiry when commission is funded but not delivered.
    /// @param commissionId Commission identifier.
    function refundCollector(uint256 commissionId) external nonReentrant {
        Commission storage commission = _requireCommission(commissionId);

        if (commission.status != CommissionStatus.Funded) revert InvalidStatus();
        if (msg.sender != commission.collector) revert Unauthorized();
        if (block.timestamp <= commission.deadline) revert InvalidDeadline();

        commission.status = CommissionStatus.Refunded;

        pendingWithdrawals[commission.collector] += commission.amount;

        emit CommissionRefunded(commissionId);
    }

    /// @notice Cancels a commission before funding.
    /// @param commissionId Commission identifier.
    function cancelCommission(uint256 commissionId) external nonReentrant {
        Commission storage commission = _requireCommission(commissionId);

        if (commission.status != CommissionStatus.Created) revert InvalidStatus();
        if (msg.sender != commission.artist && msg.sender != commission.collector) revert Unauthorized();

        commission.status = CommissionStatus.Cancelled;

        emit CommissionCancelled(commissionId, msg.sender);
    }

    /// @notice Transfers ownership of an issued certificate and appends provenance data.
    /// @param certificateId Certificate identifier.
    /// @param newOwner New certificate owner.
    /// @param price Transfer price to append to provenance (can be zero).
    function transferCertificate(bytes32 certificateId, address newOwner, uint256 price) external nonReentrant {
        if (!certificateExists[certificateId]) revert CertificateNotFound();
        Certificate storage cert = certificates[certificateId];
        if (newOwner == address(0)) revert InvalidAddress();
        if (msg.sender != cert.currentOwner) revert Unauthorized();
        if (newOwner == cert.currentOwner) revert InvalidAddress();

        address oldOwner = cert.currentOwner;
        cert.currentOwner = newOwner;
        cert.owners.push(newOwner);
        cert.prices.push(price);

        emit CertificateTransferred(certificateId, oldOwner, newOwner, price);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        pendingWithdrawals[msg.sender] = 0;
        IERC20(usdcToken).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Returns full commission data.
    /// @param id Commission identifier.
    /// @return commission Commission struct.
    function getCommission(uint256 id) external view returns (Commission memory commission) {
        commission = _requireCommissionView(id);
    }

    /// @notice Returns full certificate data.
    /// @param id Certificate identifier.
    /// @return certificate Certificate struct.
    function getCertificate(bytes32 id) external view returns (Certificate memory certificate) {
        if (!certificateExists[id]) revert CertificateNotFound();
        certificate = certificates[id];
    }

    /// @notice Returns all commission ids created by an artist.
    /// @param artist Artist address.
    /// @return ids Array of commission ids.
    function getArtistCommissions(address artist) external view returns (uint256[] memory ids) {
        ids = _artistCommissions[artist];
    }

    /// @notice Returns all commission ids assigned to a collector.
    /// @param collector Collector address.
    /// @return ids Array of commission ids.
    function getCollectorCommissions(address collector) external view returns (uint256[] memory ids) {
        ids = _collectorCommissions[collector];
    }

    function _releaseFunds(uint256 commissionId) internal {
        Commission storage commission = commissions[commissionId];
        Certificate storage cert = certificates[commission.certificateId];

        cert.collector = commission.collector;
        cert.currentOwner = commission.collector;
        cert.owners.push(commission.collector);
        cert.prices.push(0);

        cert.amountPaid = commission.amount;
        cert.paymentTxHash = bytes32(0);
        cert.releasedAt = uint64(block.timestamp);

        commission.status = CommissionStatus.Released;

        pendingWithdrawals[commission.artist] += commission.amount;
    }

    function _requireCommission(uint256 commissionId) internal view returns (Commission storage commission) {
        if (commissionId == 0 || commissionId >= _commissionCounter) revert CommissionNotFound();
        commission = commissions[commissionId];
    }

    function _requireCommissionView(uint256 commissionId) internal view returns (Commission memory commission) {
        if (commissionId == 0 || commissionId >= _commissionCounter) revert CommissionNotFound();
        commission = commissions[commissionId];
    }
}
