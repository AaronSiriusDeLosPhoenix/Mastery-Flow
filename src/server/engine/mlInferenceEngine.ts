import { store } from '../db/store.js';
import {
  CANONICAL_FEATURE_NAMES,
  DEFAULT_FEATURE_SCALER,
  mlFeatureExtractor,
} from './mlFeatureExtractor.js';
import { mlTrainer } from './mlTrainer.js';
import {
  MLEngineConfig,
  MLFeatureVector,
  MLModelWeights,
  MLPredictionResult,
} from '../db/types.js';

export class MLInferenceEngine {
  private static instance: MLInferenceEngine;
  private currentWeights: MLModelWeights | null = null;

  public static getInstance(): MLInferenceEngine {
    if (!MLInferenceEngine.instance) {
      MLInferenceEngine.instance = new MLInferenceEngine();
    }
    return MLInferenceEngine.instance;
  }

  /**
   * Retrieves active model weights from memory, database store, or baseline fallback.
   */
  public getActiveModelWeights(): MLModelWeights {
    if (this.currentWeights) {
      return this.currentWeights;
    }

    // Check store / persistence
    if (store.mlModelWeights) {
      this.currentWeights = store.mlModelWeights;
      return this.currentWeights;
    }

    // Initialize using real historical dataset training via mlTrainer
    const trainResult = mlTrainer.train();
    if (trainResult && trainResult.weights) {
      this.currentWeights = trainResult.weights;
      store.mlModelWeights = trainResult.weights;
      return trainResult.weights;
    }

    // Baseline fallback if dataset is empty (never invent fake metrics)
    const baselineWeights = mlTrainer.getBaselineWeights();
    const defaultModel: MLModelWeights = {
      weights: baselineWeights,
      bias: -0.15,
      scaler: DEFAULT_FEATURE_SCALER,
      trainedAt: new Date().toISOString(),
      modelVersion: 'logreg-baseline-v1.0',
      validationMetrics: {},
      sampleCount: 0,
      validationSampleCount: 0,
      status: 'FALLBACK',
    };

    this.currentWeights = defaultModel;
    store.mlModelWeights = defaultModel;
    return defaultModel;
  }

  /**
   * Sets new trained weights into the active inference engine and store.
   */
  public setModelWeights(weights: MLModelWeights): void {
    this.currentWeights = weights;
    store.mlModelWeights = weights;
    store.schedulePersist();
  }

  /**
   * Computes P(concept mastery) using calibrated Logistic Regression.
   * Deterministic, safe from NaN, with explainable feature impacts.
   */
  public predict(
    learnerId: string,
    conceptId: string,
    options?: {
      precomputedFeatures?: MLFeatureVector;
      customConfig?: MLEngineConfig;
    }
  ): MLPredictionResult {
    const model = this.getActiveModelWeights();
    const config = options?.customConfig || store.config.mlConfig || {
      enabled: true,
      weight: 0.30,
      thresholds: {
        weakMax: 0.39,
        developingMax: 0.69,
        strongMax: 0.84,
        masteredMin: 0.85,
      },
    };

    // 1. Extract or receive canonical features
    const features =
      options?.precomputedFeatures ||
      mlFeatureExtractor.extractFeatures(learnerId, conceptId, {
        customScaler: model.scaler,
      });

    // 2. Compute Linear Combination: z = bias + sum(w_i * x_normalized_i)
    let z = model.bias;
    const featureImpacts: Array<{
      name: string;
      impact: number;
      raw: number;
      direction: 'positive' | 'negative';
    }> = [];

    for (const name of CANONICAL_FEATURE_NAMES) {
      const normVal = features.normalized[name] ?? 0;
      const rawVal = features.raw[name] ?? 0;
      const weight = model.weights[name] ?? 0;

      const impact = weight * normVal;
      z += impact;

      featureImpacts.push({
        name,
        impact: Math.round(impact * 1000) / 1000,
        raw: Math.round(rawVal * 1000) / 1000,
        direction: impact >= 0 ? 'positive' : 'negative',
      });
    }

    // 3. Sigmoid Activation: P(mastery) = 1 / (1 + exp(-z))
    const rawProbability = mlTrainer.sigmoid(z);
    // Safe clamp to [0.01, 0.99] to prevent extreme calibration artifacts
    const probability = Math.round(Math.max(0.01, Math.min(0.99, rawProbability)) * 1000) / 1000;

    // 4. Model Confidence / Epistemic Calibration
    // Predictions far from 0.5 (uncertain decision boundary) have higher statistical confidence
    const distanceToBoundary = Math.abs(probability - 0.5);
    const confidence = Math.round(Math.min(0.98, 0.60 + distanceToBoundary * 0.76) * 1000) / 1000;

    // 5. Categorize based on configurable thresholds
    let category: MLPredictionResult['category'] = 'Developing';
    const t = config.thresholds;
    if (probability <= t.weakMax) {
      category = 'Weak';
    } else if (probability <= t.developingMax) {
      category = 'Developing';
    } else if (probability <= t.strongMax) {
      category = 'Strong';
    } else {
      category = 'Mastered';
    }

    // 6. Sort top contributing features by absolute impact
    featureImpacts.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    const topContributingFeatures = featureImpacts.slice(0, 5);

    // 7. Calculate hybrid mastery blending with existing Bayesian mastery
    const learner = store.learners.get(learnerId);
    const existingBayesian = learner?.conceptMasteries[conceptId]?.mastery ?? 0.20;
    const mlWeight = config.enabled ? config.weight : 0.0;
    const hybridMastery = Math.round(
      ((1 - mlWeight) * existingBayesian + mlWeight * probability) * 1000
    ) / 1000;

    return {
      probability,
      confidence,
      category,
      modelVersion: model.modelVersion,
      predictedAt: new Date().toISOString(),
      topContributingFeatures,
      hybridMastery,
    };
  }
}

export const mlInferenceEngine = MLInferenceEngine.getInstance();
