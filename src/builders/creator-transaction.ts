/**
 * Creator Profile Transaction Builders
 *
 * Builds unsigned transactions for:
 * - Creating creator profiles
 * - Updating creator profiles
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
  RPC_ENDPOINT,
  SEEDS,
} from '../config.js';

// =============================================================================
// DISCRIMINATORS
// =============================================================================

const DISCRIMINATORS = {
  create_creator_profile: Buffer.from([139, 244, 127, 145, 95, 172, 140, 154]),
  update_creator_profile: Buffer.from([8, 240, 162, 55, 110, 46, 177, 108]),
  claim_creator_sol: Buffer.from([21, 25, 164, 47, 81, 156, 199, 103]),
};

// =============================================================================
// PDA DERIVATION
// =============================================================================

function deriveCreatorProfilePda(creator: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('creator_profile'), creator.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// =============================================================================
// CREATOR PROFILE OPERATIONS
// =============================================================================

/**
 * Build create_creator_profile transaction
 * Creates an on-chain creator profile for reputation and fee settings
 */
export async function buildCreateCreatorProfileTransaction(params: {
  displayName: string;
  creatorFeeBps: number; // Basis points (e.g., 50 = 0.5%)
  creatorWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string; creatorProfilePda: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const creatorPubkey = new PublicKey(params.creatorWallet);
  const creatorProfilePda = deriveCreatorProfilePda(creatorPubkey);

  // Validate display name (max 32 chars)
  const displayNameBytes = Buffer.from(params.displayName, 'utf8');
  if (displayNameBytes.length > 32) {
    throw new Error('Display name must be 32 bytes or less');
  }

  // Validate fee (max 50 bps = 0.5%)
  if (params.creatorFeeBps > 50) {
    throw new Error('Creator fee cannot exceed 50 bps (0.5%)');
  }

  // Instruction data: discriminator + display_name (String) + creator_fee_bps (u16)
  const nameLen = displayNameBytes.length;
  const data = Buffer.alloc(8 + 4 + nameLen + 2);
  DISCRIMINATORS.create_creator_profile.copy(data, 0);
  data.writeUInt32LE(nameLen, 8);
  displayNameBytes.copy(data, 12);
  data.writeUInt16LE(params.creatorFeeBps, 12 + nameLen);

  // IDL Accounts: creator_profile, owner, system_program (NO config!)
  const keys = [
    { pubkey: creatorProfilePda, isSigner: false, isWritable: true },
    { pubkey: creatorPubkey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = creatorPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    creatorProfilePda: creatorProfilePda.toBase58(),
  };
}

/**
 * Build update_creator_profile transaction
 * Updates display name and fee settings (both required per IDL)
 * IDL Accounts: creator_profile, owner (NO config!)
 */
export async function buildUpdateCreatorProfileTransaction(params: {
  displayName: string;
  defaultFeeBps: number;
  creatorWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const creatorPubkey = new PublicKey(params.creatorWallet);
  const creatorProfilePda = deriveCreatorProfilePda(creatorPubkey);

  // Validate display name (max 32 chars)
  const displayNameBytes = Buffer.from(params.displayName, 'utf8');
  if (displayNameBytes.length > 32) {
    throw new Error('Display name must be 32 bytes or less');
  }

  // Validate fee (max 50 bps = 0.5%)
  if (params.defaultFeeBps > 50) {
    throw new Error('Creator fee cannot exceed 50 bps (0.5%)');
  }

  // Instruction data: discriminator + display_name (String) + default_fee_bps (u16)
  // Both are REQUIRED per IDL (not Option<T>)
  const nameLen = displayNameBytes.length;
  const data = Buffer.alloc(8 + 4 + nameLen + 2);
  DISCRIMINATORS.update_creator_profile.copy(data, 0);
  data.writeUInt32LE(nameLen, 8);
  displayNameBytes.copy(data, 12);
  data.writeUInt16LE(params.defaultFeeBps, 12 + nameLen);

  // IDL Accounts: creator_profile, owner (NO config!)
  const keys = [
    { pubkey: creatorProfilePda, isSigner: false, isWritable: true },
    { pubkey: creatorPubkey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });

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
 * Build claim_creator_sol transaction
 * Claims accumulated creator fees from sol_treasury
 * IDL Accounts: config, creator_profile, sol_treasury, owner, system_program
 */
export async function buildClaimCreatorTransaction(params: {
  creatorWallet: string;
  connection?: Connection;
}): Promise<{ transaction: Transaction; serializedTx: string }> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const creatorPubkey = new PublicKey(params.creatorWallet);
  const creatorProfilePda = deriveCreatorProfilePda(creatorPubkey);

  const data = DISCRIMINATORS.claim_creator_sol;

  // IDL Accounts: config, creator_profile, sol_treasury, owner, system_program
  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: creatorProfilePda, isSigner: false, isWritable: true },
    { pubkey: SOL_TREASURY_PDA, isSigner: false, isWritable: true },
    { pubkey: creatorPubkey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = creatorPubkey;

  return {
    transaction,
    serializedTx: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  };
}
