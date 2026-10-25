// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IOwnerRegistry {
    function ownerInfo(bytes32 keyId) external view returns (bytes32 x, bytes32 y, uint64 addedAt, uint64 removedAt);
}

// The consortium's memory: who is accredited, which credentials they anchored, which they revoked.
// msg.sender is always a ConsortiumAccount. Members and quorum are fixed at construction.
contract Ledger {
    enum Status {
        NONE,
        PENDING,
        ACTIVE,
        SUSPENDED
    }

    struct Issuer {
        string name;
        Status status;
        uint64 appliedAt;
        uint64 accreditedAt;
        uint8 approvals;
    }

    struct Record {
        uint64 anchoredAt;
        uint64 revokedAt;
        bytes32 keyId;
        uint64 blockNumber;
    }

    struct MemberProposal {
        string name;
        uint8 approvals;
    }

    event IssuerApplied(address indexed issuer, string name);
    event IssuerApproved(address indexed issuer, address indexed member, uint8 approvals);
    event IssuerAccredited(address indexed issuer);
    // DEMO ONLY: written instead of IssuerApproved when the demo admin stands in for the quorum,
    // so an audit can tell a real member vote apart from an administrative shortcut.
    event IssuerDemoAccredited(address indexed issuer, address indexed admin);
    event IssuerSuspended(address indexed issuer);
    event MemberProposed(address indexed account, address indexed member, uint8 approvals);
    event MemberAdded(address indexed account, string name, uint8 quorum);
    event CredentialAnchored(address indexed issuer, bytes32 indexed credentialHash, bytes32 keyId);
    event CredentialRevoked(address indexed issuer, bytes32 indexed credentialHash);

    error BadConsortium();
    error NotMember();
    error NotDemoAdmin();
    error BadName();
    error WrongStatus();
    error AlreadyVoted();
    error NotAnAccount();
    error KeyNotLive();
    error AlreadyExists();
    error NotFound();
    error AlreadyRevoked();

    uint256 private constant MAX_NAME_BYTES = 64;

    address[] private memberAccounts;
    string[] private memberNames;
    mapping(address => bool) private isMember;
    // A strict majority, recomputed whenever the consortium grows. Stored rather than immutable so
    // admitting a member makes every later decision stricter instead of leaving the bar behind.
    uint8 public quorum;
    // DEMO ONLY. One address that may accredit an employer without a member quorum, so a single
    // visitor can walk the whole flow. It is a deliberate hole in the trust model: on a real
    // consortium this should not exist. See demoAccredit().
    address public immutable demoAdmin;

    mapping(address candidate => mapping(address member => bool)) private memberVotes;
    mapping(address candidate => MemberProposal) private memberProposals;

    mapping(address => Issuer) private issuers;
    address[] private issuerAccounts;
    mapping(address issuer => mapping(address member => bool)) private approvedBy;
    mapping(address issuer => mapping(address member => bool)) private suspendedBy;
    mapping(address issuer => uint8) private suspensions;
    mapping(address issuer => mapping(bytes32 credentialHash => Record)) private records;

    constructor(address[] memory accounts, string[] memory names, address demoAdmin_) {
        if (accounts.length == 0 || accounts.length != names.length) revert BadConsortium();
        if (demoAdmin_ == address(0)) revert BadConsortium();
        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i] == address(0) || isMember[accounts[i]]) revert BadConsortium();
            isMember[accounts[i]] = true;
        }
        memberAccounts = accounts;
        memberNames = names;
        quorum = majority(accounts.length);
        demoAdmin = demoAdmin_;
    }

    // No minority can ever decide for the consortium: 3 members need 2, 6 need 4, 7 need 4.
    function majority(uint256 count) private pure returns (uint8) {
        return uint8(count / 2 + 1);
    }

    modifier onlyMember() {
        if (!isMember[msg.sender]) revert NotMember();
        _;
    }

    // consortium

    function applyForAccreditation(string calldata name) external {
        uint256 length = bytes(name).length;
        if (length == 0 || length > MAX_NAME_BYTES) revert BadName();
        Issuer storage issuer = issuers[msg.sender];
        if (issuer.status != Status.NONE) revert WrongStatus();
        issuer.name = name;
        issuer.status = Status.PENDING;
        issuer.appliedAt = uint64(block.timestamp);
        issuerAccounts.push(msg.sender);
        emit IssuerApplied(msg.sender, name);
    }

    // A member joins only with a majority of the CURRENT consortium. The candidate never votes on
    // its own admission, and quorum is recomputed afterwards, so growing the roster can only make
    // future decisions harder. Employers are never part of this count: they are the subject of an
    // accreditation, not a voter, and letting them in would let a flood of fake issuers accredit
    // itself.
    function addMember(address account, string calldata name) external onlyMember {
        if (account == address(0) || isMember[account]) revert BadConsortium();
        if (memberVotes[account][msg.sender]) revert AlreadyVoted();

        MemberProposal storage proposal = memberProposals[account];
        if (proposal.approvals == 0) {
            uint256 length = bytes(name).length;
            if (length == 0 || length > MAX_NAME_BYTES) revert BadName();
            proposal.name = name;
        }

        memberVotes[account][msg.sender] = true;
        uint8 votes = ++proposal.approvals;
        emit MemberProposed(account, msg.sender, votes);

        if (votes >= quorum) {
            isMember[account] = true;
            memberAccounts.push(account);
            memberNames.push(proposal.name);
            quorum = majority(memberAccounts.length);
            emit MemberAdded(account, proposal.name, quorum);
        }
    }

    function approve(address account) external onlyMember {
        Issuer storage issuer = issuers[account];
        if (issuer.status != Status.PENDING) revert WrongStatus();
        if (approvedBy[account][msg.sender]) revert AlreadyVoted();
        approvedBy[account][msg.sender] = true;
        issuer.approvals++;
        emit IssuerApproved(account, msg.sender, issuer.approvals);
        if (issuer.approvals >= quorum) {
            issuer.status = Status.ACTIVE;
            issuer.accreditedAt = uint64(block.timestamp);
            emit IssuerAccredited(account);
        }
    }

    // DEMO ONLY. The admin accredits directly, standing in for the quorum so one visitor can finish
    // the flow alone. It does not fabricate member votes: approvedBy stays untouched, no
    // IssuerApproved or IssuerAccredited is emitted, and IssuerDemoAccredited names the admin
    // instead. approvals is set to quorum only so the public counters agree with the status.
    // Remove this function, the demoAdmin field and the constructor argument before any release
    // whose consortium is real.
    function demoAccredit(address account) external {
        if (msg.sender != demoAdmin) revert NotDemoAdmin();
        Issuer storage issuer = issuers[account];
        if (issuer.status != Status.PENDING) revert WrongStatus();
        issuer.approvals = quorum;
        issuer.status = Status.ACTIVE;
        issuer.accreditedAt = uint64(block.timestamp);
        emit IssuerDemoAccredited(account, msg.sender);
    }

    function suspend(address account) external onlyMember {
        Issuer storage issuer = issuers[account];
        if (issuer.status != Status.ACTIVE) revert WrongStatus();
        if (suspendedBy[account][msg.sender]) revert AlreadyVoted();
        suspendedBy[account][msg.sender] = true;
        suspensions[account]++;
        if (suspensions[account] >= quorum) {
            issuer.status = Status.SUSPENDED;
            emit IssuerSuspended(account);
        }
    }

    // credentials

    function anchor(bytes32 credentialHash, bytes32 keyId) external {
        if (issuers[msg.sender].status != Status.ACTIVE) revert WrongStatus();
        (, , uint64 addedAt, uint64 removedAt) = _ownerInfo(msg.sender, keyId);
        if (addedAt == 0 || removedAt != 0) revert KeyNotLive();
        Record storage record = records[msg.sender][credentialHash];
        if (record.anchoredAt != 0) revert AlreadyExists();
        records[msg.sender][credentialHash] = Record(uint64(block.timestamp), 0, keyId, uint64(block.number));
        emit CredentialAnchored(msg.sender, credentialHash, keyId);
    }

    // records[msg.sender] makes "only the issuer that anchored it" structural.
    function revoke(bytes32 credentialHash) external {
        Record storage record = records[msg.sender][credentialHash];
        if (record.anchoredAt == 0) revert NotFound();
        if (record.revokedAt != 0) revert AlreadyRevoked();
        record.revokedAt = uint64(block.timestamp);
        emit CredentialRevoked(msg.sender, credentialHash);
    }

    // views

    function members() external view returns (address[] memory, string[] memory names) {
        return (memberAccounts, memberNames);
    }

    function issuerOf(address account) external view returns (Issuer memory) {
        return issuers[account];
    }

    function issuerList() external view returns (address[] memory) {
        return issuerAccounts;
    }

    function recordOf(address account, bytes32 credentialHash) external view returns (Record memory) {
        return records[account][credentialHash];
    }

    // A caller that is not an account (an EOA, or a contract without ownerInfo) cannot anchor.
    function _ownerInfo(address account, bytes32 keyId) private view returns (bytes32, bytes32, uint64, uint64) {
        if (account.code.length == 0) revert NotAnAccount();
        try IOwnerRegistry(account).ownerInfo(keyId) returns (bytes32 x, bytes32 y, uint64 addedAt, uint64 removedAt) {
            return (x, y, addedAt, removedAt);
        } catch {
            revert NotAnAccount();
        }
    }
}
