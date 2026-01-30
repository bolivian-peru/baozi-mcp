# Baozi MCP Server v4.0 - Full Protocol Implementation Plan

**Created**: January 30, 2026
**Updated**: January 30, 2026
**Target**: Complete IDL coverage for AI agent integration

---

## Current State (v4.0.0) ✅ PHASE 1 COMPLETE

### Implemented Tools: 38
- Market reads (6): list_markets, get_market, get_quote, list_race_markets, get_race_market, get_race_quote
- **Market creation (8)**: preview_create_market, build_create_lab_market_transaction, build_create_private_market_transaction, build_create_race_market_transaction, get_creation_fees, get_platform_fees, get_timing_rules, generate_invite_hash ✅ NEW
- Positions (2): get_positions, get_claimable
- Resolution (3): get_resolution_status, get_disputed_markets, get_markets_awaiting_resolution
- Affiliates (8): check_affiliate_code, suggest_affiliate_codes, get_affiliate_info, get_my_affiliates, get_referrals, get_agent_network_stats, format_affiliate_link, get_commission_info
- Validation (2): validate_market_params, validate_bet
- TX Build Bets (2): build_bet_transaction, build_race_bet_transaction
- TX Build Claims (4): build_claim_winnings_transaction, build_claim_refund_transaction, build_batch_claim_transaction, build_claim_affiliate_transaction
- TX Build Affiliate (2): build_register_affiliate_transaction, build_toggle_affiliate_transaction
- Simulation (1): simulate_transaction

### Missing: ~40 instructions from IDL (Resolution, Creator Profiles, Whitelist, Disputes, Admin)

---

## Implementation Phases

### Phase 1: Market Creation ✅ COMPLETE
**Status**: DONE - January 30, 2026
**Why**: Agents need to create markets, not just read them.

#### Files Created ✅
```
/src/handlers/market-creation.ts      # High-level creation functions
/src/builders/market-creation-tx.ts   # Transaction builders
/src/validation/creation-rules.ts     # v6.2 rules validation
```

#### Tools Implemented (8) ✅
| Tool | IDL Instruction | Status |
|------|-----------------|--------|
| `preview_create_market` | - | ✅ Validates + shows costs |
| `build_create_lab_market_transaction` | create_lab_market_sol | ✅ Full tx build |
| `build_create_private_market_transaction` | create_private_table_sol | ✅ With invite hash |
| `build_create_race_market_transaction` | create_race_market_sol | ✅ 2-10 outcomes |
| `get_creation_fees` | - | ✅ All layer fees |
| `get_platform_fees` | - | ✅ All layer fees |
| `get_timing_rules` | - | ✅ v6.2 rules explained |
| `generate_invite_hash` | - | ✅ For private markets |

#### Instruction Parameters (from IDL)
```rust
// create_lab_market_sol
pub fn create_lab_market_sol(
    ctx: Context<CreateLabMarketSol>,
    question: String,           // max 200 chars
    closing_time: i64,          // Unix timestamp
    resolution_time: i64,       // Must be after closing_time
    invite_hash: Option<[u8; 32]>, // For private invite links
) -> Result<()>

// create_race_market_sol
pub fn create_race_market_sol(
    ctx: Context<CreateRaceMarketSol>,
    question: String,
    outcomes: Vec<String>,      // 2-10 outcome labels
    closing_time: i64,
    resolution_time: i64,
) -> Result<()>
```

#### v6.2 Rules Integration
- Rule A (Event-based): `closing_time <= event_time - 12h` (recommended 18-24h)
- Rule B (Measurement): `closing_time < measurement_start`
- Auto-calculate resolution_time from closing_time + buffer

---

### Phase 2: Resolution System (Priority: CRITICAL)
**Why**: Oracle agents need to resolve markets.

#### New Handlers
```
/src/handlers/resolution-ops.ts
```

#### New Tools (10)
| Tool | IDL Instruction | Description |
|------|-----------------|-------------|
| `check_can_resolve` | - | Check if market ready for resolution |
| `get_resolution_window` | - | Time until resolution deadline |
| `build_propose_resolution_transaction` | propose_resolution | Creator proposes outcome |
| `build_propose_resolution_host_transaction` | propose_resolution_host | Oracle proposes |
| `build_resolve_market_transaction` | resolve_market | Direct resolve (creator) |
| `build_resolve_market_host_transaction` | resolve_market_host | Oracle resolves |
| `build_finalize_resolution_transaction` | finalize_resolution | Finalize after dispute window |
| `build_propose_race_resolution_transaction` | propose_race_resolution | Propose race outcome |
| `build_resolve_race_transaction` | resolve_race | Resolve race market |
| `build_finalize_race_resolution_transaction` | finalize_race_resolution | Finalize race |

#### Instruction Parameters
```rust
// propose_resolution
pub fn propose_resolution(
    ctx: Context<ProposeResolution>,
    outcome: bool,  // true = Yes, false = No
) -> Result<()>

// resolve_market
pub fn resolve_market(
    ctx: Context<ResolveMarket>,
    outcome: bool,
) -> Result<()>

// propose_race_resolution
pub fn propose_race_resolution(
    ctx: Context<ProposeRaceResolution>,
    winning_outcome: u8,  // Index of winning outcome
) -> Result<()>
```

---

### Phase 3: Race Positions & Claims (Priority: HIGH)
**Why**: Complete race market support.

#### New Handlers
```
/src/handlers/race-positions.ts
```

#### New Tools (5)
| Tool | IDL Instruction | Description |
|------|-----------------|-------------|
| `get_race_positions` | - | Get user's race market positions |
| `get_race_claimable` | - | Get claimable race winnings |
| `build_claim_race_winnings_transaction` | claim_race_winnings_sol | Claim race winnings |
| `build_claim_race_refund_transaction` | claim_race_refund | Claim race refunds |
| `get_race_position_details` | - | Detailed position info |

#### Account Decoding
```
RacePosition struct:
- discriminator (8)
- user (Pubkey, 32)
- race_market (Pubkey, 32)
- outcome_index (u8, 1)
- amount (u64, 8)
- claimed (bool, 1)
- created_at (i64, 8)
- market_id (u64, 8)
```

---

### Phase 4: Creator Profiles (Priority: HIGH)
**Why**: Reputation system for market creators.

#### New Handlers
```
/src/handlers/creator-profiles.ts
```

#### New Tools (7)
| Tool | IDL Instruction | Description |
|------|-----------------|-------------|
| `get_creator_profile` | - | Get creator's on-chain profile |
| `get_creator_reputation` | - | Get reputation score & votes |
| `get_creator_markets` | - | List markets by creator |
| `build_create_creator_profile_transaction` | create_creator_profile | Create profile |
| `build_update_creator_profile_transaction` | update_creator_profile | Update profile |
| `build_vote_creator_reputation_transaction` | vote_creator_reputation | Vote on creator |
| `build_claim_creator_fees_transaction` | claim_creator_sol | Claim creator fees |

#### Account Structures
```
CreatorProfile struct:
- discriminator (8)
- owner (Pubkey, 32)
- display_name (String)
- bio (String)
- avatar_url (String)
- fee_bps (u16)
- total_markets (u64)
- verified (bool)
- created_at (i64)
- bump (u8)

CreatorReputation struct:
- discriminator (8)
- creator (Pubkey, 32)
- upvotes (u64)
- downvotes (u64)
- score (i64)  // upvotes - downvotes
```

---

### Phase 5: Whitelist Management (Priority: MEDIUM)
**Why**: Private markets need whitelist control.

#### New Handlers
```
/src/handlers/whitelist.ts
```

#### New Tools (8)
| Tool | IDL Instruction | Description |
|------|-----------------|-------------|
| `check_whitelist_status` | - | Check if address whitelisted |
| `get_whitelist_members` | - | List all whitelisted addresses |
| `build_create_whitelist_transaction` | create_race_whitelist | Init whitelist |
| `build_add_to_whitelist_transaction` | add_to_whitelist | Add address |
| `build_remove_from_whitelist_transaction` | remove_from_whitelist | Remove address |
| `build_add_to_race_whitelist_transaction` | add_to_race_whitelist | Add to race whitelist |
| `build_remove_from_race_whitelist_transaction` | remove_from_race_whitelist | Remove from race |
| `validate_whitelist_access` | - | Check bet eligibility |

#### Account Structure
```
PrivateWhitelist struct:
- discriminator (8)
- market_id (u64)
- addresses (Vec<Pubkey>)  // Up to 100 addresses
- bump (u8)
```

---

### Phase 6: Dispute System (Priority: MEDIUM)
**Why**: Handle contested resolutions.

#### New Handlers
```
/src/handlers/disputes.ts
```

#### New Tools (10)
| Tool | IDL Instruction | Description |
|------|-----------------|-------------|
| `get_dispute_details` | - | Full dispute info |
| `get_dispute_window` | - | Time remaining to dispute |
| `get_council_votes` | - | Current council votes |
| `check_can_dispute` | - | Validate dispute eligibility |
| `build_flag_dispute_transaction` | flag_dispute | Raise dispute |
| `build_flag_race_dispute_transaction` | flag_race_dispute | Dispute race |
| `build_vote_council_transaction` | vote_council | Council votes |
| `build_vote_council_race_transaction` | vote_council_race | Council votes race |
| `build_change_council_vote_transaction` | change_council_vote | Change vote |
| `get_my_council_memberships` | - | Markets where user is council |

---

### Phase 7: Market Management (Priority: MEDIUM)
**Why**: Creators need to manage their markets.

#### New Handlers
```
/src/handlers/market-management.ts
```

#### New Tools (8)
| Tool | IDL Instruction | Description |
|------|-----------------|-------------|
| `build_extend_market_transaction` | extend_market | Extend closing time |
| `build_extend_race_market_transaction` | extend_race_market | Extend race |
| `build_shorten_market_transaction` | shorten_market_time | Shorten time |
| `build_shorten_race_market_transaction` | shorten_race_market_time | Shorten race |
| `build_pause_market_transaction` | pause_market | Pause betting |
| `check_can_extend` | - | Validate extension |
| `check_can_shorten` | - | Validate shortening |
| `get_market_management_status` | - | What actions available |

---

### Phase 8: Protocol Info (Priority: LOW)
**Why**: Read-only protocol state for transparency.

#### New Handlers
```
/src/handlers/protocol.ts
```

#### New Tools (6)
| Tool | IDL Instruction | Description |
|------|-----------------|-------------|
| `get_protocol_config` | - | Fees, limits, admin |
| `get_revenue_config` | - | Staking vault routing |
| `get_treasury_balance` | - | SOL treasury balance |
| `get_protocol_stats` | - | Total markets, volume |
| `get_fee_structure` | - | All fee tiers |
| `get_timing_config` | - | Freeze times, buffers |

#### Account Structures
```
GlobalConfig struct:
- discriminator (8)
- admin (Pubkey)
- guardian (Pubkey)
- sol_treasury (Pubkey)
- official_platform_fee_bps (u16)
- lab_platform_fee_bps (u16)
- private_platform_fee_bps (u16)
- affiliate_fee_bps (u16)
- market_count (u64)
- race_market_count (u64)
- total_volume (u64)
- paused (bool)
- betting_freeze_seconds (i64)
...

RevenueConfig struct:
- discriminator (8)
- admin (Pubkey)
- staking_vault (Pubkey)
- total_routed_to_staking (u64)
- is_active (bool)
- bump (u8)
```

---

### Phase 9: Utilities (Priority: LOW)
**Why**: Helper tools for common operations.

#### New Tools (8)
| Tool | Description |
|------|-------------|
| `derive_pda` | Derive any PDA (market, position, affiliate, etc.) |
| `decode_transaction` | Decode tx and extract events |
| `get_recent_activity` | Recent bets, resolutions |
| `search_markets` | Search by keyword |
| `get_market_history` | Historical odds snapshots |
| `estimate_compute_units` | Estimate CU for transaction |
| `get_block_time` | Current slot and time |
| `validate_pubkey` | Check if valid Solana address |

---

## File Structure

```
/packages/baozi-mcp/src/
├── index.ts                    # MCP server entry
├── tools.ts                    # Tool definitions (UPDATE)
├── resources.ts                # MCP resources
├── config.ts                   # Configuration (UPDATE)
│
├── handlers/
│   ├── markets.ts              # ✅ Exists
│   ├── quote.ts                # ✅ Exists
│   ├── positions.ts            # ✅ Exists
│   ├── claims.ts               # ✅ Exists
│   ├── race-markets.ts         # ✅ Exists
│   ├── resolution.ts           # ✅ Exists (reads)
│   ├── agent-network.ts        # ✅ Exists
│   │
│   ├── market-creation.ts      # 🆕 Phase 1
│   ├── resolution-ops.ts       # 🆕 Phase 2
│   ├── race-positions.ts       # 🆕 Phase 3
│   ├── creator-profiles.ts     # 🆕 Phase 4
│   ├── whitelist.ts            # 🆕 Phase 5
│   ├── disputes.ts             # 🆕 Phase 6
│   ├── market-management.ts    # 🆕 Phase 7
│   ├── protocol.ts             # 🆕 Phase 8
│   └── utilities.ts            # 🆕 Phase 9
│
├── builders/
│   ├── bet-transaction.ts      # ✅ Exists
│   ├── claim-transaction.ts    # ✅ Exists
│   ├── affiliate-transaction.ts # ✅ Exists
│   ├── race-transaction.ts     # ✅ Exists
│   │
│   ├── market-creation-tx.ts   # 🆕 Phase 1
│   ├── resolution-tx.ts        # 🆕 Phase 2
│   ├── creator-profile-tx.ts   # 🆕 Phase 4
│   ├── whitelist-tx.ts         # 🆕 Phase 5
│   ├── dispute-tx.ts           # 🆕 Phase 6
│   └── market-management-tx.ts # 🆕 Phase 7
│
└── validation/
    ├── market-rules.ts         # ✅ Exists (v6.2)
    ├── bet-rules.ts            # ✅ Exists
    │
    ├── creation-rules.ts       # 🆕 Phase 1
    ├── resolution-rules.ts     # 🆕 Phase 2
    └── dispute-rules.ts        # 🆕 Phase 6
```

---

## Tool Count Summary

| Phase | Category | New Tools | Cumulative |
|-------|----------|-----------|------------|
| v3.0 | Current | 30 | 30 |
| 1 | Market Creation | 8 | 38 |
| 2 | Resolution | 10 | 48 |
| 3 | Race Positions | 5 | 53 |
| 4 | Creator Profiles | 7 | 60 |
| 5 | Whitelist | 8 | 68 |
| 6 | Disputes | 10 | 78 |
| 7 | Market Management | 8 | 86 |
| 8 | Protocol Info | 6 | 92 |
| 9 | Utilities | 8 | **100** |

**Final Target: 100 MCP Tools**

---

## Implementation Order

### Day 1: Market Creation (Phase 1)
1. Create `/handlers/market-creation.ts`
2. Create `/builders/market-creation-tx.ts`
3. Create `/validation/creation-rules.ts`
4. Update `tools.ts` with 8 new tools
5. Test with dry-run (no signing)

### Day 2: Resolution System (Phase 2)
1. Create `/handlers/resolution-ops.ts`
2. Create `/builders/resolution-tx.ts`
3. Create `/validation/resolution-rules.ts`
4. Update `tools.ts` with 10 new tools
5. Test oracle resolution flow

### Day 3: Race & Creator (Phases 3-4)
1. Create `/handlers/race-positions.ts`
2. Create `/handlers/creator-profiles.ts`
3. Create `/builders/creator-profile-tx.ts`
4. Update `tools.ts` with 12 new tools

### Day 4: Whitelist & Disputes (Phases 5-6)
1. Create `/handlers/whitelist.ts`
2. Create `/handlers/disputes.ts`
3. Create `/builders/whitelist-tx.ts`
4. Create `/builders/dispute-tx.ts`
5. Update `tools.ts` with 18 new tools

### Day 5: Management & Protocol (Phases 7-9)
1. Create `/handlers/market-management.ts`
2. Create `/handlers/protocol.ts`
3. Create `/handlers/utilities.ts`
4. Create `/builders/market-management-tx.ts`
5. Update `tools.ts` with 22 new tools

### Day 6: Testing & Documentation
1. Integration tests for all tools
2. Update README with full tool list
3. Create example prompts for agents
4. Version bump to v4.0.0

---

## Discriminators Needed

```typescript
// Add to config.ts
export const DISCRIMINATORS = {
  // Existing
  MARKET: Buffer.from([219, 190, 213, 55, 0, 227, 198, 154]),
  USER_POSITION: Buffer.from([251, 248, 209, 245, 83, 234, 17, 27]),
  RACE_MARKET: Buffer.from([149, 8, 156, 202, 160, 252, 176, 217]),
  RACE_POSITION: Buffer.from([44, 182, 16, 1, 230, 14, 174, 46]),
  AFFILIATE: Buffer.from([24, 240, 16, 245, 33, 46, 77, 168]),
  REFERRED_USER: Buffer.from([188, 210, 247, 185, 105, 204, 220, 46]),
  DISPUTE_META: Buffer.from([62, 14, 221, 64, 175, 241, 48, 165]),

  // New - Phase 4
  CREATOR_PROFILE: Buffer.from([83, 210, 28, 6, 46, 183, 224, 219]),
  CREATOR_REPUTATION: Buffer.from([...]), // Need to extract
  REPUTATION_VOTE: Buffer.from([...]),

  // New - Phase 5
  PRIVATE_WHITELIST: Buffer.from([...]),
  RACE_WHITELIST: Buffer.from([...]),

  // New - Phase 6
  COUNCIL_VOTE: Buffer.from([...]),
  RACE_COUNCIL_VOTE: Buffer.from([...]),

  // New - Phase 8
  GLOBAL_CONFIG: Buffer.from([149, 8, 156, 202, 160, 252, 176, 217]),
  REVENUE_CONFIG: Buffer.from([...]),
  SOL_TREASURY: Buffer.from([...]),
};

// Instruction discriminators (first 8 bytes of sha256("global:instruction_name"))
export const IX_DISCRIMINATORS = {
  // Phase 1 - Market Creation
  CREATE_LAB_MARKET_SOL: Buffer.from([...]),
  CREATE_PRIVATE_TABLE_SOL: Buffer.from([...]),
  CREATE_RACE_MARKET_SOL: Buffer.from([...]),

  // Phase 2 - Resolution
  PROPOSE_RESOLUTION: Buffer.from([...]),
  RESOLVE_MARKET: Buffer.from([...]),
  FINALIZE_RESOLUTION: Buffer.from([...]),

  // ... etc
};
```

---

## v6.2 Rules Integration

### Market Creation Validation
```typescript
function validateMarketCreation(params: CreateMarketParams): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Question validation
  if (params.question.length > 200) {
    errors.push('Question exceeds 200 characters');
  }

  // Timing validation (v6.2 Rule A or B)
  if (params.marketType === 'event') {
    // Rule A: Event-based
    const bufferHours = (params.eventTime - params.closingTime) / 3600000;
    if (bufferHours < 12) {
      errors.push(`Event buffer too short: ${bufferHours.toFixed(1)}h (min 12h)`);
    } else if (bufferHours < 18) {
      warnings.push(`Recommend 18-24h buffer, got ${bufferHours.toFixed(1)}h`);
    }
  } else if (params.marketType === 'measurement') {
    // Rule B: Measurement-period
    if (params.closingTime >= params.measurementStart) {
      errors.push('INVALID: Betting must close BEFORE measurement starts');
    }
  }

  // Resolution time validation
  const minResolutionBuffer = 600; // 10 minutes
  if (params.resolutionTime - params.closingTime < minResolutionBuffer) {
    errors.push('Resolution time must be at least 10 minutes after close');
  }

  // Race-specific validation
  if (params.outcomes) {
    if (params.outcomes.length < 2) {
      errors.push('Race markets need at least 2 outcomes');
    }
    if (params.outcomes.length > 10) {
      errors.push('Race markets limited to 10 outcomes');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

---

## Testing Checklist

### Phase 1: Market Creation
- [ ] Create Lab market with valid params
- [ ] Reject market with question > 200 chars
- [ ] Reject market with closing_time in past
- [ ] Reject event market with < 12h buffer
- [ ] Create private market with invite hash
- [ ] Create race market with 3 outcomes
- [ ] Reject race market with 1 outcome
- [ ] Reject race market with 11 outcomes

### Phase 2: Resolution
- [ ] Propose resolution as creator
- [ ] Propose resolution as oracle host
- [ ] Reject resolution before closing_time
- [ ] Resolve market immediately (no dispute)
- [ ] Finalize resolution after dispute window
- [ ] Handle race market resolution

### Phase 3-9: (Similar checklists)

---

## Success Metrics

1. **Coverage**: 100 tools covering all IDL instructions
2. **Validation**: All tools validate inputs against v6.2 rules
3. **Errors**: Clear error messages for invalid operations
4. **Simulation**: All TX builders include simulation
5. **Documentation**: Every tool has description and examples

---

## Next Steps

**START IMPLEMENTATION: Phase 1 - Market Creation**
