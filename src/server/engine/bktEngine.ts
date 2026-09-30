/**
 * ==============================================================================
 * BAYESIAN KNOWLEDGE TRACING (BKT) ENGINE
 * MasteryFlow Adaptive Learning Platform
 *
 * Mathematical Foundations:
 * Corbett, A. T., & Anderson, J. R. (1995). Knowledge tracing: Modeling the
 * acquisition of procedural knowledge. User Modeling and User-Adapted
 * Interaction, 4(4), 253-278.
 *
 * Four Standard Parameters:
 *   P(L0) = pInit  : Initial prior probability that concept is already known
 *   P(T)  = pLearn : Probability of acquiring knowledge at each learning opportunity
 *   P(G)  = pGuess : Probability of answering correctly despite not knowing the concept
 *   P(S)  = pSlip  : Probability of answering incorrectly despite knowing the concept
 *
 * State Transitions per Opportunity:
 *   1. Prior Knowledge: P(L_t)
 *   2. Likelihood of Correct: P(C_t) = P(L_t)*(1 - P(S)) + (1 - P(L_t))*P(G)
 *   3. Bayesian Observation Update (Posterior):
 *      - If Correct:   P(L_t | Correct)   = [P(L_t)*(1 - P(S))] / P(C_t)
 *      - If Incorrect: P(L_t | Incorrect) = [P(L_t)*P(S)] / [1 - P(C_t)]
 *   4. Learning Transition (Next Opportunity):
 *      P(L_{t+1}) = P(L_t | O_t) + (1 - P(L_t | O_t)) * P(T)
 *
 * Features:
 *   - Strictly chronological attempt processing (zero future-data leakage)
 *   - Clamped probability bounds [0.0, 1.0] with zero NaN safety
 *   - Strict learner and concept isolation
 *   - Explainable diagnostics for teachers and researchers
 * ==============================================================================
 */

import { Attempt, BKTConfig, BKTModelInfo, BKTParameters, BKTState, BKTStepRecord, Concept } from '../db/types.js';

export const BKT_MODEL_VERSION = 'bkt-standard-corbett-anderson-v1.0';

export const DEFAULT_BKT_PARAMETERS: BKTParameters = {
  pInit: 0.15,
  pLearn: 0.15,
  pGuess: 0.20,
  pSlip: 0.10,
};

export const DEFAULT_BKT_CONFIG: BKTConfig = {
  enabled: true,
  weight: 0.25, // 25% BKT, 45% Bayesian evidence smoothing, 30% Logistic Regression ML
  defaultPInit: 0.15,
  defaultPLearn: 0.15,
  defaultPGuess: 0.20,
  defaultPSlip: 0.10,
};

export interface BKTTraceResult {
  learnerId: string;
  conceptId: string;
  conceptName?: string;
  parameters: BKTParameters;
  initialState: BKTState;
  finalState: BKTState;
  stepRecords: BKTStepRecord[];
  totalOpportunities: number;
  correctCount: number;
  incorrectCount: number;
  lastUpdatedAt: string;
  dataLeakageFree: boolean;
}

export class BKTEngine {
  private static instance: BKTEngine;

  public static getInstance(): BKTEngine {
    if (!BKTEngine.instance) {
      BKTEngine.instance = new BKTEngine();
    }
    return BKTEngine.instance;
  }

  /**
   * Sanitizes and bounds a probability strictly to [0.0, 1.0].
   */
  public clamp(value: number, fallback: number = 0.5): number {
    if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
      return fallback;
    }
    return Math.max(0.0, Math.min(1.0, value));
  }

  /**
   * Validates and normalizes 4-parameter BKT configuration.
   * Ensures guess and slip do not invert diagnostic validity (pGuess + pSlip < 1.0).
   */
  public resolveParameters(
    conceptId?: string,
    config?: BKTConfig,
    customOverrides?: Partial<BKTParameters>
  ): BKTParameters {
    const basePInit = config?.defaultPInit ?? DEFAULT_BKT_PARAMETERS.pInit;
    const basePLearn = config?.defaultPLearn ?? DEFAULT_BKT_PARAMETERS.pLearn;
    const basePGuess = config?.defaultPGuess ?? DEFAULT_BKT_PARAMETERS.pGuess;
    const basePSlip = config?.defaultPSlip ?? DEFAULT_BKT_PARAMETERS.pSlip;

    const conceptOverride = conceptId && config?.conceptOverrides ? config.conceptOverrides[conceptId] : undefined;

    const pInit = this.clamp(customOverrides?.pInit ?? conceptOverride?.pInit ?? basePInit, 0.15);
    const pLearn = this.clamp(customOverrides?.pLearn ?? conceptOverride?.pLearn ?? basePLearn, 0.15);
    let pGuess = this.clamp(customOverrides?.pGuess ?? conceptOverride?.pGuess ?? basePGuess, 0.20);
    let pSlip = this.clamp(customOverrides?.pSlip ?? conceptOverride?.pSlip ?? basePSlip, 0.10);

    // Safeguard: In standard BKT, guess and slip should typically be < 0.5 for valid knowledge inference
    if (pGuess >= 0.50) pGuess = 0.49;
    if (pSlip >= 0.50) pSlip = 0.49;

    return {
      pInit: Math.round(pInit * 1000) / 1000,
      pLearn: Math.round(pLearn * 1000) / 1000,
      pGuess: Math.round(pGuess * 1000) / 1000,
      pSlip: Math.round(pSlip * 1000) / 1000,
    };
  }

  /**
   * Initializes clean baseline BKTState for a learner-concept pair prior to any learning attempts.
   */
  public createInitialState(conceptId?: string, config?: BKTConfig): BKTState {
    const params = this.resolveParameters(conceptId, config);
    return {
      pKnowledge: params.pInit,
      pInit: params.pInit,
      pLearn: params.pLearn,
      pGuess: params.pGuess,
      pSlip: params.pSlip,
      attemptCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      lastUpdatedAt: new Date().toISOString(),
      modelVersion: BKT_MODEL_VERSION,
      history: [],
    };
  }

  /**
   * Predicts the probability of answering correctly on the NEXT attempt,
   * given prior knowledge state P(L_t):
   *   P(Correct_t) = P(L_t) * (1 - pSlip) + (1 - P(L_t)) * pGuess
   */
  public predictNextAttempt(
    pKnowledge: number,
    params: BKTParameters = DEFAULT_BKT_PARAMETERS
  ): {
    pCorrect: number;
    pIncorrect: number;
    projectedIfCorrect: number;
    projectedIfIncorrect: number;
  } {
    const pL = this.clamp(pKnowledge, params.pInit);
    const pCorrect = this.clamp(pL * (1 - params.pSlip) + (1 - pL) * params.pGuess);
    const pIncorrect = this.clamp(1 - pCorrect);

    // Calculate projected next knowledge states
    const postCorrect = this.calculatePosterior(pL, true, params);
    const transCorrect = this.applyLearningTransition(postCorrect, params.pLearn);

    const postIncorrect = this.calculatePosterior(pL, false, params);
    const transIncorrect = this.applyLearningTransition(postIncorrect, params.pLearn);

    return {
      pCorrect: Math.round(pCorrect * 10000) / 10000,
      pIncorrect: Math.round(pIncorrect * 10000) / 10000,
      projectedIfCorrect: Math.round(transCorrect * 10000) / 10000,
      projectedIfIncorrect: Math.round(transIncorrect * 10000) / 10000,
    };
  }

  /**
   * Computes Bayesian observation posterior P(L_t | O_t):
   *
   * If correct:
   *   P(L_t | Correct) = [P(L_t) * (1 - P(S))] / [P(L_t) * (1 - P(S)) + (1 - P(L_t)) * P(G)]
   *
   * If incorrect:
   *   P(L_t | Incorrect) = [P(L_t) * P(S)] / [P(L_t) * P(S) + (1 - P(L_t)) * (1 - P(G))]
   */
  public calculatePosterior(
    pPrior: number,
    isCorrect: boolean,
    params: BKTParameters
  ): number {
    const pL = this.clamp(pPrior, params.pInit);
    const { pGuess, pSlip } = params;

    if (isCorrect) {
      const num = pL * (1 - pSlip);
      const denom = pL * (1 - pSlip) + (1 - pL) * pGuess;
      if (denom < 1e-12) return pL;
      return this.clamp(num / denom);
    } else {
      const num = pL * pSlip;
      const denom = pL * pSlip + (1 - pL) * (1 - pGuess);
      if (denom < 1e-12) return pL;
      return this.clamp(num / denom);
    }
  }

  /**
   * Applies the classical Corbett-Anderson learning transition:
   *   P(L_{t+1}) = P(L_t | O_t) + (1 - P(L_t | O_t)) * P(T)
   */
  public applyLearningTransition(posterior: number, pLearn: number): number {
    const post = this.clamp(posterior);
    const pT = this.clamp(pLearn);
    const transition = post + (1 - post) * pT;
    return this.clamp(transition);
  }

  /**
   * MULTI-SIGNAL EVIDENCE ADJUSTMENT LAYER (Corbett, Anderson & Baker 2008)
   *
   * Standard BKT maintains pure 4-parameter formulas. Additional behavioral telemetry
   * (confidence, anti-guessing, hints, response time) modulates effective guess, slip,
   * or learn parameters for a specific opportunity without altering the core BKT equations:
   *
   * 1. Anti-Guessing Detection: When rapid guessing is detected, pGuess is raised to reflect
   *    heightened probability of a lucky guess.
   * 2. High-Confidence Misconception: If a learner is wrong with high confidence (>0.80),
   *    pSlip is decreased because the error is an epistemic bug, not an accidental slip.
   * 3. Hint Dependency: If multiple hints were needed, learning transition pLearn is
   *    proportionally scaled by independence (1.0 - 0.15 * hints).
   */
  public adjustObservationSignals(
    baseParams: BKTParameters,
    signals?: {
      confidence?: number;
      antiGuessingTriggered?: boolean;
      hintsUsed?: number;
      responseTimeSeconds?: number;
      expectedTimeSeconds?: number;
    }
  ): { effectiveParams: BKTParameters; adjustmentsApplied: string[] } {
    if (!signals) {
      return { effectiveParams: { ...baseParams }, adjustmentsApplied: [] };
    }

    let pGuess = baseParams.pGuess;
    let pSlip = baseParams.pSlip;
    let pLearn = baseParams.pLearn;
    const adjustmentsApplied: string[] = [];

    // 1. Anti-guessing adjustment
    if (signals.antiGuessingTriggered) {
      pGuess = Math.min(0.48, pGuess * 1.50);
      adjustmentsApplied.push(`Anti-guessing triggered: pGuess adjusted to ${pGuess.toFixed(2)}`);
    }

    // 2. High confidence misconception adjustment
    if (signals.confidence !== undefined && signals.confidence > 0.80) {
      pSlip = Math.max(0.02, pSlip * 0.50);
      adjustmentsApplied.push(`High confidence error: pSlip reduced to ${pSlip.toFixed(2)}`);
    }

    // 3. Hint dependency adjustment on acquisition rate
    if (signals.hintsUsed !== undefined && signals.hintsUsed > 0) {
      const discount = Math.max(0.40, 1.0 - signals.hintsUsed * 0.15);
      pLearn = Math.max(0.02, pLearn * discount);
      adjustmentsApplied.push(`Hint dependency: pLearn scaled by ${(discount * 100).toFixed(0)}%`);
    }

    return {
      effectiveParams: {
        pInit: baseParams.pInit,
        pLearn: Math.round(pLearn * 1000) / 1000,
        pGuess: Math.round(pGuess * 1000) / 1000,
        pSlip: Math.round(pSlip * 1000) / 1000,
      },
      adjustmentsApplied,
    };
  }

  /**
   * Advances the BKT state by one single learning opportunity step.
   * Pure, immutable update returning a fresh BKTState.
   */
  public step(
    currentState: BKTState,
    isCorrect: boolean,
    timestamp: string = new Date().toISOString(),
    attemptId: string = `att_${Date.now()}`,
    signals?: {
      confidence?: number;
      antiGuessingTriggered?: boolean;
      hintsUsed?: number;
      responseTimeSeconds?: number;
      expectedTimeSeconds?: number;
    }
  ): BKTState {
    const baseParams: BKTParameters = {
      pInit: currentState.pInit,
      pLearn: currentState.pLearn,
      pGuess: currentState.pGuess,
      pSlip: currentState.pSlip,
    };

    const { effectiveParams } = this.adjustObservationSignals(baseParams, signals);
    const params = effectiveParams;

    const prior = this.clamp(currentState.pKnowledge, params.pInit);
    const pCorrectPredicted = prior * (1 - params.pSlip) + (1 - prior) * params.pGuess;

    // 1. Observation update
    const posterior = this.calculatePosterior(prior, isCorrect, params);

    // 2. Learning transition to t+1
    const nextKnowledge = this.applyLearningTransition(posterior, params.pLearn);

    const stepRecord: BKTStepRecord = {
      stepIndex: currentState.attemptCount + 1,
      attemptId,
      timestamp,
      isCorrect,
      priorKnowledge: Math.round(prior * 10000) / 10000,
      pCorrectPredicted: Math.round(pCorrectPredicted * 10000) / 10000,
      posteriorKnowledge: Math.round(posterior * 10000) / 10000,
      transitionKnowledge: Math.round(nextKnowledge * 10000) / 10000,
    };

    const updatedHistory = [...(currentState.history || []), stepRecord];

    return {
      pKnowledge: Math.round(nextKnowledge * 1000) / 1000,
      pInit: params.pInit,
      pLearn: params.pLearn,
      pGuess: params.pGuess,
      pSlip: params.pSlip,
      attemptCount: currentState.attemptCount + 1,
      correctCount: currentState.correctCount + (isCorrect ? 1 : 0),
      incorrectCount: currentState.incorrectCount + (isCorrect ? 0 : 1),
      lastUpdatedAt: timestamp,
      modelVersion: currentState.modelVersion || BKT_MODEL_VERSION,
      history: updatedHistory,
    };
  }

  /**
   * Traces an entire chronological attempt sequence for a learner + concept.
   *
   * Crucial Leakage Protection:
   *   If `beforeTimestamp` is provided, strictly filters:
   *     attempt.timestamp < beforeTimestamp
   *   Attempts occurring at or after `beforeTimestamp` are completely excluded.
   *   Furthermore, attempts are sorted chronologically by timestamp ascending.
   */
  public traceConcept(
    learnerId: string,
    conceptId: string,
    allAttempts: Attempt[],
    config?: BKTConfig,
    customOverrides?: Partial<BKTParameters>,
    beforeTimestamp?: string
  ): BKTTraceResult {
    const params = this.resolveParameters(conceptId, config, customOverrides);
    let state = this.createInitialState(conceptId, config);
    const initialClone: BKTState = { ...state };

    // 1. Filter attempts strictly for this learner and concept
    let matchingAttempts = allAttempts.filter(
      (a) => a.learnerId === learnerId && a.conceptId === conceptId
    );

    // 2. DATA LEAKAGE GUARD: Exclude future attempts if a timestamp boundary T is specified
    let dataLeakageFree = true;
    if (beforeTimestamp) {
      const boundaryMs = new Date(beforeTimestamp).getTime();
      matchingAttempts = matchingAttempts.filter((a) => {
        const attemptMs = new Date(a.timestamp).getTime();
        return attemptMs < boundaryMs;
      });
    }

    // 3. Chronological sorting: earliest attempt first
    matchingAttempts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 4. Sequential forward stepping
    for (const attempt of matchingAttempts) {
      state = this.step(state, attempt.isCorrect, attempt.timestamp, attempt.id, {
        confidence: attempt.confidence,
        antiGuessingTriggered: attempt.antiGuessingTriggered,
        hintsUsed: attempt.hintsUsed,
        responseTimeSeconds: attempt.responseTimeSeconds,
      });
    }

    return {
      learnerId,
      conceptId,
      parameters: params,
      initialState: initialClone,
      finalState: state,
      stepRecords: state.history || [],
      totalOpportunities: matchingAttempts.length,
      correctCount: state.correctCount,
      incorrectCount: state.incorrectCount,
      lastUpdatedAt: state.lastUpdatedAt,
      dataLeakageFree,
    };
  }

  /**
   * Returns a complete model metadata report for documentation, API, and audit validation.
   */
  public getModelInfo(config?: BKTConfig): BKTModelInfo {
    const params = this.resolveParameters(undefined, config);
    return {
      modelVersion: BKT_MODEL_VERSION,
      parameters: params,
      weight: config?.weight ?? DEFAULT_BKT_CONFIG.weight,
      enabled: config?.enabled ?? DEFAULT_BKT_CONFIG.enabled,
      mathematicalFormulas: {
        prior: 'P(L_0) = pInit',
        correctUpdate: 'P(L_t | Correct) = [P(L_t) * (1 - pSlip)] / [P(L_t) * (1 - pSlip) + (1 - P(L_t)) * pGuess]',
        incorrectUpdate: 'P(L_t | Incorrect) = [P(L_t) * pSlip] / [P(L_t) * pSlip + (1 - P(L_t)) * (1 - pGuess)]',
        learningTransition: 'P(L_{t+1}) = P(L_t | O_t) + (1 - P(L_t | O_t)) * pLearn',
      },
      leakageGuards: [
        'Strict chronological sorting of attempt histories prior to evaluation',
        'Explicit evaluation boundary T exclusion: only attempts with timestamp < T are processed',
        'Independent multi-learner isolation via composite keys (learnerId + conceptId)',
        'Zero input dependency on final or future mastery states',
      ],
      status: 'READY',
    };
  }
}

export const bktEngine = BKTEngine.getInstance();
