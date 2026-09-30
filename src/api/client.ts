import {
  AIEvaluationReport,
  Concept,
  InstitutionStyleGuide,
  LanguageCode,
  LearnerProfile,
  Question,
  ReadingLevel,
  RecommendationAction,
  StressTestResult,
  SystemConfig,
  TeacherOverride,
  User,
  CurriculumDomain,
  DomainId,
} from '../types.js';

const API_BASE = '/api';
const TOKEN_KEY = 'masteryflow_auth_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ==========================================
// PHASE 6: AUTHENTICATION & PERSISTENCE API CLIENT
// ==========================================

export async function register(payload: {
  name: string;
  email: string;
  password: string;
  role?: string;
  cohort?: string;
  institutionId?: string;
  activeDomainId?: DomainId;
  preferredLanguage?: LanguageCode;
  preferredReadingLevel?: ReadingLevel;
  dyslexiaModeEnabled?: boolean;
  bionicReadingEnabled?: boolean;
  avatar?: string;
}): Promise<{ user: User; learner: LearnerProfile; token: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Registration failed');
  }
  const data = await res.json();
  if (data.token) setStoredToken(data.token);
  return data;
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<{ user: User; learner: LearnerProfile; token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Login failed');
  }
  const data = await res.json();
  if (data.token) setStoredToken(data.token);
  return data;
}

export async function demoLogin(userId: string): Promise<{ user: User; learner: LearnerProfile; token: string }> {
  const res = await fetch(`${API_BASE}/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Demo login failed');
  }
  const data = await res.json();
  if (data.token) setStoredToken(data.token);
  return data;
}

export async function googleLogin(payload: {
  email: string;
  name?: string;
  avatar?: string;
  googleId?: string;
}): Promise<{ user: User; learner: LearnerProfile; token: string }> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Google login failed');
  }
  const data = await res.json();
  if (data.token) setStoredToken(data.token);
  return data;
}

export async function changePassword(payload: {
  currentPassword?: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update password');
  }
  return res.json();
}

export async function getMe(): Promise<{ user: User; learner: LearnerProfile } | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      clearStoredToken();
      return null;
    }
    const data = await res.json();
    return { user: data.user, learner: data.learner };
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch (err) {
    console.warn('Logout network error:', err);
  } finally {
    clearStoredToken();
  }
}

export async function updateProfile(updates: Partial<User>): Promise<{ user: User; learner: LearnerProfile }> {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update profile');
  }
  return res.json();
}

export async function fetchDatabaseStatus(): Promise<{
  persistent: boolean;
  storageType: string;
  filePath: string;
  sizeBytes: number;
  lastModified: string;
  totalUsers: number;
  totalLearners: number;
  totalAttempts: number;
  totalMockExams: number;
  totalFlashcardProgress: number;
  totalLessonProgress: number;
  activeSessions: number;
}> {
  const res = await fetch(`${API_BASE}/database/status`);
  if (!res.ok) throw new Error('Failed to fetch database persistence status');
  return res.json();
}

export async function syncDatabaseToDisk(): Promise<{ success: boolean; message: string; lastSavedAt: string }> {
  const res = await fetch(`${API_BASE}/database/sync`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to sync database to disk');
  return res.json();
}

export function getDatabaseExportUrl(): string {
  return `${API_BASE}/database/export`;
}

export async function fetchDomains(): Promise<{ domains: CurriculumDomain[]; activeDomainId: DomainId }> {
  const res = await fetch(`${API_BASE}/domains`);
  if (!res.ok) throw new Error('Failed to fetch curriculum domains');
  return res.json();
}

export async function switchLearnerDomain(learnerId: string, domainId: DomainId): Promise<LearnerProfile> {
  const res = await fetch(`${API_BASE}/domains/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, domainId }),
  });
  if (!res.ok) throw new Error('Failed to switch domain');
  const data = await res.json();
  return data.learner;
}

export async function fetchConcepts(domainId?: string): Promise<Concept[]> {
  const url = domainId ? `${API_BASE}/concepts?domain=${domainId}` : `${API_BASE}/concepts`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch concepts');
  const data = await res.json();
  return data.concepts;
}

export async function fetchQuestionsByConcept(conceptId: string): Promise<Question[]> {
  const res = await fetch(`${API_BASE}/concepts/${conceptId}/questions`);
  if (!res.ok) throw new Error('Failed to fetch concept questions');
  const data = await res.json();
  return data.questions;
}

export async function fetchDiagnosticQuestions(): Promise<Question[]> {
  const res = await fetch(`${API_BASE}/diagnostic/questions`);
  if (!res.ok) throw new Error('Failed to fetch diagnostic questions');
  const data = await res.json();
  return data.questions;
}

export async function submitDiagnostic(
  learnerId: string,
  responses: {
    questionId: string;
    selectedOptionIndex: number;
    confidence: number;
    responseTimeSeconds: number;
    hintsUsed: number;
  }[]
): Promise<LearnerProfile> {
  const res = await fetch(`${API_BASE}/diagnostic/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, responses }),
  });
  if (!res.ok) throw new Error('Failed to submit diagnostic');
  const data = await res.json();
  return data.learner;
}

export async function fetchLearners(): Promise<LearnerProfile[]> {
  const res = await fetch(`${API_BASE}/learners`);
  if (!res.ok) throw new Error('Failed to fetch learners');
  const data = await res.json();
  return data.learners;
}

export async function fetchLearner(id: string): Promise<LearnerProfile> {
  const res = await fetch(`${API_BASE}/learners/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch learner ${id}`);
  const data = await res.json();
  return data.learner;
}

export async function submitAttempt(payload: {
  learnerId: string;
  questionId: string;
  selectedOptionIndex: number;
  confidence: number;
  responseTimeSeconds: number;
  hintsUsed: number;
  retries: number;
  userCodeAnswer?: string;
}): Promise<{
  attempt: any;
  evidence: any;
  masteryBefore: number;
  masteryAfter: number;
  uncertaintyBefore: number;
  uncertaintyAfter: number;
  newRecommendation: any;
  learner: LearnerProfile;
}> {
  const res = await fetch(`${API_BASE}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to submit attempt');
  return res.json();
}

export async function applyTeacherOverride(payload: {
  learnerId: string;
  teacherId?: string;
  teacherName?: string;
  newAction: RecommendationAction;
  newConceptId: string;
  reason: string;
}): Promise<{ override: TeacherOverride; learner: LearnerProfile }> {
  const res = await fetch(`${API_BASE}/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to apply teacher override');
  return res.json();
}

export async function simulateTimeElapsed(learnerId: string, days: number): Promise<LearnerProfile> {
  const res = await fetch(`${API_BASE}/simulate-time`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, days }),
  });
  if (!res.ok) throw new Error('Failed to simulate time elapsed');
  const data = await res.json();
  return data.learner;
}

export async function runStressTests(): Promise<{ results: StressTestResult[]; metrics: Record<string, any> }> {
  const res = await fetch(`${API_BASE}/stress-tests`);
  if (!res.ok) throw new Error('Failed to run stress tests');
  return res.json();
}

export async function fetchSystemAudit(): Promise<{ success: boolean; report: any }> {
  const res = await fetch(`${API_BASE}/system-audit`);
  if (!res.ok) throw new Error('Failed to run system audit');
  return res.json();
}

export async function resetDemoState(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/reset-demo`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset demo state');
  return res.json();
}

export async function fetchSystemConfig(): Promise<SystemConfig> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('Failed to fetch system config');
  const data = await res.json();
  return data.config;
}

export async function updateSystemConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to update system config');
  const data = await res.json();
  return data.config;
}

export async function fetchAIExplanation(payload: {
  conceptName: string;
  context?: string;
  promptType: 'concept_intuition' | 'teacher_advice' | 'hint';
}): Promise<{ text: string; isAIGenerated: boolean }> {
  const res = await fetch(`${API_BASE}/ai-explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to generate AI explanation');
  return res.json();
}

// ==========================================
// 1. DATABASE EXPLORER CLIENT
// ==========================================
export async function fetchDatabaseSnapshot(): Promise<{
  success: boolean;
  stats: Record<string, number>;
  tables: Array<{
    name: string;
    count: number;
    description: string;
    records: any[];
  }>;
  persistence?: {
    exists: boolean;
    sizeBytes: number;
    filePath: string;
    lastSavedAt: string;
    lastModified?: string;
    storageType: string;
  };
}> {
  const res = await fetch(`${API_BASE}/database`);
  if (!res.ok) throw new Error('Failed to fetch database snapshot');
  return res.json();
}

// ==========================================
// 2. CONTENT TRANSFORMATION: Multilingual & Reading Level
// ==========================================
export async function transformContent(payload: {
  conceptId: string;
  language: LanguageCode;
  readingLevel: ReadingLevel;
  institutionId?: string;
}): Promise<{
  conceptId: string;
  language: LanguageCode;
  readingLevel: ReadingLevel;
  name: string;
  analogy: string;
  coreExplanation: string;
  realWorldExample: string;
  keyPoints: string[];
  audioScript: string;
  institutionTone: string;
}> {
  const res = await fetch(`${API_BASE}/content/transform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to transform content');
  const data = await res.json();
  return data.content;
}

// ==========================================
// 3. AUTOMATIC EVALUATION & TEACHER APPROVAL
// ==========================================
export async function evaluateQuestion(payload: {
  questionId: string;
  customQuestion?: Partial<Question>;
}): Promise<AIEvaluationReport> {
  const res = await fetch(`${API_BASE}/content/evaluate-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to evaluate question');
  const data = await res.json();
  return data.report;
}

export async function approveQuestion(payload: {
  questionId: string;
  teacherId?: string;
  isApproved: boolean;
}): Promise<Question> {
  const res = await fetch(`${API_BASE}/content/approve-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to approve question');
  const data = await res.json();
  return data.question;
}

export async function createQuestion(questionData: Partial<Question>): Promise<{
  question: Question;
  evaluation: AIEvaluationReport;
}> {
  const res = await fetch(`${API_BASE}/content/create-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(questionData),
  });
  if (!res.ok) throw new Error('Failed to create question');
  return res.json();
}

// ==========================================
// 4. INSTITUTION-SPECIFIC STYLE GUIDES
// ==========================================
export async function fetchInstitutions(): Promise<{
  institutions: InstitutionStyleGuide[];
  activeInstitutionId: string;
}> {
  const res = await fetch(`${API_BASE}/content/institutions`);
  if (!res.ok) throw new Error('Failed to fetch institutions');
  return res.json();
}

export async function setActiveInstitution(institutionId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/content/institutions/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ institutionId }),
  });
  if (!res.ok) throw new Error('Failed to set active institution');
  const data = await res.json();
  return data.activeInstitutionId;
}

// ==========================================
// 5. USER PREFERENCES
// ==========================================
export async function updateUserPreferences(
  userId: string,
  updates: Partial<User>
): Promise<{ user: User; learner?: LearnerProfile }> {
  const res = await fetch(`${API_BASE}/users/${userId}/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update user preferences');
  return res.json();
}

// ==========================================
// 6. PHASE 1: LEARNING RESOURCES (Text, PDF, Video)
// ==========================================
export async function fetchLearningResources(conceptId: string): Promise<import('../types.js').LearningResource[]> {
  const res = await fetch(`${API_BASE}/resources/${conceptId}`);
  if (!res.ok) throw new Error('Failed to fetch learning resources');
  const data = await res.json();
  return data.resources;
}

export async function uploadLearningResource(payload: {
  conceptId: string;
  title: string;
  type: import('../types.js').ResourceType;
  content: string;
  fileName?: string;
  fileSize?: string;
}): Promise<import('../types.js').LearningResource> {
  const res = await fetch(`${API_BASE}/resources/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to upload learning resource');
  const data = await res.json();
  return data.resource;
}

// ==========================================
// 7. PHASE 1: AI SUMMARY NOTES
// ==========================================
export async function fetchSummaryNotes(conceptId: string): Promise<import('../types.js').SummaryNote | null> {
  const res = await fetch(`${API_BASE}/summary/${conceptId}`);
  if (!res.ok) throw new Error('Failed to fetch summary notes');
  const data = await res.json();
  return data.summary;
}

export async function generateSummaryNotes(payload: import('../types.js').SummaryGenerationRequest): Promise<{
  summary: import('../types.js').SummaryNote;
  isAIGenerated: boolean;
}> {
  const res = await fetch(`${API_BASE}/summary/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to generate summary notes');
  return res.json();
}

export async function deleteSummaryNotes(conceptId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/summary/${conceptId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete summary notes');
}

// ==========================================
// 8. PHASE 1: AI LEARNING TUTOR CHAT
// ==========================================
export async function fetchTutorHistory(conceptId: string, learnerId?: string): Promise<import('../types.js').TutorMessage[]> {
  const url = learnerId
    ? `${API_BASE}/tutor/history/${conceptId}?learnerId=${learnerId}`
    : `${API_BASE}/tutor/history/${conceptId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch tutor chat history');
  const data = await res.json();
  return data.history;
}

export async function sendTutorChatMessage(payload: import('../types.js').TutorChatRequest): Promise<import('../types.js').TutorChatResponse> {
  const res = await fetch(`${API_BASE}/tutor/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to send tutor message');
  return res.json();
}

export async function clearTutorChatHistory(conceptId: string, learnerId?: string): Promise<void> {
  const url = learnerId
    ? `${API_BASE}/tutor/history/${conceptId}?learnerId=${learnerId}`
    : `${API_BASE}/tutor/history/${conceptId}`;
  const res = await fetch(url, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to clear tutor history');
}

// ==========================================
// 9. PHASE 2: MODULES & LESSONS CLIENT
// ==========================================
export async function fetchModules(domainId?: string): Promise<import('../types.js').Module[]> {
  const url = domainId ? `${API_BASE}/modules?domain=${domainId}` : `${API_BASE}/modules`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch modules');
  const data = await res.json();
  return data.modules;
}

export async function fetchLessons(domainId?: string): Promise<import('../types.js').Lesson[]> {
  const url = domainId ? `${API_BASE}/lessons?domain=${domainId}` : `${API_BASE}/lessons`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch lessons');
  const data = await res.json();
  return data.lessons;
}

export async function fetchLesson(lessonId: string): Promise<{
  lesson: import('../types.js').Lesson;
  resources: import('../types.js').LearningResource[];
  coveredConcepts: import('../types.js').Concept[];
  prereqConcepts: import('../types.js').Concept[];
}> {
  const res = await fetch(`${API_BASE}/lessons/${lessonId}`);
  if (!res.ok) throw new Error(`Failed to fetch lesson ${lessonId}`);
  return res.json();
}

export async function startLesson(lessonId: string, learnerId?: string): Promise<import('../types.js').LessonProgress> {
  const res = await fetch(`${API_BASE}/lessons/${lessonId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId }),
  });
  if (!res.ok) throw new Error(`Failed to start lesson ${lessonId}`);
  const data = await res.json();
  return data.progress;
}

export async function completeLesson(
  lessonId: string,
  payload?: {
    learnerId?: string;
    questionsAttempted?: number;
    questionsCorrect?: number;
    timeSpentSeconds?: number;
  }
): Promise<{
  lessonProgress: import('../types.js').LessonProgress;
  activityEvent: import('../types.js').LearningActivityEvent;
  recommendation: import('../types.js').Recommendation;
  subjectProgress: import('../types.js').SubjectProgress;
}> {
  const res = await fetch(`${API_BASE}/lessons/${lessonId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) throw new Error(`Failed to complete lesson ${lessonId}`);
  return res.json();
}

// ==========================================
// 10. PHASE 2: PROGRESS TRACKING & KNOWLEDGE GAPS
// ==========================================
export async function fetchLearnerProgress(
  learnerId: string,
  domainId?: string
): Promise<{
  subjectProgress: import('../types.js').SubjectProgress;
  moduleProgresses: import('../types.js').ModuleProgress[];
  lessonProgressList: import('../types.js').LessonProgress[];
  conceptMasteryBreakdown: Array<{
    conceptId: string;
    conceptName: string;
    conceptCode: string;
    category: string;
    mastery: number;
    retention: number;
    uncertainty: number;
    attemptsCount: number;
    masteryCategory: import('../types.js').ConceptMasteryCategory;
  }>;
  knowledgeGaps: import('../types.js').KnowledgeGap[];
  activityHistory: import('../types.js').LearningActivityEvent[];
  nextRecommendation: import('../types.js').Recommendation;
}> {
  const url = domainId
    ? `${API_BASE}/learners/${learnerId}/progress?domain=${domainId}`
    : `${API_BASE}/learners/${learnerId}/progress`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch learner progress');
  return res.json();
}

export async function fetchKnowledgeGaps(learnerId: string, domainId?: string): Promise<import('../types.js').KnowledgeGap[]> {
  const url = domainId
    ? `${API_BASE}/learners/${learnerId}/knowledge-gaps?domain=${domainId}`
    : `${API_BASE}/learners/${learnerId}/knowledge-gaps`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch knowledge gaps');
  const data = await res.json();
  return data.gaps;
}

export async function fetchActivityHistory(
  learnerId: string,
  limit: number = 10
): Promise<import('../types.js').LearningActivityEvent[]> {
  const res = await fetch(`${API_BASE}/learners/${learnerId}/activity-history?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch activity history');
  const data = await res.json();
  return data.activities;
}

// ==========================================
// 10. PHASE 3: INTERACTIVE MIND MAP CLIENT
// ==========================================
export async function fetchMindMap(
  learnerId?: string,
  domainId?: string
): Promise<import('../types.js').MindMapData> {
  const params = new URLSearchParams();
  if (learnerId) params.append('learnerId', learnerId);
  if (domainId) params.append('domainId', domainId);
  const url = `${API_BASE}/mindmap?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch Mind Map data');
  const data = await res.json();
  return data.data;
}

export async function discoverAiMindMapConnections(
  domainId: string,
  conceptId?: string
): Promise<{ suggestions: import('../types.js').MindMapEdge[]; message: string }> {
  const res = await fetch(`${API_BASE}/mindmap/ai-suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domainId, conceptId }),
  });
  if (!res.ok) throw new Error('Failed to discover AI connections');
  return res.json();
}

// ==========================================
// 11. PHASE 4: AI-POWERED ADAPTIVE FLASHCARDS CLIENT
// ==========================================
export async function fetchFlashcardAvailability(
  learnerId: string,
  subjectId: string,
  moduleId?: string
): Promise<import('../types.js').FlashcardDeckAvailability[]> {
  const params = new URLSearchParams({ learnerId, subjectId });
  if (moduleId) params.append('moduleId', moduleId);
  const res = await fetch(`${API_BASE}/flashcards/availability?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch flashcard availability');
  const data = await res.json();
  return data.availability;
}

export async function fetchFlashcardStats(
  learnerId: string,
  subjectId: string
): Promise<import('../types.js').FlashcardStats> {
  const params = new URLSearchParams({ learnerId, subjectId });
  const res = await fetch(`${API_BASE}/flashcards/stats?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch flashcard stats');
  const data = await res.json();
  return data.stats;
}

export async function fetchFlashcards(params: {
  learnerId: string;
  subjectId: string;
  moduleId?: string;
  lessonId?: string;
  conceptId?: string;
  focusMode?: 'all' | 'weak_concepts' | 'knowledge_gaps' | 'due_review' | 'new';
  limit?: number;
}): Promise<{
  cards: import('../types.js').Flashcard[];
  totalMatching: number;
  prioritizedConcepts: string[];
}> {
  const query = new URLSearchParams({
    learnerId: params.learnerId,
    subjectId: params.subjectId,
  });
  if (params.moduleId) query.append('moduleId', params.moduleId);
  if (params.lessonId) query.append('lessonId', params.lessonId);
  if (params.conceptId) query.append('conceptId', params.conceptId);
  if (params.focusMode) query.append('focusMode', params.focusMode);
  if (params.limit) query.append('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/flashcards?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch flashcards');
  const data = await res.json();
  return {
    cards: data.cards,
    totalMatching: data.totalMatching,
    prioritizedConcepts: data.prioritizedConcepts,
  };
}

export async function recordFlashcardReview(payload: {
  learnerId: string;
  flashcardId: string;
  recallLevel: import('../types.js').FlashcardRecallLevel;
  responseTimeSeconds?: number;
}): Promise<{
  flashcard: import('../types.js').Flashcard;
  progress: import('../types.js').FlashcardProgress;
  evidenceScore: number;
  masteryBefore: number;
  masteryAfter: number;
  uncertaintyBefore: number;
  uncertaintyAfter: number;
  nextReviewAt: string;
  learner?: import('../types.js').LearnerProfile;
}> {
  const res = await fetch(`${API_BASE}/flashcards/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to record flashcard review');
  return res.json();
}

export async function generateAiFlashcards(payload: {
  subjectId: string;
  moduleId: string;
  lessonId?: string;
  conceptId?: string;
  count?: number;
  difficulty?: string;
  focusWeakConcepts?: boolean;
  learnerId?: string;
}): Promise<{
  generatedCards: import('../types.js').Flashcard[];
  count: number;
  sourceNote: string;
}> {
  const res = await fetch(`${API_BASE}/flashcards/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to generate AI flashcards');
  return res.json();
}

export async function completeFlashcardSession(payload: {
  sessionId: string;
  learnerId: string;
  subjectId: string;
  moduleTitle?: string;
  reviewedCardIds: string[];
  recallResults: Record<string, import('../types.js').FlashcardRecallLevel>;
  conceptMasteryBefore: Record<string, number>;
}): Promise<import('../types.js').FlashcardSessionSummary> {
  const res = await fetch(`${API_BASE}/flashcards/session/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to complete flashcard session');
  const data = await res.json();
  return data.summary;
}

// ==========================================
// 12. PHASE 5: AI-POWERED ADAPTIVE MOCK EXAM CLIENT
// ==========================================

export async function fetchMockExamAvailability(
  learnerId: string,
  subjectId: string,
  moduleId?: string
): Promise<import('../types.js').MockExamAvailability> {
  const params = new URLSearchParams({ learnerId, subjectId });
  if (moduleId && moduleId !== 'all') params.append('moduleId', moduleId);
  const res = await fetch(`${API_BASE}/exam/availability?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch mock exam availability');
  const data = await res.json();
  return data.availability;
}

export async function fetchMockExamBlueprint(params: {
  learnerId: string;
  subjectId: string;
  moduleId?: string;
  questionCount?: number;
  difficulty?: string;
  timeLimitMinutes?: number;
  focusWeakConcepts?: boolean;
}): Promise<import('../types.js').MockExamBlueprint> {
  const query = new URLSearchParams({
    learnerId: params.learnerId,
    subjectId: params.subjectId,
  });
  if (params.moduleId && params.moduleId !== 'all') query.append('moduleId', params.moduleId);
  if (params.questionCount) query.append('questionCount', String(params.questionCount));
  if (params.difficulty) query.append('difficulty', params.difficulty);
  if (params.timeLimitMinutes) query.append('timeLimitMinutes', String(params.timeLimitMinutes));
  if (params.focusWeakConcepts) query.append('focusWeakConcepts', 'true');

  const res = await fetch(`${API_BASE}/exam/blueprint?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch exam blueprint');
  const data = await res.json();
  return data.blueprint;
}

export async function generateMockExam(payload: {
  learnerId: string;
  subjectId: string;
  moduleId?: string;
  questionCount?: number;
  difficulty?: string;
  timeLimitMinutes?: number;
  focusWeakConcepts?: boolean;
  targetConceptIds?: string[];
}): Promise<import('../types.js').MockExamSession> {
  const res = await fetch(`${API_BASE}/exam/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to generate mock exam');
  const data = await res.json();
  return data.session;
}

export async function submitMockExam(payload: {
  sessionId: string;
  learnerId: string;
  answers: import('../types.js').MockExamAnswer[];
  timeUsedSeconds: number;
}): Promise<{
  result: import('../types.js').MockExamResult;
  learner: import('../types.js').LearnerProfile;
}> {
  const res = await fetch(`${API_BASE}/exam/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to submit mock exam');
  return res.json();
}

export async function fetchMockExamHistory(
  learnerId: string,
  subjectId?: string
): Promise<import('../types.js').MockExamSession[]> {
  const params = new URLSearchParams({ learnerId });
  if (subjectId) params.append('subjectId', subjectId);
  const res = await fetch(`${API_BASE}/exam/history?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch exam history');
  const data = await res.json();
  return data.history;
}

export async function fetchMockExamSession(sessionId: string): Promise<import('../types.js').MockExamSession> {
  const res = await fetch(`${API_BASE}/exam/session/${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch exam session');
  const data = await res.json();
  return data.session;
}

export async function fetchMockExamStats(
  learnerId: string,
  subjectId?: string
): Promise<import('../types.js').MockExamStats> {
  const params = new URLSearchParams({ learnerId });
  if (subjectId) params.append('subjectId', subjectId);
  const res = await fetch(`${API_BASE}/exam/stats?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch exam stats');
  const data = await res.json();
  return data.stats;
}

// ==========================================
// PHASE 8: MACHINE LEARNING CLIENT API
// ==========================================

export async function fetchMLPrediction(
  learnerId: string,
  conceptId: string
): Promise<{
  success: boolean;
  learnerId: string;
  conceptId: string;
  prediction: import('../types.js').MLPredictionResult;
}> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/ml/predict/${learnerId}/${conceptId}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch ML prediction');
  return res.json();
}

export async function fetchMLFeatures(
  learnerId: string,
  conceptId: string
): Promise<{
  success: boolean;
  learnerId: string;
  conceptId: string;
  features: import('../types.js').MLFeatureVector;
}> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/ml/features/${learnerId}/${conceptId}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch ML features');
  return res.json();
}

export async function fetchMLModelInfo(): Promise<{
  success: boolean;
  model: import('../types.js').MLModelWeights;
  config?: import('../types.js').MLEngineConfig;
  canonicalFeatures: string[];
}> {
  const res = await fetch(`${API_BASE}/ml/model-info`);
  if (!res.ok) throw new Error('Failed to fetch ML model info');
  return res.json();
}

export async function trainMLModel(params?: {
  epochs?: number;
  learningRate?: number;
  l2Lambda?: number;
}): Promise<{
  success: boolean;
  weights: import('../types.js').MLModelWeights;
  randomForestBenchmark?: {
    accuracy: number;
    f1: number;
    logLoss: number;
    treeCount: number;
  };
}> {
  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/ml/train`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params || {}),
  });
  if (!res.ok) throw new Error('Failed to train ML model');
  return res.json();
}

export async function fetchBKTModelInfo(): Promise<{
  success: boolean;
  info: import('../types.js').BKTModelInfo;
  config: import('../types.js').BKTConfig;
}> {
  const res = await fetch(`${API_BASE}/bkt/model-info`);
  if (!res.ok) throw new Error('Failed to fetch BKT model info');
  return res.json();
}

export async function fetchBKTTrace(
  learnerId: string,
  conceptId: string,
  beforeTimestamp?: string
): Promise<{
  success: boolean;
  trace: any;
  currentMastery: number;
  currentBktMastery: number;
  currentBktState: import('../types.js').BKTState;
}> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = beforeTimestamp
    ? `${API_BASE}/bkt/trace/${learnerId}/${conceptId}?before=${encodeURIComponent(beforeTimestamp)}`
    : `${API_BASE}/bkt/trace/${learnerId}/${conceptId}`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to fetch BKT trace');
  return res.json();
}

export async function predictBKTNext(
  pKnowledge: number,
  conceptId?: string,
  customParameters?: Partial<import('../types.js').BKTParameters>
): Promise<{
  success: boolean;
  parameters: import('../types.js').BKTParameters;
  prediction: {
    pCorrect: number;
    pIncorrect: number;
    projectedIfCorrect: number;
    projectedIfIncorrect: number;
  };
}> {
  const res = await fetch(`${API_BASE}/bkt/predict-next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pKnowledge, conceptId, customParameters }),
  });
  if (!res.ok) throw new Error('Failed to simulate BKT prediction');
  return res.json();
}

export async function updateBKTConfig(
  configUpdates: Partial<import('../types.js').BKTConfig>
): Promise<{
  success: boolean;
  bktConfig: import('../types.js').BKTConfig;
}> {
  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/bkt/config`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(configUpdates),
  });
  if (!res.ok) throw new Error('Failed to update BKT config');
  return res.json();
}

// ==========================================
// PHASE 6: CONTINUOUS LEARNING & MODEL LIFECYCLE CLIENT
// ==========================================

export async function fetchMLEvaluationReport(threshold?: number): Promise<{
  success: boolean;
  report: import('../types.js').EvaluationReport;
}> {
  const url = threshold !== undefined
    ? `${API_BASE}/ml/evaluation?threshold=${threshold}`
    : `${API_BASE}/ml/evaluation`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch ML evaluation report');
  return res.json();
}

export async function fetchMLModelHealth(): Promise<{
  success: boolean;
  health: import('../types.js').ModelHealthSummary;
}> {
  const res = await fetch(`${API_BASE}/ml/model-health`);
  if (!res.ok) throw new Error('Failed to fetch model health summary');
  return res.json();
}

export async function fetchLearnerPredictions(learnerId: string): Promise<{
  success: boolean;
  learnerId: string;
  totalCount: number;
  evaluatedCount: number;
  pendingCount: number;
  predictions: import('../types.js').MLPredictionRecord[];
}> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/ml/predictions/${learnerId}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch learner predictions');
  return res.json();
}

export async function fetchLearnerRecommendationOutcomes(learnerId: string): Promise<{
  success: boolean;
  learnerId: string;
  totalCount: number;
  recommendations: import('../types.js').MLRecommendationRecord[];
  effectiveness: import('../types.js').RecommendationEffectivenessReport;
}> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/ml/recommendation-outcomes/${learnerId}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch recommendation outcomes');
  return res.json();
}

export async function fetchRecommendationEffectiveness(): Promise<{
  success: boolean;
  effectiveness: import('../types.js').RecommendationEffectivenessReport;
}> {
  const res = await fetch(`${API_BASE}/ml/recommendation-effectiveness`);
  if (!res.ok) throw new Error('Failed to fetch recommendation effectiveness');
  return res.json();
}

export async function fetchRetrainingStatus(): Promise<{
  success: boolean;
  status: import('../types.js').RetrainingStatus;
}> {
  const res = await fetch(`${API_BASE}/ml/retraining-status`);
  if (!res.ok) throw new Error('Failed to fetch retraining status');
  return res.json();
}

export async function trainCandidateModel(params?: {
  epochs?: number;
  learningRate?: number;
  l2Lambda?: number;
}): Promise<{
  success: boolean;
  candidate?: import('../types.js').MLModelRegistryEntry;
  error?: string;
  message?: string;
}> {
  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/ml/retrain`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params || {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to train candidate model');
  }
  return res.json();
}

export async function promoteCandidateModel(
  candidateVersion: string,
  reason?: string
): Promise<{
  success: boolean;
  activeVersion?: string;
  error?: string;
  message?: string;
}> {
  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/ml/promote`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ candidateVersion, reason }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to promote candidate model');
  }
  return res.json();
}

export async function rollbackModel(targetVersion?: string): Promise<{
  success: boolean;
  activeVersion?: string;
  error?: string;
  message?: string;
}> {
  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/ml/rollback`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ targetVersion }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to rollback model');
  }
  return res.json();
}

export async function fetchFeatureDrift(): Promise<{
  success: boolean;
  report: import('../types.js').FeatureDriftReport;
}> {
  const res = await fetch(`${API_BASE}/ml/drift`);
  if (!res.ok) throw new Error('Failed to fetch feature drift report');
  return res.json();
}

export async function fetchRegisteredModels(): Promise<{
  success: boolean;
  models: import('../types.js').MLModelRegistryEntry[];
}> {
  const res = await fetch(`${API_BASE}/ml/models`);
  if (!res.ok) throw new Error('Failed to fetch registered models');
  return res.json();
}




