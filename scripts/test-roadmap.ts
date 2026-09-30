import { store } from '../src/server/db/store.js';
import { roadmapEngine } from '../src/server/engine/roadmapEngine.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runRoadmapTests() {
  console.log('======================================================');
  console.log('PERSONALIZED LEARNING ROADMAP — END-TO-END TEST SUITE');
  console.log('======================================================\n');

  // 1. Test: Roadmap generation for Learner A and Learner B produces personalized differences where evidence differs
  console.log('[Test 1] Verifying personalized roadmap differences between Learner A and Learner B...');
  const roadmapA = roadmapEngine.generateRoadmap('student_a', 'cs_foundations', { bypassCache: true });
  const roadmapB = roadmapEngine.generateRoadmap('student_b', 'cs_foundations', { bypassCache: true });

  assert(roadmapA.items.length > 0, 'Learner A roadmap must contain items');
  assert(roadmapB.items.length > 0, 'Learner B roadmap must contain items');

  const sequenceA = roadmapA.items.map((i) => `${i.conceptId}:${i.action}:${i.status}`).join(' -> ');
  const sequenceB = roadmapB.items.map((i) => `${i.conceptId}:${i.action}:${i.status}`).join(' -> ');
  assert(
    sequenceA !== sequenceB || roadmapA.currentAction.conceptId !== roadmapB.currentAction.conceptId,
    'Learner A and Learner B with different evidence must receive different personalized roadmaps'
  );
  console.log(`  ✓ Learner A Primary Action: ${roadmapA.currentAction.action} -> ${roadmapA.currentAction.conceptName}`);
  console.log(`  ✓ Learner B Primary Action: ${roadmapB.currentAction.action} -> ${roadmapB.currentAction.conceptName}`);

  // 2. Test: Prerequisite-blocked concept is not recommended before its prerequisite
  console.log('\n[Test 2] Verifying prerequisite-blocked concept is never recommended before its prerequisite (Arrays -> Stacks & Recursion -> Trees -> BST)...');
  const testLearner = JSON.parse(JSON.stringify(store.learners.get('student_a')!));
  const testLearnerId = 'test_roadmap_learner';
  testLearner.id = testLearnerId;
  testLearner.name = 'Test Roadmap Learner';
  testLearner.activeDomainId = 'cs_foundations';
  testLearner.overrides = [];

  // Set Arrays = 0.42 (Below 0.70 prerequisite threshold), Stacks = 0.20 (Depends on Arrays)
  testLearner.conceptMasteries['arrays'] = {
    ...testLearner.conceptMasteries['arrays'],
    conceptId: 'arrays',
    mastery: 0.42,
    bktMastery: 0.40,
    retention: 0.85,
    attemptsCount: 4,
    correctCount: 1,
    incorrectCount: 3,
    daysSinceLastReview: 1,
    mlPrediction: {
      ...(testLearner.conceptMasteries['arrays']?.mlPrediction || {}),
      probability: 0.41,
    },
  };
  testLearner.conceptMasteries['stacks'] = {
    ...testLearner.conceptMasteries['stacks'],
    conceptId: 'stacks',
    mastery: 0.20,
    bktMastery: 0.15,
    retention: 0,
    attemptsCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    daysSinceLastReview: 0,
  };
  store.learners.set(testLearnerId, testLearner);

  const prereqRoadmap = roadmapEngine.generateRoadmap(testLearnerId, 'cs_foundations', { bypassCache: true });
  const arraysIndex = prereqRoadmap.items.findIndex((i) => i.conceptId === 'arrays');
  const stacksItem = prereqRoadmap.items.find((i) => i.conceptId === 'stacks')!;
  const stacksIndex = prereqRoadmap.items.findIndex((i) => i.conceptId === 'stacks');

  assert(stacksItem.prerequisiteBlocked === true, 'Stacks must be marked prerequisiteBlocked when Arrays < 70%');
  assert(stacksItem.status === 'blocked', 'Stacks status must be blocked');
  assert(arraysIndex < stacksIndex, 'Arrays must appear before blocked dependent concept Stacks');
  assert(
    prereqRoadmap.currentAction.conceptId !== 'stacks',
    'Blocked concept Stacks must NOT be selected as current action'
  );
  assert(
    stacksItem.reason.includes('Complete Arrays before continuing to Stacks'),
    `Blocked explanation must mention prerequisite blocker, got: ${stacksItem.reason}`
  );
  console.log(`  ✓ Blocked Reason: "${stacksItem.reason}"`);

  // 3. Test: High forgetting risk triggers REVIEW even when mastery & BKT are high
  console.log('\n[Test 3] Verifying high FSFR forgetting risk triggers REVIEW despite high mastery...');
  // Satisfy all prerequisites in cs_foundations so there are no prerequisite blockers ahead of review
  for (const cid of ['arrays', 'linked_lists', 'stacks', 'queues', 'recursion', 'trees', 'bst', 'graphs', 'searching_sorting', 'hashing']) {
    testLearner.conceptMasteries[cid] = {
      ...testLearner.conceptMasteries[cid],
      conceptId: cid,
      mastery: 0.85,
      bktMastery: 0.84,
      retention: 0.92,
      daysSinceLastReview: 1,
      attemptsCount: 6,
      correctCount: 5,
      incorrectCount: 1,
      mlPrediction: {
        ...(testLearner.conceptMasteries[cid]?.mlPrediction || {}),
        probability: 0.86,
      },
    };
  }
  // Now make Arrays have high mastery (0.91), high BKT (0.89), high ML (0.94), but HIGH Forgetting Risk (retention = 0.45)
  testLearner.conceptMasteries['arrays'] = {
    ...testLearner.conceptMasteries['arrays'],
    mastery: 0.91,
    bktMastery: 0.89,
    retention: 0.45, // Forgetting risk = 0.55 (High!)
    daysSinceLastReview: 16,
    attemptsCount: 8,
    mlPrediction: {
      ...(testLearner.conceptMasteries['arrays']?.mlPrediction || {}),
      probability: 0.94,
    },
  };
  roadmapEngine.invalidateCache(testLearnerId);

  const forgettingRoadmap = roadmapEngine.generateRoadmap(testLearnerId, 'cs_foundations');
  const arraysItem = forgettingRoadmap.items.find((i) => i.conceptId === 'arrays')!;
  assert(arraysItem.action === 'REVIEW', `Expected REVIEW for high forgetting risk on Arrays, got ${arraysItem.action}`);
  assert(arraysItem.forgettingRisk >= 0.35, 'Expected forgettingRisk >= 0.35 on Arrays');
  assert(
    forgettingRoadmap.currentAction.conceptId === 'arrays' &&
      forgettingRoadmap.currentAction.action === 'REVIEW',
    `Expected primary current action to be REVIEW on Arrays, got ${forgettingRoadmap.currentAction.action} on ${forgettingRoadmap.currentAction.conceptId}`
  );
  console.log(`  ✓ High Forgetting Risk Action: ${arraysItem.action} -> "${arraysItem.reason}"`);

  // 4. Test: Low mastery triggers PRACTICE
  console.log('\n[Test 4] Verifying low mastery triggers PRACTICE...');
  testLearner.conceptMasteries['arrays'].retention = 0.92;
  testLearner.conceptMasteries['arrays'].daysSinceLastReview = 1;
  // Set leaf concept 'hashing' (no downstream dependents) to low mastery (0.46)
  testLearner.conceptMasteries['hashing'] = {
    ...testLearner.conceptMasteries['hashing'],
    conceptId: 'hashing',
    mastery: 0.46,
    bktMastery: 0.42,
    retention: 0.88,
    attemptsCount: 3,
    correctCount: 1,
    incorrectCount: 2,
    daysSinceLastReview: 1,
    mlPrediction: {
      ...(testLearner.conceptMasteries['hashing']?.mlPrediction || {}),
      probability: 0.44,
    },
  };
  const lowMasteryRoadmap = roadmapEngine.generateRoadmap(testLearnerId, 'cs_foundations', { bypassCache: true });
  const hashingItem = lowMasteryRoadmap.items.find((i) => i.conceptId === 'hashing')!;
  assert(hashingItem.action === 'PRACTICE', `Expected PRACTICE on Hash Tables with ~45% mastery, got ${hashingItem.action}`);
  assert(
    lowMasteryRoadmap.currentAction.conceptId === 'hashing' &&
      lowMasteryRoadmap.currentAction.action === 'PRACTICE',
    `Expected primary current action to be PRACTICE on hashing, got ${lowMasteryRoadmap.currentAction.action} on ${lowMasteryRoadmap.currentAction.conceptId}`
  );
  console.log(`  ✓ Low Mastery Action: ${hashingItem.action} -> "${hashingItem.reason}"`);

  // 5. Test: High mastery + low forgetting risk + ready prerequisites allows ADVANCE or CHALLENGE
  console.log('\n[Test 5] Verifying high mastery + low forgetting risk + ready prerequisites triggers CHALLENGE or ADVANCE...');
  testLearner.conceptMasteries['arrays'] = {
    ...testLearner.conceptMasteries['arrays'],
    mastery: 0.94,
    bktMastery: 0.92,
    retention: 0.95,
    daysSinceLastReview: 1,
    attemptsCount: 10,
    easyAccuracy: 1.0,
    mediumAccuracy: 0.95,
    hardAccuracy: 0.90,
    transferAccuracy: 0.90,
    mlPrediction: {
      ...(testLearner.conceptMasteries['arrays']?.mlPrediction || {}),
      probability: 0.95,
    },
  };
  const highMasteryRoadmap = roadmapEngine.generateRoadmap(testLearnerId, 'cs_foundations', { bypassCache: true });
  const highArrays = highMasteryRoadmap.items.find((i) => i.conceptId === 'arrays')!;
  assert(
    highArrays.action === 'CHALLENGE' || highArrays.action === 'ADVANCE',
    `Expected CHALLENGE or ADVANCE for high mastery/ability, got ${highArrays.action}`
  );
  assert(highArrays.status === 'completed', `Expected completed status for mastered concept, got ${highArrays.status}`);
  console.log(`  ✓ High Mastery Action: ${highArrays.action} (Status: ${highArrays.status}) -> "${highArrays.reason}"`);

  // 6. Test: Roadmap updates dynamically after a new learner attempt
  console.log('\n[Test 6] Verifying roadmap updates dynamically after a new learner attempt...');
  const beforeHashingMastery = hashingItem.mastery;
  testLearner.conceptMasteries['hashing'] = {
    ...testLearner.conceptMasteries['hashing'],
    mastery: 0.88,
    bktMastery: 0.86,
    retention: 0.94,
    attemptsCount: 7,
    correctCount: 6,
    mlPrediction: {
      ...(testLearner.conceptMasteries['hashing']?.mlPrediction || {}),
      probability: 0.89,
    },
  };
  const afterAttemptRoadmap = roadmapEngine.generateRoadmap(testLearnerId, 'cs_foundations');
  const afterHashingItem = afterAttemptRoadmap.items.find((i) => i.conceptId === 'hashing')!;
  assert(
    afterHashingItem.mastery > beforeHashingMastery,
    'Roadmap mastery must update immediately when learner state changes'
  );
  assert(
    afterHashingItem.status === 'completed' || afterHashingItem.mastery >= 0.85,
    `Hash Tables should reach mastered threshold after attempt, got mastery=${afterHashingItem.mastery}`
  );
  console.log(
    `  ✓ Before Attempt: ${(beforeHashingMastery * 100).toFixed(0)}% (${hashingItem.status}) -> After Attempt: ${(afterHashingItem.mastery * 100).toFixed(0)}% (${afterHashingItem.status})`
  );

  // 7. Test: Roadmap fallback works cleanly when ML is unavailable
  console.log('\n[Test 7] Verifying safe fallback when ML is unavailable (INSUFFICIENT_DATA / disabled)...');
  const prevMlEnabled = store.config.mlConfig.enabled;
  store.config.mlConfig.enabled = false;
  try {
    const fallbackRoadmap = roadmapEngine.generateRoadmap(testLearnerId, 'cs_foundations');
    assert(fallbackRoadmap.mlAvailable === false, 'mlAvailable flag must be false when ML is disabled');
    assert(fallbackRoadmap.items.length > 0, 'Roadmap must still generate items when ML is unavailable');
    assert(
      fallbackRoadmap.items.every((i) => i.mlProbability === undefined),
      'No fake ML probabilities may be exposed when ML is unavailable'
    );
    console.log(
      `  ✓ Fallback Roadmap generated cleanly without ML (${fallbackRoadmap.items.length} items, mlAvailable=${fallbackRoadmap.mlAvailable})`
    );
  } finally {
    store.config.mlConfig.enabled = prevMlEnabled;
  }

  // 8. Test: Strict learner isolation — Learner cannot access another learner's roadmap
  console.log('\n[Test 8] Verifying strict learner isolation (Learner A cannot access Learner B roadmap)...');
  let forbiddenCaught = false;
  try {
    roadmapEngine.getAuthorizedRoadmap(
      { id: 'student_a', role: 'STUDENT' },
      'student_b',
      'cs_foundations'
    );
  } catch (err: any) {
    if (err.statusCode === 403 || err.message.includes('Forbidden')) {
      forbiddenCaught = true;
    }
  }
  assert(forbiddenCaught === true, 'Student A requesting Student B roadmap must throw 403 Forbidden');

  // Verify Teacher CAN inspect Student B roadmap
  const teacherInspected = roadmapEngine.getAuthorizedRoadmap(
    { id: 'teacher_1', role: 'TEACHER' },
    'student_b',
    'cs_foundations'
  );
  assert(teacherInspected.learnerId === 'student_b', 'Teacher must be authorized to inspect Student B roadmap');
  console.log('  ✓ Student cross-tenant request blocked with 403 Forbidden; Teacher inspection authorized.');

  // Clean up temporary test learner
  store.learners.delete(testLearnerId);
  roadmapEngine.invalidateCache(testLearnerId);

  console.log('\n======================================================');
  console.log('ALL 8 PERSONALIZED ROADMAP TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================');
}

runRoadmapTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
