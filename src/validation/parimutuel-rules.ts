/**
 * BAOZI PARIMUTUEL MARKET RULES v6.2
 *
 * STRICT ENFORCEMENT - All Lab markets MUST comply with these rules.
 * AI agents creating markets through MCP MUST validate against these rules.
 * Markets that don't comply will be BLOCKED from creation.
 */

// =============================================================================
// MANDATORY RULES - MARKETS WILL BE BLOCKED IF VIOLATED
// =============================================================================

export const PARIMUTUEL_RULES = {
  version: '6.2',

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
# BAOZI PARIMUTUEL MARKET RULES v6.2

## MANDATORY FOR ALL LAB MARKETS

### Rule A: Event-Based Markets
Markets about specific events (sports, elections, announcements):
- Betting MUST close AT LEAST 12 hours BEFORE the event
- You MUST specify event_time parameter
- Recommended buffer: 18-24 hours

Example:
- Question: "Will Team A win vs Team B?"
- Event time: Game start (e.g., 2026-02-15T20:00:00Z)
- Closing time: At least 12h before (e.g., 2026-02-15T08:00:00Z)

### Rule B: Measurement-Period Markets
Markets about measured values (prices, temperatures, metrics):
- Betting MUST close BEFORE the measurement period starts
- You MUST specify measurement_start parameter
- Recommended: betting closes 1-2 hours before measurement

Example:
- Question: "Will BTC be above $100k at 00:00 UTC Feb 1?"
- Measurement start: 2026-02-01T00:00:00Z
- Closing time: BEFORE measurement (e.g., 2026-01-31T22:00:00Z)

### Data Source Requirement
- Include verifiable data source in question
- Examples: "(Source: CoinGecko)", "(Official: UEFA)", "(NWS Los Angeles)"

### Clear Criteria
- Question must have unambiguous YES/NO resolution
- Include specific thresholds: "$100,000", "3+ goals", etc.

## VIOLATIONS WILL BLOCK MARKET CREATION

If you try to create a market that violates these rules, the MCP will:
1. Return blocked: true
2. List specific rule violations
3. Refuse to build the transaction

## CLASSIFICATION REQUIRED

Every Lab market MUST be classified as either:
1. Event-based (provide event_time) - Rule A applies
2. Measurement-based (provide measurement_start) - Rule B applies

Unclassified markets will be BLOCKED.
`;

/**
 * Get rules summary for AI agents
 */
export function getParimutuelRulesSummary(): string {
  return PARIMUTUEL_RULES_DOCUMENTATION;
}
