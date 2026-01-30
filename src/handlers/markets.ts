/**
 * Market handlers for MCP server
 * Fetches market data from Solana V4.7.6 program (Mainnet)
 */
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  PROGRAM_ID,
  RPC_ENDPOINT,
  DISCRIMINATORS,
  MARKET_STATUS_NAMES,
  MARKET_OUTCOME_NAMES,
  MARKET_LAYER_NAMES,
  ACCESS_GATE,
  lamportsToSol,
} from '../config.js';

// =============================================================================
// TYPES
// =============================================================================

export interface Market {
  publicKey: string;
  marketId: string;
  question: string;
  closingTime: string;
  resolutionTime: string;
  status: string;
  statusCode: number;
  winningOutcome: string | null;
  currencyType: string;
  yesPoolSol: number;
  noPoolSol: number;
  totalPoolSol: number;
  yesPercent: number;
  noPercent: number;
  platformFeeBps: number;
  layer: string;
  layerCode: number;
  accessGate: string;
  creator: string;
  hasBets: boolean;
  isBettingOpen: boolean;
  creatorFeeBps: number;
}

// =============================================================================
// MARKET DECODER
// =============================================================================

/**
 * Decode Market account data from V4.7.6 struct
 *
 * Market struct layout:
 * - discriminator (8)
 * - market_id (u64, 8)
 * - question (String: 4 + len)
 * - closing_time (i64, 8)
 * - resolution_time (i64, 8)
 * - auto_stop_buffer (i64, 8)
 * - yes_pool (u64, 8)
 * - no_pool (u64, 8)
 * - snapshot_yes_pool (u64, 8)
 * - snapshot_no_pool (u64, 8)
 * - status (enum, 1)
 * - winning_outcome (Option<bool>: 1 + 0/1)
 * - currency_type (enum, 1)
 * - _reserved_usdc_vault (33)
 * - creator_bond (u64, 8)
 * - total_claimed (u64, 8)
 * - platform_fee_collected (u64, 8)
 * - last_bet_time (i64, 8)
 * - bump (u8, 1)
 * - layer (enum, 1)
 * - resolution_mode (enum, 1)
 * - access_gate (enum, 1)
 * - creator (Pubkey, 32)
 * - oracle_host (Option<Pubkey>: 1 + 0/32)
 * - council (5 * Pubkey, 160)
 * - council_size (u8, 1)
 * - council_votes_yes (u8, 1)
 * - council_votes_no (u8, 1)
 * - council_threshold (u8, 1)
 * - total_affiliate_fees (u64, 8)
 * - invite_hash (Option<[u8;32]>: 1 + 0/32)
 * - creator_fee_bps (u16, 2)
 * - total_creator_fees (u64, 8)
 * - creator_profile (Option<Pubkey>: 1 + 0/32)
 * - platform_fee_bps_at_creation (u16, 2)
 * - affiliate_fee_bps_at_creation (u16, 2)
 * - betting_freeze_seconds_at_creation (i64, 8)
 * - has_bets (bool, 1)
 */
function decodeMarket(data: Buffer, pubkey: PublicKey): Market | null {
  try {
    let offset = 8; // Skip discriminator

    // market_id (u64)
    const marketId = data.readBigUInt64LE(offset);
    offset += 8;

    // question (String: 4 byte len + UTF-8 bytes)
    const questionLen = data.readUInt32LE(offset);
    offset += 4;
    const question = data.slice(offset, offset + questionLen).toString('utf8');
    offset += questionLen;

    // closing_time (i64)
    const closingTime = data.readBigInt64LE(offset);
    offset += 8;

    // resolution_time (i64)
    const resolutionTime = data.readBigInt64LE(offset);
    offset += 8;

    // auto_stop_buffer (i64)
    offset += 8;

    // yes_pool (u64)
    const yesPool = data.readBigUInt64LE(offset);
    offset += 8;

    // no_pool (u64)
    const noPool = data.readBigUInt64LE(offset);
    offset += 8;

    // snapshot_yes_pool, snapshot_no_pool (skip)
    offset += 16;

    // status (enum, 1 byte)
    const statusCode = data.readUInt8(offset);
    offset += 1;

    // winning_outcome (Option<bool>: 1 byte discriminant + optional 1 byte)
    const hasWinningOutcome = data.readUInt8(offset);
    offset += 1;
    let winningOutcome: boolean | null = null;
    if (hasWinningOutcome === 1) {
      winningOutcome = data.readUInt8(offset) === 1;
      offset += 1;
    }

    // currency_type (enum, 1 byte)
    const currencyTypeCode = data.readUInt8(offset);
    offset += 1;

    // _reserved_usdc_vault (33 bytes)
    offset += 33;

    // creator_bond (u64)
    offset += 8;

    // total_claimed (u64)
    offset += 8;

    // platform_fee_collected (u64)
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

    // oracle_host (Option<Pubkey>)
    const hasOracleHost = data.readUInt8(offset);
    offset += 1;
    if (hasOracleHost === 1) {
      offset += 32;
    }

    // council (5 * Pubkey = 160 bytes)
    offset += 160;

    // council_size, council_votes_yes, council_votes_no, council_threshold (4 bytes)
    offset += 4;

    // total_affiliate_fees (u64)
    offset += 8;

    // invite_hash (Option<[u8;32]>)
    const hasInviteHash = data.readUInt8(offset);
    offset += 1;
    if (hasInviteHash === 1) {
      offset += 32;
    }

    // creator_fee_bps (u16)
    const creatorFeeBps = data.readUInt16LE(offset);
    offset += 2;

    // total_creator_fees (u64)
    offset += 8;

    // creator_profile (Option<Pubkey>)
    const hasCreatorProfile = data.readUInt8(offset);
    offset += 1;
    if (hasCreatorProfile === 1) {
      offset += 32;
    }

    // platform_fee_bps_at_creation (u16)
    const platformFeeBps = data.readUInt16LE(offset);
    offset += 2;

    // affiliate_fee_bps_at_creation (u16)
    offset += 2;

    // betting_freeze_seconds_at_creation (i64)
    const bettingFreezeSeconds = data.readBigInt64LE(offset);
    offset += 8;

    // has_bets (bool, 1 byte)
    const hasBets = data.readUInt8(offset) === 1;

    // Calculate derived fields
    const yesPoolSol = lamportsToSol(yesPool);
    const noPoolSol = lamportsToSol(noPool);
    const totalPoolSol = yesPoolSol + noPoolSol;
    const yesPercent = totalPoolSol > 0 ? (yesPoolSol / totalPoolSol) * 100 : 50;
    const noPercent = totalPoolSol > 0 ? (noPoolSol / totalPoolSol) * 100 : 50;

    // Determine if betting is open
    const now = BigInt(Math.floor(Date.now() / 1000));
    const freezeTime = closingTime - bettingFreezeSeconds;
    const isBettingOpen = statusCode === 0 && now < freezeTime;

    // Convert status code to name
    const status = MARKET_STATUS_NAMES[statusCode] || 'Unknown';
    const layer = MARKET_LAYER_NAMES[layerCode] || 'Unknown';
    const currencyType = currencyTypeCode === 0 ? 'Sol' : 'Usdc';
    const accessGate = accessGateCode === 0 ? 'Public' : 'Whitelist';

    // Convert winning outcome
    let winningOutcomeStr: string | null = null;
    if (winningOutcome !== null) {
      winningOutcomeStr = winningOutcome ? 'Yes' : 'No';
    }

    return {
      publicKey: pubkey.toBase58(),
      marketId: marketId.toString(),
      question,
      closingTime: new Date(Number(closingTime) * 1000).toISOString(),
      resolutionTime: new Date(Number(resolutionTime) * 1000).toISOString(),
      status,
      statusCode,
      winningOutcome: winningOutcomeStr,
      currencyType,
      yesPoolSol: round4(yesPoolSol),
      noPoolSol: round4(noPoolSol),
      totalPoolSol: round4(totalPoolSol),
      yesPercent: round2(yesPercent),
      noPercent: round2(noPercent),
      platformFeeBps,
      layer,
      layerCode,
      accessGate,
      creator: creator.toBase58(),
      hasBets,
      isBettingOpen,
      creatorFeeBps,
    };
  } catch (err) {
    console.error('Error decoding market:', err);
    return null;
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * List all markets with optional status filter
 */
export async function listMarkets(status?: string): Promise<Market[]> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  // Get all market accounts using discriminator filter
  // Note: Solana RPC expects base58 encoding for memcmp bytes
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(DISCRIMINATORS.MARKET),
        },
      },
    ],
  });

  const markets: Market[] = [];

  for (const { account, pubkey } of accounts) {
    // Account data is returned as Buffer by default
    const data = account.data as Buffer;
    const market = decodeMarket(data, pubkey);
    if (market) {
      // Apply status filter if provided
      if (!status || market.status.toLowerCase() === status.toLowerCase()) {
        markets.push(market);
      }
    }
  }

  // Sort by closing time (soonest first for active, then by status)
  markets.sort((a, b) => {
    // Active markets first
    if (a.status === 'Active' && b.status !== 'Active') return -1;
    if (a.status !== 'Active' && b.status === 'Active') return 1;
    // Then by closing time
    return new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime();
  });

  return markets;
}

/**
 * Get a specific market by public key
 */
export async function getMarket(publicKey: string): Promise<Market | null> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  try {
    const pubkey = new PublicKey(publicKey);
    const account = await connection.getAccountInfo(pubkey);

    if (!account) return null;

    return decodeMarket(account.data as Buffer, pubkey);
  } catch {
    return null;
  }
}

/**
 * Get market with additional details for transaction building
 */
export async function getMarketForBetting(publicKey: string): Promise<{
  market: Market | null;
  marketId: bigint;
  accessGate: number;
  platformFeeBps: number;
} | null> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  try {
    const pubkey = new PublicKey(publicKey);
    const account = await connection.getAccountInfo(pubkey);

    if (!account) return null;

    const data = account.data as Buffer;
    const market = decodeMarket(data, pubkey);

    if (!market) return null;

    // Extract raw values needed for transaction building
    const marketId = data.readBigUInt64LE(8);

    // Parse access_gate position
    let offset = 8 + 8; // discriminator + market_id
    const questionLen = data.readUInt32LE(offset);
    offset += 4 + questionLen;
    offset += 24; // closing_time, resolution_time, auto_stop_buffer
    offset += 32; // yes_pool, no_pool, snapshot_yes, snapshot_no
    offset += 1;  // status
    const hasWinning = data.readUInt8(offset);
    offset += 1 + (hasWinning === 1 ? 1 : 0);
    offset += 1;  // currency_type
    offset += 33; // _reserved_usdc_vault
    offset += 32; // creator_bond, total_claimed, platform_fee_collected, last_bet_time
    offset += 1;  // bump
    offset += 1;  // layer
    offset += 1;  // resolution_mode
    const accessGate = data.readUInt8(offset);

    return {
      market,
      marketId,
      accessGate,
      platformFeeBps: market.platformFeeBps,
    };
  } catch {
    return null;
  }
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
