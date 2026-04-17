/**
 * BAOZI PARIMUTUEL MARKET RULES v7.2
 *
 * STRICT ENFORCEMENT - All Lab markets MUST comply with these rules.
 * AI agents creating markets through MCP MUST validate against these rules.
 * Markets that don't comply will be BLOCKED from creation.
 *
 * v7.2 TWO ALLOWED TYPES:
 * Type A: Scheduled Event — outcome revealed at one moment. Betting closes 24h before.
 * Type B: Measurement Period — data collected over defined period. Betting closes BEFORE period starts.
 *
 * BANNED:
 * - Price predictions (observable continuously)
 * - Open-window deadline markets (event observable instantly when it happens)
 * - Subjective/unverifiable outcomes
 * - Manipulable outcomes
 */
// =============================================================================
// MANDATORY RULES - MARKETS WILL BE BLOCKED IF VIOLATED
// =============================================================================
export const PARIMUTUEL_RULES = {
    version: '7.2',
    /**
     * TYPE A: Scheduled Event Markets
     * Outcome revealed at one specific moment (fight end, ceremony, announcement).
     * Betting closes 24h+ before the event.
     */
    TYPE_A: {
        name: 'Scheduled Event',
        minBufferHours: 24,
        requirement: 'Betting must close 24h+ BEFORE the scheduled event.',
        rationale: 'Nobody has information about the outcome while betting is open.',
    },
    /**
     * TYPE B: Measurement-Period Markets
     * Data collected over a defined period (chart tracking week, opening weekend, etc.).
     * Betting closes BEFORE the measurement period starts.
     */
    TYPE_B: {
        name: 'Measurement Period',
        requirement: 'Betting must close BEFORE the measurement period starts.',
        rationale: 'Nobody has any measurement data while betting is open.',
    },
    /**
     * HARD BAN 1: Price Prediction Markets
     */
    PRICE_BAN: {
        name: 'Price Prediction Ban',
        requirement: 'All price prediction markets are BANNED',
        rationale: 'Prices are continuous, observable, and autocorrelated. Pool just mirrors what everyone can see.',
        blockedPatterns: [
            'price above', 'price below', 'price at', 'price by',
            'trading above', 'trading below',
            'market cap above', 'market cap below',
            'ath', 'all-time high', 'floor price',
        ],
    },
    /**
     * HARD BAN 2: Real-Time Observable Measurement Markets
     * Note: Measurement-period markets ARE allowed if betting closes BEFORE measurement starts.
     * This ban is for measurements where data is observable in real-time (tweet counts, stream hours, etc.)
     */
    REALTIME_MEASUREMENT_BAN: {
        name: 'Real-Time Observable Measurement Ban',
        requirement: 'Markets measuring real-time observable data are BANNED (tweet counts, stream hours, follower counts)',
        rationale: 'Data is observable in real-time during the period. Late bettors have edge.',
        blockedPatterns: [
            'tweet count', 'how many tweets',
            'stream count', 'stream hours',
            'follower count', 'view count',
            'total volume', 'total burned',
            'gains most', 'average over',
        ],
    },
    /**
     * HARD BAN 3: Open-Window Deadline Markets
     *
     * Markets where the event can happen at ANY time within a window
     * and is INSTANTLY OBSERVABLE when it happens.
     *
     * WHY THIS FAILS:
     * "Will Drake drop an album before March 1?"
     * - Drake drops album Feb 14. Everyone sees it on Spotify instantly.
     * - Betting still open. Pool floods to YES. Winners get 1.02x.
     * - Market is dead. This is NOT what pari-mutuel is for.
     */
    OPEN_WINDOW_BAN: {
        name: 'Open-Window Deadline Ban',
        requirement: 'All "before [deadline]" markets where event is instantly observable are BANNED',
        rationale: 'Event observable instantly when it happens. Pool floods to obvious answer. Winners get ~1.01x. Dead market.',
        blockedPatterns: [
            'resign before', 'quit before', 'retire before',
            'drop before', 'release before', 'launch before',
            'announce before', 'announce by', 'announced before',
            'list before', 'listed before',
            'approve before', 'approved before',
            'covered before', 'covered by news',
            'sign before', 'signed before',
            'file before', 'filed before',
            'publish before', 'published before',
            'report before', 'reported before',
            'reveal before', 'revealed before',
            'confirm before', 'confirmed before',
            'tweet about', 'post about',
            'sell out within', 'sell out before',
            'bring back before',
            'ipo before',
            'will ever',
        ],
    },
    /**
     * HARD BAN 4: Subjective / Unverifiable Outcomes
     */
    SUBJECTIVE_OUTCOME: {
        name: 'Objective Verifiability',
        requirement: 'Outcome must be objectively verifiable by third party with public record',
        rationale: 'Prevents unresolvable disputes and manipulation',
        blockedPatterns: [
            'ai agent', 'an agent', 'autonomously',
            'become popular', 'go viral', 'be successful',
            'perform well', 'be the best', 'breakthrough',
            'revolutionary', 'dominate', 'take over',
            'will i ', 'will we ', 'will my ', 'will our ',
        ],
    },
    /**
     * HARD BAN 5: Manipulable Outcomes
     */
    MANIPULATION_RISK: {
        name: 'Manipulation Prevention',
        requirement: 'Creator must not be able to directly influence outcome',
        rationale: 'Prevents insider manipulation and unfair markets',
        blockedPatterns: [
            'will someone', 'will anyone', 'will a person', 'will a user',
            'purchase proxies', 'buy proxies', 'x402 payment', 'using credits',
        ],
    },
    /**
     * HARD BAN 6: Unverifiable
     */
    UNVERIFIABLE: {
        name: 'Unverifiable Terms',
        blockedPatterns: [
            'secretly', 'behind the scenes', 'rumored',
        ],
    },
    /**
     * APPROVED DATA SOURCES (v7.2)
     */
    APPROVED_SOURCES: {
        esports: ['hltv', 'hltv.org', 'lolesports', 'lolesports.com', 'liquipedia', 'vlr.gg', 'dotabuff'],
        mma_boxing: ['ufc', 'ufc.com', 'espn', 'sherdog', 'tapology'],
        sports: ['nfl', 'nba', 'mlb', 'nhl', 'fifa', 'uefa', 'espn', 'premierleague', 'fia'],
        awards: ['academy awards', 'recording academy', 'the game awards'],
        politics: ['ap news', 'reuters', 'associated press', 'official government', 'congress.gov', 'federal reserve'],
        entertainment: ['netflix top 10', 'billboard', 'box office mojo', 'metacritic', 'rotten tomatoes'],
        weather: ['nws', 'noaa', 'weather.gov', 'nhc', 'met office', 'jma'],
        tech: ['apple.com', 'official press release', 'sec filings'],
        finance: ['federal reserve', 'bls', 'fred', 'cme fedwatch', 'sec'],
        reality_tv: ['official broadcast', 'network', 'streaming platform'],
    },
};
/**
 * Validate market against parimutuel rules v7.2
 * Returns BLOCKED=true if market violates mandatory rules
 */
export function validateParimutuelRules(params) {
    const errors = [];
    const warnings = [];
    const ruleViolations = [];
    const rulesChecked = [];
    const isLabMarket = params.layer === 'lab';
    const questionLower = params.question.toLowerCase();
    // =========================================================================
    // CHECK: Market Type Classification
    // =========================================================================
    rulesChecked.push('Market Type Classification');
    const scheduledMoment = params.scheduledMoment || params.eventTime;
    const isTypeA = !!scheduledMoment;
    const isTypeB = !!params.measurementStart;
    if (isLabMarket && !isTypeA && !isTypeB) {
        ruleViolations.push({
            rule: 'Market Classification',
            description: 'v7.2 requires either event_time/scheduled_moment (Type A) or measurement_start (Type B). ' +
                'Type A: outcome revealed at scheduled event (fight end, ceremony, announcement). ' +
                'Type B: data measured over defined period (chart tracking week, opening weekend). ' +
                'Without this, market cannot be validated.',
            severity: 'CRITICAL',
        });
        errors.push('BLOCKED: Must specify event_time (Type A) or measurement_start (Type B)');
    }
    // =========================================================================
    // CHECK: Type A - Event Buffer (24h minimum)
    // =========================================================================
    if (isTypeA && scheduledMoment) {
        rulesChecked.push('Type A: 24h Buffer');
        const bufferMs = scheduledMoment.getTime() - params.closingTime.getTime();
        const bufferHours = bufferMs / (1000 * 60 * 60);
        if (bufferHours < PARIMUTUEL_RULES.TYPE_A.minBufferHours) {
            ruleViolations.push({
                rule: 'Type A Buffer',
                description: `Buffer is ${bufferHours.toFixed(1)}h but minimum is 24h. ` +
                    `Betting must close at least 24 hours BEFORE the scheduled event.`,
                severity: 'CRITICAL',
            });
            errors.push(`BLOCKED: Betting must close 24+ hours before event (currently ${bufferHours.toFixed(1)}h)`);
        }
    }
    // =========================================================================
    // CHECK: Type B - Betting closes BEFORE measurement starts
    // =========================================================================
    if (isTypeB && params.measurementStart) {
        rulesChecked.push('Type B: Close Before Measurement');
        if (params.closingTime >= params.measurementStart) {
            const overlapMs = params.closingTime.getTime() - params.measurementStart.getTime();
            const overlapHours = overlapMs / (1000 * 60 * 60);
            ruleViolations.push({
                rule: 'Type B Timing',
                description: `CRITICAL: Betting closes ${overlapHours.toFixed(1)}h AFTER measurement starts! ` +
                    `Betting MUST close BEFORE the measurement period begins. ` +
                    `Bettors would have information advantage during the measurement period.`,
                severity: 'CRITICAL',
            });
            errors.push(`BLOCKED: Betting must close BEFORE measurement starts (currently closes ${overlapHours.toFixed(1)}h AFTER)`);
        }
    }
    // =========================================================================
    // CHECK: Price Prediction Ban
    // =========================================================================
    rulesChecked.push('Price Prediction Ban');
    const pricePatterns = PARIMUTUEL_RULES.PRICE_BAN.blockedPatterns;
    const foundPrice = pricePatterns.filter(p => questionLower.includes(p.toLowerCase()));
    if (foundPrice.length > 0) {
        ruleViolations.push({
            rule: 'Price Ban',
            description: `BLOCKED: Price prediction markets are banned. Found: "${foundPrice.join('", "')}". ` +
                `Prices are continuous and observable — pool just mirrors what everyone can see.`,
            severity: 'CRITICAL',
        });
        errors.push(`BLOCKED: Price prediction market. Terms: ${foundPrice.join(', ')}`);
    }
    // =========================================================================
    // CHECK: Real-Time Observable Measurement Ban
    // =========================================================================
    rulesChecked.push('Real-Time Measurement Ban');
    const measurePatterns = PARIMUTUEL_RULES.REALTIME_MEASUREMENT_BAN.blockedPatterns;
    const foundMeasure = measurePatterns.filter(p => questionLower.includes(p.toLowerCase()));
    if (isLabMarket && foundMeasure.length > 0) {
        ruleViolations.push({
            rule: 'Real-Time Measurement',
            description: `BLOCKED: Real-time observable measurement detected: "${foundMeasure.join('", "')}". ` +
                `Metrics like tweet counts, stream hours, and follower counts are observable in real-time. ` +
                `Use Type B markets with defined periods (Billboard chart, box office weekend) where betting closes before the period starts.`,
            severity: 'CRITICAL',
        });
        errors.push(`BLOCKED: Real-time observable measurement. Terms: ${foundMeasure.join(', ')}`);
    }
    // =========================================================================
    // CHECK: Open-Window Deadline Ban
    // =========================================================================
    rulesChecked.push('Open-Window Deadline Ban');
    const openWindowPatterns = PARIMUTUEL_RULES.OPEN_WINDOW_BAN.blockedPatterns;
    const foundOpenWindow = openWindowPatterns.filter(p => questionLower.includes(p.toLowerCase()));
    // Also check for generic "before/by [date]" pattern with observable events
    const monthPattern = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
    const dayPattern = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday';
    const datePattern = `${monthPattern}|${dayPattern}|\\d{4}|\\d{1,2}[/\\-]\\d{1,2}|next\\s+week|end\\s+of|q[1-4]`;
    const hasBeforePattern = new RegExp(`\\b(?:before|by)\\s+(?:${datePattern})`, 'i').test(params.question);
    const hasWithinPattern = /\bwithin\s+\d+\s*(hours?|days?|weeks?|months?)/i.test(params.question);
    if (isLabMarket && (foundOpenWindow.length > 0 || hasBeforePattern || hasWithinPattern)) {
        const detectedTerms = [
            ...foundOpenWindow,
            ...(hasBeforePattern ? ['before/by [date]'] : []),
            ...(hasWithinPattern ? ['within [period]'] : []),
        ];
        ruleViolations.push({
            rule: 'Open-Window Ban',
            description: `BLOCKED: Open-window deadline market detected: "${detectedTerms.join('", "')}". ` +
                `If the event can happen anytime and is instantly observable, the pool gets destroyed. ` +
                `Only markets with a SPECIFIC SCHEDULED revelation moment are allowed.`,
            severity: 'CRITICAL',
        });
        errors.push(`BLOCKED: Open-window deadline market. Terms: ${detectedTerms.join(', ')}`);
    }
    // =========================================================================
    // CHECK: Subjective/Unverifiable Outcomes
    // =========================================================================
    rulesChecked.push('Objective Verifiability');
    const subjectivePatterns = PARIMUTUEL_RULES.SUBJECTIVE_OUTCOME.blockedPatterns;
    const foundSubjective = subjectivePatterns.filter(p => questionLower.includes(p.toLowerCase()));
    if (isLabMarket && foundSubjective.length > 0) {
        ruleViolations.push({
            rule: 'Subjective Outcome',
            description: `BLOCKED: Unverifiable/subjective terms: "${foundSubjective.join('", "')}". ` +
                `Markets must have outcomes verifiable by third party using public records.`,
            severity: 'CRITICAL',
        });
        errors.push(`BLOCKED: Unverifiable outcome. Terms: ${foundSubjective.join(', ')}`);
    }
    // =========================================================================
    // CHECK: Manipulation Risk
    // =========================================================================
    rulesChecked.push('Manipulation Prevention');
    const manipulationPatterns = PARIMUTUEL_RULES.MANIPULATION_RISK.blockedPatterns;
    const foundManipulation = manipulationPatterns.filter(p => questionLower.includes(p.toLowerCase()));
    if (isLabMarket && foundManipulation.length > 0) {
        ruleViolations.push({
            rule: 'Manipulation Risk',
            description: `BLOCKED: Manipulation risk with terms: "${foundManipulation.join('", "')}". ` +
                `Market creators cannot create markets about outcomes they could directly influence.`,
            severity: 'CRITICAL',
        });
        errors.push(`BLOCKED: Manipulation risk. Terms: ${foundManipulation.join(', ')}`);
    }
    // =========================================================================
    // CHECK: Unverifiable
    // =========================================================================
    rulesChecked.push('Unverifiable Terms');
    const unverifiablePatterns = PARIMUTUEL_RULES.UNVERIFIABLE.blockedPatterns;
    const foundUnverifiable = unverifiablePatterns.filter(p => questionLower.includes(p.toLowerCase()));
    if (isLabMarket && foundUnverifiable.length > 0) {
        ruleViolations.push({
            rule: 'Unverifiable',
            description: `BLOCKED: Unverifiable terms: "${foundUnverifiable.join('", "')}".`,
            severity: 'CRITICAL',
        });
        errors.push(`BLOCKED: Unverifiable terms. Terms: ${foundUnverifiable.join(', ')}`);
    }
    // =========================================================================
    // CHECK: Approved Data Source
    // =========================================================================
    rulesChecked.push('Approved Data Source');
    const allApprovedSources = Object.values(PARIMUTUEL_RULES.APPROVED_SOURCES).flat();
    const hasApprovedSource = allApprovedSources.some(source => questionLower.includes(source.toLowerCase()));
    const hasDataSource = questionLower.includes('source:') || questionLower.includes('official');
    // Check for implied sources
    const hasImpliedSource = /\b(ufc|nba|nfl|mlb|nhl|champions league|world cup|super bowl|cs2|counter-strike|league of legends|lol|lck|lec|lpl|dota|valorant|vct|iem|esl|blast|pgl)\b/i.test(params.question) ||
        /\b(oscar|grammy|emmy|golden globe|game awards)\b/i.test(params.question) ||
        /\b(fomc|fed|federal reserve|congress|senate)\b/i.test(params.question) ||
        /\b(billboard|netflix top 10|box office)\b/i.test(params.question) ||
        /\b(snow|rain|temperature|hurricane|weather)\b/i.test(params.question) ||
        /\b(wwdc|ces|apple|google i\/o)\b/i.test(params.question) ||
        /\b(survivor|bachelor|bachelorette|big brother|amazing race)\b/i.test(params.question) ||
        /\b(f1|formula 1|nascar|grand prix)\b/i.test(params.question);
    if (isLabMarket && !hasApprovedSource && !hasImpliedSource && !hasDataSource) {
        ruleViolations.push({
            rule: 'Data Source',
            description: `BLOCKED: No verifiable data source specified or implied. ` +
                `Markets MUST include a data source like "(Source: ESPN)", "(Source: HLTV.org)", etc.`,
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
# BAOZI PARIMUTUEL MARKET RULES v7.2

## STRICT ENFORCEMENT - VIOLATIONS BLOCK MARKET CREATION

### TWO ALLOWED MARKET TYPES

**Type A: Scheduled Event** — Outcome revealed at one moment (fight end, ceremony, announcement).
Rule: betting closes 24h+ BEFORE the event.

**Type B: Measurement Period** — Data collected over defined period (chart week, opening weekend).
Rule: betting closes BEFORE the measurement period starts.

### BANNED (No Exceptions)

1. **Price Predictions** — Prices are continuous and observable. Pool mirrors what everyone sees.
   BLOCKED: "price above", "price below", "trading above", "market cap above", etc.

2. **Open-Window Deadline Markets** — Event can happen anytime, instantly observable.
   BLOCKED: "before [date]" (when event is instantly observable), "resign before",
   "release before", "tweet about before", "IPO before", etc.
   WHY: "Will Drake drop album before March 1?" — drops Feb 14, everyone sees it, pool floods, dead.

3. **Real-Time Observable Measurements** — Tweet counts, stream hours, follower counts.
   BLOCKED: "tweet count", "how many tweets", "stream hours", "follower count", etc.
   NOTE: Defined-period measurements (Billboard chart week, box office weekend) ARE allowed
   if betting closes before the period starts.

4. **Subjective/Unverifiable** — BLOCKED: "go viral", "be successful", "will I", etc.

5. **Manipulable** — BLOCKED: "will someone", "will anyone", "purchase proxies", etc.

### WHAT WORKS

TYPE A (Scheduled Events):
- Sports/MMA: "Will [fighter] win UFC 315?" (fight ends at scheduled time)
- Esports: "Who wins CS2 Grand Final?" (match ends at scheduled time)
- Awards: "Who wins Best Picture?" (announced at ceremony)
- Government: "Will Fed cut rates at FOMC?" (announced at 2 PM ET)
- Weather: "Will it snow in NYC on Feb 28?" (daily summary after date)
- Reality TV: "Who eliminated on Survivor?" (episode airs at scheduled time)

TYPE B (Measurement Periods):
- Charts: "Billboard Hot 100 #1?" (tracking Fri-Thu, bet closes before Friday)
- Charts: "Netflix Top 10 #1?" (tracking Mon-Sun, bet closes before Monday)
- Box Office: "Opening weekend #1?" (Fri-Sun, bet closes before Friday)
- Album: "Will [album] debut #1?" (first week sales, bet closes before release)
- Economic: "BLS unemployment rate?" (measures past month, published first Friday)

### RACE MARKETS (2-10 outcomes) — PREFERRED FORMAT

More outcomes = more spread = better underdog payouts.
Best for: awards, charts, eliminations, tournaments, FOMC decisions.

### APPROVED DATA SOURCES

ESPORTS: HLTV.org, lolesports.com, Liquipedia, vlr.gg
SPORTS: ESPN, UFC.com, NFL.com, NBA.com, MLB.com, FIA
AWARDS: Academy Awards, Recording Academy, The Game Awards, Eurovision
GOVERNMENT: Federal Reserve, Congress.gov, AP News, Reuters
CHARTS: Billboard.com, Netflix Top 10, Box Office Mojo
WEATHER: NOAA, NWS (weather.gov), NHC
TECH: Apple.com/newsroom, official press releases

### QUICK TESTS

Type A: "Is there a scheduled event when the answer is revealed?" YES -> Proceed
Type B: "Is there a defined measurement period, and does betting close before it starts?" YES -> Proceed
Open-Window: "If this happened tomorrow at 3 AM, would everyone instantly know?" YES -> BLOCKED
`;
/**
 * Get rules summary for AI agents
 */
export function getParimutuelRulesSummary() {
    return PARIMUTUEL_RULES_DOCUMENTATION;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyaW11dHVlbC1ydWxlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0aW9uL3BhcmltdXR1ZWwtcnVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFFSCxnRkFBZ0Y7QUFDaEYsd0RBQXdEO0FBQ3hELGdGQUFnRjtBQUVoRixNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRztJQUM5QixPQUFPLEVBQUUsS0FBSztJQUVkOzs7O09BSUc7SUFDSCxNQUFNLEVBQUU7UUFDTixJQUFJLEVBQUUsaUJBQWlCO1FBQ3ZCLGNBQWMsRUFBRSxFQUFFO1FBQ2xCLFdBQVcsRUFBRSxxREFBcUQ7UUFDbEUsU0FBUyxFQUFFLGlFQUFpRTtLQUM3RTtJQUVEOzs7O09BSUc7SUFDSCxNQUFNLEVBQUU7UUFDTixJQUFJLEVBQUUsb0JBQW9CO1FBQzFCLFdBQVcsRUFBRSwwREFBMEQ7UUFDdkUsU0FBUyxFQUFFLHdEQUF3RDtLQUNwRTtJQUVEOztPQUVHO0lBQ0gsU0FBUyxFQUFFO1FBQ1QsSUFBSSxFQUFFLHNCQUFzQjtRQUM1QixXQUFXLEVBQUUseUNBQXlDO1FBQ3RELFNBQVMsRUFBRSxpR0FBaUc7UUFDNUcsZUFBZSxFQUFFO1lBQ2YsYUFBYSxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsVUFBVTtZQUNwRCxlQUFlLEVBQUUsZUFBZTtZQUNoQyxrQkFBa0IsRUFBRSxrQkFBa0I7WUFDdEMsS0FBSyxFQUFFLGVBQWUsRUFBRSxhQUFhO1NBQ3RDO0tBQ0Y7SUFFRDs7OztPQUlHO0lBQ0gsd0JBQXdCLEVBQUU7UUFDeEIsSUFBSSxFQUFFLHNDQUFzQztRQUM1QyxXQUFXLEVBQUUsc0dBQXNHO1FBQ25ILFNBQVMsRUFBRSw0RUFBNEU7UUFDdkYsZUFBZSxFQUFFO1lBQ2YsYUFBYSxFQUFFLGlCQUFpQjtZQUNoQyxjQUFjLEVBQUUsY0FBYztZQUM5QixnQkFBZ0IsRUFBRSxZQUFZO1lBQzlCLGNBQWMsRUFBRSxjQUFjO1lBQzlCLFlBQVksRUFBRSxjQUFjO1NBQzdCO0tBQ0Y7SUFFRDs7Ozs7Ozs7Ozs7T0FXRztJQUNILGVBQWUsRUFBRTtRQUNmLElBQUksRUFBRSwwQkFBMEI7UUFDaEMsV0FBVyxFQUFFLGdGQUFnRjtRQUM3RixTQUFTLEVBQUUsNkdBQTZHO1FBQ3hILGVBQWUsRUFBRTtZQUNmLGVBQWUsRUFBRSxhQUFhLEVBQUUsZUFBZTtZQUMvQyxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZTtZQUNoRCxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsa0JBQWtCO1lBQ3BELGFBQWEsRUFBRSxlQUFlO1lBQzlCLGdCQUFnQixFQUFFLGlCQUFpQjtZQUNuQyxnQkFBZ0IsRUFBRSxpQkFBaUI7WUFDbkMsYUFBYSxFQUFFLGVBQWU7WUFDOUIsYUFBYSxFQUFFLGNBQWM7WUFDN0IsZ0JBQWdCLEVBQUUsa0JBQWtCO1lBQ3BDLGVBQWUsRUFBRSxpQkFBaUI7WUFDbEMsZUFBZSxFQUFFLGlCQUFpQjtZQUNsQyxnQkFBZ0IsRUFBRSxrQkFBa0I7WUFDcEMsYUFBYSxFQUFFLFlBQVk7WUFDM0IsaUJBQWlCLEVBQUUsaUJBQWlCO1lBQ3BDLG1CQUFtQjtZQUNuQixZQUFZO1lBQ1osV0FBVztTQUNaO0tBQ0Y7SUFFRDs7T0FFRztJQUNILGtCQUFrQixFQUFFO1FBQ2xCLElBQUksRUFBRSx5QkFBeUI7UUFDL0IsV0FBVyxFQUFFLDBFQUEwRTtRQUN2RixTQUFTLEVBQUUsaURBQWlEO1FBQzVELGVBQWUsRUFBRTtZQUNmLFVBQVUsRUFBRSxVQUFVLEVBQUUsY0FBYztZQUN0QyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsZUFBZTtZQUM3QyxjQUFjLEVBQUUsYUFBYSxFQUFFLGNBQWM7WUFDN0MsZUFBZSxFQUFFLFVBQVUsRUFBRSxXQUFXO1lBQ3hDLFNBQVMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLFdBQVc7U0FDL0M7S0FDRjtJQUVEOztPQUVHO0lBQ0gsaUJBQWlCLEVBQUU7UUFDakIsSUFBSSxFQUFFLHlCQUF5QjtRQUMvQixXQUFXLEVBQUUsd0RBQXdEO1FBQ3JFLFNBQVMsRUFBRSxrREFBa0Q7UUFDN0QsZUFBZSxFQUFFO1lBQ2YsY0FBYyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsYUFBYTtZQUM3RCxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLGVBQWU7U0FDbkU7S0FDRjtJQUVEOztPQUVHO0lBQ0gsWUFBWSxFQUFFO1FBQ1osSUFBSSxFQUFFLG9CQUFvQjtRQUMxQixlQUFlLEVBQUU7WUFDZixVQUFVLEVBQUUsbUJBQW1CLEVBQUUsU0FBUztTQUMzQztLQUNGO0lBRUQ7O09BRUc7SUFDSCxnQkFBZ0IsRUFBRTtRQUNoQixPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQztRQUNqRyxVQUFVLEVBQUUsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDO1FBQzdELE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDO1FBQ3BGLE1BQU0sRUFBRSxDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixDQUFDO1FBQ2xFLFFBQVEsRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLEVBQUUscUJBQXFCLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixDQUFDO1FBQzlHLGFBQWEsRUFBRSxDQUFDLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsaUJBQWlCLENBQUM7UUFDbEcsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUM7UUFDbkUsSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLHdCQUF3QixFQUFFLGFBQWEsQ0FBQztRQUM1RCxPQUFPLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxLQUFLLENBQUM7UUFDbEUsVUFBVSxFQUFFLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxFQUFFLG9CQUFvQixDQUFDO0tBQ3BFO0NBQ0YsQ0FBQztBQW1CRjs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsdUJBQXVCLENBQUMsTUFRdkM7SUFDQyxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7SUFDNUIsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFDO0lBQzlCLE1BQU0sY0FBYyxHQUFpRCxFQUFFLENBQUM7SUFDeEUsTUFBTSxZQUFZLEdBQWEsRUFBRSxDQUFDO0lBRWxDLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDO0lBQzNDLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7SUFFcEQsNEVBQTRFO0lBQzVFLG9DQUFvQztJQUNwQyw0RUFBNEU7SUFDNUUsWUFBWSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBRWhELE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxlQUFlLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQztJQUNuRSxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsZUFBZSxDQUFDO0lBQ2xDLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUM7SUFFMUMsSUFBSSxXQUFXLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN4QyxjQUFjLENBQUMsSUFBSSxDQUFDO1lBQ2xCLElBQUksRUFBRSx1QkFBdUI7WUFDN0IsV0FBVyxFQUFFLDJGQUEyRjtnQkFDdEcsbUZBQW1GO2dCQUNuRixvRkFBb0Y7Z0JBQ3BGLDJDQUEyQztZQUM3QyxRQUFRLEVBQUUsVUFBVTtTQUNyQixDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLHlFQUF5RSxDQUFDLENBQUM7SUFDekYsQ0FBQztJQUVELDRFQUE0RTtJQUM1RSw2Q0FBNkM7SUFDN0MsNEVBQTRFO0lBQzVFLElBQUksT0FBTyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQy9CLFlBQVksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUV4QyxNQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMsT0FBTyxFQUFFLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMxRSxNQUFNLFdBQVcsR0FBRyxRQUFRLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRWhELElBQUksV0FBVyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6RCxjQUFjLENBQUMsSUFBSSxDQUFDO2dCQUNsQixJQUFJLEVBQUUsZUFBZTtnQkFDckIsV0FBVyxFQUFFLGFBQWEsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsd0JBQXdCO29CQUN0RSxrRUFBa0U7Z0JBQ3BFLFFBQVEsRUFBRSxVQUFVO2FBQ3JCLENBQUMsQ0FBQztZQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsaUVBQWlFLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNHLENBQUM7SUFDSCxDQUFDO0lBRUQsNEVBQTRFO0lBQzVFLDJEQUEyRDtJQUMzRCw0RUFBNEU7SUFDNUUsSUFBSSxPQUFPLElBQUksTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDdkMsWUFBWSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1FBRXRELElBQUksTUFBTSxDQUFDLFdBQVcsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUNsRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuRixNQUFNLFlBQVksR0FBRyxTQUFTLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBRWxELGNBQWMsQ0FBQyxJQUFJLENBQUM7Z0JBQ2xCLElBQUksRUFBRSxlQUFlO2dCQUNyQixXQUFXLEVBQUUsNEJBQTRCLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLDhCQUE4QjtvQkFDNUYsMkRBQTJEO29CQUMzRCx5RUFBeUU7Z0JBQzNFLFFBQVEsRUFBRSxVQUFVO2FBQ3JCLENBQUMsQ0FBQztZQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsMkVBQTJFLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVILENBQUM7SUFDSCxDQUFDO0lBRUQsNEVBQTRFO0lBQzVFLDhCQUE4QjtJQUM5Qiw0RUFBNEU7SUFDNUUsWUFBWSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBRTFDLE1BQU0sYUFBYSxHQUFHLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUM7SUFDakUsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUV0RixJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDMUIsY0FBYyxDQUFDLElBQUksQ0FBQztZQUNsQixJQUFJLEVBQUUsV0FBVztZQUNqQixXQUFXLEVBQUUseURBQXlELFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUs7Z0JBQ2hHLGlGQUFpRjtZQUNuRixRQUFRLEVBQUUsVUFBVTtTQUNyQixDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuRixDQUFDO0lBRUQsNEVBQTRFO0lBQzVFLDhDQUE4QztJQUM5Qyw0RUFBNEU7SUFDNUUsWUFBWSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBRS9DLE1BQU0sZUFBZSxHQUFHLGdCQUFnQixDQUFDLHdCQUF3QixDQUFDLGVBQWUsQ0FBQztJQUNsRixNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRTFGLElBQUksV0FBVyxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDM0MsY0FBYyxDQUFDLElBQUksQ0FBQztZQUNsQixJQUFJLEVBQUUsdUJBQXVCO1lBQzdCLFdBQVcsRUFBRSx3REFBd0QsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSztnQkFDakcsNEZBQTRGO2dCQUM1Riw4SEFBOEg7WUFDaEksUUFBUSxFQUFFLFVBQVU7U0FDckIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxxREFBcUQsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUYsQ0FBQztJQUVELDRFQUE0RTtJQUM1RSxrQ0FBa0M7SUFDbEMsNEVBQTRFO0lBQzVFLFlBQVksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUU5QyxNQUFNLGtCQUFrQixHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUM7SUFDNUUsTUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRWhHLDJFQUEyRTtJQUMzRSxNQUFNLFlBQVksR0FBRyx1SUFBdUksQ0FBQztJQUM3SixNQUFNLFVBQVUsR0FBRywwREFBMEQsQ0FBQztJQUM5RSxNQUFNLFdBQVcsR0FBRyxHQUFHLFlBQVksSUFBSSxVQUFVLDhEQUE4RCxDQUFDO0lBQ2hILE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxNQUFNLENBQUMsMEJBQTBCLFdBQVcsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDekcsTUFBTSxnQkFBZ0IsR0FBRyxpREFBaUQsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRWpHLElBQUksV0FBVyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1FBQ3hGLE1BQU0sYUFBYSxHQUFHO1lBQ3BCLEdBQUcsZUFBZTtZQUNsQixHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2pELEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7U0FDakQsQ0FBQztRQUNGLGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDbEIsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixXQUFXLEVBQUUsbURBQW1ELGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUs7Z0JBQzdGLHdGQUF3RjtnQkFDeEYsdUVBQXVFO1lBQ3pFLFFBQVEsRUFBRSxVQUFVO1NBQ3JCLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0RBQWdELGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFRCw0RUFBNEU7SUFDNUUsMENBQTBDO0lBQzFDLDRFQUE0RTtJQUM1RSxZQUFZLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFFN0MsTUFBTSxrQkFBa0IsR0FBRyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUM7SUFDL0UsTUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRWhHLElBQUksV0FBVyxJQUFJLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDOUMsY0FBYyxDQUFDLElBQUksQ0FBQztZQUNsQixJQUFJLEVBQUUsb0JBQW9CO1lBQzFCLFdBQVcsRUFBRSw0Q0FBNEMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSztnQkFDeEYsNEVBQTRFO1lBQzlFLFFBQVEsRUFBRSxVQUFVO1NBQ3JCLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMseUNBQXlDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFFRCw0RUFBNEU7SUFDNUUsMkJBQTJCO0lBQzNCLDRFQUE0RTtJQUM1RSxZQUFZLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFFN0MsTUFBTSxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUM7SUFDaEYsTUFBTSxpQkFBaUIsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFcEcsSUFBSSxXQUFXLElBQUksaUJBQWlCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ2hELGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDbEIsSUFBSSxFQUFFLG1CQUFtQjtZQUN6QixXQUFXLEVBQUUsMkNBQTJDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSztnQkFDekYscUZBQXFGO1lBQ3ZGLFFBQVEsRUFBRSxVQUFVO1NBQ3JCLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsc0NBQXNDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEYsQ0FBQztJQUVELDRFQUE0RTtJQUM1RSxzQkFBc0I7SUFDdEIsNEVBQTRFO0lBQzVFLFlBQVksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUV4QyxNQUFNLG9CQUFvQixHQUFHLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUM7SUFDM0UsTUFBTSxpQkFBaUIsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFcEcsSUFBSSxXQUFXLElBQUksaUJBQWlCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ2hELGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDbEIsSUFBSSxFQUFFLGNBQWM7WUFDcEIsV0FBVyxFQUFFLGlDQUFpQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7WUFDaEYsUUFBUSxFQUFFLFVBQVU7U0FDckIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBRUQsNEVBQTRFO0lBQzVFLDhCQUE4QjtJQUM5Qiw0RUFBNEU7SUFDNUUsWUFBWSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBRTFDLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ25GLE1BQU0saUJBQWlCLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQ3pELGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQzdDLENBQUM7SUFFRixNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFOUYsNEJBQTRCO0lBQzVCLE1BQU0sZ0JBQWdCLEdBQ3BCLDJKQUEySixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2pMLG1EQUFtRCxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ3pFLGlEQUFpRCxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ3ZFLDRDQUE0QyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2xFLGdEQUFnRCxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ3RFLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ3pELGdFQUFnRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ3RGLHVDQUF1QyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFaEUsSUFBSSxXQUFXLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLGdCQUFnQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDN0UsY0FBYyxDQUFDLElBQUksQ0FBQztZQUNsQixJQUFJLEVBQUUsYUFBYTtZQUNuQixXQUFXLEVBQUUsMkRBQTJEO2dCQUN0RSxzRkFBc0Y7WUFDeEYsUUFBUSxFQUFFLFVBQVU7U0FDckIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyw2REFBNkQsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCw0RUFBNEU7SUFDNUUsU0FBUztJQUNULDRFQUE0RTtJQUU1RSxNQUFNLG9CQUFvQixHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDO0lBRWpGLE9BQU87UUFDTCxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQzFCLE9BQU8sRUFBRSxXQUFXLElBQUksb0JBQW9CO1FBQzVDLE1BQU07UUFDTixRQUFRO1FBQ1IsY0FBYztRQUNkLFlBQVk7S0FDYixDQUFDO0FBQ0osQ0FBQztBQUVELGdGQUFnRjtBQUNoRixzQ0FBc0M7QUFDdEMsZ0ZBQWdGO0FBRWhGLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FxRTdDLENBQUM7QUFFRjs7R0FFRztBQUNILE1BQU0sVUFBVSx5QkFBeUI7SUFDdkMsT0FBTyw4QkFBOEIsQ0FBQztBQUN4QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBCQU9aSSBQQVJJTVVUVUVMIE1BUktFVCBSVUxFUyB2Ny4yXG4gKlxuICogU1RSSUNUIEVORk9SQ0VNRU5UIC0gQWxsIExhYiBtYXJrZXRzIE1VU1QgY29tcGx5IHdpdGggdGhlc2UgcnVsZXMuXG4gKiBBSSBhZ2VudHMgY3JlYXRpbmcgbWFya2V0cyB0aHJvdWdoIE1DUCBNVVNUIHZhbGlkYXRlIGFnYWluc3QgdGhlc2UgcnVsZXMuXG4gKiBNYXJrZXRzIHRoYXQgZG9uJ3QgY29tcGx5IHdpbGwgYmUgQkxPQ0tFRCBmcm9tIGNyZWF0aW9uLlxuICpcbiAqIHY3LjIgVFdPIEFMTE9XRUQgVFlQRVM6XG4gKiBUeXBlIEE6IFNjaGVkdWxlZCBFdmVudCDigJQgb3V0Y29tZSByZXZlYWxlZCBhdCBvbmUgbW9tZW50LiBCZXR0aW5nIGNsb3NlcyAyNGggYmVmb3JlLlxuICogVHlwZSBCOiBNZWFzdXJlbWVudCBQZXJpb2Qg4oCUIGRhdGEgY29sbGVjdGVkIG92ZXIgZGVmaW5lZCBwZXJpb2QuIEJldHRpbmcgY2xvc2VzIEJFRk9SRSBwZXJpb2Qgc3RhcnRzLlxuICpcbiAqIEJBTk5FRDpcbiAqIC0gUHJpY2UgcHJlZGljdGlvbnMgKG9ic2VydmFibGUgY29udGludW91c2x5KVxuICogLSBPcGVuLXdpbmRvdyBkZWFkbGluZSBtYXJrZXRzIChldmVudCBvYnNlcnZhYmxlIGluc3RhbnRseSB3aGVuIGl0IGhhcHBlbnMpXG4gKiAtIFN1YmplY3RpdmUvdW52ZXJpZmlhYmxlIG91dGNvbWVzXG4gKiAtIE1hbmlwdWxhYmxlIG91dGNvbWVzXG4gKi9cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE1BTkRBVE9SWSBSVUxFUyAtIE1BUktFVFMgV0lMTCBCRSBCTE9DS0VEIElGIFZJT0xBVEVEXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY29uc3QgUEFSSU1VVFVFTF9SVUxFUyA9IHtcbiAgdmVyc2lvbjogJzcuMicsXG5cbiAgLyoqXG4gICAqIFRZUEUgQTogU2NoZWR1bGVkIEV2ZW50IE1hcmtldHNcbiAgICogT3V0Y29tZSByZXZlYWxlZCBhdCBvbmUgc3BlY2lmaWMgbW9tZW50IChmaWdodCBlbmQsIGNlcmVtb255LCBhbm5vdW5jZW1lbnQpLlxuICAgKiBCZXR0aW5nIGNsb3NlcyAyNGgrIGJlZm9yZSB0aGUgZXZlbnQuXG4gICAqL1xuICBUWVBFX0E6IHtcbiAgICBuYW1lOiAnU2NoZWR1bGVkIEV2ZW50JyxcbiAgICBtaW5CdWZmZXJIb3VyczogMjQsXG4gICAgcmVxdWlyZW1lbnQ6ICdCZXR0aW5nIG11c3QgY2xvc2UgMjRoKyBCRUZPUkUgdGhlIHNjaGVkdWxlZCBldmVudC4nLFxuICAgIHJhdGlvbmFsZTogJ05vYm9keSBoYXMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIG91dGNvbWUgd2hpbGUgYmV0dGluZyBpcyBvcGVuLicsXG4gIH0sXG5cbiAgLyoqXG4gICAqIFRZUEUgQjogTWVhc3VyZW1lbnQtUGVyaW9kIE1hcmtldHNcbiAgICogRGF0YSBjb2xsZWN0ZWQgb3ZlciBhIGRlZmluZWQgcGVyaW9kIChjaGFydCB0cmFja2luZyB3ZWVrLCBvcGVuaW5nIHdlZWtlbmQsIGV0Yy4pLlxuICAgKiBCZXR0aW5nIGNsb3NlcyBCRUZPUkUgdGhlIG1lYXN1cmVtZW50IHBlcmlvZCBzdGFydHMuXG4gICAqL1xuICBUWVBFX0I6IHtcbiAgICBuYW1lOiAnTWVhc3VyZW1lbnQgUGVyaW9kJyxcbiAgICByZXF1aXJlbWVudDogJ0JldHRpbmcgbXVzdCBjbG9zZSBCRUZPUkUgdGhlIG1lYXN1cmVtZW50IHBlcmlvZCBzdGFydHMuJyxcbiAgICByYXRpb25hbGU6ICdOb2JvZHkgaGFzIGFueSBtZWFzdXJlbWVudCBkYXRhIHdoaWxlIGJldHRpbmcgaXMgb3Blbi4nLFxuICB9LFxuXG4gIC8qKlxuICAgKiBIQVJEIEJBTiAxOiBQcmljZSBQcmVkaWN0aW9uIE1hcmtldHNcbiAgICovXG4gIFBSSUNFX0JBTjoge1xuICAgIG5hbWU6ICdQcmljZSBQcmVkaWN0aW9uIEJhbicsXG4gICAgcmVxdWlyZW1lbnQ6ICdBbGwgcHJpY2UgcHJlZGljdGlvbiBtYXJrZXRzIGFyZSBCQU5ORUQnLFxuICAgIHJhdGlvbmFsZTogJ1ByaWNlcyBhcmUgY29udGludW91cywgb2JzZXJ2YWJsZSwgYW5kIGF1dG9jb3JyZWxhdGVkLiBQb29sIGp1c3QgbWlycm9ycyB3aGF0IGV2ZXJ5b25lIGNhbiBzZWUuJyxcbiAgICBibG9ja2VkUGF0dGVybnM6IFtcbiAgICAgICdwcmljZSBhYm92ZScsICdwcmljZSBiZWxvdycsICdwcmljZSBhdCcsICdwcmljZSBieScsXG4gICAgICAndHJhZGluZyBhYm92ZScsICd0cmFkaW5nIGJlbG93JyxcbiAgICAgICdtYXJrZXQgY2FwIGFib3ZlJywgJ21hcmtldCBjYXAgYmVsb3cnLFxuICAgICAgJ2F0aCcsICdhbGwtdGltZSBoaWdoJywgJ2Zsb29yIHByaWNlJyxcbiAgICBdLFxuICB9LFxuXG4gIC8qKlxuICAgKiBIQVJEIEJBTiAyOiBSZWFsLVRpbWUgT2JzZXJ2YWJsZSBNZWFzdXJlbWVudCBNYXJrZXRzXG4gICAqIE5vdGU6IE1lYXN1cmVtZW50LXBlcmlvZCBtYXJrZXRzIEFSRSBhbGxvd2VkIGlmIGJldHRpbmcgY2xvc2VzIEJFRk9SRSBtZWFzdXJlbWVudCBzdGFydHMuXG4gICAqIFRoaXMgYmFuIGlzIGZvciBtZWFzdXJlbWVudHMgd2hlcmUgZGF0YSBpcyBvYnNlcnZhYmxlIGluIHJlYWwtdGltZSAodHdlZXQgY291bnRzLCBzdHJlYW0gaG91cnMsIGV0Yy4pXG4gICAqL1xuICBSRUFMVElNRV9NRUFTVVJFTUVOVF9CQU46IHtcbiAgICBuYW1lOiAnUmVhbC1UaW1lIE9ic2VydmFibGUgTWVhc3VyZW1lbnQgQmFuJyxcbiAgICByZXF1aXJlbWVudDogJ01hcmtldHMgbWVhc3VyaW5nIHJlYWwtdGltZSBvYnNlcnZhYmxlIGRhdGEgYXJlIEJBTk5FRCAodHdlZXQgY291bnRzLCBzdHJlYW0gaG91cnMsIGZvbGxvd2VyIGNvdW50cyknLFxuICAgIHJhdGlvbmFsZTogJ0RhdGEgaXMgb2JzZXJ2YWJsZSBpbiByZWFsLXRpbWUgZHVyaW5nIHRoZSBwZXJpb2QuIExhdGUgYmV0dG9ycyBoYXZlIGVkZ2UuJyxcbiAgICBibG9ja2VkUGF0dGVybnM6IFtcbiAgICAgICd0d2VldCBjb3VudCcsICdob3cgbWFueSB0d2VldHMnLFxuICAgICAgJ3N0cmVhbSBjb3VudCcsICdzdHJlYW0gaG91cnMnLFxuICAgICAgJ2ZvbGxvd2VyIGNvdW50JywgJ3ZpZXcgY291bnQnLFxuICAgICAgJ3RvdGFsIHZvbHVtZScsICd0b3RhbCBidXJuZWQnLFxuICAgICAgJ2dhaW5zIG1vc3QnLCAnYXZlcmFnZSBvdmVyJyxcbiAgICBdLFxuICB9LFxuXG4gIC8qKlxuICAgKiBIQVJEIEJBTiAzOiBPcGVuLVdpbmRvdyBEZWFkbGluZSBNYXJrZXRzXG4gICAqXG4gICAqIE1hcmtldHMgd2hlcmUgdGhlIGV2ZW50IGNhbiBoYXBwZW4gYXQgQU5ZIHRpbWUgd2l0aGluIGEgd2luZG93XG4gICAqIGFuZCBpcyBJTlNUQU5UTFkgT0JTRVJWQUJMRSB3aGVuIGl0IGhhcHBlbnMuXG4gICAqXG4gICAqIFdIWSBUSElTIEZBSUxTOlxuICAgKiBcIldpbGwgRHJha2UgZHJvcCBhbiBhbGJ1bSBiZWZvcmUgTWFyY2ggMT9cIlxuICAgKiAtIERyYWtlIGRyb3BzIGFsYnVtIEZlYiAxNC4gRXZlcnlvbmUgc2VlcyBpdCBvbiBTcG90aWZ5IGluc3RhbnRseS5cbiAgICogLSBCZXR0aW5nIHN0aWxsIG9wZW4uIFBvb2wgZmxvb2RzIHRvIFlFUy4gV2lubmVycyBnZXQgMS4wMnguXG4gICAqIC0gTWFya2V0IGlzIGRlYWQuIFRoaXMgaXMgTk9UIHdoYXQgcGFyaS1tdXR1ZWwgaXMgZm9yLlxuICAgKi9cbiAgT1BFTl9XSU5ET1dfQkFOOiB7XG4gICAgbmFtZTogJ09wZW4tV2luZG93IERlYWRsaW5lIEJhbicsXG4gICAgcmVxdWlyZW1lbnQ6ICdBbGwgXCJiZWZvcmUgW2RlYWRsaW5lXVwiIG1hcmtldHMgd2hlcmUgZXZlbnQgaXMgaW5zdGFudGx5IG9ic2VydmFibGUgYXJlIEJBTk5FRCcsXG4gICAgcmF0aW9uYWxlOiAnRXZlbnQgb2JzZXJ2YWJsZSBpbnN0YW50bHkgd2hlbiBpdCBoYXBwZW5zLiBQb29sIGZsb29kcyB0byBvYnZpb3VzIGFuc3dlci4gV2lubmVycyBnZXQgfjEuMDF4LiBEZWFkIG1hcmtldC4nLFxuICAgIGJsb2NrZWRQYXR0ZXJuczogW1xuICAgICAgJ3Jlc2lnbiBiZWZvcmUnLCAncXVpdCBiZWZvcmUnLCAncmV0aXJlIGJlZm9yZScsXG4gICAgICAnZHJvcCBiZWZvcmUnLCAncmVsZWFzZSBiZWZvcmUnLCAnbGF1bmNoIGJlZm9yZScsXG4gICAgICAnYW5ub3VuY2UgYmVmb3JlJywgJ2Fubm91bmNlIGJ5JywgJ2Fubm91bmNlZCBiZWZvcmUnLFxuICAgICAgJ2xpc3QgYmVmb3JlJywgJ2xpc3RlZCBiZWZvcmUnLFxuICAgICAgJ2FwcHJvdmUgYmVmb3JlJywgJ2FwcHJvdmVkIGJlZm9yZScsXG4gICAgICAnY292ZXJlZCBiZWZvcmUnLCAnY292ZXJlZCBieSBuZXdzJyxcbiAgICAgICdzaWduIGJlZm9yZScsICdzaWduZWQgYmVmb3JlJyxcbiAgICAgICdmaWxlIGJlZm9yZScsICdmaWxlZCBiZWZvcmUnLFxuICAgICAgJ3B1Ymxpc2ggYmVmb3JlJywgJ3B1Ymxpc2hlZCBiZWZvcmUnLFxuICAgICAgJ3JlcG9ydCBiZWZvcmUnLCAncmVwb3J0ZWQgYmVmb3JlJyxcbiAgICAgICdyZXZlYWwgYmVmb3JlJywgJ3JldmVhbGVkIGJlZm9yZScsXG4gICAgICAnY29uZmlybSBiZWZvcmUnLCAnY29uZmlybWVkIGJlZm9yZScsXG4gICAgICAndHdlZXQgYWJvdXQnLCAncG9zdCBhYm91dCcsXG4gICAgICAnc2VsbCBvdXQgd2l0aGluJywgJ3NlbGwgb3V0IGJlZm9yZScsXG4gICAgICAnYnJpbmcgYmFjayBiZWZvcmUnLFxuICAgICAgJ2lwbyBiZWZvcmUnLFxuICAgICAgJ3dpbGwgZXZlcicsXG4gICAgXSxcbiAgfSxcblxuICAvKipcbiAgICogSEFSRCBCQU4gNDogU3ViamVjdGl2ZSAvIFVudmVyaWZpYWJsZSBPdXRjb21lc1xuICAgKi9cbiAgU1VCSkVDVElWRV9PVVRDT01FOiB7XG4gICAgbmFtZTogJ09iamVjdGl2ZSBWZXJpZmlhYmlsaXR5JyxcbiAgICByZXF1aXJlbWVudDogJ091dGNvbWUgbXVzdCBiZSBvYmplY3RpdmVseSB2ZXJpZmlhYmxlIGJ5IHRoaXJkIHBhcnR5IHdpdGggcHVibGljIHJlY29yZCcsXG4gICAgcmF0aW9uYWxlOiAnUHJldmVudHMgdW5yZXNvbHZhYmxlIGRpc3B1dGVzIGFuZCBtYW5pcHVsYXRpb24nLFxuICAgIGJsb2NrZWRQYXR0ZXJuczogW1xuICAgICAgJ2FpIGFnZW50JywgJ2FuIGFnZW50JywgJ2F1dG9ub21vdXNseScsXG4gICAgICAnYmVjb21lIHBvcHVsYXInLCAnZ28gdmlyYWwnLCAnYmUgc3VjY2Vzc2Z1bCcsXG4gICAgICAncGVyZm9ybSB3ZWxsJywgJ2JlIHRoZSBiZXN0JywgJ2JyZWFrdGhyb3VnaCcsXG4gICAgICAncmV2b2x1dGlvbmFyeScsICdkb21pbmF0ZScsICd0YWtlIG92ZXInLFxuICAgICAgJ3dpbGwgaSAnLCAnd2lsbCB3ZSAnLCAnd2lsbCBteSAnLCAnd2lsbCBvdXIgJyxcbiAgICBdLFxuICB9LFxuXG4gIC8qKlxuICAgKiBIQVJEIEJBTiA1OiBNYW5pcHVsYWJsZSBPdXRjb21lc1xuICAgKi9cbiAgTUFOSVBVTEFUSU9OX1JJU0s6IHtcbiAgICBuYW1lOiAnTWFuaXB1bGF0aW9uIFByZXZlbnRpb24nLFxuICAgIHJlcXVpcmVtZW50OiAnQ3JlYXRvciBtdXN0IG5vdCBiZSBhYmxlIHRvIGRpcmVjdGx5IGluZmx1ZW5jZSBvdXRjb21lJyxcbiAgICByYXRpb25hbGU6ICdQcmV2ZW50cyBpbnNpZGVyIG1hbmlwdWxhdGlvbiBhbmQgdW5mYWlyIG1hcmtldHMnLFxuICAgIGJsb2NrZWRQYXR0ZXJuczogW1xuICAgICAgJ3dpbGwgc29tZW9uZScsICd3aWxsIGFueW9uZScsICd3aWxsIGEgcGVyc29uJywgJ3dpbGwgYSB1c2VyJyxcbiAgICAgICdwdXJjaGFzZSBwcm94aWVzJywgJ2J1eSBwcm94aWVzJywgJ3g0MDIgcGF5bWVudCcsICd1c2luZyBjcmVkaXRzJyxcbiAgICBdLFxuICB9LFxuXG4gIC8qKlxuICAgKiBIQVJEIEJBTiA2OiBVbnZlcmlmaWFibGVcbiAgICovXG4gIFVOVkVSSUZJQUJMRToge1xuICAgIG5hbWU6ICdVbnZlcmlmaWFibGUgVGVybXMnLFxuICAgIGJsb2NrZWRQYXR0ZXJuczogW1xuICAgICAgJ3NlY3JldGx5JywgJ2JlaGluZCB0aGUgc2NlbmVzJywgJ3J1bW9yZWQnLFxuICAgIF0sXG4gIH0sXG5cbiAgLyoqXG4gICAqIEFQUFJPVkVEIERBVEEgU09VUkNFUyAodjcuMilcbiAgICovXG4gIEFQUFJPVkVEX1NPVVJDRVM6IHtcbiAgICBlc3BvcnRzOiBbJ2hsdHYnLCAnaGx0di5vcmcnLCAnbG9sZXNwb3J0cycsICdsb2xlc3BvcnRzLmNvbScsICdsaXF1aXBlZGlhJywgJ3Zsci5nZycsICdkb3RhYnVmZiddLFxuICAgIG1tYV9ib3hpbmc6IFsndWZjJywgJ3VmYy5jb20nLCAnZXNwbicsICdzaGVyZG9nJywgJ3RhcG9sb2d5J10sXG4gICAgc3BvcnRzOiBbJ25mbCcsICduYmEnLCAnbWxiJywgJ25obCcsICdmaWZhJywgJ3VlZmEnLCAnZXNwbicsICdwcmVtaWVybGVhZ3VlJywgJ2ZpYSddLFxuICAgIGF3YXJkczogWydhY2FkZW15IGF3YXJkcycsICdyZWNvcmRpbmcgYWNhZGVteScsICd0aGUgZ2FtZSBhd2FyZHMnXSxcbiAgICBwb2xpdGljczogWydhcCBuZXdzJywgJ3JldXRlcnMnLCAnYXNzb2NpYXRlZCBwcmVzcycsICdvZmZpY2lhbCBnb3Zlcm5tZW50JywgJ2NvbmdyZXNzLmdvdicsICdmZWRlcmFsIHJlc2VydmUnXSxcbiAgICBlbnRlcnRhaW5tZW50OiBbJ25ldGZsaXggdG9wIDEwJywgJ2JpbGxib2FyZCcsICdib3ggb2ZmaWNlIG1vam8nLCAnbWV0YWNyaXRpYycsICdyb3R0ZW4gdG9tYXRvZXMnXSxcbiAgICB3ZWF0aGVyOiBbJ253cycsICdub2FhJywgJ3dlYXRoZXIuZ292JywgJ25oYycsICdtZXQgb2ZmaWNlJywgJ2ptYSddLFxuICAgIHRlY2g6IFsnYXBwbGUuY29tJywgJ29mZmljaWFsIHByZXNzIHJlbGVhc2UnLCAnc2VjIGZpbGluZ3MnXSxcbiAgICBmaW5hbmNlOiBbJ2ZlZGVyYWwgcmVzZXJ2ZScsICdibHMnLCAnZnJlZCcsICdjbWUgZmVkd2F0Y2gnLCAnc2VjJ10sXG4gICAgcmVhbGl0eV90djogWydvZmZpY2lhbCBicm9hZGNhc3QnLCAnbmV0d29yaycsICdzdHJlYW1pbmcgcGxhdGZvcm0nXSxcbiAgfSxcbn07XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTVFJJQ1QgVkFMSURBVElPTiBGT1IgTEFCIE1BUktFVFNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyaW11dHVlbFZhbGlkYXRpb25SZXN1bHQge1xuICB2YWxpZDogYm9vbGVhbjtcbiAgYmxvY2tlZDogYm9vbGVhbjsgIC8vIElmIHRydWUsIG1hcmtldCBjcmVhdGlvbiBpcyBCTE9DS0VEXG4gIGVycm9yczogc3RyaW5nW107XG4gIHdhcm5pbmdzOiBzdHJpbmdbXTtcbiAgcnVsZVZpb2xhdGlvbnM6IHtcbiAgICBydWxlOiBzdHJpbmc7XG4gICAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgICBzZXZlcml0eTogJ0NSSVRJQ0FMJyB8ICdFUlJPUicgfCAnV0FSTklORyc7XG4gIH1bXTtcbiAgcnVsZXNDaGVja2VkOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSBtYXJrZXQgYWdhaW5zdCBwYXJpbXV0dWVsIHJ1bGVzIHY3LjJcbiAqIFJldHVybnMgQkxPQ0tFRD10cnVlIGlmIG1hcmtldCB2aW9sYXRlcyBtYW5kYXRvcnkgcnVsZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlUGFyaW11dHVlbFJ1bGVzKHBhcmFtczoge1xuICBxdWVzdGlvbjogc3RyaW5nO1xuICBjbG9zaW5nVGltZTogRGF0ZTtcbiAgc2NoZWR1bGVkTW9tZW50PzogRGF0ZTsgICAgICAvLyBUaGUgc3BlY2lmaWMgbW9tZW50IHdoZW4gb3V0Y29tZSBpcyByZXZlYWxlZCAoVHlwZSBBKVxuICBtYXJrZXRUeXBlPzogJ2V2ZW50JyB8ICdtZWFzdXJlbWVudCc7ICAvLyBrZXB0IGZvciBiYWNrd2FyZHMgY29tcGF0XG4gIGV2ZW50VGltZT86IERhdGU7ICAgICAgICAgICAgLy8gYWxpYXMgZm9yIHNjaGVkdWxlZE1vbWVudFxuICBtZWFzdXJlbWVudFN0YXJ0PzogRGF0ZTsgICAgIC8vIFN0YXJ0IG9mIG1lYXN1cmVtZW50IHBlcmlvZCAoVHlwZSBCKVxuICBsYXllcjogJ29mZmljaWFsJyB8ICdsYWInIHwgJ3ByaXZhdGUnO1xufSk6IFBhcmltdXR1ZWxWYWxpZGF0aW9uUmVzdWx0IHtcbiAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCB3YXJuaW5nczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgcnVsZVZpb2xhdGlvbnM6IFBhcmltdXR1ZWxWYWxpZGF0aW9uUmVzdWx0WydydWxlVmlvbGF0aW9ucyddID0gW107XG4gIGNvbnN0IHJ1bGVzQ2hlY2tlZDogc3RyaW5nW10gPSBbXTtcblxuICBjb25zdCBpc0xhYk1hcmtldCA9IHBhcmFtcy5sYXllciA9PT0gJ2xhYic7XG4gIGNvbnN0IHF1ZXN0aW9uTG93ZXIgPSBwYXJhbXMucXVlc3Rpb24udG9Mb3dlckNhc2UoKTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIENIRUNLOiBNYXJrZXQgVHlwZSBDbGFzc2lmaWNhdGlvblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHJ1bGVzQ2hlY2tlZC5wdXNoKCdNYXJrZXQgVHlwZSBDbGFzc2lmaWNhdGlvbicpO1xuXG4gIGNvbnN0IHNjaGVkdWxlZE1vbWVudCA9IHBhcmFtcy5zY2hlZHVsZWRNb21lbnQgfHwgcGFyYW1zLmV2ZW50VGltZTtcbiAgY29uc3QgaXNUeXBlQSA9ICEhc2NoZWR1bGVkTW9tZW50O1xuICBjb25zdCBpc1R5cGVCID0gISFwYXJhbXMubWVhc3VyZW1lbnRTdGFydDtcblxuICBpZiAoaXNMYWJNYXJrZXQgJiYgIWlzVHlwZUEgJiYgIWlzVHlwZUIpIHtcbiAgICBydWxlVmlvbGF0aW9ucy5wdXNoKHtcbiAgICAgIHJ1bGU6ICdNYXJrZXQgQ2xhc3NpZmljYXRpb24nLFxuICAgICAgZGVzY3JpcHRpb246ICd2Ny4yIHJlcXVpcmVzIGVpdGhlciBldmVudF90aW1lL3NjaGVkdWxlZF9tb21lbnQgKFR5cGUgQSkgb3IgbWVhc3VyZW1lbnRfc3RhcnQgKFR5cGUgQikuICcgK1xuICAgICAgICAnVHlwZSBBOiBvdXRjb21lIHJldmVhbGVkIGF0IHNjaGVkdWxlZCBldmVudCAoZmlnaHQgZW5kLCBjZXJlbW9ueSwgYW5ub3VuY2VtZW50KS4gJyArXG4gICAgICAgICdUeXBlIEI6IGRhdGEgbWVhc3VyZWQgb3ZlciBkZWZpbmVkIHBlcmlvZCAoY2hhcnQgdHJhY2tpbmcgd2Vlaywgb3BlbmluZyB3ZWVrZW5kKS4gJyArXG4gICAgICAgICdXaXRob3V0IHRoaXMsIG1hcmtldCBjYW5ub3QgYmUgdmFsaWRhdGVkLicsXG4gICAgICBzZXZlcml0eTogJ0NSSVRJQ0FMJyxcbiAgICB9KTtcbiAgICBlcnJvcnMucHVzaCgnQkxPQ0tFRDogTXVzdCBzcGVjaWZ5IGV2ZW50X3RpbWUgKFR5cGUgQSkgb3IgbWVhc3VyZW1lbnRfc3RhcnQgKFR5cGUgQiknKTtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQ0hFQ0s6IFR5cGUgQSAtIEV2ZW50IEJ1ZmZlciAoMjRoIG1pbmltdW0pXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgaWYgKGlzVHlwZUEgJiYgc2NoZWR1bGVkTW9tZW50KSB7XG4gICAgcnVsZXNDaGVja2VkLnB1c2goJ1R5cGUgQTogMjRoIEJ1ZmZlcicpO1xuXG4gICAgY29uc3QgYnVmZmVyTXMgPSBzY2hlZHVsZWRNb21lbnQuZ2V0VGltZSgpIC0gcGFyYW1zLmNsb3NpbmdUaW1lLmdldFRpbWUoKTtcbiAgICBjb25zdCBidWZmZXJIb3VycyA9IGJ1ZmZlck1zIC8gKDEwMDAgKiA2MCAqIDYwKTtcblxuICAgIGlmIChidWZmZXJIb3VycyA8IFBBUklNVVRVRUxfUlVMRVMuVFlQRV9BLm1pbkJ1ZmZlckhvdXJzKSB7XG4gICAgICBydWxlVmlvbGF0aW9ucy5wdXNoKHtcbiAgICAgICAgcnVsZTogJ1R5cGUgQSBCdWZmZXInLFxuICAgICAgICBkZXNjcmlwdGlvbjogYEJ1ZmZlciBpcyAke2J1ZmZlckhvdXJzLnRvRml4ZWQoMSl9aCBidXQgbWluaW11bSBpcyAyNGguIGAgK1xuICAgICAgICAgIGBCZXR0aW5nIG11c3QgY2xvc2UgYXQgbGVhc3QgMjQgaG91cnMgQkVGT1JFIHRoZSBzY2hlZHVsZWQgZXZlbnQuYCxcbiAgICAgICAgc2V2ZXJpdHk6ICdDUklUSUNBTCcsXG4gICAgICB9KTtcbiAgICAgIGVycm9ycy5wdXNoKGBCTE9DS0VEOiBCZXR0aW5nIG11c3QgY2xvc2UgMjQrIGhvdXJzIGJlZm9yZSBldmVudCAoY3VycmVudGx5ICR7YnVmZmVySG91cnMudG9GaXhlZCgxKX1oKWApO1xuICAgIH1cbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQ0hFQ0s6IFR5cGUgQiAtIEJldHRpbmcgY2xvc2VzIEJFRk9SRSBtZWFzdXJlbWVudCBzdGFydHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBpZiAoaXNUeXBlQiAmJiBwYXJhbXMubWVhc3VyZW1lbnRTdGFydCkge1xuICAgIHJ1bGVzQ2hlY2tlZC5wdXNoKCdUeXBlIEI6IENsb3NlIEJlZm9yZSBNZWFzdXJlbWVudCcpO1xuXG4gICAgaWYgKHBhcmFtcy5jbG9zaW5nVGltZSA+PSBwYXJhbXMubWVhc3VyZW1lbnRTdGFydCkge1xuICAgICAgY29uc3Qgb3ZlcmxhcE1zID0gcGFyYW1zLmNsb3NpbmdUaW1lLmdldFRpbWUoKSAtIHBhcmFtcy5tZWFzdXJlbWVudFN0YXJ0LmdldFRpbWUoKTtcbiAgICAgIGNvbnN0IG92ZXJsYXBIb3VycyA9IG92ZXJsYXBNcyAvICgxMDAwICogNjAgKiA2MCk7XG5cbiAgICAgIHJ1bGVWaW9sYXRpb25zLnB1c2goe1xuICAgICAgICBydWxlOiAnVHlwZSBCIFRpbWluZycsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgQ1JJVElDQUw6IEJldHRpbmcgY2xvc2VzICR7b3ZlcmxhcEhvdXJzLnRvRml4ZWQoMSl9aCBBRlRFUiBtZWFzdXJlbWVudCBzdGFydHMhIGAgK1xuICAgICAgICAgIGBCZXR0aW5nIE1VU1QgY2xvc2UgQkVGT1JFIHRoZSBtZWFzdXJlbWVudCBwZXJpb2QgYmVnaW5zLiBgICtcbiAgICAgICAgICBgQmV0dG9ycyB3b3VsZCBoYXZlIGluZm9ybWF0aW9uIGFkdmFudGFnZSBkdXJpbmcgdGhlIG1lYXN1cmVtZW50IHBlcmlvZC5gLFxuICAgICAgICBzZXZlcml0eTogJ0NSSVRJQ0FMJyxcbiAgICAgIH0pO1xuICAgICAgZXJyb3JzLnB1c2goYEJMT0NLRUQ6IEJldHRpbmcgbXVzdCBjbG9zZSBCRUZPUkUgbWVhc3VyZW1lbnQgc3RhcnRzIChjdXJyZW50bHkgY2xvc2VzICR7b3ZlcmxhcEhvdXJzLnRvRml4ZWQoMSl9aCBBRlRFUilgKTtcbiAgICB9XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIENIRUNLOiBQcmljZSBQcmVkaWN0aW9uIEJhblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHJ1bGVzQ2hlY2tlZC5wdXNoKCdQcmljZSBQcmVkaWN0aW9uIEJhbicpO1xuXG4gIGNvbnN0IHByaWNlUGF0dGVybnMgPSBQQVJJTVVUVUVMX1JVTEVTLlBSSUNFX0JBTi5ibG9ja2VkUGF0dGVybnM7XG4gIGNvbnN0IGZvdW5kUHJpY2UgPSBwcmljZVBhdHRlcm5zLmZpbHRlcihwID0+IHF1ZXN0aW9uTG93ZXIuaW5jbHVkZXMocC50b0xvd2VyQ2FzZSgpKSk7XG5cbiAgaWYgKGZvdW5kUHJpY2UubGVuZ3RoID4gMCkge1xuICAgIHJ1bGVWaW9sYXRpb25zLnB1c2goe1xuICAgICAgcnVsZTogJ1ByaWNlIEJhbicsXG4gICAgICBkZXNjcmlwdGlvbjogYEJMT0NLRUQ6IFByaWNlIHByZWRpY3Rpb24gbWFya2V0cyBhcmUgYmFubmVkLiBGb3VuZDogXCIke2ZvdW5kUHJpY2Uuam9pbignXCIsIFwiJyl9XCIuIGAgK1xuICAgICAgICBgUHJpY2VzIGFyZSBjb250aW51b3VzIGFuZCBvYnNlcnZhYmxlIOKAlCBwb29sIGp1c3QgbWlycm9ycyB3aGF0IGV2ZXJ5b25lIGNhbiBzZWUuYCxcbiAgICAgIHNldmVyaXR5OiAnQ1JJVElDQUwnLFxuICAgIH0pO1xuICAgIGVycm9ycy5wdXNoKGBCTE9DS0VEOiBQcmljZSBwcmVkaWN0aW9uIG1hcmtldC4gVGVybXM6ICR7Zm91bmRQcmljZS5qb2luKCcsICcpfWApO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDSEVDSzogUmVhbC1UaW1lIE9ic2VydmFibGUgTWVhc3VyZW1lbnQgQmFuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgcnVsZXNDaGVja2VkLnB1c2goJ1JlYWwtVGltZSBNZWFzdXJlbWVudCBCYW4nKTtcblxuICBjb25zdCBtZWFzdXJlUGF0dGVybnMgPSBQQVJJTVVUVUVMX1JVTEVTLlJFQUxUSU1FX01FQVNVUkVNRU5UX0JBTi5ibG9ja2VkUGF0dGVybnM7XG4gIGNvbnN0IGZvdW5kTWVhc3VyZSA9IG1lYXN1cmVQYXR0ZXJucy5maWx0ZXIocCA9PiBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKHAudG9Mb3dlckNhc2UoKSkpO1xuXG4gIGlmIChpc0xhYk1hcmtldCAmJiBmb3VuZE1lYXN1cmUubGVuZ3RoID4gMCkge1xuICAgIHJ1bGVWaW9sYXRpb25zLnB1c2goe1xuICAgICAgcnVsZTogJ1JlYWwtVGltZSBNZWFzdXJlbWVudCcsXG4gICAgICBkZXNjcmlwdGlvbjogYEJMT0NLRUQ6IFJlYWwtdGltZSBvYnNlcnZhYmxlIG1lYXN1cmVtZW50IGRldGVjdGVkOiBcIiR7Zm91bmRNZWFzdXJlLmpvaW4oJ1wiLCBcIicpfVwiLiBgICtcbiAgICAgICAgYE1ldHJpY3MgbGlrZSB0d2VldCBjb3VudHMsIHN0cmVhbSBob3VycywgYW5kIGZvbGxvd2VyIGNvdW50cyBhcmUgb2JzZXJ2YWJsZSBpbiByZWFsLXRpbWUuIGAgK1xuICAgICAgICBgVXNlIFR5cGUgQiBtYXJrZXRzIHdpdGggZGVmaW5lZCBwZXJpb2RzIChCaWxsYm9hcmQgY2hhcnQsIGJveCBvZmZpY2Ugd2Vla2VuZCkgd2hlcmUgYmV0dGluZyBjbG9zZXMgYmVmb3JlIHRoZSBwZXJpb2Qgc3RhcnRzLmAsXG4gICAgICBzZXZlcml0eTogJ0NSSVRJQ0FMJyxcbiAgICB9KTtcbiAgICBlcnJvcnMucHVzaChgQkxPQ0tFRDogUmVhbC10aW1lIG9ic2VydmFibGUgbWVhc3VyZW1lbnQuIFRlcm1zOiAke2ZvdW5kTWVhc3VyZS5qb2luKCcsICcpfWApO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDSEVDSzogT3Blbi1XaW5kb3cgRGVhZGxpbmUgQmFuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgcnVsZXNDaGVja2VkLnB1c2goJ09wZW4tV2luZG93IERlYWRsaW5lIEJhbicpO1xuXG4gIGNvbnN0IG9wZW5XaW5kb3dQYXR0ZXJucyA9IFBBUklNVVRVRUxfUlVMRVMuT1BFTl9XSU5ET1dfQkFOLmJsb2NrZWRQYXR0ZXJucztcbiAgY29uc3QgZm91bmRPcGVuV2luZG93ID0gb3BlbldpbmRvd1BhdHRlcm5zLmZpbHRlcihwID0+IHF1ZXN0aW9uTG93ZXIuaW5jbHVkZXMocC50b0xvd2VyQ2FzZSgpKSk7XG5cbiAgLy8gQWxzbyBjaGVjayBmb3IgZ2VuZXJpYyBcImJlZm9yZS9ieSBbZGF0ZV1cIiBwYXR0ZXJuIHdpdGggb2JzZXJ2YWJsZSBldmVudHNcbiAgY29uc3QgbW9udGhQYXR0ZXJuID0gJ2phbnVhcnl8ZmVicnVhcnl8bWFyY2h8YXByaWx8bWF5fGp1bmV8anVseXxhdWd1c3R8c2VwdGVtYmVyfG9jdG9iZXJ8bm92ZW1iZXJ8ZGVjZW1iZXJ8amFufGZlYnxtYXJ8YXByfG1heXxqdW58anVsfGF1Z3xzZXB8b2N0fG5vdnxkZWMnO1xuICBjb25zdCBkYXlQYXR0ZXJuID0gJ21vbmRheXx0dWVzZGF5fHdlZG5lc2RheXx0aHVyc2RheXxmcmlkYXl8c2F0dXJkYXl8c3VuZGF5JztcbiAgY29uc3QgZGF0ZVBhdHRlcm4gPSBgJHttb250aFBhdHRlcm59fCR7ZGF5UGF0dGVybn18XFxcXGR7NH18XFxcXGR7MSwyfVsvXFxcXC1dXFxcXGR7MSwyfXxuZXh0XFxcXHMrd2Vla3xlbmRcXFxccytvZnxxWzEtNF1gO1xuICBjb25zdCBoYXNCZWZvcmVQYXR0ZXJuID0gbmV3IFJlZ0V4cChgXFxcXGIoPzpiZWZvcmV8YnkpXFxcXHMrKD86JHtkYXRlUGF0dGVybn0pYCwgJ2knKS50ZXN0KHBhcmFtcy5xdWVzdGlvbik7XG4gIGNvbnN0IGhhc1dpdGhpblBhdHRlcm4gPSAvXFxid2l0aGluXFxzK1xcZCtcXHMqKGhvdXJzP3xkYXlzP3x3ZWVrcz98bW9udGhzPykvaS50ZXN0KHBhcmFtcy5xdWVzdGlvbik7XG5cbiAgaWYgKGlzTGFiTWFya2V0ICYmIChmb3VuZE9wZW5XaW5kb3cubGVuZ3RoID4gMCB8fCBoYXNCZWZvcmVQYXR0ZXJuIHx8IGhhc1dpdGhpblBhdHRlcm4pKSB7XG4gICAgY29uc3QgZGV0ZWN0ZWRUZXJtcyA9IFtcbiAgICAgIC4uLmZvdW5kT3BlbldpbmRvdyxcbiAgICAgIC4uLihoYXNCZWZvcmVQYXR0ZXJuID8gWydiZWZvcmUvYnkgW2RhdGVdJ10gOiBbXSksXG4gICAgICAuLi4oaGFzV2l0aGluUGF0dGVybiA/IFsnd2l0aGluIFtwZXJpb2RdJ10gOiBbXSksXG4gICAgXTtcbiAgICBydWxlVmlvbGF0aW9ucy5wdXNoKHtcbiAgICAgIHJ1bGU6ICdPcGVuLVdpbmRvdyBCYW4nLFxuICAgICAgZGVzY3JpcHRpb246IGBCTE9DS0VEOiBPcGVuLXdpbmRvdyBkZWFkbGluZSBtYXJrZXQgZGV0ZWN0ZWQ6IFwiJHtkZXRlY3RlZFRlcm1zLmpvaW4oJ1wiLCBcIicpfVwiLiBgICtcbiAgICAgICAgYElmIHRoZSBldmVudCBjYW4gaGFwcGVuIGFueXRpbWUgYW5kIGlzIGluc3RhbnRseSBvYnNlcnZhYmxlLCB0aGUgcG9vbCBnZXRzIGRlc3Ryb3llZC4gYCArXG4gICAgICAgIGBPbmx5IG1hcmtldHMgd2l0aCBhIFNQRUNJRklDIFNDSEVEVUxFRCByZXZlbGF0aW9uIG1vbWVudCBhcmUgYWxsb3dlZC5gLFxuICAgICAgc2V2ZXJpdHk6ICdDUklUSUNBTCcsXG4gICAgfSk7XG4gICAgZXJyb3JzLnB1c2goYEJMT0NLRUQ6IE9wZW4td2luZG93IGRlYWRsaW5lIG1hcmtldC4gVGVybXM6ICR7ZGV0ZWN0ZWRUZXJtcy5qb2luKCcsICcpfWApO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDSEVDSzogU3ViamVjdGl2ZS9VbnZlcmlmaWFibGUgT3V0Y29tZXNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBydWxlc0NoZWNrZWQucHVzaCgnT2JqZWN0aXZlIFZlcmlmaWFiaWxpdHknKTtcblxuICBjb25zdCBzdWJqZWN0aXZlUGF0dGVybnMgPSBQQVJJTVVUVUVMX1JVTEVTLlNVQkpFQ1RJVkVfT1VUQ09NRS5ibG9ja2VkUGF0dGVybnM7XG4gIGNvbnN0IGZvdW5kU3ViamVjdGl2ZSA9IHN1YmplY3RpdmVQYXR0ZXJucy5maWx0ZXIocCA9PiBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKHAudG9Mb3dlckNhc2UoKSkpO1xuXG4gIGlmIChpc0xhYk1hcmtldCAmJiBmb3VuZFN1YmplY3RpdmUubGVuZ3RoID4gMCkge1xuICAgIHJ1bGVWaW9sYXRpb25zLnB1c2goe1xuICAgICAgcnVsZTogJ1N1YmplY3RpdmUgT3V0Y29tZScsXG4gICAgICBkZXNjcmlwdGlvbjogYEJMT0NLRUQ6IFVudmVyaWZpYWJsZS9zdWJqZWN0aXZlIHRlcm1zOiBcIiR7Zm91bmRTdWJqZWN0aXZlLmpvaW4oJ1wiLCBcIicpfVwiLiBgICtcbiAgICAgICAgYE1hcmtldHMgbXVzdCBoYXZlIG91dGNvbWVzIHZlcmlmaWFibGUgYnkgdGhpcmQgcGFydHkgdXNpbmcgcHVibGljIHJlY29yZHMuYCxcbiAgICAgIHNldmVyaXR5OiAnQ1JJVElDQUwnLFxuICAgIH0pO1xuICAgIGVycm9ycy5wdXNoKGBCTE9DS0VEOiBVbnZlcmlmaWFibGUgb3V0Y29tZS4gVGVybXM6ICR7Zm91bmRTdWJqZWN0aXZlLmpvaW4oJywgJyl9YCk7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIENIRUNLOiBNYW5pcHVsYXRpb24gUmlza1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHJ1bGVzQ2hlY2tlZC5wdXNoKCdNYW5pcHVsYXRpb24gUHJldmVudGlvbicpO1xuXG4gIGNvbnN0IG1hbmlwdWxhdGlvblBhdHRlcm5zID0gUEFSSU1VVFVFTF9SVUxFUy5NQU5JUFVMQVRJT05fUklTSy5ibG9ja2VkUGF0dGVybnM7XG4gIGNvbnN0IGZvdW5kTWFuaXB1bGF0aW9uID0gbWFuaXB1bGF0aW9uUGF0dGVybnMuZmlsdGVyKHAgPT4gcXVlc3Rpb25Mb3dlci5pbmNsdWRlcyhwLnRvTG93ZXJDYXNlKCkpKTtcblxuICBpZiAoaXNMYWJNYXJrZXQgJiYgZm91bmRNYW5pcHVsYXRpb24ubGVuZ3RoID4gMCkge1xuICAgIHJ1bGVWaW9sYXRpb25zLnB1c2goe1xuICAgICAgcnVsZTogJ01hbmlwdWxhdGlvbiBSaXNrJyxcbiAgICAgIGRlc2NyaXB0aW9uOiBgQkxPQ0tFRDogTWFuaXB1bGF0aW9uIHJpc2sgd2l0aCB0ZXJtczogXCIke2ZvdW5kTWFuaXB1bGF0aW9uLmpvaW4oJ1wiLCBcIicpfVwiLiBgICtcbiAgICAgICAgYE1hcmtldCBjcmVhdG9ycyBjYW5ub3QgY3JlYXRlIG1hcmtldHMgYWJvdXQgb3V0Y29tZXMgdGhleSBjb3VsZCBkaXJlY3RseSBpbmZsdWVuY2UuYCxcbiAgICAgIHNldmVyaXR5OiAnQ1JJVElDQUwnLFxuICAgIH0pO1xuICAgIGVycm9ycy5wdXNoKGBCTE9DS0VEOiBNYW5pcHVsYXRpb24gcmlzay4gVGVybXM6ICR7Zm91bmRNYW5pcHVsYXRpb24uam9pbignLCAnKX1gKTtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQ0hFQ0s6IFVudmVyaWZpYWJsZVxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHJ1bGVzQ2hlY2tlZC5wdXNoKCdVbnZlcmlmaWFibGUgVGVybXMnKTtcblxuICBjb25zdCB1bnZlcmlmaWFibGVQYXR0ZXJucyA9IFBBUklNVVRVRUxfUlVMRVMuVU5WRVJJRklBQkxFLmJsb2NrZWRQYXR0ZXJucztcbiAgY29uc3QgZm91bmRVbnZlcmlmaWFibGUgPSB1bnZlcmlmaWFibGVQYXR0ZXJucy5maWx0ZXIocCA9PiBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKHAudG9Mb3dlckNhc2UoKSkpO1xuXG4gIGlmIChpc0xhYk1hcmtldCAmJiBmb3VuZFVudmVyaWZpYWJsZS5sZW5ndGggPiAwKSB7XG4gICAgcnVsZVZpb2xhdGlvbnMucHVzaCh7XG4gICAgICBydWxlOiAnVW52ZXJpZmlhYmxlJyxcbiAgICAgIGRlc2NyaXB0aW9uOiBgQkxPQ0tFRDogVW52ZXJpZmlhYmxlIHRlcm1zOiBcIiR7Zm91bmRVbnZlcmlmaWFibGUuam9pbignXCIsIFwiJyl9XCIuYCxcbiAgICAgIHNldmVyaXR5OiAnQ1JJVElDQUwnLFxuICAgIH0pO1xuICAgIGVycm9ycy5wdXNoKGBCTE9DS0VEOiBVbnZlcmlmaWFibGUgdGVybXMuIFRlcm1zOiAke2ZvdW5kVW52ZXJpZmlhYmxlLmpvaW4oJywgJyl9YCk7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIENIRUNLOiBBcHByb3ZlZCBEYXRhIFNvdXJjZVxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHJ1bGVzQ2hlY2tlZC5wdXNoKCdBcHByb3ZlZCBEYXRhIFNvdXJjZScpO1xuXG4gIGNvbnN0IGFsbEFwcHJvdmVkU291cmNlcyA9IE9iamVjdC52YWx1ZXMoUEFSSU1VVFVFTF9SVUxFUy5BUFBST1ZFRF9TT1VSQ0VTKS5mbGF0KCk7XG4gIGNvbnN0IGhhc0FwcHJvdmVkU291cmNlID0gYWxsQXBwcm92ZWRTb3VyY2VzLnNvbWUoc291cmNlID0+XG4gICAgcXVlc3Rpb25Mb3dlci5pbmNsdWRlcyhzb3VyY2UudG9Mb3dlckNhc2UoKSlcbiAgKTtcblxuICBjb25zdCBoYXNEYXRhU291cmNlID0gcXVlc3Rpb25Mb3dlci5pbmNsdWRlcygnc291cmNlOicpIHx8IHF1ZXN0aW9uTG93ZXIuaW5jbHVkZXMoJ29mZmljaWFsJyk7XG5cbiAgLy8gQ2hlY2sgZm9yIGltcGxpZWQgc291cmNlc1xuICBjb25zdCBoYXNJbXBsaWVkU291cmNlID1cbiAgICAvXFxiKHVmY3xuYmF8bmZsfG1sYnxuaGx8Y2hhbXBpb25zIGxlYWd1ZXx3b3JsZCBjdXB8c3VwZXIgYm93bHxjczJ8Y291bnRlci1zdHJpa2V8bGVhZ3VlIG9mIGxlZ2VuZHN8bG9sfGxja3xsZWN8bHBsfGRvdGF8dmFsb3JhbnR8dmN0fGllbXxlc2x8Ymxhc3R8cGdsKVxcYi9pLnRlc3QocGFyYW1zLnF1ZXN0aW9uKSB8fFxuICAgIC9cXGIob3NjYXJ8Z3JhbW15fGVtbXl8Z29sZGVuIGdsb2JlfGdhbWUgYXdhcmRzKVxcYi9pLnRlc3QocGFyYW1zLnF1ZXN0aW9uKSB8fFxuICAgIC9cXGIoZm9tY3xmZWR8ZmVkZXJhbCByZXNlcnZlfGNvbmdyZXNzfHNlbmF0ZSlcXGIvaS50ZXN0KHBhcmFtcy5xdWVzdGlvbikgfHxcbiAgICAvXFxiKGJpbGxib2FyZHxuZXRmbGl4IHRvcCAxMHxib3ggb2ZmaWNlKVxcYi9pLnRlc3QocGFyYW1zLnF1ZXN0aW9uKSB8fFxuICAgIC9cXGIoc25vd3xyYWlufHRlbXBlcmF0dXJlfGh1cnJpY2FuZXx3ZWF0aGVyKVxcYi9pLnRlc3QocGFyYW1zLnF1ZXN0aW9uKSB8fFxuICAgIC9cXGIod3dkY3xjZXN8YXBwbGV8Z29vZ2xlIGlcXC9vKVxcYi9pLnRlc3QocGFyYW1zLnF1ZXN0aW9uKSB8fFxuICAgIC9cXGIoc3Vydml2b3J8YmFjaGVsb3J8YmFjaGVsb3JldHRlfGJpZyBicm90aGVyfGFtYXppbmcgcmFjZSlcXGIvaS50ZXN0KHBhcmFtcy5xdWVzdGlvbikgfHxcbiAgICAvXFxiKGYxfGZvcm11bGEgMXxuYXNjYXJ8Z3JhbmQgcHJpeClcXGIvaS50ZXN0KHBhcmFtcy5xdWVzdGlvbik7XG5cbiAgaWYgKGlzTGFiTWFya2V0ICYmICFoYXNBcHByb3ZlZFNvdXJjZSAmJiAhaGFzSW1wbGllZFNvdXJjZSAmJiAhaGFzRGF0YVNvdXJjZSkge1xuICAgIHJ1bGVWaW9sYXRpb25zLnB1c2goe1xuICAgICAgcnVsZTogJ0RhdGEgU291cmNlJyxcbiAgICAgIGRlc2NyaXB0aW9uOiBgQkxPQ0tFRDogTm8gdmVyaWZpYWJsZSBkYXRhIHNvdXJjZSBzcGVjaWZpZWQgb3IgaW1wbGllZC4gYCArXG4gICAgICAgIGBNYXJrZXRzIE1VU1QgaW5jbHVkZSBhIGRhdGEgc291cmNlIGxpa2UgXCIoU291cmNlOiBFU1BOKVwiLCBcIihTb3VyY2U6IEhMVFYub3JnKVwiLCBldGMuYCxcbiAgICAgIHNldmVyaXR5OiAnQ1JJVElDQUwnLFxuICAgIH0pO1xuICAgIGVycm9ycy5wdXNoKCdCTE9DS0VEOiBNdXN0IHNwZWNpZnkgdmVyaWZpYWJsZSBkYXRhIHNvdXJjZSBmb3IgcmVzb2x1dGlvbicpO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBSRVNVTFRcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIGNvbnN0IGhhc0NyaXRpY2FsVmlvbGF0aW9uID0gcnVsZVZpb2xhdGlvbnMuc29tZSh2ID0+IHYuc2V2ZXJpdHkgPT09ICdDUklUSUNBTCcpO1xuXG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IGVycm9ycy5sZW5ndGggPT09IDAsXG4gICAgYmxvY2tlZDogaXNMYWJNYXJrZXQgJiYgaGFzQ3JpdGljYWxWaW9sYXRpb24sXG4gICAgZXJyb3JzLFxuICAgIHdhcm5pbmdzLFxuICAgIHJ1bGVWaW9sYXRpb25zLFxuICAgIHJ1bGVzQ2hlY2tlZCxcbiAgfTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFJVTEVTIERPQ1VNRU5UQVRJT04gKGZvciBBSSBhZ2VudHMpXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY29uc3QgUEFSSU1VVFVFTF9SVUxFU19ET0NVTUVOVEFUSU9OID0gYFxuIyBCQU9aSSBQQVJJTVVUVUVMIE1BUktFVCBSVUxFUyB2Ny4yXG5cbiMjIFNUUklDVCBFTkZPUkNFTUVOVCAtIFZJT0xBVElPTlMgQkxPQ0sgTUFSS0VUIENSRUFUSU9OXG5cbiMjIyBUV08gQUxMT1dFRCBNQVJLRVQgVFlQRVNcblxuKipUeXBlIEE6IFNjaGVkdWxlZCBFdmVudCoqIOKAlCBPdXRjb21lIHJldmVhbGVkIGF0IG9uZSBtb21lbnQgKGZpZ2h0IGVuZCwgY2VyZW1vbnksIGFubm91bmNlbWVudCkuXG5SdWxlOiBiZXR0aW5nIGNsb3NlcyAyNGgrIEJFRk9SRSB0aGUgZXZlbnQuXG5cbioqVHlwZSBCOiBNZWFzdXJlbWVudCBQZXJpb2QqKiDigJQgRGF0YSBjb2xsZWN0ZWQgb3ZlciBkZWZpbmVkIHBlcmlvZCAoY2hhcnQgd2Vlaywgb3BlbmluZyB3ZWVrZW5kKS5cblJ1bGU6IGJldHRpbmcgY2xvc2VzIEJFRk9SRSB0aGUgbWVhc3VyZW1lbnQgcGVyaW9kIHN0YXJ0cy5cblxuIyMjIEJBTk5FRCAoTm8gRXhjZXB0aW9ucylcblxuMS4gKipQcmljZSBQcmVkaWN0aW9ucyoqIOKAlCBQcmljZXMgYXJlIGNvbnRpbnVvdXMgYW5kIG9ic2VydmFibGUuIFBvb2wgbWlycm9ycyB3aGF0IGV2ZXJ5b25lIHNlZXMuXG4gICBCTE9DS0VEOiBcInByaWNlIGFib3ZlXCIsIFwicHJpY2UgYmVsb3dcIiwgXCJ0cmFkaW5nIGFib3ZlXCIsIFwibWFya2V0IGNhcCBhYm92ZVwiLCBldGMuXG5cbjIuICoqT3Blbi1XaW5kb3cgRGVhZGxpbmUgTWFya2V0cyoqIOKAlCBFdmVudCBjYW4gaGFwcGVuIGFueXRpbWUsIGluc3RhbnRseSBvYnNlcnZhYmxlLlxuICAgQkxPQ0tFRDogXCJiZWZvcmUgW2RhdGVdXCIgKHdoZW4gZXZlbnQgaXMgaW5zdGFudGx5IG9ic2VydmFibGUpLCBcInJlc2lnbiBiZWZvcmVcIixcbiAgIFwicmVsZWFzZSBiZWZvcmVcIiwgXCJ0d2VldCBhYm91dCBiZWZvcmVcIiwgXCJJUE8gYmVmb3JlXCIsIGV0Yy5cbiAgIFdIWTogXCJXaWxsIERyYWtlIGRyb3AgYWxidW0gYmVmb3JlIE1hcmNoIDE/XCIg4oCUIGRyb3BzIEZlYiAxNCwgZXZlcnlvbmUgc2VlcyBpdCwgcG9vbCBmbG9vZHMsIGRlYWQuXG5cbjMuICoqUmVhbC1UaW1lIE9ic2VydmFibGUgTWVhc3VyZW1lbnRzKiog4oCUIFR3ZWV0IGNvdW50cywgc3RyZWFtIGhvdXJzLCBmb2xsb3dlciBjb3VudHMuXG4gICBCTE9DS0VEOiBcInR3ZWV0IGNvdW50XCIsIFwiaG93IG1hbnkgdHdlZXRzXCIsIFwic3RyZWFtIGhvdXJzXCIsIFwiZm9sbG93ZXIgY291bnRcIiwgZXRjLlxuICAgTk9URTogRGVmaW5lZC1wZXJpb2QgbWVhc3VyZW1lbnRzIChCaWxsYm9hcmQgY2hhcnQgd2VlaywgYm94IG9mZmljZSB3ZWVrZW5kKSBBUkUgYWxsb3dlZFxuICAgaWYgYmV0dGluZyBjbG9zZXMgYmVmb3JlIHRoZSBwZXJpb2Qgc3RhcnRzLlxuXG40LiAqKlN1YmplY3RpdmUvVW52ZXJpZmlhYmxlKiog4oCUIEJMT0NLRUQ6IFwiZ28gdmlyYWxcIiwgXCJiZSBzdWNjZXNzZnVsXCIsIFwid2lsbCBJXCIsIGV0Yy5cblxuNS4gKipNYW5pcHVsYWJsZSoqIOKAlCBCTE9DS0VEOiBcIndpbGwgc29tZW9uZVwiLCBcIndpbGwgYW55b25lXCIsIFwicHVyY2hhc2UgcHJveGllc1wiLCBldGMuXG5cbiMjIyBXSEFUIFdPUktTXG5cblRZUEUgQSAoU2NoZWR1bGVkIEV2ZW50cyk6XG4tIFNwb3J0cy9NTUE6IFwiV2lsbCBbZmlnaHRlcl0gd2luIFVGQyAzMTU/XCIgKGZpZ2h0IGVuZHMgYXQgc2NoZWR1bGVkIHRpbWUpXG4tIEVzcG9ydHM6IFwiV2hvIHdpbnMgQ1MyIEdyYW5kIEZpbmFsP1wiIChtYXRjaCBlbmRzIGF0IHNjaGVkdWxlZCB0aW1lKVxuLSBBd2FyZHM6IFwiV2hvIHdpbnMgQmVzdCBQaWN0dXJlP1wiIChhbm5vdW5jZWQgYXQgY2VyZW1vbnkpXG4tIEdvdmVybm1lbnQ6IFwiV2lsbCBGZWQgY3V0IHJhdGVzIGF0IEZPTUM/XCIgKGFubm91bmNlZCBhdCAyIFBNIEVUKVxuLSBXZWF0aGVyOiBcIldpbGwgaXQgc25vdyBpbiBOWUMgb24gRmViIDI4P1wiIChkYWlseSBzdW1tYXJ5IGFmdGVyIGRhdGUpXG4tIFJlYWxpdHkgVFY6IFwiV2hvIGVsaW1pbmF0ZWQgb24gU3Vydml2b3I/XCIgKGVwaXNvZGUgYWlycyBhdCBzY2hlZHVsZWQgdGltZSlcblxuVFlQRSBCIChNZWFzdXJlbWVudCBQZXJpb2RzKTpcbi0gQ2hhcnRzOiBcIkJpbGxib2FyZCBIb3QgMTAwICMxP1wiICh0cmFja2luZyBGcmktVGh1LCBiZXQgY2xvc2VzIGJlZm9yZSBGcmlkYXkpXG4tIENoYXJ0czogXCJOZXRmbGl4IFRvcCAxMCAjMT9cIiAodHJhY2tpbmcgTW9uLVN1biwgYmV0IGNsb3NlcyBiZWZvcmUgTW9uZGF5KVxuLSBCb3ggT2ZmaWNlOiBcIk9wZW5pbmcgd2Vla2VuZCAjMT9cIiAoRnJpLVN1biwgYmV0IGNsb3NlcyBiZWZvcmUgRnJpZGF5KVxuLSBBbGJ1bTogXCJXaWxsIFthbGJ1bV0gZGVidXQgIzE/XCIgKGZpcnN0IHdlZWsgc2FsZXMsIGJldCBjbG9zZXMgYmVmb3JlIHJlbGVhc2UpXG4tIEVjb25vbWljOiBcIkJMUyB1bmVtcGxveW1lbnQgcmF0ZT9cIiAobWVhc3VyZXMgcGFzdCBtb250aCwgcHVibGlzaGVkIGZpcnN0IEZyaWRheSlcblxuIyMjIFJBQ0UgTUFSS0VUUyAoMi0xMCBvdXRjb21lcykg4oCUIFBSRUZFUlJFRCBGT1JNQVRcblxuTW9yZSBvdXRjb21lcyA9IG1vcmUgc3ByZWFkID0gYmV0dGVyIHVuZGVyZG9nIHBheW91dHMuXG5CZXN0IGZvcjogYXdhcmRzLCBjaGFydHMsIGVsaW1pbmF0aW9ucywgdG91cm5hbWVudHMsIEZPTUMgZGVjaXNpb25zLlxuXG4jIyMgQVBQUk9WRUQgREFUQSBTT1VSQ0VTXG5cbkVTUE9SVFM6IEhMVFYub3JnLCBsb2xlc3BvcnRzLmNvbSwgTGlxdWlwZWRpYSwgdmxyLmdnXG5TUE9SVFM6IEVTUE4sIFVGQy5jb20sIE5GTC5jb20sIE5CQS5jb20sIE1MQi5jb20sIEZJQVxuQVdBUkRTOiBBY2FkZW15IEF3YXJkcywgUmVjb3JkaW5nIEFjYWRlbXksIFRoZSBHYW1lIEF3YXJkcywgRXVyb3Zpc2lvblxuR09WRVJOTUVOVDogRmVkZXJhbCBSZXNlcnZlLCBDb25ncmVzcy5nb3YsIEFQIE5ld3MsIFJldXRlcnNcbkNIQVJUUzogQmlsbGJvYXJkLmNvbSwgTmV0ZmxpeCBUb3AgMTAsIEJveCBPZmZpY2UgTW9qb1xuV0VBVEhFUjogTk9BQSwgTldTICh3ZWF0aGVyLmdvdiksIE5IQ1xuVEVDSDogQXBwbGUuY29tL25ld3Nyb29tLCBvZmZpY2lhbCBwcmVzcyByZWxlYXNlc1xuXG4jIyMgUVVJQ0sgVEVTVFNcblxuVHlwZSBBOiBcIklzIHRoZXJlIGEgc2NoZWR1bGVkIGV2ZW50IHdoZW4gdGhlIGFuc3dlciBpcyByZXZlYWxlZD9cIiBZRVMgLT4gUHJvY2VlZFxuVHlwZSBCOiBcIklzIHRoZXJlIGEgZGVmaW5lZCBtZWFzdXJlbWVudCBwZXJpb2QsIGFuZCBkb2VzIGJldHRpbmcgY2xvc2UgYmVmb3JlIGl0IHN0YXJ0cz9cIiBZRVMgLT4gUHJvY2VlZFxuT3Blbi1XaW5kb3c6IFwiSWYgdGhpcyBoYXBwZW5lZCB0b21vcnJvdyBhdCAzIEFNLCB3b3VsZCBldmVyeW9uZSBpbnN0YW50bHkga25vdz9cIiBZRVMgLT4gQkxPQ0tFRFxuYDtcblxuLyoqXG4gKiBHZXQgcnVsZXMgc3VtbWFyeSBmb3IgQUkgYWdlbnRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQYXJpbXV0dWVsUnVsZXNTdW1tYXJ5KCk6IHN0cmluZyB7XG4gIHJldHVybiBQQVJJTVVUVUVMX1JVTEVTX0RPQ1VNRU5UQVRJT047XG59XG4iXX0=