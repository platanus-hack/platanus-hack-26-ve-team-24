// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ledger} from "../Ledger.sol";
import {ConsortiumAccount} from "../ConsortiumAccount.sol";

contract LedgerTest is Test {
    Ledger private ledger;
    address private constant DEMO_ADMIN = address(0xD3A0);
    address[] private memberList;
    ConsortiumAccount private employer;
    bytes32 private employerKey;
    bytes32 private secondKey;

    function setUp() public {
        vm.warp(1_000_000);
        string[] memory names = new string[](4);
        for (uint256 i = 0; i < 4; i++) {
            memberList.push(address(uint160(0x100 + i)));
            names[i] = "Member";
        }
        ledger = new Ledger(memberList, names, 2, DEMO_ADMIN);
        (employer, employerKey) = _account(0xA1);
        secondKey = _addSecondKey(employer, 0xA2);
    }

    function _account(uint256 seed) private returns (ConsortiumAccount account, bytes32 keyId) {
        (uint256 x, uint256 y) = vm.publicKeyP256(seed);
        account = new ConsortiumAccount(bytes32(x), bytes32(y));
        keyId = keccak256(abi.encodePacked(bytes32(x), bytes32(y)));
    }

    function _addSecondKey(ConsortiumAccount account, uint256 seed) private returns (bytes32) {
        (uint256 x, uint256 y) = vm.publicKeyP256(seed);
        vm.prank(address(account));
        account.addOwner(bytes32(x), bytes32(y));
        return keccak256(abi.encodePacked(bytes32(x), bytes32(y)));
    }

    function _accredit(address issuer) private {
        vm.prank(address(employer));
        ledger.applyForAccreditation("Orinoco Logistics (demo)");
        vm.prank(memberList[0]);
        ledger.approve(issuer);
        vm.prank(memberList[1]);
        ledger.approve(issuer);
    }

    function test_quorumAccreditsAnIssuer() public {
        vm.prank(address(employer));
        ledger.applyForAccreditation("Orinoco Logistics (demo)");
        assertEq(uint8(ledger.issuerOf(address(employer)).status), uint8(Ledger.Status.PENDING));

        vm.prank(memberList[0]);
        ledger.approve(address(employer));
        Ledger.Issuer memory issuer = ledger.issuerOf(address(employer));
        assertEq(uint8(issuer.status), uint8(Ledger.Status.PENDING));
        assertEq(issuer.approvals, 1);

        vm.warp(1_000_500);
        vm.prank(memberList[1]);
        ledger.approve(address(employer));
        issuer = ledger.issuerOf(address(employer));
        assertEq(uint8(issuer.status), uint8(Ledger.Status.ACTIVE));
        assertEq(issuer.accreditedAt, 1_000_500);
        assertEq(issuer.appliedAt, 1_000_000);
    }

    function test_oneVotePerMember() public {
        vm.prank(address(employer));
        ledger.applyForAccreditation("Orinoco Logistics (demo)");
        vm.startPrank(memberList[0]);
        ledger.approve(address(employer));
        vm.expectRevert(Ledger.AlreadyVoted.selector);
        ledger.approve(address(employer));
        vm.stopPrank();
        assertEq(ledger.issuerOf(address(employer)).approvals, 1);
    }

    function test_onlyMembersVoteAndOnlyPendingIssuersAreApproved() public {
        vm.prank(address(employer));
        ledger.applyForAccreditation("Orinoco Logistics (demo)");
        vm.expectRevert(Ledger.NotMember.selector);
        ledger.approve(address(employer));
        vm.prank(memberList[0]);
        vm.expectRevert(Ledger.WrongStatus.selector);
        ledger.approve(address(0xDEAD));
    }

    // DEMO ONLY: the admin stands in for the quorum, and the event says so.
    function test_demoAdminAccreditsA_PENDING_issuerAlone() public {
        vm.prank(address(employer));
        ledger.applyForAccreditation("Orinoco Logistics (demo)");
        vm.prank(DEMO_ADMIN);
        ledger.demoAccredit(address(employer));
        Ledger.Issuer memory issuer = ledger.issuerOf(address(employer));
        assertEq(uint8(issuer.status), uint8(Ledger.Status.ACTIVE));
        assertEq(issuer.approvals, 2);
    }

    function test_onlyTheDemoAdminCanUseTheShortcut() public {
        vm.prank(address(employer));
        ledger.applyForAccreditation("Orinoco Logistics (demo)");
        vm.prank(memberList[0]);
        vm.expectRevert(Ledger.NotDemoAdmin.selector);
        ledger.demoAccredit(address(employer));
    }

    function test_theShortcutNeedsAPendingIssuer() public {
        vm.prank(DEMO_ADMIN);
        vm.expectRevert(Ledger.WrongStatus.selector);
        ledger.demoAccredit(address(employer));
    }

    function test_applyingTwiceOrWithABadNameReverts() public {
        vm.startPrank(address(employer));
        vm.expectRevert(Ledger.BadName.selector);
        ledger.applyForAccreditation("");
        ledger.applyForAccreditation("Orinoco Logistics (demo)");
        vm.expectRevert(Ledger.WrongStatus.selector);
        ledger.applyForAccreditation("Orinoco Logistics (demo)");
        vm.stopPrank();
    }

    function test_pendingIssuerCannotAnchor() public {
        vm.prank(address(employer));
        ledger.applyForAccreditation("Orinoco Logistics (demo)");
        vm.prank(address(employer));
        vm.expectRevert(Ledger.WrongStatus.selector);
        ledger.anchor(keccak256("cert"), employerKey);
    }

    function test_activeIssuerAnchorsWithALiveKey() public {
        _accredit(address(employer));
        vm.warp(1_001_000);
        vm.roll(777);
        vm.prank(address(employer));
        ledger.anchor(keccak256("cert"), employerKey);
        Ledger.Record memory record = ledger.recordOf(address(employer), keccak256("cert"));
        assertEq(record.anchoredAt, 1_001_000);
        assertEq(record.revokedAt, 0);
        assertEq(record.keyId, employerKey);
        assertEq(record.blockNumber, 777);
    }

    function test_anchorWithUnknownOrRemovedKeyReverts() public {
        _accredit(address(employer));
        vm.prank(address(employer));
        vm.expectRevert(Ledger.KeyNotLive.selector);
        ledger.anchor(keccak256("cert"), bytes32(uint256(1)));

        vm.prank(address(employer));
        employer.removeOwner(secondKey);
        vm.prank(address(employer));
        vm.expectRevert(Ledger.KeyNotLive.selector);
        ledger.anchor(keccak256("cert"), secondKey);
    }

    function test_nonAccountCallerReverts() public {
        address eoa = address(0xE0A);
        vm.prank(address(employer));
        ledger.applyForAccreditation("Orinoco Logistics (demo)");
        vm.prank(eoa);
        ledger.applyForAccreditation("EOA");
        vm.prank(memberList[0]);
        ledger.approve(eoa);
        vm.prank(memberList[1]);
        ledger.approve(eoa);
        vm.prank(eoa);
        vm.expectRevert(Ledger.NotAnAccount.selector);
        ledger.anchor(keccak256("cert"), employerKey);
    }

    function test_duplicateAnchorReverts() public {
        _accredit(address(employer));
        vm.startPrank(address(employer));
        ledger.anchor(keccak256("cert"), employerKey);
        vm.expectRevert(Ledger.AlreadyExists.selector);
        ledger.anchor(keccak256("cert"), employerKey);
        vm.stopPrank();
    }

    function test_revokeOnlyByTheAnchoringIssuerAndOnlyOnce() public {
        _accredit(address(employer));
        vm.prank(address(employer));
        ledger.anchor(keccak256("cert"), employerKey);

        vm.prank(address(0xBEEF));
        vm.expectRevert(Ledger.NotFound.selector);
        ledger.revoke(keccak256("cert"));

        vm.warp(1_002_000);
        vm.startPrank(address(employer));
        ledger.revoke(keccak256("cert"));
        assertEq(ledger.recordOf(address(employer), keccak256("cert")).revokedAt, 1_002_000);
        vm.expectRevert(Ledger.AlreadyRevoked.selector);
        ledger.revoke(keccak256("cert"));
        vm.stopPrank();
    }

    function test_suspendFlipsAtQuorumAndKeepsRecordsReadable() public {
        _accredit(address(employer));
        vm.prank(address(employer));
        ledger.anchor(keccak256("cert"), employerKey);

        vm.prank(memberList[2]);
        ledger.suspend(address(employer));
        assertEq(uint8(ledger.issuerOf(address(employer)).status), uint8(Ledger.Status.ACTIVE));
        vm.prank(memberList[2]);
        vm.expectRevert(Ledger.AlreadyVoted.selector);
        ledger.suspend(address(employer));
        vm.prank(memberList[3]);
        ledger.suspend(address(employer));

        assertEq(uint8(ledger.issuerOf(address(employer)).status), uint8(Ledger.Status.SUSPENDED));
        assertEq(ledger.recordOf(address(employer), keccak256("cert")).anchoredAt, 1_000_000);
        vm.prank(address(employer));
        vm.expectRevert(Ledger.WrongStatus.selector);
        ledger.anchor(keccak256("other"), employerKey);
    }

    function test_membersAndIssuerListViews() public {
        (address[] memory accounts, string[] memory names) = ledger.members();
        assertEq(accounts.length, 4);
        assertEq(names.length, 4);
        assertEq(ledger.quorum(), 2);
        assertEq(ledger.issuerList().length, 0);
        _accredit(address(employer));
        address[] memory list = ledger.issuerList();
        assertEq(list.length, 1);
        assertEq(list[0], address(employer));
    }

    function test_constructorRejectsBadConsortiums() public {
        string[] memory names = new string[](1);
        address[] memory accounts = new address[](1);
        accounts[0] = address(1);
        vm.expectRevert(Ledger.BadConsortium.selector);
        new Ledger(accounts, names, 2, DEMO_ADMIN);
        vm.expectRevert(Ledger.BadConsortium.selector);
        new Ledger(accounts, names, 0, DEMO_ADMIN);
        vm.expectRevert(Ledger.BadConsortium.selector);
        new Ledger(accounts, new string[](2), 1, DEMO_ADMIN);
        vm.expectRevert(Ledger.BadConsortium.selector);
        new Ledger(accounts, names, 1, address(0));
    }
}
