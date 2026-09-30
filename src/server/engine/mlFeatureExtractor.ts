import { store } from '../db/store.js';
import { Attempt, Concept, MasteryState, MLFeatureVector } from '../db/types.js';
import { bktEngine } from './bktEngine.js';

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
   * If cutoffTimestamp is provided, strictly filters past events (T_event < T_cutoff)
   * and never reads present-day MasteryState to guarantee ZERO FUTURE / TARGET LEAKAGE.
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
    const hasCutoff = Boolean(options?.cutoffTimestamp);
    const cutoffTime = hasCutoff ? new Date(options!.cutoffTimestamp!).getTime() : Infinity;

    // Filter attempts strictly prior to cutoff (T_attempt < T_cutoff) to prevent data leakage
    const rawAttemptsSource = store.attempts.filter((a) => a.learnerId === learnerId);
    const sourceAttempts =
      rawAttemptsSource.length > 0 ? rawAttemptsSource : learner?.recentAttempts || [];

    const allStudentAttempts = sourceAttempts
      .filter((a) => new Date(a.timestamp).getTime() < cutoffTime)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const conceptAttempts = allStudentAttempts.filter((a) => a.conceptId === conceptId);

    // Retrieve current concept mastery state ONLY when no historical cutoff is enforced
    const mState = hasCutoff ? undefined : learner?.conceptMasteries[conceptId];

    // Determine evidence source mode explicitly:
    // Mode A: Raw chronological attempts exist for this (learner, concept) prior to cutoff
    // Mode B: No raw attempts exist, no historical cutoff is active, and valid persisted MasteryState statistics exist (attemptsCount > 0)
    // Mode C: Truly unattempted concept prior to observation time (attemptCount = 0)
    const hasRawAttempts = conceptAttempts.length > 0;
    const hasPersistedStats = !hasCutoff && !hasRawAttempts && Boolean(mState && mState.attemptsCount > 0);

    let attemptCount = 0;
    let correctAttempts = 0;
    let incorrectCount = 0;
    let overallAccuracy = 0.5;
    let recentAccuracy = 0.5;
    let easyAccuracy = 0.5;
    let mediumAccuracy = 0.5;
    let hardAccuracy = 0.5;
    let transferAccuracy = 0.5;
    let averageConfidence = 0.5;
    let averageResponseTimeRatio = 1.0;
    let hintsAndRetriesSignal = 1.0;
    let antiGuessingFrequency = 0.0;

    if (hasRawAttempts) {
      // Mode A: Derive features from chronological raw attempts, reconciling with cumulative mState when !hasCutoff
      const rawAttemptCount = this.sanitizeNumber(conceptAttempts.length, 0, 0, 500);
      const rawCorrectCount = conceptAttempts.filter((a) => a.isCorrect).length;
      const useCumulativePersisted =
        !hasCutoff && Boolean(mState && mState.attemptsCount > rawAttemptCount);

      attemptCount = useCumulativePersisted
        ? this.sanitizeNumber(mState!.attemptsCount, rawAttemptCount, 0, 500)
        : rawAttemptCount;
      correctAttempts = useCumulativePersisted
        ? this.sanitizeNumber(mState!.correctCount, rawCorrectCount, 0, attemptCount)
        : rawCorrectCount;
      incorrectCount = this.sanitizeNumber(attemptCount - correctAttempts, 0, 0, 500);
      overallAccuracy = this.sanitizeNumber(correctAttempts / attemptCount, 0.5, 0, 1);

      const recentAttempts = conceptAttempts.slice(-3);
      const recentCorrect = recentAttempts.filter((a) => a.isCorrect).length;
      recentAccuracy = this.sanitizeNumber(
        recentCorrect / recentAttempts.length,
        overallAccuracy,
        0,
        1
      );

      const easyAttempts = conceptAttempts.filter((a) => a.difficulty === 'easy');
      const medAttempts = conceptAttempts.filter((a) => a.difficulty === 'medium');
      const hardAttempts = conceptAttempts.filter((a) => a.difficulty === 'hard');
      const transferAttempts = conceptAttempts.filter(
        (a) =>
          a.questionType === 'Transfer' ||
          a.questionFormat === 'COMPLEXITY_TRADE_OFF' ||
          a.questionFormat === 'ASSERTION_REASON'
      );

      easyAccuracy =
        easyAttempts.length > 0
          ? this.sanitizeNumber(
              easyAttempts.filter((a) => a.isCorrect).length / easyAttempts.length,
              0.5,
              0,
              1
            )
          : useCumulativePersisted
          ? this.sanitizeNumber(mState!.easyAccuracy, overallAccuracy, 0, 1)
          : 0.5;

      mediumAccuracy =
        medAttempts.length > 0
          ? this.sanitizeNumber(
              medAttempts.filter((a) => a.isCorrect).length / medAttempts.length,
              0.5,
              0,
              1
            )
          : useCumulativePersisted
          ? this.sanitizeNumber(mState!.mediumAccuracy, overallAccuracy, 0, 1)
          : 0.5;

      hardAccuracy =
        hardAttempts.length > 0
          ? this.sanitizeNumber(
              hardAttempts.filter((a) => a.isCorrect).length / hardAttempts.length,
              0.5,
              0,
              1
            )
          : useCumulativePersisted
          ? this.sanitizeNumber(mState!.hardAccuracy, overallAccuracy, 0, 1)
          : 0.5;

      transferAccuracy =
        transferAttempts.length > 0
          ? this.sanitizeNumber(
              transferAttempts.filter((a) => a.isCorrect).length / transferAttempts.length,
              0.5,
              0,
              1
            )
          : useCumulativePersisted
          ? this.sanitizeNumber(mState!.transferAccuracy, overallAccuracy, 0, 1)
          : 0.5;

      let sumConfidence = 0;
      let sumTime = 0;
      let totalHints = 0;
      let totalRetries = 0;
      conceptAttempts.forEach((a) => {
        sumConfidence += this.sanitizeNumber(a.confidence, 0.5, 0, 1);
        sumTime += this.sanitizeNumber(a.responseTimeSeconds, 25, 1, 300);
        totalHints += this.sanitizeNumber(a.hintsUsed, 0, 0);
        totalRetries += this.sanitizeNumber(a.retries, 0, 0);
      });

      averageConfidence = useCumulativePersisted
        ? this.sanitizeNumber(mState!.averageConfidence, sumConfidence / rawAttemptCount, 0, 1)
        : this.sanitizeNumber(sumConfidence / rawAttemptCount, 0.5, 0, 1);
      const avgResponseTime = useCumulativePersisted
        ? this.sanitizeNumber(mState!.averageResponseTime, sumTime / rawAttemptCount, 1, 300)
        : sumTime / rawAttemptCount;
      averageResponseTimeRatio = this.sanitizeNumber(avgResponseTime / 25.0, 1.0, 0.1, 5.0);

      const effectiveHints = useCumulativePersisted
        ? Math.max(totalHints, this.sanitizeNumber(mState!.totalHintsUsed, 0, 0))
        : totalHints;
      const effectiveRetries = useCumulativePersisted
        ? Math.max(totalRetries, this.sanitizeNumber(mState!.totalRetries, 0, 0))
        : totalRetries;
      const rawHintsSignal =
        1.0 - (effectiveHints * 0.15 + effectiveRetries * 0.10) / Math.max(1, attemptCount);
      hintsAndRetriesSignal = this.sanitizeNumber(rawHintsSignal, 0.8, 0.05, 1.0);

      const antiGuessAttempts = conceptAttempts.filter((a) => a.antiGuessingTriggered);
      antiGuessingFrequency = this.sanitizeNumber(
        antiGuessAttempts.length / Math.max(1, rawAttemptCount),
        0,
        0,
        1
      );
    } else if (hasPersistedStats && mState) {
      // Mode B: Raw attempts unavailable, use valid persisted MasteryState statistics consistently
      attemptCount = this.sanitizeNumber(mState.attemptsCount, 0, 0, 500);
      correctAttempts = this.sanitizeNumber(mState.correctCount, 0, 0, attemptCount);
      incorrectCount = this.sanitizeNumber(attemptCount - correctAttempts, 0, 0, 500);
      overallAccuracy =
        attemptCount > 0
          ? this.sanitizeNumber(correctAttempts / attemptCount, 0.5, 0, 1)
          : 0.5;
      recentAccuracy = overallAccuracy;

      easyAccuracy = this.sanitizeNumber(mState.easyAccuracy, overallAccuracy, 0, 1);
      mediumAccuracy = this.sanitizeNumber(mState.mediumAccuracy, overallAccuracy, 0, 1);
      hardAccuracy = this.sanitizeNumber(mState.hardAccuracy, overallAccuracy, 0, 1);
      transferAccuracy = this.sanitizeNumber(mState.transferAccuracy, overallAccuracy, 0, 1);
      averageConfidence = this.sanitizeNumber(mState.averageConfidence, 0.5, 0, 1);

      const avgResponseTime = this.sanitizeNumber(mState.averageResponseTime, 25, 1, 300);
      averageResponseTimeRatio = this.sanitizeNumber(avgResponseTime / 25.0, 1.0, 0.1, 5.0);

      const totalHints = this.sanitizeNumber(mState.totalHintsUsed, 0, 0);
      const totalRetries = this.sanitizeNumber(mState.totalRetries, 0, 0);
      const rawHintsSignal =
        1.0 - (totalHints * 0.15 + totalRetries * 0.10) / Math.max(1, attemptCount);
      hintsAndRetriesSignal = this.sanitizeNumber(rawHintsSignal, 0.8, 0.05, 1.0);
      antiGuessingFrequency = 0.0;
    }

    // Explicit non-contradiction invariant guard when attemptCount === 0
    if (attemptCount === 0) {
      incorrectCount = 0;
      overallAccuracy = 0.5;
      recentAccuracy = 0.5;
      easyAccuracy = 0.5;
      mediumAccuracy = 0.5;
      hardAccuracy = 0.5;
      transferAccuracy = 0.5;
      averageConfidence = 0.5;
      averageResponseTimeRatio = 1.0;
      hintsAndRetriesSignal = 1.0;
      antiGuessingFrequency = 0.0;
    }

    // 12. flashcardReviewScore (filtered by cutoffTime if historical cutoff is active)
    const matchingCards = store.flashcards.filter((fc) => fc.conceptId === conceptId);
    let cardReviews = 0;
    let cardCorrect = 0;
    matchingCards.forEach((card) => {
      const fcProg = store.getFlashcardProgress(learnerId, card.id);
      if (fcProg) {
        const reviewedBeforeCutoff =
          !hasCutoff ||
          !fcProg.lastReviewedAt ||
          new Date(fcProg.lastReviewedAt).getTime() < cutoffTime;
        if (reviewedBeforeCutoff) {
          cardReviews += fcProg.reviewCount || 0;
          cardCorrect += fcProg.correctCount || 0;
        }
      }
    });
    const flashcardReviewScore =
      cardReviews > 0 ? this.sanitizeNumber(cardCorrect / cardReviews, 0.5, 0, 1) : 0.5;

    // 13. prerequisiteMasteryRatio (prerequisites DAG check strictly before cutoff)
    const prereqIds = concept?.prerequisites || [];
    let prerequisiteMasteryRatio = 1.0;
    if (prereqIds.length > 0) {
      let sumPrereqM = 0;
      prereqIds.forEach((pid) => {
        if (hasCutoff) {
          const prereqTrace = bktEngine.traceConcept(
            learnerId,
            pid,
            allStudentAttempts,
            store.config.bktConfig,
            undefined,
            options?.cutoffTimestamp
          );
          const historicalPrereqM =
            prereqTrace.totalOpportunities > 0 ? prereqTrace.finalState.pKnowledge : 0.35;
          sumPrereqM += this.sanitizeNumber(historicalPrereqM, 0.35, 0, 1);
        } else {
          const pm = learner?.conceptMasteries[pid]?.mastery;
          sumPrereqM += this.sanitizeNumber(pm, 0.35, 0, 1);
        }
      });
      prerequisiteMasteryRatio = this.sanitizeNumber(sumPrereqM / prereqIds.length, 0.5, 0, 1);
    }

    // 14. daysSinceLastReview (strictly relative to cutoffTime if provided)
    let computedDaysSinceLastReview = 0;
    if (hasCutoff) {
      if (conceptAttempts.length > 0) {
        const lastAttemptBeforeCutoff = conceptAttempts[conceptAttempts.length - 1];
        const lastTime = new Date(lastAttemptBeforeCutoff.timestamp).getTime();
        const diffDays = Math.max(0, (cutoffTime - lastTime) / (1000 * 60 * 60 * 24));
        computedDaysSinceLastReview = Math.round(diffDays * 100) / 100;
      } else {
        computedDaysSinceLastReview = 0;
      }
    } else {
      computedDaysSinceLastReview = mState?.daysSinceLastReview ?? 0;
    }
    const daysSinceLastReview = this.sanitizeNumber(computedDaysSinceLastReview, 0, 0, 90);

    // 15. previousMastery (Bayesian / BKT prior strictly before prediction/evaluation time)
    let historicalPriorMastery = 0.20;
    const bktHistoricalTrace = hasCutoff
      ? bktEngine.traceConcept(
          learnerId,
          conceptId,
          allStudentAttempts,
          store.config.bktConfig,
          undefined,
          options?.cutoffTimestamp
        )
      : null;

    if (hasCutoff && bktHistoricalTrace) {
      if (bktHistoricalTrace.totalOpportunities > 0) {
        // Blend BKT prior knowledge with historical empirical evidence score strictly < cutoffTime
        const avgEvScore =
          conceptAttempts.reduce((acc, a) => acc + this.sanitizeNumber(a.evidenceScore, 0.5, 0, 1), 0) /
          conceptAttempts.length;
        historicalPriorMastery =
          0.6 * bktHistoricalTrace.finalState.pKnowledge + 0.4 * avgEvScore;
      } else {
        historicalPriorMastery = 0.20;
      }
    } else {
      // Live inference: use existing Bayesian/BKT baseline prior (or 0.20 if unattempted)
      historicalPriorMastery =
        attemptCount > 0 ? (mState?.bktMastery ?? mState?.mastery ?? 0.20) : 0.20;
    }
    const previousMastery = this.sanitizeNumber(historicalPriorMastery, 0.20, 0, 1);

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
      const std = scaler.stds[name] && scaler.stds[name] > 0.001 ? scaler.stds[name] : 1.0;

      const zScore = (rawVal - mean) / std;
      // Clamp to eliminate extreme outliers and prevent numerical instability
      const clampedZ = this.sanitizeNumber(zScore, 0, -3.0, 3.0);

      normalized[name] = Math.round(clampedZ * 1000) / 1000;
      values.push(normalized[name]);
    }

    // Expose BKT features strictly respecting cutoffTimestamp
    const bktState = hasCutoff ? bktHistoricalTrace?.finalState : mState?.bktState;
    const bktFeatures = {
      bktKnowledge: this.sanitizeNumber(
        bktState?.pKnowledge ?? (hasCutoff ? 0.15 : mState?.bktMastery),
        0.15,
        0,
        1
      ),
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
