// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PredictionMarket
 * @notice A simple parimutuel prediction market for hackathon demos.
 *         Uses internal play-money balances (no real token transfers).
 *         Teams are created dynamically by attendees (createTeam/joinTeam).
 *         Bets are add-only (no withdrawals). You cannot bet on your own team.
 *         After resolution, winners claim proportional payouts.
 */
contract PredictionMarket {
    // ── State ──────────────────────────────────────────────────────────

    address public organizer;
    string[] public teamNames;
    uint256 public teamCount;
    bool public resolved;
    uint256 public winningTeamId;
    uint256 public totalPool;

    // address => free (unstaked) play-money balance
    mapping(address => uint256) public balances;

    // teamId => total staked on that team
    mapping(uint256 => uint256) public teamPools;

    // address => teamId => amount staked by that address on that team
    mapping(address => mapping(uint256 => uint256)) public userBets;

    // address => whether they've already claimed their payout
    mapping(address => bool) public hasClaimed;

    // address => whether they have joined or created a team
    mapping(address => bool) public hasTeam;

    // address => which team this wallet belongs to
    mapping(address => uint256) public memberOfTeam;

    // ── Events ─────────────────────────────────────────────────────────

    event BalanceCredited(address indexed account, uint256 amount);
    event BetPlaced(address indexed bettor, uint256 indexed teamId, uint256 amount);
    event MarketResolved(uint256 indexed winningTeamId);
    event PayoutClaimed(address indexed claimant, uint256 amount);
    event TeamCreated(uint256 indexed teamId, string name, address indexed creator);
    event TeamJoined(uint256 indexed teamId, address indexed member);
    event CardAwarded(address indexed wallet, uint256 cardId);

    // ── Collectible Cards State ────────────────────────────────────────

    // wallet => cardId => owns flag
    mapping(address => mapping(uint256 => bool)) public ownsCard;
    // wallet => total posts published
    mapping(address => uint256) public postCount;

    uint256 public constant JOIN_CARD = 0;
    uint256 public constant THREE_POSTS_CARD = 1;

    // ── Constructor ────────────────────────────────────────────────────

    constructor() {
        organizer = msg.sender;
    }

    // ── Modifiers ──────────────────────────────────────────────────────

    modifier onlyOrganizer() {
        require(msg.sender == organizer, "not organizer");
        _;
    }

    modifier marketOpen() {
        require(!resolved, "market already resolved");
        _;
    }

    modifier marketResolved() {
        require(resolved, "market not resolved yet");
        _;
    }

    // ── Team Functions ─────────────────────────────────────────────────

    /**
     * @notice Create a new team and become its first member.
     * @param name The team name.
     * @return teamId The new team's ID (0-based).
     */
    function createTeam(string memory name) external marketOpen returns (uint256 teamId) {
        require(!hasTeam[msg.sender], "already in a team");
        require(bytes(name).length > 0, "team name cannot be empty");

        teamId = teamCount;
        teamNames.push(name);
        teamCount++;
        hasTeam[msg.sender] = true;
        memberOfTeam[msg.sender] = teamId;

        emit TeamCreated(teamId, name, msg.sender);
        emit TeamJoined(teamId, msg.sender);
    }

    /**
     * @notice Join an existing team.
     * @param teamId The team to join (0-based).
     */
    function joinTeam(uint256 teamId) external marketOpen {
        require(!hasTeam[msg.sender], "already in a team");
        require(teamId < teamCount, "invalid team id");

        hasTeam[msg.sender] = true;
        memberOfTeam[msg.sender] = teamId;

        emit TeamJoined(teamId, msg.sender);
    }

    // ── Admin Functions ────────────────────────────────────────────────

    /**
     * @notice Credit play-money balance to an address. Organizer-only.
     * @param account The address to credit.
     * @param amount  The amount of play-money tokens to add.
     */
    function creditBalance(address account, uint256 amount) external onlyOrganizer {
        require(amount > 0, "amount must be > 0");
        balances[account] += amount;
        emit BalanceCredited(account, amount);
    }

    /**
     * @notice Resolve the market by declaring a winning team. Organizer-only, one-shot.
     * @param _winningTeamId The index of the winning team (0-based).
     */
    function resolve(uint256 _winningTeamId) external onlyOrganizer marketOpen {
        require(_winningTeamId < teamCount, "invalid team id");
        resolved = true;
        winningTeamId = _winningTeamId;
        emit MarketResolved(_winningTeamId);
    }

    /**
     * @notice Award the JOIN_CARD for scanning the venue QR code.
     */
    function awardJoinCard(address wallet) external onlyOrganizer {
        if (!ownsCard[wallet][JOIN_CARD]) {
            ownsCard[wallet][JOIN_CARD] = true;
            emit CardAwarded(wallet, JOIN_CARD);
        }
    }

    /**
     * @notice Record a published post. Automatically award THREE_POSTS_CARD on the 3rd post.
     */
    function recordPost(address wallet) external onlyOrganizer {
        postCount[wallet]++;
        if (postCount[wallet] == 3) {
            ownsCard[wallet][THREE_POSTS_CARD] = true;
            emit CardAwarded(wallet, THREE_POSTS_CARD);
        }
    }

    // ── Bettor Functions ───────────────────────────────────────────────

    /**
     * @notice Place a bet on a team. Deducts from your free balance.
     *         Can be called multiple times, on any team (except your own), before resolution.
     * @param teamId The team index to bet on (0-based).
     * @param amount The amount to bet from your free balance.
     */
    function placeBet(uint256 teamId, uint256 amount) external marketOpen {
        require(hasTeam[msg.sender], "must join or create a team before betting");
        require(memberOfTeam[msg.sender] != teamId, "cannot bet on your own team");
        require(teamId < teamCount, "invalid team id");
        require(amount > 0, "amount must be > 0");
        require(balances[msg.sender] >= amount, "insufficient balance");

        balances[msg.sender] -= amount;
        teamPools[teamId] += amount;
        userBets[msg.sender][teamId] += amount;
        totalPool += amount;

        emit BetPlaced(msg.sender, teamId, amount);
    }

    /**
     * @notice Claim your payout after the market is resolved.
     *         Payout = (your contribution to winning pool) * totalPool / winningTeamPool.
     *         Credits your free balance (no real token transfer).
     */
    function claimPayout() external marketResolved {
        require(!hasClaimed[msg.sender], "already claimed");

        uint256 userContribution = userBets[msg.sender][winningTeamId];
        require(userContribution > 0, "no winning bet");

        uint256 winningPool = teamPools[winningTeamId];
        // payout = userContribution * totalPool / winningPool
        uint256 payout = (userContribution * totalPool) / winningPool;

        hasClaimed[msg.sender] = true;
        balances[msg.sender] += payout;

        emit PayoutClaimed(msg.sender, payout);
    }

    // ── View Functions ─────────────────────────────────────────────────

    function getTeamCount() external view returns (uint256) {
        return teamCount;
    }

    function getTeamName(uint256 teamId) external view returns (string memory) {
        require(teamId < teamCount, "invalid team id");
        return teamNames[teamId];
    }

    function getTeamPool(uint256 teamId) external view returns (uint256) {
        return teamPools[teamId];
    }

    function getTotalPool() external view returns (uint256) {
        return totalPool;
    }

    function getUserBet(address account, uint256 teamId) external view returns (uint256) {
        return userBets[account][teamId];
    }

    function getBalance(address account) external view returns (uint256) {
        return balances[account];
    }

    /**
     * @notice Get a wallet's team membership.
     * @return _hasTeam Whether the wallet has joined/created a team.
     * @return teamId  The team ID (only meaningful if _hasTeam is true).
     */
    function getTeamMembership(address account) external view returns (bool _hasTeam, uint256 teamId) {
        if (!hasTeam[account]) {
            return (false, 0);
        }
        return (true, memberOfTeam[account]);
    }

    /**
     * @notice Get the full market state in one call (saves RPC round-trips).
     * @return _resolved     Whether the market has been resolved.
     * @return _winningTeamId The winning team's index (only meaningful if resolved).
     * @return _teamCount    Number of teams.
     * @return _totalPool    Total amount staked across all teams.
     */
    function getMarketState()
        external
        view
        returns (
            bool _resolved,
            uint256 _winningTeamId,
            uint256 _teamCount,
            uint256 _totalPool
        )
    {
        return (resolved, winningTeamId, teamCount, totalPool);
    }

    /**
     * @notice Get all team pools in one call (saves N separate RPC calls).
     * @return pools Array of pool sizes, indexed by team ID.
     * @return names Array of team names, indexed by team ID.
     */
    function getAllTeams()
        external
        view
        returns (uint256[] memory pools, string[] memory names)
    {
        uint256 count = teamCount;
        pools = new uint256[](count);
        names = new string[](count);
        for (uint256 i = 0; i < count; i++) {
            pools[i] = teamPools[i];
            names[i] = teamNames[i];
        }
    }

    /**
     * @notice Get owned cards for a wallet.
     */
    function getOwnedCards(address wallet) external view returns (bool[2] memory cards) {
        cards[0] = ownsCard[wallet][JOIN_CARD];
        cards[1] = ownsCard[wallet][THREE_POSTS_CARD];
    }
}
