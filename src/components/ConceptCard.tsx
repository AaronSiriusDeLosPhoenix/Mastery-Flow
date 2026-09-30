import React from 'react';
import { Concept, ConceptMastery } from '../types.js';
import { Brain, Clock, HelpCircle, CheckCircle, ShieldAlert, ArrowRight, Lock } from 'lucide-react';
import { MasteryProgress } from './MasteryProgress.js';

interface ConceptCardProps {
  concept: Concept;
  mastery?: ConceptMastery;
  onPractice: (conceptId: string) => void;
  prerequisitesMet: boolean;
}

export const ConceptCard: React.FC<ConceptCardProps> = ({
  concept,
  mastery,
  onPractice,
  prerequisitesMet,
}) => {
  const currentScore = mastery ? mastery.mastery : 0;
  const currentRetention = mastery ? mastery.retention : 0;
  const currentUncertainty = mastery ? mastery.uncertainty : 0.85;

  const isMastered = currentScore >= 0.75;
  const isReviewNeeded = mastery && mastery.status === 'review_needed';

  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
      !prerequisitesMet ? 'border-slate-200/60 bg-slate-50/50 opacity-80' : 'border-slate-200'
    }`}>
      <div>
        {/* Header kicker */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono text-slate-400 font-semibold">
            {concept.code}
          </span>
          {isMastered ? (
            <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-700">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mastered</span>
            </span>
          ) : isReviewNeeded ? (
            <span className="flex items-center space-x-1 text-xs font-semibold text-amber-700">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Review Due</span>
            </span>
          ) : !prerequisitesMet ? (
            <span className="flex items-center space-x-1 text-xs font-medium text-slate-400">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Prereq Blocked</span>
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-600">
              In Progress
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h4 className="text-sm font-bold text-slate-900 leading-snug">{concept.name}</h4>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
          {concept.description}
        </p>

        {/* Multi-Signal Metrics */}
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
          <MasteryProgress value={currentScore} />

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-md bg-slate-50 border border-slate-200/60">
              <span className="text-[10px] text-slate-400 font-medium block">Retention</span>
              <span className="font-bold text-slate-800 font-mono tabular-nums">
                {(currentRetention * 100).toFixed(0)}%
              </span>
            </div>
            <div className="p-2 rounded-md bg-purple-50/70 border border-purple-200/60">
              <span className="text-[10px] text-purple-700 font-medium block">BKT P(Know)</span>
              <span className="font-bold text-purple-950 font-mono tabular-nums">
                {mastery?.bktMastery !== undefined ? `${(mastery.bktMastery * 100).toFixed(0)}%` : '15%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-100/60">
        <span className="text-[11px] text-slate-400 font-mono tabular-nums">
          {mastery?.attemptsCount || 0} attempts
        </span>
        <button
          onClick={() => onPractice(concept.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
            prerequisitesMet
              ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
          disabled={!prerequisitesMet}
        >
          <span>{isReviewNeeded ? 'Review' : 'Practice'}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
