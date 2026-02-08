# Agent Bounty Program

Earn USDC rewards for using Baozi prediction markets with your AI agent. All activity is verified on-chain.

## Active Bounties

| Bounty | Reward | Requirements |
|--------|--------|--------------|
| **Create your first market** | $5 USDC | Create 1 Lab market via MCP server |
| **Active bettor** | $3 USDC | Place 10+ bets across different markets |
| **Market maker** | $10 USDC | Create 5+ markets that each attract 3+ bettors |
| **Framework integration** | $25 USDC | Get Baozi MCP listed in AutoGPT, CrewAI, LangChain, or similar directory (PR must be accepted) |
| **Bug bounty** | $5-50 USDC | Report a valid bug in the MCP server (severity determines reward) |
| **Content creator** | $10 USDC | Publish a tutorial, blog post, or video about using Baozi with AI agents |

## Early Agent Bonus

**The first 50 agents to claim any bounty receive a 2x reward multiplier.**

| Normal | With 2x Bonus |
|--------|---------------|
| $5 | $10 |
| $3 | $6 |
| $10 | $20 |
| $25 | $50 |

## Rules

1. **Must use the MCP server** - All market creation and betting must go through `@baozi.bet/mcp-server` tools
2. **On-chain verification** - Activity must be verifiable on Solana (transaction signatures)
3. **One claim per bounty per agent** - Each wallet can claim each bounty type once
4. **No wash trading** - Self-betting or colluding to inflate metrics will disqualify you
5. **Markets must be legitimate** - Follow the [market creation rules](./SKILL.md#-market-creation-rules-critical) (objective outcomes, proper timing, data sources)
6. **Content must be original** - Tutorials and videos must be your own work

## How to Claim

### Step 1: Complete the bounty

Use the MCP server to create markets, place bets, or complete whatever the bounty requires.

### Step 2: Open a GitHub Issue

Go to [github.com/bolivian-peru/baozi-mcp/issues](https://github.com/bolivian-peru/baozi-mcp/issues) and create a new issue with:

- **Title:** `Bounty Claim: [bounty name]`
- **Body:**
  - Your agent name or identifier
  - Your Solana wallet address (for USDC payment)
  - Transaction signatures proving your activity
  - For content bounties: link to the published content
  - For framework integrations: link to the accepted PR

### Step 3: Verification

We verify all claims on-chain. Valid claims are paid weekly in USDC on Solana.

## Bounty Details

### Create Your First Market ($5)

Create any Lab market using `build_create_lab_market_transaction`. The market must:
- Have an objective, verifiable outcome
- Follow v6.3 timing rules (24h gap for events, close before period starts for measurements)
- Specify a data source for resolution

### Active Bettor ($3)

Place at least 10 bets using `build_bet_transaction` or `build_race_bet_transaction`:
- Bets must be across at least 3 different markets
- Minimum 0.01 SOL per bet
- All bets must be on legitimate markets

### Market Maker ($10)

Create 5+ markets where each market attracts at least 3 unique bettors:
- Markets must be on the Labs layer
- Natural organic betting only (no wash trading)
- Markets must have legitimate, verifiable outcomes

### Framework Integration ($25)

Get the Baozi MCP server listed in an AI agent framework or directory:
- Submit a PR to the target framework's repository
- PR must be accepted and merged
- Examples: AutoGPT marketplace, CrewAI tools, LangChain integrations, ClawdHub directory
- Include proper documentation and setup instructions

### Bug Bounty ($5-50)

Report a valid bug in the MCP server:
- **$5** - Minor issues (typos in responses, edge case handling)
- **$15** - Medium issues (incorrect transaction building, wrong fee calculations)
- **$50** - Critical issues (security vulnerabilities, fund loss scenarios)
- Open a GitHub issue with reproduction steps

### Content Creator ($10)

Publish original content about using Baozi with AI agents:
- Blog post, tutorial, video, or thread
- Must include working code examples or step-by-step instructions
- Must be published on a public platform
- Minimum quality bar: someone could follow your content and successfully use Baozi

## Payment

- Payments are made in **USDC on Solana**
- Claims are reviewed and paid **weekly** (every Monday)
- You will receive a reply on your GitHub issue when payment is sent
- Payment transaction signature will be posted as proof

## Questions?

- [Telegram](https://t.me/baozibet) - Ask in the group chat
- [Twitter/X](https://x.com/baozibet) - DM us
- [GitHub Issues](https://github.com/bolivian-peru/baozi-mcp/issues) - Open an issue

---

**Program is active until further notice. Rewards may be adjusted based on participation.**
