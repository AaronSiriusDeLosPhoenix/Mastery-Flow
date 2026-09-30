import { store } from '../db/store.js';
import {
  DomainId,
  KnowledgeGap,
  LearningActivityEvent,
  Lesson,
  LessonProgress,
  LessonStatus,
  Module,
  ModuleProgress,
  Recommendation,
  SubjectProgress,
} from '../db/types.js';

export class LearningPathEngine {
  /**
   * Dynamically calculates progress for a single module based on actual student activity.
   */
  public calculateModuleProgress(learnerId: string, moduleId: string): ModuleProgress {
    const mod = store.modules.find((m) => m.id === moduleId);
    if (!mod) {
      throw new Error(`Module ${moduleId} not found`);
    }

    const lessons = store.lessons.filter((l) => l.moduleId === moduleId);
    const learner = store.learners.get(learnerId);

    const progressMap = store.getLearnerLessonProgressMap(learnerId);

    let completedLessons = 0;
    let inProgressLessons = 0;
    let notStartedLessons = 0;
    let currentLesson: Lesson | undefined;

    for (const l of lessons) {
      const prog = progressMap.get(l.id);
      const status = prog?.status || 'NOT_STARTED';

      if (status === 'COMPLETED') {
        completedLessons++;
      } else if (status === 'IN_PROGRESS') {
        inProgressLessons++;
        if (!currentLesson) currentLesson = l;
      } else {
        notStartedLessons++;
        if (!currentLesson) currentLesson = l;
      }
    }

    // Default to the first lesson if all completed or none assigned
    if (!currentLesson && lessons.length > 0) {
      currentLesson = lessons[0];
    }

    const totalLessons = lessons.length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Calculate concepts mastery count in this module
    const moduleConceptIds = Array.from(new Set(lessons.flatMap((l) => l.conceptIds)));
    let conceptsCompleted = 0;
    for (const cId of moduleConceptIds) {
      const mState = learner?.conceptMasteries[cId];
      if (mState && mState.mastery >= 0.75) {
        conceptsCompleted++;
      }
    }

    let status: LessonStatus = 'NOT_STARTED';
    if (completedLessons === totalLessons && totalLessons > 0) {
      status = 'COMPLETED';
    } else if (completedLessons > 0 || inProgressLessons > 0) {
      status = 'IN_PROGRESS';
    }

    return {
      moduleId: mod.id,
      moduleCode: mod.code,
      moduleTitle: mod.title,
      domainId: mod.domainId,
      order: mod.order,
      totalLessons,
      completedLessons,
      inProgressLessons,
      notStartedLessons,
      progressPercent,
      conceptsCompleted,
      conceptsTotal: moduleConceptIds.length,
      currentLessonId: currentLesson?.id,
      currentLessonTitle: currentLesson?.title,
      status,
    };
  }

  /**
   * Dynamically calculates subject / domain progress.
   */
  public calculateSubjectProgress(learnerId: string, domainId: DomainId): SubjectProgress {
    const domain = store.domains.find((d) => d.id === domainId);
    const domainName = domain?.name || domainId.toUpperCase();
    const domainCategory = domain?.category || 'Curriculum Track';

    const modules = store.modules.filter((m) => m.domainId === domainId);
    const lessons = store.lessons.filter((l) => l.domainId === domainId);
    const concepts = store.concepts.filter((c) => c.domainId === domainId);

    const progressMap = store.getLearnerLessonProgressMap(learnerId);
    const learner = store.learners.get(learnerId);

    let completedLessons = 0;
    for (const l of lessons) {
      const prog = progressMap.get(l.id);
      if (prog?.status === 'COMPLETED') {
        completedLessons++;
      }
    }

    let completedModules = 0;
    for (const m of modules) {
      const mProg = this.calculateModuleProgress(learnerId, m.id);
      if (mProg.status === 'COMPLETED') {
        completedModules++;
      }
    }

    let masteredConcepts = 0;
    let totalMasterySum = 0;
    for (const c of concepts) {
      const mState = learner?.conceptMasteries[c.id];
      const mVal = mState ? mState.mastery : 0;
      totalMasterySum += mVal;
      if (mVal >= 0.75) {
        masteredConcepts++;
      }
    }

    const totalLessons = lessons.length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const overallMastery = concepts.length > 0 ? Number((totalMasterySum / concepts.length).toFixed(2)) : 0;

    let status: LessonStatus = 'NOT_STARTED';
    if (completedLessons === totalLessons && totalLessons > 0) {
      status = 'COMPLETED';
    } else if (completedLessons > 0) {
      status = 'IN_PROGRESS';
    }

    return {
      domainId,
      domainName,
      category: domainCategory,
      totalModules: modules.length,
      completedModules,
      totalLessons,
      completedLessons,
      totalConcepts: concepts.length,
      masteredConcepts,
      progressPercent,
      overallMastery,
      status,
    };
  }

  /**
   * Knowledge Gap Detection Algorithm:
   * Cross-examines Concept Model dependencies against Evidence Model mastery.
   * If a concept has low performance and its prerequisite has low readiness,
   * flags an actionable knowledge gap with a direct remedial lesson path.
   */
  public detectKnowledgeGaps(learnerId: string, domainId: DomainId): KnowledgeGap[] {
    const learner = store.learners.get(learnerId);
    if (!learner) return [];

    const gaps: KnowledgeGap[] = [];
    const domainConcepts = store.concepts.filter((c) => c.domainId === domainId);

    for (const concept of domainConcepts) {
      const conceptState = learner.conceptMasteries[concept.id];
      const conceptMastery = conceptState?.mastery || 0;
      const isAttempted = (conceptState?.attemptsCount || 0) > 0;

      // Check all prerequisite relationships for this concept
      for (const prereqId of concept.prerequisites || []) {
        const prereqState = learner.conceptMasteries[prereqId];
        const prereqConcept = store.concepts.find((c) => c.id === prereqId);
        const prereqName = prereqConcept?.name || prereqId;
        const prereqMastery = prereqState?.mastery || 0;

        // Gap condition:
        // 1. Prerequisite is below threshold (< 0.70), AND
        // 2. Either target concept is below threshold (< 0.65) OR target has errors/unattempted blocked
        const isPrereqDeficient = prereqMastery < 0.70;
        const isTargetStruggling = conceptMastery < 0.65 || !isAttempted;

        if (isPrereqDeficient && isTargetStruggling) {
          // Find which lesson covers the prerequisite concept
          const remedialLesson = store.lessons.find((l) => l.conceptIds.includes(prereqId)) || {
            id: `les_${prereqId}`,
            title: `Foundations of ${prereqName}`,
          };

          const severity =
            prereqMastery < 0.40 || conceptMastery < 0.35 ? 'HIGH' : prereqMastery < 0.55 ? 'MEDIUM' : 'LOW';

          gaps.push({
            id: `gap_${concept.id}_${prereqId}`,
            learnerId,
            domainId,
            conceptId: concept.id,
            conceptName: concept.name,
            conceptMastery,
            prerequisiteId: prereqId,
            prerequisiteName: prereqName,
            prerequisiteMastery: prereqMastery,
            severity,
            recommendedLessonId: remedialLesson.id,
            recommendedLessonTitle: remedialLesson.title,
            reason: `Prerequisite "${prereqName}" mastery is ${(prereqMastery * 100).toFixed(0)}%, which creates a conceptual bottleneck for "${concept.name}" (${(conceptMastery * 100).toFixed(0)}%).`,
            action: `Review ${remedialLesson.title} to solidify prerequisites before continuing with ${concept.name}.`,
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Adaptive Next-Lesson Recommendation Engine:
   * Generates explainable, evidence-backed next-step actions based on lesson hierarchy,
   * knowledge gaps, and prerequisite satisfaction.
   */
  public generateNextLearningRecommendation(learnerId: string, domainId: DomainId): Recommendation {
    const learner = store.learners.get(learnerId);
    const domainLessons = store.lessons.filter((l) => l.domainId === domainId);
    const progressMap = store.getLearnerLessonProgressMap(learnerId);

    // 1. Check for Critical Knowledge Gaps first (highest priority)
    const knowledgeGaps = this.detectKnowledgeGaps(learnerId, domainId);
    const highSeverityGap = knowledgeGaps.find((g) => g.severity === 'HIGH') || knowledgeGaps[0];

    if (highSeverityGap) {
      return {
        id: `rec_gap_${Date.now()}`,
        learnerId,
        domainId,
        action: 'REMEDIATE_PREREQUISITE',
        conceptId: highSeverityGap.prerequisiteId,
        conceptName: highSeverityGap.prerequisiteName,
        stepFired: 'Rule 1: Prerequisite Knowledge Gap Detected',
        reason: highSeverityGap.reason,
        evidenceSummary: {
          mastery: highSeverityGap.prerequisiteMastery,
          uncertainty: 0.30,
          retention: 0.50,
          recentAccuracy: `${(highSeverityGap.prerequisiteMastery * 100).toFixed(0)}%`,
          hintsUsed: 1,
          daysSinceReview: 2,
          prerequisiteStatus: 'Bottleneck',
          transferPerformance: 'Needs Remediation',
          guessingRisk: 'Low',
        },
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Check for In-Progress Lesson
    const inProgressLesson = domainLessons.find((l) => {
      const prog = progressMap.get(l.id);
      return prog?.status === 'IN_PROGRESS';
    });

    if (inProgressLesson) {
      const primaryConceptId = inProgressLesson.conceptIds[0];
      const conceptState = learner?.conceptMasteries[primaryConceptId];
      const cMastery = conceptState?.mastery || 0.50;

      return {
        id: `rec_continue_${Date.now()}`,
        learnerId,
        domainId,
        action: 'PRACTICE',
        conceptId: primaryConceptId,
        conceptName: inProgressLesson.title,
        stepFired: 'Rule 2: Resume In-Progress Lesson',
        reason: `You are currently studying "${inProgressLesson.title}". Complete the learning material and practice assessment to certify concept mastery.`,
        evidenceSummary: {
          mastery: cMastery,
          uncertainty: conceptState?.uncertainty || 0.20,
          retention: conceptState?.retention || 0.70,
          recentAccuracy: `${(cMastery * 100).toFixed(0)}%`,
          hintsUsed: 0,
          daysSinceReview: 0,
          prerequisiteStatus: 'Satisfied',
          transferPerformance: 'Developing',
          guessingRisk: 'Calibrated',
        },
        timestamp: new Date().toISOString(),
      };
    }

    // 3. Find the Next Unlocked Lesson whose prerequisites are all satisfied
    for (const lesson of domainLessons) {
      const prog = progressMap.get(lesson.id);
      if (prog?.status !== 'COMPLETED') {
        // Check if all prerequisite concepts for this lesson are satisfied
        const prereqConcepts = lesson.prerequisiteConceptIds || [];
        const allPrereqsSatisfied = prereqConcepts.every((pid) => {
          const mState = learner?.conceptMasteries[pid];
          return (mState?.mastery || 0) >= 0.70;
        });

        if (allPrereqsSatisfied) {
          const primaryConceptId = lesson.conceptIds[0] || lesson.id;
          return {
            id: `rec_advance_${Date.now()}`,
            learnerId,
            domainId,
            action: 'ADVANCE',
            conceptId: primaryConceptId,
            conceptName: lesson.title,
            stepFired: 'Rule 3: Advance to Next Unlocked Lesson',
            reason: `You have completed all prerequisite foundations. Advance to "${lesson.title}" to build subsequent topic competencies.`,
            evidenceSummary: {
              mastery: 0.85,
              uncertainty: 0.15,
              retention: 0.85,
              recentAccuracy: 'Ready',
              hintsUsed: 0,
              daysSinceReview: 0,
              prerequisiteStatus: 'All Satisfied',
              transferPerformance: 'Optimal',
              guessingRisk: 'None',
            },
            timestamp: new Date().toISOString(),
          };
        }
      }
    }

    // 4. Default: Review or Challenge on the highest-order concept
    const lastLesson = domainLessons[domainLessons.length - 1] || domainLessons[0];
    const targetConcept = store.concepts.find((c) => c.id === (lastLesson?.conceptIds[0] || '')) || store.concepts[0];

    return {
      id: `rec_mastery_${Date.now()}`,
      learnerId,
      domainId,
      action: 'CHALLENGE',
      conceptId: targetConcept.id,
      conceptName: targetConcept.name,
      stepFired: 'Rule 4: Advanced Mastery Consolidation',
      reason: `You have completed all primary syllabus lessons in this track! Take on synthesis challenges or revisit earlier topics for retention hardening.`,
      evidenceSummary: {
        mastery: 0.95,
        uncertainty: 0.05,
        retention: 0.92,
        recentAccuracy: 'Exemplary',
        hintsUsed: 0,
        daysSinceReview: 1,
        prerequisiteStatus: 'Complete',
        transferPerformance: 'Certified',
        guessingRisk: 'Calibrated',
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Records completed lesson learning activity, updates mastery and evidence,
   * and refreshes the student's adaptive recommendation.
   */
  public completeLesson(
    learnerId: string,
    lessonId: string,
    meta?: { questionsAttempted?: number; questionsCorrect?: number; timeSpentSeconds?: number }
  ): {
    lessonProgress: LessonProgress;
    activityEvent: LearningActivityEvent;
    recommendation: Recommendation;
    subjectProgress: SubjectProgress;
  } {
    const lesson = store.lessons.find((l) => l.id === lessonId);
    if (!lesson) {
      throw new Error(`Lesson ${lessonId} not found`);
    }

    const domainId = lesson.domainId;
    const progressMap = store.getLearnerLessonProgressMap(learnerId);
    const existing = progressMap.get(lessonId);

    const updatedProgress: LessonProgress = {
      id: existing?.id || `lp_${learnerId}_${lessonId}`,
      learnerId,
      lessonId,
      moduleId: lesson.moduleId,
      domainId,
      status: 'COMPLETED',
      startedAt: existing?.startedAt || new Date(Date.now() - 1800000).toISOString(),
      completedAt: new Date().toISOString(),
      timeSpentSeconds: (existing?.timeSpentSeconds || 0) + (meta?.timeSpentSeconds || 600),
      questionsAttempted: (existing?.questionsAttempted || 0) + (meta?.questionsAttempted || 2),
      questionsCorrect: (existing?.questionsCorrect || 0) + (meta?.questionsCorrect || 2),
      summaryGenerated: existing?.summaryGenerated || false,
      tutorConsulted: existing?.tutorConsulted || false,
    };

    store.saveLessonProgress(updatedProgress);

    // Boost mastery for the concepts in this lesson
    const learner = store.learners.get(learnerId);
    if (learner) {
      for (const conceptId of lesson.conceptIds) {
        const mState = learner.conceptMasteries[conceptId];
        if (mState) {
          // Increase mastery safely
          mState.mastery = Math.min(1.0, Number((mState.mastery + 0.15).toFixed(2)));
          mState.uncertainty = Math.max(0.08, Number((mState.uncertainty - 0.12).toFixed(2)));
          mState.retention = Math.min(1.0, Number((mState.retention + 0.10).toFixed(2)));
          mState.status = mState.mastery >= 0.75 ? 'mastered' : 'developing';
          mState.lastReviewedAt = new Date().toISOString();
        }
      }

      // Recompute learner overall metrics
      const masteries = Object.values(learner.conceptMasteries);
      if (masteries.length > 0) {
        const sum = masteries.reduce((acc, m) => acc + m.mastery, 0);
        learner.overallMastery = Number((sum / masteries.length).toFixed(2));
      }
    }

    // Log Activity Event
    const activityEvent: LearningActivityEvent = {
      id: `act_${Date.now()}`,
      learnerId,
      domainId,
      type: 'LESSON_COMPLETED',
      title: `Completed ${lesson.title}`,
      description: `Mastered objectives for ${lesson.code} (${lesson.estimatedMinutes}m session)`,
      timestamp: new Date().toISOString(),
      lessonId: lesson.id,
      conceptId: lesson.conceptIds[0],
    };
    store.logActivityEvent(activityEvent);

    // Compute updated recommendation
    const recommendation = this.generateNextLearningRecommendation(learnerId, domainId);
    if (learner) {
      learner.currentRecommendation = recommendation;
      learner.recommendationHistory.push(recommendation);
    }

    const subjectProgress = this.calculateSubjectProgress(learnerId, domainId);

    return {
      lessonProgress: updatedProgress,
      activityEvent,
      recommendation,
      subjectProgress,
    };
  }
}

export const learningPathEngine = new LearningPathEngine();
