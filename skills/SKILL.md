# Baozi Prediction Markets Skill

**Version**: 1.0.0
**MCP Server**: @baozi/mcp-server
**Platform**: [baozi.ooo](https://baozi.ooo)

## Overview

This skill enables AI agents to interact with Baozi prediction markets on Solana. Agents can list markets, calculate odds, build transactions, and manage positions - all without holding private keys.

## Quick Start

```bash
# Install MCP server
npx @baozi/mcp-server
```

## What Agents Can Do

| Action | Tool | Description |
|--------|------|-------------|
| List markets | `list_markets` | Get active/closed markets by layer |
| Get quotes | `get_quote` | Calculate payout before betting |
| Build bets | `build_bet_transaction` | Create unsigned tx for user signing |
| Check positions | `get_positions` | View wallet's bets across markets |
| Create markets | `build_create_lab_market_transaction` | 0.04 SOL, earn 0.5% on winnings |
| Validate timing | `validate_market_params` | Ensure v6.2 rules pass |

## Transaction Flow

```
Agent reads market → Calculates quote → Builds transaction → Returns base64
                                                                   ↓
User receives base64 → Signs with wallet → Submits to Solana → Bet placed
```

**Key Principle**: Agent builds, User signs. No private keys in agent.

## Common Commands

### List Active Lab Markets
```json
{"name": "list_markets", "arguments": {"layer": "Lab", "status": "Active"}}
```

### Get Bet Quote (1 SOL on YES)
```json
{"name": "get_quote", "arguments": {"market": "MARKET_PDA", "side": "Yes", "amount": 1.0}}
```

### Build Bet Transaction
```json
{
  "name": "build_bet_transaction",
  "arguments": {
    "market": "MARKET_PDA",
    "outcome": "yes",
    "amount_sol": 1.0,
    "user_wallet": "USER_WALLET",
    "affiliate_code": "YOURCODE"
  }
}
```

### Check Wallet Positions
```json
{"name": "get_positions", "arguments": {"wallet": "WALLET_ADDRESS"}}
```

### Create Lab Market
```json
{
  "name": "build_create_lab_market_transaction",
  "arguments": {
    "question": "Will ETH hit $5000 by March 2026?",
    "closing_time": "2026-03-01T00:00:00Z",
    "market_type": "event",
    "event_time": "2026-03-15T00:00:00Z",
    "creator_wallet": "CREATOR_WALLET"
  }
}
```

## Market Layers

| Layer | Fee | Creation Cost | Description |
|-------|-----|---------------|-------------|
| Official | 2.5% | 0.1 SOL | Admin-curated markets |
| Lab | 3% | 0.04 SOL | Community markets (DYOR) |
| Private | 2% | 0.04 SOL | Invite-only tables |

## Affiliate System

Agents can earn 1% commission on all bets placed through their affiliate code:

1. Register: `build_register_affiliate_transaction`
2. Share code with users
3. Claim earnings: `build_claim_affiliate_transaction`

## Platform Links

- **Official Markets**: [baozi.ooo](https://baozi.ooo)
- **Labs**: [baozi.ooo/labs](https://baozi.ooo/labs)
- **Private Tables**: [baozi.ooo/private](https://baozi.ooo/private)
- **My Bets**: [baozi.ooo/my-bets](https://baozi.ooo/my-bets)
- **Leaderboard**: [baozi.ooo/leaderboard](https://baozi.ooo/leaderboard)

## Technical Details

| Parameter | Value |
|-----------|-------|
| Network | Solana Mainnet |
| Program ID | `DW4o8AoSXnSudjZhwo4ixkmVUw2Bnv5FDPYF9LgsS5YY` |
| Betting Model | Pari-mutuel |
| Min Bet | 0.01 SOL |
| Max Bet | 100 SOL |

## All 66 Tools

### Reading (6)
`list_markets`, `get_market`, `get_quote`, `list_race_markets`, `get_race_market`, `get_race_quote`

### Betting (2)
`build_bet_transaction`, `build_race_bet_transaction`

### Claims (6)
`build_claim_winnings_transaction`, `build_claim_refund_transaction`, `build_claim_race_winnings_transaction`, `build_claim_race_refund_transaction`, `build_claim_affiliate_transaction`, `build_batch_claim_transaction`

### Market Creation (8)
`preview_create_market`, `build_create_lab_market_transaction`, `build_create_private_market_transaction`, `build_create_race_market_transaction`, `get_creation_fees`, `get_platform_fees`, `get_timing_rules`, `generate_invite_hash`

### Resolution (6)
`build_propose_resolution_transaction`, `build_resolve_market_transaction`, `build_finalize_resolution_transaction`, `build_propose_race_resolution_transaction`, `build_resolve_race_transaction`, `build_finalize_race_resolution_transaction`

### Disputes (4)
`build_flag_dispute_transaction`, `build_flag_race_dispute_transaction`, `build_vote_council_transaction`, `build_vote_council_race_transaction`

### Whitelist (5)
`build_add_to_whitelist_transaction`, `build_remove_from_whitelist_transaction`, `build_create_race_whitelist_transaction`, `build_add_to_race_whitelist_transaction`, `build_remove_from_race_whitelist_transaction`

### Creator (3)
`build_create_creator_profile_transaction`, `build_update_creator_profile_transaction`, `build_claim_creator_transaction`

### Management (6)
`build_close_market_transaction`, `build_extend_market_transaction`, `build_close_race_market_transaction`, `build_extend_race_market_transaction`, `build_cancel_market_transaction`, `build_cancel_race_transaction`

### Affiliates (10)
`check_affiliate_code`, `suggest_affiliate_codes`, `get_affiliate_info`, `get_my_affiliates`, `get_referrals`, `get_agent_network_stats`, `format_affiliate_link`, `get_commission_info`, `build_register_affiliate_transaction`, `build_toggle_affiliate_transaction`

### Validation (4)
`get_positions`, `get_claimable`, `validate_market_params`, `validate_bet`

### Other (3)
`simulate_transaction`, `get_resolution_status`, `get_disputed_markets`, `get_markets_awaiting_resolution`

## Installation for Agents

```bash
# Add to Claude Desktop config
{
  "mcpServers": {
    "baozi": {
      "command": "npx",
      "args": ["@baozi/mcp-server"]
    }
  }
}
```

## Source

- **GitHub**: [github.com/bolivian-peru/baozi-mcp](https://github.com/bolivian-peru/baozi-mcp)
- **npm**: [@baozi/mcp-server](https://www.npmjs.com/package/@baozi/mcp-server)
