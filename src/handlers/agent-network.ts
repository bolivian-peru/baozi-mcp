/**
 * AI Agent Affiliate Network
 *
 * Enables AI agents to participate in Baozi's affiliate system:
 * - Register as affiliates with unique codes
 * - Share affiliate codes with other agents/users
 * - Track referrals and earnings
 * - Build networks of AI agents referring users
 *
 * Protocol: 1% affiliate commission on winning bet profits
 */
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  PROGRAM_ID,
  RPC_ENDPOINT,
  DISCRIMINATORS,
  SEEDS,
  lamportsToSol,
  FEES,
} from '../config.js';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentAffiliateProfile {
  // Identity
  affiliatePda: string;
  ownerWallet: string;
  affiliateCode: string;

  // Status
  isActive: boolean;
  isVerified: boolean;

  // Earnings
  totalEarnedSol: number;
  unclaimedSol: number;
  totalClaimedSol: number;

  // Network stats
  totalReferrals: number;
  activeReferrals: number;

  // Agent metadata (if available)
  agentName?: string;
  agentType?: string;
  registeredAt?: string;
}

export interface ReferralInfo {
  referredUserPda: string;
  userWallet: string;
  affiliateCode: string;
  totalBetsSol: number;
  totalCommissionSol: number;
  firstBetAt: string;
  lastBetAt: string;
}

export interface AgentNetworkStats {
  totalAgentAffiliates: number;
  totalNetworkEarningsSol: number;
  totalReferrals: number;
  topAgents: AgentAffiliateProfile[];
}

export interface AffiliateCodeSuggestion {
  code: string;
  available: boolean;
  reason?: string;
}

// =============================================================================
// AFFILIATE REGISTRATION
// =============================================================================

/**
 * Check if an affiliate code is available
 */
export async function isAffiliateCodeAvailable(code: string): Promise<boolean> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  // Validate code format
  if (!isValidAffiliateCode(code)) {
    return false;
  }

  // Derive affiliate PDA
  const [affiliatePda] = PublicKey.findProgramAddressSync(
    [SEEDS.AFFILIATE, Buffer.from(code)],
    PROGRAM_ID
  );

  try {
    const account = await connection.getAccountInfo(affiliatePda);
    return account === null; // Available if doesn't exist
  } catch {
    return false;
  }
}

/**
 * Validate affiliate code format
 * - 3-16 characters
 * - Alphanumeric + underscore
 * - No spaces or special chars
 */
function isValidAffiliateCode(code: string): boolean {
  if (code.length < 3 || code.length > 16) return false;
  return /^[a-zA-Z0-9_]+$/.test(code);
}

/**
 * Generate suggested affiliate codes for an agent
 */
export async function suggestAffiliateCodes(
  agentName: string,
  count: number = 5
): Promise<AffiliateCodeSuggestion[]> {
  const suggestions: AffiliateCodeSuggestion[] = [];

  // Clean agent name for code generation
  const base = agentName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10);

  const candidates = [
    base,
    `${base}_ai`,
    `${base}_bot`,
    `ai_${base}`,
    `${base}${Math.floor(Math.random() * 1000)}`,
    `${base}_agent`,
    `${base.slice(0, 6)}${Date.now().toString(36).slice(-4)}`,
  ];

  for (const candidate of candidates) {
    if (suggestions.length >= count) break;

    if (isValidAffiliateCode(candidate)) {
      const available = await isAffiliateCodeAvailable(candidate);
      suggestions.push({
        code: candidate,
        available,
        reason: available ? undefined : 'Already taken',
      });
    }
  }

  return suggestions;
}

// =============================================================================
// AFFILIATE LOOKUP
// =============================================================================

/**
 * Get affiliate profile by code
 */
export async function getAffiliateByCode(code: string): Promise<AgentAffiliateProfile | null> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  const [affiliatePda] = PublicKey.findProgramAddressSync(
    [SEEDS.AFFILIATE, Buffer.from(code)],
    PROGRAM_ID
  );

  try {
    const account = await connection.getAccountInfo(affiliatePda);
    if (!account) return null;

    return decodeAffiliateAccount(account.data as Buffer, affiliatePda, code);
  } catch {
    return null;
  }
}

/**
 * Get affiliate profile(s) by owner wallet
 */
export async function getAffiliatesByOwner(walletAddress: string): Promise<AgentAffiliateProfile[]> {
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
          offset: 8, // After discriminator, owner pubkey
          bytes: walletAddress,
        },
      },
    ],
  });

  const affiliates: AgentAffiliateProfile[] = [];

  for (const { account, pubkey } of accounts) {
    const affiliate = decodeAffiliateAccount(account.data as Buffer, pubkey);
    if (affiliate) {
      affiliates.push(affiliate);
    }
  }

  return affiliates;
}

/**
 * Decode Affiliate account data
 *
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
function decodeAffiliateAccount(
  data: Buffer,
  pubkey: PublicKey,
  knownCode?: string
): AgentAffiliateProfile | null {
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
      ownerWallet: owner.toBase58(),
      affiliateCode: knownCode || code,
      isActive,
      isVerified: false, // Would need additional check
      totalEarnedSol: round4(lamportsToSol(totalEarned)),
      unclaimedSol: round4(lamportsToSol(totalEarned - totalClaimed)),
      totalClaimedSol: round4(lamportsToSol(totalClaimed)),
      totalReferrals: Number(referralCount),
      activeReferrals: 0, // Would need to count
    };
  } catch {
    return null;
  }
}

// =============================================================================
// REFERRAL TRACKING
// =============================================================================

/**
 * Get all users referred by an affiliate
 */
export async function getReferralsByAffiliate(affiliateCode: string): Promise<ReferralInfo[]> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  // Get affiliate PDA first
  const [affiliatePda] = PublicKey.findProgramAddressSync(
    [SEEDS.AFFILIATE, Buffer.from(affiliateCode)],
    PROGRAM_ID
  );

  // Get all ReferredUser accounts linked to this affiliate
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(DISCRIMINATORS.REFERRED_USER),
        },
      },
      {
        memcmp: {
          offset: 40, // After discriminator + user pubkey
          bytes: affiliatePda.toBase58(),
        },
      },
    ],
  });

  const referrals: ReferralInfo[] = [];

  for (const { account, pubkey } of accounts) {
    try {
      const data = account.data as Buffer;
      let offset = 8;

      const user = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // affiliate PDA at offset 40
      offset += 32;

      const totalBets = data.readBigUInt64LE(offset);
      offset += 8;

      const totalCommission = data.readBigUInt64LE(offset);
      offset += 8;

      const firstBetAt = data.readBigInt64LE(offset);
      offset += 8;

      const lastBetAt = data.readBigInt64LE(offset);

      referrals.push({
        referredUserPda: pubkey.toBase58(),
        userWallet: user.toBase58(),
        affiliateCode,
        totalBetsSol: round4(lamportsToSol(totalBets)),
        totalCommissionSol: round4(lamportsToSol(totalCommission)),
        firstBetAt: new Date(Number(firstBetAt) * 1000).toISOString(),
        lastBetAt: new Date(Number(lastBetAt) * 1000).toISOString(),
      });
    } catch {
      // Skip malformed
    }
  }

  return referrals;
}

// =============================================================================
// NETWORK STATS
// =============================================================================

/**
 * Get overall agent affiliate network statistics
 */
export async function getAgentNetworkStats(): Promise<AgentNetworkStats> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  // Get all affiliate accounts
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(DISCRIMINATORS.AFFILIATE),
        },
      },
    ],
  });

  const affiliates: AgentAffiliateProfile[] = [];
  let totalNetworkEarnings = 0n;
  let totalReferrals = 0;

  for (const { account, pubkey } of accounts) {
    const affiliate = decodeAffiliateAccount(account.data as Buffer, pubkey);
    if (affiliate) {
      affiliates.push(affiliate);
      totalNetworkEarnings += BigInt(Math.floor(affiliate.totalEarnedSol * 1e9));
      totalReferrals += affiliate.totalReferrals;
    }
  }

  // Sort by earnings for top agents
  affiliates.sort((a, b) => b.totalEarnedSol - a.totalEarnedSol);

  return {
    totalAgentAffiliates: affiliates.length,
    totalNetworkEarningsSol: round4(lamportsToSol(totalNetworkEarnings)),
    totalReferrals,
    topAgents: affiliates.slice(0, 10),
  };
}

// =============================================================================
// AGENT-TO-AGENT REFERRAL HELPERS
// =============================================================================

/**
 * Format affiliate link for sharing between agents
 */
export function formatAffiliateLink(affiliateCode: string, marketPda?: string): string {
  const baseUrl = 'https://baozi.ooo';
  if (marketPda) {
    return `${baseUrl}/market/${marketPda}?ref=${affiliateCode}`;
  }
  return `${baseUrl}?ref=${affiliateCode}`;
}

/**
 * Parse affiliate code from a referral link
 */
export function parseAffiliateCode(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('ref');
  } catch {
    // Try to extract from raw string
    const match = url.match(/[?&]ref=([a-zA-Z0-9_]+)/);
    return match ? match[1] : null;
  }
}

/**
 * Get recommended affiliate code for an agent to use
 * Prefers verified/high-reputation affiliates
 */
export async function getRecommendedAffiliate(): Promise<AgentAffiliateProfile | null> {
  const stats = await getAgentNetworkStats();

  // Return highest earning active affiliate
  for (const agent of stats.topAgents) {
    if (agent.isActive) {
      return agent;
    }
  }

  return null;
}

/**
 * Commission structure info for agents
 */
export function getCommissionInfo(): {
  affiliateFeeBps: number;
  affiliateFeePercent: string;
  description: string;
  example: string;
} {
  return {
    affiliateFeeBps: FEES.AFFILIATE_FEE_BPS,
    affiliateFeePercent: `${FEES.AFFILIATE_FEE_BPS / 100}%`,
    description: 'Affiliates earn commission on winning bet PROFITS (not total stake)',
    example: 'User bets 1 SOL, wins 2 SOL (1 SOL profit). Platform fee 2.5% = 0.025 SOL. Affiliate gets 1% of profit = 0.01 SOL',
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
