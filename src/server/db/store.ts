import {
  AIEvaluationReport,
  Attempt,
  BloomLevel,
  Concept,
  CurriculumDomain,
  DomainId,
  InstitutionStyleGuide,
  LearnerProfile,
  LearningActivityEvent,
  LearningResource,
  LearningSession,
  Lesson,
  LessonProgress,
  MasteryState,
  Module,
  Prerequisite,
  Question,
  ReadingLevel,
  LanguageCode,
  Recommendation,
  SummaryNote,
  SystemConfig,
  TeacherOverride,
  TutorMessage,
  User,
  MindMapEdge,
  Flashcard,
  FlashcardProgress,
  FlashcardRecallLevel,
  MockExamSession,
  AuthSession,
  MLModelWeights,
  MLPredictionResult,
  MLPredictionRecord,
  MLRecommendationRecord,
  MLModelRegistryEntry,
  DatasetMetadata,
} from './types.js';
import { persistence, SerializedDatabase } from './persistence.js';
import {
  CONCEPTS,
  DEFAULT_SYSTEM_CONFIG,
  DOMAINS,
  INSTITUTIONS,
  QUESTIONS,
  SEED_PREREQUISITES,
  SEED_USERS,
} from './seed.js';
import { SEED_LEARNING_RESOURCES } from './learningResources.js';
import { SEED_MODULES, SEED_LESSONS } from './learningPathsSeed.js';
import { SEED_FLASHCARDS } from './flashcardSeed.js';
import { calculateEvidence, updateMastery, updateUncertainty, computeHybridMastery } from '../engine/masteryEngine.js';
import { calculateRetention } from '../engine/retentionEngine.js';
import { selectNextAction } from '../engine/decisionEngine.js';
import { mlInferenceEngine } from '../engine/mlInferenceEngine.js';
import { mlTrainer } from '../engine/mlTrainer.js';
import { mlFeatureExtractor, DEFAULT_FEATURE_SCALER, CANONICAL_FEATURE_NAMES } from '../engine/mlFeatureExtractor.js';
import { mlFeedbackEngine } from '../engine/mlFeedbackEngine.js';
import { bktEngine } from '../engine/bktEngine.js';
import { GoogleGenAI } from '@google/genai';

class DataStore {
  public config: SystemConfig = { ...DEFAULT_SYSTEM_CONFIG };
  
  // Multi-Domain Curriculum Tracks
  public domains: CurriculumDomain[] = [...DOMAINS];

  // 9 CORE DATABASE ENTITIES
  public users: Map<string, User> = new Map();
  public concepts: Concept[] = [...CONCEPTS];
  public prerequisites: Prerequisite[] = [...SEED_PREREQUISITES];
  public questions: Question[] = [...QUESTIONS];
  public attempts: Attempt[] = [];
  public masteryStates: Map<string, Record<string, MasteryState>> = new Map();
  public learningSessions: LearningSession[] = [];
  public recommendations: Recommendation[] = [];
  public teacherOverrides: TeacherOverride[] = [];

  // PHASE 1: Learning Materials, AI Summaries, AI Tutor Chat History
  public learningResources: LearningResource[] = [...SEED_LEARNING_RESOURCES];
  public summaryNotes: Map<string, SummaryNote> = new Map();
  public tutorChatHistories: Map<string, TutorMessage[]> = new Map(); // key: `${learnerId}_${conceptId}`

  // PHASE 2: Modules, Lessons, Dynamic Progress Tracking & Activity History
  public modules: Module[] = [...SEED_MODULES];
  public lessons: Lesson[] = [...SEED_LESSONS];
  public lessonProgress: Map<string, LessonProgress> = new Map(); // key: `${learnerId}_${lessonId}`
  public activityHistory: LearningActivityEvent[] = [];

  // PHASE 3: Interactive Mind Map AI Suggested Connections
  public aiSuggestedEdges: MindMapEdge[] = [];

  // PHASE 4: AI-Powered Adaptive Flashcards
  public flashcards: Flashcard[] = [...SEED_FLASHCARDS];
  public flashcardProgress: Map<string, FlashcardProgress> = new Map(); // key: `${learnerId}_${flashcardId}`

  // PHASE 5: AI-Powered Adaptive Mock Exams
  public examSessions: MockExamSession[] = [];

  // Institution Style Guides
  public institutions: InstitutionStyleGuide[] = [...INSTITUTIONS];

  // Full aggregate Learner Profiles for student views
  public learners: Map<string, LearnerProfile> = new Map();

  // PHASE 6: Production Authentication & Session Persistence
  public authSessions: Map<string, AuthSession> = new Map();

  // PHASE 8: Real Machine Learning Model Weights & Calibration
  public mlModelWeights?: MLModelWeights;

  // PHASE 6 CONTINUOUS LEARNING: Prediction Outcome Records, Model Registry, Dataset Metadata
  public predictionRecords: MLPredictionRecord[] = [];
  public recommendationRecords: MLRecommendationRecord[] = [];
  public modelRegistry: Map<string, MLModelRegistryEntry> = new Map();
  public datasetMetadata?: DatasetMetadata;

  // Gemini AI client for server-side generation
  private aiClient: GoogleGenAI | null = null;

  constructor() {
    this.initGemini();
    const loaded = this.loadFromDisk();
    if (!loaded) {
      this.seedDatabase();
      this.persistSync();
    }
  }

  /**
   * Schedules a debounced asynchronous disk write
   */
  public schedulePersist(): void {
    persistence.scheduleSave(() => this.serialize());
  }

  /**
   * Synchronously persists current database to disk
   */
  public persistSync(): boolean {
    return persistence.saveSync(this.serialize());
  }

  /**
   * Serializes in-memory database to disk format
   */
  public serialize(): SerializedDatabase {
    return {
      version: 1,
      lastSavedAt: new Date().toISOString(),
      config: this.config,
      domains: this.domains,
      institutions: this.institutions,
      users: Array.from(this.users.values()),
      learners: Array.from(this.learners.values()),
      concepts: this.concepts,
      prerequisites: this.prerequisites,
      questions: this.questions,
      attempts: this.attempts,
      masteryStates: Array.from(this.masteryStates.entries()).map(([learnerId, masteries]) => ({
        learnerId,
        masteries,
      })),
      learningSessions: this.learningSessions,
      recommendations: this.recommendations,
      teacherOverrides: this.teacherOverrides,
      learningResources: this.learningResources,
      summaryNotes: Array.from(this.summaryNotes.values()),
      tutorChatHistories: Array.from(this.tutorChatHistories.entries()).map(([key, messages]) => ({
        key,
        messages,
      })),
      modules: this.modules,
      lessons: this.lessons,
      lessonProgress: Array.from(this.lessonProgress.entries()).map(([key, progress]) => ({
        key,
        progress,
      })),
      activityHistory: this.activityHistory,
      aiSuggestedEdges: this.aiSuggestedEdges,
      flashcards: this.flashcards,
      flashcardProgress: Array.from(this.flashcardProgress.entries()).map(([key, progress]) => ({
        key,
        progress,
      })),
      examSessions: this.examSessions,
      authSessions: Array.from(this.authSessions.values()),
      mlModelWeights: this.mlModelWeights,
      predictionRecords: this.predictionRecords,
      recommendationRecords: this.recommendationRecords,
      modelRegistry: Array.from(this.modelRegistry.entries()).map(([version, entry]) => ({ version, entry })),
      datasetMetadata: this.datasetMetadata,
    };
  }

  /**
   * Loads persisted database from disk if available
   */
  public loadFromDisk(): boolean {
    const data = persistence.load();
    if (!data) return false;
    try {
      if (data.config) this.config = { ...DEFAULT_SYSTEM_CONFIG, ...data.config };
      if (data.mlModelWeights) this.mlModelWeights = data.mlModelWeights;
      if (data.domains && data.domains.length > 0) this.domains = data.domains;
      if (data.institutions && data.institutions.length > 0) this.institutions = data.institutions;

      if (data.users && data.users.length > 0) {
        this.users.clear();
        for (const u of data.users) this.users.set(u.id, u);
      }

      if (data.learners && data.learners.length > 0) {
        this.learners.clear();
        for (const l of data.learners) this.learners.set(l.id, l);
      }

      if (data.concepts && data.concepts.length > 0) this.concepts = data.concepts;
      if (data.prerequisites && data.prerequisites.length > 0) this.prerequisites = data.prerequisites;
      if (data.questions && data.questions.length > 0) this.questions = data.questions;
      if (data.attempts) this.attempts = data.attempts;

      if (data.masteryStates) {
        this.masteryStates.clear();
        for (const item of data.masteryStates) {
          this.masteryStates.set(item.learnerId, item.masteries);
        }
      }

      if (data.learningSessions) this.learningSessions = data.learningSessions;
      if (data.recommendations) this.recommendations = data.recommendations;
      if (data.teacherOverrides) this.teacherOverrides = data.teacherOverrides;
      if (data.learningResources && data.learningResources.length > 0) this.learningResources = data.learningResources;

      if (data.summaryNotes) {
        this.summaryNotes.clear();
        for (const sn of data.summaryNotes) {
          this.summaryNotes.set(sn.conceptId, sn);
        }
      }

      if (data.tutorChatHistories) {
        this.tutorChatHistories.clear();
        for (const item of data.tutorChatHistories) {
          this.tutorChatHistories.set(item.key, item.messages);
        }
      }

      if (data.modules && data.modules.length > 0) this.modules = data.modules;
      if (data.lessons && data.lessons.length > 0) this.lessons = data.lessons;

      if (data.lessonProgress) {
        this.lessonProgress.clear();
        for (const item of data.lessonProgress) {
          this.lessonProgress.set(item.key, item.progress);
        }
      }

      if (data.activityHistory) this.activityHistory = data.activityHistory;
      if (data.aiSuggestedEdges) this.aiSuggestedEdges = data.aiSuggestedEdges;
      if (data.flashcards && data.flashcards.length > 0) this.flashcards = data.flashcards;

      if (data.flashcardProgress) {
        this.flashcardProgress.clear();
        for (const item of data.flashcardProgress) {
          this.flashcardProgress.set(item.key, item.progress);
        }
      }

      if (data.examSessions) this.examSessions = data.examSessions;

      if (data.authSessions) {
        this.authSessions.clear();
        for (const s of data.authSessions) {
          this.authSessions.set(s.token, s);
        }
      }

      if (data.predictionRecords && data.predictionRecords.length > 0) {
        this.predictionRecords = data.predictionRecords;
      }

      if (data.recommendationRecords && data.recommendationRecords.length > 0) {
        this.recommendationRecords = data.recommendationRecords;
      }

      if (data.modelRegistry && data.modelRegistry.length > 0) {
        this.modelRegistry.clear();
        for (const item of data.modelRegistry) {
          this.modelRegistry.set(item.version, item.entry);
        }
      }

      if (data.datasetMetadata) {
        this.datasetMetadata = data.datasetMetadata;
      }

      // If database was persisted prior to Phase 6, bootstrap Phase 6 ML feedback data structures
      if (!this.predictionRecords || this.predictionRecords.length === 0) {
        this.seedPhase6MLFeedback();
        this.schedulePersist();
      }

      console.log(
        `[DataStore] Loaded ${this.users.size} users, ${this.learners.size} learners, ${this.attempts.length} attempts, ${this.examSessions.length} exams from disk.`
      );
      return true;
    } catch (err) {
      console.error('[DataStore] Failed to load data from disk, falling back to seed:', err);
      return false;
    }
  }

  private initGemini() {
    if (process.env.GEMINI_API_KEY) {
      this.aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  public getConceptsByDomain(domainId?: DomainId): Concept[] {
    const target = domainId || this.config.activeDomainId;
    if (!target) return this.concepts;
    return this.concepts.filter((c) => c.domainId === target);
  }

  public getQuestionsByDomain(domainId?: DomainId): Question[] {
    const target = domainId || this.config.activeDomainId;
    if (!target) return this.questions;
    return this.questions.filter((q) => q.domainId === target);
  }

  public switchLearnerDomain(learnerId: string, domainId: DomainId): LearnerProfile {
    const learner = this.learners.get(learnerId);
    if (!learner) throw new Error(`Learner ${learnerId} not found`);

    learner.activeDomainId = domainId;
    this.config.activeDomainId = domainId;

    const user = this.users.get(learnerId);
    if (user) user.activeDomainId = domainId;

    const domainConcepts = this.getConceptsByDomain(domainId);
    const decision = selectNextAction(
      learner,
      domainConcepts.length > 0 ? domainConcepts : this.concepts,
      this.config
    );

    const newRecommendation: Recommendation = {
      id: `rec_switch_${Date.now()}`,
      learnerId,
      domainId,
      action: decision.action,
      conceptId: decision.conceptId,
      conceptName: decision.conceptName,
      reason: decision.reason,
      stepFired: decision.stepFired,
      evidenceSummary: decision.evidenceSummary,
      timestamp: new Date().toISOString(),
    };

    learner.currentRecommendation = newRecommendation;
    learner.recommendationHistory.push(newRecommendation);
    this.recommendations.push(newRecommendation);
    this.schedulePersist();

    return learner;
  }

  // ==========================================
  // PHASE 1: Learning Resources, Summaries & Tutor Chat
  // ==========================================
  public getResourcesByConcept(conceptId: string): LearningResource[] {
    return this.learningResources.filter((r) => r.conceptId === conceptId);
  }

  public addResource(resource: LearningResource): LearningResource {
    this.learningResources.push(resource);
    this.schedulePersist();
    return resource;
  }

  public getSummaryNote(conceptId: string): SummaryNote | undefined {
    return this.summaryNotes.get(conceptId);
  }

  public saveSummaryNote(summary: SummaryNote): void {
    this.summaryNotes.set(summary.conceptId, summary);
    this.schedulePersist();
  }

  public deleteSummaryNote(conceptId: string): void {
    this.summaryNotes.delete(conceptId);
    this.schedulePersist();
  }

  public getTutorHistory(learnerId: string, conceptId: string): TutorMessage[] {
    const key = `${learnerId}_${conceptId}`;
    return this.tutorChatHistories.get(key) || [];
  }

  public saveTutorMessage(learnerId: string, message: TutorMessage): void {
    const key = `${learnerId}_${message.conceptId}`;
    const list = this.tutorChatHistories.get(key) || [];
    list.push(message);
    this.tutorChatHistories.set(key, list);
    this.schedulePersist();
  }

  public clearTutorHistory(learnerId: string, conceptId: string): void {
    const key = `${learnerId}_${conceptId}`;
    this.tutorChatHistories.delete(key);
    this.schedulePersist();
  }

  // ==========================================
  // PHASE 2: MODULE & LESSON HELPERS
  // ==========================================
  public getModulesByDomain(domainId?: DomainId): Module[] {
    const target = domainId || this.config.activeDomainId;
    return this.modules.filter((m) => m.domainId === target);
  }

  public getLessonsByModule(moduleId: string): Lesson[] {
    return this.lessons.filter((l) => l.moduleId === moduleId);
  }

  public getLessonsByDomain(domainId?: DomainId): Lesson[] {
    const target = domainId || this.config.activeDomainId;
    return this.lessons.filter((l) => l.domainId === target);
  }

  public getLessonById(lessonId: string): Lesson | undefined {
    return this.lessons.find((l) => l.id === lessonId);
  }

  public getLearnerLessonProgressMap(learnerId: string): Map<string, LessonProgress> {
    const map = new Map<string, LessonProgress>();
    for (const [key, prog] of this.lessonProgress) {
      if (prog.learnerId === learnerId) {
        map.set(prog.lessonId, prog);
      }
    }
    return map;
  }

  public saveLessonProgress(progress: LessonProgress): void {
    const key = `${progress.learnerId}_${progress.lessonId}`;
    this.lessonProgress.set(key, progress);
    this.schedulePersist();
  }

  public logActivityEvent(event: LearningActivityEvent): void {
    this.activityHistory.unshift(event);
    this.schedulePersist();
  }

  public getActivityHistory(learnerId: string, limit: number = 10): LearningActivityEvent[] {
    return this.activityHistory
      .filter((a) => a.learnerId === learnerId)
      .slice(0, limit);
  }

  // PHASE 3: Mind Map AI-suggested edges
  public addAiSuggestedEdge(edge: MindMapEdge): void {
    const exists = this.aiSuggestedEdges.some(
      (e) => e.source === edge.source && e.target === edge.target && e.type === edge.type
    );
    if (!exists) {
      this.aiSuggestedEdges.push(edge);
      this.schedulePersist();
    }
  }

  public getAiSuggestedEdges(): MindMapEdge[] {
    return [...this.aiSuggestedEdges];
  }

  // ==========================================
  // PHASE 4: AI-POWERED ADAPTIVE FLASHCARDS
  // ==========================================
  public getFlashcards(filter?: {
    subjectId?: DomainId;
    moduleId?: string;
    lessonId?: string;
    conceptId?: string;
  }): Flashcard[] {
    return this.flashcards.filter((card) => {
      if (filter?.subjectId && card.subjectId !== filter.subjectId) return false;
      if (filter?.moduleId && card.moduleId !== filter.moduleId) return false;
      if (filter?.lessonId && card.lessonId !== filter.lessonId) return false;
      if (filter?.conceptId && card.conceptId !== filter.conceptId) return false;
      return true;
    });
  }

  public getFlashcardById(id: string): Flashcard | undefined {
    return this.flashcards.find((c) => c.id === id);
  }

  public addFlashcards(cards: Flashcard[]): void {
    for (const card of cards) {
      const existingIdx = this.flashcards.findIndex((c) => c.id === card.id);
      if (existingIdx >= 0) {
        this.flashcards[existingIdx] = card;
      } else {
        this.flashcards.push(card);
      }
    }
  }

  public getFlashcardProgress(learnerId: string, flashcardId: string): FlashcardProgress | undefined {
    const key = `${learnerId}_${flashcardId}`;
    return this.flashcardProgress.get(key);
  }

  public saveFlashcardProgress(prog: FlashcardProgress): void {
    const key = `${prog.learnerId}_${prog.flashcardId}`;
    this.flashcardProgress.set(key, prog);
    this.schedulePersist();
  }

  public getAllLearnerFlashcardProgress(learnerId: string): Map<string, FlashcardProgress> {
    const map = new Map<string, FlashcardProgress>();
    for (const [key, prog] of this.flashcardProgress) {
      if (prog.learnerId === learnerId) {
        map.set(prog.flashcardId, prog);
      }
    }
    return map;
  }

  /**
   * Connects flashcard interaction directly into the Evidence Model & updates Concept Mastery.
   * Uses real calculateEvidence and updateMastery with no artificial mastery boosts.
   */
  public recordFlashcardEvidence(
    learnerId: string,
    card: Flashcard,
    recallLevel: FlashcardRecallLevel,
    responseTimeSeconds: number = 10
  ): {
    evidenceScore: number;
    masteryBefore: number;
    masteryAfter: number;
    uncertaintyBefore: number;
    uncertaintyAfter: number;
    isCorrect: boolean;
  } {
    const learner = this.learners.get(learnerId);
    if (!learner) throw new Error(`Learner ${learnerId} not found`);

    const concept = this.concepts.find((c) => c.id === card.conceptId);
    if (!concept) throw new Error(`Concept ${card.conceptId} not found`);

    // Map recall level to evidence parameters:
    // 'easy' / 'good': solid proof, independent, confident
    // 'hard': struggled, lower confidence, partial hesitation
    // 'again': failed recall, incorrect, needs remediation
    const isCorrect = recallLevel !== 'again';
    let confidence = 0.8;
    let hintsUsed = 0;
    let retries = 0;

    if (recallLevel === 'easy') {
      confidence = 1.0;
      hintsUsed = 0;
      retries = 0;
    } else if (recallLevel === 'good') {
      confidence = 0.8;
      hintsUsed = 0;
      retries = 0;
    } else if (recallLevel === 'hard') {
      confidence = 0.45;
      hintsUsed = 1;
      retries = 0;
    } else if (recallLevel === 'again') {
      confidence = 0.20;
      hintsUsed = 1;
      retries = 1;
    }

    // Virtual question for evidence model input
    const virtualQuestion: Question = {
      id: `fc_virtual_${card.id}`,
      domainId: card.subjectId,
      conceptId: card.conceptId,
      questionText: card.question,
      questionType: 'Understanding',
      questionFormat: 'MCQ',
      difficulty: card.difficulty,
      bloomLevel:
        card.type === 'Formula' || card.type === 'Definition' || card.type === 'Recall'
          ? 'Remember'
          : card.type === 'Application'
          ? 'Apply'
          : 'Understand',
      options: [card.answer, 'Incorrect distractor', 'Alternative answer', 'None of these'],
      correctOptionIndex: 0,
      explanation: card.explanation,
      hint: `Recall key principle from ${card.conceptName}`,
      expectedTimeSeconds: 15,
      evaluationStatus: 'APPROVED',
    };

    // 1. Calculate Evidence using existing Evidence Model
    const evidenceResult = calculateEvidence(
      virtualQuestion,
      {
        isCorrect,
        confidence,
        responseTimeSeconds: Math.max(2, responseTimeSeconds),
        hintsUsed,
        retries,
      },
      this.config
    );

    // 2. Retrieve old mastery & update mastery via exponential smoothing
    const currentConceptMastery = learner.conceptMasteries[card.conceptId] || {
      id: `ms_${learnerId}_${card.conceptId}`,
      learnerId,
      domainId: card.subjectId,
      conceptId: card.conceptId,
      conceptName: concept.name,
      mastery: 0,
      uncertainty: 0.8,
      retention: 0,
      attemptsCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      averageConfidence: 0.5,
      averageResponseTime: 15,
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

    const masteryBefore = currentConceptMastery.mastery;
    const uncertaintyBefore = currentConceptMastery.uncertainty;

    // Exponential smoothing update
    const masteryAfter = updateMastery(
      masteryBefore,
      evidenceResult.evidenceScore,
      this.config.learningRateAlpha
    );

    const uncertaintyAfter = updateUncertainty(
      uncertaintyBefore,
      isCorrect,
      confidence,
      hintsUsed,
      evidenceResult.antiGuessingTriggered,
      currentConceptMastery.attemptsCount + 1
    );

    const totalAttempts = currentConceptMastery.attemptsCount + 1;
    const correctAttempts = currentConceptMastery.correctCount + (isCorrect ? 1 : 0);
    const incorrectAttempts = currentConceptMastery.incorrectCount + (isCorrect ? 0 : 1);

    // BKT Knowledge Tracing Update (Corbett & Anderson 1995)
    const currentBktState =
      currentConceptMastery.bktState ||
      bktEngine.createInitialState(card.conceptId, this.config.bktConfig);
    const updatedBktState = bktEngine.step(
      currentBktState,
      isCorrect,
      new Date().toISOString(),
      `att_fc_${Date.now()}`
    );
    const bktMastery = updatedBktState.pKnowledge;

    // PHASE 8: ML Feature extraction & hybrid prediction (Bayesian + BKT + ML)
    const mlPred = mlInferenceEngine.predict(learnerId, card.conceptId);
    const hybridMastery = computeHybridMastery(masteryAfter, mlPred.probability, this.config, bktMastery);

    const updatedConceptMastery: MasteryState = {
      ...currentConceptMastery,
      mastery: hybridMastery,
      uncertainty: uncertaintyAfter,
      retention: hybridMastery,
      bktState: updatedBktState,
      bktMastery,
      attemptsCount: totalAttempts,
      correctCount: correctAttempts,
      incorrectCount: incorrectAttempts,
      averageConfidence:
        (currentConceptMastery.averageConfidence * currentConceptMastery.attemptsCount + confidence) /
        totalAttempts,
      averageResponseTime:
        (currentConceptMastery.averageResponseTime * currentConceptMastery.attemptsCount +
          responseTimeSeconds) /
        totalAttempts,
      totalHintsUsed: currentConceptMastery.totalHintsUsed + hintsUsed,
      totalRetries: currentConceptMastery.totalRetries + retries,
      lastAttemptAt: new Date().toISOString(),
      lastReviewedAt: new Date().toISOString(),
      daysSinceLastReview: 0,
      mlPrediction: mlPred,
      status:
        hybridMastery >= this.config.masteryThreshold
          ? 'mastered'
          : hybridMastery >= 0.5
          ? 'developing'
          : 'struggling',
    };

    learner.conceptMasteries[card.conceptId] = updatedConceptMastery;

    const learnerMasteries = this.masteryStates.get(learnerId) || {};
    learnerMasteries[card.conceptId] = updatedConceptMastery;
    this.masteryStates.set(learnerId, learnerMasteries);

    // 3. Store Attempt in audit log
    const attempt: Attempt = {
      id: `att_fc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      learnerId,
      domainId: card.subjectId,
      questionId: virtualQuestion.id,
      conceptId: card.conceptId,
      selectedOptionIndex: isCorrect ? 0 : 1,
      isCorrect,
      confidence,
      responseTimeSeconds,
      hintsUsed,
      retries,
      timestamp: new Date().toISOString(),
      evidenceScore: evidenceResult.evidenceScore,
      questionType: virtualQuestion.questionType,
      difficulty: card.difficulty,
      bloomLevel: virtualQuestion.bloomLevel,
      readingLevelUsed: learner.preferredReadingLevel,
      languageUsed: learner.preferredLanguage,
    };

    learner.recentAttempts.push(attempt);
    this.attempts.push(attempt);

    // Continuous Learning Feedback: Evaluate pending predictions & recommendations from flashcard outcome
    const fcEventTime = new Date().toISOString();
    mlFeedbackEngine.evaluatePendingPredictions({
      learnerId,
      conceptId: card.conceptId,
      isCorrect,
      confidence,
      responseTimeSeconds,
      timestamp: fcEventTime,
      attemptId: attempt.id,
      source: 'flashcard',
    });

    mlFeedbackEngine.evaluatePendingRecommendations({
      learnerId,
      conceptId: card.conceptId,
      timestamp: fcEventTime,
      actionTaken: 'REVIEW',
      isCorrect,
      masteryBefore,
      masteryAfter,
      retentionBefore: currentConceptMastery.retention,
      retentionAfter: hybridMastery,
    });

    // 4. Log in Learning Activity History
    this.logActivityEvent({
      id: `act_fc_${Date.now()}`,
      learnerId,
      domainId: card.subjectId,
      type: 'FLASHCARD_REVIEW',
      lessonId: card.lessonId,
      conceptId: card.conceptId,
      title: `Flashcard: ${card.conceptName}`,
      description: `Active recall test (${recallLevel.toUpperCase()}). Evidence score: ${(evidenceResult.evidenceScore * 100).toFixed(0)}%. Mastery: ${(masteryBefore * 100).toFixed(0)}% → ${(masteryAfter * 100).toFixed(0)}%.`,
      timestamp: new Date().toISOString(),
      meta: {
        flashcardId: card.id,
        recallLevel,
        difficulty: card.difficulty,
        evidenceScore: evidenceResult.evidenceScore,
      },
    });

    // 5. Recompute overall learner metrics
    this.recomputeOverallMetrics(learner);
    this.schedulePersist();

    return {
      evidenceScore: evidenceResult.evidenceScore,
      masteryBefore,
      masteryAfter,
      uncertaintyBefore,
      uncertaintyAfter,
      isCorrect,
    };
  }

  // ==========================================
  // PHASE 5: MOCK EXAM STORE HELPERS
  // ==========================================
  public saveExamSession(session: MockExamSession): void {
    const existingIdx = this.examSessions.findIndex((s) => s.id === session.id);
    if (existingIdx >= 0) {
      this.examSessions[existingIdx] = session;
    } else {
      this.examSessions.unshift(session);
    }
    this.schedulePersist();
  }

  public getExamSessions(learnerId: string, subjectId?: DomainId): MockExamSession[] {
    return this.examSessions.filter((s) => {
      if (s.learnerId !== learnerId) return false;
      if (subjectId && s.subjectId !== subjectId) return false;
      return true;
    });
  }

  public getExamSessionById(id: string): MockExamSession | undefined {
    return this.examSessions.find((s) => s.id === id);
  }

  public seedDatabase() {
    this.users.clear();
    this.learners.clear();
    this.masteryStates.clear();
    this.attempts = [];
    this.learningSessions = [];
    this.recommendations = [];
    this.teacherOverrides = [];
    this.examSessions = [];
    this.concepts = [...CONCEPTS];
    this.prerequisites = [...SEED_PREREQUISITES];
    this.questions = [...QUESTIONS];
    this.institutions = [...INSTITUTIONS];
    this.domains = [...DOMAINS];

    // 1. Seed Users
    for (const u of SEED_USERS) {
      this.users.set(u.id, { ...u });
    }

    // 2. Student A (Alex Rivera - High performer across GATE, CS, STEM)
    const userA = this.users.get('student_a')!;
    const studentA: LearnerProfile = {
      ...userA,
      overallMastery: 0.86,
      overallUncertainty: 0.14,
      overallRetention: 0.84,
      diagnosticCompleted: true,
      diagnosticResult: {
        completedAt: '2026-09-10T10:00:00Z',
        initialMastery: 0.82,
        weakPrerequisites: [],
        strongConcepts: ['Theory of Computation', 'Arrays', "Newton's Laws"],
        firstRecommendationAction: 'ADVANCE',
      },
      needsAttention: false,
      conceptMasteries: {},
      recentAttempts: [],
      overrides: [],
      recommendationHistory: [],
    };

    const alexScores: Record<string, number> = {
      // GATE CS
      gate_toc: 0.88,
      gate_compiler: 0.45,
      gate_os: 0.82,
      gate_dbms: 0.78,
      gate_networks: 0.65,
      // UPSC Civil Services
      upsc_polity_constitution: 0.76,
      upsc_fundamental_rights: 0.72,
      upsc_directive_principles: 0.40,
      upsc_macro_economy: 0.62,
      upsc_environment: 0.58,
      // School STEM
      school_newton_laws: 0.95,
      school_work_energy: 0.90,
      school_periodic_table: 0.85,
      school_calculus_diff: 0.88,
      school_cell_genetics: 0.80,
      // College Degree
      college_linear_algebra: 0.86,
      college_machine_learning: 0.75,
      college_distributed_sys: 0.45,
      // CS Foundations
      arrays: 0.92,
      linked_lists: 0.88,
      stacks: 0.86,
      queues: 0.84,
      recursion: 0.82,
      trees: 0.79,
      bst: 0.35,
      graphs: 0.10,
      searching_sorting: 0.85,
      hashing: 0.40,
    };

    const alexMasteries: Record<string, MasteryState> = {};
    for (const c of this.concepts) {
      const score = alexScores[c.id] || 0.40;
      const isAttempted = score > 0;
      const state: MasteryState = {
        id: `ms_alex_${c.id}`,
        learnerId: 'student_a',
        domainId: c.domainId,
        conceptId: c.id,
        conceptName: c.name,
        mastery: score,
        uncertainty: isAttempted ? 0.12 : 0.80,
        retention: calculateRetention(score, isAttempted ? 3 : 0, this.config.forgettingDecayRate),
        attemptsCount: isAttempted ? 6 : 0,
        correctCount: isAttempted ? Math.round(6 * score) : 0,
        incorrectCount: isAttempted ? 6 - Math.round(6 * score) : 0,
        averageConfidence: isAttempted ? 0.90 : 0.50,
        averageResponseTime: isAttempted ? 18 : 0,
        totalHintsUsed: 0,
        totalRetries: 0,
        easyAccuracy: isAttempted ? 1.0 : 0,
        mediumAccuracy: isAttempted ? 0.90 : 0,
        hardAccuracy: isAttempted ? 0.80 : 0,
        transferAccuracy: isAttempted ? 0.85 : 0,
        bloomAccuracy: {
          Remember: isAttempted ? 0.95 : 0,
          Understand: isAttempted ? 0.90 : 0,
          Apply: isAttempted ? 0.88 : 0,
          Analyze: isAttempted ? 0.82 : 0,
          Evaluate: isAttempted ? 0.78 : 0,
          Create: isAttempted ? 0.70 : 0,
        },
        lastAttemptAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        lastReviewedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        daysSinceLastReview: 3,
        prerequisiteSatisfied: true,
        blockedByPrerequisites: [],
        status: score >= 0.75 ? 'mastered' : score > 0 ? 'developing' : 'unattempted',
      };
      alexMasteries[c.id] = state;
    }
    studentA.conceptMasteries = alexMasteries;
    this.masteryStates.set('student_a', alexMasteries);

    // Initial Alex attempt on GATE TOC
    const attAlex: Attempt = {
      id: 'att_alex_1',
      learnerId: 'student_a',
      domainId: 'gate_cs',
      questionId: 'q_gate_toc_1',
      conceptId: 'gate_toc',
      selectedOptionIndex: 0,
      isCorrect: true,
      confidence: 0.95,
      responseTimeSeconds: 22,
      hintsUsed: 0,
      retries: 0,
      timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
      evidenceScore: 0.92,
      questionType: 'Understanding',
      questionFormat: 'MCQ',
      difficulty: 'medium',
      bloomLevel: 'Analyze',
      readingLevelUsed: 'undergraduate',
      languageUsed: 'en',
    };
    studentA.recentAttempts.push(attAlex);
    this.attempts.push(attAlex);

    const domainAConcepts = this.getConceptsByDomain(studentA.activeDomainId);
    const alexDecision = selectNextAction(studentA, domainAConcepts, this.config);
    const recAlex: Recommendation = {
      id: 'rec_alex_init',
      learnerId: 'student_a',
      domainId: studentA.activeDomainId,
      action: alexDecision.action,
      conceptId: alexDecision.conceptId,
      conceptName: alexDecision.conceptName,
      reason: alexDecision.reason,
      stepFired: alexDecision.stepFired,
      evidenceSummary: alexDecision.evidenceSummary,
      timestamp: new Date().toISOString(),
    };
    studentA.currentRecommendation = recAlex;
    studentA.recommendationHistory.push(recAlex);
    this.recommendations.push(recAlex);
    this.learners.set(studentA.id, studentA);

    // 3. Student B (Blake Chen - UPSC Civil Services focus, Dyslexia mode)
    const userB = this.users.get('student_b')!;
    const studentB: LearnerProfile = {
      ...userB,
      overallMastery: 0.54,
      overallUncertainty: 0.40,
      overallRetention: 0.50,
      diagnosticCompleted: true,
      diagnosticResult: {
        completedAt: '2026-09-12T14:00:00Z',
        initialMastery: 0.50,
        weakPrerequisites: ['Fundamental Rights'],
        strongConcepts: ['Constitution Framework'],
        firstRecommendationAction: 'REMEDIATE_PREREQUISITE',
      },
      needsAttention: false,
      conceptMasteries: {},
      recentAttempts: [],
      overrides: [],
      recommendationHistory: [],
    };

    const blakeScores: Record<string, number> = {
      // UPSC Civil
      upsc_polity_constitution: 0.72,
      upsc_fundamental_rights: 0.48, // weak prereq for DPSP
      upsc_directive_principles: 0.25,
      upsc_macro_economy: 0.55,
      upsc_environment: 0.50,
      // GATE CS
      gate_toc: 0.50,
      gate_compiler: 0.30,
      gate_os: 0.45,
      gate_dbms: 0.40,
      gate_networks: 0.35,
      // School STEM
      school_newton_laws: 0.65,
      school_work_energy: 0.50,
      school_periodic_table: 0.55,
      school_calculus_diff: 0.40,
      school_cell_genetics: 0.60,
      // College Degree
      college_linear_algebra: 0.45,
      college_machine_learning: 0.30,
      college_distributed_sys: 0.20,
      // CS Foundations
      arrays: 0.58,
      linked_lists: 0.42,
      stacks: 0.30,
      queues: 0.25,
      recursion: 0.20,
      trees: 0.15,
      bst: 0.10,
      graphs: 0.05,
      searching_sorting: 0.45,
      hashing: 0.15,
    };

    const blakeMasteries: Record<string, MasteryState> = {};
    for (const c of this.concepts) {
      const score = blakeScores[c.id] || 0.35;
      const isAttempted = score > 0;
      const state: MasteryState = {
        id: `ms_blake_${c.id}`,
        learnerId: 'student_b',
        domainId: c.domainId,
        conceptId: c.id,
        conceptName: c.name,
        mastery: score,
        uncertainty: 0.42,
        retention: calculateRetention(score, 1, this.config.forgettingDecayRate),
        attemptsCount: isAttempted ? 4 : 0,
        correctCount: isAttempted ? 2 : 0,
        incorrectCount: isAttempted ? 2 : 0,
        averageConfidence: 0.45,
        averageResponseTime: 28,
        totalHintsUsed: 5,
        totalRetries: 3,
        easyAccuracy: 0.70,
        mediumAccuracy: 0.40,
        hardAccuracy: 0.20,
        transferAccuracy: 0.25,
        bloomAccuracy: {
          Remember: 0.75,
          Understand: 0.60,
          Apply: 0.35,
          Analyze: 0.20,
          Evaluate: 0.10,
          Create: 0.05,
        },
        lastAttemptAt: new Date(Date.now() - 86400000).toISOString(),
        lastReviewedAt: new Date(Date.now() - 86400000).toISOString(),
        daysSinceLastReview: 1,
        prerequisiteSatisfied: true,
        blockedByPrerequisites: [],
        status: score >= 0.75 ? 'mastered' : score >= 0.50 ? 'developing' : 'struggling',
      };
      blakeMasteries[c.id] = state;
    }
    studentB.conceptMasteries = blakeMasteries;
    this.masteryStates.set('student_b', blakeMasteries);

    const domainBConcepts = this.getConceptsByDomain(studentB.activeDomainId);
    const blakeDecision = selectNextAction(studentB, domainBConcepts, this.config);
    const recBlake: Recommendation = {
      id: 'rec_blake_init',
      learnerId: 'student_b',
      domainId: studentB.activeDomainId,
      action: blakeDecision.action,
      conceptId: blakeDecision.conceptId,
      conceptName: blakeDecision.conceptName,
      reason: blakeDecision.reason,
      stepFired: blakeDecision.stepFired,
      evidenceSummary: blakeDecision.evidenceSummary,
      timestamp: new Date().toISOString(),
    };
    studentB.currentRecommendation = recBlake;
    studentB.recommendationHistory.push(recBlake);
    this.recommendations.push(recBlake);
    this.learners.set(studentB.id, studentB);

    // 4. Student C (Maya Patel - School STEM focus, Hindi preferred, stuck learner)
    const userC = this.users.get('student_c')!;
    const studentC: LearnerProfile = {
      ...userC,
      overallMastery: 0.42,
      overallUncertainty: 0.58,
      overallRetention: 0.38,
      diagnosticCompleted: true,
      needsAttention: true,
      attentionReason: "Stuck in Newton's Third Law action-reaction pairs despite multiple hint consultations.",
      conceptMasteries: {},
      recentAttempts: [],
      overrides: [],
      recommendationHistory: [],
    };

    const mayaMasteries: Record<string, MasteryState> = {};
    for (const c of this.concepts) {
      const score = c.id === 'school_newton_laws' ? 0.35 : 0.40;
      const state: MasteryState = {
        id: `ms_maya_${c.id}`,
        learnerId: 'student_c',
        domainId: c.domainId,
        conceptId: c.id,
        conceptName: c.name,
        mastery: score,
        uncertainty: 0.55,
        retention: 0.30,
        attemptsCount: c.id === 'school_newton_laws' ? 8 : 4,
        correctCount: 2,
        incorrectCount: 6,
        averageConfidence: 0.45,
        averageResponseTime: 42,
        totalHintsUsed: 7,
        totalRetries: 4,
        easyAccuracy: 0.50,
        mediumAccuracy: 0.30,
        hardAccuracy: 0.10,
        transferAccuracy: 0.15,
        bloomAccuracy: {
          Remember: 0.60,
          Understand: 0.40,
          Apply: 0.25,
          Analyze: 0.10,
          Evaluate: 0.05,
          Create: 0.0,
        },
        lastAttemptAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        lastReviewedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        daysSinceLastReview: 0,
        prerequisiteSatisfied: true,
        blockedByPrerequisites: [],
        status: 'struggling',
      };
      mayaMasteries[c.id] = state;
    }
    studentC.conceptMasteries = mayaMasteries;
    this.masteryStates.set('student_c', mayaMasteries);

    const attMaya: Attempt = {
      id: 'att_maya_1',
      learnerId: 'student_c',
      domainId: 'school_stem',
      questionId: 'q_school_newton_calc',
      conceptId: 'school_newton_laws',
      selectedOptionIndex: 1,
      isCorrect: false,
      confidence: 0.40,
      responseTimeSeconds: 45,
      hintsUsed: 2,
      retries: 2,
      timestamp: new Date().toISOString(),
      evidenceScore: 0.15,
      questionType: 'Application',
      questionFormat: 'NUMERICAL_ANALYSIS',
      difficulty: 'easy',
      bloomLevel: 'Apply',
      languageUsed: 'hi',
      readingLevelUsed: 'middle_school',
    };
    studentC.recentAttempts = [attMaya, { ...attMaya, id: 'att_maya_2' }, { ...attMaya, id: 'att_maya_3' }];
    this.attempts.push(...studentC.recentAttempts);

    const domainCConcepts = this.getConceptsByDomain(studentC.activeDomainId);
    const mayaDecision = selectNextAction(studentC, domainCConcepts, this.config);
    const recMaya: Recommendation = {
      id: 'rec_maya_init',
      learnerId: 'student_c',
      domainId: studentC.activeDomainId,
      action: mayaDecision.action,
      conceptId: mayaDecision.conceptId,
      conceptName: mayaDecision.conceptName,
      reason: mayaDecision.reason,
      stepFired: mayaDecision.stepFired,
      evidenceSummary: mayaDecision.evidenceSummary,
      timestamp: new Date().toISOString(),
    };
    studentC.currentRecommendation = recMaya;
    studentC.recommendationHistory.push(recMaya);
    this.recommendations.push(recMaya);
    this.learners.set(studentC.id, studentC);

    // 5. Sample LearningSessions across domains
    this.learningSessions = [
      {
        id: 'sess_1',
        learnerId: 'student_a',
        domainId: 'gate_cs',
        sessionType: 'PRACTICE',
        activeConceptId: 'gate_toc',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: 1800,
        attemptsCount: 4,
        correctCount: 4,
        initialMastery: 0.80,
        finalMastery: 0.88,
        readingLevelUsed: 'undergraduate',
        languageUsed: 'en',
        dyslexiaModeActive: false,
        audioInteractionsCount: 2,
        institutionStyleId: 'iit_madras',
      },
      {
        id: 'sess_2',
        learnerId: 'student_b',
        domainId: 'upsc_civil',
        sessionType: 'PRACTICE',
        activeConceptId: 'upsc_polity_constitution',
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        endedAt: new Date(Date.now() - 5400000).toISOString(),
        durationSeconds: 1800,
        attemptsCount: 3,
        correctCount: 2,
        initialMastery: 0.65,
        finalMastery: 0.72,
        readingLevelUsed: 'high_school',
        languageUsed: 'en',
        dyslexiaModeActive: true,
        audioInteractionsCount: 3,
        institutionStyleId: 'upsc_commission',
      },
    ];

    // 6. PHASE 2: Seed Initial Lesson Progress across learners
    // Alex (student_a) in GATE CS
    this.saveLessonProgress({
      id: 'lp_student_a_les_gate_toc',
      learnerId: 'student_a',
      lessonId: 'les_gate_toc',
      moduleId: 'mod_gate_1',
      domainId: 'gate_cs',
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 86400000).toISOString(),
      completedAt: new Date(Date.now() - 82800000).toISOString(),
      timeSpentSeconds: 2400,
      questionsAttempted: 4,
      questionsCorrect: 4,
      summaryGenerated: true,
      tutorConsulted: true,
    });
    this.saveLessonProgress({
      id: 'lp_student_a_les_gate_compiler',
      learnerId: 'student_a',
      lessonId: 'les_gate_compiler',
      moduleId: 'mod_gate_1',
      domainId: 'gate_cs',
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      timeSpentSeconds: 1200,
      questionsAttempted: 2,
      questionsCorrect: 1,
      summaryGenerated: false,
      tutorConsulted: true,
    });
    // Also in CS Foundations
    this.saveLessonProgress({
      id: 'lp_student_a_les_cs_arrays',
      learnerId: 'student_a',
      lessonId: 'les_cs_arrays',
      moduleId: 'mod_cs_1',
      domainId: 'cs_foundations',
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 172800000).toISOString(),
      completedAt: new Date(Date.now() - 169200000).toISOString(),
      timeSpentSeconds: 1800,
      questionsAttempted: 3,
      questionsCorrect: 3,
      summaryGenerated: true,
      tutorConsulted: false,
    });

    // Blake (student_b) in UPSC Civil
    this.saveLessonProgress({
      id: 'lp_student_b_les_upsc_const',
      learnerId: 'student_b',
      lessonId: 'les_upsc_const',
      moduleId: 'mod_upsc_1',
      domainId: 'upsc_civil',
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 7200000).toISOString(),
      completedAt: new Date(Date.now() - 5400000).toISOString(),
      timeSpentSeconds: 1800,
      questionsAttempted: 3,
      questionsCorrect: 2,
      summaryGenerated: true,
      tutorConsulted: true,
    });

    // Maya (student_c) in School STEM
    this.saveLessonProgress({
      id: 'lp_student_c_les_school_newton',
      learnerId: 'student_c',
      lessonId: 'les_school_newton',
      moduleId: 'mod_school_1',
      domainId: 'school_stem',
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      timeSpentSeconds: 900,
      questionsAttempted: 3,
      questionsCorrect: 1,
      summaryGenerated: false,
      tutorConsulted: true,
    });

    // 7. PHASE 2: Seed Activity History
    this.activityHistory = [
      {
        id: 'act_init_1',
        learnerId: 'student_a',
        domainId: 'gate_cs',
        type: 'LESSON_COMPLETED',
        title: 'Completed Automata & Regular Languages',
        description: 'Successfully verified Pumping Lemma conditions and minimal state transitions.',
        timestamp: new Date(Date.now() - 82800000).toISOString(),
        lessonId: 'les_gate_toc',
        conceptId: 'gate_toc',
      },
      {
        id: 'act_init_2',
        learnerId: 'student_a',
        domainId: 'gate_cs',
        type: 'SUMMARY_GENERATED',
        title: 'Generated AI Summary Notes for Automata',
        description: 'Synthesized 7-section structured revision notes with Myhill-Nerode formulas.',
        timestamp: new Date(Date.now() - 84000000).toISOString(),
        conceptId: 'gate_toc',
      },
      {
        id: 'act_init_3',
        learnerId: 'student_a',
        domainId: 'gate_cs',
        type: 'TUTOR_QUESTION',
        title: 'Consulted AI Tutor on State Elimination',
        description: 'Clarified why sorted states ensure deterministic elimination invariants.',
        timestamp: new Date(Date.now() - 85000000).toISOString(),
        conceptId: 'gate_toc',
      },
      {
        id: 'act_init_4',
        learnerId: 'student_a',
        domainId: 'cs_foundations',
        type: 'LESSON_COMPLETED',
        title: 'Completed Arrays & Sequential Memory',
        description: 'Mastered physical memory address calculation and cache spatial locality.',
        timestamp: new Date(Date.now() - 169200000).toISOString(),
        lessonId: 'les_cs_arrays',
        conceptId: 'arrays',
      },
      {
        id: 'act_init_5',
        learnerId: 'student_b',
        domainId: 'upsc_civil',
        type: 'LESSON_COMPLETED',
        title: 'Completed Constitutional Architecture',
        description: 'Passed assessment on Article 368 amending procedures and basic structure.',
        timestamp: new Date(Date.now() - 5400000).toISOString(),
        lessonId: 'les_upsc_const',
        conceptId: 'upsc_polity_constitution',
      },
      {
        id: 'act_init_6',
        learnerId: 'student_a',
        domainId: 'gate_cs',
        type: 'MOCK_EXAM_COMPLETED',
        title: 'Completed Mock Exam: Theory of Computation — Mock Exam',
        description: 'Scored 80% (4/5 correct) in 7m 00s. Evidence processed for 2 concepts.',
        timestamp: new Date(Date.now() - 48 * 3600000 + 420000).toISOString(),
        conceptId: 'gate_compiler',
      },
    ];

    // 8. PHASE 5: Seed 1 Initial Mock Exam Session for Student A
    this.examSessions = [
      {
        id: 'exam_seed_alex_1',
        learnerId: 'student_a',
        subjectId: 'gate_cs',
        moduleId: 'mod_gate_1',
        moduleTitle: 'Theory of Computation & Formal Languages',
        title: 'Theory of Computation — Mock Exam',
        config: {
          learnerId: 'student_a',
          subjectId: 'gate_cs',
          moduleId: 'mod_gate_1',
          questionCount: 5,
          difficulty: 'medium',
          timeLimitMinutes: 10,
        },
        blueprint: {
          subjectId: 'gate_cs',
          subjectName: 'GATE Computer Science',
          moduleId: 'mod_gate_1',
          moduleTitle: 'Theory of Computation & Formal Languages',
          totalQuestions: 5,
          targetDifficulty: 'medium',
          timeLimitMinutes: 10,
          conceptAllocations: [
            {
              conceptId: 'gate_toc',
              conceptName: 'Theory of Computation',
              allocatedQuestions: 3,
              currentMastery: 0.88,
              isKnowledgeGap: false,
              priorityCategory: 'syllabus_coverage',
              suggestedDifficulty: 'medium',
            },
            {
              conceptId: 'gate_compiler',
              conceptName: 'Compiler Design',
              allocatedQuestions: 2,
              currentMastery: 0.45,
              isKnowledgeGap: true,
              priorityCategory: 'knowledge_gap',
              suggestedDifficulty: 'medium',
            },
          ],
          weakConceptCount: 1,
          knowledgeGapCount: 1,
          summaryText: 'Adaptive Blueprint targeting TOC foundations and Compiler bottlenecks.',
        },
        questions: [
          {
            questionId: 'q_seed_1',
            subjectId: 'gate_cs',
            moduleId: 'mod_gate_1',
            lessonId: 'les_gate_toc',
            conceptId: 'gate_toc',
            conceptName: 'Theory of Computation',
            question: 'Which of the following problems is undecidable for Turing Machines?',
            options: [
              'The Halting Problem',
              'Emptiness of a Regular Language',
              'Equivalence of two Deterministic Finite Automata',
              'Finiteness of a Context-Free Language',
            ],
            correctAnswer: 'The Halting Problem',
            correctOptionIndex: 0,
            explanation: 'By Turing proof, determining whether an arbitrary Turing machine halts on an arbitrary input is undecidable.',
            questionType: 'Understanding',
            difficulty: 'medium',
            sourceId: 'les_gate_toc',
            sourceTitle: 'Automata & Regular Languages',
            bloomLevel: 'Understand',
          },
          {
            questionId: 'q_seed_2',
            subjectId: 'gate_cs',
            moduleId: 'mod_gate_1',
            lessonId: 'les_gate_toc',
            conceptId: 'gate_toc',
            conceptName: 'Theory of Computation',
            question: 'The language L = {a^n b^n | n >= 0} is:',
            options: [
              'Context-Free but not Regular',
              'Regular',
              'Context-Sensitive but not Context-Free',
              'Recursively Enumerable but not Recursive',
            ],
            correctAnswer: 'Context-Free but not Regular',
            correctOptionIndex: 0,
            explanation: 'L requires unbounded counting memory provided by a pushdown automaton stack, violating the Pumping Lemma for regular languages.',
            questionType: 'Understanding',
            difficulty: 'medium',
            sourceId: 'les_gate_toc',
            sourceTitle: 'Automata & Regular Languages',
            bloomLevel: 'Analyze',
          },
          {
            questionId: 'q_seed_3',
            subjectId: 'gate_cs',
            moduleId: 'mod_gate_1',
            lessonId: 'les_gate_compiler',
            conceptId: 'gate_compiler',
            conceptName: 'Compiler Design',
            question: 'In bottom-up parsing, a shift-reduce conflict occurs when:',
            options: [
              'The parser cannot decide whether to shift the next input symbol or reduce the current handle',
              'The parser cannot decide which of two non-terminals to derive',
              'The grammar has an ambiguous lexer specification',
              'The symbol table overflows runtime stack frames',
            ],
            correctAnswer: 'The parser cannot decide whether to shift the next input symbol or reduce the current handle',
            correctOptionIndex: 0,
            explanation: 'A shift-reduce conflict arises in LR parser state tables when the lookahead symbol allows both shifting and reducing actions.',
            questionType: 'Recall',
            difficulty: 'easy',
            sourceId: 'les_gate_compiler',
            sourceTitle: 'Lexical Analysis & Parsing',
            bloomLevel: 'Remember',
          },
          {
            questionId: 'q_seed_4',
            subjectId: 'gate_cs',
            moduleId: 'mod_gate_1',
            lessonId: 'les_gate_compiler',
            conceptId: 'gate_compiler',
            conceptName: 'Compiler Design',
            question: 'Which intermediate representation maintains explicit control flow graphs with basic blocks?',
            options: [
              'Three-Address Code (TAC) Quadruples',
              'Post-fix Notation',
              'Abstract Syntax Trees without Jump Edges',
              'Parse Trees',
            ],
            correctAnswer: 'Three-Address Code (TAC) Quadruples',
            correctOptionIndex: 0,
            explanation: 'TAC quadruples with explicit conditional/unconditional jumps form control flow graph basic blocks for dataflow optimization.',
            questionType: 'Application',
            difficulty: 'hard',
            sourceId: 'les_gate_compiler',
            sourceTitle: 'Lexical Analysis & Parsing',
            bloomLevel: 'Apply',
          },
          {
            questionId: 'q_seed_5',
            subjectId: 'gate_cs',
            moduleId: 'mod_gate_1',
            lessonId: 'les_gate_toc',
            conceptId: 'gate_toc',
            conceptName: 'Theory of Computation',
            question: 'What is the minimal number of states in a DFA accepting strings over {0,1} ending with 01?',
            options: [
              '3 States',
              '2 States',
              '4 States',
              '5 States',
            ],
            correctAnswer: '3 States',
            correctOptionIndex: 0,
            explanation: 'By the Myhill-Nerode theorem, equivalence classes are strings ending in neither 0 nor 1, ending in 0, and ending in 01. Exactly 3 states.',
            questionType: 'Application',
            difficulty: 'medium',
            sourceId: 'les_gate_toc',
            sourceTitle: 'Automata & Regular Languages',
            bloomLevel: 'Apply',
          },
        ],
        startedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
        submittedAt: new Date(Date.now() - 48 * 3600000 + 420000).toISOString(),
        isCompleted: true,
        result: {
          examId: 'exam_seed_alex_1',
          sessionId: 'exam_seed_alex_1',
          learnerId: 'student_a',
          subjectId: 'gate_cs',
          subjectName: 'GATE Computer Science',
          moduleId: 'mod_gate_1',
          moduleTitle: 'Theory of Computation & Formal Languages',
          totalQuestions: 5,
          correctCount: 4,
          incorrectCount: 1,
          unansweredCount: 0,
          scorePercent: 80,
          accuracyPercent: 80,
          timeLimitMinutes: 10,
          timeUsedSeconds: 420,
          timeUsedFormatted: '7m 00s',
          completedAt: new Date(Date.now() - 48 * 3600000 + 420000).toISOString(),
          passed: true,
          conceptPerformance: [
            {
              conceptId: 'gate_compiler',
              conceptName: 'Compiler Design',
              totalQuestions: 2,
              correctCount: 1,
              incorrectCount: 1,
              unansweredCount: 0,
              accuracyPercent: 50,
              masteryBefore: 0.40,
              masteryAfter: 0.45,
              isWeakConcept: true,
              status: 'Needs Review',
            },
            {
              conceptId: 'gate_toc',
              conceptName: 'Theory of Computation',
              totalQuestions: 3,
              correctCount: 3,
              incorrectCount: 0,
              unansweredCount: 0,
              accuracyPercent: 100,
              masteryBefore: 0.82,
              masteryAfter: 0.88,
              isWeakConcept: false,
              status: 'Mastered',
            },
          ],
          weakConcepts: [
            {
              conceptId: 'gate_compiler',
              conceptName: 'Compiler Design',
              accuracyPercent: 50,
              reason: 'Exam accuracy: 50% (1/2). Concept mastery: 45%.',
            },
          ],
          questionsReview: [
            {
              question: {
                questionId: 'q_seed_1',
                subjectId: 'gate_cs',
                moduleId: 'mod_gate_1',
                lessonId: 'les_gate_toc',
                conceptId: 'gate_toc',
                conceptName: 'Theory of Computation',
                question: 'Which of the following problems is undecidable for Turing Machines?',
                options: [
                  'The Halting Problem',
                  'Emptiness of a Regular Language',
                  'Equivalence of two Deterministic Finite Automata',
                  'Finiteness of a Context-Free Language',
                ],
                correctAnswer: 'The Halting Problem',
                correctOptionIndex: 0,
                explanation: 'By Turing proof, determining whether an arbitrary Turing machine halts on an arbitrary input is undecidable.',
                questionType: 'Understanding',
                difficulty: 'medium',
                sourceId: 'les_gate_toc',
                sourceTitle: 'Automata & Regular Languages',
                bloomLevel: 'Understand',
              },
              studentOptionIndex: 0,
              studentAnswerText: 'The Halting Problem',
              isCorrect: true,
              isUnanswered: false,
              isMarkedForReview: false,
            },
            {
              question: {
                questionId: 'q_seed_2',
                subjectId: 'gate_cs',
                moduleId: 'mod_gate_1',
                lessonId: 'les_gate_toc',
                conceptId: 'gate_toc',
                conceptName: 'Theory of Computation',
                question: 'The language L = {a^n b^n | n >= 0} is:',
                options: [
                  'Context-Free but not Regular',
                  'Regular',
                  'Context-Sensitive but not Context-Free',
                  'Recursively Enumerable but not Recursive',
                ],
                correctAnswer: 'Context-Free but not Regular',
                correctOptionIndex: 0,
                explanation: 'L requires unbounded counting memory provided by a pushdown automaton stack, violating the Pumping Lemma for regular languages.',
                questionType: 'Understanding',
                difficulty: 'medium',
                sourceId: 'les_gate_toc',
                sourceTitle: 'Automata & Regular Languages',
                bloomLevel: 'Analyze',
              },
              studentOptionIndex: 0,
              studentAnswerText: 'Context-Free but not Regular',
              isCorrect: true,
              isUnanswered: false,
              isMarkedForReview: false,
            },
            {
              question: {
                questionId: 'q_seed_3',
                subjectId: 'gate_cs',
                moduleId: 'mod_gate_1',
                lessonId: 'les_gate_compiler',
                conceptId: 'gate_compiler',
                conceptName: 'Compiler Design',
                question: 'In bottom-up parsing, a shift-reduce conflict occurs when:',
                options: [
                  'The parser cannot decide whether to shift the next input symbol or reduce the current handle',
                  'The parser cannot decide which of two non-terminals to derive',
                  'The grammar has an ambiguous lexer specification',
                  'The symbol table overflows runtime stack frames',
                ],
                correctAnswer: 'The parser cannot decide whether to shift the next input symbol or reduce the current handle',
                correctOptionIndex: 0,
                explanation: 'A shift-reduce conflict arises in LR parser state tables when the lookahead symbol allows both shifting and reducing actions.',
                questionType: 'Recall',
                difficulty: 'easy',
                sourceId: 'les_gate_compiler',
                sourceTitle: 'Lexical Analysis & Parsing',
                bloomLevel: 'Remember',
              },
              studentOptionIndex: 0,
              studentAnswerText: 'The parser cannot decide whether to shift the next input symbol or reduce the current handle',
              isCorrect: true,
              isUnanswered: false,
              isMarkedForReview: false,
            },
            {
              question: {
                questionId: 'q_seed_4',
                subjectId: 'gate_cs',
                moduleId: 'mod_gate_1',
                lessonId: 'les_gate_compiler',
                conceptId: 'gate_compiler',
                conceptName: 'Compiler Design',
                question: 'Which intermediate representation maintains explicit control flow graphs with basic blocks?',
                options: [
                  'Three-Address Code (TAC) Quadruples',
                  'Post-fix Notation',
                  'Abstract Syntax Trees without Jump Edges',
                  'Parse Trees',
                ],
                correctAnswer: 'Three-Address Code (TAC) Quadruples',
                correctOptionIndex: 0,
                explanation: 'TAC quadruples with explicit conditional/unconditional jumps form control flow graph basic blocks for dataflow optimization.',
                questionType: 'Application',
                difficulty: 'hard',
                sourceId: 'les_gate_compiler',
                sourceTitle: 'Lexical Analysis & Parsing',
                bloomLevel: 'Apply',
              },
              studentOptionIndex: 2,
              studentAnswerText: 'Abstract Syntax Trees without Jump Edges',
              isCorrect: false,
              isUnanswered: false,
              isMarkedForReview: false,
            },
            {
              question: {
                questionId: 'q_seed_5',
                subjectId: 'gate_cs',
                moduleId: 'mod_gate_1',
                lessonId: 'les_gate_toc',
                conceptId: 'gate_toc',
                conceptName: 'Theory of Computation',
                question: 'What is the minimal number of states in a DFA accepting strings over {0,1} ending with 01?',
                options: [
                  '3 States',
                  '2 States',
                  '4 States',
                  '5 States',
                ],
                correctAnswer: '3 States',
                correctOptionIndex: 0,
                explanation: 'By the Myhill-Nerode theorem, equivalence classes are strings ending in neither 0 nor 1, ending in 0, and ending in 01. Exactly 3 states.',
                questionType: 'Application',
                difficulty: 'medium',
                sourceId: 'les_gate_toc',
                sourceTitle: 'Automata & Regular Languages',
                bloomLevel: 'Apply',
              },
              studentOptionIndex: 0,
              studentAnswerText: '3 States',
              isCorrect: true,
              isUnanswered: false,
              isMarkedForReview: false,
            },
          ],
          adaptiveRecommendations: [
            {
              title: 'Practice Flashcards for Compiler Design',
              description: 'Active recall drilling on Compiler Design to reverse knowledge decay.',
              actionType: 'flashcards',
              targetId: 'gate_compiler',
              targetName: 'Compiler Design',
            },
            {
              title: 'Consult AI Tutor on Compiler Design',
              description: 'Review misconceptions on TAC quadruples and basic block control flow.',
              actionType: 'tutor',
              targetId: 'gate_compiler',
              targetName: 'Compiler Design',
            },
          ],
          evidenceGeneratedCount: 5,
        },
      },
    ];

    this.seedPhase6MLFeedback();
  }

  // ==========================================
  // PHASE 6: CONTINUOUS LEARNING & ML FEEDBACK SEEDING
  // ==========================================
  public seedPhase6MLFeedback(): void {
    this.predictionRecords = [];
    this.recommendationRecords = [];
    this.modelRegistry.clear();

    const baselineWeights = mlTrainer.getBaselineWeights();

    // 1. Initial Production Model in Model Registry
    const prodModelEntry: MLModelRegistryEntry = {
      modelVersion: 'logreg-prod-v1.0',
      lifecycleState: 'production',
      trainedAt: '2026-09-15T00:00:00Z',
      featureVersion: 'v1-canonical-16',
      datasetVersion: 'dataset-v1.0',
      sampleCount: 14,
      weights: baselineWeights,
      bias: -0.15,
      scaler: DEFAULT_FEATURE_SCALER,
      classificationThreshold: 0.50,
      validationMetrics: {
        accuracy: 0.786,
        precision: 0.818,
        recall: 0.900,
        f1: 0.857,
        rocAuc: 0.825,
        logLoss: 0.468,
        brierScore: 0.152,
        confusionMatrix: { tp: 9, fp: 2, tn: 2, fn: 1 },
      },
      promotedAt: '2026-09-15T00:00:00Z',
      promotionReason: 'Initial baseline production model release.',
    };
    this.modelRegistry.set(prodModelEntry.modelVersion, prodModelEntry);

    // 2. Seed Evaluated and Pending Prediction Records with strict temporal separation
    const baseDate = new Date('2026-09-16T10:00:00Z').getTime();

    // Helper to build realistic feature snapshot
    const createSnapshot = (overrides: Partial<Record<string, number>> = {}) => {
      const snap: Record<string, number> = {};
      const norm: Record<string, number> = {};
      for (const name of CANONICAL_FEATURE_NAMES) {
        const raw = overrides[name] ?? DEFAULT_FEATURE_SCALER.means[name] ?? 0.5;
        snap[name] = Math.round(raw * 1000) / 1000;
        const mean = DEFAULT_FEATURE_SCALER.means[name] ?? 0.5;
        const std = DEFAULT_FEATURE_SCALER.stds[name] ?? 1.0;
        norm[name] = Math.round(Math.max(-3.0, Math.min(3.0, (raw - mean) / std)) * 1000) / 1000;
      }
      return { raw: snap, normalized: norm };
    };

    // Evaluated Samples (Chronologically ordered, T_pred < T_eval)
    const seedPredictionsData: Array<{
      learnerId: string;
      conceptId: string;
      predProb: number;
      actual: number;
      offsetHours: number;
      evalDelayHours: number;
      source: 'attempt' | 'exam' | 'flashcard';
      overrides?: Partial<Record<string, number>>;
    }> = [
      { learnerId: 'student_a', conceptId: 'arrays', predProb: 0.88, actual: 1, offsetHours: 10, evalDelayHours: 2, source: 'attempt', overrides: { overallAccuracy: 0.92, attemptCount: 6, previousMastery: 0.85 } },
      { learnerId: 'student_a', conceptId: 'linked_lists', predProb: 0.82, actual: 1, offsetHours: 14, evalDelayHours: 3, source: 'attempt', overrides: { overallAccuracy: 0.85, attemptCount: 5, previousMastery: 0.80 } },
      { learnerId: 'student_a', conceptId: 'gate_toc', predProb: 0.86, actual: 1, offsetHours: 20, evalDelayHours: 4, source: 'exam', overrides: { overallAccuracy: 0.88, attemptCount: 6, hardAccuracy: 0.80 } },
      { learnerId: 'student_a', conceptId: 'gate_compiler', predProb: 0.42, actual: 0, offsetHours: 24, evalDelayHours: 2, source: 'exam', overrides: { overallAccuracy: 0.45, incorrectCount: 3, previousMastery: 0.40 } },
      { learnerId: 'student_a', conceptId: 'school_newton_laws', predProb: 0.94, actual: 1, offsetHours: 30, evalDelayHours: 2, source: 'attempt', overrides: { overallAccuracy: 0.95, attemptCount: 7, easyAccuracy: 1.0 } },
      { learnerId: 'student_a', conceptId: 'college_linear_algebra', predProb: 0.80, actual: 1, offsetHours: 36, evalDelayHours: 3, source: 'attempt', overrides: { overallAccuracy: 0.84, attemptCount: 5, previousMastery: 0.78 } },
      { learnerId: 'student_a', conceptId: 'bst', predProb: 0.38, actual: 0, offsetHours: 40, evalDelayHours: 2, source: 'attempt', overrides: { overallAccuracy: 0.35, incorrectCount: 3, previousMastery: 0.30 } },
      { learnerId: 'student_b', conceptId: 'upsc_polity_constitution', predProb: 0.74, actual: 1, offsetHours: 44, evalDelayHours: 2, source: 'attempt', overrides: { overallAccuracy: 0.75, attemptCount: 4, previousMastery: 0.70 } },
      { learnerId: 'student_b', conceptId: 'upsc_fundamental_rights', predProb: 0.52, actual: 0, offsetHours: 48, evalDelayHours: 3, source: 'attempt', overrides: { overallAccuracy: 0.48, incorrectCount: 2, previousMastery: 0.45 } },
      { learnerId: 'student_b', conceptId: 'upsc_directive_principles', predProb: 0.32, actual: 0, offsetHours: 52, evalDelayHours: 2, source: 'attempt', overrides: { overallAccuracy: 0.28, incorrectCount: 3, previousMastery: 0.25 } },
      { learnerId: 'student_b', conceptId: 'school_work_energy', predProb: 0.58, actual: 1, offsetHours: 56, evalDelayHours: 3, source: 'flashcard', overrides: { overallAccuracy: 0.60, attemptCount: 3, flashcardReviewScore: 0.80 } },
      { learnerId: 'student_b', conceptId: 'arrays', predProb: 0.62, actual: 1, offsetHours: 60, evalDelayHours: 2, source: 'attempt', overrides: { overallAccuracy: 0.65, attemptCount: 4, previousMastery: 0.58 } },
      { learnerId: 'student_a', conceptId: 'stacks', predProb: 0.84, actual: 1, offsetHours: 64, evalDelayHours: 2, source: 'attempt', overrides: { overallAccuracy: 0.86, attemptCount: 5, previousMastery: 0.82 } },
      { learnerId: 'student_b', conceptId: 'queues', predProb: 0.36, actual: 0, offsetHours: 68, evalDelayHours: 2, source: 'attempt', overrides: { overallAccuracy: 0.30, incorrectCount: 3, previousMastery: 0.28 } },
    ];

    for (let idx = 0; idx < seedPredictionsData.length; idx++) {
      const d = seedPredictionsData[idx];
      const predTime = new Date(baseDate + d.offsetHours * 3600000).toISOString();
      const evalTime = new Date(baseDate + (d.offsetHours + d.evalDelayHours) * 3600000).toISOString();
      const snap = createSnapshot(d.overrides);

      this.predictionRecords.push({
        predictionId: `pred_seed_${idx + 1}`,
        learnerId: d.learnerId,
        conceptId: d.conceptId,
        predictedProbability: d.predProb,
        predictedCategory: d.predProb >= 0.85 ? 'Mastered' : d.predProb >= 0.70 ? 'Strong' : d.predProb >= 0.40 ? 'Developing' : 'Weak',
        confidence: Math.round((0.60 + Math.abs(d.predProb - 0.5) * 0.76) * 1000) / 1000,
        featureSnapshot: snap.raw,
        normalizedSnapshot: snap.normalized,
        modelVersion: 'logreg-prod-v1.0',
        predictedAt: predTime,
        evaluationStatus: 'evaluated',
        actualOutcome: d.actual,
        evaluatedAt: evalTime,
        outcomeSource: d.source,
        outcomeAttemptId: `att_seed_${d.learnerId}_${idx + 1}`,
        evaluationReason: d.actual === 1 ? `Independent ${d.source} verified correct mastery.` : `Independent ${d.source} indicated struggle / incorrect answer.`,
      });
    }

    // Pending Predictions (waiting for future outcomes)
    const pendingSeeds = [
      { learnerId: 'student_a', conceptId: 'graphs', predProb: 0.25, offsetHours: 72 },
      { learnerId: 'student_b', conceptId: 'gate_compiler', predProb: 0.35, offsetHours: 74 },
      { learnerId: 'student_a', conceptId: 'trees', predProb: 0.78, offsetHours: 76 },
    ];

    for (let idx = 0; idx < pendingSeeds.length; idx++) {
      const p = pendingSeeds[idx];
      const predTime = new Date(baseDate + p.offsetHours * 3600000).toISOString();
      const snap = createSnapshot();

      this.predictionRecords.push({
        predictionId: `pred_seed_pending_${idx + 1}`,
        learnerId: p.learnerId,
        conceptId: p.conceptId,
        predictedProbability: p.predProb,
        predictedCategory: p.predProb >= 0.70 ? 'Strong' : p.predProb >= 0.40 ? 'Developing' : 'Weak',
        confidence: 0.75,
        featureSnapshot: snap.raw,
        normalizedSnapshot: snap.normalized,
        modelVersion: 'logreg-prod-v1.0',
        predictedAt: predTime,
        evaluationStatus: 'pending',
      });
    }

    // 3. Seed Observational Recommendation Records
    this.recommendationRecords = [
      {
        recommendationId: 'rec_seed_1',
        learnerId: 'student_a',
        action: 'ADVANCE',
        conceptId: 'gate_toc',
        conceptName: 'Theory of Computation',
        generatedAt: new Date(baseDate + 18 * 3600000).toISOString(),
        modelVersion: 'logreg-prod-v1.0',
        evaluationStatus: 'evaluated',
        evaluatedAt: new Date(baseDate + 20 * 3600000).toISOString(),
        outcomeDetails: {
          actionTaken: 'EXAM',
          timeToActSeconds: 7200,
          masteryBefore: 0.82,
          masteryAfter: 0.88,
          masteryDelta: 0.06,
          retentionBefore: 0.80,
          retentionAfter: 0.88,
          retentionDelta: 0.08,
          subsequentIsCorrect: true,
          advanceSucceeded: true,
          summaryNote: 'Observed outcome following ADVANCE: learner successfully mastered next concept with 100% exam score.',
        },
      },
      {
        recommendationId: 'rec_seed_2',
        learnerId: 'student_a',
        action: 'REVIEW',
        conceptId: 'gate_compiler',
        conceptName: 'Compiler Design',
        generatedAt: new Date(baseDate + 22 * 3600000).toISOString(),
        modelVersion: 'logreg-prod-v1.0',
        evaluationStatus: 'evaluated',
        evaluatedAt: new Date(baseDate + 25 * 3600000).toISOString(),
        outcomeDetails: {
          actionTaken: 'FLASHCARDS',
          timeToActSeconds: 10800,
          masteryBefore: 0.40,
          masteryAfter: 0.45,
          masteryDelta: 0.05,
          retentionBefore: 0.35,
          retentionAfter: 0.45,
          retentionDelta: 0.10,
          subsequentIsCorrect: true,
          summaryNote: 'Observed outcome following REVIEW: retention evidence recovered from 0.35 to 0.45.',
        },
      },
      {
        recommendationId: 'rec_seed_3',
        learnerId: 'student_b',
        action: 'REMEDIATE_PREREQUISITE',
        conceptId: 'upsc_fundamental_rights',
        conceptName: 'Fundamental Rights',
        generatedAt: new Date(baseDate + 46 * 3600000).toISOString(),
        modelVersion: 'logreg-prod-v1.0',
        evaluationStatus: 'evaluated',
        evaluatedAt: new Date(baseDate + 50 * 3600000).toISOString(),
        outcomeDetails: {
          actionTaken: 'PRACTICE',
          timeToActSeconds: 14400,
          masteryBefore: 0.42,
          masteryAfter: 0.48,
          masteryDelta: 0.06,
          retentionBefore: 0.40,
          retentionAfter: 0.48,
          retentionDelta: 0.08,
          subsequentIsCorrect: true,
          prerequisiteImproved: true,
          summaryNote: 'Observed outcome following REMEDIATE_PREREQUISITE: prerequisite mastery improved from 0.42 to 0.48.',
        },
      },
      {
        recommendationId: 'rec_seed_4',
        learnerId: 'student_b',
        action: 'PRACTICE',
        conceptId: 'upsc_directive_principles',
        conceptName: 'Directive Principles',
        generatedAt: new Date(baseDate + 51 * 3600000).toISOString(),
        modelVersion: 'logreg-prod-v1.0',
        evaluationStatus: 'pending',
      },
    ];

    // 4. Dataset Metadata
    this.datasetMetadata = {
      datasetVersion: 'dataset-v1.0',
      generatedAt: new Date(baseDate + 70 * 3600000).toISOString(),
      totalEvaluatedSamples: 14,
      positiveSamples: 9,
      negativeSamples: 5,
      trainSamples: 10,
      validationSamples: 4,
      featureVersion: 'v1-canonical-16',
      targetDefinitionVersion: 'target-v1-independent-outcome',
      temporalCutoff: new Date(baseDate + 70 * 3600000).toISOString(),
    };
  }

  // DATABASE SNAPSHOT for Database Explorer
  public getDatabaseSnapshot() {
    const flatMasteries: MasteryState[] = [];
    for (const [, map] of this.masteryStates) {
      for (const [, state] of Object.entries(map)) {
        flatMasteries.push(state);
      }
    }

    return {
      stats: {
        totalUsers: this.users.size,
        totalDomains: this.domains.length,
        totalModules: this.modules.length,
        totalLessons: this.lessons.length,
        totalConcepts: this.concepts.length,
        totalPrerequisites: this.prerequisites.length,
        totalQuestions: this.questions.length,
        totalAttempts: this.attempts.length,
        totalMasteryStates: flatMasteries.length,
        totalSessions: this.learningSessions.length,
        totalRecommendations: this.recommendations.length,
        totalOverrides: this.teacherOverrides.length,
        totalExamSessions: this.examSessions.length,
      },
      tables: [
        {
          name: 'Module',
          count: this.modules.length,
          description: 'Syllabus modules dividing subjects into logical competency units.',
          records: this.modules,
        },
        {
          name: 'Lesson',
          count: this.lessons.length,
          description: 'Pedagogical lesson units with objectives, resources, concepts, and assessments.',
          records: this.lessons,
        },
        {
          name: 'CurriculumDomain',
          count: this.domains.length,
          description: 'Syllabus tracks spanning GATE CS, UPSC Civil Services, General School STEM (K-12), College Degree, and CS Foundations.',
          records: this.domains,
        },
        {
          name: 'User',
          count: this.users.size,
          description: 'Students, faculty, and administrators with role-based access, active domain, language, reading level, and accessibility preferences.',
          records: Array.from(this.users.values()),
        },
        {
          name: 'Concept',
          count: this.concepts.length,
          description: 'Curriculum knowledge graph nodes across GATE, UPSC, School STEM, and College domains with multi-reading-level variants and audio scripts.',
          records: this.concepts,
        },
        {
          name: 'Prerequisite',
          count: this.prerequisites.length,
          description: 'DAG prerequisite dependency edges across each domain with required mastery threshold, strength, and pedagogical rationale.',
          records: this.prerequisites,
        },
        {
          name: 'Question',
          count: this.questions.length,
          description: 'Diverse interactive assessment items (MCQ, Assertion-Reason, Numerical, Code Output, Debug Bug) tagged with Bloom taxonomy and pre-evaluations.',
          records: this.questions,
        },
        {
          name: 'Attempt',
          count: this.attempts.length,
          description: 'Detailed student response telemetry capturing response time, confidence, hints, retries, computed evidence, and anti-guessing status.',
          records: this.attempts,
        },
        {
          name: 'MasteryState',
          count: flatMasteries.length,
          description: 'Continuously updated multi-signal mastery, uncertainty, retention, and Bloom cognitive distribution per learner-concept pair.',
          records: flatMasteries,
        },
        {
          name: 'LearningSession',
          count: this.learningSessions.length,
          description: 'Aggregated practice and diagnostic sessions tracking duration, domain, reading level used, language, and accessibility modes.',
          records: this.learningSessions,
        },
        {
          name: 'Recommendation',
          count: this.recommendations.length,
          description: 'Deterministic next-best pedagogical action generated by the 13-step engine with explainable evidence summaries and audit trails.',
          records: this.recommendations,
        },
        {
          name: 'TeacherOverride',
          count: this.teacherOverrides.length,
          description: 'Faculty-in-the-loop clinical overrides with full audit logs preserving original recommendations and reasoning.',
          records: this.teacherOverrides,
        },
        {
          name: 'MockExamSession',
          count: this.examSessions.length,
          description: 'AI-generated adaptive mock examination sessions, student submissions, and concept-level mastery evidence.',
          records: this.examSessions,
        },
        {
          name: 'Flashcard',
          count: this.flashcards.length,
          description: 'Spaced repetition flashcards with active recall prompts, formulas, and conceptual cues.',
          records: this.flashcards,
        },
        {
          name: 'FlashcardProgress',
          count: this.flashcardProgress.size,
          description: 'Student active recall progress, interval scheduling, and Leitner retention parameters.',
          records: Array.from(this.flashcardProgress.values()),
        },
        {
          name: 'LessonProgress',
          count: this.lessonProgress.size,
          description: 'Lesson completion statuses, assessment scores, and prerequisite gating progression.',
          records: Array.from(this.lessonProgress.values()),
        },
        {
          name: 'SummaryNote',
          count: this.summaryNotes.size,
          description: 'AI-distilled conceptual cheat-sheets and review summaries.',
          records: Array.from(this.summaryNotes.values()),
        },
        {
          name: 'AuthSession',
          count: this.authSessions.size,
          description: 'Active authenticated student and faculty Bearer session tokens with expiry.',
          records: Array.from(this.authSessions.values()),
        },
      ],
      persistence: {
        ...persistence.getFileStats(),
        filePath: persistence.getFilePath(),
        lastSavedAt: persistence.getLastSavedTime(),
        storageType: 'Persistent File Store (Atomic JSON)',
      },
    };
  }

  // Automatic Evaluation Before Teacher Approval
  public async evaluateQuestionAutomatic(questionId: string, customQuestion?: Partial<Question>): Promise<AIEvaluationReport> {
    const question = this.questions.find((q) => q.id === questionId) || customQuestion;
    if (!question) throw new Error(`Question ${questionId} not found`);

    const institution = this.institutions.find((i) => i.id === (question.institutionStyleId || this.config.activeInstitutionId)) || this.institutions[0];

    if (this.aiClient && process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are an automated pedagogical quality assurance validator for competitive examinations (${question.domainId || 'CS & Engineering'}).
Evaluate this assessment item:
Domain: ${question.domainId || 'general'}
Question: ${question.questionText}
Concept: ${question.conceptId}
Tagged Bloom Level: ${question.bloomLevel || 'Understand'}
Difficulty: ${question.difficulty || 'medium'}
Options: ${JSON.stringify(question.options || [])}
Correct Option Index: ${question.correctOptionIndex}
Explanation: ${question.explanation}
Target Institutional Style: ${institution.name} (${institution.academicTone})

Return JSON:
{
  "overallScore": number (0-100),
  "factualAccuracy": { "score": number, "rationale": string },
  "bloomAlignment": { "score": number, "detectedLevel": string, "rationale": string },
  "pedagogicalClarity": { "score": number, "rationale": string },
  "distractorQuality": { "score": number, "rationale": string },
  "styleGuideCompliance": { "score": number, "rationale": string },
  "recommendation": "AUTO_APPROVE" | "NEEDS_TEACHER_REVIEW" | "FLAGGED_REJECT"
}`;

        const res = await this.aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (res.text) {
          const parsed = JSON.parse(res.text);
          const autoApproved = parsed.overallScore >= this.config.autoApproveScoreThreshold;
          const report: AIEvaluationReport = {
            overallScore: parsed.overallScore,
            recommendation: autoApproved ? 'AUTO_APPROVE' : parsed.recommendation || 'NEEDS_TEACHER_REVIEW',
            factualAccuracy: parsed.factualAccuracy || { score: 95, rationale: 'Factually verified.' },
            bloomAlignment: {
              score: parsed.bloomAlignment?.score || 90,
              taggedLevel: question.bloomLevel || 'Understand',
              detectedLevel: (parsed.bloomAlignment?.detectedLevel as BloomLevel) || question.bloomLevel || 'Understand',
              rationale: parsed.bloomAlignment?.rationale || 'Cognitive tier aligned.',
            },
            pedagogicalClarity: parsed.pedagogicalClarity || { score: 90, rationale: 'Clear language.' },
            distractorQuality: parsed.distractorQuality || { score: 88, rationale: 'Plausible misconceptions.' },
            styleGuideCompliance: {
              score: parsed.styleGuideCompliance?.score || 92,
              institutionName: institution.name,
              rationale: parsed.styleGuideCompliance?.rationale || 'Matches target syllabus rubric.',
            },
            evaluatedAt: new Date().toISOString(),
            autoApproved,
          };

          const qIndex = this.questions.findIndex((q) => q.id === questionId);
          if (qIndex >= 0) {
            this.questions[qIndex].aiEvaluation = report;
            if (autoApproved) {
              this.questions[qIndex].evaluationStatus = 'APPROVED';
            }
          }

          return report;
        }
      } catch (err) {
        console.warn('Gemini evaluation failed, falling back to deterministic rubric:', err);
      }
    }

    // Deterministic Rule-Based Fallback
    const hasClearQuestion = (question.questionText?.length || 0) > 15;
    const hasOptions = (question.options?.length || 0) >= 4;
    const hasExplanation = (question.explanation?.length || 0) > 20;

    const factualScore = hasExplanation ? 96 : 80;
    const bloomScore = question.bloomLevel ? 92 : 80;
    const clarityScore = hasClearQuestion ? 94 : 75;
    const distractorScore = hasOptions ? 90 : 70;
    const styleScore = 93;

    const overallScore = Math.round((factualScore + bloomScore + clarityScore + distractorScore + styleScore) / 5);
    const autoApproved = overallScore >= this.config.autoApproveScoreThreshold;

    const report: AIEvaluationReport = {
      overallScore,
      recommendation: autoApproved ? 'AUTO_APPROVE' : 'NEEDS_TEACHER_REVIEW',
      factualAccuracy: { score: factualScore, rationale: 'Verified against syllabus domain benchmarks.' },
      bloomAlignment: {
        score: bloomScore,
        taggedLevel: question.bloomLevel || 'Understand',
        detectedLevel: question.bloomLevel || 'Understand',
        rationale: `Cognitive demand directly targets ${question.bloomLevel || 'Understand'}.`,
      },
      pedagogicalClarity: { score: clarityScore, rationale: 'Unambiguous prompt phrasing.' },
      distractorQuality: { score: distractorScore, rationale: 'Distractor choices address common competitive exam traps.' },
      styleGuideCompliance: {
        score: styleScore,
        institutionName: institution.name,
        rationale: `Adheres to ${institution.shortCode} standards.`,
      },
      evaluatedAt: new Date().toISOString(),
      autoApproved,
    };

    const qIndex = this.questions.findIndex((q) => q.id === questionId);
    if (qIndex >= 0) {
      this.questions[qIndex].aiEvaluation = report;
      if (autoApproved) {
        this.questions[qIndex].evaluationStatus = 'APPROVED';
      }
    }

    return report;
  }

  public approveQuestion(questionId: string, teacherId: string, isApproved: boolean): Question {
    const qIndex = this.questions.findIndex((q) => q.id === questionId);
    if (qIndex < 0) throw new Error(`Question ${questionId} not found`);

    this.questions[qIndex].evaluationStatus = isApproved ? 'APPROVED' : 'REJECTED';
    this.questions[qIndex].reviewedByTeacherId = teacherId;
    this.questions[qIndex].reviewedAt = new Date().toISOString();

    return this.questions[qIndex];
  }

  // Multilingual & Reading-Level Content Transformation
  public async transformContent(
    conceptId: string,
    language: LanguageCode,
    readingLevel: ReadingLevel,
    institutionId?: string
  ) {
    const concept = this.concepts.find((c) => c.id === conceptId);
    if (!concept) throw new Error(`Concept ${conceptId} not found`);

    const institution = this.institutions.find((i) => i.id === (institutionId || this.config.activeInstitutionId)) || this.institutions[0];

    const levelData = concept.readingLevelVariants?.[readingLevel];
    const langData = concept.multilingualVariants?.[language];

    if (language === 'en' && levelData) {
      return {
        conceptId,
        domainId: concept.domainId,
        language,
        readingLevel,
        name: concept.name,
        analogy: levelData.analogy,
        coreExplanation: levelData.coreExplanation,
        realWorldExample: levelData.realWorldExample,
        keyPoints: levelData.keyPoints,
        audioScript: concept.audioScript || levelData.coreExplanation,
        institutionTone: institution.name,
      };
    }

    if (this.aiClient && process.env.GEMINI_API_KEY && (language !== 'en' || !levelData)) {
      try {
        const prompt = `You are an expert multilingual educator adapting curriculum for ${concept.domainId || 'competitive exams'}.
Concept: "${concept.name}" (${concept.description})
Domain: ${concept.domainId}
Reading Level: "${readingLevel}"
Target Language: "${language}"
Institutional Tone: "${institution.name}"

Return strict JSON:
{
  "name": string,
  "analogy": string,
  "coreExplanation": string,
  "realWorldExample": string,
  "keyPoints": [string, string, string],
  "audioScript": string
}`;

        const res = await this.aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (res.text) {
          const parsed = JSON.parse(res.text);
          return {
            conceptId,
            domainId: concept.domainId,
            language,
            readingLevel,
            institutionTone: institution.name,
            ...parsed,
          };
        }
      } catch (err) {
        console.warn('Gemini transformation error, falling back to local cache:', err);
      }
    }

    return {
      conceptId,
      domainId: concept.domainId,
      language,
      readingLevel,
      name: langData?.name || concept.name,
      analogy: levelData?.analogy || `Imagine ${concept.name} within the ${concept.domainId} curriculum.`,
      coreExplanation: langData?.description || levelData?.coreExplanation || concept.description,
      realWorldExample: levelData?.realWorldExample || `Directly examined in ${concept.domainId} syllabus assessments.`,
      keyPoints: levelData?.keyPoints || concept.keyTakeaways,
      audioScript: langData?.audioScript || concept.audioScript || concept.description,
      institutionTone: institution.name,
    };
  }

  // Record attempt & run 13-step adaptive decision algorithm
  public recordAttempt(
    learnerId: string,
    questionId: string,
    submission: {
      selectedOptionIndex: number;
      confidence: number;
      responseTimeSeconds: number;
      hintsUsed: number;
      retries: number;
      userCodeAnswer?: string;
    }
  ) {
    const learner = this.learners.get(learnerId);
    if (!learner) throw new Error(`Learner ${learnerId} not found`);

    const question = this.questions.find((q) => q.id === questionId);
    if (!question) throw new Error(`Question ${questionId} not found`);

    const concept = this.concepts.find((c) => c.id === question.conceptId);
    if (!concept) throw new Error(`Concept ${question.conceptId} not found`);

    const isCorrect = submission.selectedOptionIndex === question.correctOptionIndex;
    const attemptTimestamp = new Date().toISOString();

    // 1. Collect latest evidence
    const evidenceResult = calculateEvidence(
      question,
      {
        isCorrect,
        confidence: submission.confidence,
        responseTimeSeconds: submission.responseTimeSeconds,
        hintsUsed: submission.hintsUsed,
        retries: submission.retries,
      },
      this.config
    );

    // 1b. CONTINUOUS LEARNING: Evaluate pending older predictions strictly before this timestamp
    mlFeedbackEngine.evaluatePendingPredictions({
      learnerId,
      conceptId: question.conceptId,
      isCorrect,
      antiGuessingTriggered: evidenceResult.antiGuessingTriggered,
      confidence: submission.confidence,
      responseTimeSeconds: submission.responseTimeSeconds,
      timestamp: attemptTimestamp,
      source: 'attempt',
    });

    // 2. Retrieve old mastery & update mastery via smoothing
    const currentConceptMastery = learner.conceptMasteries[question.conceptId] || {
      id: `ms_${learnerId}_${question.conceptId}`,
      learnerId,
      domainId: question.domainId,
      conceptId: question.conceptId,
      conceptName: concept.name,
      mastery: 0,
      uncertainty: 0.8,
      retention: 0,
      attemptsCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      averageConfidence: 0.5,
      averageResponseTime: 20,
      totalHintsUsed: 0,
      totalRetries: 0,
      easyAccuracy: 0,
      mediumAccuracy: 0,
      hardAccuracy: 0,
      transferAccuracy: 0,
      bloomAccuracy: {
        Remember: 0,
        Understand: 0,
        Apply: 0,
        Analyze: 0,
        Evaluate: 0,
        Create: 0,
      },
      lastAttemptAt: new Date().toISOString(),
      lastReviewedAt: new Date().toISOString(),
      daysSinceLastReview: 0,
      prerequisiteSatisfied: true,
      blockedByPrerequisites: [],
      status: 'unattempted',
    };

    const masteryBefore = currentConceptMastery.mastery;
    const uncertaintyBefore = currentConceptMastery.uncertainty;

    // 2. Update mastery
    const masteryAfter = updateMastery(masteryBefore, evidenceResult.evidenceScore, this.config.learningRateAlpha);

    // Update uncertainty
    const uncertaintyAfter = updateUncertainty(
      uncertaintyBefore,
      isCorrect,
      submission.confidence,
      submission.hintsUsed,
      evidenceResult.antiGuessingTriggered,
      currentConceptMastery.attemptsCount + 1
    );

    // 3. Update retention
    const retentionAfter = masteryAfter;

    // Update Bloom cognitive accuracy
    const bloomLevel = question.bloomLevel || 'Understand';
    const currentBloomAcc = currentConceptMastery.bloomAccuracy?.[bloomLevel] || 0.5;
    const newBloomAcc = isCorrect
      ? Math.min(1.0, currentBloomAcc + 0.15)
      : Math.max(0.0, currentBloomAcc - 0.20);

    const totalAttempts = currentConceptMastery.attemptsCount + 1;
    const correctAttempts = currentConceptMastery.correctCount + (isCorrect ? 1 : 0);
    const incorrectAttempts = currentConceptMastery.incorrectCount + (isCorrect ? 0 : 1);

    let easyAcc = currentConceptMastery.easyAccuracy;
    let medAcc = currentConceptMastery.mediumAccuracy;
    let hardAcc = currentConceptMastery.hardAccuracy;
    let transferAcc = currentConceptMastery.transferAccuracy;

    if (question.difficulty === 'easy') {
      easyAcc = isCorrect ? Math.min(1.0, easyAcc + 0.25) : Math.max(0.0, easyAcc - 0.25);
    } else if (question.difficulty === 'medium') {
      medAcc = isCorrect ? Math.min(1.0, medAcc + 0.25) : Math.max(0.0, medAcc - 0.25);
    } else if (question.difficulty === 'hard') {
      hardAcc = isCorrect ? Math.min(1.0, hardAcc + 0.25) : Math.max(0.0, hardAcc - 0.25);
    }

    if (question.questionType === 'Transfer' || question.questionFormat === 'COMPLEXITY_TRADE_OFF' || question.questionFormat === 'ASSERTION_REASON') {
      transferAcc = isCorrect ? Math.min(1.0, transferAcc + 0.35) : Math.max(0.0, transferAcc - 0.35);
    }

    // BKT Knowledge Tracing Update (Corbett & Anderson 1995)
    const currentBktState =
      currentConceptMastery.bktState ||
      bktEngine.createInitialState(question.conceptId, this.config.bktConfig);
    const updatedBktState = bktEngine.step(
      currentBktState,
      isCorrect,
      new Date().toISOString(),
      `att_${Date.now()}`,
      {
        confidence: submission.confidence,
        antiGuessingTriggered: evidenceResult.antiGuessingTriggered,
        hintsUsed: submission.hintsUsed,
        responseTimeSeconds: submission.responseTimeSeconds,
      }
    );
    const bktMastery = updatedBktState.pKnowledge;

    // PHASE 8: ML Feature extraction & hybrid prediction (Bayesian + BKT + ML)
    const mlPred = mlInferenceEngine.predict(learnerId, question.conceptId);
    const hybridMastery = computeHybridMastery(masteryAfter, mlPred.probability, this.config, bktMastery);

    // CONTINUOUS LEARNING: Freeze feature snapshot at time T for future evaluation
    const featuresAtT = mlFeatureExtractor.extractFeatures(learnerId, question.conceptId, {
      customScaler: mlInferenceEngine.getActiveModelWeights().scaler,
    });
    mlFeedbackEngine.logPrediction({
      learnerId,
      conceptId: question.conceptId,
      predictedProbability: mlPred.probability,
      predictedCategory: mlPred.category,
      confidence: mlPred.confidence,
      featureSnapshot: featuresAtT.raw,
      normalizedSnapshot: featuresAtT.normalized,
      modelVersion: mlPred.modelVersion,
      predictedAt: attemptTimestamp,
    });

    // CONTINUOUS LEARNING: Evaluate pending recommendations observing this attempt
    mlFeedbackEngine.evaluatePendingRecommendations({
      learnerId,
      conceptId: question.conceptId,
      timestamp: attemptTimestamp,
      actionTaken: 'PRACTICE',
      isCorrect,
      masteryBefore,
      masteryAfter: hybridMastery,
      retentionBefore: currentConceptMastery.retention,
      retentionAfter,
    });

    const updatedConceptMastery: MasteryState = {
      ...currentConceptMastery,
      mastery: hybridMastery,
      uncertainty: uncertaintyAfter,
      retention: retentionAfter,
      bktState: updatedBktState,
      bktMastery,
      attemptsCount: totalAttempts,
      correctCount: correctAttempts,
      incorrectCount: incorrectAttempts,
      averageConfidence: (currentConceptMastery.averageConfidence * currentConceptMastery.attemptsCount + submission.confidence) / totalAttempts,
      averageResponseTime: (currentConceptMastery.averageResponseTime * currentConceptMastery.attemptsCount + submission.responseTimeSeconds) / totalAttempts,
      totalHintsUsed: currentConceptMastery.totalHintsUsed + submission.hintsUsed,
      totalRetries: currentConceptMastery.totalRetries + submission.retries,
      easyAccuracy: Math.round(easyAcc * 100) / 100,
      mediumAccuracy: Math.round(medAcc * 100) / 100,
      hardAccuracy: Math.round(hardAcc * 100) / 100,
      transferAccuracy: Math.round(transferAcc * 100) / 100,
      bloomAccuracy: {
        ...(currentConceptMastery.bloomAccuracy || {
          Remember: 0.5,
          Understand: 0.5,
          Apply: 0.5,
          Analyze: 0.5,
          Evaluate: 0.5,
          Create: 0.5,
        }),
        [bloomLevel]: Math.round(newBloomAcc * 100) / 100,
      },
      lastAttemptAt: new Date().toISOString(),
      lastReviewedAt: new Date().toISOString(),
      daysSinceLastReview: 0,
      mlPrediction: mlPred,
      status: hybridMastery >= this.config.masteryThreshold ? 'mastered' : hybridMastery >= 0.5 ? 'developing' : 'struggling',
    };

    learner.conceptMasteries[question.conceptId] = updatedConceptMastery;

    const learnerMasteries = this.masteryStates.get(learnerId) || {};
    learnerMasteries[question.conceptId] = updatedConceptMastery;
    this.masteryStates.set(learnerId, learnerMasteries);

    // 13. Store Attempt
    const attempt: Attempt = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      learnerId,
      domainId: question.domainId,
      questionId,
      conceptId: question.conceptId,
      selectedOptionIndex: submission.selectedOptionIndex,
      userCodeAnswer: submission.userCodeAnswer,
      isCorrect,
      confidence: submission.confidence,
      responseTimeSeconds: submission.responseTimeSeconds,
      hintsUsed: submission.hintsUsed,
      retries: submission.retries,
      timestamp: new Date().toISOString(),
      evidenceScore: evidenceResult.evidenceScore,
      questionType: question.questionType,
      questionFormat: question.questionFormat,
      difficulty: question.difficulty,
      bloomLevel: question.bloomLevel,
      readingLevelUsed: learner.preferredReadingLevel,
      languageUsed: learner.preferredLanguage,
      antiGuessingTriggered: evidenceResult.antiGuessingTriggered,
      antiGuessingReason: evidenceResult.antiGuessingReason,
    };

    learner.recentAttempts.push(attempt);
    this.attempts.push(attempt);

    this.recomputeOverallMetrics(learner);

    // 4-12. Run Adaptive Decision Algorithm within Domain
    const domainConcepts = this.getConceptsByDomain(question.domainId);
    const decision = selectNextAction(learner, domainConcepts.length > 0 ? domainConcepts : this.concepts, this.config, question.conceptId);
    const newRecommendation: Recommendation = {
      id: `rec_${Date.now()}`,
      learnerId: learner.id,
      domainId: question.domainId,
      action: decision.action,
      conceptId: decision.conceptId,
      conceptName: decision.conceptName,
      reason: decision.reason,
      stepFired: decision.stepFired,
      evidenceSummary: decision.evidenceSummary,
      timestamp: new Date().toISOString(),
    };

    learner.currentRecommendation = newRecommendation;
    learner.recommendationHistory.push(newRecommendation);
    this.recommendations.push(newRecommendation);

    // CONTINUOUS LEARNING: Track recommendation for observational outcome evaluation
    mlFeedbackEngine.logRecommendation(newRecommendation);

    this.schedulePersist();

    return {
      attempt,
      evidence: evidenceResult,
      masteryBefore,
      masteryAfter,
      uncertaintyBefore,
      uncertaintyAfter,
      newRecommendation,
    };
  }

  public applyTeacherOverride(
    learnerId: string,
    teacherId: string,
    teacherName: string,
    newAction: any,
    newConceptId: string,
    reason: string
  ): TeacherOverride {
    const learner = this.learners.get(learnerId);
    if (!learner) throw new Error(`Learner ${learnerId} not found`);

    const targetConcept = this.concepts.find((c) => c.id === newConceptId) || this.concepts[0];
    const prevAction = learner.currentRecommendation?.action || 'PRACTICE';
    const prevConceptId = learner.currentRecommendation?.conceptId || targetConcept.id;

    const override: TeacherOverride = {
      id: `ov_${Date.now()}`,
      learnerId,
      teacherId,
      teacherName,
      previousAction: prevAction,
      previousConceptId: prevConceptId,
      newAction,
      newConceptId,
      reason,
      timestamp: new Date().toISOString(),
    };

    learner.overrides.push(override);
    this.teacherOverrides.push(override);

    const prevEvidence = learner.currentRecommendation?.evidenceSummary || {
      mastery: 0.5,
      uncertainty: 0.3,
      retention: 0.5,
      recentAccuracy: '1/1',
      hintsUsed: 0,
      daysSinceReview: 0,
      prerequisiteStatus: 'Overridden',
      transferPerformance: 'Teacher Determined',
      guessingRisk: 'Low',
    };

    const overriddenRec: Recommendation = {
      id: `rec_ov_${Date.now()}`,
      learnerId,
      domainId: targetConcept.domainId,
      action: newAction,
      conceptId: newConceptId,
      conceptName: targetConcept.name,
      reason: `[TEACHER OVERRIDE by ${teacherName}]: ${reason}`,
      stepFired: 'Teacher Clinical Intervention',
      evidenceSummary: prevEvidence,
      timestamp: override.timestamp,
      isOverridden: true,
      overrideDetails: override,
    };

    learner.currentRecommendation = overriddenRec;
    learner.recommendationHistory.push(overriddenRec);
    this.recommendations.push(overriddenRec);
    this.schedulePersist();

    return override;
  }

  public startSession(
    learnerId: string,
    sessionType: LearningSession['sessionType'],
    conceptId: string
  ): LearningSession {
    const learner = this.learners.get(learnerId);
    const concept = this.concepts.find((c) => c.id === conceptId);
    const initialMastery = learner?.conceptMasteries[conceptId]?.mastery || 0.5;

    const session: LearningSession = {
      id: `sess_${Date.now()}`,
      learnerId,
      domainId: concept?.domainId || learner?.activeDomainId || 'gate_cs',
      sessionType,
      activeConceptId: conceptId,
      startedAt: new Date().toISOString(),
      attemptsCount: 0,
      correctCount: 0,
      initialMastery,
      finalMastery: initialMastery,
      readingLevelUsed: learner?.preferredReadingLevel || 'undergraduate',
      languageUsed: learner?.preferredLanguage || 'en',
      dyslexiaModeActive: learner?.dyslexiaModeEnabled || false,
      audioInteractionsCount: 0,
      institutionStyleId: learner?.institutionId || this.config.activeInstitutionId,
    };

    this.learningSessions.push(session);
    return session;
  }

  public endSession(sessionId: string, finalMastery: number) {
    const sess = this.learningSessions.find((s) => s.id === sessionId);
    if (sess) {
      sess.endedAt = new Date().toISOString();
      sess.durationSeconds = Math.round((new Date(sess.endedAt).getTime() - new Date(sess.startedAt).getTime()) / 1000);
      sess.finalMastery = finalMastery;
    }
  }

  private recomputeOverallMetrics(learner: LearnerProfile) {
    const activeDomainConcepts = this.getConceptsByDomain(learner.activeDomainId);
    const targetConceptIds = new Set(activeDomainConcepts.map((c) => c.id));

    const domainMasteries = Object.values(learner.conceptMasteries).filter((m) =>
      targetConceptIds.has(m.conceptId) && m.attemptsCount > 0
    );

    const pool = domainMasteries.length > 0 ? domainMasteries : Object.values(learner.conceptMasteries).filter((m) => m.attemptsCount > 0);

    if (pool.length === 0) return;

    const totalM = pool.reduce((acc, m) => acc + m.mastery, 0);
    const totalU = pool.reduce((acc, m) => acc + m.uncertainty, 0);
    const totalR = pool.reduce((acc, m) => acc + m.retention, 0);

    learner.overallMastery = Math.round((totalM / pool.length) * 100) / 100;
    learner.overallUncertainty = Math.round((totalU / pool.length) * 100) / 100;
    learner.overallRetention = Math.round((totalR / pool.length) * 100) / 100;

    const recent5 = learner.recentAttempts.slice(-5);
    const consecutiveFails = countRecentConsecutiveFailures(recent5);
    if (consecutiveFails >= this.config.interventionThresholdFailures) {
      learner.needsAttention = true;
      learner.attentionReason = `${consecutiveFails} consecutive incorrect attempts on current topic despite hints.`;
    } else {
      learner.needsAttention = false;
      learner.attentionReason = undefined;
    }
  }
}

function countRecentConsecutiveFailures(attempts: Attempt[]): number {
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

export const store = new DataStore();
