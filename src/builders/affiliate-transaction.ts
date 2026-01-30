/**
 * Affiliate Transaction Builders
 *
 * Builds unsigned transactions for:
 * - Registering as an affiliate
 * - Toggling affiliate active status
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
} from '../config.js';

// =============================================================================
// INSTRUCTION DISCRIMINATORS
// =============================================================================

// Correct discriminators: sha256("global:<instruction_name>")[0..8]
const REGISTER_AFFILIATE_DISCRIMINATOR = Buffer.from([87, 121, 99, 184, 126, 63, 103, 217]);
const TOGGLE_AFFILIATE_DISCRIMINATOR = Buffer.from([47, 161, 133, 19, 172, 44, 43, 194]);

// =============================================================================
// TYPES
// =============================================================================

export interface RegisterAffiliateResult {
  transaction: Transaction;
  serializedTx: string;
  affiliatePda: string;
  code: string;
}

// =============================================================================
// REGISTER AFFILIATE
// =============================================================================

/**
 * Build register_affiliate transaction
 *
 * Registers a new affiliate with a unique code.
 * The code must be 3-16 alphanumeric characters.
 */
export async function buildRegisterAffiliateTransaction(params: {
  code: string;
  userWallet: string;
  connection?: Connection;
}): Promise<RegisterAffiliateResult> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const userPubkey = new PublicKey(params.userWallet);

  // Validate code
  if (!isValidCode(params.code)) {
    throw new Error('Invalid affiliate code. Must be 3-16 alphanumeric characters.');
  }

  // Derive affiliate PDA
  const [affiliatePda] = PublicKey.findProgramAddressSync(
    [SEEDS.AFFILIATE, Buffer.from(params.code)],
    PROGRAM_ID
  );

  // Instruction data: discriminator + code (as string)
  // String encoding: 4-byte length prefix + UTF-8 bytes
  const codeBytes = Buffer.from(params.code, 'utf8');
  const data = Buffer.alloc(8 + 4 + codeBytes.length);
  REGISTER_AFFILIATE_DISCRIMINATOR.copy(data, 0);
  data.writeUInt32LE(codeBytes.length, 8);
  codeBytes.copy(data, 12);

  // Accounts for register_affiliate:
  // config, affiliate, owner, system_program
  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: affiliatePda, isSigner: false, isWritable: true },
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
    affiliatePda: affiliatePda.toBase58(),
    code: params.code,
  };
}

// =============================================================================
// TOGGLE AFFILIATE
// =============================================================================

/**
 * Build toggle_affiliate transaction
 *
 * Toggles an affiliate's active status (active/inactive).
 */
export async function buildToggleAffiliateTransaction(params: {
  code: string;
  active: boolean;
  userWallet: string;
  connection?: Connection;
}): Promise<{
  transaction: Transaction;
  serializedTx: string;
  affiliatePda: string;
  newStatus: boolean;
}> {
  const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
  const userPubkey = new PublicKey(params.userWallet);

  // Derive affiliate PDA
  const [affiliatePda] = PublicKey.findProgramAddressSync(
    [SEEDS.AFFILIATE, Buffer.from(params.code)],
    PROGRAM_ID
  );

  // Instruction data: discriminator + is_active (bool)
  const data = Buffer.alloc(9);
  TOGGLE_AFFILIATE_DISCRIMINATOR.copy(data, 0);
  data.writeUInt8(params.active ? 1 : 0, 8);

  // Accounts for toggle_affiliate:
  // config, affiliate, owner
  const keys = [
    { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
    { pubkey: affiliatePda, isSigner: false, isWritable: true },
    { pubkey: userPubkey, isSigner: true, isWritable: false },
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
    affiliatePda: affiliatePda.toBase58(),
    newStatus: params.active,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function isValidCode(code: string): boolean {
  if (code.length < 3 || code.length > 16) return false;
  return /^[a-zA-Z0-9_]+$/.test(code);
}
