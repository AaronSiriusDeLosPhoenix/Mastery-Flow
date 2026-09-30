import React from 'react';
import { FlashcardSessionSummary } from '../types.js';
import {
  Award,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Network,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FlashcardSessionSummaryModalProps {
  summary: FlashcardSessionSummary;
  isOpen: boolean;
  onClose: () => void;
  onRestart: () => void;
  onOpenLesson: (lessonId: string) => void;
  onOpenTutor: (conceptId: string, conceptName: string) => void;
  onOpenMindMap: (conceptId: string) => void;
}

export const FlashcardSessionSummaryModal: React.FC<FlashcardSessionSummaryModalProps> = ({
  summary,
  isOpen,
  onClose,
  onRestart,
  onOpenLesson,
  onOpenTutor,
  onOpenMindMap,
}) => {
  if (!isOpen) return null;

  const triggerConfetti = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  React.useEffect(() => {
    triggerConfetti();
  }, []);

  const accuracyPercent =
    summary.cardsReviewed > 0
      ? Math.round((summary.knownCount / summary.cardsReviewed) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md">
              <Award className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Flashcard Session Complete</h2>
              <p className="text-xs sm:text-sm text-blue-100">
                {summary.moduleTitle || summary.subjectTitle} • Active Recall Finished
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6">
          {/* Top Score Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-2xl font-black text-slate-800">{summary.cardsReviewed}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Reviewed</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="text-2xl font-black text-emerald-700">{summary.knownCount}</div>
              <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mt-0.5">Known</div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <div className="text-2xl font-black text-rose-700">{summary.needReviewCount}</div>
              <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider mt-0.5">Need Review</div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <div className="text-2xl font-black text-blue-700">{accuracyPercent}%</div>
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-0.5">Accuracy</div>
            </div>
          </div>

          {/* Concepts Improved Section */}
          {summary.conceptsImproved.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Evidence Model: Concepts Improved</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {summary.conceptsImproved.map((item) => (
                  <div
                    key={item.conceptId}
                    className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between"
                  >
                    <span className="text-xs font-bold text-slate-800 truncate mr-2">{item.conceptName}</span>
                    <div className="flex items-center gap-1.5 text-xs shrink-0">
                      <span className="text-slate-400 font-mono">{item.oldMastery}%</span>
                      <ArrowRight className="w-3 h-3 text-emerald-600" />
                      <span className="font-bold text-emerald-700 font-mono">{item.newMastery}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weak Concepts Detected */}
          {summary.weakConceptsDetected.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Identified Knowledge Gaps</span>
              </div>
              <div className="space-y-2">
                {summary.weakConceptsDetected.map((weak) => (
                  <div
                    key={weak.conceptId}
                    className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-950">{weak.conceptName}</div>
                      <div className="text-xs text-amber-800">{weak.reason}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onClose();
                          onOpenTutor(weak.conceptId, weak.conceptName);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs inline-flex items-center gap-1"
                      >
                        <Bot className="w-3 h-3 text-purple-600" />
                        <span>Ask Tutor</span>
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenMindMap(weak.conceptId);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs inline-flex items-center gap-1"
                      >
                        <Network className="w-3 h-3 text-teal-600" />
                        <span>Mind Map</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adaptive Recommended Next Steps */}
          {summary.recommendedActions.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Recommended Next Actions</span>
              </div>
              <div className="space-y-2">
                {summary.recommendedActions.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900">{action.title}</div>
                      <div className="text-xs text-slate-500">{action.description}</div>
                    </div>
                    <div>
                      {action.actionType === 'open_lesson' && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenLesson(action.targetId);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-1"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      )}
                      {action.actionType === 'ask_tutor' && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenTutor(action.targetId, action.targetName);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>Consult Tutor</span>
                        </button>
                      )}
                      {action.actionType === 'view_mindmap' && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenMindMap(action.targetId);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Network className="w-3.5 h-3.5" />
                          <span>Mind Map</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onRestart}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Practice Deck Again</span>
          </button>

          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
