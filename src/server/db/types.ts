export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export type QuestionType = 'Recall' | 'Understanding' | 'Application' | 'Transfer';

export type BloomLevel = 
  | 'Remember' 
  | 'Understand' 
  | 'Apply' 
  | 'Analyze' 
  | 'Evaluate' 
  | 'Create';

export type QuestionFormat = 
  | 'MCQ' 
  | 'CODE_OUTPUT' 
  | 'DEBUG_BUG' 
  | 'FILL_BLANK' 
  | 'COMPLEXITY_TRADE_OFF'
  | 'ASSERTION_REASON'     // High-utility for UPSC & GATE competitive exams
  | 'NUMERICAL_ANALYSIS';  // High-utility for GATE & College STEM

export type ReadingLevel = 
  | 'middle_school'   // Intuitive analogies (train cars, cafeterias, airport queues)
  | 'high_school'     // Clear academic definition & visual step-by-step
  | 'undergraduate'   // Rigorous formal definitions & Big-O / mathematical invariants
  | 'executive';      // Systems engineering, policy trade-offs, and governance

export type LanguageCode = 
  | 'en' // English
  | 'es' // Spanish
  | 'hi' // Hindi
  | 'ta' // Tamil
  | 'te' // Telugu
  | 'fr' // French
  | 'de' // German
  | 'zh'; // Mandarin

export type RecommendationAction = 
  | 'ADVANCE'
  | 'PRACTICE'
  | 'REVIEW'
  | 'REMEDIATE_PREREQUISITE'
  | 'CHALLENGE'
  | 'TEACHER_INTERVENTION';

// ==========================================
// CURRICULUM DOMAINS (Multi-Domain Architecture)
// ==========================================
export type DomainId = 
  | 'cs_foundations'  // Computer Science & Data Structures (CS-101 to CS-110)
  | 'gate_cs'         // Graduate Aptitude Test in Engineering (Algorithms, OS, TOC, DBMS)
  | 'upsc_civil'      // UPSC Civil Services Exam (Polity, Economy, Geography, History)
  | 'school_stem'     // General School Exam Syllabus (Physics, Chemistry, Math, Biology)
  | 'college_eng';    // College Degree Syllabus (Linear Algebra, ML, Distributed Systems)

export interface CurriculumDomain {
  id: DomainId;
  name: string;
  shortLabel: string;
  category: 'Competitive National Exams' | 'University Degree' | 'Secondary School' | 'Core Engineering';
  targetExam: string;
  description: string;
  badgeColor: string;
  accentColor: string;
  conceptIds: string[];
}

// ==========================================
// 1. DATABASE ENTITY: User
// ==========================================
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  cohort: string;
  institutionId: string;
  activeDomainId: DomainId; // Target syllabus domain
  preferredLanguage: LanguageCode;
  preferredReadingLevel: ReadingLevel;
  dyslexiaModeEnabled: boolean;
  bionicReadingEnabled: boolean;
  createdAt: string;
  lastActiveAt: string;
  passwordHash?: string;
  passwordSalt?: string;
  
  // Rich Settings & Personalization Fields
  username?: string;
  mobile?: string;
  mobileVerified?: boolean;
  secondaryEmail?: string;
  studentRollNumber?: string;
  bio?: string;
  twoStepEnabled?: boolean;
  passkeyEnabled?: boolean;
  passkeyName?: string;
  themeColor?: 'indigo' | 'blue' | 'emerald' | 'violet' | 'amber' | 'rose';
  fontFamily?: 'sans' | 'inter' | 'mono' | 'dyslexic' | 'serif';
  fontSize?: 'compact' | 'normal' | 'comfortable' | 'large';
  voiceAssistantEnabled?: boolean;
  speechRate?: number;
  voicePersona?: string;
  googleLinked?: boolean;
  dailyGoalMinutes?: number;
}

export interface AuthSession {
  token: string;
  userId: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
}

// ==========================================
// 2. DATABASE ENTITY: Concept
// ==========================================
export interface Concept {
  id: string;
  domainId: DomainId; // Which curriculum domain this concept belongs to
  name: string;
  code: string;
  description: string;
  prerequisites: string[]; // array of concept IDs
  order: number;
  category: string;
  keyTakeaways: string[];
  subConcepts?: string[]; // Phase 3: Fine-grained sub-concepts for Mind Map
  bloomTarget: BloomLevel;
  audioScript?: string;
  readingLevelVariants?: Record<ReadingLevel, {
    analogy: string;
    coreExplanation: string;
    realWorldExample: string;
    keyPoints: string[];
  }>;
  multilingualVariants?: Partial<Record<LanguageCode, {
    name: string;
    description: string;
    audioScript: string;
  }>>;
}

// ==========================================
// 3. DATABASE ENTITY: Prerequisite
// ==========================================
export interface Prerequisite {
  id: string;
  domainId: DomainId;
  conceptId: string;
  prerequisiteConceptId: string;
  requiredThreshold: number; // e.g. 0.70
  dependencyStrength: 'CRITICAL' | 'RECOMMENDED' | 'HELPFUL';
  rationale: string;
  createdAt: string;
}

// ==========================================
// 4. DATABASE ENTITY: Question
// ==========================================
export interface AIEvaluationReport {
  overallScore: number; // 0 - 100
  recommendation: 'AUTO_APPROVE' | 'NEEDS_TEACHER_REVIEW' | 'FLAGGED_REJECT';
  factualAccuracy: { score: number; rationale: string };
  bloomAlignment: { score: number; taggedLevel: BloomLevel; detectedLevel: BloomLevel; rationale: string };
  pedagogicalClarity: { score: number; rationale: string };
  distractorQuality: { score: number; rationale: string };
  styleGuideCompliance: { score: number; institutionName: string; rationale: string };
  evaluatedAt: string;
  autoApproved: boolean;
}

export interface Question {
  id: string;
  domainId: DomainId; // Tracks domain (gate, upsc, school, cs, etc.)
  conceptId: string;
  questionText: string;
  questionType: QuestionType; // legacy compatibility
  questionFormat: QuestionFormat; // Innovation: Question Diversity
  difficulty: QuestionDifficulty;
  bloomLevel: BloomLevel; // Innovation: Bloom's Taxonomy Tagging
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  hint: string;
  expectedTimeSeconds: number;
  isDiagnostic?: boolean;
  
  // Format-specific interactive fields
  codeSnippet?: string;
  expectedOutput?: string;
  bugLineNumber?: number;
  fillBlankTemplate?: string;
  fillBlankOptions?: string[];
  fillBlankSolution?: string;
  complexityPairs?: Array<{ scenario: string; complexity: string }>;
  assertionStatement?: string;
  reasonStatement?: string;

  // Innovation: Reading-level variants
  readingLevelVariants?: Record<ReadingLevel, {
    questionText: string;
    explanation: string;
  }>;

  // Innovation: Multilingual variants
  multilingualVariants?: Partial<Record<LanguageCode, {
    questionText: string;
    options: string[];
    explanation: string;
    hint: string;
  }>>;

  // Innovation: Institution-Specific Style Guides
  institutionStyleId?: string;

  // Innovation: Automatic Evaluation Before Teacher Approval
  evaluationStatus: 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';
  aiEvaluation?: AIEvaluationReport;
  reviewedByTeacherId?: string;
  reviewedAt?: string;
}

// ==========================================
// 5. DATABASE ENTITY: Attempt
// ==========================================
export interface Attempt {
  id: string;
  learnerId: string;
  domainId?: DomainId;
  questionId: string;
  conceptId: string;
  selectedOptionIndex: number;
  userCodeAnswer?: string;
  isCorrect: boolean;
  confidence: number; // 0.0 to 1.0 (e.g. 0.2, 0.5, 0.8, 1.0)
  responseTimeSeconds: number;
  hintsUsed: number;
  retries: number;
  timestamp: string;
  evidenceScore: number;
  questionType: QuestionType;
  questionFormat?: QuestionFormat;
  difficulty: QuestionDifficulty;
  bloomLevel?: BloomLevel;
  readingLevelUsed?: ReadingLevel;
  languageUsed?: LanguageCode;
  antiGuessingTriggered?: boolean;
  antiGuessingReason?: string;
}

// ==========================================
// 6. DATABASE ENTITY: MasteryState (ConceptMastery)
// ==========================================
export interface MasteryState {
  id: string;
  learnerId: string;
  domainId?: DomainId;
  conceptId: string;
  conceptName: string;
  mastery: number; // 0.0 to 1.0
  uncertainty: number; // 0.0 to 1.0
  retention: number; // 0.0 to 1.0
  attemptsCount: number;
  correctCount: number;
  incorrectCount: number;
  averageConfidence: number;
  averageResponseTime: number;
  totalHintsUsed: number;
  totalRetries: number;
  easyAccuracy: number;
  mediumAccuracy: number;
  hardAccuracy: number;
  transferAccuracy: number;
  bloomAccuracy: Record<BloomLevel, number>; // Accuracy broken down by Bloom cognitive level
  lastAttemptAt: string;
  lastReviewedAt: string;
  daysSinceLastReview: number;
  prerequisiteSatisfied: boolean;
  blockedByPrerequisites: string[]; // concept names
  status: 'mastered' | 'developing' | 'struggling' | 'prereq_blocked' | 'review_needed' | 'unattempted';
  mlPrediction?: MLPredictionResult;
  bktState?: BKTState;
  bktMastery?: number; // P(Knowledge) in [0, 1] from Bayesian Knowledge Tracing
}

export type ConceptMastery = MasteryState;

// ==========================================
// PHASE 8: MACHINE LEARNING MODEL ENTITIES
// ==========================================
export interface MLFeatureVector {
  names: string[];
  raw: Record<string, number>;
  normalized: Record<string, number>;
  values: number[];
  bktFeatures?: {
    bktKnowledge: number;
    bktOpportunityCount: number;
    bktCorrectCount: number;
    bktIncorrectCount: number;
    bktDelta: number;
  };
}

export interface MLPredictionResult {
  probability: number; // P(concept mastery) in [0, 1]
  confidence: number; // Calibration certainty
  category: 'Weak' | 'Developing' | 'Strong' | 'Mastered';
  modelVersion: string; // e.g. "logreg-v1.0"
  predictedAt: string;
  topContributingFeatures: Array<{
    name: string;
    impact: number;
    raw: number;
    direction: 'positive' | 'negative';
  }>;
  hybridMastery: number;
}

export interface MLModelWeights {
  weights: Record<string, number>;
  bias: number;
  scaler: {
    means: Record<string, number>;
    stds: Record<string, number>;
  };
  trainedAt: string;
  modelVersion: string;
  validationMetrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    rocAuc?: number;
    logLoss?: number;
    convergenceLoss?: number;
    confusionMatrix?: {
      tp: number;
      fp: number;
      tn: number;
      fn: number;
    };
  };
  sampleCount: number;
  validationSampleCount: number;
  status: 'TRAINED' | 'INSUFFICIENT_DATA' | 'FALLBACK';
}

export interface MLEngineConfig {
  enabled: boolean;
  weight: number; // e.g. 0.30 (30% ML, 70% Bayesian evidence)
  thresholds: {
    weakMax: number;       // e.g. 0.39
    developingMax: number; // e.g. 0.69
    strongMax: number;     // e.g. 0.84
    masteredMin: number;   // e.g. 0.85
  };
  classificationThreshold?: number; // e.g. 0.50
}

// ==========================================
// PHASE 6: CONTINUOUS LEARNING, EVALUATION & FEEDBACK LOOP ENTITIES
// ==========================================

export type EvaluationStatus = 'pending' | 'evaluated' | 'insufficient_evidence';

export interface MLPredictionRecord {
  predictionId: string;
  learnerId: string;
  conceptId: string;
  predictedProbability: number;
  predictedCategory: 'Weak' | 'Developing' | 'Strong' | 'Mastered';
  confidence: number;
  featureSnapshot: Record<string, number>; // Raw canonical features frozen at time T
  normalizedSnapshot: Record<string, number>; // Normalized features frozen at time T
  modelVersion: string;
  predictedAt: string; // Time T
  evaluationStatus: EvaluationStatus;
  actualOutcome?: number; // 0 or 1 from independent future event (Time T_future > T)
  evaluatedAt?: string;
  evaluationReason?: string;
  outcomeSource?: 'attempt' | 'exam' | 'flashcard';
  outcomeAttemptId?: string;
}

export type RecommendationEvaluationStatus = 'pending' | 'evaluated' | 'expired';

export interface MLRecommendationRecord {
  recommendationId: string;
  learnerId: string;
  action: RecommendationAction;
  conceptId: string;
  conceptName: string;
  generatedAt: string;
  modelVersion: string;
  evaluationStatus: RecommendationEvaluationStatus;
  evaluatedAt?: string;
  outcomeDetails?: {
    actionTaken?: string;
    timeToActSeconds?: number;
    masteryBefore?: number;
    masteryAfter?: number;
    masteryDelta?: number;
    retentionBefore?: number;
    retentionAfter?: number;
    retentionDelta?: number;
    subsequentIsCorrect?: boolean;
    prerequisiteImproved?: boolean;
    advanceSucceeded?: boolean;
    summaryNote: string;
  };
}

export type ModelLifecycleState = 'candidate' | 'validated' | 'production' | 'retired';

export interface MLModelRegistryEntry {
  modelVersion: string;
  lifecycleState: ModelLifecycleState;
  trainedAt: string;
  featureVersion: string;
  datasetVersion: string;
  sampleCount: number;
  weights: Record<string, number>;
  bias: number;
  scaler: {
    means: Record<string, number>;
    stds: Record<string, number>;
  };
  classificationThreshold: number;
  validationMetrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    rocAuc?: number;
    logLoss?: number;
    brierScore?: number;
    convergenceLoss?: number;
    confusionMatrix?: {
      tp: number;
      fp: number;
      tn: number;
      fn: number;
    };
  };
  candidateComparison?: {
    logLossDiff: number;
    accuracyDiff: number;
    f1Diff: number;
    promotable: boolean;
    rejectionReason?: string;
  };
  promotedAt?: string;
  retiredAt?: string;
  promotionReason?: string;
}

export interface DatasetMetadata {
  datasetVersion: string;
  generatedAt: string;
  totalEvaluatedSamples: number;
  positiveSamples: number;
  negativeSamples: number;
  trainSamples: number;
  validationSamples: number;
  featureVersion: string;
  targetDefinitionVersion: string;
  temporalCutoff?: string;
}

export interface MLEvaluationMetricsReport {
  status: 'READY' | 'PARTIALLY_READY' | 'INSUFFICIENT_DATA';
  evaluatedSampleCount: number;
  positiveCount: number;
  negativeCount: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  rocAuc?: number;
  logLoss?: number;
  brierScore?: number;
  confusionMatrix?: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
  };
  classificationThreshold: number;
  calibration: {
    status: 'evaluated' | 'insufficient_data';
    expectedCalibrationError?: number;
    bins: Array<{
      binRange: string;
      binMin: number;
      binMax: number;
      sampleCount: number;
      meanPredictedProbability?: number;
      observedPositiveFrequency?: number;
      calibrationGap?: number;
    }>;
  };
  dataQuality: {
    validSamplesCount: number;
    invalidSamplesCount: number;
    issues: string[];
    classImbalanceRatio?: number;
    leakageFree: boolean;
  };
  modelVersion: string;
  datasetVersion: string;
  lastEvaluatedAt?: string;
}

export interface RecommendationEffectivenessReport {
  totalTracked: number;
  totalEvaluated: number;
  pendingCount: number;
  byAction: Record<RecommendationAction, {
    count: number;
    completedCount: number;
    averageMasteryDelta: number;
    averageRetentionDelta: number;
    successRate: number;
    observationalSummary: string;
  }>;
  overallAdoptionRate: number;
}

export interface FeatureDriftReport {
  status: 'NORMAL' | 'WARNING' | 'INSUFFICIENT_DATA';
  sampleCount: number;
  baselineMeans: Record<string, number>;
  currentMeans: Record<string, number>;
  zShifts: Record<string, number>;
  maxDriftFeature: string;
  maxDriftZShift: number;
  warnings: string[];
  monitoredAt: string;
}

export interface MLModelHealthSummary {
  productionModelVersion: string;
  datasetVersion: string;
  lifecycleState: ModelLifecycleState;
  evaluatedSampleCount: number;
  positiveCount: number;
  negativeCount: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  logLoss?: number;
  rocAuc?: number;
  brierScore?: number;
  lastEvaluatedAt?: string;
  retrainingEligibility: {
    eligible: boolean;
    reasons: string[];
  };
  candidateModelStatus?: {
    hasCandidate: boolean;
    candidateVersion?: string;
    promotable?: boolean;
    comparison?: any;
  };
  driftWarning: boolean;
  driftReport?: FeatureDriftReport;
  dataQualityIssues: string[];
}

export type EvaluationReport = MLEvaluationMetricsReport;
export type ModelHealthSummary = MLModelHealthSummary;

export interface RetrainingStatus {
  eligible: boolean;
  reasons: string[];
  sampleCount: number;
  positiveCount: number;
  negativeCount: number;
}

// ==========================================
// BAYESIAN KNOWLEDGE TRACING (BKT) ENTITIES
// Corbett & Anderson (1995) 4-Parameter Model
// ==========================================
export interface BKTParameters {
  pInit: number;   // P(L_0): Initial probability concept is known
  pLearn: number;  // P(T): Probability of learning transition after opportunity
  pGuess: number;  // P(G): Probability of correct response given unlearned
  pSlip: number;   // P(S): Probability of incorrect response given learned
}

export interface BKTStepRecord {
  stepIndex: number;
  attemptId: string;
  timestamp: string;
  isCorrect: boolean;
  priorKnowledge: number;       // P(L_t)
  pCorrectPredicted: number;    // P(Correct | P(L_t))
  posteriorKnowledge: number;   // P(L_t | O_t)
  transitionKnowledge: number;  // P(L_{t+1})
}

export interface BKTState {
  pKnowledge: number;       // Current P(L_t) in [0, 1]
  pInit: number;
  pLearn: number;
  pGuess: number;
  pSlip: number;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  lastUpdatedAt: string;
  modelVersion: string;     // e.g. "bkt-standard-corbett-anderson-v1.0"
  history?: BKTStepRecord[];
}

export interface BKTConfig {
  enabled: boolean;
  weight: number; // e.g. 0.25 (weight in hybrid mastery: Bayesian + BKT + ML)
  defaultPInit: number;
  defaultPLearn: number;
  defaultPGuess: number;
  defaultPSlip: number;
  conceptOverrides?: Record<string, Partial<BKTParameters>>;
}

export interface BKTModelInfo {
  modelVersion: string;
  parameters: BKTParameters;
  weight: number;
  enabled: boolean;
  mathematicalFormulas: {
    prior: string;
    correctUpdate: string;
    incorrectUpdate: string;
    learningTransition: string;
  };
  leakageGuards: string[];
  status: 'READY' | 'PARTIALLY_READY' | 'INSUFFICIENT_DATA';
}

// ==========================================
// 7. DATABASE ENTITY: LearningSession
// ==========================================
export interface LearningSession {
  id: string;
  learnerId: string;
  domainId: DomainId;
  sessionType: 'DIAGNOSTIC' | 'PRACTICE' | 'REVIEW' | 'CHALLENGE' | 'ASSESSMENT';
  activeConceptId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  attemptsCount: number;
  correctCount: number;
  initialMastery: number;
  finalMastery: number;
  readingLevelUsed: ReadingLevel;
  languageUsed: LanguageCode;
  dyslexiaModeActive: boolean;
  audioInteractionsCount: number;
  institutionStyleId: string;
}

// ==========================================
// 8. DATABASE ENTITY: Recommendation
// ==========================================
export interface Recommendation {
  id: string;
  learnerId: string;
  domainId?: DomainId;
  action: RecommendationAction;
  conceptId: string;
  conceptName: string;
  reason: string;
  stepFired?: string;
  evidenceSummary: {
    mastery: number;
    uncertainty: number;
    retention: number;
    recentAccuracy: string;
    hintsUsed: number;
    daysSinceReview: number;
    prerequisiteStatus: string;
    transferPerformance: string;
    guessingRisk: string;
  };
  timestamp: string;
  isOverridden?: boolean;
  overrideDetails?: TeacherOverride;
}

// ==========================================
// 9. DATABASE ENTITY: TeacherOverride
// ==========================================
export interface TeacherOverride {
  id: string;
  learnerId: string;
  teacherId: string;
  teacherName: string;
  previousAction: RecommendationAction;
  previousConceptId: string;
  newAction: RecommendationAction;
  newConceptId: string;
  reason: string;
  timestamp: string;
}

// ==========================================
// 10. PHASE 1 ENTITY: Learning Resource (PDF, Video, Text Lesson)
// ==========================================
export type ResourceType = 'text_lesson' | 'pdf' | 'video' | 'uploaded_doc';

export interface VideoTimestampNote {
  timeSeconds: number;
  timeFormatted: string; // e.g. "02:15"
  title: string;
  transcriptSnippet: string;
}

export interface LearningResource {
  id: string;
  conceptId: string;
  domainId: DomainId;
  title: string;
  type: ResourceType;
  fileName?: string;
  fileSize?: string;
  pageCount?: number;
  durationFormatted?: string;
  videoUrl?: string;
  content: string; // Full readable content / text or transcript for AI consumption
  timestamps?: VideoTimestampNote[];
  createdAt: string;
}

// ==========================================
// 11. PHASE 1 ENTITY: AI Summary Notes
// ==========================================
export interface SummaryKeyConcept {
  term: string;
  explanation: string;
}

export interface SummaryDefinition {
  term: string;
  definition: string;
}

export interface SummaryExample {
  scenario: string;
  explanation: string;
}

export interface SummaryFormula {
  formula: string;
  explanation: string;
}

export interface SummaryNote {
  id: string;
  conceptId: string;
  conceptName: string;
  conceptCode: string;
  domainId: DomainId;
  resourceId?: string;
  resourceType?: ResourceType;
  title: string;
  subjectDomain: string; // e.g. "GATE CS", "UPSC Civil Services", "School STEM"
  overview: string;
  keyConcepts: SummaryKeyConcept[];
  importantDefinitions: SummaryDefinition[];
  keyPoints: string[];
  examples: SummaryExample[];
  formulasAndInvariants: SummaryFormula[];
  takeaways: string[];
  rawMarkdown: string;
  generatedAt: string;
  isAIGenerated: boolean;
  readingLevel: ReadingLevel;
  language: LanguageCode;
}

// ==========================================
// 12. PHASE 1 ENTITY: AI Learning Tutor Chat
// ==========================================
export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  conceptId: string;
  suggestedFollowUps?: string[];
  isAIGenerated?: boolean;
}

export interface TutorContext {
  domainId: DomainId;
  domainName: string;
  category: string;
  conceptId: string;
  conceptName: string;
  conceptCode: string;
  bloomTarget: BloomLevel;
  learningMaterial: {
    title: string;
    analogy: string;
    coreExplanation: string;
    realWorldExample?: string;
    keyTakeaways: string[];
    resourceTitle?: string;
    resourceType?: ResourceType;
    resourceContentSnippet?: string;
    activeQuestionText?: string;
    activeQuestionFormat?: string;
    activeQuestionHint?: string;
    activeCodeSnippet?: string;
  };
  summaryNotes?: {
    overview?: string;
    keyPoints?: string[];
    rawMarkdown?: string;
  } | null;
  prerequisites: Array<{
    id: string;
    name: string;
    masteryPercent: number;
    satisfied: boolean;
  }>;
  studentState: {
    learnerId: string;
    name: string;
    mastery: number;
    retention: number;
    status: string;
    confidence: number;
    recentAttemptIsCorrect?: boolean;
    recentAttemptExplanation?: string;
    preferredReadingLevel: ReadingLevel;
    preferredLanguage: LanguageCode;
  };
}

export interface TutorChatRequest {
  learnerId: string;
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: TutorContext;
}

export interface TutorChatResponse {
  success: boolean;
  message: TutorMessage;
  contextUsed: {
    conceptName: string;
    hasSummaryNotes: boolean;
    prerequisitesChecked: string[];
    studentMasteryPct: number;
  };
  isAIGenerated: boolean;
}

export interface SummaryGenerationRequest {
  conceptId: string;
  resourceId?: string;
  customText?: string;
  readingLevel?: ReadingLevel;
  language?: LanguageCode;
}

export interface SummaryGenerationResponse {
  success: boolean;
  summary: SummaryNote;
  isAIGenerated: boolean;
}

// ==========================================
// Institution-Specific Style Guides
// ==========================================
export interface InstitutionStyleGuide {
  id: string;
  name: string;
  shortCode: string;
  badgeColor: string;
  description: string;
  academicTone: 'RIGOROUS_FORMAL' | 'PRACTICAL_SYSTEMS' | 'INTUITIVE_SOCRATIC' | 'EXAM_OPTIMIZED';
  mathNotation: 'FORMAL_ASYMPTOTIC' | 'INFORMAL_BIG_O' | 'EMPIRICAL_PROFILING';
  codeStyle: 'MODERN_TYPESCRIPT' | 'STANDARD_C_CPP' | 'PYTHONIC_CLEAN';
  emphasis: string;
  guidelines: string[];
}

// Full Learner Profile
export interface LearnerProfile extends Partial<User> {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  cohort: string;
  institutionId: string;
  activeDomainId: DomainId;
  preferredLanguage: LanguageCode;
  preferredReadingLevel: ReadingLevel;
  dyslexiaModeEnabled: boolean;
  bionicReadingEnabled: boolean;
  createdAt?: string;
  lastActiveAt?: string;
  overallMastery: number;
  overallUncertainty: number;
  overallRetention: number;
  diagnosticCompleted: boolean;
  diagnosticResult?: {
    completedAt: string;
    initialMastery: number;
    weakPrerequisites: string[];
    strongConcepts: string[];
    firstRecommendationAction: RecommendationAction;
  };
  needsAttention: boolean;
  attentionReason?: string;
  currentRecommendation?: Recommendation;
  conceptMasteries: Record<string, ConceptMastery>;
  recentAttempts: Attempt[];
  overrides: TeacherOverride[];
  recommendationHistory: Recommendation[];
}

export interface SystemConfig {
  masteryThreshold: number; // e.g. 0.75
  challengeThreshold: number; // e.g. 0.88
  prerequisiteThreshold: number; // e.g. 0.70
  forgettingDecayRate: number; // e.g. 0.05 per day
  uncertaintyThreshold: number; // e.g. 0.40
  interventionThresholdFailures: number; // e.g. 3
  learningRateAlpha: number; // e.g. 0.35
  activeDomainId: DomainId;
  activeInstitutionId: string;
  autoApproveScoreThreshold: number; // e.g. 85
  weights: {
    correctness: number; // 0.45
    confidence: number; // 0.20
    difficulty: number; // 0.15
    responseTime: number; // 0.10
    independence: number; // 0.10
  };
  mlConfig?: MLEngineConfig;
  bktConfig?: BKTConfig;
}

export interface StressTestResult {
  id: string;
  title: string;
  scenario: string;
  expectedResult: string;
  actualResult: string;
  passed: boolean;
  evidence: Record<string, any>;
  explanation: string;
}

// ==========================================
// 13. PHASE 2 ENTITIES: MODULE & LESSON STRUCTURE
// ==========================================
export type LessonStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type ConceptMasteryCategory = 'NOT_STARTED' | 'LEARNING' | 'DEVELOPING' | 'MASTERED';

export interface Module {
  id: string;
  domainId: DomainId;
  code: string;
  title: string;
  description: string;
  order: number;
  lessonIds: string[];
  targetCompetency: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  domainId: DomainId;
  code: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  learningObjectives: string[];
  conceptIds: string[]; // concepts covered in this lesson
  prerequisiteConceptIds: string[]; // required prior concepts
  assessmentQuestionIds?: string[];
}

export interface LessonProgress {
  id: string;
  learnerId: string;
  lessonId: string;
  moduleId: string;
  domainId: DomainId;
  status: LessonStatus;
  startedAt?: string;
  completedAt?: string;
  timeSpentSeconds: number;
  questionsAttempted: number;
  questionsCorrect: number;
  summaryGenerated: boolean;
  tutorConsulted: boolean;
}

export interface KnowledgeGap {
  id: string;
  learnerId: string;
  domainId: DomainId;
  conceptId: string;
  conceptName: string;
  conceptMastery: number; // e.g. 0.42
  prerequisiteId: string;
  prerequisiteName: string;
  prerequisiteMastery: number; // e.g. 0.35
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedLessonId: string;
  recommendedLessonTitle: string;
  reason: string;
  action: string;
}

export interface LearningActivityEvent {
  id: string;
  learnerId: string;
  domainId: DomainId;
  type:
    | 'LESSON_COMPLETED'
    | 'SUMMARY_GENERATED'
    | 'TUTOR_QUESTION'
    | 'QUIZ_ATTEMPT'
    | 'DIAGNOSTIC_COMPLETED'
    | 'FLASHCARD_REVIEW'
    | 'FLASHCARD_SESSION_COMPLETED'
    | 'MOCK_EXAM_COMPLETED';
  title: string;
  description: string;
  timestamp: string;
  conceptId?: string;
  lessonId?: string;
  meta?: Record<string, any>;
}

export interface ModuleProgress {
  moduleId: string;
  moduleCode: string;
  moduleTitle: string;
  domainId: DomainId;
  order: number;
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  notStartedLessons: number;
  progressPercent: number; // 0 to 100
  conceptsCompleted: number;
  conceptsTotal: number;
  currentLessonId?: string;
  currentLessonTitle?: string;
  status: LessonStatus;
}

export interface SubjectProgress {
  domainId: DomainId;
  domainName: string;
  category: string;
  totalModules: number;
  completedModules: number;
  totalLessons: number;
  completedLessons: number;
  totalConcepts: number;
  masteredConcepts: number;
  progressPercent: number; // 0 to 100
  overallMastery: number; // 0 to 1
  status: LessonStatus;
}

// ==========================================
// 14. PHASE 3 ENTITIES: INTERACTIVE MIND MAP
// ==========================================
export type MindMapNodeType = 'subject' | 'module' | 'lesson' | 'concept' | 'subconcept';

export interface MindMapNode {
  id: string;
  label: string;
  type: MindMapNodeType;
  domainId: DomainId;
  parentId?: string;
  moduleId?: string;
  moduleTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  conceptId?: string;
  code?: string;
  description?: string;
  status: ConceptMasteryCategory | LessonStatus;
  progress: number; // 0 to 100
  mastery?: number; // 0.0 to 1.0
  attemptsCount?: number;
  retention?: number;
  bloomTarget?: string;
  prerequisites?: string[]; // concept IDs
  prerequisiteNames?: string[];
  dependentConceptIds?: string[];
  dependentConceptNames?: string[];
  hasKnowledgeGap?: boolean;
  knowledgeGapReason?: string;
  knowledgeGapAction?: string;
  recommendedAction?: string;
  summaryAvailable?: boolean;
  isAiSuggested?: boolean;
  subConcepts?: string[];
  childrenCount?: number;
  learningObjectives?: string[];
  estimatedMinutes?: number;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  type: 'hierarchy' | 'prerequisite' | 'ai_suggested';
  label?: string;
  isGap?: boolean;
  rationale?: string;
}

export interface MindMapData {
  domainId: DomainId;
  domainName: string;
  category: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  summary: {
    totalNodes: number;
    modulesCount: number;
    lessonsCount: number;
    conceptsCount: number;
    subConceptsCount: number;
    masteredCount: number;
    developingCount: number;
    learningCount: number;
    notStartedCount: number;
    gapsCount: number;
  };
}

// ==========================================
// 15. PHASE 4 ENTITIES: AI-POWERED ADAPTIVE FLASHCARDS
// ==========================================

export type FlashcardType =
  | 'Definition'
  | 'Conceptual'
  | 'Recall'
  | 'Formula'
  | 'Example-based'
  | 'Application'
  | 'Comparison';

export type FlashcardStatus = 'new' | 'learning' | 'review_needed' | 'mastered';
export type FlashcardRecallLevel = 'again' | 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  subjectId: DomainId;
  moduleId: string;
  lessonId: string;
  conceptId: string;
  conceptName: string;
  question: string;
  answer: string;
  explanation: string;
  type: FlashcardType;
  difficulty: QuestionDifficulty; // 'easy' | 'medium' | 'hard'
  sourceId: string;
  sourceTitle: string;
  isAiGenerated?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardProgress {
  flashcardId: string;
  learnerId: string;
  status: FlashcardStatus;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  confidence: number; // 0.0 to 1.0
  masteryContribution: number;
  lastRecallLevel?: FlashcardRecallLevel;
}

export interface FlashcardSessionConfig {
  learnerId: string;
  subjectId: DomainId;
  moduleId?: string;
  lessonId?: string;
  conceptId?: string;
  focusMode: 'all' | 'weak_concepts' | 'knowledge_gaps' | 'due_review' | 'new';
  limit?: number;
}

export interface FlashcardSessionSummary {
  sessionId: string;
  subjectId: DomainId;
  subjectTitle: string;
  moduleTitle?: string;
  cardsReviewed: number;
  knownCount: number;
  needReviewCount: number;
  correctCount: number;
  incorrectCount: number;
  conceptsReviewed: string[];
  weakConceptsDetected: Array<{ conceptId: string; conceptName: string; reason: string }>;
  conceptsImproved: Array<{ conceptId: string; conceptName: string; oldMastery: number; newMastery: number }>;
  recommendedActions: Array<{
    title: string;
    description: string;
    actionType: 'open_lesson' | 'ask_tutor' | 'view_notes' | 'view_mindmap';
    targetId: string;
    targetName: string;
  }>;
  completedAt: string;
}

export interface FlashcardDeckAvailability {
  subjectId: DomainId;
  moduleId?: string;
  moduleTitle?: string;
  isAvailable: boolean;
  completionPercent: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  availableCardsCount: number;
  unlockedReason: string;
  lockedReason?: string;
}

export interface FlashcardStats {
  totalAvailable: number;
  totalReviewed: number;
  needReviewCount: number;
  masteredCount: number;
  dueTodayCount: number;
  knowledgeGapsCount: number;
  averageMastery: number;
}

// ==========================================
// 16. PHASE 5 ENTITIES: AI-POWERED ADAPTIVE MOCK EXAM
// ==========================================

export interface MockExamQuestion {
  questionId: string;
  subjectId: DomainId;
  moduleId: string;
  lessonId: string;
  conceptId: string;
  conceptName: string;
  question: string;
  options: string[];
  correctAnswer: string;
  correctOptionIndex: number;
  explanation: string;
  questionType: 'Recall' | 'Understanding' | 'Application' | 'Analysis';
  difficulty: QuestionDifficulty; // 'easy' | 'medium' | 'hard'
  sourceId: string;
  sourceTitle: string;
  bloomLevel?: BloomLevel;
}

export interface MockExamBlueprintItem {
  conceptId: string;
  conceptName: string;
  allocatedQuestions: number;
  currentMastery: number;
  isKnowledgeGap: boolean;
  priorityCategory: 'knowledge_gap' | 'low_mastery' | 'reinforcement' | 'syllabus_coverage';
  suggestedDifficulty: QuestionDifficulty;
}

export interface MockExamBlueprint {
  subjectId: DomainId;
  subjectName: string;
  moduleId?: string;
  moduleTitle?: string;
  totalQuestions: number;
  targetDifficulty: QuestionDifficulty | 'mixed';
  timeLimitMinutes: number;
  conceptAllocations: MockExamBlueprintItem[];
  weakConceptCount: number;
  knowledgeGapCount: number;
  summaryText: string;
}

export interface MockExamConfig {
  learnerId: string;
  subjectId: DomainId;
  moduleId?: string; // 'all' or specific module id
  questionCount: number; // 5, 10, 15, 20
  difficulty: QuestionDifficulty | 'mixed';
  timeLimitMinutes: number; // 5, 10, 15, 20, 30
  focusWeakConcepts?: boolean;
  targetConceptIds?: string[];
}

export interface MockExamAnswer {
  questionId: string;
  selectedOptionIndex: number; // -1 if unanswered, 0-3 otherwise
  selectedOptionText?: string;
  isMarkedForReview: boolean;
  responseTimeSeconds: number;
}

export interface MockExamConceptPerformance {
  conceptId: string;
  conceptName: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracyPercent: number; // 0-100
  masteryBefore: number;
  masteryAfter: number;
  isWeakConcept: boolean;
  status: 'Mastered' | 'Developing' | 'Needs Review';
}

export interface MockExamQuestionReviewItem {
  question: MockExamQuestion;
  studentOptionIndex: number;
  studentAnswerText: string;
  isCorrect: boolean;
  isUnanswered: boolean;
  isMarkedForReview: boolean;
}

export interface MockExamResult {
  examId: string;
  sessionId: string;
  learnerId: string;
  subjectId: DomainId;
  subjectName: string;
  moduleId?: string;
  moduleTitle?: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  scorePercent: number; // 0-100
  accuracyPercent: number; // 0-100
  timeLimitMinutes: number;
  timeUsedSeconds: number;
  timeUsedFormatted: string;
  completedAt: string;
  passed: boolean; // >= 70%
  conceptPerformance: MockExamConceptPerformance[];
  weakConcepts: Array<{
    conceptId: string;
    conceptName: string;
    accuracyPercent: number;
    reason: string;
  }>;
  questionsReview: MockExamQuestionReviewItem[];
  adaptiveRecommendations: Array<{
    title: string;
    description: string;
    actionType: 'flashcards' | 'tutor' | 'notes' | 'mindmap' | 'retake' | 'lesson';
    targetId: string;
    targetName: string;
  }>;
  evidenceGeneratedCount: number;
}

export interface MockExamSession {
  id: string;
  learnerId: string;
  subjectId: DomainId;
  moduleId?: string;
  moduleTitle?: string;
  title: string;
  config: MockExamConfig;
  blueprint: MockExamBlueprint;
  questions: MockExamQuestion[];
  startedAt: string;
  submittedAt?: string;
  isCompleted: boolean;
  result?: MockExamResult;
}

export interface MockExamAvailability {
  subjectId: DomainId;
  subjectName: string;
  moduleId?: string;
  moduleTitle?: string;
  isAvailable: boolean;
  completedLessonsCount: number;
  totalLessonsCount: number;
  completionPercent: number;
  unlockedReason: string;
  lockedReason?: string;
  availableConcepts: Array<{ id: string; name: string; isMastered: boolean }>;
}

export interface MockExamStats {
  totalExamsAttempted: number;
  averageScorePercent: number;
  highestScorePercent: number;
  totalQuestionsAnswered: number;
  overallAccuracyPercent: number;
  lastExamAt?: string;
  lastExamScore?: number;
  lastExamSubject?: string;
  weakConceptsCount: number;
}


