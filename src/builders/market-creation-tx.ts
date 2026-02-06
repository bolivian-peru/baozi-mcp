/**
 * Market Creation Transaction Builders
 *
 * Builds unsigned transactions for:
 * - create_lab_market_sol (community markets)
 * - create_private_table_sol (invite-only markets)
 * - create_race_market_sol (multi-outcome markets)
 *
 * FIXED: Jan 2026 - Corrected discriminators, offsets, and instruction formats
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
  CONFIG_TREASURY,
  SEEDS,
  RPC_ENDPOINT,
} from '../config.js';

// =============================================================================
// INSTRUCTION DISCRIMINATORS (sha256("global:<name>")[0..8])
// =============================================================================

const CREATE_LAB_MARKET_SOL_DISCRIMINATOR = Buffer.from([35, 159, 50, 67, 31, 134, 199, 157]);
const CREATE_PRIVATE_TABLE_SOL_DISCRIMINATOR = Buffer.from([242, 241, 183, 108, 35, 183, 38, 241]);
const CREATE_RACE_MARKET_SOL_DISCRIMINATOR = Buffer.from([94, 237, 40, 47, 63, 233, 25, 67]);

// =============================================================================
// GLOBAL CONFIG OFFSETS (calculated from IDL struct layout)
// =============================================================================

// GlobalConfig struct layout:
// discriminator (8) + admin (32) + treasury (32) + guardian (32) +
// _reserved_usdc_mint (32) + _reserved_creation_fee_usdc (8) + creation_fee_sol (8) +
// _reserved_market_bond_usdc (8) + market_bond_sol (8) + platform_fee_bps (2) + market_count (8)
const MARKET_COUNT_OFFSET = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 2; // = 170

// =============================================================================
// TYPES
// =============================================================================

export interface CreateMarketResult {
  transaction: Transaction;
  serializedTx: string;
  marketPda: string;
  marketId: bigint;
}

export interface CreateLabMarketParams {
  question: string;
  closingTime: Date;
  resolutionBuffer?: number;    // seconds after closing before resolution (default: 43200 = 12h)
  autoStopBuffer?: number;      // seconds before closing to stop betting (default: 300 = 5min)
  resolutionMode?: number;      // 0=HostOracle, 1=CouncilOracle (default: 1)
  council?: string[];           // council member pubkeys (required if resolutionMode=1)
  councilThreshold?: number;    // votes needed (required if resolutionMode=1)
  creatorWallet: string;
}

export interface CreatePrivateMarketParams {
  question: string;
  closingTime: Date;
  resolutionBuffer?: number;
  autoStopBuffer?: number;
  resolutionMode?: number;
  council?: string[];
  councilThreshold?: number;
  creatorWallet: string;
}

export interface CreateRaceMarketParams {
  question: string;
  outcomes: string[];           // 2-10 outcome labels
  closingTime: Date;
  resolutionBuffer?: number;
  autoStopBuffer?: number;
  layer?: number;               // 1=Lab, 2=Private (default: 1)
  resolutionMode?: number;      // 0=HostOracle, 1=CouncilOracle
  accessGate?: number;          // 0=Public, 1=Whitelist
  council?: string[];
  councilThreshold?: number;
  creatorWallet: string;
}

// =============================================================================
// PDA DERIVATION
// =============================================================================

function deriveMarketPda(marketId: bigint): [PublicKey, number] {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(marketId);
  return PublicKey.findProgramAddressSync(
    [SEEDS.MARKET, marketIdBuffer],
    PROGRAM_ID
  );
}

function deriveRaceMarketPda(marketId: bigint): [PublicKey, number] {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(marketId);
  return PublicKey.findProgramAddressSync(
    [SEEDS.RACE, marketIdBuffer],
    PROGRAM_ID
  );
}

function deriveWhitelistPda(marketId: bigint): [PublicKey, number] {
  const marketIdBuffer = Buffer.alloc(8);
  marketIdBuffer.writeBigUInt64LE(marketId);
  return PublicKey.findProgramAddressSync(
    [SEEDS.WHITELIST, marketIdBuffer],
    PROGRAM_ID
  );
}

function deriveCreatorProfilePda(creator: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('creator_profile'), creator.toBuffer()],
    PROGRAM_ID
  );
}

// =============================================================================
// GET MARKET COUNT FROM CONFIG
// =============================================================================

export async function getNextMarketId(
  connection?: Connection
): Promise<{ marketId: bigint; raceMarketId: bigint }> {
  const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');

  try {
    const configAccount = await conn.getAccountInfo(CONFIG_PDA);
    if (!configAccount) {
      throw new Error('GlobalConfig not found');
    }

    const data = configAccount.data;
    // market_count at offset 170 (verified against on-chain data)
    const marketCount = data.readBigUInt64LE(MARKET_COUNT_OFFSET);

    // Both regular and race markets use the SAME counter
    // The program uses the CURRENT value (not +1) for PDA derivation
    return {
      marketId: marketCount,
      raceMarketId: marketCount,
    };
  } catch (err) {
    // If we can't read config, return safe defaults
    return { marketId: 0n, raceMarketId: 0n };
  }
}

// =============================================================================
// BUILD CREATE LAB MARKET TRANSACTION
// =============================================================================

export async function buildCreateLabMarketTransaction(
  params: CreateLabMarketParams,
  connection?: Connection
): Promise<CreateMarketResult> {
  const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const creatorPubkey = new PublicKey(params.creatorWallet);

  // Get current market count for PDA derivation
  const { marketId } = await getNextMarketId(conn);
  const [marketPda] = deriveMarketPda(marketId);
  const [creatorProfilePda] = deriveCreatorProfilePda(creatorPubkey);

  // Check if creator profile exists
  const creatorProfileInfo = await conn.getAccountInfo(creatorProfilePda);
  const hasCreatorProfile = creatorProfileInfo !== null;

  // Set defaults
  const closingTime = BigInt(Math.floor(params.closingTime.getTime() / 1000));
  const resolutionBuffer = BigInt(params.resolutionBuffer ?? 43200); // 12 hours
  const autoStopBuffer = BigInt(params.autoStopBuffer ?? 300); // 5 minutes
  const resolutionMode = params.resolutionMode ?? 1; // CouncilOracle by default

  // For CouncilOracle, creator is default council member
  const council = params.council?.map(p => new PublicKey(p)) ??
    (resolutionMode === 1 ? [creatorPubkey] : []);
  const councilThreshold = params.councilThreshold ?? (council.length > 0 ? 1 : 0);

  // Encode instruction data:
  // discriminator (8) + question (4+len) + closing_time (8) + resolution_buffer (8) +
  // auto_stop_buffer (8) + resolution_mode (1) + council (4+n*32) + council_threshold (1)
  const questionBytes = Buffer.from(params.question, 'utf8');
  const size = 8 + 4 + questionBytes.length + 8 + 8 + 8 + 1 + 4 + (council.length * 32) + 1;

  const data = Buffer.alloc(size);
  let offset = 0;

  CREATE_LAB_MARKET_SOL_DISCRIMINATOR.copy(data, offset); offset += 8;
  data.writeUInt32LE(questionBytes.length, offset); offset += 4;
  questionBytes.copy(data, offset); offset += questionBytes.length;
  data.writeBigInt64LE(closingTime, offset); offset += 8;
  data.writeBigInt64LE(resolutionBuffer, offset); offset += 8;
  data.writeBigInt64LE(autoStopBuffer, offset); offset += 8;
  data.writeUInt8(resolutionMode, offset); offset += 1;
  data.writeUInt32LE(council.length, offset); offset += 4;
  for (const member of council) {
    member.toBuffer().copy(data, offset); offset += 32;
  }
  data.writeUInt8(councilThreshold, offset);

  // Accounts from IDL:
  // config (PDA), market (PDA), treasury, creator (signer), creator_profile (optional), system_program
  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: true },
    { pubkey: marketPda, isSigner: false, isWritable: true },
    { pubkey: CONFIG_TREASURY, isSigner: false, isWritable: true },
    { pubkey: creatorPubkey, isSigner: true, isWritable: true },
    // For optional accounts, pass PROGRAM_ID as placeholder if not present
    { pubkey: hasCreatorProfile ? creatorProfilePda : PROGRAM_ID, isSigner: false, isWritable: hasCreatorProfile },
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
  transaction.feePayer = creatorPubkey;

  const serializedTx = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  }).toString('base64');

  return {
    transaction,
    serializedTx,
    marketPda: marketPda.toBase58(),
    marketId,
  };
}

// =============================================================================
// BUILD CREATE PRIVATE MARKET TRANSACTION
// =============================================================================

export async function buildCreatePrivateMarketTransaction(
  params: CreatePrivateMarketParams,
  connection?: Connection
): Promise<CreateMarketResult> {
  const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const creatorPubkey = new PublicKey(params.creatorWallet);

  const { marketId } = await getNextMarketId(conn);
  const [marketPda] = deriveMarketPda(marketId);
  const [whitelistPda] = deriveWhitelistPda(marketId);
  const [creatorProfilePda] = deriveCreatorProfilePda(creatorPubkey);

  const creatorProfileInfo = await conn.getAccountInfo(creatorProfilePda);
  const hasCreatorProfile = creatorProfileInfo !== null;

  const closingTime = BigInt(Math.floor(params.closingTime.getTime() / 1000));
  const resolutionBuffer = BigInt(params.resolutionBuffer ?? 43200);
  const autoStopBuffer = BigInt(params.autoStopBuffer ?? 300);
  const resolutionMode = params.resolutionMode ?? 0; // HostOracle for private

  const council = params.council?.map(p => new PublicKey(p)) ?? [];
  const councilThreshold = params.councilThreshold ?? 0;

  // Same instruction format as Lab market
  const questionBytes = Buffer.from(params.question, 'utf8');
  const size = 8 + 4 + questionBytes.length + 8 + 8 + 8 + 1 + 4 + (council.length * 32) + 1;

  const data = Buffer.alloc(size);
  let offset = 0;

  CREATE_PRIVATE_TABLE_SOL_DISCRIMINATOR.copy(data, offset); offset += 8;
  data.writeUInt32LE(questionBytes.length, offset); offset += 4;
  questionBytes.copy(data, offset); offset += questionBytes.length;
  data.writeBigInt64LE(closingTime, offset); offset += 8;
  data.writeBigInt64LE(resolutionBuffer, offset); offset += 8;
  data.writeBigInt64LE(autoStopBuffer, offset); offset += 8;
  data.writeUInt8(resolutionMode, offset); offset += 1;
  data.writeUInt32LE(council.length, offset); offset += 4;
  for (const member of council) {
    member.toBuffer().copy(data, offset); offset += 32;
  }
  data.writeUInt8(councilThreshold, offset);

  // Private market accounts include whitelist PDA
  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: true },
    { pubkey: marketPda, isSigner: false, isWritable: true },
    { pubkey: whitelistPda, isSigner: false, isWritable: true },
    { pubkey: CONFIG_TREASURY, isSigner: false, isWritable: true },
    { pubkey: creatorPubkey, isSigner: true, isWritable: true },
    { pubkey: hasCreatorProfile ? creatorProfilePda : PROGRAM_ID, isSigner: false, isWritable: hasCreatorProfile },
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
  transaction.feePayer = creatorPubkey;

  const serializedTx = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  }).toString('base64');

  return {
    transaction,
    serializedTx,
    marketPda: marketPda.toBase58(),
    marketId,
  };
}

// =============================================================================
// BUILD CREATE RACE MARKET TRANSACTION
// =============================================================================

export async function buildCreateRaceMarketTransaction(
  params: CreateRaceMarketParams,
  connection?: Connection
): Promise<CreateMarketResult> {
  const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const creatorPubkey = new PublicKey(params.creatorWallet);

  const { raceMarketId } = await getNextMarketId(conn);
  const [raceMarketPda] = deriveRaceMarketPda(raceMarketId);
  const [creatorProfilePda] = deriveCreatorProfilePda(creatorPubkey);

  const creatorProfileInfo = await conn.getAccountInfo(creatorProfilePda);
  const hasCreatorProfile = creatorProfileInfo !== null;

  const closingTime = BigInt(Math.floor(params.closingTime.getTime() / 1000));
  const resolutionBuffer = BigInt(params.resolutionBuffer ?? 43200);
  const autoStopBuffer = BigInt(params.autoStopBuffer ?? 300);
  const layer = params.layer ?? 1; // Lab by default
  const resolutionMode = params.resolutionMode ?? 1; // CouncilOracle
  const accessGate = params.accessGate ?? 0; // Public

  // Council is Option<Vec<Pubkey>> - encode as 1 (Some) + vec or 0 (None)
  const hasCouncil = params.council && params.council.length > 0;
  const council = hasCouncil ? params.council!.map(p => new PublicKey(p)) : [];

  // council_threshold is Option<u8>
  const hasThreshold = params.councilThreshold !== undefined;
  const councilThreshold = params.councilThreshold ?? 0;

  // Encode instruction data:
  // discriminator (8) + question (4+len) + outcome_labels (4 + n*(4+len)) +
  // closing_time (8) + resolution_buffer (8) + auto_stop_buffer (8) +
  // layer (1) + resolution_mode (1) + access_gate (1) +
  // council (1 + 4 + n*32 or just 1) + council_threshold (1 + 1 or just 1)

  const questionBytes = Buffer.from(params.question, 'utf8');
  const outcomeBuffers = params.outcomes.map(o => Buffer.from(o, 'utf8'));

  let outcomesSize = 4; // vec length
  for (const buf of outcomeBuffers) {
    outcomesSize += 4 + buf.length;
  }

  const councilSize = hasCouncil ? (1 + 4 + council.length * 32) : 1;
  const thresholdSize = hasThreshold ? 2 : 1;

  const size = 8 + 4 + questionBytes.length + outcomesSize + 8 + 8 + 8 + 1 + 1 + 1 + councilSize + thresholdSize;
  const data = Buffer.alloc(size);
  let offset = 0;

  CREATE_RACE_MARKET_SOL_DISCRIMINATOR.copy(data, offset); offset += 8;

  data.writeUInt32LE(questionBytes.length, offset); offset += 4;
  questionBytes.copy(data, offset); offset += questionBytes.length;

  data.writeUInt32LE(params.outcomes.length, offset); offset += 4;
  for (const buf of outcomeBuffers) {
    data.writeUInt32LE(buf.length, offset); offset += 4;
    buf.copy(data, offset); offset += buf.length;
  }

  data.writeBigInt64LE(closingTime, offset); offset += 8;
  data.writeBigInt64LE(resolutionBuffer, offset); offset += 8;
  data.writeBigInt64LE(autoStopBuffer, offset); offset += 8;

  data.writeUInt8(layer, offset); offset += 1;
  data.writeUInt8(resolutionMode, offset); offset += 1;
  data.writeUInt8(accessGate, offset); offset += 1;

  // Option<Vec<Pubkey>> - 1 (Some) + vec or 0 (None)
  if (hasCouncil) {
    data.writeUInt8(1, offset); offset += 1;
    data.writeUInt32LE(council.length, offset); offset += 4;
    for (const member of council) {
      member.toBuffer().copy(data, offset); offset += 32;
    }
  } else {
    data.writeUInt8(0, offset); offset += 1;
  }

  // Option<u8> - 1 (Some) + value or 0 (None)
  if (hasThreshold) {
    data.writeUInt8(1, offset); offset += 1;
    data.writeUInt8(councilThreshold, offset); offset += 1;
  } else {
    data.writeUInt8(0, offset); offset += 1;
  }

  // Accounts: config, race_market, creator_profile (optional), treasury, creator, system_program
  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: true },
    { pubkey: raceMarketPda, isSigner: false, isWritable: true },
    { pubkey: hasCreatorProfile ? creatorProfilePda : PROGRAM_ID, isSigner: false, isWritable: hasCreatorProfile },
    { pubkey: CONFIG_TREASURY, isSigner: false, isWritable: true },
    { pubkey: creatorPubkey, isSigner: true, isWritable: true },
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
  transaction.feePayer = creatorPubkey;

  const serializedTx = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  }).toString('base64');

  return {
    transaction,
    serializedTx,
    marketPda: raceMarketPda.toBase58(),
    marketId: raceMarketId,
  };
}

// =============================================================================
// HELPER: DERIVE PDA PREVIEW
// =============================================================================

export function previewMarketPda(marketId: bigint): {
  marketPda: string;
  bump: number;
} {
  const [pda, bump] = deriveMarketPda(marketId);
  return { marketPda: pda.toBase58(), bump };
}

export function previewRaceMarketPda(marketId: bigint): {
  raceMarketPda: string;
  bump: number;
} {
  const [pda, bump] = deriveRaceMarketPda(marketId);
  return { raceMarketPda: pda.toBase58(), bump };
}
