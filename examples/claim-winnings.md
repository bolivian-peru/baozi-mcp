# Claim Winnings

How to check your positions and claim winnings from resolved markets.

## Step 1: Check Claimable Positions

```json
{
  "name": "get_claimable",
  "arguments": {
    "wallet": "<YOUR_WALLET>"
  }
}
```

Returns all positions where you have unclaimed winnings or refunds, including:
- Market public key and question
- Your bet side and amount
- Claimable amount (winnings or refund)
- Market resolution status

## Step 2: Claim Individual Winnings

### Boolean market winnings

```json
{
  "name": "build_claim_winnings_transaction",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>",
    "user_wallet": "<YOUR_WALLET>"
  }
}
```

### Race market winnings

```json
{
  "name": "build_claim_race_winnings_transaction",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>",
    "user_wallet": "<YOUR_WALLET>"
  }
}
```

## Step 3: Batch Claim (Multiple Markets)

If you have winnings across several markets, claim them all at once:

```json
{
  "name": "build_batch_claim_transaction",
  "arguments": {
    "markets": [
      "<MARKET_KEY_1>",
      "<MARKET_KEY_2>",
      "<MARKET_KEY_3>"
    ],
    "user_wallet": "<YOUR_WALLET>"
  }
}
```

## Claiming Refunds

If a market was cancelled, claim your refund (full amount returned):

### Boolean market refund

```json
{
  "name": "build_claim_refund_transaction",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>",
    "user_wallet": "<YOUR_WALLET>"
  }
}
```

### Race market refund

```json
{
  "name": "build_claim_race_refund_transaction",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>",
    "user_wallet": "<YOUR_WALLET>"
  }
}
```

## Claiming Affiliate Earnings

If you registered an affiliate code and users bet through your referral:

```json
{
  "name": "build_claim_affiliate_transaction",
  "arguments": {
    "user_wallet": "<YOUR_WALLET>"
  }
}
```

## Claiming Creator Fees

If you created markets and they've been resolved:

```json
{
  "name": "build_claim_creator_transaction",
  "arguments": {
    "user_wallet": "<YOUR_WALLET>"
  }
}
```

## How Payouts Work

### Winning bets
- You receive your share of the total pool based on your proportion of the winning side
- Fees are deducted from gross winnings (stake + profit)
- Fee rates: 2.5% (Official), 3% (Lab), 2% (Private)

### Cancelled markets
- Full refund of your original bet amount
- No fees deducted

### Disputes
- If a market resolution is disputed and overturned, payouts follow the corrected outcome
- Check `get_resolution_status` to see if a market is in dispute

## Monitoring Resolution

Track when your markets will resolve:

```json
{
  "name": "get_resolution_status",
  "arguments": {
    "market": "<MARKET_PUBLIC_KEY>"
  }
}
```

Check all markets awaiting resolution:

```json
{
  "name": "get_markets_awaiting_resolution",
  "arguments": {}
}
```
