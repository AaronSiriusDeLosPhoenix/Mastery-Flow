import { bktEngine, DEFAULT_BKT_PARAMETERS, DEFAULT_BKT_CONFIG } from '../src/server/engine/bktEngine.js';
import { computeHybridMastery } from '../src/server/engine/masteryEngine.js';
import { checkPrerequisites } from '../src/server/engine/prerequisiteEngine.js';
import { Concept, ConceptMastery, Attempt } from '../src/server/db/types.js';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`PASSED: ${msg}`);
}

console.log('========================================================');
console.log('TESTING BAYESIAN KNOWLEDGE TRACING (BKT) ENGINE');
console.log('Corbett & Anderson (1995) 4-Parameter Standard Model');
console.log('========================================================\n');

// 1. Initial State Creation
const initState = bktEngine.createInitialState('arrays', DEFAULT_BKT_CONFIG);
assert(initState.pKnowledge === 0.15, 'Initial knowledge equals pInit (0.15)');
assert(initState.pInit === 0.15, 'pInit is 0.15');
assert(initState.pLearn === 0.15, 'pLearn is 0.15');
assert(initState.pGuess === 0.20, 'pGuess is 0.20');
assert(initState.pSlip === 0.10, 'pSlip is 0.10');
assert(initState.attemptCount === 0, 'Initial attemptCount is 0');

// 2. Correct Observation Update
// P(L_t | Correct) = [P(L_t) * (1 - P(S))] / [P(L_t) * (1 - P(S)) + (1 - P(L_t)) * P(G)]
// = [0.15 * 0.90] / [0.15 * 0.90 + 0.85 * 0.20] = 0.135 / (0.135 + 0.170) = 0.135 / 0.305 = 0.44262
// P(L_{t+1}) = 0.44262 + (1 - 0.44262) * 0.15 = 0.44262 + 0.08361 = 0.52623 -> clamped to ~0.526
const state1 = bktEngine.step(initState, true, '2026-09-01T10:00:00Z', 'att_1');
console.log(`P(Knowledge) after 1 correct attempt: ${state1.pKnowledge}`);
assert(state1.pKnowledge > initState.pKnowledge, 'Correct answer increases knowledge probability');
assert(Math.abs(state1.pKnowledge - 0.526) < 0.01, 'Knowledge probability matches analytical derivation (0.526)');
assert(state1.attemptCount === 1, 'Attempt count incremented to 1');
assert(state1.correctCount === 1, 'Correct count incremented to 1');

// 3. Second Correct Observation Update
const state2 = bktEngine.step(state1, true, '2026-09-01T10:05:00Z', 'att_2');
console.log(`P(Knowledge) after 2 correct attempts: ${state2.pKnowledge}`);
assert(state2.pKnowledge > state1.pKnowledge, 'Second correct answer further increases knowledge probability');

// 4. Third Incorrect Observation Update
const state3 = bktEngine.step(state2, false, '2026-09-01T10:10:00Z', 'att_3');
console.log(`P(Knowledge) after incorrect attempt: ${state3.pKnowledge}`);
assert(state3.pKnowledge < state2.pKnowledge, 'Incorrect answer drops knowledge probability');
assert(state3.incorrectCount === 1, 'Incorrect count incremented to 1');

// 5. Clamping and Robustness
assert(bktEngine.clamp(1.5) === 1.0, 'Probability clamped at upper bound 1.0');
assert(bktEngine.clamp(-0.5) === 0.0, 'Probability clamped at lower bound 0.0');
assert(bktEngine.clamp(NaN, 0.3) === 0.3, 'NaN safely falls back to default');
assert(bktEngine.clamp(Infinity, 0.5) === 0.5, 'Infinity safely falls back to default');

// 6. Chronological Sorting & Strict Zero Future-Data Leakage
const mockAttempts: Attempt[] = [
  {
    id: 'a1',
    learnerId: 'student_test',
    conceptId: 'recursion',
    questionId: 'q_rec_1',
    selectedOptionIndex: 0,
    isCorrect: true,
    confidence: 0.9,
    responseTimeSeconds: 15,
    hintsUsed: 0,
    retries: 0,
    timestamp: '2026-09-01T08:00:00Z',
    evidenceScore: 0.9,
    questionType: 'Recall',
    difficulty: 'easy',
  },
  {
    id: 'a2',
    learnerId: 'student_test',
    conceptId: 'recursion',
    questionId: 'q_rec_2',
    selectedOptionIndex: 0,
    isCorrect: true,
    confidence: 0.85,
    responseTimeSeconds: 18,
    hintsUsed: 0,
    retries: 0,
    timestamp: '2026-09-01T08:30:00Z',
    evidenceScore: 0.85,
    questionType: 'Recall',
    difficulty: 'medium',
  },
  {
    id: 'a3_future',
    learnerId: 'student_test',
    conceptId: 'recursion',
    questionId: 'q_rec_3',
    selectedOptionIndex: 0,
    isCorrect: false,
    confidence: 0.2,
    responseTimeSeconds: 40,
    hintsUsed: 2,
    retries: 1,
    timestamp: '2026-09-01T09:00:00Z', // Future attempt
    evidenceScore: 0.2,
    questionType: 'Recall',
    difficulty: 'hard',
  },
];

// Trace with beforeTimestamp set to '2026-09-01T08:45:00Z' (before attempt 3)
const trace = bktEngine.traceConcept(
  'student_test',
  'recursion',
  mockAttempts,
  DEFAULT_BKT_CONFIG,
  undefined,
  '2026-09-01T08:45:00Z'
);

assert(trace.totalOpportunities === 2, 'Future attempt was completely excluded (total 2 opportunities)');
assert(!trace.stepRecords.some((s) => s.attemptId === 'a3_future'), 'No trace record contains future attempt ID');
assert(trace.dataLeakageFree === true, 'Data leakage free verified');

// 7. Multi-Signal Evidence Adjustment Layer
const adjusted = bktEngine.adjustObservationSignals(DEFAULT_BKT_PARAMETERS, {
  antiGuessingTriggered: true,
  hintsUsed: 2,
  confidence: 0.95,
});
assert(adjusted.effectiveParams.pGuess > DEFAULT_BKT_PARAMETERS.pGuess, 'Anti-guessing elevates effective pGuess');
assert(adjusted.effectiveParams.pLearn < DEFAULT_BKT_PARAMETERS.pLearn, 'Hint dependency discounts effective pLearn');
assert(adjusted.adjustmentsApplied.length >= 2, 'Adjustments transparently documented');

// 8. Hybrid Mastery Integration (Bayesian + BKT + ML)
const hybridMastery = computeHybridMastery(0.70, 0.80, {
  ...DEFAULT_BKT_CONFIG,
  masteryThreshold: 0.75,
  challengeThreshold: 0.88,
  prerequisiteThreshold: 0.70,
  forgettingDecayRate: 0.05,
  uncertaintyThreshold: 0.40,
  interventionThresholdFailures: 3,
  learningRateAlpha: 0.35,
  activeDomainId: 'cs_foundations',
  activeInstitutionId: 'mit_eecs',
  autoApproveScoreThreshold: 85,
  weights: { correctness: 0.45, confidence: 0.2, difficulty: 0.15, responseTime: 0.1, independence: 0.1 },
  mlConfig: { enabled: true, weight: 0.30, thresholds: { weakMax: 0.39, developingMax: 0.69, strongMax: 0.84, masteredMin: 0.85 } },
  bktConfig: { enabled: true, weight: 0.25, defaultPInit: 0.15, defaultPLearn: 0.15, defaultPGuess: 0.20, defaultPSlip: 0.10 },
}, 0.75);

assert(hybridMastery >= 0.70 && hybridMastery <= 0.80, `Hybrid mastery (${hybridMastery}) blends within reasonable range`);

// 9. Prerequisite Gate Check with BKT
const targetConcept: Concept = {
  id: 'trees',
  name: 'Trees & Hierarchies',
  domainId: 'cs_foundations',
  code: 'DS-201',
  description: 'Tree structures and hierarchy traversals',
  prerequisites: ['recursion'],
  order: 4,
  category: 'Non-linear Structures',
  keyTakeaways: ['Root, branches, leaves', 'Recursive traversals'],
  bloomTarget: 'Apply',
};

const masteriesMap: Record<string, ConceptMastery> = {
  recursion: {
    id: 'm_recursion',
    learnerId: 'student_test',
    conceptId: 'recursion',
    conceptName: 'Recursion',
    mastery: 0.82,
    uncertainty: 0.10,
    retention: 0.85,
    attemptsCount: 4,
    correctCount: 4,
    incorrectCount: 0,
    averageConfidence: 0.9,
    averageResponseTime: 20,
    totalHintsUsed: 0,
    totalRetries: 0,
    easyAccuracy: 1,
    mediumAccuracy: 1,
    hardAccuracy: 1,
    transferAccuracy: 1,
    bloomAccuracy: { Remember: 1, Understand: 1, Apply: 1, Analyze: 1, Evaluate: 1, Create: 1 },
    lastAttemptAt: new Date().toISOString(),
    lastReviewedAt: new Date().toISOString(),
    daysSinceLastReview: 0,
    prerequisiteSatisfied: true,
    blockedByPrerequisites: [],
    status: 'mastered',
    bktMastery: 0.82, // Recursion BKT mastery = 0.82 >= 0.70
  },
};

const conceptsMap = new Map<string, Concept>([
  [
    'recursion',
    {
      id: 'recursion',
      name: 'Recursion',
      domainId: 'cs_foundations',
      code: 'ALGO-101',
      description: 'Self-referential algorithms',
      prerequisites: [],
      order: 3,
      category: 'Algorithmic Paradigms',
      keyTakeaways: ['Base case and recursive step'],
      bloomTarget: 'Understand',
    },
  ],
  ['trees', targetConcept],
]);

const prereqResult = checkPrerequisites(targetConcept, masteriesMap, conceptsMap, 0.70, { useBktDirectly: true });
assert(prereqResult.satisfied === true, 'Prerequisite checked and satisfied via BKT mastery');

console.log('\n========================================================');
console.log('ALL BKT UNIT & INTEGRATION TESTS PASSED WITH 100% SUCCESS');
console.log('========================================================\n');
