/**
 * BAOZI PARIMUTUEL MARKET RULES v6.2
 *
 * STRICT ENFORCEMENT - All Lab markets MUST comply with these rules.
 * AI agents creating markets through MCP MUST validate against these rules.
 * Markets that don't comply will be BLOCKED from creation.
 */
export declare const PARIMUTUEL_RULES: {
    version: string;
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
        name: string;
        minBufferHours: number;
        recommendedBufferHours: number;
        requirement: string;
        rationale: string;
    };
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
        name: string;
        requirement: string;
        rationale: string;
        recommendedBufferHours: number;
    };
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
        name: string;
        requirement: string;
        rationale: string;
    };
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
        name: string;
        requirement: string;
        rationale: string;
    };
};
export interface ParimutuelValidationResult {
    valid: boolean;
    blocked: boolean;
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
export declare function validateParimutuelRules(params: {
    question: string;
    closingTime: Date;
    marketType?: 'event' | 'measurement';
    eventTime?: Date;
    measurementStart?: Date;
    layer: 'official' | 'lab' | 'private';
}): ParimutuelValidationResult;
export declare const PARIMUTUEL_RULES_DOCUMENTATION = "\n# BAOZI PARIMUTUEL MARKET RULES v6.2\n\n## MANDATORY FOR ALL LAB MARKETS\n\n### Rule A: Event-Based Markets\nMarkets about specific events (sports, elections, announcements):\n- Betting MUST close AT LEAST 12 hours BEFORE the event\n- You MUST specify event_time parameter\n- Recommended buffer: 18-24 hours\n\nExample:\n- Question: \"Will Team A win vs Team B?\"\n- Event time: Game start (e.g., 2026-02-15T20:00:00Z)\n- Closing time: At least 12h before (e.g., 2026-02-15T08:00:00Z)\n\n### Rule B: Measurement-Period Markets\nMarkets about measured values (prices, temperatures, metrics):\n- Betting MUST close BEFORE the measurement period starts\n- You MUST specify measurement_start parameter\n- Recommended: betting closes 1-2 hours before measurement\n\nExample:\n- Question: \"Will BTC be above $100k at 00:00 UTC Feb 1?\"\n- Measurement start: 2026-02-01T00:00:00Z\n- Closing time: BEFORE measurement (e.g., 2026-01-31T22:00:00Z)\n\n### Data Source Requirement\n- Include verifiable data source in question\n- Examples: \"(Source: CoinGecko)\", \"(Official: UEFA)\", \"(NWS Los Angeles)\"\n\n### Clear Criteria\n- Question must have unambiguous YES/NO resolution\n- Include specific thresholds: \"$100,000\", \"3+ goals\", etc.\n\n## VIOLATIONS WILL BLOCK MARKET CREATION\n\nIf you try to create a market that violates these rules, the MCP will:\n1. Return blocked: true\n2. List specific rule violations\n3. Refuse to build the transaction\n\n## CLASSIFICATION REQUIRED\n\nEvery Lab market MUST be classified as either:\n1. Event-based (provide event_time) - Rule A applies\n2. Measurement-based (provide measurement_start) - Rule B applies\n\nUnclassified markets will be BLOCKED.\n";
/**
 * Get rules summary for AI agents
 */
export declare function getParimutuelRulesSummary(): string;
