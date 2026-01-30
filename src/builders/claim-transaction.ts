/**
 * Claim Transaction Builders
 *
 * Builds unsigned transactions for:
 * - Claiming winnings
 * - Claiming refunds
 * - Claiming affiliate earnings
 * - Claiming creator fees
 */
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import {
  PROGRAM_ID,
  CONFIG_PDA,
  SOL_TREASURY_PDA,
  SEEDS,
  RPC_ENDPOINT,
} from '../config.js';

// =============================================================================
// INSTRUCTION DISCRIMINATORS
// =============================================================================

// Correct discriminators: sha256("global:<instruction_name>")[0..8]
const CLAIM_WINNINGS_SOL_DISCRIMINATOR = Buffer.from([64, 158, 207, 116, 128, 129, 169, 76]);
const CLAIM_REFUND_SOL_DISCRIMINATOR = Buffer.from([8, 82, 5, 144, 194, 114, 255, 20]);
const CLAIM_AFFILIATE_SOL_DISCRIMINATOR = Buffer.from([125, 18, 164, 112, 216, 207, 197, 201]);

// =============================================================================
// TYPES
// =============================================================================

export interface ClaimTransactionResult {
  transaction: Transaction;
  serializedTx: string;
  claimType: 'winnings' | 'refund' | 'affiliate' | 'creator';
}

// =============================================================================
// CLAIM WINNINGS
// =============================================================================

/**
 * Build claim_winnings_sol transaction
 */
export async function buildClaimWinningsTransaction(params: {
  marketPda: string;
  positionPda: string;
  userWallet: string;
  connection?: Connection;
}): Promise<ClaimTransactionResult> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const positionPubkey = new PublicKey(params.positionPda);
  const userPubkey = new PublicKey(params.userWallet);

  // Instruction data: just discriminator
  const data = CLAIM_WINNINGS_SOL_DISCRIMINATOR;

  // Accounts for claim_winnings_sol:
  // config, market, position, sol_treasury, user, system_program
  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: positionPubkey, isSigner: false, isWritable: true },
    { pubkey: SOL_TREASURY_PDA, isSigner: false, isWritable: true },
    { pubkey: userPubkey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });

  const transaction = new Transaction();
  transaction.add(instruction);

  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = userPubkey;

  const serializedTx = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  }).toString('base64');

  return {
    transaction,
    serializedTx,
    claimType: 'winnings',
  };
}

// =============================================================================
// CLAIM REFUND
// =============================================================================

/**
 * Build claim_refund_sol transaction
 */
export async function buildClaimRefundTransaction(params: {
  marketPda: string;
  positionPda: string;
  userWallet: string;
  connection?: Connection;
}): Promise<ClaimTransactionResult> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const positionPubkey = new PublicKey(params.positionPda);
  const userPubkey = new PublicKey(params.userWallet);

  const data = CLAIM_REFUND_SOL_DISCRIMINATOR;

  // IDL Accounts for claim_refund_sol: market, position, user, system_program (NO config!)
  const keys = [
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: positionPubkey, isSigner: false, isWritable: true },
    { pubkey: userPubkey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });

  const transaction = new Transaction();
  transaction.add(instruction);

  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = userPubkey;

  const serializedTx = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  }).toString('base64');

  return {
    transaction,
    serializedTx,
    claimType: 'refund',
  };
}

// =============================================================================
// CLAIM AFFILIATE EARNINGS
// =============================================================================

/**
 * Build claim_affiliate_sol transaction
 */
export async function buildClaimAffiliateTransaction(params: {
  affiliateCode: string;
  userWallet: string;
  connection?: Connection;
}): Promise<ClaimTransactionResult> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const userPubkey = new PublicKey(params.userWallet);

  // Derive affiliate PDA
  const [affiliatePda] = PublicKey.findProgramAddressSync(
    [SEEDS.AFFILIATE, Buffer.from(params.affiliateCode)],
    PROGRAM_ID
  );

  const data = CLAIM_AFFILIATE_SOL_DISCRIMINATOR;

  // Accounts for claim_affiliate_sol:
  // config, affiliate, sol_treasury, owner, system_program
  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: affiliatePda, isSigner: false, isWritable: true },
    { pubkey: SOL_TREASURY_PDA, isSigner: false, isWritable: true },
    { pubkey: userPubkey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });

  const transaction = new Transaction();
  transaction.add(instruction);

  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = userPubkey;

  const serializedTx = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  }).toString('base64');

  return {
    transaction,
    serializedTx,
    claimType: 'affiliate',
  };
}

// NOTE: claim_creator_sol is in creator-transaction.ts, not here

// =============================================================================
// BATCH CLAIM (Multiple positions)
// =============================================================================

/**
 * Build batch claim transaction for multiple positions
 */
export async function buildBatchClaimTransaction(params: {
  claims: Array<{
    marketPda: string;
    positionPda: string;
    claimType: 'winnings' | 'refund';
  }>;
  userWallet: string;
  connection?: Connection;
}): Promise<{
  transaction: Transaction;
  serializedTx: string;
  claimCount: number;
}> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const userPubkey = new PublicKey(params.userWallet);

  const transaction = new Transaction();

  for (const claim of params.claims) {
    const marketPubkey = new PublicKey(claim.marketPda);
    const positionPubkey = new PublicKey(claim.positionPda);

    const discriminator = claim.claimType === 'winnings'
      ? CLAIM_WINNINGS_SOL_DISCRIMINATOR
      : CLAIM_REFUND_SOL_DISCRIMINATOR;

    // claim_winnings_sol: config, market, position, sol_treasury, [optional...], user, system
    // claim_refund_sol: market, position, user, system (NO config!)
    const keys = claim.claimType === 'winnings'
      ? [
          { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
          { pubkey: marketPubkey, isSigner: false, isWritable: true },
          { pubkey: positionPubkey, isSigner: false, isWritable: true },
          { pubkey: SOL_TREASURY_PDA, isSigner: false, isWritable: true },
          { pubkey: userPubkey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ]
      : [
          { pubkey: marketPubkey, isSigner: false, isWritable: true },
          { pubkey: positionPubkey, isSigner: false, isWritable: true },
          { pubkey: userPubkey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ];

    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys,
      data: discriminator,
    });

    transaction.add(instruction);
  }

  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = userPubkey;

  const serializedTx = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  }).toString('base64');

  return {
    transaction,
    serializedTx,
    claimCount: params.claims.length,
  };
}
