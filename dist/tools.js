/**
 * MCP Tool Definitions for Baozi Markets
 * V4.0.0 - Full Protocol Coverage + Market Creation + AI Agent Network
 */
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
// Handlers
import { listMarkets, getMarket, getMarketForBetting } from './handlers/markets.js';
import { getQuote } from './handlers/quote.js';
import { getPositionsSummary } from './handlers/positions.js';
import { getClaimablePositions } from './handlers/claims.js';
import { listRaceMarkets, getRaceMarket, getRaceQuote } from './handlers/race-markets.js';
import { getResolutionStatus, getDisputedMarkets, getMarketsAwaitingResolution } from './handlers/resolution.js';
import { isAffiliateCodeAvailable, suggestAffiliateCodes, getAffiliateByCode, getAffiliatesByOwner, getReferralsByAffiliate, getAgentNetworkStats, formatAffiliateLink, getCommissionInfo, } from './handlers/agent-network.js';
import { previewMarketCreation, createLabMarket, createPrivateMarket, createRaceMarket, getAllCreationFees, getAllPlatformFees, getTimingConstraints, generateInviteHash, } from './handlers/market-creation.js';
// Validation
import { validateMarketTiming } from './validation/market-rules.js';
import { validateBet, calculateBetQuote } from './validation/bet-rules.js';
// Transaction Builders
import { fetchAndBuildBetTransaction, simulateBetTransaction } from './builders/bet-transaction.js';
import { buildClaimWinningsTransaction, buildClaimRefundTransaction, buildClaimAffiliateTransaction, buildBatchClaimTransaction, } from './builders/claim-transaction.js';
import { buildRegisterAffiliateTransaction, buildToggleAffiliateTransaction } from './builders/affiliate-transaction.js';
import { fetchAndBuildRaceBetTransaction, buildClaimRaceWinningsTransaction, buildClaimRaceRefundTransaction } from './builders/race-transaction.js';
// Resolution Builders
import { buildProposeResolutionTransaction, buildResolveMarketTransaction, buildFinalizeResolutionTransaction, buildProposeRaceResolutionTransaction, buildResolveRaceTransaction, buildFinalizeRaceResolutionTransaction, } from './builders/resolution-transaction.js';
// Dispute Builders
import { buildFlagDisputeTransaction, buildFlagRaceDisputeTransaction, buildVoteCouncilTransaction, buildVoteCouncilRaceTransaction, } from './builders/dispute-transaction.js';
// Whitelist Builders
import { buildAddToWhitelistTransaction, buildRemoveFromWhitelistTransaction, buildCreateRaceWhitelistTransaction, buildAddToRaceWhitelistTransaction, buildRemoveFromRaceWhitelistTransaction, } from './builders/whitelist-transaction.js';
// Creator Profile Builders
import { buildCreateCreatorProfileTransaction, buildUpdateCreatorProfileTransaction, buildClaimCreatorTransaction, } from './builders/creator-transaction.js';
// Market Management Builders
import { buildCloseMarketTransaction, buildExtendMarketTransaction, buildCloseRaceMarketTransaction, buildExtendRaceMarketTransaction, buildCancelMarketTransaction, buildCancelRaceTransaction, } from './builders/market-management-transaction.js';
// Config
import { RPC_ENDPOINT, PROGRAM_ID, BET_LIMITS, TIMING } from './config.js';
// =============================================================================
// TOOL SCHEMAS - Organized by Category
// =============================================================================
export const TOOLS = [
    // =========================================================================
    // MARKET READ OPERATIONS
    // =========================================================================
    {
        name: 'list_markets',
        description: 'List all Baozi prediction markets (boolean YES/NO) on Solana mainnet. Returns questions, odds, pools, status.',
        inputSchema: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['Active', 'Closed', 'Resolved', 'Cancelled', 'Paused'],
                    description: 'Filter by status. Default: all markets.',
                },
                layer: {
                    type: 'string',
                    enum: ['Official', 'Lab', 'Private'],
                    description: 'Filter by layer type.',
                },
            },
            required: [],
        },
    },
    {
        name: 'get_market',
        description: 'Get detailed information about a specific prediction market by public key.',
        inputSchema: {
            type: 'object',
            properties: {
                publicKey: {
                    type: 'string',
                    description: 'Solana public key of the market account',
                },
            },
            required: ['publicKey'],
        },
    },
    {
        name: 'get_quote',
        description: 'Calculate expected payout for a potential bet. Shows profit, fees, and new odds.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                side: { type: 'string', enum: ['Yes', 'No'], description: 'Side to bet on' },
                amount: { type: 'number', description: `Bet amount in SOL (${BET_LIMITS.MIN_BET_SOL}-${BET_LIMITS.MAX_BET_SOL})` },
            },
            required: ['market', 'side', 'amount'],
        },
    },
    // =========================================================================
    // RACE MARKET OPERATIONS (Multi-Outcome)
    // =========================================================================
    {
        name: 'list_race_markets',
        description: 'List all race markets (multi-outcome prediction markets) on Solana mainnet.',
        inputSchema: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['Active', 'Closed', 'Resolved', 'Cancelled'],
                    description: 'Filter by status',
                },
            },
            required: [],
        },
    },
    {
        name: 'get_race_market',
        description: 'Get detailed info about a race market including all outcome labels, pools, and odds.',
        inputSchema: {
            type: 'object',
            properties: {
                publicKey: { type: 'string', description: 'Race market public key' },
            },
            required: ['publicKey'],
        },
    },
    {
        name: 'get_race_quote',
        description: 'Calculate expected payout for a race market bet on a specific outcome.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Race market public key' },
                outcomeIndex: { type: 'number', description: 'Index of outcome to bet on (0-based)' },
                amount: { type: 'number', description: 'Bet amount in SOL' },
            },
            required: ['market', 'outcomeIndex', 'amount'],
        },
    },
    // =========================================================================
    // MARKET CREATION
    // =========================================================================
    {
        name: 'preview_create_market',
        description: 'Preview market creation - validates params and shows costs WITHOUT building transaction. Use before build_create_market_transaction.',
        inputSchema: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'Market question (max 200 chars)' },
                layer: { type: 'string', enum: ['lab', 'private'], description: 'Market layer (lab=community, private=invite-only)' },
                closing_time: { type: 'string', description: 'ISO 8601 when betting closes' },
                resolution_time: { type: 'string', description: 'ISO 8601 when market can be resolved (optional, auto-calculated)' },
                market_type: { type: 'string', enum: ['event', 'measurement'], description: 'Event-based (Rule A) or measurement-period (Rule B)' },
                event_time: { type: 'string', description: 'ISO 8601 event time (required for event-based markets)' },
                measurement_start: { type: 'string', description: 'ISO 8601 measurement start (for measurement markets)' },
                measurement_end: { type: 'string', description: 'ISO 8601 measurement end (optional)' },
            },
            required: ['question', 'layer', 'closing_time'],
        },
    },
    {
        name: 'build_create_lab_market_transaction',
        description: 'Build unsigned transaction to create a Lab (community) market. Validates against v6.2 rules.',
        inputSchema: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'Market question (max 200 chars)' },
                closing_time: { type: 'string', description: 'ISO 8601 when betting closes' },
                resolution_time: { type: 'string', description: 'ISO 8601 when market can be resolved (optional)' },
                market_type: { type: 'string', enum: ['event', 'measurement'], description: 'Market type for validation' },
                event_time: { type: 'string', description: 'ISO 8601 event time (for event-based)' },
                measurement_start: { type: 'string', description: 'ISO 8601 measurement start (for measurement)' },
                creator_wallet: { type: 'string', description: 'Creator wallet public key' },
                invite_hash: { type: 'string', description: 'Optional 64-char hex for invite links' },
            },
            required: ['question', 'closing_time', 'creator_wallet'],
        },
    },
    {
        name: 'build_create_private_market_transaction',
        description: 'Build unsigned transaction to create a Private (invite-only) market.',
        inputSchema: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'Market question' },
                closing_time: { type: 'string', description: 'ISO 8601 closing time' },
                resolution_time: { type: 'string', description: 'ISO 8601 resolution time (optional)' },
                creator_wallet: { type: 'string', description: 'Creator wallet' },
                invite_hash: { type: 'string', description: 'Optional invite hash for restricted access' },
            },
            required: ['question', 'closing_time', 'creator_wallet'],
        },
    },
    {
        name: 'build_create_race_market_transaction',
        description: 'Build unsigned transaction to create a Race (multi-outcome) market with 2-10 outcomes.',
        inputSchema: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'Market question' },
                outcomes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of 2-10 outcome labels',
                },
                closing_time: { type: 'string', description: 'ISO 8601 closing time' },
                resolution_time: { type: 'string', description: 'ISO 8601 resolution time (optional)' },
                creator_wallet: { type: 'string', description: 'Creator wallet' },
            },
            required: ['question', 'outcomes', 'closing_time', 'creator_wallet'],
        },
    },
    {
        name: 'get_creation_fees',
        description: 'Get market creation fees for all layers (Official, Lab, Private).',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'get_platform_fees',
        description: 'Get platform fee rates for all layers.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'get_timing_rules',
        description: 'Get v6.2 timing rules and constraints for market creation.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'generate_invite_hash',
        description: 'Generate a random invite hash for private market access control.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    // =========================================================================
    // POSITION & CLAIMS
    // =========================================================================
    {
        name: 'get_positions',
        description: 'Get all betting positions for a wallet including win/loss stats.',
        inputSchema: {
            type: 'object',
            properties: {
                wallet: { type: 'string', description: 'Solana wallet address' },
            },
            required: ['wallet'],
        },
    },
    {
        name: 'get_claimable',
        description: 'Get all claimable winnings and refunds for a wallet.',
        inputSchema: {
            type: 'object',
            properties: {
                wallet: { type: 'string', description: 'Solana wallet address' },
            },
            required: ['wallet'],
        },
    },
    // =========================================================================
    // RESOLUTION & DISPUTES
    // =========================================================================
    {
        name: 'get_resolution_status',
        description: 'Get resolution status for a market (resolved, disputed, pending).',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
            },
            required: ['market'],
        },
    },
    {
        name: 'get_disputed_markets',
        description: 'List all markets currently under dispute.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'get_markets_awaiting_resolution',
        description: 'List all closed markets awaiting resolution.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    // =========================================================================
    // AI AGENT AFFILIATE NETWORK
    // =========================================================================
    {
        name: 'check_affiliate_code',
        description: 'Check if an affiliate code is available for registration.',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Affiliate code to check (3-16 alphanumeric chars)' },
            },
            required: ['code'],
        },
    },
    {
        name: 'suggest_affiliate_codes',
        description: 'Generate suggested affiliate codes based on agent name.',
        inputSchema: {
            type: 'object',
            properties: {
                agentName: { type: 'string', description: 'Name of the AI agent' },
                count: { type: 'number', description: 'Number of suggestions (default 5)' },
            },
            required: ['agentName'],
        },
    },
    {
        name: 'get_affiliate_info',
        description: 'Get affiliate account info by code. Shows earnings, referrals, status.',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Affiliate code' },
            },
            required: ['code'],
        },
    },
    {
        name: 'get_my_affiliates',
        description: 'Get all affiliate accounts owned by a wallet.',
        inputSchema: {
            type: 'object',
            properties: {
                wallet: { type: 'string', description: 'Wallet address' },
            },
            required: ['wallet'],
        },
    },
    {
        name: 'get_referrals',
        description: 'Get all users referred by an affiliate code.',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Affiliate code' },
            },
            required: ['code'],
        },
    },
    {
        name: 'get_agent_network_stats',
        description: 'Get overall AI agent affiliate network statistics.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'format_affiliate_link',
        description: 'Format an affiliate referral link for sharing.',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Affiliate code' },
                market: { type: 'string', description: 'Optional market public key for deep link' },
            },
            required: ['code'],
        },
    },
    {
        name: 'get_commission_info',
        description: 'Get affiliate commission structure and examples.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    // =========================================================================
    // VALIDATION
    // =========================================================================
    {
        name: 'validate_market_params',
        description: 'Validate market parameters against v6.2 timing rules.',
        inputSchema: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'Market question (max 200 chars)' },
                closing_time: { type: 'string', description: 'ISO 8601 closing time' },
                market_type: { type: 'string', enum: ['event', 'measurement'], description: 'Market type' },
                event_time: { type: 'string', description: 'ISO 8601 event time (for event markets)' },
                measurement_start: { type: 'string', description: 'ISO 8601 measurement start (for measurement markets)' },
                measurement_end: { type: 'string', description: 'ISO 8601 measurement end (optional)' },
            },
            required: ['question', 'closing_time', 'market_type'],
        },
    },
    {
        name: 'validate_bet',
        description: 'Validate bet parameters before building transaction.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                amount: { type: 'number', description: 'Bet amount in SOL' },
                side: { type: 'string', enum: ['Yes', 'No'], description: 'Side to bet on' },
            },
            required: ['market', 'amount', 'side'],
        },
    },
    // =========================================================================
    // TRANSACTION BUILDING - BETS
    // =========================================================================
    {
        name: 'build_bet_transaction',
        description: 'Build unsigned transaction for placing a bet on a boolean (YES/NO) market.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                outcome: { type: 'string', enum: ['yes', 'no'], description: 'Outcome to bet on' },
                amount_sol: { type: 'number', description: 'Bet amount in SOL' },
                user_wallet: { type: 'string', description: 'User wallet public key' },
                affiliate_code: { type: 'string', description: 'Optional affiliate code for commission' },
            },
            required: ['market', 'outcome', 'amount_sol', 'user_wallet'],
        },
    },
    {
        name: 'build_race_bet_transaction',
        description: 'Build unsigned transaction for placing a bet on a race (multi-outcome) market.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Race market public key' },
                outcome_index: { type: 'number', description: 'Index of outcome to bet on' },
                amount_sol: { type: 'number', description: 'Bet amount in SOL' },
                user_wallet: { type: 'string', description: 'User wallet public key' },
                affiliate_code: { type: 'string', description: 'Optional affiliate code' },
            },
            required: ['market', 'outcome_index', 'amount_sol', 'user_wallet'],
        },
    },
    // =========================================================================
    // TRANSACTION BUILDING - CLAIMS
    // =========================================================================
    {
        name: 'build_claim_winnings_transaction',
        description: 'Build unsigned transaction to claim winnings from a resolved market.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                position: { type: 'string', description: 'Position PDA' },
                user_wallet: { type: 'string', description: 'User wallet' },
            },
            required: ['market', 'position', 'user_wallet'],
        },
    },
    {
        name: 'build_claim_refund_transaction',
        description: 'Build unsigned transaction to claim refund from cancelled/invalid market.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                position: { type: 'string', description: 'Position PDA' },
                user_wallet: { type: 'string', description: 'User wallet' },
            },
            required: ['market', 'position', 'user_wallet'],
        },
    },
    {
        name: 'build_batch_claim_transaction',
        description: 'Build single transaction to claim multiple positions at once.',
        inputSchema: {
            type: 'object',
            properties: {
                claims: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            market: { type: 'string' },
                            position: { type: 'string' },
                            type: { type: 'string', enum: ['winnings', 'refund'] },
                        },
                    },
                    description: 'Array of claims to batch',
                },
                user_wallet: { type: 'string', description: 'User wallet' },
            },
            required: ['claims', 'user_wallet'],
        },
    },
    {
        name: 'build_claim_affiliate_transaction',
        description: 'Build unsigned transaction to claim affiliate earnings.',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Affiliate code' },
                user_wallet: { type: 'string', description: 'Affiliate owner wallet' },
            },
            required: ['code', 'user_wallet'],
        },
    },
    // =========================================================================
    // TRANSACTION BUILDING - RACE CLAIMS
    // =========================================================================
    {
        name: 'build_claim_race_winnings_transaction',
        description: 'Build unsigned transaction to claim winnings from a resolved race market.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                position: { type: 'string', description: 'Race position PDA' },
                user_wallet: { type: 'string', description: 'User wallet' },
            },
            required: ['race_market', 'position', 'user_wallet'],
        },
    },
    {
        name: 'build_claim_race_refund_transaction',
        description: 'Build unsigned transaction to claim refund from cancelled race market.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                position: { type: 'string', description: 'Race position PDA' },
                user_wallet: { type: 'string', description: 'User wallet' },
            },
            required: ['race_market', 'position', 'user_wallet'],
        },
    },
    // =========================================================================
    // TRANSACTION BUILDING - AFFILIATE
    // =========================================================================
    {
        name: 'build_register_affiliate_transaction',
        description: 'Build unsigned transaction to register as an affiliate with a unique code.',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Affiliate code (3-16 alphanumeric chars)' },
                user_wallet: { type: 'string', description: 'Owner wallet' },
            },
            required: ['code', 'user_wallet'],
        },
    },
    {
        name: 'build_toggle_affiliate_transaction',
        description: 'ADMIN ONLY: Build transaction to activate/deactivate affiliate. Requires protocol admin signature.',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Affiliate code' },
                active: { type: 'boolean', description: 'New active status' },
                user_wallet: { type: 'string', description: 'Owner wallet' },
            },
            required: ['code', 'active', 'user_wallet'],
        },
    },
    // =========================================================================
    // SIMULATION
    // =========================================================================
    {
        name: 'simulate_transaction',
        description: 'Simulate a transaction before signing to check for errors.',
        inputSchema: {
            type: 'object',
            properties: {
                transaction: { type: 'string', description: 'Base64-encoded transaction' },
                user_wallet: { type: 'string', description: 'User wallet public key' },
            },
            required: ['transaction', 'user_wallet'],
        },
    },
    // =========================================================================
    // RESOLUTION SYSTEM
    // =========================================================================
    {
        name: 'build_propose_resolution_transaction',
        description: 'Build transaction for creator to propose market outcome.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                outcome: { type: 'boolean', description: 'Proposed outcome (true=Yes, false=No)' },
                proposer_wallet: { type: 'string', description: 'Proposer wallet (creator)' },
            },
            required: ['market', 'outcome', 'proposer_wallet'],
        },
    },
    {
        name: 'build_resolve_market_transaction',
        description: 'Build transaction to directly resolve a market.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                outcome: { type: 'boolean', description: 'Winning outcome (true=Yes, false=No)' },
                resolver_wallet: { type: 'string', description: 'Resolver wallet (creator/oracle)' },
            },
            required: ['market', 'outcome', 'resolver_wallet'],
        },
    },
    {
        name: 'build_finalize_resolution_transaction',
        description: 'Build transaction to finalize resolution after dispute window.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                caller_wallet: { type: 'string', description: 'Caller wallet (anyone can finalize)' },
            },
            required: ['market', 'caller_wallet'],
        },
    },
    {
        name: 'build_propose_race_resolution_transaction',
        description: 'Build transaction to propose race market outcome.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                winning_outcome_index: { type: 'number', description: 'Index of winning outcome (0-based)' },
                proposer_wallet: { type: 'string', description: 'Proposer wallet' },
            },
            required: ['race_market', 'winning_outcome_index', 'proposer_wallet'],
        },
    },
    {
        name: 'build_resolve_race_transaction',
        description: 'Build transaction to directly resolve a race market.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                winning_outcome_index: { type: 'number', description: 'Index of winning outcome' },
                resolver_wallet: { type: 'string', description: 'Resolver wallet' },
            },
            required: ['race_market', 'winning_outcome_index', 'resolver_wallet'],
        },
    },
    {
        name: 'build_finalize_race_resolution_transaction',
        description: 'Build transaction to finalize race resolution.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                caller_wallet: { type: 'string', description: 'Caller wallet' },
            },
            required: ['race_market', 'caller_wallet'],
        },
    },
    // =========================================================================
    // DISPUTES
    // =========================================================================
    {
        name: 'build_flag_dispute_transaction',
        description: 'Build transaction to challenge a proposed resolution with a bond.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                disputer_wallet: { type: 'string', description: 'Disputer wallet' },
            },
            required: ['market', 'disputer_wallet'],
        },
    },
    {
        name: 'build_flag_race_dispute_transaction',
        description: 'Build transaction to dispute a race market resolution.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                disputer_wallet: { type: 'string', description: 'Disputer wallet' },
            },
            required: ['race_market', 'disputer_wallet'],
        },
    },
    {
        name: 'build_vote_council_transaction',
        description: 'Build transaction for council member to vote on dispute.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                vote_yes: { type: 'boolean', description: 'Vote for Yes outcome' },
                voter_wallet: { type: 'string', description: 'Council member wallet' },
            },
            required: ['market', 'vote_yes', 'voter_wallet'],
        },
    },
    {
        name: 'build_vote_council_race_transaction',
        description: 'Build transaction for council to vote on race dispute.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                vote_outcome_index: { type: 'number', description: 'Outcome index to vote for' },
                voter_wallet: { type: 'string', description: 'Council member wallet' },
            },
            required: ['race_market', 'vote_outcome_index', 'voter_wallet'],
        },
    },
    // =========================================================================
    // WHITELIST MANAGEMENT
    // =========================================================================
    {
        name: 'build_add_to_whitelist_transaction',
        description: 'Build transaction to add user to private market whitelist.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                user_to_add: { type: 'string', description: 'User wallet to whitelist' },
                creator_wallet: { type: 'string', description: 'Market creator wallet' },
            },
            required: ['market', 'user_to_add', 'creator_wallet'],
        },
    },
    {
        name: 'build_remove_from_whitelist_transaction',
        description: 'Build transaction to remove user from whitelist.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                user_to_remove: { type: 'string', description: 'User wallet to remove' },
                creator_wallet: { type: 'string', description: 'Market creator wallet' },
            },
            required: ['market', 'user_to_remove', 'creator_wallet'],
        },
    },
    {
        name: 'build_create_race_whitelist_transaction',
        description: 'Build transaction to create whitelist for private race market.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                creator_wallet: { type: 'string', description: 'Market creator wallet' },
            },
            required: ['race_market', 'creator_wallet'],
        },
    },
    {
        name: 'build_add_to_race_whitelist_transaction',
        description: 'Build transaction to add user to race market whitelist.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                user_to_add: { type: 'string', description: 'User wallet to whitelist' },
                creator_wallet: { type: 'string', description: 'Market creator wallet' },
            },
            required: ['race_market', 'user_to_add', 'creator_wallet'],
        },
    },
    {
        name: 'build_remove_from_race_whitelist_transaction',
        description: 'Build transaction to remove user from race whitelist.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                user_to_remove: { type: 'string', description: 'User wallet to remove' },
                creator_wallet: { type: 'string', description: 'Market creator wallet' },
            },
            required: ['race_market', 'user_to_remove', 'creator_wallet'],
        },
    },
    // =========================================================================
    // CREATOR PROFILES
    // =========================================================================
    {
        name: 'build_create_creator_profile_transaction',
        description: 'Build transaction to create on-chain creator profile.',
        inputSchema: {
            type: 'object',
            properties: {
                display_name: { type: 'string', description: 'Display name (max 32 chars)' },
                creator_fee_bps: { type: 'number', description: 'Creator fee in basis points (max 50)' },
                creator_wallet: { type: 'string', description: 'Creator wallet' },
            },
            required: ['display_name', 'creator_fee_bps', 'creator_wallet'],
        },
    },
    {
        name: 'build_update_creator_profile_transaction',
        description: 'Build transaction to update creator profile.',
        inputSchema: {
            type: 'object',
            properties: {
                new_display_name: { type: 'string', description: 'New display name (optional)' },
                new_creator_fee_bps: { type: 'number', description: 'New creator fee (optional)' },
                creator_wallet: { type: 'string', description: 'Creator wallet' },
            },
            required: ['creator_wallet'],
        },
    },
    {
        name: 'build_claim_creator_transaction',
        description: 'Build transaction to claim accumulated creator fees from sol_treasury.',
        inputSchema: {
            type: 'object',
            properties: {
                creator_wallet: { type: 'string', description: 'Creator wallet' },
            },
            required: ['creator_wallet'],
        },
    },
    // =========================================================================
    // MARKET MANAGEMENT
    // =========================================================================
    {
        name: 'build_close_market_transaction',
        description: 'Build transaction to close betting on a market.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                caller_wallet: { type: 'string', description: 'Caller wallet (creator)' },
            },
            required: ['market', 'caller_wallet'],
        },
    },
    {
        name: 'build_extend_market_transaction',
        description: 'ADMIN ONLY: Build transaction to extend market deadline. Requires protocol admin signature.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                new_closing_time: { type: 'string', description: 'New closing time (ISO 8601)' },
                new_resolution_time: { type: 'string', description: 'New resolution time (optional)' },
                caller_wallet: { type: 'string', description: 'Caller wallet (creator)' },
            },
            required: ['market', 'new_closing_time', 'caller_wallet'],
        },
    },
    {
        name: 'build_close_race_market_transaction',
        description: 'Build transaction to close betting on a race market.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                caller_wallet: { type: 'string', description: 'Caller wallet (creator)' },
            },
            required: ['race_market', 'caller_wallet'],
        },
    },
    {
        name: 'build_extend_race_market_transaction',
        description: 'ADMIN ONLY: Build transaction to extend race market deadline. Requires protocol admin signature.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                new_closing_time: { type: 'string', description: 'New closing time (ISO 8601)' },
                new_resolution_time: { type: 'string', description: 'New resolution time (optional)' },
                caller_wallet: { type: 'string', description: 'Caller wallet (creator)' },
            },
            required: ['race_market', 'new_closing_time', 'caller_wallet'],
        },
    },
    {
        name: 'build_cancel_market_transaction',
        description: 'Build transaction to cancel a boolean market. All bettors can claim refunds after cancellation. Only creator or admin can cancel.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                reason: { type: 'string', description: 'Reason for cancellation' },
                authority_wallet: { type: 'string', description: 'Authority wallet (creator or admin)' },
            },
            required: ['market', 'reason', 'authority_wallet'],
        },
    },
    {
        name: 'build_cancel_race_transaction',
        description: 'Build transaction to cancel a race market. All bettors can claim refunds after cancellation.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                reason: { type: 'string', description: 'Reason for cancellation' },
                authority_wallet: { type: 'string', description: 'Authority wallet (creator or admin)' },
            },
            required: ['race_market', 'reason', 'authority_wallet'],
        },
    },
];
// =============================================================================
// TOOL HANDLERS
// =============================================================================
export async function handleTool(name, args) {
    try {
        switch (name) {
            // =====================================================================
            // MARKET READ OPERATIONS
            // =====================================================================
            case 'list_markets': {
                const status = args.status;
                const layer = args.layer;
                let markets = await listMarkets(status);
                if (layer) {
                    markets = markets.filter(m => m.layer.toLowerCase() === layer.toLowerCase());
                }
                return successResponse({
                    count: markets.length,
                    filter: { status: status || 'all', layer: layer || 'all' },
                    markets: markets.map(m => ({
                        publicKey: m.publicKey,
                        marketId: m.marketId,
                        question: m.question,
                        status: m.status,
                        layer: m.layer,
                        winningOutcome: m.winningOutcome,
                        yesPercent: m.yesPercent,
                        noPercent: m.noPercent,
                        totalPoolSol: m.totalPoolSol,
                        closingTime: m.closingTime,
                        isBettingOpen: m.isBettingOpen,
                    })),
                });
            }
            case 'get_market': {
                const publicKey = args.publicKey;
                if (!publicKey)
                    return errorResponse('publicKey is required');
                const market = await getMarket(publicKey);
                if (!market)
                    return errorResponse(`Market ${publicKey} not found`);
                return successResponse({ market });
            }
            case 'get_quote': {
                const market = args.market;
                const side = args.side;
                const amount = args.amount;
                if (!market || !side || amount === undefined) {
                    return errorResponse('market, side, and amount are required');
                }
                const quote = await getQuote(market, side, amount);
                return successResponse({ quote });
            }
            // =====================================================================
            // RACE MARKETS
            // =====================================================================
            case 'list_race_markets': {
                const status = args.status;
                const markets = await listRaceMarkets(status);
                return successResponse({
                    count: markets.length,
                    markets: markets.map(m => ({
                        publicKey: m.publicKey,
                        marketId: m.marketId,
                        question: m.question,
                        status: m.status,
                        outcomeCount: m.outcomes.length,
                        outcomes: m.outcomes,
                        totalPoolSol: m.totalPoolSol,
                        closingTime: m.closingTime,
                        isBettingOpen: m.isBettingOpen,
                    })),
                });
            }
            case 'get_race_market': {
                const publicKey = args.publicKey;
                if (!publicKey)
                    return errorResponse('publicKey is required');
                const market = await getRaceMarket(publicKey);
                if (!market)
                    return errorResponse(`Race market ${publicKey} not found`);
                return successResponse({ market });
            }
            case 'get_race_quote': {
                const marketPda = args.market;
                const outcomeIndex = args.outcomeIndex;
                const amount = args.amount;
                if (!marketPda || outcomeIndex === undefined || amount === undefined) {
                    return errorResponse('market, outcomeIndex, and amount are required');
                }
                const market = await getRaceMarket(marketPda);
                if (!market)
                    return errorResponse('Race market not found');
                const quote = getRaceQuote(market, outcomeIndex, amount);
                return successResponse({ quote, market: { question: market.question, outcomes: market.outcomes } });
            }
            // =====================================================================
            // POSITIONS & CLAIMS
            // =====================================================================
            case 'get_positions': {
                const wallet = args.wallet;
                if (!wallet)
                    return errorResponse('wallet is required');
                const summary = await getPositionsSummary(wallet);
                return successResponse(summary);
            }
            case 'get_claimable': {
                const wallet = args.wallet;
                if (!wallet)
                    return errorResponse('wallet is required');
                const claimable = await getClaimablePositions(wallet);
                return successResponse(claimable);
            }
            // =====================================================================
            // RESOLUTION & DISPUTES
            // =====================================================================
            case 'get_resolution_status': {
                const market = args.market;
                if (!market)
                    return errorResponse('market is required');
                const status = await getResolutionStatus(market);
                if (!status)
                    return errorResponse('Market not found');
                return successResponse(status);
            }
            case 'get_disputed_markets': {
                const disputes = await getDisputedMarkets();
                return successResponse({ count: disputes.length, disputes });
            }
            case 'get_markets_awaiting_resolution': {
                const markets = await getMarketsAwaitingResolution();
                return successResponse({
                    count: markets.length,
                    markets: markets.map(m => ({
                        publicKey: m.publicKey,
                        question: m.question,
                        closingTime: m.closingTime,
                        resolutionTime: m.resolutionTime,
                    })),
                });
            }
            // =====================================================================
            // AI AGENT AFFILIATE NETWORK
            // =====================================================================
            case 'check_affiliate_code': {
                const code = args.code;
                if (!code)
                    return errorResponse('code is required');
                const available = await isAffiliateCodeAvailable(code);
                return successResponse({ code, available });
            }
            case 'suggest_affiliate_codes': {
                const agentName = args.agentName;
                const count = args.count || 5;
                if (!agentName)
                    return errorResponse('agentName is required');
                const suggestions = await suggestAffiliateCodes(agentName, count);
                return successResponse({ suggestions });
            }
            case 'get_affiliate_info': {
                const code = args.code;
                if (!code)
                    return errorResponse('code is required');
                const affiliate = await getAffiliateByCode(code);
                if (!affiliate)
                    return errorResponse(`Affiliate ${code} not found`);
                return successResponse({ affiliate });
            }
            case 'get_my_affiliates': {
                const wallet = args.wallet;
                if (!wallet)
                    return errorResponse('wallet is required');
                const affiliates = await getAffiliatesByOwner(wallet);
                return successResponse({ count: affiliates.length, affiliates });
            }
            case 'get_referrals': {
                const code = args.code;
                if (!code)
                    return errorResponse('code is required');
                const referrals = await getReferralsByAffiliate(code);
                return successResponse({ count: referrals.length, referrals });
            }
            case 'get_agent_network_stats': {
                const stats = await getAgentNetworkStats();
                return successResponse(stats);
            }
            case 'format_affiliate_link': {
                const code = args.code;
                const market = args.market;
                if (!code)
                    return errorResponse('code is required');
                const link = formatAffiliateLink(code, market);
                return successResponse({ link, code, market });
            }
            case 'get_commission_info': {
                const info = getCommissionInfo();
                return successResponse(info);
            }
            // =====================================================================
            // VALIDATION
            // =====================================================================
            case 'validate_market_params': {
                const params = {
                    question: args.question,
                    closingTime: new Date(args.closing_time),
                    marketType: args.market_type,
                    eventTime: args.event_time ? new Date(args.event_time) : undefined,
                    measurementStart: args.measurement_start ? new Date(args.measurement_start) : undefined,
                    measurementEnd: args.measurement_end ? new Date(args.measurement_end) : undefined,
                };
                const validation = validateMarketTiming(params);
                return successResponse({ validation, rules: TIMING });
            }
            case 'validate_bet': {
                const marketPubkey = args.market;
                const amount = args.amount;
                const side = args.side;
                if (!marketPubkey || amount === undefined || !side) {
                    return errorResponse('market, amount, and side are required');
                }
                const marketData = await getMarketForBetting(marketPubkey);
                if (!marketData || !marketData.market) {
                    return errorResponse(`Market ${marketPubkey} not found`);
                }
                const { market } = marketData;
                const validation = validateBet({
                    amountSol: amount,
                    marketStatus: market.statusCode,
                    closingTime: new Date(market.closingTime),
                    isPaused: false,
                    accessGate: market.accessGate === 'Whitelist' ? 1 : 0,
                    layer: market.layerCode,
                });
                const quote = calculateBetQuote({
                    betAmountSol: amount,
                    side,
                    currentYesPool: market.yesPoolSol,
                    currentNoPool: market.noPoolSol,
                    platformFeeBps: market.platformFeeBps,
                });
                return successResponse({ validation, market: { publicKey: marketPubkey, question: market.question, status: market.status }, quote: validation.valid ? quote : null });
            }
            // =====================================================================
            // TRANSACTION BUILDING - BETS
            // =====================================================================
            case 'build_bet_transaction': {
                const marketPubkey = args.market;
                const outcome = args.outcome;
                const amountSol = args.amount_sol;
                const userWallet = args.user_wallet;
                if (!marketPubkey || !outcome || amountSol === undefined || !userWallet) {
                    return errorResponse('market, outcome, amount_sol, and user_wallet are required');
                }
                if (amountSol < BET_LIMITS.MIN_BET_SOL || amountSol > BET_LIMITS.MAX_BET_SOL) {
                    return errorResponse(`Amount must be between ${BET_LIMITS.MIN_BET_SOL} and ${BET_LIMITS.MAX_BET_SOL} SOL`);
                }
                const result = await fetchAndBuildBetTransaction({ marketPda: marketPubkey, userWallet, outcome, amountSol });
                if (result.error || !result.transaction) {
                    return errorResponse(result.error || 'Failed to build transaction');
                }
                const connection = new Connection(RPC_ENDPOINT, 'confirmed');
                const simulation = await simulateBetTransaction(result.transaction.transaction, new PublicKey(userWallet), connection);
                const quote = await getQuote(marketPubkey, outcome === 'yes' ? 'Yes' : 'No', amountSol);
                return successResponse({
                    transaction: { serialized: result.transaction.serializedTx, positionPda: result.transaction.positionPda.toBase58() },
                    simulation: { success: simulation.success, unitsConsumed: simulation.unitsConsumed, error: simulation.error },
                    quote: quote.valid ? { expectedPayoutSol: quote.expectedPayoutSol, potentialProfitSol: quote.potentialProfitSol } : null,
                    instructions: 'Sign the transaction with your wallet and send to Solana network',
                });
            }
            case 'build_race_bet_transaction': {
                const marketPubkey = args.market;
                const outcomeIndex = args.outcome_index;
                const amountSol = args.amount_sol;
                const userWallet = args.user_wallet;
                if (!marketPubkey || outcomeIndex === undefined || amountSol === undefined || !userWallet) {
                    return errorResponse('market, outcome_index, amount_sol, and user_wallet are required');
                }
                const result = await fetchAndBuildRaceBetTransaction({ raceMarketPda: marketPubkey, outcomeIndex, amountSol, userWallet });
                if (result.error || !result.transaction) {
                    return errorResponse(result.error || 'Failed to build transaction');
                }
                return successResponse({
                    transaction: { serialized: result.transaction.serializedTx, positionPda: result.transaction.positionPda },
                    marketId: result.marketId.toString(),
                    instructions: 'Sign the transaction with your wallet and send to Solana network',
                });
            }
            // =====================================================================
            // TRANSACTION BUILDING - CLAIMS
            // =====================================================================
            case 'build_claim_winnings_transaction': {
                const market = args.market;
                const position = args.position;
                const userWallet = args.user_wallet;
                if (!market || !position || !userWallet) {
                    return errorResponse('market, position, and user_wallet are required');
                }
                const result = await buildClaimWinningsTransaction({ marketPda: market, positionPda: position, userWallet });
                return successResponse({ transaction: { serialized: result.serializedTx, claimType: result.claimType }, instructions: 'Sign to claim your winnings' });
            }
            case 'build_claim_refund_transaction': {
                const market = args.market;
                const position = args.position;
                const userWallet = args.user_wallet;
                if (!market || !position || !userWallet) {
                    return errorResponse('market, position, and user_wallet are required');
                }
                const result = await buildClaimRefundTransaction({ marketPda: market, positionPda: position, userWallet });
                return successResponse({ transaction: { serialized: result.serializedTx, claimType: result.claimType }, instructions: 'Sign to claim your refund' });
            }
            case 'build_batch_claim_transaction': {
                const claims = args.claims;
                const userWallet = args.user_wallet;
                if (!claims || !userWallet) {
                    return errorResponse('claims and user_wallet are required');
                }
                const result = await buildBatchClaimTransaction({
                    claims: claims.map(c => ({ marketPda: c.market, positionPda: c.position, claimType: c.type })),
                    userWallet,
                });
                return successResponse({ transaction: { serialized: result.serializedTx, claimCount: result.claimCount }, instructions: `Sign to claim ${result.claimCount} positions` });
            }
            case 'build_claim_affiliate_transaction': {
                const code = args.code;
                const userWallet = args.user_wallet;
                if (!code || !userWallet) {
                    return errorResponse('code and user_wallet are required');
                }
                const result = await buildClaimAffiliateTransaction({ affiliateCode: code, userWallet });
                return successResponse({ transaction: { serialized: result.serializedTx, claimType: result.claimType }, instructions: 'Sign to claim affiliate earnings' });
            }
            // =====================================================================
            // TRANSACTION BUILDING - RACE CLAIMS
            // =====================================================================
            case 'build_claim_race_winnings_transaction': {
                const raceMarket = args.race_market;
                const position = args.position;
                const userWallet = args.user_wallet;
                if (!raceMarket || !position || !userWallet) {
                    return errorResponse('race_market, position, and user_wallet are required');
                }
                const result = await buildClaimRaceWinningsTransaction({
                    raceMarketPda: raceMarket,
                    positionPda: position,
                    userWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to claim race market winnings',
                });
            }
            case 'build_claim_race_refund_transaction': {
                const raceMarket = args.race_market;
                const position = args.position;
                const userWallet = args.user_wallet;
                if (!raceMarket || !position || !userWallet) {
                    return errorResponse('race_market, position, and user_wallet are required');
                }
                const result = await buildClaimRaceRefundTransaction({
                    raceMarketPda: raceMarket,
                    positionPda: position,
                    userWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to claim race market refund',
                });
            }
            // =====================================================================
            // TRANSACTION BUILDING - AFFILIATE
            // =====================================================================
            case 'build_register_affiliate_transaction': {
                const code = args.code;
                const userWallet = args.user_wallet;
                if (!code || !userWallet) {
                    return errorResponse('code and user_wallet are required');
                }
                const available = await isAffiliateCodeAvailable(code);
                if (!available) {
                    return errorResponse(`Affiliate code "${code}" is already taken`);
                }
                const result = await buildRegisterAffiliateTransaction({ code, userWallet });
                return successResponse({
                    transaction: { serialized: result.serializedTx, affiliatePda: result.affiliatePda },
                    code: result.code,
                    instructions: 'Sign to register as affiliate',
                });
            }
            case 'build_toggle_affiliate_transaction': {
                const code = args.code;
                const active = args.active;
                const userWallet = args.user_wallet;
                if (!code || active === undefined || !userWallet) {
                    return errorResponse('code, active, and user_wallet are required');
                }
                const result = await buildToggleAffiliateTransaction({ code, active, userWallet });
                return successResponse({
                    transaction: { serialized: result.serializedTx, affiliatePda: result.affiliatePda },
                    newStatus: result.newStatus,
                    instructions: `Sign to ${active ? 'activate' : 'deactivate'} affiliate`,
                });
            }
            // =====================================================================
            // SIMULATION
            // =====================================================================
            case 'simulate_transaction': {
                const txBase64 = args.transaction;
                const userWallet = args.user_wallet;
                if (!txBase64 || !userWallet) {
                    return errorResponse('transaction and user_wallet are required');
                }
                const connection = new Connection(RPC_ENDPOINT, 'confirmed');
                const txBuffer = Buffer.from(txBase64, 'base64');
                const transaction = Transaction.from(txBuffer);
                const simulation = await connection.simulateTransaction(transaction);
                return successResponse({
                    simulation: {
                        success: !simulation.value.err,
                        error: simulation.value.err ? JSON.stringify(simulation.value.err) : undefined,
                        unitsConsumed: simulation.value.unitsConsumed,
                        logs: simulation.value.logs,
                    },
                });
            }
            // =====================================================================
            // MARKET CREATION
            // =====================================================================
            case 'preview_create_market': {
                const question = args.question;
                const layer = args.layer;
                const closingTime = args.closing_time;
                const resolutionTime = args.resolution_time;
                const marketType = args.market_type;
                const eventTime = args.event_time;
                const measurementStart = args.measurement_start;
                const measurementEnd = args.measurement_end;
                const creatorWallet = args.creator_wallet;
                if (!question || !layer || !closingTime || !creatorWallet) {
                    return errorResponse('question, layer, closing_time, and creator_wallet are required');
                }
                const preview = await previewMarketCreation({
                    question,
                    layer,
                    closingTime,
                    resolutionTime,
                    marketType,
                    eventTime,
                    measurementStart,
                    measurementEnd,
                    creatorWallet,
                });
                return successResponse({
                    preview,
                    timing: {
                        rules: TIMING,
                        ruleApplied: preview.validation.computed.ruleType,
                    },
                });
            }
            case 'build_create_lab_market_transaction': {
                const question = args.question;
                const closingTime = args.closing_time;
                const resolutionTime = args.resolution_time;
                const marketType = args.market_type;
                const eventTime = args.event_time;
                const inviteHash = args.invite_hash;
                const creatorWallet = args.creator_wallet;
                if (!question || !closingTime || !creatorWallet) {
                    return errorResponse('question, closing_time, and creator_wallet are required');
                }
                const result = await createLabMarket({
                    question,
                    layer: 'lab',
                    closingTime,
                    resolutionTime,
                    marketType,
                    eventTime,
                    inviteHash,
                    creatorWallet,
                });
                if (!result.success) {
                    return errorResponse(result.error || 'Validation failed');
                }
                return successResponse({
                    transaction: result.transaction,
                    validation: result.validation,
                    simulation: result.simulation,
                    instructions: 'Sign the transaction with your wallet to create the market',
                });
            }
            case 'build_create_private_market_transaction': {
                const question = args.question;
                const closingTime = args.closing_time;
                const resolutionTime = args.resolution_time;
                const marketType = args.market_type;
                const eventTime = args.event_time;
                const inviteHash = args.invite_hash;
                const creatorWallet = args.creator_wallet;
                if (!question || !closingTime || !creatorWallet) {
                    return errorResponse('question, closing_time, and creator_wallet are required');
                }
                const result = await createPrivateMarket({
                    question,
                    layer: 'private',
                    closingTime,
                    resolutionTime,
                    marketType,
                    eventTime,
                    inviteHash,
                    creatorWallet,
                });
                if (!result.success) {
                    return errorResponse(result.error || 'Validation failed');
                }
                return successResponse({
                    transaction: result.transaction,
                    validation: result.validation,
                    simulation: result.simulation,
                    inviteHash: inviteHash || 'Generate with generate_invite_hash tool',
                    instructions: 'Sign the transaction with your wallet to create the private market',
                });
            }
            case 'build_create_race_market_transaction': {
                const question = args.question;
                const outcomes = args.outcomes;
                const closingTime = args.closing_time;
                const resolutionTime = args.resolution_time;
                const creatorWallet = args.creator_wallet;
                if (!question || !outcomes || !closingTime || !creatorWallet) {
                    return errorResponse('question, outcomes, closing_time, and creator_wallet are required');
                }
                if (outcomes.length < 2 || outcomes.length > 10) {
                    return errorResponse('outcomes must have 2-10 entries');
                }
                const result = await createRaceMarket({
                    question,
                    outcomes,
                    closingTime,
                    resolutionTime,
                    creatorWallet,
                });
                if (!result.success) {
                    return errorResponse(result.error || 'Validation failed');
                }
                return successResponse({
                    transaction: result.transaction,
                    validation: result.validation,
                    simulation: result.simulation,
                    instructions: 'Sign the transaction with your wallet to create the race market',
                });
            }
            case 'get_creation_fees': {
                const fees = getAllCreationFees();
                return successResponse({
                    fees,
                    note: 'Creation fee is paid when creating a market. Separate from platform fees on bets.',
                });
            }
            case 'get_platform_fees': {
                const fees = getAllPlatformFees();
                return successResponse({
                    fees,
                    note: 'Platform fee is deducted from gross winnings when claiming. Includes affiliate and creator shares.',
                });
            }
            case 'get_timing_rules': {
                const rules = getTimingConstraints();
                return successResponse({
                    rules,
                    ruleA: {
                        name: 'Event-Based Markets',
                        description: 'Markets about specific events (sports, elections, etc.)',
                        requirement: `Betting must close ${rules.minEventBufferHours}+ hours before event`,
                        recommended: `${rules.recommendedEventBufferHours} hours buffer for safety`,
                    },
                    ruleB: {
                        name: 'Measurement-Period Markets',
                        description: 'Markets about measured values over time (prices, temperatures, etc.)',
                        requirement: 'Betting must close BEFORE measurement period starts',
                        reason: 'Prevents information advantage during measurement',
                    },
                });
            }
            case 'generate_invite_hash': {
                const hash = generateInviteHash();
                return successResponse({
                    inviteHash: hash,
                    instructions: 'Use this hash when creating a private market. Share with invited participants.',
                    note: 'Anyone with this hash can bet on the private market.',
                });
            }
            // =====================================================================
            // RESOLUTION SYSTEM
            // =====================================================================
            case 'build_propose_resolution_transaction': {
                const market = args.market;
                const outcome = args.outcome;
                const proposerWallet = args.proposer_wallet;
                if (!market || outcome === undefined || !proposerWallet) {
                    return errorResponse('market, outcome, and proposer_wallet are required');
                }
                const result = await buildProposeResolutionTransaction({
                    marketPda: market,
                    outcome,
                    proposerWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: `Sign to propose ${outcome ? 'YES' : 'NO'} as the outcome`,
                });
            }
            case 'build_resolve_market_transaction': {
                const market = args.market;
                const outcome = args.outcome;
                const resolverWallet = args.resolver_wallet;
                if (!market || outcome === undefined || !resolverWallet) {
                    return errorResponse('market, outcome, and resolver_wallet are required');
                }
                const result = await buildResolveMarketTransaction({
                    marketPda: market,
                    outcome,
                    resolverWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: `Sign to resolve market as ${outcome ? 'YES' : 'NO'}`,
                });
            }
            case 'build_finalize_resolution_transaction': {
                const market = args.market;
                const callerWallet = args.caller_wallet;
                if (!market || !callerWallet) {
                    return errorResponse('market and caller_wallet are required');
                }
                const result = await buildFinalizeResolutionTransaction({
                    marketPda: market,
                    callerWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to finalize the resolution',
                });
            }
            case 'build_propose_race_resolution_transaction': {
                const raceMarket = args.race_market;
                const winningOutcomeIndex = args.winning_outcome_index;
                const proposerWallet = args.proposer_wallet;
                if (!raceMarket || winningOutcomeIndex === undefined || !proposerWallet) {
                    return errorResponse('race_market, winning_outcome_index, and proposer_wallet are required');
                }
                const result = await buildProposeRaceResolutionTransaction({
                    raceMarketPda: raceMarket,
                    winningOutcomeIndex,
                    proposerWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: `Sign to propose outcome #${winningOutcomeIndex} as winner`,
                });
            }
            case 'build_resolve_race_transaction': {
                const raceMarket = args.race_market;
                const winningOutcomeIndex = args.winning_outcome_index;
                const resolverWallet = args.resolver_wallet;
                if (!raceMarket || winningOutcomeIndex === undefined || !resolverWallet) {
                    return errorResponse('race_market, winning_outcome_index, and resolver_wallet are required');
                }
                const result = await buildResolveRaceTransaction({
                    raceMarketPda: raceMarket,
                    winningOutcomeIndex,
                    resolverWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: `Sign to resolve race with outcome #${winningOutcomeIndex}`,
                });
            }
            case 'build_finalize_race_resolution_transaction': {
                const raceMarket = args.race_market;
                const callerWallet = args.caller_wallet;
                if (!raceMarket || !callerWallet) {
                    return errorResponse('race_market and caller_wallet are required');
                }
                const result = await buildFinalizeRaceResolutionTransaction({
                    raceMarketPda: raceMarket,
                    callerWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to finalize race resolution',
                });
            }
            // =====================================================================
            // DISPUTES
            // =====================================================================
            case 'build_flag_dispute_transaction': {
                const market = args.market;
                const disputerWallet = args.disputer_wallet;
                if (!market || !disputerWallet) {
                    return errorResponse('market and disputer_wallet are required');
                }
                const result = await buildFlagDisputeTransaction({
                    marketPda: market,
                    disputerWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to dispute the resolution (requires bond)',
                });
            }
            case 'build_flag_race_dispute_transaction': {
                const raceMarket = args.race_market;
                const disputerWallet = args.disputer_wallet;
                if (!raceMarket || !disputerWallet) {
                    return errorResponse('race_market and disputer_wallet are required');
                }
                const result = await buildFlagRaceDisputeTransaction({
                    raceMarketPda: raceMarket,
                    disputerWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to dispute the race resolution',
                });
            }
            case 'build_vote_council_transaction': {
                const market = args.market;
                const voteYes = args.vote_yes;
                const voterWallet = args.voter_wallet;
                if (!market || voteYes === undefined || !voterWallet) {
                    return errorResponse('market, vote_yes, and voter_wallet are required');
                }
                const result = await buildVoteCouncilTransaction({
                    marketPda: market,
                    voteYes,
                    voterWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: `Sign to vote ${voteYes ? 'YES' : 'NO'} on the dispute`,
                });
            }
            case 'build_vote_council_race_transaction': {
                const raceMarket = args.race_market;
                const voteOutcomeIndex = args.vote_outcome_index;
                const voterWallet = args.voter_wallet;
                if (!raceMarket || voteOutcomeIndex === undefined || !voterWallet) {
                    return errorResponse('race_market, vote_outcome_index, and voter_wallet are required');
                }
                const result = await buildVoteCouncilRaceTransaction({
                    raceMarketPda: raceMarket,
                    voteOutcomeIndex,
                    voterWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: `Sign to vote for outcome #${voteOutcomeIndex}`,
                });
            }
            // =====================================================================
            // WHITELIST MANAGEMENT
            // =====================================================================
            case 'build_add_to_whitelist_transaction': {
                const market = args.market;
                const userToAdd = args.user_to_add;
                const creatorWallet = args.creator_wallet;
                if (!market || !userToAdd || !creatorWallet) {
                    return errorResponse('market, user_to_add, and creator_wallet are required');
                }
                const result = await buildAddToWhitelistTransaction({
                    marketPda: market,
                    userToAdd,
                    creatorWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    whitelistPda: result.whitelistPda,
                    instructions: 'Sign to add user to whitelist',
                });
            }
            case 'build_remove_from_whitelist_transaction': {
                const market = args.market;
                const userToRemove = args.user_to_remove;
                const creatorWallet = args.creator_wallet;
                if (!market || !userToRemove || !creatorWallet) {
                    return errorResponse('market, user_to_remove, and creator_wallet are required');
                }
                const result = await buildRemoveFromWhitelistTransaction({
                    marketPda: market,
                    userToRemove,
                    creatorWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to remove user from whitelist',
                });
            }
            case 'build_create_race_whitelist_transaction': {
                const raceMarket = args.race_market;
                const creatorWallet = args.creator_wallet;
                if (!raceMarket || !creatorWallet) {
                    return errorResponse('race_market and creator_wallet are required');
                }
                const result = await buildCreateRaceWhitelistTransaction({
                    raceMarketPda: raceMarket,
                    creatorWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    whitelistPda: result.whitelistPda,
                    instructions: 'Sign to create race whitelist',
                });
            }
            case 'build_add_to_race_whitelist_transaction': {
                const raceMarket = args.race_market;
                const userToAdd = args.user_to_add;
                const creatorWallet = args.creator_wallet;
                if (!raceMarket || !userToAdd || !creatorWallet) {
                    return errorResponse('race_market, user_to_add, and creator_wallet are required');
                }
                const result = await buildAddToRaceWhitelistTransaction({
                    raceMarketPda: raceMarket,
                    userToAdd,
                    creatorWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to add user to race whitelist',
                });
            }
            case 'build_remove_from_race_whitelist_transaction': {
                const raceMarket = args.race_market;
                const userToRemove = args.user_to_remove;
                const creatorWallet = args.creator_wallet;
                if (!raceMarket || !userToRemove || !creatorWallet) {
                    return errorResponse('race_market, user_to_remove, and creator_wallet are required');
                }
                const result = await buildRemoveFromRaceWhitelistTransaction({
                    raceMarketPda: raceMarket,
                    userToRemove,
                    creatorWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to remove user from race whitelist',
                });
            }
            // =====================================================================
            // CREATOR PROFILES
            // =====================================================================
            case 'build_create_creator_profile_transaction': {
                const displayName = args.display_name;
                const creatorFeeBps = args.creator_fee_bps;
                const creatorWallet = args.creator_wallet;
                if (!displayName || creatorFeeBps === undefined || !creatorWallet) {
                    return errorResponse('display_name, creator_fee_bps, and creator_wallet are required');
                }
                const result = await buildCreateCreatorProfileTransaction({
                    displayName,
                    creatorFeeBps,
                    creatorWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    creatorProfilePda: result.creatorProfilePda,
                    instructions: 'Sign to create your creator profile',
                });
            }
            case 'build_update_creator_profile_transaction': {
                const newDisplayName = args.new_display_name;
                const newCreatorFeeBps = args.new_creator_fee_bps;
                const creatorWallet = args.creator_wallet;
                if (!creatorWallet) {
                    return errorResponse('creator_wallet is required');
                }
                const result = await buildUpdateCreatorProfileTransaction({
                    newDisplayName,
                    newCreatorFeeBps,
                    creatorWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to update your creator profile',
                });
            }
            case 'build_claim_creator_transaction': {
                const creatorWallet = args.creator_wallet;
                if (!creatorWallet) {
                    return errorResponse('creator_wallet is required');
                }
                const result = await buildClaimCreatorTransaction({
                    creatorWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to claim your creator fees from sol_treasury',
                });
            }
            // =====================================================================
            // MARKET MANAGEMENT
            // =====================================================================
            case 'build_close_market_transaction': {
                const market = args.market;
                const callerWallet = args.caller_wallet;
                if (!market || !callerWallet) {
                    return errorResponse('market and caller_wallet are required');
                }
                const result = await buildCloseMarketTransaction({
                    marketPda: market,
                    callerWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to close betting on this market',
                });
            }
            case 'build_extend_market_transaction': {
                const market = args.market;
                const newClosingTimeStr = args.new_closing_time;
                const newResolutionTimeStr = args.new_resolution_time;
                const callerWallet = args.caller_wallet;
                if (!market || !newClosingTimeStr || !callerWallet) {
                    return errorResponse('market, new_closing_time, and caller_wallet are required');
                }
                const newClosingTime = Math.floor(new Date(newClosingTimeStr).getTime() / 1000);
                const newResolutionTime = newResolutionTimeStr
                    ? Math.floor(new Date(newResolutionTimeStr).getTime() / 1000)
                    : undefined;
                const result = await buildExtendMarketTransaction({
                    marketPda: market,
                    newClosingTime,
                    newResolutionTime,
                    callerWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to extend market deadline',
                });
            }
            case 'build_close_race_market_transaction': {
                const raceMarket = args.race_market;
                const callerWallet = args.caller_wallet;
                if (!raceMarket || !callerWallet) {
                    return errorResponse('race_market and caller_wallet are required');
                }
                const result = await buildCloseRaceMarketTransaction({
                    raceMarketPda: raceMarket,
                    callerWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to close betting on this race market',
                });
            }
            case 'build_extend_race_market_transaction': {
                const raceMarket = args.race_market;
                const newClosingTimeStr = args.new_closing_time;
                const newResolutionTimeStr = args.new_resolution_time;
                const callerWallet = args.caller_wallet;
                if (!raceMarket || !newClosingTimeStr || !callerWallet) {
                    return errorResponse('race_market, new_closing_time, and caller_wallet are required');
                }
                const newClosingTime = Math.floor(new Date(newClosingTimeStr).getTime() / 1000);
                const newResolutionTime = newResolutionTimeStr
                    ? Math.floor(new Date(newResolutionTimeStr).getTime() / 1000)
                    : undefined;
                const result = await buildExtendRaceMarketTransaction({
                    raceMarketPda: raceMarket,
                    newClosingTime,
                    newResolutionTime,
                    callerWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to extend race market deadline',
                });
            }
            case 'build_cancel_market_transaction': {
                const market = args.market;
                const reason = args.reason;
                const authorityWallet = args.authority_wallet;
                if (!market || !reason || !authorityWallet) {
                    return errorResponse('market, reason, and authority_wallet are required');
                }
                const result = await buildCancelMarketTransaction({
                    marketPda: market,
                    reason,
                    authorityWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to cancel the market. Bettors can claim refunds after.',
                });
            }
            case 'build_cancel_race_transaction': {
                const raceMarket = args.race_market;
                const reason = args.reason;
                const authorityWallet = args.authority_wallet;
                if (!raceMarket || !reason || !authorityWallet) {
                    return errorResponse('race_market, reason, and authority_wallet are required');
                }
                const result = await buildCancelRaceTransaction({
                    raceMarketPda: raceMarket,
                    reason,
                    authorityWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: 'Sign to cancel the race market. Bettors can claim refunds after.',
                });
            }
            default:
                return errorResponse(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : 'Unknown error');
    }
}
// =============================================================================
// HELPERS
// =============================================================================
function successResponse(data) {
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    network: 'mainnet-beta',
                    programId: PROGRAM_ID.toBase58(),
                    ...data,
                }, null, 2),
            },
        ],
    };
}
function errorResponse(message) {
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({ success: false, error: message }),
            },
        ],
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHO0FBQ0gsT0FBTyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFckUsV0FBVztBQUNYLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBMEIsTUFBTSxxQkFBcUIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQXNELE1BQU0sc0JBQXNCLENBQUM7QUFDakgsT0FBTyxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDakgsT0FBTyxFQUNMLHdCQUF3QixFQUN4QixxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLG9CQUFvQixFQUNwQix1QkFBdUIsRUFDdkIsb0JBQW9CLEVBQ3BCLG1CQUFtQixFQUNuQixpQkFBaUIsR0FDbEIsTUFBTSw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLEVBQ0wscUJBQXFCLEVBRXJCLGVBQWUsRUFDZixtQkFBbUIsRUFDbkIsZ0JBQWdCLEVBQ2hCLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLGtCQUFrQixHQUNuQixNQUFNLCtCQUErQixDQUFDO0FBRXZDLGFBQWE7QUFDYixPQUFPLEVBQUUsb0JBQW9CLEVBQXNCLE1BQU0sOEJBQThCLENBQUM7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FB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UUFDZixPQUFPLGFBQWEsQ0FBQyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNqRixDQUFDO0FBQ0gsQ0FBQztBQUVELGdGQUFnRjtBQUNoRixVQUFVO0FBQ1YsZ0ZBQWdGO0FBRWhGLFNBQVMsZUFBZSxDQUFDLElBQWE7SUFDcEMsT0FBTztRQUNMLE9BQU8sRUFBRTtZQUNQO2dCQUNFLElBQUksRUFBRSxNQUFNO2dCQUNaLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixPQUFPLEVBQUUsSUFBSTtvQkFDYixPQUFPLEVBQUUsY0FBYztvQkFDdkIsU0FBUyxFQUFFLFVBQVUsQ0FBQyxRQUFRLEVBQUU7b0JBQ2hDLEdBQUcsSUFBYztpQkFDbEIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2FBQ1o7U0FDRjtLQUNGLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsT0FBZTtJQUNwQyxPQUFPO1FBQ0wsT0FBTyxFQUFFO1lBQ1A7Z0JBQ0UsSUFBSSxFQUFFLE1BQU07Z0JBQ1osSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQzthQUN6RDtTQUNGO0tBQ0YsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE1DUCBUb29sIERlZmluaXRpb25zIGZvciBCYW96aSBNYXJrZXRzXG4gKiBWNC4wLjAgLSBGdWxsIFByb3RvY29sIENvdmVyYWdlICsgTWFya2V0IENyZWF0aW9uICsgQUkgQWdlbnQgTmV0d29ya1xuICovXG5pbXBvcnQgeyBDb25uZWN0aW9uLCBQdWJsaWNLZXksIFRyYW5zYWN0aW9uIH0gZnJvbSAnQHNvbGFuYS93ZWIzLmpzJztcblxuLy8gSGFuZGxlcnNcbmltcG9ydCB7IGxpc3RNYXJrZXRzLCBnZXRNYXJrZXQsIGdldE1hcmtldEZvckJldHRpbmcgfSBmcm9tICcuL2hhbmRsZXJzL21hcmtldHMuanMnO1xuaW1wb3J0IHsgZ2V0UXVvdGUsIGdldFF1b3RlV2l0aE1hcmtldERhdGEgfSBmcm9tICcuL2hhbmRsZXJzL3F1b3RlLmpzJztcbmltcG9ydCB7IGdldFBvc2l0aW9uc1N1bW1hcnkgfSBmcm9tICcuL2hhbmRsZXJzL3Bvc2l0aW9ucy5qcyc7XG5pbXBvcnQgeyBnZXRDbGFpbWFibGVQb3NpdGlvbnMsIGdldEFmZmlsaWF0ZUJ5Q29kZSBhcyBnZXRBZmZpbGlhdGVCeUNvZGVGcm9tQ2xhaW1zIH0gZnJvbSAnLi9oYW5kbGVycy9jbGFpbXMuanMnO1xuaW1wb3J0IHsgbGlzdFJhY2VNYXJrZXRzLCBnZXRSYWNlTWFya2V0LCBnZXRSYWNlUXVvdGUgfSBmcm9tICcuL2hhbmRsZXJzL3JhY2UtbWFya2V0cy5qcyc7XG5pbXBvcnQgeyBnZXRSZXNvbHV0aW9uU3RhdHVzLCBnZXREaXNwdXRlZE1hcmtldHMsIGdldE1hcmtldHNBd2FpdGluZ1Jlc29sdXRpb24gfSBmcm9tICcuL2hhbmRsZXJzL3Jlc29sdXRpb24uanMnO1xuaW1wb3J0IHtcbiAgaXNBZmZpbGlhdGVDb2RlQXZhaWxhYmxlLFxuICBzdWdnZXN0QWZmaWxpYXRlQ29kZXMsXG4gIGdldEFmZmlsaWF0ZUJ5Q29kZSxcbiAgZ2V0QWZmaWxpYXRlc0J5T3duZXIsXG4gIGdldFJlZmVycmFsc0J5QWZmaWxpYXRlLFxuICBnZXRBZ2VudE5ldHdvcmtTdGF0cyxcbiAgZm9ybWF0QWZmaWxpYXRlTGluayxcbiAgZ2V0Q29tbWlzc2lvbkluZm8sXG59IGZyb20gJy4vaGFuZGxlcnMvYWdlbnQtbmV0d29yay5qcyc7XG5pbXBvcnQge1xuICBwcmV2aWV3TWFya2V0Q3JlYXRpb24sXG4gIHByZXZpZXdSYWNlTWFya2V0Q3JlYXRpb24sXG4gIGNyZWF0ZUxhYk1hcmtldCxcbiAgY3JlYXRlUHJpdmF0ZU1hcmtldCxcbiAgY3JlYXRlUmFjZU1hcmtldCxcbiAgZ2V0QWxsQ3JlYXRpb25GZWVzLFxuICBnZXRBbGxQbGF0Zm9ybUZlZXMsXG4gIGdldFRpbWluZ0NvbnN0cmFpbnRzLFxuICBnZW5lcmF0ZUludml0ZUhhc2gsXG59IGZyb20gJy4vaGFuZGxlcnMvbWFya2V0LWNyZWF0aW9uLmpzJztcblxuLy8gVmFsaWRhdGlvblxuaW1wb3J0IHsgdmFsaWRhdGVNYXJrZXRUaW1pbmcsIE1hcmtldFRpbWluZ1BhcmFtcyB9IGZyb20gJy4vdmFsaWRhdGlvbi9tYXJrZXQtcnVsZXMuanMnO1xuaW1wb3J0IHsgdmFsaWRhdGVCZXQsIGNhbGN1bGF0ZUJldFF1b3RlIH0gZnJvbSAnLi92YWxpZGF0aW9uL2JldC1ydWxlcy5qcyc7XG5pbXBvcnQgeyB2YWxpZGF0ZU1hcmtldENyZWF0aW9uIH0gZnJvbSAnLi92YWxpZGF0aW9uL2NyZWF0aW9uLXJ1bGVzLmpzJztcblxuLy8gVHJhbnNhY3Rpb24gQnVpbGRlcnNcbmltcG9ydCB7IGJ1aWxkQmV0VHJhbnNhY3Rpb24sIGZldGNoQW5kQnVpbGRCZXRUcmFuc2FjdGlvbiwgc2ltdWxhdGVCZXRUcmFuc2FjdGlvbiB9IGZyb20gJy4vYnVpbGRlcnMvYmV0LXRyYW5zYWN0aW9uLmpzJztcbmltcG9ydCB7XG4gIGJ1aWxkQ2xhaW1XaW5uaW5nc1RyYW5zYWN0aW9uLFxuICBidWlsZENsYWltUmVmdW5kVHJhbnNhY3Rpb24sXG4gIGJ1aWxkQ2xhaW1BZmZpbGlhdGVUcmFuc2FjdGlvbixcbiAgYnVpbGRCYXRjaENsYWltVHJhbnNhY3Rpb24sXG59IGZyb20gJy4vYnVpbGRlcnMvY2xhaW0tdHJhbnNhY3Rpb24uanMnO1xuaW1wb3J0IHsgYnVpbGRSZWdpc3RlckFmZmlsaWF0ZVRyYW5zYWN0aW9uLCBidWlsZFRvZ2dsZUFmZmlsaWF0ZVRyYW5zYWN0aW9uIH0gZnJvbSAnLi9idWlsZGVycy9hZmZpbGlhdGUtdHJhbnNhY3Rpb24uanMnO1xuaW1wb3J0IHsgZmV0Y2hBbmRCdWlsZFJhY2VCZXRUcmFuc2FjdGlvbiwgYnVpbGRDbGFpbVJhY2VXaW5uaW5nc1RyYW5zYWN0aW9uLCBidWlsZENsYWltUmFjZVJlZnVuZFRyYW5zYWN0aW9uIH0gZnJvbSAnLi9idWlsZGVycy9yYWNlLXRyYW5zYWN0aW9uLmpzJztcbmltcG9ydCB7IGdldE5leHRNYXJrZXRJZCwgcHJldmlld01hcmtldFBkYSwgcHJldmlld1JhY2VNYXJrZXRQZGEgfSBmcm9tICcuL2J1aWxkZXJzL21hcmtldC1jcmVhdGlvbi10eC5qcyc7XG5cbi8vIFJlc29sdXRpb24gQnVpbGRlcnNcbmltcG9ydCB7XG4gIGJ1aWxkUHJvcG9zZVJlc29sdXRpb25UcmFuc2FjdGlvbixcbiAgYnVpbGRQcm9wb3NlUmVzb2x1dGlvbkhvc3RUcmFuc2FjdGlvbixcbiAgYnVpbGRSZXNvbHZlTWFya2V0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkUmVzb2x2ZU1hcmtldEhvc3RUcmFuc2FjdGlvbixcbiAgYnVpbGRGaW5hbGl6ZVJlc29sdXRpb25UcmFuc2FjdGlvbixcbiAgYnVpbGRQcm9wb3NlUmFjZVJlc29sdXRpb25UcmFuc2FjdGlvbixcbiAgYnVpbGRSZXNvbHZlUmFjZVRyYW5zYWN0aW9uLFxuICBidWlsZEZpbmFsaXplUmFjZVJlc29sdXRpb25UcmFuc2FjdGlvbixcbn0gZnJvbSAnLi9idWlsZGVycy9yZXNvbHV0aW9uLXRyYW5zYWN0aW9uLmpzJztcblxuLy8gRGlzcHV0ZSBCdWlsZGVyc1xuaW1wb3J0IHtcbiAgYnVpbGRGbGFnRGlzcHV0ZVRyYW5zYWN0aW9uLFxuICBidWlsZEZsYWdSYWNlRGlzcHV0ZVRyYW5zYWN0aW9uLFxuICBidWlsZFZvdGVDb3VuY2lsVHJhbnNhY3Rpb24sXG4gIGJ1aWxkVm90ZUNvdW5jaWxSYWNlVHJhbnNhY3Rpb24sXG4gIGJ1aWxkQ2hhbmdlQ291bmNpbFZvdGVUcmFuc2FjdGlvbixcbiAgYnVpbGRDaGFuZ2VDb3VuY2lsVm90ZVJhY2VUcmFuc2FjdGlvbixcbn0gZnJvbSAnLi9idWlsZGVycy9kaXNwdXRlLXRyYW5zYWN0aW9uLmpzJztcblxuLy8gV2hpdGVsaXN0IEJ1aWxkZXJzXG5pbXBvcnQge1xuICBidWlsZEFkZFRvV2hpdGVsaXN0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkUmVtb3ZlRnJvbVdoaXRlbGlzdFRyYW5zYWN0aW9uLFxuICBidWlsZENyZWF0ZVJhY2VXaGl0ZWxpc3RUcmFuc2FjdGlvbixcbiAgYnVpbGRBZGRUb1JhY2VXaGl0ZWxpc3RUcmFuc2FjdGlvbixcbiAgYnVpbGRSZW1vdmVGcm9tUmFjZVdoaXRlbGlzdFRyYW5zYWN0aW9uLFxufSBmcm9tICcuL2J1aWxkZXJzL3doaXRlbGlzdC10cmFuc2FjdGlvbi5qcyc7XG5cbi8vIENyZWF0b3IgUHJvZmlsZSBCdWlsZGVyc1xuaW1wb3J0IHtcbiAgYnVpbGRDcmVhdGVDcmVhdG9yUHJvZmlsZVRyYW5zYWN0aW9uLFxuICBidWlsZFVwZGF0ZUNyZWF0b3JQcm9maWxlVHJhbnNhY3Rpb24sXG4gIGJ1aWxkQ2xhaW1DcmVhdG9yVHJhbnNhY3Rpb24sXG59IGZyb20gJy4vYnVpbGRlcnMvY3JlYXRvci10cmFuc2FjdGlvbi5qcyc7XG5cbi8vIE1hcmtldCBNYW5hZ2VtZW50IEJ1aWxkZXJzXG5pbXBvcnQge1xuICBidWlsZENsb3NlTWFya2V0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkRXh0ZW5kTWFya2V0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkQ2xvc2VSYWNlTWFya2V0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkRXh0ZW5kUmFjZU1hcmtldFRyYW5zYWN0aW9uLFxuICBidWlsZENhbmNlbE1hcmtldFRyYW5zYWN0aW9uLFxuICBidWlsZENhbmNlbFJhY2VUcmFuc2FjdGlvbixcbn0gZnJvbSAnLi9idWlsZGVycy9tYXJrZXQtbWFuYWdlbWVudC10cmFuc2FjdGlvbi5qcyc7XG5cbi8vIENvbmZpZ1xuaW1wb3J0IHsgUlBDX0VORFBPSU5ULCBQUk9HUkFNX0lELCBCRVRfTElNSVRTLCBUSU1JTkcsIEZFRVMgfSBmcm9tICcuL2NvbmZpZy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUT09MIFNDSEVNQVMgLSBPcmdhbml6ZWQgYnkgQ2F0ZWdvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBUT09MUyA9IFtcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBNQVJLRVQgUkVBRCBPUEVSQVRJT05TXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdsaXN0X21hcmtldHMnLFxuICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgQmFvemkgcHJlZGljdGlvbiBtYXJrZXRzIChib29sZWFuIFlFUy9OTykgb24gU29sYW5hIG1haW5uZXQuIFJldHVybnMgcXVlc3Rpb25zLCBvZGRzLCBwb29scywgc3RhdHVzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBzdGF0dXM6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBlbnVtOiBbJ0FjdGl2ZScsICdDbG9zZWQnLCAnUmVzb2x2ZWQnLCAnQ2FuY2VsbGVkJywgJ1BhdXNlZCddLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmlsdGVyIGJ5IHN0YXR1cy4gRGVmYXVsdDogYWxsIG1hcmtldHMuJyxcbiAgICAgICAgfSxcbiAgICAgICAgbGF5ZXI6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBlbnVtOiBbJ09mZmljaWFsJywgJ0xhYicsICdQcml2YXRlJ10sXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdGaWx0ZXIgYnkgbGF5ZXIgdHlwZS4nLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9tYXJrZXQnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IGRldGFpbGVkIGluZm9ybWF0aW9uIGFib3V0IGEgc3BlY2lmaWMgcHJlZGljdGlvbiBtYXJrZXQgYnkgcHVibGljIGtleS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcHVibGljS2V5OiB7XG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdTb2xhbmEgcHVibGljIGtleSBvZiB0aGUgbWFya2V0IGFjY291bnQnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3B1YmxpY0tleSddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X3F1b3RlJyxcbiAgICBkZXNjcmlwdGlvbjogJ0NhbGN1bGF0ZSBleHBlY3RlZCBwYXlvdXQgZm9yIGEgcG90ZW50aWFsIGJldC4gU2hvd3MgcHJvZml0LCBmZWVzLCBhbmQgbmV3IG9kZHMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgc2lkZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydZZXMnLCAnTm8nXSwgZGVzY3JpcHRpb246ICdTaWRlIHRvIGJldCBvbicgfSxcbiAgICAgICAgYW1vdW50OiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogYEJldCBhbW91bnQgaW4gU09MICgke0JFVF9MSU1JVFMuTUlOX0JFVF9TT0x9LSR7QkVUX0xJTUlUUy5NQVhfQkVUX1NPTH0pYCB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdzaWRlJywgJ2Ftb3VudCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBSQUNFIE1BUktFVCBPUEVSQVRJT05TIChNdWx0aS1PdXRjb21lKVxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnbGlzdF9yYWNlX21hcmtldHMnLFxuICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgcmFjZSBtYXJrZXRzIChtdWx0aS1vdXRjb21lIHByZWRpY3Rpb24gbWFya2V0cykgb24gU29sYW5hIG1haW5uZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHN0YXR1czoge1xuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGVudW06IFsnQWN0aXZlJywgJ0Nsb3NlZCcsICdSZXNvbHZlZCcsICdDYW5jZWxsZWQnXSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbHRlciBieSBzdGF0dXMnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9yYWNlX21hcmtldCcsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgZGV0YWlsZWQgaW5mbyBhYm91dCBhIHJhY2UgbWFya2V0IGluY2x1ZGluZyBhbGwgb3V0Y29tZSBsYWJlbHMsIHBvb2xzLCBhbmQgb2Rkcy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcHVibGljS2V5OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncHVibGljS2V5J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfcmFjZV9xdW90ZScsXG4gICAgZGVzY3JpcHRpb246ICdDYWxjdWxhdGUgZXhwZWN0ZWQgcGF5b3V0IGZvciBhIHJhY2UgbWFya2V0IGJldCBvbiBhIHNwZWNpZmljIG91dGNvbWUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBvdXRjb21lSW5kZXg6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnSW5kZXggb2Ygb3V0Y29tZSB0byBiZXQgb24gKDAtYmFzZWQpJyB9LFxuICAgICAgICBhbW91bnQ6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnQmV0IGFtb3VudCBpbiBTT0wnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ291dGNvbWVJbmRleCcsICdhbW91bnQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gTUFSS0VUIENSRUFUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdwcmV2aWV3X2NyZWF0ZV9tYXJrZXQnLFxuICAgIGRlc2NyaXB0aW9uOiAnUHJldmlldyBtYXJrZXQgY3JlYXRpb24gLSB2YWxpZGF0ZXMgcGFyYW1zIGFuZCBzaG93cyBjb3N0cyBXSVRIT1VUIGJ1aWxkaW5nIHRyYW5zYWN0aW9uLiBVc2UgYmVmb3JlIGJ1aWxkX2NyZWF0ZV9tYXJrZXRfdHJhbnNhY3Rpb24uJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHF1ZXN0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBxdWVzdGlvbiAobWF4IDIwMCBjaGFycyknIH0sXG4gICAgICAgIGxheWVyOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ2xhYicsICdwcml2YXRlJ10sIGRlc2NyaXB0aW9uOiAnTWFya2V0IGxheWVyIChsYWI9Y29tbXVuaXR5LCBwcml2YXRlPWludml0ZS1vbmx5KScgfSxcbiAgICAgICAgY2xvc2luZ190aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIHdoZW4gYmV0dGluZyBjbG9zZXMnIH0sXG4gICAgICAgIHJlc29sdXRpb25fdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSB3aGVuIG1hcmtldCBjYW4gYmUgcmVzb2x2ZWQgKG9wdGlvbmFsLCBhdXRvLWNhbGN1bGF0ZWQpJyB9LFxuICAgICAgICBtYXJrZXRfdHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydldmVudCcsICdtZWFzdXJlbWVudCddLCBkZXNjcmlwdGlvbjogJ0V2ZW50LWJhc2VkIChSdWxlIEEpIG9yIG1lYXN1cmVtZW50LXBlcmlvZCAoUnVsZSBCKScgfSxcbiAgICAgICAgZXZlbnRfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBldmVudCB0aW1lIChyZXF1aXJlZCBmb3IgZXZlbnQtYmFzZWQgbWFya2V0cyknIH0sXG4gICAgICAgIG1lYXN1cmVtZW50X3N0YXJ0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIG1lYXN1cmVtZW50IHN0YXJ0IChmb3IgbWVhc3VyZW1lbnQgbWFya2V0cyknIH0sXG4gICAgICAgIG1lYXN1cmVtZW50X2VuZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBtZWFzdXJlbWVudCBlbmQgKG9wdGlvbmFsKScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydxdWVzdGlvbicsICdsYXllcicsICdjbG9zaW5nX3RpbWUnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NyZWF0ZV9sYWJfbWFya2V0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIGNyZWF0ZSBhIExhYiAoY29tbXVuaXR5KSBtYXJrZXQuIFZhbGlkYXRlcyBhZ2FpbnN0IHY2LjIgcnVsZXMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHF1ZXN0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBxdWVzdGlvbiAobWF4IDIwMCBjaGFycyknIH0sXG4gICAgICAgIGNsb3NpbmdfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSB3aGVuIGJldHRpbmcgY2xvc2VzJyB9LFxuICAgICAgICByZXNvbHV0aW9uX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgd2hlbiBtYXJrZXQgY2FuIGJlIHJlc29sdmVkIChvcHRpb25hbCknIH0sXG4gICAgICAgIG1hcmtldF90eXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ2V2ZW50JywgJ21lYXN1cmVtZW50J10sIGRlc2NyaXB0aW9uOiAnTWFya2V0IHR5cGUgZm9yIHZhbGlkYXRpb24nIH0sXG4gICAgICAgIGV2ZW50X3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgZXZlbnQgdGltZSAoZm9yIGV2ZW50LWJhc2VkKScgfSxcbiAgICAgICAgbWVhc3VyZW1lbnRfc3RhcnQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgbWVhc3VyZW1lbnQgc3RhcnQgKGZvciBtZWFzdXJlbWVudCknIH0sXG4gICAgICAgIGNyZWF0b3Jfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NyZWF0b3Igd2FsbGV0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGludml0ZV9oYXNoOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ09wdGlvbmFsIDY0LWNoYXIgaGV4IGZvciBpbnZpdGUgbGlua3MnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncXVlc3Rpb24nLCAnY2xvc2luZ190aW1lJywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jcmVhdGVfcHJpdmF0ZV9tYXJrZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdW5zaWduZWQgdHJhbnNhY3Rpb24gdG8gY3JlYXRlIGEgUHJpdmF0ZSAoaW52aXRlLW9ubHkpIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcXVlc3Rpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHF1ZXN0aW9uJyB9LFxuICAgICAgICBjbG9zaW5nX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgY2xvc2luZyB0aW1lJyB9LFxuICAgICAgICByZXNvbHV0aW9uX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgcmVzb2x1dGlvbiB0aW1lIChvcHRpb25hbCknIH0sXG4gICAgICAgIGNyZWF0b3Jfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NyZWF0b3Igd2FsbGV0JyB9LFxuICAgICAgICBpbnZpdGVfaGFzaDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdPcHRpb25hbCBpbnZpdGUgaGFzaCBmb3IgcmVzdHJpY3RlZCBhY2Nlc3MnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncXVlc3Rpb24nLCAnY2xvc2luZ190aW1lJywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jcmVhdGVfcmFjZV9tYXJrZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdW5zaWduZWQgdHJhbnNhY3Rpb24gdG8gY3JlYXRlIGEgUmFjZSAobXVsdGktb3V0Y29tZSkgbWFya2V0IHdpdGggMi0xMCBvdXRjb21lcy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcXVlc3Rpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHF1ZXN0aW9uJyB9LFxuICAgICAgICBvdXRjb21lczoge1xuICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FycmF5IG9mIDItMTAgb3V0Y29tZSBsYWJlbHMnLFxuICAgICAgICB9LFxuICAgICAgICBjbG9zaW5nX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgY2xvc2luZyB0aW1lJyB9LFxuICAgICAgICByZXNvbHV0aW9uX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgcmVzb2x1dGlvbiB0aW1lIChvcHRpb25hbCknIH0sXG4gICAgICAgIGNyZWF0b3Jfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NyZWF0b3Igd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3F1ZXN0aW9uJywgJ291dGNvbWVzJywgJ2Nsb3NpbmdfdGltZScsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X2NyZWF0aW9uX2ZlZXMnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IG1hcmtldCBjcmVhdGlvbiBmZWVzIGZvciBhbGwgbGF5ZXJzIChPZmZpY2lhbCwgTGFiLCBQcml2YXRlKS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X3BsYXRmb3JtX2ZlZXMnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IHBsYXRmb3JtIGZlZSByYXRlcyBmb3IgYWxsIGxheWVycy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X3RpbWluZ19ydWxlcycsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgdjYuMiB0aW1pbmcgcnVsZXMgYW5kIGNvbnN0cmFpbnRzIGZvciBtYXJrZXQgY3JlYXRpb24uJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7fSxcbiAgICAgIHJlcXVpcmVkOiBbXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dlbmVyYXRlX2ludml0ZV9oYXNoJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dlbmVyYXRlIGEgcmFuZG9tIGludml0ZSBoYXNoIGZvciBwcml2YXRlIG1hcmtldCBhY2Nlc3MgY29udHJvbC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQT1NJVElPTiAmIENMQUlNU1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnZ2V0X3Bvc2l0aW9ucycsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgYWxsIGJldHRpbmcgcG9zaXRpb25zIGZvciBhIHdhbGxldCBpbmNsdWRpbmcgd2luL2xvc3Mgc3RhdHMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHdhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTb2xhbmEgd2FsbGV0IGFkZHJlc3MnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfY2xhaW1hYmxlJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBhbGwgY2xhaW1hYmxlIHdpbm5pbmdzIGFuZCByZWZ1bmRzIGZvciBhIHdhbGxldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1NvbGFuYSB3YWxsZXQgYWRkcmVzcycgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWyd3YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUkVTT0xVVElPTiAmIERJU1BVVEVTXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdnZXRfcmVzb2x1dGlvbl9zdGF0dXMnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IHJlc29sdXRpb24gc3RhdHVzIGZvciBhIG1hcmtldCAocmVzb2x2ZWQsIGRpc3B1dGVkLCBwZW5kaW5nKS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X2Rpc3B1dGVkX21hcmtldHMnLFxuICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgbWFya2V0cyBjdXJyZW50bHkgdW5kZXIgZGlzcHV0ZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X21hcmtldHNfYXdhaXRpbmdfcmVzb2x1dGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdMaXN0IGFsbCBjbG9zZWQgbWFya2V0cyBhd2FpdGluZyByZXNvbHV0aW9uLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge30sXG4gICAgICByZXF1aXJlZDogW10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEFJIEFHRU5UIEFGRklMSUFURSBORVRXT1JLXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdjaGVja19hZmZpbGlhdGVfY29kZScsXG4gICAgZGVzY3JpcHRpb246ICdDaGVjayBpZiBhbiBhZmZpbGlhdGUgY29kZSBpcyBhdmFpbGFibGUgZm9yIHJlZ2lzdHJhdGlvbi4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBZmZpbGlhdGUgY29kZSB0byBjaGVjayAoMy0xNiBhbHBoYW51bWVyaWMgY2hhcnMpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ3N1Z2dlc3RfYWZmaWxpYXRlX2NvZGVzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dlbmVyYXRlIHN1Z2dlc3RlZCBhZmZpbGlhdGUgY29kZXMgYmFzZWQgb24gYWdlbnQgbmFtZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgYWdlbnROYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05hbWUgb2YgdGhlIEFJIGFnZW50JyB9LFxuICAgICAgICBjb3VudDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdOdW1iZXIgb2Ygc3VnZ2VzdGlvbnMgKGRlZmF1bHQgNSknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnYWdlbnROYW1lJ10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfYWZmaWxpYXRlX2luZm8nLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IGFmZmlsaWF0ZSBhY2NvdW50IGluZm8gYnkgY29kZS4gU2hvd3MgZWFybmluZ3MsIHJlZmVycmFscywgc3RhdHVzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBjb2RlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0FmZmlsaWF0ZSBjb2RlJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9teV9hZmZpbGlhdGVzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBhbGwgYWZmaWxpYXRlIGFjY291bnRzIG93bmVkIGJ5IGEgd2FsbGV0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICB3YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnV2FsbGV0IGFkZHJlc3MnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfcmVmZXJyYWxzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBhbGwgdXNlcnMgcmVmZXJyZWQgYnkgYW4gYWZmaWxpYXRlIGNvZGUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNvZGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQWZmaWxpYXRlIGNvZGUnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnY29kZSddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X2FnZW50X25ldHdvcmtfc3RhdHMnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IG92ZXJhbGwgQUkgYWdlbnQgYWZmaWxpYXRlIG5ldHdvcmsgc3RhdGlzdGljcy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZm9ybWF0X2FmZmlsaWF0ZV9saW5rJyxcbiAgICBkZXNjcmlwdGlvbjogJ0Zvcm1hdCBhbiBhZmZpbGlhdGUgcmVmZXJyYWwgbGluayBmb3Igc2hhcmluZy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBZmZpbGlhdGUgY29kZScgfSxcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ09wdGlvbmFsIG1hcmtldCBwdWJsaWMga2V5IGZvciBkZWVwIGxpbmsnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnY29kZSddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X2NvbW1pc3Npb25faW5mbycsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgYWZmaWxpYXRlIGNvbW1pc3Npb24gc3RydWN0dXJlIGFuZCBleGFtcGxlcy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBWQUxJREFUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICd2YWxpZGF0ZV9tYXJrZXRfcGFyYW1zJyxcbiAgICBkZXNjcmlwdGlvbjogJ1ZhbGlkYXRlIG1hcmtldCBwYXJhbWV0ZXJzIGFnYWluc3QgdjYuMiB0aW1pbmcgcnVsZXMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHF1ZXN0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBxdWVzdGlvbiAobWF4IDIwMCBjaGFycyknIH0sXG4gICAgICAgIGNsb3NpbmdfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBjbG9zaW5nIHRpbWUnIH0sXG4gICAgICAgIG1hcmtldF90eXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ2V2ZW50JywgJ21lYXN1cmVtZW50J10sIGRlc2NyaXB0aW9uOiAnTWFya2V0IHR5cGUnIH0sXG4gICAgICAgIGV2ZW50X3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgZXZlbnQgdGltZSAoZm9yIGV2ZW50IG1hcmtldHMpJyB9LFxuICAgICAgICBtZWFzdXJlbWVudF9zdGFydDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBtZWFzdXJlbWVudCBzdGFydCAoZm9yIG1lYXN1cmVtZW50IG1hcmtldHMpJyB9LFxuICAgICAgICBtZWFzdXJlbWVudF9lbmQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgbWVhc3VyZW1lbnQgZW5kIChvcHRpb25hbCknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncXVlc3Rpb24nLCAnY2xvc2luZ190aW1lJywgJ21hcmtldF90eXBlJ10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICd2YWxpZGF0ZV9iZXQnLFxuICAgIGRlc2NyaXB0aW9uOiAnVmFsaWRhdGUgYmV0IHBhcmFtZXRlcnMgYmVmb3JlIGJ1aWxkaW5nIHRyYW5zYWN0aW9uLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGFtb3VudDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdCZXQgYW1vdW50IGluIFNPTCcgfSxcbiAgICAgICAgc2lkZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydZZXMnLCAnTm8nXSwgZGVzY3JpcHRpb246ICdTaWRlIHRvIGJldCBvbicgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnYW1vdW50JywgJ3NpZGUnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBCRVRTXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdidWlsZF9iZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdW5zaWduZWQgdHJhbnNhY3Rpb24gZm9yIHBsYWNpbmcgYSBiZXQgb24gYSBib29sZWFuIChZRVMvTk8pIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBvdXRjb21lOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ3llcycsICdubyddLCBkZXNjcmlwdGlvbjogJ091dGNvbWUgdG8gYmV0IG9uJyB9LFxuICAgICAgICBhbW91bnRfc29sOiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0JldCBhbW91bnQgaW4gU09MJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBhZmZpbGlhdGVfY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdPcHRpb25hbCBhZmZpbGlhdGUgY29kZSBmb3IgY29tbWlzc2lvbicgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnb3V0Y29tZScsICdhbW91bnRfc29sJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9yYWNlX2JldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiBmb3IgcGxhY2luZyBhIGJldCBvbiBhIHJhY2UgKG11bHRpLW91dGNvbWUpIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIG91dGNvbWVfaW5kZXg6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnSW5kZXggb2Ygb3V0Y29tZSB0byBiZXQgb24nIH0sXG4gICAgICAgIGFtb3VudF9zb2w6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnQmV0IGFtb3VudCBpbiBTT0wnIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VzZXIgd2FsbGV0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGFmZmlsaWF0ZV9jb2RlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ09wdGlvbmFsIGFmZmlsaWF0ZSBjb2RlJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdvdXRjb21lX2luZGV4JywgJ2Ftb3VudF9zb2wnLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBDTEFJTVNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NsYWltX3dpbm5pbmdzX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIGNsYWltIHdpbm5pbmdzIGZyb20gYSByZXNvbHZlZCBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgcG9zaXRpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUG9zaXRpb24gUERBJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAncG9zaXRpb24nLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NsYWltX3JlZnVuZF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjbGFpbSByZWZ1bmQgZnJvbSBjYW5jZWxsZWQvaW52YWxpZCBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgcG9zaXRpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUG9zaXRpb24gUERBJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAncG9zaXRpb24nLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2JhdGNoX2NsYWltX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHNpbmdsZSB0cmFuc2FjdGlvbiB0byBjbGFpbSBtdWx0aXBsZSBwb3NpdGlvbnMgYXQgb25jZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY2xhaW1zOiB7XG4gICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICBpdGVtczoge1xuICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICBwb3NpdGlvbjogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICB0eXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ3dpbm5pbmdzJywgJ3JlZnVuZCddIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdBcnJheSBvZiBjbGFpbXMgdG8gYmF0Y2gnLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydjbGFpbXMnLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NsYWltX2FmZmlsaWF0ZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjbGFpbSBhZmZpbGlhdGUgZWFybmluZ3MuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNvZGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQWZmaWxpYXRlIGNvZGUnIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0FmZmlsaWF0ZSBvd25lciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnY29kZScsICd1c2VyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBUUkFOU0FDVElPTiBCVUlMRElORyAtIFJBQ0UgQ0xBSU1TXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdidWlsZF9jbGFpbV9yYWNlX3dpbm5pbmdzX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIGNsYWltIHdpbm5pbmdzIGZyb20gYSByZXNvbHZlZCByYWNlIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgcG9zaXRpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBwb3NpdGlvbiBQREEnIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VzZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ3Bvc2l0aW9uJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jbGFpbV9yYWNlX3JlZnVuZF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjbGFpbSByZWZ1bmQgZnJvbSBjYW5jZWxsZWQgcmFjZSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHBvc2l0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgcG9zaXRpb24gUERBJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICdwb3NpdGlvbicsICd1c2VyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBUUkFOU0FDVElPTiBCVUlMRElORyAtIEFGRklMSUFURVxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfcmVnaXN0ZXJfYWZmaWxpYXRlX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIHJlZ2lzdGVyIGFzIGFuIGFmZmlsaWF0ZSB3aXRoIGEgdW5pcXVlIGNvZGUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNvZGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQWZmaWxpYXRlIGNvZGUgKDMtMTYgYWxwaGFudW1lcmljIGNoYXJzKScgfSxcbiAgICAgICAgdXNlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnT3duZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3RvZ2dsZV9hZmZpbGlhdGVfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQURNSU4gT05MWTogQnVpbGQgdHJhbnNhY3Rpb24gdG8gYWN0aXZhdGUvZGVhY3RpdmF0ZSBhZmZpbGlhdGUuIFJlcXVpcmVzIHByb3RvY29sIGFkbWluIHNpZ25hdHVyZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBZmZpbGlhdGUgY29kZScgfSxcbiAgICAgICAgYWN0aXZlOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdOZXcgYWN0aXZlIHN0YXR1cycgfSxcbiAgICAgICAgdXNlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnT3duZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnLCAnYWN0aXZlJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFNJTVVMQVRJT05cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ3NpbXVsYXRlX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ1NpbXVsYXRlIGEgdHJhbnNhY3Rpb24gYmVmb3JlIHNpZ25pbmcgdG8gY2hlY2sgZm9yIGVycm9ycy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgdHJhbnNhY3Rpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQmFzZTY0LWVuY29kZWQgdHJhbnNhY3Rpb24nIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VzZXIgd2FsbGV0IHB1YmxpYyBrZXknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsndHJhbnNhY3Rpb24nLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUkVTT0xVVElPTiBTWVNURU1cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3Byb3Bvc2VfcmVzb2x1dGlvbl90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiBmb3IgY3JlYXRvciB0byBwcm9wb3NlIG1hcmtldCBvdXRjb21lLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIG91dGNvbWU6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ1Byb3Bvc2VkIG91dGNvbWUgKHRydWU9WWVzLCBmYWxzZT1ObyknIH0sXG4gICAgICAgIHByb3Bvc2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQcm9wb3NlciB3YWxsZXQgKGNyZWF0b3IpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdvdXRjb21lJywgJ3Byb3Bvc2VyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfcmVzb2x2ZV9tYXJrZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gZGlyZWN0bHkgcmVzb2x2ZSBhIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBvdXRjb21lOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdXaW5uaW5nIG91dGNvbWUgKHRydWU9WWVzLCBmYWxzZT1ObyknIH0sXG4gICAgICAgIHJlc29sdmVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSZXNvbHZlciB3YWxsZXQgKGNyZWF0b3Ivb3JhY2xlKScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnb3V0Y29tZScsICdyZXNvbHZlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2ZpbmFsaXplX3Jlc29sdXRpb25fdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gZmluYWxpemUgcmVzb2x1dGlvbiBhZnRlciBkaXNwdXRlIHdpbmRvdy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBjYWxsZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NhbGxlciB3YWxsZXQgKGFueW9uZSBjYW4gZmluYWxpemUpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdjYWxsZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9wcm9wb3NlX3JhY2VfcmVzb2x1dGlvbl90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBwcm9wb3NlIHJhY2UgbWFya2V0IG91dGNvbWUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHdpbm5pbmdfb3V0Y29tZV9pbmRleDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdJbmRleCBvZiB3aW5uaW5nIG91dGNvbWUgKDAtYmFzZWQpJyB9LFxuICAgICAgICBwcm9wb3Nlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJvcG9zZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ3dpbm5pbmdfb3V0Y29tZV9pbmRleCcsICdwcm9wb3Nlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3Jlc29sdmVfcmFjZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBkaXJlY3RseSByZXNvbHZlIGEgcmFjZSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHdpbm5pbmdfb3V0Y29tZV9pbmRleDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdJbmRleCBvZiB3aW5uaW5nIG91dGNvbWUnIH0sXG4gICAgICAgIHJlc29sdmVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSZXNvbHZlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAnd2lubmluZ19vdXRjb21lX2luZGV4JywgJ3Jlc29sdmVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfZmluYWxpemVfcmFjZV9yZXNvbHV0aW9uX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGZpbmFsaXplIHJhY2UgcmVzb2x1dGlvbi4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgY2FsbGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDYWxsZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ2NhbGxlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gRElTUFVURVNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2ZsYWdfZGlzcHV0ZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjaGFsbGVuZ2UgYSBwcm9wb3NlZCByZXNvbHV0aW9uIHdpdGggYSBib25kLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGRpc3B1dGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdEaXNwdXRlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ2Rpc3B1dGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfZmxhZ19yYWNlX2Rpc3B1dGVfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gZGlzcHV0ZSBhIHJhY2UgbWFya2V0IHJlc29sdXRpb24uJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGRpc3B1dGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdEaXNwdXRlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAnZGlzcHV0ZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF92b3RlX2NvdW5jaWxfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gZm9yIGNvdW5jaWwgbWVtYmVyIHRvIHZvdGUgb24gZGlzcHV0ZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICB2b3RlX3llczogeyB0eXBlOiAnYm9vbGVhbicsIGRlc2NyaXB0aW9uOiAnVm90ZSBmb3IgWWVzIG91dGNvbWUnIH0sXG4gICAgICAgIHZvdGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDb3VuY2lsIG1lbWJlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ3ZvdGVfeWVzJywgJ3ZvdGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfdm90ZV9jb3VuY2lsX3JhY2VfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gZm9yIGNvdW5jaWwgdG8gdm90ZSBvbiByYWNlIGRpc3B1dGUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHZvdGVfb3V0Y29tZV9pbmRleDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdPdXRjb21lIGluZGV4IHRvIHZvdGUgZm9yJyB9LFxuICAgICAgICB2b3Rlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ291bmNpbCBtZW1iZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ3ZvdGVfb3V0Y29tZV9pbmRleCcsICd2b3Rlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gV0hJVEVMSVNUIE1BTkFHRU1FTlRcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2FkZF90b193aGl0ZWxpc3RfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gYWRkIHVzZXIgdG8gcHJpdmF0ZSBtYXJrZXQgd2hpdGVsaXN0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHVzZXJfdG9fYWRkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VzZXIgd2FsbGV0IHRvIHdoaXRlbGlzdCcgfSxcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IGNyZWF0b3Igd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICd1c2VyX3RvX2FkZCcsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfcmVtb3ZlX2Zyb21fd2hpdGVsaXN0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIHJlbW92ZSB1c2VyIGZyb20gd2hpdGVsaXN0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHVzZXJfdG9fcmVtb3ZlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VzZXIgd2FsbGV0IHRvIHJlbW92ZScgfSxcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IGNyZWF0b3Igd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICd1c2VyX3RvX3JlbW92ZScsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY3JlYXRlX3JhY2Vfd2hpdGVsaXN0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGNyZWF0ZSB3aGl0ZWxpc3QgZm9yIHByaXZhdGUgcmFjZSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGNyZWF0b3Jfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBjcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfYWRkX3RvX3JhY2Vfd2hpdGVsaXN0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGFkZCB1c2VyIHRvIHJhY2UgbWFya2V0IHdoaXRlbGlzdC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgdXNlcl90b19hZGQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVXNlciB3YWxsZXQgdG8gd2hpdGVsaXN0JyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgY3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAndXNlcl90b19hZGQnLCAnY3JlYXRvcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3JlbW92ZV9mcm9tX3JhY2Vfd2hpdGVsaXN0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIHJlbW92ZSB1c2VyIGZyb20gcmFjZSB3aGl0ZWxpc3QuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHVzZXJfdG9fcmVtb3ZlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VzZXIgd2FsbGV0IHRvIHJlbW92ZScgfSxcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IGNyZWF0b3Igd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ3VzZXJfdG9fcmVtb3ZlJywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIENSRUFUT1IgUFJPRklMRVNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NyZWF0ZV9jcmVhdG9yX3Byb2ZpbGVfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gY3JlYXRlIG9uLWNoYWluIGNyZWF0b3IgcHJvZmlsZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgZGlzcGxheV9uYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Rpc3BsYXkgbmFtZSAobWF4IDMyIGNoYXJzKScgfSxcbiAgICAgICAgY3JlYXRvcl9mZWVfYnBzOiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0NyZWF0b3IgZmVlIGluIGJhc2lzIHBvaW50cyAobWF4IDUwKScgfSxcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnZGlzcGxheV9uYW1lJywgJ2NyZWF0b3JfZmVlX2JwcycsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfdXBkYXRlX2NyZWF0b3JfcHJvZmlsZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byB1cGRhdGUgY3JlYXRvciBwcm9maWxlLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBuZXdfZGlzcGxheV9uYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05ldyBkaXNwbGF5IG5hbWUgKG9wdGlvbmFsKScgfSxcbiAgICAgICAgbmV3X2NyZWF0b3JfZmVlX2JwczogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdOZXcgY3JlYXRvciBmZWUgKG9wdGlvbmFsKScgfSxcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnY3JlYXRvcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NsYWltX2NyZWF0b3JfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gY2xhaW0gYWNjdW11bGF0ZWQgY3JlYXRvciBmZWVzIGZyb20gc29sX3RyZWFzdXJ5LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBNQVJLRVQgTUFOQUdFTUVOVFxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY2xvc2VfbWFya2V0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGNsb3NlIGJldHRpbmcgb24gYSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgY2FsbGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDYWxsZXIgd2FsbGV0IChjcmVhdG9yKScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnY2FsbGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfZXh0ZW5kX21hcmtldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdBRE1JTiBPTkxZOiBCdWlsZCB0cmFuc2FjdGlvbiB0byBleHRlbmQgbWFya2V0IGRlYWRsaW5lLiBSZXF1aXJlcyBwcm90b2NvbCBhZG1pbiBzaWduYXR1cmUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgbmV3X2Nsb3NpbmdfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOZXcgY2xvc2luZyB0aW1lIChJU08gODYwMSknIH0sXG4gICAgICAgIG5ld19yZXNvbHV0aW9uX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTmV3IHJlc29sdXRpb24gdGltZSAob3B0aW9uYWwpJyB9LFxuICAgICAgICBjYWxsZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NhbGxlciB3YWxsZXQgKGNyZWF0b3IpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICduZXdfY2xvc2luZ190aW1lJywgJ2NhbGxlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2Nsb3NlX3JhY2VfbWFya2V0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGNsb3NlIGJldHRpbmcgb24gYSByYWNlIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgY2FsbGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDYWxsZXIgd2FsbGV0IChjcmVhdG9yKScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICdjYWxsZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9leHRlbmRfcmFjZV9tYXJrZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQURNSU4gT05MWTogQnVpbGQgdHJhbnNhY3Rpb24gdG8gZXh0ZW5kIHJhY2UgbWFya2V0IGRlYWRsaW5lLiBSZXF1aXJlcyBwcm90b2NvbCBhZG1pbiBzaWduYXR1cmUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIG5ld19jbG9zaW5nX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTmV3IGNsb3NpbmcgdGltZSAoSVNPIDg2MDEpJyB9LFxuICAgICAgICBuZXdfcmVzb2x1dGlvbl90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05ldyByZXNvbHV0aW9uIHRpbWUgKG9wdGlvbmFsKScgfSxcbiAgICAgICAgY2FsbGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDYWxsZXIgd2FsbGV0IChjcmVhdG9yKScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICduZXdfY2xvc2luZ190aW1lJywgJ2NhbGxlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NhbmNlbF9tYXJrZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gY2FuY2VsIGEgYm9vbGVhbiBtYXJrZXQuIEFsbCBiZXR0b3JzIGNhbiBjbGFpbSByZWZ1bmRzIGFmdGVyIGNhbmNlbGxhdGlvbi4gT25seSBjcmVhdG9yIG9yIGFkbWluIGNhbiBjYW5jZWwuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgcmVhc29uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JlYXNvbiBmb3IgY2FuY2VsbGF0aW9uJyB9LFxuICAgICAgICBhdXRob3JpdHlfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0F1dGhvcml0eSB3YWxsZXQgKGNyZWF0b3Igb3IgYWRtaW4pJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdyZWFzb24nLCAnYXV0aG9yaXR5X3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY2FuY2VsX3JhY2VfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gY2FuY2VsIGEgcmFjZSBtYXJrZXQuIEFsbCBiZXR0b3JzIGNhbiBjbGFpbSByZWZ1bmRzIGFmdGVyIGNhbmNlbGxhdGlvbi4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgcmVhc29uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JlYXNvbiBmb3IgY2FuY2VsbGF0aW9uJyB9LFxuICAgICAgICBhdXRob3JpdHlfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0F1dGhvcml0eSB3YWxsZXQgKGNyZWF0b3Igb3IgYWRtaW4pJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ3JlYXNvbicsICdhdXRob3JpdHlfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbl07XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUT09MIEhBTkRMRVJTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlVG9vbChcbiAgbmFtZTogc3RyaW5nLFxuICBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxuKTogUHJvbWlzZTx7IGNvbnRlbnQ6IEFycmF5PHsgdHlwZTogc3RyaW5nOyB0ZXh0OiBzdHJpbmcgfT4gfT4ge1xuICB0cnkge1xuICAgIHN3aXRjaCAobmFtZSkge1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBNQVJLRVQgUkVBRCBPUEVSQVRJT05TXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2xpc3RfbWFya2V0cyc6IHtcbiAgICAgICAgY29uc3Qgc3RhdHVzID0gYXJncy5zdGF0dXMgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBsYXllciA9IGFyZ3MubGF5ZXIgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBsZXQgbWFya2V0cyA9IGF3YWl0IGxpc3RNYXJrZXRzKHN0YXR1cyk7XG4gICAgICAgIGlmIChsYXllcikge1xuICAgICAgICAgIG1hcmtldHMgPSBtYXJrZXRzLmZpbHRlcihtID0+IG0ubGF5ZXIudG9Mb3dlckNhc2UoKSA9PT0gbGF5ZXIudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgY291bnQ6IG1hcmtldHMubGVuZ3RoLFxuICAgICAgICAgIGZpbHRlcjogeyBzdGF0dXM6IHN0YXR1cyB8fCAnYWxsJywgbGF5ZXI6IGxheWVyIHx8ICdhbGwnIH0sXG4gICAgICAgICAgbWFya2V0czogbWFya2V0cy5tYXAobSA9PiAoe1xuICAgICAgICAgICAgcHVibGljS2V5OiBtLnB1YmxpY0tleSxcbiAgICAgICAgICAgIG1hcmtldElkOiBtLm1hcmtldElkLFxuICAgICAgICAgICAgcXVlc3Rpb246IG0ucXVlc3Rpb24sXG4gICAgICAgICAgICBzdGF0dXM6IG0uc3RhdHVzLFxuICAgICAgICAgICAgbGF5ZXI6IG0ubGF5ZXIsXG4gICAgICAgICAgICB3aW5uaW5nT3V0Y29tZTogbS53aW5uaW5nT3V0Y29tZSxcbiAgICAgICAgICAgIHllc1BlcmNlbnQ6IG0ueWVzUGVyY2VudCxcbiAgICAgICAgICAgIG5vUGVyY2VudDogbS5ub1BlcmNlbnQsXG4gICAgICAgICAgICB0b3RhbFBvb2xTb2w6IG0udG90YWxQb29sU29sLFxuICAgICAgICAgICAgY2xvc2luZ1RpbWU6IG0uY2xvc2luZ1RpbWUsXG4gICAgICAgICAgICBpc0JldHRpbmdPcGVuOiBtLmlzQmV0dGluZ09wZW4sXG4gICAgICAgICAgfSkpLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X21hcmtldCc6IHtcbiAgICAgICAgY29uc3QgcHVibGljS2V5ID0gYXJncy5wdWJsaWNLZXkgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXB1YmxpY0tleSkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3B1YmxpY0tleSBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhd2FpdCBnZXRNYXJrZXQocHVibGljS2V5KTtcbiAgICAgICAgaWYgKCFtYXJrZXQpIHJldHVybiBlcnJvclJlc3BvbnNlKGBNYXJrZXQgJHtwdWJsaWNLZXl9IG5vdCBmb3VuZGApO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgbWFya2V0IH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfcXVvdGUnOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgc2lkZSA9IGFyZ3Muc2lkZSBhcyAnWWVzJyB8ICdObyc7XG4gICAgICAgIGNvbnN0IGFtb3VudCA9IGFyZ3MuYW1vdW50IGFzIG51bWJlcjtcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgIXNpZGUgfHwgYW1vdW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBzaWRlLCBhbmQgYW1vdW50IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHF1b3RlID0gYXdhaXQgZ2V0UXVvdGUobWFya2V0LCBzaWRlLCBhbW91bnQpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgcXVvdGUgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gUkFDRSBNQVJLRVRTXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2xpc3RfcmFjZV9tYXJrZXRzJzoge1xuICAgICAgICBjb25zdCBzdGF0dXMgPSBhcmdzLnN0YXR1cyBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1hcmtldHMgPSBhd2FpdCBsaXN0UmFjZU1hcmtldHMoc3RhdHVzKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgY291bnQ6IG1hcmtldHMubGVuZ3RoLFxuICAgICAgICAgIG1hcmtldHM6IG1hcmtldHMubWFwKG0gPT4gKHtcbiAgICAgICAgICAgIHB1YmxpY0tleTogbS5wdWJsaWNLZXksXG4gICAgICAgICAgICBtYXJrZXRJZDogbS5tYXJrZXRJZCxcbiAgICAgICAgICAgIHF1ZXN0aW9uOiBtLnF1ZXN0aW9uLFxuICAgICAgICAgICAgc3RhdHVzOiBtLnN0YXR1cyxcbiAgICAgICAgICAgIG91dGNvbWVDb3VudDogbS5vdXRjb21lcy5sZW5ndGgsXG4gICAgICAgICAgICBvdXRjb21lczogbS5vdXRjb21lcyxcbiAgICAgICAgICAgIHRvdGFsUG9vbFNvbDogbS50b3RhbFBvb2xTb2wsXG4gICAgICAgICAgICBjbG9zaW5nVGltZTogbS5jbG9zaW5nVGltZSxcbiAgICAgICAgICAgIGlzQmV0dGluZ09wZW46IG0uaXNCZXR0aW5nT3BlbixcbiAgICAgICAgICB9KSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfcmFjZV9tYXJrZXQnOiB7XG4gICAgICAgIGNvbnN0IHB1YmxpY0tleSA9IGFyZ3MucHVibGljS2V5IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFwdWJsaWNLZXkpIHJldHVybiBlcnJvclJlc3BvbnNlKCdwdWJsaWNLZXkgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXdhaXQgZ2V0UmFjZU1hcmtldChwdWJsaWNLZXkpO1xuICAgICAgICBpZiAoIW1hcmtldCkgcmV0dXJuIGVycm9yUmVzcG9uc2UoYFJhY2UgbWFya2V0ICR7cHVibGljS2V5fSBub3QgZm91bmRgKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IG1hcmtldCB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X3JhY2VfcXVvdGUnOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldFBkYSA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgb3V0Y29tZUluZGV4ID0gYXJncy5vdXRjb21lSW5kZXggYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBhbW91bnQgPSBhcmdzLmFtb3VudCBhcyBudW1iZXI7XG4gICAgICAgIGlmICghbWFya2V0UGRhIHx8IG91dGNvbWVJbmRleCA9PT0gdW5kZWZpbmVkIHx8IGFtb3VudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgb3V0Y29tZUluZGV4LCBhbmQgYW1vdW50IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGF3YWl0IGdldFJhY2VNYXJrZXQobWFya2V0UGRhKTtcbiAgICAgICAgaWYgKCFtYXJrZXQpIHJldHVybiBlcnJvclJlc3BvbnNlKCdSYWNlIG1hcmtldCBub3QgZm91bmQnKTtcbiAgICAgICAgY29uc3QgcXVvdGUgPSBnZXRSYWNlUXVvdGUobWFya2V0LCBvdXRjb21lSW5kZXgsIGFtb3VudCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBxdW90ZSwgbWFya2V0OiB7IHF1ZXN0aW9uOiBtYXJrZXQucXVlc3Rpb24sIG91dGNvbWVzOiBtYXJrZXQub3V0Y29tZXMgfSB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBQT1NJVElPTlMgJiBDTEFJTVNcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnZ2V0X3Bvc2l0aW9ucyc6IHtcbiAgICAgICAgY29uc3Qgd2FsbGV0ID0gYXJncy53YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXdhbGxldCkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3dhbGxldCBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBzdW1tYXJ5ID0gYXdhaXQgZ2V0UG9zaXRpb25zU3VtbWFyeSh3YWxsZXQpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHN1bW1hcnkpO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfY2xhaW1hYmxlJzoge1xuICAgICAgICBjb25zdCB3YWxsZXQgPSBhcmdzLndhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghd2FsbGV0KSByZXR1cm4gZXJyb3JSZXNwb25zZSgnd2FsbGV0IGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IGNsYWltYWJsZSA9IGF3YWl0IGdldENsYWltYWJsZVBvc2l0aW9ucyh3YWxsZXQpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKGNsYWltYWJsZSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gUkVTT0xVVElPTiAmIERJU1BVVEVTXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2dldF9yZXNvbHV0aW9uX3N0YXR1cyc6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBzdGF0dXMgPSBhd2FpdCBnZXRSZXNvbHV0aW9uU3RhdHVzKG1hcmtldCk7XG4gICAgICAgIGlmICghc3RhdHVzKSByZXR1cm4gZXJyb3JSZXNwb25zZSgnTWFya2V0IG5vdCBmb3VuZCcpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHN0YXR1cyk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9kaXNwdXRlZF9tYXJrZXRzJzoge1xuICAgICAgICBjb25zdCBkaXNwdXRlcyA9IGF3YWl0IGdldERpc3B1dGVkTWFya2V0cygpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgY291bnQ6IGRpc3B1dGVzLmxlbmd0aCwgZGlzcHV0ZXMgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9tYXJrZXRzX2F3YWl0aW5nX3Jlc29sdXRpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldHMgPSBhd2FpdCBnZXRNYXJrZXRzQXdhaXRpbmdSZXNvbHV0aW9uKCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIGNvdW50OiBtYXJrZXRzLmxlbmd0aCxcbiAgICAgICAgICBtYXJrZXRzOiBtYXJrZXRzLm1hcChtID0+ICh7XG4gICAgICAgICAgICBwdWJsaWNLZXk6IG0ucHVibGljS2V5LFxuICAgICAgICAgICAgcXVlc3Rpb246IG0ucXVlc3Rpb24sXG4gICAgICAgICAgICBjbG9zaW5nVGltZTogbS5jbG9zaW5nVGltZSxcbiAgICAgICAgICAgIHJlc29sdXRpb25UaW1lOiBtLnJlc29sdXRpb25UaW1lLFxuICAgICAgICAgIH0pKSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gQUkgQUdFTlQgQUZGSUxJQVRFIE5FVFdPUktcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnY2hlY2tfYWZmaWxpYXRlX2NvZGUnOiB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBhcmdzLmNvZGUgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIWNvZGUpIHJldHVybiBlcnJvclJlc3BvbnNlKCdjb2RlIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZSA9IGF3YWl0IGlzQWZmaWxpYXRlQ29kZUF2YWlsYWJsZShjb2RlKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IGNvZGUsIGF2YWlsYWJsZSB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnc3VnZ2VzdF9hZmZpbGlhdGVfY29kZXMnOiB7XG4gICAgICAgIGNvbnN0IGFnZW50TmFtZSA9IGFyZ3MuYWdlbnROYW1lIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY291bnQgPSAoYXJncy5jb3VudCBhcyBudW1iZXIpIHx8IDU7XG4gICAgICAgIGlmICghYWdlbnROYW1lKSByZXR1cm4gZXJyb3JSZXNwb25zZSgnYWdlbnROYW1lIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IHN1Z2dlc3Rpb25zID0gYXdhaXQgc3VnZ2VzdEFmZmlsaWF0ZUNvZGVzKGFnZW50TmFtZSwgY291bnQpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgc3VnZ2VzdGlvbnMgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9hZmZpbGlhdGVfaW5mbyc6IHtcbiAgICAgICAgY29uc3QgY29kZSA9IGFyZ3MuY29kZSBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghY29kZSkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2NvZGUgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3QgYWZmaWxpYXRlID0gYXdhaXQgZ2V0QWZmaWxpYXRlQnlDb2RlKGNvZGUpO1xuICAgICAgICBpZiAoIWFmZmlsaWF0ZSkgcmV0dXJuIGVycm9yUmVzcG9uc2UoYEFmZmlsaWF0ZSAke2NvZGV9IG5vdCBmb3VuZGApO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgYWZmaWxpYXRlIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfbXlfYWZmaWxpYXRlcyc6IHtcbiAgICAgICAgY29uc3Qgd2FsbGV0ID0gYXJncy53YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXdhbGxldCkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3dhbGxldCBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBhZmZpbGlhdGVzID0gYXdhaXQgZ2V0QWZmaWxpYXRlc0J5T3duZXIod2FsbGV0KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IGNvdW50OiBhZmZpbGlhdGVzLmxlbmd0aCwgYWZmaWxpYXRlcyB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X3JlZmVycmFscyc6IHtcbiAgICAgICAgY29uc3QgY29kZSA9IGFyZ3MuY29kZSBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghY29kZSkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2NvZGUgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3QgcmVmZXJyYWxzID0gYXdhaXQgZ2V0UmVmZXJyYWxzQnlBZmZpbGlhdGUoY29kZSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBjb3VudDogcmVmZXJyYWxzLmxlbmd0aCwgcmVmZXJyYWxzIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfYWdlbnRfbmV0d29ya19zdGF0cyc6IHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBnZXRBZ2VudE5ldHdvcmtTdGF0cygpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHN0YXRzKTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZm9ybWF0X2FmZmlsaWF0ZV9saW5rJzoge1xuICAgICAgICBjb25zdCBjb2RlID0gYXJncy5jb2RlIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAoIWNvZGUpIHJldHVybiBlcnJvclJlc3BvbnNlKCdjb2RlIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IGxpbmsgPSBmb3JtYXRBZmZpbGlhdGVMaW5rKGNvZGUsIG1hcmtldCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBsaW5rLCBjb2RlLCBtYXJrZXQgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9jb21taXNzaW9uX2luZm8nOiB7XG4gICAgICAgIGNvbnN0IGluZm8gPSBnZXRDb21taXNzaW9uSW5mbygpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKGluZm8pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFZBTElEQVRJT05cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAndmFsaWRhdGVfbWFya2V0X3BhcmFtcyc6IHtcbiAgICAgICAgY29uc3QgcGFyYW1zOiBNYXJrZXRUaW1pbmdQYXJhbXMgPSB7XG4gICAgICAgICAgcXVlc3Rpb246IGFyZ3MucXVlc3Rpb24gYXMgc3RyaW5nLFxuICAgICAgICAgIGNsb3NpbmdUaW1lOiBuZXcgRGF0ZShhcmdzLmNsb3NpbmdfdGltZSBhcyBzdHJpbmcpLFxuICAgICAgICAgIG1hcmtldFR5cGU6IGFyZ3MubWFya2V0X3R5cGUgYXMgJ2V2ZW50JyB8ICdtZWFzdXJlbWVudCcsXG4gICAgICAgICAgZXZlbnRUaW1lOiBhcmdzLmV2ZW50X3RpbWUgPyBuZXcgRGF0ZShhcmdzLmV2ZW50X3RpbWUgYXMgc3RyaW5nKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBtZWFzdXJlbWVudFN0YXJ0OiBhcmdzLm1lYXN1cmVtZW50X3N0YXJ0ID8gbmV3IERhdGUoYXJncy5tZWFzdXJlbWVudF9zdGFydCBhcyBzdHJpbmcpIDogdW5kZWZpbmVkLFxuICAgICAgICAgIG1lYXN1cmVtZW50RW5kOiBhcmdzLm1lYXN1cmVtZW50X2VuZCA/IG5ldyBEYXRlKGFyZ3MubWVhc3VyZW1lbnRfZW5kIGFzIHN0cmluZykgOiB1bmRlZmluZWQsXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSB2YWxpZGF0ZU1hcmtldFRpbWluZyhwYXJhbXMpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgdmFsaWRhdGlvbiwgcnVsZXM6IFRJTUlORyB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAndmFsaWRhdGVfYmV0Jzoge1xuICAgICAgICBjb25zdCBtYXJrZXRQdWJrZXkgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGFtb3VudCA9IGFyZ3MuYW1vdW50IGFzIG51bWJlcjtcbiAgICAgICAgY29uc3Qgc2lkZSA9IGFyZ3Muc2lkZSBhcyAnWWVzJyB8ICdObyc7XG4gICAgICAgIGlmICghbWFya2V0UHVia2V5IHx8IGFtb3VudCA9PT0gdW5kZWZpbmVkIHx8ICFzaWRlKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgYW1vdW50LCBhbmQgc2lkZSBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXJrZXREYXRhID0gYXdhaXQgZ2V0TWFya2V0Rm9yQmV0dGluZyhtYXJrZXRQdWJrZXkpO1xuICAgICAgICBpZiAoIW1hcmtldERhdGEgfHwgIW1hcmtldERhdGEubWFya2V0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoYE1hcmtldCAke21hcmtldFB1YmtleX0gbm90IGZvdW5kYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgeyBtYXJrZXQgfSA9IG1hcmtldERhdGE7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSB2YWxpZGF0ZUJldCh7XG4gICAgICAgICAgYW1vdW50U29sOiBhbW91bnQsXG4gICAgICAgICAgbWFya2V0U3RhdHVzOiBtYXJrZXQuc3RhdHVzQ29kZSxcbiAgICAgICAgICBjbG9zaW5nVGltZTogbmV3IERhdGUobWFya2V0LmNsb3NpbmdUaW1lKSxcbiAgICAgICAgICBpc1BhdXNlZDogZmFsc2UsXG4gICAgICAgICAgYWNjZXNzR2F0ZTogbWFya2V0LmFjY2Vzc0dhdGUgPT09ICdXaGl0ZWxpc3QnID8gMSA6IDAsXG4gICAgICAgICAgbGF5ZXI6IG1hcmtldC5sYXllckNvZGUsXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBxdW90ZSA9IGNhbGN1bGF0ZUJldFF1b3RlKHtcbiAgICAgICAgICBiZXRBbW91bnRTb2w6IGFtb3VudCxcbiAgICAgICAgICBzaWRlLFxuICAgICAgICAgIGN1cnJlbnRZZXNQb29sOiBtYXJrZXQueWVzUG9vbFNvbCxcbiAgICAgICAgICBjdXJyZW50Tm9Qb29sOiBtYXJrZXQubm9Qb29sU29sLFxuICAgICAgICAgIHBsYXRmb3JtRmVlQnBzOiBtYXJrZXQucGxhdGZvcm1GZWVCcHMsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgdmFsaWRhdGlvbiwgbWFya2V0OiB7IHB1YmxpY0tleTogbWFya2V0UHVia2V5LCBxdWVzdGlvbjogbWFya2V0LnF1ZXN0aW9uLCBzdGF0dXM6IG1hcmtldC5zdGF0dXMgfSwgcXVvdGU6IHZhbGlkYXRpb24udmFsaWQgPyBxdW90ZSA6IG51bGwgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBCRVRTXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2J1aWxkX2JldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0UHVia2V5ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBvdXRjb21lID0gYXJncy5vdXRjb21lIGFzICd5ZXMnIHwgJ25vJztcbiAgICAgICAgY29uc3QgYW1vdW50U29sID0gYXJncy5hbW91bnRfc29sIGFzIG51bWJlcjtcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldFB1YmtleSB8fCAhb3V0Y29tZSB8fCBhbW91bnRTb2wgPT09IHVuZGVmaW5lZCB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIG91dGNvbWUsIGFtb3VudF9zb2wsIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYW1vdW50U29sIDwgQkVUX0xJTUlUUy5NSU5fQkVUX1NPTCB8fCBhbW91bnRTb2wgPiBCRVRfTElNSVRTLk1BWF9CRVRfU09MKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoYEFtb3VudCBtdXN0IGJlIGJldHdlZW4gJHtCRVRfTElNSVRTLk1JTl9CRVRfU09MfSBhbmQgJHtCRVRfTElNSVRTLk1BWF9CRVRfU09MfSBTT0xgKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmZXRjaEFuZEJ1aWxkQmV0VHJhbnNhY3Rpb24oeyBtYXJrZXRQZGE6IG1hcmtldFB1YmtleSwgdXNlcldhbGxldCwgb3V0Y29tZSwgYW1vdW50U29sIH0pO1xuICAgICAgICBpZiAocmVzdWx0LmVycm9yIHx8ICFyZXN1bHQudHJhbnNhY3Rpb24pIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShyZXN1bHQuZXJyb3IgfHwgJ0ZhaWxlZCB0byBidWlsZCB0cmFuc2FjdGlvbicpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbm5lY3Rpb24gPSBuZXcgQ29ubmVjdGlvbihSUENfRU5EUE9JTlQsICdjb25maXJtZWQnKTtcbiAgICAgICAgY29uc3Qgc2ltdWxhdGlvbiA9IGF3YWl0IHNpbXVsYXRlQmV0VHJhbnNhY3Rpb24ocmVzdWx0LnRyYW5zYWN0aW9uLnRyYW5zYWN0aW9uLCBuZXcgUHVibGljS2V5KHVzZXJXYWxsZXQpLCBjb25uZWN0aW9uKTtcbiAgICAgICAgY29uc3QgcXVvdGUgPSBhd2FpdCBnZXRRdW90ZShtYXJrZXRQdWJrZXksIG91dGNvbWUgPT09ICd5ZXMnID8gJ1llcycgOiAnTm8nLCBhbW91bnRTb2wpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQudHJhbnNhY3Rpb24uc2VyaWFsaXplZFR4LCBwb3NpdGlvblBkYTogcmVzdWx0LnRyYW5zYWN0aW9uLnBvc2l0aW9uUGRhLnRvQmFzZTU4KCkgfSxcbiAgICAgICAgICBzaW11bGF0aW9uOiB7IHN1Y2Nlc3M6IHNpbXVsYXRpb24uc3VjY2VzcywgdW5pdHNDb25zdW1lZDogc2ltdWxhdGlvbi51bml0c0NvbnN1bWVkLCBlcnJvcjogc2ltdWxhdGlvbi5lcnJvciB9LFxuICAgICAgICAgIHF1b3RlOiBxdW90ZS52YWxpZCA/IHsgZXhwZWN0ZWRQYXlvdXRTb2w6IHF1b3RlLmV4cGVjdGVkUGF5b3V0U29sLCBwb3RlbnRpYWxQcm9maXRTb2w6IHF1b3RlLnBvdGVudGlhbFByb2ZpdFNvbCB9IDogbnVsbCxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRoZSB0cmFuc2FjdGlvbiB3aXRoIHlvdXIgd2FsbGV0IGFuZCBzZW5kIHRvIFNvbGFuYSBuZXR3b3JrJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3JhY2VfYmV0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXRQdWJrZXkgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG91dGNvbWVJbmRleCA9IGFyZ3Mub3V0Y29tZV9pbmRleCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IGFtb3VudFNvbCA9IGFyZ3MuYW1vdW50X3NvbCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXRQdWJrZXkgfHwgb3V0Y29tZUluZGV4ID09PSB1bmRlZmluZWQgfHwgYW1vdW50U29sID09PSB1bmRlZmluZWQgfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBvdXRjb21lX2luZGV4LCBhbW91bnRfc29sLCBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZmV0Y2hBbmRCdWlsZFJhY2VCZXRUcmFuc2FjdGlvbih7IHJhY2VNYXJrZXRQZGE6IG1hcmtldFB1YmtleSwgb3V0Y29tZUluZGV4LCBhbW91bnRTb2wsIHVzZXJXYWxsZXQgfSk7XG4gICAgICAgIGlmIChyZXN1bHQuZXJyb3IgfHwgIXJlc3VsdC50cmFuc2FjdGlvbikge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKHJlc3VsdC5lcnJvciB8fCAnRmFpbGVkIHRvIGJ1aWxkIHRyYW5zYWN0aW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnRyYW5zYWN0aW9uLnNlcmlhbGl6ZWRUeCwgcG9zaXRpb25QZGE6IHJlc3VsdC50cmFuc2FjdGlvbi5wb3NpdGlvblBkYSB9LFxuICAgICAgICAgIG1hcmtldElkOiByZXN1bHQubWFya2V0SWQudG9TdHJpbmcoKSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRoZSB0cmFuc2FjdGlvbiB3aXRoIHlvdXIgd2FsbGV0IGFuZCBzZW5kIHRvIFNvbGFuYSBuZXR3b3JrJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBDTEFJTVNcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnYnVpbGRfY2xhaW1fd2lubmluZ3NfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBhcmdzLnBvc2l0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhcG9zaXRpb24gfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBwb3NpdGlvbiwgYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2xhaW1XaW5uaW5nc1RyYW5zYWN0aW9uKHsgbWFya2V0UGRhOiBtYXJrZXQsIHBvc2l0aW9uUGRhOiBwb3NpdGlvbiwgdXNlcldhbGxldCB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHgsIGNsYWltVHlwZTogcmVzdWx0LmNsYWltVHlwZSB9LCBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNsYWltIHlvdXIgd2lubmluZ3MnIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jbGFpbV9yZWZ1bmRfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBhcmdzLnBvc2l0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhcG9zaXRpb24gfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBwb3NpdGlvbiwgYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2xhaW1SZWZ1bmRUcmFuc2FjdGlvbih7IG1hcmtldFBkYTogbWFya2V0LCBwb3NpdGlvblBkYTogcG9zaXRpb24sIHVzZXJXYWxsZXQgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4LCBjbGFpbVR5cGU6IHJlc3VsdC5jbGFpbVR5cGUgfSwgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBjbGFpbSB5b3VyIHJlZnVuZCcgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2JhdGNoX2NsYWltX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBjbGFpbXMgPSBhcmdzLmNsYWltcyBhcyBBcnJheTx7IG1hcmtldDogc3RyaW5nOyBwb3NpdGlvbjogc3RyaW5nOyB0eXBlOiAnd2lubmluZ3MnIHwgJ3JlZnVuZCcgfT47XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFjbGFpbXMgfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnY2xhaW1zIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEJhdGNoQ2xhaW1UcmFuc2FjdGlvbih7XG4gICAgICAgICAgY2xhaW1zOiBjbGFpbXMubWFwKGMgPT4gKHsgbWFya2V0UGRhOiBjLm1hcmtldCwgcG9zaXRpb25QZGE6IGMucG9zaXRpb24sIGNsYWltVHlwZTogYy50eXBlIH0pKSxcbiAgICAgICAgICB1c2VyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHgsIGNsYWltQ291bnQ6IHJlc3VsdC5jbGFpbUNvdW50IH0sIGluc3RydWN0aW9uczogYFNpZ24gdG8gY2xhaW0gJHtyZXN1bHQuY2xhaW1Db3VudH0gcG9zaXRpb25zYCB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY2xhaW1fYWZmaWxpYXRlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBjb2RlID0gYXJncy5jb2RlIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIWNvZGUgfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnY29kZSBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDbGFpbUFmZmlsaWF0ZVRyYW5zYWN0aW9uKHsgYWZmaWxpYXRlQ29kZTogY29kZSwgdXNlcldhbGxldCB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHgsIGNsYWltVHlwZTogcmVzdWx0LmNsYWltVHlwZSB9LCBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNsYWltIGFmZmlsaWF0ZSBlYXJuaW5ncycgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBSQUNFIENMQUlNU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdidWlsZF9jbGFpbV9yYWNlX3dpbm5pbmdzX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gYXJncy5wb3NpdGlvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICFwb3NpdGlvbiB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgcG9zaXRpb24sIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENsYWltUmFjZVdpbm5pbmdzVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgcG9zaXRpb25QZGE6IHBvc2l0aW9uLFxuICAgICAgICAgIHVzZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBjbGFpbSByYWNlIG1hcmtldCB3aW5uaW5ncycsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jbGFpbV9yYWNlX3JlZnVuZF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IGFyZ3MucG9zaXRpb24gYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyV2FsbGV0ID0gYXJncy51c2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCAhcG9zaXRpb24gfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIHBvc2l0aW9uLCBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDbGFpbVJhY2VSZWZ1bmRUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICBwb3NpdGlvblBkYTogcG9zaXRpb24sXG4gICAgICAgICAgdXNlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNsYWltIHJhY2UgbWFya2V0IHJlZnVuZCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFRSQU5TQUNUSU9OIEJVSUxESU5HIC0gQUZGSUxJQVRFXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2J1aWxkX3JlZ2lzdGVyX2FmZmlsaWF0ZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgY29kZSA9IGFyZ3MuY29kZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFjb2RlIHx8ICF1c2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2NvZGUgYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZSA9IGF3YWl0IGlzQWZmaWxpYXRlQ29kZUF2YWlsYWJsZShjb2RlKTtcbiAgICAgICAgaWYgKCFhdmFpbGFibGUpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShgQWZmaWxpYXRlIGNvZGUgXCIke2NvZGV9XCIgaXMgYWxyZWFkeSB0YWtlbmApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkUmVnaXN0ZXJBZmZpbGlhdGVUcmFuc2FjdGlvbih7IGNvZGUsIHVzZXJXYWxsZXQgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHgsIGFmZmlsaWF0ZVBkYTogcmVzdWx0LmFmZmlsaWF0ZVBkYSB9LFxuICAgICAgICAgIGNvZGU6IHJlc3VsdC5jb2RlLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gcmVnaXN0ZXIgYXMgYWZmaWxpYXRlJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3RvZ2dsZV9hZmZpbGlhdGVfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBhcmdzLmNvZGUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBhY3RpdmUgPSBhcmdzLmFjdGl2ZSBhcyBib29sZWFuO1xuICAgICAgICBjb25zdCB1c2VyV2FsbGV0ID0gYXJncy51c2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghY29kZSB8fCBhY3RpdmUgPT09IHVuZGVmaW5lZCB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdjb2RlLCBhY3RpdmUsIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFRvZ2dsZUFmZmlsaWF0ZVRyYW5zYWN0aW9uKHsgY29kZSwgYWN0aXZlLCB1c2VyV2FsbGV0IH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4LCBhZmZpbGlhdGVQZGE6IHJlc3VsdC5hZmZpbGlhdGVQZGEgfSxcbiAgICAgICAgICBuZXdTdGF0dXM6IHJlc3VsdC5uZXdTdGF0dXMsXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBgU2lnbiB0byAke2FjdGl2ZSA/ICdhY3RpdmF0ZScgOiAnZGVhY3RpdmF0ZSd9IGFmZmlsaWF0ZWAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFNJTVVMQVRJT05cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnc2ltdWxhdGVfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHR4QmFzZTY0ID0gYXJncy50cmFuc2FjdGlvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCF0eEJhc2U2NCB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCd0cmFuc2FjdGlvbiBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29ubmVjdGlvbiA9IG5ldyBDb25uZWN0aW9uKFJQQ19FTkRQT0lOVCwgJ2NvbmZpcm1lZCcpO1xuICAgICAgICBjb25zdCB0eEJ1ZmZlciA9IEJ1ZmZlci5mcm9tKHR4QmFzZTY0LCAnYmFzZTY0Jyk7XG4gICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gVHJhbnNhY3Rpb24uZnJvbSh0eEJ1ZmZlcik7XG4gICAgICAgIGNvbnN0IHNpbXVsYXRpb24gPSBhd2FpdCBjb25uZWN0aW9uLnNpbXVsYXRlVHJhbnNhY3Rpb24odHJhbnNhY3Rpb24pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBzaW11bGF0aW9uOiB7XG4gICAgICAgICAgICBzdWNjZXNzOiAhc2ltdWxhdGlvbi52YWx1ZS5lcnIsXG4gICAgICAgICAgICBlcnJvcjogc2ltdWxhdGlvbi52YWx1ZS5lcnIgPyBKU09OLnN0cmluZ2lmeShzaW11bGF0aW9uLnZhbHVlLmVycikgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICB1bml0c0NvbnN1bWVkOiBzaW11bGF0aW9uLnZhbHVlLnVuaXRzQ29uc3VtZWQsXG4gICAgICAgICAgICBsb2dzOiBzaW11bGF0aW9uLnZhbHVlLmxvZ3MsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gTUFSS0VUIENSRUFUSU9OXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ3ByZXZpZXdfY3JlYXRlX21hcmtldCc6IHtcbiAgICAgICAgY29uc3QgcXVlc3Rpb24gPSBhcmdzLnF1ZXN0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbGF5ZXIgPSBhcmdzLmxheWVyIGFzICdsYWInIHwgJ3ByaXZhdGUnO1xuICAgICAgICBjb25zdCBjbG9zaW5nVGltZSA9IGFyZ3MuY2xvc2luZ190aW1lIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgcmVzb2x1dGlvblRpbWUgPSBhcmdzLnJlc29sdXRpb25fdGltZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1hcmtldFR5cGUgPSBhcmdzLm1hcmtldF90eXBlIGFzICdldmVudCcgfCAnbWVhc3VyZW1lbnQnIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBldmVudFRpbWUgPSBhcmdzLmV2ZW50X3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBtZWFzdXJlbWVudFN0YXJ0ID0gYXJncy5tZWFzdXJlbWVudF9zdGFydCBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1lYXN1cmVtZW50RW5kID0gYXJncy5tZWFzdXJlbWVudF9lbmQgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG5cbiAgICAgICAgaWYgKCFxdWVzdGlvbiB8fCAhbGF5ZXIgfHwgIWNsb3NpbmdUaW1lIHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3F1ZXN0aW9uLCBsYXllciwgY2xvc2luZ190aW1lLCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmV2aWV3ID0gYXdhaXQgcHJldmlld01hcmtldENyZWF0aW9uKHtcbiAgICAgICAgICBxdWVzdGlvbixcbiAgICAgICAgICBsYXllcixcbiAgICAgICAgICBjbG9zaW5nVGltZSxcbiAgICAgICAgICByZXNvbHV0aW9uVGltZSxcbiAgICAgICAgICBtYXJrZXRUeXBlLFxuICAgICAgICAgIGV2ZW50VGltZSxcbiAgICAgICAgICBtZWFzdXJlbWVudFN0YXJ0LFxuICAgICAgICAgIG1lYXN1cmVtZW50RW5kLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHByZXZpZXcsXG4gICAgICAgICAgdGltaW5nOiB7XG4gICAgICAgICAgICBydWxlczogVElNSU5HLFxuICAgICAgICAgICAgcnVsZUFwcGxpZWQ6IHByZXZpZXcudmFsaWRhdGlvbi5jb21wdXRlZC5ydWxlVHlwZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY3JlYXRlX2xhYl9tYXJrZXRfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHF1ZXN0aW9uID0gYXJncy5xdWVzdGlvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNsb3NpbmdUaW1lID0gYXJncy5jbG9zaW5nX3RpbWUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCByZXNvbHV0aW9uVGltZSA9IGFyZ3MucmVzb2x1dGlvbl90aW1lIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgbWFya2V0VHlwZSA9IGFyZ3MubWFya2V0X3R5cGUgYXMgJ2V2ZW50JyB8ICdtZWFzdXJlbWVudCcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGV2ZW50VGltZSA9IGFyZ3MuZXZlbnRfdGltZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGludml0ZUhhc2ggPSBhcmdzLmludml0ZV9oYXNoIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuXG4gICAgICAgIGlmICghcXVlc3Rpb24gfHwgIWNsb3NpbmdUaW1lIHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3F1ZXN0aW9uLCBjbG9zaW5nX3RpbWUsIGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZUxhYk1hcmtldCh7XG4gICAgICAgICAgcXVlc3Rpb24sXG4gICAgICAgICAgbGF5ZXI6ICdsYWInLFxuICAgICAgICAgIGNsb3NpbmdUaW1lLFxuICAgICAgICAgIHJlc29sdXRpb25UaW1lLFxuICAgICAgICAgIG1hcmtldFR5cGUsXG4gICAgICAgICAgZXZlbnRUaW1lLFxuICAgICAgICAgIGludml0ZUhhc2gsXG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKHJlc3VsdC5lcnJvciB8fCAnVmFsaWRhdGlvbiBmYWlsZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiByZXN1bHQudHJhbnNhY3Rpb24sXG4gICAgICAgICAgdmFsaWRhdGlvbjogcmVzdWx0LnZhbGlkYXRpb24sXG4gICAgICAgICAgc2ltdWxhdGlvbjogcmVzdWx0LnNpbXVsYXRpb24sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0aGUgdHJhbnNhY3Rpb24gd2l0aCB5b3VyIHdhbGxldCB0byBjcmVhdGUgdGhlIG1hcmtldCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jcmVhdGVfcHJpdmF0ZV9tYXJrZXRfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHF1ZXN0aW9uID0gYXJncy5xdWVzdGlvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNsb3NpbmdUaW1lID0gYXJncy5jbG9zaW5nX3RpbWUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCByZXNvbHV0aW9uVGltZSA9IGFyZ3MucmVzb2x1dGlvbl90aW1lIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgbWFya2V0VHlwZSA9IGFyZ3MubWFya2V0X3R5cGUgYXMgJ2V2ZW50JyB8ICdtZWFzdXJlbWVudCcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGV2ZW50VGltZSA9IGFyZ3MuZXZlbnRfdGltZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGludml0ZUhhc2ggPSBhcmdzLmludml0ZV9oYXNoIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuXG4gICAgICAgIGlmICghcXVlc3Rpb24gfHwgIWNsb3NpbmdUaW1lIHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3F1ZXN0aW9uLCBjbG9zaW5nX3RpbWUsIGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZVByaXZhdGVNYXJrZXQoe1xuICAgICAgICAgIHF1ZXN0aW9uLFxuICAgICAgICAgIGxheWVyOiAncHJpdmF0ZScsXG4gICAgICAgICAgY2xvc2luZ1RpbWUsXG4gICAgICAgICAgcmVzb2x1dGlvblRpbWUsXG4gICAgICAgICAgbWFya2V0VHlwZSxcbiAgICAgICAgICBldmVudFRpbWUsXG4gICAgICAgICAgaW52aXRlSGFzaCxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UocmVzdWx0LmVycm9yIHx8ICdWYWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHJlc3VsdC50cmFuc2FjdGlvbixcbiAgICAgICAgICB2YWxpZGF0aW9uOiByZXN1bHQudmFsaWRhdGlvbixcbiAgICAgICAgICBzaW11bGF0aW9uOiByZXN1bHQuc2ltdWxhdGlvbixcbiAgICAgICAgICBpbnZpdGVIYXNoOiBpbnZpdGVIYXNoIHx8ICdHZW5lcmF0ZSB3aXRoIGdlbmVyYXRlX2ludml0ZV9oYXNoIHRvb2wnLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdGhlIHRyYW5zYWN0aW9uIHdpdGggeW91ciB3YWxsZXQgdG8gY3JlYXRlIHRoZSBwcml2YXRlIG1hcmtldCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jcmVhdGVfcmFjZV9tYXJrZXRfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHF1ZXN0aW9uID0gYXJncy5xdWVzdGlvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG91dGNvbWVzID0gYXJncy5vdXRjb21lcyBhcyBzdHJpbmdbXTtcbiAgICAgICAgY29uc3QgY2xvc2luZ1RpbWUgPSBhcmdzLmNsb3NpbmdfdGltZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHJlc29sdXRpb25UaW1lID0gYXJncy5yZXNvbHV0aW9uX3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG5cbiAgICAgICAgaWYgKCFxdWVzdGlvbiB8fCAhb3V0Y29tZXMgfHwgIWNsb3NpbmdUaW1lIHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3F1ZXN0aW9uLCBvdXRjb21lcywgY2xvc2luZ190aW1lLCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3V0Y29tZXMubGVuZ3RoIDwgMiB8fCBvdXRjb21lcy5sZW5ndGggPiAxMCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdvdXRjb21lcyBtdXN0IGhhdmUgMi0xMCBlbnRyaWVzJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjcmVhdGVSYWNlTWFya2V0KHtcbiAgICAgICAgICBxdWVzdGlvbixcbiAgICAgICAgICBvdXRjb21lcyxcbiAgICAgICAgICBjbG9zaW5nVGltZSxcbiAgICAgICAgICByZXNvbHV0aW9uVGltZSxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UocmVzdWx0LmVycm9yIHx8ICdWYWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHJlc3VsdC50cmFuc2FjdGlvbixcbiAgICAgICAgICB2YWxpZGF0aW9uOiByZXN1bHQudmFsaWRhdGlvbixcbiAgICAgICAgICBzaW11bGF0aW9uOiByZXN1bHQuc2ltdWxhdGlvbixcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRoZSB0cmFuc2FjdGlvbiB3aXRoIHlvdXIgd2FsbGV0IHRvIGNyZWF0ZSB0aGUgcmFjZSBtYXJrZXQnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X2NyZWF0aW9uX2ZlZXMnOiB7XG4gICAgICAgIGNvbnN0IGZlZXMgPSBnZXRBbGxDcmVhdGlvbkZlZXMoKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgZmVlcyxcbiAgICAgICAgICBub3RlOiAnQ3JlYXRpb24gZmVlIGlzIHBhaWQgd2hlbiBjcmVhdGluZyBhIG1hcmtldC4gU2VwYXJhdGUgZnJvbSBwbGF0Zm9ybSBmZWVzIG9uIGJldHMuJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9wbGF0Zm9ybV9mZWVzJzoge1xuICAgICAgICBjb25zdCBmZWVzID0gZ2V0QWxsUGxhdGZvcm1GZWVzKCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIGZlZXMsXG4gICAgICAgICAgbm90ZTogJ1BsYXRmb3JtIGZlZSBpcyBkZWR1Y3RlZCBmcm9tIGdyb3NzIHdpbm5pbmdzIHdoZW4gY2xhaW1pbmcuIEluY2x1ZGVzIGFmZmlsaWF0ZSBhbmQgY3JlYXRvciBzaGFyZXMuJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF90aW1pbmdfcnVsZXMnOiB7XG4gICAgICAgIGNvbnN0IHJ1bGVzID0gZ2V0VGltaW5nQ29uc3RyYWludHMoKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgcnVsZXMsXG4gICAgICAgICAgcnVsZUE6IHtcbiAgICAgICAgICAgIG5hbWU6ICdFdmVudC1CYXNlZCBNYXJrZXRzJyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWFya2V0cyBhYm91dCBzcGVjaWZpYyBldmVudHMgKHNwb3J0cywgZWxlY3Rpb25zLCBldGMuKScsXG4gICAgICAgICAgICByZXF1aXJlbWVudDogYEJldHRpbmcgbXVzdCBjbG9zZSAke3J1bGVzLm1pbkV2ZW50QnVmZmVySG91cnN9KyBob3VycyBiZWZvcmUgZXZlbnRgLFxuICAgICAgICAgICAgcmVjb21tZW5kZWQ6IGAke3J1bGVzLnJlY29tbWVuZGVkRXZlbnRCdWZmZXJIb3Vyc30gaG91cnMgYnVmZmVyIGZvciBzYWZldHlgLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcnVsZUI6IHtcbiAgICAgICAgICAgIG5hbWU6ICdNZWFzdXJlbWVudC1QZXJpb2QgTWFya2V0cycsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01hcmtldHMgYWJvdXQgbWVhc3VyZWQgdmFsdWVzIG92ZXIgdGltZSAocHJpY2VzLCB0ZW1wZXJhdHVyZXMsIGV0Yy4pJyxcbiAgICAgICAgICAgIHJlcXVpcmVtZW50OiAnQmV0dGluZyBtdXN0IGNsb3NlIEJFRk9SRSBtZWFzdXJlbWVudCBwZXJpb2Qgc3RhcnRzJyxcbiAgICAgICAgICAgIHJlYXNvbjogJ1ByZXZlbnRzIGluZm9ybWF0aW9uIGFkdmFudGFnZSBkdXJpbmcgbWVhc3VyZW1lbnQnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZW5lcmF0ZV9pbnZpdGVfaGFzaCc6IHtcbiAgICAgICAgY29uc3QgaGFzaCA9IGdlbmVyYXRlSW52aXRlSGFzaCgpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBpbnZpdGVIYXNoOiBoYXNoLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1VzZSB0aGlzIGhhc2ggd2hlbiBjcmVhdGluZyBhIHByaXZhdGUgbWFya2V0LiBTaGFyZSB3aXRoIGludml0ZWQgcGFydGljaXBhbnRzLicsXG4gICAgICAgICAgbm90ZTogJ0FueW9uZSB3aXRoIHRoaXMgaGFzaCBjYW4gYmV0IG9uIHRoZSBwcml2YXRlIG1hcmtldC4nLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBSRVNPTFVUSU9OIFNZU1RFTVxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdidWlsZF9wcm9wb3NlX3Jlc29sdXRpb25fdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgb3V0Y29tZSA9IGFyZ3Mub3V0Y29tZSBhcyBib29sZWFuO1xuICAgICAgICBjb25zdCBwcm9wb3NlcldhbGxldCA9IGFyZ3MucHJvcG9zZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgb3V0Y29tZSA9PT0gdW5kZWZpbmVkIHx8ICFwcm9wb3NlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIG91dGNvbWUsIGFuZCBwcm9wb3Nlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRQcm9wb3NlUmVzb2x1dGlvblRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICBvdXRjb21lLFxuICAgICAgICAgIHByb3Bvc2VyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogYFNpZ24gdG8gcHJvcG9zZSAke291dGNvbWUgPyAnWUVTJyA6ICdOTyd9IGFzIHRoZSBvdXRjb21lYCxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3Jlc29sdmVfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG91dGNvbWUgPSBhcmdzLm91dGNvbWUgYXMgYm9vbGVhbjtcbiAgICAgICAgY29uc3QgcmVzb2x2ZXJXYWxsZXQgPSBhcmdzLnJlc29sdmVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8IG91dGNvbWUgPT09IHVuZGVmaW5lZCB8fCAhcmVzb2x2ZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBvdXRjb21lLCBhbmQgcmVzb2x2ZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkUmVzb2x2ZU1hcmtldFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICBvdXRjb21lLFxuICAgICAgICAgIHJlc29sdmVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogYFNpZ24gdG8gcmVzb2x2ZSBtYXJrZXQgYXMgJHtvdXRjb21lID8gJ1lFUycgOiAnTk8nfWAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9maW5hbGl6ZV9yZXNvbHV0aW9uX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNhbGxlcldhbGxldCA9IGFyZ3MuY2FsbGVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICFjYWxsZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0IGFuZCBjYWxsZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkRmluYWxpemVSZXNvbHV0aW9uVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIGNhbGxlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGZpbmFsaXplIHRoZSByZXNvbHV0aW9uJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3Byb3Bvc2VfcmFjZV9yZXNvbHV0aW9uX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHdpbm5pbmdPdXRjb21lSW5kZXggPSBhcmdzLndpbm5pbmdfb3V0Y29tZV9pbmRleCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IHByb3Bvc2VyV2FsbGV0ID0gYXJncy5wcm9wb3Nlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgd2lubmluZ091dGNvbWVJbmRleCA9PT0gdW5kZWZpbmVkIHx8ICFwcm9wb3NlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgd2lubmluZ19vdXRjb21lX2luZGV4LCBhbmQgcHJvcG9zZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkUHJvcG9zZVJhY2VSZXNvbHV0aW9uVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgd2lubmluZ091dGNvbWVJbmRleCxcbiAgICAgICAgICBwcm9wb3NlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6IGBTaWduIHRvIHByb3Bvc2Ugb3V0Y29tZSAjJHt3aW5uaW5nT3V0Y29tZUluZGV4fSBhcyB3aW5uZXJgLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfcmVzb2x2ZV9yYWNlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHdpbm5pbmdPdXRjb21lSW5kZXggPSBhcmdzLndpbm5pbmdfb3V0Y29tZV9pbmRleCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IHJlc29sdmVyV2FsbGV0ID0gYXJncy5yZXNvbHZlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgd2lubmluZ091dGNvbWVJbmRleCA9PT0gdW5kZWZpbmVkIHx8ICFyZXNvbHZlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgd2lubmluZ19vdXRjb21lX2luZGV4LCBhbmQgcmVzb2x2ZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkUmVzb2x2ZVJhY2VUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICB3aW5uaW5nT3V0Y29tZUluZGV4LFxuICAgICAgICAgIHJlc29sdmVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogYFNpZ24gdG8gcmVzb2x2ZSByYWNlIHdpdGggb3V0Y29tZSAjJHt3aW5uaW5nT3V0Y29tZUluZGV4fWAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9maW5hbGl6ZV9yYWNlX3Jlc29sdXRpb25fdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY2FsbGVyV2FsbGV0ID0gYXJncy5jYWxsZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICFjYWxsZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQgYW5kIGNhbGxlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRGaW5hbGl6ZVJhY2VSZXNvbHV0aW9uVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgY2FsbGVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gZmluYWxpemUgcmFjZSByZXNvbHV0aW9uJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gRElTUFVURVNcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnYnVpbGRfZmxhZ19kaXNwdXRlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGRpc3B1dGVyV2FsbGV0ID0gYXJncy5kaXNwdXRlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhZGlzcHV0ZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0IGFuZCBkaXNwdXRlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRGbGFnRGlzcHV0ZVRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICBkaXNwdXRlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGRpc3B1dGUgdGhlIHJlc29sdXRpb24gKHJlcXVpcmVzIGJvbmQpJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2ZsYWdfcmFjZV9kaXNwdXRlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGRpc3B1dGVyV2FsbGV0ID0gYXJncy5kaXNwdXRlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgIWRpc3B1dGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0IGFuZCBkaXNwdXRlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRGbGFnUmFjZURpc3B1dGVUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICBkaXNwdXRlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGRpc3B1dGUgdGhlIHJhY2UgcmVzb2x1dGlvbicsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF92b3RlX2NvdW5jaWxfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgdm90ZVllcyA9IGFyZ3Mudm90ZV95ZXMgYXMgYm9vbGVhbjtcbiAgICAgICAgY29uc3Qgdm90ZXJXYWxsZXQgPSBhcmdzLnZvdGVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8IHZvdGVZZXMgPT09IHVuZGVmaW5lZCB8fCAhdm90ZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCB2b3RlX3llcywgYW5kIHZvdGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFZvdGVDb3VuY2lsVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIHZvdGVZZXMsXG4gICAgICAgICAgdm90ZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBgU2lnbiB0byB2b3RlICR7dm90ZVllcyA/ICdZRVMnIDogJ05PJ30gb24gdGhlIGRpc3B1dGVgLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfdm90ZV9jb3VuY2lsX3JhY2VfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgdm90ZU91dGNvbWVJbmRleCA9IGFyZ3Mudm90ZV9vdXRjb21lX2luZGV4IGFzIG51bWJlcjtcbiAgICAgICAgY29uc3Qgdm90ZXJXYWxsZXQgPSBhcmdzLnZvdGVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCB2b3RlT3V0Y29tZUluZGV4ID09PSB1bmRlZmluZWQgfHwgIXZvdGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0LCB2b3RlX291dGNvbWVfaW5kZXgsIGFuZCB2b3Rlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRWb3RlQ291bmNpbFJhY2VUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICB2b3RlT3V0Y29tZUluZGV4LFxuICAgICAgICAgIHZvdGVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogYFNpZ24gdG8gdm90ZSBmb3Igb3V0Y29tZSAjJHt2b3RlT3V0Y29tZUluZGV4fWAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFdISVRFTElTVCBNQU5BR0VNRU5UXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2J1aWxkX2FkZF90b193aGl0ZWxpc3RfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlclRvQWRkID0gYXJncy51c2VyX3RvX2FkZCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgIXVzZXJUb0FkZCB8fCAhY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIHVzZXJfdG9fYWRkLCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRBZGRUb1doaXRlbGlzdFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICB1c2VyVG9BZGQsXG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICB3aGl0ZWxpc3RQZGE6IHJlc3VsdC53aGl0ZWxpc3RQZGEsXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBhZGQgdXNlciB0byB3aGl0ZWxpc3QnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfcmVtb3ZlX2Zyb21fd2hpdGVsaXN0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJUb1JlbW92ZSA9IGFyZ3MudXNlcl90b19yZW1vdmUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICF1c2VyVG9SZW1vdmUgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCB1c2VyX3RvX3JlbW92ZSwgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkUmVtb3ZlRnJvbVdoaXRlbGlzdFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICB1c2VyVG9SZW1vdmUsXG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIHJlbW92ZSB1c2VyIGZyb20gd2hpdGVsaXN0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NyZWF0ZV9yYWNlX3doaXRlbGlzdF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCAhY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDcmVhdGVSYWNlV2hpdGVsaXN0VHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICB3aGl0ZWxpc3RQZGE6IHJlc3VsdC53aGl0ZWxpc3RQZGEsXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBjcmVhdGUgcmFjZSB3aGl0ZWxpc3QnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfYWRkX3RvX3JhY2Vfd2hpdGVsaXN0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJUb0FkZCA9IGFyZ3MudXNlcl90b19hZGQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCAhdXNlclRvQWRkIHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0LCB1c2VyX3RvX2FkZCwgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQWRkVG9SYWNlV2hpdGVsaXN0VHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgdXNlclRvQWRkLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBhZGQgdXNlciB0byByYWNlIHdoaXRlbGlzdCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9yZW1vdmVfZnJvbV9yYWNlX3doaXRlbGlzdF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyVG9SZW1vdmUgPSBhcmdzLnVzZXJfdG9fcmVtb3ZlIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgIXVzZXJUb1JlbW92ZSB8fCAhY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgdXNlcl90b19yZW1vdmUsIGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFJlbW92ZUZyb21SYWNlV2hpdGVsaXN0VHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgdXNlclRvUmVtb3ZlLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byByZW1vdmUgdXNlciBmcm9tIHJhY2Ugd2hpdGVsaXN0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gQ1JFQVRPUiBQUk9GSUxFU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdidWlsZF9jcmVhdGVfY3JlYXRvcl9wcm9maWxlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBkaXNwbGF5TmFtZSA9IGFyZ3MuZGlzcGxheV9uYW1lIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY3JlYXRvckZlZUJwcyA9IGFyZ3MuY3JlYXRvcl9mZWVfYnBzIGFzIG51bWJlcjtcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIWRpc3BsYXlOYW1lIHx8IGNyZWF0b3JGZWVCcHMgPT09IHVuZGVmaW5lZCB8fCAhY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdkaXNwbGF5X25hbWUsIGNyZWF0b3JfZmVlX2JwcywgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ3JlYXRlQ3JlYXRvclByb2ZpbGVUcmFuc2FjdGlvbih7XG4gICAgICAgICAgZGlzcGxheU5hbWUsXG4gICAgICAgICAgY3JlYXRvckZlZUJwcyxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGNyZWF0b3JQcm9maWxlUGRhOiByZXN1bHQuY3JlYXRvclByb2ZpbGVQZGEsXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBjcmVhdGUgeW91ciBjcmVhdG9yIHByb2ZpbGUnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfdXBkYXRlX2NyZWF0b3JfcHJvZmlsZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbmV3RGlzcGxheU5hbWUgPSBhcmdzLm5ld19kaXNwbGF5X25hbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBuZXdDcmVhdG9yRmVlQnBzID0gYXJncy5uZXdfY3JlYXRvcl9mZWVfYnBzIGFzIG51bWJlciB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnY3JlYXRvcl93YWxsZXQgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFVwZGF0ZUNyZWF0b3JQcm9maWxlVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG5ld0Rpc3BsYXlOYW1lLFxuICAgICAgICAgIG5ld0NyZWF0b3JGZWVCcHMsXG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIHVwZGF0ZSB5b3VyIGNyZWF0b3IgcHJvZmlsZScsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jbGFpbV9jcmVhdG9yX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdjcmVhdG9yX3dhbGxldCBpcyByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2xhaW1DcmVhdG9yVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBjbGFpbSB5b3VyIGNyZWF0b3IgZmVlcyBmcm9tIHNvbF90cmVhc3VyeScsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIE1BUktFVCBNQU5BR0VNRU5UXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2J1aWxkX2Nsb3NlX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjYWxsZXJXYWxsZXQgPSBhcmdzLmNhbGxlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhY2FsbGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCBhbmQgY2FsbGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENsb3NlTWFya2V0VHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIGNhbGxlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNsb3NlIGJldHRpbmcgb24gdGhpcyBtYXJrZXQnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfZXh0ZW5kX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBuZXdDbG9zaW5nVGltZVN0ciA9IGFyZ3MubmV3X2Nsb3NpbmdfdGltZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG5ld1Jlc29sdXRpb25UaW1lU3RyID0gYXJncy5uZXdfcmVzb2x1dGlvbl90aW1lIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgY2FsbGVyV2FsbGV0ID0gYXJncy5jYWxsZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgIW5ld0Nsb3NpbmdUaW1lU3RyIHx8ICFjYWxsZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBuZXdfY2xvc2luZ190aW1lLCBhbmQgY2FsbGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuZXdDbG9zaW5nVGltZSA9IE1hdGguZmxvb3IobmV3IERhdGUobmV3Q2xvc2luZ1RpbWVTdHIpLmdldFRpbWUoKSAvIDEwMDApO1xuICAgICAgICBjb25zdCBuZXdSZXNvbHV0aW9uVGltZSA9IG5ld1Jlc29sdXRpb25UaW1lU3RyXG4gICAgICAgICAgPyBNYXRoLmZsb29yKG5ldyBEYXRlKG5ld1Jlc29sdXRpb25UaW1lU3RyKS5nZXRUaW1lKCkgLyAxMDAwKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEV4dGVuZE1hcmtldFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICBuZXdDbG9zaW5nVGltZSxcbiAgICAgICAgICBuZXdSZXNvbHV0aW9uVGltZSxcbiAgICAgICAgICBjYWxsZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBleHRlbmQgbWFya2V0IGRlYWRsaW5lJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2Nsb3NlX3JhY2VfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNhbGxlcldhbGxldCA9IGFyZ3MuY2FsbGVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCAhY2FsbGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0IGFuZCBjYWxsZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2xvc2VSYWNlTWFya2V0VHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgY2FsbGVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY2xvc2UgYmV0dGluZyBvbiB0aGlzIHJhY2UgbWFya2V0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2V4dGVuZF9yYWNlX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBuZXdDbG9zaW5nVGltZVN0ciA9IGFyZ3MubmV3X2Nsb3NpbmdfdGltZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG5ld1Jlc29sdXRpb25UaW1lU3RyID0gYXJncy5uZXdfcmVzb2x1dGlvbl90aW1lIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgY2FsbGVyV2FsbGV0ID0gYXJncy5jYWxsZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICFuZXdDbG9zaW5nVGltZVN0ciB8fCAhY2FsbGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0LCBuZXdfY2xvc2luZ190aW1lLCBhbmQgY2FsbGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuZXdDbG9zaW5nVGltZSA9IE1hdGguZmxvb3IobmV3IERhdGUobmV3Q2xvc2luZ1RpbWVTdHIpLmdldFRpbWUoKSAvIDEwMDApO1xuICAgICAgICBjb25zdCBuZXdSZXNvbHV0aW9uVGltZSA9IG5ld1Jlc29sdXRpb25UaW1lU3RyXG4gICAgICAgICAgPyBNYXRoLmZsb29yKG5ldyBEYXRlKG5ld1Jlc29sdXRpb25UaW1lU3RyKS5nZXRUaW1lKCkgLyAxMDAwKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEV4dGVuZFJhY2VNYXJrZXRUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICBuZXdDbG9zaW5nVGltZSxcbiAgICAgICAgICBuZXdSZXNvbHV0aW9uVGltZSxcbiAgICAgICAgICBjYWxsZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBleHRlbmQgcmFjZSBtYXJrZXQgZGVhZGxpbmUnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY2FuY2VsX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCByZWFzb24gPSBhcmdzLnJlYXNvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGF1dGhvcml0eVdhbGxldCA9IGFyZ3MuYXV0aG9yaXR5X3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICFyZWFzb24gfHwgIWF1dGhvcml0eVdhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIHJlYXNvbiwgYW5kIGF1dGhvcml0eV93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDYW5jZWxNYXJrZXRUcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgcmVhc29uLFxuICAgICAgICAgIGF1dGhvcml0eVdhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNhbmNlbCB0aGUgbWFya2V0LiBCZXR0b3JzIGNhbiBjbGFpbSByZWZ1bmRzIGFmdGVyLicsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jYW5jZWxfcmFjZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCByZWFzb24gPSBhcmdzLnJlYXNvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGF1dGhvcml0eVdhbGxldCA9IGFyZ3MuYXV0aG9yaXR5X3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCAhcmVhc29uIHx8ICFhdXRob3JpdHlXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIHJlYXNvbiwgYW5kIGF1dGhvcml0eV93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDYW5jZWxSYWNlVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgcmVhc29uLFxuICAgICAgICAgIGF1dGhvcml0eVdhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNhbmNlbCB0aGUgcmFjZSBtYXJrZXQuIEJldHRvcnMgY2FuIGNsYWltIHJlZnVuZHMgYWZ0ZXIuJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKGBVbmtub3duIHRvb2w6ICR7bmFtZX1gKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicpO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBIRUxQRVJTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBzdWNjZXNzUmVzcG9uc2UoZGF0YTogdW5rbm93bik6IHsgY29udGVudDogQXJyYXk8eyB0eXBlOiBzdHJpbmc7IHRleHQ6IHN0cmluZyB9PiB9IHtcbiAgcmV0dXJuIHtcbiAgICBjb250ZW50OiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgICAgdGV4dDogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgbmV0d29yazogJ21haW5uZXQtYmV0YScsXG4gICAgICAgICAgcHJvZ3JhbUlkOiBQUk9HUkFNX0lELnRvQmFzZTU4KCksXG4gICAgICAgICAgLi4uZGF0YSBhcyBvYmplY3QsXG4gICAgICAgIH0sIG51bGwsIDIpLFxuICAgICAgfSxcbiAgICBdLFxuICB9O1xufVxuXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKG1lc3NhZ2U6IHN0cmluZyk6IHsgY29udGVudDogQXJyYXk8eyB0eXBlOiBzdHJpbmc7IHRleHQ6IHN0cmluZyB9PiB9IHtcbiAgcmV0dXJuIHtcbiAgICBjb250ZW50OiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgICAgdGV4dDogSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IG1lc3NhZ2UgfSksXG4gICAgICB9LFxuICAgIF0sXG4gIH07XG59XG4iXX0=