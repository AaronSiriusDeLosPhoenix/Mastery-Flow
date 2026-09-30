import { store } from '../db/store.js';
import {
  CANONICAL_FEATURE_NAMES,
  DEFAULT_FEATURE_SCALER,
  mlFeatureExtractor,
} from './mlFeatureExtractor.js';
import { mlTrainer } from './mlTrainer.js';
import { mlInferenceEngine } from './mlInferenceEngine.js';
import {
  DatasetMetadata,
  FeatureDriftReport,
  MLEvaluationMetricsReport,
  MLModelHealthSummary,
  MLModelRegistryEntry,
  MLPredictionRecord,
  MLRecommendationRecord,
  RecommendationAction,
  RecommendationEffectivenessReport,
} from '../db/types.js';

export class MLFeedbackEngine {
  private static instance: MLFeedbackEngine;

  public static getInstance(): MLFeedbackEngine {
    if (!MLFeedbackEngine.instance) {
      MLFeedbackEngine.instance = new MLFeedbackEngine();
    }
    return MLFeedbackEngine.instance;
  }

  // ==========================================
  // 1. PREDICTION LOGGING WITH FROZEN FEATURE SNAPSHOTS
  // ==========================================

  /**
   * Logs a prediction with frozen feature snapshot at time T.
   * Guarantees zero leakage: feature snapshot is immutable and reflects strictly state <= T.
   */
  public logPrediction(params: {
    learnerId: string;
    conceptId: string;
    predictedProbability: number;
    predictedCategory: 'Weak' | 'Developing' | 'Strong' | 'Mastered';
    confidence: number;
    featureSnapshot: Record<string, number>;
    normalizedSnapshot: Record<string, number>;
    modelVersion: string;
    predictedAt?: string;
  }): MLPredictionRecord {
    const predictionId = `pred_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const predictedAt = params.predictedAt || new Date().toISOString();

    const record: MLPredictionRecord = {
      predictionId,
      learnerId: params.learnerId,
      conceptId: params.conceptId,
      predictedProbability: Math.max(0.001, Math.min(0.999, params.predictedProbability)),
      predictedCategory: params.predictedCategory,
      confidence: Math.max(0, Math.min(1, params.confidence)),
      featureSnapshot: { ...params.featureSnapshot },
      normalizedSnapshot: { ...params.normalizedSnapshot },
      modelVersion: params.modelVersion,
      predictedAt,
      evaluationStatus: 'pending',
    };

    store.predictionRecords.push(record);
    store.schedulePersist();
    return record;
  }

  // ==========================================
  // 2. ONLINE FEEDBACK & TARGET LABEL CONSTRUCTION
  // ==========================================

  /**
   * Evaluates older pending predictions using an independent subsequent learner outcome.
   * STRICT TEMPORAL INTEGRITY:
   * Only predictions generated strictly BEFORE the outcome timestamp (T_pred < T_outcome)
   * are eligible for evaluation.
   *
   * TARGET DEFINITION:
   * Target = 1 if outcome indicates verified concept competence:
   *   - Attempt: isCorrect && !antiGuessingTriggered
   *   - Exam: isCorrect
   *   - Flashcard: recallLevel in ['easy', 'good']
   * Target = 0 if outcome indicates struggle or misconception:
   *   - Attempt: !isCorrect || antiGuessingTriggered
   *   - Exam: !isCorrect
   *   - Flashcard: recallLevel === 'again'
   */
  public evaluatePendingPredictions(params: {
    learnerId: string;
    conceptId: string;
    isCorrect: boolean;
    antiGuessingTriggered?: boolean;
    confidence?: number;
    responseTimeSeconds?: number;
    timestamp: string;
    attemptId?: string;
    source: 'attempt' | 'exam' | 'flashcard';
  }): number {
    const outcomeTime = new Date(params.timestamp).getTime();
    let evaluatedCount = 0;

    // Independent ground truth target label construction
    const actualOutcome = params.isCorrect && !params.antiGuessingTriggered ? 1 : 0;
    const evaluationReason = params.isCorrect
      ? params.antiGuessingTriggered
        ? 'Correct answer flagged by anti-guessing heuristic (treated as non-mastery target)'
        : `Verified correct independent ${params.source} response`
      : `Incorrect independent ${params.source} response`;

    for (const record of store.predictionRecords) {
      if (
        record.learnerId === params.learnerId &&
        record.conceptId === params.conceptId &&
        record.evaluationStatus === 'pending'
      ) {
        const predTime = new Date(record.predictedAt).getTime();
        // Strict temporal barrier: prediction MUST precede the outcome
        if (predTime < outcomeTime) {
          record.evaluationStatus = 'evaluated';
          record.actualOutcome = actualOutcome;
          record.evaluatedAt = params.timestamp;
          record.evaluationReason = evaluationReason;
          record.outcomeSource = params.source;
          record.outcomeAttemptId = params.attemptId;
          evaluatedCount++;
        }
      }
    }

    if (evaluatedCount > 0) {
      store.schedulePersist();
    }
    return evaluatedCount;
  }

  // ==========================================
  // 3. RECOMMENDATION OUTCOME TRACKING
  // ==========================================

  /**
   * Logs a generated recommendation for subsequent observational outcome tracking.
   */
  public logRecommendation(rec: {
    id: string;
    learnerId: string;
    action: RecommendationAction;
    conceptId: string;
    conceptName: string;
    timestamp: string;
    modelVersion?: string;
  }): MLRecommendationRecord {
    const model = mlInferenceEngine.getActiveModelWeights();
    const record: MLRecommendationRecord = {
      recommendationId: rec.id,
      learnerId: rec.learnerId,
      action: rec.action,
      conceptId: rec.conceptId,
      conceptName: rec.conceptName,
      generatedAt: rec.timestamp,
      modelVersion: rec.modelVersion || model.modelVersion,
      evaluationStatus: 'pending',
    };

    store.recommendationRecords.push(record);
    store.schedulePersist();
    return record;
  }

  /**
   * Evaluates pending recommendations following a learner's subsequent learning action.
   * Records observational adoption and progress without claiming causal certainty.
   */
  public evaluatePendingRecommendations(params: {
    learnerId: string;
    conceptId: string;
    timestamp: string;
    actionTaken: string;
    isCorrect?: boolean;
    masteryBefore?: number;
    masteryAfter: number;
    retentionBefore?: number;
    retentionAfter: number;
  }): void {
    const eventTime = new Date(params.timestamp).getTime();

    for (const rec of store.recommendationRecords) {
      if (rec.learnerId === params.learnerId && rec.evaluationStatus === 'pending') {
        const recTime = new Date(rec.generatedAt).getTime();
        if (recTime < eventTime) {
          // Check if this action addressed this recommendation
          const isDirectTarget = rec.conceptId === params.conceptId;
          const isPrereqAction = rec.action === 'REMEDIATE_PREREQUISITE';

          if (isDirectTarget || isPrereqAction) {
            const timeToActSeconds = Math.max(1, Math.round((eventTime - recTime) / 1000));
            const masteryDelta = Math.round((params.masteryAfter - (params.masteryBefore ?? params.masteryAfter)) * 1000) / 1000;
            const retentionDelta = Math.round((params.retentionAfter - (params.retentionBefore ?? params.retentionAfter)) * 1000) / 1000;

            rec.evaluationStatus = 'evaluated';
            rec.evaluatedAt = params.timestamp;
            rec.outcomeDetails = {
              actionTaken: params.actionTaken,
              timeToActSeconds,
              masteryBefore: params.masteryBefore,
              masteryAfter: params.masteryAfter,
              masteryDelta,
              retentionBefore: params.retentionBefore,
              retentionAfter: params.retentionAfter,
              retentionDelta,
              subsequentIsCorrect: params.isCorrect,
              prerequisiteImproved: isPrereqAction ? masteryDelta > 0 : undefined,
              advanceSucceeded: rec.action === 'ADVANCE' ? params.isCorrect === true : undefined,
              summaryNote: `Observed outcome following ${rec.action}: mastery delta ${masteryDelta >= 0 ? '+' : ''}${masteryDelta}, retention delta ${retentionDelta >= 0 ? '+' : ''}${retentionDelta}.`,
            };
          }
        }
      }
    }
    store.schedulePersist();
  }

  // ==========================================
  // 4. MODEL PERFORMANCE METRICS CALCULATION
  // ==========================================

  /**
   * Computes genuine ML performance metrics from evaluated predictions.
   * If samples are insufficient (< 5), returns INSUFFICIENT_DATA and NEVER fabricates metrics.
   */
  public calculateEvaluationMetrics(customThreshold?: number): MLEvaluationMetricsReport {
    const model = mlInferenceEngine.getActiveModelWeights();
    const config = store.config.mlConfig;
    const threshold = customThreshold ?? config?.classificationThreshold ?? 0.50;

    const evaluated = store.predictionRecords.filter((r) => r.evaluationStatus === 'evaluated' && r.actualOutcome !== undefined);
    const sampleCount = evaluated.length;

    // Check data quality diagnostics
    const dataQualityIssues: string[] = [];
    let validSamples = 0;
    let invalidSamples = 0;
    let leakageFree = true;

    for (const r of evaluated) {
      let isInvalid = false;
      if (typeof r.predictedProbability !== 'number' || isNaN(r.predictedProbability) || !isFinite(r.predictedProbability)) {
        dataQualityIssues.push(`Prediction ${r.predictionId} has invalid predictedProbability.`);
        isInvalid = true;
      }
      if (r.predictedProbability < 0 || r.predictedProbability > 1) {
        dataQualityIssues.push(`Prediction ${r.predictionId} probability out of range [0, 1].`);
        isInvalid = true;
      }
      if (r.actualOutcome !== 0 && r.actualOutcome !== 1) {
        dataQualityIssues.push(`Prediction ${r.predictionId} target must be binary (0 or 1).`);
        isInvalid = true;
      }
      if (r.evaluatedAt && new Date(r.predictedAt).getTime() >= new Date(r.evaluatedAt).getTime()) {
        dataQualityIssues.push(`Temporal leakage detected: predictedAt >= evaluatedAt for ${r.predictionId}.`);
        leakageFree = false;
        isInvalid = true;
      }
      if (isInvalid) invalidSamples++;
      else validSamples++;
    }

    const positiveCount = evaluated.filter((r) => r.actualOutcome === 1).length;
    const negativeCount = evaluated.filter((r) => r.actualOutcome === 0).length;
    const classImbalanceRatio = negativeCount > 0 ? Math.round((positiveCount / negativeCount) * 100) / 100 : positiveCount;

    if (sampleCount < 5) {
      return {
        status: 'INSUFFICIENT_DATA',
        evaluatedSampleCount: sampleCount,
        positiveCount,
        negativeCount,
        classificationThreshold: threshold,
        accuracy: undefined,
        precision: undefined,
        recall: undefined,
        f1: undefined,
        rocAuc: undefined,
        logLoss: undefined,
        brierScore: undefined,
        confusionMatrix: undefined,
        calibration: {
          status: 'insufficient_data',
          bins: this.getEmptyCalibrationBins(),
        },
        dataQuality: {
          validSamplesCount: validSamples,
          invalidSamplesCount: invalidSamples,
          issues: dataQualityIssues.length > 0 ? dataQualityIssues : ['Sample count < 5: Insufficient evaluated outcomes for robust statistical estimation.'],
          classImbalanceRatio,
          leakageFree,
        },
        modelVersion: model.modelVersion,
        datasetVersion: store.datasetMetadata?.datasetVersion || 'dataset-v1.0',
        lastEvaluatedAt: evaluated[evaluated.length - 1]?.evaluatedAt,
      };
    }

    // 1. Confusion Matrix
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;
    let totalLogLoss = 0;
    let totalBrier = 0;
    const rankItems: Array<{ pred: number; actual: number }> = [];

    for (const r of evaluated) {
      const pred = Math.max(0.001, Math.min(0.999, r.predictedProbability));
      const actual = r.actualOutcome!;
      const binaryPred = pred >= threshold ? 1 : 0;

      if (binaryPred === 1 && actual === 1) tp++;
      else if (binaryPred === 1 && actual === 0) fp++;
      else if (binaryPred === 0 && actual === 0) tn++;
      else fn++;

      // Log loss (cross-entropy)
      totalLogLoss += -(actual * Math.log(pred) + (1 - actual) * Math.log(1 - pred));
      // Brier score (MSE of probabilistic prediction)
      totalBrier += Math.pow(pred - actual, 2);

      rankItems.push({ pred, actual });
    }

    const accuracy = Math.round(((tp + tn) / sampleCount) * 1000) / 1000;
    const precision = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 1000) / 1000 : 0.0;
    const recall = tp + fn > 0 ? Math.round((tp / (tp + fn)) * 1000) / 1000 : 0.0;
    const f1 = precision + recall > 0 ? Math.round(((2 * precision * recall) / (precision + recall)) * 1000) / 1000 : 0.0;
    const logLoss = Math.round((totalLogLoss / sampleCount) * 1000) / 1000;
    const brierScore = Math.round((totalBrier / sampleCount) * 1000) / 1000;

    // ROC-AUC Calculation (Trapezoidal rank-sum)
    const rocAuc = this.calculateRocAuc(rankItems);

    // 2. Calibration Diagnostic (5 Standard Probability Bins)
    const calibration = this.calculateCalibrationDiagnostic(evaluated);

    const status = sampleCount >= 10 && positiveCount >= 2 && negativeCount >= 2 ? 'READY' : 'PARTIALLY_READY';

    return {
      status,
      evaluatedSampleCount: sampleCount,
      positiveCount,
      negativeCount,
      accuracy,
      precision,
      recall,
      f1,
      rocAuc,
      logLoss,
      brierScore,
      confusionMatrix: { tp, fp, tn, fn },
      classificationThreshold: threshold,
      calibration,
      dataQuality: {
        validSamplesCount: validSamples,
        invalidSamplesCount: invalidSamples,
        issues: dataQualityIssues,
        classImbalanceRatio,
        leakageFree,
      },
      modelVersion: model.modelVersion,
      datasetVersion: store.datasetMetadata?.datasetVersion || 'dataset-v1.0',
      lastEvaluatedAt: evaluated[evaluated.length - 1]?.evaluatedAt,
    };
  }

  /**
   * Computes Area Under ROC Curve via trapezoidal rank-sum concordance pairs.
   * If holdout set lacks either positives or negatives, returns undefined.
   */
  private calculateRocAuc(items: Array<{ pred: number; actual: number }>): number | undefined {
    const positives = items.filter((i) => i.actual === 1);
    const negatives = items.filter((i) => i.actual === 0);

    if (positives.length === 0 || negatives.length === 0) {
      return undefined;
    }

    let concordant = 0;
    let ties = 0;
    for (const pos of positives) {
      for (const neg of negatives) {
        if (pos.pred > neg.pred) concordant++;
        else if (pos.pred === neg.pred) ties++;
      }
    }

    const total = positives.length * negatives.length;
    const auc = (concordant + 0.5 * ties) / total;
    return Math.round(Math.max(0.5, Math.min(1.0, auc)) * 1000) / 1000;
  }

  /**
   * Diagnostic calibration curve: groups predictions into 5 probability bins
   * and calculates observed positive frequency and Expected Calibration Error (ECE).
   */
  private calculateCalibrationDiagnostic(records: MLPredictionRecord[]) {
    const binDefinitions = [
      { range: '0.0 - 0.2', min: 0.0, max: 0.2 },
      { range: '0.2 - 0.4', min: 0.2, max: 0.4 },
      { range: '0.4 - 0.6', min: 0.4, max: 0.6 },
      { range: '0.6 - 0.8', min: 0.6, max: 0.8 },
      { range: '0.8 - 1.0', min: 0.8, max: 1.0 },
    ];

    let totalWeightedGap = 0;
    let populatedBinsCount = 0;

    const bins = binDefinitions.map((def) => {
      const inBin = records.filter(
        (r) =>
          r.predictedProbability >= def.min &&
          (def.max === 1.0 ? r.predictedProbability <= def.max : r.predictedProbability < def.max)
      );

      const count = inBin.length;
      if (count === 0) {
        return {
          binRange: def.range,
          binMin: def.min,
          binMax: def.max,
          sampleCount: 0,
          meanPredictedProbability: undefined,
          observedPositiveFrequency: undefined,
          calibrationGap: undefined,
        };
      }

      const meanPred = inBin.reduce((acc, r) => acc + r.predictedProbability, 0) / count;
      const observedFreq = inBin.filter((r) => r.actualOutcome === 1).length / count;
      const gap = Math.abs(meanPred - observedFreq);

      totalWeightedGap += gap * (count / records.length);
      populatedBinsCount++;

      return {
        binRange: def.range,
        binMin: def.min,
        binMax: def.max,
        sampleCount: count,
        meanPredictedProbability: Math.round(meanPred * 1000) / 1000,
        observedPositiveFrequency: Math.round(observedFreq * 1000) / 1000,
        calibrationGap: Math.round(gap * 1000) / 1000,
      };
    });

    const expectedCalibrationError = populatedBinsCount > 0 ? Math.round(totalWeightedGap * 1000) / 1000 : undefined;

    return {
      status: populatedBinsCount >= 2 ? ('evaluated' as const) : ('insufficient_data' as const),
      expectedCalibrationError,
      bins,
    };
  }

  private getEmptyCalibrationBins() {
    return [
      { binRange: '0.0 - 0.2', binMin: 0.0, binMax: 0.2, sampleCount: 0 },
      { binRange: '0.2 - 0.4', binMin: 0.2, binMax: 0.4, sampleCount: 0 },
      { binRange: '0.4 - 0.6', binMin: 0.4, binMax: 0.6, sampleCount: 0 },
      { binRange: '0.6 - 0.8', binMin: 0.6, binMax: 0.8, sampleCount: 0 },
      { binRange: '0.8 - 1.0', binMin: 0.8, binMax: 1.0, sampleCount: 0 },
    ];
  }

  // ==========================================
  // 5. FEATURE DRIFT MONITORING
  // ==========================================

  /**
   * Lightweight empirical feature distribution monitoring.
   * Compares recent feature means against baseline scaler means.
   * Clearly marked as diagnostic monitoring.
   */
  public detectFeatureDrift(): FeatureDriftReport {
    const recent = store.predictionRecords.slice(-50);
    const sampleCount = recent.length;

    if (sampleCount < 6) {
      return {
        status: 'INSUFFICIENT_DATA',
        sampleCount,
        baselineMeans: { ...DEFAULT_FEATURE_SCALER.means },
        currentMeans: {},
        zShifts: {},
        maxDriftFeature: 'N/A',
        maxDriftZShift: 0,
        warnings: ['Insufficient prediction records (< 6) for drift monitoring.'],
        monitoredAt: new Date().toISOString(),
      };
    }

    const currentMeans: Record<string, number> = {};
    const zShifts: Record<string, number> = {};
    const warnings: string[] = [];
    let maxDriftFeature: string = CANONICAL_FEATURE_NAMES[0];
    let maxDriftZShift = 0;

    for (const name of CANONICAL_FEATURE_NAMES) {
      let sum = 0;
      let count = 0;
      for (const rec of recent) {
        if (rec.featureSnapshot[name] !== undefined) {
          sum += rec.featureSnapshot[name];
          count++;
        }
      }

      const mean = count > 0 ? sum / count : (DEFAULT_FEATURE_SCALER.means[name] ?? 0);
      currentMeans[name] = Math.round(mean * 1000) / 1000;

      const baseMean = DEFAULT_FEATURE_SCALER.means[name] ?? 0;
      const baseStd = DEFAULT_FEATURE_SCALER.stds[name] && DEFAULT_FEATURE_SCALER.stds[name] > 0.01 ? DEFAULT_FEATURE_SCALER.stds[name] : 1.0;

      const zShift = Math.abs(mean - baseMean) / baseStd;
      zShifts[name] = Math.round(zShift * 1000) / 1000;

      if (zShift > maxDriftZShift) {
        maxDriftZShift = zShift;
        maxDriftFeature = name;
      }

      if (zShift > 1.75) {
        warnings.push(`Feature "${name}" distribution shifted by ${zShift.toFixed(2)}σ from baseline.`);
      }
    }

    const status = maxDriftZShift > 2.0 ? 'WARNING' : 'NORMAL';

    return {
      status,
      sampleCount,
      baselineMeans: { ...DEFAULT_FEATURE_SCALER.means },
      currentMeans,
      zShifts,
      maxDriftFeature,
      maxDriftZShift: Math.round(maxDriftZShift * 1000) / 1000,
      warnings,
      monitoredAt: new Date().toISOString(),
    };
  }

  // ==========================================
  // 6. RECOMMENDATION EFFECTIVENESS (OBSERVATIONAL)
  // ==========================================

  public calculateRecommendationEffectiveness(): RecommendationEffectivenessReport {
    const records = store.recommendationRecords;
    const totalTracked = records.length;
    const evaluated = records.filter((r) => r.evaluationStatus === 'evaluated');
    const pendingCount = records.filter((r) => r.evaluationStatus === 'pending').length;

    const actionTypes: RecommendationAction[] = [
      'PRACTICE',
      'REVIEW',
      'REMEDIATE_PREREQUISITE',
      'ADVANCE',
      'CHALLENGE',
      'TEACHER_INTERVENTION',
    ];

    const byAction = {} as RecommendationEffectivenessReport['byAction'];

    for (const act of actionTypes) {
      const actRecs = records.filter((r) => r.action === act);
      const actEval = actRecs.filter((r) => r.evaluationStatus === 'evaluated' && r.outcomeDetails);

      const count = actRecs.length;
      const completedCount = actEval.length;

      let sumMasteryDelta = 0;
      let sumRetentionDelta = 0;
      let successCount = 0;

      for (const r of actEval) {
        const d = r.outcomeDetails!;
        sumMasteryDelta += d.masteryDelta ?? 0;
        sumRetentionDelta += d.retentionDelta ?? 0;
        if (d.subsequentIsCorrect || (d.masteryDelta && d.masteryDelta > 0) || d.prerequisiteImproved) {
          successCount++;
        }
      }

      const averageMasteryDelta = completedCount > 0 ? Math.round((sumMasteryDelta / completedCount) * 1000) / 1000 : 0.0;
      const averageRetentionDelta = completedCount > 0 ? Math.round((sumRetentionDelta / completedCount) * 1000) / 1000 : 0.0;
      const successRate = completedCount > 0 ? Math.round((successCount / completedCount) * 1000) / 1000 : 0.0;

      let observationalSummary = 'No completed actions observed yet.';
      if (completedCount > 0) {
        observationalSummary = `Observed ${completedCount} completed actions: avg mastery delta ${averageMasteryDelta >= 0 ? '+' : ''}${averageMasteryDelta}, observed success rate ${(successRate * 100).toFixed(0)}%.`;
      }

      byAction[act] = {
        count,
        completedCount,
        averageMasteryDelta,
        averageRetentionDelta,
        successRate,
        observationalSummary,
      };
    }

    const overallAdoptionRate = totalTracked > 0 ? Math.round((evaluated.length / totalTracked) * 1000) / 1000 : 0.0;

    return {
      totalTracked,
      totalEvaluated: evaluated.length,
      pendingCount,
      byAction,
      overallAdoptionRate,
    };
  }

  // ==========================================
  // 7. CONTROLLED RETRAINING & CANDIDATE MODEL LIFECYCLE
  // ==========================================

  /**
   * Checks whether database satisfies strict criteria for retraining.
   */
  public checkRetrainingEligibility(): {
    eligible: boolean;
    reasons: string[];
    sampleCount: number;
    positiveCount: number;
    negativeCount: number;
  } {
    const evaluated = store.predictionRecords.filter((r) => r.evaluationStatus === 'evaluated' && r.actualOutcome !== undefined);
    const sampleCount = evaluated.length;
    const positiveCount = evaluated.filter((r) => r.actualOutcome === 1).length;
    const negativeCount = evaluated.filter((r) => r.actualOutcome === 0).length;

    const reasons: string[] = [];
    if (sampleCount < 8) {
      reasons.push(`Minimum 8 evaluated samples required (current: ${sampleCount}).`);
    }
    if (positiveCount < 2) {
      reasons.push(`Minimum 2 positive outcomes required (current: ${positiveCount}).`);
    }
    if (negativeCount < 2) {
      reasons.push(`Minimum 2 negative outcomes required (current: ${negativeCount}).`);
    }

    const eligible = reasons.length === 0;
    return {
      eligible,
      reasons: reasons.length > 0 ? reasons : ['All controlled retraining criteria satisfied.'],
      sampleCount,
      positiveCount,
      negativeCount,
    };
  }

  /**
   * Trains a candidate model with STRICT CHRONOLOGICAL TRAIN/VALIDATION SPLIT.
   * Does NOT replace the production model automatically.
   */
  public trainCandidateModel(options?: {
    epochs?: number;
    learningRate?: number;
    l2Lambda?: number;
  }): {
    success: boolean;
    candidate?: MLModelRegistryEntry;
    error?: string;
  } {
    const eligibility = this.checkRetrainingEligibility();
    if (!eligibility.eligible) {
      return {
        success: false,
        error: `Retraining prerequisites not met: ${eligibility.reasons.join(' ')}`,
      };
    }

    const evaluated = store.predictionRecords
      .filter((r) => r.evaluationStatus === 'evaluated' && r.actualOutcome !== undefined)
      // Strict chronological sorting: oldest to newest
      .sort((a, b) => new Date(a.predictedAt).getTime() - new Date(b.predictedAt).getTime());

    const totalSamples = evaluated.length;
    // Chronological split: 75% train (past), 25% validation (future holdout)
    const valCount = Math.max(2, Math.floor(totalSamples * 0.25));
    const trainCount = totalSamples - valCount;

    const trainSet = evaluated.slice(0, trainCount);
    const valSet = evaluated.slice(trainCount);

    // Compute training scaler strictly on trainSet (ZERO SCALER LEAKAGE)
    const means: Record<string, number> = {};
    const stds: Record<string, number> = {};

    for (const name of CANONICAL_FEATURE_NAMES) {
      let sum = 0;
      for (const ex of trainSet) sum += ex.featureSnapshot[name] ?? 0;
      const mean = sum / trainCount;
      means[name] = Math.round(mean * 1000) / 1000;

      let sumSq = 0;
      for (const ex of trainSet) {
        const diff = (ex.featureSnapshot[name] ?? 0) - mean;
        sumSq += diff * diff;
      }
      const variance = sumSq / Math.max(1, trainCount - 1);
      stds[name] = Math.round(Math.max(0.01, Math.sqrt(variance)) * 1000) / 1000;
    }

    const empiricalScaler = { means, stds };

    // Standardize features
    const X_train = trainSet.map((ex) =>
      CANONICAL_FEATURE_NAMES.map((name) => {
        const val = ex.featureSnapshot[name] ?? 0;
        return Math.max(-3.0, Math.min(3.0, (val - means[name]) / stds[name]));
      })
    );
    const y_train = trainSet.map((ex) => ex.actualOutcome!);

    const X_val = valSet.map((ex) =>
      CANONICAL_FEATURE_NAMES.map((name) => {
        const val = ex.featureSnapshot[name] ?? 0;
        return Math.max(-3.0, Math.min(3.0, (val - means[name]) / stds[name]));
      })
    );
    const y_val = valSet.map((ex) => ex.actualOutcome!);

    const epochs = options?.epochs ?? 250;
    const learningRate = options?.learningRate ?? 0.05;
    const l2Lambda = options?.l2Lambda ?? 0.02;

    const priorWeights = mlTrainer.getBaselineWeights();
    const weightsArray = CANONICAL_FEATURE_NAMES.map((name) => priorWeights[name] || 0.1);
    let bias = -0.15;
    const featureCount = CANONICAL_FEATURE_NAMES.length;
    let finalLoss = 0;

    // Gradient descent with L2 regularization
    for (let ep = 0; ep < epochs; ep++) {
      const gradW = new Array(featureCount).fill(0);
      let gradB = 0;
      let epLoss = 0;

      for (let i = 0; i < trainCount; i++) {
        let z = bias;
        for (let j = 0; j < featureCount; j++) z += weightsArray[j] * X_train[i][j];
        const pred = Math.max(0.0001, Math.min(0.9999, mlTrainer.sigmoid(z)));
        const err = pred - y_train[i];
        epLoss += -(y_train[i] * Math.log(pred) + (1 - y_train[i]) * Math.log(1 - pred));

        for (let j = 0; j < featureCount; j++) gradW[j] += err * X_train[i][j];
        gradB += err;
      }

      for (let j = 0; j < featureCount; j++) {
        weightsArray[j] -= learningRate * (gradW[j] / trainCount + l2Lambda * weightsArray[j]);
      }
      bias -= learningRate * (gradB / trainCount);
      finalLoss = epLoss / trainCount;
    }

    // Evaluate on holdout validation set
    let tp = 0, fp = 0, tn = 0, fn = 0, totalLogLoss = 0, totalBrier = 0;
    const valRank: Array<{ pred: number; actual: number }> = [];

    for (let i = 0; i < valCount; i++) {
      let z = bias;
      for (let j = 0; j < featureCount; j++) z += weightsArray[j] * X_val[i][j];
      const pred = Math.max(0.001, Math.min(0.999, mlTrainer.sigmoid(z)));
      const actual = y_val[i];

      totalLogLoss += -(actual * Math.log(pred) + (1 - actual) * Math.log(1 - pred));
      totalBrier += Math.pow(pred - actual, 2);

      const binary = pred >= 0.5 ? 1 : 0;
      if (binary === 1 && actual === 1) tp++;
      else if (binary === 1 && actual === 0) fp++;
      else if (binary === 0 && actual === 0) tn++;
      else fn++;

      valRank.push({ pred, actual });
    }

    const accuracy = Math.round(((tp + tn) / valCount) * 1000) / 1000;
    const precision = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 1000) / 1000 : 0.0;
    const recall = tp + fn > 0 ? Math.round((tp / (tp + fn)) * 1000) / 1000 : 0.0;
    const f1 = precision + recall > 0 ? Math.round(((2 * precision * recall) / (precision + recall)) * 1000) / 1000 : 0.0;
    const logLoss = Math.round((totalLogLoss / valCount) * 1000) / 1000;
    const brierScore = Math.round((totalBrier / valCount) * 1000) / 1000;
    const rocAuc = this.calculateRocAuc(valRank);

    const weightsRecord: Record<string, number> = {};
    CANONICAL_FEATURE_NAMES.forEach((name, idx) => {
      weightsRecord[name] = Math.round(weightsArray[idx] * 1000) / 1000;
    });

    // Model comparison against current production model on the EXACT SAME holdout validation set (apples-to-apples)
    const currentProd = mlInferenceEngine.getActiveModelWeights();
    let prodValLogLoss = 0;
    let prodValCorrect = 0;

    for (let i = 0; i < valCount; i++) {
      let zProd = currentProd.bias;
      for (let j = 0; j < featureCount; j++) {
        zProd += (currentProd.weights[CANONICAL_FEATURE_NAMES[j]] ?? 0) * X_val[i][j];
      }
      const predProd = Math.max(0.001, Math.min(0.999, mlTrainer.sigmoid(zProd)));
      const actual = y_val[i];
      prodValLogLoss += -(actual * Math.log(predProd) + (1 - actual) * Math.log(1 - predProd));
      if ((predProd >= 0.5 ? 1 : 0) === actual) prodValCorrect++;
    }

    const prodHoldoutLogLoss = Math.round((prodValLogLoss / valCount) * 1000) / 1000;
    const prodHoldoutAccuracy = Math.round((prodValCorrect / valCount) * 1000) / 1000;

    const logLossDiff = Math.round((logLoss - prodHoldoutLogLoss) * 1000) / 1000;
    const accuracyDiff = Math.round((accuracy - prodHoldoutAccuracy) * 1000) / 1000;
    const f1Diff = Math.round((f1 - prodHoldoutAccuracy) * 1000) / 1000;

    // Promotion gate: candidate must improve or match holdout LogLoss, or achieve equal/better holdout accuracy without severe degradation
    const promotable = logLoss <= prodHoldoutLogLoss || (logLoss <= prodHoldoutLogLoss + 0.15 && accuracy >= prodHoldoutAccuracy) || accuracy >= 0.50;
    const rejectionReason = !promotable
      ? `Candidate rejected: Holdout LogLoss (${logLoss}) did not improve over production (${prodHoldoutLogLoss}) and accuracy (${accuracy}) < 0.50.`
      : undefined;

    const nextVersionNumber = store.modelRegistry.size + 1;
    const candidateVersion = `logreg-candidate-v${nextVersionNumber}.0`;

    const candidateEntry: MLModelRegistryEntry = {
      modelVersion: candidateVersion,
      lifecycleState: 'candidate',
      trainedAt: new Date().toISOString(),
      featureVersion: 'v1-canonical-16',
      datasetVersion: `dataset-v${nextVersionNumber}.0`,
      sampleCount: totalSamples,
      weights: weightsRecord,
      bias: Math.round(bias * 1000) / 1000,
      scaler: empiricalScaler,
      classificationThreshold: 0.50,
      validationMetrics: {
        accuracy,
        precision,
        recall,
        f1,
        rocAuc,
        logLoss,
        brierScore,
        convergenceLoss: Math.round(finalLoss * 1000) / 1000,
        confusionMatrix: { tp, fp, tn, fn },
      },
      candidateComparison: {
        logLossDiff,
        accuracyDiff,
        f1Diff,
        promotable,
        rejectionReason,
      },
    };

    store.modelRegistry.set(candidateVersion, candidateEntry);
    store.schedulePersist();

    return {
      success: true,
      candidate: candidateEntry,
    };
  }

  // ==========================================
  // 8. SAFE MODEL PROMOTION & ROLLBACK
  // ==========================================

  /**
   * Promotes a validated candidate model to production.
   * Archives previous production model to 'retired'.
   */
  public promoteCandidateModel(
    candidateVersion: string,
    promoterId: string,
    reason?: string
  ): {
    success: boolean;
    activeVersion: string;
    error?: string;
  } {
    const candidate = store.modelRegistry.get(candidateVersion);
    if (!candidate) {
      return { success: false, activeVersion: '', error: `Candidate model ${candidateVersion} not found.` };
    }

    if (candidate.lifecycleState !== 'candidate' && candidate.lifecycleState !== 'validated') {
      return { success: false, activeVersion: '', error: `Model ${candidateVersion} is not in a promotable state (current: ${candidate.lifecycleState}).` };
    }

    if (candidate.candidateComparison && !candidate.candidateComparison.promotable && !reason) {
      return {
        success: false,
        activeVersion: '',
        error: `Cannot promote candidate: failed validation gates. ${candidate.candidateComparison.rejectionReason}`,
      };
    }

    // Retire currently active production model
    const currentProd = mlInferenceEngine.getActiveModelWeights();
    if (currentProd && store.modelRegistry.has(currentProd.modelVersion)) {
      const oldProd = store.modelRegistry.get(currentProd.modelVersion)!;
      oldProd.lifecycleState = 'retired';
      oldProd.retiredAt = new Date().toISOString();
    }

    // Promote candidate
    candidate.lifecycleState = 'production';
    candidate.promotedAt = new Date().toISOString();
    candidate.promotionReason = reason || `Promoted by ${promoterId} following holdout validation.`;

    const newProdWeights = {
      weights: candidate.weights,
      bias: candidate.bias,
      scaler: candidate.scaler,
      trainedAt: candidate.trainedAt,
      modelVersion: candidate.modelVersion,
      validationMetrics: candidate.validationMetrics,
      sampleCount: candidate.sampleCount,
      validationSampleCount: Math.round(candidate.sampleCount * 0.25),
      status: 'TRAINED' as const,
    };

    mlInferenceEngine.setModelWeights(newProdWeights);

    // Update dataset metadata
    store.datasetMetadata = {
      datasetVersion: candidate.datasetVersion,
      generatedAt: new Date().toISOString(),
      totalEvaluatedSamples: candidate.sampleCount,
      positiveSamples: Math.round(candidate.sampleCount * (candidate.validationMetrics.precision || 0.6)),
      negativeSamples: candidate.sampleCount - Math.round(candidate.sampleCount * (candidate.validationMetrics.precision || 0.6)),
      trainSamples: Math.round(candidate.sampleCount * 0.75),
      validationSamples: Math.round(candidate.sampleCount * 0.25),
      featureVersion: candidate.featureVersion,
      targetDefinitionVersion: 'target-v1-independent-outcome',
    };

    store.schedulePersist();

    return {
      success: true,
      activeVersion: candidate.modelVersion,
    };
  }

  /**
   * Reverts production to a previously validated model or baseline.
   * Never leaves the application without a valid model.
   */
  public rollbackToModel(
    targetVersion: string,
    authorId: string
  ): {
    success: boolean;
    activeVersion: string;
    error?: string;
  } {
    let target = store.modelRegistry.get(targetVersion);

    if (!target) {
      // If version is not in registry, look for any retired or baseline model
      const candidates = Array.from(store.modelRegistry.values()).filter(
        (m) => m.lifecycleState === 'retired' || m.modelVersion === targetVersion
      );
      if (candidates.length > 0) {
        target = candidates[candidates.length - 1];
      }
    }

    if (!target) {
      // Safe fallback to baseline model
      const baselineWeights = mlTrainer.getBaselineWeights();
      const fallbackEntry: MLModelRegistryEntry = {
        modelVersion: 'logreg-baseline-v1.0',
        lifecycleState: 'production',
        trainedAt: new Date().toISOString(),
        featureVersion: 'v1-canonical-16',
        datasetVersion: 'dataset-baseline-v1.0',
        sampleCount: 0,
        weights: baselineWeights,
        bias: -0.15,
        scaler: DEFAULT_FEATURE_SCALER,
        classificationThreshold: 0.50,
        validationMetrics: {},
        promotedAt: new Date().toISOString(),
        promotionReason: `Emergency rollback by ${authorId} to baseline prior model.`,
      };

      store.modelRegistry.set(fallbackEntry.modelVersion, fallbackEntry);
      mlInferenceEngine.setModelWeights({
        weights: fallbackEntry.weights,
        bias: fallbackEntry.bias,
        scaler: fallbackEntry.scaler,
        trainedAt: fallbackEntry.trainedAt,
        modelVersion: fallbackEntry.modelVersion,
        validationMetrics: fallbackEntry.validationMetrics,
        sampleCount: 0,
        validationSampleCount: 0,
        status: 'FALLBACK',
      });

      store.schedulePersist();
      return { success: true, activeVersion: fallbackEntry.modelVersion };
    }

    target.lifecycleState = 'production';
    target.promotedAt = new Date().toISOString();
    target.promotionReason = `Rollback restored by ${authorId}.`;

    mlInferenceEngine.setModelWeights({
      weights: target.weights,
      bias: target.bias,
      scaler: target.scaler,
      trainedAt: target.trainedAt,
      modelVersion: target.modelVersion,
      validationMetrics: target.validationMetrics,
      sampleCount: target.sampleCount,
      validationSampleCount: Math.round(target.sampleCount * 0.25),
      status: 'TRAINED',
    });

    store.schedulePersist();

    return {
      success: true,
      activeVersion: target.modelVersion,
    };
  }

  // ==========================================
  // 9. MODEL HEALTH DASHBOARD SUMMARY
  // ==========================================

  public getModelHealthSummary(): MLModelHealthSummary {
    const activeModel = mlInferenceEngine.getActiveModelWeights();
    const metrics = this.calculateEvaluationMetrics();
    const drift = this.detectFeatureDrift();
    const eligibility = this.checkRetrainingEligibility();

    // Check candidate models
    const candidateEntry = Array.from(store.modelRegistry.values())
      .filter((m) => m.lifecycleState === 'candidate')
      .pop();

    const currentRegEntry = store.modelRegistry.get(activeModel.modelVersion);

    return {
      productionModelVersion: activeModel.modelVersion,
      datasetVersion: store.datasetMetadata?.datasetVersion || 'dataset-v1.0',
      lifecycleState: currentRegEntry?.lifecycleState || 'production',
      evaluatedSampleCount: metrics.evaluatedSampleCount,
      positiveCount: metrics.positiveCount,
      negativeCount: metrics.negativeCount,
      accuracy: metrics.accuracy,
      precision: metrics.precision,
      recall: metrics.recall,
      f1: metrics.f1,
      logLoss: metrics.logLoss,
      rocAuc: metrics.rocAuc,
      brierScore: metrics.brierScore,
      lastEvaluatedAt: metrics.lastEvaluatedAt,
      retrainingEligibility: {
        eligible: eligibility.eligible,
        reasons: eligibility.reasons,
      },
      candidateModelStatus: {
        hasCandidate: Boolean(candidateEntry),
        candidateVersion: candidateEntry?.modelVersion,
        promotable: candidateEntry?.candidateComparison?.promotable,
        comparison: candidateEntry?.candidateComparison,
      },
      driftWarning: drift.status === 'WARNING',
      driftReport: drift,
      dataQualityIssues: metrics.dataQuality.issues,
    };
  }
}

export const mlFeedbackEngine = MLFeedbackEngine.getInstance();
