# Place a Bet

How to discover markets, analyze odds, and place bets using the MCP server.

## Step 1: Discover Markets

### List active boolean markets

```json
{
  "name": "list_markets",
  "arguments": {
    "layer": "Lab",
    "status": "Active"
  }
}
```

### List active race markets

```json
{
  "name": "list_race_markets",
  "arguments": {
    "layer": "Lab",
    "status": "Active"
  }
}
```

### Get details on a specific market

```json
{
  "name": "get_market",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>"
  }
}
```

Returns the question, current pool sizes, odds, close time, and status.

## Step 2: Analyze the Odds

### Get a quote before betting

```json
{
  "name": "get_quote",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>",
    "side": "Yes",
    "amount": 1.0
  }
}
```

Returns:
- **Expected payout** - How much you'd win if your side is correct
- **Current odds** - Yes/No percentage split
- **Pool sizes** - Total SOL on each side

### For race markets

```json
{
  "name": "get_race_quote",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>",
    "outcome_index": 0,
    "amount": 1.0
  }
}
```

### Tips for analyzing odds

- **Pari-mutuel** means odds shift with every bet
- Early bets on undervalued outcomes get better payouts
- Check the pool balance - heavily one-sided markets offer better returns on the minority side
- Consider the close time - odds can shift significantly before close

## Step 3: Validate Your Bet

Optional but recommended - check if your bet is valid before building:

```json
{
  "name": "validate_bet",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>",
    "amount_sol": 1.0,
    "outcome": "yes"
  }
}
```

Checks:
- Market is still active (not closed or resolved)
- Amount is within min/max (0.01 - 100 SOL)
- Outcome is valid for the market type

## Step 4: Build the Bet Transaction

### Boolean market bet

```json
{
  "name": "build_bet_transaction",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>",
    "outcome": "yes",
    "amount_sol": 1.0,
    "user_wallet": "<YOUR_WALLET>"
  }
}
```

### With affiliate code (supports the referral network)

```json
{
  "name": "build_bet_transaction",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>",
    "outcome": "yes",
    "amount_sol": 1.0,
    "user_wallet": "<YOUR_WALLET>",
    "affiliate_code": "CLAUDE"
  }
}
```

### Race market bet

```json
{
  "name": "build_race_bet_transaction",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>",
    "outcome_index": 2,
    "amount_sol": 0.5,
    "user_wallet": "<YOUR_WALLET>"
  }
}
```

## Step 5: Sign and Submit

The tool returns a base64-encoded unsigned transaction. The user signs it with their wallet (Phantom, Backpack, Solflare) and submits to Solana.

## Step 6: Track Your Position

After betting, check your positions:

```json
{
  "name": "get_positions",
  "arguments": {
    "wallet": "<YOUR_WALLET>"
  }
}
```

## Betting Strategy Notes

- **Min bet**: 0.01 SOL
- **Max bet**: 100 SOL
- **Fees**: Applied to gross winnings only (2-3% depending on layer), not on losing bets
- **No partial exits**: Once you bet, you're in until resolution
- Pari-mutuel means your potential payout changes as others bet
- Markets close at the specified `closing_time` - no bets accepted after
