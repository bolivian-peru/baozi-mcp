/**
 * BAOZI PARIMUTUEL MARKET RULES v6.3
 *
 * STRICT ENFORCEMENT - All Lab markets MUST comply with these rules.
 * AI agents creating markets through MCP MUST validate against these rules.
 * Markets that don't comply will be BLOCKED from creation.
 *
 * v6.3 UPDATES:
 * - Added SUBJECTIVE_OUTCOME rule to block unverifiable questions
 * - Added MANIPULATION_RISK rule to prevent self-referential markets
 * - Enhanced data source validation with strict requirements
 * - Added blocked keywords and patterns detection
 */

// =============================================================================
// MANDATORY RULES - MARKETS WILL BE BLOCKED IF VIOLATED
// =============================================================================

export const PARIMUTUEL_RULES = {
  version: '6.3',

  /**
   * RULE A: Event-Based Markets
   *
   * For markets about specific events (sports, elections, announcements):
   * - Betting must close AT LEAST 12 hours BEFORE the event
   * - Recommended buffer: 18-24 hours
   * - Event time must be explicitly specified
   *
   * RATIONALE: Prevents late-breaking information from giving unfair advantage
   *
   * Examples:
   * ✅ "Will Team A win vs Team B?" + event_time = game_start
   * ✅ "Will Company X announce earnings above $1B?" + event_time = announcement
   * ❌ "Will it rain tomorrow?" (no clear event time)
   */
  RULE_A: {
    name: 'Event-Based Markets',
    minBufferHours: 12,
    recommendedBufferHours: 24,
    requirement: 'Betting must close 12+ hours BEFORE the event',
    rationale: 'Prevents information advantage from late-breaking news',
  },

  /**
   * RULE B: Measurement-Period Markets
   *
   * For markets about measured values (prices, temperatures, metrics):
   * - Betting must close BEFORE the measurement period starts
   * - measurement_start must be explicitly specified
   * - Recommended: betting closes 1-2 hours before measurement
   *
   * RATIONALE: Prevents anyone from betting with foreknowledge of measurements
   *
   * Examples:
   * ✅ "Will BTC be above $100k at 00:00 UTC Feb 1?" + measurement_start = Feb 1 00:00
   * ✅ "Will Tokyo have snowfall on Feb 4?" + measurement_start = Feb 4 00:00
   * ❌ "Will BTC close above $100k on Feb 2?" + betting_closes = Feb 2 23:59 (VIOLATION!)
   */
  RULE_B: {
    name: 'Measurement-Period Markets',
    requirement: 'Betting must close BEFORE measurement period starts',
    rationale: 'Prevents betting with foreknowledge of measured values',
    recommendedBufferHours: 2,
  },

  /**
   * MANDATORY: Verifiable Data Source
   *
   * Every market question MUST specify or clearly imply a verifiable data source.
   * This ensures objective resolution and prevents disputes.
   *
   * Examples:
   * ✅ "Will BTC be above $100k? (Source: CoinGecko)"
   * ✅ "Will it snow in Tokyo? (JMA official record)"
   * ✅ "Will Real Madrid win?" (Implied: official UEFA result)
   * ❌ "Will the economy improve?" (No verifiable source)
   * ❌ "Will Claude be the best AI?" (Subjective, no source)
   */
  DATA_SOURCE: {
    name: 'Verifiable Data Source',
    requirement: 'Question must specify or clearly imply a verifiable data source',
    rationale: 'Ensures objective resolution and prevents disputes',
  },

  /**
   * MANDATORY: Clear YES/NO Criteria
   *
   * The market question must have clear, unambiguous YES/NO criteria.
   * There should be no room for interpretation in the resolution.
   *
   * Examples:
   * ✅ "Will BTC be above $100,000 at 00:00 UTC Feb 1, 2026?"
   * ✅ "Will Team A score 3+ goals?"
   * ❌ "Will BTC perform well?" (Subjective)
   * ❌ "Will the game be exciting?" (Subjective)
   */
  CLEAR_CRITERIA: {
    name: 'Clear Resolution Criteria',
    requirement: 'Question must have unambiguous YES/NO criteria',
    rationale: 'Prevents disputes and ensures fair resolution',
  },

  /**
   * MANDATORY: No Subjective/Unverifiable Outcomes (v6.3)
   *
   * Market outcomes MUST be objectively verifiable by a third party.
   * Questions about AI agents, personal achievements, or untrackable events
   * are NOT allowed unless tied to an official public record.
   *
   * BLOCKED PATTERNS:
   * ❌ "Will an AI agent do X?" (unverifiable)
   * ❌ "Will [person] achieve [subjective goal]?" (no official source)
   * ❌ "Will there be a breakthrough in X?" (subjective)
   * ❌ "Will X become popular?" (subjective)
   * ❌ "Will I/we do X?" (self-referential)
   *
   * ALLOWED PATTERNS:
   * ✅ "Will @verified_twitter_account post about X?" (public record)
   * ✅ "Will company X file for IPO?" (SEC records)
   * ✅ "Will product X launch before date?" (official announcement)
   */
  SUBJECTIVE_OUTCOME: {
    name: 'Objective Verifiability',
    requirement: 'Outcome must be objectively verifiable by third party with public record',
    rationale: 'Prevents unresolvable disputes and manipulation',
    blockedPatterns: [
      'ai agent',
      'an agent',
      'autonomously',
      'become popular',
      'go viral',
      'be successful',
      'perform well',
      'be the best',
      'breakthrough',
      'revolutionary',
      'will i ',
      'will we ',
      'will my ',
      'will our ',
    ],
  },

  /**
   * MANDATORY: No Manipulation Risk (v6.3)
   *
   * Market creators CANNOT create markets about outcomes they can directly influence.
   * This prevents the creator from betting and then making the outcome happen.
   *
   * BLOCKED:
   * ❌ Creator asking about their own project/product/actions
   * ❌ Markets about unspecified "someone" doing something
   * ❌ Markets where outcome depends on a small group's decision
   *
   * ALLOWED:
   * ✅ Public company earnings (many stakeholders, SEC oversight)
   * ✅ Sports outcomes (regulated, large teams)
   * ✅ Elections (public, regulated)
   * ✅ Weather (natural, uncontrollable)
   */
  MANIPULATION_RISK: {
    name: 'Manipulation Prevention',
    requirement: 'Creator must not be able to directly influence outcome',
    rationale: 'Prevents insider manipulation and unfair markets',
    blockedPatterns: [
      'will someone',
      'will anyone',
      'will a person',
      'will a user',
      'purchase proxies',
      'buy proxies',
      'x402 payment',
      'using credits',
    ],
  },

  /**
   * APPROVED DATA SOURCES (v6.3)
   *
   * Markets MUST use one of these approved data sources for resolution.
   * This ensures verifiable, dispute-free outcomes.
   */
  APPROVED_SOURCES: {
    crypto: ['coingecko', 'coinmarketcap', 'binance', 'coinbase', 'tradingview'],
    sports: ['espn', 'ufc', 'uefa', 'fifa', 'nba', 'nfl', 'mlb', 'nhl', 'atp', 'wta'],
    weather: ['nws', 'jma', 'met office', 'weather.gov', 'accuweather'],
    politics: ['ap news', 'reuters', 'associated press', 'official government'],
    finance: ['sec', 'nasdaq', 'nyse', 'yahoo finance', 'bloomberg'],
    social: ['twitter/x official', 'verified account'],
  },
};

// =============================================================================
// STRICT VALIDATION FOR LAB MARKETS
// =============================================================================

export interface ParimutuelValidationResult {
  valid: boolean;
  blocked: boolean;  // If true, market creation is BLOCKED
  errors: string[];
  warnings: string[];
  ruleViolations: {
    rule: string;
    description: string;
    severity: 'CRITICAL' | 'ERROR' | 'WARNING';
  }[];
  rulesChecked: string[];
}

/**
 * Validate market against parimutuel rules
 * Returns BLOCKED=true if market violates mandatory rules
 */
export function validateParimutuelRules(params: {
  question: string;
  closingTime: Date;
  marketType?: 'event' | 'measurement';
  eventTime?: Date;
  measurementStart?: Date;
  layer: 'official' | 'lab' | 'private';
}): ParimutuelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ruleViolations: ParimutuelValidationResult['ruleViolations'] = [];
  const rulesChecked: string[] = [];

  // Only strictly enforce for Lab markets
  const isLabMarket = params.layer === 'lab';

  // =========================================================================
  // CHECK: Market Type Classification
  // =========================================================================
  rulesChecked.push('Market Type Classification');

  const hasEventTime = !!params.eventTime;
  const hasMeasurementStart = !!params.measurementStart;
  const isEventBased = params.marketType === 'event' || hasEventTime;
  const isMeasurementBased = params.marketType === 'measurement' || hasMeasurementStart;

  if (isLabMarket && !isEventBased && !isMeasurementBased) {
    ruleViolations.push({
      rule: 'Market Classification',
      description: 'Lab markets MUST specify either event_time (Rule A) or measurement_start (Rule B). ' +
        'Without this, the market cannot be validated for fair betting windows.',
      severity: 'CRITICAL',
    });
    errors.push('BLOCKED: Market must be classified as event-based (with event_time) or measurement-based (with measurement_start)');
  }

  // =========================================================================
  // CHECK: Rule A - Event Buffer
  // =========================================================================
  if (isEventBased && params.eventTime) {
    rulesChecked.push('Rule A: Event Buffer');

    const bufferMs = params.eventTime.getTime() - params.closingTime.getTime();
    const bufferHours = bufferMs / (1000 * 60 * 60);

    if (bufferHours < PARIMUTUEL_RULES.RULE_A.minBufferHours) {
      ruleViolations.push({
        rule: 'Rule A',
        description: `Event buffer is ${bufferHours.toFixed(1)}h but minimum is ${PARIMUTUEL_RULES.RULE_A.minBufferHours}h. ` +
          `Betting must close at least 12 hours BEFORE the event to prevent information advantage.`,
        severity: 'CRITICAL',
      });
      errors.push(`BLOCKED: Betting must close ${PARIMUTUEL_RULES.RULE_A.minBufferHours}+ hours before event (currently ${bufferHours.toFixed(1)}h)`);
    } else if (bufferHours < 18) {
      warnings.push(`Event buffer is ${bufferHours.toFixed(1)}h. Recommend 18-24h for safety margin.`);
    }
  }

  // =========================================================================
  // CHECK: Rule B - Measurement Period
  // =========================================================================
  if (isMeasurementBased && params.measurementStart) {
    rulesChecked.push('Rule B: Measurement Period');

    if (params.closingTime >= params.measurementStart) {
      const overlapMs = params.closingTime.getTime() - params.measurementStart.getTime();
      const overlapHours = overlapMs / (1000 * 60 * 60);

      ruleViolations.push({
        rule: 'Rule B',
        description: `CRITICAL VIOLATION: Betting closes ${overlapHours.toFixed(1)}h AFTER measurement starts! ` +
          `This allows bettors to bet with foreknowledge of the outcome. ` +
          `Betting MUST close BEFORE the measurement period begins.`,
        severity: 'CRITICAL',
      });
      errors.push(`BLOCKED: Betting must close BEFORE measurement starts (currently closes ${overlapHours.toFixed(1)}h AFTER)`);
    }
  }

  // =========================================================================
  // CHECK: Data Source
  // =========================================================================
  rulesChecked.push('Verifiable Data Source');

  const questionLower = params.question.toLowerCase();
  const hasDataSource =
    questionLower.includes('source:') ||
    questionLower.includes('coingecko') ||
    questionLower.includes('coinmarketcap') ||
    questionLower.includes('official') ||
    questionLower.includes('nws') ||
    questionLower.includes('jma') ||
    questionLower.includes('ufc') ||
    questionLower.includes('uefa') ||
    questionLower.includes('fifa') ||
    questionLower.includes('nba') ||
    questionLower.includes('nfl') ||
    questionLower.includes('mlb') ||
    // Sports/events typically have implied official sources
    questionLower.includes(' win ') ||
    questionLower.includes(' defeat ') ||
    questionLower.includes(' advance ') ||
    questionLower.includes('championship') ||
    questionLower.includes('election');

  if (isLabMarket && !hasDataSource) {
    warnings.push(
      'Recommended: Include data source in question (e.g., "(Source: CoinGecko)" or "(Official: UEFA)"). ' +
      'This ensures objective resolution.'
    );
  }

  // =========================================================================
  // CHECK: Clear Criteria
  // =========================================================================
  rulesChecked.push('Clear Resolution Criteria');

  const hasNumericThreshold =
    /\$[\d,]+/.test(params.question) ||  // Dollar amounts
    /\d+%/.test(params.question) ||      // Percentages
    /above|below|over|under|at least|more than|less than/i.test(params.question);

  const hasClearBinaryOutcome =
    /will .+ (win|lose|defeat|advance|qualify|score|achieve)/i.test(params.question) ||
    /will .+ (snow|rain|happen|occur)/i.test(params.question);

  if (isLabMarket && !hasNumericThreshold && !hasClearBinaryOutcome) {
    warnings.push(
      'Question should have clear numeric threshold or binary outcome. ' +
      'Example: "above $X", "at least Y goals", "will Team A win"'
    );
  }

  // =========================================================================
  // CHECK: Subjective/Unverifiable Outcomes (v6.3)
  // =========================================================================
  rulesChecked.push('Objective Verifiability');

  const subjectivePatterns = PARIMUTUEL_RULES.SUBJECTIVE_OUTCOME.blockedPatterns;
  const foundSubjective = subjectivePatterns.filter(pattern =>
    questionLower.includes(pattern.toLowerCase())
  );

  if (isLabMarket && foundSubjective.length > 0) {
    ruleViolations.push({
      rule: 'Subjective Outcome',
      description: `BLOCKED: Question contains unverifiable/subjective terms: "${foundSubjective.join('", "')}". ` +
        `Markets must have outcomes that can be objectively verified by a third party using public records. ` +
        `Avoid questions about AI agents, personal achievements, or vague success metrics.`,
      severity: 'CRITICAL',
    });
    errors.push(`BLOCKED: Unverifiable outcome detected. Terms: ${foundSubjective.join(', ')}`);
  }

  // =========================================================================
  // CHECK: Manipulation Risk (v6.3)
  // =========================================================================
  rulesChecked.push('Manipulation Prevention');

  const manipulationPatterns = PARIMUTUEL_RULES.MANIPULATION_RISK.blockedPatterns;
  const foundManipulation = manipulationPatterns.filter(pattern =>
    questionLower.includes(pattern.toLowerCase())
  );

  if (isLabMarket && foundManipulation.length > 0) {
    ruleViolations.push({
      rule: 'Manipulation Risk',
      description: `BLOCKED: Question has manipulation risk with terms: "${foundManipulation.join('", "')}". ` +
        `Market creators cannot create markets about outcomes they could directly influence. ` +
        `Use markets about public events, regulated competitions, or natural phenomena instead.`,
      severity: 'CRITICAL',
    });
    errors.push(`BLOCKED: Manipulation risk detected. Terms: ${foundManipulation.join(', ')}`);
  }

  // =========================================================================
  // CHECK: Approved Data Source (v6.3 - stricter)
  // =========================================================================
  rulesChecked.push('Approved Data Source');

  const allApprovedSources = Object.values(PARIMUTUEL_RULES.APPROVED_SOURCES).flat();
  const hasApprovedSource = allApprovedSources.some(source =>
    questionLower.includes(source.toLowerCase())
  );

  // Check for implied sources (sports teams, crypto assets, weather locations)
  const hasImpliedSource =
    /\b(btc|eth|sol|bitcoin|ethereum|solana)\b/i.test(params.question) ||  // Crypto (implies CoinGecko)
    /\b(ufc|nba|nfl|mlb|nhl|champions league|world cup|super bowl)\b/i.test(params.question) ||  // Sports
    /\b(tokyo|london|new york|los angeles|paris|snow|rain|temperature)\b/i.test(params.question) ||  // Weather
    /\b(election|president|congress|parliament|vote)\b/i.test(params.question);  // Politics

  if (isLabMarket && !hasApprovedSource && !hasImpliedSource && !hasDataSource) {
    ruleViolations.push({
      rule: 'Data Source',
      description: `BLOCKED: No verifiable data source specified or implied. ` +
        `Markets MUST include a data source like "(Source: CoinGecko)", "(Official: ESPN)", etc. ` +
        `Approved sources: ${allApprovedSources.slice(0, 10).join(', ')}...`,
      severity: 'CRITICAL',
    });
    errors.push('BLOCKED: Must specify verifiable data source for resolution');
  }

  // =========================================================================
  // RESULT
  // =========================================================================

  const hasCriticalViolation = ruleViolations.some(v => v.severity === 'CRITICAL');

  return {
    valid: errors.length === 0,
    blocked: isLabMarket && hasCriticalViolation,
    errors,
    warnings,
    ruleViolations,
    rulesChecked,
  };
}

// =============================================================================
// RULES DOCUMENTATION (for AI agents)
// =============================================================================

export const PARIMUTUEL_RULES_DOCUMENTATION = `
# BAOZI PARIMUTUEL MARKET RULES v6.3

## ⚠️ STRICT ENFORCEMENT - VIOLATIONS BLOCK MARKET CREATION

### Rule A: Event-Based Markets
Markets about specific events (sports, elections, announcements):
- Betting MUST close AT LEAST 12 hours BEFORE the event
- You MUST specify event_time parameter
- Recommended buffer: 18-24 hours

✅ ALLOWED: "Will Team A win vs Team B? (Official: ESPN)"
❌ BLOCKED: Closing time overlaps with event

### Rule B: Measurement-Period Markets
Markets about measured values (prices, temperatures, metrics):
- Betting MUST close BEFORE the measurement period starts
- You MUST specify measurement_start parameter

✅ ALLOWED: "Will BTC be above $100k at 00:00 UTC Feb 1? (Source: CoinGecko)"
❌ BLOCKED: Betting closes after measurement starts

### Rule C: Objective Verifiability (v6.3 - NEW)
Outcomes MUST be objectively verifiable by third party using public records.

❌ BLOCKED TERMS (will reject market):
- "ai agent", "an agent", "autonomously"
- "will I", "will we", "will my", "will our" (self-referential)
- "become popular", "go viral", "be successful"
- "perform well", "be the best", "breakthrough"

✅ ALLOWED: Questions about public events, regulated competitions, official records

### Rule D: Manipulation Prevention (v6.3 - NEW)
Creators CANNOT make markets about outcomes they can influence.

❌ BLOCKED TERMS:
- "will someone", "will anyone", "will a person"
- "purchase proxies", "buy proxies", "x402 payment"

✅ ALLOWED: Sports (regulated), weather (uncontrollable), elections (public)

### Rule E: Approved Data Sources (v6.3 - REQUIRED)
Markets MUST use an approved data source:

CRYPTO: CoinGecko, CoinMarketCap, Binance, Coinbase, TradingView
SPORTS: ESPN, UFC, UEFA, FIFA, NBA, NFL, MLB, NHL, ATP, WTA
WEATHER: NWS, JMA, Met Office, Weather.gov, AccuWeather
POLITICS: AP News, Reuters, Official Government
FINANCE: SEC, NASDAQ, NYSE, Yahoo Finance, Bloomberg

❌ BLOCKED: No source = No market

## EXAMPLE VALID MARKET

Question: "Will BTC be above $120,000 at 00:00 UTC Feb 15, 2026? (Source: CoinGecko)"
Type: measurement
Measurement Start: 2026-02-15T00:00:00Z
Closing Time: 2026-02-14T22:00:00Z (2h before)
✅ APPROVED - Clear criteria, approved source, proper timing

## EXAMPLE BLOCKED MARKETS

❌ "Will an AI agent autonomously purchase proxies?"
   → BLOCKED: Contains "ai agent", "autonomously", "purchase proxies"
   → Not verifiable, manipulation risk

❌ "Will crypto go up?"
   → BLOCKED: No specific threshold, no data source

❌ "Will I become successful?"
   → BLOCKED: Self-referential, subjective
`;

/**
 * Get rules summary for AI agents
 */
export function getParimutuelRulesSummary(): string {
  return PARIMUTUEL_RULES_DOCUMENTATION;
}
