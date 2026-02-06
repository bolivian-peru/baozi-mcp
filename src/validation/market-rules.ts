/**
 * Market Validation Rules (v6.3)
 *
 * Implements timing validation for market creation based on:
 * - Rule A: Event-Based Markets (single point in time)
 * - Rule B: Measurement-Period Markets (outcome over time range)
 */

import { TIMING } from '../config.js';

// =============================================================================
// TYPES
// =============================================================================

export interface MarketTimingParams {
  question: string;
  closingTime: Date;
  marketType: 'event' | 'measurement';
  eventTime?: Date;
  measurementStart?: Date;
  measurementEnd?: Date;
}

export interface MarketValidation {
  valid: boolean;
  ruleType: 'A' | 'B';
  errors: string[];
  warnings: string[];
  suggestions: string[];
  timing?: {
    bufferHours?: number;
    recommendedClose?: Date;
    measurementDays?: number;
  };
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validate market timing parameters against v6.3 rules
 *
 * Rule A (Event-Based):
 * - Betting closes BEFORE the event occurs
 * - Minimum 12h buffer between close and event
 * - Recommended 18-24h buffer for safety
 *
 * Rule B (Measurement-Period):
 * - Betting must close BEFORE measurement starts
 * - Measurement period should be well-defined
 * - Prefer 2-7 day measurement periods for UX
 */
export function validateMarketTiming(params: MarketTimingParams): MarketValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const timing: MarketValidation['timing'] = {};

  // Common validation: question length
  if (params.question.length > 200) {
    errors.push(`Question too long: ${params.question.length} chars (max 200)`);
  }
  if (params.question.length < 10) {
    warnings.push(`Question may be too short: ${params.question.length} chars`);
  }

  // Common validation: closing time in future
  const now = new Date();
  if (params.closingTime <= now) {
    errors.push('Closing time must be in the future');
  }

  // Common validation: closing time not too far
  const maxClosingTime = new Date(now.getTime() + TIMING.MAX_MARKET_DURATION_DAYS * 24 * 60 * 60 * 1000);
  if (params.closingTime > maxClosingTime) {
    errors.push(`Closing time too far in future (max ${TIMING.MAX_MARKET_DURATION_DAYS} days)`);
  }

  // ==========================================================================
  // Rule A: Event-Based Markets
  // ==========================================================================
  if (params.marketType === 'event') {
    if (!params.eventTime) {
      errors.push('Event-based markets require event_time');
      return { valid: false, ruleType: 'A', errors, warnings, suggestions };
    }

    // Event time must be after closing time
    if (params.eventTime <= params.closingTime) {
      errors.push('Event time must be after closing time');
    }

    // Calculate buffer
    const bufferMs = params.eventTime.getTime() - params.closingTime.getTime();
    const bufferHours = bufferMs / (1000 * 60 * 60);
    timing.bufferHours = Math.round(bufferHours * 10) / 10;

    // Minimum buffer check (12 hours)
    if (bufferHours < TIMING.MIN_EVENT_BUFFER_HOURS) {
      errors.push(
        `Buffer too short: ${timing.bufferHours}h. ` +
        `Minimum ${TIMING.MIN_EVENT_BUFFER_HOURS}h required between betting close and event.`
      );
    } else if (bufferHours < 18) {
      warnings.push(
        `Buffer is ${timing.bufferHours}h. ` +
        `Recommend ${TIMING.RECOMMENDED_EVENT_BUFFER_HOURS}h for safety margin.`
      );
    }

    // Suggest optimal closing time
    const recommendedClose = new Date(
      params.eventTime.getTime() - TIMING.RECOMMENDED_EVENT_BUFFER_HOURS * 60 * 60 * 1000
    );
    timing.recommendedClose = recommendedClose;

    if (recommendedClose > now && params.closingTime > recommendedClose) {
      suggestions.push(
        `Consider closing betting at ${recommendedClose.toISOString()} ` +
        `(${TIMING.RECOMMENDED_EVENT_BUFFER_HOURS}h before event)`
      );
    }

    // Check for common mistakes
    if (params.question.toLowerCase().includes('will') && !params.question.includes('?')) {
      suggestions.push('Consider ending your question with a question mark for clarity');
    }

    return {
      valid: errors.length === 0,
      ruleType: 'A',
      errors,
      warnings,
      suggestions,
      timing,
    };
  }

  // ==========================================================================
  // Rule B: Measurement-Period Markets
  // ==========================================================================
  if (params.marketType === 'measurement') {
    if (!params.measurementStart) {
      errors.push('Measurement-period markets require measurement_start');
      return { valid: false, ruleType: 'B', errors, warnings, suggestions };
    }

    // CRITICAL: Betting must close BEFORE measurement starts
    if (params.closingTime >= params.measurementStart) {
      const overlapMs = params.closingTime.getTime() - params.measurementStart.getTime();
      const overlapHours = overlapMs / (1000 * 60 * 60);
      errors.push(
        `INVALID: Betting closes ${Math.round(overlapHours * 10) / 10}h AFTER measurement starts. ` +
        `This allows information advantage! ` +
        `Betting must close BEFORE measurement period begins.`
      );
    }

    // Calculate buffer before measurement
    const bufferMs = params.measurementStart.getTime() - params.closingTime.getTime();
    const bufferHours = bufferMs / (1000 * 60 * 60);
    timing.bufferHours = Math.round(bufferHours * 10) / 10;

    if (bufferHours < 1 && bufferHours > 0) {
      warnings.push(
        `Very tight buffer (${timing.bufferHours}h) between betting close and measurement start. ` +
        `Consider adding more time for late bettors.`
      );
    }

    // Measurement end validation
    if (params.measurementEnd) {
      if (params.measurementEnd <= params.measurementStart) {
        errors.push('Measurement end must be after measurement start');
      }

      const periodMs = params.measurementEnd.getTime() - params.measurementStart.getTime();
      const periodDays = periodMs / (1000 * 60 * 60 * 24);
      timing.measurementDays = Math.round(periodDays * 10) / 10;

      // UX guidance for measurement periods
      if (periodDays > 30) {
        warnings.push(
          `Very long measurement period: ${timing.measurementDays} days. ` +
          `Consider shorter periods (2-7 days) for better user experience.`
        );
      } else if (periodDays > 7) {
        warnings.push(
          `Long measurement period: ${timing.measurementDays} days. ` +
          `Prefer 2-7 days for optimal engagement.`
        );
      } else if (periodDays < 1) {
        suggestions.push(
          `Short measurement period (${Math.round(periodDays * 24)}h). ` +
          `Ensure resolution can be determined within this timeframe.`
        );
      }
    }

    // Suggest optimal closing time
    const recommendedClose = new Date(
      params.measurementStart.getTime() - 2 * 60 * 60 * 1000 // 2 hours before measurement
    );
    timing.recommendedClose = recommendedClose;

    if (recommendedClose > now && params.closingTime > recommendedClose) {
      suggestions.push(
        `Consider closing betting at ${recommendedClose.toISOString()} ` +
        `(2h before measurement period starts)`
      );
    }

    return {
      valid: errors.length === 0,
      ruleType: 'B',
      errors,
      warnings,
      suggestions,
      timing,
    };
  }

  // Unknown market type
  errors.push(`Unknown market type: ${params.marketType}`);
  return { valid: false, ruleType: 'A', errors, warnings, suggestions };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate timing suggestions based on market parameters
 */
export function generateTimingSuggestions(params: MarketTimingParams): string[] {
  const suggestions: string[] = [];
  const now = new Date();

  if (params.marketType === 'event' && params.eventTime) {
    // Suggest closing time for event-based markets
    const optimalClose = new Date(
      params.eventTime.getTime() - TIMING.RECOMMENDED_EVENT_BUFFER_HOURS * 60 * 60 * 1000
    );

    if (optimalClose > now) {
      suggestions.push(`Optimal betting close: ${optimalClose.toISOString()}`);
    }

    // Suggest question format
    if (!params.question.includes('?')) {
      suggestions.push('End your question with "?" for clarity');
    }
  }

  if (params.marketType === 'measurement' && params.measurementStart) {
    // Suggest closing time for measurement markets
    const optimalClose = new Date(
      params.measurementStart.getTime() - 2 * 60 * 60 * 1000
    );

    if (optimalClose > now) {
      suggestions.push(`Optimal betting close: ${optimalClose.toISOString()}`);
    }
  }

  return suggestions;
}

/**
 * Check if a market question follows best practices
 */
export function validateQuestionFormat(question: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Length checks
  if (question.length < 10) {
    issues.push('Question too short (min 10 chars)');
  }
  if (question.length > 200) {
    issues.push('Question too long (max 200 chars)');
  }

  // Format checks
  if (!question.trim()) {
    issues.push('Question cannot be empty');
  }

  // Best practice checks
  if (!question.includes('?') && !question.toLowerCase().startsWith('will ')) {
    issues.push('Consider phrasing as a yes/no question');
  }

  // Check for ambiguous language
  const ambiguousTerms = ['maybe', 'probably', 'might', 'could possibly'];
  for (const term of ambiguousTerms) {
    if (question.toLowerCase().includes(term)) {
      issues.push(`Avoid ambiguous term: "${term}"`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Calculate recommended times for a market
 */
export function calculateRecommendedTimes(
  eventOrMeasurementStart: Date,
  marketType: 'event' | 'measurement'
): {
  recommendedClose: Date;
  latestClose: Date;
  earliestClose: Date;
} {
  const buffer = marketType === 'event'
    ? TIMING.RECOMMENDED_EVENT_BUFFER_HOURS * 60 * 60 * 1000
    : 2 * 60 * 60 * 1000; // 2 hours for measurement

  const minBuffer = marketType === 'event'
    ? TIMING.MIN_EVENT_BUFFER_HOURS * 60 * 60 * 1000
    : 1 * 60 * 60 * 1000; // 1 hour for measurement

  const maxBuffer = 48 * 60 * 60 * 1000; // 48 hours max

  return {
    recommendedClose: new Date(eventOrMeasurementStart.getTime() - buffer),
    latestClose: new Date(eventOrMeasurementStart.getTime() - minBuffer),
    earliestClose: new Date(eventOrMeasurementStart.getTime() - maxBuffer),
  };
}
