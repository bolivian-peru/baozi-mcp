/**
 * Race Market Transaction Builders
 *
 * Builds unsigned transactions for:
 * - Placing bets on race (multi-outcome) markets
 * - Claiming race winnings
 * - Claiming race refunds
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
  solToLamports,
} from '../config.js';

// =============================================================================
// INSTRUCTION DISCRIMINATORS
// =============================================================================

// Correct discriminators: sha256("global:<instruction_name>")[0..8]
const BET_ON_RACE_SOL_DISCRIMINATOR = Buffer.from([195, 181, 151, 159, 105, 100, 234, 244]);
const BET_ON_RACE_SOL_WITH_AFFILIATE_DISCRIMINATOR = Buffer.from([26, 224, 14, 181, 67, 52, 24, 0]);
const CLAIM_RACE_WINNINGS_SOL_DISCRIMINATOR = Buffer.from([46, 120, 202, 194, 126, 72, 22, 52]);
const CLAIM_RACE_REFUND_DISCRIMINATOR = Buffer.from([174, 101, 101, 227, 171, 69, 173, 243]);

// =============================================================================
// TYPES
// =============================================================================

export interface RaceBetTransactionResult {
  transaction: Transaction;
  serializedTx: string;
  positionPda: string;
  marketId: bigint;
}

// =============================================================================
// RACE POSITION PDA
// =============================================================================

function deriveRacePositionPda(marketId: bigint, user: PublicKey): PublicKey {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(marketId);
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.RACE_POSITION, marketIdBuffer, user.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

function deriveRaceWhitelistPda(raceMarketPda: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.RACE_WHITELIST, raceMarketPda.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

function deriveRaceReferralPda(user: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('race_referral'), user.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// =============================================================================
// BET ON RACE OUTCOME
// =============================================================================

/**
 * Build bet_on_race_outcome_sol transaction
 */
export async function buildRaceBetTransaction(params: {
  raceMarketPda: string;
  marketId: bigint;
  outcomeIndex: number;
  amountSol: number;
  userWallet: string;
  whitelistRequired?: boolean;
  affiliatePda?: string;
  connection?: Connection;
}): Promise<RaceBetTransactionResult> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const userPubkey = new PublicKey(params.userWallet);

  // Derive position PDA
  const positionPda = deriveRacePositionPda(params.marketId, userPubkey);

  // Optional whitelist PDA
  const whitelistPda = params.whitelistRequired
    ? deriveRaceWhitelistPda(raceMarketPubkey)
    : null;

  // Amount in lamports
  const amountLamports = solToLamports(params.amountSol);

  let instruction: TransactionInstruction;

  if (params.affiliatePda) {
    // With affiliate
    const affiliatePubkey = new PublicKey(params.affiliatePda);
    const raceReferralPda = deriveRaceReferralPda(userPubkey);

    // Instruction data: discriminator + outcome_index (u8) + amount (u64)
    const data = Buffer.alloc(17);
    BET_ON_RACE_SOL_WITH_AFFILIATE_DISCRIMINATOR.copy(data, 0);
    data.writeUInt8(params.outcomeIndex, 8);
    data.writeBigUInt64LE(amountLamports, 9);

    // For Anchor optional accounts, always include whitelist with PROGRAM_ID as placeholder
    const keys = [
      { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
      { pubkey: raceMarketPubkey, isSigner: false, isWritable: true },
      { pubkey: positionPda, isSigner: false, isWritable: true },
      { pubkey: affiliatePubkey, isSigner: false, isWritable: true },
      { pubkey: raceReferralPda, isSigner: false, isWritable: true },
      { pubkey: whitelistPda || PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys,
      data,
    });
  } else {
    // Without affiliate
    const data = Buffer.alloc(17);
    BET_ON_RACE_SOL_DISCRIMINATOR.copy(data, 0);
    data.writeUInt8(params.outcomeIndex, 8);
    data.writeBigUInt64LE(amountLamports, 9);

    // For Anchor optional accounts, always include whitelist with PROGRAM_ID as placeholder
    const keys = [
      { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
      { pubkey: raceMarketPubkey, isSigner: false, isWritable: true },
      { pubkey: positionPda, isSigner: false, isWritable: true },
      { pubkey: whitelistPda || PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys,
      data,
    });
  }

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
    positionPda: positionPda.toBase58(),
    marketId: params.marketId,
  };
}

// =============================================================================
// FETCH AND BUILD RACE BET
// =============================================================================

/**
 * Fetch race market data and build bet transaction
 */
export async function fetchAndBuildRaceBetTransaction(params: {
  raceMarketPda: string;
  outcomeIndex: number;
  amountSol: number;
  userWallet: string;
  affiliatePda?: string;
  connection?: Connection;
}): Promise<{
  transaction: RaceBetTransactionResult | null;
  marketId: bigint;
  error?: string;
}> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');

  try {
    const raceMarketPubkey = new PublicKey(params.raceMarketPda);
    const accountInfo = await conn.getAccountInfo(raceMarketPubkey);

    if (!accountInfo) {
      return {
        transaction: null,
        marketId: 0n,
        error: 'Race market not found',
      };
    }

    const data = accountInfo.data;

    // Extract market_id (first field after discriminator)
    const marketId = data.readBigUInt64LE(8);

    // Check access_gate (need to navigate through struct)
    // For now, assume public
    const whitelistRequired = false;

    const result = await buildRaceBetTransaction({
      raceMarketPda: params.raceMarketPda,
      marketId,
      outcomeIndex: params.outcomeIndex,
      amountSol: params.amountSol,
      userWallet: params.userWallet,
      whitelistRequired,
      affiliatePda: params.affiliatePda,
      connection: conn,
    });

    return {
      transaction: result,
      marketId,
    };
  } catch (err) {
    return {
      transaction: null,
      marketId: 0n,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// =============================================================================
// CLAIM RACE WINNINGS
// =============================================================================

/**
 * Build claim_race_winnings_sol transaction
 */
export async function buildClaimRaceWinningsTransaction(params: {
  raceMarketPda: string;
  positionPda: string;
  userWallet: string;
  connection?: Connection;
}): Promise<{
  transaction: Transaction;
  serializedTx: string;
}> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const positionPubkey = new PublicKey(params.positionPda);
  const userPubkey = new PublicKey(params.userWallet);

  const data = CLAIM_RACE_WINNINGS_SOL_DISCRIMINATOR;

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: true },
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
  };
}

// =============================================================================
// CLAIM RACE REFUND
// =============================================================================

/**
 * Build claim_race_refund transaction
 */
export async function buildClaimRaceRefundTransaction(params: {
  raceMarketPda: string;
  positionPda: string;
  userWallet: string;
  connection?: Connection;
}): Promise<{
  transaction: Transaction;
  serializedTx: string;
}> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const positionPubkey = new PublicKey(params.positionPda);
  const userPubkey = new PublicKey(params.userWallet);

  const data = CLAIM_RACE_REFUND_DISCRIMINATOR;

  // IDL Accounts: race_market, position, user, system_program (NO config!)
  const keys = [
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: true },
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
  };
}
