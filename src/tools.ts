/**
 * MCP Tool Definitions for Baozi Markets
 * V4.0.0 - Full Protocol Coverage + Market Creation + AI Agent Network
 */
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

// Handlers
import { listMarkets, getMarket, getMarketForBetting } from './handlers/markets.js';
import { getQuote, getQuoteWithMarketData } from './handlers/quote.js';
import { getPositionsSummary } from './handlers/positions.js';
import { getClaimablePositions, getAffiliateByCode as getAffiliateByCodeFromClaims } from './handlers/claims.js';
import { listRaceMarkets, getRaceMarket, getRaceQuote } from './handlers/race-markets.js';
import { getResolutionStatus, getDisputedMarkets, getMarketsAwaitingResolution } from './handlers/resolution.js';
import {
  isAffiliateCodeAvailable,
  suggestAffiliateCodes,
  getAffiliateByCode,
  getAffiliatesByOwner,
  getReferralsByAffiliate,
  getAgentNetworkStats,
  formatAffiliateLink,
  getCommissionInfo,
} from './handlers/agent-network.js';
import {
  previewMarketCreation,
  previewRaceMarketCreation,
  createLabMarket,
  createPrivateMarket,
  createRaceMarket,
  getAllCreationFees,
  getAllPlatformFees,
  getTimingConstraints,
  generateInviteHash,
} from './handlers/market-creation.js';

// Validation
import { validateMarketTiming, MarketTimingParams } from './validation/market-rules.js';
import { validateBet, calculateBetQuote } from './validation/bet-rules.js';
import { validateMarketCreation } from './validation/creation-rules.js';

// Transaction Builders
import { buildBetTransaction, fetchAndBuildBetTransaction, simulateBetTransaction } from './builders/bet-transaction.js';
import {
  buildClaimWinningsTransaction,
  buildClaimRefundTransaction,
  buildClaimAffiliateTransaction,
  buildBatchClaimTransaction,
} from './builders/claim-transaction.js';
import { buildRegisterAffiliateTransaction, buildToggleAffiliateTransaction } from './builders/affiliate-transaction.js';
import { fetchAndBuildRaceBetTransaction, buildClaimRaceWinningsTransaction, buildClaimRaceRefundTransaction } from './builders/race-transaction.js';
import { getNextMarketId, previewMarketPda, previewRaceMarketPda } from './builders/market-creation-tx.js';

// Resolution Builders
import {
  buildProposeResolutionTransaction,
  buildProposeResolutionHostTransaction,
  buildResolveMarketTransaction,
  buildResolveMarketHostTransaction,
  buildFinalizeResolutionTransaction,
  buildProposeRaceResolutionTransaction,
  buildResolveRaceTransaction,
  buildFinalizeRaceResolutionTransaction,
} from './builders/resolution-transaction.js';

// Dispute Builders
import {
  buildFlagDisputeTransaction,
  buildFlagRaceDisputeTransaction,
  buildVoteCouncilTransaction,
  buildVoteCouncilRaceTransaction,
  buildChangeCouncilVoteTransaction,
  buildChangeCouncilVoteRaceTransaction,
} from './builders/dispute-transaction.js';

// Whitelist Builders
import {
  buildAddToWhitelistTransaction,
  buildRemoveFromWhitelistTransaction,
  buildCreateRaceWhitelistTransaction,
  buildAddToRaceWhitelistTransaction,
  buildRemoveFromRaceWhitelistTransaction,
} from './builders/whitelist-transaction.js';

// Creator Profile Builders
import {
  buildCreateCreatorProfileTransaction,
  buildUpdateCreatorProfileTransaction,
  buildClaimCreatorTransaction,
} from './builders/creator-transaction.js';

// Market Management Builders
import {
  buildCloseMarketTransaction,
  buildExtendMarketTransaction,
  buildCloseRaceMarketTransaction,
  buildExtendRaceMarketTransaction,
  buildCancelMarketTransaction,
  buildCancelRaceTransaction,
} from './builders/market-management-transaction.js';

// Config
import { RPC_ENDPOINT, PROGRAM_ID, BET_LIMITS, TIMING, FEES } from './config.js';

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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_platform_fees',
    description: 'Get platform fee rates for all layers.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_timing_rules',
    description: 'Get v6.2 timing rules and constraints for market creation.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'generate_invite_hash',
    description: 'Generate a random invite hash for private market access control.',
    inputSchema: {
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_markets_awaiting_resolution',
    description: 'List all closed markets awaiting resolution.',
    inputSchema: {
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'format_affiliate_link',
    description: 'Format an affiliate referral link for sharing.',
    inputSchema: {
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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

export async function handleTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    switch (name) {
      // =====================================================================
      // MARKET READ OPERATIONS
      // =====================================================================
      case 'list_markets': {
        const status = args.status as string | undefined;
        const layer = args.layer as string | undefined;
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
        const publicKey = args.publicKey as string;
        if (!publicKey) return errorResponse('publicKey is required');
        const market = await getMarket(publicKey);
        if (!market) return errorResponse(`Market ${publicKey} not found`);
        return successResponse({ market });
      }

      case 'get_quote': {
        const market = args.market as string;
        const side = args.side as 'Yes' | 'No';
        const amount = args.amount as number;
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
        const status = args.status as string | undefined;
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
        const publicKey = args.publicKey as string;
        if (!publicKey) return errorResponse('publicKey is required');
        const market = await getRaceMarket(publicKey);
        if (!market) return errorResponse(`Race market ${publicKey} not found`);
        return successResponse({ market });
      }

      case 'get_race_quote': {
        const marketPda = args.market as string;
        const outcomeIndex = args.outcomeIndex as number;
        const amount = args.amount as number;
        if (!marketPda || outcomeIndex === undefined || amount === undefined) {
          return errorResponse('market, outcomeIndex, and amount are required');
        }
        const market = await getRaceMarket(marketPda);
        if (!market) return errorResponse('Race market not found');
        const quote = getRaceQuote(market, outcomeIndex, amount);
        return successResponse({ quote, market: { question: market.question, outcomes: market.outcomes } });
      }

      // =====================================================================
      // POSITIONS & CLAIMS
      // =====================================================================
      case 'get_positions': {
        const wallet = args.wallet as string;
        if (!wallet) return errorResponse('wallet is required');
        const summary = await getPositionsSummary(wallet);
        return successResponse(summary);
      }

      case 'get_claimable': {
        const wallet = args.wallet as string;
        if (!wallet) return errorResponse('wallet is required');
        const claimable = await getClaimablePositions(wallet);
        return successResponse(claimable);
      }

      // =====================================================================
      // RESOLUTION & DISPUTES
      // =====================================================================
      case 'get_resolution_status': {
        const market = args.market as string;
        if (!market) return errorResponse('market is required');
        const status = await getResolutionStatus(market);
        if (!status) return errorResponse('Market not found');
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
        const code = args.code as string;
        if (!code) return errorResponse('code is required');
        const available = await isAffiliateCodeAvailable(code);
        return successResponse({ code, available });
      }

      case 'suggest_affiliate_codes': {
        const agentName = args.agentName as string;
        const count = (args.count as number) || 5;
        if (!agentName) return errorResponse('agentName is required');
        const suggestions = await suggestAffiliateCodes(agentName, count);
        return successResponse({ suggestions });
      }

      case 'get_affiliate_info': {
        const code = args.code as string;
        if (!code) return errorResponse('code is required');
        const affiliate = await getAffiliateByCode(code);
        if (!affiliate) return errorResponse(`Affiliate ${code} not found`);
        return successResponse({ affiliate });
      }

      case 'get_my_affiliates': {
        const wallet = args.wallet as string;
        if (!wallet) return errorResponse('wallet is required');
        const affiliates = await getAffiliatesByOwner(wallet);
        return successResponse({ count: affiliates.length, affiliates });
      }

      case 'get_referrals': {
        const code = args.code as string;
        if (!code) return errorResponse('code is required');
        const referrals = await getReferralsByAffiliate(code);
        return successResponse({ count: referrals.length, referrals });
      }

      case 'get_agent_network_stats': {
        const stats = await getAgentNetworkStats();
        return successResponse(stats);
      }

      case 'format_affiliate_link': {
        const code = args.code as string;
        const market = args.market as string | undefined;
        if (!code) return errorResponse('code is required');
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
        const params: MarketTimingParams = {
          question: args.question as string,
          closingTime: new Date(args.closing_time as string),
          marketType: args.market_type as 'event' | 'measurement',
          eventTime: args.event_time ? new Date(args.event_time as string) : undefined,
          measurementStart: args.measurement_start ? new Date(args.measurement_start as string) : undefined,
          measurementEnd: args.measurement_end ? new Date(args.measurement_end as string) : undefined,
        };
        const validation = validateMarketTiming(params);
        return successResponse({ validation, rules: TIMING });
      }

      case 'validate_bet': {
        const marketPubkey = args.market as string;
        const amount = args.amount as number;
        const side = args.side as 'Yes' | 'No';
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
        const marketPubkey = args.market as string;
        const outcome = args.outcome as 'yes' | 'no';
        const amountSol = args.amount_sol as number;
        const userWallet = args.user_wallet as string;
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
        const marketPubkey = args.market as string;
        const outcomeIndex = args.outcome_index as number;
        const amountSol = args.amount_sol as number;
        const userWallet = args.user_wallet as string;
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
        const market = args.market as string;
        const position = args.position as string;
        const userWallet = args.user_wallet as string;
        if (!market || !position || !userWallet) {
          return errorResponse('market, position, and user_wallet are required');
        }
        const result = await buildClaimWinningsTransaction({ marketPda: market, positionPda: position, userWallet });
        return successResponse({ transaction: { serialized: result.serializedTx, claimType: result.claimType }, instructions: 'Sign to claim your winnings' });
      }

      case 'build_claim_refund_transaction': {
        const market = args.market as string;
        const position = args.position as string;
        const userWallet = args.user_wallet as string;
        if (!market || !position || !userWallet) {
          return errorResponse('market, position, and user_wallet are required');
        }
        const result = await buildClaimRefundTransaction({ marketPda: market, positionPda: position, userWallet });
        return successResponse({ transaction: { serialized: result.serializedTx, claimType: result.claimType }, instructions: 'Sign to claim your refund' });
      }

      case 'build_batch_claim_transaction': {
        const claims = args.claims as Array<{ market: string; position: string; type: 'winnings' | 'refund' }>;
        const userWallet = args.user_wallet as string;
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
        const code = args.code as string;
        const userWallet = args.user_wallet as string;
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
        const raceMarket = args.race_market as string;
        const position = args.position as string;
        const userWallet = args.user_wallet as string;
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
        const raceMarket = args.race_market as string;
        const position = args.position as string;
        const userWallet = args.user_wallet as string;
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
        const code = args.code as string;
        const userWallet = args.user_wallet as string;
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
        const code = args.code as string;
        const active = args.active as boolean;
        const userWallet = args.user_wallet as string;
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
        const txBase64 = args.transaction as string;
        const userWallet = args.user_wallet as string;
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
        const question = args.question as string;
        const layer = args.layer as 'lab' | 'private';
        const closingTime = args.closing_time as string;
        const resolutionTime = args.resolution_time as string | undefined;
        const marketType = args.market_type as 'event' | 'measurement' | undefined;
        const eventTime = args.event_time as string | undefined;
        const measurementStart = args.measurement_start as string | undefined;
        const measurementEnd = args.measurement_end as string | undefined;
        const creatorWallet = args.creator_wallet as string;

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
        const question = args.question as string;
        const closingTime = args.closing_time as string;
        const resolutionTime = args.resolution_time as string | undefined;
        const marketType = args.market_type as 'event' | 'measurement' | undefined;
        const eventTime = args.event_time as string | undefined;
        const inviteHash = args.invite_hash as string | undefined;
        const creatorWallet = args.creator_wallet as string;

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
        const question = args.question as string;
        const closingTime = args.closing_time as string;
        const resolutionTime = args.resolution_time as string | undefined;
        const marketType = args.market_type as 'event' | 'measurement' | undefined;
        const eventTime = args.event_time as string | undefined;
        const inviteHash = args.invite_hash as string | undefined;
        const creatorWallet = args.creator_wallet as string;

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
        const question = args.question as string;
        const outcomes = args.outcomes as string[];
        const closingTime = args.closing_time as string;
        const resolutionTime = args.resolution_time as string | undefined;
        const creatorWallet = args.creator_wallet as string;

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
        const market = args.market as string;
        const outcome = args.outcome as boolean;
        const proposerWallet = args.proposer_wallet as string;
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
        const market = args.market as string;
        const outcome = args.outcome as boolean;
        const resolverWallet = args.resolver_wallet as string;
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
        const market = args.market as string;
        const callerWallet = args.caller_wallet as string;
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
        const raceMarket = args.race_market as string;
        const winningOutcomeIndex = args.winning_outcome_index as number;
        const proposerWallet = args.proposer_wallet as string;
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
        const raceMarket = args.race_market as string;
        const winningOutcomeIndex = args.winning_outcome_index as number;
        const resolverWallet = args.resolver_wallet as string;
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
        const raceMarket = args.race_market as string;
        const callerWallet = args.caller_wallet as string;
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
        const market = args.market as string;
        const disputerWallet = args.disputer_wallet as string;
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
        const raceMarket = args.race_market as string;
        const disputerWallet = args.disputer_wallet as string;
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
        const market = args.market as string;
        const voteYes = args.vote_yes as boolean;
        const voterWallet = args.voter_wallet as string;
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
        const raceMarket = args.race_market as string;
        const voteOutcomeIndex = args.vote_outcome_index as number;
        const voterWallet = args.voter_wallet as string;
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
        const market = args.market as string;
        const userToAdd = args.user_to_add as string;
        const creatorWallet = args.creator_wallet as string;
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
        const market = args.market as string;
        const userToRemove = args.user_to_remove as string;
        const creatorWallet = args.creator_wallet as string;
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
        const raceMarket = args.race_market as string;
        const creatorWallet = args.creator_wallet as string;
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
        const raceMarket = args.race_market as string;
        const userToAdd = args.user_to_add as string;
        const creatorWallet = args.creator_wallet as string;
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
        const raceMarket = args.race_market as string;
        const userToRemove = args.user_to_remove as string;
        const creatorWallet = args.creator_wallet as string;
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
        const displayName = args.display_name as string;
        const creatorFeeBps = args.creator_fee_bps as number;
        const creatorWallet = args.creator_wallet as string;
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
        const displayName = args.display_name as string;
        const defaultFeeBps = args.default_fee_bps as number;
        const creatorWallet = args.creator_wallet as string;
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
        const creatorWallet = args.creator_wallet as string;
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
        const market = args.market as string;
        const callerWallet = args.caller_wallet as string;
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
        const market = args.market as string;
        const newClosingTimeStr = args.new_closing_time as string;
        const newResolutionTimeStr = args.new_resolution_time as string | undefined;
        const callerWallet = args.caller_wallet as string;
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
        const raceMarket = args.race_market as string;
        const callerWallet = args.caller_wallet as string;
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
        const raceMarket = args.race_market as string;
        const newClosingTimeStr = args.new_closing_time as string;
        const newResolutionTimeStr = args.new_resolution_time as string | undefined;
        const callerWallet = args.caller_wallet as string;
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
        const market = args.market as string;
        const reason = args.reason as string;
        const authorityWallet = args.authority_wallet as string;
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
        const raceMarket = args.race_market as string;
        const reason = args.reason as string;
        const authorityWallet = args.authority_wallet as string;
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
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function successResponse(data: unknown): { content: Array<{ type: string; text: string }> } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          network: 'mainnet-beta',
          programId: PROGRAM_ID.toBase58(),
          ...data as object,
        }, null, 2),
      },
    ],
  };
}

function errorResponse(message: string): { content: Array<{ type: string; text: string }> } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ success: false, error: message }),
      },
    ],
  };
}
