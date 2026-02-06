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
        name: string;
        requirement: string;
        rationale: string;
        blockedPatterns: string[];
    };
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
        name: string;
        requirement: string;
        rationale: string;
        blockedPatterns: string[];
    };
    /**
     * APPROVED DATA SOURCES (v6.3)
     *
     * Markets MUST use one of these approved data sources for resolution.
     * This ensures verifiable, dispute-free outcomes.
     */
    APPROVED_SOURCES: {
        crypto: string[];
        sports: string[];
        weather: string[];
        politics: string[];
        finance: string[];
        social: string[];
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
export declare const PARIMUTUEL_RULES_DOCUMENTATION = "\n# BAOZI PARIMUTUEL MARKET RULES v6.3\n\n## \u26A0\uFE0F STRICT ENFORCEMENT - VIOLATIONS BLOCK MARKET CREATION\n\n### Rule A: Event-Based Markets\nMarkets about specific events (sports, elections, announcements):\n- Betting MUST close AT LEAST 12 hours BEFORE the event\n- You MUST specify event_time parameter\n- Recommended buffer: 18-24 hours\n\n\u2705 ALLOWED: \"Will Team A win vs Team B? (Official: ESPN)\"\n\u274C BLOCKED: Closing time overlaps with event\n\n### Rule B: Measurement-Period Markets\nMarkets about measured values (prices, temperatures, metrics):\n- Betting MUST close BEFORE the measurement period starts\n- You MUST specify measurement_start parameter\n\n\u2705 ALLOWED: \"Will BTC be above $100k at 00:00 UTC Feb 1? (Source: CoinGecko)\"\n\u274C BLOCKED: Betting closes after measurement starts\n\n### Rule C: Objective Verifiability (v6.3 - NEW)\nOutcomes MUST be objectively verifiable by third party using public records.\n\n\u274C BLOCKED TERMS (will reject market):\n- \"ai agent\", \"an agent\", \"autonomously\"\n- \"will I\", \"will we\", \"will my\", \"will our\" (self-referential)\n- \"become popular\", \"go viral\", \"be successful\"\n- \"perform well\", \"be the best\", \"breakthrough\"\n\n\u2705 ALLOWED: Questions about public events, regulated competitions, official records\n\n### Rule D: Manipulation Prevention (v6.3 - NEW)\nCreators CANNOT make markets about outcomes they can influence.\n\n\u274C BLOCKED TERMS:\n- \"will someone\", \"will anyone\", \"will a person\"\n- \"purchase proxies\", \"buy proxies\", \"x402 payment\"\n\n\u2705 ALLOWED: Sports (regulated), weather (uncontrollable), elections (public)\n\n### Rule E: Approved Data Sources (v6.3 - REQUIRED)\nMarkets MUST use an approved data source:\n\nCRYPTO: CoinGecko, CoinMarketCap, Binance, Coinbase, TradingView\nSPORTS: ESPN, UFC, UEFA, FIFA, NBA, NFL, MLB, NHL, ATP, WTA\nWEATHER: NWS, JMA, Met Office, Weather.gov, AccuWeather\nPOLITICS: AP News, Reuters, Official Government\nFINANCE: SEC, NASDAQ, NYSE, Yahoo Finance, Bloomberg\n\n\u274C BLOCKED: No source = No market\n\n## EXAMPLE VALID MARKET\n\nQuestion: \"Will BTC be above $120,000 at 00:00 UTC Feb 15, 2026? (Source: CoinGecko)\"\nType: measurement\nMeasurement Start: 2026-02-15T00:00:00Z\nClosing Time: 2026-02-14T22:00:00Z (2h before)\n\u2705 APPROVED - Clear criteria, approved source, proper timing\n\n## EXAMPLE BLOCKED MARKETS\n\n\u274C \"Will an AI agent autonomously purchase proxies?\"\n   \u2192 BLOCKED: Contains \"ai agent\", \"autonomously\", \"purchase proxies\"\n   \u2192 Not verifiable, manipulation risk\n\n\u274C \"Will crypto go up?\"\n   \u2192 BLOCKED: No specific threshold, no data source\n\n\u274C \"Will I become successful?\"\n   \u2192 BLOCKED: Self-referential, subjective\n";
/**
 * Get rules summary for AI agents
 */
export declare function getParimutuelRulesSummary(): string;
