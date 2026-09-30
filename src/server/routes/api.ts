import { Router } from 'express';
import { store } from '../db/store.js';
import { runAllStressTests } from '../engine/stressTests.js';
import { runFullSystemAudit } from '../engine/fullSystemAudit.js';
import { GoogleGenAI } from '@google/genai';
import {
  DomainId,
  LanguageCode,
  Question,
  ReadingLevel,
  LearningResource,
  TutorMessage,
  LessonProgress,
  ConceptMasteryCategory,
  User,
  LearnerProfile,
} from '../db/types.js';
import { tutorAiService } from '../engine/tutorAiService.js';
import { learningPathEngine } from '../engine/learningPathEngine.js';
import { mindMapEngine } from '../engine/mindMapEngine.js';
import { roadmapEngine } from '../engine/roadmapEngine.js';
import { flashcardEngine } from '../engine/flashcardEngine.js';
import { examEngine } from '../engine/examEngine.js';
import { authService } from '../engine/authService.js';
import { persistence } from '../db/persistence.js';
import { mlFeatureExtractor } from '../engine/mlFeatureExtractor.js';
import { mlInferenceEngine } from '../engine/mlInferenceEngine.js';
import { mlTrainer } from '../engine/mlTrainer.js';
import { mlFeedbackEngine } from '../engine/mlFeedbackEngine.js';
import { bktEngine, DEFAULT_BKT_CONFIG } from '../engine/bktEngine.js';

export const apiRouter = Router();

/**
 * Helper to retrieve verified user and learner from Authorization Bearer token
 */
function getAuthenticatedUser(req: any): { user: User; learner: LearnerProfile } | null {
  const authHeader = req.headers?.authorization;
  if (!authHeader) return null;
  return authService.verifyToken(authHeader);
}

/**
 * Resolves the effective student ID with strict multi-user data isolation.
 * - Authenticated STUDENT is bound to their own userId (ignoring spoofed IDs).
 * - Authenticated TEACHER / ADMIN can inspect or assist any student ID.
 * - Unauthenticated / Demo mode falls back to requested student or 'student_a'.
 */
function resolveEffectiveLearnerId(req: any, requestedId?: string): string {
  const auth = getAuthenticatedUser(req);
  if (auth) {
    if (auth.user.role === 'TEACHER' || auth.user.role === 'ADMIN') {
      return requestedId || auth.user.id;
    }
    // Strict multi-user isolation: student is locked to their authenticated account
    return auth.user.id;
  }
  return requestedId || 'student_a';
}

// ==========================================
// PHASE 6: PRODUCTION AUTHENTICATION & DATABASE PERSISTENCE API
// ==========================================

// 1. Register new student account
apiRouter.post('/auth/register', (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      cohort,
      institutionId,
      activeDomainId,
      preferredLanguage,
      preferredReadingLevel,
      dyslexiaModeEnabled,
      bionicReadingEnabled,
      avatar,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const result = authService.register({
      name,
      email,
      password,
      role,
      cohort,
      institutionId,
      activeDomainId,
      preferredLanguage,
      preferredReadingLevel,
      dyslexiaModeEnabled,
      bionicReadingEnabled,
      avatar,
    });

    res.json({
      success: true,
      user: result.user,
      learner: result.learner,
      token: result.token,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// 2. Login with email & password
apiRouter.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = authService.login({ email, password });
    res.json({
      success: true,
      user: result.user,
      learner: result.learner,
      token: result.token,
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Login failed' });
  }
});

// 3. Demo Persona Instant Login
apiRouter.post('/auth/demo-login', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required for demo login.' });
    }

    const result = authService.demoLogin(userId);
    res.json({
      success: true,
      user: result.user,
      learner: result.learner,
      token: result.token,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Demo login failed' });
  }
});

// 3b. Google Sign In / Registration
apiRouter.post('/auth/google', (req, res) => {
  try {
    const { email, name, avatar, googleId } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google email is required.' });
    }

    const result = authService.googleLogin({ email, name, avatar, googleId });
    res.json({
      success: true,
      user: result.user,
      learner: result.learner,
      token: result.token,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Google authentication failed' });
  }
});

// 3c. Change Password
apiRouter.post('/auth/change-password', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }
    const verified = authService.verifyToken(authHeader);
    if (!verified) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { currentPassword, newPassword } = req.body;
    authService.changePassword(verified.user.id, currentPassword || '', newPassword);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update password' });
  }
});

// 4. Get Current User / Session Re-hydration
apiRouter.get('/auth/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const verified = authService.verifyToken(authHeader);
    if (!verified) {
      return res.status(401).json({ error: 'Session expired or invalid token' });
    }

    res.json({
      success: true,
      user: verified.user,
      learner: verified.learner,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to authenticate session' });
  }
});

// 5. Logout
apiRouter.post('/auth/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      authService.logout(authHeader);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Logout failed' });
  }
});

// 6. Update Student Profile
apiRouter.put('/auth/profile', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let userId = req.body.userId;

    if (authHeader) {
      const verified = authService.verifyToken(authHeader);
      if (verified) {
        userId = verified.user.id;
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to update profile' });
    }

    const result = authService.updateProfile(userId, req.body);
    res.json({
      success: true,
      user: result.user,
      learner: result.learner,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update profile' });
  }
});

// 7. Database Persistence Status
apiRouter.get('/database/status', (_req, res) => {
  try {
    const stats = persistence.getFileStats();
    res.json({
      success: true,
      persistent: stats.exists,
      storageType: 'Persistent File Store (Atomic JSON)',
      filePath: persistence.getFilePath(),
      sizeBytes: stats.sizeBytes,
      lastModified: stats.lastModified || persistence.getLastSavedTime(),
      totalUsers: store.users.size,
      totalLearners: store.learners.size,
      totalAttempts: store.attempts.length,
      totalMockExams: store.examSessions.length,
      totalFlashcardProgress: store.flashcardProgress.size,
      totalLessonProgress: store.lessonProgress.size,
      activeSessions: store.authSessions.size,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get database status' });
  }
});

// 8. Force Synchronous Flush to Disk
apiRouter.post('/database/sync', (_req, res) => {
  try {
    const saved = store.persistSync();
    res.json({
      success: saved,
      message: saved ? 'Database synchronized to disk successfully.' : 'Sync failed.',
      lastSavedAt: persistence.getLastSavedTime(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Database sync failed' });
  }
});

// 9. Full Database JSON Export
apiRouter.get('/database/export', (_req, res) => {
  try {
    const data = store.serialize();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="masteryflow_database_export_${Date.now()}.json"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to export database' });
  }
});

// ==========================================
// PHASE 5: AI-POWERED ADAPTIVE MOCK EXAM API
// ==========================================

// 1. Mock Exam Availability (Grounded in Phase 2 Learning-Path Completion)
apiRouter.get('/exam/availability', (req, res) => {
  try {
    const learnerId = resolveEffectiveLearnerId(req, req.query.learnerId as string);
    const subjectId = (req.query.subjectId as DomainId) || 'gate_cs';
    const moduleId = req.query.moduleId as string | undefined;

    const availability = examEngine.getExamAvailability(learnerId, subjectId, moduleId);
    res.json({
      success: true,
      availability,
    });
  } catch (err: any) {
    console.error('Error fetching mock exam availability:', err);
    res.status(500).json({ error: err.message || 'Error checking availability' });
  }
});

// 2. Adaptive Exam Blueprint Preview
apiRouter.get('/exam/blueprint', (req, res) => {
  try {
    const learnerId = resolveEffectiveLearnerId(req, req.query.learnerId as string);
    const subjectId = (req.query.subjectId as DomainId) || 'gate_cs';
    const moduleId = req.query.moduleId as string | undefined;
    const questionCount = Math.max(3, Math.min(30, Number(req.query.questionCount) || 10));
    const difficulty = (req.query.difficulty as any) || 'mixed';
    const timeLimitMinutes = Math.max(2, Math.min(120, Number(req.query.timeLimitMinutes) || 15));
    const focusWeakConcepts = req.query.focusWeakConcepts === 'true';

    const blueprint = examEngine.createExamBlueprint({
      learnerId,
      subjectId,
      moduleId,
      questionCount,
      difficulty,
      timeLimitMinutes,
      focusWeakConcepts,
    });

    res.json({
      success: true,
      blueprint,
    });
  } catch (err: any) {
    console.error('Error generating exam blueprint:', err);
    res.status(500).json({ error: err.message || 'Error creating blueprint' });
  }
});

// 3. AI-Powered Adaptive Exam Generation
apiRouter.post('/exam/generate', async (req, res) => {
  try {
    const {
      learnerId,
      subjectId,
      moduleId,
      questionCount,
      difficulty,
      timeLimitMinutes,
      focusWeakConcepts,
      targetConceptIds,
    } = req.body;

    const effectiveLearnerId = resolveEffectiveLearnerId(req, learnerId);
    if (!effectiveLearnerId || !subjectId) {
      return res.status(400).json({ error: 'learnerId and subjectId are required' });
    }

    const session = await examEngine.generateExam({
      learnerId: effectiveLearnerId,
      subjectId,
      moduleId,
      questionCount: Math.max(3, Math.min(30, Number(questionCount) || 10)),
      difficulty: difficulty || 'mixed',
      timeLimitMinutes: Math.max(2, Math.min(120, Number(timeLimitMinutes) || 15)),
      focusWeakConcepts: Boolean(focusWeakConcepts),
      targetConceptIds,
    });

    res.json({
      success: true,
      session,
    });
  } catch (err: any) {
    console.error('Error generating adaptive exam:', err);
    res.status(500).json({ error: err.message || 'Error generating exam' });
  }
});

// 4. Exam Submission & Evidence Model Integration
apiRouter.post('/exam/submit', (req, res) => {
  try {
    const { sessionId, learnerId, answers, timeUsedSeconds } = req.body;
    const effectiveLearnerId = resolveEffectiveLearnerId(req, learnerId);

    if (!sessionId || !effectiveLearnerId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'sessionId, learnerId, and answers array are required' });
    }

    const result = examEngine.submitExam({
      sessionId,
      learnerId: effectiveLearnerId,
      answers,
      timeUsedSeconds: Math.max(1, Number(timeUsedSeconds) || 60),
    });

    const updatedLearner = store.learners.get(effectiveLearnerId);

    res.json({
      success: true,
      result,
      learner: updatedLearner,
    });
  } catch (err: any) {
    console.error('Error submitting mock exam:', err);
    res.status(500).json({ error: err.message || 'Error evaluating exam' });
  }
});

// 5. Exam History
apiRouter.get('/exam/history', (req, res) => {
  try {
    const learnerId = resolveEffectiveLearnerId(req, req.query.learnerId as string);
    const subjectId = req.query.subjectId as DomainId | undefined;

    const history = examEngine.getExamHistory(learnerId, subjectId);
    res.json({
      success: true,
      history,
    });
  } catch (err: any) {
    console.error('Error fetching exam history:', err);
    res.status(500).json({ error: err.message || 'Error fetching exam history' });
  }
});

// 6. Exam Session Details
apiRouter.get('/exam/session/:id', (req, res) => {
  try {
    const session = store.getExamSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Exam session not found' });
    }
    // Verify student ownership if logged in as student
    const auth = getAuthenticatedUser(req);
    if (auth && auth.user.role === 'STUDENT' && session.learnerId !== auth.user.id) {
      return res.status(403).json({ error: 'Access denied to this student exam record' });
    }
    res.json({
      success: true,
      session,
    });
  } catch (err: any) {
    console.error('Error fetching exam session:', err);
    res.status(500).json({ error: err.message || 'Error fetching session' });
  }
});

// 7. Exam Dashboard Stats
apiRouter.get('/exam/stats', (req, res) => {
  try {
    const learnerId = resolveEffectiveLearnerId(req, req.query.learnerId as string);
    const subjectId = req.query.subjectId as DomainId | undefined;

    const stats = examEngine.getExamStats(learnerId, subjectId);
    res.json({
      success: true,
      stats,
    });
  } catch (err: any) {
    console.error('Error fetching exam stats:', err);
    res.status(500).json({ error: err.message || 'Error fetching stats' });
  }
});


// ==========================================
// PHASE 4: AI-POWERED ADAPTIVE FLASHCARDS API
// ==========================================

// 1. Deck Availability (Based on Lesson Completion)
apiRouter.get('/flashcards/availability', (req, res) => {
  try {
    const learnerId = resolveEffectiveLearnerId(req, req.query.learnerId as string);
    const subjectId = (req.query.subjectId as DomainId) || 'gate_cs';
    const moduleId = req.query.moduleId as string | undefined;

    const availability = flashcardEngine.getDeckAvailability(learnerId, subjectId, moduleId);
    res.json({
      success: true,
      availability,
    });
  } catch (err: any) {
    console.error('Error getting flashcard availability:', err);
    res.status(500).json({ error: err.message || 'Error checking availability' });
  }
});

// 2. Flashcard Dashboard Stats
apiRouter.get('/flashcards/stats', (req, res) => {
  try {
    const learnerId = resolveEffectiveLearnerId(req, req.query.learnerId as string);
    const subjectId = (req.query.subjectId as DomainId) || 'gate_cs';

    const stats = flashcardEngine.getStats(learnerId, subjectId);
    res.json({
      success: true,
      stats,
    });
  } catch (err: any) {
    console.error('Error getting flashcard stats:', err);
    res.status(500).json({ error: err.message || 'Error getting stats' });
  }
});

// 3. Adaptive Flashcard Deck
apiRouter.get('/flashcards', (req, res) => {
  try {
    const learnerId = resolveEffectiveLearnerId(req, req.query.learnerId as string);
    const subjectId = (req.query.subjectId as DomainId) || 'gate_cs';
    const moduleId = req.query.moduleId as string | undefined;
    const lessonId = req.query.lessonId as string | undefined;
    const conceptId = req.query.conceptId as string | undefined;
    const focusMode = (req.query.focusMode as any) || 'all';
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 30));

    const result = flashcardEngine.getAdaptiveDeck({
      learnerId,
      subjectId,
      moduleId,
      lessonId,
      conceptId,
      focusMode,
      limit,
    });

    res.json({
      success: true,
      cards: result.cards,
      totalMatching: result.totalMatching,
      prioritizedConcepts: result.prioritizedConcepts,
    });
  } catch (err: any) {
    console.error('Error fetching adaptive flashcards:', err);
    res.status(500).json({ error: err.message || 'Error fetching flashcards' });
  }
});

// 4. Record Flashcard Review & Update Evidence Model
apiRouter.post('/flashcards/review', (req, res) => {
  try {
    const { learnerId, flashcardId, recallLevel, responseTimeSeconds } = req.body;
    const effectiveLearnerId = resolveEffectiveLearnerId(req, learnerId);

    if (!effectiveLearnerId || !flashcardId || !recallLevel) {
      return res.status(400).json({ error: 'Missing learnerId, flashcardId, or recallLevel' });
    }

    if (!['again', 'hard', 'good', 'easy'].includes(recallLevel)) {
      return res.status(400).json({ error: 'Invalid recallLevel. Allowed: again, hard, good, easy' });
    }

    const reviewResult = flashcardEngine.recordReview({
      learnerId: effectiveLearnerId,
      flashcardId,
      recallLevel,
      responseTimeSeconds: Math.max(0.5, Number(responseTimeSeconds) || 10),
    });

    const updatedLearner = store.learners.get(effectiveLearnerId);

    res.json({
      success: true,
      ...reviewResult,
      learner: updatedLearner,
    });
  } catch (err: any) {
    console.error('Error recording flashcard review:', err);
    res.status(500).json({ error: err.message || 'Error recording flashcard review' });
  }
});

// 5. AI-Powered Flashcard Generation (Grounded in Lesson & Concept Content)
apiRouter.post('/flashcards/generate', async (req, res) => {
  try {
    const { subjectId, moduleId, lessonId, conceptId, count, difficulty, focusWeakConcepts, learnerId } =
      req.body;

    if (!subjectId || !moduleId) {
      return res.status(400).json({ error: 'subjectId and moduleId are required' });
    }

    const effectiveLearnerId = resolveEffectiveLearnerId(req, learnerId);

    const result = await flashcardEngine.generateAiFlashcards({
      subjectId,
      moduleId,
      lessonId,
      conceptId,
      count: Math.max(1, Math.min(20, Number(count) || 5)),
      difficulty,
      focusWeakConcepts: Boolean(focusWeakConcepts),
      learnerId: effectiveLearnerId,
    });

    res.json({
      success: true,
      generatedCards: result.generatedCards,
      count: result.count,
      sourceNote: result.sourceNote,
    });
  } catch (err: any) {
    console.error('Error generating AI flashcards:', err);
    res.status(500).json({ error: err.message || 'Error generating AI flashcards' });
  }
});

// 6. Complete Session & Get Session Summary
apiRouter.post('/flashcards/session/complete', (req, res) => {
  try {
    const {
      sessionId,
      learnerId,
      subjectId,
      moduleTitle,
      reviewedCardIds,
      recallResults,
      conceptMasteryBefore,
    } = req.body;

    const effectiveLearnerId = resolveEffectiveLearnerId(req, learnerId);

    if (!sessionId || !effectiveLearnerId || !subjectId || !Array.isArray(reviewedCardIds)) {
      return res.status(400).json({ error: 'Missing required session complete fields' });
    }

    const summary = flashcardEngine.createSessionSummary({
      sessionId,
      learnerId: effectiveLearnerId,
      subjectId,
      moduleTitle,
      reviewedCardIds,
      recallResults: recallResults || {},
      conceptMasteryBefore: conceptMasteryBefore || {},
    });

    res.json({
      success: true,
      summary,
    });
  } catch (err: any) {
    console.error('Error completing flashcard session:', err);
    res.status(500).json({ error: err.message || 'Error completing flashcard session' });
  }
});

// ==========================================
// PHASE 3: INTERACTIVE MIND MAP API
// ==========================================
apiRouter.get('/mindmap', (req, res) => {
  try {
    const learnerId = (req.query.learnerId as string) || 'student_a';
    const domainId = req.query.domainId as DomainId;
    const mindMapData = mindMapEngine.generateMindMap(learnerId, domainId);
    res.json({
      success: true,
      data: mindMapData,
    });
  } catch (err: any) {
    console.error('Error generating mind map:', err);
    res.status(500).json({ error: err.message || 'Error generating mind map' });
  }
});

apiRouter.post('/mindmap/ai-suggest', async (req, res) => {
  try {
    const { domainId, conceptId } = req.body;
    const result = await mindMapEngine.discoverAiConnections(domainId, conceptId);
    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Error discovering AI connections:', err);
    res.status(500).json({ error: err.message || 'Error discovering AI connections' });
  }
});

// ==========================================
// PHASE 2: MODULES & LESSONS (Subject -> Module -> Lesson -> Concept)
// ==========================================
apiRouter.get('/modules', (req, res) => {
  try {
    const domainId = req.query.domain as DomainId;
    const modules = store.getModulesByDomain(domainId);
    res.json({
      success: true,
      modules,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching modules' });
  }
});

apiRouter.get('/modules/:moduleId/lessons', (req, res) => {
  try {
    const { moduleId } = req.params;
    const lessons = store.getLessonsByModule(moduleId);
    res.json({
      success: true,
      lessons,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching lessons' });
  }
});

apiRouter.get('/lessons', (req, res) => {
  try {
    const domainId = req.query.domain as DomainId;
    const lessons = store.getLessonsByDomain(domainId);
    res.json({
      success: true,
      lessons,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching lessons' });
  }
});

apiRouter.get('/lessons/:lessonId', (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = store.getLessonById(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: `Lesson ${lessonId} not found` });
    }

    // Include resources & covered concepts
    const resources = store.learningResources.filter((r) =>
      lesson.conceptIds.includes(r.conceptId)
    );
    const coveredConcepts = store.concepts.filter((c) =>
      lesson.conceptIds.includes(c.id)
    );
    const prereqConcepts = store.concepts.filter((c) =>
      lesson.prerequisiteConceptIds.includes(c.id)
    );

    res.json({
      success: true,
      lesson,
      resources,
      coveredConcepts,
      prereqConcepts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching lesson details' });
  }
});

apiRouter.post('/lessons/:lessonId/start', (req, res) => {
  try {
    const { lessonId } = req.params;
    const { learnerId } = req.body;
    const effectiveLearnerId = learnerId || 'student_a';

    const lesson = store.getLessonById(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: `Lesson ${lessonId} not found` });
    }

    const progressMap = store.getLearnerLessonProgressMap(effectiveLearnerId);
    let prog = progressMap.get(lessonId);

    if (!prog) {
      prog = {
        id: `lp_${effectiveLearnerId}_${lessonId}`,
        learnerId: effectiveLearnerId,
        lessonId,
        moduleId: lesson.moduleId,
        domainId: lesson.domainId,
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
        timeSpentSeconds: 0,
        questionsAttempted: 0,
        questionsCorrect: 0,
        summaryGenerated: false,
        tutorConsulted: false,
      };
      store.saveLessonProgress(prog);
    } else if (prog.status === 'NOT_STARTED') {
      prog.status = 'IN_PROGRESS';
      prog.startedAt = prog.startedAt || new Date().toISOString();
      store.saveLessonProgress(prog);
    }

    res.json({
      success: true,
      progress: prog,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error starting lesson' });
  }
});

apiRouter.post('/lessons/:lessonId/complete', (req, res) => {
  try {
    const { lessonId } = req.params;
    const { learnerId, questionsAttempted, questionsCorrect, timeSpentSeconds } = req.body;
    const effectiveLearnerId = learnerId || 'student_a';

    const result = learningPathEngine.completeLesson(effectiveLearnerId, lessonId, {
      questionsAttempted,
      questionsCorrect,
      timeSpentSeconds,
    });
    roadmapEngine.invalidateCache(effectiveLearnerId);

    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error completing lesson' });
  }
});

// ==========================================
// PHASE 2: PROGRESS TRACKING & KNOWLEDGE GAPS
// ==========================================
apiRouter.get('/learners/:learnerId/progress', (req, res) => {
  try {
    const { learnerId } = req.params;
    const learner = store.learners.get(learnerId);
    if (!learner) {
      return res.status(404).json({ error: `Learner ${learnerId} not found` });
    }

    const domainId = (req.query.domain as DomainId) || learner.activeDomainId || 'gate_cs';

    // 1. Subject Progress
    const subjectProgress = learningPathEngine.calculateSubjectProgress(learnerId, domainId);

    // 2. Module Progresses
    const domainModules = store.getModulesByDomain(domainId);
    const moduleProgresses = domainModules.map((m) =>
      learningPathEngine.calculateModuleProgress(learnerId, m.id)
    );

    // 3. Lesson Progress list
    const progressMap = store.getLearnerLessonProgressMap(learnerId);
    const lessonProgressList = Array.from(progressMap.values()).filter(
      (lp) => lp.domainId === domainId
    );

    // 4. Concept Mastery Breakdown (Categorized)
    const domainConcepts = store.concepts.filter((c) => c.domainId === domainId);
    const conceptMasteryBreakdown = domainConcepts.map((c) => {
      const mState = learner.conceptMasteries[c.id];
      const mastery = mState ? mState.mastery : 0;
      let category: ConceptMasteryCategory = 'NOT_STARTED';
      if (!mState || mState.attemptsCount === 0) {
        category = 'NOT_STARTED';
      } else if (mastery < 0.50) {
        category = 'LEARNING';
      } else if (mastery < 0.75) {
        category = 'DEVELOPING';
      } else {
        category = 'MASTERED';
      }

      return {
        conceptId: c.id,
        conceptName: c.name,
        conceptCode: c.code,
        category: c.category,
        mastery,
        retention: mState?.retention || 0,
        uncertainty: mState?.uncertainty || 0.8,
        attemptsCount: mState?.attemptsCount || 0,
        masteryCategory: category,
      };
    });

    // 5. Knowledge Gaps
    const knowledgeGaps = learningPathEngine.detectKnowledgeGaps(learnerId, domainId);

    // 6. Recent Activity History
    const activityHistory = store.getActivityHistory(learnerId, 10);

    // 7. Adaptive Next Recommendation
    const nextRecommendation = learningPathEngine.generateNextLearningRecommendation(
      learnerId,
      domainId
    );

    res.json({
      success: true,
      learnerId,
      domainId,
      subjectProgress,
      moduleProgresses,
      lessonProgressList,
      conceptMasteryBreakdown,
      knowledgeGaps,
      activityHistory,
      nextRecommendation,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching student progress' });
  }
});

apiRouter.get('/learners/:learnerId/knowledge-gaps', (req, res) => {
  try {
    const { learnerId } = req.params;
    const domainId = (req.query.domain as DomainId) || 'gate_cs';
    const gaps = learningPathEngine.detectKnowledgeGaps(learnerId, domainId);
    res.json({
      success: true,
      gaps,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching knowledge gaps' });
  }
});

apiRouter.get('/learners/:learnerId/activity-history', (req, res) => {
  try {
    const { learnerId } = req.params;
    const limit = Number(req.query.limit) || 10;
    const activities = store.getActivityHistory(learnerId, limit);
    res.json({
      success: true,
      activities,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching activity history' });
  }
});

// ==========================================
// PHASE 1: LEARNING RESOURCES (Text, PDF, Video)
// ==========================================
apiRouter.get('/resources/:conceptId', (req, res) => {
  try {
    const { conceptId } = req.params;
    let resources = store.getResourcesByConcept(conceptId);

    // If no dedicated resource is seeded for this concept, build a baseline primary lesson text resource
    if (resources.length === 0) {
      const concept = store.concepts.find((c) => c.id === conceptId);
      if (concept) {
        const defaultRes: LearningResource = {
          id: `res_${concept.id}_default`,
          conceptId: concept.id,
          domainId: concept.domainId,
          title: `Comprehensive Lecture Notes: ${concept.name}`,
          type: 'text_lesson',
          content: `${concept.name} (${concept.code}) - ${concept.category}\n\nDescription:\n${concept.description}\n\nKey Takeaways:\n${concept.keyTakeaways.map((k) => `• ${k}`).join('\n')}\n\nBloom Target Level: ${concept.bloomTarget}`,
          createdAt: new Date().toISOString(),
        };
        store.addResource(defaultRes);
        resources = [defaultRes];
      }
    }

    res.json({
      success: true,
      resources,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching resources' });
  }
});

apiRouter.post('/resources/upload', (req, res) => {
  try {
    const { conceptId, title, type, content, fileName, fileSize } = req.body;
    if (!conceptId || !content) {
      return res.status(400).json({ error: 'conceptId and content are required' });
    }
    const concept = store.concepts.find((c) => c.id === conceptId);
    if (!concept) {
      return res.status(404).json({ error: 'Concept not found' });
    }

    const newRes: LearningResource = {
      id: `res_custom_${Date.now()}`,
      conceptId,
      domainId: concept.domainId,
      title: title || `${type === 'pdf' ? 'Uploaded PDF Document' : 'Custom Learning Resource'}`,
      type: type || 'uploaded_doc',
      fileName: fileName || 'uploaded_learning_material.txt',
      fileSize: fileSize || `${(content.length / 1024).toFixed(1)} KB`,
      content,
      createdAt: new Date().toISOString(),
    };

    store.addResource(newRes);

    res.json({
      success: true,
      resource: newRes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error uploading resource' });
  }
});

// ==========================================
// PHASE 1: AI SUMMARY NOTES
// ==========================================
apiRouter.get('/summary/:conceptId', (req, res) => {
  try {
    const { conceptId } = req.params;
    const summary = store.getSummaryNote(conceptId);
    res.json({
      success: true,
      summary: summary || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching summary notes' });
  }
});

apiRouter.post('/summary/generate', async (req, res) => {
  try {
    const { conceptId, resourceId, customText, readingLevel, language } = req.body;
    if (!conceptId) {
      return res.status(400).json({ error: 'conceptId is required' });
    }

    const concept = store.concepts.find((c) => c.id === conceptId);
    if (!concept) {
      return res.status(404).json({ error: 'Concept not found' });
    }

    const resource = resourceId
      ? store.learningResources.find((r) => r.id === resourceId)
      : store.getResourcesByConcept(conceptId)[0];

    // AI Cost Optimization: Return cached summary note if already generated with same preferences
    const existing = store.getSummaryNote(conceptId);
    if (existing && !customText && !req.body.forceRegenerate) {
      const matchLevel = !readingLevel || existing.readingLevel === readingLevel;
      const matchLang = !language || existing.language === language;
      if (matchLevel && matchLang) {
        return res.json({
          success: true,
          summary: existing,
          isAIGenerated: existing.isAIGenerated,
          cached: true,
        });
      }
    }

    const result = await tutorAiService.generateSummaryNotes({
      concept,
      resource,
      customContent: customText,
      readingLevel: readingLevel || 'undergraduate',
      language: language || 'en',
    });

    // Save generated summary in store so student can revisit anytime
    store.saveSummaryNote(result.summary);

    res.json({
      success: true,
      summary: result.summary,
      isAIGenerated: result.isAIGenerated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error generating summary' });
  }
});

apiRouter.delete('/summary/:conceptId', (req, res) => {
  try {
    const { conceptId } = req.params;
    store.deleteSummaryNote(conceptId);
    res.json({ success: true, message: 'Summary notes cleared' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error clearing summary' });
  }
});

// ==========================================
// PHASE 1: AI LEARNING TUTOR CHAT
// ==========================================
apiRouter.get('/tutor/history/:conceptId', (req, res) => {
  try {
    const { conceptId } = req.params;
    const learnerId = (req.query.learnerId as string) || 'student_a';
    const history = store.getTutorHistory(learnerId, conceptId);
    res.json({
      success: true,
      history,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching tutor history' });
  }
});

apiRouter.post('/tutor/chat', async (req, res) => {
  try {
    const { learnerId, message, history, context } = req.body;
    if (!message || !context?.conceptId) {
      return res.status(400).json({ error: 'message and context with conceptId are required' });
    }

    const effectiveLearnerId = learnerId || 'student_a';

    // Store user message in history
    const userMessage: TutorMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      conceptId: context.conceptId,
    };
    store.saveTutorMessage(effectiveLearnerId, userMessage);

    // Call AI Tutor service
    const result = await tutorAiService.handleTutorChat({
      message,
      history: history || [],
      context,
    });

    // Store assistant response in history
    store.saveTutorMessage(effectiveLearnerId, result.message);

    res.json({
      success: true,
      message: result.message,
      contextUsed: {
        conceptName: context.conceptName,
        hasSummaryNotes: !!context.summaryNotes,
        prerequisitesChecked: context.prerequisites.map((p: any) => p.name),
        studentMasteryPct: Math.round((context.studentState?.mastery || 0) * 100),
      },
      isAIGenerated: result.isAIGenerated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error in AI tutor chat' });
  }
});

apiRouter.delete('/tutor/history/:conceptId', (req, res) => {
  try {
    const { conceptId } = req.params;
    const learnerId = (req.query.learnerId as string) || 'student_a';
    store.clearTutorHistory(learnerId, conceptId);
    res.json({ success: true, message: 'Tutor chat history cleared' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error clearing tutor history' });
  }
});

// ==========================================
// 1. DATABASE EXPLORER: All 9 Entities
// ==========================================
apiRouter.get('/database', (_req, res) => {
  try {
    const snapshot = store.getDatabaseSnapshot();
    res.json({
      success: true,
      ...snapshot,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching database snapshot' });
  }
});

// ==========================================
// 2. CURRICULUM DOMAINS & CONCEPTS
// ==========================================
apiRouter.get('/domains', (_req, res) => {
  res.json({
    success: true,
    domains: store.domains,
    activeDomainId: store.config.activeDomainId,
  });
});

apiRouter.post('/domains/switch', (req, res) => {
  try {
    const { learnerId, domainId } = req.body;
    if (!learnerId || !domainId) {
      return res.status(400).json({ error: 'learnerId and domainId are required' });
    }
    const updatedLearner = store.switchLearnerDomain(learnerId, domainId);
    res.json({
      success: true,
      learner: updatedLearner,
      activeDomainId: domainId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error switching domain' });
  }
});

apiRouter.get('/concepts', (req, res) => {
  const domainId = req.query.domain as any;
  const filteredConcepts = domainId ? store.getConceptsByDomain(domainId) : store.concepts;
  res.json({
    success: true,
    concepts: filteredConcepts,
    activeDomainId: store.config.activeDomainId,
  });
});

apiRouter.get('/concepts/:conceptId/questions', (req, res) => {
  const { conceptId } = req.params;
  const questions = store.questions.filter((q) => q.conceptId === conceptId);
  res.json({
    success: true,
    questions,
  });
});

// ==========================================
// 3. INNOVATION: Multilingual & Reading-Level Transformation
// ==========================================
apiRouter.post('/content/transform', async (req, res) => {
  try {
    const { conceptId, language, readingLevel, institutionId } = req.body;
    if (!conceptId) {
      return res.status(400).json({ error: 'conceptId is required' });
    }

    const transformed = await store.transformContent(
      conceptId,
      (language as LanguageCode) || 'en',
      (readingLevel as ReadingLevel) || 'undergraduate',
      institutionId
    );

    res.json({
      success: true,
      content: transformed,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error transforming content' });
  }
});

// ==========================================
// 4. INNOVATION: Automatic Evaluation Before Teacher Approval
// ==========================================
apiRouter.post('/content/evaluate-question', async (req, res) => {
  try {
    const { questionId, customQuestion } = req.body;
    const report = await store.evaluateQuestionAutomatic(questionId, customQuestion);
    res.json({
      success: true,
      report,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error evaluating question' });
  }
});

apiRouter.post('/content/approve-question', (req, res) => {
  try {
    const { questionId, teacherId, isApproved } = req.body;
    if (!questionId) {
      return res.status(400).json({ error: 'questionId is required' });
    }

    const updated = store.approveQuestion(questionId, teacherId || 'teacher_vance', !!isApproved);
    res.json({
      success: true,
      question: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error approving question' });
  }
});

// Create new question for teacher approval lab
apiRouter.post('/content/create-question', async (req, res) => {
  try {
    const questionData = req.body as Partial<Question>;
    if (!questionData.conceptId || !questionData.questionText) {
      return res.status(400).json({ error: 'conceptId and questionText are required' });
    }

    const newQuestion: Question = {
      id: `q_gen_${Date.now()}`,
      domainId: questionData.domainId || store.config.activeDomainId || 'gate_cs',
      conceptId: questionData.conceptId,
      questionText: questionData.questionText,
      questionType: questionData.questionType || 'Application',
      questionFormat: questionData.questionFormat || 'MCQ',
      difficulty: questionData.difficulty || 'medium',
      bloomLevel: questionData.bloomLevel || 'Apply',
      options: questionData.options || ['Option A', 'Option B', 'Option C', 'Option D'],
      correctOptionIndex: questionData.correctOptionIndex ?? 0,
      explanation: questionData.explanation || 'Detailed explanation will be evaluated.',
      hint: questionData.hint || 'Carefully verify invariants.',
      expectedTimeSeconds: questionData.expectedTimeSeconds || 30,
      codeSnippet: questionData.codeSnippet,
      expectedOutput: questionData.expectedOutput,
      bugLineNumber: questionData.bugLineNumber,
      fillBlankTemplate: questionData.fillBlankTemplate,
      fillBlankSolution: questionData.fillBlankSolution,
      evaluationStatus: 'PENDING_APPROVAL',
      institutionStyleId: questionData.institutionStyleId || store.config.activeInstitutionId,
    };

    store.questions.push(newQuestion);

    // Run automatic evaluation
    const evaluation = await store.evaluateQuestionAutomatic(newQuestion.id, newQuestion);
    newQuestion.aiEvaluation = evaluation;

    res.json({
      success: true,
      question: newQuestion,
      evaluation,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error creating question' });
  }
});

// ==========================================
// 5. INNOVATION: Institution-Specific Style Guides
// ==========================================
apiRouter.get('/content/institutions', (_req, res) => {
  res.json({
    success: true,
    institutions: store.institutions,
    activeInstitutionId: store.config.activeInstitutionId,
  });
});

apiRouter.post('/content/institutions/active', (req, res) => {
  const { institutionId } = req.body;
  if (institutionId) {
    store.config.activeInstitutionId = institutionId;
  }
  res.json({
    success: true,
    activeInstitutionId: store.config.activeInstitutionId,
  });
});

// ==========================================
// 6. LEARNING SESSIONS
// ==========================================
apiRouter.post('/sessions/start', (req, res) => {
  try {
    const { learnerId, sessionType, conceptId } = req.body;
    const session = store.startSession(
      learnerId || 'student_a',
      sessionType || 'PRACTICE',
      conceptId || 'arrays'
    );
    res.json({
      success: true,
      session,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error starting session' });
  }
});

apiRouter.post('/sessions/:id/end', (req, res) => {
  try {
    const { id } = req.params;
    const { finalMastery } = req.body;
    store.endSession(id, Number(finalMastery) || 0.8);
    res.json({
      success: true,
      sessionId: id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error ending session' });
  }
});

// ==========================================
// 7. USER PREFERENCES (Dyslexia, Reading Level, Language)
// ==========================================
apiRouter.patch('/users/:id/preferences', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = store.users.get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    Object.assign(user, updates);
    const learner = store.learners.get(id);
    if (learner) {
      if (updates.preferredReadingLevel) learner.preferredReadingLevel = updates.preferredReadingLevel;
      if (updates.preferredLanguage) learner.preferredLanguage = updates.preferredLanguage;
      if (updates.dyslexiaModeEnabled !== undefined) learner.dyslexiaModeEnabled = updates.dyslexiaModeEnabled;
      if (updates.bionicReadingEnabled !== undefined) learner.bionicReadingEnabled = updates.bionicReadingEnabled;
      if (updates.institutionId) learner.institutionId = updates.institutionId;
    }

    res.json({
      success: true,
      user,
      learner,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error updating user preferences' });
  }
});

// ==========================================
// 8. DIAGNOSTIC ASSESSMENT
// ==========================================
apiRouter.get('/diagnostic/questions', (_req, res) => {
  const diagQuestions = store.questions.filter((q) => q.isDiagnostic || q.difficulty === 'easy').slice(0, 8);
  res.json({
    success: true,
    questions: diagQuestions,
  });
});

apiRouter.post('/diagnostic/submit', (req, res) => {
  try {
    const { learnerId, responses } = req.body;
    if (!learnerId || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'learnerId and responses array are required' });
    }

    const learner = store.learners.get(learnerId);
    if (!learner) return res.status(404).json({ error: 'Learner not found' });

    let correctCount = 0;
    for (const r of responses) {
      const q = store.questions.find((item) => item.id === r.questionId);
      if (q && q.correctOptionIndex === r.selectedOptionIndex) {
        correctCount++;
      }
    }

    const calculatedScore = responses.length > 0 ? correctCount / responses.length : 0.5;
    learner.diagnosticCompleted = true;
    learner.diagnosticResult = {
      completedAt: new Date().toISOString(),
      initialMastery: Math.round(calculatedScore * 100) / 100,
      weakPrerequisites: calculatedScore < 0.6 ? ['Arrays'] : [],
      strongConcepts: calculatedScore >= 0.7 ? ['Arrays', 'Linked Lists'] : [],
      firstRecommendationAction: calculatedScore >= 0.7 ? 'ADVANCE' : 'PRACTICE',
    };

    res.json({
      success: true,
      learner,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error processing diagnostic' });
  }
});

// ==========================================
// 9. LEARNERS & ATTEMPTS
// ==========================================
apiRouter.get('/learners', (_req, res) => {
  res.json({
    success: true,
    learners: Array.from(store.learners.values()),
  });
});

apiRouter.get('/learners/:id', (req, res) => {
  const learner = store.learners.get(req.params.id);
  if (!learner) {
    return res.status(404).json({ error: 'Learner not found' });
  }
  res.json({
    success: true,
    learner,
  });
});

apiRouter.post('/attempts', (req, res) => {
  try {
    const {
      learnerId,
      questionId,
      selectedOptionIndex,
      confidence,
      responseTimeSeconds,
      hintsUsed,
      retries,
      userCodeAnswer,
    } = req.body;

    if (!learnerId || !questionId || selectedOptionIndex === undefined) {
      return res.status(400).json({ error: 'Missing required attempt fields' });
    }

    const result = store.recordAttempt(learnerId, questionId, {
      selectedOptionIndex,
      confidence: confidence ?? 0.5,
      responseTimeSeconds: responseTimeSeconds ?? 15,
      hintsUsed: hintsUsed ?? 0,
      retries: retries ?? 0,
      userCodeAnswer,
    });

    const updatedLearner = store.learners.get(learnerId);
    roadmapEngine.invalidateCache(learnerId);

    res.json({
      success: true,
      ...result,
      learner: updatedLearner,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error recording attempt' });
  }
});

// ==========================================
// 10. TEACHER OVERRIDE
// ==========================================
apiRouter.post('/override', (req, res) => {
  try {
    const { learnerId, teacherId, teacherName, newAction, newConceptId, reason } = req.body;
    if (!learnerId || !newAction || !reason) {
      return res.status(400).json({ error: 'Missing required override fields' });
    }

    const override = store.applyTeacherOverride(
      learnerId,
      teacherId || 'teacher_vance',
      teacherName || 'Prof. Alistair Vance',
      newAction,
      newConceptId,
      reason
    );

    const updatedLearner = store.learners.get(learnerId);
    roadmapEngine.invalidateCache(learnerId);

    res.json({
      success: true,
      override,
      learner: updatedLearner,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error applying override' });
  }
});

// ==========================================
// 11. TIME SIMULATION & DEMO MANAGEMENT
// ==========================================
apiRouter.post('/simulate-time', (req, res) => {
  try {
    const { learnerId, days } = req.body;
    const daysNum = Number(days) || 14;

    const learner = store.learners.get(learnerId || 'student_a');
    if (!learner) return res.status(404).json({ error: 'Learner not found' });

    for (const conceptId of Object.keys(learner.conceptMasteries)) {
      const state = learner.conceptMasteries[conceptId];
      if (state.attemptsCount > 0) {
        state.daysSinceLastReview += daysNum;
        state.retention = Math.max(
          0.1,
          state.mastery * Math.exp(-store.config.forgettingDecayRate * state.daysSinceLastReview)
        );
      }
    }

    roadmapEngine.invalidateCache(learner.id);
    res.json({
      success: true,
      daysSimulated: daysNum,
      learner,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error simulating time' });
  }
});

apiRouter.post('/reset-demo', (_req, res) => {
  store.seedDatabase();
  roadmapEngine.invalidateCache();
  res.json({
    success: true,
    message: 'Demo database reset to clean seeded state.',
  });
});

apiRouter.get('/stress-tests', (_req, res) => {
  const result = runAllStressTests();
  res.json({
    success: true,
    ...result,
  });
});

// Phase 7: Comprehensive System Audit & Adaptive Closed-Loop Verification
apiRouter.get('/system-audit', async (_req, res) => {
  try {
    const report = await runFullSystemAudit();
    res.json({
      success: true,
      report,
    });
  } catch (err: any) {
    console.error('System audit execution failed:', err);
    res.status(500).json({ error: err.message || 'Error executing system audit' });
  }
});

apiRouter.get('/config', (_req, res) => {
  res.json({
    success: true,
    config: store.config,
  });
});

apiRouter.post('/config', (req, res) => {
  try {
    const newConfig = req.body;
    store.config = {
      ...store.config,
      ...newConfig,
      weights: {
        ...store.config.weights,
        ...(newConfig.weights || {}),
      },
    };
    res.json({
      success: true,
      config: store.config,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error updating config' });
  }
});

// Server-side Gemini AI Intuition endpoint compliant with SDK guidelines
apiRouter.post('/ai-explain', async (req, res) => {
  const { conceptName, context, promptType } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.json({
      success: true,
      text: getDeterministicExplanation(conceptName, promptType, context),
      isAIGenerated: false,
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let prompt = '';
    if (promptType === 'concept_intuition') {
      prompt = `You are a world-class computer science educator. Explain the core intuition behind "${conceptName}" in 2 concise, highly memorable paragraphs. Focus on memory layout, computational trade-offs, and practical engineering use cases.`;
    } else if (promptType === 'teacher_advice') {
      prompt = `You are an educational psychologist advising a computer science professor. A student is struggling with ${conceptName}. Context: "${context}". Recommend 2 specific diagnostic interventions or cognitive bridging strategies to help this student break through the bottleneck.`;
    } else {
      prompt = `Provide a short, targeted study hint for the concept "${conceptName}".`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      text: response.text || getDeterministicExplanation(conceptName, promptType, context),
      isAIGenerated: true,
    });
  } catch (err: any) {
    res.json({
      success: true,
      text: getDeterministicExplanation(conceptName, promptType, context),
      isAIGenerated: false,
    });
  }
});

function getDeterministicExplanation(conceptName: string, promptType: string, context?: string): string {
  if (promptType === 'concept_intuition') {
    return `${conceptName} is fundamental to efficient algorithm design. In high-performance software, choosing the appropriate structure directly dictates CPU cache behavior, memory footprint, and asymptotic runtime bounds. Always weigh the trade-offs between O(1) random access vs dynamic pointer manipulation based on read-heavy or write-heavy workload characteristics.`;
  }
  return `Targeted Educator Guidance for ${conceptName}: Focus on multi-modal representation. Have the learner draw physical pointer diagrams or walk through recursive frame unwinding step-by-step before implementing code. Context observed: ${context || 'Student demonstrates localized misconception around edge-case termination.'}`;
}

// ==========================================
// PHASE 8: MACHINE LEARNING PREDICTION & MODEL DIAGNOSTICS API
// ==========================================

// 1. Get real ML concept mastery prediction with feature contributions
apiRouter.get('/ml/predict/:learnerId/:conceptId', (req, res) => {
  try {
    const effectiveLearnerId = resolveEffectiveLearnerId(req, req.params.learnerId);
    const { conceptId } = req.params;

    const prediction = mlInferenceEngine.predict(effectiveLearnerId, conceptId);
    res.json({
      success: true,
      learnerId: effectiveLearnerId,
      conceptId,
      prediction,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error generating ML prediction' });
  }
});

// 2. Get canonical raw and normalized feature values
apiRouter.get('/ml/features/:learnerId/:conceptId', (req, res) => {
  try {
    const effectiveLearnerId = resolveEffectiveLearnerId(req, req.params.learnerId);
    const { conceptId } = req.params;

    const features = mlFeatureExtractor.extractFeatures(effectiveLearnerId, conceptId);
    res.json({
      success: true,
      learnerId: effectiveLearnerId,
      conceptId,
      features,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error extracting ML features' });
  }
});

// 3. Get active ML model weights, calibration, and real validation metrics
apiRouter.get('/ml/model-info', (_req, res) => {
  try {
    const model = mlInferenceEngine.getActiveModelWeights();
    res.json({
      success: true,
      model,
      config: store.config.mlConfig,
      canonicalFeatures: mlFeatureExtractor.extractFeatures('student_a', 'arrays').names,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching ML model info' });
  }
});

// 4. Train / Recalibrate ML model using real accumulated historical attempts
apiRouter.post('/ml/train', (req, res) => {
  try {
    const auth = getAuthenticatedUser(req);
    if (auth && auth.user.role === 'STUDENT') {
      return res.status(403).json({ error: 'Forbidden: Students are not permitted to trigger model retraining.' });
    }

    const { epochs, learningRate, l2Lambda } = req.body || {};
    const result = mlTrainer.train({ epochs, learningRate, l2Lambda });

    if (result.weights) {
      mlInferenceEngine.setModelWeights(result.weights);
    }

    res.json({
      success: true,
      weights: result.weights,
      randomForestBenchmark: result.randomForestBenchmark,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error training ML model' });
  }
});

// ==========================================
// PHASE 6: CONTINUOUS LEARNING, EVALUATION & MODEL LIFECYCLE API
// ==========================================

// 5. Get overall ML evaluation metrics report (Accuracy, Precision, Recall, F1, Log Loss, ROC-AUC, Brier, Calibration, Data Quality)
apiRouter.get('/ml/evaluation', (req, res) => {
  try {
    const thresholdParam = req.query.threshold ? Number(req.query.threshold) : undefined;
    const report = mlFeedbackEngine.calculateEvaluationMetrics(thresholdParam);
    res.json({
      success: true,
      report,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error computing ML evaluation metrics' });
  }
});

// 6. Get compact ML model health summary for teacher / admin dashboard
apiRouter.get('/ml/model-health', (_req, res) => {
  try {
    const health = mlFeedbackEngine.getModelHealthSummary();
    res.json({
      success: true,
      health,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching model health summary' });
  }
});

// 7. Get evaluated and pending predictions for a specific learner (with tenant data isolation)
apiRouter.get('/ml/predictions/:learnerId', (req, res) => {
  try {
    const effectiveLearnerId = resolveEffectiveLearnerId(req, req.params.learnerId);
    const predictions = store.predictionRecords.filter((r) => r.learnerId === effectiveLearnerId);
    res.json({
      success: true,
      learnerId: effectiveLearnerId,
      totalCount: predictions.length,
      evaluatedCount: predictions.filter((p) => p.evaluationStatus === 'evaluated').length,
      pendingCount: predictions.filter((p) => p.evaluationStatus === 'pending').length,
      predictions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching learner predictions' });
  }
});

// 8. Get recommendation outcome tracking records for a specific learner
apiRouter.get('/ml/recommendation-outcomes/:learnerId', (req, res) => {
  try {
    const effectiveLearnerId = resolveEffectiveLearnerId(req, req.params.learnerId);
    const recommendations = store.recommendationRecords.filter((r) => r.learnerId === effectiveLearnerId);
    const effectiveness = mlFeedbackEngine.calculateRecommendationEffectiveness();
    res.json({
      success: true,
      learnerId: effectiveLearnerId,
      totalCount: recommendations.length,
      recommendations,
      effectiveness,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching recommendation outcomes' });
  }
});

// 9. Get overall recommendation effectiveness observational statistics
apiRouter.get('/ml/recommendation-effectiveness', (_req, res) => {
  try {
    const effectiveness = mlFeedbackEngine.calculateRecommendationEffectiveness();
    res.json({
      success: true,
      effectiveness,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error computing recommendation effectiveness' });
  }
});

// 10. Check controlled retraining criteria eligibility
apiRouter.get('/ml/retraining-status', (_req, res) => {
  try {
    const status = mlFeedbackEngine.checkRetrainingEligibility();
    res.json({
      success: true,
      status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error checking retraining eligibility' });
  }
});

// 11. Trigger controlled candidate model retraining (Teacher/Admin only)
apiRouter.post('/ml/retrain', (req, res) => {
  try {
    const auth = getAuthenticatedUser(req);
    if (auth && auth.user.role === 'STUDENT') {
      return res.status(403).json({
        error: 'Forbidden: Students are not authorized to trigger model retraining.',
      });
    }

    const { epochs, learningRate, l2Lambda } = req.body || {};
    const result = mlFeedbackEngine.trainCandidateModel({ epochs, learningRate, l2Lambda });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      candidate: result.candidate,
      message: 'Candidate model trained on chronological split and evaluated on holdout validation set.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error training candidate model' });
  }
});

// 12. Promote candidate model to production (Teacher/Admin only)
apiRouter.post('/ml/promote', (req, res) => {
  try {
    const auth = getAuthenticatedUser(req);
    if (auth && auth.user.role === 'STUDENT') {
      return res.status(403).json({
        error: 'Forbidden: Students are not authorized to promote machine learning models.',
      });
    }

    const { candidateVersion, reason } = req.body || {};
    if (!candidateVersion) {
      return res.status(400).json({ error: 'candidateVersion is required for promotion.' });
    }

    const promoterId = auth ? `${auth.user.name} (${auth.user.role})` : 'Teacher Vance (TEACHER)';
    const result = mlFeedbackEngine.promoteCandidateModel(candidateVersion, promoterId, reason);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      activeVersion: result.activeVersion,
      message: `Model ${result.activeVersion} successfully promoted to production. Previous model archived.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error promoting candidate model' });
  }
});

// 13. Rollback active production model to previous validated model (Teacher/Admin only)
apiRouter.post('/ml/rollback', (req, res) => {
  try {
    const auth = getAuthenticatedUser(req);
    if (auth && auth.user.role === 'STUDENT') {
      return res.status(403).json({
        error: 'Forbidden: Students are not authorized to rollback machine learning models.',
      });
    }

    const { targetVersion } = req.body || {};
    const authorId = auth ? `${auth.user.name} (${auth.user.role})` : 'Teacher Vance (TEACHER)';
    const result = mlFeedbackEngine.rollbackToModel(targetVersion || 'logreg-baseline-v1.0', authorId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      activeVersion: result.activeVersion,
      message: `Active model successfully rolled back to ${result.activeVersion}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error rolling back model' });
  }
});

// 14. Get feature drift monitoring report
apiRouter.get('/ml/drift', (_req, res) => {
  try {
    const report = mlFeedbackEngine.detectFeatureDrift();
    res.json({
      success: true,
      report,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error computing feature drift' });
  }
});

// 15. Get all registered model versions
apiRouter.get('/ml/models', (_req, res) => {
  try {
    const models = Array.from(store.modelRegistry.values());
    res.json({
      success: true,
      models,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching registered models' });
  }
});

// ==========================================
// BAYESIAN KNOWLEDGE TRACING (BKT) API
// Corbett & Anderson (1995) 4-Parameter Model
// ==========================================

// 1. Get BKT Model Info (parameters, version, formulas, leakage guards)
apiRouter.get('/bkt/model-info', (_req, res) => {
  try {
    const info = bktEngine.getModelInfo(store.config.bktConfig);
    res.json({
      success: true,
      info,
      config: store.config.bktConfig || DEFAULT_BKT_CONFIG,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching BKT model info' });
  }
});

// 2. Get BKT state and chronological trace history for a learner + concept
apiRouter.get('/bkt/trace/:learnerId/:conceptId', (req, res) => {
  try {
    const effectiveLearnerId = resolveEffectiveLearnerId(req, req.params.learnerId);
    const { conceptId } = req.params;
    const beforeTimestamp = req.query.before as string | undefined;

    const trace = bktEngine.traceConcept(
      effectiveLearnerId,
      conceptId,
      store.attempts,
      store.config.bktConfig,
      undefined,
      beforeTimestamp
    );

    const learner = store.learners.get(effectiveLearnerId);
    const conceptMastery = learner?.conceptMasteries[conceptId];

    res.json({
      success: true,
      trace,
      currentMastery: conceptMastery?.mastery ?? 0,
      currentBktMastery: conceptMastery?.bktMastery ?? trace.finalState.pKnowledge,
      currentBktState: conceptMastery?.bktState ?? trace.finalState,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error tracing BKT concept' });
  }
});

// 3. Predict next attempt outcomes given current BKT knowledge
apiRouter.post('/bkt/predict-next', (req, res) => {
  try {
    const { pKnowledge, conceptId, customParameters } = req.body || {};
    const params = bktEngine.resolveParameters(conceptId, store.config.bktConfig, customParameters);
    const prediction = bktEngine.predictNextAttempt(pKnowledge ?? 0.15, params);

    res.json({
      success: true,
      parameters: params,
      prediction,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error simulating BKT prediction' });
  }
});

// 4. Update BKT Configuration
apiRouter.put('/bkt/config', (req, res) => {
  try {
    const { enabled, weight, defaultPInit, defaultPLearn, defaultPGuess, defaultPSlip, conceptOverrides } = req.body || {};
    if (!store.config.bktConfig) {
      store.config.bktConfig = { ...DEFAULT_BKT_CONFIG };
    }
    if (enabled !== undefined) store.config.bktConfig.enabled = Boolean(enabled);
    if (weight !== undefined) store.config.bktConfig.weight = Math.max(0, Math.min(1, Number(weight)));
    if (defaultPInit !== undefined) store.config.bktConfig.defaultPInit = Math.max(0, Math.min(1, Number(defaultPInit)));
    if (defaultPLearn !== undefined) store.config.bktConfig.defaultPLearn = Math.max(0, Math.min(1, Number(defaultPLearn)));
    if (defaultPGuess !== undefined) store.config.bktConfig.defaultPGuess = Math.max(0, Math.min(0.49, Number(defaultPGuess)));
    if (defaultPSlip !== undefined) store.config.bktConfig.defaultPSlip = Math.max(0, Math.min(0.49, Number(defaultPSlip)));
    if (conceptOverrides !== undefined) store.config.bktConfig.conceptOverrides = conceptOverrides;

    store.schedulePersist();

    res.json({
      success: true,
      bktConfig: store.config.bktConfig,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error updating BKT config' });
  }
});

// ==========================================
// PERSONALIZED LEARNING ROADMAP API
// ==========================================

function resolveRoadmapRequester(req: any, requestedLearnerId: string): {
  effectiveLearnerId: string;
  forbidden: boolean;
} {
  const auth = getAuthenticatedUser(req);
  const roleContext = req.headers?.['x-role-context'];
  if (auth) {
    if (auth.user.role === 'TEACHER' || auth.user.role === 'ADMIN' || roleContext === 'TEACHER') {
      return { effectiveLearnerId: requestedLearnerId || auth.user.id, forbidden: false };
    }
    if (requestedLearnerId && requestedLearnerId !== auth.user.id) {
      return { effectiveLearnerId: auth.user.id, forbidden: true };
    }
    return { effectiveLearnerId: auth.user.id, forbidden: false };
  }
  return { effectiveLearnerId: requestedLearnerId || 'student_a', forbidden: false };
}

// 1. Get complete personalized learning roadmap for a learner
apiRouter.get('/roadmap/:learnerId', (req, res) => {
  try {
    const { effectiveLearnerId, forbidden } = resolveRoadmapRequester(req, req.params.learnerId);
    if (forbidden) {
      return res.status(403).json({
        error: 'Forbidden: Learners cannot access another learner\'s personalized roadmap.',
      });
    }

    const domainId = req.query.domain as DomainId | undefined;
    const roadmap = roadmapEngine.generateRoadmap(effectiveLearnerId, domainId);
    res.json(roadmap);
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('not found') ? 404 : 500);
    res.status(status).json({ error: err.message || 'Error generating personalized roadmap' });
  }
});

// 2. Get current primary roadmap action & progress summary for a learner
apiRouter.get('/roadmap/:learnerId/current', (req, res) => {
  try {
    const { effectiveLearnerId, forbidden } = resolveRoadmapRequester(req, req.params.learnerId);
    if (forbidden) {
      return res.status(403).json({
        error: 'Forbidden: Learners cannot access another learner\'s personalized roadmap.',
      });
    }

    const domainId = req.query.domain as DomainId | undefined;
    const currentData = roadmapEngine.getCurrentAction(effectiveLearnerId, domainId);
    res.json(currentData);
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('not found') ? 404 : 500);
    res.status(status).json({ error: err.message || 'Error fetching current roadmap action' });
  }
});

// 3. Get specific concept roadmap detail for a learner
apiRouter.get('/roadmap/:learnerId/concept/:conceptId', (req, res) => {
  try {
    const { effectiveLearnerId, forbidden } = resolveRoadmapRequester(req, req.params.learnerId);
    if (forbidden) {
      return res.status(403).json({
        error: 'Forbidden: Learners cannot access another learner\'s personalized roadmap.',
      });
    }

    const { conceptId } = req.params;
    const item = roadmapEngine.getConceptDetail(effectiveLearnerId, conceptId);
    res.json({
      learnerId: effectiveLearnerId,
      conceptId,
      item,
    });
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('not found') ? 404 : 500);
    res.status(status).json({ error: err.message || 'Error fetching roadmap concept detail' });
  }
});


