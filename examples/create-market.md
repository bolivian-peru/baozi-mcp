# Create a Market

Step-by-step guide to creating a prediction market on Baozi.

## Prerequisites

- MCP server installed (`npm i -g @baozi.bet/mcp-server`)
- A Solana wallet with at least 0.02 SOL (0.01 creation fee + gas)
- A CreatorProfile on-chain (see Step 0)

## Step 0: Create Your Profile (One-time)

```json
{
  "name": "build_create_creator_profile_transaction",
  "arguments": {
    "wallet": "<YOUR_WALLET>",
    "display_name": "My Agent",
    "fee_bps": 100
  }
}
```

`fee_bps: 100` = 1% creator fee on winnings. Max is 200 (2%) for Lab markets.

## Step 1: Validate Your Market Idea

Before creating, validate your parameters:

```json
{
  "name": "validate_market_params",
  "arguments": {
    "question": "Will BTC be above $120,000 on March 1, 2026?",
    "closing_time": "2026-02-28T00:00:00Z",
    "market_type": "event",
    "event_time": "2026-03-01T00:00:00Z"
  }
}
```

### Market Creation Rules

**Golden Rule:** Bettors must have NO information advantage while betting is open.

- **Event-based:** Close betting 24 hours before the event
- **Measurement period:** Close betting before the period starts
- Must have an objective, verifiable outcome
- Must specify a data source (CoinGecko, ESPN, etc.)

## Step 2: Preview Costs

```json
{
  "name": "preview_create_market",
  "arguments": {
    "question": "Will BTC be above $120,000 on March 1, 2026?",
    "closing_time": "2026-02-28T00:00:00Z",
    "market_type": "event",
    "event_time": "2026-03-01T00:00:00Z",
    "layer": "Lab",
    "creator_wallet": "<YOUR_WALLET>"
  }
}
```

Returns the total cost (creation fee + rent) and validates all parameters.

## Step 3: Build the Transaction

### Boolean Market (Yes/No)

```json
{
  "name": "build_create_lab_market_transaction",
  "arguments": {
    "question": "Will BTC be above $120,000 on March 1, 2026?",
    "closing_time": "2026-02-28T00:00:00Z",
    "market_type": "event",
    "event_time": "2026-03-01T00:00:00Z",
    "creator_wallet": "<YOUR_WALLET>"
  }
}
```

### Race Market (Multiple Outcomes)

```json
{
  "name": "build_create_race_market_transaction",
  "arguments": {
    "question": "Which token gains the most in February 2026?",
    "outcomes": ["SOL", "ETH", "BTC", "AVAX"],
    "closing_time": "2026-01-31T23:59:00Z",
    "market_type": "measurement",
    "measurement_start": "2026-02-01T00:00:00Z",
    "measurement_end": "2026-02-28T23:59:00Z",
    "creator_wallet": "<YOUR_WALLET>",
    "layer": "Lab"
  }
}
```

### Private Market (Invite-Only)

```json
{
  "name": "generate_invite_hash",
  "arguments": {}
}
```

Use the returned hash when creating:

```json
{
  "name": "build_create_private_market_transaction",
  "arguments": {
    "question": "Will our team ship the feature by Friday?",
    "closing_time": "2026-02-13T17:00:00Z",
    "market_type": "event",
    "event_time": "2026-02-14T00:00:00Z",
    "creator_wallet": "<YOUR_WALLET>",
    "invite_hash": "<GENERATED_HASH>"
  }
}
```

## Step 4: Sign and Submit

The tool returns a base64-encoded unsigned transaction. The user signs it with their wallet and submits it to Solana.

## Step 5: Share Your Market

After creation, your market is live at:

```
https://baozi.bet/labs/market/<MARKET_PUBLIC_KEY>
```

## Good Market Examples

| Question | Type | Data Source |
|----------|------|-------------|
| "Will BTC be above $120k on March 1?" | Event | CoinGecko |
| "Will the Fed cut rates in March 2026?" | Event | Federal Reserve |
| "Which movie tops the box office Feb 14-16?" | Measurement | Box Office Mojo |
| "Will Netflix #1 show change next week?" | Measurement | Netflix Top 10 |

## Earning as a Creator

- You earn your `fee_bps` on every winning claim in your market
- Fees are collected automatically and claimable via `build_claim_creator_transaction`
- Maximum creator fee: 2% for Lab, 1% for Private
