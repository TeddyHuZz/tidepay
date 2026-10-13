// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/**
 * @dev Interface of the ERC20 Permit extension allowing approvals to be made via signatures.
 */
interface IERC20Permit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
    function nonces(address owner) external view returns (uint256);
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}

/**
 * @dev SafeERC20 wrapper around ERC-20 operations that throw on failure.
 */
library SafeERC20 {
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        (bool success, bytes memory returndata) = address(token).call(data);
        require(success, "SafeERC20: low-level call failed");
        if (returndata.length > 0) {
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }
}

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 */
abstract contract ReentrancyGuard {
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != ENTERED, "ReentrancyGuard: reentrant call");
        _status = ENTERED;
        _;
        _status = NOT_ENTERED;
    }
}

/**
 * @title TidePaySubscription
 * @notice Non-custodial, time-locked recurring subscription & billing engine for EVM networks.
 *         Enforces deterministic pull billing (transferFrom) with autonomous keeper crank rewards.
 */
contract TidePaySubscription is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Protocol Constants ---
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAX_PROTOCOL_FEE_BPS = 1_000; // 10%
    uint64 public constant MIN_INTERVAL_SECONDS = 60; // 60s fast-forward for demo & testing

    address public protocolFeeRecipient;
    uint256 public protocolFeeBps; // default 50 bps = 0.5%
    address public owner;

    // --- Data Structures ---

    struct Plan {
        address merchant;
        address token;
        uint256 amount;
        uint64 intervalSeconds;
        uint256 crankBountyAmount;
        string planId;
        bool isActive;
    }

    struct Subscription {
        bytes32 planKey;
        address subscriber;
        address merchant;
        uint64 startTimestamp;
        uint64 lastEpochTimestamp;
        uint64 nextEpochTimestamp;
        uint64 cycleCount;
        bool isActive;
    }

    // Key mappings
    // planKey = keccak256(abi.encodePacked(merchant, planId))
    mapping(bytes32 => Plan) public plans;

    // subKey = keccak256(abi.encodePacked(planKey, subscriber))
    mapping(bytes32 => Subscription) public subscriptions;

    // Merchant plans registry
    mapping(address => bytes32[]) internal _merchantPlanKeys;

    // Plan subscribers registry
    mapping(bytes32 => address[]) internal _planSubscribers;

    // --- Events ---

    event PlanCreated(
        bytes32 indexed planKey,
        address indexed merchant,
        string planId,
        address token,
        uint256 amount,
        uint64 intervalSeconds,
        uint256 crankBountyAmount
    );

    event PlanStatusUpdated(bytes32 indexed planKey, bool isActive);

    event Subscribed(
        bytes32 indexed subKey,
        bytes32 indexed planKey,
        address indexed subscriber,
        address merchant,
        uint64 startTimestamp,
        uint64 nextEpochTimestamp
    );

    event EpochProcessed(
        bytes32 indexed subKey,
        bytes32 indexed planKey,
        address indexed subscriber,
        address merchant,
        uint64 cycleCount,
        address keeperRecipient,
        uint256 keeperBounty,
        uint256 netMerchantAmount
    );

    event SubscriptionCancelled(
        bytes32 indexed subKey,
        bytes32 indexed planKey,
        address indexed cancelledBy,
        uint64 timestamp
    );

    event ProtocolFeeUpdated(uint256 newFeeBps, address newRecipient);

    // --- Modifiers ---

    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized");
        _;
    }

    constructor(address _feeRecipient, uint256 _feeBps) {
        require(_feeBps <= MAX_PROTOCOL_FEE_BPS, "FeeExceedsMax");
        owner = msg.sender;
        protocolFeeRecipient = _feeRecipient == address(0) ? msg.sender : _feeRecipient;
        protocolFeeBps = _feeBps;
    }

    // --- Key Derivations ---

    function getPlanKey(address merchant, string memory planId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(merchant, planId));
    }

    function getSubKey(bytes32 planKey, address subscriber) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(planKey, subscriber));
    }

    function getMerchantPlanKeys(address merchant) external view returns (bytes32[] memory) {
        return _merchantPlanKeys[merchant];
    }

    function getPlanSubscribers(bytes32 planKey) external view returns (address[] memory) {
        return _planSubscribers[planKey];
    }

    // --- Plan Management ---

    function createPlan(
        string calldata planId,
        address token,
        uint256 amount,
        uint64 intervalSeconds,
        uint256 crankBountyAmount
    ) external returns (bytes32 planKey) {
        require(bytes(planId).length > 0 && bytes(planId).length <= 64, "InvalidPlanId");
        require(token != address(0), "InvalidToken");
        require(amount > 0, "AmountMustBePositive");
        require(amount > crankBountyAmount, "AmountMustExceedBounty");
        require(intervalSeconds >= MIN_INTERVAL_SECONDS, "IntervalTooShort");

        planKey = getPlanKey(msg.sender, planId);
        require(!plans[planKey].isActive, "PlanAlreadyExists");

        plans[planKey] = Plan({
            merchant: msg.sender,
            token: token,
            amount: amount,
            intervalSeconds: intervalSeconds,
            crankBountyAmount: crankBountyAmount,
            planId: planId,
            isActive: true
        });

        _merchantPlanKeys[msg.sender].push(planKey);

        emit PlanCreated(
            planKey,
            msg.sender,
            planId,
            token,
            amount,
            intervalSeconds,
            crankBountyAmount
        );
    }

    function setPlanStatus(bytes32 planKey, bool isActive) external {
        Plan storage plan = plans[planKey];
        require(plan.merchant == msg.sender, "UnauthorizedMerchant");
        plan.isActive = isActive;
        emit PlanStatusUpdated(planKey, isActive);
    }

    // --- Subscription Lifecycle ---

    /**
     * @notice Subscribes to a merchant plan using standard ERC-20 pull delegation.
     *         Immediately settles Epoch 0 payment.
     */
    function subscribe(bytes32 planKey) external nonReentrant returns (bytes32 subKey) {
        return _executeSubscribe(planKey, msg.sender);
    }

    /**
     * @notice Subscribes to a merchant plan with an EIP-2612 permit for 1-click gasless approval.
     */
    function subscribeWithPermit(
        bytes32 planKey,
        uint256 permitAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant returns (bytes32 subKey) {
        Plan storage plan = plans[planKey];
        require(plan.isActive, "PlanNotActive");

        // Execute permit on token
        IERC20Permit(plan.token).permit(
            msg.sender,
            address(this),
            permitAmount,
            deadline,
            v,
            r,
            s
        );

        return _executeSubscribe(planKey, msg.sender);
    }

    function _executeSubscribe(bytes32 planKey, address subscriber) internal returns (bytes32 subKey) {
        Plan storage plan = plans[planKey];
        require(plan.isActive, "PlanNotActive");

        subKey = getSubKey(planKey, subscriber);
        Subscription storage sub = subscriptions[subKey];
        require(!sub.isActive, "SubscriptionAlreadyActive");

        uint64 nowTs = uint64(block.timestamp);
        uint64 nextEpoch = nowTs + plan.intervalSeconds;

        // State mutation BEFORE external CPI call (Checks-Effects-Interactions)
        sub.planKey = planKey;
        sub.subscriber = subscriber;
        sub.merchant = plan.merchant;
        sub.startTimestamp = nowTs;
        sub.lastEpochTimestamp = nowTs;
        sub.nextEpochTimestamp = nextEpoch;
        sub.cycleCount = 1;
        sub.isActive = true;

        // Epoch 0 Settlement: Pull funds from subscriber to merchant
        IERC20(plan.token).safeTransferFrom(subscriber, plan.merchant, plan.amount);

        _planSubscribers[planKey].push(subscriber);

        emit Subscribed(subKey, planKey, subscriber, plan.merchant, nowTs, nextEpoch);
    }

    /**
     * @notice Autonomous Keeper Crank settlement function.
     *         Enforces deterministic time-lock: block.timestamp >= nextEpochTimestamp.
     */
    function processEpoch(
        bytes32 subKey,
        address keeperRecipient
    ) external nonReentrant {
        Subscription storage sub = subscriptions[subKey];
        require(sub.isActive, "SubscriptionNotActive");

        Plan storage plan = plans[sub.planKey];
        require(plan.isActive, "PlanNotActive");

        // Deterministic Time-Lock Verification
        require(block.timestamp >= sub.nextEpochTimestamp, "EpochNotDue");
        require(keeperRecipient != address(0), "InvalidKeeperRecipient");

        // State mutation BEFORE token transfers
        sub.cycleCount += 1;
        sub.lastEpochTimestamp = uint64(block.timestamp);
        sub.nextEpochTimestamp = uint64(block.timestamp + plan.intervalSeconds);

        uint256 keeperBounty = plan.crankBountyAmount;
        uint256 netMerchantAmount = plan.amount - keeperBounty;

        // Pull funds from subscriber:
        // 1. Keeper Bounty -> keeperRecipient
        if (keeperBounty > 0) {
            IERC20(plan.token).safeTransferFrom(sub.subscriber, keeperRecipient, keeperBounty);
        }
        // 2. Net Merchant Amount -> plan.merchant
        IERC20(plan.token).safeTransferFrom(sub.subscriber, plan.merchant, netMerchantAmount);

        emit EpochProcessed(
            subKey,
            sub.planKey,
            sub.subscriber,
            plan.merchant,
            sub.cycleCount,
            keeperRecipient,
            keeperBounty,
            netMerchantAmount
        );
    }

    /**
     * @notice Cancels an active subscription. Callable by either subscriber or merchant.
     */
    function cancelSubscription(bytes32 subKey) external {
        Subscription storage sub = subscriptions[subKey];
        require(sub.isActive, "SubscriptionNotActive");
        require(
            msg.sender == sub.subscriber || msg.sender == sub.merchant || msg.sender == owner,
            "UnauthorizedCancellation"
        );

        sub.isActive = false;

        emit SubscriptionCancelled(subKey, sub.planKey, msg.sender, uint64(block.timestamp));
    }

    // --- Admin Functions ---

    function setProtocolFee(uint256 _feeBps, address _recipient) external onlyOwner {
        require(_feeBps <= MAX_PROTOCOL_FEE_BPS, "FeeExceedsMax");
        require(_recipient != address(0), "InvalidRecipient");
        protocolFeeBps = _feeBps;
        protocolFeeRecipient = _recipient;
        emit ProtocolFeeUpdated(_feeBps, _recipient);
    }
}
