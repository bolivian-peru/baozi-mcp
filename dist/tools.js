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
import { RPC_ENDPOINT, PROGRAM_ID, BET_LIMITS, TIMING, LIVE_MODE, WRITE_TOOLS, MAX_BET_SOL_OVERRIDE, checkDailyLimit, recordSpend, BAOZI_BASE_URL, MANDATE_ID, } from './config.js';
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
        description: 'Preview market creation - validates params and shows costs WITHOUT building transaction. Use before build_create_market_transaction. IMPORTANT: For Lab markets, you MUST provide market_type and the corresponding timing field.',
        inputSchema: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'Market question (max 200 chars)' },
                layer: { type: 'string', enum: ['lab', 'private'], description: 'Market layer (lab=community, private=invite-only)' },
                closing_time: { type: 'string', description: 'ISO 8601 when betting closes' },
                resolution_time: { type: 'string', description: 'ISO 8601 when market can be resolved (optional, auto-calculated)' },
                market_type: { type: 'string', enum: ['event', 'measurement'], description: 'REQUIRED for Lab: "event" (Type A) or "measurement" (Type B)' },
                event_time: { type: 'string', description: 'ISO 8601 event time — REQUIRED for Type A markets' },
                measurement_start: { type: 'string', description: 'ISO 8601 measurement start — REQUIRED for Type B markets' },
                measurement_end: { type: 'string', description: 'ISO 8601 measurement end (optional)' },
            },
            required: ['question', 'layer', 'closing_time', 'market_type'],
        },
    },
    {
        name: 'build_create_lab_market_transaction',
        description: 'Build unsigned transaction to create a Lab (community) market. Validates against v7.2 rules. IMPORTANT: You MUST provide market_type and the corresponding timing field (event_time for Type A, measurement_start for Type B). Without these, creation will be BLOCKED.',
        inputSchema: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'Market question (max 200 chars)' },
                closing_time: { type: 'string', description: 'ISO 8601 when betting closes' },
                resolution_time: { type: 'string', description: 'ISO 8601 when market can be resolved (optional)' },
                market_type: { type: 'string', enum: ['event', 'measurement'], description: 'REQUIRED: "event" (Type A — outcome at scheduled moment) or "measurement" (Type B — data over period)' },
                event_time: { type: 'string', description: 'ISO 8601 event time — REQUIRED for Type A. Betting must close 24h+ before this.' },
                measurement_start: { type: 'string', description: 'ISO 8601 measurement start — REQUIRED for Type B. Betting must close BEFORE this.' },
                creator_wallet: { type: 'string', description: 'Creator wallet public key' },
                invite_hash: { type: 'string', description: 'Optional 64-char hex for invite links' },
            },
            required: ['question', 'closing_time', 'creator_wallet', 'market_type'],
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
        description: 'Get v7.2 timing rules and constraints for market creation.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'get_parimutuel_rules',
        description: 'Get v7.2 parimutuel rules for Lab market creation. CRITICAL: Read this BEFORE creating any market. Contains blocked terms, required data sources, and validation rules that will REJECT invalid markets.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'validate_market_question',
        description: 'Validate a market question against v7.2 rules BEFORE attempting to create it. Returns whether the question would be blocked and why. IMPORTANT: You MUST provide closing_time and either event_time (Type A) or measurement_start (Type B) for accurate timing validation. Without timing params, many invalid markets will pass.',
        inputSchema: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'Market question to validate' },
                layer: { type: 'string', enum: ['lab', 'private'], description: 'Market layer (default: lab)' },
                closing_time: { type: 'string', description: 'ISO 8601 when betting closes (REQUIRED for timing validation)' },
                market_type: { type: 'string', enum: ['event', 'measurement'], description: 'Type A (event) or Type B (measurement)' },
                event_time: { type: 'string', description: 'ISO 8601 event time — REQUIRED for Type A (scheduled event) markets' },
                measurement_start: { type: 'string', description: 'ISO 8601 measurement start — REQUIRED for Type B (measurement period) markets' },
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
    {
        name: 'generate_share_card',
        description: 'Generate a share card image URL for a market. Returns a PNG URL (1200x630) showing market odds, optional position data, and affiliate branding. Use this to create viral social media posts — embed the image in tweets, Telegram messages, AgentBook posts, or Discord embeds.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key (Solana PDA)' },
                wallet: { type: 'string', description: 'Optional: wallet public key to show position + potential payout on the card' },
                ref: { type: 'string', description: 'Optional: affiliate referral code to display on the card' },
            },
            required: ['market'],
        },
    },
    // =========================================================================
    // VALIDATION
    // =========================================================================
    {
        name: 'validate_market_params',
        description: 'Validate market parameters against v7.2 timing rules.',
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
    // =========================================================================
    // ARENA (Agent Competitive Scoring)
    // =========================================================================
    {
        name: 'get_arena_leaderboard',
        description: 'Get the current Agent Arena weekly leaderboard with calibration-based scoring. Shows top predictors ranked by composite score (calibration 40%, ROI 30%, volume 15%, consistency 15%).',
        inputSchema: {
            type: 'object',
            properties: {
                paper: { type: 'boolean', description: 'If true, show paper trading leaderboard instead of real bets' },
                limit: { type: 'number', description: 'Number of entries to return (default 50, max 100)' },
            },
        },
    },
    {
        name: 'get_arena_season',
        description: 'Get Agent Arena results for a specific past season by ID.',
        inputSchema: {
            type: 'object',
            properties: {
                season_id: { type: 'number', description: 'Season ID' },
                paper: { type: 'boolean', description: 'If true, show paper trading leaderboard' },
            },
            required: ['season_id'],
        },
    },
    {
        name: 'submit_paper_trade',
        description: 'Submit a paper (simulated) prediction to the Agent Arena. No SOL required. Scored on calibration accuracy when market resolves.',
        inputSchema: {
            type: 'object',
            properties: {
                wallet_address: { type: 'string', description: 'Your wallet address' },
                market_pda: { type: 'string', description: 'Market public key to predict on' },
                predicted_side: { type: 'string', enum: ['YES', 'NO'], description: 'Your prediction' },
                confidence: { type: 'number', description: 'Confidence level 0.01-0.99 (e.g. 0.75 = 75% confident)' },
            },
            required: ['wallet_address', 'market_pda', 'predicted_side', 'confidence'],
        },
    },
    // =========================================================================
    // INTEL (x402 Premium Market Intelligence)
    // =========================================================================
    {
        name: 'get_intel_sentiment',
        description: 'Get market sentiment analysis including comment sentiment, bet momentum, and pool trends. Costs 0.001 SOL via x402 payment protocol.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                payment_tx: { type: 'string', description: 'Payment transaction signature (base58). Omit to get pricing info.' },
            },
            required: ['market'],
        },
    },
    {
        name: 'get_intel_whale_moves',
        description: 'Get whale position data for a market (positions > 1 SOL, whale sentiment split). Costs 0.002 SOL via x402 payment protocol.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                payment_tx: { type: 'string', description: 'Payment transaction signature (base58). Omit to get pricing info.' },
            },
            required: ['market'],
        },
    },
    {
        name: 'get_intel_resolution_forecast',
        description: 'Get resolution forecast including closing time, tier, implied probability, and prediction. Costs 0.005 SOL via x402 payment protocol.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                payment_tx: { type: 'string', description: 'Payment transaction signature (base58). Omit to get pricing info.' },
            },
            required: ['market'],
        },
    },
    {
        name: 'get_intel_market_alpha',
        description: 'Get cross-market alpha signals including correlation analysis, category skew, and alpha opportunities. Costs 0.003 SOL via x402 payment protocol.',
        inputSchema: {
            type: 'object',
            properties: {
                market: { type: 'string', description: 'Market public key' },
                payment_tx: { type: 'string', description: 'Payment transaction signature (base58). Omit to get pricing info.' },
            },
            required: ['market'],
        },
    },
];
// =============================================================================
// TOOL HANDLERS
// =============================================================================
export async function handleTool(name, args) {
    // Safe-mode gate: block write tools unless BAOZI_LIVE=1
    if (WRITE_TOOLS.has(name) && !LIVE_MODE) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: 'SAFE MODE: Write tools are disabled by default. Set BAOZI_LIVE=1 to enable transaction building.',
                        tool: name,
                        mode: 'safe',
                        configExample: {
                            mcpServers: {
                                baozi: {
                                    command: 'npx',
                                    args: ['@baozi.bet/mcp-server'],
                                    env: {
                                        BAOZI_LIVE: '1',
                                        BAOZI_MAX_BET_SOL: '10',
                                        BAOZI_DAILY_LIMIT_SOL: '50',
                                    },
                                },
                            },
                        },
                        readOnlyAlternatives: [
                            'list_markets', 'get_market', 'get_quote',
                            'list_race_markets', 'get_race_market', 'get_race_quote',
                            'get_positions', 'get_claimable', 'validate_bet', 'validate_market_params',
                        ],
                    }, null, 2),
                }],
        };
    }
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
            case 'generate_share_card': {
                const market = args.market;
                if (!market)
                    return errorResponse('market is required');
                const wallet = args.wallet;
                const ref = args.ref;
                const baseUrl = 'https://baozi.bet';
                const params = new URLSearchParams({ market });
                if (wallet)
                    params.set('wallet', wallet);
                if (ref)
                    params.set('ref', ref);
                const imageUrl = `${baseUrl}/api/share/card?${params.toString()}`;
                const marketUrl = ref
                    ? `${baseUrl}/market/${market}?ref=${ref}`
                    : `${baseUrl}/market/${market}`;
                return successResponse({
                    imageUrl,
                    marketUrl,
                    market,
                    wallet: wallet || null,
                    ref: ref || null,
                    usage: {
                        twitter: `Share the imageUrl as a Twitter card image, with marketUrl as the link`,
                        telegram: `Send imageUrl as a photo with marketUrl in the caption`,
                        agentbook: `POST to /api/agentbook/posts with the imageUrl in your content`,
                        embed: `Use imageUrl directly as an <img> src — it returns a 1200x630 PNG`,
                    },
                });
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
                if (amountSol < BET_LIMITS.MIN_BET_SOL || amountSol > MAX_BET_SOL_OVERRIDE) {
                    return errorResponse(`Amount must be between ${BET_LIMITS.MIN_BET_SOL} and ${MAX_BET_SOL_OVERRIDE} SOL`);
                }
                const dailyLimitError = checkDailyLimit(amountSol);
                if (dailyLimitError)
                    return errorResponse(dailyLimitError);
                const mandateError = await checkMandate('bet', userWallet, { amountSol, marketPda: marketPubkey });
                if (mandateError)
                    return errorResponse(`Mandate: ${mandateError}`);
                const result = await fetchAndBuildBetTransaction({ marketPda: marketPubkey, userWallet, outcome, amountSol });
                if (result.error || !result.transaction) {
                    return errorResponse(result.error || 'Failed to build transaction');
                }
                const connection = new Connection(RPC_ENDPOINT, 'confirmed');
                const simulation = await simulateBetTransaction(result.transaction.transaction, new PublicKey(userWallet), connection);
                const quote = await getQuote(marketPubkey, outcome === 'yes' ? 'Yes' : 'No', amountSol);
                recordSpend(amountSol);
                const signUrl = await createSignUrl(result.transaction.serializedTx, {
                    type: 'bet', market: marketPubkey, outcome, amountSol,
                });
                return successResponse({
                    transaction: { serialized: result.transaction.serializedTx, positionPda: result.transaction.positionPda.toBase58() },
                    simulation: { success: simulation.success, unitsConsumed: simulation.unitsConsumed, error: simulation.error },
                    quote: quote.valid ? { expectedPayoutSol: quote.expectedPayoutSol, potentialProfitSol: quote.potentialProfitSol } : null,
                    ...(signUrl ? { signUrl: signUrl.signUrl, signUrlExpires: signUrl.expiresAt } : {}),
                    instructions: signUrl
                        ? `Send this link to the user to sign: ${signUrl.signUrl}`
                        : 'Sign the transaction with your wallet and send to Solana network',
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
                if (amountSol < BET_LIMITS.MIN_BET_SOL || amountSol > MAX_BET_SOL_OVERRIDE) {
                    return errorResponse(`Amount must be between ${BET_LIMITS.MIN_BET_SOL} and ${MAX_BET_SOL_OVERRIDE} SOL`);
                }
                const dailyLimitError = checkDailyLimit(amountSol);
                if (dailyLimitError)
                    return errorResponse(dailyLimitError);
                const result = await fetchAndBuildRaceBetTransaction({ raceMarketPda: marketPubkey, outcomeIndex, amountSol, userWallet });
                if (result.error || !result.transaction) {
                    return errorResponse(result.error || 'Failed to build transaction');
                }
                recordSpend(amountSol);
                const signUrl = await createSignUrl(result.transaction.serializedTx, {
                    type: 'race_bet', market: marketPubkey, outcomeIndex, amountSol,
                });
                return successResponse({
                    transaction: { serialized: result.transaction.serializedTx, positionPda: result.transaction.positionPda },
                    marketId: result.marketId.toString(),
                    ...(signUrl ? { signUrl: signUrl.signUrl, signUrlExpires: signUrl.expiresAt } : {}),
                    instructions: signUrl
                        ? `Send this link to the user to sign: ${signUrl.signUrl}`
                        : 'Sign the transaction with your wallet and send to Solana network',
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
                const measurementStart = args.measurement_start;
                const inviteHash = args.invite_hash;
                const creatorWallet = args.creator_wallet;
                if (!question || !closingTime || !creatorWallet) {
                    return errorResponse('question, closing_time, and creator_wallet are required');
                }
                // v7.2: Enforce market type classification for lab markets
                if (!marketType) {
                    return errorResponse('market_type is REQUIRED for Lab markets (v7.2 rules). ' +
                        'Use "event" (Type A: outcome at scheduled moment, e.g. fight result, award winner) ' +
                        'or "measurement" (Type B: data over period, e.g. Billboard chart week, opening weekend). ' +
                        'Also provide event_time (Type A) or measurement_start (Type B).');
                }
                if (marketType === 'event' && !eventTime) {
                    return errorResponse('event_time is REQUIRED for Type A (event) markets. ' +
                        'Provide the ISO 8601 datetime when the outcome is revealed (e.g. fight end, ceremony, announcement). ' +
                        'Betting must close 24h+ before this time.');
                }
                if (marketType === 'measurement' && !measurementStart) {
                    return errorResponse('measurement_start is REQUIRED for Type B (measurement) markets. ' +
                        'Provide the ISO 8601 datetime when the measurement period begins. ' +
                        'Betting must close BEFORE this time.');
                }
                const result = await createLabMarket({
                    question,
                    layer: 'lab',
                    closingTime,
                    resolutionTime,
                    marketType,
                    eventTime,
                    measurementStart,
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
                const closingTimeStr = args.closing_time;
                const marketType = args.market_type;
                const eventTimeStr = args.event_time;
                const measurementStartStr = args.measurement_start;
                if (!question) {
                    return errorResponse('question is required');
                }
                const closingTime = closingTimeStr
                    ? new Date(closingTimeStr)
                    : new Date(Date.now() + 24 * 60 * 60 * 1000);
                const eventTime = eventTimeStr ? new Date(eventTimeStr) : undefined;
                const measurementStart = measurementStartStr ? new Date(measurementStartStr) : undefined;
                // Warn if no timing params provided — validation will be incomplete
                const timingWarnings = [];
                if (!closingTimeStr) {
                    timingWarnings.push('WARNING: No closing_time provided. Timing validation skipped. Provide closing_time + event_time (Type A) or measurement_start (Type B) for complete validation.');
                }
                if (layer === 'lab' && closingTimeStr && !eventTime && !measurementStart) {
                    timingWarnings.push('WARNING: No event_time or measurement_start provided. v7.2 requires Type A (event_time) or Type B (measurement_start) for Lab markets. Market creation WILL be blocked without these.');
                }
                const validation = validateParimutuelRules({
                    question,
                    closingTime,
                    layer,
                    marketType,
                    eventTime,
                    measurementStart,
                });
                return successResponse({
                    question,
                    wouldBeBlocked: validation.blocked,
                    valid: !validation.blocked,
                    errors: validation.errors,
                    warnings: [...timingWarnings, ...validation.warnings],
                    ruleViolations: validation.ruleViolations,
                    rulesChecked: validation.rulesChecked,
                    timingParamsProvided: {
                        closing_time: !!closingTimeStr,
                        event_time: !!eventTimeStr,
                        measurement_start: !!measurementStartStr,
                        market_type: marketType || 'not specified',
                    },
                    suggestion: validation.blocked
                        ? 'Question violates v7.2 rules. Fix the errors above before creating.'
                        : timingWarnings.length > 0
                            ? 'Question text passes v7.2 content checks, but timing validation is INCOMPLETE. Provide all timing parameters for full validation.'
                            : 'Question passes full v7.2 validation.',
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
            // =====================================================================
            // ARENA TOOLS
            // =====================================================================
            case 'get_arena_leaderboard': {
                const paper = args.paper === true;
                const limit = Math.min(typeof args.limit === 'number' ? args.limit : 50, 100);
                const resp = await fetch(`${BAOZI_BASE_URL}/api/arena/current?paper=${paper}&limit=${limit}`, {
                    signal: AbortSignal.timeout(10000),
                });
                if (!resp.ok)
                    return errorResponse('Failed to fetch arena leaderboard');
                const data = await resp.json();
                return successResponse(data);
            }
            case 'get_arena_season': {
                const seasonId = args.season_id;
                if (seasonId === undefined)
                    return errorResponse('season_id is required');
                const paper = args.paper === true;
                const resp = await fetch(`${BAOZI_BASE_URL}/api/arena/seasons/${seasonId}?paper=${paper}`, {
                    signal: AbortSignal.timeout(10000),
                });
                if (!resp.ok)
                    return errorResponse('Season not found');
                const data = await resp.json();
                return successResponse(data);
            }
            case 'submit_paper_trade': {
                const walletAddress = args.wallet_address;
                const marketPda = args.market_pda;
                const predictedSide = args.predicted_side;
                const confidence = args.confidence;
                if (!walletAddress || !marketPda || !predictedSide || confidence === undefined) {
                    return errorResponse('wallet_address, market_pda, predicted_side, and confidence are required');
                }
                const resp = await fetch(`${BAOZI_BASE_URL}/api/arena/paper-trade`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ walletAddress, marketPda, predictedSide, confidence }),
                    signal: AbortSignal.timeout(10000),
                });
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    return errorResponse(err.error || 'Failed to submit paper trade');
                }
                const data = await resp.json();
                return successResponse(data);
            }
            // =====================================================================
            // INTEL TOOLS (x402 Payment Protocol)
            // =====================================================================
            case 'get_intel_sentiment':
            case 'get_intel_whale_moves':
            case 'get_intel_resolution_forecast':
            case 'get_intel_market_alpha': {
                const intelMarket = args.market;
                const paymentTx = args.payment_tx;
                if (!intelMarket)
                    return errorResponse('market is required');
                const intelType = name.replace('get_intel_', '').replace(/_/g, '-');
                const headers = { 'Content-Type': 'application/json' };
                if (paymentTx)
                    headers['X-Payment-Tx'] = paymentTx;
                const resp = await fetch(`${BAOZI_BASE_URL}/api/intel/${intelType}?market=${intelMarket}`, {
                    headers,
                    signal: AbortSignal.timeout(15000),
                });
                if (resp.status === 402) {
                    const paymentInfo = await resp.json();
                    return successResponse({
                        requiresPayment: true,
                        price: paymentInfo.price,
                        currency: 'SOL',
                        paymentAddress: paymentInfo.paymentAddress,
                        instructions: paymentInfo.instructions,
                        hint: 'Send the specified SOL amount to the payment address, then retry with the transaction signature in payment_tx parameter.',
                    });
                }
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    return errorResponse(err.error || `Intel request failed (${resp.status})`);
                }
                const data = await resp.json();
                return successResponse(data);
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
/**
 * Create a sign-link URL for a transaction (best-effort, non-blocking).
 * Returns null if the API is unavailable or sign-link creation fails.
 */
async function createSignUrl(serializedTx, metadata) {
    try {
        const resp = await fetch(`${BAOZI_BASE_URL}/api/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction: serializedTx, metadata }),
            signal: AbortSignal.timeout(5000),
        });
        if (!resp.ok)
            return null;
        const data = await resp.json();
        if (data.signUrl)
            return { signUrl: data.signUrl, expiresAt: data.expiresAt || '' };
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Verify a mandate for a specific action (when BAOZI_MANDATE_ID is set).
 * Returns error string if denied, null if approved or no mandate configured.
 */
async function checkMandate(action, granteeWallet, details) {
    if (!MANDATE_ID)
        return null;
    try {
        const resp = await fetch(`${BAOZI_BASE_URL}/api/mandates/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mandateId: MANDATE_ID,
                granteeWallet,
                action,
                actionDetails: details,
            }),
            signal: AbortSignal.timeout(5000),
        });
        const data = await resp.json();
        if (!data.approved) {
            return data.error || 'Mandate denied this action';
        }
        return null;
    }
    catch {
        return 'Mandate verification failed (network error)';
    }
}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHO0FBQ0gsT0FBTyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFckUsV0FBVztBQUNYLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBMEIsTUFBTSxxQkFBcUIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQXNELE1BQU0sc0JBQXNCLENBQUM7QUFDakgsT0FBTyxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDakgsT0FBTyxFQUNMLHdCQUF3QixFQUN4QixxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLG9CQUFvQixFQUNwQix1QkFBdUIsRUFDdkIsb0JBQW9CLEVBQ3BCLG1CQUFtQixFQUNuQixpQkFBaUIsR0FDbEIsTUFBTSw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLEVBQ0wscUJBQXFCLEVBRXJCLGVBQWUsRUFDZixtQkFBbUIsRUFDbkIsZ0JBQWdCLEVBQ2hCLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLGtCQUFrQixHQUNuQixNQUFNLCtCQUErQixDQUFDO0FBRXZDLGFBQWE7QUFDYixPQUFPLEVBQUUsb0JBQW9CLEVBQXNCLE1BQU0sOEJBQThCLENBQUM7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FB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QUM7SUFDZCxDQUFDO0lBQUMsTUFBTSxDQUFDO1FBQ1AsT0FBTyw2Q0FBNkMsQ0FBQztJQUN2RCxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLElBQWE7SUFDcEMsT0FBTztRQUNMLE9BQU8sRUFBRTtZQUNQO2dCQUNFLElBQUksRUFBRSxNQUFNO2dCQUNaLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixPQUFPLEVBQUUsSUFBSTtvQkFDYixPQUFPLEVBQUUsY0FBYztvQkFDdkIsU0FBUyxFQUFFLFVBQVUsQ0FBQyxRQUFRLEVBQUU7b0JBQ2hDLEdBQUcsSUFBYztpQkFDbEIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2FBQ1o7U0FDRjtLQUNGLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsT0FBZTtJQUNwQyxPQUFPO1FBQ0wsT0FBTyxFQUFFO1lBQ1A7Z0JBQ0UsSUFBSSxFQUFFLE1BQU07Z0JBQ1osSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQzthQUN6RDtTQUNGO0tBQ0YsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE1DUCBUb29sIERlZmluaXRpb25zIGZvciBCYW96aSBNYXJrZXRzXG4gKiBWNC4wLjAgLSBGdWxsIFByb3RvY29sIENvdmVyYWdlICsgTWFya2V0IENyZWF0aW9uICsgQUkgQWdlbnQgTmV0d29ya1xuICovXG5pbXBvcnQgeyBDb25uZWN0aW9uLCBQdWJsaWNLZXksIFRyYW5zYWN0aW9uIH0gZnJvbSAnQHNvbGFuYS93ZWIzLmpzJztcblxuLy8gSGFuZGxlcnNcbmltcG9ydCB7IGxpc3RNYXJrZXRzLCBnZXRNYXJrZXQsIGdldE1hcmtldEZvckJldHRpbmcgfSBmcm9tICcuL2hhbmRsZXJzL21hcmtldHMuanMnO1xuaW1wb3J0IHsgZ2V0UXVvdGUsIGdldFF1b3RlV2l0aE1hcmtldERhdGEgfSBmcm9tICcuL2hhbmRsZXJzL3F1b3RlLmpzJztcbmltcG9ydCB7IGdldFBvc2l0aW9uc1N1bW1hcnkgfSBmcm9tICcuL2hhbmRsZXJzL3Bvc2l0aW9ucy5qcyc7XG5pbXBvcnQgeyBnZXRDbGFpbWFibGVQb3NpdGlvbnMsIGdldEFmZmlsaWF0ZUJ5Q29kZSBhcyBnZXRBZmZpbGlhdGVCeUNvZGVGcm9tQ2xhaW1zIH0gZnJvbSAnLi9oYW5kbGVycy9jbGFpbXMuanMnO1xuaW1wb3J0IHsgbGlzdFJhY2VNYXJrZXRzLCBnZXRSYWNlTWFya2V0LCBnZXRSYWNlUXVvdGUgfSBmcm9tICcuL2hhbmRsZXJzL3JhY2UtbWFya2V0cy5qcyc7XG5pbXBvcnQgeyBnZXRSZXNvbHV0aW9uU3RhdHVzLCBnZXREaXNwdXRlZE1hcmtldHMsIGdldE1hcmtldHNBd2FpdGluZ1Jlc29sdXRpb24gfSBmcm9tICcuL2hhbmRsZXJzL3Jlc29sdXRpb24uanMnO1xuaW1wb3J0IHtcbiAgaXNBZmZpbGlhdGVDb2RlQXZhaWxhYmxlLFxuICBzdWdnZXN0QWZmaWxpYXRlQ29kZXMsXG4gIGdldEFmZmlsaWF0ZUJ5Q29kZSxcbiAgZ2V0QWZmaWxpYXRlc0J5T3duZXIsXG4gIGdldFJlZmVycmFsc0J5QWZmaWxpYXRlLFxuICBnZXRBZ2VudE5ldHdvcmtTdGF0cyxcbiAgZm9ybWF0QWZmaWxpYXRlTGluayxcbiAgZ2V0Q29tbWlzc2lvbkluZm8sXG59IGZyb20gJy4vaGFuZGxlcnMvYWdlbnQtbmV0d29yay5qcyc7XG5pbXBvcnQge1xuICBwcmV2aWV3TWFya2V0Q3JlYXRpb24sXG4gIHByZXZpZXdSYWNlTWFya2V0Q3JlYXRpb24sXG4gIGNyZWF0ZUxhYk1hcmtldCxcbiAgY3JlYXRlUHJpdmF0ZU1hcmtldCxcbiAgY3JlYXRlUmFjZU1hcmtldCxcbiAgZ2V0QWxsQ3JlYXRpb25GZWVzLFxuICBnZXRBbGxQbGF0Zm9ybUZlZXMsXG4gIGdldFRpbWluZ0NvbnN0cmFpbnRzLFxuICBnZW5lcmF0ZUludml0ZUhhc2gsXG59IGZyb20gJy4vaGFuZGxlcnMvbWFya2V0LWNyZWF0aW9uLmpzJztcblxuLy8gVmFsaWRhdGlvblxuaW1wb3J0IHsgdmFsaWRhdGVNYXJrZXRUaW1pbmcsIE1hcmtldFRpbWluZ1BhcmFtcyB9IGZyb20gJy4vdmFsaWRhdGlvbi9tYXJrZXQtcnVsZXMuanMnO1xuaW1wb3J0IHsgdmFsaWRhdGVCZXQsIGNhbGN1bGF0ZUJldFF1b3RlIH0gZnJvbSAnLi92YWxpZGF0aW9uL2JldC1ydWxlcy5qcyc7XG5pbXBvcnQgeyB2YWxpZGF0ZU1hcmtldENyZWF0aW9uIH0gZnJvbSAnLi92YWxpZGF0aW9uL2NyZWF0aW9uLXJ1bGVzLmpzJztcbmltcG9ydCB7XG4gIHZhbGlkYXRlUGFyaW11dHVlbFJ1bGVzLFxuICBQQVJJTVVUVUVMX1JVTEVTLFxuICBQQVJJTVVUVUVMX1JVTEVTX0RPQ1VNRU5UQVRJT04sXG59IGZyb20gJy4vdmFsaWRhdGlvbi9wYXJpbXV0dWVsLXJ1bGVzLmpzJztcblxuLy8gVHJhbnNhY3Rpb24gQnVpbGRlcnNcbmltcG9ydCB7IGJ1aWxkQmV0VHJhbnNhY3Rpb24sIGZldGNoQW5kQnVpbGRCZXRUcmFuc2FjdGlvbiwgc2ltdWxhdGVCZXRUcmFuc2FjdGlvbiB9IGZyb20gJy4vYnVpbGRlcnMvYmV0LXRyYW5zYWN0aW9uLmpzJztcbmltcG9ydCB7XG4gIGJ1aWxkQ2xhaW1XaW5uaW5nc1RyYW5zYWN0aW9uLFxuICBidWlsZENsYWltUmVmdW5kVHJhbnNhY3Rpb24sXG4gIGJ1aWxkQ2xhaW1BZmZpbGlhdGVUcmFuc2FjdGlvbixcbiAgYnVpbGRCYXRjaENsYWltVHJhbnNhY3Rpb24sXG59IGZyb20gJy4vYnVpbGRlcnMvY2xhaW0tdHJhbnNhY3Rpb24uanMnO1xuaW1wb3J0IHsgYnVpbGRSZWdpc3RlckFmZmlsaWF0ZVRyYW5zYWN0aW9uLCBidWlsZFRvZ2dsZUFmZmlsaWF0ZVRyYW5zYWN0aW9uIH0gZnJvbSAnLi9idWlsZGVycy9hZmZpbGlhdGUtdHJhbnNhY3Rpb24uanMnO1xuaW1wb3J0IHsgZmV0Y2hBbmRCdWlsZFJhY2VCZXRUcmFuc2FjdGlvbiwgYnVpbGRDbGFpbVJhY2VXaW5uaW5nc1RyYW5zYWN0aW9uLCBidWlsZENsYWltUmFjZVJlZnVuZFRyYW5zYWN0aW9uIH0gZnJvbSAnLi9idWlsZGVycy9yYWNlLXRyYW5zYWN0aW9uLmpzJztcbmltcG9ydCB7IGdldE5leHRNYXJrZXRJZCwgcHJldmlld01hcmtldFBkYSwgcHJldmlld1JhY2VNYXJrZXRQZGEgfSBmcm9tICcuL2J1aWxkZXJzL21hcmtldC1jcmVhdGlvbi10eC5qcyc7XG5cbi8vIFJlc29sdXRpb24gQnVpbGRlcnNcbmltcG9ydCB7XG4gIGJ1aWxkUHJvcG9zZVJlc29sdXRpb25UcmFuc2FjdGlvbixcbiAgYnVpbGRQcm9wb3NlUmVzb2x1dGlvbkhvc3RUcmFuc2FjdGlvbixcbiAgYnVpbGRSZXNvbHZlTWFya2V0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkUmVzb2x2ZU1hcmtldEhvc3RUcmFuc2FjdGlvbixcbiAgYnVpbGRGaW5hbGl6ZVJlc29sdXRpb25UcmFuc2FjdGlvbixcbiAgYnVpbGRQcm9wb3NlUmFjZVJlc29sdXRpb25UcmFuc2FjdGlvbixcbiAgYnVpbGRSZXNvbHZlUmFjZVRyYW5zYWN0aW9uLFxuICBidWlsZEZpbmFsaXplUmFjZVJlc29sdXRpb25UcmFuc2FjdGlvbixcbn0gZnJvbSAnLi9idWlsZGVycy9yZXNvbHV0aW9uLXRyYW5zYWN0aW9uLmpzJztcblxuLy8gRGlzcHV0ZSBCdWlsZGVyc1xuaW1wb3J0IHtcbiAgYnVpbGRGbGFnRGlzcHV0ZVRyYW5zYWN0aW9uLFxuICBidWlsZEZsYWdSYWNlRGlzcHV0ZVRyYW5zYWN0aW9uLFxuICBidWlsZFZvdGVDb3VuY2lsVHJhbnNhY3Rpb24sXG4gIGJ1aWxkVm90ZUNvdW5jaWxSYWNlVHJhbnNhY3Rpb24sXG4gIGJ1aWxkQ2hhbmdlQ291bmNpbFZvdGVUcmFuc2FjdGlvbixcbiAgYnVpbGRDaGFuZ2VDb3VuY2lsVm90ZVJhY2VUcmFuc2FjdGlvbixcbn0gZnJvbSAnLi9idWlsZGVycy9kaXNwdXRlLXRyYW5zYWN0aW9uLmpzJztcblxuLy8gV2hpdGVsaXN0IEJ1aWxkZXJzXG5pbXBvcnQge1xuICBidWlsZEFkZFRvV2hpdGVsaXN0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkUmVtb3ZlRnJvbVdoaXRlbGlzdFRyYW5zYWN0aW9uLFxuICBidWlsZENyZWF0ZVJhY2VXaGl0ZWxpc3RUcmFuc2FjdGlvbixcbiAgYnVpbGRBZGRUb1JhY2VXaGl0ZWxpc3RUcmFuc2FjdGlvbixcbiAgYnVpbGRSZW1vdmVGcm9tUmFjZVdoaXRlbGlzdFRyYW5zYWN0aW9uLFxufSBmcm9tICcuL2J1aWxkZXJzL3doaXRlbGlzdC10cmFuc2FjdGlvbi5qcyc7XG5cbi8vIENyZWF0b3IgUHJvZmlsZSBCdWlsZGVyc1xuaW1wb3J0IHtcbiAgYnVpbGRDcmVhdGVDcmVhdG9yUHJvZmlsZVRyYW5zYWN0aW9uLFxuICBidWlsZFVwZGF0ZUNyZWF0b3JQcm9maWxlVHJhbnNhY3Rpb24sXG4gIGJ1aWxkQ2xhaW1DcmVhdG9yVHJhbnNhY3Rpb24sXG59IGZyb20gJy4vYnVpbGRlcnMvY3JlYXRvci10cmFuc2FjdGlvbi5qcyc7XG5cbi8vIE1hcmtldCBNYW5hZ2VtZW50IEJ1aWxkZXJzXG5pbXBvcnQge1xuICBidWlsZENsb3NlTWFya2V0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkRXh0ZW5kTWFya2V0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkQ2xvc2VSYWNlTWFya2V0VHJhbnNhY3Rpb24sXG4gIGJ1aWxkRXh0ZW5kUmFjZU1hcmtldFRyYW5zYWN0aW9uLFxuICBidWlsZENhbmNlbE1hcmtldFRyYW5zYWN0aW9uLFxuICBidWlsZENhbmNlbFJhY2VUcmFuc2FjdGlvbixcbn0gZnJvbSAnLi9idWlsZGVycy9tYXJrZXQtbWFuYWdlbWVudC10cmFuc2FjdGlvbi5qcyc7XG5cbi8vIENvbmZpZ1xuaW1wb3J0IHtcbiAgUlBDX0VORFBPSU5ULCBQUk9HUkFNX0lELCBCRVRfTElNSVRTLCBUSU1JTkcsIEZFRVMsXG4gIExJVkVfTU9ERSwgV1JJVEVfVE9PTFMsIE1BWF9CRVRfU09MX09WRVJSSURFLFxuICBjaGVja0RhaWx5TGltaXQsIHJlY29yZFNwZW5kLCBnZXREYWlseVNwZW5kLCBEQUlMWV9MSU1JVF9TT0wsXG4gIEJBT1pJX0JBU0VfVVJMLCBNQU5EQVRFX0lELFxufSBmcm9tICcuL2NvbmZpZy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUT09MIFNDSEVNQVMgLSBPcmdhbml6ZWQgYnkgQ2F0ZWdvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBUT09MUyA9IFtcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBNQVJLRVQgUkVBRCBPUEVSQVRJT05TXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdsaXN0X21hcmtldHMnLFxuICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgQmFvemkgcHJlZGljdGlvbiBtYXJrZXRzIChib29sZWFuIFlFUy9OTykgb24gU29sYW5hIG1haW5uZXQuIFJldHVybnMgcXVlc3Rpb25zLCBvZGRzLCBwb29scywgc3RhdHVzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBzdGF0dXM6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBlbnVtOiBbJ0FjdGl2ZScsICdDbG9zZWQnLCAnUmVzb2x2ZWQnLCAnQ2FuY2VsbGVkJywgJ1BhdXNlZCddLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmlsdGVyIGJ5IHN0YXR1cy4gRGVmYXVsdDogYWxsIG1hcmtldHMuJyxcbiAgICAgICAgfSxcbiAgICAgICAgbGF5ZXI6IHtcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBlbnVtOiBbJ09mZmljaWFsJywgJ0xhYicsICdQcml2YXRlJ10sXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdGaWx0ZXIgYnkgbGF5ZXIgdHlwZS4nLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9tYXJrZXQnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IGRldGFpbGVkIGluZm9ybWF0aW9uIGFib3V0IGEgc3BlY2lmaWMgcHJlZGljdGlvbiBtYXJrZXQgYnkgcHVibGljIGtleS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcHVibGljS2V5OiB7XG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdTb2xhbmEgcHVibGljIGtleSBvZiB0aGUgbWFya2V0IGFjY291bnQnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3B1YmxpY0tleSddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X3F1b3RlJyxcbiAgICBkZXNjcmlwdGlvbjogJ0NhbGN1bGF0ZSBleHBlY3RlZCBwYXlvdXQgZm9yIGEgcG90ZW50aWFsIGJldC4gU2hvd3MgcHJvZml0LCBmZWVzLCBhbmQgbmV3IG9kZHMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgc2lkZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydZZXMnLCAnTm8nXSwgZGVzY3JpcHRpb246ICdTaWRlIHRvIGJldCBvbicgfSxcbiAgICAgICAgYW1vdW50OiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogYEJldCBhbW91bnQgaW4gU09MICgke0JFVF9MSU1JVFMuTUlOX0JFVF9TT0x9LSR7QkVUX0xJTUlUUy5NQVhfQkVUX1NPTH0pYCB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdzaWRlJywgJ2Ftb3VudCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBSQUNFIE1BUktFVCBPUEVSQVRJT05TIChNdWx0aS1PdXRjb21lKVxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnbGlzdF9yYWNlX21hcmtldHMnLFxuICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgcmFjZSBtYXJrZXRzIChtdWx0aS1vdXRjb21lIHByZWRpY3Rpb24gbWFya2V0cykgb24gU29sYW5hIG1haW5uZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHN0YXR1czoge1xuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGVudW06IFsnQWN0aXZlJywgJ0Nsb3NlZCcsICdSZXNvbHZlZCcsICdDYW5jZWxsZWQnXSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbHRlciBieSBzdGF0dXMnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9yYWNlX21hcmtldCcsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgZGV0YWlsZWQgaW5mbyBhYm91dCBhIHJhY2UgbWFya2V0IGluY2x1ZGluZyBhbGwgb3V0Y29tZSBsYWJlbHMsIHBvb2xzLCBhbmQgb2Rkcy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcHVibGljS2V5OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncHVibGljS2V5J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfcmFjZV9xdW90ZScsXG4gICAgZGVzY3JpcHRpb246ICdDYWxjdWxhdGUgZXhwZWN0ZWQgcGF5b3V0IGZvciBhIHJhY2UgbWFya2V0IGJldCBvbiBhIHNwZWNpZmljIG91dGNvbWUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBvdXRjb21lSW5kZXg6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnSW5kZXggb2Ygb3V0Y29tZSB0byBiZXQgb24gKDAtYmFzZWQpJyB9LFxuICAgICAgICBhbW91bnQ6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnQmV0IGFtb3VudCBpbiBTT0wnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ291dGNvbWVJbmRleCcsICdhbW91bnQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gTUFSS0VUIENSRUFUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdwcmV2aWV3X2NyZWF0ZV9tYXJrZXQnLFxuICAgIGRlc2NyaXB0aW9uOiAnUHJldmlldyBtYXJrZXQgY3JlYXRpb24gLSB2YWxpZGF0ZXMgcGFyYW1zIGFuZCBzaG93cyBjb3N0cyBXSVRIT1VUIGJ1aWxkaW5nIHRyYW5zYWN0aW9uLiBVc2UgYmVmb3JlIGJ1aWxkX2NyZWF0ZV9tYXJrZXRfdHJhbnNhY3Rpb24uIElNUE9SVEFOVDogRm9yIExhYiBtYXJrZXRzLCB5b3UgTVVTVCBwcm92aWRlIG1hcmtldF90eXBlIGFuZCB0aGUgY29ycmVzcG9uZGluZyB0aW1pbmcgZmllbGQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHF1ZXN0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBxdWVzdGlvbiAobWF4IDIwMCBjaGFycyknIH0sXG4gICAgICAgIGxheWVyOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ2xhYicsICdwcml2YXRlJ10sIGRlc2NyaXB0aW9uOiAnTWFya2V0IGxheWVyIChsYWI9Y29tbXVuaXR5LCBwcml2YXRlPWludml0ZS1vbmx5KScgfSxcbiAgICAgICAgY2xvc2luZ190aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIHdoZW4gYmV0dGluZyBjbG9zZXMnIH0sXG4gICAgICAgIHJlc29sdXRpb25fdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSB3aGVuIG1hcmtldCBjYW4gYmUgcmVzb2x2ZWQgKG9wdGlvbmFsLCBhdXRvLWNhbGN1bGF0ZWQpJyB9LFxuICAgICAgICBtYXJrZXRfdHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydldmVudCcsICdtZWFzdXJlbWVudCddLCBkZXNjcmlwdGlvbjogJ1JFUVVJUkVEIGZvciBMYWI6IFwiZXZlbnRcIiAoVHlwZSBBKSBvciBcIm1lYXN1cmVtZW50XCIgKFR5cGUgQiknIH0sXG4gICAgICAgIGV2ZW50X3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgZXZlbnQgdGltZSDigJQgUkVRVUlSRUQgZm9yIFR5cGUgQSBtYXJrZXRzJyB9LFxuICAgICAgICBtZWFzdXJlbWVudF9zdGFydDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBtZWFzdXJlbWVudCBzdGFydCDigJQgUkVRVUlSRUQgZm9yIFR5cGUgQiBtYXJrZXRzJyB9LFxuICAgICAgICBtZWFzdXJlbWVudF9lbmQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgbWVhc3VyZW1lbnQgZW5kIChvcHRpb25hbCknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncXVlc3Rpb24nLCAnbGF5ZXInLCAnY2xvc2luZ190aW1lJywgJ21hcmtldF90eXBlJ10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jcmVhdGVfbGFiX21hcmtldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjcmVhdGUgYSBMYWIgKGNvbW11bml0eSkgbWFya2V0LiBWYWxpZGF0ZXMgYWdhaW5zdCB2Ny4yIHJ1bGVzLiBJTVBPUlRBTlQ6IFlvdSBNVVNUIHByb3ZpZGUgbWFya2V0X3R5cGUgYW5kIHRoZSBjb3JyZXNwb25kaW5nIHRpbWluZyBmaWVsZCAoZXZlbnRfdGltZSBmb3IgVHlwZSBBLCBtZWFzdXJlbWVudF9zdGFydCBmb3IgVHlwZSBCKS4gV2l0aG91dCB0aGVzZSwgY3JlYXRpb24gd2lsbCBiZSBCTE9DS0VELicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBxdWVzdGlvbjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcXVlc3Rpb24gKG1heCAyMDAgY2hhcnMpJyB9LFxuICAgICAgICBjbG9zaW5nX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgd2hlbiBiZXR0aW5nIGNsb3NlcycgfSxcbiAgICAgICAgcmVzb2x1dGlvbl90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIHdoZW4gbWFya2V0IGNhbiBiZSByZXNvbHZlZCAob3B0aW9uYWwpJyB9LFxuICAgICAgICBtYXJrZXRfdHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydldmVudCcsICdtZWFzdXJlbWVudCddLCBkZXNjcmlwdGlvbjogJ1JFUVVJUkVEOiBcImV2ZW50XCIgKFR5cGUgQSDigJQgb3V0Y29tZSBhdCBzY2hlZHVsZWQgbW9tZW50KSBvciBcIm1lYXN1cmVtZW50XCIgKFR5cGUgQiDigJQgZGF0YSBvdmVyIHBlcmlvZCknIH0sXG4gICAgICAgIGV2ZW50X3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgZXZlbnQgdGltZSDigJQgUkVRVUlSRUQgZm9yIFR5cGUgQS4gQmV0dGluZyBtdXN0IGNsb3NlIDI0aCsgYmVmb3JlIHRoaXMuJyB9LFxuICAgICAgICBtZWFzdXJlbWVudF9zdGFydDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBtZWFzdXJlbWVudCBzdGFydCDigJQgUkVRVUlSRUQgZm9yIFR5cGUgQi4gQmV0dGluZyBtdXN0IGNsb3NlIEJFRk9SRSB0aGlzLicgfSxcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ3JlYXRvciB3YWxsZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgaW52aXRlX2hhc2g6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnT3B0aW9uYWwgNjQtY2hhciBoZXggZm9yIGludml0ZSBsaW5rcycgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydxdWVzdGlvbicsICdjbG9zaW5nX3RpbWUnLCAnY3JlYXRvcl93YWxsZXQnLCAnbWFya2V0X3R5cGUnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NyZWF0ZV9wcml2YXRlX21hcmtldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjcmVhdGUgYSBQcml2YXRlIChpbnZpdGUtb25seSkgbWFya2V0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBxdWVzdGlvbjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcXVlc3Rpb24nIH0sXG4gICAgICAgIGNsb3NpbmdfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBjbG9zaW5nIHRpbWUnIH0sXG4gICAgICAgIHJlc29sdXRpb25fdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSByZXNvbHV0aW9uIHRpbWUgKG9wdGlvbmFsKScgfSxcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICAgIGludml0ZV9oYXNoOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ09wdGlvbmFsIGludml0ZSBoYXNoIGZvciByZXN0cmljdGVkIGFjY2VzcycgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydxdWVzdGlvbicsICdjbG9zaW5nX3RpbWUnLCAnY3JlYXRvcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NyZWF0ZV9yYWNlX21hcmtldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjcmVhdGUgYSBSYWNlIChtdWx0aS1vdXRjb21lKSBtYXJrZXQgd2l0aCAyLTEwIG91dGNvbWVzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBxdWVzdGlvbjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcXVlc3Rpb24nIH0sXG4gICAgICAgIG91dGNvbWVzOiB7XG4gICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXJyYXkgb2YgMi0xMCBvdXRjb21lIGxhYmVscycsXG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NpbmdfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBjbG9zaW5nIHRpbWUnIH0sXG4gICAgICAgIHJlc29sdXRpb25fdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSByZXNvbHV0aW9uIHRpbWUgKG9wdGlvbmFsKScgfSxcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncXVlc3Rpb24nLCAnb3V0Y29tZXMnLCAnY2xvc2luZ190aW1lJywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfY3JlYXRpb25fZmVlcycsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgbWFya2V0IGNyZWF0aW9uIGZlZXMgZm9yIGFsbCBsYXllcnMgKE9mZmljaWFsLCBMYWIsIFByaXZhdGUpLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge30sXG4gICAgICByZXF1aXJlZDogW10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfcGxhdGZvcm1fZmVlcycsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgcGxhdGZvcm0gZmVlIHJhdGVzIGZvciBhbGwgbGF5ZXJzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge30sXG4gICAgICByZXF1aXJlZDogW10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfdGltaW5nX3J1bGVzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCB2Ny4yIHRpbWluZyBydWxlcyBhbmQgY29uc3RyYWludHMgZm9yIG1hcmtldCBjcmVhdGlvbi4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X3BhcmltdXR1ZWxfcnVsZXMnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IHY3LjIgcGFyaW11dHVlbCBydWxlcyBmb3IgTGFiIG1hcmtldCBjcmVhdGlvbi4gQ1JJVElDQUw6IFJlYWQgdGhpcyBCRUZPUkUgY3JlYXRpbmcgYW55IG1hcmtldC4gQ29udGFpbnMgYmxvY2tlZCB0ZXJtcywgcmVxdWlyZWQgZGF0YSBzb3VyY2VzLCBhbmQgdmFsaWRhdGlvbiBydWxlcyB0aGF0IHdpbGwgUkVKRUNUIGludmFsaWQgbWFya2V0cy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAndmFsaWRhdGVfbWFya2V0X3F1ZXN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ1ZhbGlkYXRlIGEgbWFya2V0IHF1ZXN0aW9uIGFnYWluc3QgdjcuMiBydWxlcyBCRUZPUkUgYXR0ZW1wdGluZyB0byBjcmVhdGUgaXQuIFJldHVybnMgd2hldGhlciB0aGUgcXVlc3Rpb24gd291bGQgYmUgYmxvY2tlZCBhbmQgd2h5LiBJTVBPUlRBTlQ6IFlvdSBNVVNUIHByb3ZpZGUgY2xvc2luZ190aW1lIGFuZCBlaXRoZXIgZXZlbnRfdGltZSAoVHlwZSBBKSBvciBtZWFzdXJlbWVudF9zdGFydCAoVHlwZSBCKSBmb3IgYWNjdXJhdGUgdGltaW5nIHZhbGlkYXRpb24uIFdpdGhvdXQgdGltaW5nIHBhcmFtcywgbWFueSBpbnZhbGlkIG1hcmtldHMgd2lsbCBwYXNzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBxdWVzdGlvbjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcXVlc3Rpb24gdG8gdmFsaWRhdGUnIH0sXG4gICAgICAgIGxheWVyOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ2xhYicsICdwcml2YXRlJ10sIGRlc2NyaXB0aW9uOiAnTWFya2V0IGxheWVyIChkZWZhdWx0OiBsYWIpJyB9LFxuICAgICAgICBjbG9zaW5nX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgd2hlbiBiZXR0aW5nIGNsb3NlcyAoUkVRVUlSRUQgZm9yIHRpbWluZyB2YWxpZGF0aW9uKScgfSxcbiAgICAgICAgbWFya2V0X3R5cGU6IHsgdHlwZTogJ3N0cmluZycsIGVudW06IFsnZXZlbnQnLCAnbWVhc3VyZW1lbnQnXSwgZGVzY3JpcHRpb246ICdUeXBlIEEgKGV2ZW50KSBvciBUeXBlIEIgKG1lYXN1cmVtZW50KScgfSxcbiAgICAgICAgZXZlbnRfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBldmVudCB0aW1lIOKAlCBSRVFVSVJFRCBmb3IgVHlwZSBBIChzY2hlZHVsZWQgZXZlbnQpIG1hcmtldHMnIH0sXG4gICAgICAgIG1lYXN1cmVtZW50X3N0YXJ0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lTTyA4NjAxIG1lYXN1cmVtZW50IHN0YXJ0IOKAlCBSRVFVSVJFRCBmb3IgVHlwZSBCIChtZWFzdXJlbWVudCBwZXJpb2QpIG1hcmtldHMnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncXVlc3Rpb24nXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dlbmVyYXRlX2ludml0ZV9oYXNoJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dlbmVyYXRlIGEgcmFuZG9tIGludml0ZSBoYXNoIGZvciBwcml2YXRlIG1hcmtldCBhY2Nlc3MgY29udHJvbC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQT1NJVElPTiAmIENMQUlNU1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnZ2V0X3Bvc2l0aW9ucycsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgYWxsIGJldHRpbmcgcG9zaXRpb25zIGZvciBhIHdhbGxldCBpbmNsdWRpbmcgd2luL2xvc3Mgc3RhdHMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHdhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTb2xhbmEgd2FsbGV0IGFkZHJlc3MnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfY2xhaW1hYmxlJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBhbGwgY2xhaW1hYmxlIHdpbm5pbmdzIGFuZCByZWZ1bmRzIGZvciBhIHdhbGxldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1NvbGFuYSB3YWxsZXQgYWRkcmVzcycgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWyd3YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUkVTT0xVVElPTiAmIERJU1BVVEVTXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdnZXRfcmVzb2x1dGlvbl9zdGF0dXMnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IHJlc29sdXRpb24gc3RhdHVzIGZvciBhIG1hcmtldCAocmVzb2x2ZWQsIGRpc3B1dGVkLCBwZW5kaW5nKS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X2Rpc3B1dGVkX21hcmtldHMnLFxuICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgbWFya2V0cyBjdXJyZW50bHkgdW5kZXIgZGlzcHV0ZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X21hcmtldHNfYXdhaXRpbmdfcmVzb2x1dGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdMaXN0IGFsbCBjbG9zZWQgbWFya2V0cyBhd2FpdGluZyByZXNvbHV0aW9uLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge30sXG4gICAgICByZXF1aXJlZDogW10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEFJIEFHRU5UIEFGRklMSUFURSBORVRXT1JLXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdjaGVja19hZmZpbGlhdGVfY29kZScsXG4gICAgZGVzY3JpcHRpb246ICdDaGVjayBpZiBhbiBhZmZpbGlhdGUgY29kZSBpcyBhdmFpbGFibGUgZm9yIHJlZ2lzdHJhdGlvbi4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBZmZpbGlhdGUgY29kZSB0byBjaGVjayAoMy0xNiBhbHBoYW51bWVyaWMgY2hhcnMpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ3N1Z2dlc3RfYWZmaWxpYXRlX2NvZGVzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dlbmVyYXRlIHN1Z2dlc3RlZCBhZmZpbGlhdGUgY29kZXMgYmFzZWQgb24gYWdlbnQgbmFtZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgYWdlbnROYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05hbWUgb2YgdGhlIEFJIGFnZW50JyB9LFxuICAgICAgICBjb3VudDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdOdW1iZXIgb2Ygc3VnZ2VzdGlvbnMgKGRlZmF1bHQgNSknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnYWdlbnROYW1lJ10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfYWZmaWxpYXRlX2luZm8nLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IGFmZmlsaWF0ZSBhY2NvdW50IGluZm8gYnkgY29kZS4gU2hvd3MgZWFybmluZ3MsIHJlZmVycmFscywgc3RhdHVzLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBjb2RlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0FmZmlsaWF0ZSBjb2RlJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9teV9hZmZpbGlhdGVzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBhbGwgYWZmaWxpYXRlIGFjY291bnRzIG93bmVkIGJ5IGEgd2FsbGV0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICB3YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnV2FsbGV0IGFkZHJlc3MnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfcmVmZXJyYWxzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBhbGwgdXNlcnMgcmVmZXJyZWQgYnkgYW4gYWZmaWxpYXRlIGNvZGUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNvZGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQWZmaWxpYXRlIGNvZGUnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnY29kZSddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X2FnZW50X25ldHdvcmtfc3RhdHMnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IG92ZXJhbGwgQUkgYWdlbnQgYWZmaWxpYXRlIG5ldHdvcmsgc3RhdGlzdGljcy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZm9ybWF0X2FmZmlsaWF0ZV9saW5rJyxcbiAgICBkZXNjcmlwdGlvbjogJ0Zvcm1hdCBhbiBhZmZpbGlhdGUgcmVmZXJyYWwgbGluayBmb3Igc2hhcmluZy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBZmZpbGlhdGUgY29kZScgfSxcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ09wdGlvbmFsIG1hcmtldCBwdWJsaWMga2V5IGZvciBkZWVwIGxpbmsnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnY29kZSddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X2NvbW1pc3Npb25faW5mbycsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgYWZmaWxpYXRlIGNvbW1pc3Npb24gc3RydWN0dXJlIGFuZCBleGFtcGxlcy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2VuZXJhdGVfc2hhcmVfY2FyZCcsXG4gICAgZGVzY3JpcHRpb246ICdHZW5lcmF0ZSBhIHNoYXJlIGNhcmQgaW1hZ2UgVVJMIGZvciBhIG1hcmtldC4gUmV0dXJucyBhIFBORyBVUkwgKDEyMDB4NjMwKSBzaG93aW5nIG1hcmtldCBvZGRzLCBvcHRpb25hbCBwb3NpdGlvbiBkYXRhLCBhbmQgYWZmaWxpYXRlIGJyYW5kaW5nLiBVc2UgdGhpcyB0byBjcmVhdGUgdmlyYWwgc29jaWFsIG1lZGlhIHBvc3RzIOKAlCBlbWJlZCB0aGUgaW1hZ2UgaW4gdHdlZXRzLCBUZWxlZ3JhbSBtZXNzYWdlcywgQWdlbnRCb29rIHBvc3RzLCBvciBEaXNjb3JkIGVtYmVkcy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5IChTb2xhbmEgUERBKScgfSxcbiAgICAgICAgd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ09wdGlvbmFsOiB3YWxsZXQgcHVibGljIGtleSB0byBzaG93IHBvc2l0aW9uICsgcG90ZW50aWFsIHBheW91dCBvbiB0aGUgY2FyZCcgfSxcbiAgICAgICAgcmVmOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ09wdGlvbmFsOiBhZmZpbGlhdGUgcmVmZXJyYWwgY29kZSB0byBkaXNwbGF5IG9uIHRoZSBjYXJkJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBWQUxJREFUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICd2YWxpZGF0ZV9tYXJrZXRfcGFyYW1zJyxcbiAgICBkZXNjcmlwdGlvbjogJ1ZhbGlkYXRlIG1hcmtldCBwYXJhbWV0ZXJzIGFnYWluc3QgdjcuMiB0aW1pbmcgcnVsZXMuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHF1ZXN0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBxdWVzdGlvbiAobWF4IDIwMCBjaGFycyknIH0sXG4gICAgICAgIGNsb3NpbmdfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBjbG9zaW5nIHRpbWUnIH0sXG4gICAgICAgIG1hcmtldF90eXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ2V2ZW50JywgJ21lYXN1cmVtZW50J10sIGRlc2NyaXB0aW9uOiAnTWFya2V0IHR5cGUnIH0sXG4gICAgICAgIGV2ZW50X3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgZXZlbnQgdGltZSAoZm9yIGV2ZW50IG1hcmtldHMpJyB9LFxuICAgICAgICBtZWFzdXJlbWVudF9zdGFydDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJU08gODYwMSBtZWFzdXJlbWVudCBzdGFydCAoZm9yIG1lYXN1cmVtZW50IG1hcmtldHMpJyB9LFxuICAgICAgICBtZWFzdXJlbWVudF9lbmQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSVNPIDg2MDEgbWVhc3VyZW1lbnQgZW5kIChvcHRpb25hbCknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncXVlc3Rpb24nLCAnY2xvc2luZ190aW1lJywgJ21hcmtldF90eXBlJ10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICd2YWxpZGF0ZV9iZXQnLFxuICAgIGRlc2NyaXB0aW9uOiAnVmFsaWRhdGUgYmV0IHBhcmFtZXRlcnMgYmVmb3JlIGJ1aWxkaW5nIHRyYW5zYWN0aW9uLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGFtb3VudDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdCZXQgYW1vdW50IGluIFNPTCcgfSxcbiAgICAgICAgc2lkZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydZZXMnLCAnTm8nXSwgZGVzY3JpcHRpb246ICdTaWRlIHRvIGJldCBvbicgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnYW1vdW50JywgJ3NpZGUnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBCRVRTXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdidWlsZF9iZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdW5zaWduZWQgdHJhbnNhY3Rpb24gZm9yIHBsYWNpbmcgYSBiZXQgb24gYSBib29sZWFuIChZRVMvTk8pIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBvdXRjb21lOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ3llcycsICdubyddLCBkZXNjcmlwdGlvbjogJ091dGNvbWUgdG8gYmV0IG9uJyB9LFxuICAgICAgICBhbW91bnRfc29sOiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0JldCBhbW91bnQgaW4gU09MJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBhZmZpbGlhdGVfY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdPcHRpb25hbCBhZmZpbGlhdGUgY29kZSBmb3IgY29tbWlzc2lvbicgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnb3V0Y29tZScsICdhbW91bnRfc29sJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9yYWNlX2JldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiBmb3IgcGxhY2luZyBhIGJldCBvbiBhIHJhY2UgKG11bHRpLW91dGNvbWUpIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIG91dGNvbWVfaW5kZXg6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnSW5kZXggb2Ygb3V0Y29tZSB0byBiZXQgb24nIH0sXG4gICAgICAgIGFtb3VudF9zb2w6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnQmV0IGFtb3VudCBpbiBTT0wnIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VzZXIgd2FsbGV0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGFmZmlsaWF0ZV9jb2RlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ09wdGlvbmFsIGFmZmlsaWF0ZSBjb2RlJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdvdXRjb21lX2luZGV4JywgJ2Ftb3VudF9zb2wnLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBDTEFJTVNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NsYWltX3dpbm5pbmdzX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIGNsYWltIHdpbm5pbmdzIGZyb20gYSByZXNvbHZlZCBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgcG9zaXRpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUG9zaXRpb24gUERBJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAncG9zaXRpb24nLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NsYWltX3JlZnVuZF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjbGFpbSByZWZ1bmQgZnJvbSBjYW5jZWxsZWQvaW52YWxpZCBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgcG9zaXRpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUG9zaXRpb24gUERBJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAncG9zaXRpb24nLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2JhdGNoX2NsYWltX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHNpbmdsZSB0cmFuc2FjdGlvbiB0byBjbGFpbSBtdWx0aXBsZSBwb3NpdGlvbnMgYXQgb25jZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY2xhaW1zOiB7XG4gICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICBpdGVtczoge1xuICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICBwb3NpdGlvbjogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICB0eXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ3dpbm5pbmdzJywgJ3JlZnVuZCddIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdBcnJheSBvZiBjbGFpbXMgdG8gYmF0Y2gnLFxuICAgICAgICB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydjbGFpbXMnLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NsYWltX2FmZmlsaWF0ZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjbGFpbSBhZmZpbGlhdGUgZWFybmluZ3MuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNvZGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQWZmaWxpYXRlIGNvZGUnIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0FmZmlsaWF0ZSBvd25lciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnY29kZScsICd1c2VyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBUUkFOU0FDVElPTiBCVUlMRElORyAtIFJBQ0UgQ0xBSU1TXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdidWlsZF9jbGFpbV9yYWNlX3dpbm5pbmdzX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIGNsYWltIHdpbm5pbmdzIGZyb20gYSByZXNvbHZlZCByYWNlIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgcG9zaXRpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBwb3NpdGlvbiBQREEnIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VzZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ3Bvc2l0aW9uJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jbGFpbV9yYWNlX3JlZnVuZF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB1bnNpZ25lZCB0cmFuc2FjdGlvbiB0byBjbGFpbSByZWZ1bmQgZnJvbSBjYW5jZWxsZWQgcmFjZSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHBvc2l0aW9uOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgcG9zaXRpb24gUERBJyB9LFxuICAgICAgICB1c2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICdwb3NpdGlvbicsICd1c2VyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBUUkFOU0FDVElPTiBCVUlMRElORyAtIEFGRklMSUFURVxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfcmVnaXN0ZXJfYWZmaWxpYXRlX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHVuc2lnbmVkIHRyYW5zYWN0aW9uIHRvIHJlZ2lzdGVyIGFzIGFuIGFmZmlsaWF0ZSB3aXRoIGEgdW5pcXVlIGNvZGUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNvZGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQWZmaWxpYXRlIGNvZGUgKDMtMTYgYWxwaGFudW1lcmljIGNoYXJzKScgfSxcbiAgICAgICAgdXNlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnT3duZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3RvZ2dsZV9hZmZpbGlhdGVfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQURNSU4gT05MWTogQnVpbGQgdHJhbnNhY3Rpb24gdG8gYWN0aXZhdGUvZGVhY3RpdmF0ZSBhZmZpbGlhdGUuIFJlcXVpcmVzIHByb3RvY29sIGFkbWluIHNpZ25hdHVyZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY29kZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBZmZpbGlhdGUgY29kZScgfSxcbiAgICAgICAgYWN0aXZlOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdOZXcgYWN0aXZlIHN0YXR1cycgfSxcbiAgICAgICAgdXNlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnT3duZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NvZGUnLCAnYWN0aXZlJywgJ3VzZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFNJTVVMQVRJT05cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ3NpbXVsYXRlX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ1NpbXVsYXRlIGEgdHJhbnNhY3Rpb24gYmVmb3JlIHNpZ25pbmcgdG8gY2hlY2sgZm9yIGVycm9ycy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgdHJhbnNhY3Rpb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQmFzZTY0LWVuY29kZWQgdHJhbnNhY3Rpb24nIH0sXG4gICAgICAgIHVzZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VzZXIgd2FsbGV0IHB1YmxpYyBrZXknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsndHJhbnNhY3Rpb24nLCAndXNlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUkVTT0xVVElPTiBTWVNURU1cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3Byb3Bvc2VfcmVzb2x1dGlvbl90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiBmb3IgY3JlYXRvciB0byBwcm9wb3NlIG1hcmtldCBvdXRjb21lLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIG91dGNvbWU6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ1Byb3Bvc2VkIG91dGNvbWUgKHRydWU9WWVzLCBmYWxzZT1ObyknIH0sXG4gICAgICAgIHByb3Bvc2VyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQcm9wb3NlciB3YWxsZXQgKGNyZWF0b3IpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdvdXRjb21lJywgJ3Byb3Bvc2VyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfcmVzb2x2ZV9tYXJrZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gZGlyZWN0bHkgcmVzb2x2ZSBhIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBvdXRjb21lOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdXaW5uaW5nIG91dGNvbWUgKHRydWU9WWVzLCBmYWxzZT1ObyknIH0sXG4gICAgICAgIHJlc29sdmVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSZXNvbHZlciB3YWxsZXQgKGNyZWF0b3Ivb3JhY2xlKScgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnLCAnb3V0Y29tZScsICdyZXNvbHZlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2ZpbmFsaXplX3Jlc29sdXRpb25fdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gZmluYWxpemUgcmVzb2x1dGlvbiBhZnRlciBkaXNwdXRlIHdpbmRvdy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBjYWxsZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NhbGxlciB3YWxsZXQgKGFueW9uZSBjYW4gZmluYWxpemUpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdjYWxsZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9wcm9wb3NlX3JhY2VfcmVzb2x1dGlvbl90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBwcm9wb3NlIHJhY2UgbWFya2V0IG91dGNvbWUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHdpbm5pbmdfb3V0Y29tZV9pbmRleDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdJbmRleCBvZiB3aW5uaW5nIG91dGNvbWUgKDAtYmFzZWQpJyB9LFxuICAgICAgICBwcm9wb3Nlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJvcG9zZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ3dpbm5pbmdfb3V0Y29tZV9pbmRleCcsICdwcm9wb3Nlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX3Jlc29sdmVfcmFjZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBkaXJlY3RseSByZXNvbHZlIGEgcmFjZSBtYXJrZXQuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHdpbm5pbmdfb3V0Y29tZV9pbmRleDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdJbmRleCBvZiB3aW5uaW5nIG91dGNvbWUnIH0sXG4gICAgICAgIHJlc29sdmVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSZXNvbHZlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAnd2lubmluZ19vdXRjb21lX2luZGV4JywgJ3Jlc29sdmVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfZmluYWxpemVfcmFjZV9yZXNvbHV0aW9uX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIGZpbmFsaXplIHJhY2UgcmVzb2x1dGlvbi4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgY2FsbGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDYWxsZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ2NhbGxlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gRElTUFVURVNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2ZsYWdfZGlzcHV0ZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjaGFsbGVuZ2UgYSBwcm9wb3NlZCByZXNvbHV0aW9uIHdpdGggYSBib25kLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGRpc3B1dGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdEaXNwdXRlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ2Rpc3B1dGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfZmxhZ19yYWNlX2Rpc3B1dGVfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gZGlzcHV0ZSBhIHJhY2UgbWFya2V0IHJlc29sdXRpb24uJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIGRpc3B1dGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdEaXNwdXRlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAnZGlzcHV0ZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF92b3RlX2NvdW5jaWxfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gZm9yIGNvdW5jaWwgbWVtYmVyIHRvIHZvdGUgb24gZGlzcHV0ZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICB2b3RlX3llczogeyB0eXBlOiAnYm9vbGVhbicsIGRlc2NyaXB0aW9uOiAnVm90ZSBmb3IgWWVzIG91dGNvbWUnIH0sXG4gICAgICAgIHZvdGVyX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDb3VuY2lsIG1lbWJlciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ3ZvdGVfeWVzJywgJ3ZvdGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfdm90ZV9jb3VuY2lsX3JhY2VfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gZm9yIGNvdW5jaWwgdG8gdm90ZSBvbiByYWNlIGRpc3B1dGUuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhY2VfbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JhY2UgbWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHZvdGVfb3V0Y29tZV9pbmRleDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdPdXRjb21lIGluZGV4IHRvIHZvdGUgZm9yJyB9LFxuICAgICAgICB2b3Rlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ291bmNpbCBtZW1iZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ3ZvdGVfb3V0Y29tZV9pbmRleCcsICd2b3Rlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2NoYW5nZV9jb3VuY2lsX3ZvdGVfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gZm9yIGNvdW5jaWwgbWVtYmVyIHRvIGNoYW5nZSB0aGVpciB2b3RlIG9uIGEgYm9vbGVhbiBtYXJrZXQgZGlzcHV0ZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBuZXdfdm90ZV95ZXM6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ05ldyB2b3RlICh0cnVlPVlFUywgZmFsc2U9Tk8pJyB9LFxuICAgICAgICB2b3Rlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ291bmNpbCBtZW1iZXIgd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICduZXdfdm90ZV95ZXMnLCAndm90ZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jaGFuZ2VfY291bmNpbF92b3RlX3JhY2VfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gZm9yIGNvdW5jaWwgbWVtYmVyIHRvIGNoYW5nZSB0aGVpciB2b3RlIG9uIGEgcmFjZSBtYXJrZXQgZGlzcHV0ZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgbmV3X3ZvdGVfb3V0Y29tZV9pbmRleDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdOZXcgb3V0Y29tZSBpbmRleCB0byB2b3RlIGZvcicgfSxcbiAgICAgICAgdm90ZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NvdW5jaWwgbWVtYmVyIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICduZXdfdm90ZV9vdXRjb21lX2luZGV4JywgJ3ZvdGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBXSElURUxJU1QgTUFOQUdFTUVOVFxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfYWRkX3RvX3doaXRlbGlzdF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBhZGQgdXNlciB0byBwcml2YXRlIG1hcmtldCB3aGl0ZWxpc3QuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgdXNlcl90b19hZGQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVXNlciB3YWxsZXQgdG8gd2hpdGVsaXN0JyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgY3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ3VzZXJfdG9fYWRkJywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9yZW1vdmVfZnJvbV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gcmVtb3ZlIHVzZXIgZnJvbSB3aGl0ZWxpc3QuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgdXNlcl90b19yZW1vdmU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVXNlciB3YWxsZXQgdG8gcmVtb3ZlJyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgY3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ3VzZXJfdG9fcmVtb3ZlJywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jcmVhdGVfcmFjZV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gY3JlYXRlIHdoaXRlbGlzdCBmb3IgcHJpdmF0ZSByYWNlIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IGNyZWF0b3Igd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9hZGRfdG9fcmFjZV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gYWRkIHVzZXIgdG8gcmFjZSBtYXJrZXQgd2hpdGVsaXN0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICB1c2VyX3RvX2FkZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVc2VyIHdhbGxldCB0byB3aGl0ZWxpc3QnIH0sXG4gICAgICAgIGNyZWF0b3Jfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBjcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydyYWNlX21hcmtldCcsICd1c2VyX3RvX2FkZCcsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfcmVtb3ZlX2Zyb21fcmFjZV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gcmVtb3ZlIHVzZXIgZnJvbSByYWNlIHdoaXRlbGlzdC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgdXNlcl90b19yZW1vdmU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVXNlciB3YWxsZXQgdG8gcmVtb3ZlJyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgY3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAndXNlcl90b19yZW1vdmUnLCAnY3JlYXRvcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQ1JFQVRPUiBQUk9GSUxFU1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY3JlYXRlX2NyZWF0b3JfcHJvZmlsZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjcmVhdGUgb24tY2hhaW4gY3JlYXRvciBwcm9maWxlLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBkaXNwbGF5X25hbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRGlzcGxheSBuYW1lIChtYXggMzIgY2hhcnMpJyB9LFxuICAgICAgICBjcmVhdG9yX2ZlZV9icHM6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnQ3JlYXRvciBmZWUgaW4gYmFzaXMgcG9pbnRzIChtYXggNTApJyB9LFxuICAgICAgICBjcmVhdG9yX3dhbGxldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDcmVhdG9yIHdhbGxldCcgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydkaXNwbGF5X25hbWUnLCAnY3JlYXRvcl9mZWVfYnBzJywgJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF91cGRhdGVfY3JlYXRvcl9wcm9maWxlX3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0J1aWxkIHRyYW5zYWN0aW9uIHRvIHVwZGF0ZSBjcmVhdG9yIHByb2ZpbGUuIEJvdGggZGlzcGxheV9uYW1lIGFuZCBkZWZhdWx0X2ZlZV9icHMgYXJlIHJlcXVpcmVkLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBkaXNwbGF5X25hbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRGlzcGxheSBuYW1lIChtYXggMzIgY2hhcnMpJyB9LFxuICAgICAgICBkZWZhdWx0X2ZlZV9icHM6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnRGVmYXVsdCBmZWUgaW4gYmFzaXMgcG9pbnRzIChtYXggNTAgPSAwLjUlKScgfSxcbiAgICAgICAgY3JlYXRvcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ3JlYXRvciB3YWxsZXQnIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnZGlzcGxheV9uYW1lJywgJ2RlZmF1bHRfZmVlX2JwcycsICdjcmVhdG9yX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY2xhaW1fY3JlYXRvcl90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjbGFpbSBhY2N1bXVsYXRlZCBjcmVhdG9yIGZlZXMgZnJvbSBzb2xfdHJlYXN1cnkuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNyZWF0b3Jfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NyZWF0b3Igd2FsbGV0JyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ2NyZWF0b3Jfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIE1BUktFVCBNQU5BR0VNRU5UXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdidWlsZF9jbG9zZV9tYXJrZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gY2xvc2UgYmV0dGluZyBvbiBhIG1hcmtldC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBjYWxsZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NhbGxlciB3YWxsZXQgKGNyZWF0b3IpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCcsICdjYWxsZXJfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9leHRlbmRfbWFya2V0X3RyYW5zYWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0FETUlOIE9OTFk6IEJ1aWxkIHRyYW5zYWN0aW9uIHRvIGV4dGVuZCBtYXJrZXQgZGVhZGxpbmUuIFJlcXVpcmVzIHByb3RvY29sIGFkbWluIHNpZ25hdHVyZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBuZXdfY2xvc2luZ190aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05ldyBjbG9zaW5nIHRpbWUgKElTTyA4NjAxKScgfSxcbiAgICAgICAgbmV3X3Jlc29sdXRpb25fdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOZXcgcmVzb2x1dGlvbiB0aW1lIChvcHRpb25hbCknIH0sXG4gICAgICAgIGNhbGxlcl93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ2FsbGVyIHdhbGxldCAoY3JlYXRvciknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ25ld19jbG9zaW5nX3RpbWUnLCAnY2FsbGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY2xvc2VfcmFjZV9tYXJrZXRfdHJhbnNhY3Rpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgdHJhbnNhY3Rpb24gdG8gY2xvc2UgYmV0dGluZyBvbiBhIHJhY2UgbWFya2V0LicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBjYWxsZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NhbGxlciB3YWxsZXQgKGNyZWF0b3IpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ2NhbGxlcl93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2J1aWxkX2V4dGVuZF9yYWNlX21hcmtldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdBRE1JTiBPTkxZOiBCdWlsZCB0cmFuc2FjdGlvbiB0byBleHRlbmQgcmFjZSBtYXJrZXQgZGVhZGxpbmUuIFJlcXVpcmVzIHByb3RvY29sIGFkbWluIHNpZ25hdHVyZS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcmFjZV9tYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmFjZSBtYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgbmV3X2Nsb3NpbmdfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOZXcgY2xvc2luZyB0aW1lIChJU08gODYwMSknIH0sXG4gICAgICAgIG5ld19yZXNvbHV0aW9uX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTmV3IHJlc29sdXRpb24gdGltZSAob3B0aW9uYWwpJyB9LFxuICAgICAgICBjYWxsZXJfd2FsbGV0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NhbGxlciB3YWxsZXQgKGNyZWF0b3IpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3JhY2VfbWFya2V0JywgJ25ld19jbG9zaW5nX3RpbWUnLCAnY2FsbGVyX3dhbGxldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnYnVpbGRfY2FuY2VsX21hcmtldF90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjYW5jZWwgYSBib29sZWFuIG1hcmtldC4gQWxsIGJldHRvcnMgY2FuIGNsYWltIHJlZnVuZHMgYWZ0ZXIgY2FuY2VsbGF0aW9uLiBPbmx5IGNyZWF0b3Igb3IgYWRtaW4gY2FuIGNhbmNlbC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICByZWFzb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmVhc29uIGZvciBjYW5jZWxsYXRpb24nIH0sXG4gICAgICAgIGF1dGhvcml0eV93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQXV0aG9yaXR5IHdhbGxldCAoY3JlYXRvciBvciBhZG1pbiknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0JywgJ3JlYXNvbicsICdhdXRob3JpdHlfd2FsbGV0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdidWlsZF9jYW5jZWxfcmFjZV90cmFuc2FjdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdCdWlsZCB0cmFuc2FjdGlvbiB0byBjYW5jZWwgYSByYWNlIG1hcmtldC4gQWxsIGJldHRvcnMgY2FuIGNsYWltIHJlZnVuZHMgYWZ0ZXIgY2FuY2VsbGF0aW9uLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICByYWNlX21hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdSYWNlIG1hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICByZWFzb246IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmVhc29uIGZvciBjYW5jZWxsYXRpb24nIH0sXG4gICAgICAgIGF1dGhvcml0eV93YWxsZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQXV0aG9yaXR5IHdhbGxldCAoY3JlYXRvciBvciBhZG1pbiknIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsncmFjZV9tYXJrZXQnLCAncmVhc29uJywgJ2F1dGhvcml0eV93YWxsZXQnXSxcbiAgICB9LFxuICB9LFxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQVJFTkEgKEFnZW50IENvbXBldGl0aXZlIFNjb3JpbmcpXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdnZXRfYXJlbmFfbGVhZGVyYm9hcmQnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IHRoZSBjdXJyZW50IEFnZW50IEFyZW5hIHdlZWtseSBsZWFkZXJib2FyZCB3aXRoIGNhbGlicmF0aW9uLWJhc2VkIHNjb3JpbmcuIFNob3dzIHRvcCBwcmVkaWN0b3JzIHJhbmtlZCBieSBjb21wb3NpdGUgc2NvcmUgKGNhbGlicmF0aW9uIDQwJSwgUk9JIDMwJSwgdm9sdW1lIDE1JSwgY29uc2lzdGVuY3kgMTUlKS4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgcGFwZXI6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ0lmIHRydWUsIHNob3cgcGFwZXIgdHJhZGluZyBsZWFkZXJib2FyZCBpbnN0ZWFkIG9mIHJlYWwgYmV0cycgfSxcbiAgICAgICAgbGltaXQ6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnTnVtYmVyIG9mIGVudHJpZXMgdG8gcmV0dXJuIChkZWZhdWx0IDUwLCBtYXggMTAwKScgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfYXJlbmFfc2Vhc29uJyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBBZ2VudCBBcmVuYSByZXN1bHRzIGZvciBhIHNwZWNpZmljIHBhc3Qgc2Vhc29uIGJ5IElELicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBzZWFzb25faWQ6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnU2Vhc29uIElEJyB9LFxuICAgICAgICBwYXBlcjogeyB0eXBlOiAnYm9vbGVhbicsIGRlc2NyaXB0aW9uOiAnSWYgdHJ1ZSwgc2hvdyBwYXBlciB0cmFkaW5nIGxlYWRlcmJvYXJkJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3NlYXNvbl9pZCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnc3VibWl0X3BhcGVyX3RyYWRlJyxcbiAgICBkZXNjcmlwdGlvbjogJ1N1Ym1pdCBhIHBhcGVyIChzaW11bGF0ZWQpIHByZWRpY3Rpb24gdG8gdGhlIEFnZW50IEFyZW5hLiBObyBTT0wgcmVxdWlyZWQuIFNjb3JlZCBvbiBjYWxpYnJhdGlvbiBhY2N1cmFjeSB3aGVuIG1hcmtldCByZXNvbHZlcy4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgd2FsbGV0X2FkZHJlc3M6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnWW91ciB3YWxsZXQgYWRkcmVzcycgfSxcbiAgICAgICAgbWFya2V0X3BkYTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleSB0byBwcmVkaWN0IG9uJyB9LFxuICAgICAgICBwcmVkaWN0ZWRfc2lkZTogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydZRVMnLCAnTk8nXSwgZGVzY3JpcHRpb246ICdZb3VyIHByZWRpY3Rpb24nIH0sXG4gICAgICAgIGNvbmZpZGVuY2U6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnQ29uZmlkZW5jZSBsZXZlbCAwLjAxLTAuOTkgKGUuZy4gMC43NSA9IDc1JSBjb25maWRlbnQpJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ3dhbGxldF9hZGRyZXNzJywgJ21hcmtldF9wZGEnLCAncHJlZGljdGVkX3NpZGUnLCAnY29uZmlkZW5jZSddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBJTlRFTCAoeDQwMiBQcmVtaXVtIE1hcmtldCBJbnRlbGxpZ2VuY2UpXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAge1xuICAgIG5hbWU6ICdnZXRfaW50ZWxfc2VudGltZW50JyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCBtYXJrZXQgc2VudGltZW50IGFuYWx5c2lzIGluY2x1ZGluZyBjb21tZW50IHNlbnRpbWVudCwgYmV0IG1vbWVudHVtLCBhbmQgcG9vbCB0cmVuZHMuIENvc3RzIDAuMDAxIFNPTCB2aWEgeDQwMiBwYXltZW50IHByb3RvY29sLicsXG4gICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgIHR5cGU6ICdvYmplY3QnIGFzIGNvbnN0LFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBtYXJrZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWFya2V0IHB1YmxpYyBrZXknIH0sXG4gICAgICAgIHBheW1lbnRfdHg6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUGF5bWVudCB0cmFuc2FjdGlvbiBzaWduYXR1cmUgKGJhc2U1OCkuIE9taXQgdG8gZ2V0IHByaWNpbmcgaW5mby4nIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFsnbWFya2V0J10sXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdnZXRfaW50ZWxfd2hhbGVfbW92ZXMnLFxuICAgIGRlc2NyaXB0aW9uOiAnR2V0IHdoYWxlIHBvc2l0aW9uIGRhdGEgZm9yIGEgbWFya2V0IChwb3NpdGlvbnMgPiAxIFNPTCwgd2hhbGUgc2VudGltZW50IHNwbGl0KS4gQ29zdHMgMC4wMDIgU09MIHZpYSB4NDAyIHBheW1lbnQgcHJvdG9jb2wuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgcGF5bWVudF90eDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQYXltZW50IHRyYW5zYWN0aW9uIHNpZ25hdHVyZSAoYmFzZTU4KS4gT21pdCB0byBnZXQgcHJpY2luZyBpbmZvLicgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnXSxcbiAgICB9LFxuICB9LFxuICB7XG4gICAgbmFtZTogJ2dldF9pbnRlbF9yZXNvbHV0aW9uX2ZvcmVjYXN0JyxcbiAgICBkZXNjcmlwdGlvbjogJ0dldCByZXNvbHV0aW9uIGZvcmVjYXN0IGluY2x1ZGluZyBjbG9zaW5nIHRpbWUsIHRpZXIsIGltcGxpZWQgcHJvYmFiaWxpdHksIGFuZCBwcmVkaWN0aW9uLiBDb3N0cyAwLjAwNSBTT0wgdmlhIHg0MDIgcGF5bWVudCBwcm90b2NvbC4nLFxuICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICB0eXBlOiAnb2JqZWN0JyBhcyBjb25zdCxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbWFya2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01hcmtldCBwdWJsaWMga2V5JyB9LFxuICAgICAgICBwYXltZW50X3R4OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1BheW1lbnQgdHJhbnNhY3Rpb24gc2lnbmF0dXJlIChiYXNlNTgpLiBPbWl0IHRvIGdldCBwcmljaW5nIGluZm8uJyB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbJ21hcmtldCddLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZ2V0X2ludGVsX21hcmtldF9hbHBoYScsXG4gICAgZGVzY3JpcHRpb246ICdHZXQgY3Jvc3MtbWFya2V0IGFscGhhIHNpZ25hbHMgaW5jbHVkaW5nIGNvcnJlbGF0aW9uIGFuYWx5c2lzLCBjYXRlZ29yeSBza2V3LCBhbmQgYWxwaGEgb3Bwb3J0dW5pdGllcy4gQ29zdHMgMC4wMDMgU09MIHZpYSB4NDAyIHBheW1lbnQgcHJvdG9jb2wuJyxcbiAgICBpbnB1dFNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcgYXMgY29uc3QsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIG1hcmtldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNYXJrZXQgcHVibGljIGtleScgfSxcbiAgICAgICAgcGF5bWVudF90eDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQYXltZW50IHRyYW5zYWN0aW9uIHNpZ25hdHVyZSAoYmFzZTU4KS4gT21pdCB0byBnZXQgcHJpY2luZyBpbmZvLicgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogWydtYXJrZXQnXSxcbiAgICB9LFxuICB9LFxuXTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFRPT0wgSEFORExFUlNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVUb29sKFxuICBuYW1lOiBzdHJpbmcsXG4gIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+XG4pOiBQcm9taXNlPHsgY29udGVudDogQXJyYXk8eyB0eXBlOiBzdHJpbmc7IHRleHQ6IHN0cmluZyB9PiB9PiB7XG4gIC8vIFNhZmUtbW9kZSBnYXRlOiBibG9jayB3cml0ZSB0b29scyB1bmxlc3MgQkFPWklfTElWRT0xXG4gIGlmIChXUklURV9UT09MUy5oYXMobmFtZSkgJiYgIUxJVkVfTU9ERSkge1xuICAgIHJldHVybiB7XG4gICAgICBjb250ZW50OiBbe1xuICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgIHRleHQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogJ1NBRkUgTU9ERTogV3JpdGUgdG9vbHMgYXJlIGRpc2FibGVkIGJ5IGRlZmF1bHQuIFNldCBCQU9aSV9MSVZFPTEgdG8gZW5hYmxlIHRyYW5zYWN0aW9uIGJ1aWxkaW5nLicsXG4gICAgICAgICAgdG9vbDogbmFtZSxcbiAgICAgICAgICBtb2RlOiAnc2FmZScsXG4gICAgICAgICAgY29uZmlnRXhhbXBsZToge1xuICAgICAgICAgICAgbWNwU2VydmVyczoge1xuICAgICAgICAgICAgICBiYW96aToge1xuICAgICAgICAgICAgICAgIGNvbW1hbmQ6ICducHgnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFsnQGJhb3ppLmJldC9tY3Atc2VydmVyJ10sXG4gICAgICAgICAgICAgICAgZW52OiB7XG4gICAgICAgICAgICAgICAgICBCQU9aSV9MSVZFOiAnMScsXG4gICAgICAgICAgICAgICAgICBCQU9aSV9NQVhfQkVUX1NPTDogJzEwJyxcbiAgICAgICAgICAgICAgICAgIEJBT1pJX0RBSUxZX0xJTUlUX1NPTDogJzUwJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlYWRPbmx5QWx0ZXJuYXRpdmVzOiBbXG4gICAgICAgICAgICAnbGlzdF9tYXJrZXRzJywgJ2dldF9tYXJrZXQnLCAnZ2V0X3F1b3RlJyxcbiAgICAgICAgICAgICdsaXN0X3JhY2VfbWFya2V0cycsICdnZXRfcmFjZV9tYXJrZXQnLCAnZ2V0X3JhY2VfcXVvdGUnLFxuICAgICAgICAgICAgJ2dldF9wb3NpdGlvbnMnLCAnZ2V0X2NsYWltYWJsZScsICd2YWxpZGF0ZV9iZXQnLCAndmFsaWRhdGVfbWFya2V0X3BhcmFtcycsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSwgbnVsbCwgMiksXG4gICAgICB9XSxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBzd2l0Y2ggKG5hbWUpIHtcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gTUFSS0VUIFJFQUQgT1BFUkFUSU9OU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdsaXN0X21hcmtldHMnOiB7XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IGFyZ3Muc3RhdHVzIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgbGF5ZXIgPSBhcmdzLmxheWVyIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IG1hcmtldHMgPSBhd2FpdCBsaXN0TWFya2V0cyhzdGF0dXMpO1xuICAgICAgICBpZiAobGF5ZXIpIHtcbiAgICAgICAgICBtYXJrZXRzID0gbWFya2V0cy5maWx0ZXIobSA9PiBtLmxheWVyLnRvTG93ZXJDYXNlKCkgPT09IGxheWVyLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIGNvdW50OiBtYXJrZXRzLmxlbmd0aCxcbiAgICAgICAgICBmaWx0ZXI6IHsgc3RhdHVzOiBzdGF0dXMgfHwgJ2FsbCcsIGxheWVyOiBsYXllciB8fCAnYWxsJyB9LFxuICAgICAgICAgIG1hcmtldHM6IG1hcmtldHMubWFwKG0gPT4gKHtcbiAgICAgICAgICAgIHB1YmxpY0tleTogbS5wdWJsaWNLZXksXG4gICAgICAgICAgICBtYXJrZXRJZDogbS5tYXJrZXRJZCxcbiAgICAgICAgICAgIHF1ZXN0aW9uOiBtLnF1ZXN0aW9uLFxuICAgICAgICAgICAgc3RhdHVzOiBtLnN0YXR1cyxcbiAgICAgICAgICAgIGxheWVyOiBtLmxheWVyLFxuICAgICAgICAgICAgd2lubmluZ091dGNvbWU6IG0ud2lubmluZ091dGNvbWUsXG4gICAgICAgICAgICB5ZXNQZXJjZW50OiBtLnllc1BlcmNlbnQsXG4gICAgICAgICAgICBub1BlcmNlbnQ6IG0ubm9QZXJjZW50LFxuICAgICAgICAgICAgdG90YWxQb29sU29sOiBtLnRvdGFsUG9vbFNvbCxcbiAgICAgICAgICAgIGNsb3NpbmdUaW1lOiBtLmNsb3NpbmdUaW1lLFxuICAgICAgICAgICAgaXNCZXR0aW5nT3BlbjogbS5pc0JldHRpbmdPcGVuLFxuICAgICAgICAgIH0pKSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9tYXJrZXQnOiB7XG4gICAgICAgIGNvbnN0IHB1YmxpY0tleSA9IGFyZ3MucHVibGljS2V5IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFwdWJsaWNLZXkpIHJldHVybiBlcnJvclJlc3BvbnNlKCdwdWJsaWNLZXkgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXdhaXQgZ2V0TWFya2V0KHB1YmxpY0tleSk7XG4gICAgICAgIGlmICghbWFya2V0KSByZXR1cm4gZXJyb3JSZXNwb25zZShgTWFya2V0ICR7cHVibGljS2V5fSBub3QgZm91bmRgKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IG1hcmtldCB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X3F1b3RlJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHNpZGUgPSBhcmdzLnNpZGUgYXMgJ1llcycgfCAnTm8nO1xuICAgICAgICBjb25zdCBhbW91bnQgPSBhcmdzLmFtb3VudCBhcyBudW1iZXI7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICFzaWRlIHx8IGFtb3VudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgc2lkZSwgYW5kIGFtb3VudCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBxdW90ZSA9IGF3YWl0IGdldFF1b3RlKG1hcmtldCwgc2lkZSwgYW1vdW50KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHF1b3RlIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFJBQ0UgTUFSS0VUU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdsaXN0X3JhY2VfbWFya2V0cyc6IHtcbiAgICAgICAgY29uc3Qgc3RhdHVzID0gYXJncy5zdGF0dXMgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBtYXJrZXRzID0gYXdhaXQgbGlzdFJhY2VNYXJrZXRzKHN0YXR1cyk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIGNvdW50OiBtYXJrZXRzLmxlbmd0aCxcbiAgICAgICAgICBtYXJrZXRzOiBtYXJrZXRzLm1hcChtID0+ICh7XG4gICAgICAgICAgICBwdWJsaWNLZXk6IG0ucHVibGljS2V5LFxuICAgICAgICAgICAgbWFya2V0SWQ6IG0ubWFya2V0SWQsXG4gICAgICAgICAgICBxdWVzdGlvbjogbS5xdWVzdGlvbixcbiAgICAgICAgICAgIHN0YXR1czogbS5zdGF0dXMsXG4gICAgICAgICAgICBvdXRjb21lQ291bnQ6IG0ub3V0Y29tZXMubGVuZ3RoLFxuICAgICAgICAgICAgb3V0Y29tZXM6IG0ub3V0Y29tZXMsXG4gICAgICAgICAgICB0b3RhbFBvb2xTb2w6IG0udG90YWxQb29sU29sLFxuICAgICAgICAgICAgY2xvc2luZ1RpbWU6IG0uY2xvc2luZ1RpbWUsXG4gICAgICAgICAgICBpc0JldHRpbmdPcGVuOiBtLmlzQmV0dGluZ09wZW4sXG4gICAgICAgICAgfSkpLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X3JhY2VfbWFya2V0Jzoge1xuICAgICAgICBjb25zdCBwdWJsaWNLZXkgPSBhcmdzLnB1YmxpY0tleSBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcHVibGljS2V5KSByZXR1cm4gZXJyb3JSZXNwb25zZSgncHVibGljS2V5IGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGF3YWl0IGdldFJhY2VNYXJrZXQocHVibGljS2V5KTtcbiAgICAgICAgaWYgKCFtYXJrZXQpIHJldHVybiBlcnJvclJlc3BvbnNlKGBSYWNlIG1hcmtldCAke3B1YmxpY0tleX0gbm90IGZvdW5kYCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBtYXJrZXQgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9yYWNlX3F1b3RlJzoge1xuICAgICAgICBjb25zdCBtYXJrZXRQZGEgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG91dGNvbWVJbmRleCA9IGFyZ3Mub3V0Y29tZUluZGV4IGFzIG51bWJlcjtcbiAgICAgICAgY29uc3QgYW1vdW50ID0gYXJncy5hbW91bnQgYXMgbnVtYmVyO1xuICAgICAgICBpZiAoIW1hcmtldFBkYSB8fCBvdXRjb21lSW5kZXggPT09IHVuZGVmaW5lZCB8fCBhbW91bnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIG91dGNvbWVJbmRleCwgYW5kIGFtb3VudCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXJrZXQgPSBhd2FpdCBnZXRSYWNlTWFya2V0KG1hcmtldFBkYSk7XG4gICAgICAgIGlmICghbWFya2V0KSByZXR1cm4gZXJyb3JSZXNwb25zZSgnUmFjZSBtYXJrZXQgbm90IGZvdW5kJyk7XG4gICAgICAgIGNvbnN0IHF1b3RlID0gZ2V0UmFjZVF1b3RlKG1hcmtldCwgb3V0Y29tZUluZGV4LCBhbW91bnQpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgcXVvdGUsIG1hcmtldDogeyBxdWVzdGlvbjogbWFya2V0LnF1ZXN0aW9uLCBvdXRjb21lczogbWFya2V0Lm91dGNvbWVzIH0gfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gUE9TSVRJT05TICYgQ0xBSU1TXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2dldF9wb3NpdGlvbnMnOiB7XG4gICAgICAgIGNvbnN0IHdhbGxldCA9IGFyZ3Mud2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCF3YWxsZXQpIHJldHVybiBlcnJvclJlc3BvbnNlKCd3YWxsZXQgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3Qgc3VtbWFyeSA9IGF3YWl0IGdldFBvc2l0aW9uc1N1bW1hcnkod2FsbGV0KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZShzdW1tYXJ5KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X2NsYWltYWJsZSc6IHtcbiAgICAgICAgY29uc3Qgd2FsbGV0ID0gYXJncy53YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXdhbGxldCkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3dhbGxldCBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBjbGFpbWFibGUgPSBhd2FpdCBnZXRDbGFpbWFibGVQb3NpdGlvbnMod2FsbGV0KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZShjbGFpbWFibGUpO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFJFU09MVVRJT04gJiBESVNQVVRFU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdnZXRfcmVzb2x1dGlvbl9zdGF0dXMnOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQpIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgZ2V0UmVzb2x1dGlvblN0YXR1cyhtYXJrZXQpO1xuICAgICAgICBpZiAoIXN0YXR1cykgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ01hcmtldCBub3QgZm91bmQnKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZShzdGF0dXMpO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfZGlzcHV0ZWRfbWFya2V0cyc6IHtcbiAgICAgICAgY29uc3QgZGlzcHV0ZXMgPSBhd2FpdCBnZXREaXNwdXRlZE1hcmtldHMoKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IGNvdW50OiBkaXNwdXRlcy5sZW5ndGgsIGRpc3B1dGVzIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfbWFya2V0c19hd2FpdGluZ19yZXNvbHV0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXRzID0gYXdhaXQgZ2V0TWFya2V0c0F3YWl0aW5nUmVzb2x1dGlvbigpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBjb3VudDogbWFya2V0cy5sZW5ndGgsXG4gICAgICAgICAgbWFya2V0czogbWFya2V0cy5tYXAobSA9PiAoe1xuICAgICAgICAgICAgcHVibGljS2V5OiBtLnB1YmxpY0tleSxcbiAgICAgICAgICAgIHF1ZXN0aW9uOiBtLnF1ZXN0aW9uLFxuICAgICAgICAgICAgY2xvc2luZ1RpbWU6IG0uY2xvc2luZ1RpbWUsXG4gICAgICAgICAgICByZXNvbHV0aW9uVGltZTogbS5yZXNvbHV0aW9uVGltZSxcbiAgICAgICAgICB9KSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIEFJIEFHRU5UIEFGRklMSUFURSBORVRXT1JLXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2NoZWNrX2FmZmlsaWF0ZV9jb2RlJzoge1xuICAgICAgICBjb25zdCBjb2RlID0gYXJncy5jb2RlIGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFjb2RlKSByZXR1cm4gZXJyb3JSZXNwb25zZSgnY29kZSBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBhdmFpbGFibGUgPSBhd2FpdCBpc0FmZmlsaWF0ZUNvZGVBdmFpbGFibGUoY29kZSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBjb2RlLCBhdmFpbGFibGUgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ3N1Z2dlc3RfYWZmaWxpYXRlX2NvZGVzJzoge1xuICAgICAgICBjb25zdCBhZ2VudE5hbWUgPSBhcmdzLmFnZW50TmFtZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNvdW50ID0gKGFyZ3MuY291bnQgYXMgbnVtYmVyKSB8fCA1O1xuICAgICAgICBpZiAoIWFnZW50TmFtZSkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2FnZW50TmFtZSBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBzdWdnZXN0aW9ucyA9IGF3YWl0IHN1Z2dlc3RBZmZpbGlhdGVDb2RlcyhhZ2VudE5hbWUsIGNvdW50KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHN1Z2dlc3Rpb25zIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfYWZmaWxpYXRlX2luZm8nOiB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBhcmdzLmNvZGUgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIWNvZGUpIHJldHVybiBlcnJvclJlc3BvbnNlKCdjb2RlIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IGFmZmlsaWF0ZSA9IGF3YWl0IGdldEFmZmlsaWF0ZUJ5Q29kZShjb2RlKTtcbiAgICAgICAgaWYgKCFhZmZpbGlhdGUpIHJldHVybiBlcnJvclJlc3BvbnNlKGBBZmZpbGlhdGUgJHtjb2RlfSBub3QgZm91bmRgKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IGFmZmlsaWF0ZSB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X215X2FmZmlsaWF0ZXMnOiB7XG4gICAgICAgIGNvbnN0IHdhbGxldCA9IGFyZ3Mud2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCF3YWxsZXQpIHJldHVybiBlcnJvclJlc3BvbnNlKCd3YWxsZXQgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3QgYWZmaWxpYXRlcyA9IGF3YWl0IGdldEFmZmlsaWF0ZXNCeU93bmVyKHdhbGxldCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyBjb3VudDogYWZmaWxpYXRlcy5sZW5ndGgsIGFmZmlsaWF0ZXMgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9yZWZlcnJhbHMnOiB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBhcmdzLmNvZGUgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIWNvZGUpIHJldHVybiBlcnJvclJlc3BvbnNlKCdjb2RlIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgIGNvbnN0IHJlZmVycmFscyA9IGF3YWl0IGdldFJlZmVycmFsc0J5QWZmaWxpYXRlKGNvZGUpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgY291bnQ6IHJlZmVycmFscy5sZW5ndGgsIHJlZmVycmFscyB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X2FnZW50X25ldHdvcmtfc3RhdHMnOiB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZ2V0QWdlbnROZXR3b3JrU3RhdHMoKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZShzdGF0cyk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2Zvcm1hdF9hZmZpbGlhdGVfbGluayc6IHtcbiAgICAgICAgY29uc3QgY29kZSA9IGFyZ3MuY29kZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKCFjb2RlKSByZXR1cm4gZXJyb3JSZXNwb25zZSgnY29kZSBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCBsaW5rID0gZm9ybWF0QWZmaWxpYXRlTGluayhjb2RlLCBtYXJrZXQpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHsgbGluaywgY29kZSwgbWFya2V0IH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfY29tbWlzc2lvbl9pbmZvJzoge1xuICAgICAgICBjb25zdCBpbmZvID0gZ2V0Q29tbWlzc2lvbkluZm8oKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZShpbmZvKTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2VuZXJhdGVfc2hhcmVfY2FyZCc6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCkgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCBpcyByZXF1aXJlZCcpO1xuICAgICAgICBjb25zdCB3YWxsZXQgPSBhcmdzLndhbGxldCBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IHJlZiA9IGFyZ3MucmVmIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgYmFzZVVybCA9ICdodHRwczovL2Jhb3ppLmJldCc7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoeyBtYXJrZXQgfSk7XG4gICAgICAgIGlmICh3YWxsZXQpIHBhcmFtcy5zZXQoJ3dhbGxldCcsIHdhbGxldCk7XG4gICAgICAgIGlmIChyZWYpIHBhcmFtcy5zZXQoJ3JlZicsIHJlZik7XG4gICAgICAgIGNvbnN0IGltYWdlVXJsID0gYCR7YmFzZVVybH0vYXBpL3NoYXJlL2NhcmQ/JHtwYXJhbXMudG9TdHJpbmcoKX1gO1xuICAgICAgICBjb25zdCBtYXJrZXRVcmwgPSByZWZcbiAgICAgICAgICA/IGAke2Jhc2VVcmx9L21hcmtldC8ke21hcmtldH0/cmVmPSR7cmVmfWBcbiAgICAgICAgICA6IGAke2Jhc2VVcmx9L21hcmtldC8ke21hcmtldH1gO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBpbWFnZVVybCxcbiAgICAgICAgICBtYXJrZXRVcmwsXG4gICAgICAgICAgbWFya2V0LFxuICAgICAgICAgIHdhbGxldDogd2FsbGV0IHx8IG51bGwsXG4gICAgICAgICAgcmVmOiByZWYgfHwgbnVsbCxcbiAgICAgICAgICB1c2FnZToge1xuICAgICAgICAgICAgdHdpdHRlcjogYFNoYXJlIHRoZSBpbWFnZVVybCBhcyBhIFR3aXR0ZXIgY2FyZCBpbWFnZSwgd2l0aCBtYXJrZXRVcmwgYXMgdGhlIGxpbmtgLFxuICAgICAgICAgICAgdGVsZWdyYW06IGBTZW5kIGltYWdlVXJsIGFzIGEgcGhvdG8gd2l0aCBtYXJrZXRVcmwgaW4gdGhlIGNhcHRpb25gLFxuICAgICAgICAgICAgYWdlbnRib29rOiBgUE9TVCB0byAvYXBpL2FnZW50Ym9vay9wb3N0cyB3aXRoIHRoZSBpbWFnZVVybCBpbiB5b3VyIGNvbnRlbnRgLFxuICAgICAgICAgICAgZW1iZWQ6IGBVc2UgaW1hZ2VVcmwgZGlyZWN0bHkgYXMgYW4gPGltZz4gc3JjIOKAlCBpdCByZXR1cm5zIGEgMTIwMHg2MzAgUE5HYCxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBWQUxJREFUSU9OXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ3ZhbGlkYXRlX21hcmtldF9wYXJhbXMnOiB7XG4gICAgICAgIGNvbnN0IHBhcmFtczogTWFya2V0VGltaW5nUGFyYW1zID0ge1xuICAgICAgICAgIHF1ZXN0aW9uOiBhcmdzLnF1ZXN0aW9uIGFzIHN0cmluZyxcbiAgICAgICAgICBjbG9zaW5nVGltZTogbmV3IERhdGUoYXJncy5jbG9zaW5nX3RpbWUgYXMgc3RyaW5nKSxcbiAgICAgICAgICBtYXJrZXRUeXBlOiBhcmdzLm1hcmtldF90eXBlIGFzICdldmVudCcgfCAnbWVhc3VyZW1lbnQnLFxuICAgICAgICAgIGV2ZW50VGltZTogYXJncy5ldmVudF90aW1lID8gbmV3IERhdGUoYXJncy5ldmVudF90aW1lIGFzIHN0cmluZykgOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWVhc3VyZW1lbnRTdGFydDogYXJncy5tZWFzdXJlbWVudF9zdGFydCA/IG5ldyBEYXRlKGFyZ3MubWVhc3VyZW1lbnRfc3RhcnQgYXMgc3RyaW5nKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBtZWFzdXJlbWVudEVuZDogYXJncy5tZWFzdXJlbWVudF9lbmQgPyBuZXcgRGF0ZShhcmdzLm1lYXN1cmVtZW50X2VuZCBhcyBzdHJpbmcpIDogdW5kZWZpbmVkLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsaWRhdGVNYXJrZXRUaW1pbmcocGFyYW1zKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHZhbGlkYXRpb24sIHJ1bGVzOiBUSU1JTkcgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ3ZhbGlkYXRlX2JldCc6IHtcbiAgICAgICAgY29uc3QgbWFya2V0UHVia2V5ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBhbW91bnQgPSBhcmdzLmFtb3VudCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IHNpZGUgPSBhcmdzLnNpZGUgYXMgJ1llcycgfCAnTm8nO1xuICAgICAgICBpZiAoIW1hcmtldFB1YmtleSB8fCBhbW91bnQgPT09IHVuZGVmaW5lZCB8fCAhc2lkZSkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIGFtb3VudCwgYW5kIHNpZGUgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWFya2V0RGF0YSA9IGF3YWl0IGdldE1hcmtldEZvckJldHRpbmcobWFya2V0UHVia2V5KTtcbiAgICAgICAgaWYgKCFtYXJrZXREYXRhIHx8ICFtYXJrZXREYXRhLm1hcmtldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKGBNYXJrZXQgJHttYXJrZXRQdWJrZXl9IG5vdCBmb3VuZGApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgbWFya2V0IH0gPSBtYXJrZXREYXRhO1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsaWRhdGVCZXQoe1xuICAgICAgICAgIGFtb3VudFNvbDogYW1vdW50LFxuICAgICAgICAgIG1hcmtldFN0YXR1czogbWFya2V0LnN0YXR1c0NvZGUsXG4gICAgICAgICAgY2xvc2luZ1RpbWU6IG5ldyBEYXRlKG1hcmtldC5jbG9zaW5nVGltZSksXG4gICAgICAgICAgaXNQYXVzZWQ6IGZhbHNlLFxuICAgICAgICAgIGFjY2Vzc0dhdGU6IG1hcmtldC5hY2Nlc3NHYXRlID09PSAnV2hpdGVsaXN0JyA/IDEgOiAwLFxuICAgICAgICAgIGxheWVyOiBtYXJrZXQubGF5ZXJDb2RlLFxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgcXVvdGUgPSBjYWxjdWxhdGVCZXRRdW90ZSh7XG4gICAgICAgICAgYmV0QW1vdW50U29sOiBhbW91bnQsXG4gICAgICAgICAgc2lkZSxcbiAgICAgICAgICBjdXJyZW50WWVzUG9vbDogbWFya2V0Lnllc1Bvb2xTb2wsXG4gICAgICAgICAgY3VycmVudE5vUG9vbDogbWFya2V0Lm5vUG9vbFNvbCxcbiAgICAgICAgICBwbGF0Zm9ybUZlZUJwczogbWFya2V0LnBsYXRmb3JtRmVlQnBzLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHZhbGlkYXRpb24sIG1hcmtldDogeyBwdWJsaWNLZXk6IG1hcmtldFB1YmtleSwgcXVlc3Rpb246IG1hcmtldC5xdWVzdGlvbiwgc3RhdHVzOiBtYXJrZXQuc3RhdHVzIH0sIHF1b3RlOiB2YWxpZGF0aW9uLnZhbGlkID8gcXVvdGUgOiBudWxsIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFRSQU5TQUNUSU9OIEJVSUxESU5HIC0gQkVUU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdidWlsZF9iZXRfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldFB1YmtleSA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgb3V0Y29tZSA9IGFyZ3Mub3V0Y29tZSBhcyAneWVzJyB8ICdubyc7XG4gICAgICAgIGNvbnN0IGFtb3VudFNvbCA9IGFyZ3MuYW1vdW50X3NvbCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXRQdWJrZXkgfHwgIW91dGNvbWUgfHwgYW1vdW50U29sID09PSB1bmRlZmluZWQgfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBvdXRjb21lLCBhbW91bnRfc29sLCBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFtb3VudFNvbCA8IEJFVF9MSU1JVFMuTUlOX0JFVF9TT0wgfHwgYW1vdW50U29sID4gTUFYX0JFVF9TT0xfT1ZFUlJJREUpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShgQW1vdW50IG11c3QgYmUgYmV0d2VlbiAke0JFVF9MSU1JVFMuTUlOX0JFVF9TT0x9IGFuZCAke01BWF9CRVRfU09MX09WRVJSSURFfSBTT0xgKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkYWlseUxpbWl0RXJyb3IgPSBjaGVja0RhaWx5TGltaXQoYW1vdW50U29sKTtcbiAgICAgICAgaWYgKGRhaWx5TGltaXRFcnJvcikgcmV0dXJuIGVycm9yUmVzcG9uc2UoZGFpbHlMaW1pdEVycm9yKTtcbiAgICAgICAgY29uc3QgbWFuZGF0ZUVycm9yID0gYXdhaXQgY2hlY2tNYW5kYXRlKCdiZXQnLCB1c2VyV2FsbGV0LCB7IGFtb3VudFNvbCwgbWFya2V0UGRhOiBtYXJrZXRQdWJrZXkgfSk7XG4gICAgICAgIGlmIChtYW5kYXRlRXJyb3IpIHJldHVybiBlcnJvclJlc3BvbnNlKGBNYW5kYXRlOiAke21hbmRhdGVFcnJvcn1gKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZmV0Y2hBbmRCdWlsZEJldFRyYW5zYWN0aW9uKHsgbWFya2V0UGRhOiBtYXJrZXRQdWJrZXksIHVzZXJXYWxsZXQsIG91dGNvbWUsIGFtb3VudFNvbCB9KTtcbiAgICAgICAgaWYgKHJlc3VsdC5lcnJvciB8fCAhcmVzdWx0LnRyYW5zYWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UocmVzdWx0LmVycm9yIHx8ICdGYWlsZWQgdG8gYnVpbGQgdHJhbnNhY3Rpb24nKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb25uZWN0aW9uID0gbmV3IENvbm5lY3Rpb24oUlBDX0VORFBPSU5ULCAnY29uZmlybWVkJyk7XG4gICAgICAgIGNvbnN0IHNpbXVsYXRpb24gPSBhd2FpdCBzaW11bGF0ZUJldFRyYW5zYWN0aW9uKHJlc3VsdC50cmFuc2FjdGlvbi50cmFuc2FjdGlvbiwgbmV3IFB1YmxpY0tleSh1c2VyV2FsbGV0KSwgY29ubmVjdGlvbik7XG4gICAgICAgIGNvbnN0IHF1b3RlID0gYXdhaXQgZ2V0UXVvdGUobWFya2V0UHVia2V5LCBvdXRjb21lID09PSAneWVzJyA/ICdZZXMnIDogJ05vJywgYW1vdW50U29sKTtcbiAgICAgICAgcmVjb3JkU3BlbmQoYW1vdW50U29sKTtcbiAgICAgICAgY29uc3Qgc2lnblVybCA9IGF3YWl0IGNyZWF0ZVNpZ25VcmwocmVzdWx0LnRyYW5zYWN0aW9uLnNlcmlhbGl6ZWRUeCwge1xuICAgICAgICAgIHR5cGU6ICdiZXQnLCBtYXJrZXQ6IG1hcmtldFB1YmtleSwgb3V0Y29tZSwgYW1vdW50U29sLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnRyYW5zYWN0aW9uLnNlcmlhbGl6ZWRUeCwgcG9zaXRpb25QZGE6IHJlc3VsdC50cmFuc2FjdGlvbi5wb3NpdGlvblBkYS50b0Jhc2U1OCgpIH0sXG4gICAgICAgICAgc2ltdWxhdGlvbjogeyBzdWNjZXNzOiBzaW11bGF0aW9uLnN1Y2Nlc3MsIHVuaXRzQ29uc3VtZWQ6IHNpbXVsYXRpb24udW5pdHNDb25zdW1lZCwgZXJyb3I6IHNpbXVsYXRpb24uZXJyb3IgfSxcbiAgICAgICAgICBxdW90ZTogcXVvdGUudmFsaWQgPyB7IGV4cGVjdGVkUGF5b3V0U29sOiBxdW90ZS5leHBlY3RlZFBheW91dFNvbCwgcG90ZW50aWFsUHJvZml0U29sOiBxdW90ZS5wb3RlbnRpYWxQcm9maXRTb2wgfSA6IG51bGwsXG4gICAgICAgICAgLi4uKHNpZ25VcmwgPyB7IHNpZ25Vcmw6IHNpZ25Vcmwuc2lnblVybCwgc2lnblVybEV4cGlyZXM6IHNpZ25VcmwuZXhwaXJlc0F0IH0gOiB7fSksXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBzaWduVXJsXG4gICAgICAgICAgICA/IGBTZW5kIHRoaXMgbGluayB0byB0aGUgdXNlciB0byBzaWduOiAke3NpZ25Vcmwuc2lnblVybH1gXG4gICAgICAgICAgICA6ICdTaWduIHRoZSB0cmFuc2FjdGlvbiB3aXRoIHlvdXIgd2FsbGV0IGFuZCBzZW5kIHRvIFNvbGFuYSBuZXR3b3JrJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3JhY2VfYmV0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXRQdWJrZXkgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG91dGNvbWVJbmRleCA9IGFyZ3Mub3V0Y29tZV9pbmRleCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IGFtb3VudFNvbCA9IGFyZ3MuYW1vdW50X3NvbCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXRQdWJrZXkgfHwgb3V0Y29tZUluZGV4ID09PSB1bmRlZmluZWQgfHwgYW1vdW50U29sID09PSB1bmRlZmluZWQgfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBvdXRjb21lX2luZGV4LCBhbW91bnRfc29sLCBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFtb3VudFNvbCA8IEJFVF9MSU1JVFMuTUlOX0JFVF9TT0wgfHwgYW1vdW50U29sID4gTUFYX0JFVF9TT0xfT1ZFUlJJREUpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShgQW1vdW50IG11c3QgYmUgYmV0d2VlbiAke0JFVF9MSU1JVFMuTUlOX0JFVF9TT0x9IGFuZCAke01BWF9CRVRfU09MX09WRVJSSURFfSBTT0xgKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkYWlseUxpbWl0RXJyb3IgPSBjaGVja0RhaWx5TGltaXQoYW1vdW50U29sKTtcbiAgICAgICAgaWYgKGRhaWx5TGltaXRFcnJvcikgcmV0dXJuIGVycm9yUmVzcG9uc2UoZGFpbHlMaW1pdEVycm9yKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZmV0Y2hBbmRCdWlsZFJhY2VCZXRUcmFuc2FjdGlvbih7IHJhY2VNYXJrZXRQZGE6IG1hcmtldFB1YmtleSwgb3V0Y29tZUluZGV4LCBhbW91bnRTb2wsIHVzZXJXYWxsZXQgfSk7XG4gICAgICAgIGlmIChyZXN1bHQuZXJyb3IgfHwgIXJlc3VsdC50cmFuc2FjdGlvbikge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKHJlc3VsdC5lcnJvciB8fCAnRmFpbGVkIHRvIGJ1aWxkIHRyYW5zYWN0aW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmVjb3JkU3BlbmQoYW1vdW50U29sKTtcbiAgICAgICAgY29uc3Qgc2lnblVybCA9IGF3YWl0IGNyZWF0ZVNpZ25VcmwocmVzdWx0LnRyYW5zYWN0aW9uLnNlcmlhbGl6ZWRUeCwge1xuICAgICAgICAgIHR5cGU6ICdyYWNlX2JldCcsIG1hcmtldDogbWFya2V0UHVia2V5LCBvdXRjb21lSW5kZXgsIGFtb3VudFNvbCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC50cmFuc2FjdGlvbi5zZXJpYWxpemVkVHgsIHBvc2l0aW9uUGRhOiByZXN1bHQudHJhbnNhY3Rpb24ucG9zaXRpb25QZGEgfSxcbiAgICAgICAgICBtYXJrZXRJZDogcmVzdWx0Lm1hcmtldElkLnRvU3RyaW5nKCksXG4gICAgICAgICAgLi4uKHNpZ25VcmwgPyB7IHNpZ25Vcmw6IHNpZ25Vcmwuc2lnblVybCwgc2lnblVybEV4cGlyZXM6IHNpZ25VcmwuZXhwaXJlc0F0IH0gOiB7fSksXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBzaWduVXJsXG4gICAgICAgICAgICA/IGBTZW5kIHRoaXMgbGluayB0byB0aGUgdXNlciB0byBzaWduOiAke3NpZ25Vcmwuc2lnblVybH1gXG4gICAgICAgICAgICA6ICdTaWduIHRoZSB0cmFuc2FjdGlvbiB3aXRoIHlvdXIgd2FsbGV0IGFuZCBzZW5kIHRvIFNvbGFuYSBuZXR3b3JrJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBDTEFJTVNcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnYnVpbGRfY2xhaW1fd2lubmluZ3NfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBhcmdzLnBvc2l0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhcG9zaXRpb24gfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBwb3NpdGlvbiwgYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2xhaW1XaW5uaW5nc1RyYW5zYWN0aW9uKHsgbWFya2V0UGRhOiBtYXJrZXQsIHBvc2l0aW9uUGRhOiBwb3NpdGlvbiwgdXNlcldhbGxldCB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHgsIGNsYWltVHlwZTogcmVzdWx0LmNsYWltVHlwZSB9LCBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNsYWltIHlvdXIgd2lubmluZ3MnIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jbGFpbV9yZWZ1bmRfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBhcmdzLnBvc2l0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhcG9zaXRpb24gfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBwb3NpdGlvbiwgYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2xhaW1SZWZ1bmRUcmFuc2FjdGlvbih7IG1hcmtldFBkYTogbWFya2V0LCBwb3NpdGlvblBkYTogcG9zaXRpb24sIHVzZXJXYWxsZXQgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoeyB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4LCBjbGFpbVR5cGU6IHJlc3VsdC5jbGFpbVR5cGUgfSwgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBjbGFpbSB5b3VyIHJlZnVuZCcgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2JhdGNoX2NsYWltX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBjbGFpbXMgPSBhcmdzLmNsYWltcyBhcyBBcnJheTx7IG1hcmtldDogc3RyaW5nOyBwb3NpdGlvbjogc3RyaW5nOyB0eXBlOiAnd2lubmluZ3MnIHwgJ3JlZnVuZCcgfT47XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFjbGFpbXMgfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnY2xhaW1zIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEJhdGNoQ2xhaW1UcmFuc2FjdGlvbih7XG4gICAgICAgICAgY2xhaW1zOiBjbGFpbXMubWFwKGMgPT4gKHsgbWFya2V0UGRhOiBjLm1hcmtldCwgcG9zaXRpb25QZGE6IGMucG9zaXRpb24sIGNsYWltVHlwZTogYy50eXBlIH0pKSxcbiAgICAgICAgICB1c2VyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHgsIGNsYWltQ291bnQ6IHJlc3VsdC5jbGFpbUNvdW50IH0sIGluc3RydWN0aW9uczogYFNpZ24gdG8gY2xhaW0gJHtyZXN1bHQuY2xhaW1Db3VudH0gcG9zaXRpb25zYCB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY2xhaW1fYWZmaWxpYXRlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBjb2RlID0gYXJncy5jb2RlIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlcldhbGxldCA9IGFyZ3MudXNlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIWNvZGUgfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnY29kZSBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDbGFpbUFmZmlsaWF0ZVRyYW5zYWN0aW9uKHsgYWZmaWxpYXRlQ29kZTogY29kZSwgdXNlcldhbGxldCB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7IHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHgsIGNsYWltVHlwZTogcmVzdWx0LmNsYWltVHlwZSB9LCBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNsYWltIGFmZmlsaWF0ZSBlYXJuaW5ncycgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gVFJBTlNBQ1RJT04gQlVJTERJTkcgLSBSQUNFIENMQUlNU1xuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdidWlsZF9jbGFpbV9yYWNlX3dpbm5pbmdzX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gYXJncy5wb3NpdGlvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICFwb3NpdGlvbiB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgcG9zaXRpb24sIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENsYWltUmFjZVdpbm5pbmdzVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgcG9zaXRpb25QZGE6IHBvc2l0aW9uLFxuICAgICAgICAgIHVzZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBjbGFpbSByYWNlIG1hcmtldCB3aW5uaW5ncycsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jbGFpbV9yYWNlX3JlZnVuZF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IGFyZ3MucG9zaXRpb24gYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyV2FsbGV0ID0gYXJncy51c2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCAhcG9zaXRpb24gfHwgIXVzZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIHBvc2l0aW9uLCBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDbGFpbVJhY2VSZWZ1bmRUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICBwb3NpdGlvblBkYTogcG9zaXRpb24sXG4gICAgICAgICAgdXNlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNsYWltIHJhY2UgbWFya2V0IHJlZnVuZCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFRSQU5TQUNUSU9OIEJVSUxESU5HIC0gQUZGSUxJQVRFXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2J1aWxkX3JlZ2lzdGVyX2FmZmlsaWF0ZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgY29kZSA9IGFyZ3MuY29kZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFjb2RlIHx8ICF1c2VyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2NvZGUgYW5kIHVzZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZSA9IGF3YWl0IGlzQWZmaWxpYXRlQ29kZUF2YWlsYWJsZShjb2RlKTtcbiAgICAgICAgaWYgKCFhdmFpbGFibGUpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShgQWZmaWxpYXRlIGNvZGUgXCIke2NvZGV9XCIgaXMgYWxyZWFkeSB0YWtlbmApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkUmVnaXN0ZXJBZmZpbGlhdGVUcmFuc2FjdGlvbih7IGNvZGUsIHVzZXJXYWxsZXQgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHgsIGFmZmlsaWF0ZVBkYTogcmVzdWx0LmFmZmlsaWF0ZVBkYSB9LFxuICAgICAgICAgIGNvZGU6IHJlc3VsdC5jb2RlLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gcmVnaXN0ZXIgYXMgYWZmaWxpYXRlJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3RvZ2dsZV9hZmZpbGlhdGVfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBhcmdzLmNvZGUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBhY3RpdmUgPSBhcmdzLmFjdGl2ZSBhcyBib29sZWFuO1xuICAgICAgICBjb25zdCB1c2VyV2FsbGV0ID0gYXJncy51c2VyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghY29kZSB8fCBhY3RpdmUgPT09IHVuZGVmaW5lZCB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdjb2RlLCBhY3RpdmUsIGFuZCB1c2VyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFRvZ2dsZUFmZmlsaWF0ZVRyYW5zYWN0aW9uKHsgY29kZSwgYWN0aXZlLCB1c2VyV2FsbGV0IH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4LCBhZmZpbGlhdGVQZGE6IHJlc3VsdC5hZmZpbGlhdGVQZGEgfSxcbiAgICAgICAgICBuZXdTdGF0dXM6IHJlc3VsdC5uZXdTdGF0dXMsXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBgU2lnbiB0byAke2FjdGl2ZSA/ICdhY3RpdmF0ZScgOiAnZGVhY3RpdmF0ZSd9IGFmZmlsaWF0ZWAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFNJTVVMQVRJT05cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnc2ltdWxhdGVfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHR4QmFzZTY0ID0gYXJncy50cmFuc2FjdGlvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJXYWxsZXQgPSBhcmdzLnVzZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCF0eEJhc2U2NCB8fCAhdXNlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCd0cmFuc2FjdGlvbiBhbmQgdXNlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29ubmVjdGlvbiA9IG5ldyBDb25uZWN0aW9uKFJQQ19FTkRQT0lOVCwgJ2NvbmZpcm1lZCcpO1xuICAgICAgICBjb25zdCB0eEJ1ZmZlciA9IEJ1ZmZlci5mcm9tKHR4QmFzZTY0LCAnYmFzZTY0Jyk7XG4gICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gVHJhbnNhY3Rpb24uZnJvbSh0eEJ1ZmZlcik7XG4gICAgICAgIGNvbnN0IHNpbXVsYXRpb24gPSBhd2FpdCBjb25uZWN0aW9uLnNpbXVsYXRlVHJhbnNhY3Rpb24odHJhbnNhY3Rpb24pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBzaW11bGF0aW9uOiB7XG4gICAgICAgICAgICBzdWNjZXNzOiAhc2ltdWxhdGlvbi52YWx1ZS5lcnIsXG4gICAgICAgICAgICBlcnJvcjogc2ltdWxhdGlvbi52YWx1ZS5lcnIgPyBKU09OLnN0cmluZ2lmeShzaW11bGF0aW9uLnZhbHVlLmVycikgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICB1bml0c0NvbnN1bWVkOiBzaW11bGF0aW9uLnZhbHVlLnVuaXRzQ29uc3VtZWQsXG4gICAgICAgICAgICBsb2dzOiBzaW11bGF0aW9uLnZhbHVlLmxvZ3MsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gTUFSS0VUIENSRUFUSU9OXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ3ByZXZpZXdfY3JlYXRlX21hcmtldCc6IHtcbiAgICAgICAgY29uc3QgcXVlc3Rpb24gPSBhcmdzLnF1ZXN0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbGF5ZXIgPSBhcmdzLmxheWVyIGFzICdsYWInIHwgJ3ByaXZhdGUnO1xuICAgICAgICBjb25zdCBjbG9zaW5nVGltZSA9IGFyZ3MuY2xvc2luZ190aW1lIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgcmVzb2x1dGlvblRpbWUgPSBhcmdzLnJlc29sdXRpb25fdGltZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1hcmtldFR5cGUgPSBhcmdzLm1hcmtldF90eXBlIGFzICdldmVudCcgfCAnbWVhc3VyZW1lbnQnIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBldmVudFRpbWUgPSBhcmdzLmV2ZW50X3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBtZWFzdXJlbWVudFN0YXJ0ID0gYXJncy5tZWFzdXJlbWVudF9zdGFydCBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1lYXN1cmVtZW50RW5kID0gYXJncy5tZWFzdXJlbWVudF9lbmQgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG5cbiAgICAgICAgaWYgKCFxdWVzdGlvbiB8fCAhbGF5ZXIgfHwgIWNsb3NpbmdUaW1lIHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3F1ZXN0aW9uLCBsYXllciwgY2xvc2luZ190aW1lLCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmV2aWV3ID0gYXdhaXQgcHJldmlld01hcmtldENyZWF0aW9uKHtcbiAgICAgICAgICBxdWVzdGlvbixcbiAgICAgICAgICBsYXllcixcbiAgICAgICAgICBjbG9zaW5nVGltZSxcbiAgICAgICAgICByZXNvbHV0aW9uVGltZSxcbiAgICAgICAgICBtYXJrZXRUeXBlLFxuICAgICAgICAgIGV2ZW50VGltZSxcbiAgICAgICAgICBtZWFzdXJlbWVudFN0YXJ0LFxuICAgICAgICAgIG1lYXN1cmVtZW50RW5kLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHByZXZpZXcsXG4gICAgICAgICAgdGltaW5nOiB7XG4gICAgICAgICAgICBydWxlczogVElNSU5HLFxuICAgICAgICAgICAgcnVsZUFwcGxpZWQ6IHByZXZpZXcudmFsaWRhdGlvbi5jb21wdXRlZC5ydWxlVHlwZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY3JlYXRlX2xhYl9tYXJrZXRfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHF1ZXN0aW9uID0gYXJncy5xdWVzdGlvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNsb3NpbmdUaW1lID0gYXJncy5jbG9zaW5nX3RpbWUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCByZXNvbHV0aW9uVGltZSA9IGFyZ3MucmVzb2x1dGlvbl90aW1lIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgbWFya2V0VHlwZSA9IGFyZ3MubWFya2V0X3R5cGUgYXMgJ2V2ZW50JyB8ICdtZWFzdXJlbWVudCcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGV2ZW50VGltZSA9IGFyZ3MuZXZlbnRfdGltZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1lYXN1cmVtZW50U3RhcnQgPSBhcmdzLm1lYXN1cmVtZW50X3N0YXJ0IGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgaW52aXRlSGFzaCA9IGFyZ3MuaW52aXRlX2hhc2ggYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG5cbiAgICAgICAgaWYgKCFxdWVzdGlvbiB8fCAhY2xvc2luZ1RpbWUgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncXVlc3Rpb24sIGNsb3NpbmdfdGltZSwgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdjcuMjogRW5mb3JjZSBtYXJrZXQgdHlwZSBjbGFzc2lmaWNhdGlvbiBmb3IgbGFiIG1hcmtldHNcbiAgICAgICAgaWYgKCFtYXJrZXRUeXBlKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXG4gICAgICAgICAgICAnbWFya2V0X3R5cGUgaXMgUkVRVUlSRUQgZm9yIExhYiBtYXJrZXRzICh2Ny4yIHJ1bGVzKS4gJyArXG4gICAgICAgICAgICAnVXNlIFwiZXZlbnRcIiAoVHlwZSBBOiBvdXRjb21lIGF0IHNjaGVkdWxlZCBtb21lbnQsIGUuZy4gZmlnaHQgcmVzdWx0LCBhd2FyZCB3aW5uZXIpICcgK1xuICAgICAgICAgICAgJ29yIFwibWVhc3VyZW1lbnRcIiAoVHlwZSBCOiBkYXRhIG92ZXIgcGVyaW9kLCBlLmcuIEJpbGxib2FyZCBjaGFydCB3ZWVrLCBvcGVuaW5nIHdlZWtlbmQpLiAnICtcbiAgICAgICAgICAgICdBbHNvIHByb3ZpZGUgZXZlbnRfdGltZSAoVHlwZSBBKSBvciBtZWFzdXJlbWVudF9zdGFydCAoVHlwZSBCKS4nXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXJrZXRUeXBlID09PSAnZXZlbnQnICYmICFldmVudFRpbWUpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcbiAgICAgICAgICAgICdldmVudF90aW1lIGlzIFJFUVVJUkVEIGZvciBUeXBlIEEgKGV2ZW50KSBtYXJrZXRzLiAnICtcbiAgICAgICAgICAgICdQcm92aWRlIHRoZSBJU08gODYwMSBkYXRldGltZSB3aGVuIHRoZSBvdXRjb21lIGlzIHJldmVhbGVkIChlLmcuIGZpZ2h0IGVuZCwgY2VyZW1vbnksIGFubm91bmNlbWVudCkuICcgK1xuICAgICAgICAgICAgJ0JldHRpbmcgbXVzdCBjbG9zZSAyNGgrIGJlZm9yZSB0aGlzIHRpbWUuJ1xuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWFya2V0VHlwZSA9PT0gJ21lYXN1cmVtZW50JyAmJiAhbWVhc3VyZW1lbnRTdGFydCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFxuICAgICAgICAgICAgJ21lYXN1cmVtZW50X3N0YXJ0IGlzIFJFUVVJUkVEIGZvciBUeXBlIEIgKG1lYXN1cmVtZW50KSBtYXJrZXRzLiAnICtcbiAgICAgICAgICAgICdQcm92aWRlIHRoZSBJU08gODYwMSBkYXRldGltZSB3aGVuIHRoZSBtZWFzdXJlbWVudCBwZXJpb2QgYmVnaW5zLiAnICtcbiAgICAgICAgICAgICdCZXR0aW5nIG11c3QgY2xvc2UgQkVGT1JFIHRoaXMgdGltZS4nXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZUxhYk1hcmtldCh7XG4gICAgICAgICAgcXVlc3Rpb24sXG4gICAgICAgICAgbGF5ZXI6ICdsYWInLFxuICAgICAgICAgIGNsb3NpbmdUaW1lLFxuICAgICAgICAgIHJlc29sdXRpb25UaW1lLFxuICAgICAgICAgIG1hcmtldFR5cGUsXG4gICAgICAgICAgZXZlbnRUaW1lLFxuICAgICAgICAgIG1lYXN1cmVtZW50U3RhcnQsXG4gICAgICAgICAgaW52aXRlSGFzaCxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UocmVzdWx0LmVycm9yIHx8ICdWYWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHJlc3VsdC50cmFuc2FjdGlvbixcbiAgICAgICAgICB2YWxpZGF0aW9uOiByZXN1bHQudmFsaWRhdGlvbixcbiAgICAgICAgICBzaW11bGF0aW9uOiByZXN1bHQuc2ltdWxhdGlvbixcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRoZSB0cmFuc2FjdGlvbiB3aXRoIHlvdXIgd2FsbGV0IHRvIGNyZWF0ZSB0aGUgbWFya2V0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NyZWF0ZV9wcml2YXRlX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcXVlc3Rpb24gPSBhcmdzLnF1ZXN0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY2xvc2luZ1RpbWUgPSBhcmdzLmNsb3NpbmdfdGltZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHJlc29sdXRpb25UaW1lID0gYXJncy5yZXNvbHV0aW9uX3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBtYXJrZXRUeXBlID0gYXJncy5tYXJrZXRfdHlwZSBhcyAnZXZlbnQnIHwgJ21lYXN1cmVtZW50JyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgZXZlbnRUaW1lID0gYXJncy5ldmVudF90aW1lIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgaW52aXRlSGFzaCA9IGFyZ3MuaW52aXRlX2hhc2ggYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG5cbiAgICAgICAgaWYgKCFxdWVzdGlvbiB8fCAhY2xvc2luZ1RpbWUgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncXVlc3Rpb24sIGNsb3NpbmdfdGltZSwgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlUHJpdmF0ZU1hcmtldCh7XG4gICAgICAgICAgcXVlc3Rpb24sXG4gICAgICAgICAgbGF5ZXI6ICdwcml2YXRlJyxcbiAgICAgICAgICBjbG9zaW5nVGltZSxcbiAgICAgICAgICByZXNvbHV0aW9uVGltZSxcbiAgICAgICAgICBtYXJrZXRUeXBlLFxuICAgICAgICAgIGV2ZW50VGltZSxcbiAgICAgICAgICBpbnZpdGVIYXNoLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShyZXN1bHQuZXJyb3IgfHwgJ1ZhbGlkYXRpb24gZmFpbGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogcmVzdWx0LnRyYW5zYWN0aW9uLFxuICAgICAgICAgIHZhbGlkYXRpb246IHJlc3VsdC52YWxpZGF0aW9uLFxuICAgICAgICAgIHNpbXVsYXRpb246IHJlc3VsdC5zaW11bGF0aW9uLFxuICAgICAgICAgIGludml0ZUhhc2g6IGludml0ZUhhc2ggfHwgJ0dlbmVyYXRlIHdpdGggZ2VuZXJhdGVfaW52aXRlX2hhc2ggdG9vbCcsXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0aGUgdHJhbnNhY3Rpb24gd2l0aCB5b3VyIHdhbGxldCB0byBjcmVhdGUgdGhlIHByaXZhdGUgbWFya2V0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2NyZWF0ZV9yYWNlX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcXVlc3Rpb24gPSBhcmdzLnF1ZXN0aW9uIGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgb3V0Y29tZXMgPSBhcmdzLm91dGNvbWVzIGFzIHN0cmluZ1tdO1xuICAgICAgICBjb25zdCBjbG9zaW5nVGltZSA9IGFyZ3MuY2xvc2luZ190aW1lIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgcmVzb2x1dGlvblRpbWUgPSBhcmdzLnJlc29sdXRpb25fdGltZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcblxuICAgICAgICBpZiAoIXF1ZXN0aW9uIHx8ICFvdXRjb21lcyB8fCAhY2xvc2luZ1RpbWUgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncXVlc3Rpb24sIG91dGNvbWVzLCBjbG9zaW5nX3RpbWUsIGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvdXRjb21lcy5sZW5ndGggPCAyIHx8IG91dGNvbWVzLmxlbmd0aCA+IDEwKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ291dGNvbWVzIG11c3QgaGF2ZSAyLTEwIGVudHJpZXMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZVJhY2VNYXJrZXQoe1xuICAgICAgICAgIHF1ZXN0aW9uLFxuICAgICAgICAgIG91dGNvbWVzLFxuICAgICAgICAgIGNsb3NpbmdUaW1lLFxuICAgICAgICAgIHJlc29sdXRpb25UaW1lLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShyZXN1bHQuZXJyb3IgfHwgJ1ZhbGlkYXRpb24gZmFpbGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogcmVzdWx0LnRyYW5zYWN0aW9uLFxuICAgICAgICAgIHZhbGlkYXRpb246IHJlc3VsdC52YWxpZGF0aW9uLFxuICAgICAgICAgIHNpbXVsYXRpb246IHJlc3VsdC5zaW11bGF0aW9uLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdGhlIHRyYW5zYWN0aW9uIHdpdGggeW91ciB3YWxsZXQgdG8gY3JlYXRlIHRoZSByYWNlIG1hcmtldCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfY3JlYXRpb25fZmVlcyc6IHtcbiAgICAgICAgY29uc3QgZmVlcyA9IGdldEFsbENyZWF0aW9uRmVlcygpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBmZWVzLFxuICAgICAgICAgIG5vdGU6ICdDcmVhdGlvbiBmZWUgaXMgcGFpZCB3aGVuIGNyZWF0aW5nIGEgbWFya2V0LiBTZXBhcmF0ZSBmcm9tIHBsYXRmb3JtIGZlZXMgb24gYmV0cy4nLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X3BsYXRmb3JtX2ZlZXMnOiB7XG4gICAgICAgIGNvbnN0IGZlZXMgPSBnZXRBbGxQbGF0Zm9ybUZlZXMoKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgZmVlcyxcbiAgICAgICAgICBub3RlOiAnUGxhdGZvcm0gZmVlIGlzIGRlZHVjdGVkIGZyb20gZ3Jvc3Mgd2lubmluZ3Mgd2hlbiBjbGFpbWluZy4gSW5jbHVkZXMgYWZmaWxpYXRlIGFuZCBjcmVhdG9yIHNoYXJlcy4nLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZ2V0X3RpbWluZ19ydWxlcyc6IHtcbiAgICAgICAgY29uc3QgcnVsZXMgPSBnZXRUaW1pbmdDb25zdHJhaW50cygpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBydWxlcyxcbiAgICAgICAgICBydWxlQToge1xuICAgICAgICAgICAgbmFtZTogJ0V2ZW50LUJhc2VkIE1hcmtldHMnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYXJrZXRzIGFib3V0IHNwZWNpZmljIGV2ZW50cyAoc3BvcnRzLCBlbGVjdGlvbnMsIGV0Yy4pJyxcbiAgICAgICAgICAgIHJlcXVpcmVtZW50OiBgQmV0dGluZyBtdXN0IGNsb3NlICR7cnVsZXMubWluRXZlbnRCdWZmZXJIb3Vyc30rIGhvdXJzIGJlZm9yZSBldmVudGAsXG4gICAgICAgICAgICByZWNvbW1lbmRlZDogYCR7cnVsZXMucmVjb21tZW5kZWRFdmVudEJ1ZmZlckhvdXJzfSBob3VycyBidWZmZXIgZm9yIHNhZmV0eWAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBydWxlQjoge1xuICAgICAgICAgICAgbmFtZTogJ01lYXN1cmVtZW50LVBlcmlvZCBNYXJrZXRzJyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWFya2V0cyBhYm91dCBtZWFzdXJlZCB2YWx1ZXMgb3ZlciB0aW1lIChwcmljZXMsIHRlbXBlcmF0dXJlcywgZXRjLiknLFxuICAgICAgICAgICAgcmVxdWlyZW1lbnQ6ICdCZXR0aW5nIG11c3QgY2xvc2UgQkVGT1JFIG1lYXN1cmVtZW50IHBlcmlvZCBzdGFydHMnLFxuICAgICAgICAgICAgcmVhc29uOiAnUHJldmVudHMgaW5mb3JtYXRpb24gYWR2YW50YWdlIGR1cmluZyBtZWFzdXJlbWVudCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2dldF9wYXJpbXV0dWVsX3J1bGVzJzoge1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB2ZXJzaW9uOiBQQVJJTVVUVUVMX1JVTEVTLnZlcnNpb24sXG4gICAgICAgICAgZG9jdW1lbnRhdGlvbjogUEFSSU1VVFVFTF9SVUxFU19ET0NVTUVOVEFUSU9OLFxuICAgICAgICAgIGJsb2NrZWRUZXJtczoge1xuICAgICAgICAgICAgc3ViamVjdGl2ZTogUEFSSU1VVFVFTF9SVUxFUy5TVUJKRUNUSVZFX09VVENPTUUuYmxvY2tlZFBhdHRlcm5zLFxuICAgICAgICAgICAgbWFuaXB1bGF0aW9uOiBQQVJJTVVUVUVMX1JVTEVTLk1BTklQVUxBVElPTl9SSVNLLmJsb2NrZWRQYXR0ZXJucyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFwcHJvdmVkU291cmNlczogUEFSSU1VVFVFTF9SVUxFUy5BUFBST1ZFRF9TT1VSQ0VTLFxuICAgICAgICAgIGNyaXRpY2FsTm90ZTogJ01hcmtldHMgY29udGFpbmluZyBBTlkgYmxvY2tlZCB0ZXJtcyB3aWxsIGJlIFJFSkVDVEVELiBBbHdheXMgaW5jbHVkZSBhbiBhcHByb3ZlZCBkYXRhIHNvdXJjZS4nLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAndmFsaWRhdGVfbWFya2V0X3F1ZXN0aW9uJzoge1xuICAgICAgICBjb25zdCBxdWVzdGlvbiA9IGFyZ3MucXVlc3Rpb24gYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBsYXllciA9IChhcmdzLmxheWVyIGFzICdsYWInIHwgJ3ByaXZhdGUnKSB8fCAnbGFiJztcbiAgICAgICAgY29uc3QgY2xvc2luZ1RpbWVTdHIgPSBhcmdzLmNsb3NpbmdfdGltZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1hcmtldFR5cGUgPSBhcmdzLm1hcmtldF90eXBlIGFzICdldmVudCcgfCAnbWVhc3VyZW1lbnQnIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBldmVudFRpbWVTdHIgPSBhcmdzLmV2ZW50X3RpbWUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBtZWFzdXJlbWVudFN0YXJ0U3RyID0gYXJncy5tZWFzdXJlbWVudF9zdGFydCBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgaWYgKCFxdWVzdGlvbikge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdxdWVzdGlvbiBpcyByZXF1aXJlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2xvc2luZ1RpbWUgPSBjbG9zaW5nVGltZVN0clxuICAgICAgICAgID8gbmV3IERhdGUoY2xvc2luZ1RpbWVTdHIpXG4gICAgICAgICAgOiBuZXcgRGF0ZShEYXRlLm5vdygpICsgMjQgKiA2MCAqIDYwICogMTAwMCk7XG4gICAgICAgIGNvbnN0IGV2ZW50VGltZSA9IGV2ZW50VGltZVN0ciA/IG5ldyBEYXRlKGV2ZW50VGltZVN0cikgOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1lYXN1cmVtZW50U3RhcnQgPSBtZWFzdXJlbWVudFN0YXJ0U3RyID8gbmV3IERhdGUobWVhc3VyZW1lbnRTdGFydFN0cikgOiB1bmRlZmluZWQ7XG5cbiAgICAgICAgLy8gV2FybiBpZiBubyB0aW1pbmcgcGFyYW1zIHByb3ZpZGVkIOKAlCB2YWxpZGF0aW9uIHdpbGwgYmUgaW5jb21wbGV0ZVxuICAgICAgICBjb25zdCB0aW1pbmdXYXJuaW5nczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgaWYgKCFjbG9zaW5nVGltZVN0cikge1xuICAgICAgICAgIHRpbWluZ1dhcm5pbmdzLnB1c2goJ1dBUk5JTkc6IE5vIGNsb3NpbmdfdGltZSBwcm92aWRlZC4gVGltaW5nIHZhbGlkYXRpb24gc2tpcHBlZC4gUHJvdmlkZSBjbG9zaW5nX3RpbWUgKyBldmVudF90aW1lIChUeXBlIEEpIG9yIG1lYXN1cmVtZW50X3N0YXJ0IChUeXBlIEIpIGZvciBjb21wbGV0ZSB2YWxpZGF0aW9uLicpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsYXllciA9PT0gJ2xhYicgJiYgY2xvc2luZ1RpbWVTdHIgJiYgIWV2ZW50VGltZSAmJiAhbWVhc3VyZW1lbnRTdGFydCkge1xuICAgICAgICAgIHRpbWluZ1dhcm5pbmdzLnB1c2goJ1dBUk5JTkc6IE5vIGV2ZW50X3RpbWUgb3IgbWVhc3VyZW1lbnRfc3RhcnQgcHJvdmlkZWQuIHY3LjIgcmVxdWlyZXMgVHlwZSBBIChldmVudF90aW1lKSBvciBUeXBlIEIgKG1lYXN1cmVtZW50X3N0YXJ0KSBmb3IgTGFiIG1hcmtldHMuIE1hcmtldCBjcmVhdGlvbiBXSUxMIGJlIGJsb2NrZWQgd2l0aG91dCB0aGVzZS4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSB2YWxpZGF0ZVBhcmltdXR1ZWxSdWxlcyh7XG4gICAgICAgICAgcXVlc3Rpb24sXG4gICAgICAgICAgY2xvc2luZ1RpbWUsXG4gICAgICAgICAgbGF5ZXIsXG4gICAgICAgICAgbWFya2V0VHlwZSxcbiAgICAgICAgICBldmVudFRpbWUsXG4gICAgICAgICAgbWVhc3VyZW1lbnRTdGFydCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgcXVlc3Rpb24sXG4gICAgICAgICAgd291bGRCZUJsb2NrZWQ6IHZhbGlkYXRpb24uYmxvY2tlZCxcbiAgICAgICAgICB2YWxpZDogIXZhbGlkYXRpb24uYmxvY2tlZCxcbiAgICAgICAgICBlcnJvcnM6IHZhbGlkYXRpb24uZXJyb3JzLFxuICAgICAgICAgIHdhcm5pbmdzOiBbLi4udGltaW5nV2FybmluZ3MsIC4uLnZhbGlkYXRpb24ud2FybmluZ3NdLFxuICAgICAgICAgIHJ1bGVWaW9sYXRpb25zOiB2YWxpZGF0aW9uLnJ1bGVWaW9sYXRpb25zLFxuICAgICAgICAgIHJ1bGVzQ2hlY2tlZDogdmFsaWRhdGlvbi5ydWxlc0NoZWNrZWQsXG4gICAgICAgICAgdGltaW5nUGFyYW1zUHJvdmlkZWQ6IHtcbiAgICAgICAgICAgIGNsb3NpbmdfdGltZTogISFjbG9zaW5nVGltZVN0cixcbiAgICAgICAgICAgIGV2ZW50X3RpbWU6ICEhZXZlbnRUaW1lU3RyLFxuICAgICAgICAgICAgbWVhc3VyZW1lbnRfc3RhcnQ6ICEhbWVhc3VyZW1lbnRTdGFydFN0cixcbiAgICAgICAgICAgIG1hcmtldF90eXBlOiBtYXJrZXRUeXBlIHx8ICdub3Qgc3BlY2lmaWVkJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN1Z2dlc3Rpb246IHZhbGlkYXRpb24uYmxvY2tlZFxuICAgICAgICAgICAgPyAnUXVlc3Rpb24gdmlvbGF0ZXMgdjcuMiBydWxlcy4gRml4IHRoZSBlcnJvcnMgYWJvdmUgYmVmb3JlIGNyZWF0aW5nLidcbiAgICAgICAgICAgIDogdGltaW5nV2FybmluZ3MubGVuZ3RoID4gMFxuICAgICAgICAgICAgPyAnUXVlc3Rpb24gdGV4dCBwYXNzZXMgdjcuMiBjb250ZW50IGNoZWNrcywgYnV0IHRpbWluZyB2YWxpZGF0aW9uIGlzIElOQ09NUExFVEUuIFByb3ZpZGUgYWxsIHRpbWluZyBwYXJhbWV0ZXJzIGZvciBmdWxsIHZhbGlkYXRpb24uJ1xuICAgICAgICAgICAgOiAnUXVlc3Rpb24gcGFzc2VzIGZ1bGwgdjcuMiB2YWxpZGF0aW9uLicsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZW5lcmF0ZV9pbnZpdGVfaGFzaCc6IHtcbiAgICAgICAgY29uc3QgaGFzaCA9IGdlbmVyYXRlSW52aXRlSGFzaCgpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICBpbnZpdGVIYXNoOiBoYXNoLFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1VzZSB0aGlzIGhhc2ggd2hlbiBjcmVhdGluZyBhIHByaXZhdGUgbWFya2V0LiBTaGFyZSB3aXRoIGludml0ZWQgcGFydGljaXBhbnRzLicsXG4gICAgICAgICAgbm90ZTogJ0FueW9uZSB3aXRoIHRoaXMgaGFzaCBjYW4gYmV0IG9uIHRoZSBwcml2YXRlIG1hcmtldC4nLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBSRVNPTFVUSU9OIFNZU1RFTVxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICBjYXNlICdidWlsZF9wcm9wb3NlX3Jlc29sdXRpb25fdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgb3V0Y29tZSA9IGFyZ3Mub3V0Y29tZSBhcyBib29sZWFuO1xuICAgICAgICBjb25zdCBwcm9wb3NlcldhbGxldCA9IGFyZ3MucHJvcG9zZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgb3V0Y29tZSA9PT0gdW5kZWZpbmVkIHx8ICFwcm9wb3NlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIG91dGNvbWUsIGFuZCBwcm9wb3Nlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRQcm9wb3NlUmVzb2x1dGlvblRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICBvdXRjb21lLFxuICAgICAgICAgIHByb3Bvc2VyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogYFNpZ24gdG8gcHJvcG9zZSAke291dGNvbWUgPyAnWUVTJyA6ICdOTyd9IGFzIHRoZSBvdXRjb21lYCxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3Jlc29sdmVfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG91dGNvbWUgPSBhcmdzLm91dGNvbWUgYXMgYm9vbGVhbjtcbiAgICAgICAgY29uc3QgcmVzb2x2ZXJXYWxsZXQgPSBhcmdzLnJlc29sdmVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8IG91dGNvbWUgPT09IHVuZGVmaW5lZCB8fCAhcmVzb2x2ZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBvdXRjb21lLCBhbmQgcmVzb2x2ZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkUmVzb2x2ZU1hcmtldFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICBvdXRjb21lLFxuICAgICAgICAgIHJlc29sdmVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogYFNpZ24gdG8gcmVzb2x2ZSBtYXJrZXQgYXMgJHtvdXRjb21lID8gJ1lFUycgOiAnTk8nfWAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9maW5hbGl6ZV9yZXNvbHV0aW9uX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNhbGxlcldhbGxldCA9IGFyZ3MuY2FsbGVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICFjYWxsZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0IGFuZCBjYWxsZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkRmluYWxpemVSZXNvbHV0aW9uVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIGNhbGxlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGZpbmFsaXplIHRoZSByZXNvbHV0aW9uJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3Byb3Bvc2VfcmFjZV9yZXNvbHV0aW9uX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHdpbm5pbmdPdXRjb21lSW5kZXggPSBhcmdzLndpbm5pbmdfb3V0Y29tZV9pbmRleCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IHByb3Bvc2VyV2FsbGV0ID0gYXJncy5wcm9wb3Nlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgd2lubmluZ091dGNvbWVJbmRleCA9PT0gdW5kZWZpbmVkIHx8ICFwcm9wb3NlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgd2lubmluZ19vdXRjb21lX2luZGV4LCBhbmQgcHJvcG9zZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkUHJvcG9zZVJhY2VSZXNvbHV0aW9uVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgd2lubmluZ091dGNvbWVJbmRleCxcbiAgICAgICAgICBwcm9wb3NlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6IGBTaWduIHRvIHByb3Bvc2Ugb3V0Y29tZSAjJHt3aW5uaW5nT3V0Y29tZUluZGV4fSBhcyB3aW5uZXJgLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfcmVzb2x2ZV9yYWNlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHdpbm5pbmdPdXRjb21lSW5kZXggPSBhcmdzLndpbm5pbmdfb3V0Y29tZV9pbmRleCBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IHJlc29sdmVyV2FsbGV0ID0gYXJncy5yZXNvbHZlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgd2lubmluZ091dGNvbWVJbmRleCA9PT0gdW5kZWZpbmVkIHx8ICFyZXNvbHZlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdyYWNlX21hcmtldCwgd2lubmluZ19vdXRjb21lX2luZGV4LCBhbmQgcmVzb2x2ZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkUmVzb2x2ZVJhY2VUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICB3aW5uaW5nT3V0Y29tZUluZGV4LFxuICAgICAgICAgIHJlc29sdmVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogYFNpZ24gdG8gcmVzb2x2ZSByYWNlIHdpdGggb3V0Y29tZSAjJHt3aW5uaW5nT3V0Y29tZUluZGV4fWAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9maW5hbGl6ZV9yYWNlX3Jlc29sdXRpb25fdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY2FsbGVyV2FsbGV0ID0gYXJncy5jYWxsZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICFjYWxsZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQgYW5kIGNhbGxlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRGaW5hbGl6ZVJhY2VSZXNvbHV0aW9uVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgY2FsbGVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gZmluYWxpemUgcmFjZSByZXNvbHV0aW9uJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gRElTUFVURVNcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnYnVpbGRfZmxhZ19kaXNwdXRlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGRpc3B1dGVyV2FsbGV0ID0gYXJncy5kaXNwdXRlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhZGlzcHV0ZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0IGFuZCBkaXNwdXRlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRGbGFnRGlzcHV0ZVRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICBkaXNwdXRlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGRpc3B1dGUgdGhlIHJlc29sdXRpb24gKHJlcXVpcmVzIGJvbmQpJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2ZsYWdfcmFjZV9kaXNwdXRlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGRpc3B1dGVyV2FsbGV0ID0gYXJncy5kaXNwdXRlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIXJhY2VNYXJrZXQgfHwgIWRpc3B1dGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0IGFuZCBkaXNwdXRlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRGbGFnUmFjZURpc3B1dGVUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICBkaXNwdXRlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGRpc3B1dGUgdGhlIHJhY2UgcmVzb2x1dGlvbicsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF92b3RlX2NvdW5jaWxfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgdm90ZVllcyA9IGFyZ3Mudm90ZV95ZXMgYXMgYm9vbGVhbjtcbiAgICAgICAgY29uc3Qgdm90ZXJXYWxsZXQgPSBhcmdzLnZvdGVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8IHZvdGVZZXMgPT09IHVuZGVmaW5lZCB8fCAhdm90ZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCB2b3RlX3llcywgYW5kIHZvdGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFZvdGVDb3VuY2lsVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIHZvdGVZZXMsXG4gICAgICAgICAgdm90ZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBgU2lnbiB0byB2b3RlICR7dm90ZVllcyA/ICdZRVMnIDogJ05PJ30gb24gdGhlIGRpc3B1dGVgLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfdm90ZV9jb3VuY2lsX3JhY2VfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3Qgdm90ZU91dGNvbWVJbmRleCA9IGFyZ3Mudm90ZV9vdXRjb21lX2luZGV4IGFzIG51bWJlcjtcbiAgICAgICAgY29uc3Qgdm90ZXJXYWxsZXQgPSBhcmdzLnZvdGVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCB2b3RlT3V0Y29tZUluZGV4ID09PSB1bmRlZmluZWQgfHwgIXZvdGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0LCB2b3RlX291dGNvbWVfaW5kZXgsIGFuZCB2b3Rlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRWb3RlQ291bmNpbFJhY2VUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICB2b3RlT3V0Y29tZUluZGV4LFxuICAgICAgICAgIHZvdGVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogYFNpZ24gdG8gdm90ZSBmb3Igb3V0Y29tZSAjJHt2b3RlT3V0Y29tZUluZGV4fWAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jaGFuZ2VfY291bmNpbF92b3RlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBtYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG5ld1ZvdGVZZXMgPSBhcmdzLm5ld192b3RlX3llcyBhcyBib29sZWFuO1xuICAgICAgICBjb25zdCB2b3RlcldhbGxldCA9IGFyZ3Mudm90ZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgbmV3Vm90ZVllcyA9PT0gdW5kZWZpbmVkIHx8ICF2b3RlcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIG5ld192b3RlX3llcywgYW5kIHZvdGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENoYW5nZUNvdW5jaWxWb3RlVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIG5ld1ZvdGVZZXMsXG4gICAgICAgICAgdm90ZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBgU2lnbiB0byBjaGFuZ2UgeW91ciB2b3RlIHRvICR7bmV3Vm90ZVllcyA/ICdZRVMnIDogJ05PJ31gLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY2hhbmdlX2NvdW5jaWxfdm90ZV9yYWNlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG5ld1ZvdGVPdXRjb21lSW5kZXggPSBhcmdzLm5ld192b3RlX291dGNvbWVfaW5kZXggYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCB2b3RlcldhbGxldCA9IGFyZ3Mudm90ZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8IG5ld1ZvdGVPdXRjb21lSW5kZXggPT09IHVuZGVmaW5lZCB8fCAhdm90ZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIG5ld192b3RlX291dGNvbWVfaW5kZXgsIGFuZCB2b3Rlcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDaGFuZ2VDb3VuY2lsVm90ZVJhY2VUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICBuZXdWb3RlT3V0Y29tZUluZGV4LFxuICAgICAgICAgIHZvdGVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogYFNpZ24gdG8gY2hhbmdlIHlvdXIgdm90ZSB0byBvdXRjb21lICMke25ld1ZvdGVPdXRjb21lSW5kZXh9YCxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gV0hJVEVMSVNUIE1BTkFHRU1FTlRcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnYnVpbGRfYWRkX3RvX3doaXRlbGlzdF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCB1c2VyVG9BZGQgPSBhcmdzLnVzZXJfdG9fYWRkIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhdXNlclRvQWRkIHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCwgdXNlcl90b19hZGQsIGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEFkZFRvV2hpdGVsaXN0VHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIHVzZXJUb0FkZCxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIHdoaXRlbGlzdFBkYTogcmVzdWx0LndoaXRlbGlzdFBkYSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGFkZCB1c2VyIHRvIHdoaXRlbGlzdCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9yZW1vdmVfZnJvbV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IG1hcmtldCA9IGFyZ3MubWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlclRvUmVtb3ZlID0gYXJncy51c2VyX3RvX3JlbW92ZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgIXVzZXJUb1JlbW92ZSB8fCAhY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIHVzZXJfdG9fcmVtb3ZlLCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRSZW1vdmVGcm9tV2hpdGVsaXN0VHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIHVzZXJUb1JlbW92ZSxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gcmVtb3ZlIHVzZXIgZnJvbSB3aGl0ZWxpc3QnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY3JlYXRlX3JhY2Vfd2hpdGVsaXN0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0IGFuZCBjcmVhdG9yX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENyZWF0ZVJhY2VXaGl0ZWxpc3RUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICBjcmVhdG9yV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIHdoaXRlbGlzdFBkYTogcmVzdWx0LndoaXRlbGlzdFBkYSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNyZWF0ZSByYWNlIHdoaXRlbGlzdCcsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9hZGRfdG9fcmFjZV93aGl0ZWxpc3RfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IHJhY2VNYXJrZXQgPSBhcmdzLnJhY2VfbWFya2V0IGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgdXNlclRvQWRkID0gYXJncy51c2VyX3RvX2FkZCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNyZWF0b3JXYWxsZXQgPSBhcmdzLmNyZWF0b3Jfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICF1c2VyVG9BZGQgfHwgIWNyZWF0b3JXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIHVzZXJfdG9fYWRkLCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRBZGRUb1JhY2VXaGl0ZWxpc3RUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICB1c2VyVG9BZGQsXG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGFkZCB1c2VyIHRvIHJhY2Ugd2hpdGVsaXN0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX3JlbW92ZV9mcm9tX3JhY2Vfd2hpdGVsaXN0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHVzZXJUb1JlbW92ZSA9IGFyZ3MudXNlcl90b19yZW1vdmUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCAhdXNlclRvUmVtb3ZlIHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0LCB1c2VyX3RvX3JlbW92ZSwgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkUmVtb3ZlRnJvbVJhY2VXaGl0ZWxpc3RUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICB1c2VyVG9SZW1vdmUsXG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIHJlbW92ZSB1c2VyIGZyb20gcmFjZSB3aGl0ZWxpc3QnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBDUkVBVE9SIFBST0ZJTEVTXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2J1aWxkX2NyZWF0ZV9jcmVhdG9yX3Byb2ZpbGVfdHJhbnNhY3Rpb24nOiB7XG4gICAgICAgIGNvbnN0IGRpc3BsYXlOYW1lID0gYXJncy5kaXNwbGF5X25hbWUgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjcmVhdG9yRmVlQnBzID0gYXJncy5jcmVhdG9yX2ZlZV9icHMgYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghZGlzcGxheU5hbWUgfHwgY3JlYXRvckZlZUJwcyA9PT0gdW5kZWZpbmVkIHx8ICFjcmVhdG9yV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ2Rpc3BsYXlfbmFtZSwgY3JlYXRvcl9mZWVfYnBzLCBhbmQgY3JlYXRvcl93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDcmVhdGVDcmVhdG9yUHJvZmlsZVRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBkaXNwbGF5TmFtZSxcbiAgICAgICAgICBjcmVhdG9yRmVlQnBzLFxuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgY3JlYXRvclByb2ZpbGVQZGE6IHJlc3VsdC5jcmVhdG9yUHJvZmlsZVBkYSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNyZWF0ZSB5b3VyIGNyZWF0b3IgcHJvZmlsZScsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF91cGRhdGVfY3JlYXRvcl9wcm9maWxlX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBkaXNwbGF5TmFtZSA9IGFyZ3MuZGlzcGxheV9uYW1lIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgZGVmYXVsdEZlZUJwcyA9IGFyZ3MuZGVmYXVsdF9mZWVfYnBzIGFzIG51bWJlcjtcbiAgICAgICAgY29uc3QgY3JlYXRvcldhbGxldCA9IGFyZ3MuY3JlYXRvcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIWRpc3BsYXlOYW1lIHx8IGRlZmF1bHRGZWVCcHMgPT09IHVuZGVmaW5lZCB8fCAhY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdkaXNwbGF5X25hbWUsIGRlZmF1bHRfZmVlX2JwcywgYW5kIGNyZWF0b3Jfd2FsbGV0IGFyZSBhbGwgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZFVwZGF0ZUNyZWF0b3JQcm9maWxlVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIGRpc3BsYXlOYW1lLFxuICAgICAgICAgIGRlZmF1bHRGZWVCcHMsXG4gICAgICAgICAgY3JlYXRvcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIHVwZGF0ZSB5b3VyIGNyZWF0b3IgcHJvZmlsZScsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jbGFpbV9jcmVhdG9yX3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCBjcmVhdG9yV2FsbGV0ID0gYXJncy5jcmVhdG9yX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghY3JlYXRvcldhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdjcmVhdG9yX3dhbGxldCBpcyByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2xhaW1DcmVhdG9yVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIGNyZWF0b3JXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBjbGFpbSB5b3VyIGNyZWF0b3IgZmVlcyBmcm9tIHNvbF90cmVhc3VyeScsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIE1BUktFVCBNQU5BR0VNRU5UXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIGNhc2UgJ2J1aWxkX2Nsb3NlX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBjYWxsZXJXYWxsZXQgPSBhcmdzLmNhbGxlcl93YWxsZXQgYXMgc3RyaW5nO1xuICAgICAgICBpZiAoIW1hcmtldCB8fCAhY2FsbGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ21hcmtldCBhbmQgY2FsbGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZENsb3NlTWFya2V0VHJhbnNhY3Rpb24oe1xuICAgICAgICAgIG1hcmtldFBkYTogbWFya2V0LFxuICAgICAgICAgIGNhbGxlcldhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNsb3NlIGJldHRpbmcgb24gdGhpcyBtYXJrZXQnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfZXh0ZW5kX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBuZXdDbG9zaW5nVGltZVN0ciA9IGFyZ3MubmV3X2Nsb3NpbmdfdGltZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG5ld1Jlc29sdXRpb25UaW1lU3RyID0gYXJncy5uZXdfcmVzb2x1dGlvbl90aW1lIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgY2FsbGVyV2FsbGV0ID0gYXJncy5jYWxsZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFtYXJrZXQgfHwgIW5ld0Nsb3NpbmdUaW1lU3RyIHx8ICFjYWxsZXJXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgnbWFya2V0LCBuZXdfY2xvc2luZ190aW1lLCBhbmQgY2FsbGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuZXdDbG9zaW5nVGltZSA9IE1hdGguZmxvb3IobmV3IERhdGUobmV3Q2xvc2luZ1RpbWVTdHIpLmdldFRpbWUoKSAvIDEwMDApO1xuICAgICAgICBjb25zdCBuZXdSZXNvbHV0aW9uVGltZSA9IG5ld1Jlc29sdXRpb25UaW1lU3RyXG4gICAgICAgICAgPyBNYXRoLmZsb29yKG5ldyBEYXRlKG5ld1Jlc29sdXRpb25UaW1lU3RyKS5nZXRUaW1lKCkgLyAxMDAwKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEV4dGVuZE1hcmtldFRyYW5zYWN0aW9uKHtcbiAgICAgICAgICBtYXJrZXRQZGE6IG1hcmtldCxcbiAgICAgICAgICBuZXdDbG9zaW5nVGltZSxcbiAgICAgICAgICBuZXdSZXNvbHV0aW9uVGltZSxcbiAgICAgICAgICBjYWxsZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBleHRlbmQgbWFya2V0IGRlYWRsaW5lJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2Nsb3NlX3JhY2VfbWFya2V0X3RyYW5zYWN0aW9uJzoge1xuICAgICAgICBjb25zdCByYWNlTWFya2V0ID0gYXJncy5yYWNlX21hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGNhbGxlcldhbGxldCA9IGFyZ3MuY2FsbGVyX3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCAhY2FsbGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0IGFuZCBjYWxsZXJfd2FsbGV0IGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1aWxkQ2xvc2VSYWNlTWFya2V0VHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgY2FsbGVyV2FsbGV0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgICAgdHJhbnNhY3Rpb246IHsgc2VyaWFsaXplZDogcmVzdWx0LnNlcmlhbGl6ZWRUeCB9LFxuICAgICAgICAgIGluc3RydWN0aW9uczogJ1NpZ24gdG8gY2xvc2UgYmV0dGluZyBvbiB0aGlzIHJhY2UgbWFya2V0JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2J1aWxkX2V4dGVuZF9yYWNlX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBuZXdDbG9zaW5nVGltZVN0ciA9IGFyZ3MubmV3X2Nsb3NpbmdfdGltZSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG5ld1Jlc29sdXRpb25UaW1lU3RyID0gYXJncy5uZXdfcmVzb2x1dGlvbl90aW1lIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgY2FsbGVyV2FsbGV0ID0gYXJncy5jYWxsZXJfd2FsbGV0IGFzIHN0cmluZztcbiAgICAgICAgaWYgKCFyYWNlTWFya2V0IHx8ICFuZXdDbG9zaW5nVGltZVN0ciB8fCAhY2FsbGVyV2FsbGV0KSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoJ3JhY2VfbWFya2V0LCBuZXdfY2xvc2luZ190aW1lLCBhbmQgY2FsbGVyX3dhbGxldCBhcmUgcmVxdWlyZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuZXdDbG9zaW5nVGltZSA9IE1hdGguZmxvb3IobmV3IERhdGUobmV3Q2xvc2luZ1RpbWVTdHIpLmdldFRpbWUoKSAvIDEwMDApO1xuICAgICAgICBjb25zdCBuZXdSZXNvbHV0aW9uVGltZSA9IG5ld1Jlc29sdXRpb25UaW1lU3RyXG4gICAgICAgICAgPyBNYXRoLmZsb29yKG5ldyBEYXRlKG5ld1Jlc29sdXRpb25UaW1lU3RyKS5nZXRUaW1lKCkgLyAxMDAwKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEV4dGVuZFJhY2VNYXJrZXRUcmFuc2FjdGlvbih7XG4gICAgICAgICAgcmFjZU1hcmtldFBkYTogcmFjZU1hcmtldCxcbiAgICAgICAgICBuZXdDbG9zaW5nVGltZSxcbiAgICAgICAgICBuZXdSZXNvbHV0aW9uVGltZSxcbiAgICAgICAgICBjYWxsZXJXYWxsZXQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0cmFuc2FjdGlvbjogeyBzZXJpYWxpemVkOiByZXN1bHQuc2VyaWFsaXplZFR4IH0sXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnU2lnbiB0byBleHRlbmQgcmFjZSBtYXJrZXQgZGVhZGxpbmUnLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYnVpbGRfY2FuY2VsX21hcmtldF90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0ID0gYXJncy5tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCByZWFzb24gPSBhcmdzLnJlYXNvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGF1dGhvcml0eVdhbGxldCA9IGFyZ3MuYXV0aG9yaXR5X3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghbWFya2V0IHx8ICFyZWFzb24gfHwgIWF1dGhvcml0eVdhbGxldCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQsIHJlYXNvbiwgYW5kIGF1dGhvcml0eV93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDYW5jZWxNYXJrZXRUcmFuc2FjdGlvbih7XG4gICAgICAgICAgbWFya2V0UGRhOiBtYXJrZXQsXG4gICAgICAgICAgcmVhc29uLFxuICAgICAgICAgIGF1dGhvcml0eVdhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNhbmNlbCB0aGUgbWFya2V0LiBCZXR0b3JzIGNhbiBjbGFpbSByZWZ1bmRzIGFmdGVyLicsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdidWlsZF9jYW5jZWxfcmFjZV90cmFuc2FjdGlvbic6IHtcbiAgICAgICAgY29uc3QgcmFjZU1hcmtldCA9IGFyZ3MucmFjZV9tYXJrZXQgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCByZWFzb24gPSBhcmdzLnJlYXNvbiBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IGF1dGhvcml0eVdhbGxldCA9IGFyZ3MuYXV0aG9yaXR5X3dhbGxldCBhcyBzdHJpbmc7XG4gICAgICAgIGlmICghcmFjZU1hcmtldCB8fCAhcmVhc29uIHx8ICFhdXRob3JpdHlXYWxsZXQpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgncmFjZV9tYXJrZXQsIHJlYXNvbiwgYW5kIGF1dGhvcml0eV93YWxsZXQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVpbGRDYW5jZWxSYWNlVHJhbnNhY3Rpb24oe1xuICAgICAgICAgIHJhY2VNYXJrZXRQZGE6IHJhY2VNYXJrZXQsXG4gICAgICAgICAgcmVhc29uLFxuICAgICAgICAgIGF1dGhvcml0eVdhbGxldCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIHRyYW5zYWN0aW9uOiB7IHNlcmlhbGl6ZWQ6IHJlc3VsdC5zZXJpYWxpemVkVHggfSxcbiAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdTaWduIHRvIGNhbmNlbCB0aGUgcmFjZSBtYXJrZXQuIEJldHRvcnMgY2FuIGNsYWltIHJlZnVuZHMgYWZ0ZXIuJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gQVJFTkEgVE9PTFNcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnZ2V0X2FyZW5hX2xlYWRlcmJvYXJkJzoge1xuICAgICAgICBjb25zdCBwYXBlciA9IGFyZ3MucGFwZXIgPT09IHRydWU7XG4gICAgICAgIGNvbnN0IGxpbWl0ID0gTWF0aC5taW4odHlwZW9mIGFyZ3MubGltaXQgPT09ICdudW1iZXInID8gYXJncy5saW1pdCA6IDUwLCAxMDApO1xuICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgZmV0Y2goYCR7QkFPWklfQkFTRV9VUkx9L2FwaS9hcmVuYS9jdXJyZW50P3BhcGVyPSR7cGFwZXJ9JmxpbWl0PSR7bGltaXR9YCwge1xuICAgICAgICAgIHNpZ25hbDogQWJvcnRTaWduYWwudGltZW91dCgxMDAwMCksXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXJlc3Aub2spIHJldHVybiBlcnJvclJlc3BvbnNlKCdGYWlsZWQgdG8gZmV0Y2ggYXJlbmEgbGVhZGVyYm9hcmQnKTtcbiAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3AuanNvbigpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKGRhdGEpO1xuICAgICAgfVxuXG4gICAgICBjYXNlICdnZXRfYXJlbmFfc2Vhc29uJzoge1xuICAgICAgICBjb25zdCBzZWFzb25JZCA9IGFyZ3Muc2Vhc29uX2lkIGFzIG51bWJlcjtcbiAgICAgICAgaWYgKHNlYXNvbklkID09PSB1bmRlZmluZWQpIHJldHVybiBlcnJvclJlc3BvbnNlKCdzZWFzb25faWQgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgY29uc3QgcGFwZXIgPSBhcmdzLnBhcGVyID09PSB0cnVlO1xuICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgZmV0Y2goYCR7QkFPWklfQkFTRV9VUkx9L2FwaS9hcmVuYS9zZWFzb25zLyR7c2Vhc29uSWR9P3BhcGVyPSR7cGFwZXJ9YCwge1xuICAgICAgICAgIHNpZ25hbDogQWJvcnRTaWduYWwudGltZW91dCgxMDAwMCksXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXJlc3Aub2spIHJldHVybiBlcnJvclJlc3BvbnNlKCdTZWFzb24gbm90IGZvdW5kJyk7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwLmpzb24oKTtcbiAgICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZShkYXRhKTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnc3VibWl0X3BhcGVyX3RyYWRlJzoge1xuICAgICAgICBjb25zdCB3YWxsZXRBZGRyZXNzID0gYXJncy53YWxsZXRfYWRkcmVzcyBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG1hcmtldFBkYSA9IGFyZ3MubWFya2V0X3BkYSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHByZWRpY3RlZFNpZGUgPSBhcmdzLnByZWRpY3RlZF9zaWRlIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgY29uZmlkZW5jZSA9IGFyZ3MuY29uZmlkZW5jZSBhcyBudW1iZXI7XG4gICAgICAgIGlmICghd2FsbGV0QWRkcmVzcyB8fCAhbWFya2V0UGRhIHx8ICFwcmVkaWN0ZWRTaWRlIHx8IGNvbmZpZGVuY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKCd3YWxsZXRfYWRkcmVzcywgbWFya2V0X3BkYSwgcHJlZGljdGVkX3NpZGUsIGFuZCBjb25maWRlbmNlIGFyZSByZXF1aXJlZCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCBmZXRjaChgJHtCQU9aSV9CQVNFX1VSTH0vYXBpL2FyZW5hL3BhcGVyLXRyYWRlYCwge1xuICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgd2FsbGV0QWRkcmVzcywgbWFya2V0UGRhLCBwcmVkaWN0ZWRTaWRlLCBjb25maWRlbmNlIH0pLFxuICAgICAgICAgIHNpZ25hbDogQWJvcnRTaWduYWwudGltZW91dCgxMDAwMCksXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXJlc3Aub2spIHtcbiAgICAgICAgICBjb25zdCBlcnIgPSBhd2FpdCByZXNwLmpzb24oKS5jYXRjaCgoKSA9PiAoe30pKTtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSgoZXJyIGFzIHsgZXJyb3I/OiBzdHJpbmcgfSkuZXJyb3IgfHwgJ0ZhaWxlZCB0byBzdWJtaXQgcGFwZXIgdHJhZGUnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcC5qc29uKCk7XG4gICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2UoZGF0YSk7XG4gICAgICB9XG5cbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gSU5URUwgVE9PTFMgKHg0MDIgUGF5bWVudCBQcm90b2NvbClcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgY2FzZSAnZ2V0X2ludGVsX3NlbnRpbWVudCc6XG4gICAgICBjYXNlICdnZXRfaW50ZWxfd2hhbGVfbW92ZXMnOlxuICAgICAgY2FzZSAnZ2V0X2ludGVsX3Jlc29sdXRpb25fZm9yZWNhc3QnOlxuICAgICAgY2FzZSAnZ2V0X2ludGVsX21hcmtldF9hbHBoYSc6IHtcbiAgICAgICAgY29uc3QgaW50ZWxNYXJrZXQgPSBhcmdzLm1hcmtldCBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IHBheW1lbnRUeCA9IGFyZ3MucGF5bWVudF90eCBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmICghaW50ZWxNYXJrZXQpIHJldHVybiBlcnJvclJlc3BvbnNlKCdtYXJrZXQgaXMgcmVxdWlyZWQnKTtcblxuICAgICAgICBjb25zdCBpbnRlbFR5cGUgPSBuYW1lLnJlcGxhY2UoJ2dldF9pbnRlbF8nLCAnJykucmVwbGFjZSgvXy9nLCAnLScpO1xuICAgICAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH07XG4gICAgICAgIGlmIChwYXltZW50VHgpIGhlYWRlcnNbJ1gtUGF5bWVudC1UeCddID0gcGF5bWVudFR4O1xuXG4gICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCBmZXRjaChgJHtCQU9aSV9CQVNFX1VSTH0vYXBpL2ludGVsLyR7aW50ZWxUeXBlfT9tYXJrZXQ9JHtpbnRlbE1hcmtldH1gLCB7XG4gICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoMTUwMDApLFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAocmVzcC5zdGF0dXMgPT09IDQwMikge1xuICAgICAgICAgIGNvbnN0IHBheW1lbnRJbmZvID0gYXdhaXQgcmVzcC5qc29uKCkgYXMgeyBwcmljZT86IHVua25vd247IHBheW1lbnRBZGRyZXNzPzogdW5rbm93bjsgaW5zdHJ1Y3Rpb25zPzogdW5rbm93biB9O1xuICAgICAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgICAgcmVxdWlyZXNQYXltZW50OiB0cnVlLFxuICAgICAgICAgICAgcHJpY2U6IHBheW1lbnRJbmZvLnByaWNlLFxuICAgICAgICAgICAgY3VycmVuY3k6ICdTT0wnLFxuICAgICAgICAgICAgcGF5bWVudEFkZHJlc3M6IHBheW1lbnRJbmZvLnBheW1lbnRBZGRyZXNzLFxuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBwYXltZW50SW5mby5pbnN0cnVjdGlvbnMsXG4gICAgICAgICAgICBoaW50OiAnU2VuZCB0aGUgc3BlY2lmaWVkIFNPTCBhbW91bnQgdG8gdGhlIHBheW1lbnQgYWRkcmVzcywgdGhlbiByZXRyeSB3aXRoIHRoZSB0cmFuc2FjdGlvbiBzaWduYXR1cmUgaW4gcGF5bWVudF90eCBwYXJhbWV0ZXIuJyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghcmVzcC5vaykge1xuICAgICAgICAgIGNvbnN0IGVyciA9IGF3YWl0IHJlc3AuanNvbigpLmNhdGNoKCgpID0+ICh7fSkpO1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKChlcnIgYXMgeyBlcnJvcj86IHN0cmluZyB9KS5lcnJvciB8fCBgSW50ZWwgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcC5zdGF0dXN9KWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3AuanNvbigpO1xuICAgICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKGRhdGEpO1xuICAgICAgfVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShgVW5rbm93biB0b29sOiAke25hbWV9YCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InKTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSEVMUEVSU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDcmVhdGUgYSBzaWduLWxpbmsgVVJMIGZvciBhIHRyYW5zYWN0aW9uIChiZXN0LWVmZm9ydCwgbm9uLWJsb2NraW5nKS5cbiAqIFJldHVybnMgbnVsbCBpZiB0aGUgQVBJIGlzIHVuYXZhaWxhYmxlIG9yIHNpZ24tbGluayBjcmVhdGlvbiBmYWlscy5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gY3JlYXRlU2lnblVybChcbiAgc2VyaWFsaXplZFR4OiBzdHJpbmcsXG4gIG1ldGFkYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxuKTogUHJvbWlzZTx7IHNpZ25Vcmw6IHN0cmluZzsgZXhwaXJlc0F0OiBzdHJpbmcgfSB8IG51bGw+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwID0gYXdhaXQgZmV0Y2goYCR7QkFPWklfQkFTRV9VUkx9L2FwaS9zaWduYCwge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgdHJhbnNhY3Rpb246IHNlcmlhbGl6ZWRUeCwgbWV0YWRhdGEgfSksXG4gICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoNTAwMCksXG4gICAgfSk7XG4gICAgaWYgKCFyZXNwLm9rKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcC5qc29uKCkgYXMgeyBzaWduVXJsPzogc3RyaW5nOyBleHBpcmVzQXQ/OiBzdHJpbmcgfTtcbiAgICBpZiAoZGF0YS5zaWduVXJsKSByZXR1cm4geyBzaWduVXJsOiBkYXRhLnNpZ25VcmwsIGV4cGlyZXNBdDogZGF0YS5leHBpcmVzQXQgfHwgJycgfTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBWZXJpZnkgYSBtYW5kYXRlIGZvciBhIHNwZWNpZmljIGFjdGlvbiAod2hlbiBCQU9aSV9NQU5EQVRFX0lEIGlzIHNldCkuXG4gKiBSZXR1cm5zIGVycm9yIHN0cmluZyBpZiBkZW5pZWQsIG51bGwgaWYgYXBwcm92ZWQgb3Igbm8gbWFuZGF0ZSBjb25maWd1cmVkLlxuICovXG5hc3luYyBmdW5jdGlvbiBjaGVja01hbmRhdGUoXG4gIGFjdGlvbjogc3RyaW5nLFxuICBncmFudGVlV2FsbGV0OiBzdHJpbmcsXG4gIGRldGFpbHM/OiB7IGFtb3VudFNvbD86IG51bWJlcjsgbGF5ZXI/OiBzdHJpbmc7IG1hcmtldFBkYT86IHN0cmluZyB9XG4pOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgaWYgKCFNQU5EQVRFX0lEKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwID0gYXdhaXQgZmV0Y2goYCR7QkFPWklfQkFTRV9VUkx9L2FwaS9tYW5kYXRlcy92ZXJpZnlgLCB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtYW5kYXRlSWQ6IE1BTkRBVEVfSUQsXG4gICAgICAgIGdyYW50ZWVXYWxsZXQsXG4gICAgICAgIGFjdGlvbixcbiAgICAgICAgYWN0aW9uRGV0YWlsczogZGV0YWlscyxcbiAgICAgIH0pLFxuICAgICAgc2lnbmFsOiBBYm9ydFNpZ25hbC50aW1lb3V0KDUwMDApLFxuICAgIH0pO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwLmpzb24oKSBhcyB7IGFwcHJvdmVkOiBib29sZWFuOyBlcnJvcj86IHN0cmluZyB9O1xuICAgIGlmICghZGF0YS5hcHByb3ZlZCkge1xuICAgICAgcmV0dXJuIGRhdGEuZXJyb3IgfHwgJ01hbmRhdGUgZGVuaWVkIHRoaXMgYWN0aW9uJztcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiAnTWFuZGF0ZSB2ZXJpZmljYXRpb24gZmFpbGVkIChuZXR3b3JrIGVycm9yKSc7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3VjY2Vzc1Jlc3BvbnNlKGRhdGE6IHVua25vd24pOiB7IGNvbnRlbnQ6IEFycmF5PHsgdHlwZTogc3RyaW5nOyB0ZXh0OiBzdHJpbmcgfT4gfSB7XG4gIHJldHVybiB7XG4gICAgY29udGVudDogW1xuICAgICAge1xuICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgIHRleHQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgIG5ldHdvcms6ICdtYWlubmV0LWJldGEnLFxuICAgICAgICAgIHByb2dyYW1JZDogUFJPR1JBTV9JRC50b0Jhc2U1OCgpLFxuICAgICAgICAgIC4uLmRhdGEgYXMgb2JqZWN0LFxuICAgICAgICB9LCBudWxsLCAyKSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShtZXNzYWdlOiBzdHJpbmcpOiB7IGNvbnRlbnQ6IEFycmF5PHsgdHlwZTogc3RyaW5nOyB0ZXh0OiBzdHJpbmcgfT4gfSB7XG4gIHJldHVybiB7XG4gICAgY29udGVudDogW1xuICAgICAge1xuICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgIHRleHQ6IEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBtZXNzYWdlIH0pLFxuICAgICAgfSxcbiAgICBdLFxuICB9O1xufVxuIl19