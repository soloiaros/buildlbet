// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PredictionMarket
 * @notice A simple parimutuel prediction market for hackathon demos.
 *         Uses internal play-money balances (no real token transfers).
 *         Teams are fixed at deploy time. Bets are add-only (no withdrawals).
 *         After resolution, winners claim proportional payouts.
 */
contract PredictionMarket {
    // ── State ──────────────────────────────────────────────────────────

    address public organizer;
    string[] public teamNames;
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

    // ── Events ─────────────────────────────────────────────────────────

    event BalanceCredited(address indexed account, uint256 amount);
    event BetPlaced(address indexed bettor, uint256 indexed teamId, uint256 amount);
    event MarketResolved(uint256 indexed winningTeamId);
    event PayoutClaimed(address indexed claimant, uint256 amount);

    // ── Constructor ────────────────────────────────────────────────────

    /**
     * @param _teamNames Array of team names (e.g. ["Alpha", "Beta", "Gamma"]).
     *                   Must have at least 2 teams.
     */
    constructor(string[] memory _teamNames) {
        require(_teamNames.length >= 2, "need at least 2 teams");
        organizer = msg.sender;
        for (uint256 i = 0; i < _teamNames.length; i++) {
            teamNames.push(_teamNames[i]);
        }
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
        require(_winningTeamId < teamNames.length, "invalid team id");
        resolved = true;
        winningTeamId = _winningTeamId;
        emit MarketResolved(_winningTeamId);
    }

    // ── Bettor Functions ───────────────────────────────────────────────

    /**
     * @notice Place a bet on a team. Deducts from your free balance.
     *         Can be called multiple times, on any team, before resolution.
     * @param teamId The team index to bet on (0-based).
     * @param amount The amount to bet from your free balance.
     */
    function placeBet(uint256 teamId, uint256 amount) external marketOpen {
        require(teamId < teamNames.length, "invalid team id");
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
        return teamNames.length;
    }

    function getTeamName(uint256 teamId) external view returns (string memory) {
        require(teamId < teamNames.length, "invalid team id");
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
        return (resolved, winningTeamId, teamNames.length, totalPool);
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
        uint256 count = teamNames.length;
        pools = new uint256[](count);
        names = new string[](count);
        for (uint256 i = 0; i < count; i++) {
            pools[i] = teamPools[i];
            names[i] = teamNames[i];
        }
    }
}
