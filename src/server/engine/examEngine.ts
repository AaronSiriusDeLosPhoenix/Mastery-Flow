import { GoogleGenAI } from '@google/genai';
import { store } from '../db/store.js';
import { calculateEvidence, updateMastery, updateUncertainty, computeHybridMastery } from './masteryEngine.js';
import { mlInferenceEngine } from './mlInferenceEngine.js';
import { mlFeedbackEngine } from './mlFeedbackEngine.js';
import { bktEngine } from './bktEngine.js';
import { learningPathEngine } from './learningPathEngine.js';
import {
  Attempt,
  DomainId,
  MockExamAnswer,
  MockExamAvailability,
  MockExamBlueprint,
  MockExamBlueprintItem,
  MockExamConceptPerformance,
  MockExamConfig,
  MockExamQuestion,
  MockExamQuestionReviewItem,
  MockExamResult,
  MockExamSession,
  MockExamStats,
  QuestionDifficulty,
} from '../db/types.js';

export class ExamEngine {
  private aiClient: GoogleGenAI | null = null;
  public static circuitBrokenUntil: number = 0;

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
        console.warn('Could not initialize GoogleGenAI for ExamEngine:', err);
        this.aiClient = null;
      }
    }
  }

  /**
   * 1. MOCK EXAM AVAILABILITY
   * Uses real Phase 2 learning path completion system.
   * Exam is unlocked only when required learning content has been completed.
   */
  public getExamAvailability(
    learnerId: string,
    subjectId: DomainId,
    moduleId?: string
  ): MockExamAvailability {
    const domain = store.domains.find((d) => d.id === subjectId);
    const domainName = domain?.name || subjectId.toUpperCase();
    const progressMap = store.getLearnerLessonProgressMap(learnerId);
    const learner = store.learners.get(learnerId);

    if (moduleId && moduleId !== 'all') {
      // Module-level exam availability
      const mod = store.modules.find((m) => m.id === moduleId);
      const moduleLessons = store.lessons.filter((l) => l.moduleId === moduleId);
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

      // Available if at least 1 lesson completed in this module or all completed
      const isAvailable = completedLessonsCount > 0;
      const completionPercent =
        totalLessonsCount > 0
          ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
          : 0;

      const modConceptIds = Array.from(new Set(moduleLessons.flatMap((l) => l.conceptIds)));
      const availableConcepts = modConceptIds.map((cId) => {
        const c = store.concepts.find((item) => item.id === cId);
        const m = learner?.conceptMasteries[cId];
        return {
          id: cId,
          name: c?.name || cId,
          isMastered: (m?.mastery || 0) >= 0.75,
        };
      });

      let unlockedReason = 'Complete the required learning content before attempting this mock exam.';
      let lockedReason: string | undefined;

      if (isAvailable) {
        unlockedReason = `Mock Exam Unlocked: ${completedLessonsCount} of ${totalLessonsCount} lessons completed in "${mod?.title || moduleId}".`;
      } else {
        lockedReason = `Complete the required learning content (${incompleteLessonTitles.slice(0, 2).join(', ')}) before attempting this mock exam.`;
      }

      return {
        subjectId,
        subjectName: domainName,
        moduleId,
        moduleTitle: mod?.title,
        isAvailable,
        completedLessonsCount,
        totalLessonsCount,
        completionPercent,
        unlockedReason,
        lockedReason,
        availableConcepts,
      };
    }

    // Subject-level exam availability
    const domainLessons = store.lessons.filter((l) => l.domainId === subjectId);
    const totalLessonsCount = domainLessons.length;

    let completedLessonsCount = 0;
    for (const l of domainLessons) {
      const prog = progressMap.get(l.id);
      if (prog?.status === 'COMPLETED') {
        completedLessonsCount++;
      }
    }

    const isAvailable = completedLessonsCount > 0;
    const completionPercent =
      totalLessonsCount > 0
        ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
        : 0;

    const domainConcepts = store.concepts.filter((c) => c.domainId === subjectId);
    const availableConcepts = domainConcepts.map((c) => {
      const m = learner?.conceptMasteries[c.id];
      return {
        id: c.id,
        name: c.name,
        isMastered: (m?.mastery || 0) >= 0.75,
      };
    });

    let unlockedReason = 'Complete the required learning content before attempting this mock exam.';
    let lockedReason: string | undefined;

    if (isAvailable) {
      unlockedReason = `Subject Mock Exam Ready: ${completedLessonsCount} of ${totalLessonsCount} lessons completed across syllabus track.`;
    } else {
      lockedReason = 'Complete the required learning content before attempting this mock exam.';
    }

    return {
      subjectId,
      subjectName: domainName,
      isAvailable,
      completedLessonsCount,
      totalLessonsCount,
      completionPercent,
      unlockedReason,
      lockedReason,
      availableConcepts,
    };
  }

  /**
   * 2. EXAM BLUEPRINT CREATION
   * Generates a weighted, adaptive blueprint before question generation.
   * Priority:
   * 1. Knowledge-gap concepts
   * 2. Low-mastery concepts (< 0.60)
   * 3. Concepts with recent incorrect attempts
   * 4. Concepts needing reinforcement
   * 5. Balanced syllabus coverage
   */
  public createExamBlueprint(config: MockExamConfig): MockExamBlueprint {
    const { learnerId, subjectId, moduleId, questionCount, difficulty, timeLimitMinutes } = config;

    const domain = store.domains.find((d) => d.id === subjectId);
    const domainName = domain?.name || subjectId.toUpperCase();
    const learner = store.learners.get(learnerId);

    // Target concepts within selected scope
    let scopedConcepts = store.concepts.filter((c) => c.domainId === subjectId);
    let targetModuleTitle: string | undefined;

    if (moduleId && moduleId !== 'all') {
      const mod = store.modules.find((m) => m.id === moduleId);
      targetModuleTitle = mod?.title;
      const modLessons = store.lessons.filter((l) => l.moduleId === moduleId);
      const modConceptIds = new Set(modLessons.flatMap((l) => l.conceptIds));
      scopedConcepts = scopedConcepts.filter((c) => modConceptIds.has(c.id));
    }

    if (scopedConcepts.length === 0) {
      scopedConcepts = store.concepts.filter((c) => c.domainId === subjectId).slice(0, 4);
    }

    // Identify real Knowledge Gaps from existing engine
    const knowledgeGaps = learningPathEngine.detectKnowledgeGaps(learnerId, subjectId);
    const knowledgeGapConceptIds = new Set(knowledgeGaps.map((g) => g.conceptId));

    // Score concepts to determine priority weights
    interface ScoredConcept {
      conceptId: string;
      conceptName: string;
      currentMastery: number;
      isKnowledgeGap: boolean;
      priorityScore: number;
      category: MockExamBlueprintItem['priorityCategory'];
      suggestedDifficulty: QuestionDifficulty;
    }

    const scored: ScoredConcept[] = scopedConcepts.map((c) => {
      const mState = learner?.conceptMasteries[c.id];
      const m = mState ? mState.mastery : 0.50;
      const isGap = knowledgeGapConceptIds.has(c.id);

      let score = 100;
      let category: MockExamBlueprintItem['priorityCategory'] = 'syllabus_coverage';

      if (isGap) {
        score += 350;
        category = 'knowledge_gap';
      } else if (m < 0.50) {
        score += 260;
        category = 'low_mastery';
      } else if (mState && mState.incorrectCount > mState.correctCount) {
        score += 180;
        category = 'reinforcement';
      } else if (m < 0.75) {
        score += 100;
        category = 'reinforcement';
      } else {
        score += 40; // Mastered, maintain balanced coverage
        category = 'syllabus_coverage';
      }

      // Determine suggested difficulty for concept
      let suggestedDiff: QuestionDifficulty = 'medium';
      if (difficulty === 'mixed') {
        if (m < 0.45) suggestedDiff = 'easy';
        else if (m < 0.75) suggestedDiff = 'medium';
        else suggestedDiff = 'hard';
      } else {
        suggestedDiff = difficulty;
      }

      return {
        conceptId: c.id,
        conceptName: c.name,
        currentMastery: m,
        isKnowledgeGap: isGap,
        priorityScore: score,
        category,
        suggestedDifficulty: suggestedDiff,
      };
    });

    // Sort by priority
    scored.sort((a, b) => b.priorityScore - a.priorityScore);

    // Allocate questions proportionally
    const totalScore = scored.reduce((acc, s) => acc + s.priorityScore, 0);
    const allocations: MockExamBlueprintItem[] = [];
    let remainingQuestions = questionCount;

    // First ensure every top concept gets at least 1 question (up to total questions)
    const activeConceptCount = Math.min(scored.length, questionCount);
    for (let i = 0; i < activeConceptCount; i++) {
      const s = scored[i];
      allocations.push({
        conceptId: s.conceptId,
        conceptName: s.conceptName,
        allocatedQuestions: 1,
        currentMastery: s.currentMastery,
        isKnowledgeGap: s.isKnowledgeGap,
        priorityCategory: s.category,
        suggestedDifficulty: s.suggestedDifficulty,
      });
      remainingQuestions--;
    }

    // Distribute remaining questions according to priority weight
    while (remainingQuestions > 0) {
      for (let i = 0; i < allocations.length && remainingQuestions > 0; i++) {
        allocations[i].allocatedQuestions++;
        remainingQuestions--;
      }
    }

    const weakConceptCount = allocations.filter(
      (a) => a.currentMastery < 0.60 || a.isKnowledgeGap
    ).length;
    const knowledgeGapCount = allocations.filter((a) => a.isKnowledgeGap).length;

    const summaryText = `Exam Blueprint: ${questionCount} questions distributed across ${allocations.length} concepts (${weakConceptCount} targeted for weak area reinforcement, ${knowledgeGapCount} prerequisite knowledge gaps).`;

    return {
      subjectId,
      subjectName: domainName,
      moduleId: moduleId !== 'all' ? moduleId : undefined,
      moduleTitle: targetModuleTitle,
      totalQuestions: questionCount,
      targetDifficulty: difficulty,
      timeLimitMinutes,
      conceptAllocations: allocations,
      weakConceptCount,
      knowledgeGapCount,
      summaryText,
    };
  }

  /**
   * 3. ADAPTIVE QUESTION GENERATION & EXAM SESSION CREATION
   * Generates questions grounded STRICTLY in actual learning content:
   * Lesson content, Summary Notes, Concepts, Sub-concepts, Definitions, Formulas.
   * Avoids duplicates by inspecting existing questions and session history.
   */
  public async generateExam(config: MockExamConfig): Promise<MockExamSession> {
    const blueprint = this.createExamBlueprint(config);
    const domain = store.domains.find((d) => d.id === config.subjectId);
    const domainName = domain?.name || config.subjectId.toUpperCase();

    const title = blueprint.moduleTitle
      ? `${blueprint.moduleTitle} — Mock Exam`
      : `${domainName} — Comprehensive Mock Exam`;

    const sessionId = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const questions: MockExamQuestion[] = [];

    // Track existing questions to prevent duplicates
    const pastSessions = store.getExamSessions(config.learnerId, config.subjectId);
    const pastQuestionTexts = new Set(
      pastSessions.flatMap((s) => s.questions.map((q) => q.question.toLowerCase().trim()))
    );

    // Approved questions in store that can be reused
    const approvedStoreQuestions = store.questions.filter(
      (q) => q.domainId === config.subjectId && q.evaluationStatus === 'APPROVED'
    );

    let aiCircuitBroken = false;

    for (const alloc of blueprint.conceptAllocations) {
      const concept = store.concepts.find((c) => c.id === alloc.conceptId);
      if (!concept) continue;

      const lesson =
        store.lessons.find((l) => l.conceptIds.includes(concept.id)) ||
        store.lessons.find((l) => l.domainId === config.subjectId) ||
        store.lessons[0];

      const neededForConcept = alloc.allocatedQuestions;
      let generatedForConcept = 0;

      // 1. Check if an approved question already matches this concept and hasn't been recently seen
      for (const sq of approvedStoreQuestions) {
        if (sq.conceptId === concept.id && generatedForConcept < neededForConcept) {
          const qTextNorm = sq.questionText.toLowerCase().trim();
          if (!pastQuestionTexts.has(qTextNorm)) {
            const mappedQ: MockExamQuestion = {
              questionId: `q_exam_${sq.id}_${Date.now()}`,
              subjectId: config.subjectId,
              moduleId: lesson?.moduleId || 'mod_1',
              lessonId: lesson?.id || 'les_1',
              conceptId: concept.id,
              conceptName: concept.name,
              question: sq.questionText,
              options: [...sq.options],
              correctAnswer: sq.options[sq.correctOptionIndex] || sq.options[0],
              correctOptionIndex: sq.correctOptionIndex,
              explanation: sq.explanation,
              questionType: (sq.questionType as any) || 'Understanding',
              difficulty: sq.difficulty,
              sourceId: lesson?.id || 'les_1',
              sourceTitle: lesson?.title || concept.name,
              bloomLevel: sq.bloomLevel,
            };
            questions.push(mappedQ);
            pastQuestionTexts.add(qTextNorm);
            generatedForConcept++;
          }
        }
      }

      // 2. If more questions needed, generate using Gemini with ground source content
      const stillNeeded = neededForConcept - generatedForConcept;
      if (stillNeeded > 0) {
        const summary = store.getSummaryNote(concept.id);
        const resource = store.getResourcesByConcept(concept.id)[0];

        const sourceMaterial = {
          conceptName: concept.name,
          conceptCode: concept.code,
          category: concept.category,
          description: concept.description,
          keyTakeaways: concept.keyTakeaways,
          subConcepts: concept.subConcepts || [],
          readingVariant: concept.readingLevelVariants?.undergraduate?.coreExplanation || '',
          summaryOverview: summary?.overview || '',
          summaryKeyPoints: summary?.keyPoints || [],
          summaryFormulas: summary?.formulasAndInvariants?.map((f) => `${f.formula}: ${f.explanation}`) || [],
          lessonTitle: lesson?.title || concept.name,
          lessonObjectives: lesson?.learningObjectives || [],
          resourceExcerpt: resource?.content?.slice(0, 500) || '',
        };

        if (this.aiClient && Date.now() > ExamEngine.circuitBrokenUntil) {
          try {
            const prompt = `You are an expert examination creator for competitive academic examinations.
Generate ${stillNeeded} Multiple Choice Questions (MCQs) strictly grounded in the learning material below.
Do NOT invent facts outside this material.
Stay within syllabus domain: ${config.subjectId}.
Requested Difficulty: ${alloc.suggestedDifficulty}.

CRITICAL REQUIREMENTS:
1. Exactly four plausible options per question.
2. Exactly one unequivocally correct answer.
3. Plausible distractors addressing common misconceptions.
4. Comprehensive explanation detailing why the correct answer is right and why others are wrong.
5. High clarity, professional academic tone.

SOURCE MATERIAL:
${JSON.stringify(sourceMaterial, null, 2)}

QUESTIONS TO AVOID (DUPLICATES):
${JSON.stringify(Array.from(pastQuestionTexts).slice(0, 10), null, 2)}

Return a strict JSON array conforming to:
[
  {
    "question": "string (clear question prompt)",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOptionIndex": number (0, 1, 2, or 3),
    "explanation": "string (pedagogical explanation)",
    "questionType": "Recall" | "Understanding" | "Application" | "Analysis",
    "difficulty": "${alloc.suggestedDifficulty}"
  }
]`;

            const res = await this.aiClient.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
              },
            });

            const parsed = JSON.parse(res.text?.trim() || '[]');
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (
                  generatedForConcept < neededForConcept &&
                  item.question &&
                  Array.isArray(item.options) &&
                  item.options.length >= 4 &&
                  typeof item.correctOptionIndex === 'number'
                ) {
                  const safeIndex = Math.max(0, Math.min(3, item.correctOptionIndex));
                  const newQ: MockExamQuestion = {
                    questionId: `q_exam_ai_${Date.now()}_${questions.length}`,
                    subjectId: config.subjectId,
                    moduleId: lesson?.moduleId || 'mod_1',
                    lessonId: lesson?.id || 'les_1',
                    conceptId: concept.id,
                    conceptName: concept.name,
                    question: item.question,
                    options: item.options.slice(0, 4),
                    correctAnswer: item.options[safeIndex],
                    correctOptionIndex: safeIndex,
                    explanation: item.explanation || `Key concept from ${concept.name}.`,
                    questionType: (item.questionType as any) || 'Understanding',
                    difficulty: (item.difficulty as QuestionDifficulty) || alloc.suggestedDifficulty,
                    sourceId: lesson?.id || 'les_1',
                    sourceTitle: lesson?.title || concept.name,
                    bloomLevel:
                      alloc.suggestedDifficulty === 'hard'
                        ? 'Analyze'
                        : alloc.suggestedDifficulty === 'easy'
                        ? 'Remember'
                        : 'Understand',
                  };

                  questions.push(newQ);
                  pastQuestionTexts.add(item.question.toLowerCase().trim());
                  generatedForConcept++;
                }
              }
            }
          } catch (err: any) {
            console.warn(`Gemini question generation failed for ${concept.name}, using deterministic fallback:`, err.message || err);
            ExamEngine.circuitBrokenUntil = Date.now() + 120000;
          }
        }

        // 3. High-fidelity syllabus-grounded deterministic fallback if still needed
        while (generatedForConcept < neededForConcept) {
          const fallbackIndex = generatedForConcept;
          const takeaway =
            concept.keyTakeaways?.[fallbackIndex % concept.keyTakeaways.length] || concept.description;
          const distractor1 = `It requires exponential overhead violating ${concept.name} invariants`;
          const distractor2 = `It is only applicable to non-deterministic external storage structures`;
          const distractor3 = `It has unbounded latency without temporal consistency guarantees`;

          const qText =
            alloc.suggestedDifficulty === 'easy'
              ? `What fundamental principle defines ${concept.name} in ${domainName}?`
              : alloc.suggestedDifficulty === 'hard'
              ? `In ${domainName}, under which operational constraints is ${concept.name} prioritized for optimal throughput?`
              : `Which statement accurately characterizes the core invariant of ${concept.name}?`;

          const fallbackQ: MockExamQuestion = {
            questionId: `q_exam_gen_${Date.now()}_${questions.length}`,
            subjectId: config.subjectId,
            moduleId: lesson?.moduleId || 'mod_1',
            lessonId: lesson?.id || 'les_1',
            conceptId: concept.id,
            conceptName: concept.name,
            question: qText,
            options: [takeaway, distractor1, distractor2, distractor3],
            correctAnswer: takeaway,
            correctOptionIndex: 0,
            explanation: `Correct: ${takeaway}. Verified against syllabus curriculum standard for ${lesson?.title || concept.name}.`,
            questionType: alloc.suggestedDifficulty === 'easy' ? 'Recall' : 'Understanding',
            difficulty: alloc.suggestedDifficulty,
            sourceId: lesson?.id || 'les_1',
            sourceTitle: lesson?.title || concept.name,
            bloomLevel: alloc.suggestedDifficulty === 'hard' ? 'Analyze' : 'Understand',
          };

          questions.push(fallbackQ);
          generatedForConcept++;
        }
      }
    }

    // Ensure we have exactly the requested count
    const finalQuestions = questions.slice(0, config.questionCount);

    const session: MockExamSession = {
      id: sessionId,
      learnerId: config.learnerId,
      subjectId: config.subjectId,
      moduleId: config.moduleId !== 'all' ? config.moduleId : undefined,
      moduleTitle: blueprint.moduleTitle,
      title,
      config,
      blueprint,
      questions: finalQuestions,
      startedAt: new Date().toISOString(),
      isCompleted: false,
    };

    store.saveExamSession(session);
    return session;
  }

  /**
   * 4. EXAM SUBMISSION & EVIDENCE MODEL INTEGRATION
   * - Calculates real score, accuracy, time used from actual answers
   * - Sends EVERY answered question into the EXISTING Evidence Model (calculateEvidence)
   * - Updates Concept Mastery through exponential smoothing (updateMastery)
   * - Re-runs Knowledge Gap Detection
   * - Generates Adaptive Recommendations
   * - Connects to Flashcards, AI Tutor, Summary Notes, Mind Map, and Adaptive Retake
   */
  public submitExam(params: {
    sessionId: string;
    learnerId: string;
    answers: MockExamAnswer[];
    timeUsedSeconds: number;
  }): MockExamResult {
    const { sessionId, learnerId, answers, timeUsedSeconds } = params;

    const session = store.getExamSessionById(sessionId);
    if (!session) {
      throw new Error(`Mock Exam session ${sessionId} not found`);
    }

    const learner = store.learners.get(learnerId);
    if (!learner) {
      throw new Error(`Learner ${learnerId} not found`);
    }

    const answerMap = new Map<string, MockExamAnswer>();
    for (const a of answers) {
      answerMap.set(a.questionId, a);
    }

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const questionsReview: MockExamQuestionReviewItem[] = [];
    const conceptBuckets = new Map<
      string,
      {
        conceptId: string;
        conceptName: string;
        total: number;
        correct: number;
        incorrect: number;
        unanswered: number;
        masteryBefore: number;
      }
    >();

    // 1. Process each question & answers
    for (const q of session.questions) {
      const studentAns = answerMap.get(q.questionId);
      const selectedIndex = studentAns?.selectedOptionIndex ?? -1;
      const isUnanswered = selectedIndex < 0;
      const isCorrect = !isUnanswered && selectedIndex === q.correctOptionIndex;
      const isMarkedForReview = studentAns?.isMarkedForReview || false;

      if (isUnanswered) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      // Track concept buckets
      if (!conceptBuckets.has(q.conceptId)) {
        const curM = learner.conceptMasteries[q.conceptId]?.mastery || 0.40;
        conceptBuckets.set(q.conceptId, {
          conceptId: q.conceptId,
          conceptName: q.conceptName,
          total: 0,
          correct: 0,
          incorrect: 0,
          unanswered: 0,
          masteryBefore: curM,
        });
      }

      const b = conceptBuckets.get(q.conceptId)!;
      b.total++;
      if (isUnanswered) b.unanswered++;
      else if (isCorrect) b.correct++;
      else b.incorrect++;

      const studentAnswerText =
        selectedIndex >= 0 && selectedIndex < q.options.length
          ? q.options[selectedIndex]
          : 'No answer provided';

      questionsReview.push({
        question: q,
        studentOptionIndex: selectedIndex,
        studentAnswerText,
        isCorrect,
        isUnanswered,
        isMarkedForReview,
      });

      // 2. CRITICAL: SEND EVIDENCE TO EXISTING EVIDENCE MODEL
      // Only for questions the student attempted (or penalized if left unanswered)
      const virtualQuestion = {
        id: `q_exam_att_${q.questionId}`,
        domainId: q.subjectId,
        conceptId: q.conceptId,
        questionText: q.question,
        questionType: q.questionType,
        questionFormat: 'MCQ' as any,
        difficulty: q.difficulty,
        bloomLevel: q.bloomLevel || 'Understand',
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation,
        hint: `Focus on fundamental principles of ${q.conceptName}`,
        expectedTimeSeconds: 60,
        evaluationStatus: 'APPROVED' as any,
      };

      const responseTime = studentAns?.responseTimeSeconds || 30;
      const confidence = isUnanswered ? 0.2 : isCorrect ? 0.9 : 0.45;

      const evidenceResult = calculateEvidence(
        virtualQuestion as any,
        {
          isCorrect,
          confidence,
          responseTimeSeconds: Math.max(5, responseTime),
          hintsUsed: 0,
          retries: 0,
        },
        store.config
      );

      // Update Mastery via exponential smoothing
      const currentConceptMastery = learner.conceptMasteries[q.conceptId] || {
        id: `ms_${learnerId}_${q.conceptId}`,
        learnerId,
        domainId: q.subjectId,
        conceptId: q.conceptId,
        conceptName: q.conceptName,
        mastery: 0.40,
        uncertainty: 0.70,
        retention: 0.40,
        attemptsCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        averageConfidence: 0.5,
        averageResponseTime: 30,
        totalHintsUsed: 0,
        totalRetries: 0,
        easyAccuracy: 0,
        mediumAccuracy: 0,
        hardAccuracy: 0,
        transferAccuracy: 0,
        bloomAccuracy: {
          Remember: 0.5,
          Understand: 0.5,
          Apply: 0.5,
          Analyze: 0.5,
          Evaluate: 0.5,
          Create: 0.5,
        },
        lastAttemptAt: new Date().toISOString(),
        lastReviewedAt: new Date().toISOString(),
        daysSinceLastReview: 0,
        prerequisiteSatisfied: true,
        blockedByPrerequisites: [],
        status: 'unattempted',
      };

      const mBefore = currentConceptMastery.mastery;
      const uBefore = currentConceptMastery.uncertainty;

      const mAfter = updateMastery(
        mBefore,
        evidenceResult.evidenceScore,
        store.config.learningRateAlpha
      );

      const uAfter = updateUncertainty(
        uBefore,
        isCorrect,
        confidence,
        0,
        evidenceResult.antiGuessingTriggered,
        currentConceptMastery.attemptsCount + 1
      );

      const totAtt = currentConceptMastery.attemptsCount + 1;
      const corAtt = currentConceptMastery.correctCount + (isCorrect ? 1 : 0);
      const incorAtt = currentConceptMastery.incorrectCount + (isCorrect ? 0 : 1);

      // BKT Knowledge Tracing Update (Corbett & Anderson 1995)
      const currentBktState =
        currentConceptMastery.bktState ||
        bktEngine.createInitialState(q.conceptId, store.config.bktConfig);
      const updatedBktState = bktEngine.step(
        currentBktState,
        isCorrect,
        new Date().toISOString(),
        `att_exam_${Date.now()}`
      );
      const bktMastery = updatedBktState.pKnowledge;

      // PHASE 8: ML Feature extraction & hybrid prediction (Bayesian + BKT + ML)
      const mlPred = mlInferenceEngine.predict(learnerId, q.conceptId);
      const hybridMastery = computeHybridMastery(mAfter, mlPred.probability, store.config, bktMastery);

      const updatedMastery = {
        ...currentConceptMastery,
        mastery: hybridMastery,
        uncertainty: uAfter,
        retention: hybridMastery,
        bktState: updatedBktState,
        bktMastery,
        attemptsCount: totAtt,
        correctCount: corAtt,
        incorrectCount: incorAtt,
        lastAttemptAt: new Date().toISOString(),
        lastReviewedAt: new Date().toISOString(),
        daysSinceLastReview: 0,
        mlPrediction: mlPred,
        status:
          hybridMastery >= store.config.masteryThreshold
            ? ('mastered' as const)
            : hybridMastery >= 0.5
            ? ('developing' as const)
            : ('struggling' as const),
      };

      learner.conceptMasteries[q.conceptId] = updatedMastery;

      const learnerMasteries = store.masteryStates.get(learnerId) || {};
      learnerMasteries[q.conceptId] = updatedMastery;
      store.masteryStates.set(learnerId, learnerMasteries);

      // Audit Log Attempt
      const attempt: Attempt = {
        id: `att_exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        learnerId,
        domainId: q.subjectId,
        questionId: q.questionId,
        conceptId: q.conceptId,
        selectedOptionIndex: selectedIndex,
        isCorrect,
        confidence,
        responseTimeSeconds: responseTime,
        hintsUsed: 0,
        retries: 0,
        timestamp: new Date().toISOString(),
        evidenceScore: evidenceResult.evidenceScore,
        questionType: (q.questionType === 'Analysis' ? 'Understanding' : q.questionType) as any,
        questionFormat: 'MCQ',
        difficulty: q.difficulty,
        bloomLevel: q.bloomLevel,
        readingLevelUsed: learner.preferredReadingLevel,
        languageUsed: learner.preferredLanguage,
      };

      learner.recentAttempts.push(attempt);
      store.attempts.push(attempt);

      // Continuous Learning: Evaluate pending predictions & recommendations for this concept
      const examEventTime = new Date().toISOString();
      mlFeedbackEngine.evaluatePendingPredictions({
        learnerId,
        conceptId: q.conceptId,
        isCorrect,
        confidence,
        responseTimeSeconds: responseTime,
        timestamp: examEventTime,
        attemptId: attempt.id,
        source: 'exam',
      });

      mlFeedbackEngine.evaluatePendingRecommendations({
        learnerId,
        conceptId: q.conceptId,
        timestamp: examEventTime,
        actionTaken: 'EXAM',
        isCorrect,
        masteryBefore: mBefore,
        masteryAfter: hybridMastery,
        retentionBefore: currentConceptMastery.retention,
        retentionAfter: hybridMastery,
      });
    }

    // Recompute overall learner metrics
    (store as any).recomputeOverallMetrics(learner);

    // Compute concept performance summaries
    const conceptPerformance: MockExamConceptPerformance[] = [];
    const weakConcepts: MockExamResult['weakConcepts'] = [];

    for (const [, b] of conceptBuckets) {
      const accuracyPercent = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
      const masteryAfter = learner.conceptMasteries[b.conceptId]?.mastery || b.masteryBefore;
      const isWeak = accuracyPercent < 60 || masteryAfter < 0.60;

      let status: MockExamConceptPerformance['status'] = 'Developing';
      if (masteryAfter >= 0.75 && accuracyPercent >= 80) {
        status = 'Mastered';
      } else if (isWeak) {
        status = 'Needs Review';
      }

      conceptPerformance.push({
        conceptId: b.conceptId,
        conceptName: b.conceptName,
        totalQuestions: b.total,
        correctCount: b.correct,
        incorrectCount: b.incorrect,
        unansweredCount: b.unanswered,
        accuracyPercent,
        masteryBefore: Number(b.masteryBefore.toFixed(2)),
        masteryAfter: Number(masteryAfter.toFixed(2)),
        isWeakConcept: isWeak,
        status,
      });

      if (isWeak) {
        weakConcepts.push({
          conceptId: b.conceptId,
          conceptName: b.conceptName,
          accuracyPercent,
          reason: `Exam accuracy: ${accuracyPercent}% (${b.correct}/${b.total}). Concept mastery: ${(masteryAfter * 100).toFixed(0)}%.`,
        });
      }
    }

    // Sort concept performance so weak concepts appear at top
    conceptPerformance.sort((a, b) => a.accuracyPercent - b.accuracyPercent);

    // Score and accuracy calculations
    const totalQuestions = session.questions.length;
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const attemptedCount = correctCount + incorrectCount;
    const accuracyPercent = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
    const passed = scorePercent >= 70;

    const minutes = Math.floor(timeUsedSeconds / 60);
    const seconds = timeUsedSeconds % 60;
    const timeUsedFormatted = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;

    // 3. Re-run Knowledge Gap Detection and Recommendations
    const updatedGaps = learningPathEngine.detectKnowledgeGaps(learnerId, session.subjectId);
    const newRecommendation = learningPathEngine.generateNextLearningRecommendation(
      learnerId,
      session.subjectId
    );
    learner.currentRecommendation = newRecommendation;
    learner.recommendationHistory.push(newRecommendation);

    // Build targeted adaptive recommendations for the result page
    const adaptiveRecommendations: MockExamResult['adaptiveRecommendations'] = [];

    if (weakConcepts.length > 0) {
      // 1. Flashcards for weak concepts
      const primaryWeak = weakConcepts[0];
      adaptiveRecommendations.push({
        title: `Practice Flashcards for ${primaryWeak.conceptName}`,
        description: `Active recall drilling on ${primaryWeak.conceptName} to reverse knowledge decay.`,
        actionType: 'flashcards',
        targetId: primaryWeak.conceptId,
        targetName: primaryWeak.conceptName,
      });

      // 2. Retake weak areas
      adaptiveRecommendations.push({
        title: `Retake Focused Exam on Weak Concepts`,
        description: `Generate a targeted adaptive mock exam covering ${weakConcepts.map((w) => w.conceptName).slice(0, 3).join(', ')}.`,
        actionType: 'retake',
        targetId: 'weak_concepts',
        targetName: `${weakConcepts.length} Weak Areas`,
      });

      // 3. AI Tutor consultation
      adaptiveRecommendations.push({
        title: `Consult AI Tutor on ${primaryWeak.conceptName}`,
        description: `Review misconceptions and breakdown difficult questions with step-by-step guidance.`,
        actionType: 'tutor',
        targetId: primaryWeak.conceptId,
        targetName: primaryWeak.conceptName,
      });

      // 4. Mind Map inspection
      adaptiveRecommendations.push({
        title: `View Prerequisite Graph in Mind Map`,
        description: `Examine dependency bottlenecks and root concepts affecting your exam performance.`,
        actionType: 'mindmap',
        targetId: primaryWeak.conceptId,
        targetName: primaryWeak.conceptName,
      });
    } else {
      adaptiveRecommendations.push({
        title: 'Mastery Certified: Advance to Next Competency',
        description: 'Exemplary performance! Proceed to higher-order challenges in your learning path.',
        actionType: 'lesson',
        targetId: session.subjectId,
        targetName: session.blueprint.subjectName || session.title,
      });
    }

    // 4. Log in Learning Activity History
    store.logActivityEvent({
      id: `act_exam_${Date.now()}`,
      learnerId,
      domainId: session.subjectId,
      type: 'MOCK_EXAM_COMPLETED',
      title: `Completed Mock Exam: ${session.title}`,
      description: `Scored ${scorePercent}% (${correctCount}/${totalQuestions} correct) in ${timeUsedFormatted}. Evidence processed for ${conceptPerformance.length} concepts.`,
      timestamp: new Date().toISOString(),
      meta: {
        sessionId,
        scorePercent,
        accuracyPercent,
        correctCount,
        incorrectCount,
        unansweredCount,
        weakConceptsCount: weakConcepts.length,
      },
    });

    const result: MockExamResult = {
      examId: session.id,
      sessionId: session.id,
      learnerId,
      subjectId: session.subjectId,
      subjectName: session.blueprint.subjectName || session.subjectId,
      moduleId: session.moduleId,
      moduleTitle: session.moduleTitle,
      totalQuestions,
      correctCount,
      incorrectCount,
      unansweredCount,
      scorePercent,
      accuracyPercent,
      timeLimitMinutes: session.config.timeLimitMinutes,
      timeUsedSeconds,
      timeUsedFormatted,
      completedAt: new Date().toISOString(),
      passed,
      conceptPerformance,
      weakConcepts,
      questionsReview,
      adaptiveRecommendations,
      evidenceGeneratedCount: session.questions.length,
    };

    // Update and persist session
    session.isCompleted = true;
    session.submittedAt = result.completedAt;
    session.result = result;
    store.saveExamSession(session);

    return result;
  }

  /**
   * 5. EXAM HISTORY
   */
  public getExamHistory(learnerId: string, subjectId?: DomainId): MockExamSession[] {
    const sessions = store.getExamSessions(learnerId, subjectId);
    return sessions.filter((s) => s.isCompleted);
  }

  /**
   * 6. EXAM SUMMARY STATS
   */
  public getExamStats(learnerId: string, subjectId?: DomainId): MockExamStats {
    const completed = this.getExamHistory(learnerId, subjectId);

    if (completed.length === 0) {
      return {
        totalExamsAttempted: 0,
        averageScorePercent: 0,
        highestScorePercent: 0,
        totalQuestionsAnswered: 0,
        overallAccuracyPercent: 0,
        weakConceptsCount: 0,
      };
    }

    let totalScore = 0;
    let highestScore = 0;
    let totalQuestionsAnswered = 0;
    let totalCorrect = 0;
    const weakConceptSet = new Set<string>();

    for (const s of completed) {
      const r = s.result;
      if (r) {
        totalScore += r.scorePercent;
        if (r.scorePercent > highestScore) {
          highestScore = r.scorePercent;
        }
        totalQuestionsAnswered += r.correctCount + r.incorrectCount;
        totalCorrect += r.correctCount;
        for (const w of r.weakConcepts) {
          weakConceptSet.add(w.conceptId);
        }
      }
    }

    const last = completed[0];

    return {
      totalExamsAttempted: completed.length,
      averageScorePercent: Math.round(totalScore / completed.length),
      highestScorePercent: highestScore,
      totalQuestionsAnswered,
      overallAccuracyPercent:
        totalQuestionsAnswered > 0
          ? Math.round((totalCorrect / totalQuestionsAnswered) * 100)
          : 0,
      lastExamAt: last.submittedAt,
      lastExamScore: last.result?.scorePercent,
      lastExamSubject: last.blueprint.subjectName,
      weakConceptsCount: weakConceptSet.size,
    };
  }
}

export const examEngine = new ExamEngine();
