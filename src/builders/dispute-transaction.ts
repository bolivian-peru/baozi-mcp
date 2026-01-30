/**
 * Dispute Transaction Builders
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
  flag_dispute: Buffer.from([150, 222, 78, 72, 117, 140, 2, 75]),
  flag_race_dispute: Buffer.from([154, 160, 110, 29, 65, 3, 77, 7]),
  vote_council: Buffer.from([252, 167, 165, 182, 221, 242, 174, 249]),
  vote_council_race: Buffer.from([79, 176, 145, 193, 225, 24, 183, 234]),
  change_council_vote: Buffer.from([70, 96, 72, 253, 134, 120, 254, 76]),
  change_council_vote_race: Buffer.from([54, 185, 210, 126, 40, 252, 146, 6]),
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

function deriveCouncilVotePda(marketPda: PublicKey, voter: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('council_vote'), marketPda.toBuffer(), voter.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

function deriveRaceVoteRecordPda(raceMarketPda: PublicKey, voter: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('race_council_vote'), raceMarketPda.toBuffer(), voter.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// =============================================================================
// BOOLEAN MARKET DISPUTES
// =============================================================================

/**
 * Build flag_dispute transaction
 * IDL Accounts: config, market, dispute_meta, authority
 */
export async function buildFlagDisputeTransaction(params: {
  marketPda: string;
  disputerWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const disputerPubkey = new PublicKey(params.disputerWallet);
  const disputeMetaPda = deriveDisputeMetaPda(marketPubkey);

  const data = DISCRIMINATORS.flag_dispute;

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: disputeMetaPda, isSigner: false, isWritable: true },
    { pubkey: disputerPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = disputerPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build vote_council transaction
 * IDL Accounts: config, market, council_vote, dispute_meta, voter, system_program
 */
export async function buildVoteCouncilTransaction(params: {
  marketPda: string;
  voteYes: boolean;
  voterWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const voterPubkey = new PublicKey(params.voterWallet);
  const councilVotePda = deriveCouncilVotePda(marketPubkey, voterPubkey);
  const disputeMetaPda = deriveDisputeMetaPda(marketPubkey);

  // Instruction data: discriminator + vote (bool)
  const data = Buffer.alloc(9);
  DISCRIMINATORS.vote_council.copy(data, 0);
  data.writeUInt8(params.voteYes ? 1 : 0, 8);

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: councilVotePda, isSigner: false, isWritable: true },
    { pubkey: disputeMetaPda, isSigner: false, isWritable: true },
    { pubkey: voterPubkey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = voterPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build change_council_vote transaction
 * IDL Accounts: config, market, council_vote, dispute_meta, voter
 */
export async function buildChangeCouncilVoteTransaction(params: {
  marketPda: string;
  newVoteYes: boolean;
  voterWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const marketPubkey = new PublicKey(params.marketPda);
  const voterPubkey = new PublicKey(params.voterWallet);
  const councilVotePda = deriveCouncilVotePda(marketPubkey, voterPubkey);
  const disputeMetaPda = deriveDisputeMetaPda(marketPubkey);

  const data = Buffer.alloc(9);
  DISCRIMINATORS.change_council_vote.copy(data, 0);
  data.writeUInt8(params.newVoteYes ? 1 : 0, 8);

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: councilVotePda, isSigner: false, isWritable: true },
    { pubkey: disputeMetaPda, isSigner: false, isWritable: true },
    { pubkey: voterPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = voterPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

// =============================================================================
// RACE MARKET DISPUTES
// =============================================================================

/**
 * Build flag_race_dispute transaction
 * IDL Accounts: config, race_market, dispute_meta, authority
 */
export async function buildFlagRaceDisputeTransaction(params: {
  raceMarketPda: string;
  disputerWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const disputerPubkey = new PublicKey(params.disputerWallet);
  const disputeMetaPda = deriveDisputeMetaPda(raceMarketPubkey);

  const data = DISCRIMINATORS.flag_race_dispute;

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: true },
    { pubkey: disputeMetaPda, isSigner: false, isWritable: true },
    { pubkey: disputerPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = disputerPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build vote_council_race transaction
 * IDL Accounts: config, race_market, vote_record, dispute_meta, voter, system_program
 */
export async function buildVoteCouncilRaceTransaction(params: {
  raceMarketPda: string;
  voteOutcomeIndex: number;
  voterWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const voterPubkey = new PublicKey(params.voterWallet);
  const voteRecordPda = deriveRaceVoteRecordPda(raceMarketPubkey, voterPubkey);
  const disputeMetaPda = deriveDisputeMetaPda(raceMarketPubkey);

  // Instruction data: discriminator + outcome_index (u8)
  const data = Buffer.alloc(9);
  DISCRIMINATORS.vote_council_race.copy(data, 0);
  data.writeUInt8(params.voteOutcomeIndex, 8);

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: true },
    { pubkey: voteRecordPda, isSigner: false, isWritable: true },
    { pubkey: disputeMetaPda, isSigner: false, isWritable: true },
    { pubkey: voterPubkey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = voterPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}

/**
 * Build change_council_vote_race transaction
 */
export async function buildChangeCouncilVoteRaceTransaction(params: {
  raceMarketPda: string;
  newVoteOutcomeIndex: number;
  voterWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const raceMarketPubkey = new PublicKey(params.raceMarketPda);
  const voterPubkey = new PublicKey(params.voterWallet);
  const voteRecordPda = deriveRaceVoteRecordPda(raceMarketPubkey, voterPubkey);
  const disputeMetaPda = deriveDisputeMetaPda(raceMarketPubkey);

  const data = Buffer.alloc(9);
  DISCRIMINATORS.change_council_vote_race.copy(data, 0);
  data.writeUInt8(params.newVoteOutcomeIndex, 8);

  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: raceMarketPubkey, isSigner: false, isWritable: true },
    { pubkey: voteRecordPda, isSigner: false, isWritable: true },
    { pubkey: disputeMetaPda, isSigner: false, isWritable: true },
    { pubkey: voterPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = voterPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}
