import { store } from '../src/server/db/store.js';
import { mlFeedbackEngine } from '../src/server/engine/mlFeedbackEngine.js';
import { mlInferenceEngine } from '../src/server/engine/mlInferenceEngine.js';
import { mlFeatureExtractor } from '../src/server/engine/mlFeatureExtractor.js';
import { bktEngine, DEFAULT_BKT_CONFIG } from '../src/server/engine/bktEngine.js';
import { computeHybridMastery } from '../src/server/engine/masteryEngine.js';
import { calculateRetention } from '../src/server/engine/retentionEngine.js';
import { selectNextAction } from '../src/server/engine/decisionEngine.js';

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, msg: string) {
  totalCount++;
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    process.exit(1);
  }
  passedCount++;
  console.log(`[PASS] ${msg}`);
}

console.log('====================================================');
console.log('MASTERYFLOW PHASE 6 ML TEST SUITE');
console.log('CONTINUOUS LEARNING, MODEL EVALUATION & FEEDBACK LOOP');
console.log('====================================================\n');

// ----------------------------------------------------
// 1. PREDICTION LOGGING & FROZEN FEATURE SNAPSHOT INTEGRITY
// ----------------------------------------------------
console.log('--- TEST GROUP 1: PREDICTION LOGGING & FROZEN SNAPSHOT ---');
const testPredTime = '2026-09-20T10:00:00Z';
const dummyFeatures = mlFeatureExtractor.extractFeatures('student_a', 'arrays');
const loggedPred = mlFeedbackEngine.logPrediction({
  learnerId: 'test_learner_1',
  conceptId: 'arrays',
  predictedProbability: 0.725,
  predictedCategory: 'Strong',
  confidence: 0.85,
  featureSnapshot: dummyFeatures.raw,
  normalizedSnapshot: dummyFeatures.normalized,
  modelVersion: 'logreg-prod-v1.0',
  predictedAt: testPredTime,
});

assert(loggedPred.predictionId.startsWith('pred_'), 'Prediction ID is generated with proper prefix.');
assert(loggedPred.evaluationStatus === 'pending', 'Logged prediction has initial status "pending".');
assert(loggedPred.predictedProbability === 0.725, 'Probability correctly logged.');
assert(loggedPred.actualOutcome === undefined, 'Actual outcome is undefined at prediction time T.');
assert(Object.keys(loggedPred.featureSnapshot).length === 16, 'Frozen raw feature snapshot contains all 16 canonical features.');
assert(Object.keys(loggedPred.normalizedSnapshot).length === 16, 'Frozen normalized snapshot contains all 16 canonical features.');

// Mutate dummyFeatures to verify immutability of logged record
dummyFeatures.raw.overallAccuracy = 0.01;
assert(loggedPred.featureSnapshot.overallAccuracy !== 0.01, 'Feature snapshot is immutable and unaffected by subsequent external mutations.');

// ----------------------------------------------------
// 2. TARGET LABEL CONSTRUCTION & ONLINE EVALUATION
// ----------------------------------------------------
console.log('\n--- TEST GROUP 2: TARGET LABEL CONSTRUCTION & ONLINE EVALUATION ---');
// A subsequent independent correct attempt at T_future > T_pred
const futureTime1 = '2026-09-20T10:30:00Z';
const evaluatedCount = mlFeedbackEngine.evaluatePendingPredictions({
  learnerId: 'test_learner_1',
  conceptId: 'arrays',
  isCorrect: true,
  antiGuessingTriggered: false,
  confidence: 0.9,
  responseTimeSeconds: 15,
  timestamp: futureTime1,
  attemptId: 'att_test_eval_1',
  source: 'attempt',
});

assert(evaluatedCount >= 1, 'Pending prediction evaluated upon subsequent independent attempt.');
assert(loggedPred.evaluationStatus === 'evaluated', 'Prediction status transitioned from "pending" to "evaluated".');
assert(loggedPred.actualOutcome === 1, 'Target label correctly constructed as 1 for independent correct attempt.');
assert(loggedPred.evaluatedAt === futureTime1, 'Evaluated timestamp accurately recorded.');
assert(loggedPred.outcomeSource === 'attempt', 'Outcome source accurately tracked as "attempt".');

// Anti-guessing target penalty test: correct answer flagged by anti-guessing becomes target 0
const loggedPred2 = mlFeedbackEngine.logPrediction({
  learnerId: 'test_learner_2',
  conceptId: 'recursion',
  predictedProbability: 0.65,
  predictedCategory: 'Developing',
  confidence: 0.70,
  featureSnapshot: dummyFeatures.raw,
  normalizedSnapshot: dummyFeatures.normalized,
  modelVersion: 'logreg-prod-v1.0',
  predictedAt: '2026-09-20T11:00:00Z',
});

mlFeedbackEngine.evaluatePendingPredictions({
  learnerId: 'test_learner_2',
  conceptId: 'recursion',
  isCorrect: true,
  antiGuessingTriggered: true, // Anti-guessing triggered!
  confidence: 0.95,
  responseTimeSeconds: 2,
  timestamp: '2026-09-20T11:15:00Z',
  source: 'attempt',
});

assert(loggedPred2.evaluationStatus === 'evaluated', 'Guessing prediction transitioned to "evaluated".');
assert(loggedPred2.actualOutcome === 0, 'Target label correctly penalized to 0 when anti-guessing heuristic is triggered.');

// ----------------------------------------------------
// 3. STRICT TEMPORAL INTEGRITY & ZERO TARGET LEAKAGE
// ----------------------------------------------------
console.log('\n--- TEST GROUP 3: STRICT TEMPORAL LEAKAGE PREVENTION ---');
// Attempt at T_past < T_pred should NEVER evaluate a future prediction
const futurePredTime = '2026-09-21T12:00:00Z';
const loggedPredFuture = mlFeedbackEngine.logPrediction({
  learnerId: 'test_learner_temporal',
  conceptId: 'gate_toc',
  predictedProbability: 0.80,
  predictedCategory: 'Strong',
  confidence: 0.85,
  featureSnapshot: dummyFeatures.raw,
  normalizedSnapshot: dummyFeatures.normalized,
  modelVersion: 'logreg-prod-v1.0',
  predictedAt: futurePredTime,
});

// Outcome occurring BEFORE futurePredTime (e.g. 1 hour earlier)
const pastOutcomeTime = '2026-09-21T11:00:00Z';
const pastEvalCount = mlFeedbackEngine.evaluatePendingPredictions({
  learnerId: 'test_learner_temporal',
  conceptId: 'gate_toc',
  isCorrect: true,
  timestamp: pastOutcomeTime,
  source: 'attempt',
});

assert(pastEvalCount === 0, 'Past outcome (T_outcome < T_pred) does NOT evaluate a future prediction.');
assert(loggedPredFuture.evaluationStatus === 'pending', 'Future prediction remains pending; temporal leakage strictly prevented.');

// ----------------------------------------------------
// 4. MODEL PERFORMANCE METRICS CALCULATION
// ----------------------------------------------------
console.log('\n--- TEST GROUP 4: MODEL PERFORMANCE METRICS ---');
const metricsReport = mlFeedbackEngine.calculateEvaluationMetrics(0.50);

assert(metricsReport.status === 'READY' || metricsReport.status === 'PARTIALLY_READY', 'Evaluation report status is operational.');
assert(typeof metricsReport.accuracy === 'number', `Accuracy computed: ${metricsReport.accuracy}`);
assert(metricsReport.accuracy! >= 0 && metricsReport.accuracy! <= 1, 'Accuracy is in [0, 1].');
assert(typeof metricsReport.precision === 'number', `Precision computed: ${metricsReport.precision}`);
assert(typeof metricsReport.recall === 'number', `Recall computed: ${metricsReport.recall}`);
assert(typeof metricsReport.f1 === 'number', `F1 computed: ${metricsReport.f1}`);
assert(typeof metricsReport.logLoss === 'number' && !isNaN(metricsReport.logLoss!), `Log Loss computed: ${metricsReport.logLoss}`);
assert(typeof metricsReport.brierScore === 'number' && !isNaN(metricsReport.brierScore!), `Brier score computed: ${metricsReport.brierScore}`);
assert(metricsReport.confusionMatrix !== undefined, 'Confusion matrix generated.');
assert(
  metricsReport.confusionMatrix!.tp +
  metricsReport.confusionMatrix!.fp +
  metricsReport.confusionMatrix!.tn +
  metricsReport.confusionMatrix!.fn === metricsReport.evaluatedSampleCount,
  'Confusion matrix totals equal evaluated sample count.'
);

// ----------------------------------------------------
// 5. INSUFFICIENT DATA SAFETY (NEVER FABRICATE)
// ----------------------------------------------------
console.log('\n--- TEST GROUP 5: INSUFFICIENT DATA INTEGRITY ---');
// Temporarily simulate empty records
const originalRecords = store.predictionRecords;
store.predictionRecords = [];

const emptyReport = mlFeedbackEngine.calculateEvaluationMetrics();
assert(emptyReport.status === 'INSUFFICIENT_DATA', 'Returns INSUFFICIENT_DATA when sample count < 5.');
assert(emptyReport.accuracy === undefined, 'Accuracy is strictly undefined when data is insufficient (never fabricated).');
assert(emptyReport.logLoss === undefined, 'LogLoss is strictly undefined when data is insufficient.');
assert(emptyReport.f1 === undefined, 'F1 score is strictly undefined when data is insufficient.');
assert(emptyReport.rocAuc === undefined, 'ROC-AUC is strictly undefined when data is insufficient.');

// Restore records
store.predictionRecords = originalRecords;

// ----------------------------------------------------
// 6. CALIBRATION MONITORING
// ----------------------------------------------------
console.log('\n--- TEST GROUP 6: CALIBRATION MONITORING ---');
assert(metricsReport.calibration.bins.length === 5, 'Calibration curve partitions probabilities into 5 standard bins.');
const populatedBins = metricsReport.calibration.bins.filter((b) => b.sampleCount > 0);
assert(populatedBins.length > 0, 'Populated bins exist in calibration diagnostic.');
for (const bin of populatedBins) {
  assert(bin.meanPredictedProbability !== undefined, `Bin ${bin.binRange} mean predicted prob exists.`);
  assert(bin.observedPositiveFrequency !== undefined, `Bin ${bin.binRange} observed positive freq exists.`);
  assert(bin.calibrationGap !== undefined, `Bin ${bin.binRange} calibration gap exists.`);
}

// ----------------------------------------------------
// 7. DATA QUALITY MONITORING
// ----------------------------------------------------
console.log('\n--- TEST GROUP 7: DATA QUALITY MONITORING ---');
assert(metricsReport.dataQuality.leakageFree === true, 'Zero temporal leakage verified in evaluation records.');
assert(metricsReport.dataQuality.validSamplesCount > 0, 'Valid samples count > 0.');
assert(metricsReport.dataQuality.invalidSamplesCount === 0, 'Zero invalid/corrupted samples detected in database.');

// ----------------------------------------------------
// 8. MODEL REGISTRY & VERSIONING
// ----------------------------------------------------
console.log('\n--- TEST GROUP 8: MODEL REGISTRY & VERSIONING ---');
assert(store.modelRegistry.has('logreg-prod-v1.0'), 'Production model "logreg-prod-v1.0" registered.');
const prodEntry = store.modelRegistry.get('logreg-prod-v1.0')!;
assert(prodEntry.lifecycleState === 'production', 'Production model lifecycle state is "production".');
assert(prodEntry.weights !== undefined, 'Production model weights exist.');
assert(prodEntry.scaler !== undefined, 'Production model scaler exists.');

// ----------------------------------------------------
// 9. CONTROLLED RETRAINING & CANDIDATE MODEL CREATION
// ----------------------------------------------------
console.log('\n--- TEST GROUP 9: CANDIDATE MODEL CREATION & COMPARISON ---');
const eligibility = mlFeedbackEngine.checkRetrainingEligibility();
assert(eligibility.eligible === true, 'Retraining prerequisites satisfied with current evaluated sample count.');

const candidateResult = mlFeedbackEngine.trainCandidateModel({ epochs: 150 });
assert(candidateResult.success === true, 'Candidate model trained successfully on chronological split.');
assert(candidateResult.candidate !== undefined, 'Candidate model object returned.');
const candidate = candidateResult.candidate!;
assert(candidate.lifecycleState === 'candidate', 'New model state is strictly "candidate" (NOT automatically production).');
assert(candidate.candidateComparison !== undefined, 'Candidate comparison with production model generated.');
assert(typeof candidate.candidateComparison!.logLossDiff === 'number', `LogLoss diff: ${candidate.candidateComparison!.logLossDiff}`);
assert(typeof candidate.candidateComparison!.promotable === 'boolean', `Promotable flag: ${candidate.candidateComparison!.promotable}`);

// ----------------------------------------------------
// 10. SAFE MODEL PROMOTION & ROLLBACK
// ----------------------------------------------------
console.log('\n--- TEST GROUP 10: SAFE PROMOTION & ROLLBACK ---');
const initialProdVersion = mlInferenceEngine.getActiveModelWeights().modelVersion;

const promoteResult = mlFeedbackEngine.promoteCandidateModel(candidate.modelVersion, 'Dr. Vance (TEACHER)', 'Verified superior holdout validation.');
assert(promoteResult.success === true, 'Candidate successfully promoted to production.');
assert(mlInferenceEngine.getActiveModelWeights().modelVersion === candidate.modelVersion, 'Active inference engine updated to new production model version.');

const retiredOld = store.modelRegistry.get(initialProdVersion)!;
assert(retiredOld.lifecycleState === 'retired', 'Previous production model archived to "retired" state.');

// Test rollback
const rollbackResult = mlFeedbackEngine.rollbackToModel(initialProdVersion, 'Admin System');
assert(rollbackResult.success === true, 'Rollback to previous model succeeded.');
assert(mlInferenceEngine.getActiveModelWeights().modelVersion === initialProdVersion, 'Active inference engine reverted to previous model version.');

// ----------------------------------------------------
// 11. FEATURE DRIFT MONITORING
// ----------------------------------------------------
console.log('\n--- TEST GROUP 11: FEATURE DRIFT MONITORING ---');
const driftReport = mlFeedbackEngine.detectFeatureDrift();
assert(driftReport.status === 'NORMAL' || driftReport.status === 'WARNING', 'Feature drift diagnostic operational.');
assert(Object.keys(driftReport.currentMeans).length === 16, 'Current feature means monitored for all 16 canonical features.');
assert(typeof driftReport.maxDriftZShift === 'number', `Max drift z-shift: ${driftReport.maxDriftZShift}`);

// ----------------------------------------------------
// 12. RECOMMENDATION OUTCOME TRACKING
// ----------------------------------------------------
console.log('\n--- TEST GROUP 12: RECOMMENDATION OUTCOME TRACKING ---');
const recEff = mlFeedbackEngine.calculateRecommendationEffectiveness();
assert(recEff.totalTracked > 0, `Total recommendations tracked: ${recEff.totalTracked}`);
assert(recEff.byAction.PRACTICE !== undefined, 'Practice recommendations monitored.');
assert(recEff.byAction.REVIEW !== undefined, 'Review recommendations monitored.');
assert(recEff.byAction.ADVANCE !== undefined, 'Advance recommendations monitored.');
assert(recEff.byAction.REMEDIATE_PREREQUISITE !== undefined, 'Remediate prerequisite recommendations monitored.');
assert(recEff.byAction.ADVANCE.observationalSummary.includes('Observed'), 'Recommendation summary adheres to non-causal observational phrasing.');

// ----------------------------------------------------
// 13. REGRESSION CHECK: PHASES 1-5 FUNCTIONALITY
// ----------------------------------------------------
console.log('\n--- TEST GROUP 13: PHASES 1-5 REGRESSION CHECK ---');
// BKT check
const bktInit = bktEngine.createInitialState('arrays', DEFAULT_BKT_CONFIG);
const bktStep = bktEngine.step(bktInit, true, new Date().toISOString(), 'att_reg_1');
assert(bktStep.pKnowledge > bktInit.pKnowledge, 'Phase 1 BKT: Correct response increases knowledge probability.');

// Retention FSFR check
const retVal = calculateRetention(0.80, 5, 0.05);
assert(retVal < 0.80 && retVal > 0, 'Phase 3 FSFR: Retention decays over 5 days.');

// Hybrid Mastery check
const hybrid = computeHybridMastery(0.70, 0.80, store.config, bktStep.pKnowledge);
assert(hybrid > 0 && hybrid < 1.0 && typeof hybrid === 'number', 'Phase 4 Hybrid: Mastery blends Bayesian + BKT + ML.');

// Recommendation Decision Engine check
const learnerA = store.learners.get('student_a')!;
const decision = selectNextAction(learnerA, store.concepts, store.config);
assert(['ADVANCE', 'PRACTICE', 'REVIEW', 'CHALLENGE', 'REMEDIATE_PREREQUISITE', 'TEACHER_INTERVENTION'].includes(decision.action), 'Phase 5 Decision: Valid recommendation generated.');

console.log('\n====================================================');
console.log(`ALL PHASE 6 ML TESTS PASSED: ${passedCount} / ${totalCount} (100% SUCCESS)`);
console.log('====================================================\n');
