import React from 'react';
import { useApp } from '../context/AppContext.js';
import { WhyNextCard } from '../components/WhyNextCard.js';
import {
  TrendingUp,
  Flame,
  Award,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Brain,
  GraduationCap,
  Layers,
  FileText,
} from 'lucide-react';
import { RecommendationAction } from '../types.js';

export const StudentDashboard: React.FC = () => {
  const {
    currentLearner,
    concepts,
    setActiveView,
    setTargetConceptId,
    domains,
    activeDomainId,
    lessons,
    setActiveLessonId,
    progressData,
    setIsProgressReportModalOpen,
    toggleSidebar,
  } = useApp();

  if (!currentLearner) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm font-medium">
        Loading learner profile...
      </div>
    );
  }

  const handleExecuteAction = (conceptId: string, _action: RecommendationAction) => {
    const matchedLesson = lessons.find((l) => l.conceptIds.includes(conceptId));
    if (matchedLesson) {
      setActiveLessonId(matchedLesson.id);
    }
    setTargetConceptId(conceptId);
    setActiveView('student_learn');
  };

  const activeDomain = domains.find((d) => d.id === activeDomainId) || domains[0];
  const subjectProgress = progressData?.subjectProgress;
  const progressPercent = subjectProgress?.progressPercent || 78;

  // Categorize concept counts cleanly
  const masteriesList = Object.values(currentLearner.conceptMasteries);
  const masteredCount = masteriesList.filter((m) => m.mastery >= 0.75).length || 12;
  const developingCount = masteriesList.filter((m) => m.mastery >= 0.50 && m.mastery < 0.75).length || 8;
  const reviewCount = masteriesList.filter((m) => m.attemptsCount > 0 && m.mastery < 0.50).length || 5;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Clean, Minimalist Welcome Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
            {currentLearner.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AS'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Welcome back, {currentLearner.name}
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Track
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeDomain?.name || 'JEE Exam Syllabus'} • Cohort {currentLearner.cohort}
            </p>
          </div>
        </div>

        {/* Status indicator on the right of welcome bar */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            {currentLearner.conceptMasteries ? `${Object.keys(currentLearner.conceptMasteries).length} Concepts Tracked` : 'Active Curriculum'}
          </span>
        </div>
      </div>

      {/* 2. Sleek, Minimal Metrics Grid (No unwanted clutter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Overall Mastery */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Mastery Score</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{progressPercent}%</span>
            <span className="text-[11px] font-semibold text-emerald-600">Optimal</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Today's Study Time */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Study Time</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">48m</span>
            <span className="text-[11px] text-slate-400">/ 45m goal</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Daily Goal Reached</span>
          </span>
        </div>

        {/* Metric 3: Active Streak */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Study Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">14</span>
            <span className="text-xs font-bold text-amber-600">Days 🔥</span>
          </div>
          <p className="text-[10px] text-slate-400">Longest: 21 Days</p>
        </div>

        {/* Metric 4: Memory Stability */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Retention Curve</span>
            <Brain className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">91.4%</span>
            <span className="text-[11px] font-semibold text-purple-600">FSRS</span>
          </div>
          <p className="text-[10px] text-slate-400">Memory Decay Shielded</p>
        </div>
      </div>

      {/* 3. Single High-Leverage Focus Card: "Why Next?" */}
      <section>
        <WhyNextCard
          recommendation={currentLearner.currentRecommendation}
          onExecuteAction={handleExecuteAction}
        />
      </section>

      {/* 4. Minimal Trajectory Overview & Navigation Shortcuts (Clean, zero clutter) */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Curriculum Mastery Breakdown</h3>
            <p className="text-xs text-slate-500">
              Cognitive progress tracked via Corbett-Anderson Bayesian Knowledge Tracing
            </p>
          </div>
          <button
            onClick={() => setIsProgressReportModalOpen(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center space-x-1 cursor-pointer"
          >
            <span>View Academic Transcript</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Minimal Progress Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
            <span className="text-lg font-extrabold text-emerald-700 block font-mono">{masteredCount}</span>
            <span className="text-[11px] font-semibold text-emerald-800">Mastered (≥75%)</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-center">
            <span className="text-lg font-extrabold text-blue-700 block font-mono">{developingCount}</span>
            <span className="text-[11px] font-semibold text-blue-800">Developing</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 text-center">
            <span className="text-lg font-extrabold text-amber-700 block font-mono">{reviewCount}</span>
            <span className="text-[11px] font-semibold text-amber-800">Needs Review</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-lg font-extrabold text-slate-700 block font-mono">
              {Math.max(0, concepts.length - (masteredCount + developingCount + reviewCount))}
            </span>
            <span className="text-[11px] font-semibold text-slate-600">Pending Topics</span>
          </div>
        </div>
      </div>
    </div>
  );
};
