import {
  Concept,
  ConceptMastery,
  LearnerProfile,
  Recommendation,
  RecommendationAction,
  SystemConfig,
} from '../db/types.js';
import { checkPrerequisites, getTopologicalOrder } from './prerequisiteEngine.js';
import { isReviewNeeded } from './retentionEngine.js';

export interface DecisionResult {
  action: RecommendationAction;
  conceptId: string;
  conceptName: string;
  reason: string;
  evidenceSummary: Recommendation['evidenceSummary'];
  stepFired?: string;
}

/**
 * Prototype's Full Adaptive Decision Algorithm:
 * Evaluates target concept or curriculum graph:
 * 
 * 4. Find prerequisites of target concept.
 * 5. Check prerequisite mastery.
 * 6. IF prerequisite is weak:
 *        → REMEDIATE_PREREQUISITE
 * 7. ELSE IF mastery is low:
 *        → PRACTICE
 * 8. ELSE IF previously mastered but retention is weak:
 *        → REVIEW
 * 9. ELSE IF mastery is high but transfer is weak:
 *        → PRACTICE / REVIEW
 * 10. ELSE IF mastery is very high:
 *        → CHALLENGE / ADVANCE
 * 11. ELSE:
 *        → PRACTICE
 * 12. Generate explanation:
 *        evidence + state + prerequisite + reason
 */
export function evaluateTargetConcept(
  learner: LearnerProfile,
  targetConcept: Concept,
  concepts: Concept[],
  config: SystemConfig
): DecisionResult {
  const domainConcepts = targetConcept.domainId
    ? concepts.filter((c) => c.domainId === targetConcept.domainId)
    : (learner.activeDomainId ? concepts.filter((c) => c.domainId === learner.activeDomainId) : []);
  const activeConcepts = domainConcepts.length > 0 ? domainConcepts : concepts;
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const topoConcepts = getTopologicalOrder(activeConcepts);
  const recentAttempts = learner.recentAttempts.slice(-5);

  // 4. Find prerequisites of target concept.
  // 5. Check prerequisite mastery.
  const prereqCheck = checkPrerequisites(
    targetConcept,
    learner.conceptMasteries,
    conceptMap,
    config.prerequisiteThreshold
  );

  // 6. IF prerequisite is weak: → REMEDIATE_PREREQUISITE
  if (!prereqCheck.satisfied && prereqCheck.missingPrerequisites.length > 0) {
    const weakPrereq = prereqCheck.missingPrerequisites[0];
    const missingMastery = learner.conceptMasteries[weakPrereq.conceptId];
    return {
      action: 'REMEDIATE_PREREQUISITE',
      conceptId: weakPrereq.conceptId,
      conceptName: weakPrereq.conceptName,
      stepFired: 'Step 6: Prerequisite is weak',
      // 12. Generate explanation: evidence + state + prerequisite + reason
      reason: `Prerequisite "${weakPrereq.conceptName}" mastery (${(weakPrereq.currentMastery * 100).toFixed(0)}%) is below the required readiness threshold (${(weakPrereq.requiredThreshold * 100).toFixed(0)}%) for ${targetConcept.name}. Remediating the foundational concept first ensures cognitive continuity.`,
      evidenceSummary: buildEvidenceSummary(missingMastery, recentAttempts, `Deficit in ${weakPrereq.conceptName}`),
    };
  }

  const masteryState = learner.conceptMasteries[targetConcept.id];
  const currentMastery = masteryState ? masteryState.mastery : 0;
  const attemptsCount = masteryState ? masteryState.attemptsCount : 0;
  const retentionScore = masteryState ? masteryState.retention : 0;
  const transferAccuracy = masteryState ? masteryState.transferAccuracy : 0;

  // 7. ELSE IF mastery is low: → PRACTICE (or ADVANCE if unattempted new topic)
  if (attemptsCount === 0) {
    return {
      action: 'ADVANCE',
      conceptId: targetConcept.id,
      conceptName: targetConcept.name,
      stepFired: 'Step 7: New unlocked concept',
      reason: `All prerequisites for ${targetConcept.name} are satisfied with strong evidence. You are cleared to advance to this new concept.`,
      evidenceSummary: buildEvidenceSummary(undefined, recentAttempts, 'All Prerequisites Satisfied'),
    };
  }

  if (currentMastery < config.masteryThreshold) {
    return {
      action: 'PRACTICE',
      conceptId: targetConcept.id,
      conceptName: targetConcept.name,
      stepFired: 'Step 7: Mastery is low',
      reason: `${targetConcept.name} mastery is at ${(currentMastery * 100).toFixed(0)}%, which is below the target threshold of ${(config.masteryThreshold * 100).toFixed(0)}%. Focused structured practice is recommended.`,
      evidenceSummary: buildEvidenceSummary(masteryState, recentAttempts, 'Satisfied'),
    };
  }

  // 8. ELSE IF previously mastered but retention is weak: → REVIEW
  const retentionReview = masteryState ? isReviewNeeded(masteryState, config) : { needed: false, reason: '' };
  if (retentionReview.needed || (currentMastery >= config.masteryThreshold && retentionScore < 0.65 && (masteryState?.daysSinceLastReview || 0) >= 7)) {
    return {
      action: 'REVIEW',
      conceptId: targetConcept.id,
      conceptName: targetConcept.name,
      stepFired: 'Step 8: Previously mastered but retention is weak',
      reason: `Previously demonstrated solid mastery of ${targetConcept.name} (${(currentMastery * 100).toFixed(0)}%), but memory retention has dropped to ${(retentionScore * 100).toFixed(0)}% after ${masteryState?.daysSinceLastReview || 0} days without practice. Spaced retrieval review is recommended.`,
      evidenceSummary: buildEvidenceSummary(masteryState, recentAttempts, 'Satisfied'),
    };
  }

  // 9. ELSE IF mastery is high but transfer is weak: → PRACTICE / REVIEW
  if (currentMastery >= config.masteryThreshold && transferAccuracy < 0.60 && attemptsCount >= 2) {
    return {
      action: 'PRACTICE',
      conceptId: targetConcept.id,
      conceptName: targetConcept.name,
      stepFired: 'Step 9: Mastery is high but transfer is weak',
      reason: `Foundational mastery on ${targetConcept.name} is strong (${(currentMastery * 100).toFixed(0)}%), but transfer & problem-solving application performance is weak (${(transferAccuracy * 100).toFixed(0)}%). Targeted transfer practice is recommended.`,
      evidenceSummary: buildEvidenceSummary(masteryState, recentAttempts, 'Satisfied'),
    };
  }

  // 10. ELSE IF mastery is very high: → CHALLENGE / ADVANCE
  if (currentMastery >= config.challengeThreshold) {
    const nextConcept = findNextConcept(targetConcept.id, topoConcepts);
    if (nextConcept) {
      // Check if next concept prerequisites are ready
      const nextPrereqCheck = checkPrerequisites(nextConcept, learner.conceptMasteries, conceptMap, config.prerequisiteThreshold);
      if (nextPrereqCheck.satisfied) {
        return {
          action: 'ADVANCE',
          conceptId: nextConcept.id,
          conceptName: nextConcept.name,
          stepFired: 'Step 10: Very high mastery → ADVANCE',
          reason: `Exceptional mastery (${(currentMastery * 100).toFixed(0)}%) and transfer ability demonstrated on ${targetConcept.name}. Unlocking advancement to ${nextConcept.name}.`,
          evidenceSummary: buildEvidenceSummary(masteryState, recentAttempts, 'Satisfied'),
        };
      }
    }

    return {
      action: 'CHALLENGE',
      conceptId: targetConcept.id,
      conceptName: targetConcept.name,
      stepFired: 'Step 10: Very high mastery → CHALLENGE',
      reason: `Exceptional mastery (${(currentMastery * 100).toFixed(0)}%) achieved on ${targetConcept.name}! Synthesis and competitive challenge questions are recommended.`,
      evidenceSummary: buildEvidenceSummary(masteryState, recentAttempts, 'Satisfied'),
    };
  }

  // 11. ELSE: → PRACTICE
  return {
    action: 'PRACTICE',
    conceptId: targetConcept.id,
    conceptName: targetConcept.name,
    stepFired: 'Step 11: General practice',
    reason: `Continued practice on ${targetConcept.name} to deepen conceptual fluency and consolidate mastery.`,
    evidenceSummary: buildEvidenceSummary(masteryState, recentAttempts, 'Satisfied'),
  };
}

export function selectNextAction(
  learner: LearnerProfile,
  concepts: Concept[],
  config: SystemConfig,
  preferredConceptId?: string
): DecisionResult {
  const domainConcepts = learner.activeDomainId
    ? concepts.filter((c) => c.domainId === learner.activeDomainId)
    : [];
  const activeConcepts = domainConcepts.length > 0 ? domainConcepts : concepts;
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const topoConcepts = getTopologicalOrder(activeConcepts);
  const recentAttempts = learner.recentAttempts.slice(-5);

  // Educator Intervention Safety Guard:
  // If consecutive failures threshold is exceeded, flag for teacher intervention
  const consecutiveFailures = countRecentConsecutiveFailures(recentAttempts);
  if (consecutiveFailures >= config.interventionThresholdFailures) {
    const lastAttempt = recentAttempts[recentAttempts.length - 1];
    const failingConcept = lastAttempt ? conceptMap.get(lastAttempt.conceptId) : undefined;
    const failingConceptName = failingConcept ? failingConcept.name : 'current topic';
    const failingMastery = failingConcept ? learner.conceptMasteries[failingConcept.id] : undefined;

    return {
      action: 'TEACHER_INTERVENTION',
      conceptId: failingConcept?.id || 'arrays',
      conceptName: failingConceptName,
      reason: `Learner has experienced ${consecutiveFailures} consecutive incorrect attempts on ${failingConceptName} despite using hints. System has paused autonomous progression to request educator diagnostic assessment.`,
      evidenceSummary: buildEvidenceSummary(failingMastery, recentAttempts, 'Unsatisfied'),
    };
  }

  // Step 3 & 8: Check forgetting/retention on previously mastered concepts first
  for (const concept of topoConcepts) {
    const masteryState = learner.conceptMasteries[concept.id];
    if (masteryState && masteryState.attemptsCount > 0 && masteryState.mastery >= config.masteryThreshold) {
      const reviewCheck = isReviewNeeded(masteryState, config);
      if (reviewCheck.needed) {
        return {
          action: 'REVIEW',
          conceptId: concept.id,
          conceptName: concept.name,
          stepFired: 'Step 8: Spaced review needed due to retention decay',
          reason: `Your previous ${concept.name} mastery was strong (${(masteryState.mastery * 100).toFixed(0)}%), but retention has dropped to ${(masteryState.retention * 100).toFixed(0)}% after ${masteryState.daysSinceLastReview} days without review. Spaced review is recommended before learning new material.`,
          evidenceSummary: buildEvidenceSummary(masteryState, recentAttempts, 'Satisfied'),
        };
      }
    }
  }

  // If a specific target concept is requested (e.g. from the most recent attempt),
  // evaluate it with the 13-step algorithm:
  if (preferredConceptId && conceptMap.has(preferredConceptId)) {
    const target = conceptMap.get(preferredConceptId)!;
    const result = evaluateTargetConcept(learner, target, concepts, config);
    // If not already mastered and cleared, return this target's evaluation
    if (result.action !== 'ADVANCE' || learner.conceptMasteries[preferredConceptId]?.mastery < config.masteryThreshold) {
      return result;
    }
  }

  // Find active concept along topological curriculum
  for (const concept of topoConcepts) {
    const masteryState = learner.conceptMasteries[concept.id];

    // Check prerequisites (Step 4 & 5)
    const prereqCheck = checkPrerequisites(concept, learner.conceptMasteries, conceptMap, config.prerequisiteThreshold);

    if (!prereqCheck.satisfied) {
      // Step 6: IF prerequisite is weak: → REMEDIATE_PREREQUISITE
      const missing = prereqCheck.missingPrerequisites[0];
      const missingMastery = learner.conceptMasteries[missing.conceptId];
      return {
        action: 'REMEDIATE_PREREQUISITE',
        conceptId: missing.conceptId,
        conceptName: missing.conceptName,
        stepFired: 'Step 6: Prerequisite is weak',
        reason: `${missing.conceptName} mastery (${(missing.currentMastery * 100).toFixed(0)}%) is below the required threshold (${(missing.requiredThreshold * 100).toFixed(0)}%) to safely unlock ${concept.name}. Remediating the foundational concept is essential.`,
        evidenceSummary: buildEvidenceSummary(missingMastery, recentAttempts, 'Prerequisite Deficit'),
      };
    }

    // Concept is unlocked!
    // If never attempted, recommend ADVANCE
    if (!masteryState || masteryState.attemptsCount === 0) {
      return {
        action: 'ADVANCE',
        conceptId: concept.id,
        conceptName: concept.name,
        stepFired: 'Step 7/10: Unlocked concept ready for advancement',
        reason: `All prerequisites for ${concept.name} are satisfied with high confidence. You are cleared to advance to this new topic.`,
        evidenceSummary: buildEvidenceSummary(undefined, recentAttempts, 'All Prerequisites Satisfied'),
      };
    }

    // Step 7: ELSE IF mastery is low: → PRACTICE
    if (masteryState.mastery < config.masteryThreshold) {
      const isTransferLagging = masteryState.transferAccuracy < 0.50 && masteryState.attemptsCount >= 3;
      let reason = `${concept.name} mastery is at ${(masteryState.mastery * 100).toFixed(0)}%, which is below the target certification threshold (${(config.masteryThreshold * 100).toFixed(0)}%). Continued structured practice is recommended.`;
      
      // Step 9: ELSE IF mastery is high but transfer is weak: → PRACTICE
      if (isTransferLagging) {
        reason = `Basic understanding of ${concept.name} is established, but transfer and edge-case application performance is weak (${(masteryState.transferAccuracy * 100).toFixed(0)}%). Target application practice is recommended.`;
      }

      return {
        action: 'PRACTICE',
        conceptId: concept.id,
        conceptName: concept.name,
        stepFired: isTransferLagging ? 'Step 9: Transfer is weak' : 'Step 7: Mastery is low',
        reason,
        evidenceSummary: buildEvidenceSummary(masteryState, recentAttempts, 'Satisfied'),
      };
    }

    // Step 10: ELSE IF mastery is very high: → CHALLENGE
    if (masteryState.mastery >= config.challengeThreshold && masteryState.transferAccuracy >= 0.75) {
      const nextConcept = findNextConcept(concept.id, topoConcepts);
      if (!nextConcept || masteryState.attemptsCount < 4) {
        return {
          action: 'CHALLENGE',
          conceptId: concept.id,
          conceptName: concept.name,
          stepFired: 'Step 10: Mastery is very high',
          reason: `High mastery (${(masteryState.mastery * 100).toFixed(0)}%) and robust transfer performance (${(masteryState.transferAccuracy * 100).toFixed(0)}%) demonstrated. Ready for competitive/synthesis challenge questions.`,
          evidenceSummary: buildEvidenceSummary(masteryState, recentAttempts, 'Satisfied'),
        };
      }
    }
  }

  // If all attempted concepts meet mastery threshold, ADVANCE to the next unlocked concept!
  for (const concept of topoConcepts) {
    const masteryState = learner.conceptMasteries[concept.id];
    if (!masteryState || masteryState.attemptsCount === 0) {
      const prereqCheck = checkPrerequisites(concept, learner.conceptMasteries, conceptMap, config.prerequisiteThreshold);
      if (prereqCheck.satisfied) {
        return {
          action: 'ADVANCE',
          conceptId: concept.id,
          conceptName: concept.name,
          stepFired: 'Step 10: ADVANCE to next curriculum concept',
          reason: `All prerequisites for ${concept.name} are satisfied with strong evidence. You are cleared to advance to this new concept.`,
          evidenceSummary: buildEvidenceSummary(undefined, recentAttempts, 'All Prerequisites Satisfied'),
        };
      }
    }
  }

  // Step 11: ELSE: Fallback to top concept or final challenge
  const lastConcept = topoConcepts[topoConcepts.length - 1];
  return {
    action: 'CHALLENGE',
    conceptId: lastConcept.id,
    conceptName: lastConcept.name,
    stepFired: 'Step 11: Capstone challenge',
    reason: `Comprehensive curriculum mastery achieved! Synthesize skills with end-of-course challenge problems.`,
    evidenceSummary: buildEvidenceSummary(learner.conceptMasteries[lastConcept.id], recentAttempts, 'Satisfied'),
  };
}

function countRecentConsecutiveFailures(attempts: LearnerProfile['recentAttempts']): number {
  let count = 0;
  for (let i = attempts.length - 1; i >= 0; i--) {
    if (!attempts[i].isCorrect) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function findNextConcept(currentConceptId: string, topoList: Concept[]): Concept | undefined {
  const idx = topoList.findIndex((c) => c.id === currentConceptId);
  if (idx >= 0 && idx < topoList.length - 1) {
    return topoList[idx + 1];
  }
  return undefined;
}

function buildEvidenceSummary(
  masteryState: ConceptMastery | undefined,
  recentAttempts: LearnerProfile['recentAttempts'],
  prereqStatus: string
): Recommendation['evidenceSummary'] {
  const recentSlice = recentAttempts.slice(-5);
  const correctCount = recentSlice.filter((a) => a.isCorrect).length;
  const recentAccuracyStr = recentSlice.length > 0 ? `${correctCount}/${recentSlice.length}` : 'N/A';
  const hintsCount = recentSlice.reduce((sum, a) => sum + (a.hintsUsed || 0), 0);
  const guessingRiskDetected = recentSlice.some((a) => a.antiGuessingTriggered);

  return {
    mastery: masteryState ? masteryState.mastery : 0,
    uncertainty: masteryState ? masteryState.uncertainty : 0.8,
    retention: masteryState ? masteryState.retention : 0,
    recentAccuracy: recentAccuracyStr,
    hintsUsed: hintsCount,
    daysSinceReview: masteryState ? masteryState.daysSinceLastReview : 0,
    prerequisiteStatus: prereqStatus,
    transferPerformance: masteryState
      ? `${(masteryState.transferAccuracy * 100).toFixed(0)}% accuracy`
      : 'No transfer data yet',
    guessingRisk: guessingRiskDetected ? 'Elevated (Damping active)' : 'Low (Calibrated)',
  };
}
