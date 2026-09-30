import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Plus,
  BookOpen,
  Building2,
  HelpCircle,
  Brain,
  Award,
  ChevronDown,
  Layers,
  Code,
  FileCheck,
} from 'lucide-react';
import { BloomLevel, Question, QuestionFormat } from '../types.js';
import * as api from '../api/client.js';

export const TeacherApprovalLab: React.FC = () => {
  const { concepts, institutions, activeInstitutionId } = useApp();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // New question form state
  const [newConceptId, setNewConceptId] = useState<string>('arrays');
  const [newFormat, setNewFormat] = useState<QuestionFormat>('MCQ');
  const [newBloom, setNewBloom] = useState<BloomLevel>('Apply');
  const [newDifficulty, setNewDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [newExplanation, setNewExplanation] = useState<string>('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '', '', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState<number>(0);
  const [newCodeSnippet, setNewCodeSnippet] = useState<string>('');

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const res = await api.fetchDatabaseSnapshot();
      const qTable = res.tables.find((t) => t.name === 'Question');
      if (qTable) {
        setQuestions(qTable.records);
      }
    } catch (err) {
      console.error('Error loading questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleApprove = async (questionId: string, isApproved: boolean) => {
    try {
      await api.approveQuestion({
        questionId,
        teacherId: 'teacher_vance',
        isApproved,
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, evaluationStatus: isApproved ? 'APPROVED' : 'REJECTED' }
            : q
        )
      );
    } catch (err) {
      console.error('Error updating approval status:', err);
    }
  };

  const handleRunEvaluation = async (questionId: string) => {
    try {
      setEvaluatingId(questionId);
      const report = await api.evaluateQuestion({ questionId });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                aiEvaluation: report,
                evaluationStatus: report.autoApproved ? 'APPROVED' : q.evaluationStatus,
              }
            : q
        )
      );
    } catch (err) {
      console.error('Error running automatic evaluation:', err);
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleCreateAndEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    try {
      setLoading(true);
      const res = await api.createQuestion({
        conceptId: newConceptId,
        questionText: newQuestionText,
        questionFormat: newFormat,
        bloomLevel: newBloom,
        difficulty: newDifficulty,
        options: newOptions.filter((o) => o.trim().length > 0),
        correctOptionIndex: newCorrectIndex,
        explanation: newExplanation,
        codeSnippet: newCodeSnippet || undefined,
        institutionStyleId: activeInstitutionId,
      });

      setQuestions((prev) => [res.question, ...prev]);
      setIsCreateModalOpen(false);
      // Reset form
      setNewQuestionText('');
      setNewExplanation('');
      setNewOptions(['', '', '', '']);
    } catch (err) {
      console.error('Error creating question:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingQuestions = questions.filter((q) => q.evaluationStatus === 'PENDING_APPROVAL');
  const approvedQuestions = questions.filter((q) => q.evaluationStatus === 'APPROVED');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Automatic Evaluation & Teacher Approval Lab
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Human-in-the-Loop QA
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                AI evaluates factual validity, Bloom's cognitive alignment, distractor quality, and institutional style before faculty approve items into the live adaptive curriculum.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Draft & Auto-Evaluate</span>
          </button>
          <button
            onClick={loadQuestions}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer"
            title="Refresh questions list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Pending Review</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingQuestions.length}</div>
          <span className="text-[11px] text-amber-700">Awaiting faculty signature</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Approved to Live Pool</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{approvedQuestions.length}</div>
          <span className="text-[11px] text-emerald-700">Actively served in sessions</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Auto-Approve Threshold</span>
          <div className="text-2xl font-bold text-indigo-600 mt-1">≥ 85%</div>
          <span className="text-[11px] text-slate-500">Multidimensional rubric score</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Active Style Guide</span>
          <div className="text-sm font-bold text-slate-900 mt-1 truncate">
            {institutions.find((i) => i.id === activeInstitutionId)?.name || 'MIT EECS'}
          </div>
          <span className="text-[11px] text-indigo-600 font-mono">Formal Asymptotic</span>
        </div>
      </div>

      {/* Section 1: Pending Approval Questions Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Pending Evaluation & Approval Queue</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {pendingQuestions.length} items
            </span>
          </h2>
          <span className="text-xs text-slate-500">
            Review AI pre-evaluations before approving items for student practice
          </span>
        </div>

        {pendingQuestions.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">All questions reviewed!</h3>
            <p className="text-xs text-slate-500">
              There are no pending items requiring teacher intervention right now.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingQuestions.map((q) => {
              const evalReport = q.aiEvaluation;
              const isEvaluating = evaluatingId === q.id;

              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden"
                >
                  <div className="p-5 space-y-4">
                    {/* Top Row: Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 uppercase tracking-wide">
                          {q.conceptId}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {q.questionFormat || 'MCQ'}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Bloom: {q.bloomLevel || 'Understand'}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {q.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">ID: {q.id}</span>
                      </div>
                    </div>

                    {/* Question text */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{q.questionText}</h3>
                      {q.codeSnippet && (
                        <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto">
                          <code>{q.codeSnippet}</code>
                        </pre>
                      )}
                    </div>

                    {/* Options Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options?.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                            oIdx === q.correctOptionIndex
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="font-mono text-[10px] uppercase font-bold text-slate-400">
                            {String.fromCharCode(65 + oIdx)}.
                          </span>
                          <span className="flex-1">{opt}</span>
                          {oIdx === q.correctOptionIndex && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-800 font-bold uppercase">
                              Key
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* AI Automated Evaluation Report Card */}
                    {evalReport ? (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                              Automatic AI Pre-Evaluation Rubric
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">Rubric Score:</span>
                            <span
                              className={`text-sm font-bold font-mono px-2 py-0.5 rounded-md ${
                                evalReport.overallScore >= 85
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : evalReport.overallScore >= 70
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {evalReport.overallScore}/100
                            </span>
                          </div>
                        </div>

                        {/* Breakdown Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                            <div className="flex justify-between font-semibold text-slate-700">
                              <span>Factual Accuracy</span>
                              <span className="text-indigo-600">{evalReport.factualAccuracy?.score}%</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                              {evalReport.factualAccuracy?.rationale}
                            </p>
                          </div>

                          <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                            <div className="flex justify-between font-semibold text-slate-700">
                              <span>Bloom's Alignment</span>
                              <span className="text-purple-600">{evalReport.bloomAlignment?.score}%</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                              Detected: {evalReport.bloomAlignment?.detectedLevel} ({evalReport.bloomAlignment?.rationale})
                            </p>
                          </div>

                          <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                            <div className="flex justify-between font-semibold text-slate-700">
                              <span>Style Guide Match</span>
                              <span className="text-emerald-600">{evalReport.styleGuideCompliance?.score}%</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                              {evalReport.styleGuideCompliance?.rationale}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 rounded-lg text-amber-800 text-xs flex items-center justify-between">
                        <span>Awaiting automatic AI quality evaluation.</span>
                        <button
                          onClick={() => handleRunEvaluation(q.id)}
                          disabled={isEvaluating}
                          className="px-3 py-1 bg-amber-600 text-white rounded font-semibold cursor-pointer"
                        >
                          {isEvaluating ? 'Evaluating...' : 'Run Auto-Evaluation'}
                        </button>
                      </div>
                    )}

                    {/* Teacher Action Row */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                      <button
                        onClick={() => handleRunEvaluation(q.id)}
                        disabled={isEvaluating}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
                        <span>Re-Evaluate with AI</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(q.id, false)}
                          className="px-3.5 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleApprove(q.id, true)}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve to Live Pool</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Live Approved Curriculum Items */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span>Active Approved Question Bank</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            {approvedQuestions.length} items
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approvedQuestions.map((q) => (
            <div key={q.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-600 uppercase">{q.conceptId}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                  Approved
                </span>
              </div>
              <h4 className="text-xs font-semibold text-slate-800 line-clamp-2">{q.questionText}</h4>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span>Format: {q.questionFormat}</span>
                <span>• Bloom: {q.bloomLevel}</span>
                <span>• Diff: {q.difficulty}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Draft & Auto-Evaluate Question */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900 text-sm">
                  Draft Assessment Item with Automatic Quality Evaluation
                </span>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1 rounded bg-slate-200/60 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateAndEvaluate} className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Concept</label>
                  <select
                    value={newConceptId}
                    onChange={(e) => setNewConceptId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {concepts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Question Format</label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value as QuestionFormat)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="CODE_OUTPUT">Code Output</option>
                    <option value="DEBUG_BUG">Debug Bug</option>
                    <option value="FILL_BLANK">Fill Blank</option>
                    <option value="COMPLEXITY_TRADE_OFF">Complexity Trade-off</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bloom's Level</label>
                  <select
                    value={newBloom}
                    onChange={(e) => setNewBloom(e.target.value as BloomLevel)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Remember">Remember</option>
                    <option value="Understand">Understand</option>
                    <option value="Apply">Apply</option>
                    <option value="Analyze">Analyze</option>
                    <option value="Evaluate">Evaluate</option>
                    <option value="Create">Create</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Difficulty</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Question Prompt / Scenario</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter the problem statement or question prompt..."
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {(newFormat === 'CODE_OUTPUT' || newFormat === 'DEBUG_BUG') && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Code Snippet</label>
                  <textarea
                    rows={4}
                    placeholder="Enter code snippet..."
                    value={newCodeSnippet}
                    onChange={(e) => setNewCodeSnippet(e.target.value)}
                    className="w-full p-2.5 font-mono text-xs border border-slate-200 rounded-lg bg-slate-900 text-emerald-300"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Options (Select Correct Key)</label>
                <div className="space-y-2">
                  {newOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={newCorrectIndex === idx}
                        onChange={() => setNewCorrectIndex(idx)}
                        className="cursor-pointer"
                      />
                      <input
                        type="text"
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...newOptions];
                          updated[idx] = e.target.value;
                          setNewOptions(updated);
                        }}
                        className="flex-1 p-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pedagogical Explanation</label>
                <textarea
                  rows={2}
                  placeholder="Explain why the correct answer holds and common misconceptions..."
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
                >
                  {loading ? 'Evaluating Quality...' : 'Run Auto-Evaluation & Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
