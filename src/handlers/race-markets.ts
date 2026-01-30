/**
 * Race Markets Handler - Multi-Outcome Prediction Markets
 */
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  PROGRAM_ID,
  RPC_ENDPOINT,
  DISCRIMINATORS,
  MARKET_STATUS_NAMES,
  MARKET_LAYER_NAMES,
  lamportsToSol,
} from '../config.js';

// =============================================================================
// TYPES
// =============================================================================

export interface RaceOutcome {
  index: number;
  label: string;
  poolSol: number;
  percent: number;
}

export interface RaceMarket {
  publicKey: string;
  marketId: string;
  question: string;
  outcomes: RaceOutcome[];
  closingTime: string;
  resolutionTime: string;
  status: string;
  statusCode: number;
  winningOutcomeIndex: number | null;
  totalPoolSol: number;
  layer: string;
  layerCode: number;
  accessGate: string;
  creator: string;
  platformFeeBps: number;
  isBettingOpen: boolean;
}

export interface RacePosition {
  publicKey: string;
  user: string;
  raceMarketPda: string;
  marketId: string;
  outcomeIndex: number;
  amountSol: number;
  claimed: boolean;
  createdAt: string;
}

// =============================================================================
// RACE MARKET DECODER
// =============================================================================

/**
 * Decode RaceMarket account data
 *
 * RaceMarket struct layout (from IDL v4.7.6):
 * - discriminator (8)
 * - market_id (u64, 8)
 * - question (String: 4 + len)
 * - closing_time (i64, 8)
 * - resolution_time (i64, 8)
 * - auto_stop_buffer (i64, 8)
 * - outcome_count (u8, 1)
 * - outcome_labels ([[u8; 32]; 10], 320 bytes FIXED)
 * - outcome_pools ([u64; 10], 80 bytes FIXED)
 * - total_pool (u64, 8)
 * - snapshot_pools ([u64; 10], 80 bytes)
 * - snapshot_total (u64, 8)
 * - status (enum, 1)
 * - winning_outcome (Option<u8>: 1 + 0/1)
 * - currency_type (enum, 1)
 * - platform_fee_collected (u64, 8)
 * - creator_fee_collected (u64, 8)
 * - total_claimed (u64, 8)
 * - last_bet_time (i64, 8)
 * - bump (u8, 1)
 * - layer (enum, 1)
 * - resolution_mode (enum, 1)
 * - access_gate (enum, 1)
 * - creator (Pubkey, 32)
 * - platform_fee_bps_at_creation (u16, 2)
 * - affiliate_fee_bps_at_creation (u16, 2)
 * - betting_freeze_seconds_at_creation (i64, 8)
 * - dust_swept (bool, 1)
 * - reserved ([u8; 19], 19)
 */
function decodeRaceMarket(data: Buffer, pubkey: PublicKey): RaceMarket | null {
  try {
    // Minimum expected size for a RaceMarket account
    // 8 (disc) + 8 (id) + 4 (qlen) + 8*3 (times) + 1 (count) + 320 (labels) + 80 (pools) + ...
    if (data.length < 500) {
      return null; // Account too small to be a RaceMarket
    }

    let offset = 8; // Skip discriminator

    // market_id (u64)
    const marketId = data.readBigUInt64LE(offset);
    offset += 8;

    // question (String: 4 bytes length + UTF-8 bytes)
    const questionLen = data.readUInt32LE(offset);
    offset += 4;

    // Sanity check: question length should be reasonable (max 200 chars)
    if (questionLen > 500 || questionLen + offset > data.length) {
      return null; // Invalid question length - not a valid RaceMarket
    }

    const question = data.slice(offset, offset + questionLen).toString('utf8');
    offset += questionLen;

    // closing_time (i64)
    const closingTime = data.readBigInt64LE(offset);
    offset += 8;

    // resolution_time (i64)
    const resolutionTime = data.readBigInt64LE(offset);
    offset += 8;

    // auto_stop_buffer (i64)
    offset += 8; // Skip for now

    // outcome_count (u8)
    const outcomeCount = data.readUInt8(offset);
    offset += 1;

    // outcome_labels: [[u8; 32]; 10] = 320 bytes FIXED
    // Each label is 32 bytes, padded with zeros
    const outcomeLabels: string[] = [];
    for (let i = 0; i < 10; i++) {
      const labelBytes = data.slice(offset, offset + 32);
      // Find null terminator or end of string
      let labelEnd = 32;
      for (let j = 0; j < 32; j++) {
        if (labelBytes[j] === 0) {
          labelEnd = j;
          break;
        }
      }
      if (i < outcomeCount) {
        outcomeLabels.push(labelBytes.slice(0, labelEnd).toString('utf8'));
      }
      offset += 32;
    }

    // outcome_pools: [u64; 10] = 80 bytes FIXED
    const outcomePools: bigint[] = [];
    for (let i = 0; i < 10; i++) {
      const pool = data.readBigUInt64LE(offset);
      if (i < outcomeCount) {
        outcomePools.push(pool);
      }
      offset += 8;
    }

    // total_pool (u64)
    const totalPoolLamports = data.readBigUInt64LE(offset);
    offset += 8;

    // snapshot_pools: [u64; 10] = 80 bytes - skip
    offset += 80;

    // snapshot_total (u64) - skip
    offset += 8;

    // status (enum, 1 byte)
    const statusCode = data.readUInt8(offset);
    offset += 1;

    // winning_outcome (Option<u8>: 1 byte discriminant + optional 1 byte value)
    const hasWinningOutcome = data.readUInt8(offset);
    offset += 1;
    let winningOutcomeIndex: number | null = null;
    if (hasWinningOutcome === 1) {
      winningOutcomeIndex = data.readUInt8(offset);
      offset += 1;
    }

    // currency_type (enum, 1 byte)
    offset += 1;

    // platform_fee_collected (u64)
    offset += 8;

    // creator_fee_collected (u64)
    offset += 8;

    // total_claimed (u64)
    offset += 8;

    // last_bet_time (i64)
    offset += 8;

    // bump (u8)
    offset += 1;

    // layer (enum, 1 byte)
    const layerCode = data.readUInt8(offset);
    offset += 1;

    // resolution_mode (enum, 1 byte)
    offset += 1;

    // access_gate (enum, 1 byte)
    const accessGateCode = data.readUInt8(offset);
    offset += 1;

    // creator (Pubkey, 32 bytes)
    const creator = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // oracle_host (Option<Pubkey>: 1 + 0/32)
    const hasOracleHost = data.readUInt8(offset);
    offset += 1;
    if (hasOracleHost === 1) {
      offset += 32;
    }

    // council: [Pubkey; 5] = 160 bytes - skip
    offset += 160;

    // council_size (u8)
    offset += 1;

    // council_votes: [u8; 10] = 10 bytes - skip
    offset += 10;

    // council_threshold (u8)
    offset += 1;

    // creator_fee_bps (u16)
    offset += 2;

    // creator_profile (Option<Pubkey>: 1 + 0/32)
    const hasCreatorProfile = data.readUInt8(offset);
    offset += 1;
    if (hasCreatorProfile === 1) {
      offset += 32;
    }

    // platform_fee_bps_at_creation (u16)
    const platformFeeBps = data.readUInt16LE(offset);
    offset += 2;

    // Calculate derived fields
    const totalPoolSol = lamportsToSol(totalPoolLamports);

    const outcomes: RaceOutcome[] = outcomeLabels.map((label, i) => {
      const poolSol = lamportsToSol(outcomePools[i] || 0n);
      const percent = totalPoolSol > 0 ? (poolSol / totalPoolSol) * 100 : 100 / outcomeLabels.length;
      return {
        index: i,
        label,
        poolSol: round4(poolSol),
        percent: round2(percent),
      };
    });

    // Betting open check
    const now = BigInt(Math.floor(Date.now() / 1000));
    const freezeTime = closingTime - 300n; // 5 min freeze
    const isBettingOpen = statusCode === 0 && now < freezeTime;

    return {
      publicKey: pubkey.toBase58(),
      marketId: marketId.toString(),
      question,
      outcomes,
      closingTime: new Date(Number(closingTime) * 1000).toISOString(),
      resolutionTime: new Date(Number(resolutionTime) * 1000).toISOString(),
      status: MARKET_STATUS_NAMES[statusCode] || 'Unknown',
      statusCode,
      winningOutcomeIndex,
      totalPoolSol: round4(totalPoolSol),
      layer: MARKET_LAYER_NAMES[layerCode] || 'Unknown',
      layerCode,
      accessGate: accessGateCode === 0 ? 'Public' : 'Whitelist',
      creator: creator.toBase58(),
      platformFeeBps,
      isBettingOpen,
    };
  } catch (err) {
    console.error('Error decoding race market:', err);
    return null;
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * List all race markets
 */
export async function listRaceMarkets(status?: string): Promise<RaceMarket[]> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(DISCRIMINATORS.RACE_MARKET),
        },
      },
    ],
  });

  const markets: RaceMarket[] = [];

  for (const { account, pubkey } of accounts) {
    const market = decodeRaceMarket(account.data as Buffer, pubkey);
    if (market) {
      if (!status || market.status.toLowerCase() === status.toLowerCase()) {
        markets.push(market);
      }
    }
  }

  // Sort by closing time
  markets.sort((a, b) => {
    if (a.status === 'Active' && b.status !== 'Active') return -1;
    if (a.status !== 'Active' && b.status === 'Active') return 1;
    return new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime();
  });

  return markets;
}

/**
 * Get a specific race market
 */
export async function getRaceMarket(publicKey: string): Promise<RaceMarket | null> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  try {
    const pubkey = new PublicKey(publicKey);
    const account = await connection.getAccountInfo(pubkey);
    if (!account) return null;
    return decodeRaceMarket(account.data as Buffer, pubkey);
  } catch {
    return null;
  }
}

/**
 * Get race quote for a potential bet
 */
export function getRaceQuote(
  market: RaceMarket,
  outcomeIndex: number,
  betAmountSol: number
): {
  valid: boolean;
  error?: string;
  outcomeLabel: string;
  betAmountSol: number;
  expectedPayoutSol: number;
  impliedOdds: number;
  newOutcomePercent: number;
} {
  if (outcomeIndex < 0 || outcomeIndex >= market.outcomes.length) {
    return {
      valid: false,
      error: `Invalid outcome index. Must be 0-${market.outcomes.length - 1}`,
      outcomeLabel: '',
      betAmountSol,
      expectedPayoutSol: 0,
      impliedOdds: 0,
      newOutcomePercent: 0,
    };
  }

  const outcome = market.outcomes[outcomeIndex];
  const currentPool = outcome.poolSol;
  const totalPool = market.totalPoolSol;

  // New pools after bet
  const newOutcomePool = currentPool + betAmountSol;
  const newTotalPool = totalPool + betAmountSol;

  // Share of outcome pool
  const share = betAmountSol / newOutcomePool;
  const grossPayout = share * newTotalPool;
  const profit = grossPayout - betAmountSol;
  const fee = profit > 0 ? (profit * market.platformFeeBps) / 10000 : 0;
  const expectedPayout = grossPayout - fee;

  // Implied odds
  const impliedOdds = newOutcomePool / newTotalPool * 100;

  return {
    valid: true,
    outcomeLabel: outcome.label,
    betAmountSol,
    expectedPayoutSol: round4(expectedPayout),
    impliedOdds: round2(impliedOdds),
    newOutcomePercent: round2((newOutcomePool / newTotalPool) * 100),
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
