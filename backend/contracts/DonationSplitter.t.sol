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
        splitter.donateETH{value: 1 ether}("test://uri");
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



    function testWithdrawnEthAndTotals() public {
        vm.deal(address(this), 1 ether);
        splitter.donateETH{value: 1 ether}("test://uri");
        // Antes de retirar
        (uint256 pendingA, uint256 withdrawnA, uint256 lifetimeA) = splitter.beneficiaryTotals(alice);
        assertEq(pendingA, 0.6 ether);
        assertEq(withdrawnA, 0);
        assertEq(lifetimeA, 0.6 ether);
        // Retira Alice
        vm.prank(alice);
        splitter.withdrawETH();
        // pending=0, withdrawn=0.6, lifetime=0.6
        (pendingA, withdrawnA, lifetimeA) = splitter.beneficiaryTotals(alice);
        assertEq(pendingA, 0);
        assertEq(withdrawnA, 0.6 ether);
        assertEq(lifetimeA, 0.6 ether);
    }

    function testWithdrawEvent() public {
        vm.deal(address(this), 1 ether);
        splitter.donateETH{value: 1 ether}("test://uri");
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit DonationSplitter.Withdrawn(alice, 0.6 ether);
        splitter.withdrawETH();
    }

    function testRoundingResidualGoesToLast() public {
        // Configurar 3 beneficiarios con proporciones que generen residuo al dividir
        DonationSplitter.Beneficiary[] memory arr = new DonationSplitter.Beneficiary[](3);
        arr[0] = DonationSplitter.Beneficiary(alice, 3333); // 33.33%
        arr[1] = DonationSplitter.Beneficiary(bob, 3333);   // 33.33%
        address carol = address(0x4);
        arr[2] = DonationSplitter.Beneficiary(carol, 3334); // 33.34% (suma = 10000)
        vm.prank(owner);
        splitter.setBeneficiaries(arr);
        vm.deal(address(this), 1 wei * 1000); // 1000 wei para evidenciar residuo
        splitter.donateETH{value: 1000}("test://uri");
        // Calculos teóricos:
        // share0 = floor(1000 * 3333 / 10000) = 333
        // share1 = floor(1000 * 3333 / 10000) = 333
        // share2 = restante = 334 (debe absorber residuo)
        assertEq(splitter.pendingEth(alice), 333);
        assertEq(splitter.pendingEth(bob), 333);
        assertEq(splitter.pendingEth(carol), 334);
    }
}
