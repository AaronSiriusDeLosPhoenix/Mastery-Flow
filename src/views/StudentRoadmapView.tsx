import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.js';
import * as api from '../api/client.js';
import {
  DomainId,
  PersonalizedRoadmapData,
  RoadmapAction,
  RoadmapItem,
} from '../types.js';
import {
  CheckCircle2,
  Play,
  Lock,
  Circle,
  ArrowDown,
  ArrowRight,
  Compass,
  Network,
  BookOpen,
  Brain,
  Bot,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  Clock,
} from 'lucide-react';

export const StudentRoadmapView: React.FC = () => {
  const {
    currentLearner,
    domains,
    activeDomainId,
    setActiveDomainId,
    targetConceptId,
    setTargetConceptId,
    setActiveLessonId,
    setActiveView,
    setIsGlobalChatOpen,
    lessons,
    currentRole,
  } = useApp();

  const [roadmap, setRoadmap] = useState<PersonalizedRoadmapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'current' | 'upcoming' | 'blocked'>('all');

  const loadRoadmap = async () => {
    if (!currentLearner) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchRoadmap(currentLearner.id, activeDomainId, currentRole);
      setRoadmap(data);

      // Select either targetConceptId if present in this domain, or currentAction.conceptId
      const hasTarget = data.items.some((i) => i.conceptId === targetConceptId);
      if (hasTarget && targetConceptId) {
        setSelectedConceptId(targetConceptId);
      } else if (data.currentAction?.conceptId) {
        setSelectedConceptId(data.currentAction.conceptId);
      } else if (data.items.length > 0) {
        setSelectedConceptId(data.items[0].conceptId);
      }
    } catch (err: any) {
      console.error('Failed to load personalized roadmap:', err);
      setError(err.message || 'Unable to load personalized roadmap');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoadmap();
  }, [currentLearner?.id, activeDomainId, currentLearner?.overallMastery, currentLearner?.recentAttempts?.length]);

  const handleStartActivity = (conceptId: string, lessonId?: string, action?: RoadmapAction) => {
    const matchedLesson =
      (lessonId && lessons.find((l) => l.id === lessonId)) ||
      lessons.find((l) => l.conceptIds.includes(conceptId));
    if (matchedLesson) {
      setActiveLessonId(matchedLesson.id);
    }
    setTargetConceptId(conceptId);
    if (action === 'REVIEW') {
      setActiveView('student_learn');
    } else {
      setActiveView('student_learn');
    }
  };

  const handleViewInMindMap = (conceptId: string) => {
    setTargetConceptId(conceptId);
    setActiveView('student_mindmap');
  };

  if (!currentLearner) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs font-semibold">
        Loading learner profile...
      </div>
    );
  }

  const selectedItem: RoadmapItem | null =
    roadmap?.items.find((i) => i.conceptId === selectedConceptId) ||
    roadmap?.items.find((i) => i.status === 'current') ||
    roadmap?.items[0] ||
    null;

  const filteredItems =
    roadmap?.items.filter((item) =>
      statusFilter === 'all' ? true : item.status === statusFilter
    ) || [];

  const getStatusIndicator = (item: RoadmapItem) => {
    switch (item.status) {
      case 'completed':
        return {
          symbol: '✓',
          label: 'Completed',
          icon: CheckCircle2,
          badgeStyle: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          cardBorder: 'border-emerald-200/90 bg-white hover:border-emerald-300',
          nodeCircle: 'bg-emerald-600 text-white border-emerald-600',
        };
      case 'current':
        return {
          symbol: '▶',
          label: 'Current Step',
          icon: Play,
          badgeStyle: 'text-indigo-700 bg-indigo-50 border-indigo-200',
          cardBorder: 'border-indigo-500 ring-2 ring-indigo-500/15 bg-indigo-50/25',
          nodeCircle: 'bg-indigo-600 text-white border-indigo-600 shadow-sm',
        };
      case 'blocked':
        return {
          symbol: '🔒',
          label: 'Blocked',
          icon: Lock,
          badgeStyle: 'text-amber-800 bg-amber-50 border-amber-200',
          cardBorder: 'border-amber-200/90 bg-amber-50/20 hover:border-amber-300',
          nodeCircle: 'bg-amber-100 text-amber-800 border-amber-300',
        };
      case 'upcoming':
      default:
        return {
          symbol: '○',
          label: 'Upcoming',
          icon: Circle,
          badgeStyle: 'text-slate-600 bg-slate-100 border-slate-200',
          cardBorder: 'border-slate-200/90 bg-white hover:border-slate-300',
          nodeCircle: 'bg-white text-slate-500 border-slate-300',
        };
    }
  };

  const getActionTone = (action: RoadmapAction) => {
    switch (action) {
      case 'ADVANCE':
        return 'text-emerald-700';
      case 'CHALLENGE':
        return 'text-purple-700';
      case 'REVIEW':
        return 'text-amber-700';
      case 'REMEDIATE_PREREQUISITE':
        return 'text-amber-800';
      case 'TEACHER_INTERVENTION':
        return 'text-rose-700';
      case 'PRACTICE':
      default:
        return 'text-blue-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header Banner with Explicit Architectural Distinction */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Personalized Learning Roadmap</span>
            <span aria-hidden="true">·</span>
            <span className="text-indigo-700 font-semibold">
              “What should this learner do next?”
            </span>
            <span aria-hidden="true">·</span>
            <span>Personalized for {currentLearner.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Your Learning Roadmap</span>
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Dynamically ordered for your current mastery, BKT knowledge, IRT ability, FSFR forgetting risk, ML mastery prediction, and prerequisite readiness. While the <strong>Mind Map</strong> shows how concepts are connected, this <strong>Roadmap</strong> guides your step-by-step journey.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
              Curriculum Track
            </label>
            <select
              value={activeDomainId}
              onChange={(e) => setActiveDomainId(e.target.value as DomainId)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleViewInMindMap(selectedItem?.conceptId || targetConceptId)}
            className="mt-4 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Network className="w-3.5 h-3.5 text-indigo-600" />
            <span>Open Mind Map (Knowledge Structure)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={loadRoadmap}
            className="font-bold underline cursor-pointer ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Roadmap Progress Summary Bar (Section 14) */}
      {roadmap && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 block">
              Track Roadmap Progress
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
                {roadmap.progress.completed} / {roadmap.progress.total}
              </span>
              <span className="text-xs font-semibold text-emerald-700 font-mono">
                ({roadmap.progress.percentage}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, roadmap.progress.percentage)}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-xs font-semibold text-slate-500 block">
              Full Platform Curriculum
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
                {roadmap.curriculumOverview?.totalCurriculumCompleted ?? roadmap.progress.completed} /{' '}
                {roadmap.curriculumOverview?.totalCurriculumConcepts ?? 28}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                ({roadmap.curriculumOverview?.totalCurriculumPercentage ?? roadmap.progress.percentage}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {roadmap.progress.completedLessons} / {roadmap.progress.totalLessons} track lessons completed
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-xs font-semibold text-slate-500 block">
              Currently Developing
            </span>
            <span className="text-xl font-extrabold text-blue-700 font-mono tabular-nums block">
              {roadmap.progress.developing}
            </span>
            <p className="text-[11px] text-slate-500">
              Concepts needing deliberate practice
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-xs font-semibold text-slate-500 block">
              Requiring Spaced Review
            </span>
            <span className="text-xl font-extrabold text-amber-700 font-mono tabular-nums block">
              {roadmap.progress.reviewNeeded}
            </span>
            <p className="text-[11px] text-slate-500">
              Elevated FSFR forgetting risk
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
            <span className="text-xs font-semibold text-slate-500 block">
              Prerequisite Blocked
            </span>
            <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums block">
              {roadmap.progress.prerequisiteBlocked}
            </span>
            <p className="text-[11px] text-slate-500">
              Gated until foundations reach 70%
            </p>
          </div>
        </div>
      )}

      {/* 3. Primary Current Step Banner (Section 13 & 17: ONE Primary Current Action) */}
      {roadmap && roadmap.currentAction && (
        <div className="p-5 sm:p-6 bg-white rounded-2xl border-2 border-indigo-600/80 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-indigo-700 uppercase tracking-wider">
                  ▶ Current Primary Step
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className={`font-mono font-bold ${getActionTone(roadmap.currentAction.action)}`}>
                  {roadmap.currentAction.action.replace('_', ' ')}
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-slate-500">{roadmap.currentAction.priorityTier}</span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {roadmap.currentAction.action === 'PRACTICE'
                  ? `Practice ${roadmap.currentAction.conceptName}`
                  : roadmap.currentAction.action === 'REVIEW'
                  ? `Review ${roadmap.currentAction.conceptName}`
                  : roadmap.currentAction.action === 'REMEDIATE_PREREQUISITE'
                  ? `Remediate ${roadmap.currentAction.conceptName}`
                  : roadmap.currentAction.action === 'CHALLENGE'
                  ? `Challenge: ${roadmap.currentAction.conceptName}`
                  : roadmap.currentAction.action === 'TEACHER_INTERVENTION'
                  ? `Guided Intervention: ${roadmap.currentAction.conceptName}`
                  : `Continue to ${roadmap.currentAction.conceptName}`}
              </h2>

              <p className="text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Why this step: </strong>
                {roadmap.currentAction.reason}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() =>
                  handleStartActivity(
                    roadmap.currentAction.conceptId,
                    roadmap.currentAction.lessonId,
                    roadmap.currentAction.action
                  )
                }
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>{roadmap.currentAction.ctaLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewInMindMap(roadmap.currentAction.conceptId)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                View Prerequisite Structure
              </button>
            </div>
          </div>

          {/* Current Step Multi-Signal Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-slate-100 text-xs font-mono tabular-nums">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-sans font-semibold text-slate-500 block">
                Hybrid Mastery
              </span>
              <span className="text-sm font-bold text-slate-900">
                {(roadmap.currentAction.mastery * 100).toFixed(0)}%
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-sans font-semibold text-slate-500 block">
                BKT Knowledge
              </span>
              <span className="text-sm font-bold text-violet-700">
                {roadmap.currentAction.bktKnowledge !== undefined
                  ? `${(roadmap.currentAction.bktKnowledge * 100).toFixed(0)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-sans font-semibold text-slate-500 block">
                IRT Ability Alignment
              </span>
              <span className="text-sm font-bold text-blue-700">
                {roadmap.currentAction.irtAbility !== undefined
                  ? `${(roadmap.currentAction.irtAbility * 100).toFixed(0)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-sans font-semibold text-slate-500 block">
                Forgetting Risk (FSFR)
              </span>
              <span
                className={`text-sm font-bold ${
                  roadmap.currentAction.forgettingRisk >= 0.35
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {(roadmap.currentAction.forgettingRisk * 100).toFixed(0)}%
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-sans font-semibold text-slate-500 block">
                Predicted Mastery (ML)
              </span>
              <span className="text-sm font-bold text-indigo-700">
                {roadmap.mlAvailable && roadmap.currentAction.mlProbability !== undefined
                  ? `${(roadmap.currentAction.mlProbability * 100).toFixed(0)}%`
                  : 'Evidence Mode'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Split Layout: Visual Vertical Roadmap Sequence (Left) + Concept Detail Inspector (Right) */}
      {roadmap && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Visual Ordered Roadmap Sequence */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Personalized Journey Sequence ({roadmap.domainName})
                </h3>
                <p className="text-xs text-slate-500">
                  Click any step to inspect its readiness, prerequisites, and recommended learning activities.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-[11px] font-semibold self-start sm:self-auto">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'current', label: 'Current' },
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'blocked', label: 'Blocked' },
                    { id: 'completed', label: 'Done' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Step-by-Step Roadmap Flow */}
            <div className="space-y-1">
              {filteredItems.map((item, idx) => {
                const statusInfo = getStatusIndicator(item);
                const isSelected = selectedItem?.conceptId === item.conceptId;

                return (
                  <React.Fragment key={item.conceptId}>
                    <div
                      onClick={() => setSelectedConceptId(item.conceptId)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        statusInfo.cardBorder
                      } ${isSelected ? 'ring-2 ring-slate-900/20' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {/* Status Symbol Circle */}
                          <div
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${statusInfo.nodeCircle}`}
                          >
                            {statusInfo.symbol}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">
                                {item.conceptName}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {item.conceptCode}
                              </span>
                              <span className="text-[11px] text-slate-400">·</span>
                              <span className="text-[11px] font-semibold text-slate-600">
                                {statusInfo.label}
                              </span>
                            </div>

                            {/* Action & Concise Reason */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`font-mono font-bold ${getActionTone(item.action)}`}
                              >
                                {item.action.replace('_', ' ')}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-600 leading-relaxed">
                                {item.reason}
                              </span>
                            </div>

                            {/* If blocked by prerequisite, highlight the exact prerequisite */}
                            {item.prerequisiteBlocked && item.blockingPrerequisites.length > 0 && (
                              <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-amber-800 font-medium">
                                <span>
                                  Prerequisite needed:{' '}
                                  <strong>
                                    {item.blockingPrerequisites
                                      .map(
                                        (b) =>
                                          `${b.conceptName} (${(b.currentMastery * 100).toFixed(0)}% / ${(b.requiredThreshold * 100).toFixed(0)}%)`
                                      )
                                      .join(', ')}
                                  </strong>
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedConceptId(item.blockingPrerequisites[0].conceptId);
                                  }}
                                  className="underline font-bold hover:text-amber-950 cursor-pointer"
                                >
                                  Jump to Blocker →
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Column: Compact Metrics & Action CTA */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-right font-mono tabular-nums text-[11px] text-slate-500">
                            <div>
                              Mastery:{' '}
                              <strong className="text-slate-900">
                                {(item.mastery * 100).toFixed(0)}%
                              </strong>
                            </div>
                            {item.forgettingRisk >= 0.35 && (
                              <div className="text-amber-700 font-semibold">
                                Risk: {(item.forgettingRisk * 100).toFixed(0)}%
                              </div>
                            )}
                          </div>

                          {!item.prerequisiteBlocked && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartActivity(item.conceptId, item.lessonId, item.action);
                              }}
                              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                item.status === 'current'
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                              }`}
                            >
                              <span>
                                {item.status === 'completed'
                                  ? 'Revisit'
                                  : item.action === 'REVIEW'
                                  ? 'Review'
                                  : item.action === 'PRACTICE'
                                  ? 'Practice'
                                  : 'Start'}
                              </span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Visual Connector Arrow Between Steps */}
                    {idx < filteredItems.length - 1 && (
                      <div className="flex items-center pl-6 py-0.5 text-slate-300">
                        <ArrowDown className="w-4 h-4" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Right 5 Columns: Selected Concept Detail Panel (Section 16 & 21) */}
          <div className="lg:col-span-5 sticky top-20 space-y-4">
            {selectedItem && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
                {/* Concept Detail Header */}
                <div className="border-b border-slate-100 pb-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {selectedItem.domainName} · {selectedItem.category}
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      {selectedItem.conceptCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedItem.conceptName}
                    </h3>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      {selectedItem.status.toUpperCase()}
                    </span>
                  </div>
                  {selectedItem.moduleTitle && (
                    <p className="text-[11px] text-slate-500">
                      Module: {selectedItem.moduleTitle}
                      {selectedItem.lessonTitle ? ` · Lesson: ${selectedItem.lessonTitle}` : ''}
                    </p>
                  )}
                </div>

                {/* Why This Step? Box (Section 17) */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">
                      Recommended Action
                    </span>
                    <span className={`font-mono font-bold ${getActionTone(selectedItem.action)}`}>
                      {selectedItem.action.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedItem.reason}
                  </p>
                </div>

                {/* Learner Readiness Metrics Grid (Section 16) */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">
                    Your Readiness Profile for {selectedItem.conceptName}
                  </span>
                  <div className="grid grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] font-sans font-semibold text-slate-500 block">
                        Current Hybrid Mastery
                      </span>
                      <span className="text-base font-bold text-slate-900">
                        {(selectedItem.mastery * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] font-sans font-semibold text-slate-500 block">
                        BKT Knowledge Estimate
                      </span>
                      <span className="text-base font-bold text-violet-700">
                        {selectedItem.bktKnowledge !== undefined
                          ? `${(selectedItem.bktKnowledge * 100).toFixed(0)}%`
                          : 'Not yet traced'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] font-sans font-semibold text-slate-500 block">
                        IRT Ability vs. Difficulty
                      </span>
                      <span className="text-sm font-bold text-blue-700">
                        {selectedItem.irtAbility !== undefined
                          ? `${(selectedItem.irtAbility * 100).toFixed(0)}% vs ${(selectedItem.estimatedDifficulty * 100).toFixed(0)}% diff`
                          : 'N/A'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] font-sans font-semibold text-slate-500 block">
                        Forgetting Risk (FSFR)
                      </span>
                      <span
                        className={`text-base font-bold ${
                          selectedItem.forgettingRisk >= 0.35
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {(selectedItem.forgettingRisk * 100).toFixed(0)}% ({selectedItem.daysSinceLastReview}d gap)
                      </span>
                    </div>

                    {roadmap.mlAvailable && selectedItem.mlProbability !== undefined && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 col-span-2 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-sans font-semibold text-slate-500 block">
                            ML Mastery Readiness Signal
                          </span>
                          <span className="text-[11px] font-sans text-slate-600">
                            Combined with Bayesian & BKT evidence
                          </span>
                        </div>
                        <span className="text-base font-bold text-indigo-700">
                          {(selectedItem.mlProbability * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prerequisites Status List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Prerequisites ({selectedItem.prerequisites.length})
                    </span>
                    <button
                      onClick={() => handleViewInMindMap(selectedItem.conceptId)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      View in Mind Map →
                    </button>
                  </div>

                  {selectedItem.prerequisites.length === 0 ? (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                      Foundational entry concept — no prior prerequisites required.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedItem.prerequisites.map((prereq) => (
                        <div
                          key={prereq.conceptId}
                          onClick={() => setSelectedConceptId(prereq.conceptId)}
                          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between text-xs cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {prereq.satisfied ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-800">
                              {prereq.conceptName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span
                              className={`font-bold ${
                                prereq.satisfied ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {(prereq.mastery * 100).toFixed(0)}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {prereq.satisfied ? 'Ready' : 'Needs ≥70%'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Learning Activities & Mind Map Connection (Section 16 & 21) */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">
                    Available Learning Activities
                  </span>

                  <button
                    onClick={() =>
                      handleStartActivity(
                        selectedItem.conceptId,
                        selectedItem.lessonId,
                        selectedItem.action
                      )
                    }
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>
                        {selectedItem.action === 'PRACTICE'
                          ? `Start Practice: ${selectedItem.conceptName}`
                          : selectedItem.action === 'REVIEW'
                          ? `Review Concept: ${selectedItem.conceptName}`
                          : selectedItem.action === 'CHALLENGE'
                          ? `Start Challenge: ${selectedItem.conceptName}`
                          : `Continue Learning: ${selectedItem.conceptName}`}
                      </span>
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setTargetConceptId(selectedItem.conceptId);
                        setActiveView('student_flashcards');
                      }}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Brain className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Flashcards</span>
                    </button>

                    <button
                      onClick={() => {
                        setTargetConceptId(selectedItem.conceptId);
                        setIsGlobalChatOpen(true);
                      }}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Ask AI Tutor</span>
                    </button>
                  </div>

                  {/* Direct Mind Map <-> Roadmap Connection (Section 21) */}
                  <button
                    onClick={() => handleViewInMindMap(selectedItem.conceptId)}
                    className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Network className="w-3.5 h-3.5 text-indigo-600" />
                    <span>View Prerequisite Structure in Mind Map</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
