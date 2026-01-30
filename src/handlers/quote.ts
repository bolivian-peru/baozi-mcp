/**
 * Quote handler for MCP server
 * Calculates expected payouts for bets using pari-mutuel math
 */
import { getMarket, getMarketForBetting, Market } from './markets.js';
import { validateBet } from '../validation/bet-rules.js';
import { BET_LIMITS } from '../config.js';

// =============================================================================
// TYPES
// =============================================================================

export interface Quote {
  valid: boolean;
  error?: string;
  warnings: string[];
  market: string;
  marketQuestion?: string;
  side: 'Yes' | 'No';
  betAmountSol: number;
  expectedPayoutSol: number;
  potentialProfitSol: number;
  impliedOdds: number;
  decimalOdds: number;
  feeSol: number;
  feeBps: number;
  newYesPoolSol: number;
  newNoPoolSol: number;
  currentYesPercent: number;
  currentNoPercent: number;
  newYesPercent: number;
  newNoPercent: number;
}

// =============================================================================
// QUOTE CALCULATION
// =============================================================================

/**
 * Calculate a quote for a potential bet
 */
export async function getQuote(
  marketPubkey: string,
  side: 'Yes' | 'No',
  amountSol: number
): Promise<Quote> {
  const baseQuote: Quote = {
    valid: false,
    warnings: [],
    market: marketPubkey,
    side,
    betAmountSol: amountSol,
    expectedPayoutSol: 0,
    potentialProfitSol: 0,
    impliedOdds: 0,
    decimalOdds: 0,
    feeSol: 0,
    feeBps: 0,
    newYesPoolSol: 0,
    newNoPoolSol: 0,
    currentYesPercent: 50,
    currentNoPercent: 50,
    newYesPercent: 50,
    newNoPercent: 50,
  };

  // Fetch market
  const market = await getMarket(marketPubkey);

  if (!market) {
    return {
      ...baseQuote,
      error: `Market ${marketPubkey} not found`,
    };
  }

  baseQuote.marketQuestion = market.question;
  baseQuote.feeBps = market.platformFeeBps;
  baseQuote.currentYesPercent = market.yesPercent;
  baseQuote.currentNoPercent = market.noPercent;

  // Validate bet parameters
  const validation = validateBet({
    amountSol,
    marketStatus: market.statusCode,
    closingTime: new Date(market.closingTime),
    isPaused: false, // Not tracked in current Market type, assume not paused
    accessGate: market.accessGate === 'Whitelist' ? 1 : 0,
    userWhitelisted: true, // Can't check without user wallet, assume whitelisted
    layer: market.layerCode,
  });

  if (!validation.valid) {
    return {
      ...baseQuote,
      error: validation.error,
      warnings: validation.warnings,
    };
  }

  // Calculate new pools after bet
  const newYesPoolSol = side === 'Yes'
    ? market.yesPoolSol + amountSol
    : market.yesPoolSol;
  const newNoPoolSol = side === 'No'
    ? market.noPoolSol + amountSol
    : market.noPoolSol;
  const newTotalPool = newYesPoolSol + newNoPoolSol;

  // Calculate expected payout (pari-mutuel)
  const sidePool = side === 'Yes' ? newYesPoolSol : newNoPoolSol;
  const expectedPayoutSol = sidePool > 0
    ? (amountSol / sidePool) * newTotalPool
    : 0;

  // Calculate profit and fee
  const grossProfit = expectedPayoutSol - amountSol;
  const feeSol = grossProfit > 0
    ? (grossProfit * market.platformFeeBps) / 10000
    : 0;
  const potentialProfitSol = grossProfit - feeSol;

  // Calculate odds
  const impliedOdds = newTotalPool > 0
    ? (sidePool / newTotalPool) * 100
    : 50;
  const decimalOdds = sidePool > 0
    ? newTotalPool / sidePool
    : 2;

  // Calculate new percentages
  const newYesPercent = newTotalPool > 0
    ? (newYesPoolSol / newTotalPool) * 100
    : 50;
  const newNoPercent = newTotalPool > 0
    ? (newNoPoolSol / newTotalPool) * 100
    : 50;

  return {
    valid: true,
    warnings: validation.warnings,
    market: marketPubkey,
    marketQuestion: market.question,
    side,
    betAmountSol: round4(amountSol),
    expectedPayoutSol: round4(expectedPayoutSol),
    potentialProfitSol: round4(potentialProfitSol),
    impliedOdds: round2(impliedOdds),
    decimalOdds: round2(decimalOdds),
    feeSol: round4(feeSol),
    feeBps: market.platformFeeBps,
    newYesPoolSol: round4(newYesPoolSol),
    newNoPoolSol: round4(newNoPoolSol),
    currentYesPercent: market.yesPercent,
    currentNoPercent: market.noPercent,
    newYesPercent: round2(newYesPercent),
    newNoPercent: round2(newNoPercent),
  };
}

/**
 * Calculate quote with additional market data for transaction building
 */
export async function getQuoteWithMarketData(
  marketPubkey: string,
  side: 'Yes' | 'No',
  amountSol: number
): Promise<{
  quote: Quote;
  marketId?: bigint;
  accessGate?: number;
}> {
  const quote = await getQuote(marketPubkey, side, amountSol);

  if (!quote.valid) {
    return { quote };
  }

  // Get additional market data for tx building
  const marketData = await getMarketForBetting(marketPubkey);

  if (!marketData) {
    return { quote };
  }

  return {
    quote,
    marketId: marketData.marketId,
    accessGate: marketData.accessGate,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
