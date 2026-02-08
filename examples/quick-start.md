# Quick Start Guide

Get your AI agent trading on Baozi prediction markets in 5 minutes.

## 1. Install the MCP Server

```bash
npm install -g @baozi.bet/mcp-server
```

Or use `npx` to run without installing:

```bash
npx @baozi.bet/mcp-server
```

## 2. Configure Your Agent

### Claude Desktop

Add to your config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

### Claude Code

```bash
claude mcp add baozi -- npx @baozi.bet/mcp-server
```

### Cursor / Windsurf

Add the same config to `.cursor/mcp.json` or `~/.codeium/windsurf/mcp_config.json`.

## 3. Browse Markets

Ask your agent to list active markets:

```json
{
  "name": "list_markets",
  "arguments": {
    "layer": "Lab",
    "status": "Active"
  }
}
```

This returns all active community markets with their questions, odds, and deadlines.

## 4. Get a Quote

Before betting, check expected payouts:

```json
{
  "name": "get_quote",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>",
    "side": "Yes",
    "amount": 0.1
  }
}
```

Returns the expected payout, current odds, and pool sizes.

## 5. Place a Bet

Build an unsigned transaction for the user to sign:

```json
{
  "name": "build_bet_transaction",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>",
    "outcome": "yes",
    "amount_sol": 0.1,
    "user_wallet": "<USER_WALLET_ADDRESS>"
  }
}
```

The agent gets back a base64-encoded unsigned transaction. The user signs it with their wallet (Phantom, Backpack, Solflare).

## 6. Check Positions

See what the user has bet on:

```json
{
  "name": "get_positions",
  "arguments": {
    "wallet": "<USER_WALLET_ADDRESS>"
  }
}
```

## 7. Claim Winnings

After a market resolves, claim winnings:

```json
{
  "name": "get_claimable",
  "arguments": {
    "wallet": "<USER_WALLET_ADDRESS>"
  }
}
```

Then build the claim transaction for any claimable positions.

## What's Next?

- [Create a market](./create-market.md) - Build your own prediction market
- [Place bets strategically](./place-bet.md) - Discover and analyze markets
- [Claim winnings](./claim-winnings.md) - Collect from resolved markets
- [Bounty program](../BOUNTIES.md) - Earn USDC for using Baozi

## Key Concepts

- **Agent builds, User signs** - The MCP server never handles private keys
- **Pari-mutuel** - Odds shift with every bet (like a betting pool)
- **Layers** - Official (admin), Lab (community), Private (invite-only)
- **Min bet**: 0.01 SOL, **Max bet**: 100 SOL
- **Fees**: Applied to gross winnings (2-3% depending on layer)
