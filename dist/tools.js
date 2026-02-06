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
import { validateParimutuelRules, PARIMUTUEL_RULES, PARIMUTUEL_RULES_DOCUMENTATION, } from './validation/parimutuel-rules.js';
// Transaction Builders
import { fetchAndBuildBetTransaction, simulateBetTransaction } from './builders/bet-transaction.js';
import { buildClaimWinningsTransaction, buildClaimRefundTransaction, buildClaimAffiliateTransaction, buildBatchClaimTransaction, } from './builders/claim-transaction.js';
import { buildRegisterAffiliateTransaction, buildToggleAffiliateTransaction } from './builders/affiliate-transaction.js';
import { fetchAndBuildRaceBetTransaction, buildClaimRaceWinningsTransaction, buildClaimRaceRefundTransaction } from './builders/race-transaction.js';
// Resolution Builders
import { buildProposeResolutionTransaction, buildResolveMarketTransaction, buildFinalizeResolutionTransaction, buildProposeRaceResolutionTransaction, buildResolveRaceTransaction, buildFinalizeRaceResolutionTransaction, } from './builders/resolution-transaction.js';
// Dispute Builders
import { buildFlagDisputeTransaction, buildFlagRaceDisputeTransaction, buildVoteCouncilTransaction, buildVoteCouncilRaceTransaction, buildChangeCouncilVoteTransaction, buildChangeCouncilVoteRaceTransaction, } from './builders/dispute-transaction.js';
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
        description: 'Build unsigned transaction to create a Lab (community) market. Validates against v6.3 rules.',
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
        description: 'Get v6.3 timing rules and constraints for market creation.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'get_parimutuel_rules',
        description: 'Get v6.3 parimutuel rules for Lab market creation. CRITICAL: Read this BEFORE creating any market. Contains blocked terms, required data sources, and validation rules that will REJECT invalid markets.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'validate_market_question',
        description: 'Validate a market question against v6.3 rules BEFORE attempting to create it. Returns whether the question would be blocked and why.',
        inputSchema: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'Market question to validate' },
                layer: { type: 'string', enum: ['lab', 'private'], description: 'Market layer (default: lab)' },
            },
            required: ['question'],
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
        description: 'Validate market parameters against v6.3 timing rules.',
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
    {
        name: 'build_change_council_vote_transaction',
        description: 'Build transaction for council member to change their vote on a boolean market dispute.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                new_vote_yes: { type: 'boolean', description: 'New vote (true=YES, false=NO)' },
                voter_wallet: { type: 'string', description: 'Council member wallet' },
            },
            required: ['market', 'new_vote_yes', 'voter_wallet'],
        },
    },
    {
        name: 'build_change_council_vote_race_transaction',
        description: 'Build transaction for council member to change their vote on a race market dispute.',
        inputSchema: {
            type: 'object',
            properties: {
                race_market: { type: 'string', description: 'Race market public key' },
                new_vote_outcome_index: { type: 'number', description: 'New outcome index to vote for' },
                voter_wallet: { type: 'string', description: 'Council member wallet' },
            },
            required: ['race_market', 'new_vote_outcome_index', 'voter_wallet'],
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
            case 'get_parimutuel_rules': {
                return successResponse({
                    version: PARIMUTUEL_RULES.version,
                    documentation: PARIMUTUEL_RULES_DOCUMENTATION,
                    blockedTerms: {
                        subjective: PARIMUTUEL_RULES.SUBJECTIVE_OUTCOME.blockedPatterns,
                        manipulation: PARIMUTUEL_RULES.MANIPULATION_RISK.blockedPatterns,
                    },
                    approvedSources: PARIMUTUEL_RULES.APPROVED_SOURCES,
                    criticalNote: 'Markets containing ANY blocked terms will be REJECTED. Always include an approved data source.',
                });
            }
            case 'validate_market_question': {
                const question = args.question;
                const layer = args.layer || 'lab';
                if (!question) {
                    return errorResponse('question is required');
                }
                // Use a dummy closing time for validation (only question content matters for v6.3 rules)
                const dummyClosingTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
                const validation = validateParimutuelRules({
                    question,
                    closingTime: dummyClosingTime,
                    layer,
                });
                return successResponse({
                    question,
                    wouldBeBlocked: validation.blocked,
                    valid: !validation.blocked,
                    errors: validation.errors,
                    warnings: validation.warnings,
                    ruleViolations: validation.ruleViolations,
                    suggestion: validation.blocked
                        ? 'Question contains blocked terms. Rephrase using objective, verifiable criteria with an approved data source.'
                        : 'Question passes v6.3 validation. Remember to also specify proper timing parameters.',
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
            case 'build_change_council_vote_transaction': {
                const market = args.market;
                const newVoteYes = args.new_vote_yes;
                const voterWallet = args.voter_wallet;
                if (!market || newVoteYes === undefined || !voterWallet) {
                    return errorResponse('market, new_vote_yes, and voter_wallet are required');
                }
                const result = await buildChangeCouncilVoteTransaction({
                    marketPda: market,
                    newVoteYes,
                    voterWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: `Sign to change your vote to ${newVoteYes ? 'YES' : 'NO'}`,
                });
            }
            case 'build_change_council_vote_race_transaction': {
                const raceMarket = args.race_market;
                const newVoteOutcomeIndex = args.new_vote_outcome_index;
                const voterWallet = args.voter_wallet;
                if (!raceMarket || newVoteOutcomeIndex === undefined || !voterWallet) {
                    return errorResponse('race_market, new_vote_outcome_index, and voter_wallet are required');
                }
                const result = await buildChangeCouncilVoteRaceTransaction({
                    raceMarketPda: raceMarket,
                    newVoteOutcomeIndex,
                    voterWallet,
                });
                return successResponse({
                    transaction: { serialized: result.serializedTx },
                    instructions: `Sign to change your vote to outcome #${newVoteOutcomeIndex}`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHO0FBQ0gsT0FBTyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFckUsV0FBVztBQUNYLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBMEIsTUFBTSxxQkFBcUIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQXNELE1BQU0sc0JBQXNCLENBQUM7QUFDakgsT0FBTyxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDakgsT0FBTyxFQUNMLHdCQUF3QixFQUN4QixxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLG9CQUFvQixFQUNwQix1QkFBdUIsRUFDdkIsb0JBQW9CLEVBQ3BCLG1CQUFtQixFQUNuQixpQkFBaUIsR0FDbEIsTUFBTSw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLEVBQ0wscUJBQXFCLEVBRXJCLGVBQWUsRUFDZixtQkFBbUIsRUFDbkIsZ0JBQWdCLEVBQ2hCLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLGtCQUFrQixHQUNuQixNQUFNLCtCQUErQixDQUFDO0FBRXZDLGFBQWE7QUFDYixPQUFPLEVBQUUsb0JBQW9CLEVBQXNCLE1BQU0sOEJBQThCLENBQUM7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FB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RixTQUFTLGVBQWUsQ0FBQyxJQUFhO0lBQ3BDLE9BQU87UUFDTCxPQUFPLEVBQUU7WUFDUDtnQkFDRSxJQUFJLEVBQUUsTUFBTTtnQkFDWixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsT0FBTyxFQUFFLElBQUk7b0JBQ2IsT0FBTyxFQUFFLGNBQWM7b0JBQ3ZCLFNBQVMsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFO29CQUNoQyxHQUFHLElBQWM7aUJBQ2xCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQzthQUNaO1NBQ0Y7S0FDRixDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLE9BQWU7SUFDcEMsT0FBTztRQUNMLE9BQU8sRUFBRTtZQUNQO2dCQUNFLElBQUksRUFBRSxNQUFNO2dCQUNaLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUM7YUFDekQ7U0FDRjtLQUNGLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBNQ1AgVG9vbCBEZWZpbml0aW9ucyBmb3IgQmFvemkgTWFya2V0c1xuICogVjQuMC4wIC0gRnVsbCBQcm90b2NvbCBDb3ZlcmFnZSArIE1hcmtldCBDcmVhdGlvbiArIEFJIEFnZW50IE5ldHdvcmtcbiAqL1xuaW1wb3J0IHsgQ29ubmVjdGlvbiwgUHVibGljS2V5LCBUcmFuc2FjdGlvbiB9IGZyb20gJ0Bzb2xhbmEvd2ViMy5qcyc7XG5cbi8vIEhhbmRsZXJzXG5pbXBvcnQgeyBsaXN0TWFya2V0cywgZ2V0TWFya2V0LCBnZXRNYXJrZXRGb3JCZXR0aW5nIH0gZnJvbSAnLi9oYW5kbGVycy9tYXJrZXRzLmpzJztcbmltcG9ydCB7IGdldFF1b3RlLCBnZXRRdW90ZVdpdGhNYXJrZXREYXRhIH0gZnJvbSAnLi9oYW5kbGVycy9xdW90ZS5qcyc7XG5pbXBvcnQgeyBnZXRQb3NpdGlvbnNTdW1tYXJ5IH0gZnJvbSAnLi9oYW5kbGVycy9wb3NpdGlvbnMuanMnO1xuaW1wb3J0IHsgZ2V0Q2xhaW1hYmxlUG9zaXRpb25zLCBnZXRBZmZpbGlhdGVCeUNvZGUgYXMgZ2V0QWZmaWxpYXRlQnlDb2RlRnJvbUNsYWltcyB9IGZyb20gJy4vaGFuZGxlcnMvY2xhaW1zLmpzJztcbmltcG9ydCB7IGxpc3RSYWNlTWFya2V0cywgZ2V0UmFjZU1hcmtldCwgZ2V0UmFjZVF1b3RlIH0gZnJvbSAnLi9oYW5kbGVycy9yYWNlLW1hcmtldHMuanMnO1xuaW1wb3J0IHsgZ2V0UmVzb2x1dGlvblN0YXR1cywgZ2V0RGlzcHV0ZWRNYXJrZXRzLCBnZXRNYXJrZXRzQXdhaXRpbmdSZXNvbHV0aW9uIH0gZnJvbSAnLi9oYW5kbGVycy9yZXNvbHV0aW9uLmpzJztcbmltcG9ydCB7XG4gIGlzQWZmaWxpYXRlQ29kZUF2YWlsYWJsZSxcbiAgc3VnZ2VzdEFmZmlsaWF0ZUNvZGVzLFxuICBnZXRBZmZpbGlhdGVCeUNvZGUsXG4gIGdldEFmZmlsaWF0ZXNCeU93bmVyLFxuICBnZXRSZWZlcnJhbHNCeUFmZmlsaWF0ZSxcbiAgZ2V0QWdlbnROZXR3b3JrU3RhdHMsXG4gIGZvcm1hdEFmZmlsaWF0ZUxpbmssXG4gIGdldENvbW1pc3Npb25JbmZvLFxufSBmcm9tICcuL2hhbmRsZXJzL2FnZW50LW5ldHdvcmsuanMnO1xuaW1wb3J0IHtcbiAgcHJldmlld01hcmtldENyZWF0aW9uLFxuICBwcmV2aWV3UmFjZU1hcmtldENyZWF0aW9uLFxuICBjcmVhdGVMYWJNYXJrZXQsXG4gIGNyZWF0ZVByaXZhdGVNYXJrZXQsXG4gIGNyZWF0ZVJhY2VNYXJrZXQsXG4gIGdldEFsbENyZWF0aW9uRmVlcyxcbiAgZ2V0QWxsUGxhdGZvcm1GZWVzLFxuICBnZXRUaW1pbmdDb25zdHJhaW50cyxcbiAgZ2VuZXJhdGVJbnZpdGVIYXNoLFxufSBmcm9tICcuL2hhbmRsZXJzL21hcmtldC1jcmVhdGlvbi5qcyc7XG5cbi8vIFZhbGlkYXRpb25cbmltcG9ydCB7IHZhbGlkYXRlTWFya2V0VGltaW5nLCBNYXJrZXRUaW1pbmdQYXJhbXMgfSBmcm9tICcuL3ZhbGlkYXRpb24vbWFya2V0LXJ1bGVzLmpzJztcbmltcG9ydCB7IHZhbGlkYXRlQmV0LCBjYWxjdWxhdGVCZXRRdW90ZSB9IGZyb20gJy4vdmFsaWRhdGlvbi9iZXQtcnVsZXMuanMnO1xuaW1wb3J0IHsgdmFsaWRhdGVNYXJrZXRDcmVhdGlvbiB9IGZyb20gJy4vdmFsaWRhdGlvbi9jcmVhdGlvbi1ydWxlcy5qcyc7XG5pbXBvcnQge1xuICB2YWxpZGF0ZVBhcmltdXR1ZWxSdWxlcyxcbiAgUEFSSU1VVFVFTF9SVUxFUyxcbiAgUEFSSU1VVFVFTF9SVUxFU19ET0NVTUVOVEFUSU9OLFxufSBmcm9tICcuL3ZhbGlkYXRpb24vcGFyaW11dHVlbC1ydWxlcy5qcyc7XG5cbi8vIFRyYW5zYWN0aW9uIEJ1aWxkZXJzXG5pbXBvcnQgeyBidWlsZEJldFRyYW5zYWN0aW9uLCBmZXRjaEFuZEJ1aWxkQmV0VHJhbnNhY3Rpb24sIHNpbXVsYXRlQmV0VHJhbnNhY3Rpb24gfSBmcm9tICcuL2J1aWxkZXJzL2JldC10cmFuc2FjdGlvbi5qcyc7XG5pbXBvcnQge1xuICBidWlsZENsYWltV2lubmluZ3NUcmFuc2FjdGlvbixcbiAgYnVpbGRDbGFpbVJlZnVuZFRyYW5zYWN0aW9uLFxuICBidWlsZENsYWltQWZmaWxpYXRlVHJhbnNhY3Rpb24sXG4gIGJ1aWxkQmF0Y2hDbGFpbVRyYW5zYWN0aW9uLFxufSBmcm9tICcuL2J1aWxkZXJzL2NsYWltLXRyYW5zYWN0aW9uLmpzJztcbmltcG9ydCB7IGJ1aWxkUmVnaXN0ZXJBZmZpbGlhdGVUcmFuc2FjdGlvbiwgYnVpbGRUb2dnbGVBZmZpbGlhdGVUcmFuc2FjdGlvbiB9IGZyb20gJy4vYnVpbGRlcnMvYWZmaWxpYXRlLXRyYW5zYWN0aW9uLmpzJztcbmltcG9ydCB7IGZldGNoQW5kQnVpbGRSYWNlQmV0VHJhbnNhY3Rpb24sIGJ1aWxkQ2xhaW1SYWNlV2lubmluZ3NUcmFuc2FjdGlvbiwgYnVpbGRDbGFpbVJhY2VSZWZ1bmRUcmFuc2FjdGlvbiB9IGZyb20gJy4vYnVpbGRlcnMvcmFjZS10cmFuc2FjdGlvbi5qcyc7XG5pbXBvcnQgeyBnZXROZXh0TWFya2V0SWQsIHByZXZpZXdNYXJrZXRQZGEsIHByZXZpZXdSYWNlTWFya2V0UGRhIH0gZnJvbSAnLi9idWlsZGVycy9tYXJrZXQtY3JlYXRpb24tdHguanMnO1xuXG4vLyBSZXNvbHV0aW9uIEJ1aWxkZXJzXG5pbXBvcnQge1xuICBidWlsZFByb3Bvc2VSZXNvbHV0aW9uVHJhbnNhY3Rpb24sXG4gIGJ1aWxkUHJvcG9zZVJlc29sdXRpb25Ib3N0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkUmVzb2x2ZU1hcmtldFRyYW5zYWN0aW9uLFxuICBidWlsZFJlc29sdmVNYXJrZXRIb3N0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkRmluYWxpemVSZXNvbHV0aW9uVHJhbnNhY3Rpb24sXG4gIGJ1aWxkUHJvcG9zZVJhY2VSZXNvbHV0aW9uVHJhbnNhY3Rpb24sXG4gIGJ1aWxkUmVzb2x2ZVJhY2VUcmFuc2FjdGlvbixcbiAgYnVpbGRGaW5hbGl6ZVJhY2VSZXNvbHV0aW9uVHJhbnNhY3Rpb24sXG59IGZyb20gJy4vYnVpbGRlcnMvcmVzb2x1dGlvbi10cmFuc2FjdGlvbi5qcyc7XG5cbi8vIERpc3B1dGUgQnVpbGRlcnNcbmltcG9ydCB7XG4gIGJ1aWxkRmxhZ0Rpc3B1dGVUcmFuc2FjdGlvbixcbiAgYnVpbGRGbGFnUmFjZURpc3B1dGVUcmFuc2FjdGlvbixcbiAgYnVpbGRWb3RlQ291bmNpbFRyYW5zYWN0aW9uLFxuICBidWlsZFZvdGVDb3VuY2lsUmFjZVRyYW5zYWN0aW9uLFxuICBidWlsZENoYW5nZUNvdW5jaWxWb3RlVHJhbnNhY3Rpb24sXG4gIGJ1aWxkQ2hhbmdlQ291bmNpbFZvdGVSYWNlVHJhbnNhY3Rpb24sXG59IGZyb20gJy4vYnVpbGRlcnMvZGlzcHV0ZS10cmFuc2FjdGlvbi5qcyc7XG5cbi8vIFdoaXRlbGlzdCBCdWlsZGVyc1xuaW1wb3J0IHtcbiAgYnVpbGRBZGRUb1doaXRlbGlzdFRyYW5zYWN0aW9uLFxuICBidWlsZFJlbW92ZUZyb21XaGl0ZWxpc3RUcmFuc2FjdGlvbixcbiAgYnVpbGRDcmVhdGVSYWNlV2hpdGVsaXN0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkQWRkVG9SYWNlV2hpdGVsaXN0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkUmVtb3ZlRnJvbVJhY2VXaGl0ZWxpc3RUcmFuc2FjdGlvbixcbn0gZnJvbSAnLi9idWlsZGVycy93aGl0ZWxpc3QtdHJhbnNhY3Rpb24uanMnO1xuXG4vLyBDcmVhdG9yIFByb2ZpbGUgQnVpbGRlcnNcbmltcG9ydCB7XG4gIGJ1aWxkQ3JlYXRlQ3JlYXRvclByb2ZpbGVUcmFuc2FjdGlvbixcbiAgYnVpbGRVcGRhdGVDcmVhdG9yUHJvZmlsZVRyYW5zYWN0aW9uLFxuICBidWlsZENsYWltQ3JlYXRvclRyYW5zYWN0aW9uLFxufSBmcm9tICcuL2J1aWxkZXJzL2NyZWF0b3ItdHJhbnNhY3Rpb24uanMnO1xuXG4vLyBNYXJrZXQgTWFuYWdlbWVudCBCdWlsZGVyc1xuaW1wb3J0IHtcbiAgYnVpbGRDbG9zZU1hcmtldFRyYW5zYWN0aW9uLFxuICBidWlsZEV4dGVuZE1hcmtldFRyYW5zYWN0aW9uLFxuICBidWlsZENsb3NlUmFjZU1hcmtldFRyYW5zYWN0aW9uLFxuICBidWlsZEV4dGVuZFJhY2VNYXJrZXRUcmFuc2FjdGlvbixcbiAgYnVpbGRDYW5jZWxNYXJrZXRUcmFuc2FjdGlvbixcbiAgYnVpbGRDYW5jZWxSYWNlVHJhbnNhY3Rpb24sXG59IGZyb20gJy4vYnVpbGRlcnMvbWFya2V0LW1hbmFnZW1lbnQtdHJhbnNhY3Rpb24uanMnO1xuXG4vLyBDb25maWdcbmltcG9ydCB7IFJQQ19FTkRQT0lOVCwgUFJPR1JBTV9JRCwgQkVUX0xJTUlUUywgVElNSU5HLCBGRUVTIH0gZnJvbSAnLi9jb25maWcuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVE9PTCBTQ0hFTUFTIC0gT3JnYW5pemVkIGJ5IENhdGVnb3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY29uc3QgVE9PTFMgPSBbXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gTUFSS0VUIFJFQUQgT1BFUkFUSU9OU1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnbGlzdF9tYXJrZXRzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0xpc3QgYWxsIEJhb3ppIHByZWRpY3Rpb24gbWFya2V0cyAoYm9vbGVhbiBZRVMvTk8pIG9uIFNvbGFuYSBtYWlubmV0LiBSZXR1cm5zIHF1ZXN0aW9ucywgb2RkcywgcG9vbHMsIHN0YXR1cy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgc3RhdHVzOiB7XG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZW51bTogWydBY3RpdmUnLCAnQ2xvc2VkJywgJ1Jlc29sdmVkJywgJ0NhbmNlbGxlZCcsICdQYXVzZWQnXSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbHRlciBieSBzdGF0dXMuIERlZmF1bHQ6IGFsbCBtYXJrZXRzLicsXG4gICAgICAgIH0sXG4gICAgICAgIGxheWVyOiB7XG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZW51bTogWydPZmZpY2lhbCcsICdMYWInLCAnUHJpdmF0ZSddLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmlsdGVyIGJ5IGxheWVyIHR5cGUuJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogW10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfbWFya2V0JyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBkZXRhaWxlZCBpbmZvcm1hdGlvbiBhYm91dCBhIHNwZWNpZmljIHByZWRpY3Rpb24gbWFya2V0IGJ5IHB1YmxpYyBrZXkuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHB1YmxpY0tleToge1xuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU29sYW5hIHB1YmxpYyBrZXkgb2YgdGhlIG1hcmtldCBhY2NvdW50JyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydwdWJsaWNLZXknXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9xdW90ZScsXG4gICAgZGVzY3JpcHRpb246ICdDYWxjdWxhdGUgZXhwZWN0ZWQgcGF5b3V0IGZvciBhIHBvdGVudGlhbCBiZXQuIFNob3dzIHByb2ZpdCwgZmVlcywgYW5kIG5ldyBvZGRzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHNpZGU6IHsgdHlwZTogJ3N0cmluZycsIGVudW06IFsnWWVzJywgJ05vJ10sIGRlc2NyaXB0aW9uOiAnU2lkZSB0byBiZXQgb24nIH0sXG4gICAgICAgIGFtb3VudDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246IGBCZXQgYW1vdW50IGluIFNPTCAoJHtCRVRfTElNSVRTLk1JTl9CRVRfU09MfS0ke0JFVF9MSU1JVFMuTUFYX0JFVF9TT0x9KWAgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnc2lkZScsICdhbW91bnQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUkFDRSBNQVJLRVQgT1BFUkFUSU9OUyAoTXVsdGktT3V0Y29tZSlcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2xpc3RfcmFjZV9tYXJrZXRzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0xpc3QgYWxsIHJhY2UgbWFya2V0cyAobXVsdGktb3V0Y29tZSBwcmVkaWN0aW9uIG1hcmtldHMpIG9uIFNvbGFuYSBtYWlubmV0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBzdGF0dXM6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBlbnVtOiBbJ0FjdGl2ZScsICdDbG9zZWQnLCAnUmVzb2x2ZWQnLCAnQ2FuY2VsbGVkJ10sXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdGaWx0ZXIgYnkgc3RhdHVzJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogW10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfcmFjZV9tYXJrZXQnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IGRldGFpbGVkIGluZm8gYWJvdXQgYSByYWNlIG1hcmtldCBpbmNsdWRpbmcgYWxsIG91dGNvbWUgbGFiZWxzLCBwb29scywgYW5kIG9kZHMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHB1YmxpY0tleTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3B1YmxpY0tleSddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X3JhY2VfcXVvdGUnLFxuICAgIGRlc2NyaXB0aW9uOiAnQ2FsY3VsYXRlIGV4cGVjdGVkIHBheW91dCBmb3IgYSByYWNlIG1hcmtldCBiZXQgb24gYSBzcGVjaWZpYyBvdXRjb21lLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgb3V0Y29tZUluZGV4OiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0luZGV4IG9mIG91dGNvbWUgdG8gYmV0IG9uICgwLWJhc2VkKScgfSxcbiAgICAgICAgYW1vdW50OiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0JldCBhbW91bnQgaW4gU09MJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdvdXRjb21lSW5kZXgnLCAnYW1vdW50J10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIE1BUktFVCBDUkVBVElPTlxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAncHJldmlld19jcmVhdGVfbWFya2V0JyxcbiAgICBkZXNjcmlwdGlvbjogJ1ByZXZpZXcgbWFya2V0IGNyZWF0aW9uIC0gdmFsaWRhdGVzIHBhcmFtcyBhbmQgc2hvd3MgY29zdHMgV0lUSE9VVCBidWlsZGluZyB0cmFuc2FjdGlvbi4gVXNlIGJlZm9yZSBidWlsZF9jcmVhdGVfbWFya2V0X3RyYW5zYWN0aW9uLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBxdWVzdGlvbjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcXVlc3Rpb24gKG1heCAyMDAgY2hhcnMpJyB9LFxuICAgICAgICBsYXllcjogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydsYWInLCAncHJpdmF0ZSddLCBkZXNjcmlwdGlvbjogJ01hcmtldCBsYXllciAobGFiPWNvbW11bml0eSwgcHJpdmF0ZT1pbnZpdGUtb25seSknIH0sXG4gICAgICAgIGNsb3NpbmdfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSB3aGVuIGJldHRpbmcgY2xvc2VzJyB9LFxuICAgICAgICByZXNvbHV0aW9uX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgd2hlbiBtYXJrZXQgY2FuIGJlIHJlc29sdmVkIChvcHRpb25hbCwgYXV0by1jYWxjdWxhdGVkKScgfSxcbiAgICAgICAgbWFya2V0X3R5cGU6IHsgdHlwZTogJ3N0cmluZycsIGVudW06IFsnZXZlbnQnLCAnbWVhc3VyZW1lbnQnXSwgZGVzY3JpcHRpb246ICdFdmVudC1iYXNlZCAoUnVsZSBBKSBvciBtZWFzdXJlbWVudC1wZXJpb2QgKFJ1bGUgQiknIH0sXG4gICAgICAgIGV2ZW50X3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgZXZlbnQgdGltZSAocmVxdWlyZWQgZm9yIGV2ZW50LWJhc2VkIG1hcmtldHMpJyB9LFxuICAgICAgICBtZWFzdXJlbWVudF9zdGFydDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBtZWFzdXJlbWVudCBzdGFydCAoZm9yIG1lYXN1cmVtZW50IG1hcmtldHMpJyB9LFxuICAgICAgICBtZWFzdXJlbWVudF9lbmQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgbWVhc3VyZW1lbnQgZW5kIChvcHRpb25hbCknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncXVlc3Rpb24nLCAnbGF5ZXInLCAnY2xvc2luZ190aW1lJ10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jcmVhdGVfbGFiX21hcmtldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjcmVhdGUgYSBMYWIgKGNvbW11bml0eSkgbWFya2V0LiBWYWxpZGF0ZXMgYWdhaW5zdCB2Ni4zIHJ1bGVzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBxdWVzdGlvbjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcXVlc3Rpb24gKG1heCAyMDAgY2hhcnMpJyB9LFxuICAgICAgICBjbG9zaW5nX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgd2hlbiBiZXR0aW5nIGNsb3NlcycgfSxcbiAgICAgICAgcmVzb2x1dGlvbl90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIHdoZW4gbWFya2V0IGNhbiBiZSByZXNvbHZlZCAob3B0aW9uYWwpJyB9LFxuICAgICAgICBtYXJrZXRfdHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydldmVudCcsICdtZWFzdXJlbWVudCddLCBkZXNjcmlwdGlvbjogJ01hcmtldCB0eXBlIGZvciB2YWxpZGF0aW9uJyB9LFxuICAgICAgICBldmVudF90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIGV2ZW50IHRpbWUgKGZvciBldmVudC1iYXNlZCknIH0sXG4gICAgICAgIG1lYXN1cmVtZW50X3N0YXJ0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIG1lYXN1cmVtZW50IHN0YXJ0IChmb3IgbWVhc3VyZW1lbnQpJyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDcmVhdG9yIHdhbGxldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBpbnZpdGVfaGFzaDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdPcHRpb25hbCA2NC1jaGFyIGhleCBmb3IgaW52aXRlIGxpbmtzJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3F1ZXN0aW9uJywgJ2Nsb3NpbmdfdGltZScsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY3JlYXRlX3ByaXZhdGVfbWFya2V0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIGNyZWF0ZSBhIFByaXZhdGUgKGludml0ZS1vbmx5KSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHF1ZXN0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBxdWVzdGlvbicgfSxcbiAgICAgICAgY2xvc2luZ190aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIGNsb3NpbmcgdGltZScgfSxcbiAgICAgICAgcmVzb2x1dGlvbl90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIHJlc29sdXRpb24gdGltZSAob3B0aW9uYWwpJyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgICAgaW52aXRlX2hhc2g6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnT3B0aW9uYWwgaW52aXRlIGhhc2ggZm9yIHJlc3RyaWN0ZWQgYWNjZXNzJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3F1ZXN0aW9uJywgJ2Nsb3NpbmdfdGltZScsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY3JlYXRlX3JhY2VfbWFya2V0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIGNyZWF0ZSBhIFJhY2UgKG11bHRpLW91dGNvbWUpIG1hcmtldCB3aXRoIDItMTAgb3V0Y29tZXMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHF1ZXN0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBxdWVzdGlvbicgfSxcbiAgICAgICAgb3V0Y29tZXM6IHtcbiAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdBcnJheSBvZiAyLTEwIG91dGNvbWUgbGFiZWxzJyxcbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2luZ190aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIGNsb3NpbmcgdGltZScgfSxcbiAgICAgICAgcmVzb2x1dGlvbl90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIHJlc29sdXRpb24gdGltZSAob3B0aW9uYWwpJyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydxdWVzdGlvbicsICdvdXRjb21lcycsICdjbG9zaW5nX3RpbWUnLCAnY3JlYXRvcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9jcmVhdGlvbl9mZWVzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBtYXJrZXQgY3JlYXRpb24gZmVlcyBmb3IgYWxsIGxheWVycyAoT2ZmaWNpYWwsIExhYiwgUHJpdmF0ZSkuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7fSxcbiAgICAgIHJlcXVpcmVkOiBbXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9wbGF0Zm9ybV9mZWVzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBwbGF0Zm9ybSBmZWUgcmF0ZXMgZm9yIGFsbCBsYXllcnMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7fSxcbiAgICAgIHJlcXVpcmVkOiBbXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF90aW1pbmdfcnVsZXMnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IHY2LjMgdGltaW5nIHJ1bGVzIGFuZCBjb25zdHJhaW50cyBmb3IgbWFya2V0IGNyZWF0aW9uLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge30sXG4gICAgICByZXF1aXJlZDogW10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfcGFyaW11dHVlbF9ydWxlcycsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgdjYuMyBwYXJpbXV0dWVsIHJ1bGVzIGZvciBMYWIgbWFya2V0IGNyZWF0aW9uLiBDUklUSUNBTDogUmVhZCB0aGlzIEJFRk9SRSBjcmVhdGluZyBhbnkgbWFya2V0LiBDb250YWlucyBibG9ja2VkIHRlcm1zLCByZXF1aXJlZCBkYXRhIHNvdXJjZXMsIGFuZCB2YWxpZGF0aW9uIHJ1bGVzIHRoYXQgd2lsbCBSRUpFQ1QgaW52YWxpZCBtYXJrZXRzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge30sXG4gICAgICByZXF1aXJlZDogW10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICd2YWxpZGF0ZV9tYXJrZXRfcXVlc3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnVmFsaWRhdGUgYSBtYXJrZXQgcXVlc3Rpb24gYWdhaW5zdCB2Ni4zIHJ1bGVzIEJFRk9SRSBhdHRlbXB0aW5nIHRvIGNyZWF0ZSBpdC4gUmV0dXJucyB3aGV0aGVyIHRoZSBxdWVzdGlvbiB3b3VsZCBiZSBibG9ja2VkIGFuZCB3aHkuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHF1ZXN0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBxdWVzdGlvbiB0byB2YWxpZGF0ZScgfSxcbiAgICAgICAgbGF5ZXI6IHsgdHlwZTogJ3N0cmluZycsIGVudW06IFsnbGFiJywgJ3ByaXZhdGUnXSwgZGVzY3JpcHRpb246ICdNYXJrZXQgbGF5ZXIgKGRlZmF1bHQ6IGxhYiknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncXVlc3Rpb24nXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dlbmVyYXRlX2ludml0ZV9oYXNoJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dlbmVyYXRlIGEgcmFuZG9tIGludml0ZSBoYXNoIGZvciBwcml2YXRlIG1hcmtldCBhY2Nlc3MgY29udHJvbC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQT1NJVElPTiAmIENMQUlNU1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnZ2V0X3Bvc2l0aW9ucycsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgYWxsIGJldHRpbmcgcG9zaXRpb25zIGZvciBhIHdhbGxldCBpbmNsdWRpbmcgd2luL2xvc3Mgc3RhdHMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHdhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTb2xhbmEgd2FsbGV0IGFkZHJlc3MnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfY2xhaW1hYmxlJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBhbGwgY2xhaW1hYmxlIHdpbm5pbmdzIGFuZCByZWZ1bmRzIGZvciBhIHdhbGxldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1NvbGFuYSB3YWxsZXQgYWRkcmVzcycgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWyd3YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUkVTT0xVVElPTiAmIERJU1BVVEVTXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdnZXRfcmVzb2x1dGlvbl9zdGF0dXMnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IHJlc29sdXRpb24gc3RhdHVzIGZvciBhIG1hcmtldCAocmVzb2x2ZWQsIGRpc3B1dGVkLCBwZW5kaW5nKS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X2Rpc3B1dGVkX21hcmtldHMnLFxuICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgbWFya2V0cyBjdXJyZW50bHkgdW5kZXIgZGlzcHV0ZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X21hcmtldHNfYXdhaXRpbmdfcmVzb2x1dGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdMaXN0IGFsbCBjbG9zZWQgbWFya2V0cyBhd2FpdGluZyByZXNvbHV0aW9uLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge30sXG4gICAgICByZXF1aXJlZDogW10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEFJIEFHRU5UIEFGRklMSUFURSBORVRXT1JLXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdjaGVja19hZmZpbGlhdGVfY29kZScsXG4gICAgZGVzY3JpcHRpb246ICdDaGVjayBpZiBhbiBhZmZpbGlhdGUgY29kZSBpcyBhdmFpbGFibGUgZm9yIHJlZ2lzdHJhdGlvbi4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBZmZpbGlhdGUgY29kZSB0byBjaGVjayAoMy0xNiBhbHBoYW51bWVyaWMgY2hhcnMpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ3N1Z2dlc3RfYWZmaWxpYXRlX2NvZGVzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dlbmVyYXRlIHN1Z2dlc3RlZCBhZmZpbGlhdGUgY29kZXMgYmFzZWQgb24gYWdlbnQgbmFtZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgYWdlbnROYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05hbWUgb2YgdGhlIEFJIGFnZW50JyB9LFxuICAgICAgICBjb3VudDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdOdW1iZXIgb2Ygc3VnZ2VzdGlvbnMgKGRlZmF1bHQgNSknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnYWdlbnROYW1lJ10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfYWZmaWxpYXRlX2luZm8nLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IGFmZmlsaWF0ZSBhY2NvdW50IGluZm8gYnkgY29kZS4gU2hvd3MgZWFybmluZ3MsIHJlZmVycmFscywgc3RhdHVzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBjb2RlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0FmZmlsaWF0ZSBjb2RlJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9teV9hZmZpbGlhdGVzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBhbGwgYWZmaWxpYXRlIGFjY291bnRzIG93bmVkIGJ5IGEgd2FsbGV0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICB3YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnV2FsbGV0IGFkZHJlc3MnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfcmVmZXJyYWxzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBhbGwgdXNlcnMgcmVmZXJyZWQgYnkgYW4gYWZmaWxpYXRlIGNvZGUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNvZGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQWZmaWxpYXRlIGNvZGUnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnY29kZSddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X2FnZW50X25ldHdvcmtfc3RhdHMnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IG92ZXJhbGwgQUkgYWdlbnQgYWZmaWxpYXRlIG5ldHdvcmsgc3RhdGlzdGljcy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZm9ybWF0X2FmZmlsaWF0ZV9saW5rJyxcbiAgICBkZXNjcmlwdGlvbjogJ0Zvcm1hdCBhbiBhZmZpbGlhdGUgcmVmZXJyYWwgbGluayBmb3Igc2hhcmluZy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBZmZpbGlhdGUgY29kZScgfSxcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ09wdGlvbmFsIG1hcmtldCBwdWJsaWMga2V5IGZvciBkZWVwIGxpbmsnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnY29kZSddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X2NvbW1pc3Npb25faW5mbycsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgYWZmaWxpYXRlIGNvbW1pc3Npb24gc3RydWN0dXJlIGFuZCBleGFtcGxlcy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBWQUxJREFUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICd2YWxpZGF0ZV9tYXJrZXRfcGFyYW1zJyxcbiAgICBkZXNjcmlwdGlvbjogJ1ZhbGlkYXRlIG1hcmtldCBwYXJhbWV0ZXJzIGFnYWluc3QgdjYuMyB0aW1pbmcgcnVsZXMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHF1ZXN0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBxdWVzdGlvbiAobWF4IDIwMCBjaGFycyknIH0sXG4gICAgICAgIGNsb3NpbmdfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBjbG9zaW5nIHRpbWUnIH0sXG4gICAgICAgIG1hcmtldF90eXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ2V2ZW50JywgJ21lYXN1cmVtZW50J10sIGRlc2NyaXB0aW9uOiAnTWFya2V0IHR5cGUnIH0sXG4gICAgICAgIGV2ZW50X3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgZXZlbnQgdGltZSAoZm9yIGV2ZW50IG1hcmtldHMpJyB9LFxuICAgICAgICBtZWFzdXJlbWVudF9zdGFydDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBtZWFzdXJlbWVudCBzdGFydCAoZm9yIG1lYXN1cmVtZW50IG1hcmtldHMpJyB9LFxuICAgICAgICBtZWFzdXJlbWVudF9lbmQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgbWVhc3VyZW1lbnQgZW5kIChvcHRpb25hbCknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncXVlc3Rpb24nLCAnY2xvc2luZ190aW1lJywgJ21hcmtldF90eXBlJ10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICd2YWxpZGF0ZV9iZXQnLFxuICAgIGRlc2NyaXB0aW9uOiAnVmFsaWRhdGUgYmV0IHBhcmFtZXRlcnMgYmVmb3JlIGJ1aWxkaW5nIHRyYW5zYWN0aW9uLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGFtb3VudDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdCZXQgYW1vdW50IGluIFNPTCcgfSxcbiAgICAgICAgc2lkZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydZZXMnLCAnTm8nXSwgZGVzY3JpcHRpb246ICdTaWRlIHRvIGJldCBvbicgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnYW1vdW50JywgJ3NpZGUnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBCRVRTXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdidWlsZF9iZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdW5zaWduZWQgdHJhbnNhY3Rpb24gZm9yIHBsYWNpbmcgYSBiZXQgb24gYSBib29sZWFuIChZRVMvTk8pIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBvdXRjb21lOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ3llcycsICdubyddLCBkZXNjcmlwdGlvbjogJ091dGNvbWUgdG8gYmV0IG9uJyB9LFxuICAgICAgICBhbW91bnRfc29sOiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0JldCBhbW91bnQgaW4gU09MJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBhZmZpbGlhdGVfY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdPcHRpb25hbCBhZmZpbGlhdGUgY29kZSBmb3IgY29tbWlzc2lvbicgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnb3V0Y29tZScsICdhbW91bnRfc29sJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9yYWNlX2JldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiBmb3IgcGxhY2luZyBhIGJldCBvbiBhIHJhY2UgKG11bHRpLW91dGNvbWUpIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIG91dGNvbWVfaW5kZXg6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnSW5kZXggb2Ygb3V0Y29tZSB0byBiZXQgb24nIH0sXG4gICAgICAgIGFtb3VudF9zb2w6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnQmV0IGFtb3VudCBpbiBTT0wnIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VzZXIgd2FsbGV0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGFmZmlsaWF0ZV9jb2RlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ09wdGlvbmFsIGFmZmlsaWF0ZSBjb2RlJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdvdXRjb21lX2luZGV4JywgJ2Ftb3VudF9zb2wnLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBDTEFJTVNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NsYWltX3dpbm5pbmdzX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIGNsYWltIHdpbm5pbmdzIGZyb20gYSByZXNvbHZlZCBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgcG9zaXRpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUG9zaXRpb24gUERBJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAncG9zaXRpb24nLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NsYWltX3JlZnVuZF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjbGFpbSByZWZ1bmQgZnJvbSBjYW5jZWxsZWQvaW52YWxpZCBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgcG9zaXRpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUG9zaXRpb24gUERBJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAncG9zaXRpb24nLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2JhdGNoX2NsYWltX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHNpbmdsZSB0cmFuc2FjdGlvbiB0byBjbGFpbSBtdWx0aXBsZSBwb3NpdGlvbnMgYXQgb25jZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY2xhaW1zOiB7XG4gICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICBpdGVtczoge1xuICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICBwb3NpdGlvbjogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICB0eXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ3dpbm5pbmdzJywgJ3JlZnVuZCddIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdBcnJheSBvZiBjbGFpbXMgdG8gYmF0Y2gnLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydjbGFpbXMnLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NsYWltX2FmZmlsaWF0ZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjbGFpbSBhZmZpbGlhdGUgZWFybmluZ3MuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNvZGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQWZmaWxpYXRlIGNvZGUnIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0FmZmlsaWF0ZSBvd25lciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnY29kZScsICd1c2VyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBUUkFOU0FDVElPTiBCVUlMRElORyAtIFJBQ0UgQ0xBSU1TXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdidWlsZF9jbGFpbV9yYWNlX3dpbm5pbmdzX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIGNsYWltIHdpbm5pbmdzIGZyb20gYSByZXNvbHZlZCByYWNlIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgcG9zaXRpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBwb3NpdGlvbiBQREEnIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VzZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ3Bvc2l0aW9uJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jbGFpbV9yYWNlX3JlZnVuZF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjbGFpbSByZWZ1bmQgZnJvbSBjYW5jZWxsZWQgcmFjZSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHBvc2l0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgcG9zaXRpb24gUERBJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICdwb3NpdGlvbicsICd1c2VyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBUUkFOU0FDVElPTiBCVUlMRElORyAtIEFGRklMSUFURVxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfcmVnaXN0ZXJfYWZmaWxpYXRlX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIHJlZ2lzdGVyIGFzIGFuIGFmZmlsaWF0ZSB3aXRoIGEgdW5pcXVlIGNvZGUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNvZGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQWZmaWxpYXRlIGNvZGUgKDMtMTYgYWxwaGFudW1lcmljIGNoYXJzKScgfSxcbiAgICAgICAgdXNlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnT3duZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3RvZ2dsZV9hZmZpbGlhdGVfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQURNSU4gT05MWTogQnVpbGQgdHJhbnNhY3Rpb24gdG8gYWN0aXZhdGUvZGVhY3RpdmF0ZSBhZmZpbGlhdGUuIFJlcXVpcmVzIHByb3RvY29sIGFkbWluIHNpZ25hdHVyZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBZmZpbGlhdGUgY29kZScgfSxcbiAgICAgICAgYWN0aXZlOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdOZXcgYWN0aXZlIHN0YXR1cycgfSxcbiAgICAgICAgdXNlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnT3duZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnLCAnYWN0aXZlJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFNJTVVMQVRJT05cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ3NpbXVsYXRlX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ1NpbXVsYXRlIGEgdHJhbnNhY3Rpb24gYmVmb3JlIHNpZ25pbmcgdG8gY2hlY2sgZm9yIGVycm9ycy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgdHJhbnNhY3Rpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQmFzZTY0LWVuY29kZWQgdHJhbnNhY3Rpb24nIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VzZXIgd2FsbGV0IHB1YmxpYyBrZXknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsndHJhbnNhY3Rpb24nLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUkVTT0xVVElPTiBTWVNURU1cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3Byb3Bvc2VfcmVzb2x1dGlvbl90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiBmb3IgY3JlYXRvciB0byBwcm9wb3NlIG1hcmtldCBvdXRjb21lLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIG91dGNvbWU6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ1Byb3Bvc2VkIG91dGNvbWUgKHRydWU9WWVzLCBmYWxzZT1ObyknIH0sXG4gICAgICAgIHByb3Bvc2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQcm9wb3NlciB3YWxsZXQgKGNyZWF0b3IpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdvdXRjb21lJywgJ3Byb3Bvc2VyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfcmVzb2x2ZV9tYXJrZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gZGlyZWN0bHkgcmVzb2x2ZSBhIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBvdXRjb21lOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdXaW5uaW5nIG91dGNvbWUgKHRydWU9WWVzLCBmYWxzZT1ObyknIH0sXG4gICAgICAgIHJlc29sdmVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSZXNvbHZlciB3YWxsZXQgKGNyZWF0b3Ivb3JhY2xlKScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnb3V0Y29tZScsICdyZXNvbHZlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2ZpbmFsaXplX3Jlc29sdXRpb25fdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gZmluYWxpemUgcmVzb2x1dGlvbiBhZnRlciBkaXNwdXRlIHdpbmRvdy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBjYWxsZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NhbGxlciB3YWxsZXQgKGFueW9uZSBjYW4gZmluYWxpemUpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdjYWxsZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9wcm9wb3NlX3JhY2VfcmVzb2x1dGlvbl90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBwcm9wb3NlIHJhY2UgbWFya2V0IG91dGNvbWUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHdpbm5pbmdfb3V0Y29tZV9pbmRleDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdJbmRleCBvZiB3aW5uaW5nIG91dGNvbWUgKDAtYmFzZWQpJyB9LFxuICAgICAgICBwcm9wb3Nlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJvcG9zZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ3dpbm5pbmdfb3V0Y29tZV9pbmRleCcsICdwcm9wb3Nlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3Jlc29sdmVfcmFjZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBkaXJlY3RseSByZXNvbHZlIGEgcmFjZSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHdpbm5pbmdfb3V0Y29tZV9pbmRleDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdJbmRleCBvZiB3aW5uaW5nIG91dGNvbWUnIH0sXG4gICAgICAgIHJlc29sdmVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSZXNvbHZlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAnd2lubmluZ19vdXRjb21lX2luZGV4JywgJ3Jlc29sdmVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfZmluYWxpemVfcmFjZV9yZXNvbHV0aW9uX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGZpbmFsaXplIHJhY2UgcmVzb2x1dGlvbi4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgY2FsbGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDYWxsZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ2NhbGxlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gRElTUFVURVNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2ZsYWdfZGlzcHV0ZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjaGFsbGVuZ2UgYSBwcm9wb3NlZCByZXNvbHV0aW9uIHdpdGggYSBib25kLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGRpc3B1dGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdEaXNwdXRlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ2Rpc3B1dGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfZmxhZ19yYWNlX2Rpc3B1dGVfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gZGlzcHV0ZSBhIHJhY2UgbWFya2V0IHJlc29sdXRpb24uJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGRpc3B1dGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdEaXNwdXRlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAnZGlzcHV0ZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF92b3RlX2NvdW5jaWxfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gZm9yIGNvdW5jaWwgbWVtYmVyIHRvIHZvdGUgb24gZGlzcHV0ZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICB2b3RlX3llczogeyB0eXBlOiAnYm9vbGVhbicsIGRlc2NyaXB0aW9uOiAnVm90ZSBmb3IgWWVzIG91dGNvbWUnIH0sXG4gICAgICAgIHZvdGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDb3VuY2lsIG1lbWJlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ3ZvdGVfeWVzJywgJ3ZvdGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfdm90ZV9jb3VuY2lsX3JhY2VfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gZm9yIGNvdW5jaWwgdG8gdm90ZSBvbiByYWNlIGRpc3B1dGUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHZvdGVfb3V0Y29tZV9pbmRleDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdPdXRjb21lIGluZGV4IHRvIHZvdGUgZm9yJyB9LFxuICAgICAgICB2b3Rlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ291bmNpbCBtZW1iZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ3ZvdGVfb3V0Y29tZV9pbmRleCcsICd2b3Rlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NoYW5nZV9jb3VuY2lsX3ZvdGVfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gZm9yIGNvdW5jaWwgbWVtYmVyIHRvIGNoYW5nZSB0aGVpciB2b3RlIG9uIGEgYm9vbGVhbiBtYXJrZXQgZGlzcHV0ZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBuZXdfdm90ZV95ZXM6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ05ldyB2b3RlICh0cnVlPVlFUywgZmFsc2U9Tk8pJyB9LFxuICAgICAgICB2b3Rlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ291bmNpbCBtZW1iZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICduZXdfdm90ZV95ZXMnLCAndm90ZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jaGFuZ2VfY291bmNpbF92b3RlX3JhY2VfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gZm9yIGNvdW5jaWwgbWVtYmVyIHRvIGNoYW5nZSB0aGVpciB2b3RlIG9uIGEgcmFjZSBtYXJrZXQgZGlzcHV0ZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgbmV3X3ZvdGVfb3V0Y29tZV9pbmRleDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdOZXcgb3V0Y29tZSBpbmRleCB0byB2b3RlIGZvcicgfSxcbiAgICAgICAgdm90ZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NvdW5jaWwgbWVtYmVyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICduZXdfdm90ZV9vdXRjb21lX2luZGV4JywgJ3ZvdGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBXSElURUxJU1QgTUFOQUdFTUVOVFxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfYWRkX3RvX3doaXRlbGlzdF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBhZGQgdXNlciB0byBwcml2YXRlIG1hcmtldCB3aGl0ZWxpc3QuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgdXNlcl90b19hZGQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVXNlciB3YWxsZXQgdG8gd2hpdGVsaXN0JyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgY3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ3VzZXJfdG9fYWRkJywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9yZW1vdmVfZnJvbV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gcmVtb3ZlIHVzZXIgZnJvbSB3aGl0ZWxpc3QuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgdXNlcl90b19yZW1vdmU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVXNlciB3YWxsZXQgdG8gcmVtb3ZlJyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgY3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ3VzZXJfdG9fcmVtb3ZlJywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jcmVhdGVfcmFjZV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gY3JlYXRlIHdoaXRlbGlzdCBmb3IgcHJpdmF0ZSByYWNlIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IGNyZWF0b3Igd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9hZGRfdG9fcmFjZV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gYWRkIHVzZXIgdG8gcmFjZSBtYXJrZXQgd2hpdGVsaXN0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICB1c2VyX3RvX2FkZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCB0byB3aGl0ZWxpc3QnIH0sXG4gICAgICAgIGNyZWF0b3Jfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBjcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICd1c2VyX3RvX2FkZCcsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfcmVtb3ZlX2Zyb21fcmFjZV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gcmVtb3ZlIHVzZXIgZnJvbSByYWNlIHdoaXRlbGlzdC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgdXNlcl90b19yZW1vdmU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVXNlciB3YWxsZXQgdG8gcmVtb3ZlJyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgY3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAndXNlcl90b19yZW1vdmUnLCAnY3JlYXRvcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQ1JFQVRPUiBQUk9GSUxFU1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY3JlYXRlX2NyZWF0b3JfcHJvZmlsZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjcmVhdGUgb24tY2hhaW4gY3JlYXRvciBwcm9maWxlLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBkaXNwbGF5X25hbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRGlzcGxheSBuYW1lIChtYXggMzIgY2hhcnMpJyB9LFxuICAgICAgICBjcmVhdG9yX2ZlZV9icHM6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnQ3JlYXRvciBmZWUgaW4gYmFzaXMgcG9pbnRzIChtYXggNTApJyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydkaXNwbGF5X25hbWUnLCAnY3JlYXRvcl9mZWVfYnBzJywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF91cGRhdGVfY3JlYXRvcl9wcm9maWxlX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIHVwZGF0ZSBjcmVhdG9yIHByb2ZpbGUuIEJvdGggZGlzcGxheV9uYW1lIGFuZCBkZWZhdWx0X2ZlZV9icHMgYXJlIHJlcXVpcmVkLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBkaXNwbGF5X25hbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRGlzcGxheSBuYW1lIChtYXggMzIgY2hhcnMpJyB9LFxuICAgICAgICBkZWZhdWx0X2ZlZV9icHM6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnRGVmYXVsdCBmZWUgaW4gYmFzaXMgcG9pbnRzIChtYXggNTAgPSAwLjUlKScgfSxcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnZGlzcGxheV9uYW1lJywgJ2RlZmF1bHRfZmVlX2JwcycsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY2xhaW1fY3JlYXRvcl90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjbGFpbSBhY2N1bXVsYXRlZCBjcmVhdG9yIGZlZXMgZnJvbSBzb2xfdHJlYXN1cnkuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNyZWF0b3Jfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NyZWF0b3Igd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIE1BUktFVCBNQU5BR0VNRU5UXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdidWlsZF9jbG9zZV9tYXJrZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gY2xvc2UgYmV0dGluZyBvbiBhIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBjYWxsZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NhbGxlciB3YWxsZXQgKGNyZWF0b3IpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdjYWxsZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9leHRlbmRfbWFya2V0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0FETUlOIE9OTFk6IEJ1aWxkIHRyYW5zYWN0aW9uIHRvIGV4dGVuZCBtYXJrZXQgZGVhZGxpbmUuIFJlcXVpcmVzIHByb3RvY29sIGFkbWluIHNpZ25hdHVyZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBuZXdfY2xvc2luZ190aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05ldyBjbG9zaW5nIHRpbWUgKElTTyA4NjAxKScgfSxcbiAgICAgICAgbmV3X3Jlc29sdXRpb25fdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOZXcgcmVzb2x1dGlvbiB0aW1lIChvcHRpb25hbCknIH0sXG4gICAgICAgIGNhbGxlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ2FsbGVyIHdhbGxldCAoY3JlYXRvciknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ25ld19jbG9zaW5nX3RpbWUnLCAnY2FsbGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY2xvc2VfcmFjZV9tYXJrZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gY2xvc2UgYmV0dGluZyBvbiBhIHJhY2UgbWFya2V0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBjYWxsZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NhbGxlciB3YWxsZXQgKGNyZWF0b3IpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ2NhbGxlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2V4dGVuZF9yYWNlX21hcmtldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdBRE1JTiBPTkxZOiBCdWlsZCB0cmFuc2FjdGlvbiB0byBleHRlbmQgcmFjZSBtYXJrZXQgZGVhZGxpbmUuIFJlcXVpcmVzIHByb3RvY29sIGFkbWluIHNpZ25hdHVyZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgbmV3X2Nsb3NpbmdfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOZXcgY2xvc2luZyB0aW1lIChJU08gODYwMSknIH0sXG4gICAgICAgIG5ld19yZXNvbHV0aW9uX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTmV3IHJlc29sdXRpb24gdGltZSAob3B0aW9uYWwpJyB9LFxuICAgICAgICBjYWxsZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NhbGxlciB3YWxsZXQgKGNyZWF0b3IpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ25ld19jbG9zaW5nX3RpbWUnLCAnY2FsbGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY2FuY2VsX21hcmtldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjYW5jZWwgYSBib29sZWFuIG1hcmtldC4gQWxsIGJldHRvcnMgY2FuIGNsYWltIHJlZnVuZHMgYWZ0ZXIgY2FuY2VsbGF0aW9uLiBPbmx5IGNyZWF0b3Igb3IgYWRtaW4gY2FuIGNhbmNlbC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICByZWFzb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmVhc29uIGZvciBjYW5jZWxsYXRpb24nIH0sXG4gICAgICAgIGF1dGhvcml0eV93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQXV0aG9yaXR5IHdhbGxldCAoY3JlYXRvciBvciBhZG1pbiknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ3JlYXNvbicsICdhdXRob3JpdHlfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jYW5jZWxfcmFjZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjYW5jZWwgYSByYWNlIG1hcmtldC4gQWxsIGJldHRvcnMgY2FuIGNsYWltIHJlZnVuZHMgYWZ0ZXIgY2FuY2VsbGF0aW9uLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICByZWFzb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmVhc29uIGZvciBjYW5jZWxsYXRpb24nIH0sXG4gICAgICAgIGF1dGhvcml0eV93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQXV0aG9yaXR5IHdhbGxldCAoY3JlYXRvciBvciBhZG1pbiknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAncmVhc29uJywgJ2F1dGhvcml0eV93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFRPT0wgSEFORExFUlNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVUb29sKFxuICBuYW1lOiBzdHJpbmcsXG4gIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+XG4pOiBQcm9taXNlPHsgY29udGVudDogQXJyYXk8eyB0eXBlOiBzdHJpbmc7IHRleHQ6IHN0cmluZyB9PiB9PiB7XG4gIHRyeSB7XG4gICAgc3dpdGNoIChuYW1lKSB7XG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIE1BUktFVCBSRUFEIE9QRVJBVElPTlNcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnbGlzdF9tYXJrZXRzJzoge1xuICAgICAgICBjb25zdCBzdGF0dXMgPSBhcmdzLnN0YXR1cyBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGxheWVyID0gYXJncy5sYXllciBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGxldCBtYXJrZXRzID0gYXdhaXQgbGlzdE1hcmtldHMoc3RhdHVzKTtcbiAgICAgICAgaWYgKGxheWVyKSB7XG4gICAgICAgICAgbWFya2V0cyA9IG1hcmtldHMuZmlsdGVyKG0gPT4gbS5sYXllci50b0xvd2VyQ2FzZSgpID09PSBsYXllci50b0xvd2VyQ2FzZSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBjb3VudDogbWFya2V0cy5sZW5ndGgsXG4gICAgICAgICAgZmlsdGVyOiB7IHN0YXR1czogc3RhdHVzIHx8ICdhbGwnLCBsYXllcjogbGF5ZXIgfHwgJ2FsbCcgfSxcbiAgICAgICAgICBtYXJrZXRzOiBtYXJrZXRzLm1hcChtID0+ICh7XG4gICAgICAgICAgICBwdWJsaWNLZXk6IG0ucHVibGljS2V5LFxuICAgICAgICAgICAgbWFya2V0SWQ6IG0ubWFya2V0SWQsXG4gICAgICAgICAgICBxdWVzdGlvbjogbS5xdWVzdGlvbixcbiAgICAgICAgICAgIHN0YXR1czogbS5zdGF0dXMsXG4gICAgICAgICAgICBsYXllcjogbS5sYXllcixcbiAgICAgICAgICAgIHdpbm5pbmdPdXRjb21lOiBtLndpbm5pbmdPdXRjb21lLFxuICAgICAgICAgICAgeWVzUGVyY2VudDogbS55ZXNQZXJjZW50LFxuICAgICAgICAgICAgbm9QZXJjZW50OiBtLm5vUGVyY2VudCxcbiAgICAgICAgICAgIHRvdGFsUG9vbFNvbDogbS50b3RhbFBvb2xTb2wsXG4gICAgICAgICAgICBjbG9zaW5nVGltZTogbS5jbG9zaW5nVGltZSxcbiAgICAgICAgICAgIGlzQmV0dGluZ09wZW46IG0uaXNCZXR0aW5nT3BlbixcbiAgICAgICAgICB9KSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfbWFya2V0Jzoge1xuICAgICAgICBjb25zdCBwdWJsaWNLZXkgPSBhcmdzLnB1YmxpY0tleSBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcHVibGljS2V5KSByZXR1cm4gZXJyb3JSZXNwb25zZSgncHVibGljS2V5IGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGF3YWl0IGdldE1hcmtldChwdWJsaWNLZXkpO1xuICAgICAgICBpZiAoIW1hcmtldCkgcmV0dXJuIGVycm9yUmVzcG9uc2UoYE1hcmtldCAke3B1YmxpY0tleX0gbm90IGZvdW5kYCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBtYXJrZXQgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9xdW90ZSc6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBzaWRlID0gYXJncy5zaWRlIGFzICdZZXMnIHwgJ05vJztcbiAgICAgICAgY29uc3QgYW1vdW50ID0gYXJncy5hbW91bnQgYXMgbnVtYmVyO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhc2lkZSB8fCBhbW91bnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIHNpZGUsIGFuZCBhbW91bnQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcXVvdGUgPSBhd2FpdCBnZXRRdW90ZShtYXJrZXQsIHNpZGUsIGFtb3VudCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBxdW90ZSB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBSQUNFIE1BUktFVFNcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnbGlzdF9yYWNlX21hcmtldHMnOiB7XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IGFyZ3Muc3RhdHVzIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgbWFya2V0cyA9IGF3YWl0IGxpc3RSYWNlTWFya2V0cyhzdGF0dXMpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBjb3VudDogbWFya2V0cy5sZW5ndGgsXG4gICAgICAgICAgbWFya2V0czogbWFya2V0cy5tYXAobSA9PiAoe1xuICAgICAgICAgICAgcHVibGljS2V5OiBtLnB1YmxpY0tleSxcbiAgICAgICAgICAgIG1hcmtldElkOiBtLm1hcmtldElkLFxuICAgICAgICAgICAgcXVlc3Rpb246IG0ucXVlc3Rpb24sXG4gICAgICAgICAgICBzdGF0dXM6IG0uc3RhdHVzLFxuICAgICAgICAgICAgb3V0Y29tZUNvdW50OiBtLm91dGNvbWVzLmxlbmd0aCxcbiAgICAgICAgICAgIG91dGNvbWVzOiBtLm91dGNvbWVzLFxuICAgICAgICAgICAgdG90YWxQb29sU29sOiBtLnRvdGFsUG9vbFNvbCxcbiAgICAgICAgICAgIGNsb3NpbmdUaW1lOiBtLmNsb3NpbmdUaW1lLFxuICAgICAgICAgICAgaXNCZXR0aW5nT3BlbjogbS5pc0JldHRpbmdPcGVuLFxuICAgICAgICAgIH0pKSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9yYWNlX21hcmtldCc6IHtcbiAgICAgICAgY29uc3QgcHVibGljS2V5ID0gYXJncy5wdWJsaWNLZXkgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXB1YmxpY0tleSkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3B1YmxpY0tleSBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhd2FpdCBnZXRSYWNlTWFya2V0KHB1YmxpY0tleSk7XG4gICAgICAgIGlmICghbWFya2V0KSByZXR1cm4gZXJyb3JSZXNwb25zZShgUmFjZSBtYXJrZXQgJHtwdWJsaWNLZXl9IG5vdCBmb3VuZGApO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgbWFya2V0IH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfcmFjZV9xdW90ZSc6IHtcbiAgICAgICAgY29uc3QgbWFya2V0UGRhID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBvdXRjb21lSW5kZXggPSBhcmdzLm91dGNvbWVJbmRleCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IGFtb3VudCA9IGFyZ3MuYW1vdW50IGFzIG51bWJlcjtcbiAgICAgICAgaWYgKCFtYXJrZXRQZGEgfHwgb3V0Y29tZUluZGV4ID09PSB1bmRlZmluZWQgfHwgYW1vdW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBvdXRjb21lSW5kZXgsIGFuZCBhbW91bnQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXdhaXQgZ2V0UmFjZU1hcmtldChtYXJrZXRQZGEpO1xuICAgICAgICBpZiAoIW1hcmtldCkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ1JhY2UgbWFya2V0IG5vdCBmb3VuZCcpO1xuICAgICAgICBjb25zdCBxdW90ZSA9IGdldFJhY2VRdW90ZShtYXJrZXQsIG91dGNvbWVJbmRleCwgYW1vdW50KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHF1b3RlLCBtYXJrZXQ6IHsgcXVlc3Rpb246IG1hcmtldC5xdWVzdGlvbiwgb3V0Y29tZXM6IG1hcmtldC5vdXRjb21lcyB9IH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFBPU0lUSU9OUyAmIENMQUlNU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdnZXRfcG9zaXRpb25zJzoge1xuICAgICAgICBjb25zdCB3YWxsZXQgPSBhcmdzLndhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghd2FsbGV0KSByZXR1cm4gZXJyb3JSZXNwb25zZSgnd2FsbGV0IGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IHN1bW1hcnkgPSBhd2FpdCBnZXRQb3NpdGlvbnNTdW1tYXJ5KHdhbGxldCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoc3VtbWFyeSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9jbGFpbWFibGUnOiB7XG4gICAgICAgIGNvbnN0IHdhbGxldCA9IGFyZ3Mud2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCF3YWxsZXQpIHJldHVybiBlcnJvclJlc3BvbnNlKCd3YWxsZXQgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3QgY2xhaW1hYmxlID0gYXdhaXQgZ2V0Q2xhaW1hYmxlUG9zaXRpb25zKHdhbGxldCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoY2xhaW1hYmxlKTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBSRVNPTFVUSU9OICYgRElTUFVURVNcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnZ2V0X3Jlc29sdXRpb25fc3RhdHVzJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0KSByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0IGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IGdldFJlc29sdXRpb25TdGF0dXMobWFya2V0KTtcbiAgICAgICAgaWYgKCFzdGF0dXMpIHJldHVybiBlcnJvclJlc3BvbnNlKCdNYXJrZXQgbm90IGZvdW5kJyk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoc3RhdHVzKTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X2Rpc3B1dGVkX21hcmtldHMnOiB7XG4gICAgICAgIGNvbnN0IGRpc3B1dGVzID0gYXdhaXQgZ2V0RGlzcHV0ZWRNYXJrZXRzKCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBjb3VudDogZGlzcHV0ZXMubGVuZ3RoLCBkaXNwdXRlcyB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X21hcmtldHNfYXdhaXRpbmdfcmVzb2x1dGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0cyA9IGF3YWl0IGdldE1hcmtldHNBd2FpdGluZ1Jlc29sdXRpb24oKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgY291bnQ6IG1hcmtldHMubGVuZ3RoLFxuICAgICAgICAgIG1hcmtldHM6IG1hcmtldHMubWFwKG0gPT4gKHtcbiAgICAgICAgICAgIHB1YmxpY0tleTogbS5wdWJsaWNLZXksXG4gICAgICAgICAgICBxdWVzdGlvbjogbS5xdWVzdGlvbixcbiAgICAgICAgICAgIGNsb3NpbmdUaW1lOiBtLmNsb3NpbmdUaW1lLFxuICAgICAgICAgICAgcmVzb2x1dGlvblRpbWU6IG0ucmVzb2x1dGlvblRpbWUsXG4gICAgICAgICAgfSkpLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBBSSBBR0VOVCBBRkZJTElBVEUgTkVUV09SS1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdjaGVja19hZmZpbGlhdGVfY29kZSc6IHtcbiAgICAgICAgY29uc3QgY29kZSA9IGFyZ3MuY29kZSBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghY29kZSkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2NvZGUgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlID0gYXdhaXQgaXNBZmZpbGlhdGVDb2RlQXZhaWxhYmxlKGNvZGUpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgY29kZSwgYXZhaWxhYmxlIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdzdWdnZXN0X2FmZmlsaWF0ZV9jb2Rlcyc6IHtcbiAgICAgICAgY29uc3QgYWdlbnROYW1lID0gYXJncy5hZ2VudE5hbWUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjb3VudCA9IChhcmdzLmNvdW50IGFzIG51bWJlcikgfHwgNTtcbiAgICAgICAgaWYgKCFhZ2VudE5hbWUpIHJldHVybiBlcnJvclJlc3BvbnNlKCdhZ2VudE5hbWUgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3Qgc3VnZ2VzdGlvbnMgPSBhd2FpdCBzdWdnZXN0QWZmaWxpYXRlQ29kZXMoYWdlbnROYW1lLCBjb3VudCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBzdWdnZXN0aW9ucyB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X2FmZmlsaWF0ZV9pbmZvJzoge1xuICAgICAgICBjb25zdCBjb2RlID0gYXJncy5jb2RlIGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFjb2RlKSByZXR1cm4gZXJyb3JSZXNwb25zZSgnY29kZSBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBhZmZpbGlhdGUgPSBhd2FpdCBnZXRBZmZpbGlhdGVCeUNvZGUoY29kZSk7XG4gICAgICAgIGlmICghYWZmaWxpYXRlKSByZXR1cm4gZXJyb3JSZXNwb25zZShgQWZmaWxpYXRlICR7Y29kZX0gbm90IGZvdW5kYCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBhZmZpbGlhdGUgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9teV9hZmZpbGlhdGVzJzoge1xuICAgICAgICBjb25zdCB3YWxsZXQgPSBhcmdzLndhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghd2FsbGV0KSByZXR1cm4gZXJyb3JSZXNwb25zZSgnd2FsbGV0IGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IGFmZmlsaWF0ZXMgPSBhd2FpdCBnZXRBZmZpbGlhdGVzQnlPd25lcih3YWxsZXQpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgY291bnQ6IGFmZmlsaWF0ZXMubGVuZ3RoLCBhZmZpbGlhdGVzIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfcmVmZXJyYWxzJzoge1xuICAgICAgICBjb25zdCBjb2RlID0gYXJncy5jb2RlIGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFjb2RlKSByZXR1cm4gZXJyb3JSZXNwb25zZSgnY29kZSBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCByZWZlcnJhbHMgPSBhd2FpdCBnZXRSZWZlcnJhbHNCeUFmZmlsaWF0ZShjb2RlKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IGNvdW50OiByZWZlcnJhbHMubGVuZ3RoLCByZWZlcnJhbHMgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9hZ2VudF9uZXR3b3JrX3N0YXRzJzoge1xuICAgICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGdldEFnZW50TmV0d29ya1N0YXRzKCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoc3RhdHMpO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdmb3JtYXRfYWZmaWxpYXRlX2xpbmsnOiB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBhcmdzLmNvZGUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmICghY29kZSkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2NvZGUgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3QgbGluayA9IGZvcm1hdEFmZmlsaWF0ZUxpbmsoY29kZSwgbWFya2V0KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IGxpbmssIGNvZGUsIG1hcmtldCB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X2NvbW1pc3Npb25faW5mbyc6IHtcbiAgICAgICAgY29uc3QgaW5mbyA9IGdldENvbW1pc3Npb25JbmZvKCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoaW5mbyk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gVkFMSURBVElPTlxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICd2YWxpZGF0ZV9tYXJrZXRfcGFyYW1zJzoge1xuICAgICAgICBjb25zdCBwYXJhbXM6IE1hcmtldFRpbWluZ1BhcmFtcyA9IHtcbiAgICAgICAgICBxdWVzdGlvbjogYXJncy5xdWVzdGlvbiBhcyBzdHJpbmcsXG4gICAgICAgICAgY2xvc2luZ1RpbWU6IG5ldyBEYXRlKGFyZ3MuY2xvc2luZ190aW1lIGFzIHN0cmluZyksXG4gICAgICAgICAgbWFya2V0VHlwZTogYXJncy5tYXJrZXRfdHlwZSBhcyAnZXZlbnQnIHwgJ21lYXN1cmVtZW50JyxcbiAgICAgICAgICBldmVudFRpbWU6IGFyZ3MuZXZlbnRfdGltZSA/IG5ldyBEYXRlKGFyZ3MuZXZlbnRfdGltZSBhcyBzdHJpbmcpIDogdW5kZWZpbmVkLFxuICAgICAgICAgIG1lYXN1cmVtZW50U3RhcnQ6IGFyZ3MubWVhc3VyZW1lbnRfc3RhcnQgPyBuZXcgRGF0ZShhcmdzLm1lYXN1cmVtZW50X3N0YXJ0IGFzIHN0cmluZykgOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWVhc3VyZW1lbnRFbmQ6IGFyZ3MubWVhc3VyZW1lbnRfZW5kID8gbmV3IERhdGUoYXJncy5tZWFzdXJlbWVudF9lbmQgYXMgc3RyaW5nKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IHZhbGlkYXRlTWFya2V0VGltaW5nKHBhcmFtcyk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyB2YWxpZGF0aW9uLCBydWxlczogVElNSU5HIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICd2YWxpZGF0ZV9iZXQnOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldFB1YmtleSA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgYW1vdW50ID0gYXJncy5hbW91bnQgYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBzaWRlID0gYXJncy5zaWRlIGFzICdZZXMnIHwgJ05vJztcbiAgICAgICAgaWYgKCFtYXJrZXRQdWJrZXkgfHwgYW1vdW50ID09PSB1bmRlZmluZWQgfHwgIXNpZGUpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBhbW91bnQsIGFuZCBzaWRlIGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1hcmtldERhdGEgPSBhd2FpdCBnZXRNYXJrZXRGb3JCZXR0aW5nKG1hcmtldFB1YmtleSk7XG4gICAgICAgIGlmICghbWFya2V0RGF0YSB8fCAhbWFya2V0RGF0YS5tYXJrZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShgTWFya2V0ICR7bWFya2V0UHVia2V5fSBub3QgZm91bmRgKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB7IG1hcmtldCB9ID0gbWFya2V0RGF0YTtcbiAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IHZhbGlkYXRlQmV0KHtcbiAgICAgICAgICBhbW91bnRTb2w6IGFtb3VudCxcbiAgICAgICAgICBtYXJrZXRTdGF0dXM6IG1hcmtldC5zdGF0dXNDb2RlLFxuICAgICAgICAgIGNsb3NpbmdUaW1lOiBuZXcgRGF0ZShtYXJrZXQuY2xvc2luZ1RpbWUpLFxuICAgICAgICAgIGlzUGF1c2VkOiBmYWxzZSxcbiAgICAgICAgICBhY2Nlc3NHYXRlOiBtYXJrZXQuYWNjZXNzR2F0ZSA9PT0gJ1doaXRlbGlzdCcgPyAxIDogMCxcbiAgICAgICAgICBsYXllcjogbWFya2V0LmxheWVyQ29kZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IHF1b3RlID0gY2FsY3VsYXRlQmV0UXVvdGUoe1xuICAgICAgICAgIGJldEFtb3VudFNvbDogYW1vdW50LFxuICAgICAgICAgIHNpZGUsXG4gICAgICAgICAgY3VycmVudFllc1Bvb2w6IG1hcmtldC55ZXNQb29sU29sLFxuICAgICAgICAgIGN1cnJlbnROb1Bvb2w6IG1hcmtldC5ub1Bvb2xTb2wsXG4gICAgICAgICAgcGxhdGZvcm1GZWVCcHM6IG1hcmtldC5wbGF0Zm9ybUZlZUJwcyxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyB2YWxpZGF0aW9uLCBtYXJrZXQ6IHsgcHVibGljS2V5OiBtYXJrZXRQdWJrZXksIHF1ZXN0aW9uOiBtYXJrZXQucXVlc3Rpb24sIHN0YXR1czogbWFya2V0LnN0YXR1cyB9LCBxdW90ZTogdmFsaWRhdGlvbi52YWxpZCA/IHF1b3RlIDogbnVsbCB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBUUkFOU0FDVElPTiBCVUlMRElORyAtIEJFVFNcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnYnVpbGRfYmV0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXRQdWJrZXkgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG91dGNvbWUgPSBhcmdzLm91dGNvbWUgYXMgJ3llcycgfCAnbm8nO1xuICAgICAgICBjb25zdCBhbW91bnRTb2wgPSBhcmdzLmFtb3VudF9zb2wgYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCB1c2VyV2FsbGV0ID0gYXJncy51c2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0UHVia2V5IHx8ICFvdXRjb21lIHx8IGFtb3VudFNvbCA9PT0gdW5kZWZpbmVkIHx8ICF1c2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgb3V0Y29tZSwgYW1vdW50X3NvbCwgYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhbW91bnRTb2wgPCBCRVRfTElNSVRTLk1JTl9CRVRfU09MIHx8IGFtb3VudFNvbCA+IEJFVF9MSU1JVFMuTUFYX0JFVF9TT0wpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShgQW1vdW50IG11c3QgYmUgYmV0d2VlbiAke0JFVF9MSU1JVFMuTUlOX0JFVF9TT0x9IGFuZCAke0JFVF9MSU1JVFMuTUFYX0JFVF9TT0x9IFNPTGApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZldGNoQW5kQnVpbGRCZXRUcmFuc2FjdGlvbih7IG1hcmtldFBkYTogbWFya2V0UHVia2V5LCB1c2VyV2FsbGV0LCBvdXRjb21lLCBhbW91bnRTb2wgfSk7XG4gICAgICAgIGlmIChyZXN1bHQuZXJyb3IgfHwgIXJlc3VsdC50cmFuc2FjdGlvbikge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKHJlc3VsdC5lcnJvciB8fCAnRmFpbGVkIHRvIGJ1aWxkIHRyYW5zYWN0aW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29ubmVjdGlvbiA9IG5ldyBDb25uZWN0aW9uKFJQQ19FTkRQT0lOVCwgJ2NvbmZpcm1lZCcpO1xuICAgICAgICBjb25zdCBzaW11bGF0aW9uID0gYXdhaXQgc2ltdWxhdGVCZXRUcmFuc2FjdGlvbihyZXN1bHQudHJhbnNhY3Rpb24udHJhbnNhY3Rpb24sIG5ldyBQdWJsaWNLZXkodXNlcldhbGxldCksIGNvbm5lY3Rpb24pO1xuICAgICAgICBjb25zdCBxdW90ZSA9IGF3YWl0IGdldFF1b3RlKG1hcmtldFB1YmtleSwgb3V0Y29tZSA9PT0gJ3llcycgPyAnWWVzJyA6ICdObycsIGFtb3VudFNvbCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC50cmFuc2FjdGlvbi5zZXJpYWxpemVkVHgsIHBvc2l0aW9uUGRhOiByZXN1bHQudHJhbnNhY3Rpb24ucG9zaXRpb25QZGEudG9CYXNlNTgoKSB9LFxuICAgICAgICAgIHNpbXVsYXRpb246IHsgc3VjY2Vzczogc2ltdWxhdGlvbi5zdWNjZXNzLCB1bml0c0NvbnN1bWVkOiBzaW11bGF0aW9uLnVuaXRzQ29uc3VtZWQsIGVycm9yOiBzaW11bGF0aW9uLmVycm9yIH0sXG4gICAgICAgICAgcXVvdGU6IHF1b3RlLnZhbGlkID8geyBleHBlY3RlZFBheW91dFNvbDogcXVvdGUuZXhwZWN0ZWRQYXlvdXRTb2wsIHBvdGVudGlhbFByb2ZpdFNvbDogcXVvdGUucG90ZW50aWFsUHJvZml0U29sIH0gOiBudWxsLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdGhlIHRyYW5zYWN0aW9uIHdpdGggeW91ciB3YWxsZXQgYW5kIHNlbmQgdG8gU29sYW5hIG5ldHdvcmsnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfcmFjZV9iZXRfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldFB1YmtleSA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgb3V0Y29tZUluZGV4ID0gYXJncy5vdXRjb21lX2luZGV4IGFzIG51bWJlcjtcbiAgICAgICAgY29uc3QgYW1vdW50U29sID0gYXJncy5hbW91bnRfc29sIGFzIG51bWJlcjtcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldFB1YmtleSB8fCBvdXRjb21lSW5kZXggPT09IHVuZGVmaW5lZCB8fCBhbW91bnRTb2wgPT09IHVuZGVmaW5lZCB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIG91dGNvbWVfaW5kZXgsIGFtb3VudF9zb2wsIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmZXRjaEFuZEJ1aWxkUmFjZUJldFRyYW5zYWN0aW9uKHsgcmFjZU1hcmtldFBkYTogbWFya2V0UHVia2V5LCBvdXRjb21lSW5kZXgsIGFtb3VudFNvbCwgdXNlcldhbGxldCB9KTtcbiAgICAgICAgaWYgKHJlc3VsdC5lcnJvciB8fCAhcmVzdWx0LnRyYW5zYWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UocmVzdWx0LmVycm9yIHx8ICdGYWlsZWQgdG8gYnVpbGQgdHJhbnNhY3Rpb24nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQudHJhbnNhY3Rpb24uc2VyaWFsaXplZFR4LCBwb3NpdGlvblBkYTogcmVzdWx0LnRyYW5zYWN0aW9uLnBvc2l0aW9uUGRhIH0sXG4gICAgICAgICAgbWFya2V0SWQ6IHJlc3VsdC5tYXJrZXRJZC50b1N0cmluZygpLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdGhlIHRyYW5zYWN0aW9uIHdpdGggeW91ciB3YWxsZXQgYW5kIHNlbmQgdG8gU29sYW5hIG5ldHdvcmsnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBUUkFOU0FDVElPTiBCVUlMRElORyAtIENMQUlNU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdidWlsZF9jbGFpbV93aW5uaW5nc190cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IGFyZ3MucG9zaXRpb24gYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyV2FsbGV0ID0gYXJncy51c2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICFwb3NpdGlvbiB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIHBvc2l0aW9uLCBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDbGFpbVdpbm5pbmdzVHJhbnNhY3Rpb24oeyBtYXJrZXRQZGE6IG1hcmtldCwgcG9zaXRpb25QZGE6IHBvc2l0aW9uLCB1c2VyV2FsbGV0IH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCwgY2xhaW1UeXBlOiByZXN1bHQuY2xhaW1UeXBlIH0sIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY2xhaW0geW91ciB3aW5uaW5ncycgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NsYWltX3JlZnVuZF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IGFyZ3MucG9zaXRpb24gYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyV2FsbGV0ID0gYXJncy51c2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICFwb3NpdGlvbiB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIHBvc2l0aW9uLCBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDbGFpbVJlZnVuZFRyYW5zYWN0aW9uKHsgbWFya2V0UGRhOiBtYXJrZXQsIHBvc2l0aW9uUGRhOiBwb3NpdGlvbiwgdXNlcldhbGxldCB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHgsIGNsYWltVHlwZTogcmVzdWx0LmNsYWltVHlwZSB9LCBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNsYWltIHlvdXIgcmVmdW5kJyB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfYmF0Y2hfY2xhaW1fdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IGNsYWltcyA9IGFyZ3MuY2xhaW1zIGFzIEFycmF5PHsgbWFya2V0OiBzdHJpbmc7IHBvc2l0aW9uOiBzdHJpbmc7IHR5cGU6ICd3aW5uaW5ncycgfCAncmVmdW5kJyB9PjtcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIWNsYWltcyB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdjbGFpbXMgYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQmF0Y2hDbGFpbVRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBjbGFpbXM6IGNsYWltcy5tYXAoYyA9PiAoeyBtYXJrZXRQZGE6IGMubWFya2V0LCBwb3NpdGlvblBkYTogYy5wb3NpdGlvbiwgY2xhaW1UeXBlOiBjLnR5cGUgfSkpLFxuICAgICAgICAgIHVzZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCwgY2xhaW1Db3VudDogcmVzdWx0LmNsYWltQ291bnQgfSwgaW5zdHJ1Y3Rpb25zOiBgU2lnbiB0byBjbGFpbSAke3Jlc3VsdC5jbGFpbUNvdW50fSBwb3NpdGlvbnNgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jbGFpbV9hZmZpbGlhdGVfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBhcmdzLmNvZGUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyV2FsbGV0ID0gYXJncy51c2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghY29kZSB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdjb2RlIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENsYWltQWZmaWxpYXRlVHJhbnNhY3Rpb24oeyBhZmZpbGlhdGVDb2RlOiBjb2RlLCB1c2VyV2FsbGV0IH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCwgY2xhaW1UeXBlOiByZXN1bHQuY2xhaW1UeXBlIH0sIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY2xhaW0gYWZmaWxpYXRlIGVhcm5pbmdzJyB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBUUkFOU0FDVElPTiBCVUlMRElORyAtIFJBQ0UgQ0xBSU1TXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2J1aWxkX2NsYWltX3JhY2Vfd2lubmluZ3NfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBhcmdzLnBvc2l0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgIXBvc2l0aW9uIHx8ICF1c2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0LCBwb3NpdGlvbiwgYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2xhaW1SYWNlV2lubmluZ3NUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICBwb3NpdGlvblBkYTogcG9zaXRpb24sXG4gICAgICAgICAgdXNlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNsYWltIHJhY2UgbWFya2V0IHdpbm5pbmdzJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NsYWltX3JhY2VfcmVmdW5kX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gYXJncy5wb3NpdGlvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICFwb3NpdGlvbiB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgcG9zaXRpb24sIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENsYWltUmFjZVJlZnVuZFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIHBvc2l0aW9uUGRhOiBwb3NpdGlvbixcbiAgICAgICAgICB1c2VyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY2xhaW0gcmFjZSBtYXJrZXQgcmVmdW5kJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBBRkZJTElBVEVcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnYnVpbGRfcmVnaXN0ZXJfYWZmaWxpYXRlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBjb2RlID0gYXJncy5jb2RlIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIWNvZGUgfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnY29kZSBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYXZhaWxhYmxlID0gYXdhaXQgaXNBZmZpbGlhdGVDb2RlQXZhaWxhYmxlKGNvZGUpO1xuICAgICAgICBpZiAoIWF2YWlsYWJsZSkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKGBBZmZpbGlhdGUgY29kZSBcIiR7Y29kZX1cIiBpcyBhbHJlYWR5IHRha2VuYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRSZWdpc3RlckFmZmlsaWF0ZVRyYW5zYWN0aW9uKHsgY29kZSwgdXNlcldhbGxldCB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCwgYWZmaWxpYXRlUGRhOiByZXN1bHQuYWZmaWxpYXRlUGRhIH0sXG4gICAgICAgICAgY29kZTogcmVzdWx0LmNvZGUsXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byByZWdpc3RlciBhcyBhZmZpbGlhdGUnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfdG9nZ2xlX2FmZmlsaWF0ZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgY29kZSA9IGFyZ3MuY29kZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGFjdGl2ZSA9IGFyZ3MuYWN0aXZlIGFzIGJvb2xlYW47XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFjb2RlIHx8IGFjdGl2ZSA9PT0gdW5kZWZpbmVkIHx8ICF1c2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2NvZGUsIGFjdGl2ZSwgYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkVG9nZ2xlQWZmaWxpYXRlVHJhbnNhY3Rpb24oeyBjb2RlLCBhY3RpdmUsIHVzZXJXYWxsZXQgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHgsIGFmZmlsaWF0ZVBkYTogcmVzdWx0LmFmZmlsaWF0ZVBkYSB9LFxuICAgICAgICAgIG5ld1N0YXR1czogcmVzdWx0Lm5ld1N0YXR1cyxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6IGBTaWduIHRvICR7YWN0aXZlID8gJ2FjdGl2YXRlJyA6ICdkZWFjdGl2YXRlJ30gYWZmaWxpYXRlYCxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gU0lNVUxBVElPTlxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdzaW11bGF0ZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgdHhCYXNlNjQgPSBhcmdzLnRyYW5zYWN0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXR4QmFzZTY0IHx8ICF1c2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3RyYW5zYWN0aW9uIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb25uZWN0aW9uID0gbmV3IENvbm5lY3Rpb24oUlBDX0VORFBPSU5ULCAnY29uZmlybWVkJyk7XG4gICAgICAgIGNvbnN0IHR4QnVmZmVyID0gQnVmZmVyLmZyb20odHhCYXNlNjQsICdiYXNlNjQnKTtcbiAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSBUcmFuc2FjdGlvbi5mcm9tKHR4QnVmZmVyKTtcbiAgICAgICAgY29uc3Qgc2ltdWxhdGlvbiA9IGF3YWl0IGNvbm5lY3Rpb24uc2ltdWxhdGVUcmFuc2FjdGlvbih0cmFuc2FjdGlvbik7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHNpbXVsYXRpb246IHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6ICFzaW11bGF0aW9uLnZhbHVlLmVycixcbiAgICAgICAgICAgIGVycm9yOiBzaW11bGF0aW9uLnZhbHVlLmVyciA/IEpTT04uc3RyaW5naWZ5KHNpbXVsYXRpb24udmFsdWUuZXJyKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHVuaXRzQ29uc3VtZWQ6IHNpbXVsYXRpb24udmFsdWUudW5pdHNDb25zdW1lZCxcbiAgICAgICAgICAgIGxvZ3M6IHNpbXVsYXRpb24udmFsdWUubG9ncyxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBNQVJLRVQgQ1JFQVRJT05cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAncHJldmlld19jcmVhdGVfbWFya2V0Jzoge1xuICAgICAgICBjb25zdCBxdWVzdGlvbiA9IGFyZ3MucXVlc3Rpb24gYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBsYXllciA9IGFyZ3MubGF5ZXIgYXMgJ2xhYicgfCAncHJpdmF0ZSc7XG4gICAgICAgIGNvbnN0IGNsb3NpbmdUaW1lID0gYXJncy5jbG9zaW5nX3RpbWUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCByZXNvbHV0aW9uVGltZSA9IGFyZ3MucmVzb2x1dGlvbl90aW1lIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgbWFya2V0VHlwZSA9IGFyZ3MubWFya2V0X3R5cGUgYXMgJ2V2ZW50JyB8ICdtZWFzdXJlbWVudCcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGV2ZW50VGltZSA9IGFyZ3MuZXZlbnRfdGltZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1lYXN1cmVtZW50U3RhcnQgPSBhcmdzLm1lYXN1cmVtZW50X3N0YXJ0IGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgbWVhc3VyZW1lbnRFbmQgPSBhcmdzLm1lYXN1cmVtZW50X2VuZCBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcblxuICAgICAgICBpZiAoIXF1ZXN0aW9uIHx8ICFsYXllciB8fCAhY2xvc2luZ1RpbWUgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncXVlc3Rpb24sIGxheWVyLCBjbG9zaW5nX3RpbWUsIGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByZXZpZXcgPSBhd2FpdCBwcmV2aWV3TWFya2V0Q3JlYXRpb24oe1xuICAgICAgICAgIHF1ZXN0aW9uLFxuICAgICAgICAgIGxheWVyLFxuICAgICAgICAgIGNsb3NpbmdUaW1lLFxuICAgICAgICAgIHJlc29sdXRpb25UaW1lLFxuICAgICAgICAgIG1hcmtldFR5cGUsXG4gICAgICAgICAgZXZlbnRUaW1lLFxuICAgICAgICAgIG1lYXN1cmVtZW50U3RhcnQsXG4gICAgICAgICAgbWVhc3VyZW1lbnRFbmQsXG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgcHJldmlldyxcbiAgICAgICAgICB0aW1pbmc6IHtcbiAgICAgICAgICAgIHJ1bGVzOiBUSU1JTkcsXG4gICAgICAgICAgICBydWxlQXBwbGllZDogcHJldmlldy52YWxpZGF0aW9uLmNvbXB1dGVkLnJ1bGVUeXBlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jcmVhdGVfbGFiX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcXVlc3Rpb24gPSBhcmdzLnF1ZXN0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY2xvc2luZ1RpbWUgPSBhcmdzLmNsb3NpbmdfdGltZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHJlc29sdXRpb25UaW1lID0gYXJncy5yZXNvbHV0aW9uX3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBtYXJrZXRUeXBlID0gYXJncy5tYXJrZXRfdHlwZSBhcyAnZXZlbnQnIHwgJ21lYXN1cmVtZW50JyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgZXZlbnRUaW1lID0gYXJncy5ldmVudF90aW1lIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgaW52aXRlSGFzaCA9IGFyZ3MuaW52aXRlX2hhc2ggYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG5cbiAgICAgICAgaWYgKCFxdWVzdGlvbiB8fCAhY2xvc2luZ1RpbWUgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncXVlc3Rpb24sIGNsb3NpbmdfdGltZSwgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlTGFiTWFya2V0KHtcbiAgICAgICAgICBxdWVzdGlvbixcbiAgICAgICAgICBsYXllcjogJ2xhYicsXG4gICAgICAgICAgY2xvc2luZ1RpbWUsXG4gICAgICAgICAgcmVzb2x1dGlvblRpbWUsXG4gICAgICAgICAgbWFya2V0VHlwZSxcbiAgICAgICAgICBldmVudFRpbWUsXG4gICAgICAgICAgaW52aXRlSGFzaCxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UocmVzdWx0LmVycm9yIHx8ICdWYWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHJlc3VsdC50cmFuc2FjdGlvbixcbiAgICAgICAgICB2YWxpZGF0aW9uOiByZXN1bHQudmFsaWRhdGlvbixcbiAgICAgICAgICBzaW11bGF0aW9uOiByZXN1bHQuc2ltdWxhdGlvbixcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRoZSB0cmFuc2FjdGlvbiB3aXRoIHlvdXIgd2FsbGV0IHRvIGNyZWF0ZSB0aGUgbWFya2V0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NyZWF0ZV9wcml2YXRlX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcXVlc3Rpb24gPSBhcmdzLnF1ZXN0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY2xvc2luZ1RpbWUgPSBhcmdzLmNsb3NpbmdfdGltZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHJlc29sdXRpb25UaW1lID0gYXJncy5yZXNvbHV0aW9uX3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBtYXJrZXRUeXBlID0gYXJncy5tYXJrZXRfdHlwZSBhcyAnZXZlbnQnIHwgJ21lYXN1cmVtZW50JyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgZXZlbnRUaW1lID0gYXJncy5ldmVudF90aW1lIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgaW52aXRlSGFzaCA9IGFyZ3MuaW52aXRlX2hhc2ggYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG5cbiAgICAgICAgaWYgKCFxdWVzdGlvbiB8fCAhY2xvc2luZ1RpbWUgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncXVlc3Rpb24sIGNsb3NpbmdfdGltZSwgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlUHJpdmF0ZU1hcmtldCh7XG4gICAgICAgICAgcXVlc3Rpb24sXG4gICAgICAgICAgbGF5ZXI6ICdwcml2YXRlJyxcbiAgICAgICAgICBjbG9zaW5nVGltZSxcbiAgICAgICAgICByZXNvbHV0aW9uVGltZSxcbiAgICAgICAgICBtYXJrZXRUeXBlLFxuICAgICAgICAgIGV2ZW50VGltZSxcbiAgICAgICAgICBpbnZpdGVIYXNoLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShyZXN1bHQuZXJyb3IgfHwgJ1ZhbGlkYXRpb24gZmFpbGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogcmVzdWx0LnRyYW5zYWN0aW9uLFxuICAgICAgICAgIHZhbGlkYXRpb246IHJlc3VsdC52YWxpZGF0aW9uLFxuICAgICAgICAgIHNpbXVsYXRpb246IHJlc3VsdC5zaW11bGF0aW9uLFxuICAgICAgICAgIGludml0ZUhhc2g6IGludml0ZUhhc2ggfHwgJ0dlbmVyYXRlIHdpdGggZ2VuZXJhdGVfaW52aXRlX2hhc2ggdG9vbCcsXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0aGUgdHJhbnNhY3Rpb24gd2l0aCB5b3VyIHdhbGxldCB0byBjcmVhdGUgdGhlIHByaXZhdGUgbWFya2V0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NyZWF0ZV9yYWNlX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcXVlc3Rpb24gPSBhcmdzLnF1ZXN0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgb3V0Y29tZXMgPSBhcmdzLm91dGNvbWVzIGFzIHN0cmluZ1tdO1xuICAgICAgICBjb25zdCBjbG9zaW5nVGltZSA9IGFyZ3MuY2xvc2luZ190aW1lIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgcmVzb2x1dGlvblRpbWUgPSBhcmdzLnJlc29sdXRpb25fdGltZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcblxuICAgICAgICBpZiAoIXF1ZXN0aW9uIHx8ICFvdXRjb21lcyB8fCAhY2xvc2luZ1RpbWUgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncXVlc3Rpb24sIG91dGNvbWVzLCBjbG9zaW5nX3RpbWUsIGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvdXRjb21lcy5sZW5ndGggPCAyIHx8IG91dGNvbWVzLmxlbmd0aCA+IDEwKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ291dGNvbWVzIG11c3QgaGF2ZSAyLTEwIGVudHJpZXMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZVJhY2VNYXJrZXQoe1xuICAgICAgICAgIHF1ZXN0aW9uLFxuICAgICAgICAgIG91dGNvbWVzLFxuICAgICAgICAgIGNsb3NpbmdUaW1lLFxuICAgICAgICAgIHJlc29sdXRpb25UaW1lLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShyZXN1bHQuZXJyb3IgfHwgJ1ZhbGlkYXRpb24gZmFpbGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogcmVzdWx0LnRyYW5zYWN0aW9uLFxuICAgICAgICAgIHZhbGlkYXRpb246IHJlc3VsdC52YWxpZGF0aW9uLFxuICAgICAgICAgIHNpbXVsYXRpb246IHJlc3VsdC5zaW11bGF0aW9uLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdGhlIHRyYW5zYWN0aW9uIHdpdGggeW91ciB3YWxsZXQgdG8gY3JlYXRlIHRoZSByYWNlIG1hcmtldCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfY3JlYXRpb25fZmVlcyc6IHtcbiAgICAgICAgY29uc3QgZmVlcyA9IGdldEFsbENyZWF0aW9uRmVlcygpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBmZWVzLFxuICAgICAgICAgIG5vdGU6ICdDcmVhdGlvbiBmZWUgaXMgcGFpZCB3aGVuIGNyZWF0aW5nIGEgbWFya2V0LiBTZXBhcmF0ZSBmcm9tIHBsYXRmb3JtIGZlZXMgb24gYmV0cy4nLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X3BsYXRmb3JtX2ZlZXMnOiB7XG4gICAgICAgIGNvbnN0IGZlZXMgPSBnZXRBbGxQbGF0Zm9ybUZlZXMoKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgZmVlcyxcbiAgICAgICAgICBub3RlOiAnUGxhdGZvcm0gZmVlIGlzIGRlZHVjdGVkIGZyb20gZ3Jvc3Mgd2lubmluZ3Mgd2hlbiBjbGFpbWluZy4gSW5jbHVkZXMgYWZmaWxpYXRlIGFuZCBjcmVhdG9yIHNoYXJlcy4nLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X3RpbWluZ19ydWxlcyc6IHtcbiAgICAgICAgY29uc3QgcnVsZXMgPSBnZXRUaW1pbmdDb25zdHJhaW50cygpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBydWxlcyxcbiAgICAgICAgICBydWxlQToge1xuICAgICAgICAgICAgbmFtZTogJ0V2ZW50LUJhc2VkIE1hcmtldHMnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYXJrZXRzIGFib3V0IHNwZWNpZmljIGV2ZW50cyAoc3BvcnRzLCBlbGVjdGlvbnMsIGV0Yy4pJyxcbiAgICAgICAgICAgIHJlcXVpcmVtZW50OiBgQmV0dGluZyBtdXN0IGNsb3NlICR7cnVsZXMubWluRXZlbnRCdWZmZXJIb3Vyc30rIGhvdXJzIGJlZm9yZSBldmVudGAsXG4gICAgICAgICAgICByZWNvbW1lbmRlZDogYCR7cnVsZXMucmVjb21tZW5kZWRFdmVudEJ1ZmZlckhvdXJzfSBob3VycyBidWZmZXIgZm9yIHNhZmV0eWAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBydWxlQjoge1xuICAgICAgICAgICAgbmFtZTogJ01lYXN1cmVtZW50LVBlcmlvZCBNYXJrZXRzJyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWFya2V0cyBhYm91dCBtZWFzdXJlZCB2YWx1ZXMgb3ZlciB0aW1lIChwcmljZXMsIHRlbXBlcmF0dXJlcywgZXRjLiknLFxuICAgICAgICAgICAgcmVxdWlyZW1lbnQ6ICdCZXR0aW5nIG11c3QgY2xvc2UgQkVGT1JFIG1lYXN1cmVtZW50IHBlcmlvZCBzdGFydHMnLFxuICAgICAgICAgICAgcmVhc29uOiAnUHJldmVudHMgaW5mb3JtYXRpb24gYWR2YW50YWdlIGR1cmluZyBtZWFzdXJlbWVudCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9wYXJpbXV0dWVsX3J1bGVzJzoge1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB2ZXJzaW9uOiBQQVJJTVVUVUVMX1JVTEVTLnZlcnNpb24sXG4gICAgICAgICAgZG9jdW1lbnRhdGlvbjogUEFSSU1VVFVFTF9SVUxFU19ET0NVTUVOVEFUSU9OLFxuICAgICAgICAgIGJsb2NrZWRUZXJtczoge1xuICAgICAgICAgICAgc3ViamVjdGl2ZTogUEFSSU1VVFVFTF9SVUxFUy5TVUJKRUNUSVZFX09VVENPTUUuYmxvY2tlZFBhdHRlcm5zLFxuICAgICAgICAgICAgbWFuaXB1bGF0aW9uOiBQQVJJTVVUVUVMX1JVTEVTLk1BTklQVUxBVElPTl9SSVNLLmJsb2NrZWRQYXR0ZXJucyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFwcHJvdmVkU291cmNlczogUEFSSU1VVFVFTF9SVUxFUy5BUFBST1ZFRF9TT1VSQ0VTLFxuICAgICAgICAgIGNyaXRpY2FsTm90ZTogJ01hcmtldHMgY29udGFpbmluZyBBTlkgYmxvY2tlZCB0ZXJtcyB3aWxsIGJlIFJFSkVDVEVELiBBbHdheXMgaW5jbHVkZSBhbiBhcHByb3ZlZCBkYXRhIHNvdXJjZS4nLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAndmFsaWRhdGVfbWFya2V0X3F1ZXN0aW9uJzoge1xuICAgICAgICBjb25zdCBxdWVzdGlvbiA9IGFyZ3MucXVlc3Rpb24gYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBsYXllciA9IChhcmdzLmxheWVyIGFzICdsYWInIHwgJ3ByaXZhdGUnKSB8fCAnbGFiJztcblxuICAgICAgICBpZiAoIXF1ZXN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3F1ZXN0aW9uIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgYSBkdW1teSBjbG9zaW5nIHRpbWUgZm9yIHZhbGlkYXRpb24gKG9ubHkgcXVlc3Rpb24gY29udGVudCBtYXR0ZXJzIGZvciB2Ni4zIHJ1bGVzKVxuICAgICAgICBjb25zdCBkdW1teUNsb3NpbmdUaW1lID0gbmV3IERhdGUoRGF0ZS5ub3coKSArIDI0ICogNjAgKiA2MCAqIDEwMDApO1xuXG4gICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSB2YWxpZGF0ZVBhcmltdXR1ZWxSdWxlcyh7XG4gICAgICAgICAgcXVlc3Rpb24sXG4gICAgICAgICAgY2xvc2luZ1RpbWU6IGR1bW15Q2xvc2luZ1RpbWUsXG4gICAgICAgICAgbGF5ZXIsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHF1ZXN0aW9uLFxuICAgICAgICAgIHdvdWxkQmVCbG9ja2VkOiB2YWxpZGF0aW9uLmJsb2NrZWQsXG4gICAgICAgICAgdmFsaWQ6ICF2YWxpZGF0aW9uLmJsb2NrZWQsXG4gICAgICAgICAgZXJyb3JzOiB2YWxpZGF0aW9uLmVycm9ycyxcbiAgICAgICAgICB3YXJuaW5nczogdmFsaWRhdGlvbi53YXJuaW5ncyxcbiAgICAgICAgICBydWxlVmlvbGF0aW9uczogdmFsaWRhdGlvbi5ydWxlVmlvbGF0aW9ucyxcbiAgICAgICAgICBzdWdnZXN0aW9uOiB2YWxpZGF0aW9uLmJsb2NrZWRcbiAgICAgICAgICAgID8gJ1F1ZXN0aW9uIGNvbnRhaW5zIGJsb2NrZWQgdGVybXMuIFJlcGhyYXNlIHVzaW5nIG9iamVjdGl2ZSwgdmVyaWZpYWJsZSBjcml0ZXJpYSB3aXRoIGFuIGFwcHJvdmVkIGRhdGEgc291cmNlLidcbiAgICAgICAgICAgIDogJ1F1ZXN0aW9uIHBhc3NlcyB2Ni4zIHZhbGlkYXRpb24uIFJlbWVtYmVyIHRvIGFsc28gc3BlY2lmeSBwcm9wZXIgdGltaW5nIHBhcmFtZXRlcnMuJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dlbmVyYXRlX2ludml0ZV9oYXNoJzoge1xuICAgICAgICBjb25zdCBoYXNoID0gZ2VuZXJhdGVJbnZpdGVIYXNoKCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIGludml0ZUhhc2g6IGhhc2gsXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnVXNlIHRoaXMgaGFzaCB3aGVuIGNyZWF0aW5nIGEgcHJpdmF0ZSBtYXJrZXQuIFNoYXJlIHdpdGggaW52aXRlZCBwYXJ0aWNpcGFudHMuJyxcbiAgICAgICAgICBub3RlOiAnQW55b25lIHdpdGggdGhpcyBoYXNoIGNhbiBiZXQgb24gdGhlIHByaXZhdGUgbWFya2V0LicsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFJFU09MVVRJT04gU1lTVEVNXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2J1aWxkX3Byb3Bvc2VfcmVzb2x1dGlvbl90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBvdXRjb21lID0gYXJncy5vdXRjb21lIGFzIGJvb2xlYW47XG4gICAgICAgIGNvbnN0IHByb3Bvc2VyV2FsbGV0ID0gYXJncy5wcm9wb3Nlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCBvdXRjb21lID09PSB1bmRlZmluZWQgfHwgIXByb3Bvc2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgb3V0Y29tZSwgYW5kIHByb3Bvc2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFByb3Bvc2VSZXNvbHV0aW9uVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIG91dGNvbWUsXG4gICAgICAgICAgcHJvcG9zZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBgU2lnbiB0byBwcm9wb3NlICR7b3V0Y29tZSA/ICdZRVMnIDogJ05PJ30gYXMgdGhlIG91dGNvbWVgLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfcmVzb2x2ZV9tYXJrZXRfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgb3V0Y29tZSA9IGFyZ3Mub3V0Y29tZSBhcyBib29sZWFuO1xuICAgICAgICBjb25zdCByZXNvbHZlcldhbGxldCA9IGFyZ3MucmVzb2x2ZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgb3V0Y29tZSA9PT0gdW5kZWZpbmVkIHx8ICFyZXNvbHZlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIG91dGNvbWUsIGFuZCByZXNvbHZlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRSZXNvbHZlTWFya2V0VHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIG91dGNvbWUsXG4gICAgICAgICAgcmVzb2x2ZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBgU2lnbiB0byByZXNvbHZlIG1hcmtldCBhcyAke291dGNvbWUgPyAnWUVTJyA6ICdOTyd9YCxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2ZpbmFsaXplX3Jlc29sdXRpb25fdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY2FsbGVyV2FsbGV0ID0gYXJncy5jYWxsZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgIWNhbGxlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQgYW5kIGNhbGxlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRGaW5hbGl6ZVJlc29sdXRpb25UcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgY2FsbGVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gZmluYWxpemUgdGhlIHJlc29sdXRpb24nLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfcHJvcG9zZV9yYWNlX3Jlc29sdXRpb25fdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgd2lubmluZ091dGNvbWVJbmRleCA9IGFyZ3Mud2lubmluZ19vdXRjb21lX2luZGV4IGFzIG51bWJlcjtcbiAgICAgICAgY29uc3QgcHJvcG9zZXJXYWxsZXQgPSBhcmdzLnByb3Bvc2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCB3aW5uaW5nT3V0Y29tZUluZGV4ID09PSB1bmRlZmluZWQgfHwgIXByb3Bvc2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0LCB3aW5uaW5nX291dGNvbWVfaW5kZXgsIGFuZCBwcm9wb3Nlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRQcm9wb3NlUmFjZVJlc29sdXRpb25UcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICB3aW5uaW5nT3V0Y29tZUluZGV4LFxuICAgICAgICAgIHByb3Bvc2VyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogYFNpZ24gdG8gcHJvcG9zZSBvdXRjb21lICMke3dpbm5pbmdPdXRjb21lSW5kZXh9IGFzIHdpbm5lcmAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9yZXNvbHZlX3JhY2VfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgd2lubmluZ091dGNvbWVJbmRleCA9IGFyZ3Mud2lubmluZ19vdXRjb21lX2luZGV4IGFzIG51bWJlcjtcbiAgICAgICAgY29uc3QgcmVzb2x2ZXJXYWxsZXQgPSBhcmdzLnJlc29sdmVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCB3aW5uaW5nT3V0Y29tZUluZGV4ID09PSB1bmRlZmluZWQgfHwgIXJlc29sdmVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0LCB3aW5uaW5nX291dGNvbWVfaW5kZXgsIGFuZCByZXNvbHZlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRSZXNvbHZlUmFjZVRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIHdpbm5pbmdPdXRjb21lSW5kZXgsXG4gICAgICAgICAgcmVzb2x2ZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBgU2lnbiB0byByZXNvbHZlIHJhY2Ugd2l0aCBvdXRjb21lICMke3dpbm5pbmdPdXRjb21lSW5kZXh9YCxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2ZpbmFsaXplX3JhY2VfcmVzb2x1dGlvbl90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjYWxsZXJXYWxsZXQgPSBhcmdzLmNhbGxlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgIWNhbGxlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCBhbmQgY2FsbGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEZpbmFsaXplUmFjZVJlc29sdXRpb25UcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICBjYWxsZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBmaW5hbGl6ZSByYWNlIHJlc29sdXRpb24nLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBESVNQVVRFU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdidWlsZF9mbGFnX2Rpc3B1dGVfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgZGlzcHV0ZXJXYWxsZXQgPSBhcmdzLmRpc3B1dGVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICFkaXNwdXRlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQgYW5kIGRpc3B1dGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEZsYWdEaXNwdXRlVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIGRpc3B1dGVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gZGlzcHV0ZSB0aGUgcmVzb2x1dGlvbiAocmVxdWlyZXMgYm9uZCknLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfZmxhZ19yYWNlX2Rpc3B1dGVfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgZGlzcHV0ZXJXYWxsZXQgPSBhcmdzLmRpc3B1dGVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCAhZGlzcHV0ZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQgYW5kIGRpc3B1dGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEZsYWdSYWNlRGlzcHV0ZVRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIGRpc3B1dGVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gZGlzcHV0ZSB0aGUgcmFjZSByZXNvbHV0aW9uJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3ZvdGVfY291bmNpbF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB2b3RlWWVzID0gYXJncy52b3RlX3llcyBhcyBib29sZWFuO1xuICAgICAgICBjb25zdCB2b3RlcldhbGxldCA9IGFyZ3Mudm90ZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgdm90ZVllcyA9PT0gdW5kZWZpbmVkIHx8ICF2b3RlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIHZvdGVfeWVzLCBhbmQgdm90ZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkVm90ZUNvdW5jaWxUcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgdm90ZVllcyxcbiAgICAgICAgICB2b3RlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6IGBTaWduIHRvIHZvdGUgJHt2b3RlWWVzID8gJ1lFUycgOiAnTk8nfSBvbiB0aGUgZGlzcHV0ZWAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF92b3RlX2NvdW5jaWxfcmFjZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB2b3RlT3V0Y29tZUluZGV4ID0gYXJncy52b3RlX291dGNvbWVfaW5kZXggYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCB2b3RlcldhbGxldCA9IGFyZ3Mudm90ZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8IHZvdGVPdXRjb21lSW5kZXggPT09IHVuZGVmaW5lZCB8fCAhdm90ZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIHZvdGVfb3V0Y29tZV9pbmRleCwgYW5kIHZvdGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFZvdGVDb3VuY2lsUmFjZVRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIHZvdGVPdXRjb21lSW5kZXgsXG4gICAgICAgICAgdm90ZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBgU2lnbiB0byB2b3RlIGZvciBvdXRjb21lICMke3ZvdGVPdXRjb21lSW5kZXh9YCxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NoYW5nZV9jb3VuY2lsX3ZvdGVfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbmV3Vm90ZVllcyA9IGFyZ3MubmV3X3ZvdGVfeWVzIGFzIGJvb2xlYW47XG4gICAgICAgIGNvbnN0IHZvdGVyV2FsbGV0ID0gYXJncy52b3Rlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCBuZXdWb3RlWWVzID09PSB1bmRlZmluZWQgfHwgIXZvdGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgbmV3X3ZvdGVfeWVzLCBhbmQgdm90ZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2hhbmdlQ291bmNpbFZvdGVUcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgbmV3Vm90ZVllcyxcbiAgICAgICAgICB2b3RlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6IGBTaWduIHRvIGNoYW5nZSB5b3VyIHZvdGUgdG8gJHtuZXdWb3RlWWVzID8gJ1lFUycgOiAnTk8nfWAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jaGFuZ2VfY291bmNpbF92b3RlX3JhY2VfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbmV3Vm90ZU91dGNvbWVJbmRleCA9IGFyZ3MubmV3X3ZvdGVfb3V0Y29tZV9pbmRleCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IHZvdGVyV2FsbGV0ID0gYXJncy52b3Rlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgbmV3Vm90ZU91dGNvbWVJbmRleCA9PT0gdW5kZWZpbmVkIHx8ICF2b3RlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgbmV3X3ZvdGVfb3V0Y29tZV9pbmRleCwgYW5kIHZvdGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENoYW5nZUNvdW5jaWxWb3RlUmFjZVRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIG5ld1ZvdGVPdXRjb21lSW5kZXgsXG4gICAgICAgICAgdm90ZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBgU2lnbiB0byBjaGFuZ2UgeW91ciB2b3RlIHRvIG91dGNvbWUgIyR7bmV3Vm90ZU91dGNvbWVJbmRleH1gLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBXSElURUxJU1QgTUFOQUdFTUVOVFxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdidWlsZF9hZGRfdG9fd2hpdGVsaXN0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJUb0FkZCA9IGFyZ3MudXNlcl90b19hZGQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICF1c2VyVG9BZGQgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCB1c2VyX3RvX2FkZCwgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQWRkVG9XaGl0ZWxpc3RUcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgdXNlclRvQWRkLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgd2hpdGVsaXN0UGRhOiByZXN1bHQud2hpdGVsaXN0UGRhLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gYWRkIHVzZXIgdG8gd2hpdGVsaXN0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3JlbW92ZV9mcm9tX3doaXRlbGlzdF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyVG9SZW1vdmUgPSBhcmdzLnVzZXJfdG9fcmVtb3ZlIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhdXNlclRvUmVtb3ZlIHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgdXNlcl90b19yZW1vdmUsIGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFJlbW92ZUZyb21XaGl0ZWxpc3RUcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgdXNlclRvUmVtb3ZlLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byByZW1vdmUgdXNlciBmcm9tIHdoaXRlbGlzdCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jcmVhdGVfcmFjZV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ3JlYXRlUmFjZVdoaXRlbGlzdFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgd2hpdGVsaXN0UGRhOiByZXN1bHQud2hpdGVsaXN0UGRhLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY3JlYXRlIHJhY2Ugd2hpdGVsaXN0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2FkZF90b19yYWNlX3doaXRlbGlzdF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyVG9BZGQgPSBhcmdzLnVzZXJfdG9fYWRkIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgIXVzZXJUb0FkZCB8fCAhY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgdXNlcl90b19hZGQsIGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEFkZFRvUmFjZVdoaXRlbGlzdFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIHVzZXJUb0FkZCxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gYWRkIHVzZXIgdG8gcmFjZSB3aGl0ZWxpc3QnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfcmVtb3ZlX2Zyb21fcmFjZV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlclRvUmVtb3ZlID0gYXJncy51c2VyX3RvX3JlbW92ZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICF1c2VyVG9SZW1vdmUgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIHVzZXJfdG9fcmVtb3ZlLCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRSZW1vdmVGcm9tUmFjZVdoaXRlbGlzdFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIHVzZXJUb1JlbW92ZSxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gcmVtb3ZlIHVzZXIgZnJvbSByYWNlIHdoaXRlbGlzdCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIENSRUFUT1IgUFJPRklMRVNcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnYnVpbGRfY3JlYXRlX2NyZWF0b3JfcHJvZmlsZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgZGlzcGxheU5hbWUgPSBhcmdzLmRpc3BsYXlfbmFtZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JGZWVCcHMgPSBhcmdzLmNyZWF0b3JfZmVlX2JwcyBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFkaXNwbGF5TmFtZSB8fCBjcmVhdG9yRmVlQnBzID09PSB1bmRlZmluZWQgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnZGlzcGxheV9uYW1lLCBjcmVhdG9yX2ZlZV9icHMsIGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENyZWF0ZUNyZWF0b3JQcm9maWxlVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIGRpc3BsYXlOYW1lLFxuICAgICAgICAgIGNyZWF0b3JGZWVCcHMsXG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBjcmVhdG9yUHJvZmlsZVBkYTogcmVzdWx0LmNyZWF0b3JQcm9maWxlUGRhLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY3JlYXRlIHlvdXIgY3JlYXRvciBwcm9maWxlJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3VwZGF0ZV9jcmVhdG9yX3Byb2ZpbGVfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IGRpc3BsYXlOYW1lID0gYXJncy5kaXNwbGF5X25hbWUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBkZWZhdWx0RmVlQnBzID0gYXJncy5kZWZhdWx0X2ZlZV9icHMgYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghZGlzcGxheU5hbWUgfHwgZGVmYXVsdEZlZUJwcyA9PT0gdW5kZWZpbmVkIHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2Rpc3BsYXlfbmFtZSwgZGVmYXVsdF9mZWVfYnBzLCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIGFsbCByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkVXBkYXRlQ3JlYXRvclByb2ZpbGVUcmFuc2FjdGlvbih7XG4gICAgICAgICAgZGlzcGxheU5hbWUsXG4gICAgICAgICAgZGVmYXVsdEZlZUJwcyxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gdXBkYXRlIHlvdXIgY3JlYXRvciBwcm9maWxlJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NsYWltX2NyZWF0b3JfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2NyZWF0b3Jfd2FsbGV0IGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDbGFpbUNyZWF0b3JUcmFuc2FjdGlvbih7XG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNsYWltIHlvdXIgY3JlYXRvciBmZWVzIGZyb20gc29sX3RyZWFzdXJ5JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gTUFSS0VUIE1BTkFHRU1FTlRcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnYnVpbGRfY2xvc2VfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNhbGxlcldhbGxldCA9IGFyZ3MuY2FsbGVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICFjYWxsZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0IGFuZCBjYWxsZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2xvc2VNYXJrZXRUcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgY2FsbGVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY2xvc2UgYmV0dGluZyBvbiB0aGlzIG1hcmtldCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9leHRlbmRfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG5ld0Nsb3NpbmdUaW1lU3RyID0gYXJncy5uZXdfY2xvc2luZ190aW1lIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbmV3UmVzb2x1dGlvblRpbWVTdHIgPSBhcmdzLm5ld19yZXNvbHV0aW9uX3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjYWxsZXJXYWxsZXQgPSBhcmdzLmNhbGxlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhbmV3Q2xvc2luZ1RpbWVTdHIgfHwgIWNhbGxlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIG5ld19jbG9zaW5nX3RpbWUsIGFuZCBjYWxsZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5ld0Nsb3NpbmdUaW1lID0gTWF0aC5mbG9vcihuZXcgRGF0ZShuZXdDbG9zaW5nVGltZVN0cikuZ2V0VGltZSgpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IG5ld1Jlc29sdXRpb25UaW1lID0gbmV3UmVzb2x1dGlvblRpbWVTdHJcbiAgICAgICAgICA/IE1hdGguZmxvb3IobmV3IERhdGUobmV3UmVzb2x1dGlvblRpbWVTdHIpLmdldFRpbWUoKSAvIDEwMDApXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkRXh0ZW5kTWFya2V0VHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIG5ld0Nsb3NpbmdUaW1lLFxuICAgICAgICAgIG5ld1Jlc29sdXRpb25UaW1lLFxuICAgICAgICAgIGNhbGxlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGV4dGVuZCBtYXJrZXQgZGVhZGxpbmUnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY2xvc2VfcmFjZV9tYXJrZXRfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY2FsbGVyV2FsbGV0ID0gYXJncy5jYWxsZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICFjYWxsZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQgYW5kIGNhbGxlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDbG9zZVJhY2VNYXJrZXRUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICBjYWxsZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBjbG9zZSBiZXR0aW5nIG9uIHRoaXMgcmFjZSBtYXJrZXQnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfZXh0ZW5kX3JhY2VfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG5ld0Nsb3NpbmdUaW1lU3RyID0gYXJncy5uZXdfY2xvc2luZ190aW1lIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbmV3UmVzb2x1dGlvblRpbWVTdHIgPSBhcmdzLm5ld19yZXNvbHV0aW9uX3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjYWxsZXJXYWxsZXQgPSBhcmdzLmNhbGxlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgIW5ld0Nsb3NpbmdUaW1lU3RyIHx8ICFjYWxsZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIG5ld19jbG9zaW5nX3RpbWUsIGFuZCBjYWxsZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5ld0Nsb3NpbmdUaW1lID0gTWF0aC5mbG9vcihuZXcgRGF0ZShuZXdDbG9zaW5nVGltZVN0cikuZ2V0VGltZSgpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IG5ld1Jlc29sdXRpb25UaW1lID0gbmV3UmVzb2x1dGlvblRpbWVTdHJcbiAgICAgICAgICA/IE1hdGguZmxvb3IobmV3IERhdGUobmV3UmVzb2x1dGlvblRpbWVTdHIpLmdldFRpbWUoKSAvIDEwMDApXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkRXh0ZW5kUmFjZU1hcmtldFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICByYWNlTWFya2V0UGRhOiByYWNlTWFya2V0LFxuICAgICAgICAgIG5ld0Nsb3NpbmdUaW1lLFxuICAgICAgICAgIG5ld1Jlc29sdXRpb25UaW1lLFxuICAgICAgICAgIGNhbGxlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGV4dGVuZCByYWNlIG1hcmtldCBkZWFkbGluZScsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jYW5jZWxfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHJlYXNvbiA9IGFyZ3MucmVhc29uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgYXV0aG9yaXR5V2FsbGV0ID0gYXJncy5hdXRob3JpdHlfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgIXJlYXNvbiB8fCAhYXV0aG9yaXR5V2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgcmVhc29uLCBhbmQgYXV0aG9yaXR5X3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENhbmNlbE1hcmtldFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICByZWFzb24sXG4gICAgICAgICAgYXV0aG9yaXR5V2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY2FuY2VsIHRoZSBtYXJrZXQuIEJldHRvcnMgY2FuIGNsYWltIHJlZnVuZHMgYWZ0ZXIuJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NhbmNlbF9yYWNlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHJlYXNvbiA9IGFyZ3MucmVhc29uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgYXV0aG9yaXR5V2FsbGV0ID0gYXJncy5hdXRob3JpdHlfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICFyZWFzb24gfHwgIWF1dGhvcml0eVdhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgcmVhc29uLCBhbmQgYXV0aG9yaXR5X3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENhbmNlbFJhY2VUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICByZWFzb24sXG4gICAgICAgICAgYXV0aG9yaXR5V2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY2FuY2VsIHRoZSByYWNlIG1hcmtldC4gQmV0dG9ycyBjYW4gY2xhaW0gcmVmdW5kcyBhZnRlci4nLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoYFVua25vd24gdG9vbDogJHtuYW1lfWApO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZShlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyk7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEhFTFBFUlNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIHN1Y2Nlc3NSZXNwb25zZShkYXRhOiB1bmtub3duKTogeyBjb250ZW50OiBBcnJheTx7IHR5cGU6IHN0cmluZzsgdGV4dDogc3RyaW5nIH0+IH0ge1xuICByZXR1cm4ge1xuICAgIGNvbnRlbnQ6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICBuZXR3b3JrOiAnbWFpbm5ldC1iZXRhJyxcbiAgICAgICAgICBwcm9ncmFtSWQ6IFBST0dSQU1fSUQudG9CYXNlNTgoKSxcbiAgICAgICAgICAuLi5kYXRhIGFzIG9iamVjdCxcbiAgICAgICAgfSwgbnVsbCwgMiksXG4gICAgICB9LFxuICAgIF0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UobWVzc2FnZTogc3RyaW5nKTogeyBjb250ZW50OiBBcnJheTx7IHR5cGU6IHN0cmluZzsgdGV4dDogc3RyaW5nIH0+IH0ge1xuICByZXR1cm4ge1xuICAgIGNvbnRlbnQ6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogbWVzc2FnZSB9KSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfTtcbn1cbiJdfQ==