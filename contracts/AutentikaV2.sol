// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

contract AutentikaV2 is ReentrancyGuard, Ownable, ERC721, ERC2981 {
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
        uint256 releasedSoFar;
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

    struct Milestone {
        string description;
        uint256 amount;
        bool artistDone;
        bool collectorApproved;
    }

    struct Listing {
        address seller;
        uint256 priceUsdc;
        bool active;
    }

    struct LegalRecord {
        bytes32 documentHash;
        string note;
        uint64 timestamp;
        bool exists;
    }

    uint16 public constant MAX_PLATFORM_FEE_BPS = 200;
    uint16 public constant MAX_RESALE_BPS = 100;
    uint8 public constant MAX_MILESTONES = 20;

    uint256 private _commissionCounter = 1;
    uint256 private _tokenIdCounter = 1;

    address public immutable usdcToken;
    address public feeRecipient;
    uint16 public platformFeeBps;
    uint16 public platformResaleBps;

    mapping(uint256 => Commission) public commissions;
    mapping(bytes32 => Certificate) public certificates;
    mapping(bytes32 => bool) public certificateExists;
    mapping(address => ArtistProfile) public artistProfiles;
    mapping(address => uint256[]) private _artistCommissions;
    mapping(address => uint256[]) private _collectorCommissions;
    mapping(address => uint256) public pendingWithdrawals;
    mapping(uint256 => Milestone[]) public milestones;
    mapping(bytes32 => uint256) public certTokenId;
    mapping(uint256 => bytes32) public tokenCertId;
    mapping(uint256 => uint16) private _commissionRoyaltyBps;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => LegalRecord) public legalRecords;
    mapping(uint256 => uint64) public lastMilestoneActionAt;
    mapping(uint256 => uint256) private _approvedMilestoneCount;

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
    error MilestoneClaimNotReady();
    error NothingToWithdraw();
    error FeeTooHigh();
    error InvalidFee();
    error UseMilestoneFlow();
    error NotListed();
    error PriceMismatch();
    error AlreadyLegalized();

    event CommissionCreated(
        uint256 indexed id,
        address indexed artist,
        address indexed collector,
        uint256 amount,
        uint64 deadline,
        string title
    );
    event CommissionFunded(uint256 indexed id, address indexed collector, uint256 amount);
    event CommissionDelivered(uint256 indexed id, bytes32 indexed certificateId, string photoUrl);
    event CommissionReleased(uint256 indexed id, bytes32 indexed certificateId);
    event CommissionRefunded(uint256 indexed id);
    event CommissionCancelled(uint256 indexed id, address indexed by);
    event CertificateTransferred(bytes32 indexed certificateId, address indexed from, address indexed to, uint256 price);
    event ArtistProfileUpdated(address indexed artist);
    event Withdrawn(address indexed recipient, uint256 amount);

    event MilestoneCompleted(uint256 indexed commissionId, uint256 indexed milestoneIndex);
    event MilestoneApproved(uint256 indexed commissionId, uint256 indexed milestoneIndex, uint256 netArtistAmount);
    event FeeUpdated(uint16 newFeeBps);
    event FeeRecipientUpdated(address indexed newRecipient);
    event ResaleFeeUpdated(uint16 newBps);
    event CertificateListed(uint256 indexed tokenId, address indexed seller, uint256 priceUsdc);
    event ListingCancelled(uint256 indexed tokenId);
    event CertificatePurchased(uint256 indexed tokenId, address indexed buyer, uint256 priceUsdc);
    event CertificateLegalized(uint256 indexed tokenId, bytes32 documentHash, string note);

    /// @notice Initializes the contract with USDC token, owner, and platform fee recipient.
    /// @param _usdcToken USDC token contract address used for escrow and marketplace settlements.
    /// @param _initialOwner Initial owner for Ownable access control.
    /// @param _feeRecipient Recipient address for platform fees.
    constructor(address _usdcToken, address _initialOwner, address _feeRecipient)
        Ownable(_initialOwner)
        ERC721("Autentika Certificate", "AUTC")
    {
        if (_usdcToken == address(0) || _initialOwner == address(0) || _feeRecipient == address(0)) {
            revert InvalidAddress();
        }
        usdcToken = _usdcToken;
        feeRecipient = _feeRecipient;
        platformFeeBps = 50;
        platformResaleBps = 25;
    }

    /// @notice Creates or updates the caller's artist profile.
    /// @param displayName Human-readable display name.
    /// @param instagramHandle Instagram handle.
    /// @param sealUrl URL to artist seal image.
    /// @param signatureUrl URL to artist signature image.
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
    /// @return profile Artist profile.
    function getArtistProfile(address artist) external view returns (ArtistProfile memory profile) {
        profile = artistProfiles[artist];
    }

    /// @notice Creates a new commission with optional milestones and royalty configuration.
    /// @param collector Collector wallet that will fund the commission.
    /// @param amount Total USDC amount in token base units.
    /// @param deadline Unix timestamp deadline for delivery/refund logic.
    /// @param title Human-readable commission title.
    /// @param royaltyBps ERC-2981 royalty in bps for the certificate NFT (max 1000).
    /// @param milestoneDescriptions Optional milestone descriptions; empty arrays disable milestone flow.
    /// @param milestoneAmounts Optional milestone amounts; must sum to amount when provided.
    /// @return commissionId Newly created commission id.
    function createCommission(
        address collector,
        uint256 amount,
        uint64 deadline,
        string calldata title,
        uint16 royaltyBps,
        string[] calldata milestoneDescriptions,
        uint256[] calldata milestoneAmounts
    ) external nonReentrant returns (uint256 commissionId) {
        if (collector == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (bytes(title).length == 0) revert EmptyString();
        if (royaltyBps > 1000) revert InvalidFee();

        bool hasMilestones = milestoneDescriptions.length > 0 || milestoneAmounts.length > 0;
        if (hasMilestones) {
            if (milestoneDescriptions.length > MAX_MILESTONES) revert InvalidAmount();
            if (milestoneDescriptions.length != milestoneAmounts.length || milestoneDescriptions.length == 0) {
                revert InvalidAmount();
            }
        }

        commissionId = _commissionCounter;
        unchecked {
            // Safe: counter cannot overflow uint256 within any realistic lifecycle.
            _commissionCounter = commissionId + 1;
        }

        commissions[commissionId] = Commission({
            id: commissionId,
            artist: msg.sender,
            collector: collector,
            amount: amount,
            releasedSoFar: 0,
            deadline: deadline,
            title: title,
            status: CommissionStatus.Created,
            deliveredAt: 0,
            certificateId: bytes32(0)
        });

        _commissionRoyaltyBps[commissionId] = royaltyBps;

        if (hasMilestones) {
            uint256 runningSum = 0;
            for (uint256 i = 0; i < milestoneDescriptions.length; i++) {
                if (bytes(milestoneDescriptions[i]).length == 0) revert EmptyString();
                uint256 mAmount = milestoneAmounts[i];
                if (mAmount == 0) revert InvalidAmount();
                runningSum += mAmount;
                milestones[commissionId].push(
                    Milestone({description: milestoneDescriptions[i], amount: mAmount, artistDone: false, collectorApproved: false})
                );
            }
            if (runningSum != amount) revert InvalidAmount();
        }

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
        lastMilestoneActionAt[commissionId] = uint64(block.timestamp);

        uint256 balanceBefore = IERC20(usdcToken).balanceOf(address(this));
        IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), commission.amount);
        uint256 received = IERC20(usdcToken).balanceOf(address(this)) - balanceBefore;
        if (received != commission.amount) revert InvalidAmount();

        emit CommissionFunded(commissionId, msg.sender, commission.amount);
    }

    /// @notice Marks a funded commission as delivered and stores certificate metadata snapshots.
    /// @param commissionId Commission identifier.
    /// @param artworkTitle Title of the delivered artwork.
    /// @param artistName Display name of the artist.
    /// @param technique Technique/materials used.
    /// @param dimensions Artwork dimensions.
    /// @param creationDate Artwork creation timestamp.
    /// @param careInstructions Care instructions for the artwork.
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
            bytes(artworkTitle).length == 0 || bytes(artistName).length == 0 || bytes(technique).length == 0
                || bytes(dimensions).length == 0 || bytes(photoUrl).length == 0
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

        ArtistProfile storage profile = artistProfiles[msg.sender];
        cert.signatureUrl = profile.signatureUrl;
        cert.sealUrl = profile.sealUrl;
        cert.instagramHandle = profile.instagramHandle;
        cert.photoUrl = photoUrl;
        cert.photoHash = photoHash;

        certificateExists[certificateId] = true;
        commission.deliveredAt = uint64(block.timestamp);
        commission.certificateId = certificateId;

        if (milestones[commissionId].length == 0) {
            commission.status = CommissionStatus.Delivered;
        }

        emit CommissionDelivered(commissionId, certificateId, photoUrl);
    }

    /// @notice Marks a milestone as completed by the artist.
    /// @param commissionId Commission identifier.
    /// @param milestoneIndex Index of milestone in commission milestones.
    function completeMilestone(uint256 commissionId, uint256 milestoneIndex) external nonReentrant {
        Commission storage commission = _requireCommission(commissionId);
        if (commission.status != CommissionStatus.Funded) revert InvalidStatus();
        if (msg.sender != commission.artist) revert Unauthorized();

        Milestone[] storage commissionMilestones = milestones[commissionId];
        if (milestoneIndex >= commissionMilestones.length) revert InvalidStatus();

        Milestone storage milestone = commissionMilestones[milestoneIndex];
        if (milestone.artistDone) revert InvalidStatus();

        milestone.artistDone = true;
        lastMilestoneActionAt[commissionId] = uint64(block.timestamp);
        emit MilestoneCompleted(commissionId, milestoneIndex);
    }

    /// @notice Approves a completed milestone and releases that milestone's escrow amount minus platform fee.
    /// @param commissionId Commission identifier.
    /// @param milestoneIndex Index of milestone in commission milestones.
    function approveMilestone(uint256 commissionId, uint256 milestoneIndex) external nonReentrant {
        Commission storage commission = _requireCommission(commissionId);
        if (commission.status != CommissionStatus.Funded) revert InvalidStatus();
        if (msg.sender != commission.collector) revert Unauthorized();
        if (commission.certificateId == bytes32(0)) revert InvalidStatus();

        Milestone[] storage commissionMilestones = milestones[commissionId];
        if (milestoneIndex >= commissionMilestones.length) revert InvalidStatus();

        Milestone storage milestone = commissionMilestones[milestoneIndex];
        if (!milestone.artistDone) revert InvalidStatus();
        if (milestone.collectorApproved) revert InvalidStatus();

        milestone.collectorApproved = true;
        _approvedMilestoneCount[commissionId]++;

        uint256 milestoneAmount = milestone.amount;
        uint256 feeAmount = (milestoneAmount * platformFeeBps) / 10_000;
        uint256 netArtistAmount = milestoneAmount - feeAmount;

        commission.releasedSoFar += milestoneAmount;
        pendingWithdrawals[commission.artist] += netArtistAmount;
        if (feeAmount > 0) {
            pendingWithdrawals[feeRecipient] += feeAmount;
        }

        emit MilestoneApproved(commissionId, milestoneIndex, netArtistAmount);

        if (_allMilestonesApproved(commissionId)) {
            commission.status = CommissionStatus.Released;
            _finalizeCertificate(commissionId);
            emit CommissionReleased(commissionId, commission.certificateId);
        }
    }

    /// @notice Allows artist to auto-claim remaining unpaid milestone funds 14 days after the last
    ///         milestone action (or after the commission deadline) with no collector response.
    /// @param commissionId Commission identifier.
    /// @param milestoneIndex Milestone index to claim.
    function autoClaimMilestone(uint256 commissionId, uint256 milestoneIndex) external nonReentrant {
        Commission storage commission = _requireCommission(commissionId);
        if (commission.status != CommissionStatus.Funded) revert InvalidStatus();
        if (msg.sender != commission.artist) revert Unauthorized();
        Milestone storage m = milestones[commissionId][milestoneIndex];
        if (!m.artistDone) revert InvalidStatus();
        if (m.collectorApproved) revert InvalidStatus();

        // Mirror the same delivery gate as approveMilestone: delivery must have been recorded first.
        if (commission.certificateId == bytes32(0) || !certificateExists[commission.certificateId]) revert CertificateNotFound();

        bool afterWindow = block.timestamp >= uint256(lastMilestoneActionAt[commissionId]) + 14 days;
        bool afterDeadline = block.timestamp > commission.deadline;
        if (!afterWindow && !afterDeadline) revert MilestoneClaimNotReady();

        m.collectorApproved = true;
        _approvedMilestoneCount[commissionId]++;

        uint256 milestoneAmt = m.amount;
        uint256 feeAmt = (milestoneAmt * platformFeeBps) / 10000;
        uint256 netAmt = milestoneAmt - feeAmt;
        if (feeAmt > 0) pendingWithdrawals[feeRecipient] += feeAmt;
        pendingWithdrawals[commission.artist] += netAmt;
        commission.releasedSoFar += milestoneAmt;

        emit MilestoneApproved(commissionId, milestoneIndex, netAmt);
        if (_allMilestonesApproved(commissionId)) {
            _finalizeCertificate(commissionId);
        }
    }

    /// @notice Confirms receipt by collector and releases escrowed USDC to artist minus platform fee.
    /// @param commissionId Commission identifier.
    function confirmReceipt(uint256 commissionId) external nonReentrant {
        Commission storage commission = _requireCommission(commissionId);

        if (milestones[commissionId].length > 0) revert UseMilestoneFlow();
        if (commission.status != CommissionStatus.Delivered) revert InvalidStatus();
        if (msg.sender != commission.collector) revert Unauthorized();

        _releaseFunds(commissionId);
        emit CommissionReleased(commissionId, commission.certificateId);
    }

    /// @notice Allows artist to auto-claim funds 14 days after delivery if collector does not confirm.
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
        if (commission.releasedSoFar >= commission.amount) revert NothingToWithdraw();

        commission.status = CommissionStatus.Refunded;
        pendingWithdrawals[commission.collector] += commission.amount - commission.releasedSoFar;

        emit CommissionRefunded(commissionId);
    }

    /// @notice Cancels an unfunded commission.
    /// @param commissionId Commission identifier.
    function cancelCommission(uint256 commissionId) external nonReentrant {
        Commission storage commission = _requireCommission(commissionId);

        if (commission.status != CommissionStatus.Created) revert InvalidStatus();
        if (msg.sender != commission.artist && msg.sender != commission.collector) revert Unauthorized();

        commission.status = CommissionStatus.Cancelled;

        emit CommissionCancelled(commissionId, msg.sender);
    }

    /// @notice Transfers ownership of an issued certificate and corresponding ERC-721 token.
    /// @param certificateId Certificate identifier.
    /// @param newOwner New owner address.
    /// @param price Transfer price logged for provenance.
    function transferCertificate(bytes32 certificateId, address newOwner, uint256 price) external nonReentrant {
        if (!certificateExists[certificateId]) revert CertificateNotFound();
        Certificate storage cert = certificates[certificateId];
        if (newOwner == address(0) || newOwner == cert.currentOwner) revert InvalidAddress();
        if (msg.sender != cert.currentOwner) revert Unauthorized();

        uint256 tokenId = certTokenId[certificateId];
        if (tokenId == 0) revert InvalidStatus();

        address oldOwner = cert.currentOwner;
        safeTransferFrom(oldOwner, newOwner, tokenId);

        cert.currentOwner = newOwner;
        cert.owners.push(newOwner);
        cert.prices.push(price);

        emit CertificateTransferred(certificateId, oldOwner, newOwner, price);
    }

    /// @notice Lists a certificate NFT for USDC resale.
    /// @param tokenId Certificate token id.
    /// @param priceUsdc Listing price in USDC token base units.
    function listCertificate(uint256 tokenId, uint256 priceUsdc) external nonReentrant {
        if (ownerOf(tokenId) != msg.sender) revert Unauthorized();
        if (priceUsdc == 0) revert InvalidAmount();
        if (listings[tokenId].active) revert InvalidStatus();

        listings[tokenId] = Listing({seller: msg.sender, priceUsdc: priceUsdc, active: true});
        emit CertificateListed(tokenId, msg.sender, priceUsdc);
    }

    /// @notice Cancels an active resale listing.
    /// @param tokenId Certificate token id.
    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        if (!listing.active) revert NotListed();

        address currentOwner = ownerOf(tokenId);
        if (msg.sender != listing.seller && msg.sender != currentOwner) revert Unauthorized();

        delete listings[tokenId];
        emit ListingCancelled(tokenId);
    }

    /// @notice Purchases an actively listed certificate NFT with USDC.
    /// @param tokenId Certificate token id.
    function purchaseCertificate(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        if (!listing.active) revert NotListed();

        address buyer = msg.sender;
        if (buyer == listing.seller) revert InvalidAddress();

        delete listings[tokenId];

        uint256 balanceBefore = IERC20(usdcToken).balanceOf(address(this));
        IERC20(usdcToken).safeTransferFrom(buyer, address(this), listing.priceUsdc);
        uint256 received = IERC20(usdcToken).balanceOf(address(this)) - balanceBefore;
        if (received != listing.priceUsdc) revert PriceMismatch();

        (address royaltyReceiver, uint256 royaltyAmount) = royaltyInfo(tokenId, listing.priceUsdc);
        uint256 resaleFee = (listing.priceUsdc * platformResaleBps) / 10_000;
        if (royaltyAmount + resaleFee > listing.priceUsdc) revert InvalidAmount();

        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            pendingWithdrawals[royaltyReceiver] += royaltyAmount;
        }
        if (resaleFee > 0) {
            pendingWithdrawals[feeRecipient] += resaleFee;
        }

        uint256 sellerAmount = listing.priceUsdc - royaltyAmount - resaleFee;
        pendingWithdrawals[listing.seller] += sellerAmount;

        _transferListedCertificate(tokenId, listing.seller, buyer, listing.priceUsdc);
    }

    /// @notice Returns active listing details for a token id.
    /// @param tokenId Certificate token id.
    /// @return listing Listing information.
    function getActiveListing(uint256 tokenId) external view returns (Listing memory listing) {
        listing = listings[tokenId];
    }

    /// @notice Records immutable legalization metadata for a certificate token.
    /// @param tokenId Certificate token id.
    /// @param documentHash Hash of legalization document.
    /// @param note Human-readable note for legalization context.
    function legalize(uint256 tokenId, bytes32 documentHash, string calldata note) external nonReentrant {
        if (documentHash == bytes32(0)) revert InvalidPhotoHash();
        if (legalRecords[tokenId].exists) revert AlreadyLegalized();

        bytes32 certId = tokenCertId[tokenId];
        if (certId == bytes32(0) || !certificateExists[certId]) revert CertificateNotFound();

        Certificate storage cert = certificates[certId];
        Commission storage commission = commissions[cert.commissionId];
        if (msg.sender != commission.artist) revert Unauthorized();

        legalRecords[tokenId] = LegalRecord({documentHash: documentHash, note: note, timestamp: uint64(block.timestamp), exists: true});
        emit CertificateLegalized(tokenId, documentHash, note);
    }

    /// @notice Withdraws accrued USDC balance from pull-payment storage.
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        pendingWithdrawals[msg.sender] = 0;
        IERC20(usdcToken).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Updates primary platform commission fee in bps.
    /// @param bps New platform fee in bps.
    function setPlatformFeeBps(uint16 bps) external onlyOwner nonReentrant {
        if (bps > MAX_PLATFORM_FEE_BPS) revert FeeTooHigh();
        platformFeeBps = bps;
        emit FeeUpdated(bps);
    }

    /// @notice Updates fee recipient address.
    /// @param recipient New fee recipient.
    function setFeeRecipient(address recipient) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert InvalidAddress();
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    /// @notice Updates platform resale fee in bps.
    /// @param bps New resale fee bps.
    function setPlatformResaleBps(uint16 bps) external onlyOwner nonReentrant {
        if (bps > MAX_RESALE_BPS) revert FeeTooHigh();
        platformResaleBps = bps;
        emit ResaleFeeUpdated(bps);
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

    /// @notice Returns certificate metadata by NFT token id.
    /// @param tokenId Certificate token id.
    /// @return certificate Certificate struct.
    function getCertificateByTokenId(uint256 tokenId) external view returns (Certificate memory certificate) {
        bytes32 certId = tokenCertId[tokenId];
        if (certId == bytes32(0) || !certificateExists[certId]) revert CertificateNotFound();
        certificate = certificates[certId];
    }

    /// @notice Returns all milestone entries for a commission.
    /// @param commissionId Commission identifier.
    /// @return commissionMilestones Array of milestones.
    function getMilestones(uint256 commissionId) external view returns (Milestone[] memory commissionMilestones) {
        commissionMilestones = milestones[commissionId];
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

    /// @notice Returns on-chain metadata URI for certificate NFT.
    /// @param tokenId Certificate token id.
    /// @return URI Data URI containing Base64-encoded JSON metadata.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        bytes32 certId = tokenCertId[tokenId];
        if (certId == bytes32(0) || !certificateExists[certId]) revert CertificateNotFound();

        Certificate storage cert = certificates[certId];

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name":"',
                        cert.artworkTitle,
                        '","description":"Certificate of Authenticity","image":"',
                        cert.photoUrl,
                        '","attributes":[{"trait_type":"Artist","value":"',
                        cert.artistName,
                        '"},{"trait_type":"Technique","value":"',
                        cert.technique,
                        '"},{"trait_type":"Dimensions","value":"',
                        cert.dimensions,
                        '"}]}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    /// @notice Returns whether interfaceId is supported.
    /// @param interfaceId Interface identifier.
    /// @return True if supported.
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _releaseFunds(uint256 commissionId) internal {
        Commission storage commission = commissions[commissionId];

        uint256 feeAmount = (commission.amount * platformFeeBps) / 10_000;
        uint256 netArtistAmount = commission.amount - feeAmount;

        pendingWithdrawals[commission.artist] += netArtistAmount;
        if (feeAmount > 0) {
            pendingWithdrawals[feeRecipient] += feeAmount;
        }

        commission.status = CommissionStatus.Released;
        _finalizeCertificate(commissionId);
    }

    function _finalizeCertificate(uint256 commissionId) internal {
        Commission storage commission = commissions[commissionId];
        bytes32 certificateId = commission.certificateId;
        if (certificateId == bytes32(0) || !certificateExists[certificateId]) revert CertificateNotFound();

        Certificate storage cert = certificates[certificateId];
        if (certTokenId[certificateId] != 0) revert InvalidStatus();

        // Always mark Released when finalization is reached (covers the autoClaimMilestone path
        // where _releaseFunds is NOT called and status is not yet set).
        commission.status = CommissionStatus.Released;

        cert.collector = commission.collector;
        cert.currentOwner = commission.collector;
        cert.owners.push(commission.collector);
        cert.prices.push(0);
        cert.amountPaid = commission.amount;
        cert.paymentTxHash = bytes32(0);
        cert.releasedAt = uint64(block.timestamp);

        uint256 tokenId = _tokenIdCounter;
        unchecked {
            // Safe: counter cannot overflow uint256 within any realistic lifecycle.
            _tokenIdCounter = tokenId + 1;
        }

        certTokenId[certificateId] = tokenId;
        tokenCertId[tokenId] = certificateId;
        _safeMint(commission.collector, tokenId);

        uint16 royaltyBps = _commissionRoyaltyBps[commissionId];
        if (royaltyBps > 0) {
            _setTokenRoyalty(tokenId, commission.artist, royaltyBps);
        }
    }

    function _transferListedCertificate(uint256 tokenId, address seller, address buyer, uint256 priceUsdc) internal {
        bytes32 certId = tokenCertId[tokenId];
        if (certId == bytes32(0) || !certificateExists[certId]) revert CertificateNotFound();

        _safeTransfer(seller, buyer, tokenId, "");

        Certificate storage cert = certificates[certId];
        cert.currentOwner = buyer;
        cert.owners.push(buyer);
        cert.prices.push(priceUsdc);

        emit CertificatePurchased(tokenId, buyer, priceUsdc);
        emit CertificateTransferred(certId, seller, buyer, priceUsdc);
    }

    function _allMilestonesApproved(uint256 commissionId) internal view returns (bool) {
        uint256 total = milestones[commissionId].length;
        return total > 0 && _approvedMilestoneCount[commissionId] == total;
    }

    function _requireCommission(uint256 commissionId) internal view returns (Commission storage commission) {
        if (commissionId == 0 || commissionId >= _commissionCounter) revert CommissionNotFound();
        commission = commissions[commissionId];
    }

    function _requireCommissionView(uint256 commissionId) internal view returns (Commission memory commission) {
        if (commissionId == 0 || commissionId >= _commissionCounter) revert CommissionNotFound();
        commission = commissions[commissionId];
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address previousOwner) {
        previousOwner = super._update(to, tokenId, auth);

        bytes32 certId = tokenCertId[tokenId];
        if (to != address(0) && certId != bytes32(0) && certificateExists[certId]) {
            certificates[certId].currentOwner = to;
        }
    }
}
