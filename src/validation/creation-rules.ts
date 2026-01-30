/**
 * Market Creation Validation Rules (v6.2 Compliant)
 *
 * Implements validation for:
 * - Rule A: Event-based markets (12-24h buffer before event)
 * - Rule B: Measurement-period markets (close before measurement starts)
 * - Race market outcome validation
 * - Question and timing constraints
 */

import { TIMING, FEES, MARKET_LAYER } from '../config.js';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateMarketParams {
  question: string;
  closingTime: Date;
  resolutionTime: Date;
  layer: 'official' | 'lab' | 'private';

  // Event-based (Rule A)
  marketType?: 'event' | 'measurement';
  eventTime?: Date;

  // Measurement-period (Rule B)
  measurementStart?: Date;
  measurementEnd?: Date;

  // Race markets
  outcomes?: string[];

  // Private market
  inviteHash?: string;
}

export interface CreationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];

  // Computed values
  computed: {
    ruleType: 'A' | 'B' | 'unknown';
    bufferHours?: number;
    recommendedClosingTime?: string;
    creationFeeSol: number;
    platformFeeBps: number;
    estimatedRentSol: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_QUESTION_LENGTH = 200;
const MIN_OUTCOMES = 2;
const MAX_OUTCOMES = 10;
const MAX_OUTCOME_LABEL_LENGTH = 50;
const MIN_RESOLUTION_BUFFER_SECONDS = 600; // 10 minutes
const MAX_MARKET_DURATION_DAYS = 365;

// Rent estimates (lamports)
const MARKET_RENT = 5_000_000; // ~0.005 SOL
const RACE_MARKET_BASE_RENT = 8_000_000; // ~0.008 SOL
const RACE_OUTCOME_RENT = 500_000; // ~0.0005 SOL per outcome

// =============================================================================
// MAIN VALIDATION
// =============================================================================

/**
 * Validate market creation parameters
 */
export function validateMarketCreation(params: CreateMarketParams): CreationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Determine rule type
  let ruleType: 'A' | 'B' | 'unknown' = 'unknown';
  if (params.marketType === 'event' || params.eventTime) {
    ruleType = 'A';
  } else if (params.marketType === 'measurement' || params.measurementStart) {
    ruleType = 'B';
  }

  // =========================================================================
  // Question Validation
  // =========================================================================

  if (!params.question || params.question.trim().length === 0) {
    errors.push('Question is required');
  } else if (params.question.length > MAX_QUESTION_LENGTH) {
    errors.push(`Question exceeds ${MAX_QUESTION_LENGTH} characters (got ${params.question.length})`);
  }

  if (!params.question.endsWith('?')) {
    warnings.push('Question should end with a question mark for clarity');
  }

  // =========================================================================
  // Timing Validation
  // =========================================================================

  const now = new Date();

  // Closing time must be in future
  if (params.closingTime <= now) {
    errors.push('Closing time must be in the future');
  }

  // Maximum duration check
  const durationDays = (params.closingTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (durationDays > MAX_MARKET_DURATION_DAYS) {
    errors.push(`Market duration exceeds ${MAX_MARKET_DURATION_DAYS} days`);
  }

  // Resolution time must be after closing time
  if (params.resolutionTime <= params.closingTime) {
    errors.push('Resolution time must be after closing time');
  }

  // Minimum resolution buffer
  const resolutionBufferSec = (params.resolutionTime.getTime() - params.closingTime.getTime()) / 1000;
  if (resolutionBufferSec < MIN_RESOLUTION_BUFFER_SECONDS) {
    errors.push(`Resolution buffer too short: ${resolutionBufferSec}s (min ${MIN_RESOLUTION_BUFFER_SECONDS}s)`);
  }

  // =========================================================================
  // Rule A: Event-Based Validation
  // =========================================================================

  let bufferHours: number | undefined;
  let recommendedClosingTime: string | undefined;

  if (ruleType === 'A') {
    if (!params.eventTime) {
      errors.push('Event-based markets require event_time');
    } else {
      // Event must be after closing
      if (params.eventTime <= params.closingTime) {
        errors.push('Event time must be after closing time');
      }

      // Calculate buffer
      bufferHours = (params.eventTime.getTime() - params.closingTime.getTime()) / (1000 * 60 * 60);

      if (bufferHours < TIMING.MIN_EVENT_BUFFER_HOURS) {
        errors.push(
          `Event buffer too short: ${bufferHours.toFixed(1)}h. ` +
          `Minimum ${TIMING.MIN_EVENT_BUFFER_HOURS}h required (v6.2 Rule A).`
        );

        // Suggest corrected closing time
        const suggestedClose = new Date(
          params.eventTime.getTime() - (TIMING.RECOMMENDED_EVENT_BUFFER_HOURS * 60 * 60 * 1000)
        );
        recommendedClosingTime = suggestedClose.toISOString();
        suggestions.push(`Recommended closing time: ${recommendedClosingTime}`);
      } else if (bufferHours < 18) {
        warnings.push(
          `Buffer is ${bufferHours.toFixed(1)}h. ` +
          `Recommend 18-24h for safety margin (v6.2 Rule A).`
        );
      }

      // Event must be in future
      if (params.eventTime <= now) {
        errors.push('Event time must be in the future');
      }
    }
  }

  // =========================================================================
  // Rule B: Measurement-Period Validation
  // =========================================================================

  if (ruleType === 'B') {
    if (!params.measurementStart) {
      errors.push('Measurement-period markets require measurement_start');
    } else {
      // CRITICAL: Betting must close BEFORE measurement starts
      if (params.closingTime >= params.measurementStart) {
        const overlapHours = (params.closingTime.getTime() - params.measurementStart.getTime()) / (1000 * 60 * 60);
        errors.push(
          `INVALID: Betting closes ${overlapHours.toFixed(1)}h AFTER measurement starts. ` +
          `This allows information advantage! (v6.2 Rule B)`
        );

        // Suggest corrected closing time
        const suggestedClose = new Date(params.measurementStart.getTime() - (60 * 60 * 1000)); // 1h before
        recommendedClosingTime = suggestedClose.toISOString();
        suggestions.push(`Recommended closing time: ${recommendedClosingTime}`);
      }

      // Measurement end validation
      if (params.measurementEnd) {
        if (params.measurementEnd <= params.measurementStart) {
          errors.push('Measurement end must be after measurement start');
        }

        const periodDays = (params.measurementEnd.getTime() - params.measurementStart.getTime()) / (1000 * 60 * 60 * 24);
        if (periodDays > 7) {
          warnings.push(
            `Long measurement period: ${periodDays.toFixed(0)} days. ` +
            `Prefer 2-7 days for better UX (v6.2 guidance).`
          );
        }
      }
    }
  }

  // =========================================================================
  // Race Market Validation
  // =========================================================================

  if (params.outcomes) {
    if (params.outcomes.length < MIN_OUTCOMES) {
      errors.push(`Race markets require at least ${MIN_OUTCOMES} outcomes`);
    }
    if (params.outcomes.length > MAX_OUTCOMES) {
      errors.push(`Race markets limited to ${MAX_OUTCOMES} outcomes (got ${params.outcomes.length})`);
    }

    // Check outcome labels
    for (let i = 0; i < params.outcomes.length; i++) {
      const outcome = params.outcomes[i];
      if (!outcome || outcome.trim().length === 0) {
        errors.push(`Outcome ${i} is empty`);
      } else if (outcome.length > MAX_OUTCOME_LABEL_LENGTH) {
        errors.push(`Outcome ${i} exceeds ${MAX_OUTCOME_LABEL_LENGTH} characters`);
      }
    }

    // Check for duplicates
    const uniqueOutcomes = new Set(params.outcomes.map(o => o.toLowerCase().trim()));
    if (uniqueOutcomes.size !== params.outcomes.length) {
      errors.push('Outcome labels must be unique');
    }
  }

  // =========================================================================
  // Layer-Specific Validation
  // =========================================================================

  let creationFeeSol: number;
  let platformFeeBps: number;

  switch (params.layer) {
    case 'official':
      creationFeeSol = FEES.OFFICIAL_CREATION_FEE / 1e9;
      platformFeeBps = FEES.OFFICIAL_PLATFORM_FEE_BPS;
      warnings.push('Official markets require admin approval');
      break;
    case 'private':
      creationFeeSol = FEES.PRIVATE_CREATION_FEE / 1e9;
      platformFeeBps = FEES.PRIVATE_PLATFORM_FEE_BPS;
      if (!params.inviteHash) {
        warnings.push('Private markets can use invite_hash for restricted access');
      }
      break;
    case 'lab':
    default:
      creationFeeSol = FEES.LAB_CREATION_FEE / 1e9;
      platformFeeBps = FEES.LAB_PLATFORM_FEE_BPS;
      break;
  }

  // =========================================================================
  // Rent Estimation
  // =========================================================================

  let estimatedRentSol: number;
  if (params.outcomes) {
    estimatedRentSol = (RACE_MARKET_BASE_RENT + (params.outcomes.length * RACE_OUTCOME_RENT)) / 1e9;
  } else {
    estimatedRentSol = MARKET_RENT / 1e9;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    computed: {
      ruleType,
      bufferHours,
      recommendedClosingTime,
      creationFeeSol,
      platformFeeBps,
      estimatedRentSol,
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate recommended resolution time from closing time
 */
export function calculateResolutionTime(
  closingTime: Date,
  marketType: 'event' | 'measurement',
  eventTime?: Date
): Date {
  if (marketType === 'event' && eventTime) {
    // Resolution = event time + 1 hour buffer
    return new Date(eventTime.getTime() + (60 * 60 * 1000));
  }
  // Default: closing time + 1 day
  return new Date(closingTime.getTime() + (24 * 60 * 60 * 1000));
}

/**
 * Calculate recommended closing time for event
 */
export function calculateRecommendedClosingTime(
  eventTime: Date,
  bufferHours: number = TIMING.RECOMMENDED_EVENT_BUFFER_HOURS
): Date {
  return new Date(eventTime.getTime() - (bufferHours * 60 * 60 * 1000));
}

/**
 * Get creation fee for layer
 */
export function getCreationFee(layer: 'official' | 'lab' | 'private'): {
  lamports: number;
  sol: number;
} {
  let lamports: number;
  switch (layer) {
    case 'official':
      lamports = FEES.OFFICIAL_CREATION_FEE;
      break;
    case 'private':
      lamports = FEES.PRIVATE_CREATION_FEE;
      break;
    case 'lab':
    default:
      lamports = FEES.LAB_CREATION_FEE;
      break;
  }
  return { lamports, sol: lamports / 1e9 };
}

/**
 * Validate question format
 */
export function validateQuestion(question: string): {
  valid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];

  if (!question || question.trim().length === 0) {
    errors.push('Question is required');
  } else {
    if (question.length > MAX_QUESTION_LENGTH) {
      errors.push(`Question exceeds ${MAX_QUESTION_LENGTH} characters`);
    }
    if (!question.endsWith('?')) {
      suggestions.push('Add a question mark at the end');
    }
    if (question.length < 10) {
      suggestions.push('Consider a more descriptive question');
    }
  }

  return { valid: errors.length === 0, errors, suggestions };
}

/**
 * Validate race outcomes
 */
export function validateRaceOutcomes(outcomes: string[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (outcomes.length < MIN_OUTCOMES) {
    errors.push(`Minimum ${MIN_OUTCOMES} outcomes required`);
  }
  if (outcomes.length > MAX_OUTCOMES) {
    errors.push(`Maximum ${MAX_OUTCOMES} outcomes allowed`);
  }

  for (let i = 0; i < outcomes.length; i++) {
    if (!outcomes[i] || outcomes[i].trim().length === 0) {
      errors.push(`Outcome ${i + 1} is empty`);
    } else if (outcomes[i].length > MAX_OUTCOME_LABEL_LENGTH) {
      errors.push(`Outcome ${i + 1} exceeds ${MAX_OUTCOME_LABEL_LENGTH} chars`);
    }
  }

  const unique = new Set(outcomes.map(o => o.toLowerCase().trim()));
  if (unique.size !== outcomes.length) {
    errors.push('Outcomes must be unique');
  }

  return { valid: errors.length === 0, errors };
}
