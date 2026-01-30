/**
 * Market Management Transaction Builders
 *
 * Builds unsigned transactions for:
 * - Closing markets (stopping betting)
 * - Extending market deadlines
 */
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  PROGRAM_ID,
  CONFIG_PDA,
  RPC_ENDPOINT,
} from '../config.js';

// =============================================================================
// DISCRIMINATORS
// =============================================================================

const DISCRIMINATORS = {
  close_market: Buffer.from([88, 154, 248, 186, 48, 14, 123, 244]),
  close_race_market: Buffer.from([39, 189, 166, 118, 134, 37, 102, 41]),
  extend_market: Buffer.from([105, 89, 206, 205, 57, 31, 153, 252]),
  extend_race_market: Buffer.from([242, 176, 227, 152, 79, 116, 110, 168]),
  cancel_market: Buffer.from([205, 121, 84, 210, 222, 71, 150, 11]),
  cancel_race: Buffer.from([28, 31, 113, 29, 126, 206, 39, 119]),
};

// =============================================================================
// BOOLEAN MARKET MANAGEMENT
// =============================================================================

/**
 * Build close_market transaction
 * Stops betting on a market (usually done by creator before resolution)
 */
export async function buildCloseMarketTransaction(params: {
  marketPda: string;
  callerWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const callerPubkey = new PublicKey(params.callerWallet);

  const data = DISCRIMINATORS.close_market;

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: callerPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = callerPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build extend_market transaction
 * Extends the closing time and/or resolution time
 */
export async function buildExtendMarketTransaction(params: {
  marketPda: string;
  newClosingTime: number; // Unix timestamp
  newResolutionTime?: number; // Unix timestamp (optional)
  callerWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const callerPubkey = new PublicKey(params.callerWallet);

  // Instruction data: discriminator + new_closing_time (i64) + Option<i64> new_resolution_time
  const hasResolutionTime = params.newResolutionTime !== undefined;
  const dataSize = 8 + 8 + 1 + (hasResolutionTime ? 8 : 0);
  const data = Buffer.alloc(dataSize);

  let offset = 0;
  DISCRIMINATORS.extend_market.copy(data, offset);
  offset += 8;

  data.writeBigInt64LE(BigInt(params.newClosingTime), offset);
  offset += 8;

  if (hasResolutionTime) {
    data.writeUInt8(1, offset); // Some
    offset += 1;
    data.writeBigInt64LE(BigInt(params.newResolutionTime!), offset);
  } else {
    data.writeUInt8(0, offset); // None
  }

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: callerPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = callerPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

// =============================================================================
// RACE MARKET MANAGEMENT
// =============================================================================

/**
 * Build close_race_market transaction
 */
export async function buildCloseRaceMarketTransaction(params: {
  raceMarketPda: string;
  callerWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const callerPubkey = new PublicKey(params.callerWallet);

  const data = DISCRIMINATORS.close_race_market;

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: true },
    { pubkey: callerPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = callerPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build extend_race_market transaction
 */
export async function buildExtendRaceMarketTransaction(params: {
  raceMarketPda: string;
  newClosingTime: number; // Unix timestamp
  newResolutionTime?: number; // Unix timestamp (optional)
  callerWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const callerPubkey = new PublicKey(params.callerWallet);

  const hasResolutionTime = params.newResolutionTime !== undefined;
  const dataSize = 8 + 8 + 1 + (hasResolutionTime ? 8 : 0);
  const data = Buffer.alloc(dataSize);

  let offset = 0;
  DISCRIMINATORS.extend_race_market.copy(data, offset);
  offset += 8;

  data.writeBigInt64LE(BigInt(params.newClosingTime), offset);
  offset += 8;

  if (hasResolutionTime) {
    data.writeUInt8(1, offset); // Some
    offset += 1;
    data.writeBigInt64LE(BigInt(params.newResolutionTime!), offset);
  } else {
    data.writeUInt8(0, offset); // None
  }

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: true },
    { pubkey: callerPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = callerPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

// =============================================================================
// CANCEL MARKET (ADMIN/CREATOR)
// =============================================================================

/**
 * Build cancel_market transaction
 * Cancels a market and allows all bettors to claim refunds.
 * Only callable by admin or creator (depending on market status).
 */
export async function buildCancelMarketTransaction(params: {
  marketPda: string;
  reason: string;
  authorityWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const authorityPubkey = new PublicKey(params.authorityWallet);

  // Instruction data: discriminator + reason (string)
  // String encoding: 4-byte length prefix + UTF-8 bytes
  const reasonBytes = Buffer.from(params.reason, 'utf8');
  const data = Buffer.alloc(8 + 4 + reasonBytes.length);
  DISCRIMINATORS.cancel_market.copy(data, 0);
  data.writeUInt32LE(reasonBytes.length, 8);
  reasonBytes.copy(data, 12);

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: authorityPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = authorityPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build cancel_race transaction
 * Cancels a race market and allows all bettors to claim refunds.
 */
export async function buildCancelRaceTransaction(params: {
  raceMarketPda: string;
  reason: string;
  authorityWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const authorityPubkey = new PublicKey(params.authorityWallet);

  // Instruction data: discriminator + reason (string)
  const reasonBytes = Buffer.from(params.reason, 'utf8');
  const data = Buffer.alloc(8 + 4 + reasonBytes.length);
  DISCRIMINATORS.cancel_race.copy(data, 0);
  data.writeUInt32LE(reasonBytes.length, 8);
  reasonBytes.copy(data, 12);

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: true },
    { pubkey: authorityPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = authorityPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}
