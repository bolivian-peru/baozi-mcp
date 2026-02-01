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
        description: 'Build transaction to update creator profile. Both display_name and default_fee_bps are required.',
        inputSchema: {
            type: 'object',
            properties: {
                display_name: { type: 'string', description: 'Display name (max 32 chars)' },
                default_fee_bps: { type: 'number', description: 'Default fee in basis points (max 50 = 0.5%)' },
                creator_wallet: { type: 'string', description: 'Creator wallet' },
            },
            required: ['display_name', 'default_fee_bps', 'creator_wallet'],
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
                const displayName = args.display_name;
                const defaultFeeBps = args.default_fee_bps;
                const creatorWallet = args.creator_wallet;
                if (!displayName || defaultFeeBps === undefined || !creatorWallet) {
                    return errorResponse('display_name, default_fee_bps, and creator_wallet are all required');
                }
                const result = await buildUpdateCreatorProfileTransaction({
                    displayName,
                    defaultFeeBps,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHO0FBQ0gsT0FBTyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFckUsV0FBVztBQUNYLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBMEIsTUFBTSxxQkFBcUIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQXNELE1BQU0sc0JBQXNCLENBQUM7QUFDakgsT0FBTyxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDakgsT0FBTyxFQUNMLHdCQUF3QixFQUN4QixxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLG9CQUFvQixFQUNwQix1QkFBdUIsRUFDdkIsb0JBQW9CLEVBQ3BCLG1CQUFtQixFQUNuQixpQkFBaUIsR0FDbEIsTUFBTSw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLEVBQ0wscUJBQXFCLEVBRXJCLGVBQWUsRUFDZixtQkFBbUIsRUFDbkIsZ0JBQWdCLEVBQ2hCLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLGtCQUFrQixHQUNuQixNQUFNLCtCQUErQixDQUFDO0FBRXZDLGFBQWE7QUFDYixPQUFPLEVBQUUsb0JBQW9CLEVBQXNCLE1BQU0sOEJBQThCLENBQUM7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FB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UUFDbEQsQ0FBQztJQUNILENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxhQUFhLENBQUMsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDakYsQ0FBQztBQUNILENBQUM7QUFFRCxnRkFBZ0Y7QUFDaEYsVUFBVTtBQUNWLGdGQUFnRjtBQUVoRixTQUFTLGVBQWUsQ0FBQyxJQUFhO0lBQ3BDLE9BQU87UUFDTCxPQUFPLEVBQUU7WUFDUDtnQkFDRSxJQUFJLEVBQUUsTUFBTTtnQkFDWixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsT0FBTyxFQUFFLElBQUk7b0JBQ2IsT0FBTyxFQUFFLGNBQWM7b0JBQ3ZCLFNBQVMsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFO29CQUNoQyxHQUFHLElBQWM7aUJBQ2xCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQzthQUNaO1NBQ0Y7S0FDRixDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLE9BQWU7SUFDcEMsT0FBTztRQUNMLE9BQU8sRUFBRTtZQUNQO2dCQUNFLElBQUksRUFBRSxNQUFNO2dCQUNaLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUM7YUFDekQ7U0FDRjtLQUNGLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBNQ1AgVG9vbCBEZWZpbml0aW9ucyBmb3IgQmFvemkgTWFya2V0c1xuICogVjQuMC4wIC0gRnVsbCBQcm90b2NvbCBDb3ZlcmFnZSArIE1hcmtldCBDcmVhdGlvbiArIEFJIEFnZW50IE5ldHdvcmtcbiAqL1xuaW1wb3J0IHsgQ29ubmVjdGlvbiwgUHVibGljS2V5LCBUcmFuc2FjdGlvbiB9IGZyb20gJ0Bzb2xhbmEvd2ViMy5qcyc7XG5cbi8vIEhhbmRsZXJzXG5pbXBvcnQgeyBsaXN0TWFya2V0cywgZ2V0TWFya2V0LCBnZXRNYXJrZXRGb3JCZXR0aW5nIH0gZnJvbSAnLi9oYW5kbGVycy9tYXJrZXRzLmpzJztcbmltcG9ydCB7IGdldFF1b3RlLCBnZXRRdW90ZVdpdGhNYXJrZXREYXRhIH0gZnJvbSAnLi9oYW5kbGVycy9xdW90ZS5qcyc7XG5pbXBvcnQgeyBnZXRQb3NpdGlvbnNTdW1tYXJ5IH0gZnJvbSAnLi9oYW5kbGVycy9wb3NpdGlvbnMuanMnO1xuaW1wb3J0IHsgZ2V0Q2xhaW1hYmxlUG9zaXRpb25zLCBnZXRBZmZpbGlhdGVCeUNvZGUgYXMgZ2V0QWZmaWxpYXRlQnlDb2RlRnJvbUNsYWltcyB9IGZyb20gJy4vaGFuZGxlcnMvY2xhaW1zLmpzJztcbmltcG9ydCB7IGxpc3RSYWNlTWFya2V0cywgZ2V0UmFjZU1hcmtldCwgZ2V0UmFjZVF1b3RlIH0gZnJvbSAnLi9oYW5kbGVycy9yYWNlLW1hcmtldHMuanMnO1xuaW1wb3J0IHsgZ2V0UmVzb2x1dGlvblN0YXR1cywgZ2V0RGlzcHV0ZWRNYXJrZXRzLCBnZXRNYXJrZXRzQXdhaXRpbmdSZXNvbHV0aW9uIH0gZnJvbSAnLi9oYW5kbGVycy9yZXNvbHV0aW9uLmpzJztcbmltcG9ydCB7XG4gIGlzQWZmaWxpYXRlQ29kZUF2YWlsYWJsZSxcbiAgc3VnZ2VzdEFmZmlsaWF0ZUNvZGVzLFxuICBnZXRBZmZpbGlhdGVCeUNvZGUsXG4gIGdldEFmZmlsaWF0ZXNCeU93bmVyLFxuICBnZXRSZWZlcnJhbHNCeUFmZmlsaWF0ZSxcbiAgZ2V0QWdlbnROZXR3b3JrU3RhdHMsXG4gIGZvcm1hdEFmZmlsaWF0ZUxpbmssXG4gIGdldENvbW1pc3Npb25JbmZvLFxufSBmcm9tICcuL2hhbmRsZXJzL2FnZW50LW5ldHdvcmsuanMnO1xuaW1wb3J0IHtcbiAgcHJldmlld01hcmtldENyZWF0aW9uLFxuICBwcmV2aWV3UmFjZU1hcmtldENyZWF0aW9uLFxuICBjcmVhdGVMYWJNYXJrZXQsXG4gIGNyZWF0ZVByaXZhdGVNYXJrZXQsXG4gIGNyZWF0ZVJhY2VNYXJrZXQsXG4gIGdldEFsbENyZWF0aW9uRmVlcyxcbiAgZ2V0QWxsUGxhdGZvcm1GZWVzLFxuICBnZXRUaW1pbmdDb25zdHJhaW50cyxcbiAgZ2VuZXJhdGVJbnZpdGVIYXNoLFxufSBmcm9tICcuL2hhbmRsZXJzL21hcmtldC1jcmVhdGlvbi5qcyc7XG5cbi8vIFZhbGlkYXRpb25cbmltcG9ydCB7IHZhbGlkYXRlTWFya2V0VGltaW5nLCBNYXJrZXRUaW1pbmdQYXJhbXMgfSBmcm9tICcuL3ZhbGlkYXRpb24vbWFya2V0LXJ1bGVzLmpzJztcbmltcG9ydCB7IHZhbGlkYXRlQmV0LCBjYWxjdWxhdGVCZXRRdW90ZSB9IGZyb20gJy4vdmFsaWRhdGlvbi9iZXQtcnVsZXMuanMnO1xuaW1wb3J0IHsgdmFsaWRhdGVNYXJrZXRDcmVhdGlvbiB9IGZyb20gJy4vdmFsaWRhdGlvbi9jcmVhdGlvbi1ydWxlcy5qcyc7XG5cbi8vIFRyYW5zYWN0aW9uIEJ1aWxkZXJzXG5pbXBvcnQgeyBidWlsZEJldFRyYW5zYWN0aW9uLCBmZXRjaEFuZEJ1aWxkQmV0VHJhbnNhY3Rpb24sIHNpbXVsYXRlQmV0VHJhbnNhY3Rpb24gfSBmcm9tICcuL2J1aWxkZXJzL2JldC10cmFuc2FjdGlvbi5qcyc7XG5pbXBvcnQge1xuICBidWlsZENsYWltV2lubmluZ3NUcmFuc2FjdGlvbixcbiAgYnVpbGRDbGFpbVJlZnVuZFRyYW5zYWN0aW9uLFxuICBidWlsZENsYWltQWZmaWxpYXRlVHJhbnNhY3Rpb24sXG4gIGJ1aWxkQmF0Y2hDbGFpbVRyYW5zYWN0aW9uLFxufSBmcm9tICcuL2J1aWxkZXJzL2NsYWltLXRyYW5zYWN0aW9uLmpzJztcbmltcG9ydCB7IGJ1aWxkUmVnaXN0ZXJBZmZpbGlhdGVUcmFuc2FjdGlvbiwgYnVpbGRUb2dnbGVBZmZpbGlhdGVUcmFuc2FjdGlvbiB9IGZyb20gJy4vYnVpbGRlcnMvYWZmaWxpYXRlLXRyYW5zYWN0aW9uLmpzJztcbmltcG9ydCB7IGZldGNoQW5kQnVpbGRSYWNlQmV0VHJhbnNhY3Rpb24sIGJ1aWxkQ2xhaW1SYWNlV2lubmluZ3NUcmFuc2FjdGlvbiwgYnVpbGRDbGFpbVJhY2VSZWZ1bmRUcmFuc2FjdGlvbiB9IGZyb20gJy4vYnVpbGRlcnMvcmFjZS10cmFuc2FjdGlvbi5qcyc7XG5pbXBvcnQgeyBnZXROZXh0TWFya2V0SWQsIHByZXZpZXdNYXJrZXRQZGEsIHByZXZpZXdSYWNlTWFya2V0UGRhIH0gZnJvbSAnLi9idWlsZGVycy9tYXJrZXQtY3JlYXRpb24tdHguanMnO1xuXG4vLyBSZXNvbHV0aW9uIEJ1aWxkZXJzXG5pbXBvcnQge1xuICBidWlsZFByb3Bvc2VSZXNvbHV0aW9uVHJhbnNhY3Rpb24sXG4gIGJ1aWxkUHJvcG9zZVJlc29sdXRpb25Ib3N0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkUmVzb2x2ZU1hcmtldFRyYW5zYWN0aW9uLFxuICBidWlsZFJlc29sdmVNYXJrZXRIb3N0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkRmluYWxpemVSZXNvbHV0aW9uVHJhbnNhY3Rpb24sXG4gIGJ1aWxkUHJvcG9zZVJhY2VSZXNvbHV0aW9uVHJhbnNhY3Rpb24sXG4gIGJ1aWxkUmVzb2x2ZVJhY2VUcmFuc2FjdGlvbixcbiAgYnVpbGRGaW5hbGl6ZVJhY2VSZXNvbHV0aW9uVHJhbnNhY3Rpb24sXG59IGZyb20gJy4vYnVpbGRlcnMvcmVzb2x1dGlvbi10cmFuc2FjdGlvbi5qcyc7XG5cbi8vIERpc3B1dGUgQnVpbGRlcnNcbmltcG9ydCB7XG4gIGJ1aWxkRmxhZ0Rpc3B1dGVUcmFuc2FjdGlvbixcbiAgYnVpbGRGbGFnUmFjZURpc3B1dGVUcmFuc2FjdGlvbixcbiAgYnVpbGRWb3RlQ291bmNpbFRyYW5zYWN0aW9uLFxuICBidWlsZFZvdGVDb3VuY2lsUmFjZVRyYW5zYWN0aW9uLFxuICBidWlsZENoYW5nZUNvdW5jaWxWb3RlVHJhbnNhY3Rpb24sXG4gIGJ1aWxkQ2hhbmdlQ291bmNpbFZvdGVSYWNlVHJhbnNhY3Rpb24sXG59IGZyb20gJy4vYnVpbGRlcnMvZGlzcHV0ZS10cmFuc2FjdGlvbi5qcyc7XG5cbi8vIFdoaXRlbGlzdCBCdWlsZGVyc1xuaW1wb3J0IHtcbiAgYnVpbGRBZGRUb1doaXRlbGlzdFRyYW5zYWN0aW9uLFxuICBidWlsZFJlbW92ZUZyb21XaGl0ZWxpc3RUcmFuc2FjdGlvbixcbiAgYnVpbGRDcmVhdGVSYWNlV2hpdGVsaXN0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkQWRkVG9SYWNlV2hpdGVsaXN0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkUmVtb3ZlRnJvbVJhY2VXaGl0ZWxpc3RUcmFuc2FjdGlvbixcbn0gZnJvbSAnLi9idWlsZGVycy93aGl0ZWxpc3QtdHJhbnNhY3Rpb24uanMnO1xuXG4vLyBDcmVhdG9yIFByb2ZpbGUgQnVpbGRlcnNcbmltcG9ydCB7XG4gIGJ1aWxkQ3JlYXRlQ3JlYXRvclByb2ZpbGVUcmFuc2FjdGlvbixcbiAgYnVpbGRVcGRhdGVDcmVhdG9yUHJvZmlsZVRyYW5zYWN0aW9uLFxuICBidWlsZENsYWltQ3JlYXRvclRyYW5zYWN0aW9uLFxufSBmcm9tICcuL2J1aWxkZXJzL2NyZWF0b3ItdHJhbnNhY3Rpb24uanMnO1xuXG4vLyBNYXJrZXQgTWFuYWdlbWVudCBCdWlsZGVyc1xuaW1wb3J0IHtcbiAgYnVpbGRDbG9zZU1hcmtldFRyYW5zYWN0aW9uLFxuICBidWlsZEV4dGVuZE1hcmtldFRyYW5zYWN0aW9uLFxuICBidWlsZENsb3NlUmFjZU1hcmtldFRyYW5zYWN0aW9uLFxuICBidWlsZEV4dGVuZFJhY2VNYXJrZXRUcmFuc2FjdGlvbixcbiAgYnVpbGRDYW5jZWxNYXJrZXRUcmFuc2FjdGlvbixcbiAgYnVpbGRDYW5jZWxSYWNlVHJhbnNhY3Rpb24sXG59IGZyb20gJy4vYnVpbGRlcnMvbWFya2V0LW1hbmFnZW1lbnQtdHJhbnNhY3Rpb24uanMnO1xuXG4vLyBDb25maWdcbmltcG9ydCB7IFJQQ19FTkRQT0lOVCwgUFJPR1JBTV9JRCwgQkVUX0xJTUlUUywgVElNSU5HLCBGRUVTIH0gZnJvbSAnLi9jb25maWcuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVE9PTCBTQ0hFTUFTIC0gT3JnYW5pemVkIGJ5IENhdGVnb3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY29uc3QgVE9PTFMgPSBbXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gTUFSS0VUIFJFQUQgT1BFUkFUSU9OU1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnbGlzdF9tYXJrZXRzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0xpc3QgYWxsIEJhb3ppIHByZWRpY3Rpb24gbWFya2V0cyAoYm9vbGVhbiBZRVMvTk8pIG9uIFNvbGFuYSBtYWlubmV0LiBSZXR1cm5zIHF1ZXN0aW9ucywgb2RkcywgcG9vbHMsIHN0YXR1cy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgc3RhdHVzOiB7XG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZW51bTogWydBY3RpdmUnLCAnQ2xvc2VkJywgJ1Jlc29sdmVkJywgJ0NhbmNlbGxlZCcsICdQYXVzZWQnXSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbHRlciBieSBzdGF0dXMuIERlZmF1bHQ6IGFsbCBtYXJrZXRzLicsXG4gICAgICAgIH0sXG4gICAgICAgIGxheWVyOiB7XG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZW51bTogWydPZmZpY2lhbCcsICdMYWInLCAnUHJpdmF0ZSddLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmlsdGVyIGJ5IGxheWVyIHR5cGUuJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogW10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfbWFya2V0JyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBkZXRhaWxlZCBpbmZvcm1hdGlvbiBhYm91dCBhIHNwZWNpZmljIHByZWRpY3Rpb24gbWFya2V0IGJ5IHB1YmxpYyBrZXkuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHB1YmxpY0tleToge1xuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU29sYW5hIHB1YmxpYyBrZXkgb2YgdGhlIG1hcmtldCBhY2NvdW50JyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydwdWJsaWNLZXknXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9xdW90ZScsXG4gICAgZGVzY3JpcHRpb246ICdDYWxjdWxhdGUgZXhwZWN0ZWQgcGF5b3V0IGZvciBhIHBvdGVudGlhbCBiZXQuIFNob3dzIHByb2ZpdCwgZmVlcywgYW5kIG5ldyBvZGRzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHNpZGU6IHsgdHlwZTogJ3N0cmluZycsIGVudW06IFsnWWVzJywgJ05vJ10sIGRlc2NyaXB0aW9uOiAnU2lkZSB0byBiZXQgb24nIH0sXG4gICAgICAgIGFtb3VudDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246IGBCZXQgYW1vdW50IGluIFNPTCAoJHtCRVRfTElNSVRTLk1JTl9CRVRfU09MfS0ke0JFVF9MSU1JVFMuTUFYX0JFVF9TT0x9KWAgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnc2lkZScsICdhbW91bnQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUkFDRSBNQVJLRVQgT1BFUkFUSU9OUyAoTXVsdGktT3V0Y29tZSlcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2xpc3RfcmFjZV9tYXJrZXRzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0xpc3QgYWxsIHJhY2UgbWFya2V0cyAobXVsdGktb3V0Y29tZSBwcmVkaWN0aW9uIG1hcmtldHMpIG9uIFNvbGFuYSBtYWlubmV0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBzdGF0dXM6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBlbnVtOiBbJ0FjdGl2ZScsICdDbG9zZWQnLCAnUmVzb2x2ZWQnLCAnQ2FuY2VsbGVkJ10sXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdGaWx0ZXIgYnkgc3RhdHVzJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogW10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfcmFjZV9tYXJrZXQnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IGRldGFpbGVkIGluZm8gYWJvdXQgYSByYWNlIG1hcmtldCBpbmNsdWRpbmcgYWxsIG91dGNvbWUgbGFiZWxzLCBwb29scywgYW5kIG9kZHMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHB1YmxpY0tleTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3B1YmxpY0tleSddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X3JhY2VfcXVvdGUnLFxuICAgIGRlc2NyaXB0aW9uOiAnQ2FsY3VsYXRlIGV4cGVjdGVkIHBheW91dCBmb3IgYSByYWNlIG1hcmtldCBiZXQgb24gYSBzcGVjaWZpYyBvdXRjb21lLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgb3V0Y29tZUluZGV4OiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0luZGV4IG9mIG91dGNvbWUgdG8gYmV0IG9uICgwLWJhc2VkKScgfSxcbiAgICAgICAgYW1vdW50OiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0JldCBhbW91bnQgaW4gU09MJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdvdXRjb21lSW5kZXgnLCAnYW1vdW50J10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIE1BUktFVCBDUkVBVElPTlxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAncHJldmlld19jcmVhdGVfbWFya2V0JyxcbiAgICBkZXNjcmlwdGlvbjogJ1ByZXZpZXcgbWFya2V0IGNyZWF0aW9uIC0gdmFsaWRhdGVzIHBhcmFtcyBhbmQgc2hvd3MgY29zdHMgV0lUSE9VVCBidWlsZGluZyB0cmFuc2FjdGlvbi4gVXNlIGJlZm9yZSBidWlsZF9jcmVhdGVfbWFya2V0X3RyYW5zYWN0aW9uLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBxdWVzdGlvbjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcXVlc3Rpb24gKG1heCAyMDAgY2hhcnMpJyB9LFxuICAgICAgICBsYXllcjogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydsYWInLCAncHJpdmF0ZSddLCBkZXNjcmlwdGlvbjogJ01hcmtldCBsYXllciAobGFiPWNvbW11bml0eSwgcHJpdmF0ZT1pbnZpdGUtb25seSknIH0sXG4gICAgICAgIGNsb3NpbmdfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSB3aGVuIGJldHRpbmcgY2xvc2VzJyB9LFxuICAgICAgICByZXNvbHV0aW9uX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgd2hlbiBtYXJrZXQgY2FuIGJlIHJlc29sdmVkIChvcHRpb25hbCwgYXV0by1jYWxjdWxhdGVkKScgfSxcbiAgICAgICAgbWFya2V0X3R5cGU6IHsgdHlwZTogJ3N0cmluZycsIGVudW06IFsnZXZlbnQnLCAnbWVhc3VyZW1lbnQnXSwgZGVzY3JpcHRpb246ICdFdmVudC1iYXNlZCAoUnVsZSBBKSBvciBtZWFzdXJlbWVudC1wZXJpb2QgKFJ1bGUgQiknIH0sXG4gICAgICAgIGV2ZW50X3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgZXZlbnQgdGltZSAocmVxdWlyZWQgZm9yIGV2ZW50LWJhc2VkIG1hcmtldHMpJyB9LFxuICAgICAgICBtZWFzdXJlbWVudF9zdGFydDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBtZWFzdXJlbWVudCBzdGFydCAoZm9yIG1lYXN1cmVtZW50IG1hcmtldHMpJyB9LFxuICAgICAgICBtZWFzdXJlbWVudF9lbmQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgbWVhc3VyZW1lbnQgZW5kIChvcHRpb25hbCknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncXVlc3Rpb24nLCAnbGF5ZXInLCAnY2xvc2luZ190aW1lJ10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jcmVhdGVfbGFiX21hcmtldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjcmVhdGUgYSBMYWIgKGNvbW11bml0eSkgbWFya2V0LiBWYWxpZGF0ZXMgYWdhaW5zdCB2Ni4yIHJ1bGVzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBxdWVzdGlvbjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcXVlc3Rpb24gKG1heCAyMDAgY2hhcnMpJyB9LFxuICAgICAgICBjbG9zaW5nX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgd2hlbiBiZXR0aW5nIGNsb3NlcycgfSxcbiAgICAgICAgcmVzb2x1dGlvbl90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIHdoZW4gbWFya2V0IGNhbiBiZSByZXNvbHZlZCAob3B0aW9uYWwpJyB9LFxuICAgICAgICBtYXJrZXRfdHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydldmVudCcsICdtZWFzdXJlbWVudCddLCBkZXNjcmlwdGlvbjogJ01hcmtldCB0eXBlIGZvciB2YWxpZGF0aW9uJyB9LFxuICAgICAgICBldmVudF90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIGV2ZW50IHRpbWUgKGZvciBldmVudC1iYXNlZCknIH0sXG4gICAgICAgIG1lYXN1cmVtZW50X3N0YXJ0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIG1lYXN1cmVtZW50IHN0YXJ0IChmb3IgbWVhc3VyZW1lbnQpJyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDcmVhdG9yIHdhbGxldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBpbnZpdGVfaGFzaDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdPcHRpb25hbCA2NC1jaGFyIGhleCBmb3IgaW52aXRlIGxpbmtzJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3F1ZXN0aW9uJywgJ2Nsb3NpbmdfdGltZScsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY3JlYXRlX3ByaXZhdGVfbWFya2V0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIGNyZWF0ZSBhIFByaXZhdGUgKGludml0ZS1vbmx5KSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHF1ZXN0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBxdWVzdGlvbicgfSxcbiAgICAgICAgY2xvc2luZ190aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIGNsb3NpbmcgdGltZScgfSxcbiAgICAgICAgcmVzb2x1dGlvbl90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIHJlc29sdXRpb24gdGltZSAob3B0aW9uYWwpJyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgICAgaW52aXRlX2hhc2g6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnT3B0aW9uYWwgaW52aXRlIGhhc2ggZm9yIHJlc3RyaWN0ZWQgYWNjZXNzJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3F1ZXN0aW9uJywgJ2Nsb3NpbmdfdGltZScsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY3JlYXRlX3JhY2VfbWFya2V0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIGNyZWF0ZSBhIFJhY2UgKG11bHRpLW91dGNvbWUpIG1hcmtldCB3aXRoIDItMTAgb3V0Y29tZXMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHF1ZXN0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBxdWVzdGlvbicgfSxcbiAgICAgICAgb3V0Y29tZXM6IHtcbiAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdBcnJheSBvZiAyLTEwIG91dGNvbWUgbGFiZWxzJyxcbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2luZ190aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIGNsb3NpbmcgdGltZScgfSxcbiAgICAgICAgcmVzb2x1dGlvbl90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIHJlc29sdXRpb24gdGltZSAob3B0aW9uYWwpJyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydxdWVzdGlvbicsICdvdXRjb21lcycsICdjbG9zaW5nX3RpbWUnLCAnY3JlYXRvcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9jcmVhdGlvbl9mZWVzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBtYXJrZXQgY3JlYXRpb24gZmVlcyBmb3IgYWxsIGxheWVycyAoT2ZmaWNpYWwsIExhYiwgUHJpdmF0ZSkuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7fSxcbiAgICAgIHJlcXVpcmVkOiBbXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9wbGF0Zm9ybV9mZWVzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBwbGF0Zm9ybSBmZWUgcmF0ZXMgZm9yIGFsbCBsYXllcnMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7fSxcbiAgICAgIHJlcXVpcmVkOiBbXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF90aW1pbmdfcnVsZXMnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IHY2LjIgdGltaW5nIHJ1bGVzIGFuZCBjb25zdHJhaW50cyBmb3IgbWFya2V0IGNyZWF0aW9uLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge30sXG4gICAgICByZXF1aXJlZDogW10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZW5lcmF0ZV9pbnZpdGVfaGFzaCcsXG4gICAgZGVzY3JpcHRpb246ICdHZW5lcmF0ZSBhIHJhbmRvbSBpbnZpdGUgaGFzaCBmb3IgcHJpdmF0ZSBtYXJrZXQgYWNjZXNzIGNvbnRyb2wuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7fSxcbiAgICAgIHJlcXVpcmVkOiBbXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUE9TSVRJT04gJiBDTEFJTVNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2dldF9wb3NpdGlvbnMnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IGFsbCBiZXR0aW5nIHBvc2l0aW9ucyBmb3IgYSB3YWxsZXQgaW5jbHVkaW5nIHdpbi9sb3NzIHN0YXRzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICB3YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU29sYW5hIHdhbGxldCBhZGRyZXNzJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X2NsYWltYWJsZScsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgYWxsIGNsYWltYWJsZSB3aW5uaW5ncyBhbmQgcmVmdW5kcyBmb3IgYSB3YWxsZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHdhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTb2xhbmEgd2FsbGV0IGFkZHJlc3MnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFJFU09MVVRJT04gJiBESVNQVVRFU1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnZ2V0X3Jlc29sdXRpb25fc3RhdHVzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCByZXNvbHV0aW9uIHN0YXR1cyBmb3IgYSBtYXJrZXQgKHJlc29sdmVkLCBkaXNwdXRlZCwgcGVuZGluZykuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9kaXNwdXRlZF9tYXJrZXRzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0xpc3QgYWxsIG1hcmtldHMgY3VycmVudGx5IHVuZGVyIGRpc3B1dGUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7fSxcbiAgICAgIHJlcXVpcmVkOiBbXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9tYXJrZXRzX2F3YWl0aW5nX3Jlc29sdXRpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgY2xvc2VkIG1hcmtldHMgYXdhaXRpbmcgcmVzb2x1dGlvbi4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBBSSBBR0VOVCBBRkZJTElBVEUgTkVUV09SS1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnY2hlY2tfYWZmaWxpYXRlX2NvZGUnLFxuICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgaWYgYW4gYWZmaWxpYXRlIGNvZGUgaXMgYXZhaWxhYmxlIGZvciByZWdpc3RyYXRpb24uJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNvZGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQWZmaWxpYXRlIGNvZGUgdG8gY2hlY2sgKDMtMTYgYWxwaGFudW1lcmljIGNoYXJzKScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydjb2RlJ10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdzdWdnZXN0X2FmZmlsaWF0ZV9jb2RlcycsXG4gICAgZGVzY3JpcHRpb246ICdHZW5lcmF0ZSBzdWdnZXN0ZWQgYWZmaWxpYXRlIGNvZGVzIGJhc2VkIG9uIGFnZW50IG5hbWUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGFnZW50TmFtZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOYW1lIG9mIHRoZSBBSSBhZ2VudCcgfSxcbiAgICAgICAgY291bnQ6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnTnVtYmVyIG9mIHN1Z2dlc3Rpb25zIChkZWZhdWx0IDUpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2FnZW50TmFtZSddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X2FmZmlsaWF0ZV9pbmZvJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBhZmZpbGlhdGUgYWNjb3VudCBpbmZvIGJ5IGNvZGUuIFNob3dzIGVhcm5pbmdzLCByZWZlcnJhbHMsIHN0YXR1cy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBZmZpbGlhdGUgY29kZScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydjb2RlJ10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfbXlfYWZmaWxpYXRlcycsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgYWxsIGFmZmlsaWF0ZSBhY2NvdW50cyBvd25lZCBieSBhIHdhbGxldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1dhbGxldCBhZGRyZXNzJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X3JlZmVycmFscycsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgYWxsIHVzZXJzIHJlZmVycmVkIGJ5IGFuIGFmZmlsaWF0ZSBjb2RlLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBjb2RlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0FmZmlsaWF0ZSBjb2RlJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9hZ2VudF9uZXR3b3JrX3N0YXRzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBvdmVyYWxsIEFJIGFnZW50IGFmZmlsaWF0ZSBuZXR3b3JrIHN0YXRpc3RpY3MuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7fSxcbiAgICAgIHJlcXVpcmVkOiBbXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2Zvcm1hdF9hZmZpbGlhdGVfbGluaycsXG4gICAgZGVzY3JpcHRpb246ICdGb3JtYXQgYW4gYWZmaWxpYXRlIHJlZmVycmFsIGxpbmsgZm9yIHNoYXJpbmcuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNvZGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQWZmaWxpYXRlIGNvZGUnIH0sXG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdPcHRpb25hbCBtYXJrZXQgcHVibGljIGtleSBmb3IgZGVlcCBsaW5rJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9jb21taXNzaW9uX2luZm8nLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IGFmZmlsaWF0ZSBjb21taXNzaW9uIHN0cnVjdHVyZSBhbmQgZXhhbXBsZXMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7fSxcbiAgICAgIHJlcXVpcmVkOiBbXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVkFMSURBVElPTlxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAndmFsaWRhdGVfbWFya2V0X3BhcmFtcycsXG4gICAgZGVzY3JpcHRpb246ICdWYWxpZGF0ZSBtYXJrZXQgcGFyYW1ldGVycyBhZ2FpbnN0IHY2LjIgdGltaW5nIHJ1bGVzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBxdWVzdGlvbjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcXVlc3Rpb24gKG1heCAyMDAgY2hhcnMpJyB9LFxuICAgICAgICBjbG9zaW5nX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgY2xvc2luZyB0aW1lJyB9LFxuICAgICAgICBtYXJrZXRfdHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydldmVudCcsICdtZWFzdXJlbWVudCddLCBkZXNjcmlwdGlvbjogJ01hcmtldCB0eXBlJyB9LFxuICAgICAgICBldmVudF90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIGV2ZW50IHRpbWUgKGZvciBldmVudCBtYXJrZXRzKScgfSxcbiAgICAgICAgbWVhc3VyZW1lbnRfc3RhcnQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgbWVhc3VyZW1lbnQgc3RhcnQgKGZvciBtZWFzdXJlbWVudCBtYXJrZXRzKScgfSxcbiAgICAgICAgbWVhc3VyZW1lbnRfZW5kOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIG1lYXN1cmVtZW50IGVuZCAob3B0aW9uYWwpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3F1ZXN0aW9uJywgJ2Nsb3NpbmdfdGltZScsICdtYXJrZXRfdHlwZSddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAndmFsaWRhdGVfYmV0JyxcbiAgICBkZXNjcmlwdGlvbjogJ1ZhbGlkYXRlIGJldCBwYXJhbWV0ZXJzIGJlZm9yZSBidWlsZGluZyB0cmFuc2FjdGlvbi4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBhbW91bnQ6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnQmV0IGFtb3VudCBpbiBTT0wnIH0sXG4gICAgICAgIHNpZGU6IHsgdHlwZTogJ3N0cmluZycsIGVudW06IFsnWWVzJywgJ05vJ10sIGRlc2NyaXB0aW9uOiAnU2lkZSB0byBiZXQgb24nIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ2Ftb3VudCcsICdzaWRlJ10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFRSQU5TQUNUSU9OIEJVSUxESU5HIC0gQkVUU1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfYmV0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIGZvciBwbGFjaW5nIGEgYmV0IG9uIGEgYm9vbGVhbiAoWUVTL05PKSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgb3V0Y29tZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWyd5ZXMnLCAnbm8nXSwgZGVzY3JpcHRpb246ICdPdXRjb21lIHRvIGJldCBvbicgfSxcbiAgICAgICAgYW1vdW50X3NvbDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdCZXQgYW1vdW50IGluIFNPTCcgfSxcbiAgICAgICAgdXNlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVXNlciB3YWxsZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgYWZmaWxpYXRlX2NvZGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnT3B0aW9uYWwgYWZmaWxpYXRlIGNvZGUgZm9yIGNvbW1pc3Npb24nIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ291dGNvbWUnLCAnYW1vdW50X3NvbCcsICd1c2VyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfcmFjZV9iZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdW5zaWduZWQgdHJhbnNhY3Rpb24gZm9yIHBsYWNpbmcgYSBiZXQgb24gYSByYWNlIChtdWx0aS1vdXRjb21lKSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBvdXRjb21lX2luZGV4OiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0luZGV4IG9mIG91dGNvbWUgdG8gYmV0IG9uJyB9LFxuICAgICAgICBhbW91bnRfc29sOiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0JldCBhbW91bnQgaW4gU09MJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBhZmZpbGlhdGVfY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdPcHRpb25hbCBhZmZpbGlhdGUgY29kZScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnb3V0Y29tZV9pbmRleCcsICdhbW91bnRfc29sJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFRSQU5TQUNUSU9OIEJVSUxESU5HIC0gQ0xBSU1TXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdidWlsZF9jbGFpbV93aW5uaW5nc190cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjbGFpbSB3aW5uaW5ncyBmcm9tIGEgcmVzb2x2ZWQgbWFya2V0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHBvc2l0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1Bvc2l0aW9uIFBEQScgfSxcbiAgICAgICAgdXNlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVXNlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ3Bvc2l0aW9uJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jbGFpbV9yZWZ1bmRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdW5zaWduZWQgdHJhbnNhY3Rpb24gdG8gY2xhaW0gcmVmdW5kIGZyb20gY2FuY2VsbGVkL2ludmFsaWQgbWFya2V0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHBvc2l0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1Bvc2l0aW9uIFBEQScgfSxcbiAgICAgICAgdXNlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVXNlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ3Bvc2l0aW9uJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9iYXRjaF9jbGFpbV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCBzaW5nbGUgdHJhbnNhY3Rpb24gdG8gY2xhaW0gbXVsdGlwbGUgcG9zaXRpb25zIGF0IG9uY2UuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNsYWltczoge1xuICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgaXRlbXM6IHtcbiAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgcG9zaXRpb246IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgdHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWyd3aW5uaW5ncycsICdyZWZ1bmQnXSB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXJyYXkgb2YgY2xhaW1zIHRvIGJhdGNoJyxcbiAgICAgICAgfSxcbiAgICAgICAgdXNlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVXNlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnY2xhaW1zJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jbGFpbV9hZmZpbGlhdGVfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdW5zaWduZWQgdHJhbnNhY3Rpb24gdG8gY2xhaW0gYWZmaWxpYXRlIGVhcm5pbmdzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBjb2RlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0FmZmlsaWF0ZSBjb2RlJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBZmZpbGlhdGUgb3duZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBSQUNFIENMQUlNU1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY2xhaW1fcmFjZV93aW5uaW5nc190cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjbGFpbSB3aW5uaW5ncyBmcm9tIGEgcmVzb2x2ZWQgcmFjZSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHBvc2l0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgcG9zaXRpb24gUERBJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICdwb3NpdGlvbicsICd1c2VyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY2xhaW1fcmFjZV9yZWZ1bmRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdW5zaWduZWQgdHJhbnNhY3Rpb24gdG8gY2xhaW0gcmVmdW5kIGZyb20gY2FuY2VsbGVkIHJhY2UgbWFya2V0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBwb3NpdGlvbjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIHBvc2l0aW9uIFBEQScgfSxcbiAgICAgICAgdXNlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVXNlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAncG9zaXRpb24nLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBBRkZJTElBVEVcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3JlZ2lzdGVyX2FmZmlsaWF0ZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byByZWdpc3RlciBhcyBhbiBhZmZpbGlhdGUgd2l0aCBhIHVuaXF1ZSBjb2RlLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBjb2RlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0FmZmlsaWF0ZSBjb2RlICgzLTE2IGFscGhhbnVtZXJpYyBjaGFycyknIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ093bmVyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydjb2RlJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF90b2dnbGVfYWZmaWxpYXRlX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0FETUlOIE9OTFk6IEJ1aWxkIHRyYW5zYWN0aW9uIHRvIGFjdGl2YXRlL2RlYWN0aXZhdGUgYWZmaWxpYXRlLiBSZXF1aXJlcyBwcm90b2NvbCBhZG1pbiBzaWduYXR1cmUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNvZGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQWZmaWxpYXRlIGNvZGUnIH0sXG4gICAgICAgIGFjdGl2ZTogeyB0eXBlOiAnYm9vbGVhbicsIGRlc2NyaXB0aW9uOiAnTmV3IGFjdGl2ZSBzdGF0dXMnIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ093bmVyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydjb2RlJywgJ2FjdGl2ZScsICd1c2VyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBTSU1VTEFUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdzaW11bGF0ZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdTaW11bGF0ZSBhIHRyYW5zYWN0aW9uIGJlZm9yZSBzaWduaW5nIHRvIGNoZWNrIGZvciBlcnJvcnMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHRyYW5zYWN0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Jhc2U2NC1lbmNvZGVkIHRyYW5zYWN0aW9uJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCBwdWJsaWMga2V5JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3RyYW5zYWN0aW9uJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFJFU09MVVRJT04gU1lTVEVNXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdidWlsZF9wcm9wb3NlX3Jlc29sdXRpb25fdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gZm9yIGNyZWF0b3IgdG8gcHJvcG9zZSBtYXJrZXQgb3V0Y29tZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBvdXRjb21lOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdQcm9wb3NlZCBvdXRjb21lICh0cnVlPVllcywgZmFsc2U9Tm8pJyB9LFxuICAgICAgICBwcm9wb3Nlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJvcG9zZXIgd2FsbGV0IChjcmVhdG9yKScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnb3V0Y29tZScsICdwcm9wb3Nlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3Jlc29sdmVfbWFya2V0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGRpcmVjdGx5IHJlc29sdmUgYSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgb3V0Y29tZTogeyB0eXBlOiAnYm9vbGVhbicsIGRlc2NyaXB0aW9uOiAnV2lubmluZyBvdXRjb21lICh0cnVlPVllcywgZmFsc2U9Tm8pJyB9LFxuICAgICAgICByZXNvbHZlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmVzb2x2ZXIgd2FsbGV0IChjcmVhdG9yL29yYWNsZSknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ291dGNvbWUnLCAncmVzb2x2ZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9maW5hbGl6ZV9yZXNvbHV0aW9uX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGZpbmFsaXplIHJlc29sdXRpb24gYWZ0ZXIgZGlzcHV0ZSB3aW5kb3cuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgY2FsbGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDYWxsZXIgd2FsbGV0IChhbnlvbmUgY2FuIGZpbmFsaXplKScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnY2FsbGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfcHJvcG9zZV9yYWNlX3Jlc29sdXRpb25fdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gcHJvcG9zZSByYWNlIG1hcmtldCBvdXRjb21lLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICB3aW5uaW5nX291dGNvbWVfaW5kZXg6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnSW5kZXggb2Ygd2lubmluZyBvdXRjb21lICgwLWJhc2VkKScgfSxcbiAgICAgICAgcHJvcG9zZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1Byb3Bvc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICd3aW5uaW5nX291dGNvbWVfaW5kZXgnLCAncHJvcG9zZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9yZXNvbHZlX3JhY2VfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gZGlyZWN0bHkgcmVzb2x2ZSBhIHJhY2UgbWFya2V0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICB3aW5uaW5nX291dGNvbWVfaW5kZXg6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnSW5kZXggb2Ygd2lubmluZyBvdXRjb21lJyB9LFxuICAgICAgICByZXNvbHZlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmVzb2x2ZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ3dpbm5pbmdfb3V0Y29tZV9pbmRleCcsICdyZXNvbHZlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2ZpbmFsaXplX3JhY2VfcmVzb2x1dGlvbl90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBmaW5hbGl6ZSByYWNlIHJlc29sdXRpb24uJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGNhbGxlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ2FsbGVyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICdjYWxsZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIERJU1BVVEVTXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdidWlsZF9mbGFnX2Rpc3B1dGVfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gY2hhbGxlbmdlIGEgcHJvcG9zZWQgcmVzb2x1dGlvbiB3aXRoIGEgYm9uZC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBkaXNwdXRlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRGlzcHV0ZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdkaXNwdXRlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2ZsYWdfcmFjZV9kaXNwdXRlX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGRpc3B1dGUgYSByYWNlIG1hcmtldCByZXNvbHV0aW9uLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBkaXNwdXRlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRGlzcHV0ZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ2Rpc3B1dGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfdm90ZV9jb3VuY2lsX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIGZvciBjb3VuY2lsIG1lbWJlciB0byB2b3RlIG9uIGRpc3B1dGUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgdm90ZV95ZXM6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ1ZvdGUgZm9yIFllcyBvdXRjb21lJyB9LFxuICAgICAgICB2b3Rlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ291bmNpbCBtZW1iZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICd2b3RlX3llcycsICd2b3Rlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3ZvdGVfY291bmNpbF9yYWNlX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIGZvciBjb3VuY2lsIHRvIHZvdGUgb24gcmFjZSBkaXNwdXRlLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICB2b3RlX291dGNvbWVfaW5kZXg6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnT3V0Y29tZSBpbmRleCB0byB2b3RlIGZvcicgfSxcbiAgICAgICAgdm90ZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NvdW5jaWwgbWVtYmVyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICd2b3RlX291dGNvbWVfaW5kZXgnLCAndm90ZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFdISVRFTElTVCBNQU5BR0VNRU5UXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdidWlsZF9hZGRfdG9fd2hpdGVsaXN0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGFkZCB1c2VyIHRvIHByaXZhdGUgbWFya2V0IHdoaXRlbGlzdC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICB1c2VyX3RvX2FkZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCB0byB3aGl0ZWxpc3QnIH0sXG4gICAgICAgIGNyZWF0b3Jfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBjcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAndXNlcl90b19hZGQnLCAnY3JlYXRvcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3JlbW92ZV9mcm9tX3doaXRlbGlzdF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byByZW1vdmUgdXNlciBmcm9tIHdoaXRlbGlzdC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICB1c2VyX3RvX3JlbW92ZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCB0byByZW1vdmUnIH0sXG4gICAgICAgIGNyZWF0b3Jfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBjcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAndXNlcl90b19yZW1vdmUnLCAnY3JlYXRvcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NyZWF0ZV9yYWNlX3doaXRlbGlzdF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjcmVhdGUgd2hpdGVsaXN0IGZvciBwcml2YXRlIHJhY2UgbWFya2V0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgY3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAnY3JlYXRvcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2FkZF90b19yYWNlX3doaXRlbGlzdF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBhZGQgdXNlciB0byByYWNlIG1hcmtldCB3aGl0ZWxpc3QuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHVzZXJfdG9fYWRkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VzZXIgd2FsbGV0IHRvIHdoaXRlbGlzdCcgfSxcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IGNyZWF0b3Igd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ3VzZXJfdG9fYWRkJywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9yZW1vdmVfZnJvbV9yYWNlX3doaXRlbGlzdF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byByZW1vdmUgdXNlciBmcm9tIHJhY2Ugd2hpdGVsaXN0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICB1c2VyX3RvX3JlbW92ZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCB0byByZW1vdmUnIH0sXG4gICAgICAgIGNyZWF0b3Jfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBjcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICd1c2VyX3RvX3JlbW92ZScsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDUkVBVE9SIFBST0ZJTEVTXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdidWlsZF9jcmVhdGVfY3JlYXRvcl9wcm9maWxlX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGNyZWF0ZSBvbi1jaGFpbiBjcmVhdG9yIHByb2ZpbGUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGRpc3BsYXlfbmFtZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdEaXNwbGF5IG5hbWUgKG1heCAzMiBjaGFycyknIH0sXG4gICAgICAgIGNyZWF0b3JfZmVlX2JwczogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdDcmVhdG9yIGZlZSBpbiBiYXNpcyBwb2ludHMgKG1heCA1MCknIH0sXG4gICAgICAgIGNyZWF0b3Jfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NyZWF0b3Igd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2Rpc3BsYXlfbmFtZScsICdjcmVhdG9yX2ZlZV9icHMnLCAnY3JlYXRvcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3VwZGF0ZV9jcmVhdG9yX3Byb2ZpbGVfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gdXBkYXRlIGNyZWF0b3IgcHJvZmlsZS4gQm90aCBkaXNwbGF5X25hbWUgYW5kIGRlZmF1bHRfZmVlX2JwcyBhcmUgcmVxdWlyZWQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGRpc3BsYXlfbmFtZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdEaXNwbGF5IG5hbWUgKG1heCAzMiBjaGFycyknIH0sXG4gICAgICAgIGRlZmF1bHRfZmVlX2JwczogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdEZWZhdWx0IGZlZSBpbiBiYXNpcyBwb2ludHMgKG1heCA1MCA9IDAuNSUpJyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydkaXNwbGF5X25hbWUnLCAnZGVmYXVsdF9mZWVfYnBzJywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jbGFpbV9jcmVhdG9yX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGNsYWltIGFjY3VtdWxhdGVkIGNyZWF0b3IgZmVlcyBmcm9tIHNvbF90cmVhc3VyeS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnY3JlYXRvcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gTUFSS0VUIE1BTkFHRU1FTlRcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2Nsb3NlX21hcmtldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjbG9zZSBiZXR0aW5nIG9uIGEgbWFya2V0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGNhbGxlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ2FsbGVyIHdhbGxldCAoY3JlYXRvciknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ2NhbGxlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2V4dGVuZF9tYXJrZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQURNSU4gT05MWTogQnVpbGQgdHJhbnNhY3Rpb24gdG8gZXh0ZW5kIG1hcmtldCBkZWFkbGluZS4gUmVxdWlyZXMgcHJvdG9jb2wgYWRtaW4gc2lnbmF0dXJlLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIG5ld19jbG9zaW5nX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTmV3IGNsb3NpbmcgdGltZSAoSVNPIDg2MDEpJyB9LFxuICAgICAgICBuZXdfcmVzb2x1dGlvbl90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05ldyByZXNvbHV0aW9uIHRpbWUgKG9wdGlvbmFsKScgfSxcbiAgICAgICAgY2FsbGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDYWxsZXIgd2FsbGV0IChjcmVhdG9yKScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnbmV3X2Nsb3NpbmdfdGltZScsICdjYWxsZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jbG9zZV9yYWNlX21hcmtldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjbG9zZSBiZXR0aW5nIG9uIGEgcmFjZSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGNhbGxlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ2FsbGVyIHdhbGxldCAoY3JlYXRvciknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAnY2FsbGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfZXh0ZW5kX3JhY2VfbWFya2V0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0FETUlOIE9OTFk6IEJ1aWxkIHRyYW5zYWN0aW9uIHRvIGV4dGVuZCByYWNlIG1hcmtldCBkZWFkbGluZS4gUmVxdWlyZXMgcHJvdG9jb2wgYWRtaW4gc2lnbmF0dXJlLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBuZXdfY2xvc2luZ190aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05ldyBjbG9zaW5nIHRpbWUgKElTTyA4NjAxKScgfSxcbiAgICAgICAgbmV3X3Jlc29sdXRpb25fdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOZXcgcmVzb2x1dGlvbiB0aW1lIChvcHRpb25hbCknIH0sXG4gICAgICAgIGNhbGxlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ2FsbGVyIHdhbGxldCAoY3JlYXRvciknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAnbmV3X2Nsb3NpbmdfdGltZScsICdjYWxsZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jYW5jZWxfbWFya2V0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGNhbmNlbCBhIGJvb2xlYW4gbWFya2V0LiBBbGwgYmV0dG9ycyBjYW4gY2xhaW0gcmVmdW5kcyBhZnRlciBjYW5jZWxsYXRpb24uIE9ubHkgY3JlYXRvciBvciBhZG1pbiBjYW4gY2FuY2VsLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHJlYXNvbjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSZWFzb24gZm9yIGNhbmNlbGxhdGlvbicgfSxcbiAgICAgICAgYXV0aG9yaXR5X3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBdXRob3JpdHkgd2FsbGV0IChjcmVhdG9yIG9yIGFkbWluKScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAncmVhc29uJywgJ2F1dGhvcml0eV93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NhbmNlbF9yYWNlX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGNhbmNlbCBhIHJhY2UgbWFya2V0LiBBbGwgYmV0dG9ycyBjYW4gY2xhaW0gcmVmdW5kcyBhZnRlciBjYW5jZWxsYXRpb24uJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHJlYXNvbjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSZWFzb24gZm9yIGNhbmNlbGxhdGlvbicgfSxcbiAgICAgICAgYXV0aG9yaXR5X3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBdXRob3JpdHkgd2FsbGV0IChjcmVhdG9yIG9yIGFkbWluKScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICdyZWFzb24nLCAnYXV0aG9yaXR5X3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG5dO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVE9PTCBIQU5ETEVSU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZVRvb2woXG4gIG5hbWU6IHN0cmluZyxcbiAgYXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbik6IFByb21pc2U8eyBjb250ZW50OiBBcnJheTx7IHR5cGU6IHN0cmluZzsgdGV4dDogc3RyaW5nIH0+IH0+IHtcbiAgdHJ5IHtcbiAgICBzd2l0Y2ggKG5hbWUpIHtcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gTUFSS0VUIFJFQUQgT1BFUkFUSU9OU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdsaXN0X21hcmtldHMnOiB7XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IGFyZ3Muc3RhdHVzIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgbGF5ZXIgPSBhcmdzLmxheWVyIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IG1hcmtldHMgPSBhd2FpdCBsaXN0TWFya2V0cyhzdGF0dXMpO1xuICAgICAgICBpZiAobGF5ZXIpIHtcbiAgICAgICAgICBtYXJrZXRzID0gbWFya2V0cy5maWx0ZXIobSA9PiBtLmxheWVyLnRvTG93ZXJDYXNlKCkgPT09IGxheWVyLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIGNvdW50OiBtYXJrZXRzLmxlbmd0aCxcbiAgICAgICAgICBmaWx0ZXI6IHsgc3RhdHVzOiBzdGF0dXMgfHwgJ2FsbCcsIGxheWVyOiBsYXllciB8fCAnYWxsJyB9LFxuICAgICAgICAgIG1hcmtldHM6IG1hcmtldHMubWFwKG0gPT4gKHtcbiAgICAgICAgICAgIHB1YmxpY0tleTogbS5wdWJsaWNLZXksXG4gICAgICAgICAgICBtYXJrZXRJZDogbS5tYXJrZXRJZCxcbiAgICAgICAgICAgIHF1ZXN0aW9uOiBtLnF1ZXN0aW9uLFxuICAgICAgICAgICAgc3RhdHVzOiBtLnN0YXR1cyxcbiAgICAgICAgICAgIGxheWVyOiBtLmxheWVyLFxuICAgICAgICAgICAgd2lubmluZ091dGNvbWU6IG0ud2lubmluZ091dGNvbWUsXG4gICAgICAgICAgICB5ZXNQZXJjZW50OiBtLnllc1BlcmNlbnQsXG4gICAgICAgICAgICBub1BlcmNlbnQ6IG0ubm9QZXJjZW50LFxuICAgICAgICAgICAgdG90YWxQb29sU29sOiBtLnRvdGFsUG9vbFNvbCxcbiAgICAgICAgICAgIGNsb3NpbmdUaW1lOiBtLmNsb3NpbmdUaW1lLFxuICAgICAgICAgICAgaXNCZXR0aW5nT3BlbjogbS5pc0JldHRpbmdPcGVuLFxuICAgICAgICAgIH0pKSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9tYXJrZXQnOiB7XG4gICAgICAgIGNvbnN0IHB1YmxpY0tleSA9IGFyZ3MucHVibGljS2V5IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFwdWJsaWNLZXkpIHJldHVybiBlcnJvclJlc3BvbnNlKCdwdWJsaWNLZXkgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXdhaXQgZ2V0TWFya2V0KHB1YmxpY0tleSk7XG4gICAgICAgIGlmICghbWFya2V0KSByZXR1cm4gZXJyb3JSZXNwb25zZShgTWFya2V0ICR7cHVibGljS2V5fSBub3QgZm91bmRgKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IG1hcmtldCB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X3F1b3RlJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHNpZGUgPSBhcmdzLnNpZGUgYXMgJ1llcycgfCAnTm8nO1xuICAgICAgICBjb25zdCBhbW91bnQgPSBhcmdzLmFtb3VudCBhcyBudW1iZXI7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICFzaWRlIHx8IGFtb3VudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgc2lkZSwgYW5kIGFtb3VudCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBxdW90ZSA9IGF3YWl0IGdldFF1b3RlKG1hcmtldCwgc2lkZSwgYW1vdW50KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHF1b3RlIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFJBQ0UgTUFSS0VUU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdsaXN0X3JhY2VfbWFya2V0cyc6IHtcbiAgICAgICAgY29uc3Qgc3RhdHVzID0gYXJncy5zdGF0dXMgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBtYXJrZXRzID0gYXdhaXQgbGlzdFJhY2VNYXJrZXRzKHN0YXR1cyk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIGNvdW50OiBtYXJrZXRzLmxlbmd0aCxcbiAgICAgICAgICBtYXJrZXRzOiBtYXJrZXRzLm1hcChtID0+ICh7XG4gICAgICAgICAgICBwdWJsaWNLZXk6IG0ucHVibGljS2V5LFxuICAgICAgICAgICAgbWFya2V0SWQ6IG0ubWFya2V0SWQsXG4gICAgICAgICAgICBxdWVzdGlvbjogbS5xdWVzdGlvbixcbiAgICAgICAgICAgIHN0YXR1czogbS5zdGF0dXMsXG4gICAgICAgICAgICBvdXRjb21lQ291bnQ6IG0ub3V0Y29tZXMubGVuZ3RoLFxuICAgICAgICAgICAgb3V0Y29tZXM6IG0ub3V0Y29tZXMsXG4gICAgICAgICAgICB0b3RhbFBvb2xTb2w6IG0udG90YWxQb29sU29sLFxuICAgICAgICAgICAgY2xvc2luZ1RpbWU6IG0uY2xvc2luZ1RpbWUsXG4gICAgICAgICAgICBpc0JldHRpbmdPcGVuOiBtLmlzQmV0dGluZ09wZW4sXG4gICAgICAgICAgfSkpLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X3JhY2VfbWFya2V0Jzoge1xuICAgICAgICBjb25zdCBwdWJsaWNLZXkgPSBhcmdzLnB1YmxpY0tleSBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcHVibGljS2V5KSByZXR1cm4gZXJyb3JSZXNwb25zZSgncHVibGljS2V5IGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGF3YWl0IGdldFJhY2VNYXJrZXQocHVibGljS2V5KTtcbiAgICAgICAgaWYgKCFtYXJrZXQpIHJldHVybiBlcnJvclJlc3BvbnNlKGBSYWNlIG1hcmtldCAke3B1YmxpY0tleX0gbm90IGZvdW5kYCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBtYXJrZXQgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9yYWNlX3F1b3RlJzoge1xuICAgICAgICBjb25zdCBtYXJrZXRQZGEgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG91dGNvbWVJbmRleCA9IGFyZ3Mub3V0Y29tZUluZGV4IGFzIG51bWJlcjtcbiAgICAgICAgY29uc3QgYW1vdW50ID0gYXJncy5hbW91bnQgYXMgbnVtYmVyO1xuICAgICAgICBpZiAoIW1hcmtldFBkYSB8fCBvdXRjb21lSW5kZXggPT09IHVuZGVmaW5lZCB8fCBhbW91bnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIG91dGNvbWVJbmRleCwgYW5kIGFtb3VudCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXJrZXQgPSBhd2FpdCBnZXRSYWNlTWFya2V0KG1hcmtldFBkYSk7XG4gICAgICAgIGlmICghbWFya2V0KSByZXR1cm4gZXJyb3JSZXNwb25zZSgnUmFjZSBtYXJrZXQgbm90IGZvdW5kJyk7XG4gICAgICAgIGNvbnN0IHF1b3RlID0gZ2V0UmFjZVF1b3RlKG1hcmtldCwgb3V0Y29tZUluZGV4LCBhbW91bnQpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgcXVvdGUsIG1hcmtldDogeyBxdWVzdGlvbjogbWFya2V0LnF1ZXN0aW9uLCBvdXRjb21lczogbWFya2V0Lm91dGNvbWVzIH0gfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gUE9TSVRJT05TICYgQ0xBSU1TXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2dldF9wb3NpdGlvbnMnOiB7XG4gICAgICAgIGNvbnN0IHdhbGxldCA9IGFyZ3Mud2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCF3YWxsZXQpIHJldHVybiBlcnJvclJlc3BvbnNlKCd3YWxsZXQgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3Qgc3VtbWFyeSA9IGF3YWl0IGdldFBvc2l0aW9uc1N1bW1hcnkod2FsbGV0KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZShzdW1tYXJ5KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X2NsYWltYWJsZSc6IHtcbiAgICAgICAgY29uc3Qgd2FsbGV0ID0gYXJncy53YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXdhbGxldCkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3dhbGxldCBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBjbGFpbWFibGUgPSBhd2FpdCBnZXRDbGFpbWFibGVQb3NpdGlvbnMod2FsbGV0KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZShjbGFpbWFibGUpO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFJFU09MVVRJT04gJiBESVNQVVRFU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdnZXRfcmVzb2x1dGlvbl9zdGF0dXMnOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQpIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgZ2V0UmVzb2x1dGlvblN0YXR1cyhtYXJrZXQpO1xuICAgICAgICBpZiAoIXN0YXR1cykgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ01hcmtldCBub3QgZm91bmQnKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZShzdGF0dXMpO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfZGlzcHV0ZWRfbWFya2V0cyc6IHtcbiAgICAgICAgY29uc3QgZGlzcHV0ZXMgPSBhd2FpdCBnZXREaXNwdXRlZE1hcmtldHMoKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IGNvdW50OiBkaXNwdXRlcy5sZW5ndGgsIGRpc3B1dGVzIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfbWFya2V0c19hd2FpdGluZ19yZXNvbHV0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXRzID0gYXdhaXQgZ2V0TWFya2V0c0F3YWl0aW5nUmVzb2x1dGlvbigpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBjb3VudDogbWFya2V0cy5sZW5ndGgsXG4gICAgICAgICAgbWFya2V0czogbWFya2V0cy5tYXAobSA9PiAoe1xuICAgICAgICAgICAgcHVibGljS2V5OiBtLnB1YmxpY0tleSxcbiAgICAgICAgICAgIHF1ZXN0aW9uOiBtLnF1ZXN0aW9uLFxuICAgICAgICAgICAgY2xvc2luZ1RpbWU6IG0uY2xvc2luZ1RpbWUsXG4gICAgICAgICAgICByZXNvbHV0aW9uVGltZTogbS5yZXNvbHV0aW9uVGltZSxcbiAgICAgICAgICB9KSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIEFJIEFHRU5UIEFGRklMSUFURSBORVRXT1JLXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2NoZWNrX2FmZmlsaWF0ZV9jb2RlJzoge1xuICAgICAgICBjb25zdCBjb2RlID0gYXJncy5jb2RlIGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFjb2RlKSByZXR1cm4gZXJyb3JSZXNwb25zZSgnY29kZSBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBhdmFpbGFibGUgPSBhd2FpdCBpc0FmZmlsaWF0ZUNvZGVBdmFpbGFibGUoY29kZSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBjb2RlLCBhdmFpbGFibGUgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ3N1Z2dlc3RfYWZmaWxpYXRlX2NvZGVzJzoge1xuICAgICAgICBjb25zdCBhZ2VudE5hbWUgPSBhcmdzLmFnZW50TmFtZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNvdW50ID0gKGFyZ3MuY291bnQgYXMgbnVtYmVyKSB8fCA1O1xuICAgICAgICBpZiAoIWFnZW50TmFtZSkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2FnZW50TmFtZSBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBzdWdnZXN0aW9ucyA9IGF3YWl0IHN1Z2dlc3RBZmZpbGlhdGVDb2RlcyhhZ2VudE5hbWUsIGNvdW50KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHN1Z2dlc3Rpb25zIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfYWZmaWxpYXRlX2luZm8nOiB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBhcmdzLmNvZGUgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIWNvZGUpIHJldHVybiBlcnJvclJlc3BvbnNlKCdjb2RlIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IGFmZmlsaWF0ZSA9IGF3YWl0IGdldEFmZmlsaWF0ZUJ5Q29kZShjb2RlKTtcbiAgICAgICAgaWYgKCFhZmZpbGlhdGUpIHJldHVybiBlcnJvclJlc3BvbnNlKGBBZmZpbGlhdGUgJHtjb2RlfSBub3QgZm91bmRgKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IGFmZmlsaWF0ZSB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X215X2FmZmlsaWF0ZXMnOiB7XG4gICAgICAgIGNvbnN0IHdhbGxldCA9IGFyZ3Mud2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCF3YWxsZXQpIHJldHVybiBlcnJvclJlc3BvbnNlKCd3YWxsZXQgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3QgYWZmaWxpYXRlcyA9IGF3YWl0IGdldEFmZmlsaWF0ZXNCeU93bmVyKHdhbGxldCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBjb3VudDogYWZmaWxpYXRlcy5sZW5ndGgsIGFmZmlsaWF0ZXMgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9yZWZlcnJhbHMnOiB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBhcmdzLmNvZGUgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIWNvZGUpIHJldHVybiBlcnJvclJlc3BvbnNlKCdjb2RlIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IHJlZmVycmFscyA9IGF3YWl0IGdldFJlZmVycmFsc0J5QWZmaWxpYXRlKGNvZGUpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgY291bnQ6IHJlZmVycmFscy5sZW5ndGgsIHJlZmVycmFscyB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X2FnZW50X25ldHdvcmtfc3RhdHMnOiB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZ2V0QWdlbnROZXR3b3JrU3RhdHMoKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZShzdGF0cyk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2Zvcm1hdF9hZmZpbGlhdGVfbGluayc6IHtcbiAgICAgICAgY29uc3QgY29kZSA9IGFyZ3MuY29kZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKCFjb2RlKSByZXR1cm4gZXJyb3JSZXNwb25zZSgnY29kZSBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBsaW5rID0gZm9ybWF0QWZmaWxpYXRlTGluayhjb2RlLCBtYXJrZXQpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgbGluaywgY29kZSwgbWFya2V0IH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfY29tbWlzc2lvbl9pbmZvJzoge1xuICAgICAgICBjb25zdCBpbmZvID0gZ2V0Q29tbWlzc2lvbkluZm8oKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZShpbmZvKTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBWQUxJREFUSU9OXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ3ZhbGlkYXRlX21hcmtldF9wYXJhbXMnOiB7XG4gICAgICAgIGNvbnN0IHBhcmFtczogTWFya2V0VGltaW5nUGFyYW1zID0ge1xuICAgICAgICAgIHF1ZXN0aW9uOiBhcmdzLnF1ZXN0aW9uIGFzIHN0cmluZyxcbiAgICAgICAgICBjbG9zaW5nVGltZTogbmV3IERhdGUoYXJncy5jbG9zaW5nX3RpbWUgYXMgc3RyaW5nKSxcbiAgICAgICAgICBtYXJrZXRUeXBlOiBhcmdzLm1hcmtldF90eXBlIGFzICdldmVudCcgfCAnbWVhc3VyZW1lbnQnLFxuICAgICAgICAgIGV2ZW50VGltZTogYXJncy5ldmVudF90aW1lID8gbmV3IERhdGUoYXJncy5ldmVudF90aW1lIGFzIHN0cmluZykgOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWVhc3VyZW1lbnRTdGFydDogYXJncy5tZWFzdXJlbWVudF9zdGFydCA/IG5ldyBEYXRlKGFyZ3MubWVhc3VyZW1lbnRfc3RhcnQgYXMgc3RyaW5nKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBtZWFzdXJlbWVudEVuZDogYXJncy5tZWFzdXJlbWVudF9lbmQgPyBuZXcgRGF0ZShhcmdzLm1lYXN1cmVtZW50X2VuZCBhcyBzdHJpbmcpIDogdW5kZWZpbmVkLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsaWRhdGVNYXJrZXRUaW1pbmcocGFyYW1zKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHZhbGlkYXRpb24sIHJ1bGVzOiBUSU1JTkcgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ3ZhbGlkYXRlX2JldCc6IHtcbiAgICAgICAgY29uc3QgbWFya2V0UHVia2V5ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBhbW91bnQgPSBhcmdzLmFtb3VudCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IHNpZGUgPSBhcmdzLnNpZGUgYXMgJ1llcycgfCAnTm8nO1xuICAgICAgICBpZiAoIW1hcmtldFB1YmtleSB8fCBhbW91bnQgPT09IHVuZGVmaW5lZCB8fCAhc2lkZSkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIGFtb3VudCwgYW5kIHNpZGUgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWFya2V0RGF0YSA9IGF3YWl0IGdldE1hcmtldEZvckJldHRpbmcobWFya2V0UHVia2V5KTtcbiAgICAgICAgaWYgKCFtYXJrZXREYXRhIHx8ICFtYXJrZXREYXRhLm1hcmtldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKGBNYXJrZXQgJHttYXJrZXRQdWJrZXl9IG5vdCBmb3VuZGApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgbWFya2V0IH0gPSBtYXJrZXREYXRhO1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsaWRhdGVCZXQoe1xuICAgICAgICAgIGFtb3VudFNvbDogYW1vdW50LFxuICAgICAgICAgIG1hcmtldFN0YXR1czogbWFya2V0LnN0YXR1c0NvZGUsXG4gICAgICAgICAgY2xvc2luZ1RpbWU6IG5ldyBEYXRlKG1hcmtldC5jbG9zaW5nVGltZSksXG4gICAgICAgICAgaXNQYXVzZWQ6IGZhbHNlLFxuICAgICAgICAgIGFjY2Vzc0dhdGU6IG1hcmtldC5hY2Nlc3NHYXRlID09PSAnV2hpdGVsaXN0JyA/IDEgOiAwLFxuICAgICAgICAgIGxheWVyOiBtYXJrZXQubGF5ZXJDb2RlLFxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgcXVvdGUgPSBjYWxjdWxhdGVCZXRRdW90ZSh7XG4gICAgICAgICAgYmV0QW1vdW50U29sOiBhbW91bnQsXG4gICAgICAgICAgc2lkZSxcbiAgICAgICAgICBjdXJyZW50WWVzUG9vbDogbWFya2V0Lnllc1Bvb2xTb2wsXG4gICAgICAgICAgY3VycmVudE5vUG9vbDogbWFya2V0Lm5vUG9vbFNvbCxcbiAgICAgICAgICBwbGF0Zm9ybUZlZUJwczogbWFya2V0LnBsYXRmb3JtRmVlQnBzLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHZhbGlkYXRpb24sIG1hcmtldDogeyBwdWJsaWNLZXk6IG1hcmtldFB1YmtleSwgcXVlc3Rpb246IG1hcmtldC5xdWVzdGlvbiwgc3RhdHVzOiBtYXJrZXQuc3RhdHVzIH0sIHF1b3RlOiB2YWxpZGF0aW9uLnZhbGlkID8gcXVvdGUgOiBudWxsIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFRSQU5TQUNUSU9OIEJVSUxESU5HIC0gQkVUU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdidWlsZF9iZXRfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldFB1YmtleSA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgb3V0Y29tZSA9IGFyZ3Mub3V0Y29tZSBhcyAneWVzJyB8ICdubyc7XG4gICAgICAgIGNvbnN0IGFtb3VudFNvbCA9IGFyZ3MuYW1vdW50X3NvbCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXRQdWJrZXkgfHwgIW91dGNvbWUgfHwgYW1vdW50U29sID09PSB1bmRlZmluZWQgfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBvdXRjb21lLCBhbW91bnRfc29sLCBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFtb3VudFNvbCA8IEJFVF9MSU1JVFMuTUlOX0JFVF9TT0wgfHwgYW1vdW50U29sID4gQkVUX0xJTUlUUy5NQVhfQkVUX1NPTCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKGBBbW91bnQgbXVzdCBiZSBiZXR3ZWVuICR7QkVUX0xJTUlUUy5NSU5fQkVUX1NPTH0gYW5kICR7QkVUX0xJTUlUUy5NQVhfQkVUX1NPTH0gU09MYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZmV0Y2hBbmRCdWlsZEJldFRyYW5zYWN0aW9uKHsgbWFya2V0UGRhOiBtYXJrZXRQdWJrZXksIHVzZXJXYWxsZXQsIG91dGNvbWUsIGFtb3VudFNvbCB9KTtcbiAgICAgICAgaWYgKHJlc3VsdC5lcnJvciB8fCAhcmVzdWx0LnRyYW5zYWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UocmVzdWx0LmVycm9yIHx8ICdGYWlsZWQgdG8gYnVpbGQgdHJhbnNhY3Rpb24nKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb25uZWN0aW9uID0gbmV3IENvbm5lY3Rpb24oUlBDX0VORFBPSU5ULCAnY29uZmlybWVkJyk7XG4gICAgICAgIGNvbnN0IHNpbXVsYXRpb24gPSBhd2FpdCBzaW11bGF0ZUJldFRyYW5zYWN0aW9uKHJlc3VsdC50cmFuc2FjdGlvbi50cmFuc2FjdGlvbiwgbmV3IFB1YmxpY0tleSh1c2VyV2FsbGV0KSwgY29ubmVjdGlvbik7XG4gICAgICAgIGNvbnN0IHF1b3RlID0gYXdhaXQgZ2V0UXVvdGUobWFya2V0UHVia2V5LCBvdXRjb21lID09PSAneWVzJyA/ICdZZXMnIDogJ05vJywgYW1vdW50U29sKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnRyYW5zYWN0aW9uLnNlcmlhbGl6ZWRUeCwgcG9zaXRpb25QZGE6IHJlc3VsdC50cmFuc2FjdGlvbi5wb3NpdGlvblBkYS50b0Jhc2U1OCgpIH0sXG4gICAgICAgICAgc2ltdWxhdGlvbjogeyBzdWNjZXNzOiBzaW11bGF0aW9uLnN1Y2Nlc3MsIHVuaXRzQ29uc3VtZWQ6IHNpbXVsYXRpb24udW5pdHNDb25zdW1lZCwgZXJyb3I6IHNpbXVsYXRpb24uZXJyb3IgfSxcbiAgICAgICAgICBxdW90ZTogcXVvdGUudmFsaWQgPyB7IGV4cGVjdGVkUGF5b3V0U29sOiBxdW90ZS5leHBlY3RlZFBheW91dFNvbCwgcG90ZW50aWFsUHJvZml0U29sOiBxdW90ZS5wb3RlbnRpYWxQcm9maXRTb2wgfSA6IG51bGwsXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0aGUgdHJhbnNhY3Rpb24gd2l0aCB5b3VyIHdhbGxldCBhbmQgc2VuZCB0byBTb2xhbmEgbmV0d29yaycsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9yYWNlX2JldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0UHVia2V5ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBvdXRjb21lSW5kZXggPSBhcmdzLm91dGNvbWVfaW5kZXggYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBhbW91bnRTb2wgPSBhcmdzLmFtb3VudF9zb2wgYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCB1c2VyV2FsbGV0ID0gYXJncy51c2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0UHVia2V5IHx8IG91dGNvbWVJbmRleCA9PT0gdW5kZWZpbmVkIHx8IGFtb3VudFNvbCA9PT0gdW5kZWZpbmVkIHx8ICF1c2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgb3V0Y29tZV9pbmRleCwgYW1vdW50X3NvbCwgYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZldGNoQW5kQnVpbGRSYWNlQmV0VHJhbnNhY3Rpb24oeyByYWNlTWFya2V0UGRhOiBtYXJrZXRQdWJrZXksIG91dGNvbWVJbmRleCwgYW1vdW50U29sLCB1c2VyV2FsbGV0IH0pO1xuICAgICAgICBpZiAocmVzdWx0LmVycm9yIHx8ICFyZXN1bHQudHJhbnNhY3Rpb24pIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShyZXN1bHQuZXJyb3IgfHwgJ0ZhaWxlZCB0byBidWlsZCB0cmFuc2FjdGlvbicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC50cmFuc2FjdGlvbi5zZXJpYWxpemVkVHgsIHBvc2l0aW9uUGRhOiByZXN1bHQudHJhbnNhY3Rpb24ucG9zaXRpb25QZGEgfSxcbiAgICAgICAgICBtYXJrZXRJZDogcmVzdWx0Lm1hcmtldElkLnRvU3RyaW5nKCksXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0aGUgdHJhbnNhY3Rpb24gd2l0aCB5b3VyIHdhbGxldCBhbmQgc2VuZCB0byBTb2xhbmEgbmV0d29yaycsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFRSQU5TQUNUSU9OIEJVSUxESU5HIC0gQ0xBSU1TXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2J1aWxkX2NsYWltX3dpbm5pbmdzX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gYXJncy5wb3NpdGlvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgIXBvc2l0aW9uIHx8ICF1c2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgcG9zaXRpb24sIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENsYWltV2lubmluZ3NUcmFuc2FjdGlvbih7IG1hcmtldFBkYTogbWFya2V0LCBwb3NpdGlvblBkYTogcG9zaXRpb24sIHVzZXJXYWxsZXQgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4LCBjbGFpbVR5cGU6IHJlc3VsdC5jbGFpbVR5cGUgfSwgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBjbGFpbSB5b3VyIHdpbm5pbmdzJyB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY2xhaW1fcmVmdW5kX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gYXJncy5wb3NpdGlvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgIXBvc2l0aW9uIHx8ICF1c2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgcG9zaXRpb24sIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENsYWltUmVmdW5kVHJhbnNhY3Rpb24oeyBtYXJrZXRQZGE6IG1hcmtldCwgcG9zaXRpb25QZGE6IHBvc2l0aW9uLCB1c2VyV2FsbGV0IH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCwgY2xhaW1UeXBlOiByZXN1bHQuY2xhaW1UeXBlIH0sIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY2xhaW0geW91ciByZWZ1bmQnIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9iYXRjaF9jbGFpbV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgY2xhaW1zID0gYXJncy5jbGFpbXMgYXMgQXJyYXk8eyBtYXJrZXQ6IHN0cmluZzsgcG9zaXRpb246IHN0cmluZzsgdHlwZTogJ3dpbm5pbmdzJyB8ICdyZWZ1bmQnIH0+O1xuICAgICAgICBjb25zdCB1c2VyV2FsbGV0ID0gYXJncy51c2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghY2xhaW1zIHx8ICF1c2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2NsYWltcyBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRCYXRjaENsYWltVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIGNsYWltczogY2xhaW1zLm1hcChjID0+ICh7IG1hcmtldFBkYTogYy5tYXJrZXQsIHBvc2l0aW9uUGRhOiBjLnBvc2l0aW9uLCBjbGFpbVR5cGU6IGMudHlwZSB9KSksXG4gICAgICAgICAgdXNlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4LCBjbGFpbUNvdW50OiByZXN1bHQuY2xhaW1Db3VudCB9LCBpbnN0cnVjdGlvbnM6IGBTaWduIHRvIGNsYWltICR7cmVzdWx0LmNsYWltQ291bnR9IHBvc2l0aW9uc2AgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NsYWltX2FmZmlsaWF0ZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgY29kZSA9IGFyZ3MuY29kZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFjb2RlIHx8ICF1c2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2NvZGUgYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2xhaW1BZmZpbGlhdGVUcmFuc2FjdGlvbih7IGFmZmlsaWF0ZUNvZGU6IGNvZGUsIHVzZXJXYWxsZXQgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4LCBjbGFpbVR5cGU6IHJlc3VsdC5jbGFpbVR5cGUgfSwgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBjbGFpbSBhZmZpbGlhdGUgZWFybmluZ3MnIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFRSQU5TQUNUSU9OIEJVSUxESU5HIC0gUkFDRSBDTEFJTVNcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnYnVpbGRfY2xhaW1fcmFjZV93aW5uaW5nc190cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IGFyZ3MucG9zaXRpb24gYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyV2FsbGV0ID0gYXJncy51c2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCAhcG9zaXRpb24gfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIHBvc2l0aW9uLCBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDbGFpbVJhY2VXaW5uaW5nc1RyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIHBvc2l0aW9uUGRhOiBwb3NpdGlvbixcbiAgICAgICAgICB1c2VyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY2xhaW0gcmFjZSBtYXJrZXQgd2lubmluZ3MnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY2xhaW1fcmFjZV9yZWZ1bmRfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBhcmdzLnBvc2l0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgIXBvc2l0aW9uIHx8ICF1c2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0LCBwb3NpdGlvbiwgYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2xhaW1SYWNlUmVmdW5kVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgcG9zaXRpb25QZGE6IHBvc2l0aW9uLFxuICAgICAgICAgIHVzZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBjbGFpbSByYWNlIG1hcmtldCByZWZ1bmQnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBUUkFOU0FDVElPTiBCVUlMRElORyAtIEFGRklMSUFURVxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdidWlsZF9yZWdpc3Rlcl9hZmZpbGlhdGVfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBhcmdzLmNvZGUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyV2FsbGV0ID0gYXJncy51c2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghY29kZSB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdjb2RlIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhdmFpbGFibGUgPSBhd2FpdCBpc0FmZmlsaWF0ZUNvZGVBdmFpbGFibGUoY29kZSk7XG4gICAgICAgIGlmICghYXZhaWxhYmxlKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoYEFmZmlsaWF0ZSBjb2RlIFwiJHtjb2RlfVwiIGlzIGFscmVhZHkgdGFrZW5gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFJlZ2lzdGVyQWZmaWxpYXRlVHJhbnNhY3Rpb24oeyBjb2RlLCB1c2VyV2FsbGV0IH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4LCBhZmZpbGlhdGVQZGE6IHJlc3VsdC5hZmZpbGlhdGVQZGEgfSxcbiAgICAgICAgICBjb2RlOiByZXN1bHQuY29kZSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIHJlZ2lzdGVyIGFzIGFmZmlsaWF0ZScsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF90b2dnbGVfYWZmaWxpYXRlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBjb2RlID0gYXJncy5jb2RlIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgYWN0aXZlID0gYXJncy5hY3RpdmUgYXMgYm9vbGVhbjtcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIWNvZGUgfHwgYWN0aXZlID09PSB1bmRlZmluZWQgfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnY29kZSwgYWN0aXZlLCBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRUb2dnbGVBZmZpbGlhdGVUcmFuc2FjdGlvbih7IGNvZGUsIGFjdGl2ZSwgdXNlcldhbGxldCB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCwgYWZmaWxpYXRlUGRhOiByZXN1bHQuYWZmaWxpYXRlUGRhIH0sXG4gICAgICAgICAgbmV3U3RhdHVzOiByZXN1bHQubmV3U3RhdHVzLFxuICAgICAgICAgIGluc3RydWN0aW9uczogYFNpZ24gdG8gJHthY3RpdmUgPyAnYWN0aXZhdGUnIDogJ2RlYWN0aXZhdGUnfSBhZmZpbGlhdGVgLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBTSU1VTEFUSU9OXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ3NpbXVsYXRlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCB0eEJhc2U2NCA9IGFyZ3MudHJhbnNhY3Rpb24gYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyV2FsbGV0ID0gYXJncy51c2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghdHhCYXNlNjQgfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgndHJhbnNhY3Rpb24gYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbm5lY3Rpb24gPSBuZXcgQ29ubmVjdGlvbihSUENfRU5EUE9JTlQsICdjb25maXJtZWQnKTtcbiAgICAgICAgY29uc3QgdHhCdWZmZXIgPSBCdWZmZXIuZnJvbSh0eEJhc2U2NCwgJ2Jhc2U2NCcpO1xuICAgICAgICBjb25zdCB0cmFuc2FjdGlvbiA9IFRyYW5zYWN0aW9uLmZyb20odHhCdWZmZXIpO1xuICAgICAgICBjb25zdCBzaW11bGF0aW9uID0gYXdhaXQgY29ubmVjdGlvbi5zaW11bGF0ZVRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgc2ltdWxhdGlvbjoge1xuICAgICAgICAgICAgc3VjY2VzczogIXNpbXVsYXRpb24udmFsdWUuZXJyLFxuICAgICAgICAgICAgZXJyb3I6IHNpbXVsYXRpb24udmFsdWUuZXJyID8gSlNPTi5zdHJpbmdpZnkoc2ltdWxhdGlvbi52YWx1ZS5lcnIpIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgdW5pdHNDb25zdW1lZDogc2ltdWxhdGlvbi52YWx1ZS51bml0c0NvbnN1bWVkLFxuICAgICAgICAgICAgbG9nczogc2ltdWxhdGlvbi52YWx1ZS5sb2dzLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIE1BUktFVCBDUkVBVElPTlxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdwcmV2aWV3X2NyZWF0ZV9tYXJrZXQnOiB7XG4gICAgICAgIGNvbnN0IHF1ZXN0aW9uID0gYXJncy5xdWVzdGlvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGxheWVyID0gYXJncy5sYXllciBhcyAnbGFiJyB8ICdwcml2YXRlJztcbiAgICAgICAgY29uc3QgY2xvc2luZ1RpbWUgPSBhcmdzLmNsb3NpbmdfdGltZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHJlc29sdXRpb25UaW1lID0gYXJncy5yZXNvbHV0aW9uX3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBtYXJrZXRUeXBlID0gYXJncy5tYXJrZXRfdHlwZSBhcyAnZXZlbnQnIHwgJ21lYXN1cmVtZW50JyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgZXZlbnRUaW1lID0gYXJncy5ldmVudF90aW1lIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgbWVhc3VyZW1lbnRTdGFydCA9IGFyZ3MubWVhc3VyZW1lbnRfc3RhcnQgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBtZWFzdXJlbWVudEVuZCA9IGFyZ3MubWVhc3VyZW1lbnRfZW5kIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuXG4gICAgICAgIGlmICghcXVlc3Rpb24gfHwgIWxheWVyIHx8ICFjbG9zaW5nVGltZSB8fCAhY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdxdWVzdGlvbiwgbGF5ZXIsIGNsb3NpbmdfdGltZSwgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJldmlldyA9IGF3YWl0IHByZXZpZXdNYXJrZXRDcmVhdGlvbih7XG4gICAgICAgICAgcXVlc3Rpb24sXG4gICAgICAgICAgbGF5ZXIsXG4gICAgICAgICAgY2xvc2luZ1RpbWUsXG4gICAgICAgICAgcmVzb2x1dGlvblRpbWUsXG4gICAgICAgICAgbWFya2V0VHlwZSxcbiAgICAgICAgICBldmVudFRpbWUsXG4gICAgICAgICAgbWVhc3VyZW1lbnRTdGFydCxcbiAgICAgICAgICBtZWFzdXJlbWVudEVuZCxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBwcmV2aWV3LFxuICAgICAgICAgIHRpbWluZzoge1xuICAgICAgICAgICAgcnVsZXM6IFRJTUlORyxcbiAgICAgICAgICAgIHJ1bGVBcHBsaWVkOiBwcmV2aWV3LnZhbGlkYXRpb24uY29tcHV0ZWQucnVsZVR5cGUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NyZWF0ZV9sYWJfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBxdWVzdGlvbiA9IGFyZ3MucXVlc3Rpb24gYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjbG9zaW5nVGltZSA9IGFyZ3MuY2xvc2luZ190aW1lIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgcmVzb2x1dGlvblRpbWUgPSBhcmdzLnJlc29sdXRpb25fdGltZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1hcmtldFR5cGUgPSBhcmdzLm1hcmtldF90eXBlIGFzICdldmVudCcgfCAnbWVhc3VyZW1lbnQnIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBldmVudFRpbWUgPSBhcmdzLmV2ZW50X3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBpbnZpdGVIYXNoID0gYXJncy5pbnZpdGVfaGFzaCBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcblxuICAgICAgICBpZiAoIXF1ZXN0aW9uIHx8ICFjbG9zaW5nVGltZSB8fCAhY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdxdWVzdGlvbiwgY2xvc2luZ190aW1lLCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjcmVhdGVMYWJNYXJrZXQoe1xuICAgICAgICAgIHF1ZXN0aW9uLFxuICAgICAgICAgIGxheWVyOiAnbGFiJyxcbiAgICAgICAgICBjbG9zaW5nVGltZSxcbiAgICAgICAgICByZXNvbHV0aW9uVGltZSxcbiAgICAgICAgICBtYXJrZXRUeXBlLFxuICAgICAgICAgIGV2ZW50VGltZSxcbiAgICAgICAgICBpbnZpdGVIYXNoLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShyZXN1bHQuZXJyb3IgfHwgJ1ZhbGlkYXRpb24gZmFpbGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogcmVzdWx0LnRyYW5zYWN0aW9uLFxuICAgICAgICAgIHZhbGlkYXRpb246IHJlc3VsdC52YWxpZGF0aW9uLFxuICAgICAgICAgIHNpbXVsYXRpb246IHJlc3VsdC5zaW11bGF0aW9uLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdGhlIHRyYW5zYWN0aW9uIHdpdGggeW91ciB3YWxsZXQgdG8gY3JlYXRlIHRoZSBtYXJrZXQnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY3JlYXRlX3ByaXZhdGVfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBxdWVzdGlvbiA9IGFyZ3MucXVlc3Rpb24gYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjbG9zaW5nVGltZSA9IGFyZ3MuY2xvc2luZ190aW1lIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgcmVzb2x1dGlvblRpbWUgPSBhcmdzLnJlc29sdXRpb25fdGltZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1hcmtldFR5cGUgPSBhcmdzLm1hcmtldF90eXBlIGFzICdldmVudCcgfCAnbWVhc3VyZW1lbnQnIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBldmVudFRpbWUgPSBhcmdzLmV2ZW50X3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBpbnZpdGVIYXNoID0gYXJncy5pbnZpdGVfaGFzaCBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcblxuICAgICAgICBpZiAoIXF1ZXN0aW9uIHx8ICFjbG9zaW5nVGltZSB8fCAhY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdxdWVzdGlvbiwgY2xvc2luZ190aW1lLCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjcmVhdGVQcml2YXRlTWFya2V0KHtcbiAgICAgICAgICBxdWVzdGlvbixcbiAgICAgICAgICBsYXllcjogJ3ByaXZhdGUnLFxuICAgICAgICAgIGNsb3NpbmdUaW1lLFxuICAgICAgICAgIHJlc29sdXRpb25UaW1lLFxuICAgICAgICAgIG1hcmtldFR5cGUsXG4gICAgICAgICAgZXZlbnRUaW1lLFxuICAgICAgICAgIGludml0ZUhhc2gsXG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKHJlc3VsdC5lcnJvciB8fCAnVmFsaWRhdGlvbiBmYWlsZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiByZXN1bHQudHJhbnNhY3Rpb24sXG4gICAgICAgICAgdmFsaWRhdGlvbjogcmVzdWx0LnZhbGlkYXRpb24sXG4gICAgICAgICAgc2ltdWxhdGlvbjogcmVzdWx0LnNpbXVsYXRpb24sXG4gICAgICAgICAgaW52aXRlSGFzaDogaW52aXRlSGFzaCB8fCAnR2VuZXJhdGUgd2l0aCBnZW5lcmF0ZV9pbnZpdGVfaGFzaCB0b29sJyxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRoZSB0cmFuc2FjdGlvbiB3aXRoIHlvdXIgd2FsbGV0IHRvIGNyZWF0ZSB0aGUgcHJpdmF0ZSBtYXJrZXQnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY3JlYXRlX3JhY2VfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBxdWVzdGlvbiA9IGFyZ3MucXVlc3Rpb24gYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBvdXRjb21lcyA9IGFyZ3Mub3V0Y29tZXMgYXMgc3RyaW5nW107XG4gICAgICAgIGNvbnN0IGNsb3NpbmdUaW1lID0gYXJncy5jbG9zaW5nX3RpbWUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCByZXNvbHV0aW9uVGltZSA9IGFyZ3MucmVzb2x1dGlvbl90aW1lIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuXG4gICAgICAgIGlmICghcXVlc3Rpb24gfHwgIW91dGNvbWVzIHx8ICFjbG9zaW5nVGltZSB8fCAhY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdxdWVzdGlvbiwgb3V0Y29tZXMsIGNsb3NpbmdfdGltZSwgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG91dGNvbWVzLmxlbmd0aCA8IDIgfHwgb3V0Y29tZXMubGVuZ3RoID4gMTApIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnb3V0Y29tZXMgbXVzdCBoYXZlIDItMTAgZW50cmllcycpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlUmFjZU1hcmtldCh7XG4gICAgICAgICAgcXVlc3Rpb24sXG4gICAgICAgICAgb3V0Y29tZXMsXG4gICAgICAgICAgY2xvc2luZ1RpbWUsXG4gICAgICAgICAgcmVzb2x1dGlvblRpbWUsXG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKHJlc3VsdC5lcnJvciB8fCAnVmFsaWRhdGlvbiBmYWlsZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiByZXN1bHQudHJhbnNhY3Rpb24sXG4gICAgICAgICAgdmFsaWRhdGlvbjogcmVzdWx0LnZhbGlkYXRpb24sXG4gICAgICAgICAgc2ltdWxhdGlvbjogcmVzdWx0LnNpbXVsYXRpb24sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0aGUgdHJhbnNhY3Rpb24gd2l0aCB5b3VyIHdhbGxldCB0byBjcmVhdGUgdGhlIHJhY2UgbWFya2V0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9jcmVhdGlvbl9mZWVzJzoge1xuICAgICAgICBjb25zdCBmZWVzID0gZ2V0QWxsQ3JlYXRpb25GZWVzKCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIGZlZXMsXG4gICAgICAgICAgbm90ZTogJ0NyZWF0aW9uIGZlZSBpcyBwYWlkIHdoZW4gY3JlYXRpbmcgYSBtYXJrZXQuIFNlcGFyYXRlIGZyb20gcGxhdGZvcm0gZmVlcyBvbiBiZXRzLicsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfcGxhdGZvcm1fZmVlcyc6IHtcbiAgICAgICAgY29uc3QgZmVlcyA9IGdldEFsbFBsYXRmb3JtRmVlcygpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBmZWVzLFxuICAgICAgICAgIG5vdGU6ICdQbGF0Zm9ybSBmZWUgaXMgZGVkdWN0ZWQgZnJvbSBncm9zcyB3aW5uaW5ncyB3aGVuIGNsYWltaW5nLiBJbmNsdWRlcyBhZmZpbGlhdGUgYW5kIGNyZWF0b3Igc2hhcmVzLicsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfdGltaW5nX3J1bGVzJzoge1xuICAgICAgICBjb25zdCBydWxlcyA9IGdldFRpbWluZ0NvbnN0cmFpbnRzKCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHJ1bGVzLFxuICAgICAgICAgIHJ1bGVBOiB7XG4gICAgICAgICAgICBuYW1lOiAnRXZlbnQtQmFzZWQgTWFya2V0cycsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01hcmtldHMgYWJvdXQgc3BlY2lmaWMgZXZlbnRzIChzcG9ydHMsIGVsZWN0aW9ucywgZXRjLiknLFxuICAgICAgICAgICAgcmVxdWlyZW1lbnQ6IGBCZXR0aW5nIG11c3QgY2xvc2UgJHtydWxlcy5taW5FdmVudEJ1ZmZlckhvdXJzfSsgaG91cnMgYmVmb3JlIGV2ZW50YCxcbiAgICAgICAgICAgIHJlY29tbWVuZGVkOiBgJHtydWxlcy5yZWNvbW1lbmRlZEV2ZW50QnVmZmVySG91cnN9IGhvdXJzIGJ1ZmZlciBmb3Igc2FmZXR5YCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJ1bGVCOiB7XG4gICAgICAgICAgICBuYW1lOiAnTWVhc3VyZW1lbnQtUGVyaW9kIE1hcmtldHMnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYXJrZXRzIGFib3V0IG1lYXN1cmVkIHZhbHVlcyBvdmVyIHRpbWUgKHByaWNlcywgdGVtcGVyYXR1cmVzLCBldGMuKScsXG4gICAgICAgICAgICByZXF1aXJlbWVudDogJ0JldHRpbmcgbXVzdCBjbG9zZSBCRUZPUkUgbWVhc3VyZW1lbnQgcGVyaW9kIHN0YXJ0cycsXG4gICAgICAgICAgICByZWFzb246ICdQcmV2ZW50cyBpbmZvcm1hdGlvbiBhZHZhbnRhZ2UgZHVyaW5nIG1lYXN1cmVtZW50JyxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2VuZXJhdGVfaW52aXRlX2hhc2gnOiB7XG4gICAgICAgIGNvbnN0IGhhc2ggPSBnZW5lcmF0ZUludml0ZUhhc2goKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgaW52aXRlSGFzaDogaGFzaCxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdVc2UgdGhpcyBoYXNoIHdoZW4gY3JlYXRpbmcgYSBwcml2YXRlIG1hcmtldC4gU2hhcmUgd2l0aCBpbnZpdGVkIHBhcnRpY2lwYW50cy4nLFxuICAgICAgICAgIG5vdGU6ICdBbnlvbmUgd2l0aCB0aGlzIGhhc2ggY2FuIGJldCBvbiB0aGUgcHJpdmF0ZSBtYXJrZXQuJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gUkVTT0xVVElPTiBTWVNURU1cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnYnVpbGRfcHJvcG9zZV9yZXNvbHV0aW9uX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG91dGNvbWUgPSBhcmdzLm91dGNvbWUgYXMgYm9vbGVhbjtcbiAgICAgICAgY29uc3QgcHJvcG9zZXJXYWxsZXQgPSBhcmdzLnByb3Bvc2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8IG91dGNvbWUgPT09IHVuZGVmaW5lZCB8fCAhcHJvcG9zZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBvdXRjb21lLCBhbmQgcHJvcG9zZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkUHJvcG9zZVJlc29sdXRpb25UcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgb3V0Y29tZSxcbiAgICAgICAgICBwcm9wb3NlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6IGBTaWduIHRvIHByb3Bvc2UgJHtvdXRjb21lID8gJ1lFUycgOiAnTk8nfSBhcyB0aGUgb3V0Y29tZWAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9yZXNvbHZlX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBvdXRjb21lID0gYXJncy5vdXRjb21lIGFzIGJvb2xlYW47XG4gICAgICAgIGNvbnN0IHJlc29sdmVyV2FsbGV0ID0gYXJncy5yZXNvbHZlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCBvdXRjb21lID09PSB1bmRlZmluZWQgfHwgIXJlc29sdmVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgb3V0Y29tZSwgYW5kIHJlc29sdmVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFJlc29sdmVNYXJrZXRUcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgb3V0Y29tZSxcbiAgICAgICAgICByZXNvbHZlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6IGBTaWduIHRvIHJlc29sdmUgbWFya2V0IGFzICR7b3V0Y29tZSA/ICdZRVMnIDogJ05PJ31gLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfZmluYWxpemVfcmVzb2x1dGlvbl90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjYWxsZXJXYWxsZXQgPSBhcmdzLmNhbGxlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhY2FsbGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCBhbmQgY2FsbGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEZpbmFsaXplUmVzb2x1dGlvblRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICBjYWxsZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBmaW5hbGl6ZSB0aGUgcmVzb2x1dGlvbicsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9wcm9wb3NlX3JhY2VfcmVzb2x1dGlvbl90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB3aW5uaW5nT3V0Y29tZUluZGV4ID0gYXJncy53aW5uaW5nX291dGNvbWVfaW5kZXggYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBwcm9wb3NlcldhbGxldCA9IGFyZ3MucHJvcG9zZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8IHdpbm5pbmdPdXRjb21lSW5kZXggPT09IHVuZGVmaW5lZCB8fCAhcHJvcG9zZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIHdpbm5pbmdfb3V0Y29tZV9pbmRleCwgYW5kIHByb3Bvc2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFByb3Bvc2VSYWNlUmVzb2x1dGlvblRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIHdpbm5pbmdPdXRjb21lSW5kZXgsXG4gICAgICAgICAgcHJvcG9zZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBgU2lnbiB0byBwcm9wb3NlIG91dGNvbWUgIyR7d2lubmluZ091dGNvbWVJbmRleH0gYXMgd2lubmVyYCxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3Jlc29sdmVfcmFjZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB3aW5uaW5nT3V0Y29tZUluZGV4ID0gYXJncy53aW5uaW5nX291dGNvbWVfaW5kZXggYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCByZXNvbHZlcldhbGxldCA9IGFyZ3MucmVzb2x2ZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8IHdpbm5pbmdPdXRjb21lSW5kZXggPT09IHVuZGVmaW5lZCB8fCAhcmVzb2x2ZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIHdpbm5pbmdfb3V0Y29tZV9pbmRleCwgYW5kIHJlc29sdmVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFJlc29sdmVSYWNlVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgd2lubmluZ091dGNvbWVJbmRleCxcbiAgICAgICAgICByZXNvbHZlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6IGBTaWduIHRvIHJlc29sdmUgcmFjZSB3aXRoIG91dGNvbWUgIyR7d2lubmluZ091dGNvbWVJbmRleH1gLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfZmluYWxpemVfcmFjZV9yZXNvbHV0aW9uX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNhbGxlcldhbGxldCA9IGFyZ3MuY2FsbGVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCAhY2FsbGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0IGFuZCBjYWxsZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkRmluYWxpemVSYWNlUmVzb2x1dGlvblRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIGNhbGxlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGZpbmFsaXplIHJhY2UgcmVzb2x1dGlvbicsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIERJU1BVVEVTXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2J1aWxkX2ZsYWdfZGlzcHV0ZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBkaXNwdXRlcldhbGxldCA9IGFyZ3MuZGlzcHV0ZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgIWRpc3B1dGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCBhbmQgZGlzcHV0ZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkRmxhZ0Rpc3B1dGVUcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgZGlzcHV0ZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBkaXNwdXRlIHRoZSByZXNvbHV0aW9uIChyZXF1aXJlcyBib25kKScsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9mbGFnX3JhY2VfZGlzcHV0ZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBkaXNwdXRlcldhbGxldCA9IGFyZ3MuZGlzcHV0ZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICFkaXNwdXRlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCBhbmQgZGlzcHV0ZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkRmxhZ1JhY2VEaXNwdXRlVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgZGlzcHV0ZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBkaXNwdXRlIHRoZSByYWNlIHJlc29sdXRpb24nLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfdm90ZV9jb3VuY2lsX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHZvdGVZZXMgPSBhcmdzLnZvdGVfeWVzIGFzIGJvb2xlYW47XG4gICAgICAgIGNvbnN0IHZvdGVyV2FsbGV0ID0gYXJncy52b3Rlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCB2b3RlWWVzID09PSB1bmRlZmluZWQgfHwgIXZvdGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgdm90ZV95ZXMsIGFuZCB2b3Rlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRWb3RlQ291bmNpbFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICB2b3RlWWVzLFxuICAgICAgICAgIHZvdGVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogYFNpZ24gdG8gdm90ZSAke3ZvdGVZZXMgPyAnWUVTJyA6ICdOTyd9IG9uIHRoZSBkaXNwdXRlYCxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3ZvdGVfY291bmNpbF9yYWNlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHZvdGVPdXRjb21lSW5kZXggPSBhcmdzLnZvdGVfb3V0Y29tZV9pbmRleCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IHZvdGVyV2FsbGV0ID0gYXJncy52b3Rlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgdm90ZU91dGNvbWVJbmRleCA9PT0gdW5kZWZpbmVkIHx8ICF2b3RlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgdm90ZV9vdXRjb21lX2luZGV4LCBhbmQgdm90ZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkVm90ZUNvdW5jaWxSYWNlVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgdm90ZU91dGNvbWVJbmRleCxcbiAgICAgICAgICB2b3RlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6IGBTaWduIHRvIHZvdGUgZm9yIG91dGNvbWUgIyR7dm90ZU91dGNvbWVJbmRleH1gLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBXSElURUxJU1QgTUFOQUdFTUVOVFxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdidWlsZF9hZGRfdG9fd2hpdGVsaXN0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJUb0FkZCA9IGFyZ3MudXNlcl90b19hZGQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICF1c2VyVG9BZGQgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCB1c2VyX3RvX2FkZCwgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQWRkVG9XaGl0ZWxpc3RUcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgdXNlclRvQWRkLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgd2hpdGVsaXN0UGRhOiByZXN1bHQud2hpdGVsaXN0UGRhLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gYWRkIHVzZXIgdG8gd2hpdGVsaXN0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3JlbW92ZV9mcm9tX3doaXRlbGlzdF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyVG9SZW1vdmUgPSBhcmdzLnVzZXJfdG9fcmVtb3ZlIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhdXNlclRvUmVtb3ZlIHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgdXNlcl90b19yZW1vdmUsIGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFJlbW92ZUZyb21XaGl0ZWxpc3RUcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgdXNlclRvUmVtb3ZlLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byByZW1vdmUgdXNlciBmcm9tIHdoaXRlbGlzdCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jcmVhdGVfcmFjZV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ3JlYXRlUmFjZVdoaXRlbGlzdFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgd2hpdGVsaXN0UGRhOiByZXN1bHQud2hpdGVsaXN0UGRhLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY3JlYXRlIHJhY2Ugd2hpdGVsaXN0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2FkZF90b19yYWNlX3doaXRlbGlzdF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyVG9BZGQgPSBhcmdzLnVzZXJfdG9fYWRkIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgIXVzZXJUb0FkZCB8fCAhY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgdXNlcl90b19hZGQsIGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEFkZFRvUmFjZVdoaXRlbGlzdFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIHVzZXJUb0FkZCxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gYWRkIHVzZXIgdG8gcmFjZSB3aGl0ZWxpc3QnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfcmVtb3ZlX2Zyb21fcmFjZV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlclRvUmVtb3ZlID0gYXJncy51c2VyX3RvX3JlbW92ZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICF1c2VyVG9SZW1vdmUgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIHVzZXJfdG9fcmVtb3ZlLCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRSZW1vdmVGcm9tUmFjZVdoaXRlbGlzdFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIHVzZXJUb1JlbW92ZSxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gcmVtb3ZlIHVzZXIgZnJvbSByYWNlIHdoaXRlbGlzdCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIENSRUFUT1IgUFJPRklMRVNcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnYnVpbGRfY3JlYXRlX2NyZWF0b3JfcHJvZmlsZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgZGlzcGxheU5hbWUgPSBhcmdzLmRpc3BsYXlfbmFtZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JGZWVCcHMgPSBhcmdzLmNyZWF0b3JfZmVlX2JwcyBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFkaXNwbGF5TmFtZSB8fCBjcmVhdG9yRmVlQnBzID09PSB1bmRlZmluZWQgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnZGlzcGxheV9uYW1lLCBjcmVhdG9yX2ZlZV9icHMsIGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENyZWF0ZUNyZWF0b3JQcm9maWxlVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIGRpc3BsYXlOYW1lLFxuICAgICAgICAgIGNyZWF0b3JGZWVCcHMsXG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBjcmVhdG9yUHJvZmlsZVBkYTogcmVzdWx0LmNyZWF0b3JQcm9maWxlUGRhLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY3JlYXRlIHlvdXIgY3JlYXRvciBwcm9maWxlJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3VwZGF0ZV9jcmVhdG9yX3Byb2ZpbGVfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IGRpc3BsYXlOYW1lID0gYXJncy5kaXNwbGF5X25hbWUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBkZWZhdWx0RmVlQnBzID0gYXJncy5kZWZhdWx0X2ZlZV9icHMgYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghZGlzcGxheU5hbWUgfHwgZGVmYXVsdEZlZUJwcyA9PT0gdW5kZWZpbmVkIHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2Rpc3BsYXlfbmFtZSwgZGVmYXVsdF9mZWVfYnBzLCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIGFsbCByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkVXBkYXRlQ3JlYXRvclByb2ZpbGVUcmFuc2FjdGlvbih7XG4gICAgICAgICAgZGlzcGxheU5hbWUsXG4gICAgICAgICAgZGVmYXVsdEZlZUJwcyxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gdXBkYXRlIHlvdXIgY3JlYXRvciBwcm9maWxlJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NsYWltX2NyZWF0b3JfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2NyZWF0b3Jfd2FsbGV0IGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDbGFpbUNyZWF0b3JUcmFuc2FjdGlvbih7XG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNsYWltIHlvdXIgY3JlYXRvciBmZWVzIGZyb20gc29sX3RyZWFzdXJ5JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gTUFSS0VUIE1BTkFHRU1FTlRcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnYnVpbGRfY2xvc2VfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNhbGxlcldhbGxldCA9IGFyZ3MuY2FsbGVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICFjYWxsZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0IGFuZCBjYWxsZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2xvc2VNYXJrZXRUcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgY2FsbGVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY2xvc2UgYmV0dGluZyBvbiB0aGlzIG1hcmtldCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9leHRlbmRfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG5ld0Nsb3NpbmdUaW1lU3RyID0gYXJncy5uZXdfY2xvc2luZ190aW1lIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbmV3UmVzb2x1dGlvblRpbWVTdHIgPSBhcmdzLm5ld19yZXNvbHV0aW9uX3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjYWxsZXJXYWxsZXQgPSBhcmdzLmNhbGxlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhbmV3Q2xvc2luZ1RpbWVTdHIgfHwgIWNhbGxlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIG5ld19jbG9zaW5nX3RpbWUsIGFuZCBjYWxsZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5ld0Nsb3NpbmdUaW1lID0gTWF0aC5mbG9vcihuZXcgRGF0ZShuZXdDbG9zaW5nVGltZVN0cikuZ2V0VGltZSgpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IG5ld1Jlc29sdXRpb25UaW1lID0gbmV3UmVzb2x1dGlvblRpbWVTdHJcbiAgICAgICAgICA/IE1hdGguZmxvb3IobmV3IERhdGUobmV3UmVzb2x1dGlvblRpbWVTdHIpLmdldFRpbWUoKSAvIDEwMDApXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkRXh0ZW5kTWFya2V0VHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIG5ld0Nsb3NpbmdUaW1lLFxuICAgICAgICAgIG5ld1Jlc29sdXRpb25UaW1lLFxuICAgICAgICAgIGNhbGxlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGV4dGVuZCBtYXJrZXQgZGVhZGxpbmUnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY2xvc2VfcmFjZV9tYXJrZXRfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY2FsbGVyV2FsbGV0ID0gYXJncy5jYWxsZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICFjYWxsZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQgYW5kIGNhbGxlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDbG9zZVJhY2VNYXJrZXRUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICBjYWxsZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBjbG9zZSBiZXR0aW5nIG9uIHRoaXMgcmFjZSBtYXJrZXQnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfZXh0ZW5kX3JhY2VfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG5ld0Nsb3NpbmdUaW1lU3RyID0gYXJncy5uZXdfY2xvc2luZ190aW1lIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbmV3UmVzb2x1dGlvblRpbWVTdHIgPSBhcmdzLm5ld19yZXNvbHV0aW9uX3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjYWxsZXJXYWxsZXQgPSBhcmdzLmNhbGxlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgIW5ld0Nsb3NpbmdUaW1lU3RyIHx8ICFjYWxsZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIG5ld19jbG9zaW5nX3RpbWUsIGFuZCBjYWxsZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5ld0Nsb3NpbmdUaW1lID0gTWF0aC5mbG9vcihuZXcgRGF0ZShuZXdDbG9zaW5nVGltZVN0cikuZ2V0VGltZSgpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IG5ld1Jlc29sdXRpb25UaW1lID0gbmV3UmVzb2x1dGlvblRpbWVTdHJcbiAgICAgICAgICA/IE1hdGguZmxvb3IobmV3IERhdGUobmV3UmVzb2x1dGlvblRpbWVTdHIpLmdldFRpbWUoKSAvIDEwMDApXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkRXh0ZW5kUmFjZU1hcmtldFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIG5ld0Nsb3NpbmdUaW1lLFxuICAgICAgICAgIG5ld1Jlc29sdXRpb25UaW1lLFxuICAgICAgICAgIGNhbGxlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGV4dGVuZCByYWNlIG1hcmtldCBkZWFkbGluZScsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jYW5jZWxfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHJlYXNvbiA9IGFyZ3MucmVhc29uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgYXV0aG9yaXR5V2FsbGV0ID0gYXJncy5hdXRob3JpdHlfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgIXJlYXNvbiB8fCAhYXV0aG9yaXR5V2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgcmVhc29uLCBhbmQgYXV0aG9yaXR5X3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENhbmNlbE1hcmtldFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICByZWFzb24sXG4gICAgICAgICAgYXV0aG9yaXR5V2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY2FuY2VsIHRoZSBtYXJrZXQuIEJldHRvcnMgY2FuIGNsYWltIHJlZnVuZHMgYWZ0ZXIuJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NhbmNlbF9yYWNlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHJlYXNvbiA9IGFyZ3MucmVhc29uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgYXV0aG9yaXR5V2FsbGV0ID0gYXJncy5hdXRob3JpdHlfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICFyZWFzb24gfHwgIWF1dGhvcml0eVdhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgcmVhc29uLCBhbmQgYXV0aG9yaXR5X3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENhbmNlbFJhY2VUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICByZWFzb24sXG4gICAgICAgICAgYXV0aG9yaXR5V2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY2FuY2VsIHRoZSByYWNlIG1hcmtldC4gQmV0dG9ycyBjYW4gY2xhaW0gcmVmdW5kcyBhZnRlci4nLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoYFVua25vd24gdG9vbDogJHtuYW1lfWApO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZShlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyk7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEhFTFBFUlNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIHN1Y2Nlc3NSZXNwb25zZShkYXRhOiB1bmtub3duKTogeyBjb250ZW50OiBBcnJheTx7IHR5cGU6IHN0cmluZzsgdGV4dDogc3RyaW5nIH0+IH0ge1xuICByZXR1cm4ge1xuICAgIGNvbnRlbnQ6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICBuZXR3b3JrOiAnbWFpbm5ldC1iZXRhJyxcbiAgICAgICAgICBwcm9ncmFtSWQ6IFBST0dSQU1fSUQudG9CYXNlNTgoKSxcbiAgICAgICAgICAuLi5kYXRhIGFzIG9iamVjdCxcbiAgICAgICAgfSwgbnVsbCwgMiksXG4gICAgICB9LFxuICAgIF0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UobWVzc2FnZTogc3RyaW5nKTogeyBjb250ZW50OiBBcnJheTx7IHR5cGU6IHN0cmluZzsgdGV4dDogc3RyaW5nIH0+IH0ge1xuICByZXR1cm4ge1xuICAgIGNvbnRlbnQ6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogbWVzc2FnZSB9KSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfTtcbn1cbiJdfQ==