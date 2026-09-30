import React, { useState, useEffect } from 'react';
import {
  Flashcard,
  FlashcardRecallLevel,
  FlashcardProgress,
  ConceptMastery,
} from '../types.js';
import {
  RotateCw,
  Sparkles,
  Bot,
  FileText,
  BookOpen,
  Network,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Eye,
  Award,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

interface FlashcardDeckProps {
  card: Flashcard;
  progress?: FlashcardProgress;
  conceptMastery?: ConceptMastery;
  currentIndex: number;
  totalCards: number;
  onReview: (cardId: string, level: FlashcardRecallLevel, responseTimeSeconds: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onShuffle?: () => void;
  onOpenLesson: (lessonId: string, conceptId: string) => void;
  onOpenTutor: (card: Flashcard) => void;
  onOpenSummaryNotes: (conceptId: string) => void;
  onOpenMindMap: (conceptId: string) => void;
  isKnowledgeGap?: boolean;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({
  card,
  progress,
  conceptMastery,
  currentIndex,
  totalCards,
  onReview,
  onNext,
  onPrev,
  onShuffle,
  onOpenLesson,
  onOpenTutor,
  onOpenSummaryNotes,
  onOpenMindMap,
  isKnowledgeGap,
}) => {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [reviewedLevel, setReviewedLevel] = useState<FlashcardRecallLevel | null>(null);

  // Reset flip and timer on card change
  useEffect(() => {
    setIsFlipped(false);
    setStartTime(Date.now());
    setReviewedLevel(progress?.lastRecallLevel || null);
  }, [card.id, progress?.lastRecallLevel]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (isFlipped) {
        if (e.key === '1') handleSelectRecall('again');
        if (e.key === '2') handleSelectRecall('hard');
        if (e.key === '3') handleSelectRecall('good');
        if (e.key === '4') handleSelectRecall('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, onNext, onPrev]);

  const handleSelectRecall = (level: FlashcardRecallLevel) => {
    const elapsedSeconds = Math.max(3, Math.round((Date.now() - startTime) / 1000));
    setReviewedLevel(level);
    onReview(card.id, level, elapsedSeconds);
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'easy':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Easy</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 border border-blue-200">Medium</span>;
      case 'hard':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800 border border-purple-200">Hard</span>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
        {type}
      </span>
    );
  };

  const currentMasteryPct = conceptMastery ? Math.round(conceptMastery.mastery * 100) : 0;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Top Deck Navigation & Context Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
        <div className="flex items-center gap-2">
          <span>Card {currentIndex + 1} of {totalCards}</span>
          <span className="text-slate-300">•</span>
          <span className="font-semibold text-slate-700 truncate max-w-xs">{card.conceptName}</span>
          {isKnowledgeGap && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-300 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              Knowledge Gap
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Mastery:</span>
          <span className={`font-bold ${
            currentMasteryPct >= 75 ? 'text-emerald-600' : currentMasteryPct >= 50 ? 'text-blue-600' : 'text-amber-600'
          }`}>
            {currentMasteryPct}%
          </span>
          {onShuffle && (
            <button
              onClick={onShuffle}
              title="Shuffle Cards"
              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors ml-1"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Flashcard Container with Flip Animation */}
      <div
        className="relative min-h-[380px] sm:min-h-[420px] bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden cursor-pointer select-none"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Card Header metadata */}
        <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2 flex-wrap">
            {getTypeBadge(card.type)}
            {getDifficultyBadge(card.difficulty)}
            {card.isAiGenerated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                <Sparkles className="w-3 h-3 text-cyan-600" />
                AI Generated
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <RotateCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Click or press Space to {isFlipped ? 'flip back' : 'reveal answer'}</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-center">
          {!isFlipped ? (
            /* FRONT: Question */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
                <HelpCircle className="w-4 h-4" />
                Question / Active Recall Prompt
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {card.question}
              </h2>

              <p className="text-xs text-slate-400 italic">
                Syllabus Topic: {card.conceptName} • Source: {card.sourceTitle}
              </p>
            </div>
          ) : (
            /* BACK: Answer & Pedagogical Explanation */
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  Authoritative Answer
                </div>
                <div className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 text-emerald-950">
                  {card.answer}
                </div>
              </div>

              {card.explanation && (
                <div className="space-y-1.5 text-sm text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    Explanation & Invariant
                  </div>
                  <p className="leading-relaxed">{card.explanation}</p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
                <span>Source: {card.sourceTitle}</span>
                {progress?.lastReviewedAt && (
                  <span>Last reviewed: {new Date(progress.lastReviewedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card Footer with Connected Phase 1-3 Actions */}
        <div
          className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2"
          onClick={(e) => e.stopPropagation()} // Prevent accidental flip when clicking buttons
        >
          {/* Quick Context Bridges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onOpenLesson(card.lessonId, card.conceptId)}
              title="Open Source Lesson"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Lesson</span>
            </button>

            <button
              onClick={() => onOpenSummaryNotes(card.conceptId)}
              title="View Concept Summary Notes"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Summary</span>
            </button>

            <button
              onClick={() => onOpenMindMap(card.conceptId)}
              title="View in Mind Map DAG"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <Network className="w-3.5 h-3.5 text-teal-600" />
              <span>Mind Map</span>
            </button>

            <button
              onClick={() => onOpenTutor(card)}
              title="Ask AI Tutor with this card as context"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors shadow-2xs"
            >
              <Bot className="w-3.5 h-3.5 text-purple-600" />
              <span>Ask AI Tutor</span>
            </button>
          </div>

          {/* Reveal / Flip toggle button */}
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isFlipped ? 'Show Question' : 'Show Answer'}</span>
          </button>
        </div>
      </div>

      {/* Self-Assessment Recall Ratings (Visible once flipped) */}
      {isFlipped && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Rate your recall level to update Evidence Model & Concept Mastery:</span>
            <span className="text-slate-400 font-mono text-[11px]">Keys [1-4]</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* AGAIN (10 min) */}
            <button
              onClick={() => handleSelectRecall('again')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                reviewedLevel === 'again'
                  ? 'bg-rose-100 border-rose-400 text-rose-900 ring-2 ring-rose-400'
                  : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center gap-1 font-bold text-sm">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Again</span>
              </div>
              <span className="text-[11px] text-rose-600 font-medium">Need Review (&lt;10m)</span>
            </button>

            {/* HARD (1 day) */}
            <button
              onClick={() => handleSelectRecall('hard')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                reviewedLevel === 'hard'
                  ? 'bg-amber-100 border-amber-400 text-amber-900 ring-2 ring-amber-400'
                  : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center gap-1 font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Hard</span>
              </div>
              <span className="text-[11px] text-amber-600 font-medium">Struggled (1 day)</span>
            </button>

            {/* GOOD (3 days) */}
            <button
              onClick={() => handleSelectRecall('good')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                reviewedLevel === 'good'
                  ? 'bg-blue-100 border-blue-400 text-blue-900 ring-2 ring-blue-400'
                  : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-1 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Good</span>
              </div>
              <span className="text-[11px] text-blue-600 font-medium">Known (3 days)</span>
            </button>

            {/* EASY (7 days) */}
            <button
              onClick={() => handleSelectRecall('easy')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                reviewedLevel === 'easy'
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-900 ring-2 ring-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center gap-1 font-bold text-sm">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Easy</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">Mastered (7 days)</span>
            </button>
          </div>
        </div>
      )}

      {/* Prev / Next controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <span className="text-xs font-semibold text-slate-400 font-mono">
          {currentIndex + 1} / {totalCards}
        </span>

        <button
          onClick={onNext}
          disabled={currentIndex === totalCards - 1}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
