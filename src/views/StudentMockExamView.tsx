import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  DomainId,
  MockExamAnswer,
  MockExamAvailability,
  MockExamBlueprint,
  MockExamConfig,
  MockExamQuestion,
  MockExamQuestionReviewItem,
  MockExamResult,
  MockExamSession,
  MockExamStats,
  QuestionDifficulty,
  SummaryNote,
} from '../types.js';
import * as api from '../api/client.js';
import { SummaryNotesModal } from '../components/SummaryNotesModal.js';
import { TutorChat } from '../components/TutorChat.js';
import confetti from 'canvas-confetti';
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bookmark,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Brain,
  Network,
  FileText,
  Bot,
  AlertTriangle,
  History,
  TrendingUp,
  Award,
  ChevronRight,
  Layers,
  Lock,
  Unlock,
  Check,
  Flag,
  ListFilter,
  BarChart3,
  Loader2,
  Calendar,
} from 'lucide-react';

type ExamViewMode = 'setup' | 'active' | 'results' | 'review' | 'history';

export const StudentMockExamView: React.FC = () => {
  const {
    currentLearner,
    domains,
    activeDomainId,
    setActiveDomainId,
    modules,
    lessons,
    concepts,
    setActiveView,
    setTargetConceptId,
    setActiveLessonId,
    refreshLearner,
    refreshProgress,
  } = useApp();

  const [viewMode, setViewMode] = useState<ExamViewMode>('setup');

  // Setup form states
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | 'mixed'>('mixed');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(15);
  const [focusWeakConcepts, setFocusWeakConcepts] = useState<boolean>(false);

  // Availability & Blueprint states
  const [availability, setAvailability] = useState<MockExamAvailability | null>(null);
  const [blueprint, setBlueprint] = useState<MockExamBlueprint | null>(null);
  const [stats, setStats] = useState<MockExamStats | null>(null);
  const [historyList, setHistoryList] = useState<MockExamSession[]>([]);

  // Loading & error states
  const [loading, setLoading] = useState<boolean>(false);
  const [generatingExam, setGeneratingExam] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active Exam Session state
  const [activeSession, setActiveSession] = useState<MockExamSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({}); // questionId -> selectedOptionIndex
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({}); // questionId -> boolean
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Exam Result state
  const [examResult, setExamResult] = useState<MockExamResult | null>(null);

  // Bridge integration states (AI Tutor & Summary Notes)
  const [activeConceptForNotes, setActiveConceptForNotes] = useState<any>(null);
  const [activeSummaryNotes, setActiveSummaryNotes] = useState<SummaryNote | null>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState<boolean>(false);

  const [activeConceptForTutor, setActiveConceptForTutor] = useState<any>(null);
  const [activeQuestionForTutor, setActiveQuestionForTutor] = useState<any>(null);
  const [isTutorDrawerOpen, setIsTutorDrawerOpen] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentDomain = domains.find((d) => d.id === activeDomainId) || domains[0];
  const domainModules = modules.filter((m) => m.domainId === activeDomainId);

  // Load Availability & Blueprint & Stats
  const loadSetupData = async () => {
    if (!currentLearner) return;
    try {
      setLoading(true);
      setError(null);

      const [availData, blueprintData, statsData, historyData] = await Promise.all([
        api.fetchMockExamAvailability(
          currentLearner.id,
          activeDomainId,
          selectedModuleId !== 'all' ? selectedModuleId : undefined
        ),
        api.fetchMockExamBlueprint({
          learnerId: currentLearner.id,
          subjectId: activeDomainId,
          moduleId: selectedModuleId !== 'all' ? selectedModuleId : undefined,
          questionCount,
          difficulty,
          timeLimitMinutes,
          focusWeakConcepts,
        }),
        api.fetchMockExamStats(currentLearner.id, activeDomainId),
        api.fetchMockExamHistory(currentLearner.id, activeDomainId),
      ]);

      setAvailability(availData);
      setBlueprint(blueprintData);
      setStats(statsData);
      setHistoryList(historyData);
    } catch (err: any) {
      console.error('Failed to load mock exam setup data:', err);
      setError(err.message || 'Error loading mock exam configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'setup' || viewMode === 'history') {
      loadSetupData();
    }
  }, [currentLearner?.id, activeDomainId, selectedModuleId, questionCount, difficulty, timeLimitMinutes, focusWeakConcepts, viewMode]);

  // Active Timer Effect
  useEffect(() => {
    if (viewMode === 'active' && timeRemainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Automatic timeout submission
            handleForceTimeoutSubmit();
            return 0;
          }
          return prev - 1;
        });

        // Increment time spent on current question
        if (activeSession) {
          const curQ = activeSession.questions[currentQuestionIndex];
          if (curQ) {
            setQuestionTimes((prev) => ({
              ...prev,
              [curQ.questionId]: (prev[curQ.questionId] || 0) + 1,
            }));
          }
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewMode, timeRemainingSeconds, currentQuestionIndex, activeSession]);

  // Start Exam
  const handleStartExam = async () => {
    if (!currentLearner) return;
    if (availability && !availability.isAvailable) {
      return;
    }

    try {
      setGeneratingExam(true);
      setError(null);

      const session = await api.generateMockExam({
        learnerId: currentLearner.id,
        subjectId: activeDomainId,
        moduleId: selectedModuleId !== 'all' ? selectedModuleId : undefined,
        questionCount,
        difficulty,
        timeLimitMinutes,
        focusWeakConcepts,
      });

      setActiveSession(session);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setMarkedForReview({});
      setQuestionTimes({});
      setTimeRemainingSeconds(session.config.timeLimitMinutes * 60);
      setViewMode('active');
    } catch (err: any) {
      console.error('Failed to generate mock exam:', err);
      setError(err.message || 'Failed to generate mock exam. Please try again.');
    } finally {
      setGeneratingExam(false);
    }
  };

  // Answer selection
  const handleSelectOption = (optionIndex: number) => {
    if (!activeSession) return;
    const curQ = activeSession.questions[currentQuestionIndex];
    setUserAnswers((prev) => ({
      ...prev,
      [curQ.questionId]: optionIndex,
    }));
  };

  // Clear answer
  const handleClearAnswer = () => {
    if (!activeSession) return;
    const curQ = activeSession.questions[currentQuestionIndex];
    setUserAnswers((prev) => {
      const next = { ...prev };
      delete next[curQ.questionId];
      return next;
    });
  };

  // Toggle mark for review
  const handleToggleMarkReview = () => {
    if (!activeSession) return;
    const curQ = activeSession.questions[currentQuestionIndex];
    setMarkedForReview((prev) => ({
      ...prev,
      [curQ.questionId]: !prev[curQ.questionId],
    }));
  };

  // Submit Exam (Confirmation modal triggered or timeout)
  const handleSubmitExamConfirmed = async () => {
    if (!activeSession || !currentLearner) return;
    setIsSubmitting(true);
    setIsSubmitModalOpen(false);

    try {
      if (timerRef.current) clearInterval(timerRef.current);

      const totalTimeUsed =
        activeSession.config.timeLimitMinutes * 60 - timeRemainingSeconds;

      const formattedAnswers: MockExamAnswer[] = activeSession.questions.map((q) => {
        const selected = userAnswers[q.questionId] ?? -1;
        return {
          questionId: q.questionId,
          selectedOptionIndex: selected,
          selectedOptionText: selected >= 0 ? q.options[selected] : undefined,
          isMarkedForReview: !!markedForReview[q.questionId],
          responseTimeSeconds: questionTimes[q.questionId] || 15,
        };
      });

      const response = await api.submitMockExam({
        sessionId: activeSession.id,
        learnerId: currentLearner.id,
        answers: formattedAnswers,
        timeUsedSeconds: Math.max(5, totalTimeUsed),
      });

      setExamResult(response.result);
      setViewMode('results');

      // Refresh learner mastery & progress in AppContext
      await refreshLearner();
      await refreshProgress();

      // Confetti on passing!
      if (response.result.passed) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      console.error('Failed to submit exam:', err);
      setError(err.message || 'Error submitting mock exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Force submit when timer expires
  const handleForceTimeoutSubmit = () => {
    handleSubmitExamConfirmed();
  };

  // Format timer seconds into mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Open Notes Bridge
  const handleOpenNotes = (conceptId: string) => {
    const c = concepts.find((item) => item.id === conceptId);
    if (c) {
      setActiveConceptForNotes(c);
      const note = (currentLearner as any)?.summaryNotes?.[conceptId] || null;
      setActiveSummaryNotes(note);
      setIsNotesModalOpen(true);
    }
  };

  // Open AI Tutor Bridge with full question and student response context
  const handleOpenTutorForQuestion = (qItem: MockExamQuestionReviewItem) => {
    const c = concepts.find((item) => item.id === qItem.question.conceptId) || concepts[0];
    setActiveConceptForTutor(c);
    setActiveQuestionForTutor({
      questionText: qItem.question.question,
      questionFormat: 'MCQ',
      options: qItem.question.options,
      correctOptionIndex: qItem.question.correctOptionIndex,
      studentSelectedOption: qItem.studentAnswerText,
      explanation: qItem.question.explanation,
      difficulty: qItem.question.difficulty,
    });
    setIsTutorDrawerOpen(true);
  };

  // Retake Weak Areas handler
  const handleRetakeWeakAreas = () => {
    setFocusWeakConcepts(true);
    setSelectedModuleId('all');
    setViewMode('setup');
  };

  // ==========================================
  // RENDER: ACTIVE EXAM SCREEN
  // ==========================================
  if (viewMode === 'active' && activeSession) {
    const currentQ = activeSession.questions[currentQuestionIndex];
    const totalQ = activeSession.questions.length;
    const selectedOption = userAnswers[currentQ.questionId];
    const isMarked = !!markedForReview[currentQ.questionId];
    const isLastQuestion = currentQuestionIndex === totalQ - 1;

    // Navigator counts
    const answeredCount = Object.keys(userAnswers).length;
    const markedCount = Object.values(markedForReview).filter(Boolean).length;
    const unansweredCount = totalQ - answeredCount;

    const isTimerLow = timeRemainingSeconds < 120; // under 2 minutes

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Floating Exam Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-4 sticky top-4 z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-200">
                Mock Exam
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600 truncate max-w-xs md:max-w-md">
                {activeSession.title}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              Question {currentQuestionIndex + 1} of {totalQ}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Countdown Timer */}
            <div
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm ${
                isTimerLow
                  ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <Clock className={`w-4 h-4 ${isTimerLow ? 'text-rose-600' : 'text-slate-500'}`} />
              <span>{formatTime(timeRemainingSeconds)}</span>
            </div>

            {/* Quick Submit Exam Button */}
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Submit Exam
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Interface (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
              {/* Question metadata badge bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                    Concept: {currentQ.conceptName}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize ${
                      currentQ.difficulty === 'hard'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : currentQ.difficulty === 'easy'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {currentQ.difficulty}
                  </span>
                </div>

                <div className="text-slate-400 text-xs">
                  Source: <strong className="text-slate-600">{currentQ.sourceTitle}</strong>
                </div>
              </div>

              {/* Question Prompt */}
              <h2 className="text-base md:text-lg font-bold text-slate-900 leading-relaxed">
                {currentQ.question}
              </h2>

              {/* Options */}
              <div className="space-y-3 pt-2">
                {currentQ.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const letter = String.fromCharCode(65 + idx); // A, B, C, D

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full p-4 rounded-xl border text-left flex items-start space-x-3.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold shadow-xs ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-mono text-xs font-bold ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {letter}
                      </div>
                      <div className="text-sm pt-0.5 flex-1">{option}</div>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons Bar */}
              <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleToggleMarkReview}
                    className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isMarked
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{isMarked ? 'Marked for Review' : 'Mark for Review'}</span>
                  </button>

                  {selectedOption !== undefined && (
                    <button
                      onClick={handleClearAnswer}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Clear Answer
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  {isLastQuestion ? (
                    <button
                      onClick={() => setIsSubmitModalOpen(true)}
                      className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <span>Submit Exam</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <span>Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Question Navigator Drawer / Sidebar (1 col) */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Question Navigator
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {answeredCount}/{totalQ} Done
                </span>
              </div>

              {/* Status Pills Summary */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <div className="font-extrabold text-sm">{answeredCount}</div>
                  <div>Answered</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                  <div className="font-extrabold text-sm">{markedCount}</div>
                  <div>Review</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
                  <div className="font-extrabold text-sm">{unansweredCount}</div>
                  <div>Pending</div>
                </div>
              </div>

              {/* Navigator Grid */}
              <div className="grid grid-cols-5 gap-2 pt-2">
                {activeSession.questions.map((q, idx) => {
                  const isCurrent = currentQuestionIndex === idx;
                  const isAns = userAnswers[q.questionId] !== undefined;
                  const isM = !!markedForReview[q.questionId];

                  return (
                    <button
                      key={q.questionId}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`relative h-10 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-indigo-600 shadow-xs'
                          : ''
                      } ${
                        isM
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : isAns
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{idx + 1}</span>
                      {isM && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-600 border border-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />
                  <span>Marked for review</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block" />
                  <span>Unanswered</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        {isSubmitModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Submit Mock Exam?</h3>
                  <p className="text-xs text-slate-500">Your answers will be evaluated across the Concept Evidence Model.</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Questions:</span>
                  <span className="font-bold text-slate-800">{totalQ}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Answered Questions:</span>
                  <span className="font-bold text-emerald-600">{answeredCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unanswered Questions:</span>
                  <span className="font-bold text-rose-600">{unansweredCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Marked for Review:</span>
                  <span className="font-bold text-amber-600">{markedCount}</span>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>You have {unansweredCount} unanswered question(s). You can return to review them before final submission.</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Return to Exam
                </button>
                <button
                  onClick={handleSubmitExamConfirmed}
                  disabled={isSubmitting}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Evaluating Evidence...</span>
                    </>
                  ) : (
                    <span>Confirm & Submit</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: RESULTS PAGE
  // ==========================================
  if (viewMode === 'results' && examResult) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Results Hero Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  examResult.passed
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {examResult.passed ? 'Exam Passed' : 'Needs Review'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">
                Completed on {new Date(examResult.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Mock Exam Results
            </h1>
            <p className="text-xs text-slate-500">
              Syllabus: <strong className="text-slate-800">{examResult.subjectName}</strong>
              {examResult.moduleTitle && ` • ${examResult.moduleTitle}`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-3xl font-black text-indigo-600 font-mono">
                {examResult.scorePercent}%
              </div>
              <div className="text-xs text-slate-400 font-medium">Final Exam Score</div>
            </div>

            <div className="h-12 w-px bg-slate-200 hidden sm:block" />

            <div className="text-right">
              <div className="text-2xl font-bold text-slate-800 font-mono">
                {examResult.accuracyPercent}%
              </div>
              <div className="text-xs text-slate-400 font-medium">Attempt Accuracy</div>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs text-slate-400 font-medium">Total Questions</div>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {examResult.totalQuestions}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs text-emerald-600 font-medium flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Correct</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">
              {examResult.correctCount}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs text-rose-600 font-medium flex items-center space-x-1">
              <XCircle className="w-3.5 h-3.5" />
              <span>Incorrect</span>
            </div>
            <div className="text-2xl font-bold text-rose-600 font-mono mt-1">
              {examResult.incorrectCount}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs text-slate-400 font-medium flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Time Used</span>
            </div>
            <div className="text-xl font-bold text-slate-800 font-mono mt-1">
              {examResult.timeUsedFormatted}
            </div>
          </div>
        </div>

        {/* Primary Action Buttons Bar */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('review')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Review Detailed Answers</span>
            </button>

            {examResult.weakConcepts.length > 0 && (
              <button
                onClick={() => {
                  setActiveView('student_flashcards');
                }}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Brain className="w-4 h-4" />
                <span>Practice Weak Concepts ({examResult.weakConcepts.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRetakeWeakAreas}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Weak Areas</span>
            </button>

            <button
              onClick={() => setViewMode('setup')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
            >
              Back to Exam Setup
            </button>
          </div>
        </div>

        {/* Concept Performance Table (Calculated from real answers) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Concept Performance Breakdown</h2>
              <p className="text-xs text-slate-500">
                Evidence calculated per concept and fed into the Concept Mastery engine
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {examResult.conceptPerformance.length} Concepts Examined
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {examResult.conceptPerformance.map((cp) => (
              <div key={cp.conceptId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-sm font-bold text-slate-800">{cp.conceptName}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        cp.status === 'Mastered'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : cp.status === 'Needs Review'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {cp.status}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full sm:w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        cp.accuracyPercent >= 80
                          ? 'bg-emerald-500'
                          : cp.accuracyPercent >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${cp.accuracyPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-xs">
                  <div className="text-right">
                    <div className="font-bold text-slate-800 font-mono">
                      {cp.correctCount} / {cp.totalQuestions}
                    </div>
                    <div className="text-[10px] text-slate-400">Questions Correct</div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-indigo-600 font-mono text-sm">
                      {cp.accuracyPercent}%
                    </div>
                    <div className="text-[10px] text-slate-400">Accuracy</div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-slate-700 font-mono">
                      {(cp.masteryAfter * 100).toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-slate-400">New Mastery</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Adaptive Recommendations (Connected to Flashcards, Tutor, Notes, Mind Map) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Adaptive Next Steps & Recommendations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {examResult.adaptiveRecommendations.map((rec, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    {rec.actionType === 'flashcards' && <Brain className="w-4 h-4 text-purple-600" />}
                    {rec.actionType === 'tutor' && <Bot className="w-4 h-4 text-indigo-600" />}
                    {rec.actionType === 'mindmap' && <Network className="w-4 h-4 text-blue-600" />}
                    {rec.actionType === 'retake' && <RotateCcw className="w-4 h-4 text-amber-600" />}
                    {rec.actionType === 'lesson' && <BookOpen className="w-4 h-4 text-emerald-600" />}
                    <h3 className="text-xs font-bold text-slate-900">{rec.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{rec.description}</p>
                </div>

                <div className="pt-2">
                  {rec.actionType === 'flashcards' && (
                    <button
                      onClick={() => setActiveView('student_flashcards')}
                      className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Open Flashcard Deck</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {rec.actionType === 'tutor' && (
                    <button
                      onClick={() => {
                        const c = concepts.find((item) => item.id === rec.targetId) || concepts[0];
                        setActiveConceptForTutor(c);
                        setIsTutorDrawerOpen(true);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Consult AI Tutor</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {rec.actionType === 'mindmap' && (
                    <button
                      onClick={() => {
                        setTargetConceptId(rec.targetId);
                        setActiveView('student_mindmap');
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>View in Mind Map</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {rec.actionType === 'retake' && (
                    <button
                      onClick={handleRetakeWeakAreas}
                      className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Configure Retake Exam</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: DETAILED QUESTION REVIEW PAGE
  // ==========================================
  if (viewMode === 'review' && examResult) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Review Answers</h1>
            <p className="text-xs text-slate-500">
              Examine every question, correct answers, and ask the AI Tutor for clarification
            </p>
          </div>
          <button
            onClick={() => setViewMode('results')}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Back to Results
          </button>
        </div>

        <div className="space-y-4">
          {examResult.questionsReview.map((item, idx) => {
            const isCorrect = item.isCorrect;
            const isUnans = item.isUnanswered;

            return (
              <div
                key={item.question.questionId}
                className={`bg-white rounded-2xl border p-6 shadow-xs space-y-4 transition-all ${
                  isCorrect
                    ? 'border-emerald-200'
                    : isUnans
                    ? 'border-slate-200'
                    : 'border-rose-200 bg-rose-50/20'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      Q{idx + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : isUnans
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isCorrect && <CheckCircle2 className="w-3 h-3" />}
                      {!isCorrect && !isUnans && <XCircle className="w-3 h-3" />}
                      <span>{isCorrect ? 'Correct' : isUnans ? 'Unanswered' : 'Incorrect'}</span>
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      Concept: {item.question.conceptName}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    <button
                      onClick={() => handleOpenNotes(item.question.conceptId)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium flex items-center space-x-1 cursor-pointer"
                    >
                      <BookOpen className="w-3 h-3 text-slate-500" />
                      <span>View Notes</span>
                    </button>

                    {!isCorrect && (
                      <button
                        onClick={() => handleOpenTutorForQuestion(item)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 flex items-center space-x-1 cursor-pointer"
                      >
                        <Bot className="w-3 h-3 text-indigo-600" />
                        <span>Ask AI Tutor</span>
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  {item.question.question}
                </h3>

                {/* Options display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  {item.question.options.map((opt, oIdx) => {
                    const isOptionCorrect = oIdx === item.question.correctOptionIndex;
                    const isOptionSelected = oIdx === item.studentOptionIndex;

                    return (
                      <div
                        key={oIdx}
                        className={`p-3 rounded-xl border flex items-start space-x-2 ${
                          isOptionCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                            : isOptionSelected && !isCorrect
                            ? 'bg-rose-50 border-rose-300 text-rose-950 font-semibold'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="font-mono font-bold text-[11px] shrink-0">
                          {String.fromCharCode(65 + oIdx)}.
                        </span>
                        <span className="flex-1">{opt}</span>
                        {isOptionCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        {isOptionSelected && !isCorrect && (
                          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs text-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Pedagogical Explanation:</span>
                  </div>
                  <p className="leading-relaxed">{item.question.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: EXAM SETUP SCREEN (DEFAULT)
  // ==========================================
  const isLocked = availability && !availability.isAvailable;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header & Track Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                AI-Powered Adaptive Mock Exam
              </h1>
              <p className="text-xs text-slate-500">
                Ground in real completed curriculum content • Real-time Evidence Model calculation
              </p>
            </div>
          </div>
        </div>

        {/* Syllabus / Domain Selector & History Tab */}
        <div className="flex items-center space-x-3">
          <select
            value={activeDomainId}
            onChange={(e) => setActiveDomainId(e.target.value as DomainId)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer"
          >
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setViewMode(viewMode === 'history' ? 'setup' : 'history')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'history'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{viewMode === 'history' ? 'Configure Exam' : 'Exam History'}</span>
          </button>
        </div>
      </div>

      {/* VIEW: EXAM HISTORY */}
      {viewMode === 'history' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Completed Exam History</h2>
              <p className="text-xs text-slate-500">Stored mock examinations and performance telemetry</p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {historyList.length} Completed Session(s)
            </span>
          </div>

          {historyList.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-2">
              <GraduationCap className="w-8 h-8 text-slate-300 mx-auto" />
              <div>No mock exams completed yet in this syllabus track.</div>
              <button
                onClick={() => setViewMode('setup')}
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold cursor-pointer"
              >
                Configure First Exam
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historyList.map((hist) => {
                const res = hist.result;
                if (!res) return null;

                return (
                  <div key={hist.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900">{hist.title}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            res.passed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {res.passed ? 'Passed' : 'Needs Review'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center space-x-3">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(hist.submittedAt || hist.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </span>
                        <span>•</span>
                        <span>{res.totalQuestions} Questions</span>
                        <span>•</span>
                        <span>Time: {res.timeUsedFormatted}</span>
                      </div>

                      {res.weakConcepts.length > 0 && (
                        <div className="text-[11px] text-amber-700 font-medium pt-1">
                          Weak concepts: {res.weakConcepts.map((w) => w.conceptName).slice(0, 2).join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-xl font-extrabold text-indigo-600 font-mono">
                          {res.scorePercent}%
                        </div>
                        <div className="text-[10px] text-slate-400">Score</div>
                      </div>

                      <button
                        onClick={() => {
                          setExamResult(res);
                          setActiveSession(hist);
                          setViewMode('results');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        View Results
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW: EXAM SETUP CONFIGURATION */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Setup Controls (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ListFilter className="w-4 h-4 text-indigo-600" />
                <span>Configure Mock Exam</span>
              </h2>

              {/* Scope Selection: Entire Subject or Module */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Coverage Scope
                </label>
                <select
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="all">Entire Subject ({currentDomain?.name})</option>
                  {domainModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      Module: {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Count Selector */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <label className="font-bold text-slate-700 uppercase tracking-wider">
                    Number of Questions
                  </label>
                  <span className="font-mono text-indigo-600 font-bold">{questionCount} Questions</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      onClick={() => setQuestionCount(num)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        questionCount === num
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['mixed', 'easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`py-2.5 rounded-xl text-xs font-bold border capitalize transition-all cursor-pointer ${
                        difficulty === diff
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  {difficulty === 'mixed' && 'Balanced mix: Recall (Easy) for developing concepts, Application (Medium/Hard) for higher mastery.'}
                  {difficulty === 'easy' && 'Focuses on core definitions, foundational properties, and baseline recall.'}
                  {difficulty === 'medium' && 'Focuses on conceptual invariants, runtime trade-offs, and multi-step reasoning.'}
                  {difficulty === 'hard' && 'Focuses on edge cases, mathematical limits, synthesis, and deep reasoning.'}
                </p>
              </div>

              {/* Time Limit Selector */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <label className="font-bold text-slate-700 uppercase tracking-wider">
                    Time Limit
                  </label>
                  <span className="font-mono text-indigo-600 font-bold">{timeLimitMinutes} Minutes</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 30].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setTimeLimitMinutes(mins)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        timeLimitMinutes === mins
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus on Weak Concepts Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-50/70 border border-purple-200">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-purple-900 flex items-center space-x-1.5">
                    <Brain className="w-3.5 h-3.5 text-purple-700" />
                    <span>Focus on Weak Concepts & Knowledge Gaps</span>
                  </div>
                  <div className="text-[11px] text-purple-600">
                    Heavily prioritize concepts with mastery &lt; 60% or prerequisite bottlenecks
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={focusWeakConcepts}
                    onChange={(e) => setFocusWeakConcepts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                </label>
              </div>

              {/* AVAILABILITY CHECK & GATING */}
              {isLocked ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-800">
                  <div className="flex items-center space-x-2 font-bold">
                    <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Mock Exam Locked</span>
                  </div>
                  <p>{availability.lockedReason || 'Complete the required learning content before attempting this mock exam.'}</p>
                  <button
                    onClick={() => setActiveView('student_modules')}
                    className="mt-1 font-bold text-rose-700 underline flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Go to Modules to complete lessons</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
                  <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{availability?.unlockedReason || 'Content completed! Mock exam is ready.'}</span>
                </div>
              )}

              {/* Start Mock Exam Button */}
              <button
                onClick={handleStartExam}
                disabled={isLocked || generatingExam}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {generatingExam ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Adaptive Exam...</span>
                  </>
                ) : (
                  <>
                    <span>START MOCK EXAM</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Blueprint Preview & Stats Sidebar (1 col) */}
          <div className="space-y-6">
            {/* Exam Blueprint Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Adaptive Blueprint
                </h3>
                <span className="text-[11px] font-mono text-indigo-600 font-bold">
                  {blueprint?.totalQuestions || questionCount} Qs
                </span>
              </div>

              {blueprint?.conceptAllocations && (
                <div className="space-y-2.5">
                  {blueprint.conceptAllocations.map((alloc) => (
                    <div
                      key={alloc.conceptId}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 truncate max-w-[160px]">
                        <div className="font-bold text-slate-800 truncate">{alloc.conceptName}</div>
                        <div className="text-[10px] text-slate-400">
                          Mastery: {(alloc.currentMastery * 100).toFixed(0)}%
                          {alloc.isKnowledgeGap && ' • Gap'}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-indigo-100 text-indigo-700">
                          {alloc.allocatedQuestions} Q
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-tight">
                Allocated dynamically using your current concept mastery, prerequisite readiness, and knowledge gaps.
              </p>
            </div>

            {/* Quick Stats Sidebar */}
            {stats && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Your Exam Record
                </h3>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-lg font-bold text-slate-800 font-mono">
                      {stats.totalExamsAttempted}
                    </div>
                    <div className="text-[10px] text-slate-400">Attempted</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-lg font-bold text-indigo-600 font-mono">
                      {stats.averageScorePercent}%
                    </div>
                    <div className="text-[10px] text-slate-400">Avg Score</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Notes Bridge Modal */}
      {isNotesModalOpen && activeConceptForNotes && (
        <SummaryNotesModal
          isOpen={isNotesModalOpen}
          onClose={() => setIsNotesModalOpen(false)}
          concept={activeConceptForNotes}
          summaryNotes={activeSummaryNotes}
          onSummaryGenerated={(summary) => setActiveSummaryNotes(summary)}
          onAskTutorAboutNote={(topic) => {
            setIsNotesModalOpen(false);
            setActiveConceptForTutor(activeConceptForNotes);
            setIsTutorDrawerOpen(true);
          }}
        />
      )}

      {/* AI Tutor Drawer Modal with full question context */}
      {isTutorDrawerOpen && activeConceptForTutor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-end z-50">
          <div className="bg-white h-full w-full max-w-lg shadow-2xl p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">AI Tutor Consultation</h3>
              </div>
              <button
                onClick={() => setIsTutorDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TutorChat
                concept={activeConceptForTutor}
                currentLearner={currentLearner}
                activeQuestion={activeQuestionForTutor}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
