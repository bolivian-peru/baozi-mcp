/**
 * Resolution Transaction Builders
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
  CONFIG_PDA,
  RPC_ENDPOINT,
  SEEDS,
} from '../config.js';

// =============================================================================
// DISCRIMINATORS (from IDL)
// =============================================================================

const DISCRIMINATORS = {
  propose_resolution: Buffer.from([19, 68, 181, 23, 194, 146, 152, 252]),
  propose_resolution_host: Buffer.from([116, 231, 75, 185, 127, 129, 46, 124]),
  resolve_market: Buffer.from([155, 23, 80, 173, 46, 74, 23, 239]),
  resolve_market_host: Buffer.from([140, 50, 133, 146, 72, 5, 210, 116]),
  finalize_resolution: Buffer.from([191, 74, 94, 214, 45, 150, 152, 125]),
  propose_race_resolution: Buffer.from([14, 204, 17, 188, 243, 49, 107, 255]),
  resolve_race: Buffer.from([181, 252, 7, 209, 242, 100, 95, 172]),
  finalize_race_resolution: Buffer.from([19, 232, 81, 138, 191, 218, 54, 200]),
};

// =============================================================================
// PDA DERIVATION
// =============================================================================

function deriveDisputeMetaPda(marketPda: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.DISPUTE_META, marketPda.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// =============================================================================
// BOOLEAN MARKET RESOLUTION
// =============================================================================

/**
 * Build propose_resolution transaction
 * IDL Accounts: config, market, dispute_meta, authority, system_program
 */
export async function buildProposeResolutionTransaction(params: {
  marketPda: string;
  outcome: boolean;
  proposerWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const proposerPubkey = new PublicKey(params.proposerWallet);
  const disputeMetaPda = deriveDisputeMetaPda(marketPubkey);

  // Instruction data: discriminator + outcome (bool)
  const data = Buffer.alloc(9);
  DISCRIMINATORS.propose_resolution.copy(data, 0);
  data.writeUInt8(params.outcome ? 1 : 0, 8);

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: disputeMetaPda, isSigner: false, isWritable: true },
    { pubkey: proposerPubkey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = proposerPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build propose_resolution_host transaction
 * IDL Accounts: config, market, dispute_meta, host, system_program
 */
export async function buildProposeResolutionHostTransaction(params: {
  marketPda: string;
  outcome: boolean;
  oracleWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const oraclePubkey = new PublicKey(params.oracleWallet);
  const disputeMetaPda = deriveDisputeMetaPda(marketPubkey);

  const data = Buffer.alloc(9);
  DISCRIMINATORS.propose_resolution_host.copy(data, 0);
  data.writeUInt8(params.outcome ? 1 : 0, 8);

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: disputeMetaPda, isSigner: false, isWritable: true },
    { pubkey: oraclePubkey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = oraclePubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build resolve_market transaction
 * IDL Accounts: config, market, authority
 */
export async function buildResolveMarketTransaction(params: {
  marketPda: string;
  outcome: boolean;
  resolverWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const resolverPubkey = new PublicKey(params.resolverWallet);

  const data = Buffer.alloc(9);
  DISCRIMINATORS.resolve_market.copy(data, 0);
  data.writeUInt8(params.outcome ? 1 : 0, 8);

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: resolverPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = resolverPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build resolve_market_host transaction
 * IDL Accounts: config, market, host
 */
export async function buildResolveMarketHostTransaction(params: {
  marketPda: string;
  outcome: boolean;
  oracleWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const oraclePubkey = new PublicKey(params.oracleWallet);

  const data = Buffer.alloc(9);
  DISCRIMINATORS.resolve_market_host.copy(data, 0);
  data.writeUInt8(params.outcome ? 1 : 0, 8);

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: oraclePubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = oraclePubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build finalize_resolution transaction
 * IDL Accounts: market, dispute_meta, finalizer
 */
export async function buildFinalizeResolutionTransaction(params: {
  marketPda: string;
  callerWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const callerPubkey = new PublicKey(params.callerWallet);
  const disputeMetaPda = deriveDisputeMetaPda(marketPubkey);

  const data = DISCRIMINATORS.finalize_resolution;

  const keys = [
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: disputeMetaPda, isSigner: false, isWritable: true },
    { pubkey: callerPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
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
// RACE MARKET RESOLUTION
// =============================================================================

/**
 * Build propose_race_resolution transaction
 * IDL Accounts: config, race_market, dispute_meta, resolver, system_program
 */
export async function buildProposeRaceResolutionTransaction(params: {
  raceMarketPda: string;
  winningOutcomeIndex: number;
  proposerWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const proposerPubkey = new PublicKey(params.proposerWallet);
  const disputeMetaPda = deriveDisputeMetaPda(raceMarketPubkey);

  const data = Buffer.alloc(9);
  DISCRIMINATORS.propose_race_resolution.copy(data, 0);
  data.writeUInt8(params.winningOutcomeIndex, 8);

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: true },
    { pubkey: disputeMetaPda, isSigner: false, isWritable: true },
    { pubkey: proposerPubkey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = proposerPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build resolve_race transaction (direct resolve by creator)
 * IDL Accounts: config, race_market, authority
 */
export async function buildResolveRaceTransaction(params: {
  raceMarketPda: string;
  winningOutcomeIndex: number;
  resolverWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const resolverPubkey = new PublicKey(params.resolverWallet);

  const data = Buffer.alloc(9);
  DISCRIMINATORS.resolve_race.copy(data, 0);
  data.writeUInt8(params.winningOutcomeIndex, 8);

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: true },
    { pubkey: resolverPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = resolverPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build finalize_race_resolution transaction
 * IDL Accounts: race_market, dispute_meta, finalizer
 */
export async function buildFinalizeRaceResolutionTransaction(params: {
  raceMarketPda: string;
  callerWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const callerPubkey = new PublicKey(params.callerWallet);
  const disputeMetaPda = deriveDisputeMetaPda(raceMarketPubkey);

  const data = DISCRIMINATORS.finalize_race_resolution;

  const keys = [
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: true },
    { pubkey: disputeMetaPda, isSigner: false, isWritable: true },
    { pubkey: callerPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = callerPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}
