// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title DonationSplitter - Transparent ETH donation splitting with traceability
/// @notice Accepts ETH and allocates it across beneficiaries using BPS (basis points) weights.
///         Funds become "pending" and each beneficiary withdraws them (pull pattern) for added security.
contract DonationSplitter {
    struct Beneficiary {
        address account;
        uint16 bps; // basis points: 10000 = 100%
    }

    address public owner;
    Beneficiary[] private _beneficiaries;

    // Pending ETH per beneficiary (not yet withdrawn)
    mapping(address => uint256) public pendingEth;
    // Total historical withdrawn ETH per beneficiary
    mapping(address => uint256) public withdrawnEth;

    event DonationMade(string uri, uint256 amount, uint256 timestamp);
    event BeneficiariesUpdated(uint256 count, uint256 totalBps);
    event Withdrawn(address indexed beneficiary, uint256 amount);

    error NotOwner();
    error InvalidParams();
    error NothingToWithdraw();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(Beneficiary[] memory initialBeneficiaries) {
        owner = msg.sender;
        _setBeneficiaries(initialBeneficiaries);
    }

    // --- Donations ---

    /// @notice Donate ETH (distributes into pending balances according to BPS) with privacy-preserving URI
    function donateETH(string calldata uri) external payable {
        require(msg.value > 0, "No ETH sent");
        _splitEth(msg.value);
        emit DonationMade(uri, msg.value, block.timestamp);
    }

    // --- Withdrawals ---

    function withdrawETH() external {
        uint256 amount = pendingEth[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        pendingEth[msg.sender] = 0; // effects
    withdrawnEth[msg.sender] += amount; // track historical withdrawal
        (bool ok, ) = payable(msg.sender).call{value: amount}(""); // interaction
        require(ok, "ETH transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Returns (pending, withdrawn, lifetime total) for a beneficiary
    function beneficiaryTotals(address account) external view returns (uint256 pending, uint256 withdrawn, uint256 lifetime) {
        pending = pendingEth[account];
        withdrawn = withdrawnEth[account];
        lifetime = pending + withdrawn;
    }

    // --- Beneficiary management ---

    function setBeneficiaries(Beneficiary[] memory newBeneficiaries) external onlyOwner {
        _setBeneficiaries(newBeneficiaries);
    }

    function beneficiariesList() external view returns (address[] memory accounts, uint16[] memory bps) {
        accounts = new address[](_beneficiaries.length);
        bps = new uint16[](_beneficiaries.length);
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            accounts[i] = _beneficiaries[i].account;
            bps[i] = _beneficiaries[i].bps;
        }
    }

    // --- Internals ---

    function _splitEth(uint256 amount) internal {
        require(_beneficiaries.length > 0, "No beneficiaries");
        uint256 totalBps = _totalBps();
        uint256 remaining = amount;

        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            Beneficiary memory b = _beneficiaries[i];
            uint256 share = (amount * b.bps) / totalBps;
            if (i == _beneficiaries.length - 1) {
                share = remaining; // add remainder to the last beneficiary to avoid dust
            }
            pendingEth[b.account] += share;
            remaining -= share;
        }
    }

    function _setBeneficiaries(Beneficiary[] memory arr) internal {
        require(arr.length > 0, "Empty list");
        delete _beneficiaries;

        uint256 total;
        for (uint256 i = 0; i < arr.length; i++) {
            require(arr[i].account != address(0), "Zero addr");
            require(arr[i].bps > 0, "Zero bps");
            _beneficiaries.push(arr[i]);
            total += arr[i].bps;
        }
        require(total == 10_000, "Total BPS must be 10000");
        emit BeneficiariesUpdated(arr.length, total);
    }

    function _totalBps() internal view returns (uint256) {
        uint256 total;
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            total += _beneficiaries[i].bps;
        }
        return total;
    }

    // Receive plain ETH directly is disabled for privacy: must call donate(uri)
    receive() external payable {
        revert("Use donate(uri)");
    }
}
