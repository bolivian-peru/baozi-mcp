/**
 * Market Creation Handler
 *
 * Provides high-level functions for creating markets:
 * - Validation against v6.2 rules
 * - Fee calculation
 * - Transaction building
 * - PDA derivation helpers
 */
import { Connection, PublicKey } from '@solana/web3.js';
import {
  validateMarketCreation,
  getCreationFee,
  calculateResolutionTime,
  calculateRecommendedClosingTime,
  validateQuestion,
  validateRaceOutcomes,
  CreateMarketParams,
  CreationValidationResult,
} from '../validation/creation-rules.js';
import {
  buildCreateLabMarketTransaction,
  buildCreatePrivateMarketTransaction,
  buildCreateRaceMarketTransaction,
  getNextMarketId,
  previewMarketPda,
  previewRaceMarketPda,
} from '../builders/market-creation-tx.js';
import { simulateBetTransaction } from '../builders/bet-transaction.js';
import { FEES, TIMING, RPC_ENDPOINT } from '../config.js';

// =============================================================================
// TYPES
// =============================================================================

export interface MarketCreationPreview {
  validation: CreationValidationResult;
  marketPda?: string;
  marketId?: string;
  creationFeeSol: number;
  platformFeeBps: number;
  estimatedRentSol: number;
  totalCostSol: number;
  recommendedTiming?: {
    closingTime: string;
    resolutionTime: string;
  };
}

export interface CreateMarketRequest {
  question: string;
  layer: 'lab' | 'private';
  closingTime: string; // ISO 8601
  resolutionTime?: string; // ISO 8601, auto-calculated if not provided

  // Event-based (Rule A)
  marketType?: 'event' | 'measurement';
  eventTime?: string; // ISO 8601

  // Measurement-period (Rule B)
  measurementStart?: string;
  measurementEnd?: string;

  // Private market
  inviteHash?: string; // hex string

  // Creator
  creatorWallet: string;
}

export interface CreateRaceMarketRequest {
  question: string;
  outcomes: string[];
  closingTime: string;
  resolutionTime?: string;
  creatorWallet: string;
}

// =============================================================================
// PREVIEW MARKET CREATION
// =============================================================================

/**
 * Preview market creation - validates and returns costs without building tx
 */
export async function previewMarketCreation(
  params: CreateMarketRequest,
  connection?: Connection
): Promise<MarketCreationPreview> {
  const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');

  // Parse dates
  const closingTime = new Date(params.closingTime);
  const eventTime = params.eventTime ? new Date(params.eventTime) : undefined;
  const measurementStart = params.measurementStart ? new Date(params.measurementStart) : undefined;
  const measurementEnd = params.measurementEnd ? new Date(params.measurementEnd) : undefined;

  // Calculate resolution time if not provided
  let resolutionTime: Date;
  if (params.resolutionTime) {
    resolutionTime = new Date(params.resolutionTime);
  } else {
    resolutionTime = calculateResolutionTime(
      closingTime,
      params.marketType || 'event',
      eventTime
    );
  }

  // Validate
  const validation = validateMarketCreation({
    question: params.question,
    closingTime,
    resolutionTime,
    layer: params.layer,
    marketType: params.marketType,
    eventTime,
    measurementStart,
    measurementEnd,
  });

  // Get next market ID
  const { marketId } = await getNextMarketId(conn);
  const { marketPda } = previewMarketPda(marketId);

  // Calculate costs
  const { sol: creationFeeSol } = getCreationFee(params.layer);
  const totalCostSol = creationFeeSol + validation.computed.estimatedRentSol;

  // Recommended timing if event-based and no closing time issues
  let recommendedTiming: { closingTime: string; resolutionTime: string } | undefined;
  if (params.marketType === 'event' && eventTime) {
    const recClose = calculateRecommendedClosingTime(eventTime);
    const recRes = calculateResolutionTime(recClose, 'event', eventTime);
    recommendedTiming = {
      closingTime: recClose.toISOString(),
      resolutionTime: recRes.toISOString(),
    };
  }

  return {
    validation,
    marketPda: validation.valid ? marketPda : undefined,
    marketId: validation.valid ? marketId.toString() : undefined,
    creationFeeSol,
    platformFeeBps: validation.computed.platformFeeBps,
    estimatedRentSol: validation.computed.estimatedRentSol,
    totalCostSol,
    recommendedTiming,
  };
}

/**
 * Preview race market creation
 */
export async function previewRaceMarketCreation(
  params: CreateRaceMarketRequest,
  connection?: Connection
): Promise<MarketCreationPreview> {
  const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');

  const closingTime = new Date(params.closingTime);
  const resolutionTime = params.resolutionTime
    ? new Date(params.resolutionTime)
    : new Date(closingTime.getTime() + 24 * 60 * 60 * 1000);

  // Validate
  const validation = validateMarketCreation({
    question: params.question,
    closingTime,
    resolutionTime,
    layer: 'lab',
    outcomes: params.outcomes,
  });

  // Get next race market ID
  const { raceMarketId } = await getNextMarketId(conn);
  const { raceMarketPda } = previewRaceMarketPda(raceMarketId);

  // Race markets use lab fees
  const { sol: creationFeeSol } = getCreationFee('lab');
  const totalCostSol = creationFeeSol + validation.computed.estimatedRentSol;

  return {
    validation,
    marketPda: validation.valid ? raceMarketPda : undefined,
    marketId: validation.valid ? raceMarketId.toString() : undefined,
    creationFeeSol,
    platformFeeBps: validation.computed.platformFeeBps,
    estimatedRentSol: validation.computed.estimatedRentSol,
    totalCostSol,
  };
}

// =============================================================================
// BUILD AND VALIDATE TRANSACTIONS
// =============================================================================

/**
 * Build lab market creation transaction with full validation
 */
export async function createLabMarket(
  params: CreateMarketRequest,
  connection?: Connection
): Promise<{
  success: boolean;
  error?: string;
  validation: CreationValidationResult;
  transaction?: {
    serialized: string;
    marketPda: string;
    marketId: string;
  };
  simulation?: {
    success: boolean;
    error?: string;
    unitsConsumed?: number;
  };
}> {
  const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');

  // Preview first (validates)
  const preview = await previewMarketCreation(params, conn);

  if (!preview.validation.valid) {
    return {
      success: false,
      error: preview.validation.errors.join('; '),
      validation: preview.validation,
    };
  }

  // Build transaction
  const closingTime = new Date(params.closingTime);
  const resolutionTime = params.resolutionTime
    ? new Date(params.resolutionTime)
    : calculateResolutionTime(
        closingTime,
        params.marketType || 'event',
        params.eventTime ? new Date(params.eventTime) : undefined
      );

  const inviteHash = params.inviteHash
    ? Buffer.from(params.inviteHash, 'hex')
    : undefined;

  // Calculate resolutionBuffer (seconds from closing to resolution)
  const resolutionBuffer = Math.floor((resolutionTime.getTime() - closingTime.getTime()) / 1000);

  const result = await buildCreateLabMarketTransaction({
    question: params.question,
    closingTime,
    resolutionBuffer,
    creatorWallet: params.creatorWallet,
  }, conn);

  // Simulate
  const simulation = await simulateBetTransaction(
    result.transaction,
    new PublicKey(params.creatorWallet),
    conn
  );

  return {
    success: true,
    validation: preview.validation,
    transaction: {
      serialized: result.serializedTx,
      marketPda: result.marketPda,
      marketId: result.marketId.toString(),
    },
    simulation: {
      success: simulation.success,
      error: simulation.error,
      unitsConsumed: simulation.unitsConsumed,
    },
  };
}

/**
 * Build private market creation transaction
 */
export async function createPrivateMarket(
  params: CreateMarketRequest,
  connection?: Connection
): Promise<{
  success: boolean;
  error?: string;
  validation: CreationValidationResult;
  transaction?: {
    serialized: string;
    marketPda: string;
    marketId: string;
  };
  simulation?: {
    success: boolean;
    error?: string;
  };
}> {
  const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');

  // Use lab preview but with private layer
  const preview = await previewMarketCreation({ ...params, layer: 'private' }, conn);

  if (!preview.validation.valid) {
    return {
      success: false,
      error: preview.validation.errors.join('; '),
      validation: preview.validation,
    };
  }

  const closingTime = new Date(params.closingTime);
  const resolutionTime = params.resolutionTime
    ? new Date(params.resolutionTime)
    : calculateResolutionTime(closingTime, params.marketType || 'event');

  const inviteHash = params.inviteHash
    ? Buffer.from(params.inviteHash, 'hex')
    : undefined;

  // Calculate resolutionBuffer (seconds from closing to resolution)
  const resolutionBuffer = Math.floor((resolutionTime.getTime() - closingTime.getTime()) / 1000);

  const result = await buildCreatePrivateMarketTransaction({
    question: params.question,
    closingTime,
    resolutionBuffer,
    creatorWallet: params.creatorWallet,
  }, conn);

  const simulation = await simulateBetTransaction(
    result.transaction,
    new PublicKey(params.creatorWallet),
    conn
  );

  return {
    success: true,
    validation: preview.validation,
    transaction: {
      serialized: result.serializedTx,
      marketPda: result.marketPda,
      marketId: result.marketId.toString(),
    },
    simulation: {
      success: simulation.success,
      error: simulation.error,
    },
  };
}

/**
 * Build race market creation transaction
 */
export async function createRaceMarket(
  params: CreateRaceMarketRequest,
  connection?: Connection
): Promise<{
  success: boolean;
  error?: string;
  validation: CreationValidationResult;
  transaction?: {
    serialized: string;
    raceMarketPda: string;
    marketId: string;
  };
  simulation?: {
    success: boolean;
    error?: string;
  };
}> {
  const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');

  const preview = await previewRaceMarketCreation(params, conn);

  if (!preview.validation.valid) {
    return {
      success: false,
      error: preview.validation.errors.join('; '),
      validation: preview.validation,
    };
  }

  const closingTime = new Date(params.closingTime);
  const resolutionTime = params.resolutionTime
    ? new Date(params.resolutionTime)
    : new Date(closingTime.getTime() + 24 * 60 * 60 * 1000);

  // Calculate resolutionBuffer (seconds from closing to resolution)
  const resolutionBuffer = Math.floor((resolutionTime.getTime() - closingTime.getTime()) / 1000);

  const result = await buildCreateRaceMarketTransaction({
    question: params.question,
    outcomes: params.outcomes,
    closingTime,
    resolutionBuffer,
    creatorWallet: params.creatorWallet,
  }, conn);

  const simulation = await simulateBetTransaction(
    result.transaction,
    new PublicKey(params.creatorWallet),
    conn
  );

  return {
    success: true,
    validation: preview.validation,
    transaction: {
      serialized: result.serializedTx,
      raceMarketPda: result.marketPda,
      marketId: result.marketId.toString(),
    },
    simulation: {
      success: simulation.success,
      error: simulation.error,
    },
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get creation fees for all layers
 */
export function getAllCreationFees(): {
  official: { sol: number; lamports: number };
  lab: { sol: number; lamports: number };
  private: { sol: number; lamports: number };
} {
  return {
    official: getCreationFee('official'),
    lab: getCreationFee('lab'),
    private: getCreationFee('private'),
  };
}

/**
 * Get platform fees for all layers
 */
export function getAllPlatformFees(): {
  official: { bps: number; percent: string };
  lab: { bps: number; percent: string };
  private: { bps: number; percent: string };
} {
  return {
    official: { bps: FEES.OFFICIAL_PLATFORM_FEE_BPS, percent: `${FEES.OFFICIAL_PLATFORM_FEE_BPS / 100}%` },
    lab: { bps: FEES.LAB_PLATFORM_FEE_BPS, percent: `${FEES.LAB_PLATFORM_FEE_BPS / 100}%` },
    private: { bps: FEES.PRIVATE_PLATFORM_FEE_BPS, percent: `${FEES.PRIVATE_PLATFORM_FEE_BPS / 100}%` },
  };
}

/**
 * Get timing constraints
 */
export function getTimingConstraints(): {
  minEventBufferHours: number;
  recommendedEventBufferHours: number;
  bettingFreezeSeconds: number;
  maxMarketDurationDays: number;
} {
  return {
    minEventBufferHours: TIMING.MIN_EVENT_BUFFER_HOURS,
    recommendedEventBufferHours: TIMING.RECOMMENDED_EVENT_BUFFER_HOURS,
    bettingFreezeSeconds: TIMING.BETTING_FREEZE_SECONDS,
    maxMarketDurationDays: TIMING.MAX_MARKET_DURATION_DAYS,
  };
}

/**
 * Generate invite hash for private market
 */
export function generateInviteHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('hex');
}

/**
 * Derive invite link from hash
 */
export function getInviteLink(marketPda: string, inviteHash: string): string {
  return `https://baozi.ooo/market/${marketPda}?invite=${inviteHash}`;
}
