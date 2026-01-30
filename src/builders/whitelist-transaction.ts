/**
 * Whitelist Transaction Builders
 *
 * IMPORTANT: Account structures verified against IDL v4.7.6
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
  RPC_ENDPOINT,
  SEEDS,
} from '../config.js';

// =============================================================================
// DISCRIMINATORS (from IDL)
// =============================================================================

const DISCRIMINATORS = {
  add_to_whitelist: Buffer.from([157, 211, 52, 54, 144, 81, 5, 55]),
  remove_from_whitelist: Buffer.from([7, 144, 216, 239, 243, 236, 193, 235]),
  create_race_whitelist: Buffer.from([236, 103, 41, 9, 152, 23, 229, 58]),
  add_to_race_whitelist: Buffer.from([144, 229, 112, 184, 199, 39, 27, 156]),
  remove_from_race_whitelist: Buffer.from([150, 136, 17, 158, 48, 19, 39, 232]),
};

// =============================================================================
// PDA DERIVATION
// =============================================================================

function deriveWhitelistPda(marketPda: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.WHITELIST, marketPda.toBuffer()],
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

// =============================================================================
// BOOLEAN MARKET WHITELIST
// =============================================================================

/**
 * Build add_to_whitelist transaction
 * IDL Accounts: market, whitelist, creator
 */
export async function buildAddToWhitelistTransaction(params: {
  marketPda: string;
  userToAdd: string;
  creatorWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string; whitelistPda: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const userPubkey = new PublicKey(params.userToAdd);
  const creatorPubkey = new PublicKey(params.creatorWallet);
  const whitelistPda = deriveWhitelistPda(marketPubkey);

  // Instruction data: discriminator + address (pubkey)
  const data = Buffer.alloc(8 + 32);
  DISCRIMINATORS.add_to_whitelist.copy(data, 0);
  userPubkey.toBuffer().copy(data, 8);

  const keys = [
    { pubkey: marketPubkey, isSigner: false, isWritable: false },
    { pubkey: whitelistPda, isSigner: false, isWritable: true },
    { pubkey: creatorPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = creatorPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    whitelistPda: whitelistPda.toBase58(),
  };
}

/**
 * Build remove_from_whitelist transaction
 * IDL Accounts: market, whitelist, creator
 */
export async function buildRemoveFromWhitelistTransaction(params: {
  marketPda: string;
  userToRemove: string;
  creatorWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const userPubkey = new PublicKey(params.userToRemove);
  const creatorPubkey = new PublicKey(params.creatorWallet);
  const whitelistPda = deriveWhitelistPda(marketPubkey);

  // Instruction data: discriminator + address (pubkey)
  const data = Buffer.alloc(8 + 32);
  DISCRIMINATORS.remove_from_whitelist.copy(data, 0);
  userPubkey.toBuffer().copy(data, 8);

  const keys = [
    { pubkey: marketPubkey, isSigner: false, isWritable: false },
    { pubkey: whitelistPda, isSigner: false, isWritable: true },
    { pubkey: creatorPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = creatorPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

// =============================================================================
// RACE MARKET WHITELIST
// =============================================================================

/**
 * Build create_race_whitelist transaction
 * IDL Accounts: race_market, whitelist, creator, system_program
 */
export async function buildCreateRaceWhitelistTransaction(params: {
  raceMarketPda: string;
  creatorWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string; whitelistPda: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const creatorPubkey = new PublicKey(params.creatorWallet);
  const whitelistPda = deriveRaceWhitelistPda(raceMarketPubkey);

  const data = DISCRIMINATORS.create_race_whitelist;

  const keys = [
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: false },
    { pubkey: whitelistPda, isSigner: false, isWritable: true },
    { pubkey: creatorPubkey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = creatorPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    whitelistPda: whitelistPda.toBase58(),
  };
}

/**
 * Build add_to_race_whitelist transaction
 * IDL Accounts: race_market, whitelist, creator
 */
export async function buildAddToRaceWhitelistTransaction(params: {
  raceMarketPda: string;
  userToAdd: string;
  creatorWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const userPubkey = new PublicKey(params.userToAdd);
  const creatorPubkey = new PublicKey(params.creatorWallet);
  const whitelistPda = deriveRaceWhitelistPda(raceMarketPubkey);

  // Instruction data: discriminator + address (pubkey)
  const data = Buffer.alloc(8 + 32);
  DISCRIMINATORS.add_to_race_whitelist.copy(data, 0);
  userPubkey.toBuffer().copy(data, 8);

  const keys = [
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: false },
    { pubkey: whitelistPda, isSigner: false, isWritable: true },
    { pubkey: creatorPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = creatorPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build remove_from_race_whitelist transaction
 * IDL Accounts: race_market, whitelist, creator
 */
export async function buildRemoveFromRaceWhitelistTransaction(params: {
  raceMarketPda: string;
  userToRemove: string;
  creatorWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const userPubkey = new PublicKey(params.userToRemove);
  const creatorPubkey = new PublicKey(params.creatorWallet);
  const whitelistPda = deriveRaceWhitelistPda(raceMarketPubkey);

  // Instruction data: discriminator + address (pubkey)
  const data = Buffer.alloc(8 + 32);
  DISCRIMINATORS.remove_from_race_whitelist.copy(data, 0);
  userPubkey.toBuffer().copy(data, 8);

  const keys = [
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: false },
    { pubkey: whitelistPda, isSigner: false, isWritable: true },
    { pubkey: creatorPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = creatorPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}
