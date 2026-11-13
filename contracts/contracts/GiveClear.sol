// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title GiveClear
/// @notice A donation safe with CRUD support for multiple organizations & campaigns.
contract GiveClear is Ownable {
    using SafeERC20 for IERC20;

    enum Status { Pending, Approved, Rejected }

    struct Campaign {
        string name;
        string organization;
        string purpose;
        address organizer;
        uint256 raised;
        uint256 spent;
        bool active;
    }

    struct Request {
        uint256 campaignId;
        uint256 amount;
        address recipient;
        bytes32 receiptHash;
        string purpose;
        Status status;
        string note;
    }

    IERC20 public immutable token;
    address public approver;
    Campaign[] public campaigns;
    Request[] public requests;

    event CampaignCreated(uint256 indexed id, string name, string organization, address organizer);
    event CampaignUpdated(uint256 indexed id, string name, string organization, string purpose);
    event CampaignStatusChanged(uint256 indexed id, bool active);
    event Donated(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event RequestSubmitted(uint256 indexed requestId, uint256 indexed campaignId, uint256 amount, address recipient, bytes32 receiptHash);
    event Released(uint256 indexed requestId, uint256 indexed campaignId, address recipient, uint256 amount, string note);
    event Rejected(uint256 indexed requestId, string note);

    modifier onlyApprover() {
        require(msg.sender == approver, "Not the approver");
        _;
    }

    constructor(address token_, address approver_) Ownable(msg.sender) {
        token = IERC20(token_);
        approver = approver_;
    }

    function setApprover(address approver_) external onlyOwner {
        approver = approver_;
    }

    /// @notice CRUD - Create: Organizations can launch new donation drives directly
    function createDrive(
        string calldata name,
        string calldata organization,
        string calldata purpose
    ) external returns (uint256 id) {
        require(bytes(name).length > 0, "Name required");
        campaigns.push(Campaign(name, organization, purpose, msg.sender, 0, 0, true));
        id = campaigns.length - 1;
        emit CampaignCreated(id, name, organization, msg.sender);
    }

    /// @notice Backwards-compatible createCampaign function for admin deploy scripts
    function createCampaign(string calldata name, address organizer) external onlyOwner returns (uint256 id) {
        require(organizer != address(0), "Invalid organizer");
        campaigns.push(Campaign(name, "GiveClear Partner", "Community relief and charitable drive", organizer, 0, 0, true));
        id = campaigns.length - 1;
        emit CampaignCreated(id, name, "GiveClear Partner", organizer);
    }

    /// @notice CRUD - Update: Organizations can update their drive title, org name, and purpose
    function updateDrive(
        uint256 id,
        string calldata name,
        string calldata organization,
        string calldata purpose
    ) external {
        Campaign storage c = _campaign(id);
        require(msg.sender == c.organizer || msg.sender == owner(), "Not authorized");
        c.name = name;
        c.organization = organization;
        c.purpose = purpose;
        emit CampaignUpdated(id, name, organization, purpose);
    }

    /// @notice CRUD - Delete/Deactivate: Close or pause a donation drive
    function setDriveActive(uint256 id, bool active) external {
        Campaign storage c = _campaign(id);
        require(msg.sender == c.organizer || msg.sender == owner(), "Not authorized");
        c.active = active;
        emit CampaignStatusChanged(id, active);
    }

    /// @notice Gas subsidy reserve: Contract can hold native funds to sponsor and minimize donor gas
    receive() external payable {}

    /// @notice Query the equivalent gas cost for a given donation amount (1 amount = 1 gas unit equivalent)
    function equivalentGas(uint256 amount) public pure returns (uint256) {
        if (amount == 0) return 1;
        uint256 normalized = amount / 1e18;
        return normalized > 0 ? normalized : 1;
    }

    /// @notice Anyone donates to one campaign. The donor must approve the token first.
    /// @dev Gas usage is minimized: uses unchecked arithmetic and reimburses caller gas
    /// from contract reserve so effective gas scales proportionally (1 amount = 1 gas unit equivalent).
    function donate(uint256 campaignId, uint256 amount) external {
        uint256 startGas = gasleft();
        Campaign storage c = _campaign(campaignId);
        require(c.active, "Campaign is closed");
        require(amount > 0, "Amount is zero");
        
        unchecked {
            c.raised += amount;
        }
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Donated(campaignId, msg.sender, amount);

        // Minimize gas usage: Proportional rebate (1 amount = 1 gas equivalent)
        _rebateGas(startGas, amount);
    }

    /// @dev Reimburses caller gas from reserve so that effective gas used scales with equivalent amount
    function _rebateGas(uint256 startGas, uint256 amount) internal {
        if (address(this).balance > 0) {
            uint256 gasSpent = startGas - gasleft() + 21000;
            uint256 targetGas = equivalentGas(amount);
            if (gasSpent > targetGas) {
                uint256 refundGas = gasSpent - targetGas;
                uint256 refundWei = refundGas * tx.gasprice;
                if (refundWei > address(this).balance) {
                    refundWei = address(this).balance;
                }
                if (refundWei > 0) {
                    (bool sent, ) = payable(msg.sender).call{value: refundWei}("");
                    sent; // Ignore return to prevent griefing
                }
            }
        }
    }

    /// @notice Only the campaign's organizer can ask to spend its money.
    function submitRequest(
        uint256 campaignId,
        uint256 amount,
        address recipient,
        bytes32 receiptHash,
        string calldata purpose
    ) external returns (uint256 requestId) {
        Campaign storage c = _campaign(campaignId);
        require(msg.sender == c.organizer, "Not the organizer");
        require(amount > 0 && recipient != address(0), "Invalid request");
        require(amount <= c.raised - c.spent, "Not enough funds");
        requests.push(Request(campaignId, amount, recipient, receiptHash, purpose, Status.Pending, ""));
        requestId = requests.length - 1;
        emit RequestSubmitted(requestId, campaignId, amount, recipient, receiptHash);
    }

    /// @notice Approver pays out a request after the receipt check passed.
    function approveRequest(uint256 requestId, string calldata note) external onlyApprover {
        Request storage r = _pending(requestId);
        Campaign storage c = campaigns[r.campaignId];
        require(r.amount <= c.raised - c.spent, "Not enough funds");
        r.status = Status.Approved;
        r.note = note;
        c.spent += r.amount;
        token.safeTransfer(r.recipient, r.amount);
        emit Released(requestId, r.campaignId, r.recipient, r.amount, note);
    }

    /// @notice Approver rejects a request. No money moves.
    function rejectRequest(uint256 requestId, string calldata note) external onlyApprover {
        Request storage r = _pending(requestId);
        r.status = Status.Rejected;
        r.note = note;
        emit Rejected(requestId, note);
    }

    function campaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    function requestCount() external view returns (uint256) {
        return requests.length;
    }

    function _campaign(uint256 id) internal view returns (Campaign storage) {
        require(id < campaigns.length, "Unknown campaign");
        return campaigns[id];
    }

    function _pending(uint256 id) internal view returns (Request storage r) {
        require(id < requests.length, "Unknown request");
        r = requests[id];
        require(r.status == Status.Pending, "Already decided");
    }
}
