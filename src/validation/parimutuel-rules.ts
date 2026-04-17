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
 * Validate market against parimutuel rules v7.2
 * Returns BLOCKED=true if market violates mandatory rules
 */
export function validateParimutuelRules(params: {
  question: string;
  closingTime: Date;
  scheduledMoment?: Date;      // The specific moment when outcome is revealed (Type A)
  marketType?: 'event' | 'measurement';  // kept for backwards compat
  eventTime?: Date;            // alias for scheduledMoment
  measurementStart?: Date;     // Start of measurement period (Type B)
  layer: 'official' | 'lab' | 'private';
}): ParimutuelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ruleViolations: ParimutuelValidationResult['ruleViolations'] = [];
  const rulesChecked: string[] = [];

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
  const hasApprovedSource = allApprovedSources.some(source =>
    questionLower.includes(source.toLowerCase())
  );

  const hasDataSource = questionLower.includes('source:') || questionLower.includes('official');

  // Check for implied sources
  const hasImpliedSource =
    /\b(ufc|nba|nfl|mlb|nhl|champions league|world cup|super bowl|cs2|counter-strike|league of legends|lol|lck|lec|lpl|dota|valorant|vct|iem|esl|blast|pgl)\b/i.test(params.question) ||
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
export function getParimutuelRulesSummary(): string {
  return PARIMUTUEL_RULES_DOCUMENTATION;
}
