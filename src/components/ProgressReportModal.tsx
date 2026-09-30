import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Award,
  Brain,
  Clock,
  HelpCircle,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { LearnerProfile, Concept, DomainId, CurriculumDomain } from '../types.js';

interface ProgressReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  learner: LearnerProfile | null;
  concepts: Concept[];
  progressData: any;
  activeDomain?: CurriculumDomain;
}

export const ProgressReportModal: React.FC<ProgressReportModalProps> = ({
  isOpen,
  onClose,
  learner,
  concepts,
  progressData,
  activeDomain,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !learner) return null;

  const subjectProgress = progressData?.subjectProgress;
  const moduleProgresses = progressData?.moduleProgresses || [];
  const knowledgeGaps = progressData?.knowledgeGaps || [];
  const masteriesList = Object.values(learner.conceptMasteries);

  const mastered = masteriesList.filter((m) => m.mastery >= 0.75);
  const developing = masteriesList.filter((m) => m.mastery >= 0.5 && m.mastery < 0.75);
  const learning = masteriesList.filter((m) => m.attemptsCount > 0 && m.mastery < 0.5);

  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  // Bloom taxonomy breakdown
  const bloomDistribution: Record<string, { total: number; sumMastery: number }> = {};
  concepts.forEach((c) => {
    const b = c.bloomTarget || 'Understand';
    if (!bloomDistribution[b]) bloomDistribution[b] = { total: 0, sumMastery: 0 };
    bloomDistribution[b].total += 1;
    bloomDistribution[b].sumMastery += learner.conceptMasteries[c.id]?.mastery || 0;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const reportData = {
      reportTitle: 'MasteryFlow Academic Progress Report',
      generatedAt: new Date().toISOString(),
      student: {
        id: learner.id,
        name: learner.name,
        email: learner.email,
        cohort: learner.cohort,
        readingLevel: learner.preferredReadingLevel,
      },
      curriculum: {
        id: activeDomain?.id,
        name: activeDomain?.name,
      },
      summaryMetrics: {
        overallMasteryPercent: Math.round(learner.overallMastery * 100),
        retentionScorePercent: Math.round(learner.overallRetention * 100),
        engineUncertaintyPercent: Math.round(learner.overallUncertainty * 100),
        lessonsCompleted: subjectProgress?.completedLessons || 0,
        totalLessons: subjectProgress?.totalLessons || 0,
        syllabusProgressPercent: subjectProgress?.progressPercent || 0,
      },
      moduleProgresses,
      conceptMasteries: learner.conceptMasteries,
      knowledgeGaps,
      currentRecommendation: learner.currentRecommendation,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MasteryFlow_Progress_Report_${learner.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div
        ref={printRef}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none"
      >
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs px-6 py-4 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Student Academic Progress Report</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 space-y-8 text-slate-800">
          {/* Institution & Report Header */}
          <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                  MF
                </span>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  MasteryFlow 2026
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Official Transcript
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Evidence-Driven Adaptive Learning & Cognitive Competency Engine
              </p>
            </div>

            <div className="text-left sm:text-right text-xs space-y-0.5 text-slate-500">
              <div className="flex items-center sm:justify-end space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">Issued: {formattedDate}</span>
              </div>
              <p className="font-mono text-[11px] text-slate-400">ID: {learner.id}</p>
            </div>
          </div>

          {/* Student Dossier Card */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Learner Name
              </span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{learner.name}</p>
              <p className="text-[11px] text-slate-500">{learner.email}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Cohort / Class
              </span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{learner.cohort}</p>
              <p className="text-[11px] text-slate-500 capitalize">
                Level: {learner.preferredReadingLevel}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Curriculum Track
              </span>
              <p className="text-sm font-bold text-indigo-700 mt-0.5 truncate">
                {activeDomain?.name || 'Computer Science & DSA'}
              </p>
              <p className="text-[11px] text-slate-500">Mastery Model: Bayesian BKT</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Diagnostic Status
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                {learner.diagnosticCompleted ? (
                  <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Validated</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>Incomplete</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Core Metrics Quad */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Cognitive Mastery & Evidence Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <div className="flex items-center justify-between text-indigo-600 mb-1">
                  <span className="text-[11px] font-bold">Multi-Signal Mastery</span>
                  <Brain className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-indigo-900 font-mono">
                  {(learner.overallMastery * 100).toFixed(0)}%
                </div>
                <span className="text-[10px] text-indigo-600/80 font-medium">
                  {mastered.length} of {concepts.length} concepts mastered
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                <div className="flex items-center justify-between text-amber-600 mb-1">
                  <span className="text-[11px] font-bold">Memory Retention</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-amber-900 font-mono">
                  {(learner.overallRetention * 100).toFixed(0)}%
                </div>
                <span className="text-[10px] text-amber-600/80 font-medium">
                  Ebbinghaus decay tracked
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                <div className="flex items-center justify-between text-blue-600 mb-1">
                  <span className="text-[11px] font-bold">Syllabus Progress</span>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-blue-900 font-mono">
                  {subjectProgress?.progressPercent || 0}%
                </div>
                <span className="text-[10px] text-blue-600/80 font-medium">
                  {subjectProgress?.completedLessons || 0} / {subjectProgress?.totalLessons || 0} lessons completed
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200">
                <div className="flex items-center justify-between text-slate-600 mb-1">
                  <span className="text-[11px] font-bold">Engine Confidence</span>
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {(100 - learner.overallUncertainty * 100).toFixed(0)}%
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {(learner.overallUncertainty * 100).toFixed(0)}% uncertainty
                </span>
              </div>
            </div>
          </div>

          {/* Bloom's Taxonomy Competency Profile */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bloom's Taxonomy Cognitive Depth</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(bloomDistribution).map(([bloomLevel, stats]) => {
                const avgMastery = stats.total > 0 ? (stats.sumMastery / stats.total) * 100 : 0;
                return (
                  <div key={bloomLevel} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {bloomLevel}
                    </span>
                    <div className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">
                      {avgMastery.toFixed(0)}%
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${avgMastery}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">
                      {stats.total} concepts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Module Progress Breakdown */}
          {moduleProgresses.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Module Completion Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Module</th>
                      <th className="py-2.5 px-3">Lessons Done</th>
                      <th className="py-2.5 px-3">Concepts</th>
                      <th className="py-2.5 px-3">Module Mastery</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {moduleProgresses.map((m: any) => (
                      <tr key={m.moduleId}>
                        <td className="py-2 px-3 font-bold text-slate-800">{m.moduleName}</td>
                        <td className="py-2 px-3 text-slate-600">
                          {m.completedLessons} / {m.totalLessons}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{m.totalConcepts}</td>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">
                          {m.masteryScore}%
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : m.status === 'IN_PROGRESS'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Per-Concept Mastery Ledger */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Per-Concept Signal Ledger & Cognitive State
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Concept</th>
                    <th className="py-2.5 px-3">Bloom</th>
                    <th className="py-2.5 px-3">Mastery</th>
                    <th className="py-2.5 px-3">Retention</th>
                    <th className="py-2.5 px-3">Attempts</th>
                    <th className="py-2.5 px-3">Hints</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {concepts.map((c) => {
                    const cm = learner.conceptMasteries[c.id];
                    const score = cm ? cm.mastery : 0;
                    const retention = cm ? cm.retention : 0;
                    const attempts = cm ? cm.attemptsCount : 0;
                    const hints = cm ? cm.totalHintsUsed : 0;

                    let statusText = 'Not Started';
                    let statusClass = 'bg-slate-100 text-slate-600';
                    if (score >= 0.75) {
                      statusText = 'Mastered';
                      statusClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                    } else if (score >= 0.5) {
                      statusText = 'Developing';
                      statusClass = 'bg-blue-50 text-blue-700 border border-blue-200';
                    } else if (attempts > 0) {
                      statusText = 'Struggling';
                      statusClass = 'bg-rose-50 text-rose-700 border border-rose-200';
                    }

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{c.name}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px] capitalize">
                          {c.bloomTarget || 'Understand'}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                          {(score * 100).toFixed(0)}%
                        </td>
                        <td className="py-2 px-3 font-mono text-amber-600">
                          {(retention * 100).toFixed(0)}%
                        </td>
                        <td className="py-2 px-3 text-slate-600">{attempts}</td>
                        <td className="py-2 px-3 text-slate-600">{hints}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass}`}>
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Adaptive Clinical Recommendations & Identified Deficits */}
          {learner.currentRecommendation && (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Brain className="w-3.5 h-3.5" />
                <span>Next Pedagogical Recommendation</span>
              </span>
              <p className="text-xs font-bold text-slate-900">
                Action: <span className="text-indigo-700">{learner.currentRecommendation.action}</span> on{' '}
                <span className="underline decoration-indigo-400">
                  {learner.currentRecommendation.conceptName}
                </span>
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {learner.currentRecommendation.reason}
              </p>
            </div>
          )}

          {/* Academic Verification Footer */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 text-xs text-slate-400">
            <div>
              <p className="font-bold text-slate-700">MasteryFlow Automated Academic Assessment</p>
              <p className="text-[11px]">Validated against Bayesian Knowledge Tracing & Memory Decay Models.</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-600">Faculty Verified / System Certified</p>
              <p className="font-mono text-[10px]">VERIFY-SIG: MF26-{learner.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
