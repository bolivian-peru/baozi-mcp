/**
 * Positions handler for MCP server
 * Fetches user positions from Solana V4.7.6 program (Mainnet)
 */
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  PROGRAM_ID,
  RPC_ENDPOINT,
  DISCRIMINATORS,
  lamportsToSol,
} from '../config.js';
import { getMarket } from './markets.js';

// =============================================================================
// TYPES
// =============================================================================

export interface Position {
  publicKey: string;
  user: string;
  marketId: string;
  yesAmountSol: number;
  noAmountSol: number;
  totalAmountSol: number;
  side: 'Yes' | 'No' | 'Both'; // Derived: which side has more
  claimed: boolean;
  referredBy: string | null;
  affiliateFeePaidSol: number;
  // Enriched fields (optional, from market lookup)
  marketPda?: string;
  marketQuestion?: string;
  marketStatus?: string;
  marketOutcome?: string | null;
  potentialPayout?: number;
}

export interface PositionSummary {
  wallet: string;
  totalPositions: number;
  totalBetSol: number;
  activePositions: number;
  claimedPositions: number;
  winningPositions: number;
  losingPositions: number;
  pendingPositions: number;
  positions: Position[];
}

// =============================================================================
// POSITION DECODER
// =============================================================================

/**
 * Decode UserPosition account data from V4.7.6 struct
 *
 * UserPosition struct layout (from IDL):
 * - discriminator (8)
 * - user (Pubkey, 32)
 * - market_id (u64, 8)
 * - yes_amount (u64, 8)
 * - no_amount (u64, 8)
 * - claimed (bool, 1)
 * - bump (u8, 1)
 * - referred_by (Option<Pubkey>: 1 + 0/32)
 * - affiliate_fee_paid (u64, 8)
 * - reserved ([u8; 16], 16)
 */
function decodePosition(data: Buffer, pubkey: PublicKey): Position | null {
  try {
    let offset = 8; // Skip discriminator

    // user (Pubkey, 32 bytes)
    const user = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // market_id (u64, 8 bytes)
    const marketId = data.readBigUInt64LE(offset);
    offset += 8;

    // yes_amount (u64, 8 bytes)
    const yesAmount = data.readBigUInt64LE(offset);
    offset += 8;

    // no_amount (u64, 8 bytes)
    const noAmount = data.readBigUInt64LE(offset);
    offset += 8;

    // claimed (bool, 1 byte)
    const claimed = data.readUInt8(offset) === 1;
    offset += 1;

    // bump (u8, 1 byte)
    offset += 1;

    // referred_by (Option<Pubkey>: 1 byte discriminant + optional 32 bytes)
    const hasReferrer = data.readUInt8(offset) === 1;
    offset += 1;
    let referredBy: string | null = null;
    if (hasReferrer) {
      referredBy = new PublicKey(data.slice(offset, offset + 32)).toBase58();
      offset += 32;
    }

    // affiliate_fee_paid (u64, 8 bytes)
    const affiliateFeePaid = data.readBigUInt64LE(offset);

    // Derived fields
    const yesAmountSol = round4(lamportsToSol(yesAmount));
    const noAmountSol = round4(lamportsToSol(noAmount));
    const totalAmountSol = round4(yesAmountSol + noAmountSol);

    // Determine primary side
    let side: 'Yes' | 'No' | 'Both';
    if (yesAmount > 0n && noAmount > 0n) {
      side = 'Both';
    } else if (yesAmount > 0n) {
      side = 'Yes';
    } else {
      side = 'No';
    }

    return {
      publicKey: pubkey.toBase58(),
      user: user.toBase58(),
      marketId: marketId.toString(),
      yesAmountSol,
      noAmountSol,
      totalAmountSol,
      side,
      claimed,
      referredBy,
      affiliateFeePaidSol: round4(lamportsToSol(affiliateFeePaid)),
    };
  } catch (err) {
    console.error('Error decoding position:', err);
    return null;
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get all positions for a wallet
 */
export async function getPositions(walletAddress: string): Promise<Position[]> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  try {
    const wallet = new PublicKey(walletAddress);

    // Get all position accounts for this user
    // Note: Solana RPC expects base58 encoding for memcmp bytes
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: bs58.encode(DISCRIMINATORS.USER_POSITION),
          },
        },
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: wallet.toBase58(),
          },
        },
      ],
    });

    const positions: Position[] = [];

    for (const { account, pubkey } of accounts) {
      const position = decodePosition(account.data as Buffer, pubkey);
      if (position) {
        positions.push(position);
      }
    }

    // Sort by market ID (newest markets first)
    positions.sort((a, b) => Number(BigInt(b.marketId) - BigInt(a.marketId)));

    return positions;
  } catch (err) {
    console.error('Error fetching positions:', err);
    return [];
  }
}

/**
 * Derive market PDA from market_id
 */
function deriveMarketPda(marketId: string): string {
  const marketIdBigInt = BigInt(marketId);
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(marketIdBigInt);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), marketIdBuffer],
    PROGRAM_ID
  );
  return pda.toBase58();
}

/**
 * Get positions with enriched market data
 */
export async function getPositionsEnriched(walletAddress: string): Promise<Position[]> {
  const positions = await getPositions(walletAddress);

  // Derive market PDAs from market_id
  const positionsWithPda = positions.map(p => ({
    ...p,
    marketPda: deriveMarketPda(p.marketId),
  }));

  // Batch fetch market data for unique markets
  const uniqueMarkets = [...new Set(positionsWithPda.map(p => p.marketPda))];
  const marketData = new Map<string, Awaited<ReturnType<typeof getMarket>>>();

  await Promise.all(
    uniqueMarkets.map(async (marketPda) => {
      if (marketPda) {
        const market = await getMarket(marketPda);
        if (market) {
          marketData.set(marketPda, market);
        }
      }
    })
  );

  // Enrich positions with market data
  return positionsWithPda.map(position => {
    const market = position.marketPda ? marketData.get(position.marketPda) : null;
    if (!market) return position;

    // Calculate potential payout if position is winning
    let potentialPayout: number | undefined;
    const positionAmount = position.side === 'Yes' ? position.yesAmountSol : position.noAmountSol;
    if (market.status === 'Resolved' && market.winningOutcome === position.side) {
      const totalPool = market.yesPoolSol + market.noPoolSol;
      const winningPool = position.side === 'Yes' ? market.yesPoolSol : market.noPoolSol;
      if (winningPool > 0) {
        const share = positionAmount / winningPool;
        const grossPayout = share * totalPool;
        const profit = grossPayout - positionAmount;
        const fee = profit > 0 ? (profit * market.platformFeeBps) / 10000 : 0;
        potentialPayout = round4(grossPayout - fee);
      }
    }

    return {
      ...position,
      marketQuestion: market.question,
      marketStatus: market.status,
      marketOutcome: market.winningOutcome,
      potentialPayout,
    };
  });
}

/**
 * Get position summary with statistics
 */
export async function getPositionsSummary(walletAddress: string): Promise<PositionSummary> {
  const positions = await getPositionsEnriched(walletAddress);

  const totalBetSol = positions.reduce((sum, p) => sum + p.totalAmountSol, 0);
  const activePositions = positions.filter(p => !p.claimed).length;
  const claimedPositions = positions.filter(p => p.claimed).length;

  // Count winning/losing/pending based on market status and outcome
  let winningPositions = 0;
  let losingPositions = 0;
  let pendingPositions = 0;

  for (const position of positions) {
    if (!position.marketStatus || position.marketStatus === 'Active' || position.marketStatus === 'Closed') {
      pendingPositions++;
    } else if (position.marketStatus === 'Resolved') {
      if (position.marketOutcome === position.side) {
        winningPositions++;
      } else if (position.marketOutcome === 'Invalid') {
        // Refund case
        pendingPositions++;
      } else {
        losingPositions++;
      }
    } else if (position.marketStatus === 'Cancelled') {
      // Refund case
      pendingPositions++;
    }
  }

  return {
    wallet: walletAddress,
    totalPositions: positions.length,
    totalBetSol: round4(totalBetSol),
    activePositions,
    claimedPositions,
    winningPositions,
    losingPositions,
    pendingPositions,
    positions,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
