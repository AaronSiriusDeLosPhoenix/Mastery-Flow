import { Attempt, Question, QuestionDifficulty, SystemConfig } from '../db/types.js';

export interface EvidenceCalculationResult {
  evidenceScore: number;
  signals: {
    correctnessSignal: number;
    confidenceSignal: number;
    difficultySignal: number;
    responseTimeSignal: number;
    independenceSignal: number;
  };
  antiGuessingTriggered: boolean;
  antiGuessingReason?: string;
}

/**
 * Calculates difficulty weight / performance signal
 */
export function calculateDifficultySignal(
  difficulty: QuestionDifficulty,
  isCorrect: boolean
): number {
  if (isCorrect) {
    switch (difficulty) {
      case 'easy':
        return 0.60; // Easy correct gives baseline
      case 'medium':
        return 0.85; // Medium correct gives solid proof
      case 'hard':
        return 1.00; // Hard correct is strong mastery signal
    }
  } else {
    // Penalties for failure: failing an easy question is a severe warning
    switch (difficulty) {
      case 'easy':
        return 0.05;
      case 'medium':
        return 0.25;
      case 'hard':
        return 0.45; // Failing a hard question is partially expected
    }
  }
}

/**
 * Calculates independence signal based on hint usage and retry attempts
 */
export function calculateIndependenceSignal(hintsUsed: number, retries: number): number {
  let score = 1.0;
  if (hintsUsed === 1) score -= 0.35;
  else if (hintsUsed >= 2) score -= 0.65;

  if (retries > 0) {
    score *= Math.pow(0.70, retries);
  }

  return Math.max(0.10, Math.min(1.0, score));
}

/**
 * Calculates response-time signal relative to expected question duration
 */
export function calculateResponseTimeSignal(
  responseTimeSeconds: number,
  expectedTimeSeconds: number,
  isCorrect: boolean
): number {
  if (responseTimeSeconds <= 0) return 0.2;

  // Rushed guess: < 3 seconds or < 15% of expected time
  if (responseTimeSeconds < 3.0 || responseTimeSeconds < expectedTimeSeconds * 0.15) {
    return isCorrect ? 0.30 : 0.10; // Rushed / random click
  }

  // Optimal deliberate cognitive processing: between 40% and 180% of expected time
  if (responseTimeSeconds >= expectedTimeSeconds * 0.4 && responseTimeSeconds <= expectedTimeSeconds * 1.8) {
    return 1.0;
  }

  // Slightly prolonged: between 1.8x and 3x
  if (responseTimeSeconds <= expectedTimeSeconds * 3.0) {
    return 0.70;
  }

  // Excessive struggle (> 3x expected time)
  return 0.40;
}

/**
 * Anti-guessing detection: determines if an attempt appears to be lucky or trial-and-error
 */
export function detectAntiGuessing(
  attempt: {
    isCorrect: boolean;
    confidence: number;
    responseTimeSeconds: number;
    expectedTimeSeconds: number;
    hintsUsed: number;
    retries: number;
  }
): { triggered: boolean; reason?: string } {
  if (!attempt.isCorrect) {
    return { triggered: false };
  }

  // Scenario 1: Extremely rapid correct answer (under 3.0 seconds on non-trivial questions)
  if (attempt.responseTimeSeconds < 3.0 && attempt.expectedTimeSeconds >= 12) {
    return {
      triggered: true,
      reason: 'Response time (< 3.0s) was unusually fast for a conceptual problem; potential impulsive guess.',
    };
  }

  // Scenario 2: Multiple retries on the same problem before getting it correct
  if (attempt.retries >= 2) {
    return {
      triggered: true,
      reason: 'Repeated multiple retries (brute-forcing options) detected on the same question.',
    };
  }

  // Scenario 3: Correct answer with very low confidence (< 0.35) and multiple hints
  if (attempt.confidence < 0.35 && attempt.hintsUsed >= 1) {
    return {
      triggered: true,
      reason: 'Low reported confidence (< 35%) paired with heavy hint dependency indicates tentative guess.',
    };
  }

  // Scenario 4: Fast response (< 25% of expected) combined with low confidence
  if (attempt.responseTimeSeconds < attempt.expectedTimeSeconds * 0.25 && attempt.confidence <= 0.40) {
    return {
      triggered: true,
      reason: 'Fast answer with low confidence indicates an uninformed guess.',
    };
  }

  return { triggered: false };
}

/**
 * Calculates raw evidence score E according to formula:
 * E = 0.45 * correctness + 0.20 * confidence + 0.15 * difficulty + 0.10 * responseTime + 0.10 * independence
 */
export function calculateEvidence(
  question: Question,
  attempt: {
    isCorrect: boolean;
    confidence: number;
    responseTimeSeconds: number;
    hintsUsed: number;
    retries: number;
  },
  config: SystemConfig
): EvidenceCalculationResult {
  const correctnessSignal = attempt.isCorrect ? 1.0 : 0.0;
  
  // Confidence signal:
  // If correct and confident, reinforce (0.2 -> 1.0).
  // If incorrect and high confidence, that indicates a deep misconception!
  let confidenceSignal = attempt.confidence;
  if (!attempt.isCorrect && attempt.confidence > 0.70) {
    confidenceSignal = 0.05; // Misconception penalty
  }

  const difficultySignal = calculateDifficultySignal(question.difficulty, attempt.isCorrect);
  const responseTimeSignal = calculateResponseTimeSignal(
    attempt.responseTimeSeconds,
    question.expectedTimeSeconds,
    attempt.isCorrect
  );
  const independenceSignal = calculateIndependenceSignal(attempt.hintsUsed, attempt.retries);

  const antiGuessing = detectAntiGuessing({
    isCorrect: attempt.isCorrect,
    confidence: attempt.confidence,
    responseTimeSeconds: attempt.responseTimeSeconds,
    expectedTimeSeconds: question.expectedTimeSeconds,
    hintsUsed: attempt.hintsUsed,
    retries: attempt.retries,
  });

  const { weights } = config;
  let rawEvidence =
    weights.correctness * correctnessSignal +
    weights.confidence * confidenceSignal +
    weights.difficulty * difficultySignal +
    weights.responseTime * responseTimeSignal +
    weights.independence * independenceSignal;

  // Apply damping factor if anti-guessing was triggered
  if (antiGuessing.triggered) {
    rawEvidence = rawEvidence * 0.50; // Damped gain
  }

  const clampedEvidence = Math.max(0.0, Math.min(1.0, rawEvidence));

  return {
    evidenceScore: clampedEvidence,
    signals: {
      correctnessSignal,
      confidenceSignal,
      difficultySignal,
      responseTimeSignal,
      independenceSignal,
    },
    antiGuessingTriggered: antiGuessing.triggered,
    antiGuessingReason: antiGuessing.reason,
  };
}

/**
 * Updates mastery using exponential smoothing:
 * new_mastery = (1 - alpha) * old_mastery + alpha * evidence
 */
export function updateMastery(
  oldMastery: number,
  evidenceScore: number,
  alpha: number
): number {
  const newMastery = (1 - alpha) * oldMastery + alpha * evidenceScore;
  return Math.round(Math.max(0.0, Math.min(1.0, newMastery)) * 1000) / 1000;
}

/**
 * Updates uncertainty based on attempt consistency, evidence, and guessing signals.
 * Uncertainty decreases with consistent independent evidence and increases with volatility or guessing.
 */
export function updateUncertainty(
  oldUncertainty: number,
  isCorrect: boolean,
  confidence: number,
  hintsUsed: number,
  antiGuessingTriggered: boolean,
  attemptsCount: number
): number {
  let delta = 0;

  // First few attempts always maintain higher uncertainty
  if (attemptsCount <= 2) {
    delta += 0.05;
  }

  if (antiGuessingTriggered) {
    // Guessing increases uncertainty
    delta += 0.15;
  } else if (isCorrect && confidence >= 0.75 && hintsUsed === 0) {
    // High-confidence, independent correct answer shrinks uncertainty
    delta -= 0.10;
  } else if (!isCorrect && confidence >= 0.70) {
    // Uncalibrated misconception increases uncertainty
    delta += 0.08;
  } else if (!isCorrect && hintsUsed > 0) {
    // Struggling with hints gives mild uncertainty reduction (we now know they struggle)
    delta -= 0.02;
  } else {
    // General gradual information gain
    delta -= 0.04;
  }

  const newUncertainty = Math.max(0.08, Math.min(0.95, oldUncertainty + delta));
  return Math.round(newUncertainty * 1000) / 1000;
}

/**
 * HYBRID MASTERY INTEGRATION (Bayesian Evidence Smoothing + BKT Knowledge Tracing + Supervised ML)
 *
 * Architecture:
 * Student Evidence
 * +
 * BKT (Corbett-Anderson 1995 Knowledge Tracing)
 * +
 * Existing Bayesian/retention signal
 * +
 * Supervised ML (Calibrated Logistic Regression)
 * ↓
 * Hybrid Mastery
 *
 * If BKT or ML is disabled, untrained, or invalid, gracefully falls back without crashing.
 */
export function computeHybridMastery(
  bayesianMastery: number,
  mlProbability: number | undefined | null,
  config?: SystemConfig,
  bktMastery?: number | undefined | null
): number {
  const safeBayesian = Math.max(0.0, Math.min(1.0, isNaN(bayesianMastery) ? 0.40 : bayesianMastery));

  const hasMl =
    config?.mlConfig?.enabled !== false &&
    mlProbability !== undefined &&
    mlProbability !== null &&
    !isNaN(mlProbability) &&
    isFinite(mlProbability);

  const hasBkt =
    config?.bktConfig?.enabled !== false &&
    bktMastery !== undefined &&
    bktMastery !== null &&
    !isNaN(bktMastery) &&
    isFinite(bktMastery);

  if (!hasMl && !hasBkt) {
    return safeBayesian;
  }

  const mlProb = hasMl ? Math.max(0.0, Math.min(1.0, mlProbability!)) : 0;
  const bktProb = hasBkt ? Math.max(0.0, Math.min(1.0, bktMastery!)) : 0;

  if (hasMl && hasBkt) {
    const rawMlWeight = Math.max(0.0, Math.min(1.0, config?.mlConfig?.weight ?? 0.30));
    const rawBktWeight = Math.max(0.0, Math.min(1.0, config?.bktConfig?.weight ?? 0.25));
    const rawBayesianWeight = Math.max(0.10, 1.0 - rawMlWeight - rawBktWeight);

    const sum = rawMlWeight + rawBktWeight + rawBayesianWeight;
    const blended = (rawBayesianWeight * safeBayesian + rawBktWeight * bktProb + rawMlWeight * mlProb) / sum;
    return Math.round(Math.max(0.0, Math.min(1.0, blended)) * 1000) / 1000;
  }

  if (hasBkt && !hasMl) {
    const bktWeight = Math.max(0.0, Math.min(1.0, config?.bktConfig?.weight ?? 0.25));
    const blended = (1 - bktWeight) * safeBayesian + bktWeight * bktProb;
    return Math.round(Math.max(0.0, Math.min(1.0, blended)) * 1000) / 1000;
  }

  // hasMl && !hasBkt (original Phase 8 behavior)
  const mlWeight = Math.max(0.0, Math.min(1.0, config?.mlConfig?.weight ?? 0.30));
  const blended = (1 - mlWeight) * safeBayesian + mlWeight * mlProb;
  return Math.round(Math.max(0.0, Math.min(1.0, blended)) * 1000) / 1000;
}

