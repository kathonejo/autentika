// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AutentikaSubscriptions
/// @notice Overcollateralized artist subscriptions ("club de correo"): subscribers
///         deposit USDC ahead of a monthly fee; artists claim one fee per elapsed
///         30-day period. Annual lock (12 months) unlocks a 10% fee discount.
///         Standalone companion — does not modify AutentikaV2.
contract AutentikaSubscriptions is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint64 public constant PERIOD = 30 days;
    uint256 public constant ANNUAL_MONTHS = 12;
    uint16 public constant ANNUAL_DISCOUNT_BPS = 1_000; // 10%
    uint16 public constant MAX_PLATFORM_FEE_BPS = 200; // 2%
    uint16 public constant BPS_DENOM = 10_000;

    IERC20 public immutable usdc;

    address public feeRecipient;
    uint16 public platformFeeBps; // default 50 = 0.5%

    struct Plan {
        uint256 monthlyFeeUsdc;
        string title;
        bool active;
    }

    struct Sub {
        uint256 balance; // withdrawable (not locked)
        uint256 lockedRemaining; // USDC reserved for discounted claims
        uint256 lockedMonthsLeft;
        uint64 startedAt; // first deposit / period anchor
        uint64 lastClaimAt; // end of last fully claimed period
        uint256 totalClaimed;
        bool cancelled; // no new periods after cancelAfter
        uint64 cancelAfter; // end of last claimable period when cancelled (0 if not)
        bool exists;
    }

    mapping(address => Plan) public plans;
    mapping(address => mapping(address => Sub)) internal subs; // artist => subscriber

    event PlanSet(address indexed artist, uint256 monthlyFeeUsdc, string title);
    event Deposited(address indexed artist, address indexed subscriber, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed artist, address indexed subscriber, uint256 amount, uint256 newBalance);
    event LockedAnnual(address indexed artist, address indexed subscriber, uint256 months, uint256 lockedAmount, uint256 discountedFee);
    event Claimed(
        address indexed artist,
        address indexed subscriber,
        uint256 periods,
        uint256 gross,
        uint256 fee,
        uint256 netToArtist
    );
    event Cancelled(address indexed artist, address indexed subscriber);
    event PlatformFeeUpdated(uint16 bps);
    event FeeRecipientUpdated(address indexed recipient);

    error ZeroAddress();
    error InvalidFee();
    error FeeTooHigh();
    error NoPlan();
    error ZeroAmount();
    error InsufficientBalance();
    error NothingClaimable();
    error NotAnnualLock();
    error AlreadyLocked();
    error InsufficientForLock();
    error NothingToWithdraw();

    constructor(address _usdc, address _initialOwner, address _feeRecipient) Ownable(_initialOwner) {
        if (_usdc == address(0) || _initialOwner == address(0) || _feeRecipient == address(0)) {
            revert ZeroAddress();
        }
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
        platformFeeBps = 50;
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    function setPlatformFeeBps(uint16 bps) external onlyOwner {
        if (bps > MAX_PLATFORM_FEE_BPS) revert FeeTooHigh();
        platformFeeBps = bps;
        emit PlatformFeeUpdated(bps);
    }

    function setFeeRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    // ─── Artist ──────────────────────────────────────────────────────────────

    function setPlan(uint256 monthlyFeeUsdc, string calldata title) external {
        if (monthlyFeeUsdc == 0) revert InvalidFee();
        plans[msg.sender] = Plan({monthlyFeeUsdc: monthlyFeeUsdc, title: title, active: true});
        emit PlanSet(msg.sender, monthlyFeeUsdc, title);
    }

    // ─── Subscriber ──────────────────────────────────────────────────────────

    function deposit(address artist, uint256 amount) external nonReentrant {
        if (artist == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (!plans[artist].active || plans[artist].monthlyFeeUsdc == 0) revert NoPlan();

        Sub storage s = subs[artist][msg.sender];
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        s.balance += amount;
        if (!s.exists) {
            s.exists = true;
            s.startedAt = uint64(block.timestamp);
            s.lastClaimAt = uint64(block.timestamp);
        }
        emit Deposited(artist, msg.sender, amount, s.balance);
    }

    /// @notice Commit to an annual plan: lock 12 months at 10% off. Moves
    ///         12 × discountedFee from free balance into lockedRemaining.
    function lockMonths(address artist, uint256 months) external nonReentrant {
        if (months != ANNUAL_MONTHS) revert NotAnnualLock();
        Plan memory p = plans[artist];
        if (!p.active || p.monthlyFeeUsdc == 0) revert NoPlan();

        Sub storage s = subs[artist][msg.sender];
        if (!s.exists) revert InsufficientBalance();
        if (s.lockedMonthsLeft > 0) revert AlreadyLocked();

        uint256 discounted = _discountedFee(p.monthlyFeeUsdc);
        uint256 need = discounted * ANNUAL_MONTHS;
        if (s.balance < need) revert InsufficientForLock();

        s.balance -= need;
        s.lockedRemaining += need;
        s.lockedMonthsLeft = ANNUAL_MONTHS;
        emit LockedAnnual(artist, msg.sender, months, need, discounted);
    }

    function withdraw(address artist, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Sub storage s = subs[artist][msg.sender];
        if (s.balance < amount) revert InsufficientBalance();
        s.balance -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit Withdrawn(artist, msg.sender, amount, s.balance);
    }

    function cancel(address artist) external {
        Sub storage s = subs[artist][msg.sender];
        if (!s.exists) revert InsufficientBalance();
        s.cancelled = true;
        // Current period ends at lastClaimAt + PERIOD; no claims beyond that.
        uint64 endCurrent = s.lastClaimAt + PERIOD;
        if (s.cancelAfter == 0 || endCurrent > s.cancelAfter) {
            s.cancelAfter = endCurrent;
        }
        emit Cancelled(artist, msg.sender);
    }

    // ─── Artist claim ────────────────────────────────────────────────────────

    /// @notice Claim all fully elapsed 30-day periods since lastClaimAt.
    ///         Uses discounted fee while locked months remain; otherwise full fee.
    ///         Cancelled subs only allow claims through the current open period.
    function claim(address subscriber) external nonReentrant {
        address artist = msg.sender;
        Plan memory p = plans[artist];
        if (!p.active || p.monthlyFeeUsdc == 0) revert NoPlan();

        Sub storage s = subs[artist][subscriber];
        if (!s.exists) revert NothingClaimable();

        uint256 periods = claimablePeriods(artist, subscriber);
        if (periods == 0) revert NothingClaimable();

        uint256 gross;
        uint256 remainingPeriods = periods;

        // Claim locked (discounted) months first
        while (remainingPeriods > 0 && s.lockedMonthsLeft > 0) {
            uint256 fee = _discountedFee(p.monthlyFeeUsdc);
            if (s.lockedRemaining < fee) break;
            s.lockedRemaining -= fee;
            s.lockedMonthsLeft -= 1;
            gross += fee;
            remainingPeriods -= 1;
        }

        // Then free balance at full fee
        while (remainingPeriods > 0) {
            uint256 fee = p.monthlyFeeUsdc;
            if (s.balance < fee) break;
            s.balance -= fee;
            gross += fee;
            remainingPeriods -= 1;
        }

        uint256 claimedPeriods = periods - remainingPeriods;
        if (claimedPeriods == 0 || gross == 0) revert NothingClaimable();

        s.lastClaimAt += uint64(claimedPeriods * PERIOD);
        s.totalClaimed += gross;

        uint256 feeAmt = (gross * platformFeeBps) / BPS_DENOM;
        uint256 net = gross - feeAmt;

        if (feeAmt > 0) usdc.safeTransfer(feeRecipient, feeAmt);
        usdc.safeTransfer(artist, net);

        emit Claimed(artist, subscriber, claimedPeriods, gross, feeAmt, net);
    }

    // ─── Views ───────────────────────────────────────────────────────────────

    function getPlan(address artist) external view returns (Plan memory) {
        return plans[artist];
    }

    function getSubscription(address artist, address subscriber) external view returns (Sub memory) {
        return subs[artist][subscriber];
    }

    function balanceOf(address artist, address subscriber) external view returns (uint256) {
        return subs[artist][subscriber].balance;
    }

    function lockedOf(address artist, address subscriber) external view returns (uint256) {
        return subs[artist][subscriber].lockedRemaining;
    }

    function nextClaimAt(address artist, address subscriber) public view returns (uint64) {
        Sub storage s = subs[artist][subscriber];
        if (!s.exists) return 0;
        return s.lastClaimAt + PERIOD;
    }

    function claimablePeriods(address artist, address subscriber) public view returns (uint256) {
        Sub storage s = subs[artist][subscriber];
        if (!s.exists) return 0;

        uint256 horizon = block.timestamp;
        if (s.cancelled && s.cancelAfter > 0 && horizon > s.cancelAfter) {
            horizon = s.cancelAfter;
        }
        if (horizon < s.lastClaimAt + PERIOD) return 0;
        return (horizon - s.lastClaimAt) / PERIOD;
    }

    function claimable(address artist, address subscriber) external view returns (uint256 amount) {
        Plan memory p = plans[artist];
        if (!p.active) return 0;
        uint256 periods = claimablePeriods(artist, subscriber);
        Sub storage s = subs[artist][subscriber];
        uint256 left = periods;
        uint256 lockedLeft = s.lockedMonthsLeft;
        uint256 lockedBal = s.lockedRemaining;
        uint256 freeBal = s.balance;

        while (left > 0 && lockedLeft > 0) {
            uint256 fee = _discountedFee(p.monthlyFeeUsdc);
            if (lockedBal < fee) break;
            lockedBal -= fee;
            lockedLeft -= 1;
            amount += fee;
            left -= 1;
        }
        while (left > 0) {
            if (freeBal < p.monthlyFeeUsdc) break;
            freeBal -= p.monthlyFeeUsdc;
            amount += p.monthlyFeeUsdc;
            left -= 1;
        }
    }

    function discountedMonthlyFee(address artist) external view returns (uint256) {
        return _discountedFee(plans[artist].monthlyFeeUsdc);
    }

    function _discountedFee(uint256 monthly) internal pure returns (uint256) {
        return monthly - (monthly * ANNUAL_DISCOUNT_BPS) / BPS_DENOM;
    }
}
