/**
 * Bet Transaction Builder
 *
 * Builds unsigned transactions for placing bets on Baozi markets.
 * Agent builds, user signs. No private keys in agent.
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
  SEEDS,
  RPC_ENDPOINT,
  solToLamports,
} from '../config.js';

// =============================================================================
// INSTRUCTION DISCRIMINATORS
// =============================================================================

// place_bet_sol discriminator: [137, 137, 247, 253, 233, 243, 48, 170]
const PLACE_BET_SOL_DISCRIMINATOR = Buffer.from([137, 137, 247, 253, 233, 243, 48, 170]);

// place_bet_sol_with_affiliate discriminator: [197, 186, 187, 145, 252, 239, 101, 96]
const PLACE_BET_SOL_WITH_AFFILIATE_DISCRIMINATOR = Buffer.from([197, 186, 187, 145, 252, 239, 101, 96]);

// =============================================================================
// TYPES
// =============================================================================

export interface BuildBetTransactionParams {
  marketPda: PublicKey;
  marketId: bigint;
  userWallet: PublicKey;
  outcome: 'yes' | 'no';
  amountSol: number;
  affiliatePda?: PublicKey;
  affiliateOwner?: PublicKey;
  whitelistRequired?: boolean;
}

export interface BuildBetTransactionResult {
  transaction: Transaction;
  positionPda: PublicKey;
  serializedTx: string;
}

// =============================================================================
// PDA DERIVATION
// =============================================================================

/**
 * Derive position PDA from market ID and user
 */
function derivePositionPda(marketId: bigint, user: PublicKey): PublicKey {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(marketId);
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.POSITION, marketIdBuffer, user.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Derive whitelist PDA from market ID
 */
function deriveWhitelistPda(marketId: bigint): PublicKey {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(marketId);
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.WHITELIST, marketIdBuffer],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Derive referred user PDA
 */
function deriveReferredUserPda(user: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('referred'), user.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// =============================================================================
// INSTRUCTION BUILDERS
// =============================================================================

/**
 * Create place_bet_sol instruction
 */
function createPlaceBetSolInstruction(params: {
  config: PublicKey;
  market: PublicKey;
  position: PublicKey;
  whitelist: PublicKey | null;
  user: PublicKey;
  outcome: boolean;
  amount: bigint;
}): TransactionInstruction {
  // Serialize instruction data
  // [discriminator(8)] [outcome(1)] [amount(8)]
  const data = Buffer.alloc(17);
  PLACE_BET_SOL_DISCRIMINATOR.copy(data, 0);
  data.writeUInt8(params.outcome ? 1 : 0, 8);
  data.writeBigUInt64LE(params.amount, 9);

  const keys = [
    { pubkey: params.config, isSigner: false, isWritable: false },
    { pubkey: params.market, isSigner: false, isWritable: true },
    { pubkey: params.position, isSigner: false, isWritable: true },
  ];

  // Add optional whitelist
  if (params.whitelist) {
    keys.push({ pubkey: params.whitelist, isSigner: false, isWritable: false });
  }

  keys.push(
    { pubkey: params.user, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  );

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });
}

/**
 * Create place_bet_sol_with_affiliate instruction
 */
function createPlaceBetSolWithAffiliateInstruction(params: {
  config: PublicKey;
  market: PublicKey;
  position: PublicKey;
  affiliate: PublicKey;
  referredUser: PublicKey;
  whitelist: PublicKey | null;
  user: PublicKey;
  outcome: boolean;
  amount: bigint;
}): TransactionInstruction {
  // Serialize instruction data
  // [discriminator(8)] [outcome(1)] [amount(8)]
  const data = Buffer.alloc(17);
  PLACE_BET_SOL_WITH_AFFILIATE_DISCRIMINATOR.copy(data, 0);
  data.writeUInt8(params.outcome ? 1 : 0, 8);
  data.writeBigUInt64LE(params.amount, 9);

  const keys = [
    { pubkey: params.config, isSigner: false, isWritable: false },
    { pubkey: params.market, isSigner: false, isWritable: true },
    { pubkey: params.position, isSigner: false, isWritable: true },
    { pubkey: params.affiliate, isSigner: false, isWritable: true },
    { pubkey: params.referredUser, isSigner: false, isWritable: true },
  ];

  // Add optional whitelist
  if (params.whitelist) {
    keys.push({ pubkey: params.whitelist, isSigner: false, isWritable: false });
  }

  keys.push(
    { pubkey: params.user, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  );

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });
}

// =============================================================================
// MAIN BUILDER FUNCTION
// =============================================================================

/**
 * Build an unsigned bet transaction
 *
 * @param params - Transaction parameters
 * @param connection - Optional connection (will create if not provided)
 * @returns Unsigned transaction ready for user signing
 */
export async function buildBetTransaction(
  params: BuildBetTransactionParams,
  connection?: Connection
): Promise<BuildBetTransactionResult> {
  const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');

  // Derive PDAs
  const positionPda = derivePositionPda(params.marketId, params.userWallet);
  const whitelistPda = params.whitelistRequired
    ? deriveWhitelistPda(params.marketId)
    : null;

  // Convert amount to lamports
  const amountLamports = solToLamports(params.amountSol);

  // Create instruction
  let instruction: TransactionInstruction;

  if (params.affiliatePda && params.affiliateOwner) {
    const referredUserPda = deriveReferredUserPda(params.userWallet);
    instruction = createPlaceBetSolWithAffiliateInstruction({
      config: CONFIG_PDA,
      market: params.marketPda,
      position: positionPda,
      affiliate: params.affiliatePda,
      referredUser: referredUserPda,
      whitelist: whitelistPda,
      user: params.userWallet,
      outcome: params.outcome === 'yes',
      amount: amountLamports,
    });
  } else {
    instruction = createPlaceBetSolInstruction({
      config: CONFIG_PDA,
      market: params.marketPda,
      position: positionPda,
      whitelist: whitelistPda,
      user: params.userWallet,
      outcome: params.outcome === 'yes',
      amount: amountLamports,
    });
  }

  // Build transaction
  const transaction = new Transaction();
  transaction.add(instruction);

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = params.userWallet;

  // Serialize without signatures (returns Buffer)
  const serializedTx = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  }).toString('base64');

  return {
    transaction,
    positionPda,
    serializedTx,
  };
}

// =============================================================================
// SIMULATION
// =============================================================================

/**
 * Simulate a bet transaction
 */
export async function simulateBetTransaction(
  transaction: Transaction,
  userWallet: PublicKey,
  connection?: Connection
): Promise<{
  success: boolean;
  logs: string[];
  unitsConsumed?: number;
  error?: string;
}> {
  const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');

  try {
    // Use the legacy simulation API for Transaction objects
    const simulation = await conn.simulateTransaction(transaction);

    if (simulation.value.err) {
      return {
        success: false,
        logs: simulation.value.logs || [],
        unitsConsumed: simulation.value.unitsConsumed,
        error: JSON.stringify(simulation.value.err),
      };
    }

    return {
      success: true,
      logs: simulation.value.logs || [],
      unitsConsumed: simulation.value.unitsConsumed,
    };
  } catch (err) {
    return {
      success: false,
      logs: [],
      error: err instanceof Error ? err.message : 'Unknown simulation error',
    };
  }
}

// =============================================================================
// MARKET DATA EXTRACTION
// =============================================================================

/**
 * Extract market_id from market account data
 * V4.7.6 Market struct layout:
 * - discriminator (8 bytes)
 * - market_id (u64, 8 bytes) <-- First field!
 * - question (string: 4 byte len + content)
 * - ...rest of fields
 */
export function extractMarketIdFromData(data: Buffer): bigint {
  // market_id is at offset 8 (right after discriminator)
  return data.readBigUInt64LE(8);
}

/**
 * Extract access_gate from market data to determine if whitelist is needed
 * This requires parsing through the struct to find access_gate field
 */
export function extractAccessGateFromData(data: Buffer): number {
  // V4.7.6 Market struct layout after market_id:
  // market_id (8) + question (4+len) + closing_time (8) + resolution_time (8) +
  // auto_stop_buffer (8) + yes_pool (8) + no_pool (8) + snapshot_yes_pool (8) +
  // snapshot_no_pool (8) + status (1) + winning_outcome (1+1 option) +
  // currency_type (1) + _reserved_usdc_vault (33) + creator_bond (8) +
  // total_claimed (8) + platform_fee_collected (8) + last_bet_time (8) +
  // bump (1) + layer (1) + resolution_mode (1) + access_gate (1)

  let offset = 8; // Skip discriminator

  // market_id
  offset += 8;

  // question (string: 4 byte len + content)
  const questionLen = data.readUInt32LE(offset);
  offset += 4 + questionLen;

  // closing_time, resolution_time, auto_stop_buffer (3 * 8 = 24)
  offset += 24;

  // yes_pool, no_pool, snapshot_yes_pool, snapshot_no_pool (4 * 8 = 32)
  offset += 32;

  // status (enum, 1 byte)
  offset += 1;

  // winning_outcome (Option<bool>: 1 byte discriminant + 1 byte value if Some)
  const hasWinningOutcome = data.readUInt8(offset);
  offset += 1;
  if (hasWinningOutcome === 1) {
    offset += 1;
  }

  // currency_type (enum, 1 byte)
  offset += 1;

  // _reserved_usdc_vault (33 bytes)
  offset += 33;

  // creator_bond (8)
  offset += 8;

  // total_claimed (8)
  offset += 8;

  // platform_fee_collected (8)
  offset += 8;

  // last_bet_time (8)
  offset += 8;

  // bump (1)
  offset += 1;

  // layer (enum, 1 byte)
  offset += 1;

  // resolution_mode (enum, 1 byte)
  offset += 1;

  // access_gate (enum, 1 byte)
  const accessGate = data.readUInt8(offset);

  return accessGate;
}

// =============================================================================
// HELPER: FETCH MARKET AND BUILD
// =============================================================================

/**
 * Fetch market data and build bet transaction
 * Convenience function that handles market fetching and market_id extraction
 */
export async function fetchAndBuildBetTransaction(params: {
  marketPda: string;
  userWallet: string;
  outcome: 'yes' | 'no';
  amountSol: number;
  affiliatePda?: string;
  affiliateOwner?: string;
  connection?: Connection;
}): Promise<{
  transaction: BuildBetTransactionResult | null;
  marketId: bigint;
  error?: string;
}> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');

  try {
    const marketPubkey = new PublicKey(params.marketPda);
    const userPubkey = new PublicKey(params.userWallet);

    // Fetch market account to get market_id
    const accountInfo = await conn.getAccountInfo(marketPubkey);
    if (!accountInfo) {
      return {
        transaction: null,
        marketId: 0n,
        error: 'Market not found',
      };
    }

    const data = accountInfo.data;

    // Extract market_id (first field after discriminator)
    const marketId = extractMarketIdFromData(data);

    // Check if whitelist is required
    const accessGate = extractAccessGateFromData(data);
    const whitelistRequired = accessGate === 1; // 1 = Whitelist

    // Build affiliate PDAs if provided
    let affiliatePda: PublicKey | undefined;
    let affiliateOwner: PublicKey | undefined;

    if (params.affiliatePda && params.affiliateOwner) {
      affiliatePda = new PublicKey(params.affiliatePda);
      affiliateOwner = new PublicKey(params.affiliateOwner);
    }

    // Build the transaction
    const result = await buildBetTransaction(
      {
        marketPda: marketPubkey,
        marketId,
        userWallet: userPubkey,
        outcome: params.outcome,
        amountSol: params.amountSol,
        affiliatePda,
        affiliateOwner,
        whitelistRequired,
      },
      conn
    );

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
