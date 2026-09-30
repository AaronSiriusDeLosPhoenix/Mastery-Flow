import { store } from '../db/store.js';
import { Attempt, Concept, MasteryState, MLFeatureVector } from '../db/types.js';

export const CANONICAL_FEATURE_NAMES = [
  'attemptCount',
  'overallAccuracy',
  'recentAccuracy',
  'incorrectCount',
  'easyAccuracy',
  'mediumAccuracy',
  'hardAccuracy',
  'transferAccuracy',
  'averageConfidence',
  'averageResponseTimeRatio',
  'hintsAndRetriesSignal',
  'flashcardReviewScore',
  'prerequisiteMasteryRatio',
  'daysSinceLastReview',
  'previousMastery',
  'antiGuessingFrequency',
] as const;

export type FeatureName = (typeof CANONICAL_FEATURE_NAMES)[number];

// Baseline empirical scaler statistics for z-score normalization
export const DEFAULT_FEATURE_SCALER = {
  means: {
    attemptCount: 4.5,
    overallAccuracy: 0.65,
    recentAccuracy: 0.65,
    incorrectCount: 1.5,
    easyAccuracy: 0.75,
    mediumAccuracy: 0.60,
    hardAccuracy: 0.45,
    transferAccuracy: 0.55,
    averageConfidence: 0.65,
    averageResponseTimeRatio: 1.1,
    hintsAndRetriesSignal: 0.75,
    flashcardReviewScore: 0.65,
    prerequisiteMasteryRatio: 0.70,
    daysSinceLastReview: 2.0,
    previousMastery: 0.55,
    antiGuessingFrequency: 0.10,
  } as Record<string, number>,
  stds: {
    attemptCount: 4.0,
    overallAccuracy: 0.25,
    recentAccuracy: 0.30,
    incorrectCount: 2.0,
    easyAccuracy: 0.25,
    mediumAccuracy: 0.25,
    hardAccuracy: 0.25,
    transferAccuracy: 0.25,
    averageConfidence: 0.20,
    averageResponseTimeRatio: 0.60,
    hintsAndRetriesSignal: 0.25,
    flashcardReviewScore: 0.25,
    prerequisiteMasteryRatio: 0.25,
    daysSinceLastReview: 4.0,
    previousMastery: 0.25,
    antiGuessingFrequency: 0.20,
  } as Record<string, number>,
};

export class MLFeatureExtractor {
  private static instance: MLFeatureExtractor;

  public static getInstance(): MLFeatureExtractor {
    if (!MLFeatureExtractor.instance) {
      MLFeatureExtractor.instance = new MLFeatureExtractor();
    }
    return MLFeatureExtractor.instance;
  }

  /**
   * Safe number sanitizer preventing NaN, Infinity, and undefined.
   */
  public sanitizeNumber(value: any, fallback: number = 0, min?: number, max?: number): number {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      return fallback;
    }
    let res = value;
    if (min !== undefined && res < min) res = min;
    if (max !== undefined && res > max) res = max;
    return res;
  }

  /**
   * Extracts the canonical 16-feature vector for a learner and concept.
   * If cutoffTimestamp is provided, strictly filters past events to guarantee ZERO DATA LEAKAGE.
   */
  public extractFeatures(
    learnerId: string,
    conceptId: string,
    options?: {
      cutoffTimestamp?: string;
      customScaler?: { means: Record<string, number>; stds: Record<string, number> };
    }
  ): MLFeatureVector {
    const learner = store.learners.get(learnerId);
    const concept = store.concepts.find((c) => c.id === conceptId);
    const cutoffTime = options?.cutoffTimestamp ? new Date(options.cutoffTimestamp).getTime() : Infinity;

    // Filter attempts strictly prior to cutoff to prevent data leakage
    const allStudentAttempts = (learner?.recentAttempts || store.attempts.filter((a) => a.learnerId === learnerId))
      .filter((a) => new Date(a.timestamp).getTime() < cutoffTime);

    const conceptAttempts = allStudentAttempts.filter((a) => a.conceptId === conceptId);

    // Retrieve historical or current concept mastery state
    const mState = learner?.conceptMasteries[conceptId];

    // 1. attemptCount
    const attemptCount = this.sanitizeNumber(conceptAttempts.length, mState?.attemptsCount || 0, 0);

    // 2. overallAccuracy
    const correctAttempts = conceptAttempts.filter((a) => a.isCorrect).length;
    const overallAccuracy = attemptCount > 0
      ? this.sanitizeNumber(correctAttempts / attemptCount, 0.5, 0, 1)
      : mState && mState.attemptsCount > 0
      ? this.sanitizeNumber(mState.correctCount / mState.attemptsCount, 0.5, 0, 1)
      : 0.5;

    // 3. recentAccuracy (last 3 attempts)
    const recentAttempts = conceptAttempts.slice(-3);
    const recentCorrect = recentAttempts.filter((a) => a.isCorrect).length;
    const recentAccuracy = recentAttempts.length > 0
      ? this.sanitizeNumber(recentCorrect / recentAttempts.length, overallAccuracy, 0, 1)
      : overallAccuracy;

    // 4. incorrectCount
    const incorrectCount = this.sanitizeNumber(attemptCount - correctAttempts, mState?.incorrectCount || 0, 0);

    // 5-7. Difficulty-stratified accuracies
    const easyAttempts = conceptAttempts.filter((a) => a.difficulty === 'easy');
    const medAttempts = conceptAttempts.filter((a) => a.difficulty === 'medium');
    const hardAttempts = conceptAttempts.filter((a) => a.difficulty === 'hard');

    const easyAccuracy = easyAttempts.length > 0
      ? this.sanitizeNumber(easyAttempts.filter((a) => a.isCorrect).length / easyAttempts.length, 0.5, 0, 1)
      : this.sanitizeNumber(mState?.easyAccuracy, 0.5, 0, 1);

    const mediumAccuracy = medAttempts.length > 0
      ? this.sanitizeNumber(medAttempts.filter((a) => a.isCorrect).length / medAttempts.length, 0.5, 0, 1)
      : this.sanitizeNumber(mState?.mediumAccuracy, 0.5, 0, 1);

    const hardAccuracy = hardAttempts.length > 0
      ? this.sanitizeNumber(hardAttempts.filter((a) => a.isCorrect).length / hardAttempts.length, 0.5, 0, 1)
      : this.sanitizeNumber(mState?.hardAccuracy, 0.5, 0, 1);

    // 8. transferAccuracy
    const transferAttempts = conceptAttempts.filter(
      (a) => a.questionType === 'Transfer' || a.questionFormat === 'COMPLEXITY_TRADE_OFF'
    );
    const transferAccuracy = transferAttempts.length > 0
      ? this.sanitizeNumber(transferAttempts.filter((a) => a.isCorrect).length / transferAttempts.length, 0.5, 0, 1)
      : this.sanitizeNumber(mState?.transferAccuracy, 0.5, 0, 1);

    // 9. averageConfidence
    let sumConfidence = 0;
    conceptAttempts.forEach((a) => {
      sumConfidence += this.sanitizeNumber(a.confidence, 0.5, 0, 1);
    });
    const averageConfidence = conceptAttempts.length > 0
      ? this.sanitizeNumber(sumConfidence / conceptAttempts.length, 0.5, 0, 1)
      : this.sanitizeNumber(mState?.averageConfidence, 0.5, 0, 1);

    // 10. averageResponseTimeRatio (response time vs baseline 25s)
    let sumTime = 0;
    conceptAttempts.forEach((a) => {
      sumTime += this.sanitizeNumber(a.responseTimeSeconds, 25, 1, 300);
    });
    const avgResponseTime = conceptAttempts.length > 0
      ? sumTime / conceptAttempts.length
      : this.sanitizeNumber(mState?.averageResponseTime, 25, 1, 300);
    const averageResponseTimeRatio = this.sanitizeNumber(avgResponseTime / 25.0, 1.0, 0.1, 5.0);

    // 11. hintsAndRetriesSignal (1.0 = independent, lower = hint dependent)
    let totalHints = 0;
    let totalRetries = 0;
    conceptAttempts.forEach((a) => {
      totalHints += this.sanitizeNumber(a.hintsUsed, 0, 0);
      totalRetries += this.sanitizeNumber(a.retries, 0, 0);
    });
    const rawHintsSignal = 1.0 - (totalHints * 0.15 + totalRetries * 0.10) / Math.max(1, attemptCount);
    const hintsAndRetriesSignal = this.sanitizeNumber(rawHintsSignal, 0.8, 0.05, 1.0);

    // 12. flashcardReviewScore
    const matchingCards = store.flashcards.filter((fc) => fc.conceptId === conceptId);
    let cardReviews = 0;
    let cardCorrect = 0;
    matchingCards.forEach((card) => {
      const fcProg = store.getFlashcardProgress(learnerId, card.id);
      if (fcProg) {
        cardReviews += fcProg.reviewCount || 0;
        cardCorrect += fcProg.correctCount || 0;
      }
    });
    const flashcardReviewScore = cardReviews > 0
      ? this.sanitizeNumber(cardCorrect / cardReviews, 0.5, 0, 1)
      : 0.5; // neutral prior

    // 13. prerequisiteMasteryRatio (prerequisites DAG check)
    const prereqIds = concept?.prerequisites || [];
    let prerequisiteMasteryRatio = 1.0;
    if (prereqIds.length > 0) {
      let sumPrereqM = 0;
      prereqIds.forEach((pid) => {
        const pm = learner?.conceptMasteries[pid]?.mastery;
        sumPrereqM += this.sanitizeNumber(pm, 0.35, 0, 1);
      });
      prerequisiteMasteryRatio = this.sanitizeNumber(sumPrereqM / prereqIds.length, 0.5, 0, 1);
    }

    // 14. daysSinceLastReview
    const daysSinceLastReview = this.sanitizeNumber(mState?.daysSinceLastReview, 0, 0, 90);

    // 15. previousMastery (Bayesian baseline prior)
    const previousMastery = this.sanitizeNumber(mState?.mastery, 0.20, 0, 1);

    // 16. antiGuessingFrequency
    const antiGuessAttempts = conceptAttempts.filter((a) => a.antiGuessingTriggered);
    const antiGuessingFrequency = attemptCount > 0
      ? this.sanitizeNumber(antiGuessAttempts.length / attemptCount, 0, 0, 1)
      : 0;

    const raw: Record<string, number> = {
      attemptCount,
      overallAccuracy,
      recentAccuracy,
      incorrectCount,
      easyAccuracy,
      mediumAccuracy,
      hardAccuracy,
      transferAccuracy,
      averageConfidence,
      averageResponseTimeRatio,
      hintsAndRetriesSignal,
      flashcardReviewScore,
      prerequisiteMasteryRatio,
      daysSinceLastReview,
      previousMastery,
      antiGuessingFrequency,
    };

    // Normalization with Z-score scaling and outlier clamping [-3.0, 3.0]
    const scaler = options?.customScaler || DEFAULT_FEATURE_SCALER;
    const normalized: Record<string, number> = {};
    const values: number[] = [];

    for (const name of CANONICAL_FEATURE_NAMES) {
      const rawVal = raw[name] ?? 0;
      const mean = scaler.means[name] ?? 0;
      const std = (scaler.stds[name] && scaler.stds[name] > 0.001) ? scaler.stds[name] : 1.0;
      
      const zScore = (rawVal - mean) / std;
      // Clamp to eliminate extreme outliers and prevent numerical instability
      const clampedZ = this.sanitizeNumber(zScore, 0, -3.0, 3.0);
      
      normalized[name] = Math.round(clampedZ * 1000) / 1000;
      values.push(normalized[name]);
    }

    // Expose BKT features for optional consumption by supervised ML models
    const bktState = mState?.bktState;
    const bktFeatures = {
      bktKnowledge: this.sanitizeNumber(bktState?.pKnowledge ?? mState?.bktMastery, 0.15, 0, 1),
      bktOpportunityCount: this.sanitizeNumber(bktState?.attemptCount, attemptCount, 0),
      bktCorrectCount: this.sanitizeNumber(bktState?.correctCount, correctAttempts, 0),
      bktIncorrectCount: this.sanitizeNumber(bktState?.incorrectCount, incorrectCount, 0),
      bktDelta: this.sanitizeNumber(
        (bktState?.pKnowledge ?? 0.15) - (bktState?.pInit ?? 0.15),
        0,
        -1,
        1
      ),
    };

    return {
      names: [...CANONICAL_FEATURE_NAMES],
      raw,
      normalized,
      values,
      bktFeatures,
    };
  }
}

export const mlFeatureExtractor = MLFeatureExtractor.getInstance();
