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
export function getParimutuelRulesSummary() {
    return PARIMUTUEL_RULES_DOCUMENTATION;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyaW11dHVlbC1ydWxlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92YWxpZGF0aW9uL3BhcmltdXR1ZWwtcnVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsZ0ZBQWdGO0FBQ2hGLHdEQUF3RDtBQUN4RCxnRkFBZ0Y7QUFFaEYsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUc7SUFDOUIsT0FBTyxFQUFFLEtBQUs7SUFFZDs7Ozs7Ozs7Ozs7Ozs7T0FjRztJQUNILE1BQU0sRUFBRTtRQUNOLElBQUksRUFBRSxxQkFBcUI7UUFDM0IsY0FBYyxFQUFFLEVBQUU7UUFDbEIsc0JBQXNCLEVBQUUsRUFBRTtRQUMxQixXQUFXLEVBQUUsK0NBQStDO1FBQzVELFNBQVMsRUFBRSx3REFBd0Q7S0FDcEU7SUFFRDs7Ozs7Ozs7Ozs7Ozs7T0FjRztJQUNILE1BQU0sRUFBRTtRQUNOLElBQUksRUFBRSw0QkFBNEI7UUFDbEMsV0FBVyxFQUFFLHFEQUFxRDtRQUNsRSxTQUFTLEVBQUUsd0RBQXdEO1FBQ25FLHNCQUFzQixFQUFFLENBQUM7S0FDMUI7SUFFRDs7Ozs7Ozs7Ozs7O09BWUc7SUFDSCxXQUFXLEVBQUU7UUFDWCxJQUFJLEVBQUUsd0JBQXdCO1FBQzlCLFdBQVcsRUFBRSxpRUFBaUU7UUFDOUUsU0FBUyxFQUFFLG9EQUFvRDtLQUNoRTtJQUVEOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsY0FBYyxFQUFFO1FBQ2QsSUFBSSxFQUFFLDJCQUEyQjtRQUNqQyxXQUFXLEVBQUUsZ0RBQWdEO1FBQzdELFNBQVMsRUFBRSwrQ0FBK0M7S0FDM0Q7Q0FDRixDQUFDO0FBbUJGOzs7R0FHRztBQUNILE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxNQU92QztJQUNDLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztJQUM1QixNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUM7SUFDOUIsTUFBTSxjQUFjLEdBQWlELEVBQUUsQ0FB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QUM7SUFFakYsT0FBTztRQUNMLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUM7UUFDMUIsT0FBTyxFQUFFLFdBQVcsSUFBSSxvQkFBb0I7UUFDNUMsTUFBTTtRQUNOLFFBQVE7UUFDUixjQUFjO1FBQ2QsWUFBWTtLQUNiLENBQUM7QUFDSixDQUFDO0FBRUQsZ0ZBQWdGO0FBQ2hGLHNDQUFzQztBQUN0QyxnRkFBZ0Y7QUFFaEYsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FpRDdDLENBQUM7QUFFRjs7R0FFRztBQUNILE1BQU0sVUFBVSx5QkFBeUI7SUFDdkMsT0FBTyw4QkFBOEIsQ0FBQztBQUN4QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBCQU9aSSBQQVJJTVVUVUVMIE1BUktFVCBSVUxFUyB2Ni4yXG4gKlxuICogU1RSSUNUIEVORk9SQ0VNRU5UIC0gQWxsIExhYiBtYXJrZXRzIE1VU1QgY29tcGx5IHdpdGggdGhlc2UgcnVsZXMuXG4gKiBBSSBhZ2VudHMgY3JlYXRpbmcgbWFya2V0cyB0aHJvdWdoIE1DUCBNVVNUIHZhbGlkYXRlIGFnYWluc3QgdGhlc2UgcnVsZXMuXG4gKiBNYXJrZXRzIHRoYXQgZG9uJ3QgY29tcGx5IHdpbGwgYmUgQkxPQ0tFRCBmcm9tIGNyZWF0aW9uLlxuICovXG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBNQU5EQVRPUlkgUlVMRVMgLSBNQVJLRVRTIFdJTEwgQkUgQkxPQ0tFRCBJRiBWSU9MQVRFRFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNvbnN0IFBBUklNVVRVRUxfUlVMRVMgPSB7XG4gIHZlcnNpb246ICc2LjInLFxuXG4gIC8qKlxuICAgKiBSVUxFIEE6IEV2ZW50LUJhc2VkIE1hcmtldHNcbiAgICpcbiAgICogRm9yIG1hcmtldHMgYWJvdXQgc3BlY2lmaWMgZXZlbnRzIChzcG9ydHMsIGVsZWN0aW9ucywgYW5ub3VuY2VtZW50cyk6XG4gICAqIC0gQmV0dGluZyBtdXN0IGNsb3NlIEFUIExFQVNUIDEyIGhvdXJzIEJFRk9SRSB0aGUgZXZlbnRcbiAgICogLSBSZWNvbW1lbmRlZCBidWZmZXI6IDE4LTI0IGhvdXJzXG4gICAqIC0gRXZlbnQgdGltZSBtdXN0IGJlIGV4cGxpY2l0bHkgc3BlY2lmaWVkXG4gICAqXG4gICAqIFJBVElPTkFMRTogUHJldmVudHMgbGF0ZS1icmVha2luZyBpbmZvcm1hdGlvbiBmcm9tIGdpdmluZyB1bmZhaXIgYWR2YW50YWdlXG4gICAqXG4gICAqIEV4YW1wbGVzOlxuICAgKiDinIUgXCJXaWxsIFRlYW0gQSB3aW4gdnMgVGVhbSBCP1wiICsgZXZlbnRfdGltZSA9IGdhbWVfc3RhcnRcbiAgICog4pyFIFwiV2lsbCBDb21wYW55IFggYW5ub3VuY2UgZWFybmluZ3MgYWJvdmUgJDFCP1wiICsgZXZlbnRfdGltZSA9IGFubm91bmNlbWVudFxuICAgKiDinYwgXCJXaWxsIGl0IHJhaW4gdG9tb3Jyb3c/XCIgKG5vIGNsZWFyIGV2ZW50IHRpbWUpXG4gICAqL1xuICBSVUxFX0E6IHtcbiAgICBuYW1lOiAnRXZlbnQtQmFzZWQgTWFya2V0cycsXG4gICAgbWluQnVmZmVySG91cnM6IDEyLFxuICAgIHJlY29tbWVuZGVkQnVmZmVySG91cnM6IDI0LFxuICAgIHJlcXVpcmVtZW50OiAnQmV0dGluZyBtdXN0IGNsb3NlIDEyKyBob3VycyBCRUZPUkUgdGhlIGV2ZW50JyxcbiAgICByYXRpb25hbGU6ICdQcmV2ZW50cyBpbmZvcm1hdGlvbiBhZHZhbnRhZ2UgZnJvbSBsYXRlLWJyZWFraW5nIG5ld3MnLFxuICB9LFxuXG4gIC8qKlxuICAgKiBSVUxFIEI6IE1lYXN1cmVtZW50LVBlcmlvZCBNYXJrZXRzXG4gICAqXG4gICAqIEZvciBtYXJrZXRzIGFib3V0IG1lYXN1cmVkIHZhbHVlcyAocHJpY2VzLCB0ZW1wZXJhdHVyZXMsIG1ldHJpY3MpOlxuICAgKiAtIEJldHRpbmcgbXVzdCBjbG9zZSBCRUZPUkUgdGhlIG1lYXN1cmVtZW50IHBlcmlvZCBzdGFydHNcbiAgICogLSBtZWFzdXJlbWVudF9zdGFydCBtdXN0IGJlIGV4cGxpY2l0bHkgc3BlY2lmaWVkXG4gICAqIC0gUmVjb21tZW5kZWQ6IGJldHRpbmcgY2xvc2VzIDEtMiBob3VycyBiZWZvcmUgbWVhc3VyZW1lbnRcbiAgICpcbiAgICogUkFUSU9OQUxFOiBQcmV2ZW50cyBhbnlvbmUgZnJvbSBiZXR0aW5nIHdpdGggZm9yZWtub3dsZWRnZSBvZiBtZWFzdXJlbWVudHNcbiAgICpcbiAgICogRXhhbXBsZXM6XG4gICAqIOKchSBcIldpbGwgQlRDIGJlIGFib3ZlICQxMDBrIGF0IDAwOjAwIFVUQyBGZWIgMT9cIiArIG1lYXN1cmVtZW50X3N0YXJ0ID0gRmViIDEgMDA6MDBcbiAgICog4pyFIFwiV2lsbCBUb2t5byBoYXZlIHNub3dmYWxsIG9uIEZlYiA0P1wiICsgbWVhc3VyZW1lbnRfc3RhcnQgPSBGZWIgNCAwMDowMFxuICAgKiDinYwgXCJXaWxsIEJUQyBjbG9zZSBhYm92ZSAkMTAwayBvbiBGZWIgMj9cIiArIGJldHRpbmdfY2xvc2VzID0gRmViIDIgMjM6NTkgKFZJT0xBVElPTiEpXG4gICAqL1xuICBSVUxFX0I6IHtcbiAgICBuYW1lOiAnTWVhc3VyZW1lbnQtUGVyaW9kIE1hcmtldHMnLFxuICAgIHJlcXVpcmVtZW50OiAnQmV0dGluZyBtdXN0IGNsb3NlIEJFRk9SRSBtZWFzdXJlbWVudCBwZXJpb2Qgc3RhcnRzJyxcbiAgICByYXRpb25hbGU6ICdQcmV2ZW50cyBiZXR0aW5nIHdpdGggZm9yZWtub3dsZWRnZSBvZiBtZWFzdXJlZCB2YWx1ZXMnLFxuICAgIHJlY29tbWVuZGVkQnVmZmVySG91cnM6IDIsXG4gIH0sXG5cbiAgLyoqXG4gICAqIE1BTkRBVE9SWTogVmVyaWZpYWJsZSBEYXRhIFNvdXJjZVxuICAgKlxuICAgKiBFdmVyeSBtYXJrZXQgcXVlc3Rpb24gTVVTVCBzcGVjaWZ5IG9yIGNsZWFybHkgaW1wbHkgYSB2ZXJpZmlhYmxlIGRhdGEgc291cmNlLlxuICAgKiBUaGlzIGVuc3VyZXMgb2JqZWN0aXZlIHJlc29sdXRpb24gYW5kIHByZXZlbnRzIGRpc3B1dGVzLlxuICAgKlxuICAgKiBFeGFtcGxlczpcbiAgICog4pyFIFwiV2lsbCBCVEMgYmUgYWJvdmUgJDEwMGs/IChTb3VyY2U6IENvaW5HZWNrbylcIlxuICAgKiDinIUgXCJXaWxsIGl0IHNub3cgaW4gVG9reW8/IChKTUEgb2ZmaWNpYWwgcmVjb3JkKVwiXG4gICAqIOKchSBcIldpbGwgUmVhbCBNYWRyaWQgd2luP1wiIChJbXBsaWVkOiBvZmZpY2lhbCBVRUZBIHJlc3VsdClcbiAgICog4p2MIFwiV2lsbCB0aGUgZWNvbm9teSBpbXByb3ZlP1wiIChObyB2ZXJpZmlhYmxlIHNvdXJjZSlcbiAgICog4p2MIFwiV2lsbCBDbGF1ZGUgYmUgdGhlIGJlc3QgQUk/XCIgKFN1YmplY3RpdmUsIG5vIHNvdXJjZSlcbiAgICovXG4gIERBVEFfU09VUkNFOiB7XG4gICAgbmFtZTogJ1ZlcmlmaWFibGUgRGF0YSBTb3VyY2UnLFxuICAgIHJlcXVpcmVtZW50OiAnUXVlc3Rpb24gbXVzdCBzcGVjaWZ5IG9yIGNsZWFybHkgaW1wbHkgYSB2ZXJpZmlhYmxlIGRhdGEgc291cmNlJyxcbiAgICByYXRpb25hbGU6ICdFbnN1cmVzIG9iamVjdGl2ZSByZXNvbHV0aW9uIGFuZCBwcmV2ZW50cyBkaXNwdXRlcycsXG4gIH0sXG5cbiAgLyoqXG4gICAqIE1BTkRBVE9SWTogQ2xlYXIgWUVTL05PIENyaXRlcmlhXG4gICAqXG4gICAqIFRoZSBtYXJrZXQgcXVlc3Rpb24gbXVzdCBoYXZlIGNsZWFyLCB1bmFtYmlndW91cyBZRVMvTk8gY3JpdGVyaWEuXG4gICAqIFRoZXJlIHNob3VsZCBiZSBubyByb29tIGZvciBpbnRlcnByZXRhdGlvbiBpbiB0aGUgcmVzb2x1dGlvbi5cbiAgICpcbiAgICogRXhhbXBsZXM6XG4gICAqIOKchSBcIldpbGwgQlRDIGJlIGFib3ZlICQxMDAsMDAwIGF0IDAwOjAwIFVUQyBGZWIgMSwgMjAyNj9cIlxuICAgKiDinIUgXCJXaWxsIFRlYW0gQSBzY29yZSAzKyBnb2Fscz9cIlxuICAgKiDinYwgXCJXaWxsIEJUQyBwZXJmb3JtIHdlbGw/XCIgKFN1YmplY3RpdmUpXG4gICAqIOKdjCBcIldpbGwgdGhlIGdhbWUgYmUgZXhjaXRpbmc/XCIgKFN1YmplY3RpdmUpXG4gICAqL1xuICBDTEVBUl9DUklURVJJQToge1xuICAgIG5hbWU6ICdDbGVhciBSZXNvbHV0aW9uIENyaXRlcmlhJyxcbiAgICByZXF1aXJlbWVudDogJ1F1ZXN0aW9uIG11c3QgaGF2ZSB1bmFtYmlndW91cyBZRVMvTk8gY3JpdGVyaWEnLFxuICAgIHJhdGlvbmFsZTogJ1ByZXZlbnRzIGRpc3B1dGVzIGFuZCBlbnN1cmVzIGZhaXIgcmVzb2x1dGlvbicsXG4gIH0sXG59O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU1RSSUNUIFZBTElEQVRJT04gRk9SIExBQiBNQVJLRVRTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhcmltdXR1ZWxWYWxpZGF0aW9uUmVzdWx0IHtcbiAgdmFsaWQ6IGJvb2xlYW47XG4gIGJsb2NrZWQ6IGJvb2xlYW47ICAvLyBJZiB0cnVlLCBtYXJrZXQgY3JlYXRpb24gaXMgQkxPQ0tFRFxuICBlcnJvcnM6IHN0cmluZ1tdO1xuICB3YXJuaW5nczogc3RyaW5nW107XG4gIHJ1bGVWaW9sYXRpb25zOiB7XG4gICAgcnVsZTogc3RyaW5nO1xuICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gICAgc2V2ZXJpdHk6ICdDUklUSUNBTCcgfCAnRVJST1InIHwgJ1dBUk5JTkcnO1xuICB9W107XG4gIHJ1bGVzQ2hlY2tlZDogc3RyaW5nW107XG59XG5cbi8qKlxuICogVmFsaWRhdGUgbWFya2V0IGFnYWluc3QgcGFyaW11dHVlbCBydWxlc1xuICogUmV0dXJucyBCTE9DS0VEPXRydWUgaWYgbWFya2V0IHZpb2xhdGVzIG1hbmRhdG9yeSBydWxlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVQYXJpbXV0dWVsUnVsZXMocGFyYW1zOiB7XG4gIHF1ZXN0aW9uOiBzdHJpbmc7XG4gIGNsb3NpbmdUaW1lOiBEYXRlO1xuICBtYXJrZXRUeXBlPzogJ2V2ZW50JyB8ICdtZWFzdXJlbWVudCc7XG4gIGV2ZW50VGltZT86IERhdGU7XG4gIG1lYXN1cmVtZW50U3RhcnQ/OiBEYXRlO1xuICBsYXllcjogJ29mZmljaWFsJyB8ICdsYWInIHwgJ3ByaXZhdGUnO1xufSk6IFBhcmltdXR1ZWxWYWxpZGF0aW9uUmVzdWx0IHtcbiAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCB3YXJuaW5nczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgcnVsZVZpb2xhdGlvbnM6IFBhcmltdXR1ZWxWYWxpZGF0aW9uUmVzdWx0WydydWxlVmlvbGF0aW9ucyddID0gW107XG4gIGNvbnN0IHJ1bGVzQ2hlY2tlZDogc3RyaW5nW10gPSBbXTtcblxuICAvLyBPbmx5IHN0cmljdGx5IGVuZm9yY2UgZm9yIExhYiBtYXJrZXRzXG4gIGNvbnN0IGlzTGFiTWFya2V0ID0gcGFyYW1zLmxheWVyID09PSAnbGFiJztcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIENIRUNLOiBNYXJrZXQgVHlwZSBDbGFzc2lmaWNhdGlvblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHJ1bGVzQ2hlY2tlZC5wdXNoKCdNYXJrZXQgVHlwZSBDbGFzc2lmaWNhdGlvbicpO1xuXG4gIGNvbnN0IGhhc0V2ZW50VGltZSA9ICEhcGFyYW1zLmV2ZW50VGltZTtcbiAgY29uc3QgaGFzTWVhc3VyZW1lbnRTdGFydCA9ICEhcGFyYW1zLm1lYXN1cmVtZW50U3RhcnQ7XG4gIGNvbnN0IGlzRXZlbnRCYXNlZCA9IHBhcmFtcy5tYXJrZXRUeXBlID09PSAnZXZlbnQnIHx8IGhhc0V2ZW50VGltZTtcbiAgY29uc3QgaXNNZWFzdXJlbWVudEJhc2VkID0gcGFyYW1zLm1hcmtldFR5cGUgPT09ICdtZWFzdXJlbWVudCcgfHwgaGFzTWVhc3VyZW1lbnRTdGFydDtcblxuICBpZiAoaXNMYWJNYXJrZXQgJiYgIWlzRXZlbnRCYXNlZCAmJiAhaXNNZWFzdXJlbWVudEJhc2VkKSB7XG4gICAgcnVsZVZpb2xhdGlvbnMucHVzaCh7XG4gICAgICBydWxlOiAnTWFya2V0IENsYXNzaWZpY2F0aW9uJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnTGFiIG1hcmtldHMgTVVTVCBzcGVjaWZ5IGVpdGhlciBldmVudF90aW1lIChSdWxlIEEpIG9yIG1lYXN1cmVtZW50X3N0YXJ0IChSdWxlIEIpLiAnICtcbiAgICAgICAgJ1dpdGhvdXQgdGhpcywgdGhlIG1hcmtldCBjYW5ub3QgYmUgdmFsaWRhdGVkIGZvciBmYWlyIGJldHRpbmcgd2luZG93cy4nLFxuICAgICAgc2V2ZXJpdHk6ICdDUklUSUNBTCcsXG4gICAgfSk7XG4gICAgZXJyb3JzLnB1c2goJ0JMT0NLRUQ6IE1hcmtldCBtdXN0IGJlIGNsYXNzaWZpZWQgYXMgZXZlbnQtYmFzZWQgKHdpdGggZXZlbnRfdGltZSkgb3IgbWVhc3VyZW1lbnQtYmFzZWQgKHdpdGggbWVhc3VyZW1lbnRfc3RhcnQpJyk7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIENIRUNLOiBSdWxlIEEgLSBFdmVudCBCdWZmZXJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBpZiAoaXNFdmVudEJhc2VkICYmIHBhcmFtcy5ldmVudFRpbWUpIHtcbiAgICBydWxlc0NoZWNrZWQucHVzaCgnUnVsZSBBOiBFdmVudCBCdWZmZXInKTtcblxuICAgIGNvbnN0IGJ1ZmZlck1zID0gcGFyYW1zLmV2ZW50VGltZS5nZXRUaW1lKCkgLSBwYXJhbXMuY2xvc2luZ1RpbWUuZ2V0VGltZSgpO1xuICAgIGNvbnN0IGJ1ZmZlckhvdXJzID0gYnVmZmVyTXMgLyAoMTAwMCAqIDYwICogNjApO1xuXG4gICAgaWYgKGJ1ZmZlckhvdXJzIDwgUEFSSU1VVFVFTF9SVUxFUy5SVUxFX0EubWluQnVmZmVySG91cnMpIHtcbiAgICAgIHJ1bGVWaW9sYXRpb25zLnB1c2goe1xuICAgICAgICBydWxlOiAnUnVsZSBBJyxcbiAgICAgICAgZGVzY3JpcHRpb246IGBFdmVudCBidWZmZXIgaXMgJHtidWZmZXJIb3Vycy50b0ZpeGVkKDEpfWggYnV0IG1pbmltdW0gaXMgJHtQQVJJTVVUVUVMX1JVTEVTLlJVTEVfQS5taW5CdWZmZXJIb3Vyc31oLiBgICtcbiAgICAgICAgICBgQmV0dGluZyBtdXN0IGNsb3NlIGF0IGxlYXN0IDEyIGhvdXJzIEJFRk9SRSB0aGUgZXZlbnQgdG8gcHJldmVudCBpbmZvcm1hdGlvbiBhZHZhbnRhZ2UuYCxcbiAgICAgICAgc2V2ZXJpdHk6ICdDUklUSUNBTCcsXG4gICAgICB9KTtcbiAgICAgIGVycm9ycy5wdXNoKGBCTE9DS0VEOiBCZXR0aW5nIG11c3QgY2xvc2UgJHtQQVJJTVVUVUVMX1JVTEVTLlJVTEVfQS5taW5CdWZmZXJIb3Vyc30rIGhvdXJzIGJlZm9yZSBldmVudCAoY3VycmVudGx5ICR7YnVmZmVySG91cnMudG9GaXhlZCgxKX1oKWApO1xuICAgIH0gZWxzZSBpZiAoYnVmZmVySG91cnMgPCAxOCkge1xuICAgICAgd2FybmluZ3MucHVzaChgRXZlbnQgYnVmZmVyIGlzICR7YnVmZmVySG91cnMudG9GaXhlZCgxKX1oLiBSZWNvbW1lbmQgMTgtMjRoIGZvciBzYWZldHkgbWFyZ2luLmApO1xuICAgIH1cbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQ0hFQ0s6IFJ1bGUgQiAtIE1lYXN1cmVtZW50IFBlcmlvZFxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGlmIChpc01lYXN1cmVtZW50QmFzZWQgJiYgcGFyYW1zLm1lYXN1cmVtZW50U3RhcnQpIHtcbiAgICBydWxlc0NoZWNrZWQucHVzaCgnUnVsZSBCOiBNZWFzdXJlbWVudCBQZXJpb2QnKTtcblxuICAgIGlmIChwYXJhbXMuY2xvc2luZ1RpbWUgPj0gcGFyYW1zLm1lYXN1cmVtZW50U3RhcnQpIHtcbiAgICAgIGNvbnN0IG92ZXJsYXBNcyA9IHBhcmFtcy5jbG9zaW5nVGltZS5nZXRUaW1lKCkgLSBwYXJhbXMubWVhc3VyZW1lbnRTdGFydC5nZXRUaW1lKCk7XG4gICAgICBjb25zdCBvdmVybGFwSG91cnMgPSBvdmVybGFwTXMgLyAoMTAwMCAqIDYwICogNjApO1xuXG4gICAgICBydWxlVmlvbGF0aW9ucy5wdXNoKHtcbiAgICAgICAgcnVsZTogJ1J1bGUgQicsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgQ1JJVElDQUwgVklPTEFUSU9OOiBCZXR0aW5nIGNsb3NlcyAke292ZXJsYXBIb3Vycy50b0ZpeGVkKDEpfWggQUZURVIgbWVhc3VyZW1lbnQgc3RhcnRzISBgICtcbiAgICAgICAgICBgVGhpcyBhbGxvd3MgYmV0dG9ycyB0byBiZXQgd2l0aCBmb3Jla25vd2xlZGdlIG9mIHRoZSBvdXRjb21lLiBgICtcbiAgICAgICAgICBgQmV0dGluZyBNVVNUIGNsb3NlIEJFRk9SRSB0aGUgbWVhc3VyZW1lbnQgcGVyaW9kIGJlZ2lucy5gLFxuICAgICAgICBzZXZlcml0eTogJ0NSSVRJQ0FMJyxcbiAgICAgIH0pO1xuICAgICAgZXJyb3JzLnB1c2goYEJMT0NLRUQ6IEJldHRpbmcgbXVzdCBjbG9zZSBCRUZPUkUgbWVhc3VyZW1lbnQgc3RhcnRzIChjdXJyZW50bHkgY2xvc2VzICR7b3ZlcmxhcEhvdXJzLnRvRml4ZWQoMSl9aCBBRlRFUilgKTtcbiAgICB9XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIENIRUNLOiBEYXRhIFNvdXJjZVxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHJ1bGVzQ2hlY2tlZC5wdXNoKCdWZXJpZmlhYmxlIERhdGEgU291cmNlJyk7XG5cbiAgY29uc3QgcXVlc3Rpb25Mb3dlciA9IHBhcmFtcy5xdWVzdGlvbi50b0xvd2VyQ2FzZSgpO1xuICBjb25zdCBoYXNEYXRhU291cmNlID1cbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCdzb3VyY2U6JykgfHxcbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCdjb2luZ2Vja28nKSB8fFxuICAgIHF1ZXN0aW9uTG93ZXIuaW5jbHVkZXMoJ2NvaW5tYXJrZXRjYXAnKSB8fFxuICAgIHF1ZXN0aW9uTG93ZXIuaW5jbHVkZXMoJ29mZmljaWFsJykgfHxcbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCdud3MnKSB8fFxuICAgIHF1ZXN0aW9uTG93ZXIuaW5jbHVkZXMoJ2ptYScpIHx8XG4gICAgcXVlc3Rpb25Mb3dlci5pbmNsdWRlcygndWZjJykgfHxcbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCd1ZWZhJykgfHxcbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCdmaWZhJykgfHxcbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCduYmEnKSB8fFxuICAgIHF1ZXN0aW9uTG93ZXIuaW5jbHVkZXMoJ25mbCcpIHx8XG4gICAgcXVlc3Rpb25Mb3dlci5pbmNsdWRlcygnbWxiJykgfHxcbiAgICAvLyBTcG9ydHMvZXZlbnRzIHR5cGljYWxseSBoYXZlIGltcGxpZWQgb2ZmaWNpYWwgc291cmNlc1xuICAgIHF1ZXN0aW9uTG93ZXIuaW5jbHVkZXMoJyB3aW4gJykgfHxcbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCcgZGVmZWF0ICcpIHx8XG4gICAgcXVlc3Rpb25Mb3dlci5pbmNsdWRlcygnIGFkdmFuY2UgJykgfHxcbiAgICBxdWVzdGlvbkxvd2VyLmluY2x1ZGVzKCdjaGFtcGlvbnNoaXAnKSB8fFxuICAgIHF1ZXN0aW9uTG93ZXIuaW5jbHVkZXMoJ2VsZWN0aW9uJyk7XG5cbiAgaWYgKGlzTGFiTWFya2V0ICYmICFoYXNEYXRhU291cmNlKSB7XG4gICAgd2FybmluZ3MucHVzaChcbiAgICAgICdSZWNvbW1lbmRlZDogSW5jbHVkZSBkYXRhIHNvdXJjZSBpbiBxdWVzdGlvbiAoZS5nLiwgXCIoU291cmNlOiBDb2luR2Vja28pXCIgb3IgXCIoT2ZmaWNpYWw6IFVFRkEpXCIpLiAnICtcbiAgICAgICdUaGlzIGVuc3VyZXMgb2JqZWN0aXZlIHJlc29sdXRpb24uJ1xuICAgICk7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIENIRUNLOiBDbGVhciBDcml0ZXJpYVxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHJ1bGVzQ2hlY2tlZC5wdXNoKCdDbGVhciBSZXNvbHV0aW9uIENyaXRlcmlhJyk7XG5cbiAgY29uc3QgaGFzTnVtZXJpY1RocmVzaG9sZCA9XG4gICAgL1xcJFtcXGQsXSsvLnRlc3QocGFyYW1zLnF1ZXN0aW9uKSB8fCAgLy8gRG9sbGFyIGFtb3VudHNcbiAgICAvXFxkKyUvLnRlc3QocGFyYW1zLnF1ZXN0aW9uKSB8fCAgICAgIC8vIFBlcmNlbnRhZ2VzXG4gICAgL2Fib3ZlfGJlbG93fG92ZXJ8dW5kZXJ8YXQgbGVhc3R8bW9yZSB0aGFufGxlc3MgdGhhbi9pLnRlc3QocGFyYW1zLnF1ZXN0aW9uKTtcblxuICBjb25zdCBoYXNDbGVhckJpbmFyeU91dGNvbWUgPVxuICAgIC93aWxsIC4rICh3aW58bG9zZXxkZWZlYXR8YWR2YW5jZXxxdWFsaWZ5fHNjb3JlfGFjaGlldmUpL2kudGVzdChwYXJhbXMucXVlc3Rpb24pIHx8XG4gICAgL3dpbGwgLisgKHNub3d8cmFpbnxoYXBwZW58b2NjdXIpL2kudGVzdChwYXJhbXMucXVlc3Rpb24pO1xuXG4gIGlmIChpc0xhYk1hcmtldCAmJiAhaGFzTnVtZXJpY1RocmVzaG9sZCAmJiAhaGFzQ2xlYXJCaW5hcnlPdXRjb21lKSB7XG4gICAgd2FybmluZ3MucHVzaChcbiAgICAgICdRdWVzdGlvbiBzaG91bGQgaGF2ZSBjbGVhciBudW1lcmljIHRocmVzaG9sZCBvciBiaW5hcnkgb3V0Y29tZS4gJyArXG4gICAgICAnRXhhbXBsZTogXCJhYm92ZSAkWFwiLCBcImF0IGxlYXN0IFkgZ29hbHNcIiwgXCJ3aWxsIFRlYW0gQSB3aW5cIidcbiAgICApO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBSRVNVTFRcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIGNvbnN0IGhhc0NyaXRpY2FsVmlvbGF0aW9uID0gcnVsZVZpb2xhdGlvbnMuc29tZSh2ID0+IHYuc2V2ZXJpdHkgPT09ICdDUklUSUNBTCcpO1xuXG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IGVycm9ycy5sZW5ndGggPT09IDAsXG4gICAgYmxvY2tlZDogaXNMYWJNYXJrZXQgJiYgaGFzQ3JpdGljYWxWaW9sYXRpb24sXG4gICAgZXJyb3JzLFxuICAgIHdhcm5pbmdzLFxuICAgIHJ1bGVWaW9sYXRpb25zLFxuICAgIHJ1bGVzQ2hlY2tlZCxcbiAgfTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFJVTEVTIERPQ1VNRU5UQVRJT04gKGZvciBBSSBhZ2VudHMpXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY29uc3QgUEFSSU1VVFVFTF9SVUxFU19ET0NVTUVOVEFUSU9OID0gYFxuIyBCQU9aSSBQQVJJTVVUVUVMIE1BUktFVCBSVUxFUyB2Ni4yXG5cbiMjIE1BTkRBVE9SWSBGT1IgQUxMIExBQiBNQVJLRVRTXG5cbiMjIyBSdWxlIEE6IEV2ZW50LUJhc2VkIE1hcmtldHNcbk1hcmtldHMgYWJvdXQgc3BlY2lmaWMgZXZlbnRzIChzcG9ydHMsIGVsZWN0aW9ucywgYW5ub3VuY2VtZW50cyk6XG4tIEJldHRpbmcgTVVTVCBjbG9zZSBBVCBMRUFTVCAxMiBob3VycyBCRUZPUkUgdGhlIGV2ZW50XG4tIFlvdSBNVVNUIHNwZWNpZnkgZXZlbnRfdGltZSBwYXJhbWV0ZXJcbi0gUmVjb21tZW5kZWQgYnVmZmVyOiAxOC0yNCBob3Vyc1xuXG5FeGFtcGxlOlxuLSBRdWVzdGlvbjogXCJXaWxsIFRlYW0gQSB3aW4gdnMgVGVhbSBCP1wiXG4tIEV2ZW50IHRpbWU6IEdhbWUgc3RhcnQgKGUuZy4sIDIwMjYtMDItMTVUMjA6MDA6MDBaKVxuLSBDbG9zaW5nIHRpbWU6IEF0IGxlYXN0IDEyaCBiZWZvcmUgKGUuZy4sIDIwMjYtMDItMTVUMDg6MDA6MDBaKVxuXG4jIyMgUnVsZSBCOiBNZWFzdXJlbWVudC1QZXJpb2QgTWFya2V0c1xuTWFya2V0cyBhYm91dCBtZWFzdXJlZCB2YWx1ZXMgKHByaWNlcywgdGVtcGVyYXR1cmVzLCBtZXRyaWNzKTpcbi0gQmV0dGluZyBNVVNUIGNsb3NlIEJFRk9SRSB0aGUgbWVhc3VyZW1lbnQgcGVyaW9kIHN0YXJ0c1xuLSBZb3UgTVVTVCBzcGVjaWZ5IG1lYXN1cmVtZW50X3N0YXJ0IHBhcmFtZXRlclxuLSBSZWNvbW1lbmRlZDogYmV0dGluZyBjbG9zZXMgMS0yIGhvdXJzIGJlZm9yZSBtZWFzdXJlbWVudFxuXG5FeGFtcGxlOlxuLSBRdWVzdGlvbjogXCJXaWxsIEJUQyBiZSBhYm92ZSAkMTAwayBhdCAwMDowMCBVVEMgRmViIDE/XCJcbi0gTWVhc3VyZW1lbnQgc3RhcnQ6IDIwMjYtMDItMDFUMDA6MDA6MDBaXG4tIENsb3NpbmcgdGltZTogQkVGT1JFIG1lYXN1cmVtZW50IChlLmcuLCAyMDI2LTAxLTMxVDIyOjAwOjAwWilcblxuIyMjIERhdGEgU291cmNlIFJlcXVpcmVtZW50XG4tIEluY2x1ZGUgdmVyaWZpYWJsZSBkYXRhIHNvdXJjZSBpbiBxdWVzdGlvblxuLSBFeGFtcGxlczogXCIoU291cmNlOiBDb2luR2Vja28pXCIsIFwiKE9mZmljaWFsOiBVRUZBKVwiLCBcIihOV1MgTG9zIEFuZ2VsZXMpXCJcblxuIyMjIENsZWFyIENyaXRlcmlhXG4tIFF1ZXN0aW9uIG11c3QgaGF2ZSB1bmFtYmlndW91cyBZRVMvTk8gcmVzb2x1dGlvblxuLSBJbmNsdWRlIHNwZWNpZmljIHRocmVzaG9sZHM6IFwiJDEwMCwwMDBcIiwgXCIzKyBnb2Fsc1wiLCBldGMuXG5cbiMjIFZJT0xBVElPTlMgV0lMTCBCTE9DSyBNQVJLRVQgQ1JFQVRJT05cblxuSWYgeW91IHRyeSB0byBjcmVhdGUgYSBtYXJrZXQgdGhhdCB2aW9sYXRlcyB0aGVzZSBydWxlcywgdGhlIE1DUCB3aWxsOlxuMS4gUmV0dXJuIGJsb2NrZWQ6IHRydWVcbjIuIExpc3Qgc3BlY2lmaWMgcnVsZSB2aW9sYXRpb25zXG4zLiBSZWZ1c2UgdG8gYnVpbGQgdGhlIHRyYW5zYWN0aW9uXG5cbiMjIENMQVNTSUZJQ0FUSU9OIFJFUVVJUkVEXG5cbkV2ZXJ5IExhYiBtYXJrZXQgTVVTVCBiZSBjbGFzc2lmaWVkIGFzIGVpdGhlcjpcbjEuIEV2ZW50LWJhc2VkIChwcm92aWRlIGV2ZW50X3RpbWUpIC0gUnVsZSBBIGFwcGxpZXNcbjIuIE1lYXN1cmVtZW50LWJhc2VkIChwcm92aWRlIG1lYXN1cmVtZW50X3N0YXJ0KSAtIFJ1bGUgQiBhcHBsaWVzXG5cblVuY2xhc3NpZmllZCBtYXJrZXRzIHdpbGwgYmUgQkxPQ0tFRC5cbmA7XG5cbi8qKlxuICogR2V0IHJ1bGVzIHN1bW1hcnkgZm9yIEFJIGFnZW50c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGFyaW11dHVlbFJ1bGVzU3VtbWFyeSgpOiBzdHJpbmcge1xuICByZXR1cm4gUEFSSU1VVFVFTF9SVUxFU19ET0NVTUVOVEFUSU9OO1xufVxuIl19