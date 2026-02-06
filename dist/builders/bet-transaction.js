/**
 * Bet Transaction Builder
 *
 * Builds unsigned transactions for placing bets on Baozi markets.
 * Agent builds, user signs. No private keys in agent.
 */
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, } from '@solana/web3.js';
import { PROGRAM_ID, CONFIG_PDA, SEEDS, RPC_ENDPOINT, solToLamports, } from '../config.js';
// =============================================================================
// INSTRUCTION DISCRIMINATORS
// =============================================================================
// place_bet_sol discriminator: [137, 137, 247, 253, 233, 243, 48, 170]
const PLACE_BET_SOL_DISCRIMINATOR = Buffer.from([137, 137, 247, 253, 233, 243, 48, 170]);
// place_bet_sol_with_affiliate discriminator: [197, 186, 187, 145, 252, 239, 101, 96]
const PLACE_BET_SOL_WITH_AFFILIATE_DISCRIMINATOR = Buffer.from([197, 186, 187, 145, 252, 239, 101, 96]);
// =============================================================================
// PDA DERIVATION
// =============================================================================
/**
 * Derive position PDA from market ID and user
 */
function derivePositionPda(marketId, user) {
    const marketIdBuffer = Buffer.alloc(8);
    marketIdBuffer.writeBigUInt64LE(marketId);
    const [pda] = PublicKey.findProgramAddressSync([SEEDS.POSITION, marketIdBuffer, user.toBuffer()], PROGRAM_ID);
    return pda;
}
/**
 * Derive whitelist PDA from market ID
 */
function deriveWhitelistPda(marketId) {
    const marketIdBuffer = Buffer.alloc(8);
    marketIdBuffer.writeBigUInt64LE(marketId);
    const [pda] = PublicKey.findProgramAddressSync([SEEDS.WHITELIST, marketIdBuffer], PROGRAM_ID);
    return pda;
}
/**
 * Derive referred user PDA
 */
function deriveReferredUserPda(user) {
    const [pda] = PublicKey.findProgramAddressSync([Buffer.from('referred'), user.toBuffer()], PROGRAM_ID);
    return pda;
}
// =============================================================================
// INSTRUCTION BUILDERS
// =============================================================================
/**
 * Create place_bet_sol instruction
 */
function createPlaceBetSolInstruction(params) {
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
    keys.push({ pubkey: params.user, isSigner: true, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false });
    return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys,
        data,
    });
}
/**
 * Create place_bet_sol_with_affiliate instruction
 */
function createPlaceBetSolWithAffiliateInstruction(params) {
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
    keys.push({ pubkey: params.user, isSigner: true, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false });
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
export async function buildBetTransaction(params, connection) {
    const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');
    // Derive PDAs
    const positionPda = derivePositionPda(params.marketId, params.userWallet);
    const whitelistPda = params.whitelistRequired
        ? deriveWhitelistPda(params.marketId)
        : null;
    // Convert amount to lamports
    const amountLamports = solToLamports(params.amountSol);
    // Create instruction
    let instruction;
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
    }
    else {
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
export async function simulateBetTransaction(transaction, userWallet, connection) {
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
    }
    catch (err) {
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
export function extractMarketIdFromData(data) {
    // market_id is at offset 8 (right after discriminator)
    return data.readBigUInt64LE(8);
}
/**
 * Extract layer and access_gate from market data to determine if whitelist is needed
 * Returns { layer, accessGate }
 *
 * Layer values: 0 = Official, 1 = Lab, 2 = Private
 * AccessGate values: 0 = Public, 1 = Whitelist, 2 = InviteHash
 *
 * IMPORTANT: Only Private markets (layer=2) can have whitelist.
 * Lab and Official markets are ALWAYS public.
 */
export function extractMarketAccessInfo(data) {
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
    // layer (enum, 1 byte) - 0=Official, 1=Lab, 2=Private
    const layer = data.readUInt8(offset);
    offset += 1;
    // resolution_mode (enum, 1 byte)
    offset += 1;
    // access_gate (enum, 1 byte) - 0=Public, 1=Whitelist, 2=InviteHash
    const accessGate = data.readUInt8(offset);
    return { layer, accessGate };
}
/**
 * Determine if whitelist is required for betting
 * ONLY Private markets (layer=2) with AccessGate::Whitelist need whitelist
 * Lab (layer=1) and Official (layer=0) markets are ALWAYS public
 */
export function isWhitelistRequired(data) {
    const { layer, accessGate } = extractMarketAccessInfo(data);
    // Only Private markets (layer=2) can have whitelist
    // Lab (1) and Official (0) are ALWAYS public regardless of access_gate
    if (layer !== 2) {
        return false;
    }
    // For Private markets, check if access_gate is Whitelist (1)
    return accessGate === 1;
}
// Keep old function for backwards compatibility but use new logic
export function extractAccessGateFromData(data) {
    const { accessGate } = extractMarketAccessInfo(data);
    return accessGate;
}
// =============================================================================
// HELPER: FETCH MARKET AND BUILD
// =============================================================================
/**
 * Fetch market data and build bet transaction
 * Convenience function that handles market fetching and market_id extraction
 */
export async function fetchAndBuildBetTransaction(params) {
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
        // Check if whitelist is required (only for Private markets with Whitelist access_gate)
        // Lab and Official markets are ALWAYS public - never need whitelist
        const whitelistRequired = isWhitelistRequired(data);
        // Build affiliate PDAs if provided
        let affiliatePda;
        let affiliateOwner;
        if (params.affiliatePda && params.affiliateOwner) {
            affiliatePda = new PublicKey(params.affiliatePda);
            affiliateOwner = new PublicKey(params.affiliateOwner);
        }
        // Build the transaction
        const result = await buildBetTransaction({
            marketPda: marketPubkey,
            marketId,
            userWallet: userPubkey,
            outcome: params.outcome,
            amountSol: params.amountSol,
            affiliatePda,
            affiliateOwner,
            whitelistRequired,
        }, conn);
        return {
            transaction: result,
            marketId,
        };
    }
    catch (err) {
        return {
            transaction: null,
            marketId: 0n,
            error: err instanceof Error ? err.message : 'Unknown error',
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmV0LXRyYW5zYWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2J1aWxkZXJzL2JldC10cmFuc2FjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7R0FLRztBQUNILE9BQU8sRUFDTCxVQUFVLEVBQ1YsU0FBUyxFQUNULFdBQVcsRUFDWCxzQkFBc0IsRUFDdEIsYUFBYSxHQUNkLE1BQU0saUJBQWlCLENBQUM7QUFDekIsT0FBTyxFQUNMLFVBQVUsRUFDVixVQUFVLEVBQ1YsS0FBSyxFQUNMLFlBQVksRUFDWixhQUFhLEdBQ2QsTUFBTSxjQUFjLENBQUM7QUFFdEIsZ0ZBQWdGO0FBQ2hGLDZCQUE2QjtBQUM3QixnRkFBZ0Y7QUFFaEYsdUVBQXVFO0FBQ3ZFLE1BQU0sMkJBQTJCLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRXpGLHNGQUFzRjtBQUN0RixNQUFNLDBDQUEwQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQXVCeEcsZ0ZBQWdGO0FBQ2hGLGlCQUFpQjtBQUNqQixnRkFBZ0Y7QUFFaEY7O0dBRUc7QUFDSCxTQUFTLGlCQUFpQixDQUFDLFFBQWdCLEVBQUUsSUFBZTtJQUMxRCxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMxQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLHNCQUFzQixDQUM1QyxDQUFD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VUFBVSxFQUFFLFVBQVU7WUFDdEIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO1lBQ3ZCLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztZQUMzQixZQUFZO1lBQ1osY0FBYztZQUNkLGlCQUFpQjtTQUNsQixFQUNELElBQUksQ0FDTCxDQUFDO1FBRUYsT0FBTztZQUNMLFdBQVcsRUFBRSxNQUFNO1lBQ25CLFFBQVE7U0FDVCxDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixPQUFPO1lBQ0wsV0FBVyxFQUFFLElBQUk7WUFDakIsUUFBUSxFQUFFLEVBQUU7WUFDWixLQUFLLEVBQUUsR0FBRyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTtTQUM1RCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEJldCBUcmFuc2FjdGlvbiBCdWlsZGVyXG4gKlxuICogQnVpbGRzIHVuc2lnbmVkIHRyYW5zYWN0aW9ucyBmb3IgcGxhY2luZyBiZXRzIG9uIEJhb3ppIG1hcmtldHMuXG4gKiBBZ2VudCBidWlsZHMsIHVzZXIgc2lnbnMuIE5vIHByaXZhdGUga2V5cyBpbiBhZ2VudC5cbiAqL1xuaW1wb3J0IHtcbiAgQ29ubmVjdGlvbixcbiAgUHVibGljS2V5LFxuICBUcmFuc2FjdGlvbixcbiAgVHJhbnNhY3Rpb25JbnN0cnVjdGlvbixcbiAgU3lzdGVtUHJvZ3JhbSxcbn0gZnJvbSAnQHNvbGFuYS93ZWIzLmpzJztcbmltcG9ydCB7XG4gIFBST0dSQU1fSUQsXG4gIENPTkZJR19QREEsXG4gIFNFRURTLFxuICBSUENfRU5EUE9JTlQsXG4gIHNvbFRvTGFtcG9ydHMsXG59IGZyb20gJy4uL2NvbmZpZy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJTlNUUlVDVElPTiBESVNDUklNSU5BVE9SU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLy8gcGxhY2VfYmV0X3NvbCBkaXNjcmltaW5hdG9yOiBbMTM3LCAxMzcsIDI0NywgMjUzLCAyMzMsIDI0MywgNDgsIDE3MF1cbmNvbnN0IFBMQUNFX0JFVF9TT0xfRElTQ1JJTUlOQVRPUiA9IEJ1ZmZlci5mcm9tKFsxMzcsIDEzNywgMjQ3LCAyNTMsIDIzMywgMjQzLCA0OCwgMTcwXSk7XG5cbi8vIHBsYWNlX2JldF9zb2xfd2l0aF9hZmZpbGlhdGUgZGlzY3JpbWluYXRvcjogWzE5NywgMTg2LCAxODcsIDE0NSwgMjUyLCAyMzksIDEwMSwgOTZdXG5jb25zdCBQTEFDRV9CRVRfU09MX1dJVEhfQUZGSUxJQVRFX0RJU0NSSU1JTkFUT1IgPSBCdWZmZXIuZnJvbShbMTk3LCAxODYsIDE4NywgMTQ1LCAyNTIsIDIzOSwgMTAxLCA5Nl0pO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVFlQRVNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnVpbGRCZXRUcmFuc2FjdGlvblBhcmFtcyB7XG4gIG1hcmtldFBkYTogUHVibGljS2V5O1xuICBtYXJrZXRJZDogYmlnaW50O1xuICB1c2VyV2FsbGV0OiBQdWJsaWNLZXk7XG4gIG91dGNvbWU6ICd5ZXMnIHwgJ25vJztcbiAgYW1vdW50U29sOiBudW1iZXI7XG4gIGFmZmlsaWF0ZVBkYT86IFB1YmxpY0tleTtcbiAgYWZmaWxpYXRlT3duZXI/OiBQdWJsaWNLZXk7XG4gIHdoaXRlbGlzdFJlcXVpcmVkPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCdWlsZEJldFRyYW5zYWN0aW9uUmVzdWx0IHtcbiAgdHJhbnNhY3Rpb246IFRyYW5zYWN0aW9uO1xuICBwb3NpdGlvblBkYTogUHVibGljS2V5O1xuICBzZXJpYWxpemVkVHg6IHN0cmluZztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFBEQSBERVJJVkFUSU9OXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIERlcml2ZSBwb3NpdGlvbiBQREEgZnJvbSBtYXJrZXQgSUQgYW5kIHVzZXJcbiAqL1xuZnVuY3Rpb24gZGVyaXZlUG9zaXRpb25QZGEobWFya2V0SWQ6IGJpZ2ludCwgdXNlcjogUHVibGljS2V5KTogUHVibGljS2V5IHtcbiAgY29uc3QgbWFya2V0SWRCdWZmZXIgPSBCdWZmZXIuYWxsb2MoOCk7XG4gIG1hcmtldElkQnVmZmVyLndyaXRlQmlnVUludDY0TEUobWFya2V0SWQpO1xuICBjb25zdCBbcGRhXSA9IFB1YmxpY0tleS5maW5kUHJvZ3JhbUFkZHJlc3NTeW5jKFxuICAgIFtTRUVEUy5QT1NJVElPTiwgbWFya2V0SWRCdWZmZXIsIHVzZXIudG9CdWZmZXIoKV0sXG4gICAgUFJPR1JBTV9JRFxuICApO1xuICByZXR1cm4gcGRhO1xufVxuXG4vKipcbiAqIERlcml2ZSB3aGl0ZWxpc3QgUERBIGZyb20gbWFya2V0IElEXG4gKi9cbmZ1bmN0aW9uIGRlcml2ZVdoaXRlbGlzdFBkYShtYXJrZXRJZDogYmlnaW50KTogUHVibGljS2V5IHtcbiAgY29uc3QgbWFya2V0SWRCdWZmZXIgPSBCdWZmZXIuYWxsb2MoOCk7XG4gIG1hcmtldElkQnVmZmVyLndyaXRlQmlnVUludDY0TEUobWFya2V0SWQpO1xuICBjb25zdCBbcGRhXSA9IFB1YmxpY0tleS5maW5kUHJvZ3JhbUFkZHJlc3NTeW5jKFxuICAgIFtTRUVEUy5XSElURUxJU1QsIG1hcmtldElkQnVmZmVyXSxcbiAgICBQUk9HUkFNX0lEXG4gICk7XG4gIHJldHVybiBwZGE7XG59XG5cbi8qKlxuICogRGVyaXZlIHJlZmVycmVkIHVzZXIgUERBXG4gKi9cbmZ1bmN0aW9uIGRlcml2ZVJlZmVycmVkVXNlclBkYSh1c2VyOiBQdWJsaWNLZXkpOiBQdWJsaWNLZXkge1xuICBjb25zdCBbcGRhXSA9IFB1YmxpY0tleS5maW5kUHJvZ3JhbUFkZHJlc3NTeW5jKFxuICAgIFtCdWZmZXIuZnJvbSgncmVmZXJyZWQnKSwgdXNlci50b0J1ZmZlcigpXSxcbiAgICBQUk9HUkFNX0lEXG4gICk7XG4gIHJldHVybiBwZGE7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJTlNUUlVDVElPTiBCVUlMREVSU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDcmVhdGUgcGxhY2VfYmV0X3NvbCBpbnN0cnVjdGlvblxuICovXG5mdW5jdGlvbiBjcmVhdGVQbGFjZUJldFNvbEluc3RydWN0aW9uKHBhcmFtczoge1xuICBjb25maWc6IFB1YmxpY0tleTtcbiAgbWFya2V0OiBQdWJsaWNLZXk7XG4gIHBvc2l0aW9uOiBQdWJsaWNLZXk7XG4gIHdoaXRlbGlzdDogUHVibGljS2V5IHwgbnVsbDtcbiAgdXNlcjogUHVibGljS2V5O1xuICBvdXRjb21lOiBib29sZWFuO1xuICBhbW91bnQ6IGJpZ2ludDtcbn0pOiBUcmFuc2FjdGlvbkluc3RydWN0aW9uIHtcbiAgLy8gU2VyaWFsaXplIGluc3RydWN0aW9uIGRhdGFcbiAgLy8gW2Rpc2NyaW1pbmF0b3IoOCldIFtvdXRjb21lKDEpXSBbYW1vdW50KDgpXVxuICBjb25zdCBkYXRhID0gQnVmZmVyLmFsbG9jKDE3KTtcbiAgUExBQ0VfQkVUX1NPTF9ESVNDUklNSU5BVE9SLmNvcHkoZGF0YSwgMCk7XG4gIGRhdGEud3JpdGVVSW50OChwYXJhbXMub3V0Y29tZSA/IDEgOiAwLCA4KTtcbiAgZGF0YS53cml0ZUJpZ1VJbnQ2NExFKHBhcmFtcy5hbW91bnQsIDkpO1xuXG4gIGNvbnN0IGtleXMgPSBbXG4gICAgeyBwdWJrZXk6IHBhcmFtcy5jb25maWcsIGlzU2lnbmVyOiBmYWxzZSwgaXNXcml0YWJsZTogZmFsc2UgfSxcbiAgICB7IHB1YmtleTogcGFyYW1zLm1hcmtldCwgaXNTaWduZXI6IGZhbHNlLCBpc1dyaXRhYmxlOiB0cnVlIH0sXG4gICAgeyBwdWJrZXk6IHBhcmFtcy5wb3NpdGlvbiwgaXNTaWduZXI6IGZhbHNlLCBpc1dyaXRhYmxlOiB0cnVlIH0sXG4gIF07XG5cbiAgLy8gQWRkIG9wdGlvbmFsIHdoaXRlbGlzdFxuICBpZiAocGFyYW1zLndoaXRlbGlzdCkge1xuICAgIGtleXMucHVzaCh7IHB1YmtleTogcGFyYW1zLndoaXRlbGlzdCwgaXNTaWduZXI6IGZhbHNlLCBpc1dyaXRhYmxlOiBmYWxzZSB9KTtcbiAgfVxuXG4gIGtleXMucHVzaChcbiAgICB7IHB1YmtleTogcGFyYW1zLnVzZXIsIGlzU2lnbmVyOiB0cnVlLCBpc1dyaXRhYmxlOiB0cnVlIH0sXG4gICAgeyBwdWJrZXk6IFN5c3RlbVByb2dyYW0ucHJvZ3JhbUlkLCBpc1NpZ25lcjogZmFsc2UsIGlzV3JpdGFibGU6IGZhbHNlIH1cbiAgKTtcblxuICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uSW5zdHJ1Y3Rpb24oe1xuICAgIHByb2dyYW1JZDogUFJPR1JBTV9JRCxcbiAgICBrZXlzLFxuICAgIGRhdGEsXG4gIH0pO1xufVxuXG4vKipcbiAqIENyZWF0ZSBwbGFjZV9iZXRfc29sX3dpdGhfYWZmaWxpYXRlIGluc3RydWN0aW9uXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBsYWNlQmV0U29sV2l0aEFmZmlsaWF0ZUluc3RydWN0aW9uKHBhcmFtczoge1xuICBjb25maWc6IFB1YmxpY0tleTtcbiAgbWFya2V0OiBQdWJsaWNLZXk7XG4gIHBvc2l0aW9uOiBQdWJsaWNLZXk7XG4gIGFmZmlsaWF0ZTogUHVibGljS2V5O1xuICByZWZlcnJlZFVzZXI6IFB1YmxpY0tleTtcbiAgd2hpdGVsaXN0OiBQdWJsaWNLZXkgfCBudWxsO1xuICB1c2VyOiBQdWJsaWNLZXk7XG4gIG91dGNvbWU6IGJvb2xlYW47XG4gIGFtb3VudDogYmlnaW50O1xufSk6IFRyYW5zYWN0aW9uSW5zdHJ1Y3Rpb24ge1xuICAvLyBTZXJpYWxpemUgaW5zdHJ1Y3Rpb24gZGF0YVxuICAvLyBbZGlzY3JpbWluYXRvcig4KV0gW291dGNvbWUoMSldIFthbW91bnQoOCldXG4gIGNvbnN0IGRhdGEgPSBCdWZmZXIuYWxsb2MoMTcpO1xuICBQTEFDRV9CRVRfU09MX1dJVEhfQUZGSUxJQVRFX0RJU0NSSU1JTkFUT1IuY29weShkYXRhLCAwKTtcbiAgZGF0YS53cml0ZVVJbnQ4KHBhcmFtcy5vdXRjb21lID8gMSA6IDAsIDgpO1xuICBkYXRhLndyaXRlQmlnVUludDY0TEUocGFyYW1zLmFtb3VudCwgOSk7XG5cbiAgY29uc3Qga2V5cyA9IFtcbiAgICB7IHB1YmtleTogcGFyYW1zLmNvbmZpZywgaXNTaWduZXI6IGZhbHNlLCBpc1dyaXRhYmxlOiBmYWxzZSB9LFxuICAgIHsgcHVia2V5OiBwYXJhbXMubWFya2V0LCBpc1NpZ25lcjogZmFsc2UsIGlzV3JpdGFibGU6IHRydWUgfSxcbiAgICB7IHB1YmtleTogcGFyYW1zLnBvc2l0aW9uLCBpc1NpZ25lcjogZmFsc2UsIGlzV3JpdGFibGU6IHRydWUgfSxcbiAgICB7IHB1YmtleTogcGFyYW1zLmFmZmlsaWF0ZSwgaXNTaWduZXI6IGZhbHNlLCBpc1dyaXRhYmxlOiB0cnVlIH0sXG4gICAgeyBwdWJrZXk6IHBhcmFtcy5yZWZlcnJlZFVzZXIsIGlzU2lnbmVyOiBmYWxzZSwgaXNXcml0YWJsZTogdHJ1ZSB9LFxuICBdO1xuXG4gIC8vIEFkZCBvcHRpb25hbCB3aGl0ZWxpc3RcbiAgaWYgKHBhcmFtcy53aGl0ZWxpc3QpIHtcbiAgICBrZXlzLnB1c2goeyBwdWJrZXk6IHBhcmFtcy53aGl0ZWxpc3QsIGlzU2lnbmVyOiBmYWxzZSwgaXNXcml0YWJsZTogZmFsc2UgfSk7XG4gIH1cblxuICBrZXlzLnB1c2goXG4gICAgeyBwdWJrZXk6IHBhcmFtcy51c2VyLCBpc1NpZ25lcjogdHJ1ZSwgaXNXcml0YWJsZTogdHJ1ZSB9LFxuICAgIHsgcHVia2V5OiBTeXN0ZW1Qcm9ncmFtLnByb2dyYW1JZCwgaXNTaWduZXI6IGZhbHNlLCBpc1dyaXRhYmxlOiBmYWxzZSB9XG4gICk7XG5cbiAgcmV0dXJuIG5ldyBUcmFuc2FjdGlvbkluc3RydWN0aW9uKHtcbiAgICBwcm9ncmFtSWQ6IFBST0dSQU1fSUQsXG4gICAga2V5cyxcbiAgICBkYXRhLFxuICB9KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE1BSU4gQlVJTERFUiBGVU5DVElPTlxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBCdWlsZCBhbiB1bnNpZ25lZCBiZXQgdHJhbnNhY3Rpb25cbiAqXG4gKiBAcGFyYW0gcGFyYW1zIC0gVHJhbnNhY3Rpb24gcGFyYW1ldGVyc1xuICogQHBhcmFtIGNvbm5lY3Rpb24gLSBPcHRpb25hbCBjb25uZWN0aW9uICh3aWxsIGNyZWF0ZSBpZiBub3QgcHJvdmlkZWQpXG4gKiBAcmV0dXJucyBVbnNpZ25lZCB0cmFuc2FjdGlvbiByZWFkeSBmb3IgdXNlciBzaWduaW5nXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBidWlsZEJldFRyYW5zYWN0aW9uKFxuICBwYXJhbXM6IEJ1aWxkQmV0VHJhbnNhY3Rpb25QYXJhbXMsXG4gIGNvbm5lY3Rpb24/OiBDb25uZWN0aW9uXG4pOiBQcm9taXNlPEJ1aWxkQmV0VHJhbnNhY3Rpb25SZXN1bHQ+IHtcbiAgY29uc3QgY29ubiA9IGNvbm5lY3Rpb24gfHwgbmV3IENvbm5lY3Rpb24oUlBDX0VORFBPSU5ULCAnY29uZmlybWVkJyk7XG5cbiAgLy8gRGVyaXZlIFBEQXNcbiAgY29uc3QgcG9zaXRpb25QZGEgPSBkZXJpdmVQb3NpdGlvblBkYShwYXJhbXMubWFya2V0SWQsIHBhcmFtcy51c2VyV2FsbGV0KTtcbiAgY29uc3Qgd2hpdGVsaXN0UGRhID0gcGFyYW1zLndoaXRlbGlzdFJlcXVpcmVkXG4gICAgPyBkZXJpdmVXaGl0ZWxpc3RQZGEocGFyYW1zLm1hcmtldElkKVxuICAgIDogbnVsbDtcblxuICAvLyBDb252ZXJ0IGFtb3VudCB0byBsYW1wb3J0c1xuICBjb25zdCBhbW91bnRMYW1wb3J0cyA9IHNvbFRvTGFtcG9ydHMocGFyYW1zLmFtb3VudFNvbCk7XG5cbiAgLy8gQ3JlYXRlIGluc3RydWN0aW9uXG4gIGxldCBpbnN0cnVjdGlvbjogVHJhbnNhY3Rpb25JbnN0cnVjdGlvbjtcblxuICBpZiAocGFyYW1zLmFmZmlsaWF0ZVBkYSAmJiBwYXJhbXMuYWZmaWxpYXRlT3duZXIpIHtcbiAgICBjb25zdCByZWZlcnJlZFVzZXJQZGEgPSBkZXJpdmVSZWZlcnJlZFVzZXJQZGEocGFyYW1zLnVzZXJXYWxsZXQpO1xuICAgIGluc3RydWN0aW9uID0gY3JlYXRlUGxhY2VCZXRTb2xXaXRoQWZmaWxpYXRlSW5zdHJ1Y3Rpb24oe1xuICAgICAgY29uZmlnOiBDT05GSUdfUERBLFxuICAgICAgbWFya2V0OiBwYXJhbXMubWFya2V0UGRhLFxuICAgICAgcG9zaXRpb246IHBvc2l0aW9uUGRhLFxuICAgICAgYWZmaWxpYXRlOiBwYXJhbXMuYWZmaWxpYXRlUGRhLFxuICAgICAgcmVmZXJyZWRVc2VyOiByZWZlcnJlZFVzZXJQZGEsXG4gICAgICB3aGl0ZWxpc3Q6IHdoaXRlbGlzdFBkYSxcbiAgICAgIHVzZXI6IHBhcmFtcy51c2VyV2FsbGV0LFxuICAgICAgb3V0Y29tZTogcGFyYW1zLm91dGNvbWUgPT09ICd5ZXMnLFxuICAgICAgYW1vdW50OiBhbW91bnRMYW1wb3J0cyxcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBpbnN0cnVjdGlvbiA9IGNyZWF0ZVBsYWNlQmV0U29sSW5zdHJ1Y3Rpb24oe1xuICAgICAgY29uZmlnOiBDT05GSUdfUERBLFxuICAgICAgbWFya2V0OiBwYXJhbXMubWFya2V0UGRhLFxuICAgICAgcG9zaXRpb246IHBvc2l0aW9uUGRhLFxuICAgICAgd2hpdGVsaXN0OiB3aGl0ZWxpc3RQZGEsXG4gICAgICB1c2VyOiBwYXJhbXMudXNlcldhbGxldCxcbiAgICAgIG91dGNvbWU6IHBhcmFtcy5vdXRjb21lID09PSAneWVzJyxcbiAgICAgIGFtb3VudDogYW1vdW50TGFtcG9ydHMsXG4gICAgfSk7XG4gIH1cblxuICAvLyBCdWlsZCB0cmFuc2FjdGlvblxuICBjb25zdCB0cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbigpO1xuICB0cmFuc2FjdGlvbi5hZGQoaW5zdHJ1Y3Rpb24pO1xuXG4gIC8vIEdldCByZWNlbnQgYmxvY2toYXNoXG4gIGNvbnN0IHsgYmxvY2toYXNoLCBsYXN0VmFsaWRCbG9ja0hlaWdodCB9ID0gYXdhaXQgY29ubi5nZXRMYXRlc3RCbG9ja2hhc2goJ2ZpbmFsaXplZCcpO1xuICB0cmFuc2FjdGlvbi5yZWNlbnRCbG9ja2hhc2ggPSBibG9ja2hhc2g7XG4gIHRyYW5zYWN0aW9uLmZlZVBheWVyID0gcGFyYW1zLnVzZXJXYWxsZXQ7XG5cbiAgLy8gU2VyaWFsaXplIHdpdGhvdXQgc2lnbmF0dXJlcyAocmV0dXJucyBCdWZmZXIpXG4gIGNvbnN0IHNlcmlhbGl6ZWRUeCA9IHRyYW5zYWN0aW9uLnNlcmlhbGl6ZSh7XG4gICAgcmVxdWlyZUFsbFNpZ25hdHVyZXM6IGZhbHNlLFxuICAgIHZlcmlmeVNpZ25hdHVyZXM6IGZhbHNlLFxuICB9KS50b1N0cmluZygnYmFzZTY0Jyk7XG5cbiAgcmV0dXJuIHtcbiAgICB0cmFuc2FjdGlvbixcbiAgICBwb3NpdGlvblBkYSxcbiAgICBzZXJpYWxpemVkVHgsXG4gIH07XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTSU1VTEFUSU9OXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFNpbXVsYXRlIGEgYmV0IHRyYW5zYWN0aW9uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzaW11bGF0ZUJldFRyYW5zYWN0aW9uKFxuICB0cmFuc2FjdGlvbjogVHJhbnNhY3Rpb24sXG4gIHVzZXJXYWxsZXQ6IFB1YmxpY0tleSxcbiAgY29ubmVjdGlvbj86IENvbm5lY3Rpb25cbik6IFByb21pc2U8e1xuICBzdWNjZXNzOiBib29sZWFuO1xuICBsb2dzOiBzdHJpbmdbXTtcbiAgdW5pdHNDb25zdW1lZD86IG51bWJlcjtcbiAgZXJyb3I/OiBzdHJpbmc7XG59PiB7XG4gIGNvbnN0IGNvbm4gPSBjb25uZWN0aW9uIHx8IG5ldyBDb25uZWN0aW9uKFJQQ19FTkRQT0lOVCwgJ2NvbmZpcm1lZCcpO1xuXG4gIHRyeSB7XG4gICAgLy8gVXNlIHRoZSBsZWdhY3kgc2ltdWxhdGlvbiBBUEkgZm9yIFRyYW5zYWN0aW9uIG9iamVjdHNcbiAgICBjb25zdCBzaW11bGF0aW9uID0gYXdhaXQgY29ubi5zaW11bGF0ZVRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uKTtcblxuICAgIGlmIChzaW11bGF0aW9uLnZhbHVlLmVycikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGxvZ3M6IHNpbXVsYXRpb24udmFsdWUubG9ncyB8fCBbXSxcbiAgICAgICAgdW5pdHNDb25zdW1lZDogc2ltdWxhdGlvbi52YWx1ZS51bml0c0NvbnN1bWVkLFxuICAgICAgICBlcnJvcjogSlNPTi5zdHJpbmdpZnkoc2ltdWxhdGlvbi52YWx1ZS5lcnIpLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIGxvZ3M6IHNpbXVsYXRpb24udmFsdWUubG9ncyB8fCBbXSxcbiAgICAgIHVuaXRzQ29uc3VtZWQ6IHNpbXVsYXRpb24udmFsdWUudW5pdHNDb25zdW1lZCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBsb2dzOiBbXSxcbiAgICAgIGVycm9yOiBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogJ1Vua25vd24gc2ltdWxhdGlvbiBlcnJvcicsXG4gICAgfTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTUFSS0VUIERBVEEgRVhUUkFDVElPTlxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFeHRyYWN0IG1hcmtldF9pZCBmcm9tIG1hcmtldCBhY2NvdW50IGRhdGFcbiAqIFY0LjcuNiBNYXJrZXQgc3RydWN0IGxheW91dDpcbiAqIC0gZGlzY3JpbWluYXRvciAoOCBieXRlcylcbiAqIC0gbWFya2V0X2lkICh1NjQsIDggYnl0ZXMpIDwtLSBGaXJzdCBmaWVsZCFcbiAqIC0gcXVlc3Rpb24gKHN0cmluZzogNCBieXRlIGxlbiArIGNvbnRlbnQpXG4gKiAtIC4uLnJlc3Qgb2YgZmllbGRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0TWFya2V0SWRGcm9tRGF0YShkYXRhOiBCdWZmZXIpOiBiaWdpbnQge1xuICAvLyBtYXJrZXRfaWQgaXMgYXQgb2Zmc2V0IDggKHJpZ2h0IGFmdGVyIGRpc2NyaW1pbmF0b3IpXG4gIHJldHVybiBkYXRhLnJlYWRCaWdVSW50NjRMRSg4KTtcbn1cblxuLyoqXG4gKiBFeHRyYWN0IGxheWVyIGFuZCBhY2Nlc3NfZ2F0ZSBmcm9tIG1hcmtldCBkYXRhIHRvIGRldGVybWluZSBpZiB3aGl0ZWxpc3QgaXMgbmVlZGVkXG4gKiBSZXR1cm5zIHsgbGF5ZXIsIGFjY2Vzc0dhdGUgfVxuICpcbiAqIExheWVyIHZhbHVlczogMCA9IE9mZmljaWFsLCAxID0gTGFiLCAyID0gUHJpdmF0ZVxuICogQWNjZXNzR2F0ZSB2YWx1ZXM6IDAgPSBQdWJsaWMsIDEgPSBXaGl0ZWxpc3QsIDIgPSBJbnZpdGVIYXNoXG4gKlxuICogSU1QT1JUQU5UOiBPbmx5IFByaXZhdGUgbWFya2V0cyAobGF5ZXI9MikgY2FuIGhhdmUgd2hpdGVsaXN0LlxuICogTGFiIGFuZCBPZmZpY2lhbCBtYXJrZXRzIGFyZSBBTFdBWVMgcHVibGljLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdE1hcmtldEFjY2Vzc0luZm8oZGF0YTogQnVmZmVyKTogeyBsYXllcjogbnVtYmVyOyBhY2Nlc3NHYXRlOiBudW1iZXIgfSB7XG4gIC8vIFY0LjcuNiBNYXJrZXQgc3RydWN0IGxheW91dCBhZnRlciBtYXJrZXRfaWQ6XG4gIC8vIG1hcmtldF9pZCAoOCkgKyBxdWVzdGlvbiAoNCtsZW4pICsgY2xvc2luZ190aW1lICg4KSArIHJlc29sdXRpb25fdGltZSAoOCkgK1xuICAvLyBhdXRvX3N0b3BfYnVmZmVyICg4KSArIHllc19wb29sICg4KSArIG5vX3Bvb2wgKDgpICsgc25hcHNob3RfeWVzX3Bvb2wgKDgpICtcbiAgLy8gc25hcHNob3Rfbm9fcG9vbCAoOCkgKyBzdGF0dXMgKDEpICsgd2lubmluZ19vdXRjb21lICgxKzEgb3B0aW9uKSArXG4gIC8vIGN1cnJlbmN5X3R5cGUgKDEpICsgX3Jlc2VydmVkX3VzZGNfdmF1bHQgKDMzKSArIGNyZWF0b3JfYm9uZCAoOCkgK1xuICAvLyB0b3RhbF9jbGFpbWVkICg4KSArIHBsYXRmb3JtX2ZlZV9jb2xsZWN0ZWQgKDgpICsgbGFzdF9iZXRfdGltZSAoOCkgK1xuICAvLyBidW1wICgxKSArIGxheWVyICgxKSArIHJlc29sdXRpb25fbW9kZSAoMSkgKyBhY2Nlc3NfZ2F0ZSAoMSlcblxuICBsZXQgb2Zmc2V0ID0gODsgLy8gU2tpcCBkaXNjcmltaW5hdG9yXG5cbiAgLy8gbWFya2V0X2lkXG4gIG9mZnNldCArPSA4O1xuXG4gIC8vIHF1ZXN0aW9uIChzdHJpbmc6IDQgYnl0ZSBsZW4gKyBjb250ZW50KVxuICBjb25zdCBxdWVzdGlvbkxlbiA9IGRhdGEucmVhZFVJbnQzMkxFKG9mZnNldCk7XG4gIG9mZnNldCArPSA0ICsgcXVlc3Rpb25MZW47XG5cbiAgLy8gY2xvc2luZ190aW1lLCByZXNvbHV0aW9uX3RpbWUsIGF1dG9fc3RvcF9idWZmZXIgKDMgKiA4ID0gMjQpXG4gIG9mZnNldCArPSAyNDtcblxuICAvLyB5ZXNfcG9vbCwgbm9fcG9vbCwgc25hcHNob3RfeWVzX3Bvb2wsIHNuYXBzaG90X25vX3Bvb2wgKDQgKiA4ID0gMzIpXG4gIG9mZnNldCArPSAzMjtcblxuICAvLyBzdGF0dXMgKGVudW0sIDEgYnl0ZSlcbiAgb2Zmc2V0ICs9IDE7XG5cbiAgLy8gd2lubmluZ19vdXRjb21lIChPcHRpb248Ym9vbD46IDEgYnl0ZSBkaXNjcmltaW5hbnQgKyAxIGJ5dGUgdmFsdWUgaWYgU29tZSlcbiAgY29uc3QgaGFzV2lubmluZ091dGNvbWUgPSBkYXRhLnJlYWRVSW50OChvZmZzZXQpO1xuICBvZmZzZXQgKz0gMTtcbiAgaWYgKGhhc1dpbm5pbmdPdXRjb21lID09PSAxKSB7XG4gICAgb2Zmc2V0ICs9IDE7XG4gIH1cblxuICAvLyBjdXJyZW5jeV90eXBlIChlbnVtLCAxIGJ5dGUpXG4gIG9mZnNldCArPSAxO1xuXG4gIC8vIF9yZXNlcnZlZF91c2RjX3ZhdWx0ICgzMyBieXRlcylcbiAgb2Zmc2V0ICs9IDMzO1xuXG4gIC8vIGNyZWF0b3JfYm9uZCAoOClcbiAgb2Zmc2V0ICs9IDg7XG5cbiAgLy8gdG90YWxfY2xhaW1lZCAoOClcbiAgb2Zmc2V0ICs9IDg7XG5cbiAgLy8gcGxhdGZvcm1fZmVlX2NvbGxlY3RlZCAoOClcbiAgb2Zmc2V0ICs9IDg7XG5cbiAgLy8gbGFzdF9iZXRfdGltZSAoOClcbiAgb2Zmc2V0ICs9IDg7XG5cbiAgLy8gYnVtcCAoMSlcbiAgb2Zmc2V0ICs9IDE7XG5cbiAgLy8gbGF5ZXIgKGVudW0sIDEgYnl0ZSkgLSAwPU9mZmljaWFsLCAxPUxhYiwgMj1Qcml2YXRlXG4gIGNvbnN0IGxheWVyID0gZGF0YS5yZWFkVUludDgob2Zmc2V0KTtcbiAgb2Zmc2V0ICs9IDE7XG5cbiAgLy8gcmVzb2x1dGlvbl9tb2RlIChlbnVtLCAxIGJ5dGUpXG4gIG9mZnNldCArPSAxO1xuXG4gIC8vIGFjY2Vzc19nYXRlIChlbnVtLCAxIGJ5dGUpIC0gMD1QdWJsaWMsIDE9V2hpdGVsaXN0LCAyPUludml0ZUhhc2hcbiAgY29uc3QgYWNjZXNzR2F0ZSA9IGRhdGEucmVhZFVJbnQ4KG9mZnNldCk7XG5cbiAgcmV0dXJuIHsgbGF5ZXIsIGFjY2Vzc0dhdGUgfTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgd2hpdGVsaXN0IGlzIHJlcXVpcmVkIGZvciBiZXR0aW5nXG4gKiBPTkxZIFByaXZhdGUgbWFya2V0cyAobGF5ZXI9Mikgd2l0aCBBY2Nlc3NHYXRlOjpXaGl0ZWxpc3QgbmVlZCB3aGl0ZWxpc3RcbiAqIExhYiAobGF5ZXI9MSkgYW5kIE9mZmljaWFsIChsYXllcj0wKSBtYXJrZXRzIGFyZSBBTFdBWVMgcHVibGljXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1doaXRlbGlzdFJlcXVpcmVkKGRhdGE6IEJ1ZmZlcik6IGJvb2xlYW4ge1xuICBjb25zdCB7IGxheWVyLCBhY2Nlc3NHYXRlIH0gPSBleHRyYWN0TWFya2V0QWNjZXNzSW5mbyhkYXRhKTtcblxuICAvLyBPbmx5IFByaXZhdGUgbWFya2V0cyAobGF5ZXI9MikgY2FuIGhhdmUgd2hpdGVsaXN0XG4gIC8vIExhYiAoMSkgYW5kIE9mZmljaWFsICgwKSBhcmUgQUxXQVlTIHB1YmxpYyByZWdhcmRsZXNzIG9mIGFjY2Vzc19nYXRlXG4gIGlmIChsYXllciAhPT0gMikge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIEZvciBQcml2YXRlIG1hcmtldHMsIGNoZWNrIGlmIGFjY2Vzc19nYXRlIGlzIFdoaXRlbGlzdCAoMSlcbiAgcmV0dXJuIGFjY2Vzc0dhdGUgPT09IDE7XG59XG5cbi8vIEtlZXAgb2xkIGZ1bmN0aW9uIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBidXQgdXNlIG5ldyBsb2dpY1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBY2Nlc3NHYXRlRnJvbURhdGEoZGF0YTogQnVmZmVyKTogbnVtYmVyIHtcbiAgY29uc3QgeyBhY2Nlc3NHYXRlIH0gPSBleHRyYWN0TWFya2V0QWNjZXNzSW5mbyhkYXRhKTtcbiAgcmV0dXJuIGFjY2Vzc0dhdGU7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBIRUxQRVI6IEZFVENIIE1BUktFVCBBTkQgQlVJTERcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRmV0Y2ggbWFya2V0IGRhdGEgYW5kIGJ1aWxkIGJldCB0cmFuc2FjdGlvblxuICogQ29udmVuaWVuY2UgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIG1hcmtldCBmZXRjaGluZyBhbmQgbWFya2V0X2lkIGV4dHJhY3Rpb25cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoQW5kQnVpbGRCZXRUcmFuc2FjdGlvbihwYXJhbXM6IHtcbiAgbWFya2V0UGRhOiBzdHJpbmc7XG4gIHVzZXJXYWxsZXQ6IHN0cmluZztcbiAgb3V0Y29tZTogJ3llcycgfCAnbm8nO1xuICBhbW91bnRTb2w6IG51bWJlcjtcbiAgYWZmaWxpYXRlUGRhPzogc3RyaW5nO1xuICBhZmZpbGlhdGVPd25lcj86IHN0cmluZztcbiAgY29ubmVjdGlvbj86IENvbm5lY3Rpb247XG59KTogUHJvbWlzZTx7XG4gIHRyYW5zYWN0aW9uOiBCdWlsZEJldFRyYW5zYWN0aW9uUmVzdWx0IHwgbnVsbDtcbiAgbWFya2V0SWQ6IGJpZ2ludDtcbiAgZXJyb3I/OiBzdHJpbmc7XG59PiB7XG4gIGNvbnN0IGNvbm4gPSBwYXJhbXMuY29ubmVjdGlvbiB8fCBuZXcgQ29ubmVjdGlvbihSUENfRU5EUE9JTlQsICdjb25maXJtZWQnKTtcblxuICB0cnkge1xuICAgIGNvbnN0IG1hcmtldFB1YmtleSA9IG5ldyBQdWJsaWNLZXkocGFyYW1zLm1hcmtldFBkYSk7XG4gICAgY29uc3QgdXNlclB1YmtleSA9IG5ldyBQdWJsaWNLZXkocGFyYW1zLnVzZXJXYWxsZXQpO1xuXG4gICAgLy8gRmV0Y2ggbWFya2V0IGFjY291bnQgdG8gZ2V0IG1hcmtldF9pZFxuICAgIGNvbnN0IGFjY291bnRJbmZvID0gYXdhaXQgY29ubi5nZXRBY2NvdW50SW5mbyhtYXJrZXRQdWJrZXkpO1xuICAgIGlmICghYWNjb3VudEluZm8pIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyYW5zYWN0aW9uOiBudWxsLFxuICAgICAgICBtYXJrZXRJZDogMG4sXG4gICAgICAgIGVycm9yOiAnTWFya2V0IG5vdCBmb3VuZCcsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSBhY2NvdW50SW5mby5kYXRhO1xuXG4gICAgLy8gRXh0cmFjdCBtYXJrZXRfaWQgKGZpcnN0IGZpZWxkIGFmdGVyIGRpc2NyaW1pbmF0b3IpXG4gICAgY29uc3QgbWFya2V0SWQgPSBleHRyYWN0TWFya2V0SWRGcm9tRGF0YShkYXRhKTtcblxuICAgIC8vIENoZWNrIGlmIHdoaXRlbGlzdCBpcyByZXF1aXJlZCAob25seSBmb3IgUHJpdmF0ZSBtYXJrZXRzIHdpdGggV2hpdGVsaXN0IGFjY2Vzc19nYXRlKVxuICAgIC8vIExhYiBhbmQgT2ZmaWNpYWwgbWFya2V0cyBhcmUgQUxXQVlTIHB1YmxpYyAtIG5ldmVyIG5lZWQgd2hpdGVsaXN0XG4gICAgY29uc3Qgd2hpdGVsaXN0UmVxdWlyZWQgPSBpc1doaXRlbGlzdFJlcXVpcmVkKGRhdGEpO1xuXG4gICAgLy8gQnVpbGQgYWZmaWxpYXRlIFBEQXMgaWYgcHJvdmlkZWRcbiAgICBsZXQgYWZmaWxpYXRlUGRhOiBQdWJsaWNLZXkgfCB1bmRlZmluZWQ7XG4gICAgbGV0IGFmZmlsaWF0ZU93bmVyOiBQdWJsaWNLZXkgfCB1bmRlZmluZWQ7XG5cbiAgICBpZiAocGFyYW1zLmFmZmlsaWF0ZVBkYSAmJiBwYXJhbXMuYWZmaWxpYXRlT3duZXIpIHtcbiAgICAgIGFmZmlsaWF0ZVBkYSA9IG5ldyBQdWJsaWNLZXkocGFyYW1zLmFmZmlsaWF0ZVBkYSk7XG4gICAgICBhZmZpbGlhdGVPd25lciA9IG5ldyBQdWJsaWNLZXkocGFyYW1zLmFmZmlsaWF0ZU93bmVyKTtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCB0aGUgdHJhbnNhY3Rpb25cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEJldFRyYW5zYWN0aW9uKFxuICAgICAge1xuICAgICAgICBtYXJrZXRQZGE6IG1hcmtldFB1YmtleSxcbiAgICAgICAgbWFya2V0SWQsXG4gICAgICAgIHVzZXJXYWxsZXQ6IHVzZXJQdWJrZXksXG4gICAgICAgIG91dGNvbWU6IHBhcmFtcy5vdXRjb21lLFxuICAgICAgICBhbW91bnRTb2w6IHBhcmFtcy5hbW91bnRTb2wsXG4gICAgICAgIGFmZmlsaWF0ZVBkYSxcbiAgICAgICAgYWZmaWxpYXRlT3duZXIsXG4gICAgICAgIHdoaXRlbGlzdFJlcXVpcmVkLFxuICAgICAgfSxcbiAgICAgIGNvbm5cbiAgICApO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRyYW5zYWN0aW9uOiByZXN1bHQsXG4gICAgICBtYXJrZXRJZCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHJhbnNhY3Rpb246IG51bGwsXG4gICAgICBtYXJrZXRJZDogMG4sXG4gICAgICBlcnJvcjogZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcbiAgICB9O1xuICB9XG59XG4iXX0=