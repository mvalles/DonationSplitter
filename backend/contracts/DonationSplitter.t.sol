// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./DonationSplitter.sol";
import "forge-std/Test.sol";

contract DonationSplitterTest is Test {
    DonationSplitter splitter;
    address owner = address(0x1);
    address alice = address(0x2);
    address bob = address(0x3);

    function setUp() public {
        DonationSplitter.Beneficiary[] memory beneficiaries = new DonationSplitter.Beneficiary[](2);
        beneficiaries[0] = DonationSplitter.Beneficiary(alice, 6000); // 60%
        beneficiaries[1] = DonationSplitter.Beneficiary(bob, 4000);  // 40%
        vm.prank(owner);
        splitter = new DonationSplitter(beneficiaries);
    }

    function testDonateAndWithdraw() public {
        // Donar 1 ether
        vm.deal(address(this), 1 ether);
        splitter.donateETH{value: 1 ether}();
        // Alice y Bob tienen pendientes
        assertEq(splitter.pendingEth(alice), 0.6 ether);
        assertEq(splitter.pendingEth(bob), 0.4 ether);
        // Alice retira
        vm.prank(alice);
        splitter.withdrawETH();
        assertEq(splitter.pendingEth(alice), 0);
        // Bob retira
        vm.prank(bob);
        splitter.withdrawETH();
        assertEq(splitter.pendingEth(bob), 0);
    }

    function testSetBeneficiariesOnlyOwner() public {
        DonationSplitter.Beneficiary[] memory newBens = new DonationSplitter.Beneficiary[](1);
        newBens[0] = DonationSplitter.Beneficiary(alice, 10000);
        // No owner: debe fallar
        vm.expectRevert();
        splitter.setBeneficiaries(newBens);
        // Owner: debe funcionar
        vm.prank(owner);
        splitter.setBeneficiaries(newBens);
    }

    function testWithdrawNothing() public {
        vm.prank(alice);
        vm.expectRevert();
        splitter.withdrawETH();
    }

    function testReceiveFallback() public {
        vm.deal(address(this), 2 ether);
        (bool ok, ) = address(splitter).call{value: 2 ether}("");
        require(ok, "send failed");
        assertEq(splitter.pendingEth(alice), 1.2 ether);
        assertEq(splitter.pendingEth(bob), 0.8 ether);
    }
}
