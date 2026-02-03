/**
 * MCP Resource Definitions for Baozi Markets
 * V2.0.0 - Mainnet + Extended Resources
 *
 * Resources provide read-only data that can be fetched by URI.
 */
import { listMarkets } from './handlers/markets.js';
import { getPositionsSummary } from './handlers/positions.js';
import {
  PROGRAM_ID,
  FEES,
  BET_LIMITS,
  TIMING,
  MARKET_STATUS_NAMES,
  MARKET_LAYER_NAMES,
  IS_MAINNET,
  NETWORK,
} from './config.js';

// =============================================================================
// V6.2 MARKET RULES DOCUMENT
// =============================================================================

const MARKET_RULES_V6_2 = `
# Baozi Market Creation Rules (v6.2)

## Overview
Markets must follow timing rules to ensure fair betting and accurate resolution.

## Rule A: Event-Based Markets
For markets based on a single point-in-time event (e.g., "Will X win the election?"):

1. **Betting Close Buffer**: Betting must close AT LEAST 12 hours before the event
2. **Recommended Buffer**: 18-24 hours provides safety margin for timezone issues
3. **Resolution**: After event occurs, market is resolved based on outcome

### Example (Rule A)
- Event: "Super Bowl kickoff at 2025-02-09 18:30:00 UTC"
- Question: "Will the Chiefs win Super Bowl LIX?"
- Recommended betting close: 2025-02-08 18:30:00 UTC (24h before)
- Latest acceptable close: 2025-02-09 06:30:00 UTC (12h before)

## Rule B: Measurement-Period Markets
For markets based on outcomes over a time period (e.g., "Will BTC reach $100k in January?"):

1. **CRITICAL**: Betting must close BEFORE measurement period starts
2. **No Overlap**: Zero tolerance for betting during measurement period
3. **Information Advantage**: Allowing bets during measurement enables unfair advantage
4. **Period Length**: Prefer 2-7 days for optimal user experience

### Example (Rule B)
- Question: "Will ETH be above $4000 on Feb 1st 2025?"
- Measurement period: Feb 1st 00:00 - 23:59 UTC
- Betting must close: Before Feb 1st 00:00 UTC
- Recommended close: Jan 31st 22:00 UTC (2h buffer)

## Common Timing Mistakes

### INVALID Configurations:
- Betting closes AFTER event starts (Rule A violation)
- Betting overlaps with measurement period (Rule B violation)
- Buffer < 12 hours for event markets (too risky)

### WARNING Configurations:
- Buffer 12-18 hours (acceptable but tight)
- Measurement period > 7 days (poor UX)
- Very short buffer < 2 hours for measurement (risk of late bets)

## Validation Endpoint
Use the \`validate_market_params\` tool to check your market parameters before creation.
`;

// =============================================================================
// MARKET TEMPLATES
// =============================================================================

const EVENT_MARKET_TEMPLATE = {
  type: 'event',
  description: 'Template for event-based prediction markets (single point in time)',
  example: {
    question: 'Will [Team A] win the [Event Name]?',
    closing_time: 'YYYY-MM-DDTHH:MM:SSZ (24 hours before event)',
    event_time: 'YYYY-MM-DDTHH:MM:SSZ (when event occurs)',
    market_type: 'event',
    layer: 'Lab',
  },
  rules: [
    'Question must be answerable with YES or NO',
    'Event time must be after closing time',
    'Minimum 12 hour buffer between close and event',
    'Question max 200 characters',
  ],
  examples: [
    'Will the Chiefs win Super Bowl LIX?',
    'Will Bitcoin reach $100,000 before March 2025?',
    'Will SpaceX successfully launch Starship on [date]?',
  ],
};

const MEASUREMENT_MARKET_TEMPLATE = {
  type: 'measurement',
  description: 'Template for measurement-period prediction markets (outcome over time range)',
  example: {
    question: 'Will [Metric] be above [Value] on [Date]?',
    closing_time: 'YYYY-MM-DDTHH:MM:SSZ (before measurement starts)',
    measurement_start: 'YYYY-MM-DDTHH:MM:SSZ (when measurement period begins)',
    measurement_end: 'YYYY-MM-DDTHH:MM:SSZ (when measurement period ends)',
    market_type: 'measurement',
    layer: 'Lab',
  },
  rules: [
    'Betting MUST close before measurement period starts',
    'Measurement period should be well-defined',
    'Prefer 2-7 day periods for optimal UX',
    'Data source for resolution must be clear',
  ],
  examples: [
    'Will ETH be above $4000 on Feb 1st 2025?',
    'Will US inflation be below 3% in January 2025?',
    'Will AAPL close above $200 on earnings day?',
  ],
};

// =============================================================================
// RESOURCE DEFINITIONS
// =============================================================================

export const RESOURCES = [
  {
    uri: 'baozi://markets/open',
    name: 'Open Markets',
    description: 'List of currently open prediction markets accepting bets on Solana mainnet',
    mimeType: 'application/json',
  },
  {
    uri: 'baozi://markets/all',
    name: 'All Markets',
    description: 'List of all prediction markets (open, closed, resolved) on Solana mainnet',
    mimeType: 'application/json',
  },
  {
    uri: 'baozi://config',
    name: 'Program Config',
    description: 'Baozi V4.7.6 program configuration, fees, and limits',
    mimeType: 'application/json',
  },
  {
    uri: 'baozi://rules',
    name: 'Market Rules v6.2',
    description: 'Documentation of market timing rules and validation requirements',
    mimeType: 'text/markdown',
  },
  {
    uri: 'baozi://templates/event',
    name: 'Event Market Template',
    description: 'Template for creating event-based prediction markets',
    mimeType: 'application/json',
  },
  {
    uri: 'baozi://templates/measurement',
    name: 'Measurement Market Template',
    description: 'Template for creating measurement-period prediction markets',
    mimeType: 'application/json',
  },
];

// =============================================================================
// RESOURCE HANDLERS
// =============================================================================

export async function handleResource(uri: string): Promise<{
  contents: Array<{ uri: string; mimeType: string; text: string }>;
}> {
  try {
    // Handle portfolio requests with wallet parameter
    if (uri.startsWith('baozi://portfolio/')) {
      const wallet = uri.replace('baozi://portfolio/', '');
      const summary = await getPositionsSummary(wallet);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              type: 'portfolio',
              network: NETWORK,
              ...summary,
              fetchedAt: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    switch (uri) {
      case 'baozi://markets/open': {
        const markets = await listMarkets('Active');
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                type: 'open_markets',
                network: NETWORK,
                programId: PROGRAM_ID.toBase58(),
                count: markets.length,
                markets: markets.map(m => ({
                  publicKey: m.publicKey,
                  marketId: m.marketId,
                  question: m.question,
                  layer: m.layer,
                  yesPercent: m.yesPercent,
                  noPercent: m.noPercent,
                  totalPoolSol: m.totalPoolSol,
                  closingTime: m.closingTime,
                  isBettingOpen: m.isBettingOpen,
                })),
                fetchedAt: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      }

      case 'baozi://markets/all': {
        const markets = await listMarkets();
        const byStatus: Record<string, number> = {};
        const byLayer: Record<string, number> = {};

        for (const m of markets) {
          byStatus[m.status] = (byStatus[m.status] || 0) + 1;
          byLayer[m.layer] = (byLayer[m.layer] || 0) + 1;
        }

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                type: 'all_markets',
                network: NETWORK,
                programId: PROGRAM_ID.toBase58(),
                count: markets.length,
                byStatus,
                byLayer,
                markets: markets.map(m => ({
                  publicKey: m.publicKey,
                  marketId: m.marketId,
                  question: m.question,
                  status: m.status,
                  layer: m.layer,
                  winningOutcome: m.winningOutcome,
                  totalPoolSol: m.totalPoolSol,
                })),
                fetchedAt: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      }

      case 'baozi://config': {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                type: 'program_config',
                program: {
                  id: PROGRAM_ID.toBase58(),
                  network: NETWORK,
                  version: '4.7.6',
                  isMainnet: IS_MAINNET,
                },
                fees: {
                  official: {
                    platformFeeBps: FEES.OFFICIAL_PLATFORM_FEE_BPS,
                    platformFeePercent: `${FEES.OFFICIAL_PLATFORM_FEE_BPS / 100}%`,
                    creationFeeSol: FEES.OFFICIAL_CREATION_FEE / 1e9,
                  },
                  lab: {
                    platformFeeBps: FEES.LAB_PLATFORM_FEE_BPS,
                    platformFeePercent: `${FEES.LAB_PLATFORM_FEE_BPS / 100}%`,
                    creationFeeSol: FEES.LAB_CREATION_FEE / 1e9,
                  },
                  private: {
                    platformFeeBps: FEES.PRIVATE_PLATFORM_FEE_BPS,
                    platformFeePercent: `${FEES.PRIVATE_PLATFORM_FEE_BPS / 100}%`,
                    creationFeeSol: FEES.PRIVATE_CREATION_FEE / 1e9,
                  },
                  affiliateFeeBps: FEES.AFFILIATE_FEE_BPS,
                  creatorFeeBps: FEES.CREATOR_FEE_BPS,
                },
                limits: {
                  minBetSol: BET_LIMITS.MIN_BET_SOL,
                  maxBetSol: BET_LIMITS.MAX_BET_SOL,
                },
                timing: {
                  bettingFreezeSeconds: TIMING.BETTING_FREEZE_SECONDS,
                  minEventBufferHours: TIMING.MIN_EVENT_BUFFER_HOURS,
                  recommendedEventBufferHours: TIMING.RECOMMENDED_EVENT_BUFFER_HOURS,
                  disputeWindowSeconds: TIMING.DISPUTE_WINDOW_SECONDS,
                },
                marketStatuses: MARKET_STATUS_NAMES,
                marketLayers: MARKET_LAYER_NAMES,
                links: {
                  website: 'https://baozi.bet',
                  api: 'https://baozi.bet/api/v4',
                  explorer: `https://solscan.io/account/${PROGRAM_ID.toBase58()}${IS_MAINNET ? '' : '?cluster=devnet'}`,
                },
                fetchedAt: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      }

      case 'baozi://rules': {
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: MARKET_RULES_V6_2,
            },
          ],
        };
      }

      case 'baozi://templates/event': {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(EVENT_MARKET_TEMPLATE, null, 2),
            },
          ],
        };
      }

      case 'baozi://templates/measurement': {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(MEASUREMENT_MARKET_TEMPLATE, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  } catch (error) {
    throw error;
  }
}
