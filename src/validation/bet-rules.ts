/**
 * Bet Validation Rules
 *
 * Validates bet parameters against protocol constraints:
 * - Amount limits (0.01-100 SOL)
 * - Market state (active, not frozen, not paused)
 * - Whitelist access (for private markets)
 * - Timing constraints (betting freeze)
 */

import {
  BET_LIMITS,
  TIMING,
  MARKET_STATUS,
  ACCESS_GATE,
  MARKET_LAYER_NAMES,
} from '../config.js';

// =============================================================================
// TYPES
// =============================================================================

export interface BetValidationParams {
  amountSol: number;
  marketStatus: number;
  closingTime: Date;
  isPaused: boolean;
  accessGate: number;
  userWhitelisted?: boolean;
  layer?: number;
}

export interface BetValidation {
  valid: boolean;
  error?: string;
  warnings: string[];
  details: {
    amountValid: boolean;
    marketStateValid: boolean;
    timingValid: boolean;
    accessValid: boolean;
  };
}

export interface ClaimValidationParams {
  marketStatus: number;
  marketOutcome: number;
  positionSide: 'Yes' | 'No';
  positionAmount: number;
  alreadyClaimed: boolean;
}

export interface ClaimValidation {
  valid: boolean;
  error?: string;
  canClaim: boolean;
  isWinner: boolean;
}

// =============================================================================
// BET VALIDATION
// =============================================================================

/**
 * Validate bet parameters before building transaction
 */
export function validateBet(params: BetValidationParams): BetValidation {
  const warnings: string[] = [];
  const details = {
    amountValid: true,
    marketStateValid: true,
    timingValid: true,
    accessValid: true,
  };

  // ==========================================================================
  // Amount Validation
  // ==========================================================================
  if (params.amountSol < BET_LIMITS.MIN_BET_SOL) {
    details.amountValid = false;
    return {
      valid: false,
      error: `Minimum bet is ${BET_LIMITS.MIN_BET_SOL} SOL`,
      warnings,
      details,
    };
  }

  if (params.amountSol > BET_LIMITS.MAX_BET_SOL) {
    details.amountValid = false;
    return {
      valid: false,
      error: `Maximum bet is ${BET_LIMITS.MAX_BET_SOL} SOL`,
      warnings,
      details,
    };
  }

  // Amount warnings
  if (params.amountSol > 50) {
    warnings.push('Large bet amount. Ensure you understand the odds before placing.');
  }

  // ==========================================================================
  // Market State Validation
  // ==========================================================================
  if (params.marketStatus !== MARKET_STATUS.ACTIVE) {
    details.marketStateValid = false;
    const statusName = getStatusName(params.marketStatus);
    return {
      valid: false,
      error: `Market is ${statusName}, not accepting bets`,
      warnings,
      details,
    };
  }

  if (params.isPaused) {
    details.marketStateValid = false;
    return {
      valid: false,
      error: 'Market is paused',
      warnings,
      details,
    };
  }

  // ==========================================================================
  // Timing Validation
  // ==========================================================================
  const now = new Date();
  const freezeTime = new Date(
    params.closingTime.getTime() - TIMING.BETTING_FREEZE_SECONDS * 1000
  );

  if (now >= params.closingTime) {
    details.timingValid = false;
    return {
      valid: false,
      error: 'Betting has closed',
      warnings,
      details,
    };
  }

  if (now >= freezeTime) {
    details.timingValid = false;
    const remainingMs = params.closingTime.getTime() - now.getTime();
    const remainingMin = Math.ceil(remainingMs / 60000);
    return {
      valid: false,
      error: `Betting is frozen (${remainingMin} minutes until close)`,
      warnings,
      details,
    };
  }

  // Timing warnings
  const timeToFreezeMs = freezeTime.getTime() - now.getTime();
  const timeToFreezeMin = Math.floor(timeToFreezeMs / 60000);
  if (timeToFreezeMin < 30) {
    warnings.push(`Betting freezes in ${timeToFreezeMin} minutes`);
  }

  // ==========================================================================
  // Access Validation (Whitelist)
  // ==========================================================================
  if (params.accessGate === ACCESS_GATE.WHITELIST) {
    if (params.userWhitelisted !== true) {
      details.accessValid = false;
      return {
        valid: false,
        error: 'You are not whitelisted for this private market',
        warnings,
        details,
      };
    }
  }

  // Layer-specific warnings
  if (params.layer !== undefined) {
    const layerName = MARKET_LAYER_NAMES[params.layer] || 'Unknown';
    if (params.layer === 1) { // Lab
      warnings.push(`This is a ${layerName} market (community-created). DYOR.`);
    }
  }

  return {
    valid: true,
    warnings,
    details,
  };
}

// =============================================================================
// CLAIM VALIDATION
// =============================================================================

/**
 * Validate claim parameters before building claim transaction
 */
export function validateClaim(params: ClaimValidationParams): ClaimValidation {
  // Already claimed
  if (params.alreadyClaimed) {
    return {
      valid: false,
      error: 'Position already claimed',
      canClaim: false,
      isWinner: false,
    };
  }

  // Market not resolved
  if (params.marketStatus !== MARKET_STATUS.RESOLVED &&
      params.marketStatus !== MARKET_STATUS.CANCELLED) {
    const statusName = getStatusName(params.marketStatus);
    return {
      valid: false,
      error: `Market is ${statusName}, cannot claim yet`,
      canClaim: false,
      isWinner: false,
    };
  }

  // Cancelled market - everyone can claim refund
  if (params.marketStatus === MARKET_STATUS.CANCELLED) {
    return {
      valid: true,
      canClaim: true,
      isWinner: false, // Refund, not winning
    };
  }

  // Check if position is on winning side
  const isWinner = (params.positionSide === 'Yes' && params.marketOutcome === 2) ||
                   (params.positionSide === 'No' && params.marketOutcome === 3);

  if (!isWinner) {
    return {
      valid: false,
      error: 'Position is on losing side, nothing to claim',
      canClaim: false,
      isWinner: false,
    };
  }

  // Nothing to claim if amount is 0
  if (params.positionAmount <= 0) {
    return {
      valid: false,
      error: 'No position amount to claim',
      canClaim: false,
      isWinner: true,
    };
  }

  return {
    valid: true,
    canClaim: true,
    isWinner: true,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getStatusName(status: number): string {
  switch (status) {
    case MARKET_STATUS.ACTIVE: return 'Active';
    case MARKET_STATUS.CLOSED: return 'Closed';
    case MARKET_STATUS.RESOLVED: return 'Resolved';
    case MARKET_STATUS.CANCELLED: return 'Cancelled';
    case MARKET_STATUS.PAUSED: return 'Paused';
    case MARKET_STATUS.RESOLVED_PENDING: return 'Pending Resolution';
    case MARKET_STATUS.DISPUTED: return 'Disputed';
    default: return 'Unknown';
  }
}

/**
 * Calculate quote for a bet (pari-mutuel)
 */
export function calculateBetQuote(params: {
  betAmountSol: number;
  side: 'Yes' | 'No';
  currentYesPool: number;
  currentNoPool: number;
  platformFeeBps: number;
}): {
  expectedPayoutSol: number;
  potentialProfitSol: number;
  feeSol: number;
  impliedOdds: number;
  decimalOdds: number;
  newYesPool: number;
  newNoPool: number;
} {
  // Calculate new pools after bet
  const newYesPool = params.side === 'Yes'
    ? params.currentYesPool + params.betAmountSol
    : params.currentYesPool;
  const newNoPool = params.side === 'No'
    ? params.currentNoPool + params.betAmountSol
    : params.currentNoPool;
  const newTotalPool = newYesPool + newNoPool;

  // Calculate expected payout (pari-mutuel)
  const sidePool = params.side === 'Yes' ? newYesPool : newNoPool;
  const expectedPayoutSol = sidePool > 0
    ? (params.betAmountSol / sidePool) * newTotalPool
    : 0;

  // Calculate profit and fee
  const grossProfit = expectedPayoutSol - params.betAmountSol;
  const feeSol = grossProfit > 0
    ? (grossProfit * params.platformFeeBps) / 10000
    : 0;
  const potentialProfitSol = grossProfit - feeSol;

  // Calculate odds
  const impliedOdds = newTotalPool > 0
    ? (sidePool / newTotalPool) * 100
    : 50;
  const decimalOdds = sidePool > 0
    ? newTotalPool / sidePool
    : 2;

  return {
    expectedPayoutSol: round4(expectedPayoutSol),
    potentialProfitSol: round4(potentialProfitSol),
    feeSol: round4(feeSol),
    impliedOdds: round2(impliedOdds),
    decimalOdds: round2(decimalOdds),
    newYesPool: round4(newYesPool),
    newNoPool: round4(newNoPool),
  };
}

/**
 * Estimate claim amount for a winning position
 */
export function estimateClaimAmount(params: {
  positionAmount: number;
  positionSide: 'Yes' | 'No';
  totalYesPool: number;
  totalNoPool: number;
  platformFeeBps: number;
}): {
  grossPayout: number;
  fee: number;
  netPayout: number;
} {
  const totalPool = params.totalYesPool + params.totalNoPool;
  const winningPool = params.positionSide === 'Yes'
    ? params.totalYesPool
    : params.totalNoPool;

  // Calculate share of winning pool
  const shareOfPool = winningPool > 0
    ? params.positionAmount / winningPool
    : 0;

  // Gross payout from total pool
  const grossPayout = shareOfPool * totalPool;

  // Calculate fee on profit only
  const profit = grossPayout - params.positionAmount;
  const fee = profit > 0 ? (profit * params.platformFeeBps) / 10000 : 0;

  return {
    grossPayout: round4(grossPayout),
    fee: round4(fee),
    netPayout: round4(grossPayout - fee),
  };
}

// Rounding helpers
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
