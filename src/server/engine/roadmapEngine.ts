import { store } from '../db/store.js';
import {
  Concept,
  ConceptMastery,
  DomainId,
  LearnerProfile,
  PersonalizedRoadmapData,
  RoadmapAction,
  RoadmapCurrentAction,
  RoadmapItem,
  RoadmapItemStatus,
  RoadmapProgressSummary,
} from '../db/types.js';
import { checkPrerequisites, getTopologicalOrder } from './prerequisiteEngine.js';
import { computeHybridMastery } from './masteryEngine.js';
import { isReviewNeeded } from './retentionEngine.js';
import { evaluateTargetConcept, selectNextAction } from './decisionEngine.js';
import { mlInferenceEngine } from './mlInferenceEngine.js';

interface CacheEntry {
  fingerprint: string;
  data: PersonalizedRoadmapData;
}

export class RoadmapEngine {
  private cache = new Map<string, CacheEntry>();

  /**
   * Enforces strict learner data isolation:
   * - A STUDENT may only access their own roadmap (throws 403 error if requesting another learner).
   * - A TEACHER or ADMIN may inspect any learner's roadmap.
   */
  public getAuthorizedRoadmap(
    requester: { id: string; role: 'STUDENT' | 'TEACHER' | 'ADMIN' } | null,
    targetLearnerId: string,
    domainId?: DomainId
  ): PersonalizedRoadmapData {
    if (requester && requester.role === 'STUDENT' && requester.id !== targetLearnerId) {
      const err: any = new Error(
        `Forbidden: Learner ${requester.id} is not authorized to access roadmap for ${targetLearnerId}.`
      );
      err.statusCode = 403;
      throw err;
    }
    return this.generateRoadmap(targetLearnerId, domainId);
  }

  /**
   * Explicitly invalidates cached roadmap data for a learner (or all learners).
   */
  public invalidateCache(learnerId?: string): void {
    if (!learnerId) {
      this.cache.clear();
      return;
    }
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(`${learnerId}::`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Computes a lightweight deterministic fingerprint of the learner's current state,
   * domain progress, overrides, and system/ML configuration so stale cache entries
   * are never served even when state is mutated directly in tests.
   */
  private computeFingerprint(learner: LearnerProfile, domainId: DomainId): string {
    const mlWeights = mlInferenceEngine.getActiveModelWeights();
    const mlEnabled = Boolean(
      store.config.mlConfig?.enabled !== false &&
        mlWeights &&
        mlWeights.status !== 'INSUFFICIENT_DATA'
    );
    const domainConcepts = store.concepts.filter((c) => c.domainId === domainId);
    const activeConcepts = domainConcepts.length > 0 ? domainConcepts : store.concepts;
    const progressMap = store.getLearnerLessonProgressMap(learner.id);

    const masterySig = activeConcepts
      .map((c) => {
        const m = learner.conceptMasteries[c.id];
        if (!m) return `${c.id}:0`;
        return `${c.id}:${m.mastery.toFixed(3)}:${m.retention.toFixed(3)}:${m.attemptsCount}:${m.incorrectCount}:${m.daysSinceLastReview}:${(m.bktMastery ?? -1).toFixed(3)}:${(m.mlPrediction?.probability ?? -1).toFixed(3)}`;
      })
      .join('|');

    const lessonSig = Array.from(progressMap.values())
      .filter((lp) => lp.domainId === domainId)
      .map((lp) => `${lp.lessonId}:${lp.status}`)
      .sort()
      .join('|');

    const overrideSig = (learner.overrides || [])
      .map((o) => `${o.id}:${o.newConceptId}:${o.newAction}`)
      .join('|');

    const recentSig = (learner.recentAttempts || [])
      .slice(-5)
      .map((a) => `${a.id}:${a.conceptId}:${a.isCorrect ? 1 : 0}`)
      .join('|');

    return `${learner.id}::${domainId}::ml=${mlEnabled}::m=${store.config.masteryThreshold}::p=${store.config.prerequisiteThreshold}::${masterySig}::${lessonSig}::${overrideSig}::${recentSig}`;
  }

  /**
   * Estimates concept item difficulty in [0, 1] from actual domain questions and Bloom level.
   */
  private estimateConceptDifficulty(concept: Concept): number {
    const conceptQuestions = store.questions.filter((q) => q.conceptId === concept.id);
    const bloomWeights: Record<string, number> = {
      Remember: 0.25,
      Understand: 0.40,
      Apply: 0.55,
      Analyze: 0.70,
      Evaluate: 0.82,
      Create: 0.92,
    };
    const bloomBase = bloomWeights[concept.bloomTarget] ?? 0.55;

    if (conceptQuestions.length === 0) {
      return Number(Math.min(0.95, Math.max(0.20, bloomBase)).toFixed(2));
    }

    const diffMap: Record<string, number> = {
      easy: 0.30,
      medium: 0.58,
      hard: 0.85,
    };
    const avgQDiff =
      conceptQuestions.reduce((acc, q) => acc + (diffMap[q.difficulty] ?? 0.55), 0) /
      conceptQuestions.length;

    return Number(Math.min(0.95, Math.max(0.20, 0.6 * avgQDiff + 0.4 * bloomBase)).toFixed(2));
  }

  /**
   * Computes a bounded [0, 1] IRT ability alignment score (never treating raw unbounded theta as a probability).
   * Uses a logistic response transformation comparing weighted difficulty-tier performance against item difficulty.
   */
  private computeIrtAbilityProbability(
    mState: ConceptMastery | undefined,
    overallMastery: number,
    estimatedDifficulty: number
  ): number {
    if (!mState || mState.attemptsCount === 0) {
      // Unattempted concept: derive prior ability from learner's overall mastery vs item difficulty
      const priorTheta = (Math.max(0.15, overallMastery) - 0.5) * 3.0;
      const itemBeta = (estimatedDifficulty - 0.5) * 2.5;
      const prob = 1 / (1 + Math.exp(-(priorTheta - itemBeta)));
      return Number(Math.min(0.98, Math.max(0.05, prob)).toFixed(3));
    }

    const easyAcc = mState.easyAccuracy ?? mState.mastery;
    const medAcc = mState.mediumAccuracy ?? mState.mastery;
    const hardAcc = mState.hardAccuracy ?? mState.mastery;
    const transferAcc = mState.transferAccuracy ?? mState.mastery;

    // Weighted difficulty-tier performance
    const empiricalAbility =
      0.15 * easyAcc + 0.25 * medAcc + 0.35 * hardAcc + 0.25 * transferAcc;

    // Map to latent trait theta in [-2.5, +2.5] and item difficulty beta in [-1.5, +1.5], then apply 1PL Rasch logistic function
    const theta = (empiricalAbility - 0.5) * 4.0;
    const beta = (estimatedDifficulty - 0.5) * 2.2;
    const raschProb = 1 / (1 + Math.exp(-(theta - beta)));

    const blendedAbility = 0.65 * empiricalAbility + 0.35 * raschProb;
    return Number(Math.min(0.99, Math.max(0.02, blendedAbility)).toFixed(3));
  }

  /**
   * Maps a RoadmapAction to a clear, student-facing CTA button label.
   */
  public getCtaLabelForAction(action: RoadmapAction): string {
    switch (action) {
      case 'PRACTICE':
        return 'Start Practice';
      case 'REVIEW':
        return 'Review Concept';
      case 'REMEDIATE_PREREQUISITE':
        return 'Remediate Prerequisite';
      case 'CHALLENGE':
        return 'Start Challenge';
      case 'TEACHER_INTERVENTION':
        return 'Open Guided Remediation';
      case 'ADVANCE':
      default:
        return 'Continue Learning';
    }
  }

  /**
   * Generates the complete personalized learning roadmap for a learner.
   * Pipeline:
   * Learner Data -> Concept Graph -> Prerequisite Analysis -> Hybrid Mastery ->
   * BKT Knowledge -> IRT Ability -> FSFR Forgetting Risk -> ML Prediction ->
   * Learning Progress -> Recommendation Engine -> Roadmap -> Next Learning Action
   */
  public generateRoadmap(
    learnerId: string,
    requestedDomainId?: DomainId,
    options?: { bypassCache?: boolean; includeAllDomainsOverview?: boolean }
  ): PersonalizedRoadmapData {
    const learner = store.learners.get(learnerId);
    if (!learner) {
      throw new Error(`Learner ${learnerId} not found`);
    }

    const domainId: DomainId =
      requestedDomainId || learner.activeDomainId || store.config.activeDomainId || 'gate_cs';
    const fingerprint = this.computeFingerprint(learner, domainId);
    const cacheKey = `${learner.id}::${domainId}`;

    if (!options?.bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.fingerprint === fingerprint) {
        return cached.data;
      }
    }

    const domain = store.domains.find((d) => d.id === domainId) || store.domains[0];
    const domainConcepts = store.concepts.filter((c) => c.domainId === domainId);
    const activeConcepts = domainConcepts.length > 0 ? domainConcepts : store.concepts;
    const conceptMap = new Map<string, Concept>(store.concepts.map((c) => [c.id, c]));
    const topoConcepts = getTopologicalOrder(activeConcepts);

    const domainLessons = store.lessons.filter((l) => l.domainId === domainId);
    const domainModules = store.modules.filter((m) => m.domainId === domainId);
    const lessonProgressMap = store.getLearnerLessonProgressMap(learner.id);

    // Check ML availability (never fail if ML is disabled or INSUFFICIENT_DATA)
    const activeModelWeights = mlInferenceEngine.getActiveModelWeights();
    const mlAvailable = Boolean(
      store.config.mlConfig?.enabled !== false &&
        activeModelWeights &&
        activeModelWeights.status !== 'INSUFFICIENT_DATA'
    );

    // Build effective mastery map using 3-Way Hybrid Mastery (or Bayesian + BKT fallback if ML unavailable)
    const effectiveMasteries: Record<string, ConceptMastery> = {};
    for (const [cid, mState] of Object.entries(learner.conceptMasteries)) {
      const bktVal = mState.bktMastery ?? mState.bktState?.pKnowledge;
      const mlVal = mlAvailable ? mState.mlPrediction?.probability : undefined;
      const hybridVal =
        mState.attemptsCount > 0
          ? computeHybridMastery(mState.mastery, mlVal, store.config, bktVal)
          : mState.mastery;
      effectiveMasteries[cid] = {
        ...mState,
        mastery: hybridVal,
      };
    }

    // Identify if any concept is a blocking prerequisite for a downstream concept in this domain
    const blockingPrerequisiteForMap = new Map<string, string[]>();
    for (const c of topoConcepts) {
      const pCheck = checkPrerequisites(
        c,
        effectiveMasteries,
        conceptMap,
        store.config.prerequisiteThreshold
      );
      if (!pCheck.satisfied) {
        for (const missing of pCheck.missingPrerequisites) {
          const list = blockingPrerequisiteForMap.get(missing.conceptId) || [];
          if (!list.includes(c.name)) {
            list.push(c.name);
          }
          blockingPrerequisiteForMap.set(missing.conceptId, list);
        }
      }
    }

    // Check most recent teacher override applicable to this domain
    const latestOverride =
      learner.overrides && learner.overrides.length > 0
        ? [...learner.overrides]
            .reverse()
            .find((o) => activeConcepts.some((c) => c.id === o.newConceptId))
        : undefined;

    // Also run existing decisionEngine.selectNextAction for canonical recommendation alignment
    const scopedLearner: LearnerProfile = {
      ...learner,
      activeDomainId: domainId,
      conceptMasteries: effectiveMasteries,
    };
    const engineDecision = selectNextAction(scopedLearner, activeConcepts, store.config);

    // Build raw roadmap items along topological order
    const rawItems: RoadmapItem[] = topoConcepts.map((concept, topoIndex) => {
      const mState = effectiveMasteries[concept.id];
      const rawMState = learner.conceptMasteries[concept.id];
      const attemptsCount = mState?.attemptsCount ?? 0;
      const bktKnowledge =
        mState?.bktMastery !== undefined
          ? Number(mState.bktMastery.toFixed(3))
          : mState?.bktState?.pKnowledge !== undefined
          ? Number(mState.bktState.pKnowledge.toFixed(3))
          : undefined;

      // ML prediction (only exposed if ML is available)
      let mlProbability: number | undefined = undefined;
      if (mlAvailable) {
        if (rawMState?.mlPrediction?.probability !== undefined) {
          mlProbability = Number(rawMState.mlPrediction.probability.toFixed(3));
        } else {
          try {
            const pred = mlInferenceEngine.predict(learner.id, concept.id);
            mlProbability = Number(pred.probability.toFixed(3));
          } catch {
            mlProbability = undefined;
          }
        }
      }

      const mastery = Number((mState?.mastery ?? 0.20).toFixed(3));
      const retention = Number((mState?.retention ?? (attemptsCount > 0 ? 0.85 : 0)).toFixed(3));
      const forgettingRisk =
        attemptsCount > 0 ? Number(Math.max(0, Math.min(1, 1 - retention)).toFixed(3)) : 0;
      const daysSinceLastReview = mState?.daysSinceLastReview ?? 0;

      const estimatedDifficulty = this.estimateConceptDifficulty(concept);
      const irtAbility = this.computeIrtAbilityProbability(
        mState,
        learner.overallMastery || 0.5,
        estimatedDifficulty
      );

      // Recent accuracy for this concept
      const conceptAttempts = (learner.recentAttempts || []).filter(
        (a) => a.conceptId === concept.id
      );
      const recentAccuracy =
        conceptAttempts.length > 0
          ? Number(
              (
                conceptAttempts.slice(-5).filter((a) => a.isCorrect).length /
                Math.min(5, conceptAttempts.length)
              ).toFixed(2)
            )
          : attemptsCount > 0
          ? Number(((mState?.correctCount || 0) / Math.max(1, attemptsCount)).toFixed(2))
          : undefined;

      // Prerequisite analysis
      const prereqCheck = checkPrerequisites(
        concept,
        effectiveMasteries,
        conceptMap,
        store.config.prerequisiteThreshold
      );
      const prerequisiteBlocked = !prereqCheck.satisfied;

      const prerequisitesList = concept.prerequisites.map((pId) => {
        const pConcept = conceptMap.get(pId);
        const pMastery = effectiveMasteries[pId]?.mastery ?? 0;
        return {
          conceptId: pId,
          conceptName: pConcept?.name || pId,
          mastery: Number(pMastery.toFixed(2)),
          satisfied: pMastery >= store.config.prerequisiteThreshold,
        };
      });

      const dependentConcepts = activeConcepts
        .filter((other) => other.prerequisites.includes(concept.id))
        .map((other) => ({
          conceptId: other.id,
          conceptName: other.name,
        }));

      // Lesson & Module association
      const associatedLesson = domainLessons.find((l) => l.conceptIds.includes(concept.id));
      const associatedModule = associatedLesson
        ? domainModules.find((m) => m.id === associatedLesson.moduleId)
        : domainModules[0];
      const lessonProg = associatedLesson
        ? lessonProgressMap.get(associatedLesson.id)
        : undefined;
      const lessonCompleted = lessonProg?.status === 'COMPLETED';

      // Determine Action & Evidence-Based Reason using BKT, IRT, FSFR, ML, Prerequisite & Decision Engines
      const isOverrideTarget = latestOverride?.newConceptId === concept.id;
      const blocksDownstream = blockingPrerequisiteForMap.get(concept.id) || [];
      const retentionCheck = mState
        ? isReviewNeeded(mState, store.config)
        : { needed: false, reason: '' };
      const highForgettingRisk =
        attemptsCount > 0 &&
        mastery >= 0.65 &&
        (retentionCheck.needed || retention < 0.65 || forgettingRisk >= 0.35 || daysSinceLastReview >= 12);

      // Check consecutive failures on this concept
      const recentConceptFailures = conceptAttempts
        .slice(-3)
        .filter((a) => !a.isCorrect).length;
      const needsTeacherIntervention =
        (engineDecision.action === 'TEACHER_INTERVENTION' &&
          engineDecision.conceptId === concept.id) ||
        (attemptsCount >= 4 &&
          (mState?.incorrectCount ?? 0) >= 5 &&
          mastery < 0.42) ||
        (recentConceptFailures >= store.config.interventionThresholdFailures && mastery < 0.45);

      let action: RoadmapAction = 'PRACTICE';
      let reason = '';
      let priorityTier = 'Tier 9: Curriculum Sequence';
      let basePriority = 100;

      if (isOverrideTarget && latestOverride) {
        action = latestOverride.newAction;
        reason = `Educator override (${latestOverride.teacherName}): ${latestOverride.reason}`;
        priorityTier = 'Tier 1: Teacher Override';
        basePriority = 1000;
      } else if (needsTeacherIntervention) {
        action = 'TEACHER_INTERVENTION';
        reason = `Repeated difficulty detected on ${concept.name} (${mState?.incorrectCount ?? recentConceptFailures} incorrect responses, ${(mastery * 100).toFixed(0)}% mastery). Guided educator intervention is recommended.`;
        priorityTier = 'Tier 1: Teacher Intervention Alert';
        basePriority = 950;
      } else if (prerequisiteBlocked) {
        action = 'REMEDIATE_PREREQUISITE';
        const blockerNames = prereqCheck.missingPrerequisites
          .map((m) => `${m.conceptName} (${(m.currentMastery * 100).toFixed(0)}%)`)
          .join(', ');
        const primaryBlockerName = prereqCheck.missingPrerequisites[0]?.conceptName || 'prerequisite';
        reason = `Complete ${primaryBlockerName} before continuing to ${concept.name}. Prerequisite mastery (${blockerNames}) is below the ${(store.config.prerequisiteThreshold * 100).toFixed(0)}% readiness threshold.`;
        priorityTier = 'Tier 10: Blocked by Prerequisite';
        basePriority = 80; // Blocked items wait until their prerequisite blocker is completed
      } else if (blocksDownstream.length > 0 && mastery < store.config.prerequisiteThreshold) {
        // This concept IS the blocking prerequisite for downstream concepts!
        action = 'REMEDIATE_PREREQUISITE';
        reason = `Remediate this prerequisite before continuing to ${blocksDownstream.join(', ')}. Current mastery (${(mastery * 100).toFixed(0)}%) and BKT knowledge (${((bktKnowledge ?? mastery) * 100).toFixed(0)}%) are below the ${(store.config.prerequisiteThreshold * 100).toFixed(0)}% gate.`;
        priorityTier = 'Tier 2: Prerequisite Blocker';
        basePriority = 900;
      } else if (highForgettingRisk) {
        action = 'REVIEW';
        reason = `Review this concept because forgetting risk is high (${(forgettingRisk * 100).toFixed(0)}% risk; retention declined to ${(retention * 100).toFixed(0)}% after ${daysSinceLastReview} days without review) despite ${(mastery * 100).toFixed(0)}% mastery.`;
        priorityTier = 'Tier 3: Urgent Forgetting / Spaced Review';
        basePriority = 820;
      } else if (
        attemptsCount > 0 &&
        mastery >= 0.70 &&
        mastery < 0.78 &&
        mlAvailable &&
        mlProbability !== undefined &&
        mlProbability < 0.55
      ) {
        // ML-aware check: existing mastery is near threshold, but ML probability & recent accuracy warn of fragility
        action = 'PRACTICE';
        reason = `Practice this concept because predictive mastery (${(mlProbability * 100).toFixed(0)}%) and recent performance indicate additional consolidation is needed to stabilize your ${(mastery * 100).toFixed(0)}% hybrid mastery.`;
        priorityTier = 'Tier 4: ML-Identified Fragile Mastery';
        basePriority = 760;
      } else if (
        attemptsCount > 0 &&
        ((bktKnowledge !== undefined && bktKnowledge < 0.55) || mastery < store.config.masteryThreshold)
      ) {
        action = 'PRACTICE';
        const bktNote =
          bktKnowledge !== undefined && bktKnowledge < 0.55
            ? ` and BKT knowledge estimate (${(bktKnowledge * 100).toFixed(0)}%)`
            : '';
        const downNote =
          dependentConcepts.length > 0
            ? `, which is required before ${dependentConcepts.map((d) => d.conceptName).join(', ')}`
            : '';
        reason = `Practice this concept because current hybrid mastery (${(mastery * 100).toFixed(0)}%)${bktNote} is below the ${(store.config.masteryThreshold * 100).toFixed(0)}% mastery threshold${downNote}.`;
        priorityTier = 'Tier 5: Active Mastery Gap';
        basePriority = 700;
      } else if (attemptsCount === 0) {
        // Unlocked and unattempted
        action = 'ADVANCE';
        reason =
          concept.prerequisites.length > 0
            ? `Advance to ${concept.name} because all prerequisites (${prerequisitesList.map((p) => p.conceptName).join(', ')}) are satisfied.`
            : `Start ${concept.name} to establish foundational mastery in ${domain.shortLabel}.`;
        priorityTier = 'Tier 6: Unlocked Next Concept';
        basePriority = 580;
      } else if (
        mastery >= store.config.challengeThreshold &&
        (bktKnowledge ?? mastery) >= 0.80 &&
        irtAbility >= estimatedDifficulty
      ) {
        action = 'CHALLENGE';
        reason = `Challenge recommended because your mastery (${(mastery * 100).toFixed(0)}%), BKT knowledge (${((bktKnowledge ?? mastery) * 100).toFixed(0)}%), and IRT ability (${(irtAbility * 100).toFixed(0)}% vs. ${(estimatedDifficulty * 100).toFixed(0)}% item difficulty) support a more difficult synthesis activity.`;
        priorityTier = 'Tier 8: High-Ability Challenge';
        basePriority = 260;
      } else {
        action = 'ADVANCE';
        reason = `Advance because mastery (${(mastery * 100).toFixed(0)}%), BKT knowledge (${((bktKnowledge ?? mastery) * 100).toFixed(0)}%), and retention (${(retention * 100).toFixed(0)}%) meet target thresholds.`;
        priorityTier = 'Tier 9: Completed & Consolidated';
        basePriority = 200;
      }

      // Deterministic fine-grained tie-breaking modifiers (Tiers 5-10):
      // - Lower mastery -> higher priority (+0..45)
      // - Larger knowledge gap / blocking count -> higher priority (+0..20)
      // - Earlier review due / forgetting risk -> higher priority (+0..15)
      // - Topological curriculum order -> earlier concepts first (+0..15)
      const masteryDeficitBonus = Math.round((1 - mastery) * 45);
      const gapBonus = Math.min(20, blocksDownstream.length * 10);
      const reviewBonus = Math.round(forgettingRisk * 15);
      const orderBonus = Math.max(0, 15 - topoIndex * 2);

      const deterministicPriority = Number(
        (basePriority + masteryDeficitBonus + gapBonus + reviewBonus + orderBonus - topoIndex * 0.01).toFixed(2)
      );

      // Initial status classification before selecting the single 'current' step
      let status: RoadmapItemStatus = 'upcoming';
      const isFullyCompleted =
        !prerequisiteBlocked &&
        !isOverrideTarget &&
        !needsTeacherIntervention &&
        !highForgettingRisk &&
        attemptsCount > 0 &&
        mastery >= store.config.masteryThreshold &&
        (bktKnowledge === undefined || bktKnowledge >= 0.65) &&
        !(mlAvailable && mlProbability !== undefined && mastery < 0.78 && mlProbability < 0.55);

      if (prerequisiteBlocked && !isOverrideTarget) {
        status = 'blocked';
      } else if (isFullyCompleted) {
        status = 'completed';
      } else {
        status = 'upcoming';
      }

      const availableActivities: RoadmapItem['availableActivities'] = [
        {
          type: 'practice',
          label: action === 'CHALLENGE' ? 'Challenge Questions' : 'Adaptive Practice',
          lessonId: associatedLesson?.id,
          conceptId: concept.id,
        },
        ...(associatedLesson
          ? [
              {
                type: 'lesson' as const,
                label: `Lesson: ${associatedLesson.title}`,
                lessonId: associatedLesson.id,
                conceptId: concept.id,
              },
            ]
          : []),
        {
          type: 'flashcards',
          label: 'Spaced Recall Flashcards',
          lessonId: associatedLesson?.id,
          conceptId: concept.id,
        },
        {
          type: 'tutor',
          label: 'Ask AI Tutor',
          lessonId: associatedLesson?.id,
          conceptId: concept.id,
        },
        {
          type: 'mindmap',
          label: 'View Prerequisite Structure in Mind Map',
          lessonId: associatedLesson?.id,
          conceptId: concept.id,
        },
      ];

      return {
        conceptId: concept.id,
        conceptName: concept.name,
        conceptCode: concept.code,
        domainId: concept.domainId,
        domainName: domain.name,
        category: concept.category,
        moduleId: associatedModule?.id,
        moduleTitle: associatedModule?.title,
        lessonId: associatedLesson?.id,
        lessonTitle: associatedLesson?.title,
        lessonCompleted,
        action,
        status,
        priority: deterministicPriority,
        priorityTier,
        reason,
        mastery,
        ...(bktKnowledge !== undefined ? { bktKnowledge } : {}),
        irtAbility,
        forgettingRisk,
        retention,
        ...(mlProbability !== undefined ? { mlProbability } : {}),
        prerequisiteBlocked,
        blockingPrerequisites: prereqCheck.missingPrerequisites.map((m) => ({
          conceptId: m.conceptId,
          conceptName: m.conceptName,
          currentMastery: Number(m.currentMastery.toFixed(2)),
          requiredThreshold: m.requiredThreshold,
        })),
        prerequisites: prerequisitesList,
        dependentConcepts,
        estimatedDifficulty,
        attemptsCount,
        ...(recentAccuracy !== undefined ? { recentAccuracy } : {}),
        daysSinceLastReview,
        teacherOverrideActive: isOverrideTarget,
        availableActivities,
      };
    });

    // Deterministically select ONE primary 'current' step:
    // Candidate pool = all non-completed, non-blocked items (or if all completed, all items)
    const actionablePool = rawItems.filter(
      (item) => item.status !== 'completed' && item.status !== 'blocked'
    );
    const poolToRank = actionablePool.length > 0 ? actionablePool : rawItems;

    const sortedCandidates = [...poolToRank].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.conceptId.localeCompare(b.conceptId);
    });

    const primaryCurrentItem = sortedCandidates[0] || rawItems[0];
    if (primaryCurrentItem) {
      primaryCurrentItem.status = 'current';
    }

    // Order roadmap items into a personalized journey sequence:
    // 1. Completed concepts first (in topological order)
    // 2. Primary Current Action next (status === 'current')
    // 3. Upcoming unlocked concepts sorted by deterministic priority descending, then topological/ID
    // 4. Blocked concepts ordered by topological dependency chain
    const completedItems = rawItems.filter((i) => i.status === 'completed');
    const currentItems = rawItems.filter((i) => i.status === 'current');
    const upcomingItems = rawItems
      .filter((i) => i.status === 'upcoming')
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.conceptId.localeCompare(b.conceptId);
      });
    const blockedItems = rawItems.filter((i) => i.status === 'blocked');

    const orderedItems: RoadmapItem[] = [
      ...completedItems,
      ...currentItems,
      ...upcomingItems,
      ...blockedItems,
    ];

    // Calculate progress summary across the domain (and across all 28 concepts for platform overview)
    const completedCount = orderedItems.filter(
      (i) =>
        i.status === 'completed' ||
        (i.status === 'current' &&
          i.attemptsCount > 0 &&
          i.mastery >= store.config.masteryThreshold &&
          i.forgettingRisk < 0.35 &&
          (i.action === 'CHALLENGE' || i.action === 'ADVANCE'))
    ).length;

    const developingCount = orderedItems.filter(
      (i) => i.attemptsCount > 0 && i.mastery < store.config.masteryThreshold && !i.prerequisiteBlocked
    ).length;

    const reviewNeededCount = orderedItems.filter((i) => i.action === 'REVIEW').length;
    const blockedCount = orderedItems.filter((i) => i.prerequisiteBlocked).length;
    const upcomingCount = orderedItems.filter((i) => i.status === 'upcoming').length;

    let completedLessons = 0;
    for (const les of domainLessons) {
      if (lessonProgressMap.get(les.id)?.status === 'COMPLETED') {
        completedLessons++;
      }
    }

    const totalDomainConcepts = orderedItems.length;
    const percentage =
      totalDomainConcepts > 0
        ? Number(((completedCount / totalDomainConcepts) * 100).toFixed(1))
        : 0;

    // Platform-wide 28-concept count for global context
    const totalCurriculumConcepts = store.concepts.length;
    const totalCurriculumCompleted = store.concepts.filter((c) => {
      const m = effectiveMasteries[c.id];
      return m && m.attemptsCount > 0 && m.mastery >= store.config.masteryThreshold && m.retention >= 0.65;
    }).length;
    const totalCurriculumPercentage =
      totalCurriculumConcepts > 0
        ? Number(((totalCurriculumCompleted / totalCurriculumConcepts) * 100).toFixed(1))
        : 0;

    const progress: RoadmapProgressSummary = {
      completed: completedCount,
      total: totalDomainConcepts,
      percentage,
      developing: developingCount,
      reviewNeeded: reviewNeededCount,
      prerequisiteBlocked: blockedCount,
      upcoming: upcomingCount,
      completedLessons,
      totalLessons: domainLessons.length,
    };

    const currentAction: RoadmapCurrentAction = {
      conceptId: primaryCurrentItem.conceptId,
      conceptName: primaryCurrentItem.conceptName,
      action: primaryCurrentItem.action,
      reason: primaryCurrentItem.reason,
      ctaLabel: this.getCtaLabelForAction(primaryCurrentItem.action),
      priorityTier: primaryCurrentItem.priorityTier,
      lessonId: primaryCurrentItem.lessonId,
      mastery: primaryCurrentItem.mastery,
      ...(primaryCurrentItem.bktKnowledge !== undefined
        ? { bktKnowledge: primaryCurrentItem.bktKnowledge }
        : {}),
      ...(primaryCurrentItem.irtAbility !== undefined
        ? { irtAbility: primaryCurrentItem.irtAbility }
        : {}),
      forgettingRisk: primaryCurrentItem.forgettingRisk,
      ...(primaryCurrentItem.mlProbability !== undefined
        ? { mlProbability: primaryCurrentItem.mlProbability }
        : {}),
      prerequisiteBlocked: primaryCurrentItem.prerequisiteBlocked,
    };

    const roadmapData: PersonalizedRoadmapData = {
      learnerId: learner.id,
      learnerName: learner.name,
      domainId: domain.id,
      domainName: domain.name,
      generatedAt: new Date().toISOString(),
      mlAvailable,
      progress,
      currentAction,
      items: orderedItems,
      curriculumOverview: {
        totalCurriculumConcepts,
        totalCurriculumCompleted,
        totalCurriculumPercentage,
      },
    };

    this.cache.set(cacheKey, {
      fingerprint,
      data: roadmapData,
    });

    return roadmapData;
  }

  /**
   * Returns only the primary current action for a learner.
   */
  public getCurrentAction(learnerId: string, domainId?: DomainId): {
    learnerId: string;
    domainId: DomainId;
    progress: RoadmapProgressSummary;
    currentAction: RoadmapCurrentAction;
  } {
    const roadmap = this.generateRoadmap(learnerId, domainId);
    return {
      learnerId: roadmap.learnerId,
      domainId: roadmap.domainId,
      progress: roadmap.progress,
      currentAction: roadmap.currentAction,
    };
  }

  /**
   * Returns detailed roadmap item information for a specific concept and learner.
   */
  public getConceptDetail(learnerId: string, conceptId: string): RoadmapItem {
    const concept = store.concepts.find((c) => c.id === conceptId);
    if (!concept) {
      throw new Error(`Concept ${conceptId} not found`);
    }
    const roadmap = this.generateRoadmap(learnerId, concept.domainId);
    const item = roadmap.items.find((i) => i.conceptId === conceptId);
    if (!item) {
      throw new Error(`Concept ${conceptId} not found in learner roadmap`);
    }
    return item;
  }
}

export const roadmapEngine = new RoadmapEngine();
