import React, { useState } from 'react';
import { DomainId, Module, Lesson, Concept } from '../types.js';
import * as api from '../api/client.js';
import {
  Sparkles,
  Bot,
  Layers,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface FlashcardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: DomainId;
  modules: Module[];
  lessons: Lesson[];
  concepts: Concept[];
  learnerId?: string;
  onSuccess: (count: number) => void;
}

export const FlashcardGeneratorModal: React.FC<FlashcardGeneratorModalProps> = ({
  isOpen,
  onClose,
  subjectId,
  modules,
  lessons,
  concepts,
  learnerId,
  onSuccess,
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    modules[0]?.id || ''
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [selectedConceptId, setSelectedConceptId] = useState<string>('');
  const [cardCount, setCardCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [focusWeakConcepts, setFocusWeakConcepts] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredLessons = lessons.filter((l) => l.moduleId === selectedModuleId);
  const filteredConcepts = concepts.filter((c) => c.domainId === subjectId);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.generateAiFlashcards({
        subjectId,
        moduleId: selectedModuleId,
        lessonId: selectedLessonId || undefined,
        conceptId: selectedConceptId || undefined,
        count: cardCount,
        difficulty,
        focusWeakConcepts,
        learnerId,
      });

      onSuccess(res.count);
      onClose();
    } catch (err: any) {
      console.error('Failed to generate AI flashcards:', err);
      setError(err.message || 'Error generating AI flashcards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Generate AI Flashcards</h2>
              <p className="text-xs text-blue-100">
                Grounded in syllabus lessons, definitions & summary notes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grounding Notice */}
        <div className="bg-blue-50/80 px-6 py-3 border-b border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>Syllabus Grounding Guarantee:</strong> Generated cards extract strictly from authoritative lesson descriptions, summary notes, and concept invariants. Duplicate questions are automatically prevented.
          </span>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Module Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Target Module
            </label>
            <select
              value={selectedModuleId}
              onChange={(e) => {
                setSelectedModuleId(e.target.value);
                setSelectedLessonId('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code ? `[${m.code}] ` : ''}{m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Select (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Target Lesson (Optional)
            </label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Lessons in this Module</option>
              {filteredLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty & Count */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Card Count
              </label>
              <select
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3 Cards (Quick)</option>
                <option value={5}>5 Cards (Standard)</option>
                <option value={10}>10 Cards (Deep)</option>
                <option value={15}>15 Cards (Comprehensive)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">Easy (Fundamentals)</option>
                <option value="medium">Medium (Standard Exam)</option>
                <option value="hard">Hard (Advanced Invariants)</option>
              </select>
            </div>
          </div>

          {/* Focus on Weak Concepts Checkbox */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
            <input
              type="checkbox"
              checked={focusWeakConcepts}
              onChange={(e) => setFocusWeakConcepts(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-semibold text-slate-700">
              Prioritize Weak Concepts & Knowledge Gaps
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-2xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Cards...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Generate Cards</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
