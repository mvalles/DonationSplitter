// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title DonationSplitter - Trazabilidad de donaciones en ETH con reparto transparente
/// @notice Acepta ETH y reparte por porcentajes (BPS) entre beneficiarios.
///         Los fondos quedan "pendientes" y cada beneficiario los retira (pull pattern) para mayor seguridad.
contract DonationSplitter {
    struct Beneficiary {
        address account;
        uint16 bps; // basis points: 10000 = 100%
    }

    address public owner;
    Beneficiary[] private _beneficiaries;

    // ETH pendiente por beneficiario
    mapping(address => uint256) public pendingEth;

    event DonationRecorded(address indexed donor, uint256 amount, uint256 timestamp);
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

    // --- Donaciones ---

    /// @notice Donar ETH (reparte en pendientes por BPS).
    function donateETH() public payable {
        require(msg.value > 0, "No ETH sent");
        _splitEth(msg.value);
        emit DonationRecorded(msg.sender, msg.value, block.timestamp);
    }

    // --- Retiros ---

    function withdrawETH() external {
        uint256 amount = pendingEth[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        pendingEth[msg.sender] = 0; // effects
        (bool ok, ) = payable(msg.sender).call{value: amount}(""); // interaction
        require(ok, "ETH transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // --- Gestión de beneficiarios ---

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

    // --- Internos ---

    function _splitEth(uint256 amount) internal {
        require(_beneficiaries.length > 0, "No beneficiaries");
        uint256 totalBps = _totalBps();
        uint256 remaining = amount;

        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            Beneficiary memory b = _beneficiaries[i];
            uint256 share = (amount * b.bps) / totalBps;
            if (i == _beneficiaries.length - 1) {
                share = remaining; // agrega residuo al último
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

    // recibir ETH directo (cuenta como donación)
    receive() external payable {
        donateETH();
    }
}
