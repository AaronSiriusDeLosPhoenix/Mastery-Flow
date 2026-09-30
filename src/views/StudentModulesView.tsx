import React from 'react';
import { useApp } from '../context/AppContext.js';
import { DomainId, Module, Lesson, LessonStatus } from '../types.js';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  Award,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Brain,
  Bot,
  FileText,
  Lock,
  PlayCircle,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';

export const StudentModulesView: React.FC = () => {
  const {
    currentLearner,
    domains,
    activeDomainId,
    setActiveDomainId,
    modules,
    lessons,
    activeLessonId,
    setActiveLessonId,
    progressData,
    setTargetConceptId,
    setActiveView,
    refreshProgress,
  } = useApp();

  const activeDomain = domains.find((d) => d.id === activeDomainId) || domains[0];
  const subjectProgress = progressData?.subjectProgress;
  const moduleProgresses = progressData?.moduleProgresses || [];
  const knowledgeGaps = progressData?.knowledgeGaps || [];
  const nextRecommendation = progressData?.nextRecommendation;

  const handleOpenLesson = (lesson: Lesson) => {
    setActiveLessonId(lesson.id);
    if (lesson.conceptIds.length > 0) {
      setTargetConceptId(lesson.conceptIds[0]);
    }
    setActiveView('student_learn');
  };

  const getStatusBadge = (status: LessonStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
            <PlayCircle className="w-3 h-3" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            Not Started
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Subject Header & Track Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-600/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {activeDomain?.name}
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {activeDomain?.shortLabel}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${activeDomain?.badgeColor}`}>
                  {activeDomain?.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {activeDomain?.description}
              </p>
            </div>
          </div>

          {/* Domain / Syllabus Switcher Dropdown & Mind Map Link */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => setActiveView('student_flashcards')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all border border-blue-200 cursor-pointer shadow-2xs"
            >
              <Brain className="w-3.5 h-3.5 text-blue-600" />
              <span>Adaptive Flashcards</span>
            </button>

            <button
              onClick={() => setActiveView('student_mindmap')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all border border-purple-200 cursor-pointer shadow-2xs"
            >
              <Brain className="w-3.5 h-3.5 text-purple-600" />
              <span>Interactive Mind Map</span>
            </button>

            <button
              onClick={() => setActiveView('student_mock_exam')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all border border-emerald-200 cursor-pointer shadow-2xs"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mock Exam</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Track:</span>
              <select
                value={activeDomainId}
                onChange={(e) => setActiveDomainId(e.target.value as DomainId)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.shortLabel})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Subject Progress Bar (Computed from real student activity) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Overall Subject Progress:</span>
              <span className="text-slate-500">
                {subjectProgress?.completedLessons || 0} of {subjectProgress?.totalLessons || lessons.length} lessons completed
              </span>
            </div>
            <span className="font-mono font-bold text-indigo-600 text-sm">
              {subjectProgress?.progressPercent || 0}%
            </span>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-full transition-all duration-700"
              style={{ width: `${Math.max(4, subjectProgress?.progressPercent || 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Adaptive Next-Lesson Recommendation Banner */}
      {nextRecommendation && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-800">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                ⚡ Recommended Next Activity
              </span>
              <span className="text-xs font-semibold text-indigo-200">
                {nextRecommendation.stepFired || 'Adaptive Decision Engine'}
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {nextRecommendation.conceptName}
            </h3>
            <p className="text-xs text-indigo-100/90 leading-relaxed">
              {nextRecommendation.reason}
            </p>
          </div>

          <button
            onClick={() => {
              // Find matching lesson or concept
              const matchedLesson = lessons.find((l) => l.conceptIds.includes(nextRecommendation.conceptId));
              if (matchedLesson) {
                handleOpenLesson(matchedLesson);
              } else {
                setTargetConceptId(nextRecommendation.conceptId);
                setActiveView('student_learn');
              }
            }}
            className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <span>{nextRecommendation.action === 'REMEDIATE_PREREQUISITE' ? 'Remediate Prerequisite' : 'Start Lesson'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Knowledge Gap Alert Box (if gaps detected) */}
      {knowledgeGaps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Prerequisite Knowledge Gaps Detected ({knowledgeGaps.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {knowledgeGaps.map((gap) => (
              <div
                key={gap.id}
                className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{gap.conceptName}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                      {gap.severity} Severity
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{gap.reason}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                    Remedy: <strong>{gap.recommendedLessonTitle}</strong>
                  </span>
                  <button
                    onClick={() => {
                      const l = lessons.find((les) => les.id === gap.recommendedLessonId || les.conceptIds.includes(gap.prerequisiteId));
                      if (l) handleOpenLesson(l);
                      else {
                        setTargetConceptId(gap.prerequisiteId);
                        setActiveView('student_learn');
                      }
                    }}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Fix Gap →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modules & Lessons Hierarchy List */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Modules & Structured Learning Path</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {modules.length} Modules • {lessons.length} Lessons
          </span>
        </div>

        <div className="space-y-4">
          {modules.map((mod, modIdx) => {
            const modProg = moduleProgresses.find((p) => p.moduleId === mod.id);
            const moduleLessons = lessons.filter((l) => l.moduleId === mod.id);
            const isCompleted = modProg?.status === 'COMPLETED';

            return (
              <div
                key={mod.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Module Header Bar */}
                <div className="p-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-mono font-bold text-xs text-slate-700 shadow-2xs mt-0.5">
                      {modIdx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                          {mod.code}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">{mod.title}</h3>
                        {getStatusBadge(modProg?.status || 'NOT_STARTED')}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl">{mod.description}</p>
                    </div>
                  </div>

                  {/* Module Progress Stats */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800">
                        {modProg?.completedLessons || 0} / {modProg?.totalLessons || moduleLessons.length} Lessons
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {modProg?.progressPercent || 0}% Complete
                      </div>
                    </div>

                    <div className="w-20 sm:w-28 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${modProg?.progressPercent || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Lessons in Module */}
                <div className="divide-y divide-slate-100">
                  {moduleLessons.map((lesson, lesIdx) => {
                    const progressList = progressData?.lessonProgressList || [];
                    const lProg = progressList.find((p: any) => p.lessonId === lesson.id);
                    const lStatus: LessonStatus = lProg?.status || 'NOT_STARTED';

                    return (
                      <div
                        key={lesson.id}
                        className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-mono text-[10px] font-bold text-slate-500 shrink-0 mt-0.5">
                            {lesIdx + 1}
                          </span>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-900 hover:text-indigo-600 cursor-pointer" onClick={() => handleOpenLesson(lesson)}>
                                {lesson.title}
                              </h4>
                              {getStatusBadge(lStatus)}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                              {lesson.description}
                            </p>

                            {/* Learning Objectives Preview */}
                            {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
                              <div className="pt-1 flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                                <span>🎯 Objectives:</span>
                                <span className="text-slate-600 truncate max-w-xl">
                                  {lesson.learningObjectives[0]}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Lesson Action Controls */}
                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {lesson.estimatedMinutes}m
                          </span>

                          <button
                            onClick={() => handleOpenLesson(lesson)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                              lStatus === 'COMPLETED'
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : lStatus === 'IN_PROGRESS'
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            <span>{lStatus === 'COMPLETED' ? 'Review Lesson' : lStatus === 'IN_PROGRESS' ? 'Resume' : 'Start'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
