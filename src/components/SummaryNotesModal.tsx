import React, { useState } from 'react';
import { SummaryNote, Concept, LearningResource } from '../types.js';
import * as api from '../api/client.js';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  HelpCircle,
  X,
  Bot,
  Layers,
  Code,
  Tag,
  Lightbulb,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Bookmark,
  Share2,
} from 'lucide-react';

interface SummaryNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  concept: Concept;
  activeResource?: LearningResource | null;
  summaryNotes: SummaryNote | null;
  onSummaryGenerated: (summary: SummaryNote) => void;
  onAskTutorAboutNote: (topic?: string) => void;
}

export const SummaryNotesModal: React.FC<SummaryNotesModalProps> = ({
  isOpen,
  onClose,
  concept,
  activeResource,
  summaryNotes,
  onSummaryGenerated,
  onAskTutorAboutNote,
}) => {
  const [generating, setGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'structured' | 'markdown'>('structured');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateSummary = async () => {
    try {
      setGenerating(true);
      setError(null);
      const res = await api.generateSummaryNotes({
        conceptId: concept.id,
        resourceId: activeResource?.id,
        readingLevel: 'undergraduate',
        language: 'en',
      });
      if (res.summary) {
        onSummaryGenerated(res.summary);
      }
    } catch (err: any) {
      console.error('Summary generation error:', err);
      setError(err.message || 'Failed to generate summary notes');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!summaryNotes) return;
    navigator.clipboard.writeText(summaryNotes.rawMarkdown || summaryNotes.overview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">AI Structured Summary Notes</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-semibold">
                  {concept.code}
                </span>
                {summaryNotes?.isAIGenerated && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold">
                    AI Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Topic: <strong className="text-white">{concept.name}</strong> • Source: {activeResource?.title || 'Core Syllabus Material'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {summaryNotes && (
              <button
                onClick={handleCopyToClipboard}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Notes</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={handleGenerateSummary}
                className="font-bold underline ml-2 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {!summaryNotes && !generating ? (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  No Summary Notes Generated Yet
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Generate structured revision notes derived directly from the official lesson material for <strong className="text-indigo-950 font-semibold">{concept.name}</strong>.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left w-full text-xs text-slate-600 space-y-1.5">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Summary will include:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <span>• 1. Executive Overview</span>
                  <span>• 2. Key Concepts</span>
                  <span>• 3. Official Definitions</span>
                  <span>• 4. Core Points</span>
                  <span>• 5. Real-World Examples</span>
                  <span>• 6. Formulas / Invariants</span>
                  <span className="col-span-2">• 7. High-Yield Takeaways</span>
                </div>
              </div>

              <button
                onClick={handleGenerateSummary}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Generate Summary Notes with AI</span>
              </button>
            </div>
          ) : generating ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <div className="text-center space-y-1">
                <span className="text-sm font-bold text-slate-800 block">
                  Synthesizing Learning Material...
                </span>
                <span className="text-xs text-slate-400">
                  Extracting key definitions, examples, formulas, and takeaways
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tab selector & Actions */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('structured')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'structured'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Structured View
                  </button>
                  <button
                    onClick={() => setActiveTab('markdown')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'markdown'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Markdown Raw
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      onAskTutorAboutNote('summary notes');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5 text-purple-600" />
                    <span>Ask AI Tutor About These Notes</span>
                  </button>

                  <button
                    onClick={handleGenerateSummary}
                    title="Regenerate notes"
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              {activeTab === 'markdown' ? (
                <div className="p-5 bg-slate-950 text-slate-200 rounded-2xl font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner border border-slate-800">
                  {summaryNotes?.rawMarkdown}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 1. Overview */}
                  <section className="bg-gradient-to-br from-indigo-50/70 to-purple-50/40 p-5 rounded-2xl border border-indigo-100/80 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                        1
                      </span>
                      <h3 className="font-bold text-sm text-indigo-950">Executive Overview</h3>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {summaryNotes?.overview}
                    </p>
                  </section>

                  {/* 2. Key Concepts */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                        2
                      </span>
                      <h3 className="font-bold text-sm text-slate-900">Key Concepts</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {summaryNotes?.keyConcepts.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1 hover:border-indigo-300 transition-colors"
                        >
                          <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                            {item.term}
                          </span>
                          <p className="text-xs text-slate-600 leading-relaxed">{item.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 3. Important Definitions */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                        3
                      </span>
                      <h3 className="font-bold text-sm text-slate-900">Important Definitions & Terminology</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {summaryNotes?.importantDefinitions.map((item, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                          <span className="font-bold text-xs text-slate-900 block truncate">
                            {item.term}
                          </span>
                          <p className="text-xs text-slate-600 leading-relaxed">{item.definition}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 4. Key Points */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                        4
                      </span>
                      <h3 className="font-bold text-sm text-slate-900">Core Points & Invariants</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                      <ul className="space-y-2 text-xs text-slate-700">
                        {summaryNotes?.keyPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  {/* 5. Examples & Case Studies */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                        5
                      </span>
                      <h3 className="font-bold text-sm text-slate-900">Examples & Practical Case Studies</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {summaryNotes?.examples.map((ex, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                          <span className="font-bold text-xs text-slate-900 block">{ex.scenario}</span>
                          <p className="text-xs text-slate-600 leading-relaxed">{ex.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 6. Formulas / Invariants / Complexity */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                        6
                      </span>
                      <h3 className="font-bold text-sm text-slate-900">Formulas, Boundary Traps & Complexity Bounds</h3>
                    </div>
                    <div className="space-y-2">
                      {summaryNotes?.formulasAndInvariants.map((f, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-800"
                        >
                          <span className="text-amber-300 font-bold">{f.formula}</span>
                          <span className="text-slate-400 font-sans text-[11px]">{f.explanation}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 7. Important Takeaways */}
                  <section className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <span className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                        7
                      </span>
                      <span>High-Yield Revision Takeaways</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {summaryNotes?.takeaways.map((t, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Notes auto-saved for {concept.name}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl cursor-pointer"
          >
            Close Notes
          </button>
        </div>
      </div>
    </div>
  );
};
