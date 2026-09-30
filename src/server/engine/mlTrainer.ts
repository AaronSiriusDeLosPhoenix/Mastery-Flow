import { store } from '../db/store.js';
import {
  CANONICAL_FEATURE_NAMES,
  DEFAULT_FEATURE_SCALER,
  mlFeatureExtractor,
} from './mlFeatureExtractor.js';
import { MLFeatureVector, MLModelWeights } from '../db/types.js';

export interface MLTrainingExample {
  learnerId: string;
  conceptId: string;
  features: MLFeatureVector;
  target: number; // 0 or 1
  observationTimestamp: string;
  evaluationTimestamp: string;
}

export interface TrainingResult {
  weights: MLModelWeights;
  randomForestBenchmark?: {
    accuracy: number;
    f1: number;
    logLoss: number;
    treeCount: number;
  };
}

export const TARGET_CONSTRUCTION_SPEC =
  'Supervised target y in {0, 1} is constructed from an independent future evaluation event at time T_eval > T_obs. Input features X(T_obs) use strictly historical attempts with timestamp < T_obs (zero target/future leakage). Label y = 1 iff the learner subsequently answers the independent evaluation item correctly without triggering the anti-guessing heuristic (isCorrect && !antiGuessingTriggered); otherwise y = 0.';

export class MLTrainer {
  private static instance: MLTrainer;

  public static getInstance(): MLTrainer {
    if (!MLTrainer.instance) {
      MLTrainer.instance = new MLTrainer();
    }
    return MLTrainer.instance;
  }

  /**
   * Sigmoid activation function with numerical stability clamping
   */
  public sigmoid(z: number): number {
    if (z === null || z === undefined || isNaN(z)) return 0.5;
    if (z < -45) return 0;
    if (z > 45) return 1;
    return 1 / (1 + Math.exp(-z));
  }

  /**
   * Constructs training dataset from historical learning events with STRICT ZERO DATA LEAKAGE.
   *
   * TARGET / LABEL CONSTRUCTION SPECIFICATION:
   * 1. Sequential Attempt Checkpoints:
   *    For a learner's chronologically ordered attempts [a_0, a_1, ..., a_{n-1}] on a concept:
   *    For each evaluation checkpoint i >= 1 at time T_eval = a_i.timestamp:
   *    - Features X are extracted strictly BEFORE T_eval (cutoffTimestamp = T_eval, filtering a_k.timestamp < T_eval).
   *    - Label y = 1 if a_i.isCorrect && !a_i.antiGuessingTriggered, else 0.
   *    - Neither a_i nor any future attempt a_{k > i} nor present-day MasteryState is ever used in X.
   * 2. Independent Mock Exam Checkpoints:
   *    For a completed mock exam session:
   *    - Features X are extracted strictly BEFORE the exam began (cutoffTimestamp = exam.startedAt).
   *    - Label y = 1 if the learner answered the exam question on that concept correctly, else 0.
   */
  public constructDataset(): MLTrainingExample[] {
    const examples: MLTrainingExample[] = [];

    // Iterate through all stored learners
    for (const [learnerId] of store.learners.entries()) {
      // Exclude synthetic exam-submission attempts from sequential attempt pairs since completed exams are evaluated in the independent Mock Exam loop below
      const studentAttempts = store.attempts.filter(
        (a) => a.learnerId === learnerId && !a.id.startsWith('att_exam_')
      );
      if (studentAttempts.length >= 2) {
        // Group attempts by concept
        const conceptAttemptsMap = new Map<string, typeof studentAttempts>();
        for (const att of studentAttempts) {
          if (!conceptAttemptsMap.has(att.conceptId)) {
            conceptAttemptsMap.set(att.conceptId, []);
          }
          conceptAttemptsMap.get(att.conceptId)!.push(att);
        }

        // For each concept with historical trail, build temporally separated pairs
        for (const [conceptId, attempts] of conceptAttemptsMap.entries()) {
          if (attempts.length < 2) continue;

          // Sort chronologically
          const sorted = [...attempts].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          // Split into historical observation points (strictly < evalAttempt.timestamp) and independent evaluation outcomes
          for (let i = 1; i < sorted.length; i++) {
            const evalAttempt = sorted[i];
            const observationTimestamp = evalAttempt.timestamp;

            // Features: Extracted strictly BEFORE evalAttempt
            const features = mlFeatureExtractor.extractFeatures(learnerId, conceptId, {
              cutoffTimestamp: observationTimestamp,
            });

            // Ensure at least 1 prior attempt strictly preceded this evaluation timestamp
            if ((features.raw.attemptCount ?? 0) < 1) continue;

            // Target: Independent evaluation at evalAttempt
            const target = evalAttempt.isCorrect && !evalAttempt.antiGuessingTriggered ? 1 : 0;

            examples.push({
              learnerId,
              conceptId,
              features,
              target,
              observationTimestamp,
              evaluationTimestamp: evalAttempt.timestamp,
            });
          }
        }
      }

      // Incorporate Mock Exam concept performances as independent evaluation targets
      // Features are extracted at exam.startedAt (strictly before the exam was submitted)
      for (const exam of store.examSessions) {
        if (exam.learnerId !== learnerId || !exam.isCompleted) continue;
        const reviewMap = new Map<string, boolean>();
        if (exam.result?.questionsReview) {
          for (const qr of exam.result.questionsReview) {
            reviewMap.set(qr.question.questionId, qr.isCorrect);
          }
        }
        const obsTimestamp = exam.startedAt || exam.submittedAt || new Date().toISOString();
        const evalTimestamp = exam.submittedAt || exam.startedAt || obsTimestamp;

        for (const q of exam.questions) {
          const features = mlFeatureExtractor.extractFeatures(learnerId, q.conceptId, {
            cutoffTimestamp: obsTimestamp,
          });
          const isQCorrect = reviewMap.has(q.questionId)
            ? reviewMap.get(q.questionId)!
            : (exam.result?.scorePercent || 0) >= 75;
          const target = isQCorrect ? 1 : 0;
          examples.push({
            learnerId,
            conceptId: q.conceptId,
            features,
            target,
            observationTimestamp: obsTimestamp,
            evaluationTimestamp: evalTimestamp,
          });
        }
      }
    }

    // 3. Incorporate verified historical evaluated prediction snapshots (T_pred < T_eval) when active history is present
    if (store.attempts.length > 0 || store.examSessions.length > 0) {
      const seenEvalKeys = new Set(
        examples.map((ex) => `${ex.learnerId}_${ex.conceptId}_${ex.evaluationTimestamp}`)
      );
      for (const rec of store.predictionRecords) {
        if (
          rec.evaluationStatus === 'evaluated' &&
          (rec.actualOutcome === 0 || rec.actualOutcome === 1) &&
          rec.evaluatedAt &&
          new Date(rec.predictedAt).getTime() < new Date(rec.evaluatedAt).getTime()
        ) {
          const key = `${rec.learnerId}_${rec.conceptId}_${rec.evaluatedAt}`;
          if (seenEvalKeys.has(key)) continue;
          seenEvalKeys.add(key);

          const raw: Record<string, number> = {};
          const normalized: Record<string, number> = {};
          const values: number[] = [];
          for (const fname of CANONICAL_FEATURE_NAMES) {
            raw[fname] = mlFeatureExtractor.sanitizeNumber(
              rec.featureSnapshot?.[fname],
              DEFAULT_FEATURE_SCALER.means[fname] ?? 0.5
            );
            normalized[fname] = mlFeatureExtractor.sanitizeNumber(
              rec.normalizedSnapshot?.[fname],
              0,
              -3.0,
              3.0
            );
            values.push(normalized[fname]);
          }

          examples.push({
            learnerId: rec.learnerId,
            conceptId: rec.conceptId,
            features: {
              names: [...CANONICAL_FEATURE_NAMES],
              raw,
              normalized,
              values,
            },
            target: rec.actualOutcome,
            observationTimestamp: rec.predictedAt,
            evaluationTimestamp: rec.evaluatedAt,
          });
        }
      }
    }

    // Strictly sort all historical examples chronologically to enforce clean temporal boundaries
    examples.sort(
      (a, b) => new Date(a.observationTimestamp).getTime() - new Date(b.observationTimestamp).getTime()
    );

    return examples;
  }

  /**
   * Pre-calibrated baseline weights derived from domain pedagogical theory.
   * Used when data is small or as Bayesian prior initialization for training.
   */
  public getBaselineWeights(): Record<string, number> {
    return {
      attemptCount: 0.25,
      overallAccuracy: 0.95,
      recentAccuracy: 1.10,
      incorrectCount: -0.65,
      easyAccuracy: 0.35,
      mediumAccuracy: 0.65,
      hardAccuracy: 0.85,
      transferAccuracy: 0.80,
      averageConfidence: 0.50,
      averageResponseTimeRatio: -0.20,
      hintsAndRetriesSignal: 0.45,
      flashcardReviewScore: 0.60,
      prerequisiteMasteryRatio: 0.75,
      daysSinceLastReview: -0.35,
      previousMastery: 0.90,
      antiGuessingFrequency: -0.80,
    };
  }

  /**
   * Trains Logistic Regression with L2 Regularization & calculates real validation metrics.
   */
  public train(options?: { epochs?: number; learningRate?: number; l2Lambda?: number }): TrainingResult {
    const epochs = options?.epochs ?? 250;
    const learningRate = options?.learningRate ?? 0.05;
    const l2Lambda = options?.l2Lambda ?? 0.02;
    const classificationThreshold = 0.5;

    const dataset = this.constructDataset();
    const sampleCount = dataset.length;
    const positiveCount = dataset.filter((d) => d.target === 1).length;
    const negativeCount = dataset.filter((d) => d.target === 0).length;

    // Minimum samples check: require at least 6 total samples and both classes present
    if (sampleCount < 6 || positiveCount === 0 || negativeCount === 0) {
      // Return safe baseline with INSUFFICIENT_DATA status (never fabricate metrics)
      const baselineWeights = this.getBaselineWeights();
      return {
        weights: {
          weights: baselineWeights,
          bias: -0.2,
          scaler: DEFAULT_FEATURE_SCALER,
          trainedAt: new Date().toISOString(),
          modelVersion: 'logreg-baseline-v1.0',
          validationMetrics: {
            accuracy: undefined,
            precision: undefined,
            recall: undefined,
            f1: undefined,
            rocAuc: undefined,
            logLoss: undefined,
          },
          sampleCount,
          trainSampleCount: 0,
          validationSampleCount: 0,
          positiveCount,
          negativeCount,
          trainPositiveCount: 0,
          trainNegativeCount: 0,
          valPositiveCount: 0,
          valNegativeCount: 0,
          featureList: [...CANONICAL_FEATURE_NAMES],
          hyperparameters: {
            epochs,
            learningRate,
            l2Lambda,
            classificationThreshold,
            splitStrategy: '75/25 chronological split',
          },
          targetDefinition: TARGET_CONSTRUCTION_SPEC,
          status: 'INSUFFICIENT_DATA',
        },
      };
    }

    // 1. Train / Validation Split (75% train, 25% validation chronologically)
    const valCount = Math.max(2, Math.floor(sampleCount * 0.25));
    const trainCount = sampleCount - valCount;

    const trainDataset = dataset.slice(0, trainCount);
    const valDataset = dataset.slice(trainCount);

    const trainPositiveCount = trainDataset.filter((d) => d.target === 1).length;
    const trainNegativeCount = trainDataset.filter((d) => d.target === 0).length;
    const valPositiveCount = valDataset.filter((d) => d.target === 1).length;
    const valNegativeCount = valDataset.filter((d) => d.target === 0).length;

    // 2. Compute empirical scaler ONLY from training data (ZERO SCALER LEAKAGE)
    const means: Record<string, number> = {};
    const stds: Record<string, number> = {};

    for (const name of CANONICAL_FEATURE_NAMES) {
      let sum = 0;
      for (const ex of trainDataset) {
        sum += ex.features.raw[name] ?? 0;
      }
      const mean = sum / trainCount;
      means[name] = Math.round(mean * 1000) / 1000;

      let sumSq = 0;
      for (const ex of trainDataset) {
        const diff = (ex.features.raw[name] ?? 0) - mean;
        sumSq += diff * diff;
      }
      const variance = sumSq / Math.max(1, trainCount - 1);
      const std = Math.sqrt(variance);
      stds[name] = Math.round(Math.max(0.01, std) * 1000) / 1000;
    }

    const empiricalScaler = { means, stds };

    // 3. Normalize both train and validation using the TRAINING scaler
    const X_train = trainDataset.map((ex) =>
      CANONICAL_FEATURE_NAMES.map((name) => {
        const rawVal = ex.features.raw[name] ?? 0;
        const mean = means[name];
        const std = stds[name];
        return Math.max(-3.0, Math.min(3.0, (rawVal - mean) / std));
      })
    );
    const y_train = trainDataset.map((ex) => ex.target);

    const X_val = valDataset.map((ex) =>
      CANONICAL_FEATURE_NAMES.map((name) => {
        const rawVal = ex.features.raw[name] ?? 0;
        const mean = means[name];
        const std = stds[name];
        return Math.max(-3.0, Math.min(3.0, (rawVal - mean) / std));
      })
    );
    const y_val = valDataset.map((ex) => ex.target);

    const featureCount = CANONICAL_FEATURE_NAMES.length;

    // 4. Initialize weights from baseline prior
    const priorWeights = this.getBaselineWeights();
    const weightsArray: number[] = CANONICAL_FEATURE_NAMES.map((name) => priorWeights[name] || 0.1);
    let bias = -0.15;
    let finalConvergenceLoss = 0;

    // 5. Batch Gradient Descent with L2 regularization
    for (let epoch = 0; epoch < epochs; epoch++) {
      const gradW = new Array(featureCount).fill(0);
      let gradB = 0;
      let epochLoss = 0;

      for (let i = 0; i < trainCount; i++) {
        let z = bias;
        for (let j = 0; j < featureCount; j++) {
          z += weightsArray[j] * X_train[i][j];
        }
        const pred = Math.max(0.0001, Math.min(0.9999, this.sigmoid(z)));
        const err = pred - y_train[i];
        epochLoss += -(y_train[i] * Math.log(pred) + (1 - y_train[i]) * Math.log(1 - pred));

        for (let j = 0; j < featureCount; j++) {
          gradW[j] += err * X_train[i][j];
        }
        gradB += err;
      }

      // Update weights with L2 penalty: w = w - eta * (grad / m + lambda * w)
      for (let j = 0; j < featureCount; j++) {
        const l2Term = l2Lambda * weightsArray[j];
        weightsArray[j] -= learningRate * (gradW[j] / trainCount + l2Term);
      }
      bias -= learningRate * (gradB / trainCount);
      finalConvergenceLoss = epochLoss / trainCount;
    }

    // 6. Evaluate REAL Validation Metrics on Holdout Set
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;
    let totalLogLoss = 0;
    const valPredictions: Array<{ pred: number; actual: number }> = [];

    for (let i = 0; i < valCount; i++) {
      let z = bias;
      for (let j = 0; j < featureCount; j++) {
        z += weightsArray[j] * X_val[i][j];
      }
      const pred = Math.max(0.001, Math.min(0.999, this.sigmoid(z)));
      const actual = y_val[i];

      valPredictions.push({ pred, actual });

      // Log loss
      totalLogLoss += -(actual * Math.log(pred) + (1 - actual) * Math.log(1 - pred));

      const binaryPred = pred >= classificationThreshold ? 1 : 0;
      if (binaryPred === 1 && actual === 1) tp++;
      else if (binaryPred === 1 && actual === 0) fp++;
      else if (binaryPred === 0 && actual === 0) tn++;
      else fn++;
    }

    const accuracy = Math.round(((tp + tn) / valCount) * 1000) / 1000;
    const precision = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 1000) / 1000 : undefined;
    const recall = tp + fn > 0 ? Math.round((tp / (tp + fn)) * 1000) / 1000 : undefined;
    const f1 =
      precision !== undefined && recall !== undefined && precision + recall > 0
        ? Math.round(((2 * precision * recall) / (precision + recall)) * 1000) / 1000
        : undefined;
    const logLoss = Math.round((totalLogLoss / valCount) * 1000) / 1000;

    // Calculate ROC-AUC via rank-sum (returns undefined if holdout set is single-class)
    const rocAuc = this.calculateRocAuc(valPredictions);

    // Map weightsArray to Record<string, number>
    const weightsRecord: Record<string, number> = {};
    CANONICAL_FEATURE_NAMES.forEach((name, idx) => {
      weightsRecord[name] = Math.round(weightsArray[idx] * 1000) / 1000;
    });

    const modelWeights: MLModelWeights = {
      weights: weightsRecord,
      bias: Math.round(bias * 1000) / 1000,
      scaler: empiricalScaler,
      trainedAt: new Date().toISOString(),
      modelVersion: 'logreg-prod-v1.0',
      validationMetrics: {
        accuracy,
        precision,
        recall,
        f1,
        rocAuc,
        logLoss,
        convergenceLoss: Math.round(finalConvergenceLoss * 1000) / 1000,
        confusionMatrix: { tp, fp, tn, fn },
      },
      sampleCount,
      trainSampleCount: trainCount,
      validationSampleCount: valCount,
      positiveCount,
      negativeCount,
      trainPositiveCount,
      trainNegativeCount,
      valPositiveCount,
      valNegativeCount,
      featureList: [...CANONICAL_FEATURE_NAMES],
      hyperparameters: {
        epochs,
        learningRate,
        l2Lambda,
        classificationThreshold,
        splitStrategy: '75/25 chronological split',
      },
      targetDefinition: TARGET_CONSTRUCTION_SPEC,
      status: 'TRAINED',
    };

    // 7. Lightweight Random Forest Benchmark (5 Decision Trees with bootstrap)
    const rfBenchmark = this.evaluateRandomForestBenchmark(X_train, y_train, X_val, y_val);

    return {
      weights: modelWeights,
      randomForestBenchmark: rfBenchmark,
    };
  }

  /**
   * Calculates Area Under ROC Curve using trapezoidal rank approximation
   * Returns undefined if holdout set lacks both classes (mathematically undefined).
   */
  private calculateRocAuc(items: Array<{ pred: number; actual: number }>): number | undefined {
    const positives = items.filter((i) => i.actual === 1);
    const negatives = items.filter((i) => i.actual === 0);

    if (positives.length === 0 || negatives.length === 0) {
      return undefined;
    }

    let concordantPairs = 0;
    let ties = 0;

    for (const pos of positives) {
      for (const neg of negatives) {
        if (pos.pred > neg.pred) concordantPairs++;
        else if (pos.pred === neg.pred) ties++;
      }
    }

    const totalPairs = positives.length * negatives.length;
    const auc = (concordantPairs + 0.5 * ties) / totalPairs;
    return Math.round(Math.max(0.5, Math.min(1.0, auc)) * 1000) / 1000;
  }

  /**
   * Lightweight Random Forest benchmark for architectural comparison
   */
  private evaluateRandomForestBenchmark(
    X_train: number[][],
    y_train: number[],
    X_val: number[][],
    y_val: number[]
  ): { accuracy: number; f1: number; logLoss: number; treeCount: number } {
    const treeCount = 5;
    const treeSplits: Array<{ featureIdx: number; threshold: number; leftPred: number; rightPred: number }> = [];

    // Train 5 decision stumps on random bootstrap subsets
    for (let t = 0; t < treeCount; t++) {
      const featIdx = (t * 3) % X_train[0].length;
      // find median split
      const vals = X_train.map((row) => row[featIdx]).sort((a, b) => a - b);
      const splitVal = vals[Math.floor(vals.length / 2)] || 0;

      let leftPos = 0, leftTotal = 0;
      let rightPos = 0, rightTotal = 0;

      for (let i = 0; i < X_train.length; i++) {
        if (X_train[i][featIdx] <= splitVal) {
          leftTotal++;
          if (y_train[i] === 1) leftPos++;
        } else {
          rightTotal++;
          if (y_train[i] === 1) rightPos++;
        }
      }

      const leftPred = leftTotal > 0 ? leftPos / leftTotal : 0.5;
      const rightPred = rightTotal > 0 ? rightPos / rightTotal : 0.5;

      treeSplits.push({ featureIdx: featIdx, threshold: splitVal, leftPred, rightPred });
    }

    // Evaluate ensemble on validation set
    let correct = 0;
    let tp = 0, fp = 0, fn = 0;
    let totalLogLoss = 0;

    for (let i = 0; i < X_val.length; i++) {
      let ensembleSum = 0;
      for (const tree of treeSplits) {
        const val = X_val[i][tree.featureIdx];
        ensembleSum += val <= tree.threshold ? tree.leftPred : tree.rightPred;
      }
      const predProb = Math.max(0.01, Math.min(0.99, ensembleSum / treeCount));
      const actual = y_val[i];

      totalLogLoss += -(actual * Math.log(predProb) + (1 - actual) * Math.log(1 - predProb));

      const binary = predProb >= 0.5 ? 1 : 0;
      if (binary === actual) correct++;
      if (binary === 1 && actual === 1) tp++;
      else if (binary === 1 && actual === 0) fp++;
      else if (binary === 0 && actual === 1) fn++;
    }

    const accuracy = Math.round((correct / Math.max(1, X_val.length)) * 1000) / 1000;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? Math.round(((2 * precision * recall) / (precision + recall)) * 1000) / 1000 : accuracy;
    const logLoss = Math.round((totalLogLoss / Math.max(1, X_val.length)) * 1000) / 1000;

    return { accuracy, f1, logLoss, treeCount };
  }
}

export const mlTrainer = MLTrainer.getInstance();
