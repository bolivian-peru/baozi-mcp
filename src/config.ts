/**
 * Baozi MCP Server Configuration
 * Mainnet-ready configuration for V4.7.6
 */
import { PublicKey } from '@solana/web3.js';

// =============================================================================
// NETWORK CONFIGURATION
// =============================================================================

export const NETWORK = (process.env.SOLANA_NETWORK || 'mainnet-beta') as 'mainnet-beta' | 'devnet';
export const IS_MAINNET = NETWORK === 'mainnet-beta';

// Program ID (V4.7.6 - Mainnet)
export const PROGRAM_ID = new PublicKey(
  process.env.BAOZI_PROGRAM_ID || 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ'
);

// RPC Endpoints
// Priority: HELIUS_RPC_URL > SOLANA_RPC_URL > public endpoint
export const RPC_ENDPOINT = process.env.HELIUS_RPC_URL
  || process.env.SOLANA_RPC_URL
  || (IS_MAINNET
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com');

// =============================================================================
// PDA SEEDS
// =============================================================================

export const SEEDS = {
  CONFIG: Buffer.from('config'),
  MARKET: Buffer.from('market'),
  POSITION: Buffer.from('position'),
  RACE: Buffer.from('race'),
  RACE_POSITION: Buffer.from('race_position'),
  WHITELIST: Buffer.from('whitelist'),
  RACE_WHITELIST: Buffer.from('race_whitelist'),
  AFFILIATE: Buffer.from('affiliate'),
  CREATOR_PROFILE: Buffer.from('creator_profile'),
  SOL_TREASURY: Buffer.from('sol_treasury'),
  REVENUE_CONFIG: Buffer.from('revenue_config'),
  DISPUTE_META: Buffer.from('dispute_meta'),
} as const;

// Derive Config PDA
const [derivedConfigPda] = PublicKey.findProgramAddressSync(
  [SEEDS.CONFIG],
  PROGRAM_ID
);
export const CONFIG_PDA = derivedConfigPda;

// Derive Sol Treasury PDA
const [derivedSolTreasuryPda] = PublicKey.findProgramAddressSync(
  [SEEDS.SOL_TREASURY],
  PROGRAM_ID
);
export const SOL_TREASURY_PDA = derivedSolTreasuryPda;

// =============================================================================
// ACCOUNT DISCRIMINATORS (first 8 bytes of sha256 hash)
// =============================================================================

export const DISCRIMINATORS = {
  // Boolean Market
  MARKET: Buffer.from([219, 190, 213, 55, 0, 227, 198, 154]),
  MARKET_BASE58: 'FcJn7zePJQ1',

  // User Position (Boolean)
  USER_POSITION: Buffer.from([251, 248, 209, 245, 83, 234, 17, 27]),
  USER_POSITION_BASE58: 'j9SjDYAWesU',

  // Race Market
  RACE_MARKET: Buffer.from([149, 8, 156, 202, 160, 252, 176, 217]),

  // Race Position
  RACE_POSITION: Buffer.from([44, 182, 16, 1, 230, 14, 174, 46]),
  RACE_POSITION_BASE58: '8Ukm3FYuL6H',

  // Global Config
  GLOBAL_CONFIG: Buffer.from([149, 8, 156, 202, 160, 252, 176, 217]),

  // Creator Profile
  CREATOR_PROFILE: Buffer.from([83, 210, 28, 6, 46, 183, 224, 219]),

  // Affiliate
  AFFILIATE: Buffer.from([24, 240, 16, 245, 33, 46, 77, 168]),

  // Referred User (for affiliate tracking)
  REFERRED_USER: Buffer.from([188, 210, 247, 185, 105, 204, 220, 46]),

  // Dispute Meta
  DISPUTE_META: Buffer.from([62, 14, 221, 64, 175, 241, 48, 165]),
} as const;

// =============================================================================
// FEE CONFIGURATION
// =============================================================================

export const FEES = {
  // Platform fees by layer (bps = basis points, 100 bps = 1%)
  OFFICIAL_PLATFORM_FEE_BPS: 250, // 2.5%
  LAB_PLATFORM_FEE_BPS: 300,      // 3%
  PRIVATE_PLATFORM_FEE_BPS: 200,  // 2%

  // Creation fees (in lamports)
  OFFICIAL_CREATION_FEE: 10_000_000,  // 0.01 SOL
  LAB_CREATION_FEE: 10_000_000,       // 0.01 SOL
  PRIVATE_CREATION_FEE: 10_000_000,   // 0.01 SOL

  // Fee split (within platform fee)
  AFFILIATE_FEE_BPS: 100,  // 1%
  CREATOR_FEE_BPS: 50,     // 0.5% (default, can vary)

  BPS_DENOMINATOR: 10000,
} as const;

// =============================================================================
// BET LIMITS
// =============================================================================

export const BET_LIMITS = {
  MIN_BET_SOL: 0.01,
  MAX_BET_SOL: 100,
  MIN_BET_LAMPORTS: 10_000_000,   // 0.01 SOL
  MAX_BET_LAMPORTS: 100_000_000_000, // 100 SOL
} as const;

// =============================================================================
// TIMING CONSTANTS
// =============================================================================

export const TIMING = {
  // Betting freeze before close (seconds)
  BETTING_FREEZE_SECONDS: 300, // 5 minutes

  // Minimum buffer between closing time and event (hours)
  MIN_EVENT_BUFFER_HOURS: 12,
  RECOMMENDED_EVENT_BUFFER_HOURS: 24,

  // Maximum market duration
  MAX_MARKET_DURATION_DAYS: 365,

  // Resolution timing
  MIN_RESOLUTION_BUFFER_SECONDS: 600,  // 10 minutes
  MAX_RESOLUTION_BUFFER_SECONDS: 604800, // 7 days

  // Dispute window
  DISPUTE_WINDOW_SECONDS: 86400, // 24 hours
} as const;

// =============================================================================
// MARKET STATUS & OUTCOME ENUMS
// =============================================================================

export const MARKET_STATUS = {
  ACTIVE: 0,
  CLOSED: 1,
  RESOLVED: 2,
  CANCELLED: 3,
  PAUSED: 4,
  RESOLVED_PENDING: 5,
  DISPUTED: 6,
} as const;

export const MARKET_STATUS_NAMES: Record<number, string> = {
  0: 'Active',
  1: 'Closed',
  2: 'Resolved',
  3: 'Cancelled',
  4: 'Paused',
  5: 'ResolvedPending',
  6: 'Disputed',
};

export const MARKET_OUTCOME = {
  UNDECIDED: 0,
  INVALID: 1,
  YES: 2,
  NO: 3,
} as const;

export const MARKET_OUTCOME_NAMES: Record<number, string> = {
  0: 'Undecided',
  1: 'Invalid',
  2: 'Yes',
  3: 'No',
};

export const MARKET_LAYER = {
  OFFICIAL: 0,
  LAB: 1,
  PRIVATE: 2,
} as const;

export const MARKET_LAYER_NAMES: Record<number, string> = {
  0: 'Official',
  1: 'Lab',
  2: 'Private',
};

export const MARKET_TYPE = {
  EVENT: 0,      // Event-based (Rule A)
  MEASUREMENT: 1, // Measurement-period (Rule B)
} as const;

export const MARKET_TYPE_NAMES: Record<number, string> = {
  0: 'Event',
  1: 'Measurement',
};

export const ACCESS_GATE = {
  PUBLIC: 0,
  WHITELIST: 1,
} as const;

// =============================================================================
// CURRENCY TYPES
// =============================================================================

export const CURRENCY_TYPE = {
  SOL: 0,
  USDC: 1,
} as const;

export const CURRENCY_TYPE_NAMES: Record<number, string> = {
  0: 'Sol',
  1: 'Usdc',
};

// =============================================================================
// ERROR CODES (from IDL)
// =============================================================================

export const ERROR_CODES: Record<number, string> = {
  6000: 'NotExpectedAdmin',
  6001: 'NotAdmin',
  6002: 'NotAdminOrGuardian',
  6003: 'InvalidUsdcMint',
  6004: 'InvalidTreasury',
  6005: 'InvalidVault',
  6006: 'ProtocolPaused',
  6007: 'MarketPaused',
  6008: 'QuestionTooLong',
  6009: 'ClosingTimeInPast',
  6010: 'ClosingTimeTooFar',
  6011: 'EventStartTimeInPast',
  6012: 'EventStartTimeTooFar',
  6013: 'InvalidAutoStopBuffer',
  6014: 'InvalidResolutionBuffer',
  6015: 'MarketNotOpen',
  6016: 'MarketNotClosed',
  6017: 'MarketNotResolved',
  6018: 'BettingClosed',
  6019: 'EventStarted',
  6020: 'BetTooSmall',
  6021: 'SlippageExceeded',
  6022: 'FeeOnTransferNotSupported',
  6023: 'SnapshotTooEarly',
  6024: 'SnapshotAlreadyTaken',
  6025: 'SnapshotNotTaken',
  6026: 'CloseTooEarly',
  6027: 'ResolutionDeadlinePassed',
  6028: 'InvalidOutcome',
  6029: 'AlreadyResolved',
  6030: 'EmergencyResolveTooEarly',
  6031: 'WrongCurrency',
  6032: 'AlreadyClaimed',
  6033: 'NothingToClaim',
  6034: 'MathOverflow',
  6035: 'TooEarlyToResolve',
  6036: 'FeeTooHigh',
  6037: 'InsufficientVaultBalance',
  6038: 'InvalidPosition',
  6039: 'InvalidTokenAccount',
  6040: 'BettingFrozen',
  6041: 'BetTooLarge',
  6042: 'InsufficientMarketBalance',
};

// =============================================================================
// SYSTEM PROGRAM IDS
// =============================================================================

export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get lamports from SOL
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1_000_000_000));
}

/**
 * Get SOL from lamports
 */
export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / 1_000_000_000;
}

/**
 * Derive market PDA from market ID
 */
export function deriveMarketPda(marketId: number | bigint): [PublicKey, number] {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync(
    [SEEDS.MARKET, marketIdBuffer],
    PROGRAM_ID
  );
}

/**
 * Derive position PDA from market ID and user wallet
 */
export function derivePositionPda(marketId: number | bigint, user: PublicKey): [PublicKey, number] {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync(
    [SEEDS.POSITION, marketIdBuffer, user.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive race position PDA from market ID and user wallet
 */
export function deriveRacePositionPda(marketId: number | bigint, user: PublicKey): [PublicKey, number] {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync(
    [SEEDS.RACE_POSITION, marketIdBuffer, user.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive affiliate PDA from referral code
 */
export function deriveAffiliatePda(referralCode: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.AFFILIATE, Buffer.from(referralCode)],
    PROGRAM_ID
  );
}

/**
 * Get platform fee for a layer
 */
export function getPlatformFeeForLayer(layer: number): number {
  switch (layer) {
    case MARKET_LAYER.OFFICIAL:
      return FEES.OFFICIAL_PLATFORM_FEE_BPS;
    case MARKET_LAYER.LAB:
      return FEES.LAB_PLATFORM_FEE_BPS;
    case MARKET_LAYER.PRIVATE:
      return FEES.PRIVATE_PLATFORM_FEE_BPS;
    default:
      return FEES.LAB_PLATFORM_FEE_BPS;
  }
}

/**
 * Get creation fee for a layer (in lamports)
 */
export function getCreationFeeForLayer(layer: number): number {
  switch (layer) {
    case MARKET_LAYER.OFFICIAL:
      return FEES.OFFICIAL_CREATION_FEE;
    case MARKET_LAYER.LAB:
      return FEES.LAB_CREATION_FEE;
    case MARKET_LAYER.PRIVATE:
      return FEES.PRIVATE_CREATION_FEE;
    default:
      return FEES.LAB_CREATION_FEE;
  }
}
