/**
 * Resolution Handler - Market Resolution Status & Disputes
 */
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  PROGRAM_ID,
  RPC_ENDPOINT,
  DISCRIMINATORS,
  SEEDS,
} from '../config.js';
import { getMarket, Market } from './markets.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ResolutionStatus {
  marketPda: string;
  marketQuestion: string;
  status: string;

  // Resolution state
  isResolved: boolean;
  winningOutcome: string | null;
  proposedOutcome: string | null;

  // Timing
  closingTime: string;
  resolutionTime: string;
  canBeResolved: boolean;
  resolutionWindowOpen: boolean;

  // Dispute state
  isDisputed: boolean;
  disputeDeadline: string | null;
  disputeReason: string | null;

  // Council voting (if disputed)
  councilSize: number;
  councilVotesYes: number;
  councilVotesNo: number;
  councilThreshold: number;

  // Resolution mode
  resolutionMode: 'Creator' | 'Oracle' | 'Council' | 'Admin';
}

export interface DisputeMeta {
  publicKey: string;
  marketPda: string;
  disputer: string;
  reason: string;
  proposedOutcome: boolean | null;
  createdAt: string;
  deadline: string;
  resolved: boolean;
}

// =============================================================================
// RESOLUTION STATUS
// =============================================================================

/**
 * Get detailed resolution status for a market
 */
export async function getResolutionStatus(marketPda: string): Promise<ResolutionStatus | null> {
  const market = await getMarket(marketPda);
  if (!market) return null;

  const now = new Date();
  const closingTime = new Date(market.closingTime);
  const resolutionTime = new Date(market.resolutionTime);

  // Check resolution window
  const canBeResolved = now > closingTime && market.status === 'Closed';
  const resolutionWindowOpen = now > closingTime && now < resolutionTime;

  // Check dispute status
  const disputeMeta = await getDisputeMeta(marketPda);
  const isDisputed = disputeMeta !== null && !disputeMeta.resolved;

  // Determine resolution mode from market data
  let resolutionMode: 'Creator' | 'Oracle' | 'Council' | 'Admin' = 'Creator';
  // This would need to be parsed from market data

  return {
    marketPda,
    marketQuestion: market.question,
    status: market.status,

    isResolved: market.status === 'Resolved',
    winningOutcome: market.winningOutcome,
    proposedOutcome: null, // Would need to track proposed but not finalized

    closingTime: market.closingTime,
    resolutionTime: market.resolutionTime,
    canBeResolved,
    resolutionWindowOpen,

    isDisputed,
    disputeDeadline: disputeMeta?.deadline || null,
    disputeReason: disputeMeta?.reason || null,

    councilSize: 0, // Would parse from market
    councilVotesYes: 0,
    councilVotesNo: 0,
    councilThreshold: 0,

    resolutionMode,
  };
}

/**
 * Get dispute meta for a market (if exists)
 */
async function getDisputeMeta(marketPda: string): Promise<DisputeMeta | null> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  try {
    const marketPubkey = new PublicKey(marketPda);

    // Derive dispute_meta PDA
    const [disputeMetaPda] = PublicKey.findProgramAddressSync(
      [SEEDS.DISPUTE_META, marketPubkey.toBuffer()],
      PROGRAM_ID
    );

    const account = await connection.getAccountInfo(disputeMetaPda);
    if (!account) return null;

    // Decode DisputeMeta
    // DisputeMeta struct:
    // - discriminator (8)
    // - market (Pubkey, 32)
    // - disputer (Pubkey, 32)
    // - reason (String: 4 + len)
    // - proposed_outcome (Option<bool>: 1 + 0/1)
    // - created_at (i64, 8)
    // - deadline (i64, 8)
    // - resolved (bool, 1)

    const data = account.data as Buffer;
    let offset = 8;

    const market = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const disputer = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const reasonLen = data.readUInt32LE(offset);
    offset += 4;
    const reason = data.slice(offset, offset + reasonLen).toString('utf8');
    offset += reasonLen;

    const hasProposedOutcome = data.readUInt8(offset);
    offset += 1;
    let proposedOutcome: boolean | null = null;
    if (hasProposedOutcome === 1) {
      proposedOutcome = data.readUInt8(offset) === 1;
      offset += 1;
    }

    const createdAt = data.readBigInt64LE(offset);
    offset += 8;

    const deadline = data.readBigInt64LE(offset);
    offset += 8;

    const resolved = data.readUInt8(offset) === 1;

    return {
      publicKey: disputeMetaPda.toBase58(),
      marketPda: market.toBase58(),
      disputer: disputer.toBase58(),
      reason,
      proposedOutcome,
      createdAt: new Date(Number(createdAt) * 1000).toISOString(),
      deadline: new Date(Number(deadline) * 1000).toISOString(),
      resolved,
    };
  } catch {
    return null;
  }
}

/**
 * Get all disputed markets
 */
export async function getDisputedMarkets(): Promise<DisputeMeta[]> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(DISCRIMINATORS.DISPUTE_META),
        },
      },
    ],
  });

  const disputes: DisputeMeta[] = [];

  for (const { account, pubkey } of accounts) {
    try {
      const data = account.data as Buffer;
      let offset = 8;

      const market = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const disputer = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const reasonLen = data.readUInt32LE(offset);
      offset += 4;
      const reason = data.slice(offset, offset + reasonLen).toString('utf8');
      offset += reasonLen;

      const hasProposedOutcome = data.readUInt8(offset);
      offset += 1;
      let proposedOutcome: boolean | null = null;
      if (hasProposedOutcome === 1) {
        proposedOutcome = data.readUInt8(offset) === 1;
        offset += 1;
      }

      const createdAt = data.readBigInt64LE(offset);
      offset += 8;

      const deadline = data.readBigInt64LE(offset);
      offset += 8;

      const resolved = data.readUInt8(offset) === 1;

      if (!resolved) {
        disputes.push({
          publicKey: pubkey.toBase58(),
          marketPda: market.toBase58(),
          disputer: disputer.toBase58(),
          reason,
          proposedOutcome,
          createdAt: new Date(Number(createdAt) * 1000).toISOString(),
          deadline: new Date(Number(deadline) * 1000).toISOString(),
          resolved,
        });
      }
    } catch {
      // Skip malformed
    }
  }

  return disputes;
}

/**
 * Get markets pending resolution (closed but not resolved)
 */
export async function getMarketsAwaitingResolution(): Promise<Market[]> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  // Get all markets with status = Closed (1)
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
    const market = await getMarket(pubkey.toBase58());
    if (market && market.status === 'Closed') {
      markets.push(market);
    }
  }

  return markets;
}
