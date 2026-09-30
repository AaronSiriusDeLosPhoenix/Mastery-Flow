import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  DomainId,
  Flashcard,
  FlashcardRecallLevel,
  FlashcardSessionSummary,
  FlashcardStats,
  FlashcardDeckAvailability,
  SummaryNote,
} from '../types.js';
import * as api from '../api/client.js';
import { FlashcardDeck } from '../components/FlashcardDeck.js';
import { FlashcardSessionSummaryModal } from '../components/FlashcardSessionSummaryModal.js';
import { FlashcardGeneratorModal } from '../components/FlashcardGeneratorModal.js';
import { SummaryNotesModal } from '../components/SummaryNotesModal.js';
import { TutorChat } from '../components/TutorChat.js';
import {
  Sparkles,
  Layers,
  Award,
  BookOpen,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  Filter,
  Play,
  Bot,
  Network,
  FileText,
  Lock,
  Unlock,
  ChevronRight,
  TrendingUp,
  Brain,
  HelpCircle,
  GraduationCap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const StudentFlashcardsView: React.FC = () => {
  const {
    currentLearner,
    domains,
    activeDomainId,
    setActiveDomainId,
    setActiveLessonId,
    setTargetConceptId,
    setActiveView,
    concepts,
    modules,
    lessons,
    refreshLearner,
    refreshProgress,
  } = useApp();

  // Active filters & selections
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [focusMode, setFocusMode] = useState<
    'all' | 'weak_concepts' | 'knowledge_gaps' | 'due_review' | 'new'
  >('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Deck & stats state
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [availabilities, setAvailabilities] = useState<FlashcardDeckAvailability[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Flashcard Session state
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [sessionCardIds, setSessionCardIds] = useState<string[]>([]);
  const [recallResults, setRecallResults] = useState<Record<string, FlashcardRecallLevel>>({});
  const [conceptMasteryBefore, setConceptMasteryBefore] = useState<Record<string, number>>({});
  const [sessionSummary, setSessionSummary] = useState<FlashcardSessionSummary | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);

  // Modals state
  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);

  // Phase 1 Context Bridges: Summary Notes & AI Tutor
  const [activeConceptForNotes, setActiveConceptForNotes] = useState<any>(null);
  const [activeSummaryNotes, setActiveSummaryNotes] = useState<SummaryNote | null>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState<boolean>(false);

  const [activeConceptForTutor, setActiveConceptForTutor] = useState<any>(null);
  const [isTutorDrawerOpen, setIsTutorDrawerOpen] = useState<boolean>(false);

  const currentDomain = domains.find((d) => d.id === activeDomainId) || domains[0];
  const domainModules = modules.filter((m) => m.domainId === activeDomainId);

  // Load Data
  const loadData = async () => {
    if (!currentLearner) return;
    try {
      setLoading(true);
      setError(null);

      const [statsData, availData, deckData] = await Promise.all([
        api.fetchFlashcardStats(currentLearner.id, activeDomainId),
        api.fetchFlashcardAvailability(currentLearner.id, activeDomainId),
        api.fetchFlashcards({
          learnerId: currentLearner.id,
          subjectId: activeDomainId,
          moduleId: selectedModuleId !== 'all' ? selectedModuleId : undefined,
          focusMode,
          limit: 40,
        }),
      ]);

      setStats(statsData);
      setAvailabilities(availData);
      setCards(deckData.cards);
    } catch (err: any) {
      console.error('Failed to load flashcard data:', err);
      setError(err.message || 'Error loading flashcards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentLearner?.id, activeDomainId, selectedModuleId, focusMode]);

  // Start Flashcard Session
  const handleStartSession = () => {
    if (cards.length === 0) return;

    // Snapshot concept masteries before session
    const snapshot: Record<string, number> = {};
    if (currentLearner) {
      for (const card of cards) {
        const m = currentLearner.conceptMasteries[card.conceptId];
        snapshot[card.conceptId] = m ? m.mastery : 0;
      }
    }

    setConceptMasteryBefore(snapshot);
    setRecallResults({});
    setSessionCardIds(cards.map((c) => c.id));
    setCurrentCardIndex(0);
    setIsSessionActive(true);
  };

  // Record Flashcard Review
  const handleReviewCard = async (
    cardId: string,
    level: FlashcardRecallLevel,
    responseTimeSeconds: number
  ) => {
    if (!currentLearner) return;

    setRecallResults((prev) => ({ ...prev, [cardId]: level }));

    try {
      const res = await api.recordFlashcardReview({
        learnerId: currentLearner.id,
        flashcardId: cardId,
        recallLevel: level,
        responseTimeSeconds,
      });

      // Refresh learner profile & progress in AppContext so masteries update globally
      refreshLearner();
      refreshProgress();

      // If last card reviewed, complete the session
      if (currentCardIndex === cards.length - 1) {
        const updatedRecall = { ...recallResults, [cardId]: level };
        await handleFinishSession(updatedRecall);
      }
    } catch (err) {
      console.error('Failed to record flashcard review:', err);
    }
  };

  // Complete session & open summary modal
  const handleFinishSession = async (finalRecallResults?: Record<string, FlashcardRecallLevel>) => {
    if (!currentLearner) return;

    try {
      const activeModule = domainModules.find((m) => m.id === selectedModuleId);
      const summary = await api.completeFlashcardSession({
        sessionId: `sess_fc_${Date.now()}`,
        learnerId: currentLearner.id,
        subjectId: activeDomainId,
        moduleTitle: activeModule?.title,
        reviewedCardIds: sessionCardIds,
        recallResults: finalRecallResults || recallResults,
        conceptMasteryBefore,
      });

      setSessionSummary(summary);
      setIsSummaryModalOpen(true);
      setIsSessionActive(false);

      // Refresh deck stats
      loadData();
    } catch (err) {
      console.error('Failed to complete flashcard session:', err);
    }
  };

  // Navigation handlers
  const handleNextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      handleFinishSession();
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
    }
  };

  const handleShuffleCards = () => {
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
    setCurrentCardIndex(0);
  };

  // Context Bridge 1: Open Lesson in StudentLearn
  const handleOpenLesson = (lessonId: string, conceptId?: string) => {
    if (lessonId) setActiveLessonId(lessonId);
    if (conceptId) setTargetConceptId(conceptId);
    setActiveView('student_learn');
  };

  // Context Bridge 2: Open Summary Notes Modal
  const handleOpenSummaryNotes = async (conceptId: string) => {
    const cObj = concepts.find((c) => c.id === conceptId);
    if (!cObj) return;

    setActiveConceptForNotes(cObj);
    try {
      const summary = await api.fetchSummaryNotes(conceptId);
      setActiveSummaryNotes(summary);
    } catch {
      setActiveSummaryNotes(null);
    }
    setIsNotesModalOpen(true);
  };

  // Context Bridge 3: Open AI Tutor with Flashcard context
  const handleOpenTutorForCard = (card: Flashcard) => {
    const cObj = concepts.find((c) => c.id === card.conceptId);
    if (!cObj) return;

    setActiveConceptForTutor({
      ...cObj,
      flashcardContext: {
        question: card.question,
        answer: card.answer,
        type: card.type,
      },
    });
    setIsTutorDrawerOpen(true);
  };

  // Context Bridge 4: Open Concept in Mind Map
  const handleOpenMindMap = (conceptId: string) => {
    setTargetConceptId(conceptId);
    setActiveView('student_mindmap');
  };

  // Filtered cards for the bottom explorer grid
  const filteredGridCards = cards.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.question.toLowerCase().includes(query) ||
      c.answer.toLowerCase().includes(query) ||
      c.conceptName.toLowerCase().includes(query) ||
      c.type.toLowerCase().includes(query)
    );
  });

  const activeCard = cards[currentCardIndex];
  const activeCardMastery = activeCard && currentLearner
    ? currentLearner.conceptMasteries[activeCard.conceptId]
    : undefined;

  // Check overall module availability
  const currentModuleAvailability =
    selectedModuleId !== 'all'
      ? availabilities.find((a) => a.moduleId === selectedModuleId)
      : undefined;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              <Brain className="w-3.5 h-3.5 text-indigo-600" />
              Phase 4 Active Recall
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-600">
              Adaptive Spaced Repetition Engine
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            AI-Powered Adaptive Flashcards
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Syllabus-grounded flashcards dynamically prioritized by your Knowledge Gaps, Concept Mastery, and Evidence Model signals.
          </p>
        </div>

        {/* Subject Track & Action controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500">Subject:</span>
            <select
              value={activeDomainId}
              onChange={(e) => setActiveDomainId(e.target.value as DomainId)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsGeneratorOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span>Generate AI Cards</span>
          </button>

          <button
            onClick={() => setActiveView('student_mock_exam')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Take Mock Exam</span>
          </button>
        </div>
      </div>

      {/* Availability Banner based on Lesson Completion */}
      {currentModuleAvailability && !currentModuleAvailability.isAvailable && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold">Module Locked for Active Recall</div>
              <div className="text-xs text-amber-800">{currentModuleAvailability.lockedReason}</div>
            </div>
          </div>

          <button
            onClick={() => setActiveView('student_modules')}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors shrink-0 inline-flex items-center gap-1.5 shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Complete Lessons</span>
          </button>
        </div>
      )}

      {/* Top Flashcard Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Available</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalAvailable}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Syllabus Cards</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Reviewed</span>
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-indigo-700 mt-1">{stats.totalReviewed}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Attempted</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-amber-300 transition-colors"
               onClick={() => setFocusMode('weak_concepts')}>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Need Review</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.needReviewCount}</div>
            <div className="text-[11px] text-amber-700 font-semibold mt-0.5">Practice Weak</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Mastered</span>
              <Award className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.masteredCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Retention High</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-blue-300 transition-colors"
               onClick={() => setFocusMode('due_review')}>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Due Today</span>
              <Clock className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="text-2xl font-black text-cyan-600 mt-1">{stats.dueTodayCount}</div>
            <div className="text-[11px] text-cyan-700 font-semibold mt-0.5">Spaced Interval</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Avg Mastery</span>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black text-purple-700 mt-1">{stats.averageMastery}%</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Domain Evidence</div>
          </div>
        </div>
      )}

      {/* Module Selector & Focus Mode Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Module filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedModuleId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              selectedModuleId === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Entire Subject ({cards.length})
          </button>

          {domainModules.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModuleId(m.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                selectedModuleId === m.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m.title}
            </button>
          ))}
        </div>

        {/* Adaptive Focus Mode Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setFocusMode('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              focusMode === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFocusMode('weak_concepts')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              focusMode === 'weak_concepts' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Weak Concepts
          </button>
          <button
            onClick={() => setFocusMode('knowledge_gaps')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              focusMode === 'knowledge_gaps' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Knowledge Gaps
          </button>
          <button
            onClick={() => setFocusMode('due_review')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              focusMode === 'due_review' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Due Today
          </button>
        </div>
      </div>

      {/* Active Recall Player or Session Start Preview */}
      {isSessionActive && activeCard ? (
        <div className="space-y-4">
          {/* Active Session Top Bar */}
          <div className="flex items-center justify-between bg-white p-3.5 px-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Active Session: {domainModules.find((m) => m.id === selectedModuleId)?.title || currentDomain.name}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.round(((currentCardIndex + 1) / cards.length) * 100)}%` }}
                />
              </div>

              <button
                onClick={() => handleFinishSession()}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
              >
                End Session
              </button>
            </div>
          </div>

          {/* Flashcard Component */}
          <FlashcardDeck
            card={activeCard}
            currentIndex={currentCardIndex}
            totalCards={cards.length}
            conceptMastery={activeCardMastery}
            onReview={handleReviewCard}
            onNext={handleNextCard}
            onPrev={handlePrevCard}
            onShuffle={handleShuffleCards}
            onOpenLesson={handleOpenLesson}
            onOpenSummaryNotes={handleOpenSummaryNotes}
            onOpenTutor={handleOpenTutorForCard}
            onOpenMindMap={handleOpenMindMap}
          />
        </div>
      ) : (
        /* Preview / Launch Session Screen */
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-6 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <Brain className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-900">
              {cards.length > 0 ? 'Ready for Active Recall' : 'No Cards Found'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {cards.length > 0
                ? `You have ${cards.length} prioritized cards ready in '${selectedModuleId !== 'all' ? domainModules.find((m) => m.id === selectedModuleId)?.title : currentDomain.name}'. Test yourself and update concept mastery.`
                : 'No flashcards match this filter. Complete required lessons or generate new cards using the AI tool above.'}
            </p>
          </div>

          {cards.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleStartSession}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Flashcard Session ({cards.length} Cards)</span>
              </button>

              <button
                onClick={() => {
                  setFocusMode('weak_concepts');
                  handleStartSession();
                }}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl text-sm font-semibold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Practice Weak Concepts</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Cards</span>
            </button>
          )}
        </div>
      )}

      {/* Bottom Deck Explorer & Grid Browser */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-slate-900">Flashcard Deck Browser</h3>
            <p className="text-xs text-slate-500">
              Inspect questions, explanations, formulas, and verified syllabus references.
            </p>
          </div>

          {/* Search filter */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search concepts, questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredGridCards.map((c, idx) => (
            <div
              key={c.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-600 truncate max-w-[160px]">
                    {c.conceptName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                    {c.type}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-900 leading-snug line-clamp-3">
                  {c.question}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                  {c.sourceTitle}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setCurrentCardIndex(idx);
                      setIsSessionActive(true);
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Practice
                  </button>
                  <button
                    onClick={() => handleOpenSummaryNotes(c.conceptId)}
                    title="Summary Notes"
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenTutorForCard(c)}
                    title="AI Tutor"
                    className="p-1 text-purple-500 hover:text-purple-700 rounded transition-colors"
                  >
                    <Bot className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {sessionSummary && (
        <FlashcardSessionSummaryModal
          isOpen={isSummaryModalOpen}
          summary={sessionSummary}
          onClose={() => setIsSummaryModalOpen(false)}
          onRestart={() => {
            setIsSummaryModalOpen(false);
            handleStartSession();
          }}
          onOpenLesson={handleOpenLesson}
          onOpenTutor={(cId, cName) => {
            setIsSummaryModalOpen(false);
            const cObj = concepts.find((c) => c.id === cId);
            if (cObj) {
              setActiveConceptForTutor(cObj);
              setIsTutorDrawerOpen(true);
            }
          }}
          onOpenMindMap={(cId) => {
            setIsSummaryModalOpen(false);
            handleOpenMindMap(cId);
          }}
        />
      )}

      {isGeneratorOpen && (
        <FlashcardGeneratorModal
          isOpen={isGeneratorOpen}
          onClose={() => setIsGeneratorOpen(false)}
          subjectId={activeDomainId}
          modules={domainModules}
          lessons={lessons.filter((l) => l.domainId === activeDomainId)}
          concepts={concepts.filter((c) => c.domainId === activeDomainId)}
          learnerId={currentLearner?.id}
          onSuccess={(count) => {
            loadData();
          }}
        />
      )}

      {/* Phase 1 Summary Notes Modal */}
      {isNotesModalOpen && activeConceptForNotes && (
        <SummaryNotesModal
          isOpen={isNotesModalOpen}
          onClose={() => setIsNotesModalOpen(false)}
          concept={activeConceptForNotes}
          summaryNotes={activeSummaryNotes}
          onSummaryGenerated={(newSummary: SummaryNote) => setActiveSummaryNotes(newSummary)}
          onAskTutorAboutNote={() => {
            setIsNotesModalOpen(false);
            setActiveConceptForTutor(activeConceptForNotes);
            setIsTutorDrawerOpen(true);
          }}
        />
      )}

      {/* Phase 1 Context-Aware AI Tutor Drawer */}
      {isTutorDrawerOpen && activeConceptForTutor && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-xs font-bold text-slate-800">
                  AI Learning Tutor
                </div>
                <div className="text-[11px] text-slate-500">
                  Concept: {activeConceptForTutor.name}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsTutorDrawerOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden p-2">
            <TutorChat
              concept={activeConceptForTutor}
              currentLearner={currentLearner}
            />
          </div>
        </div>
      )}
    </div>
  );
};
