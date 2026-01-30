# Baozi MCP Server - IDL Coverage Analysis

**Generated**: January 30, 2026
**IDL Version**: baozi_markets_v4_7_6
**MCP Version**: 4.0.0
**Total Tools**: 66

---

## Summary

| Category | IDL Instructions | MCP Tools | Coverage |
|----------|------------------|-----------|----------|
| **User Operations** | 48 | 66 | 100%+ |
| **Admin Operations** | 24 | 0 | N/A (not for agents) |
| **Total** | 72 | 66 | - |

> Note: MCP has more tools than IDL instructions because it includes read operations, validation, simulation, and helper tools.

---

## Private Market Support

The MCP fully supports private (invite-only) markets:

| Tool | Purpose |
|------|---------|
| `build_create_private_market_transaction` | Create invite-only market |
| `generate_invite_hash` | Generate access hash |
| `build_add_to_whitelist_transaction` | Add user to whitelist |
| `build_remove_from_whitelist_transaction` | Remove user from whitelist |
| `build_create_race_whitelist_transaction` | Create race market whitelist |
| `build_add_to_race_whitelist_transaction` | Whitelist for race markets |
| `build_remove_from_race_whitelist_transaction` | Remove from race whitelist |

### Private Market Flow
```
1. Creator calls generate_invite_hash → Gets 64-char hex
2. Creator calls build_create_private_market_transaction → Market created
3. Creator shares invite link: baozi.ooo/private/market/{pda}?invite={hash}
4. OR: Creator calls build_add_to_whitelist_transaction for each user
5. Whitelisted users can bet on the market
```

---

## All 66 Tools by Category

### Market Reading (6 tools)
| Tool | Purpose |
|------|---------|
| `list_markets` | List all boolean markets with filtering |
| `get_market` | Get detailed market info |
| `get_quote` | Calculate bet payout/odds |
| `list_race_markets` | List race markets |
| `get_race_market` | Get race market details |
| `get_race_quote` | Calculate race bet payout |

### Market Creation (8 tools)
| Tool | IDL Instruction |
|------|-----------------|
| `preview_create_market` | Validates + shows costs |
| `build_create_lab_market_transaction` | `create_lab_market_sol` |
| `build_create_private_market_transaction` | `create_private_table_sol` |
| `build_create_race_market_transaction` | `create_race_market_sol` |
| `get_creation_fees` | - |
| `get_platform_fees` | - |
| `get_timing_rules` | - |
| `generate_invite_hash` | - |

### Betting (2 tools)
| Tool | IDL Instructions |
|------|------------------|
| `build_bet_transaction` | `place_bet_sol`, `place_bet_sol_with_affiliate` |
| `build_race_bet_transaction` | `bet_on_race_outcome_sol`, `bet_on_race_outcome_sol_with_affiliate` |

### Claims (6 tools)
| Tool | IDL Instruction |
|------|-----------------|
| `build_claim_winnings_transaction` | `claim_winnings_sol` |
| `build_claim_refund_transaction` | `claim_refund_sol` |
| `build_claim_race_winnings_transaction` | `claim_race_winnings_sol` |
| `build_claim_race_refund_transaction` | `claim_race_refund` |
| `build_claim_affiliate_transaction` | `claim_affiliate_sol` |
| `build_batch_claim_transaction` | Multi-claim helper |

### Resolution System (6 tools)
| Tool | IDL Instruction |
|------|-----------------|
| `build_propose_resolution_transaction` | `propose_resolution` |
| `build_resolve_market_transaction` | `resolve_market` |
| `build_finalize_resolution_transaction` | `finalize_resolution` |
| `build_propose_race_resolution_transaction` | `propose_race_resolution` |
| `build_resolve_race_transaction` | `resolve_race` |
| `build_finalize_race_resolution_transaction` | `finalize_race_resolution` |

### Resolution Reading (3 tools)
| Tool | Purpose |
|------|---------|
| `get_resolution_status` | Market resolution state |
| `get_disputed_markets` | List disputed markets |
| `get_markets_awaiting_resolution` | Pending resolution |

### Disputes (4 tools)
| Tool | IDL Instruction |
|------|-----------------|
| `build_flag_dispute_transaction` | `flag_dispute` |
| `build_flag_race_dispute_transaction` | `flag_race_dispute` |
| `build_vote_council_transaction` | `vote_council` |
| `build_vote_council_race_transaction` | `vote_council_race` |

### Whitelist Management (5 tools)
| Tool | IDL Instruction |
|------|-----------------|
| `build_add_to_whitelist_transaction` | `add_to_whitelist` |
| `build_remove_from_whitelist_transaction` | `remove_from_whitelist` |
| `build_create_race_whitelist_transaction` | `create_race_whitelist` |
| `build_add_to_race_whitelist_transaction` | `add_to_race_whitelist` |
| `build_remove_from_race_whitelist_transaction` | `remove_from_race_whitelist` |

### Creator Profiles (3 tools)
| Tool | IDL Instruction |
|------|-----------------|
| `build_create_creator_profile_transaction` | `create_creator_profile` |
| `build_update_creator_profile_transaction` | `update_creator_profile` |
| `build_claim_creator_transaction` | `claim_creator_sol` |

### Market Management (6 tools)
| Tool | IDL Instruction |
|------|-----------------|
| `build_close_market_transaction` | `close_market` |
| `build_extend_market_transaction` | `extend_market` |
| `build_close_race_market_transaction` | `close_race_market` |
| `build_extend_race_market_transaction` | `extend_race_market` |
| `build_cancel_market_transaction` | `cancel_market` |
| `build_cancel_race_transaction` | `cancel_race` |

### Affiliates (10 tools)
| Tool | IDL Instruction |
|------|-----------------|
| `check_affiliate_code` | Read |
| `suggest_affiliate_codes` | Helper |
| `get_affiliate_info` | Read |
| `get_my_affiliates` | Read |
| `get_referrals` | Read |
| `get_agent_network_stats` | Stats |
| `format_affiliate_link` | Helper |
| `get_commission_info` | Info |
| `build_register_affiliate_transaction` | `register_affiliate` |
| `build_toggle_affiliate_transaction` | `toggle_affiliate` |

### Positions & Validation (4 tools)
| Tool | Purpose |
|------|---------|
| `get_positions` | User positions |
| `get_claimable` | Claimable positions |
| `validate_market_params` | v6.2 timing rules |
| `validate_bet` | Bet validation |

### Simulation (1 tool)
| Tool | Purpose |
|------|---------|
| `simulate_transaction` | Pre-sign check |

---

## Admin-Only Instructions (Not for AI Agents)

These 24 instructions require admin/guardian keys and are NOT exposed via MCP:

| Category | Instructions |
|----------|-------------|
| **Initialization** | `initialize`, `init_sol_treasury`, `init_revenue_config`, `init_clawdbot_oracle_config` |
| **Settings** | `update_admin`, `update_guardian`, `update_treasury`, `update_fees`, `update_lab_settings`, `update_private_settings`, `update_affiliate_settings` |
| **Protocol Control** | `pause_protocol`, `pause_market`, `set_betting_freeze`, `set_cancel_threshold`, `set_dispute_config`, `set_staking_vault`, `set_affiliate_bonus_budgets`, `set_clawdbot_oracle` |
| **Market Admin** | `create_market_sol` (Official only) |
| **Dispute Admin** | `admin_resolve_dispute`, `admin_resolve_race_dispute` |
| **Other** | `verify_creator`, `grant_affiliate_bonus_sol`, `sweep_dust_sol`, `sweep_race_dust_sol` |

---

## Transaction Signing Flow

```
AI Agent ──► MCP Tool ──► Returns unsigned tx (base64)
                              │
                              ▼
                         User/Wallet ──► Signs ──► Solana Network
```

### Integration Options:

1. **Deep Links**: `phantom://sign?tx={base64}`
2. **Wallet Adapter**: `await wallet.signAndSendTransaction(tx)`
3. **Automated Wallets**: Turnkey, Crossmint, Privy (for autonomous agents)

---

## Usage Examples

### Create Private Market
```json
{
  "name": "build_create_private_market_transaction",
  "arguments": {
    "question": "Will our team hit Q1 targets?",
    "closing_time": "2026-03-31T00:00:00Z",
    "creator_wallet": "...",
    "invite_hash": "abc123..."
  }
}
```

### Add User to Whitelist
```json
{
  "name": "build_add_to_whitelist_transaction",
  "arguments": {
    "market": "...",
    "user_to_add": "FriendWalletAddress...",
    "creator_wallet": "..."
  }
}
```

### List Lab Markets
```json
{"name": "list_markets", "arguments": {"layer": "Lab", "status": "Active"}}
```

### Get Quote
```json
{"name": "get_quote", "arguments": {"market": "...", "side": "Yes", "amount": 1.0}}
```

### Build Bet Transaction
```json
{
  "name": "build_bet_transaction",
  "arguments": {
    "market": "...",
    "outcome": "yes",
    "amount_sol": 1.0,
    "user_wallet": "...",
    "affiliate_code": "CLAUDE"
  }
}
```
