import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { MetricCard } from '../components/MetricCard.js';
import {
  Brain,
  Clock,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  ChevronLeft,
  Calendar,
  Sparkles,
  GraduationCap,
  FileText,
  Cpu,
  Compass,
  Lock,
} from 'lucide-react';
import { TeacherOverrideModal } from '../components/TeacherOverrideModal.js';
import { MockExamSession, PersonalizedRoadmapData } from '../types.js';
import * as api from '../api/client.js';

export const TeacherStudentDetail: React.FC = () => {
  const {
    allLearners,
    targetTeacherStudentId,
    setTargetTeacherStudentId,
    concepts,
    setActiveView,
    setIsProgressReportModalOpen,
  } = useApp();

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [examHistory, setExamHistory] = useState<MockExamSession[]>([]);
  const [predictions, setPredictions] = useState<import('../types.js').MLPredictionRecord[]>([]);
  const [recommendations, setRecommendations] = useState<import('../types.js').MLRecommendationRecord[]>([]);
  const [studentRoadmap, setStudentRoadmap] = useState<PersonalizedRoadmapData | null>(null);

  const learner = allLearners.find((l) => l.id === targetTeacherStudentId) || allLearners[0];

  React.useEffect(() => {
    if (learner) {
      api.fetchRoadmap(learner.id, undefined, 'TEACHER')
        .then(setStudentRoadmap)
        .catch(() => setStudentRoadmap(null));

      api.fetchMockExamHistory(learner.id)
        .then(setExamHistory)
        .catch(() => setExamHistory([]));

      api.fetchLearnerPredictions(learner.id)
        .then((res) => {
          if (res.success) setPredictions(res.predictions || []);
        })
        .catch(() => setPredictions([]));

      api.fetchLearnerRecommendationOutcomes(learner.id)
        .then((res) => {
          if (res.success) setRecommendations(res.recommendations || []);
        })
        .catch(() => setRecommendations([]));
    }
  }, [learner?.id]);

  if (!learner) {
    return (
      <div className="p-8 text-center text-slate-500">
        No learner selected for faculty inspection.
      </div>
    );
  }

  const handleFetchAiAdvice = async () => {
    try {
      setLoadingAi(true);
      const res = await api.fetchAIExplanation({
        conceptName: learner.currentRecommendation?.conceptName || 'Data Structures',
        promptType: 'teacher_advice',
        context: `Student overall mastery: ${(learner.overallMastery * 100).toFixed(0)}%, uncertainty: ${(learner.overallUncertainty * 100).toFixed(0)}%, recommendation: ${learner.currentRecommendation?.action}`,
      });
      setAiAdvice(res.text);
    } catch (err) {
      console.error('Failed to get teacher advice:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      
      {/* Top Bar with Back Link */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveView('teacher_dashboard')}
          className="flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Cohort Overview</span>
        </button>

        {/* Student Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-bold">Inspect Student:</span>
          <select
            value={learner.id}
            onChange={(e) => setTargetTeacherStudentId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer focus:ring-2 focus:ring-blue-500"
          >
            {allLearners.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Student Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <img
            src={learner.avatar}
            alt={learner.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-slate-900">{learner.name}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {learner.cohort}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{learner.email}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsProgressReportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
            title="Generate and print official student academic progress report"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Official Progress Report</span>
          </button>
          <button
            onClick={handleFetchAiAdvice}
            disabled={loadingAi}
            className="px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition cursor-pointer flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{loadingAi ? 'Consulting...' : 'AI Pedagogical Strategy'}</span>
          </button>
          <button
            onClick={() => setIsOverrideModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center space-x-1.5"
          >
            <UserCheck className="w-4 h-4" />
            <span>Override System Recommendation</span>
          </button>
        </div>
      </div>

      {/* AI Pedagogical Advisor Note if loaded */}
      {aiAdvice && (
        <div className="p-4 bg-white rounded-2xl border border-blue-200 text-xs text-slate-800 space-y-1.5 shadow-2xs">
          <div className="flex items-center space-x-2 font-bold text-blue-700 text-[11px] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>AI Clinical Intervention Advisory (Gemini)</span>
          </div>
          <p className="leading-relaxed">{aiAdvice}</p>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Overall Multi-Signal Mastery"
          value={`${(learner.overallMastery * 100).toFixed(0)}%`}
          subtitle="Weighted across all concept evidence"
          icon={Brain}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Memory Retention Score"
          value={`${(learner.overallRetention * 100).toFixed(0)}%`}
          subtitle="Exponential forgetting decay tracking"
          icon={Clock}
          iconColor="text-amber-500"
        />
        <MetricCard
          title="Engine Uncertainty Metric"
          value={`${(learner.overallUncertainty * 100).toFixed(0)}%`}
          subtitle="Model epistemic confidence"
          icon={HelpCircle}
          iconColor="text-indigo-600"
        />
      </div>

      {/* Section 22: Teacher Visibility — Personalized Learner Roadmap Inspection */}
      {studentRoadmap && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Personalized Learner Roadmap Inspection ({studentRoadmap.domainName})
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect current recommended step, blocked prerequisites, forgetting-risk concepts, and intervention flags
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
                Progress: {studentRoadmap.progress.completed}/{studentRoadmap.progress.total} ({studentRoadmap.progress.percentage}%)
              </span>
              {studentRoadmap.progress.reviewNeeded > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                  {studentRoadmap.progress.reviewNeeded} Forgetting Risk
                </span>
              )}
              {studentRoadmap.progress.prerequisiteBlocked > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                  {studentRoadmap.progress.prerequisiteBlocked} Prereq Blocked
                </span>
              )}
            </div>
          </div>

          {/* Current Recommended Step & Intervention Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-indigo-700 uppercase tracking-wider">
                  ▶ Current Recommended Step:
                </span>
                <span className="font-bold text-slate-900">
                  {studentRoadmap.currentAction.conceptName}
                </span>
                <span>·</span>
                <span className="font-mono font-bold text-indigo-800">
                  {studentRoadmap.currentAction.action.replace('_', ' ')}
                </span>
                {studentRoadmap.currentAction.action === 'TEACHER_INTERVENTION' && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold">
                    ⚠ INTERVENTION NEEDED
                  </span>
                )}
              </div>
              <p className="text-slate-700 leading-relaxed">
                <strong>Diagnostic Reason: </strong>
                {studentRoadmap.currentAction.reason}
              </p>
            </div>

            <button
              onClick={() => setIsOverrideModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 font-bold transition-colors shrink-0 cursor-pointer"
            >
              Override Step
            </button>
          </div>

          {/* Ordered Roadmap Sequence Table for Faculty */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {studentRoadmap.items.map((item, idx) => (
              <div
                key={item.conceptId}
                className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                  item.status === 'current'
                    ? 'border-indigo-400 bg-indigo-50/20'
                    : item.status === 'completed'
                    ? 'border-emerald-200 bg-emerald-50/15'
                    : item.status === 'blocked'
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 truncate">
                    {idx + 1}. {item.conceptName}
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase text-slate-600 shrink-0">
                    {item.status === 'completed'
                      ? '✓ Done'
                      : item.status === 'current'
                      ? '▶ Current'
                      : item.status === 'blocked'
                      ? '🔒 Blocked'
                      : '○ Upcoming'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                  <span className="font-bold text-indigo-700">
                    {item.action.replace('_', ' ')}
                  </span>
                  <span>
                    M: {(item.mastery * 100).toFixed(0)}% · Risk: {(item.forgettingRisk * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                  {item.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concept Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">Per-Concept Mastery & Signal Ledger</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-2.5 font-bold">Concept</th>
                <th className="pb-2.5 font-bold">Hybrid Mastery</th>
                <th className="pb-2.5 font-bold text-purple-700">BKT P(Know)</th>
                <th className="pb-2.5 font-bold text-indigo-700">ML P(Mastery)</th>
                <th className="pb-2.5 font-bold">Retention</th>
                <th className="pb-2.5 font-bold">Uncertainty</th>
                <th className="pb-2.5 font-bold">Attempts</th>
                <th className="pb-2.5 font-bold">Hints / Retries</th>
                <th className="pb-2.5 font-bold">Transfer Acc</th>
                <th className="pb-2.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {concepts.map((c) => {
                const cm = learner.conceptMasteries[c.id];
                const score = cm ? cm.mastery : 0;
                const mlPred = cm?.mlPrediction;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 font-bold text-slate-800">
                      {c.name}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-900">
                      {(score * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 font-mono text-purple-700 font-bold">
                      {cm?.bktMastery !== undefined ? `${(cm.bktMastery * 100).toFixed(0)}%` : '15%'}
                    </td>
                    <td className="py-2.5 font-mono text-indigo-700 font-bold">
                      {mlPred ? `${(mlPred.probability * 100).toFixed(0)}%` : 'Calibrating'}
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {cm ? `${(cm.retention * 100).toFixed(0)}%` : '0%'}
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {cm ? `${(cm.uncertainty * 100).toFixed(0)}%` : '85%'}
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {cm?.attemptsCount || 0}
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {cm?.totalHintsUsed || 0} hints / {cm?.totalRetries || 0} retries
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {cm ? `${(cm.transferAccuracy * 100).toFixed(0)}%` : 'N/A'}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          score >= 0.75
                            ? 'bg-emerald-50 text-emerald-700'
                            : score >= 0.50
                            ? 'bg-blue-50 text-blue-700'
                            : cm?.attemptsCount
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {score >= 0.75 ? 'Mastered' : score >= 0.5 ? 'Developing' : cm?.attemptsCount ? 'Struggling' : 'Unattempted'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PHASE 8: Faculty Machine Learning Diagnostic Panel */}
      {(() => {
        const targetCid = learner.currentRecommendation?.conceptId || '';
        const targetCm = learner.conceptMasteries[targetCid];
        const targetMl = targetCm?.mlPrediction;
        const targetBkt = targetCm?.bktMastery;
        const modelVer = targetMl?.modelVersion || 'logreg-prod-v1.0';
        const trainingStatus = modelVer.includes('baseline') ? 'FALLBACK' : 'TRAINED';
        return (
          <div className="bg-white rounded-3xl border border-indigo-200/90 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Machine Learning Predictive Diagnostics</h3>
                  <p className="text-xs text-slate-500">
                    Calibrated Logistic Regression inference engine (L2 regularized, 16 canonical evidence features)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  Version: {modelVer}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Status: {trainingStatus}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Hybrid Mastery Blending
                </span>
                <span className="font-bold text-slate-800 block mt-1">
                  45% Bayesian / 25% BKT / 30% ML
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                  Hybrid: {targetCm ? `${((targetMl?.hybridMastery ?? targetCm.mastery) * 100).toFixed(0)}%` : 'N/A'} · BKT: {targetBkt !== undefined ? `${(targetBkt * 100).toFixed(0)}%` : 'N/A'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Target Concept ML Prediction
                </span>
                <span className="font-bold text-indigo-700 block mt-1 font-mono text-sm">
                  {learner.currentRecommendation?.conceptName || 'Active Concept'}:{' '}
                  {targetMl
                    ? `${(targetMl.probability * 100).toFixed(0)}% (${targetMl.category})`
                    : 'Calibrated from Evidence'}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Action: <strong className="text-slate-700">{learner.currentRecommendation?.action || 'PRACTICE'}</strong> · Confidence: {targetMl ? `${(targetMl.confidence * 100).toFixed(0)}%` : '85%'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Retention & Prerequisite Gate
                </span>
                <span className="font-bold text-slate-800 block mt-1 font-mono">
                  Retention: {targetCm ? `${(targetCm.retention * 100).toFixed(0)}%` : 'N/A'}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
                  Prerequisites: {learner.currentRecommendation?.evidenceSummary?.prerequisiteStatus || (targetCm?.prerequisiteSatisfied ? 'Satisfied' : 'Blocked')}
                </span>
              </div>
            </div>

            {targetMl?.topContributingFeatures && targetMl.topContributingFeatures.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Top Contributing Features:
                </span>
                {targetMl.topContributingFeatures.map((f, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                      f.direction === 'positive'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    <span>{f.name}</span>
                    <span className="font-mono text-[10px] font-bold">
                      ({f.impact >= 0 ? `+${f.impact.toFixed(2)}` : f.impact.toFixed(2)})
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Completed Mock Examinations Audit (Phase 5) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Adaptive Mock Exam History</h3>
              <p className="text-xs text-slate-500">
                Evaluation results with multi-signal evidence feedback and identified concept deficiencies
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            {examHistory.length} Attempted
          </span>
        </div>

        {examHistory.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
            No mock exams completed yet by this learner.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {examHistory.map((sess) => {
              const res = sess.result;
              if (!res) return null;
              return (
                <div key={sess.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{sess.title}</span>
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
                    <div className="text-[11px] text-slate-400 flex items-center space-x-3">
                      <span>{res.totalQuestions} Questions</span>
                      <span>•</span>
                      <span>Duration: {res.timeUsedFormatted}</span>
                      <span>•</span>
                      <span>Accuracy: {res.accuracyPercent}%</span>
                    </div>
                    {res.weakConcepts.length > 0 && (
                      <div className="text-[11px] text-rose-600 font-medium">
                        Concept deficiencies: {res.weakConcepts.map((w) => w.conceptName).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-extrabold text-indigo-600 font-mono">
                      {res.scorePercent}%
                    </div>
                    <div className="text-[10px] text-slate-400">Final Score</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Teacher Overrides Audit Trail */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Faculty Overrides Audit Log</h3>
            <p className="text-xs text-slate-500">
              Immutable log of educator decisions overriding autonomous engine choices
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {learner.overrides.length} Recorded Overrides
          </span>
        </div>

        {learner.overrides.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
            No faculty overrides logged for this student. System is operating purely on autonomous evidence logic.
          </div>
        ) : (
          <div className="space-y-3">
            {learner.overrides.map((ov) => {
              const targetConcept = conceptMap.get(ov.newConceptId);
              return (
                <div
                  key={ov.id}
                  className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-amber-900">
                    <span className="font-bold flex items-center space-x-1.5">
                      <UserCheck className="w-4 h-4 text-amber-600" />
                      <span>{ov.teacherName}</span>
                    </span>
                    <span className="text-[11px] text-amber-700">
                      {new Date(ov.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-slate-800">
                    Overrode <span className="font-semibold text-slate-600">{ov.previousAction}</span> with{' '}
                    <span className="font-bold text-amber-900 uppercase">{ov.newAction}</span> on{' '}
                    <span className="font-bold text-slate-900">{targetConcept?.name || ov.newConceptId}</span>.
                  </div>
                  <p className="text-[11px] text-slate-600 italic">
                    Reason: "{ov.reason}"
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chronological Learning Attempts Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">Learning Event Timeline</h3>
        <div className="space-y-3">
          {learner.recentAttempts.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">No attempts logged yet.</div>
          ) : (
            learner.recentAttempts.map((att, idx) => {
              const concept = conceptMap.get(att.conceptId);
              return (
                <div
                  key={att.id || idx}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        att.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-slate-900">
                        {concept?.name || att.conceptId} • {att.questionType} ({att.difficulty})
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Confidence: {(att.confidence * 100).toFixed(0)}% • Duration: {att.responseTimeSeconds}s • Hints: {att.hintsUsed} • Retries: {att.retries}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-blue-600">
                      Evidence Score: {(att.evidenceScore * 100).toFixed(1)}%
                    </span>
                    {att.antiGuessingTriggered && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Damped
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Phase 6 ML Prediction & Outcome Audit Trail */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                Phase 6 Continuous ML Log
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Learner Prediction Snapshots & Outcome Resolution
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly monitors predictions at time T and resolves ground truth upon subsequent independent evidence.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            {predictions.length} Tracked Predictions
          </span>
        </div>

        {predictions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
            No prediction snapshots recorded for this learner yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Prediction ID</th>
                  <th className="py-2.5 px-3">Concept</th>
                  <th className="py-2.5 px-3">Predicted P(M)</th>
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Actual Target</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Evaluated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {predictions.slice(0, 10).map((p) => {
                  const cName = conceptMap.get(p.conceptId)?.name || p.conceptId;
                  return (
                    <tr key={p.predictionId} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-bold text-slate-700 truncate max-w-[120px]" title={p.predictionId}>
                        {p.predictionId.substring(0, 14)}...
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{cName}</td>
                      <td className="py-2.5 px-3 font-bold text-indigo-700">
                        {(p.predictedProbability * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">{p.modelVersion}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                            p.evaluationStatus === 'evaluated'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {p.evaluationStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {p.actualOutcome !== undefined ? (
                          <span className={p.actualOutcome === 1 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                            y={p.actualOutcome} ({p.actualOutcome === 1 ? 'Correct' : 'Incorrect'})
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans italic">pending</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500 uppercase">{p.outcomeSource || '—'}</td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-400">
                        {p.evaluatedAt ? new Date(p.evaluatedAt).toLocaleTimeString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Override Modal */}
      {isOverrideModalOpen && (
        <TeacherOverrideModal
          learner={learner}
          concepts={concepts}
          isOpen={true}
          onClose={() => setIsOverrideModalOpen(false)}
          onSuccess={() => setIsOverrideModalOpen(false)}
        />
      )}

    </div>
  );
};
