# Baozi Prediction Markets Skill

Use this skill when helping users with Baozi prediction markets on Solana.

## Quick Reference

- **npm**: https://www.npmjs.com/package/@baozi.bet/mcp-server
- **GitHub**: https://github.com/bolivian-peru/baozi-mcp
- **Website**: https://baozi.ooo
- **Program ID**: `DW4o8AoSXnSudjZhwo4ixkmVUw2Bnv5FDPYF9LgsS5YY`
- **Network**: Solana Mainnet

## Install MCP Server

### npm (Recommended)

```bash
# Install globally
npm install -g @baozi.bet/mcp-server

# Or run directly
npx @baozi.bet/mcp-server
```

### Claude Desktop Config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "baozi": {
      "command": "npx",
      "args": ["@baozi.bet/mcp-server"]
    }
  }
}
```

### Clawdbot / Custom Agents

```bash
mkdir -p ~/.clawdbot/skills/baozi
curl -sL https://raw.githubusercontent.com/bolivian-peru/baozi-mcp/main/skills/SKILL.md \
  -o ~/.clawdbot/skills/baozi/SKILL.md
```

## Market Types

### Boolean Markets (YES/NO)
- Simple binary outcomes
- Layers: Official (2.5% fee), Lab (3% fee), Private (2% fee)

### Race Markets (Multi-outcome)
- 2-10 outcomes
- Pari-mutuel odds

## Key Tools (66 total)

### Reading Markets
- `list_markets` - List boolean markets by layer/status
- `get_market` - Get market details
- `get_quote` - Calculate expected payout
- `list_race_markets` - List race markets
- `get_race_market` - Get race market details

### Betting
- `build_bet_transaction` - Build bet tx for boolean market
- `build_race_bet_transaction` - Build bet tx for race market

### Claims
- `build_claim_winnings_transaction` - Claim from resolved market
- `build_claim_refund_transaction` - Claim from cancelled market
- `build_batch_claim_transaction` - Claim multiple at once

### Market Creation
- `preview_create_market` - Validate params, show costs
- `build_create_lab_market_transaction` - Create Lab market (0.04 SOL)
- `build_create_private_market_transaction` - Create Private market
- `build_create_race_market_transaction` - Create Race market

### Positions
- `get_positions` - Get wallet betting positions
- `get_claimable` - Get claimable winnings/refunds

### Affiliates
- `check_affiliate_code` - Check code availability
- `get_affiliate_info` - Get affiliate account info
- `build_register_affiliate_transaction` - Register as affiliate

## Transaction Flow

```
1. Agent calls MCP tool (e.g., build_bet_transaction)
2. MCP returns unsigned transaction as base64
3. User signs with their wallet (Phantom, Solflare, etc.)
4. Transaction submitted to Solana

IMPORTANT: Agent never holds private keys.
```

## Fees

| Layer    | Platform Fee | Creation Fee |
|----------|-------------|--------------|
| Official | 2.5%        | 0.1 SOL      |
| Lab      | 3%          | 0.04 SOL     |
| Private  | 2%          | 0.04 SOL     |

## Parimutuel Rules (MUST ENFORCE)

### The Golden Rule
Bettors must NEVER have access to ANY information that could inform the outcome while betting is still open.

### Type A: Event-Based Markets
- Single point-in-time outcome (game, announcement, award)
- RULE: Close betting 24 HOURS BEFORE the event

### Type B: Measurement-Period Markets
- Data collected over a period (charts, weekly stats)
- RULE: Close betting BEFORE the measurement period STARTS

## Platform URLs

- Homepage: https://baozi.ooo
- Labs: https://baozi.ooo/labs
- Create Lab: https://baozi.ooo/labs/create
- Private: https://baozi.ooo/private
- My Bets: https://baozi.ooo/my-bets
- Leaderboard: https://baozi.ooo/leaderboard
- Affiliate: https://baozi.ooo/affiliate

## Resources

- **npm**: https://www.npmjs.com/package/@baozi.bet/mcp-server
- **GitHub**: https://github.com/bolivian-peru/baozi-mcp
- **Full docs**: https://baozi.ooo/mcp
- **SKILL.md page**: https://baozi.ooo/mcp/skill
- **Solscan**: https://solscan.io/account/DW4o8AoSXnSudjZhwo4ixkmVUw2Bnv5FDPYF9LgsS5YY
