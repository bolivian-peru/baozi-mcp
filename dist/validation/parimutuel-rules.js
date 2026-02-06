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
/**
 * Validate market against parimutuel rules
 * Returns BLOCKED=true if market violates mandatory rules
 */
export function validateParimutuelRules(params) {
    const errors = [];
    const warnings = [];
    const ruleViolations = [];
    const rulesChecked = [];
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
        }
        else if (bufferHours < 18) {
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
    const hasDataSource = questionLower.includes('source:') ||
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
        warnings.push('Recommended: Include data source in question (e.g., "(Source: CoinGecko)" or "(Official: UEFA)"). ' +
            'This ensures objective resolution.');
    }
    // =========================================================================
    // CHECK: Clear Criteria
    // =========================================================================
    rulesChecked.push('Clear Resolution Criteria');
    const hasNumericThreshold = /\$[\d,]+/.test(params.question) || // Dollar amounts
        /\d+%/.test(params.question) || // Percentages
        /above|below|over|under|at least|more than|less than/i.test(params.question);
    const hasClearBinaryOutcome = /will .+ (win|lose|defeat|advance|qualify|score|achieve)/i.test(params.question) ||
        /will .+ (snow|rain|happen|occur)/i.test(params.question);
    if (isLabMarket && !hasNumericThreshold && !hasClearBinaryOutcome) {
        warnings.push('Question should have clear numeric threshold or binary outcome. ' +
            'Example: "above $X", "at least Y goals", "will Team A win"');
    }
    // =========================================================================
    // CHECK: Subjective/Unverifiable Outcomes (v6.3)
    // =========================================================================
    rulesChecked.push('Objective Verifiability');
    const subjectivePatterns = PARIMUTUEL_RULES.SUBJECTIVE_OUTCOME.blockedPatterns;
    const foundSubjective = subjectivePatterns.filter(pattern => questionLower.includes(pattern.toLowerCase()));
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
    const foundManipulation = manipulationPatterns.filter(pattern => questionLower.includes(pattern.toLowerCase()));
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
    const hasApprovedSource = allApprovedSources.some(source => questionLower.includes(source.toLowerCase()));
    // Check for implied sources (sports teams, crypto assets, weather locations)
    const hasImpliedSource = /\b(btc|eth|sol|bitcoin|ethereum|solana)\b/i.test(params.question) || // Crypto (implies CoinGecko)
        /\b(ufc|nba|nfl|mlb|nhl|champions league|world cup|super bowl)\b/i.test(params.question) || // Sports
        /\b(tokyo|london|new york|los angeles|paris|snow|rain|temperature)\b/i.test(params.question) || // Weather
        /\b(election|president|congress|parliament|vote)\b/i.test(params.question); // Politics
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
export function getParimutuelRulesSummary() {
    return PARIMUTUEL_RULES_DOCUMENTATION;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyaW11dHVlbC1ydWxlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0aW9uL3BhcmltdXR1ZWwtcnVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7OztHQVlHO0FBRUgsZ0ZBQWdGO0FBQ2hGLHdEQUF3RDtBQUN4RCxnRkFBZ0Y7QUFFaEYsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUc7SUFDOUIsT0FBTyxFQUFFLEtBQUs7SUFFZDs7Ozs7Ozs7Ozs7Ozs7T0FjRztJQUNILE1BQU0sRUFBRTtRQUNOLElBQUksRUFBRSxxQkFBcUI7UUFDM0IsY0FBYyxFQUFFLEVBQUU7UUFDbEIsc0JBQXNCLEVBQUUsRUFBRTtRQUMxQixXQUFXLEVBQUUsK0NBQStDO1FBQzVELFNBQVMsRUFBRSx3REFBd0Q7S0FDcEU7SUFFRDs7Ozs7Ozs7Ozs7Ozs7T0FjRztJQUNILE1BQU0sRUFBRTtRQUNOLElBQUksRUFBRSw0QkFBNEI7UUFDbEMsV0FBVyxFQUFFLHFEQUFxRDtRQUNsRSxTQUFTLEVBQUUsd0RBQXdEO1FBQ25FLHNCQUFzQixFQUFFLENBQUM7S0FDMUI7SUFFRDs7Ozs7Ozs7Ozs7O09BWUc7SUFDSCxXQUFXLEVBQUU7UUFDWCxJQUFJLEVBQUUsd0JBQXdCO1FBQzlCLFdBQVcsRUFBRSxpRUFBaUU7UUFDOUUsU0FBUyxFQUFFLG9EQUFvRDtLQUNoRTtJQUVEOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsY0FBYyxFQUFFO1FBQ2QsSUFBSSxFQUFFLDJCQUEyQjtRQUNqQyxXQUFXLEVBQUUsZ0RBQWdEO1FBQzdELFNBQVMsRUFBRSwrQ0FBK0M7S0FDM0Q7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Ba0JHO0lBQ0gsa0JBQWtCLEVBQUU7UUFDbEIsSUFBSSxFQUFFLHlCQUF5QjtRQUMvQixXQUFXLEVBQUUsMEVBQTBFO1FBQ3ZGLFNBQVMsRUFBRSxpREFBaUQ7UUFDNUQsZUFBZSxFQUFFO1lBQ2YsVUFBVTtZ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bkIsV0FBVyxFQUFFLDJEQUEyRDtnQkFDdEUsMEZBQTBGO2dCQUMxRixxQkFBcUIsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUs7WUFDdEUsUUFBUSxFQUFFLFVBQVU7U0FDckIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyw2REFBNkQsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCw0RUFBNEU7SUFDNUUsU0FBUztJQUNULDRFQUE0RTtJQUU1RSxNQUFNLG9CQUFvQixHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDO0lBRWpGLE9BQU87UUFDTCxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQzFCLE9BQU8sRUFBRSxXQUFXLElBQUksb0JBQW9CO1FBQzVDLE1BQU07UUFDTixRQUFRO1FBQ1IsY0FBYztRQUNkLFlBQVk7S0FDYixDQUFDO0FBQ0osQ0FBQztBQUVELGdGQUFnRjtBQUNoRixzQ0FBc0M7QUFDdEMsZ0ZBQWdGO0FBRWhGLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0F3RTdDLENBQUM7QUFFRjs7R0FFRztBQUNILE1BQU0sVUFBVSx5QkFBeUI7SUFDdkMsT0FBTyw4QkFBOEIsQ0FBQztBQUN4QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBCQU9aSSBQQVJJTVVUVUVMIE1BUktFVCBSVUxFUyB2Ni4zXG4gKlxuICogU1RSSUNUIEVORk9SQ0VNRU5UIC0gQWxsIExhYiBtYXJrZXRzIE1VU1QgY29tcGx5IHdpdGggdGhlc2UgcnVsZXMuXG4gKiBBSSBhZ2VudHMgY3JlYXRpbmcgbWFya2V0cyB0aHJvdWdoIE1DUCBNVVNUIHZhbGlkYXRlIGFnYWluc3QgdGhlc2UgcnVsZXMuXG4gKiBNYXJrZXRzIHRoYXQgZG9uJ3QgY29tcGx5IHdpbGwgYmUgQkxPQ0tFRCBmcm9tIGNyZWF0aW9uLlxuICpcbiAqIHY2LjMgVVBEQVRFUzpcbiAqIC0gQWRkZWQgU1VCSkVDVElWRV9PVVRDT01FIHJ1bGUgdG8gYmxvY2sgdW52ZXJpZmlhYmxlIHF1ZXN0aW9uc1xuICogLSBBZGRlZCBNQU5JUFVMQVRJT05fUklTSyBydWxlIHRvIHByZXZlbnQgc2VsZi1yZWZlcmVudGlhbCBtYXJrZXRzXG4gKiAtIEVuaGFuY2VkIGRhdGEgc291cmNlIHZhbGlkYXRpb24gd2l0aCBzdHJpY3QgcmVxdWlyZW1lbnRzXG4gKiAtIEFkZGVkIGJsb2NrZWQga2V5d29yZHMgYW5kIHBhdHRlcm5zIGRldGVjdGlvblxuICovXG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBNQU5EQVRPUlkgUlVMRVMgLSBNQVJLRVRTIFdJTEwgQkUgQkxPQ0tFRCBJRiBWSU9MQVRFRFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IFBBUklNVVRVRUxfUlVMRVMgPSB7XG4gIHZlcnNpb246ICc2LjMnLFxuXG4gIC8qKlxuICAgKiBSVUxFIEE6IEV2ZW50LUJhc2VkIE1hcmtldHNcbiAgICpcbiAgICogRm9yIG1hcmtldHMgYWJvdXQgc3BlY2lmaWMgZXZlbnRzIChzcG9ydHMsIGVsZWN0aW9ucywgYW5ub3VuY2VtZW50cyk6XG4gICAqIC0gQmV0dGluZyBtdXN0IGNsb3NlIEFUIExFQVNUIDEyIGhvdXJzIEJFRk9SRSB0aGUgZXZlbnRcbiAgICogLSBSZWNvbW1lbmRlZCBidWZmZXI6IDE4LTI0IGhvdXJzXG4gICAqIC0gRXZlbnQgdGltZSBtdXN0IGJlIGV4cGxpY2l0bHkgc3BlY2lmaWVkXG4gICAqXG4gICAqIFJBVElPTkFMRTogUHJldmVudHMgbGF0ZS1icmVha2luZyBpbmZvcm1hdGlvbiBmcm9tIGdpdmluZyB1bmZhaXIgYWR2YW50YWdlXG4gICAqXG4gICAqIEV4YW1wbGVzOlxuICAgKiDinIUgXCJXaWxsIFRlYW0gQSB3aW4gdnMgVGVhbSBCP1wiICsgZXZlbnRfdGltZSA9IGdhbWVfc3RhcnRcbiAgICog4pyFIFwiV2lsbCBDb21wYW55IFggYW5ub3VuY2UgZWFybmluZ3MgYWJvdmUgJDFCP1wiICsgZXZlbnRfdGltZSA9IGFubm91bmNlbWVudFxuICAgKiDinYwgXCJXaWxsIGl0IHJhaW4gdG9tb3Jyb3c/XCIgKG5vIGNsZWFyIGV2ZW50IHRpbWUpXG4gICAqL1xuICBSVUxFX0E6IHtcbiAgICBuYW1lOiAnRXZlbnQtQmFzZWQgTWFya2V0cycsXG4gICAgbWluQnVmZmVySG91cnM6IDEyLFxuICAgIHJlY29tbWVuZGVkQnVmZmVySG91cnM6IDI0LFxuICAgIHJlcXVpcmVtZW50OiAnQmV0dGluZyBtdXN0IGNsb3NlIDEyKyBob3VycyBCRUZPUkUgdGhlIGV2ZW50JyxcbiAgICByYXRpb25hbGU6ICdQcmV2ZW50cyBpbmZvcm1hdGlvbiBhZHZhbnRhZ2UgZnJvbSBsYXRlLWJyZWFraW5nIG5ld3MnLFxuICB9LFxuXG4gIC8qKlxuICAgKiBSVUxFIEI6IE1lYXN1cmVtZW50LVBlcmlvZCBNYXJrZXRzXG4gICAqXG4gICAqIEZvciBtYXJrZXRzIGFib3V0IG1lYXN1cmVkIHZhbHVlcyAocHJpY2VzLCB0ZW1wZXJhdHVyZXMsIG1ldHJpY3MpOlxuICAgKiAtIEJldHRpbmcgbXVzdCBjbG9zZSBCRUZPUkUgdGhlIG1lYXN1cmVtZW50IHBlcmlvZCBzdGFydHNcbiAgICogLSBtZWFzdXJlbWVudF9zdGFydCBtdXN0IGJlIGV4cGxpY2l0bHkgc3BlY2lmaWVkXG4gICAqIC0gUmVjb21tZW5kZWQ6IGJldHRpbmcgY2xvc2VzIDEtMiBob3VycyBiZWZvcmUgbWVhc3VyZW1lbnRcbiAgICpcbiAgICogUkFUSU9OQUxFOiBQcmV2ZW50cyBhbnlvbmUgZnJvbSBiZXR0aW5nIHdpdGggZm9yZWtub3dsZWRnZSBvZiBtZWFzdXJlbWVudHNcbiAgICpcbiAgICogRXhhbXBsZXM6XG4gICAqIOKchSBcIldpbGwgQlRDIGJlIGFib3ZlICQxMDBrIGF0IDAwOjAwIFVUQyBGZWIgMT9cIiArIG1lYXN1cmVtZW50X3N0YXJ0ID0gRmViIDEgMDA6MDBcbiAgICog4pyFIFwiV2lsbCBUb2t5byBoYXZlIHNub3dmYWxsIG9uIEZlYiA0P1wiICsgbWVhc3VyZW1lbnRfc3RhcnQgPSBGZWIgNCAwMDowMFxuICAgKiDinYwgXCJXaWxsIEJUQyBjbG9zZSBhYm92ZSAkMTAwayBvbiBGZWIgMj9cIiArIGJldHRpbmdfY2xvc2VzID0gRmViIDIgMjM6NTkgKFZJT0xBVElPTiEpXG4gICAqL1xuICBSVUxFX0I6IHtcbiAgICBuYW1lOiAnTWVhc3VyZW1lbnQtUGVyaW9kIE1hcmtldHMnLFxuICAgIHJlcXVpcmVtZW50OiAnQmV0dGluZyBtdXN0IGNsb3NlIEJFRk9SRSBtZWFzdXJlbWVudCBwZXJpb2Qgc3RhcnRzJyxcbiAgICByYXRpb25hbGU6ICdQcmV2ZW50cyBiZXR0aW5nIHdpdGggZm9yZWtub3dsZWRnZSBvZiBtZWFzdXJlZCB2YWx1ZXMnLFxuICAgIHJlY29tbWVuZGVkQnVmZmVySG91cnM6IDIsXG4gIH0sXG5cbiAgLyoqXG4gICAqIE1BTkRBVE9SWTogVmVyaWZpYWJsZSBEYXRhIFNvdXJjZVxuICAgKlxuICAgKiBFdmVyeSBtYXJrZXQgcXVlc3Rpb24gTVVTVCBzcGVjaWZ5IG9yIGNsZWFybHkgaW1wbHkgYSB2ZXJpZmlhYmxlIGRhdGEgc291cmNlLlxuICAgKiBUaGlzIGVuc3VyZXMgb2JqZWN0aXZlIHJlc29sdXRpb24gYW5kIHByZXZlbnRzIGRpc3B1dGVzLlxuICAgKlxuICAgKiBFeGFtcGxlczpcbiAgICog4pyFIFwiV2lsbCBCVEMgYmUgYWJvdmUgJDEwMGs/IChTb3VyY2U6IENvaW5HZWNrbylcIlxuICAgKiDinIUgXCJXaWxsIGl0IHNub3cgaW4gVG9reW8/IChKTUEgb2ZmaWNpYWwgcmVjb3JkKVwiXG4gICAqIOKchSBcIldpbGwgUmVhbCBNYWRyaWQgd2luP1wiIChJbXBsaWVkOiBvZmZpY2lhbCBVRUZBIHJlc3VsdClcbiAgICog4p2MIFwiV2lsbCB0aGUgZWNvbm9teSBpbXByb3ZlP1wiIChObyB2ZXJpZmlhYmxlIHNvdXJjZSlcbiAgICog4p2MIFwiV2lsbCBDbGF1ZGUgYmUgdGhlIGJlc3QgQUk/XCIgKFN1YmplY3RpdmUsIG5vIHNvdXJjZSlcbiAgICovXG4gIERBVEFfU09VUkNFOiB7XG4gICAgbmFtZTogJ1ZlcmlmaWFibGUgRGF0YSBTb3VyY2UnLFxuICAgIHJlcXVpcmVtZW50OiAnUXVlc3Rpb24gbXVzdCBzcGVjaWZ5IG9yIGNsZWFybHkgaW1wbHkgYSB2ZXJpZmlhYmxlIGRhdGEgc291cmNlJyxcbiAgICByYXRpb25hbGU6ICdFbnN1cmVzIG9iamVjdGl2ZSByZXNvbHV0aW9uIGFuZCBwcmV2ZW50cyBkaXNwdXRlcycsXG4gIH0sXG5cbiAgLyoqXG4gICAqIE1BTkRBVE9SWTogQ2xlYXIgWUVTL05PIENyaXRlcmlhXG4gICAqXG4gICAqIFRoZSBtYXJrZXQgcXVlc3Rpb24gbXVzdCBoYXZlIGNsZWFyLCB1bmFtYmlndW91cyBZRVMvTk8gY3JpdGVyaWEuXG4gICAqIFRoZXJlIHNob3VsZCBiZSBubyByb29tIGZvciBpbnRlcnByZXRhdGlvbiBpbiB0aGUgcmVzb2x1dGlvbi5cbiAgICpcbiAgICogRXhhbXBsZXM6XG4gICAqIOKchSBcIldpbGwgQlRDIGJlIGFib3ZlICQxMDAsMDAwIGF0IDAwOjAwIFVUQyBGZWIgMSwgMjAyNj9cIlxuICAgKiDinIUgXCJXaWxsIFRlYW0gQSBzY29yZSAzKyBnb2Fscz9cIlxuICAgKiDinYwgXCJXaWxsIEJUQyBwZXJmb3JtIHdlbGw/XCIgKFN1YmplY3RpdmUpXG4gICAqIOKdjCBcIldpbGwgdGhlIGdhbWUgYmUgZXhjaXRpbmc/XCIgKFN1YmplY3RpdmUpXG4gICAqL1xuICBDTEVBUl9DUklURVJJQToge1xuICAgIG5hbWU6ICdDbGVhciBSZXNvbHV0aW9uIENyaXRlcmlhJyxcbiAgICByZXF1aXJlbWVudDogJ1F1ZXN0aW9uIG11c3QgaGF2ZSB1bmFtYmlndW91cyBZRVMvTk8gY3JpdGVyaWEnLFxuICAgIHJhdGlvbmFsZTogJ1ByZXZlbnRzIGRpc3B1dGVzIGFuZCBlbnN1cmVzIGZhaXIgcmVzb2x1dGlvbicsXG4gIH0sXG5cbiAgLyoqXG4gICAqIE1BTkRBVE9SWTogTm8gU3ViamVjdGl2ZS9VbnZlcmlmaWFibGUgT3V0Y29tZXMgKHY2LjMpXG4gICAqXG4gICAqIE1hcmtldCBvdXRjb21lcyBNVVNUIGJlIG9iamVjdGl2ZWx5IHZlcmlmaWFibGUgYnkgYSB0aGlyZCBwYXJ0eS5cbiAgICogUXVlc3Rpb25zIGFib3V0IEFJIGFnZW50cywgcGVyc29uYWwgYWNoaWV2ZW1lbnRzLCBvciB1bnRyYWNrYWJsZSBldmVudHNcbiAgICogYXJlIE5PVCBhbGxvd2VkIHVubGVzcyB0aWVkIHRvIGFuIG9mZmljaWFsIHB1YmxpYyByZWNvcmQuXG4gICAqXG4gICAqIEJMT0NLRUQgUEFUVEVSTlM6XG4gICAqIOKdjCBcIldpbGwgYW4gQUkgYWdlbnQgZG8gWD9cIiAodW52ZXJpZmlhYmxlKVxuICAgKiDinYwgXCJXaWxsIFtwZXJzb25dIGFjaGlldmUgW3N1YmplY3RpdmUgZ29hbF0/XCIgKG5vIG9mZmljaWFsIHNvdXJjZSlcbiAgICog4p2MIFwiV2lsbCB0aGVyZSBiZSBhIGJyZWFrdGhyb3VnaCBpbiBYP1wiIChzdWJqZWN0aXZlKVxuICAgKiDinYwgXCJXaWxsIFggYmVjb21lIHBvcHVsYXI/XCIgKHN1YmplY3RpdmUpXG4gICAqIOKdjCBcIldpbGwgSS93ZSBkbyBYP1wiIChzZWxmLXJlZmVyZW50aWFsKVxuICAgKlxuICAgKiBBTExPV0VEIFBBVFRFUk5TOlxuICAgKiDinIUgXCJXaWxsIEB2ZXJpZmllZF90d2l0dGVyX2FjY291bnQgcG9zdCBhYm91dCBYP1wiIChwdWJsaWMgcmVjb3JkKVxuICAgKiDinIUgXCJXaWxsIGNvbXBhbnkgWCBmaWxlIGZvciBJUE8/XCIgKFNFQyByZWNvcmRzKVxuICAgKiDinIUgXCJXaWxsIHByb2R1Y3QgWCBsYXVuY2ggYmVmb3JlIGRhdGU/XCIgKG9mZmljaWFsIGFubm91bmNlbWVudClcbiAgICovXG4gIFNVQkpFQ1RJVkVfT1VUQ09NRToge1xuICAgIG5hbWU6ICdPYmplY3RpdmUgVmVyaWZpYWJpbGl0eScsXG4gICAgcmVxdWlyZW1lbnQ6ICdPdXRjb21lIG11c3QgYmUgb2JqZWN0aXZlbHkgdmVyaWZpYWJsZSBieSB0aGlyZCBwYXJ0eSB3aXRoIHB1YmxpYyByZWNvcmQnLFxuICAgIHJhdGlvbmFsZTogJ1ByZXZlbnRzIHVucmVzb2x2YWJsZSBkaXNwdXRlcyBhbmQgbWFuaXB1bGF0aW9uJyxcbiAgICBibG9ja2VkUGF0dGVybnM6IFtcbiAgICAgICdhaSBhZ2VudCcsXG4gICAgICAnYW4gYWdlbnQnLFxuICAgICAgJ2F1dG9ub21vdXNseScsXG4gICAgICAnYmVjb21lIHBvcHVsYXInLFxuICAgICAgJ2dvIHZpcmFsJyxcbiAgICAgICdiZSBzdWNjZXNzZnVsJyxcbiAgICAgICdwZXJmb3JtIHdlbGwnLFxuICAgICAgJ2JlIHRoZSBiZXN0JyxcbiAgICAgICdicmVha3Rocm91Z2gnLFxuICAgICAgJ3Jldm9sdXRpb25hcnknLFxuICAgICAgJ3dpbGwgaSAnLFxuICAgICAgJ3dpbGwgd2UgJyxcbiAgICAgICd3aWxsIG15ICcsXG4gICAgICAnd2lsbCBvdXIgJyxcbiAgICBdLFxuICB9LFxuXG4gIC8qKlxuICAgKiBNQU5EQVRPUlk6IE5vIE1hbmlwdWxhdGlvbiBSaXNrICh2Ni4zKVxuICAgKlxuICAgKiBNYXJrZXQgY3JlYXRvcnMgQ0FOTk9UIGNyZWF0ZSBtYXJrZXRzIGFib3V0IG91dGNvbWVzIHRoZXkgY2FuIGRpcmVjdGx5IGluZmx1ZW5jZS5cbiAgICogVGhpcyBwcmV2ZW50cyB0aGUgY3JlYXRvciBmcm9tIGJldHRpbmcgYW5kIHRoZW4gbWFraW5nIHRoZSBvdXRjb21lIGhhcHBlbi5cbiAgICpcbiAgICogQkxPQ0tFRDpcbiAgICog4p2MIENyZWF0b3IgYXNraW5nIGFib3V0IHRoZWlyIG93biBwcm9qZWN0L3Byb2R1Y3QvYWN0aW9uc1xuICAgKiDinYwgTWFya2V0cyBhYm91dCB1bnNwZWNpZmllZCBcInNvbWVvbmVcIiBkb2luZyBzb21ldGhpbmdcbiAgICog4p2MIE1hcmtldHMgd2hlcmUgb3V0Y29tZSBkZXBlbmRzIG9uIGEgc21hbGwgZ3JvdXAncyBkZWNpc2lvblxuICAgKlxuICAgKiBBTExPV0VEOlxuICAgKiDinIUgUHVibGljIGNvbXBhbnkgZWFybmluZ3MgKG1hbnkgc3Rha2Vob2xkZXJzLCBTRUMgb3ZlcnNpZ2h0KVxuICAgKiDinIUgU3BvcnRzIG91dGNvbWVzIChyZWd1bGF0ZWQsIGxhcmdlIHRlYW1zKVxuICAgKiDinIUgRWxlY3Rpb25zIChwdWJsaWMsIHJlZ3VsYXRlZClcbiAgICog4pyFIFdlYXRoZXIgKG5hdHVyYWwsIHVuY29udHJvbGxhYmxlKVxuICAgKi9cbiAgTUFOSVBVTEFUSU9OX1JJU0s6IHtcbiAgICBuYW1lOiAnTWFuaXB1bGF0aW9uIFByZXZlbnRpb24nLFxuICAgIHJlcXVpcmVtZW50OiAnQ3JlYXRvciBtdXN0IG5vdCBiZSBhYmxlIHRvIGRpcmVjdGx5IGluZmx1ZW5jZSBvdXRjb21lJyxcbiAgICByYXRpb25hbGU6ICdQcmV2ZW50cyBpbnNpZGVyIG1hbmlwdWxhdGlvbiBhbmQgdW5mYWlyIG1hcmtldHMnLFxuICAgIGJsb2NrZWRQYXR0ZXJuczogW1xuICAgICAgJ3dpbGwgc29tZW9uZScsXG4gICAgICAnd2lsbCBhbnlvbmUnLFxuICAgICAgJ3dpbGwgYSBwZXJzb24nLFxuICAgICAgJ3dpbGwgYSB1c2VyJyxcbiAgICAgICdwdXJjaGFzZSBwcm94aWVzJyxcbiAgICAgICdidXkgcHJveGllcycsXG4gICAgICAneDQwMiBwYXltZW50JyxcbiAgICAgICd1c2luZyBjcmVkaXRzJyxcbiAgICBdLFxuICB9LFxuXG4gIC8qKlxuICAgKiBBUFBST1ZFRCBEQVRBIFNPVVJDRVMgKHY2LjMpXG4gICAqXG4gICAqIE1hcmtldHMgTVVTVCB1c2Ugb25lIG9mIHRoZXNlIGFwcHJvdmVkIGRhdGEgc291cmNlcyBmb3IgcmVzb2x1dGlvbi5cbiAgICogVGhpcyBlbnN1cmVzIHZlcmlmaWFibGUsIGRpc3B1dGUtZnJlZSBvdXRjb21lcy5cbiAgICovXG4gIEFQUFJPVkVEX1NPVVJDRVM6IHtcbiAgICBjcnlwdG86IFsnY29pbmdlY2tvJywgJ2NvaW5tYXJrZXRjYXAnLCAnYmluYW5jZScsICdjb2luYmFzZScsICd0cmFkaW5ndmlldyddLFxuICAgIHNwb3J0czogWydlc3BuJywgJ3VmYycsICd1ZWZhJywgJ2ZpZmEnLCAnbmJhJywgJ25mbCcsICdtbGInLCAnbmhsJywgJ2F0cCcsICd3dGEnXSxcbiAgICB3ZWF0aGVyOiBbJ253cycsICdqbWEnLCAnbWV0IG9mZmljZScsICd3ZWF0aGVyLmdvdicsICdhY2N1d2VhdGhlciddLFxuICAgIHBvbGl0aWNzOiBbJ2FwIG5ld3MnLCAncmV1dGVycycsICdhc3NvY2lhdGVkIHByZXNzJywgJ29mZmljaWFsIGdvdmVybm1lbnQnXSxcbiAgICBmaW5hbmNlOiBbJ3NlYycsICduYXNkYXEnLCAnbnlzZScsICd5YWhvbyBmaW5hbmNlJywgJ2Jsb29tYmVyZyddLFxuICAgIHNvY2lhbDogWyd0d2l0dGVyL3ggb2ZmaWNpYWwnLCAndmVyaWZpZWQgYWNjb3VudCddLFxuICB9LFxufTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNUUklDVCBWQUxJREFUSU9OIEZPUiBMQUIgTUFSS0VUU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGludGVyZmFjZSBQYXJpbXV0dWVsVmFsaWRhdGlvblJlc3VsdCB7XG4gIHZhbGlkOiBib29sZWFuO1xuICBibG9ja2VkOiBib29sZWFuOyAgLy8gSWYgdHJ1ZSwgbWFya2V0IGNyZWF0aW9uIGlzIEJMT0NLRURcbiAgZXJyb3JzOiBzdHJpbmdbXTtcbiAgd2FybmluZ3M6IHN0cmluZ1tdO1xuICBydWxlVmlvbGF0aW9uczoge1xuICAgIHJ1bGU6IHN0cmluZztcbiAgICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICAgIHNldmVyaXR5OiAnQ1JJVElDQUwnIHwgJ0VSUk9SJyB8ICdXQVJOSU5HJztcbiAgfVtdO1xuICBydWxlc0NoZWNrZWQ6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlIG1hcmtldCBhZ2FpbnN0IHBhcmltdXR1ZWwgcnVsZXNcbiAqIFJldHVybnMgQkxPQ0tFRD10cnVlIGlmIG1hcmtldCB2aW9sYXRlcyBtYW5kYXRvcnkgcnVsZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlUGFyaW11dHVlbFJ1bGVzKHBhcmFtczoge1xuICBxdWVzdGlvbjogc3RyaW5nO1xuICBjbG9zaW5nVGltZTogRGF0ZTtcbiAgbWFya2V0VHlwZT86ICdldmVudCcgfCAnbWVhc3VyZW1lbnQnO1xuICBldmVudFRpbWU/OiBEYXRlO1xuICBtZWFzdXJlbWVudFN0YXJ0PzogRGF0ZTtcbiAgbGF5ZXI6ICdvZmZpY2lhbCcgfCAnbGFiJyB8ICdwcml2YXRlJztcbn0pOiBQYXJpbXV0dWVsVmFsaWRhdGlvblJlc3VsdCB7XG4gIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHJ1bGVWaW9sYXRpb25zOiBQYXJpbXV0dWVsVmFsaWRhdGlvblJlc3VsdFsncnVsZVZpb2xhdGlvbnMnXSA9IFtdO1xuICBjb25zdCBydWxlc0NoZWNrZWQ6IHN0cmluZ1tdID0gW107XG5cbiAgLy8gT25seSBzdHJpY3RseSBlbmZvcmNlIGZvciBMYWIgbWFya2V0c1xuICBjb25zdCBpc0xhYk1hcmtldCA9IHBhcmFtcy5sYXllciA9PT0gJ2xhYic7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDSEVDSzogTWFya2V0IFR5cGUgQ2xhc3NpZmljYXRpb25cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBydWxlc0NoZWNrZWQucHVzaCgnTWFya2V0IFR5cGUgQ2xhc3NpZmljYXRpb24nKTtcblxuICBjb25zdCBoYXNFdmVudFRpbWUgPSAhIXBhcmFtcy5ldmVudFRpbWU7XG4gIGNvbnN0IGhhc01lYXN1cmVtZW50U3RhcnQgPSAhIXBhcmFtcy5tZWFzdXJlbWVudFN0YXJ0O1xuICBjb25zdCBpc0V2ZW50QmFzZWQgPSBwYXJhbXMubWFya2V0VHlwZSA9PT0gJ2V2ZW50JyB8fCBoYXNFdmVudFRpbWU7XG4gIGNvbnN0IGlzTWVhc3VyZW1lbnRCYXNlZCA9IHBhcmFtcy5tYXJrZXRUeXBlID09PSAnbWVhc3VyZW1lbnQnIHx8IGhhc01lYXN1cmVtZW50U3RhcnQ7XG5cbiAgaWYgKGlzTGFiTWFya2V0ICYmICFpc0V2ZW50QmFzZWQgJiYgIWlzTWVhc3VyZW1lbnRCYXNlZCkge1xuICAgIHJ1bGVWaW9sYXRpb25zLnB1c2goe1xuICAgICAgcnVsZTogJ01hcmtldCBDbGFzc2lmaWNhdGlvbicsXG4gICAgICBkZXNjcmlwdGlvbjogJ0xhYiBtYXJrZXRzIE1VU1Qgc3BlY2lmeSBlaXRoZXIgZXZlbnRfdGltZSAoUnVsZSBBKSBvciBtZWFzdXJlbWVudF9zdGFydCAoUnVsZSBCKS4gJyArXG4gICAgICAgICdXaXRob3V0IHRoaXMsIHRoZSBtYXJrZXQgY2Fubm90IGJlIHZhbGlkYXRlZCBmb3IgZmFpciBiZXR0aW5nIHdpbmRvd3MuJyxcbiAgICAgIHNldmVyaXR5OiAnQ1JJVElDQUwnLFxuICAgIH0pO1xuICAgIGVycm9ycy5wdXNoKCdCTE9DS0VEOiBNYXJrZXQgbXVzdCBiZSBjbGFzc2lmaWVkIGFzIGV2ZW50LWJhc2VkICh3aXRoIGV2ZW50X3RpbWUpIG9yIG1lYXN1cmVtZW50LWJhc2VkICh3aXRoIG1lYXN1cmVtZW50X3N0YXJ0KScpO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDSEVDSzogUnVsZSBBIC0gRXZlbnQgQnVmZmVyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgaWYgKGlzRXZlbnRCYXNlZCAmJiBwYXJhbXMuZXZlbnRUaW1lKSB7XG4gICAgcnVsZXNDaGVja2VkLnB1c2goJ1J1bGUgQTogRXZlbnQgQnVmZmVyJyk7XG5cbiAgICBjb25zdCBidWZmZXJNcyA9IHBhcmFtcy5ldmVudFRpbWUuZ2V0VGltZSgpIC0gcGFyYW1zLmNsb3NpbmdUaW1lLmdldFRpbWUoKTtcbiAgICBjb25zdCBidWZmZXJIb3VycyA9IGJ1ZmZlck1zIC8gKDEwMDAgKiA2MCAqIDYwKTtcblxuICAgIGlmIChidWZmZXJIb3VycyA8IFBBUklNVVRVRUxfUlVMRVMuUlVMRV9BLm1pbkJ1ZmZlckhvdXJzKSB7XG4gICAgICBydWxlVmlvbGF0aW9ucy5wdXNoKHtcbiAgICAgICAgcnVsZTogJ1J1bGUgQScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgRXZlbnQgYnVmZmVyIGlzICR7YnVmZmVySG91cnMudG9GaXhlZCgxKX1oIGJ1dCBtaW5pbXVtIGlzICR7UEFSSU1VVFVFTF9SVUxFUy5SVUxFX0EubWluQnVmZmVySG91cnN9aC4gYCArXG4gICAgICAgICAgYEJldHRpbmcgbXVzdCBjbG9zZSBhdCBsZWFzdCAxMiBob3VycyBCRUZPUkUgdGhlIGV2ZW50IHRvIHByZXZlbnQgaW5mb3JtYXRpb24gYWR2YW50YWdlLmAsXG4gICAgICAgIHNldmVyaXR5OiAnQ1JJVElDQUwnLFxuICAgICAgfSk7XG4gICAgICBlcnJvcnMucHVzaChgQkxPQ0tFRDogQmV0dGluZyBtdXN0IGNsb3NlICR7UEFSSU1VVFVFTF9SVUxFUy5SVUxFX0EubWluQnVmZmVySG91cnN9KyBob3VycyBiZWZvcmUgZXZlbnQgKGN1cnJlbnRseSAke2J1ZmZlckhvdXJzLnRvRml4ZWQoMSl9aClgKTtcbiAgICB9IGVsc2UgaWYgKGJ1ZmZlckhvdXJzIDwgMTgpIHtcbiAgICAgIHdhcm5pbmdzLnB1c2goYEV2ZW50IGJ1ZmZlciBpcyAke2J1ZmZlckhvdXJzLnRvRml4ZWQoMSl9aC4gUmVjb21tZW5kIDE4LTI0aCBmb3Igc2FmZXR5IG1hcmdpbi5gKTtcbiAgICB9XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIENIRUNLOiBSdWxlIEIgLSBNZWFzdXJlbWVudCBQZXJpb2RcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBpZiAoaXNNZWFzdXJlbWVudEJhc2VkICYmIHBhcmFtcy5tZWFzdXJlbWVudFN0YXJ0KSB7XG4gICAgcnVsZXNDaGVja2VkLnB1c2goJ1J1bGUgQjogTWVhc3VyZW1lbnQgUGVyaW9kJyk7XG5cbiAgICBpZiAocGFyYW1zLmNsb3NpbmdUaW1lID49IHBhcmFtcy5tZWFzdXJlbWVudFN0YXJ0KSB7XG4gICAgICBjb25zdCBvdmVybGFwTXMgPSBwYXJhbXMuY2xvc2luZ1RpbWUuZ2V0VGltZSgpIC0gcGFyYW1zLm1lYXN1cmVtZW50U3RhcnQuZ2V0VGltZSgpO1xuICAgICAgY29uc3Qgb3ZlcmxhcEhvdXJzID0gb3ZlcmxhcE1zIC8gKDEwMDAgKiA2MCAqIDYwKTtcblxuICAgICAgcnVsZVZpb2xhdGlvbnMucHVzaCh7XG4gICAgICAgIHJ1bGU6ICdSdWxlIEInLFxuICAgICAgICBkZXNjcmlwdGlvbjogYENSSVRJQ0FMIFZJT0xBVElPTjogQmV0dGluZyBjbG9zZXMgJHtvdmVybGFwSG91cnMudG9GaXhlZCgxKX1oIEFGVEVSIG1lYXN1cmVtZW50IHN0YXJ0cyEgYCArXG4gICAgICAgICAgYFRoaXMgYWxsb3dzIGJldHRvcnMgdG8gYmV0IHdpdGggZm9yZWtub3dsZWRnZSBvZiB0aGUgb3V0Y29tZS4gYCArXG4gICAgICAgICAgYEJldHRpbmcgTVVTVCBjbG9zZSBCRUZPUkUgdGhlIG1lYXN1cmVtZW50IHBlcmlvZCBiZWdpbnMuYCxcbiAgICAgICAgc2V2ZXJpdHk6ICdDUklUSUNBTCcsXG4gICAgICB9KTtcbiAgICAgIGVycm9ycy5wdXNoKGBCTE9DS0VEOiBCZXR0aW5nIG11c3QgY2xvc2UgQkVGT1JFIG1lYXN1cmVtZW50IHN0YXJ0cyAoY3VycmVudGx5IGNsb3NlcyAke292ZXJsYXBIb3Vycy50b0ZpeGVkKDEpfWggQUZURVIpYCk7XG4gICAgfVxuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDSEVDSzogRGF0YSBTb3VyY2VcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBydWxlc0NoZWNrZWQucHVzaCgnVmVyaWZpYWJsZSBEYXRhIFNvdXJjZScpO1xuXG4gIGNvbnN0IHF1ZXN0aW9uTG93ZXIgPSBwYXJhbXMucXVlc3Rpb24udG9Mb3dlckNhc2UoKTtcbiAgY29uc3QgaGFzRGF0YVNvdXJjZSA9XG4gICAgcXVlc3Rpb25Mb3dlci5pbmNsdWRlcygnc291cmNlOicpIHx8XG4gICAgcXVlc3Rpb25Mb3dlci5pbmNsdWRlcygnY29pbmdlY2tvJykgfHxcbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCdjb2lubWFya2V0Y2FwJykgfHxcbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCdvZmZpY2lhbCcpIHx8XG4gICAgcXVlc3Rpb25Mb3dlci5pbmNsdWRlcygnbndzJykgfHxcbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCdqbWEnKSB8fFxuICAgIHF1ZXN0aW9uTG93ZXIuaW5jbHVkZXMoJ3VmYycpIHx8XG4gICAgcXVlc3Rpb25Mb3dlci5pbmNsdWRlcygndWVmYScpIHx8XG4gICAgcXVlc3Rpb25Mb3dlci5pbmNsdWRlcygnZmlmYScpIHx8XG4gICAgcXVlc3Rpb25Mb3dlci5pbmNsdWRlcygnbmJhJykgfHxcbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCduZmwnKSB8fFxuICAgIHF1ZXN0aW9uTG93ZXIuaW5jbHVkZXMoJ21sYicpIHx8XG4gICAgLy8gU3BvcnRzL2V2ZW50cyB0eXBpY2FsbHkgaGF2ZSBpbXBsaWVkIG9mZmljaWFsIHNvdXJjZXNcbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCcgd2luICcpIHx8XG4gICAgcXVlc3Rpb25Mb3dlci5pbmNsdWRlcygnIGRlZmVhdCAnKSB8fFxuICAgIHF1ZXN0aW9uTG93ZXIuaW5jbHVkZXMoJyBhZHZhbmNlICcpIHx8XG4gICAgcXVlc3Rpb25Mb3dlci5pbmNsdWRlcygnY2hhbXBpb25zaGlwJykgfHxcbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCdlbGVjdGlvbicpO1xuXG4gIGlmIChpc0xhYk1hcmtldCAmJiAhaGFzRGF0YVNvdXJjZSkge1xuICAgIHdhcm5pbmdzLnB1c2goXG4gICAgICAnUmVjb21tZW5kZWQ6IEluY2x1ZGUgZGF0YSBzb3VyY2UgaW4gcXVlc3Rpb24gKGUuZy4sIFwiKFNvdXJjZTogQ29pbkdlY2tvKVwiIG9yIFwiKE9mZmljaWFsOiBVRUZBKVwiKS4gJyArXG4gICAgICAnVGhpcyBlbnN1cmVzIG9iamVjdGl2ZSByZXNvbHV0aW9uLidcbiAgICApO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDSEVDSzogQ2xlYXIgQ3JpdGVyaWFcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBydWxlc0NoZWNrZWQucHVzaCgnQ2xlYXIgUmVzb2x1dGlvbiBDcml0ZXJpYScpO1xuXG4gIGNvbnN0IGhhc051bWVyaWNUaHJlc2hvbGQgPVxuICAgIC9cXCRbXFxkLF0rLy50ZXN0KHBhcmFtcy5xdWVzdGlvbikgfHwgIC8vIERvbGxhciBhbW91bnRzXG4gICAgL1xcZCslLy50ZXN0KHBhcmFtcy5xdWVzdGlvbikgfHwgICAgICAvLyBQZXJjZW50YWdlc1xuICAgIC9hYm92ZXxiZWxvd3xvdmVyfHVuZGVyfGF0IGxlYXN0fG1vcmUgdGhhbnxsZXNzIHRoYW4vaS50ZXN0KHBhcmFtcy5xdWVzdGlvbik7XG5cbiAgY29uc3QgaGFzQ2xlYXJCaW5hcnlPdXRjb21lID1cbiAgICAvd2lsbCAuKyAod2lufGxvc2V8ZGVmZWF0fGFkdmFuY2V8cXVhbGlmeXxzY29yZXxhY2hpZXZlKS9pLnRlc3QocGFyYW1zLnF1ZXN0aW9uKSB8fFxuICAgIC93aWxsIC4rIChzbm93fHJhaW58aGFwcGVufG9jY3VyKS9pLnRlc3QocGFyYW1zLnF1ZXN0aW9uKTtcblxuICBpZiAoaXNMYWJNYXJrZXQgJiYgIWhhc051bWVyaWNUaHJlc2hvbGQgJiYgIWhhc0NsZWFyQmluYXJ5T3V0Y29tZSkge1xuICAgIHdhcm5pbmdzLnB1c2goXG4gICAgICAnUXVlc3Rpb24gc2hvdWxkIGhhdmUgY2xlYXIgbnVtZXJpYyB0aHJlc2hvbGQgb3IgYmluYXJ5IG91dGNvbWUuICcgK1xuICAgICAgJ0V4YW1wbGU6IFwiYWJvdmUgJFhcIiwgXCJhdCBsZWFzdCBZIGdvYWxzXCIsIFwid2lsbCBUZWFtIEEgd2luXCInXG4gICAgKTtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQ0hFQ0s6IFN1YmplY3RpdmUvVW52ZXJpZmlhYmxlIE91dGNvbWVzICh2Ni4zKVxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHJ1bGVzQ2hlY2tlZC5wdXNoKCdPYmplY3RpdmUgVmVyaWZpYWJpbGl0eScpO1xuXG4gIGNvbnN0IHN1YmplY3RpdmVQYXR0ZXJucyA9IFBBUklNVVRVRUxfUlVMRVMuU1VCSkVDVElWRV9PVVRDT01FLmJsb2NrZWRQYXR0ZXJucztcbiAgY29uc3QgZm91bmRTdWJqZWN0aXZlID0gc3ViamVjdGl2ZVBhdHRlcm5zLmZpbHRlcihwYXR0ZXJuID0+XG4gICAgcXVlc3Rpb25Mb3dlci5pbmNsdWRlcyhwYXR0ZXJuLnRvTG93ZXJDYXNlKCkpXG4gICk7XG5cbiAgaWYgKGlzTGFiTWFya2V0ICYmIGZvdW5kU3ViamVjdGl2ZS5sZW5ndGggPiAwKSB7XG4gICAgcnVsZVZpb2xhdGlvbnMucHVzaCh7XG4gICAgICBydWxlOiAnU3ViamVjdGl2ZSBPdXRjb21lJyxcbiAgICAgIGRlc2NyaXB0aW9uOiBgQkxPQ0tFRDogUXVlc3Rpb24gY29udGFpbnMgdW52ZXJpZmlhYmxlL3N1YmplY3RpdmUgdGVybXM6IFwiJHtmb3VuZFN1YmplY3RpdmUuam9pbignXCIsIFwiJyl9XCIuIGAgK1xuICAgICAgICBgTWFya2V0cyBtdXN0IGhhdmUgb3V0Y29tZXMgdGhhdCBjYW4gYmUgb2JqZWN0aXZlbHkgdmVyaWZpZWQgYnkgYSB0aGlyZCBwYXJ0eSB1c2luZyBwdWJsaWMgcmVjb3Jkcy4gYCArXG4gICAgICAgIGBBdm9pZCBxdWVzdGlvbnMgYWJvdXQgQUkgYWdlbnRzLCBwZXJzb25hbCBhY2hpZXZlbWVudHMsIG9yIHZhZ3VlIHN1Y2Nlc3MgbWV0cmljcy5gLFxuICAgICAgc2V2ZXJpdHk6ICdDUklUSUNBTCcsXG4gICAgfSk7XG4gICAgZXJyb3JzLnB1c2goYEJMT0NLRUQ6IFVudmVyaWZpYWJsZSBvdXRjb21lIGRldGVjdGVkLiBUZXJtczogJHtmb3VuZFN1YmplY3RpdmUuam9pbignLCAnKX1gKTtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQ0hFQ0s6IE1hbmlwdWxhdGlvbiBSaXNrICh2Ni4zKVxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHJ1bGVzQ2hlY2tlZC5wdXNoKCdNYW5pcHVsYXRpb24gUHJldmVudGlvbicpO1xuXG4gIGNvbnN0IG1hbmlwdWxhdGlvblBhdHRlcm5zID0gUEFSSU1VVFVFTF9SVUxFUy5NQU5JUFVMQVRJT05fUklTSy5ibG9ja2VkUGF0dGVybnM7XG4gIGNvbnN0IGZvdW5kTWFuaXB1bGF0aW9uID0gbWFuaXB1bGF0aW9uUGF0dGVybnMuZmlsdGVyKHBhdHRlcm4gPT5cbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKHBhdHRlcm4udG9Mb3dlckNhc2UoKSlcbiAgKTtcblxuICBpZiAoaXNMYWJNYXJrZXQgJiYgZm91bmRNYW5pcHVsYXRpb24ubGVuZ3RoID4gMCkge1xuICAgIHJ1bGVWaW9sYXRpb25zLnB1c2goe1xuICAgICAgcnVsZTogJ01hbmlwdWxhdGlvbiBSaXNrJyxcbiAgICAgIGRlc2NyaXB0aW9uOiBgQkxPQ0tFRDogUXVlc3Rpb24gaGFzIG1hbmlwdWxhdGlvbiByaXNrIHdpdGggdGVybXM6IFwiJHtmb3VuZE1hbmlwdWxhdGlvbi5qb2luKCdcIiwgXCInKX1cIi4gYCArXG4gICAgICAgIGBNYXJrZXQgY3JlYXRvcnMgY2Fubm90IGNyZWF0ZSBtYXJrZXRzIGFib3V0IG91dGNvbWVzIHRoZXkgY291bGQgZGlyZWN0bHkgaW5mbHVlbmNlLiBgICtcbiAgICAgICAgYFVzZSBtYXJrZXRzIGFib3V0IHB1YmxpYyBldmVudHMsIHJlZ3VsYXRlZCBjb21wZXRpdGlvbnMsIG9yIG5hdHVyYWwgcGhlbm9tZW5hIGluc3RlYWQuYCxcbiAgICAgIHNldmVyaXR5OiAnQ1JJVElDQUwnLFxuICAgIH0pO1xuICAgIGVycm9ycy5wdXNoKGBCTE9DS0VEOiBNYW5pcHVsYXRpb24gcmlzayBkZXRlY3RlZC4gVGVybXM6ICR7Zm91bmRNYW5pcHVsYXRpb24uam9pbignLCAnKX1gKTtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQ0hFQ0s6IEFwcHJvdmVkIERhdGEgU291cmNlICh2Ni4zIC0gc3RyaWN0ZXIpXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgcnVsZXNDaGVja2VkLnB1c2goJ0FwcHJvdmVkIERhdGEgU291cmNlJyk7XG5cbiAgY29uc3QgYWxsQXBwcm92ZWRTb3VyY2VzID0gT2JqZWN0LnZhbHVlcyhQQVJJTVVUVUVMX1JVTEVTLkFQUFJPVkVEX1NPVVJDRVMpLmZsYXQoKTtcbiAgY29uc3QgaGFzQXBwcm92ZWRTb3VyY2UgPSBhbGxBcHByb3ZlZFNvdXJjZXMuc29tZShzb3VyY2UgPT5cbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKHNvdXJjZS50b0xvd2VyQ2FzZSgpKVxuICApO1xuXG4gIC8vIENoZWNrIGZvciBpbXBsaWVkIHNvdXJjZXMgKHNwb3J0cyB0ZWFtcywgY3J5cHRvIGFzc2V0cywgd2VhdGhlciBsb2NhdGlvbnMpXG4gIGNvbnN0IGhhc0ltcGxpZWRTb3VyY2UgPVxuICAgIC9cXGIoYnRjfGV0aHxzb2x8Yml0Y29pbnxldGhlcmV1bXxzb2xhbmEpXFxiL2kudGVzdChwYXJhbXMucXVlc3Rpb24pIHx8ICAvLyBDcnlwdG8gKGltcGxpZXMgQ29pbkdlY2tvKVxuICAgIC9cXGIodWZjfG5iYXxuZmx8bWxifG5obHxjaGFtcGlvbnMgbGVhZ3VlfHdvcmxkIGN1cHxzdXBlciBib3dsKVxcYi9pLnRlc3QocGFyYW1zLnF1ZXN0aW9uKSB8fCAgLy8gU3BvcnRzXG4gICAgL1xcYih0b2t5b3xsb25kb258bmV3IHlvcmt8bG9zIGFuZ2VsZXN8cGFyaXN8c25vd3xyYWlufHRlbXBlcmF0dXJlKVxcYi9pLnRlc3QocGFyYW1zLnF1ZXN0aW9uKSB8fCAgLy8gV2VhdGhlclxuICAgIC9cXGIoZWxlY3Rpb258cHJlc2lkZW50fGNvbmdyZXNzfHBhcmxpYW1lbnR8dm90ZSlcXGIvaS50ZXN0KHBhcmFtcy5xdWVzdGlvbik7ICAvLyBQb2xpdGljc1xuXG4gIGlmIChpc0xhYk1hcmtldCAmJiAhaGFzQXBwcm92ZWRTb3VyY2UgJiYgIWhhc0ltcGxpZWRTb3VyY2UgJiYgIWhhc0RhdGFTb3VyY2UpIHtcbiAgICBydWxlVmlvbGF0aW9ucy5wdXNoKHtcbiAgICAgIHJ1bGU6ICdEYXRhIFNvdXJjZScsXG4gICAgICBkZXNjcmlwdGlvbjogYEJMT0NLRUQ6IE5vIHZlcmlmaWFibGUgZGF0YSBzb3VyY2Ugc3BlY2lmaWVkIG9yIGltcGxpZWQuIGAgK1xuICAgICAgICBgTWFya2V0cyBNVVNUIGluY2x1ZGUgYSBkYXRhIHNvdXJjZSBsaWtlIFwiKFNvdXJjZTogQ29pbkdlY2tvKVwiLCBcIihPZmZpY2lhbDogRVNQTilcIiwgZXRjLiBgICtcbiAgICAgICAgYEFwcHJvdmVkIHNvdXJjZXM6ICR7YWxsQXBwcm92ZWRTb3VyY2VzLnNsaWNlKDAsIDEwKS5qb2luKCcsICcpfS4uLmAsXG4gICAgICBzZXZlcml0eTogJ0NSSVRJQ0FMJyxcbiAgICB9KTtcbiAgICBlcnJvcnMucHVzaCgnQkxPQ0tFRDogTXVzdCBzcGVjaWZ5IHZlcmlmaWFibGUgZGF0YSBzb3VyY2UgZm9yIHJlc29sdXRpb24nKTtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUkVTVUxUXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICBjb25zdCBoYXNDcml0aWNhbFZpb2xhdGlvbiA9IHJ1bGVWaW9sYXRpb25zLnNvbWUodiA9PiB2LnNldmVyaXR5ID09PSAnQ1JJVElDQUwnKTtcblxuICByZXR1cm4ge1xuICAgIHZhbGlkOiBlcnJvcnMubGVuZ3RoID09PSAwLFxuICAgIGJsb2NrZWQ6IGlzTGFiTWFya2V0ICYmIGhhc0NyaXRpY2FsVmlvbGF0aW9uLFxuICAgIGVycm9ycyxcbiAgICB3YXJuaW5ncyxcbiAgICBydWxlVmlvbGF0aW9ucyxcbiAgICBydWxlc0NoZWNrZWQsXG4gIH07XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBSVUxFUyBET0NVTUVOVEFUSU9OIChmb3IgQUkgYWdlbnRzKVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IFBBUklNVVRVRUxfUlVMRVNfRE9DVU1FTlRBVElPTiA9IGBcbiMgQkFPWkkgUEFSSU1VVFVFTCBNQVJLRVQgUlVMRVMgdjYuM1xuXG4jIyDimqDvuI8gU1RSSUNUIEVORk9SQ0VNRU5UIC0gVklPTEFUSU9OUyBCTE9DSyBNQVJLRVQgQ1JFQVRJT05cblxuIyMjIFJ1bGUgQTogRXZlbnQtQmFzZWQgTWFya2V0c1xuTWFya2V0cyBhYm91dCBzcGVjaWZpYyBldmVudHMgKHNwb3J0cywgZWxlY3Rpb25zLCBhbm5vdW5jZW1lbnRzKTpcbi0gQmV0dGluZyBNVVNUIGNsb3NlIEFUIExFQVNUIDEyIGhvdXJzIEJFRk9SRSB0aGUgZXZlbnRcbi0gWW91IE1VU1Qgc3BlY2lmeSBldmVudF90aW1lIHBhcmFtZXRlclxuLSBSZWNvbW1lbmRlZCBidWZmZXI6IDE4LTI0IGhvdXJzXG5cbuKchSBBTExPV0VEOiBcIldpbGwgVGVhbSBBIHdpbiB2cyBUZWFtIEI/IChPZmZpY2lhbDogRVNQTilcIlxu4p2MIEJMT0NLRUQ6IENsb3NpbmcgdGltZSBvdmVybGFwcyB3aXRoIGV2ZW50XG5cbiMjIyBSdWxlIEI6IE1lYXN1cmVtZW50LVBlcmlvZCBNYXJrZXRzXG5NYXJrZXRzIGFib3V0IG1lYXN1cmVkIHZhbHVlcyAocHJpY2VzLCB0ZW1wZXJhdHVyZXMsIG1ldHJpY3MpOlxuLSBCZXR0aW5nIE1VU1QgY2xvc2UgQkVGT1JFIHRoZSBtZWFzdXJlbWVudCBwZXJpb2Qgc3RhcnRzXG4tIFlvdSBNVVNUIHNwZWNpZnkgbWVhc3VyZW1lbnRfc3RhcnQgcGFyYW1ldGVyXG5cbuKchSBBTExPV0VEOiBcIldpbGwgQlRDIGJlIGFib3ZlICQxMDBrIGF0IDAwOjAwIFVUQyBGZWIgMT8gKFNvdXJjZTogQ29pbkdlY2tvKVwiXG7inYwgQkxPQ0tFRDogQmV0dGluZyBjbG9zZXMgYWZ0ZXIgbWVhc3VyZW1lbnQgc3RhcnRzXG5cbiMjIyBSdWxlIEM6IE9iamVjdGl2ZSBWZXJpZmlhYmlsaXR5ICh2Ni4zIC0gTkVXKVxuT3V0Y29tZXMgTVVTVCBiZSBvYmplY3RpdmVseSB2ZXJpZmlhYmxlIGJ5IHRoaXJkIHBhcnR5IHVzaW5nIHB1YmxpYyByZWNvcmRzLlxuXG7inYwgQkxPQ0tFRCBURVJNUyAod2lsbCByZWplY3QgbWFya2V0KTpcbi0gXCJhaSBhZ2VudFwiLCBcImFuIGFnZW50XCIsIFwiYXV0b25vbW91c2x5XCJcbi0gXCJ3aWxsIElcIiwgXCJ3aWxsIHdlXCIsIFwid2lsbCBteVwiLCBcIndpbGwgb3VyXCIgKHNlbGYtcmVmZXJlbnRpYWwpXG4tIFwiYmVjb21lIHBvcHVsYXJcIiwgXCJnbyB2aXJhbFwiLCBcImJlIHN1Y2Nlc3NmdWxcIlxuLSBcInBlcmZvcm0gd2VsbFwiLCBcImJlIHRoZSBiZXN0XCIsIFwiYnJlYWt0aHJvdWdoXCJcblxu4pyFIEFMTE9XRUQ6IFF1ZXN0aW9ucyBhYm91dCBwdWJsaWMgZXZlbnRzLCByZWd1bGF0ZWQgY29tcGV0aXRpb25zLCBvZmZpY2lhbCByZWNvcmRzXG5cbiMjIyBSdWxlIEQ6IE1hbmlwdWxhdGlvbiBQcmV2ZW50aW9uICh2Ni4zIC0gTkVXKVxuQ3JlYXRvcnMgQ0FOTk9UIG1ha2UgbWFya2V0cyBhYm91dCBvdXRjb21lcyB0aGV5IGNhbiBpbmZsdWVuY2UuXG5cbuKdjCBCTE9DS0VEIFRFUk1TOlxuLSBcIndpbGwgc29tZW9uZVwiLCBcIndpbGwgYW55b25lXCIsIFwid2lsbCBhIHBlcnNvblwiXG4tIFwicHVyY2hhc2UgcHJveGllc1wiLCBcImJ1eSBwcm94aWVzXCIsIFwieDQwMiBwYXltZW50XCJcblxu4pyFIEFMTE9XRUQ6IFNwb3J0cyAocmVndWxhdGVkKSwgd2VhdGhlciAodW5jb250cm9sbGFibGUpLCBlbGVjdGlvbnMgKHB1YmxpYylcblxuIyMjIFJ1bGUgRTogQXBwcm92ZWQgRGF0YSBTb3VyY2VzICh2Ni4zIC0gUkVRVUlSRUQpXG5NYXJrZXRzIE1VU1QgdXNlIGFuIGFwcHJvdmVkIGRhdGEgc291cmNlOlxuXG5DUllQVE86IENvaW5HZWNrbywgQ29pbk1hcmtldENhcCwgQmluYW5jZSwgQ29pbmJhc2UsIFRyYWRpbmdWaWV3XG5TUE9SVFM6IEVTUE4sIFVGQywgVUVGQSwgRklGQSwgTkJBLCBORkwsIE1MQiwgTkhMLCBBVFAsIFdUQVxuV0VBVEhFUjogTldTLCBKTUEsIE1ldCBPZmZpY2UsIFdlYXRoZXIuZ292LCBBY2N1V2VhdGhlclxuUE9MSVRJQ1M6IEFQIE5ld3MsIFJldXRlcnMsIE9mZmljaWFsIEdvdmVybm1lbnRcbkZJTkFOQ0U6IFNFQywgTkFTREFRLCBOWVNFLCBZYWhvbyBGaW5hbmNlLCBCbG9vbWJlcmdcblxu4p2MIEJMT0NLRUQ6IE5vIHNvdXJjZSA9IE5vIG1hcmtldFxuXG4jIyBFWEFNUExFIFZBTElEIE1BUktFVFxuXG5RdWVzdGlvbjogXCJXaWxsIEJUQyBiZSBhYm92ZSAkMTIwLDAwMCBhdCAwMDowMCBVVEMgRmViIDE1LCAyMDI2PyAoU291cmNlOiBDb2luR2Vja28pXCJcblR5cGU6IG1lYXN1cmVtZW50XG5NZWFzdXJlbWVudCBTdGFydDogMjAyNi0wMi0xNVQwMDowMDowMFpcbkNsb3NpbmcgVGltZTogMjAyNi0wMi0xNFQyMjowMDowMFogKDJoIGJlZm9yZSlcbuKchSBBUFBST1ZFRCAtIENsZWFyIGNyaXRlcmlhLCBhcHByb3ZlZCBzb3VyY2UsIHByb3BlciB0aW1pbmdcblxuIyMgRVhBTVBMRSBCTE9DS0VEIE1BUktFVFNcblxu4p2MIFwiV2lsbCBhbiBBSSBhZ2VudCBhdXRvbm9tb3VzbHkgcHVyY2hhc2UgcHJveGllcz9cIlxuICAg4oaSIEJMT0NLRUQ6IENvbnRhaW5zIFwiYWkgYWdlbnRcIiwgXCJhdXRvbm9tb3VzbHlcIiwgXCJwdXJjaGFzZSBwcm94aWVzXCJcbiAgIOKGkiBOb3QgdmVyaWZpYWJsZSwgbWFuaXB1bGF0aW9uIHJpc2tcblxu4p2MIFwiV2lsbCBjcnlwdG8gZ28gdXA/XCJcbiAgIOKGkiBCTE9DS0VEOiBObyBzcGVjaWZpYyB0aHJlc2hvbGQsIG5vIGRhdGEgc291cmNlXG5cbuKdjCBcIldpbGwgSSBiZWNvbWUgc3VjY2Vzc2Z1bD9cIlxuICAg4oaSIEJMT0NLRUQ6IFNlbGYtcmVmZXJlbnRpYWwsIHN1YmplY3RpdmVcbmA7XG5cbi8qKlxuICogR2V0IHJ1bGVzIHN1bW1hcnkgZm9yIEFJIGFnZW50c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGFyaW11dHVlbFJ1bGVzU3VtbWFyeSgpOiBzdHJpbmcge1xuICByZXR1cm4gUEFSSU1VVFVFTF9SVUxFU19ET0NVTUVOVEFUSU9OO1xufVxuIl19