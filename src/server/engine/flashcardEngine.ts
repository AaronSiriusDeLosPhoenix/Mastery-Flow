import { GoogleGenAI } from '@google/genai';
import { store } from '../db/store.js';
import { learningPathEngine } from './learningPathEngine.js';
import {
  DomainId,
  Flashcard,
  FlashcardDeckAvailability,
  FlashcardProgress,
  FlashcardRecallLevel,
  FlashcardSessionSummary,
  FlashcardStats,
  FlashcardType,
  QuestionDifficulty,
} from '../db/types.js';

export class FlashcardEngine {
  private aiClient: GoogleGenAI | null = null;

  constructor() {
    this.initGemini();
  }

  private initGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        this.aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } catch (err) {
        console.warn('Could not initialize GoogleGenAI for FlashcardEngine:', err);
        this.aiClient = null;
      }
    }
  }

  /**
   * 1. FLASHCARD AVAILABILITY
   * Flashcards become available based on actual Phase 2 learning-path progress.
   */
  public getDeckAvailability(
    learnerId: string,
    subjectId: DomainId,
    moduleId?: string
  ): FlashcardDeckAvailability[] {
    const domainModules = store.getModulesByDomain(subjectId);
    const progressMap = store.getLearnerLessonProgressMap(learnerId);

    const targetModules = moduleId
      ? domainModules.filter((m) => m.id === moduleId)
      : domainModules;

    return targetModules.map((mod) => {
      const moduleLessons = store.lessons.filter((l) => l.moduleId === mod.id);
      const totalLessonsCount = moduleLessons.length;

      let completedLessonsCount = 0;
      const incompleteLessonTitles: string[] = [];

      for (const l of moduleLessons) {
        const prog = progressMap.get(l.id);
        if (prog?.status === 'COMPLETED') {
          completedLessonsCount++;
        } else {
          incompleteLessonTitles.push(l.title);
        }
      }

      // Check module cards count
      const moduleCards = store.getFlashcards({ subjectId, moduleId: mod.id });
      const availableCardsCount = moduleCards.length;

      // Available if at least 1 lesson completed in this module or if module is completed
      // Or if student has started learning this module's concepts
      const isAvailable = completedLessonsCount > 0 || totalLessonsCount === 0;
      const completionPercent =
        totalLessonsCount > 0
          ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
          : 0;

      let unlockedReason = 'Complete the required lessons to unlock flashcards.';
      let lockedReason: string | undefined;

      if (completedLessonsCount === totalLessonsCount && totalLessonsCount > 0) {
        unlockedReason = `Flashcards Available: All ${totalLessonsCount} lessons completed! Full active recall deck unlocked.`;
      } else if (completedLessonsCount > 0) {
        unlockedReason = `Flashcards Available: ${completedLessonsCount} of ${totalLessonsCount} lessons completed (${availableCardsCount} cards ready).`;
      } else {
        lockedReason = `Complete the required lessons (${incompleteLessonTitles.slice(0, 2).join(', ')}) to unlock flashcards.`;
      }

      return {
        subjectId,
        moduleId: mod.id,
        moduleTitle: mod.title,
        isAvailable,
        completionPercent,
        completedLessonsCount,
        totalLessonsCount,
        availableCardsCount,
        unlockedReason,
        lockedReason,
      };
    });
  }

  /**
   * 2. ADAPTIVE FLASHCARD SELECTION & RANKING
   * Prioritizes:
   * 1. Knowledge-gap concepts (highest priority)
   * 2. Low-mastery concepts (< 0.50)
   * 3. Concepts with recent incorrect evidence
   * 4. Concepts marked "Need Review" / due for review
   * 5. Normal developing concepts
   * 6. Already-mastered concepts for periodic reinforcement
   */
  public getAdaptiveDeck(params: {
    learnerId: string;
    subjectId: DomainId;
    moduleId?: string;
    lessonId?: string;
    conceptId?: string;
    focusMode?: 'all' | 'weak_concepts' | 'knowledge_gaps' | 'due_review' | 'new';
    limit?: number;
  }): { cards: Flashcard[]; totalMatching: number; prioritizedConcepts: string[] } {
    const {
      learnerId,
      subjectId,
      moduleId,
      lessonId,
      conceptId,
      focusMode = 'all',
      limit = 20,
    } = params;

    // Filter baseline cards matching criteria
    let candidates = store.getFlashcards({ subjectId, moduleId, lessonId, conceptId });

    const learner = store.learners.get(learnerId);
    const knowledgeGaps = learningPathEngine.detectKnowledgeGaps(learnerId, subjectId);
    const knowledgeGapConceptIds = new Set(knowledgeGaps.map((g) => g.conceptId));
    const cardProgressMap = store.getAllLearnerFlashcardProgress(learnerId);

    // Apply focus mode filters if requested
    if (focusMode === 'knowledge_gaps') {
      candidates = candidates.filter((c) => knowledgeGapConceptIds.has(c.conceptId));
    } else if (focusMode === 'weak_concepts') {
      candidates = candidates.filter((c) => {
        const m = learner?.conceptMasteries[c.conceptId];
        return !m || m.mastery < 0.60 || knowledgeGapConceptIds.has(c.conceptId);
      });
    } else if (focusMode === 'due_review') {
      const now = Date.now();
      candidates = candidates.filter((c) => {
        const prog = cardProgressMap.get(c.id);
        if (!prog) return true;
        if (prog.status === 'review_needed') return true;
        if (prog.nextReviewAt && new Date(prog.nextReviewAt).getTime() <= now) return true;
        return false;
      });
    } else if (focusMode === 'new') {
      candidates = candidates.filter((c) => !cardProgressMap.has(c.id));
    }

    // Score and rank each candidate card
    const scoredCards = candidates.map((card) => {
      let priorityScore = 100;
      const masteryState = learner?.conceptMasteries[card.conceptId];
      const cardProg = cardProgressMap.get(card.id);

      // 1. Knowledge Gap Concepts: +500
      if (knowledgeGapConceptIds.has(card.conceptId)) {
        priorityScore += 500;
      }

      // 2. Concept Mastery Level
      if (!masteryState || masteryState.attemptsCount === 0) {
        priorityScore += 180; // New concept
      } else if (masteryState.mastery < 0.40) {
        priorityScore += 380; // Severe struggle
      } else if (masteryState.mastery < 0.60) {
        priorityScore += 260; // Developing
      } else if (masteryState.mastery < 0.75) {
        priorityScore += 120; // Near mastery
      } else {
        priorityScore -= 120; // Mastered (periodic reinforcement)
      }

      // 3. Recent incorrect evidence in concept attempts: +150
      if (masteryState && masteryState.incorrectCount > masteryState.correctCount) {
        priorityScore += 150;
      }

      // 4. Card review status
      if (cardProg) {
        if (cardProg.status === 'review_needed' || cardProg.lastRecallLevel === 'again') {
          priorityScore += 320;
        } else if (cardProg.lastRecallLevel === 'hard') {
          priorityScore += 180;
        } else if (cardProg.status === 'mastered') {
          priorityScore -= 150;
        }

        // Due for spaced repetition review
        if (cardProg.nextReviewAt && new Date(cardProg.nextReviewAt).getTime() <= Date.now()) {
          priorityScore += 200;
        }
      } else {
        priorityScore += 80; // Unseen card
      }

      return {
        card,
        priorityScore,
        conceptId: card.conceptId,
      };
    });

    // Sort descending by priority score
    scoredCards.sort((a, b) => b.priorityScore - a.priorityScore);

    const totalMatching = scoredCards.length;
    const selected = scoredCards.slice(0, limit).map((sc) => sc.card);
    const prioritizedConcepts = Array.from(new Set(selected.map((c) => c.conceptName)));

    return {
      cards: selected,
      totalMatching,
      prioritizedConcepts,
    };
  }

  /**
   * 3. RECORD FLASHCARD REVIEW & CONNECT TO EVIDENCE MODEL
   * Records student response, updates FlashcardProgress, and updates Concept Mastery via Evidence Model.
   */
  public recordReview(params: {
    learnerId: string;
    flashcardId: string;
    recallLevel: FlashcardRecallLevel;
    responseTimeSeconds?: number;
  }): {
    flashcard: Flashcard;
    progress: FlashcardProgress;
    evidenceScore: number;
    masteryBefore: number;
    masteryAfter: number;
    uncertaintyBefore: number;
    uncertaintyAfter: number;
    nextReviewAt: string;
  } {
    const { learnerId, flashcardId, recallLevel, responseTimeSeconds = 10 } = params;

    const card = store.getFlashcardById(flashcardId);
    if (!card) {
      throw new Error(`Flashcard ${flashcardId} not found`);
    }

    // 1. Calculate spaced repetition nextReviewAt
    const now = new Date();
    let nextReviewAt: Date;
    let status: FlashcardProgress['status'] = 'learning';

    const existingProg = store.getFlashcardProgress(learnerId, flashcardId);
    const reviewCount = (existingProg?.reviewCount || 0) + 1;
    const isCorrect = recallLevel !== 'again';
    const correctCount = (existingProg?.correctCount || 0) + (isCorrect ? 1 : 0);
    const incorrectCount = (existingProg?.incorrectCount || 0) + (isCorrect ? 0 : 1);

    if (recallLevel === 'again') {
      // Review again within 10 minutes
      nextReviewAt = new Date(now.getTime() + 10 * 60 * 1000);
      status = 'review_needed';
    } else if (recallLevel === 'hard') {
      // 1 day
      nextReviewAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      status = 'learning';
    } else if (recallLevel === 'good') {
      // 3 days
      nextReviewAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      status = reviewCount >= 3 ? 'mastered' : 'learning';
    } else {
      // 'easy': 7 days
      nextReviewAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      status = 'mastered';
    }

    const confidence =
      recallLevel === 'easy' ? 1.0 : recallLevel === 'good' ? 0.8 : recallLevel === 'hard' ? 0.45 : 0.2;

    const updatedProgress: FlashcardProgress = {
      flashcardId,
      learnerId,
      status,
      reviewCount,
      correctCount,
      incorrectCount,
      lastReviewedAt: now.toISOString(),
      nextReviewAt: nextReviewAt.toISOString(),
      confidence,
      masteryContribution: isCorrect ? 0.15 : -0.15,
      lastRecallLevel: recallLevel,
    };

    store.saveFlashcardProgress(updatedProgress);

    // 2. Submit to Evidence Model & Recalculate Mastery
    const evidenceResult = store.recordFlashcardEvidence(
      learnerId,
      card,
      recallLevel,
      responseTimeSeconds
    );

    return {
      flashcard: card,
      progress: updatedProgress,
      evidenceScore: evidenceResult.evidenceScore,
      masteryBefore: evidenceResult.masteryBefore,
      masteryAfter: evidenceResult.masteryAfter,
      uncertaintyBefore: evidenceResult.uncertaintyBefore,
      uncertaintyAfter: evidenceResult.uncertaintyAfter,
      nextReviewAt: nextReviewAt.toISOString(),
    };
  }

  /**
   * 4. AI-POWERED FLASHCARD GENERATION
   * Generates new flashcards grounded strictly in actual lesson and concept content.
   * Prevents duplicates.
   */
  public async generateAiFlashcards(params: {
    subjectId: DomainId;
    moduleId: string;
    lessonId?: string;
    conceptId?: string;
    count?: number;
    difficulty?: QuestionDifficulty;
    focusWeakConcepts?: boolean;
    learnerId?: string;
  }): Promise<{ generatedCards: Flashcard[]; count: number; sourceNote: string }> {
    const {
      subjectId,
      moduleId,
      lessonId,
      conceptId,
      count = 5,
      difficulty = 'medium',
      focusWeakConcepts = false,
      learnerId,
    } = params;

    const targetModule = store.modules.find((m) => m.id === moduleId);
    const targetLesson = lessonId ? store.lessons.find((l) => l.id === lessonId) : undefined;
    const targetConcept = conceptId ? store.concepts.find((c) => c.id === conceptId) : undefined;

    // Determine target concepts to generate for
    let relevantConcepts = store.concepts.filter((c) => c.domainId === subjectId);
    if (targetLesson) {
      relevantConcepts = relevantConcepts.filter((c) => targetLesson.conceptIds.includes(c.id));
    } else if (targetModule) {
      const moduleLessons = store.lessons.filter((l) => l.moduleId === targetModule.id);
      const modConceptIds = Array.from(new Set(moduleLessons.flatMap((l) => l.conceptIds)));
      relevantConcepts = relevantConcepts.filter((c) => modConceptIds.includes(c.id));
    }
    if (targetConcept) {
      relevantConcepts = [targetConcept];
    }

    if (relevantConcepts.length === 0) {
      relevantConcepts = store.concepts.filter((c) => c.domainId === subjectId).slice(0, 3);
    }

    // Filter to weak concepts if requested
    if (focusWeakConcepts && learnerId) {
      const learner = store.learners.get(learnerId);
      const weak = relevantConcepts.filter((c) => {
        const m = learner?.conceptMasteries[c.id];
        return !m || m.mastery < 0.65;
      });
      if (weak.length > 0) {
        relevantConcepts = weak;
      }
    }

    // Prepare grounding source material
    const sourceMaterials = relevantConcepts.map((c) => {
      const summary = store.getSummaryNote(c.id);
      const resource = store.getResourcesByConcept(c.id)[0];
      return {
        conceptId: c.id,
        conceptName: c.name,
        category: c.category,
        description: c.description,
        keyTakeaways: c.keyTakeaways,
        prerequisites: c.prerequisites,
        summaryContent: summary?.keyPoints?.join('\n') || summary?.overview || '',
        resourceContent: resource?.content?.slice(0, 500) || '',
      };
    });

    const existingCards = store.getFlashcards({ subjectId, moduleId });
    const existingQuestions = existingCards.map((c) => c.question.toLowerCase().trim());

    const generatedCards: Flashcard[] = [];

    // Attempt Gemini generation if client is available
    if (this.aiClient) {
      try {
        const prompt = `You are an academic flashcard generator for an Adaptive Learning Platform.
Ground your questions and answers ONLY in the provided syllabus and concept reference material below.
Do NOT invent facts, do NOT introduce concepts outside this material.
Keep questions concise and focused on high-yield recall or conceptual application.
Ensure answers are precise, complete, and accurate.

Target Domain: ${subjectId}
Module: ${targetModule?.title || 'Course Content'}
Target Difficulty: ${difficulty}
Number of Cards Needed: ${count}

GROUNDING MATERIAL:
${JSON.stringify(sourceMaterials, null, 2)}

EXISTING QUESTIONS TO AVOID (DO NOT DUPLICATE):
${JSON.stringify(existingQuestions.slice(0, 15), null, 2)}

Return a valid JSON array of objects with the exact schema:
[
  {
    "conceptId": "string (one of the provided concept IDs)",
    "conceptName": "string",
    "question": "string (clear, direct active recall prompt)",
    "answer": "string (concise, definitive answer)",
    "explanation": "string (1-2 sentences explaining why, including formulas or edge cases)",
    "type": "Definition" | "Conceptual" | "Recall" | "Formula" | "Example-based" | "Application" | "Comparison",
    "difficulty": "easy" | "medium" | "hard"
  }
]`;

        const response = await this.aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text?.trim() || '[]';
        const parsed = JSON.parse(rawText);

        if (Array.isArray(parsed)) {
          for (let i = 0; i < parsed.length; i++) {
            const item = parsed[i];
            const matchedConcept =
              relevantConcepts.find((c) => c.id === item.conceptId) || relevantConcepts[0];
            const matchedLesson =
              targetLesson ||
              store.lessons.find((l) => l.conceptIds.includes(matchedConcept.id)) ||
              store.lessons[0];

            // Duplicate check
            const qLower = item.question?.toLowerCase().trim();
            if (existingQuestions.includes(qLower)) continue;

            const newCard: Flashcard = {
              id: `fc_ai_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
              subjectId,
              moduleId: targetModule?.id || matchedLesson.moduleId,
              lessonId: matchedLesson.id,
              conceptId: matchedConcept.id,
              conceptName: matchedConcept.name,
              question: item.question || `Key insight on ${matchedConcept.name}`,
              answer: item.answer || matchedConcept.description,
              explanation: item.explanation || `Core takeaway from ${matchedConcept.name}.`,
              type: (item.type as FlashcardType) || 'Conceptual',
              difficulty: (item.difficulty as QuestionDifficulty) || difficulty,
              sourceId: matchedLesson.id,
              sourceTitle: matchedLesson.title,
              isAiGenerated: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            generatedCards.push(newCard);
          }
        }
      } catch (err) {
        console.warn('Gemini flashcard generation failed, falling back to deterministic template generator:', err);
      }
    }

    // Deterministic Fallback if AI not configured or returned fewer cards than needed
    if (generatedCards.length < count) {
      const needed = count - generatedCards.length;
      for (let i = 0; i < needed; i++) {
        const c = relevantConcepts[i % relevantConcepts.length];
        const matchedLesson =
          targetLesson ||
          store.lessons.find((l) => l.conceptIds.includes(c.id)) ||
          store.lessons[0];

        const takeaway = c.keyTakeaways?.[i % c.keyTakeaways.length] || c.description;

        const fallbackTypes: FlashcardType[] = ['Definition', 'Conceptual', 'Recall', 'Application'];
        const cardType = fallbackTypes[i % fallbackTypes.length];

        let qText = `What is the primary role of ${c.name}?`;
        let aText = c.description;
        if (cardType === 'Recall') {
          qText = `State the core invariant or definition of ${c.name}.`;
          aText = takeaway;
        } else if (cardType === 'Application') {
          qText = `How is ${c.name} applied to solve domain computational problems?`;
          aText = `${c.name} guarantees correctness through: ${takeaway}`;
        }

        // Avoid exact question duplicate
        if (existingQuestions.includes(qText.toLowerCase())) {
          qText = `Explain the importance of ${c.name} in ${targetModule?.title || 'the curriculum'}.`;
        }

        const fallbackCard: Flashcard = {
          id: `fc_gen_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          subjectId,
          moduleId: targetModule?.id || matchedLesson.moduleId,
          lessonId: matchedLesson.id,
          conceptId: c.id,
          conceptName: c.name,
          question: qText,
          answer: aText,
          explanation: `Fundamental concept from syllabus lesson: ${matchedLesson.title}.`,
          type: cardType,
          difficulty,
          sourceId: matchedLesson.id,
          sourceTitle: matchedLesson.title,
          isAiGenerated: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        generatedCards.push(fallbackCard);
      }
    }

    // Persist new cards to store
    store.addFlashcards(generatedCards);

    return {
      generatedCards,
      count: generatedCards.length,
      sourceNote: `Grounded in ${relevantConcepts.length} syllabus concept(s) across module '${targetModule?.title || 'Syllabus'}'`,
    };
  }

  /**
   * 5. FLASHCARD STATISTICS & SUMMARY
   */
  public getStats(learnerId: string, subjectId: DomainId): FlashcardStats {
    const domainCards = store.getFlashcards({ subjectId });
    const progressMap = store.getAllLearnerFlashcardProgress(learnerId);
    const knowledgeGaps = learningPathEngine.detectKnowledgeGaps(learnerId, subjectId);
    const gapConceptIds = new Set(knowledgeGaps.map((g) => g.conceptId));
    const learner = store.learners.get(learnerId);

    let reviewedCount = 0;
    let needReviewCount = 0;
    let masteredCount = 0;
    let dueTodayCount = 0;
    const now = Date.now();

    for (const card of domainCards) {
      const prog = progressMap.get(card.id);
      if (prog && prog.reviewCount > 0) {
        reviewedCount++;
        if (prog.status === 'review_needed' || prog.lastRecallLevel === 'again') {
          needReviewCount++;
        } else if (prog.status === 'mastered') {
          masteredCount++;
        }

        if (prog.nextReviewAt && new Date(prog.nextReviewAt).getTime() <= now) {
          dueTodayCount++;
        }
      }
    }

    // Concept average mastery
    const domainConcepts = store.concepts.filter((c) => c.domainId === subjectId);
    let totalMastery = 0;
    for (const c of domainConcepts) {
      const m = learner?.conceptMasteries[c.id];
      totalMastery += m ? m.mastery : 0;
    }
    const averageMastery =
      domainConcepts.length > 0 ? Math.round((totalMastery / domainConcepts.length) * 100) : 0;

    return {
      totalAvailable: domainCards.length,
      totalReviewed: reviewedCount,
      needReviewCount,
      masteredCount,
      dueTodayCount,
      knowledgeGapsCount: gapConceptIds.size,
      averageMastery,
    };
  }

  /**
   * 6. SESSION SUMMARY & TARGETED RECOMMENDATIONS
   */
  public createSessionSummary(params: {
    sessionId: string;
    learnerId: string;
    subjectId: DomainId;
    moduleTitle?: string;
    reviewedCardIds: string[];
    recallResults: Record<string, FlashcardRecallLevel>;
    conceptMasteryBefore: Record<string, number>;
  }): FlashcardSessionSummary {
    const {
      sessionId,
      learnerId,
      subjectId,
      moduleTitle,
      reviewedCardIds,
      recallResults,
      conceptMasteryBefore,
    } = params;

    const domain = store.domains.find((d) => d.id === subjectId);
    const learner = store.learners.get(learnerId);

    let knownCount = 0;
    let needReviewCount = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    const conceptIdsSet = new Set<string>();

    for (const cardId of reviewedCardIds) {
      const level = recallResults[cardId];
      if (level === 'easy' || level === 'good') {
        knownCount++;
        correctCount++;
      } else if (level === 'hard') {
        correctCount++;
      } else {
        needReviewCount++;
        incorrectCount++;
      }

      const card = store.getFlashcardById(cardId);
      if (card) {
        conceptIdsSet.add(card.conceptId);
      }
    }

    const conceptsReviewed = Array.from(conceptIdsSet).map((cId) => {
      const c = store.concepts.find((item) => item.id === cId);
      return c?.name || cId;
    });

    // Detect concepts improved
    const conceptsImproved: FlashcardSessionSummary['conceptsImproved'] = [];
    const weakConceptsDetected: FlashcardSessionSummary['weakConceptsDetected'] = [];

    for (const cId of conceptIdsSet) {
      const oldM = conceptMasteryBefore[cId] || 0;
      const currentM = learner?.conceptMasteries[cId]?.mastery || 0;
      const cName = store.concepts.find((item) => item.id === cId)?.name || cId;

      if (currentM > oldM) {
        conceptsImproved.push({
          conceptId: cId,
          conceptName: cName,
          oldMastery: Math.round(oldM * 100),
          newMastery: Math.round(currentM * 100),
        });
      }

      if (currentM < 0.60) {
        weakConceptsDetected.push({
          conceptId: cId,
          conceptName: cName,
          reason: `Current mastery is ${Math.round(currentM * 100)}%. Requires additional review.`,
        });
      }
    }

    // Build targeted recommendations
    const recommendedActions: FlashcardSessionSummary['recommendedActions'] = [];

    for (const weak of weakConceptsDetected.slice(0, 3)) {
      const lesson = store.lessons.find((l) => l.conceptIds.includes(weak.conceptId));
      if (lesson) {
        recommendedActions.push({
          title: `Review ${lesson.title}`,
          description: `Strengthen fundamental prerequisites for ${weak.conceptName}.`,
          actionType: 'open_lesson',
          targetId: lesson.id,
          targetName: lesson.title,
        });
      }

      recommendedActions.push({
        title: `Consult AI Tutor on ${weak.conceptName}`,
        description: `Get targeted Socratic guidance and practice questions on ${weak.conceptName}.`,
        actionType: 'ask_tutor',
        targetId: weak.conceptId,
        targetName: weak.conceptName,
      });

      recommendedActions.push({
        title: `View ${weak.conceptName} in Mind Map`,
        description: `Inspect prerequisite graph and knowledge gap connections.`,
        actionType: 'view_mindmap',
        targetId: weak.conceptId,
        targetName: weak.conceptName,
      });
    }

    // Log in learning activity history
    store.logActivityEvent({
      id: `act_fc_sess_${Date.now()}`,
      learnerId,
      domainId: subjectId,
      type: 'FLASHCARD_SESSION_COMPLETED',
      title: `Completed Flashcard Session: ${moduleTitle || domain?.name || 'Syllabus'}`,
      description: `Reviewed ${reviewedCardIds.length} cards (${knownCount} known, ${needReviewCount} need review). ${conceptsImproved.length} concept(s) improved.`,
      timestamp: new Date().toISOString(),
      meta: {
        sessionId,
        cardsCount: reviewedCardIds.length,
        knownCount,
        needReviewCount,
      },
    });

    return {
      sessionId,
      subjectId,
      subjectTitle: domain?.name || subjectId,
      moduleTitle,
      cardsReviewed: reviewedCardIds.length,
      knownCount,
      needReviewCount,
      correctCount,
      incorrectCount,
      conceptsReviewed,
      weakConceptsDetected,
      conceptsImproved,
      recommendedActions,
      completedAt: new Date().toISOString(),
    };
  }
}

export const flashcardEngine = new FlashcardEngine();
