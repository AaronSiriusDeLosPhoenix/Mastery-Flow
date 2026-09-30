import React from 'react';
import { MindMapNode } from '../types.js';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
  FileText,
  AlertTriangle,
  ArrowRight,
  X,
  Target,
  Layers,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  Zap,
  Compass,
} from 'lucide-react';

interface MindMapDetailsPanelProps {
  node: MindMapNode | null;
  onClose: () => void;
  onNavigateToLesson: (lessonId: string, conceptId?: string) => void;
  onOpenSummaryNotes: (conceptId: string) => void;
  onOpenTutor: (conceptId: string) => void;
  onSelectNodeById: (nodeId: string) => void;
  onOpenInRoadmap?: (conceptId: string) => void;
}

export const MindMapDetailsPanel: React.FC<MindMapDetailsPanelProps> = ({
  node,
  onClose,
  onNavigateToLesson,
  onOpenSummaryNotes,
  onOpenTutor,
  onSelectNodeById,
  onOpenInRoadmap,
}) => {
  if (!node) return null;

  const getStatusBadge = () => {
    switch (node.status) {
      case 'MASTERED':
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mastered (≥75%)</span>
          </span>
        );
      case 'DEVELOPING':
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <span>Developing ({node.progress}%)</span>
          </span>
        );
      case 'LEARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>Learning ({node.progress}%)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Not Started</span>
          </span>
        );
    }
  };

  const getTypeLabel = () => {
    switch (node.type) {
      case 'subject':
        return { label: 'Subject Curriculum', color: 'bg-indigo-600 text-white' };
      case 'module':
        return { label: 'Syllabus Module', color: 'bg-blue-600 text-white' };
      case 'lesson':
        return { label: 'Lesson Unit', color: 'bg-violet-600 text-white' };
      case 'concept':
        return { label: 'Core Concept', color: 'bg-emerald-600 text-white' };
      case 'subconcept':
        return { label: 'Sub-Topic', color: 'bg-slate-600 text-white' };
      default:
        return { label: 'Node', color: 'bg-slate-600 text-white' };
    }
  };

  const typeInfo = getTypeLabel();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-lg flex flex-col justify-between max-h-[80vh] overflow-y-auto space-y-5 animate-in fade-in duration-200">
      <div className="space-y-4">
        {/* Header with Type & Close */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            {node.code && (
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {node.code}
              </span>
            )}
            {getStatusBadge()}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Hierarchy Breadcrumbs */}
        <div>
          {(node.moduleTitle || node.lessonTitle) && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1 flex-wrap">
              {node.moduleTitle && (
                <>
                  <span className="truncate max-w-[140px]">{node.moduleTitle}</span>
                  <ChevronRight className="w-3 h-3 text-slate-300" />
                </>
              )}
              {node.lessonTitle && (
                <span className="text-slate-600 font-semibold truncate max-w-[140px]">
                  {node.lessonTitle}
                </span>
              )}
            </div>
          )}
          <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
            {node.label}
          </h2>
        </div>

        {/* Description */}
        {node.description && (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
            {node.description}
          </p>
        )}

        {/* Mastery & Progress Bar */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>Current Progress:</span>
            </span>
            <span className="font-mono font-extrabold text-slate-900">
              {node.progress}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                node.progress >= 75
                  ? 'bg-emerald-500'
                  : node.progress >= 50
                  ? 'bg-amber-500'
                  : node.progress > 0
                  ? 'bg-indigo-600'
                  : 'bg-slate-300'
              }`}
              style={{ width: `${Math.max(4, node.progress)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Attempts: <strong>{node.attemptsCount ?? 0}</strong></span>
            {node.retention !== undefined && (
              <span>Retention: <strong>{Math.round(node.retention * 100)}%</strong></span>
            )}
            {node.bloomTarget && (
              <span className="text-purple-700 font-semibold">Bloom: {node.bloomTarget}</span>
            )}
          </div>
        </div>

        {/* KNOWLEDGE GAP CALLOUT (PART 9) */}
        {node.hasKnowledgeGap && (
          <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Knowledge Gap Detected
              </span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              {node.knowledgeGapReason ||
                'This concept has prerequisite vulnerabilities or decaying retention that hinder higher-order progression.'}
            </p>
            {node.knowledgeGapAction && (
              <p className="text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Recommended: {node.knowledgeGapAction}</span>
              </p>
            )}
          </div>
        )}

        {/* PREREQUISITES LIST */}
        {node.prerequisites && node.prerequisites.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 block">
              Prerequisite Concepts:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {node.prerequisites.map((pId, idx) => {
                const pName = node.prerequisiteNames?.[idx] || pId;
                return (
                  <button
                    key={pId}
                    onClick={() => onSelectNodeById(pId)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors cursor-pointer"
                  >
                    <span>{pName}</span>
                    <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* DEPENDENT CONCEPTS LIST */}
        {node.dependentConceptIds && node.dependentConceptIds.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 block">
              Unlocks Subsequent Concepts:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {node.dependentConceptIds.map((depId, idx) => {
                const depName = node.dependentConceptNames?.[idx] || depId;
                return (
                  <button
                    key={depId}
                    onClick={() => onSelectNodeById(depId)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    <span>{depName}</span>
                    <ChevronRight className="w-2.5 h-2.5 opacity-60" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SUB-CONCEPTS LIST */}
        {node.subConcepts && node.subConcepts.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 block">
              Sub-Concepts & Topics Covered:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {node.subConcepts.map((sub, idx) => (
                <span
                  key={idx}
                  className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                >
                  • {sub}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* LESSON LEARNING OBJECTIVES */}
        {node.learningObjectives && node.learningObjectives.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 block">
              Learning Objectives:
            </span>
            <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
              {node.learningObjectives.map((obj, idx) => (
                <li key={idx}>{obj}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ACTION BUTTONS (PART 10, 11, 12, 13) */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        {/* Main Lesson Navigation Button */}
        {(node.lessonId || node.conceptId || node.type === 'lesson') && (
          <button
            onClick={() => {
              const targetLesson = node.lessonId || (node.type === 'lesson' ? node.id : undefined);
              const targetConcept = node.conceptId || (node.type === 'concept' ? node.id : undefined);
              if (targetLesson) {
                onNavigateToLesson(targetLesson, targetConcept);
              } else if (targetConcept) {
                onNavigateToLesson('', targetConcept);
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>{node.progress === 0 ? 'Start Learning' : 'Open Lesson & Practice'}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-auto" />
          </button>
        )}

        {/* AI Summary Notes & AI Tutor Buttons for Concepts */}
        {(node.type === 'concept' || node.conceptId) && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenSummaryNotes(node.conceptId || node.id)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{node.summaryAvailable ? 'View Notes' : 'AI Summary'}</span>
            </button>

            <button
              onClick={() => onOpenTutor(node.conceptId || node.id)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-colors cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ask AI Tutor</span>
            </button>
          </div>
        )}

        {/* Prerequisite gap remediation button */}
        {node.hasKnowledgeGap && node.prerequisites && node.prerequisites.length > 0 && (
          <button
            onClick={() => onSelectNodeById(node.prerequisites![0])}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
            <span>Review Weak Prerequisite</span>
          </button>
        )}

        {/* Section 21: Mind Map <-> Roadmap Connection */}
        {onOpenInRoadmap && (node.type === 'concept' || node.conceptId) && (
          <button
            onClick={() => onOpenInRoadmap(node.conceptId || node.id)}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>View This Concept in My Roadmap</span>
          </button>
        )}
      </div>
    </div>
  );
};
