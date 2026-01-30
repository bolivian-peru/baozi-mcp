# Baozi Markets v4.7.6 - IDL Reference for AI Agents

**Program ID**: `DW4o8AoSXnSudjZhwo4ixkmVUw2Bnv5FDPYF9LgsS5YY`
**Network**: Solana Mainnet
**Last Updated**: January 30, 2026

---

## Quick Reference

### PDA Seeds

| Account | Seeds | Description |
|---------|-------|-------------|
| GlobalConfig | `["config"]` | Protocol configuration |
| SolTreasury | `["sol_treasury"]` | SOL fee collection |
| Market | `["market", market_id (u64 LE)]` | Boolean market |
| RaceMarket | `["race", market_id (u64 LE)]` | Multi-outcome market |
| UserPosition | `["position", market_id (u64 LE), user (Pubkey)]` | User's bet position |
| RacePosition | `["race_position", market_id (u64 LE), user (Pubkey)]` | Race bet position |
| Affiliate | `["affiliate", code (UTF-8)]` | Affiliate account |
| ReferredUser | `["referred_user", user (Pubkey)]` | Referral tracking |
| CreatorProfile | `["creator_profile", creator (Pubkey)]` | Creator reputation |
| Whitelist | `["whitelist", market (Pubkey), user (Pubkey)]` | Private market access |
| RaceWhitelist | `["race_whitelist", race_market (Pubkey)]` | Race whitelist root |
| DisputeMeta | `["dispute", market (Pubkey)]` | Dispute state |
| RevenueConfig | `["revenue_config"]` | Staking revenue routing |

---

## Enums (Numeric Values)

### MarketStatus
```
0 = Active      // Betting open
1 = Closed      // Betting closed, awaiting resolution
2 = Resolved    // Outcome determined, claims open
3 = Cancelled   // Refunds available
4 = Paused      // Temporarily halted
5 = ResolvedPending  // Resolution proposed, in dispute window
6 = Disputed    // Under council review
```

### MarketLayer
```
0 = Official    // Admin-created, 2.5% fee
1 = Lab         // Community-created, 3% fee
2 = Private     // Invite-only, 2% fee
```

### AccessGate
```
0 = Public      // Anyone can bet
1 = Whitelist   // Only whitelisted users
2 = InviteHash  // Requires invite hash
```

### ResolutionMode
```
0 = BaoziTvs       // Creator resolves
1 = HostOracle     // External oracle resolves
2 = CouncilOracle  // Council voting
```

### DisputeVerdict
```
0 = Affirmed    // Original resolution upheld
1 = Overridden  // Resolution changed
2 = Cancelled   // Market cancelled, refunds issued
```

### CurrencyType
```
0 = Sol  // Native SOL only
```

---

## Account Structures

### Market (Boolean YES/NO)

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | discriminator | [u8; 8] | 8 | `[151, 54, 76, 52, 178, 153, 160, 182]` |
| 8 | market_id | u64 | 8 | Unique market identifier |
| 16 | question | String | 4+len | Market question (max 200 chars) |
| - | closing_time | i64 | 8 | Unix timestamp when betting closes |
| - | resolution_time | i64 | 8 | Unix timestamp for resolution deadline |
| - | auto_stop_buffer | i64 | 8 | Auto-close buffer seconds |
| - | yes_pool | u64 | 8 | Total lamports bet on YES |
| - | no_pool | u64 | 8 | Total lamports bet on NO |
| - | snapshot_yes_pool | u64 | 8 | Snapshot at close |
| - | snapshot_no_pool | u64 | 8 | Snapshot at close |
| - | status | MarketStatus | 1 | Current status (0-6) |
| - | winning_outcome | Option\<bool\> | 1-2 | None/Some(true)/Some(false) |
| - | currency_type | CurrencyType | 1 | Always 0 (SOL) |
| - | _reserved_usdc_vault | [u8; 33] | 33 | Reserved |
| - | creator_bond | u64 | 8 | Creator's bond |
| - | total_claimed | u64 | 8 | Total claimed so far |
| - | platform_fee_collected | u64 | 8 | Fees collected |
| - | last_bet_time | i64 | 8 | Timestamp of last bet |
| - | bump | u8 | 1 | PDA bump |
| - | layer | MarketLayer | 1 | Market layer (0-2) |
| - | resolution_mode | ResolutionMode | 1 | How market resolves |
| - | access_gate | AccessGate | 1 | Access control |
| - | creator | Pubkey | 32 | Creator's wallet |
| - | oracle_host | Option\<Pubkey\> | 1-33 | External oracle |
| - | council | [Pubkey; 5] | 160 | Council members |
| - | council_size | u8 | 1 | Active council count |
| - | council_votes_yes | u8 | 1 | YES votes |
| - | council_votes_no | u8 | 1 | NO votes |
| - | council_threshold | u8 | 1 | Votes needed |
| - | total_affiliate_fees | u64 | 8 | Affiliate fees paid |
| - | invite_hash | Option\<[u8;32]\> | 1-33 | Private market hash |
| - | creator_fee_bps | u16 | 2 | Creator fee (basis points) |
| - | total_creator_fees | u64 | 8 | Creator fees collected |
| - | creator_profile | Option\<Pubkey\> | 1-33 | Creator profile PDA |
| - | platform_fee_bps_at_creation | u16 | 2 | Fee rate at creation |
| - | affiliate_fee_bps_at_creation | u16 | 2 | Affiliate rate |
| - | betting_freeze_seconds_at_creation | i64 | 8 | Freeze buffer |
| - | has_bets | bool | 1 | Whether any bets placed |
| - | dust_swept | bool | 1 | Dust cleanup flag |
| - | reserved | [u8; 15] | 15 | Future use |

### RaceMarket (Multi-Outcome)

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | discriminator | [u8; 8] | 8 | `[194, 130, 129, 52, 50, 172, 20, 195]` |
| 8 | market_id | u64 | 8 | Unique race market ID |
| 16 | question | String | 4+len | Market question |
| - | closing_time | i64 | 8 | Betting close time |
| - | resolution_time | i64 | 8 | Resolution deadline |
| - | auto_stop_buffer | i64 | 8 | Auto-close buffer |
| - | outcome_count | u8 | 1 | Number of outcomes (2-10) |
| - | outcome_labels | [[u8; 32]; 10] | 320 | Fixed array of labels |
| - | outcome_pools | [u64; 10] | 80 | Fixed array of pools |
| - | total_pool | u64 | 8 | Sum of all pools |
| - | snapshot_pools | [u64; 10] | 80 | Snapshots at close |
| - | snapshot_total | u64 | 8 | Total snapshot |
| - | status | MarketStatus | 1 | Current status |
| - | winning_outcome | Option\<u8\> | 1-2 | Winning index |
| - | currency_type | CurrencyType | 1 | Always SOL |
| - | platform_fee_collected | u64 | 8 | Fees collected |
| - | creator_fee_collected | u64 | 8 | Creator fees |
| - | total_claimed | u64 | 8 | Claims paid out |
| - | last_bet_time | i64 | 8 | Last bet timestamp |
| - | bump | u8 | 1 | PDA bump |
| - | layer | MarketLayer | 1 | Market layer |
| - | resolution_mode | ResolutionMode | 1 | Resolution method |
| - | access_gate | AccessGate | 1 | Access control |
| - | creator | Pubkey | 32 | Creator wallet |
| - | oracle_host | Option\<Pubkey\> | 1-33 | Oracle |
| - | council | [Pubkey; 5] | 160 | Council |
| - | council_size | u8 | 1 | Council count |
| - | council_votes | [u8; 10] | 10 | Votes per outcome |
| - | council_threshold | u8 | 1 | Vote threshold |
| - | creator_fee_bps | u16 | 2 | Creator fee |
| - | creator_profile | Option\<Pubkey\> | 1-33 | Profile PDA |
| - | platform_fee_bps_at_creation | u16 | 2 | Platform fee |
| - | affiliate_fee_bps_at_creation | u16 | 2 | Affiliate fee |
| - | betting_freeze_seconds_at_creation | i64 | 8 | Freeze buffer |
| - | dust_swept | bool | 1 | Dust flag |
| - | reserved | [u8; 19] | 19 | Reserved |

### UserPosition (Boolean Market Bet)

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | discriminator | [u8; 8] | 8 | Position discriminator |
| 8 | user | Pubkey | 32 | User's wallet |
| 40 | market_id | u64 | 8 | Market ID |
| 48 | yes_amount | u64 | 8 | Lamports bet on YES |
| 56 | no_amount | u64 | 8 | Lamports bet on NO |
| 64 | claimed | bool | 1 | Whether claimed |
| 65 | bump | u8 | 1 | PDA bump |
| 66 | referred_by | Option\<Pubkey\> | 1-33 | Affiliate PDA |
| - | affiliate_fee_paid | u64 | 8 | Fees to affiliate |
| - | reserved | [u8; 16] | 16 | Reserved |

### Affiliate

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | discriminator | [u8; 8] | 8 | Affiliate discriminator |
| 8 | owner | Pubkey | 32 | Owner wallet |
| 40 | code | String | 4+len | Affiliate code (3-16 chars) |
| - | total_earned | u64 | 8 | Total earnings (lamports) |
| - | unclaimed | u64 | 8 | Pending claims |
| - | referral_count | u64 | 8 | Total referrals |
| - | is_active | bool | 1 | Active status |
| - | bump | u8 | 1 | PDA bump |
| - | reserved | [u8; 32] | 32 | Reserved |

### CreatorProfile

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | discriminator | [u8; 8] | 8 | Profile discriminator |
| 8 | creator | Pubkey | 32 | Creator wallet |
| 40 | display_name | String | 4+len | Display name (max 32) |
| - | creator_fee_bps | u16 | 2 | Fee rate (max 50 bps) |
| - | total_markets | u64 | 8 | Markets created |
| - | total_volume | u64 | 8 | Total betting volume |
| - | total_fees_earned | u64 | 8 | Lifetime earnings |
| - | unclaimed_fees | u64 | 8 | Pending claims |
| - | reputation_score | i64 | 8 | Community score |
| - | verified | bool | 1 | Admin verified |
| - | bump | u8 | 1 | PDA bump |
| - | reserved | [u8; 32] | 32 | Reserved |

---

## Instruction Discriminators

### Market Operations
```
create_lab_market_sol:        [95, 22, 34, 220, 46, 15, 203, 132]
create_private_table_sol:     [55, 179, 25, 36, 99, 119, 170, 61]
create_race_market_sol:       [253, 94, 129, 149, 178, 239, 20, 78]
close_market:                 [95, 196, 66, 179, 8, 27, 84, 130]
extend_market:                [177, 159, 126, 213, 158, 181, 199, 138]
```

### Betting
```
place_bet_sol:                [157, 175, 230, 37, 27, 144, 114, 181]
place_bet_sol_with_affiliate: [0, 204, 56, 34, 39, 214, 255, 36]
bet_on_race_outcome_sol:      [166, 255, 39, 130, 0, 199, 176, 102]
bet_on_race_outcome_sol_with_affiliate: [162, 226, 32, 171, 157, 147, 34, 0]
```

### Claims
```
claim_winnings_sol:           [157, 233, 75, 112, 10, 227, 79, 110]
claim_refund_sol:             [85, 115, 109, 243, 66, 207, 167, 50]
claim_race_winnings_sol:      [173, 91, 39, 87, 16, 109, 74, 239]
claim_race_refund:            [216, 99, 112, 60, 31, 200, 243, 22]
claim_affiliate_sol:          [51, 211, 105, 127, 187, 20, 42, 54]
claim_creator_sol:            [196, 214, 98, 155, 30, 144, 246, 154]
```

### Resolution
```
propose_resolution:           [45, 156, 218, 45, 97, 142, 195, 207]
propose_resolution_host:      [231, 42, 89, 154, 12, 211, 187, 195]
resolve_market:               [155, 158, 165, 41, 75, 187, 231, 212]
resolve_market_host:          [246, 92, 168, 138, 195, 133, 35, 173]
finalize_resolution:          [98, 97, 193, 148, 60, 155, 116, 147]
propose_race_resolution:      [203, 108, 235, 193, 240, 137, 215, 65]
resolve_race:                 [60, 135, 191, 89, 203, 186, 186, 11]
finalize_race_resolution:     [146, 21, 166, 147, 108, 192, 182, 202]
```

### Disputes
```
flag_dispute:                 [113, 5, 35, 53, 133, 103, 172, 240]
flag_race_dispute:            [85, 91, 201, 233, 28, 172, 154, 209]
vote_council:                 [248, 87, 174, 48, 62, 64, 184, 139]
vote_council_race:            [92, 232, 126, 193, 185, 189, 184, 138]
change_council_vote:          [27, 136, 221, 180, 254, 229, 245, 159]
```

### Affiliates
```
register_affiliate:           [224, 238, 125, 174, 82, 232, 65, 56]
toggle_affiliate:             [18, 42, 154, 185, 118, 107, 54, 163]
```

### Whitelist
```
add_to_whitelist:             [157, 211, 249, 196, 223, 74, 217, 33]
remove_from_whitelist:        [77, 84, 184, 234, 89, 212, 63, 73]
create_race_whitelist:        [78, 211, 134, 187, 51, 166, 43, 12]
add_to_race_whitelist:        [129, 34, 113, 209, 178, 141, 77, 135]
remove_from_race_whitelist:   [227, 194, 80, 49, 207, 9, 42, 155]
```

### Creator Profiles
```
create_creator_profile:       [55, 147, 166, 217, 217, 194, 144, 45]
update_creator_profile:       [63, 59, 104, 81, 205, 150, 223, 52]
```

---

## Fee Structure

| Layer | Creation Fee | Platform Fee | Affiliate Fee | Creator Fee (max) |
|-------|-------------|--------------|---------------|-------------------|
| Official | 0.1 SOL | 2.5% (250 bps) | 1% (100 bps) | 0.5% (50 bps) |
| Lab | 0.04 SOL | 3% (300 bps) | 1% (100 bps) | 0.5% (50 bps) |
| Private | 0.04 SOL | 2% (200 bps) | 1% (100 bps) | 0.5% (50 bps) |

**Fee Distribution** (from platform fee on claims):
```
Platform Fee (e.g., 3%)
├── Affiliate Share (1%)     → Affiliate PDA
├── Creator Share (0.5%)     → SolTreasury (for creator claim)
└── Protocol Share (1.5%)    → Staking Vault or SolTreasury
```

---

## Timing Rules (v6.2)

### Rule A: Event-Based Markets
```
betting_close_time <= event_time - 12 hours (minimum)
betting_close_time <= event_time - 24 hours (recommended)
```

### Rule B: Measurement-Period Markets
```
betting_close_time < measurement_start_time (CRITICAL)
```

### Betting Freeze
```
No bets accepted within: 300 seconds (5 min) before closing_time
```

### Dispute Window
```
After resolution proposed: 86400 seconds (24 hours) for disputes
```

---

## Pari-mutuel Math

### Payout Calculation
```
gross_payout = (user_bet / winning_pool) × total_pool
profit = gross_payout - user_bet
platform_fee = profit × (platform_fee_bps / 10000)
net_payout = gross_payout - platform_fee
```

### Odds Calculation
```
yes_odds_percent = yes_pool / (yes_pool + no_pool) × 100
implied_payout_multiplier = total_pool / winning_pool
```

### Example
```
Total Pool: 100 SOL (60 YES, 40 NO)
User bets 10 SOL on YES
YES wins

gross_payout = (10 / 60) × 100 = 16.67 SOL
profit = 16.67 - 10 = 6.67 SOL
platform_fee (3%) = 6.67 × 0.03 = 0.20 SOL
net_payout = 16.67 - 0.20 = 16.47 SOL
```

---

## All 62 MCP Tools by Category

### Market Reading (6 tools)
| Tool | Purpose |
|------|---------|
| `list_markets` | List boolean markets with status/layer filters |
| `get_market` | Get detailed market info by public key |
| `get_quote` | Calculate bet payout/odds for boolean market |
| `list_race_markets` | List multi-outcome race markets |
| `get_race_market` | Get race market details |
| `get_race_quote` | Calculate race bet payout by outcome |

### Market Creation (8 tools)
| Tool | Purpose |
|------|---------|
| `preview_create_market` | Validate + show costs before building |
| `build_create_lab_market_transaction` | Build Lab market creation tx |
| `build_create_private_market_transaction` | Build Private market creation tx |
| `build_create_race_market_transaction` | Build race market creation tx |
| `get_creation_fees` | Get creation fees by layer |
| `get_platform_fees` | Get platform fees by layer |
| `get_timing_rules` | Get v6.2 timing rule details |
| `generate_invite_hash` | Generate random invite hash |

### Betting (2 tools)
| Tool | Purpose |
|------|---------|
| `build_bet_transaction` | Build bet tx for boolean market |
| `build_race_bet_transaction` | Build bet tx for race market |

### Claims (6 tools)
| Tool | Purpose |
|------|---------|
| `build_claim_winnings_transaction` | Claim boolean market winnings |
| `build_claim_refund_transaction` | Claim boolean market refund |
| `build_claim_race_winnings_transaction` | Claim race market winnings |
| `build_claim_race_refund_transaction` | Claim race market refund |
| `build_claim_affiliate_transaction` | Claim affiliate earnings |
| `build_batch_claim_transaction` | Claim multiple positions at once |

### Resolution System (6 tools)
| Tool | Purpose |
|------|---------|
| `build_propose_resolution_transaction` | Propose boolean market outcome |
| `build_resolve_market_transaction` | Directly resolve boolean market |
| `build_finalize_resolution_transaction` | Finalize after dispute window |
| `build_propose_race_resolution_transaction` | Propose race outcome |
| `build_resolve_race_transaction` | Directly resolve race market |
| `build_finalize_race_resolution_transaction` | Finalize race resolution |

### Resolution Reading (3 tools)
| Tool | Purpose |
|------|---------|
| `get_resolution_status` | Market resolution state |
| `get_disputed_markets` | List disputed markets |
| `get_markets_awaiting_resolution` | Pending resolution markets |

### Disputes (4 tools)
| Tool | Purpose |
|------|---------|
| `build_flag_dispute_transaction` | Challenge resolution (requires bond) |
| `build_flag_race_dispute_transaction` | Challenge race resolution |
| `build_vote_council_transaction` | Council vote on dispute |
| `build_vote_council_race_transaction` | Council vote on race dispute |

### Whitelist Management (5 tools)
| Tool | Purpose |
|------|---------|
| `build_add_to_whitelist_transaction` | Add user to private market |
| `build_remove_from_whitelist_transaction` | Remove user from whitelist |
| `build_create_race_whitelist_transaction` | Create race whitelist |
| `build_add_to_race_whitelist_transaction` | Add user to race whitelist |
| `build_remove_from_race_whitelist_transaction` | Remove from race whitelist |

### Creator Profiles (3 tools)
| Tool | Purpose |
|------|---------|
| `build_create_creator_profile_transaction` | Create on-chain profile |
| `build_update_creator_profile_transaction` | Update profile settings |
| `build_claim_creator_transaction` | Claim creator fees |

### Market Management (4 tools)
| Tool | Purpose |
|------|---------|
| `build_close_market_transaction` | Close betting on market |
| `build_extend_market_transaction` | Extend market deadline |
| `build_close_race_market_transaction` | Close race market |
| `build_extend_race_market_transaction` | Extend race deadline |

### Affiliates (10 tools)
| Tool | Purpose |
|------|---------|
| `check_affiliate_code` | Check if code is available |
| `suggest_affiliate_codes` | Generate code suggestions |
| `get_affiliate_info` | Get affiliate by code |
| `get_my_affiliates` | Get affiliates by wallet |
| `get_referrals` | Get referrals for code |
| `get_agent_network_stats` | Network-wide statistics |
| `format_affiliate_link` | Generate referral link |
| `get_commission_info` | Commission structure |
| `build_register_affiliate_transaction` | Register as affiliate |
| `build_toggle_affiliate_transaction` | Toggle affiliate status |

### Positions & Validation (4 tools)
| Tool | Purpose |
|------|---------|
| `get_positions` | Get user positions + stats |
| `get_claimable` | Get claimable positions |
| `validate_market_params` | Validate v6.2 timing rules |
| `validate_bet` | Validate bet constraints |

### Simulation (1 tool)
| Tool | Purpose |
|------|---------|
| `simulate_transaction` | Pre-sign verification |

---

## Transaction Signing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI AGENT                                │
│  (Claude, GPT, etc. via MCP)                                    │
│                                                                 │
│  1. Agent calls build_*_transaction tool                        │
│  2. MCP returns unsigned base64 transaction                     │
│  3. Agent returns transaction to user/dApp                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (base64 unsigned tx)
┌─────────────────────────────────────────────────────────────────┐
│                         USER WALLET                             │
│  (Phantom, Solflare, etc.)                                      │
│                                                                 │
│  4. Wallet decodes and displays transaction                     │
│  5. User reviews and approves                                   │
│  6. Wallet signs with private key                               │
│  7. Wallet sends to Solana network                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (signed tx)
┌─────────────────────────────────────────────────────────────────┐
│                      SOLANA NETWORK                             │
│                                                                 │
│  8. Transaction executes on-chain                               │
│  9. Returns signature/confirmation                              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Security Principle
> **Agent builds, user signs.** The AI agent NEVER has access to private keys.
> All transactions require explicit user approval in their wallet.

### Integration Options

**1. Deep Links (Mobile)**
```
phantom://sign?tx={base64_encoded_transaction}
```

**2. Wallet Adapter (Web)**
```javascript
const tx = Transaction.from(Buffer.from(base64Tx, 'base64'));
const signature = await wallet.signAndSendTransaction(tx);
```

**3. Automated Wallets (Agents)**
For autonomous agents, use policy-controlled signing:
- Turnkey TEE wallets
- Crossmint agent wallets
- Privy embedded wallets

---

## Common RPC Filters

### List All Markets
```json
{
  "filters": [
    { "memcmp": { "offset": 0, "bytes": "<market_discriminator_base58>" } }
  ]
}
```

### List Markets by Layer
```json
{
  "filters": [
    { "memcmp": { "offset": 0, "bytes": "<discriminator>" } },
    { "memcmp": { "offset": <layer_offset>, "bytes": "<layer_byte_base58>" } }
  ]
}
```

### List User Positions
```json
{
  "filters": [
    { "memcmp": { "offset": 0, "bytes": "<position_discriminator>" } },
    { "memcmp": { "offset": 8, "bytes": "<user_pubkey_base58>" } }
  ]
}
```

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 6000 | BettingClosed | Market closed for betting |
| 6001 | MarketNotActive | Market not in Active status |
| 6002 | MarketNotResolved | Cannot claim, not resolved |
| 6003 | InvalidOutcome | Invalid outcome specified |
| 6004 | InsufficientFunds | Not enough SOL |
| 6005 | AlreadyClaimed | Position already claimed |
| 6006 | NotCreator | Caller is not market creator |
| 6007 | NotOracle | Caller is not oracle host |
| 6008 | DisputeWindowActive | Cannot finalize during dispute |
| 6009 | NotWhitelisted | User not on whitelist |
| 6010 | InvalidInviteHash | Wrong invite hash |

---

## Best Practices for AI Agents

1. **Always validate before building** - Use `validate_market_params` and `validate_bet`
2. **Always simulate before returning** - Use `simulate_transaction` to catch errors
3. **Check market status** - Verify market is `Active` before betting, `Resolved` before claiming
4. **Respect timing rules** - Follow v6.2 buffer requirements
5. **Use affiliate codes** - Include `affiliate_code` to earn referral fees
6. **Return base64 transactions** - Never sign transactions, always return unsigned

---

## Usage Examples

### List Lab Markets
```json
{"name": "list_markets", "arguments": {"layer": "Lab", "status": "Active"}}
```

### List Official Markets
```json
{"name": "list_markets", "arguments": {"layer": "Official"}}
```

### Get Quote for Bet
```json
{"name": "get_quote", "arguments": {"market": "...", "side": "Yes", "amount": 1.0}}
```

### Build Bet Transaction
```json
{
  "name": "build_bet_transaction",
  "arguments": {
    "market": "MARKET_PUBLIC_KEY",
    "outcome": "yes",
    "amount_sol": 1.0,
    "user_wallet": "USER_WALLET",
    "affiliate_code": "CLAUDE"
  }
}
```

### Validate Market Timing
```json
{
  "name": "validate_market_params",
  "arguments": {
    "question": "Will ETH reach $5000 before Feb 2026?",
    "closing_time": "2026-01-30T18:00:00Z",
    "market_type": "event",
    "event_time": "2026-02-01T00:00:00Z"
  }
}
```

### Build Resolution Transaction
```json
{
  "name": "build_resolve_market_transaction",
  "arguments": {
    "market": "MARKET_PUBLIC_KEY",
    "outcome": true,
    "resolver_wallet": "CREATOR_WALLET"
  }
}
```

### Add to Private Market Whitelist
```json
{
  "name": "build_add_to_whitelist_transaction",
  "arguments": {
    "market": "MARKET_PUBLIC_KEY",
    "user_to_add": "INVITED_USER_WALLET",
    "creator_wallet": "CREATOR_WALLET"
  }
}
```

### Register as Affiliate
```json
{
  "name": "build_register_affiliate_transaction",
  "arguments": {
    "code": "MYAGENT",
    "user_wallet": "AGENT_WALLET"
  }
}
```

---

## Response Format

All MCP tools return JSON in this format:

### Success Response
```json
{
  "success": true,
  "network": "mainnet-beta",
  "programId": "DW4o8AoSXnSudjZhwo4ixkmVUw2Bnv5FDPYF9LgsS5YY",
  "transaction": {
    "serialized": "BASE64_ENCODED_TRANSACTION",
    "positionPda": "POSITION_PDA"
  },
  "simulation": {
    "success": true,
    "unitsConsumed": 50000
  },
  "instructions": "Sign the transaction with your wallet..."
}
```

### Error Response
```json
{
  "success": false,
  "error": "Market is not active"
}
```

---

## Discriminator Reference (for RPC filters)

To query accounts directly via RPC, use these discriminators:

| Account | Discriminator (base58) |
|---------|------------------------|
| Market | `2jJJqsS1PoYf` |
| RaceMarket | `CXsUTxT6Bc8V` |
| UserPosition | Filter by `user` field at offset 8 |
| RacePosition | Filter by `user` field at offset 8 |
| Affiliate | Filter by `owner` field at offset 8 |

### Example: List All Markets via RPC
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getProgramAccounts",
  "params": [
    "DW4o8AoSXnSudjZhwo4ixkmVUw2Bnv5FDPYF9LgsS5YY",
    {
      "encoding": "base64",
      "filters": [
        {"dataSize": 800},
        {"memcmp": {"offset": 0, "bytes": "2jJJqsS1PoYf"}}
      ]
    }
  ]
}
```

---

## Changelog

- **v4.0.0** (Jan 2026): Full protocol coverage with 62 tools, market creation, affiliate network
- **v3.0.0**: Added race markets, resolution system
- **v2.0.0**: Added mainnet support, transaction builders
- **v1.0.0**: Initial release with read-only tools
