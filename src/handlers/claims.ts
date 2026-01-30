/**
 * Claims Handler - Winnings, Refunds, Affiliate & Creator Claims
 */
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  PROGRAM_ID,
  RPC_ENDPOINT,
  DISCRIMINATORS,
  lamportsToSol,
  SEEDS,
} from '../config.js';
import { getMarket, Market } from './markets.js';
import { getPositions, Position } from './positions.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ClaimablePosition {
  positionPda: string;
  marketPda: string;
  marketQuestion: string;
  side: 'Yes' | 'No';
  betAmountSol: number;
  claimType: 'winnings' | 'refund' | 'cancelled';
  estimatedPayoutSol: number;
  marketStatus: string;
  marketOutcome: string | null;
}

export interface ClaimSummary {
  wallet: string;
  totalClaimableSol: number;
  winningsClaimableSol: number;
  refundsClaimableSol: number;
  claimablePositions: ClaimablePosition[];
  alreadyClaimedCount: number;
}

export interface AffiliateInfo {
  affiliatePda: string;
  owner: string;
  code: string;
  totalEarnedSol: number;
  unclaimedSol: number;
  referralCount: number;
  isActive: boolean;
}

export interface CreatorEarnings {
  wallet: string;
  totalCreatorFeesSol: number;
  unclaimedSol: number;
  marketsCreated: number;
}

// =============================================================================
// HELPERS
// =============================================================================

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

// =============================================================================
// CLAIMABLE POSITIONS
// =============================================================================

/**
 * Get all claimable positions for a wallet
 * Checks which positions can be claimed (winnings or refunds)
 */
export async function getClaimablePositions(walletAddress: string): Promise<ClaimSummary> {
  const positions = await getPositions(walletAddress);

  const claimable: ClaimablePosition[] = [];
  let winningsTotal = 0;
  let refundsTotal = 0;
  let alreadyClaimed = 0;

  for (const position of positions) {
    if (position.claimed) {
      alreadyClaimed++;
      continue;
    }

    // Derive market PDA from market_id
    const marketPda = deriveMarketPda(position.marketId);

    // Fetch market to check status
    const market = await getMarket(marketPda);
    if (!market) continue;

    // Get the bet amount for the winning side
    const yesAmount = position.yesAmountSol;
    const noAmount = position.noAmountSol;
    const totalBet = yesAmount + noAmount;

    let claimType: 'winnings' | 'refund' | 'cancelled' | null = null;
    let estimatedPayout = 0;
    let winningSide: 'Yes' | 'No' | null = null;

    if (market.status === 'Resolved') {
      // Check if user bet on the winning side
      if (market.winningOutcome === 'Yes' && yesAmount > 0) {
        winningSide = 'Yes';
        claimType = 'winnings';
        const totalPool = market.yesPoolSol + market.noPoolSol;
        if (market.yesPoolSol > 0) {
          const share = yesAmount / market.yesPoolSol;
          const grossPayout = share * totalPool;
          const profit = grossPayout - yesAmount;
          const fee = profit > 0 ? (profit * market.platformFeeBps) / 10000 : 0;
          estimatedPayout = grossPayout - fee;
        }
        winningsTotal += estimatedPayout;
      } else if (market.winningOutcome === 'No' && noAmount > 0) {
        winningSide = 'No';
        claimType = 'winnings';
        const totalPool = market.yesPoolSol + market.noPoolSol;
        if (market.noPoolSol > 0) {
          const share = noAmount / market.noPoolSol;
          const grossPayout = share * totalPool;
          const profit = grossPayout - noAmount;
          const fee = profit > 0 ? (profit * market.platformFeeBps) / 10000 : 0;
          estimatedPayout = grossPayout - fee;
        }
        winningsTotal += estimatedPayout;
      } else if (market.winningOutcome === null) {
        // Invalid/Draw - refund all bets
        claimType = 'refund';
        estimatedPayout = totalBet;
        winningSide = yesAmount > noAmount ? 'Yes' : 'No';
        refundsTotal += estimatedPayout;
      }
      // Loser - nothing to claim
    } else if (market.status === 'Cancelled') {
      // Cancelled - full refund of all bets
      claimType = 'cancelled';
      estimatedPayout = totalBet;
      winningSide = yesAmount > noAmount ? 'Yes' : 'No';
      refundsTotal += estimatedPayout;
    }

    if (claimType && winningSide) {
      claimable.push({
        positionPda: position.publicKey,
        marketPda,
        marketQuestion: market.question,
        side: winningSide,
        betAmountSol: winningSide === 'Yes' ? yesAmount : noAmount,
        claimType,
        estimatedPayoutSol: round4(estimatedPayout),
        marketStatus: market.status,
        marketOutcome: market.winningOutcome,
      });
    }
  }

  return {
    wallet: walletAddress,
    totalClaimableSol: round4(winningsTotal + refundsTotal),
    winningsClaimableSol: round4(winningsTotal),
    refundsClaimableSol: round4(refundsTotal),
    claimablePositions: claimable,
    alreadyClaimedCount: alreadyClaimed,
  };
}

// =============================================================================
// AFFILIATE INFO
// =============================================================================

/**
 * Decode Affiliate account
 * Affiliate struct:
 * - discriminator (8)
 * - owner (Pubkey, 32)
 * - code (String: 4 + len)
 * - total_earned (u64, 8)
 * - total_claimed (u64, 8)
 * - referral_count (u64, 8)
 * - is_active (bool, 1)
 * - bump (u8, 1)
 */
function decodeAffiliate(data: Buffer, pubkey: PublicKey): AffiliateInfo | null {
  try {
    let offset = 8; // Skip discriminator

    const owner = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const codeLen = data.readUInt32LE(offset);
    offset += 4;
    const code = data.slice(offset, offset + codeLen).toString('utf8');
    offset += codeLen;

    const totalEarned = data.readBigUInt64LE(offset);
    offset += 8;

    const totalClaimed = data.readBigUInt64LE(offset);
    offset += 8;

    const referralCount = data.readBigUInt64LE(offset);
    offset += 8;

    const isActive = data.readUInt8(offset) === 1;

    return {
      affiliatePda: pubkey.toBase58(),
      owner: owner.toBase58(),
      code,
      totalEarnedSol: round4(lamportsToSol(totalEarned)),
      unclaimedSol: round4(lamportsToSol(totalEarned - totalClaimed)),
      referralCount: Number(referralCount),
      isActive,
    };
  } catch {
    return null;
  }
}

/**
 * Get affiliate info by code
 */
export async function getAffiliateByCode(code: string): Promise<AffiliateInfo | null> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  // Derive affiliate PDA from code
  const [affiliatePda] = PublicKey.findProgramAddressSync(
    [SEEDS.AFFILIATE, Buffer.from(code)],
    PROGRAM_ID
  );

  try {
    const account = await connection.getAccountInfo(affiliatePda);
    if (!account) return null;
    return decodeAffiliate(account.data as Buffer, affiliatePda);
  } catch {
    return null;
  }
}

/**
 * Get affiliate info by owner wallet
 */
export async function getAffiliateByOwner(walletAddress: string): Promise<AffiliateInfo[]> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(DISCRIMINATORS.AFFILIATE),
        },
      },
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: walletAddress,
        },
      },
    ],
  });

  const affiliates: AffiliateInfo[] = [];
  for (const { account, pubkey } of accounts) {
    const affiliate = decodeAffiliate(account.data as Buffer, pubkey);
    if (affiliate) {
      affiliates.push(affiliate);
    }
  }

  return affiliates;
}

// =============================================================================
// HELPERS
// =============================================================================

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
