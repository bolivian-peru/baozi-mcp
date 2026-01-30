# @baozi/mcp-server

**MCP (Model Context Protocol) server for Baozi prediction markets on Solana**

[![npm version](https://img.shields.io/npm/v/@baozi/mcp-server.svg)](https://www.npmjs.com/package/@baozi/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This MCP server enables AI agents to interact with [Baozi](https://baozi.ooo) prediction markets on Solana. It provides **66 tools** for:

- **Market Discovery** - List and filter boolean/race markets
- **Quote Calculation** - Expected payouts with odds analysis
- **Transaction Building** - Unsigned transactions for betting, claims, resolution
- **Position Management** - View wallet positions and claimable winnings
- **Validation** - Enforce v6.2 timing rules before market creation

**Key Principle**: Agent builds, User signs. No private keys in agent.

```
AI Agent ──► MCP Tool ──► Unsigned Transaction (base64)
                              │
                              ▼
                         User Wallet ──► Signs ──► Solana Network
```

## Baozi Platform Links

| Page | URL | Description |
|------|-----|-------------|
| **Homepage** | [baozi.ooo](https://baozi.ooo) | Main platform |
| **Labs** | [baozi.ooo/labs](https://baozi.ooo/labs) | Community-created markets |
| **Official** | [baozi.ooo/official](https://baozi.ooo/official) | Official curated markets |
| **Leaderboard** | [baozi.ooo/leaderboard](https://baozi.ooo/leaderboard) | Top traders |
| **Portfolio** | [baozi.ooo/portfolio](https://baozi.ooo/portfolio) | Your positions |
| **Create Market** | [baozi.ooo/create](https://baozi.ooo/create) | Create new markets |

## Installation

### Claude Desktop

Add to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "baozi": {
      "command": "npx",
      "args": ["@baozi/mcp-server"]
    }
  }
}
```

### Claude Code

Add to your project's MCP configuration or run directly:

```bash
npx @baozi/mcp-server
```

## Tool Categories (66 Tools)

### Market Reading (6 tools)
| Tool | Description |
|------|-------------|
| `list_markets` | List boolean markets with filtering by layer/status |
| `get_market` | Get detailed market info by public key |
| `get_quote` | Calculate expected payout for a bet |
| `list_race_markets` | List multi-outcome race markets |
| `get_race_market` | Get race market details |
| `get_race_quote` | Calculate race bet payout |

### Betting (2 tools)
| Tool | Description |
|------|-------------|
| `build_bet_transaction` | Build unsigned bet tx (supports affiliate) |
| `build_race_bet_transaction` | Build unsigned race bet tx |

### Claims (6 tools)
| Tool | Description |
|------|-------------|
| `build_claim_winnings_transaction` | Claim winnings from resolved market |
| `build_claim_refund_transaction` | Claim refund from cancelled market |
| `build_claim_race_winnings_transaction` | Claim race market winnings |
| `build_claim_race_refund_transaction` | Claim race market refund |
| `build_claim_affiliate_transaction` | Claim affiliate earnings |
| `build_batch_claim_transaction` | Claim multiple positions at once |

### Market Creation (8 tools)
| Tool | Description |
|------|-------------|
| `preview_create_market` | Validate params and show costs |
| `build_create_lab_market_transaction` | Create Lab (community) market |
| `build_create_private_market_transaction` | Create Private (invite-only) market |
| `build_create_race_market_transaction` | Create Race (multi-outcome) market |
| `get_creation_fees` | Get fee structure by layer |
| `get_platform_fees` | Get platform fee rates |
| `get_timing_rules` | Get v6.2 timing constraints |
| `generate_invite_hash` | Generate hash for private markets |

### Resolution (6 tools)
| Tool | Description |
|------|-------------|
| `build_propose_resolution_transaction` | Propose market outcome |
| `build_resolve_market_transaction` | Direct resolve (creator) |
| `build_finalize_resolution_transaction` | Finalize after challenge period |
| `build_propose_race_resolution_transaction` | Propose race outcome |
| `build_resolve_race_transaction` | Resolve race market |
| `build_finalize_race_resolution_transaction` | Finalize race resolution |

### Disputes (4 tools)
| Tool | Description |
|------|-------------|
| `build_flag_dispute_transaction` | Flag disputed resolution |
| `build_flag_race_dispute_transaction` | Flag race dispute |
| `build_vote_council_transaction` | Council vote on dispute |
| `build_vote_council_race_transaction` | Council vote on race dispute |

### Whitelist Management (5 tools)
| Tool | Description |
|------|-------------|
| `build_add_to_whitelist_transaction` | Add user to private market |
| `build_remove_from_whitelist_transaction` | Remove from whitelist |
| `build_create_race_whitelist_transaction` | Create race whitelist |
| `build_add_to_race_whitelist_transaction` | Add to race whitelist |
| `build_remove_from_race_whitelist_transaction` | Remove from race whitelist |

### Creator Profiles (3 tools)
| Tool | Description |
|------|-------------|
| `build_create_creator_profile_transaction` | Create on-chain profile |
| `build_update_creator_profile_transaction` | Update profile settings |
| `build_claim_creator_transaction` | Claim creator fees |

### Market Management (6 tools)
| Tool | Description |
|------|-------------|
| `build_close_market_transaction` | Stop betting on market |
| `build_extend_market_transaction` | Extend market deadline |
| `build_close_race_market_transaction` | Close race market |
| `build_extend_race_market_transaction` | Extend race deadline |
| `build_cancel_market_transaction` | Cancel market (refunds enabled) |
| `build_cancel_race_transaction` | Cancel race market |

### Affiliates (10 tools)
| Tool | Description |
|------|-------------|
| `check_affiliate_code` | Check if code is available |
| `suggest_affiliate_codes` | Generate code suggestions |
| `get_affiliate_info` | Get affiliate account info |
| `get_my_affiliates` | List wallet's affiliates |
| `get_referrals` | List referred users |
| `get_agent_network_stats` | AI agent network stats |
| `format_affiliate_link` | Generate referral link |
| `get_commission_info` | Commission structure |
| `build_register_affiliate_transaction` | Register new affiliate |
| `build_toggle_affiliate_transaction` | Activate/deactivate |

### Positions & Validation (4 tools)
| Tool | Description |
|------|-------------|
| `get_positions` | Get wallet positions |
| `get_claimable` | Get claimable winnings/refunds |
| `validate_market_params` | Validate against v6.2 rules |
| `validate_bet` | Validate bet parameters |

### Simulation (1 tool)
| Tool | Description |
|------|-------------|
| `simulate_transaction` | Pre-sign simulation check |

### Resolution Status (3 tools)
| Tool | Description |
|------|-------------|
| `get_resolution_status` | Market resolution state |
| `get_disputed_markets` | List disputed markets |
| `get_markets_awaiting_resolution` | Pending resolution markets |

## Example Usage

### List Active Lab Markets
```json
{
  "name": "list_markets",
  "arguments": {
    "layer": "Lab",
    "status": "Active"
  }
}
```

### Get Bet Quote
```json
{
  "name": "get_quote",
  "arguments": {
    "market": "zDFuzWfkJVtmnxv2q668kfSPMq9byTsf36fo6zZ3nNy",
    "side": "Yes",
    "amount": 1.0
  }
}
```

### Build Bet Transaction
```json
{
  "name": "build_bet_transaction",
  "arguments": {
    "market": "zDFuzWfkJVtmnxv2q668kfSPMq9byTsf36fo6zZ3nNy",
    "outcome": "yes",
    "amount_sol": 1.0,
    "user_wallet": "YourWalletAddressHere",
    "affiliate_code": "CLAUDE"
  }
}
```

### Validate Market Before Creation
```json
{
  "name": "validate_market_params",
  "arguments": {
    "question": "Will BTC reach $100k in 2026?",
    "closing_time": "2026-06-01T00:00:00Z",
    "market_type": "event",
    "event_time": "2026-07-01T00:00:00Z"
  }
}
```

## Transaction Signing

The MCP server returns unsigned transactions. Integration options:

### 1. Phantom Deep Link
```
phantom://sign?transaction={base64_tx}
```

### 2. Wallet Adapter (Web)
```typescript
const tx = Transaction.from(Buffer.from(base64Tx, 'base64'));
await wallet.signAndSendTransaction(tx);
```

### 3. Automated Wallets (Agents)
- [Turnkey](https://turnkey.com) - Policy-controlled signing
- [Crossmint](https://crossmint.com) - AI agent wallets
- [Privy](https://privy.io) - Embedded wallets

## Technical Details

| Parameter | Value |
|-----------|-------|
| **Network** | Solana Mainnet |
| **Program ID** | `DW4o8AoSXnSudjZhwo4ixkmVUw2Bnv5FDPYF9LgsS5YY` |
| **IDL Version** | baozi_markets_v4_7_6 |
| **Betting Model** | Pari-mutuel |
| **Min Bet** | 0.01 SOL |
| **Max Bet** | 100 SOL |

### Fee Structure
| Layer | Platform Fee | Creation Fee |
|-------|-------------|--------------|
| Official | 2.5% | 0.1 SOL |
| Lab | 3% | 0.04 SOL |
| Private | 2% | 0.04 SOL |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npm start

# Type check
npm run typecheck
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HELIUS_RPC_URL` | Custom RPC endpoint | Public Solana RPC |
| `SOLANA_RPC_URL` | Alternative RPC | Public Solana RPC |
| `SOLANA_NETWORK` | Network selection | mainnet-beta |

## Resources

- **Platform**: [baozi.ooo](https://baozi.ooo)
- **Labs Markets**: [baozi.ooo/labs](https://baozi.ooo/labs)
- **Official Markets**: [baozi.ooo/official](https://baozi.ooo/official)
- **Leaderboard**: [baozi.ooo/leaderboard](https://baozi.ooo/leaderboard)
- **GitHub**: [github.com/bolivian-peru/baozi-mcp](https://github.com/bolivian-peru/baozi-mcp)
- **Solscan**: [Program on Solscan](https://solscan.io/account/DW4o8AoSXnSudjZhwo4ixkmVUw2Bnv5FDPYF9LgsS5YY)

## License

MIT
