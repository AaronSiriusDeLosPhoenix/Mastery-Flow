import React from 'react';
import { Recommendation, RecommendationAction } from '../types.js';
import { useApp } from '../context/AppContext.js';
import {
  ArrowRight,
  TrendingUp,
  Brain,
  Clock,
  HelpCircle,
  ShieldCheck,
  UserCheck,
  Cpu,
  Sparkles,
} from 'lucide-react';

interface WhyNextCardProps {
  recommendation?: Recommendation;
  onExecuteAction?: (conceptId: string, action: RecommendationAction) => void;
}

export const WhyNextCard: React.FC<WhyNextCardProps> = ({
  recommendation,
  onExecuteAction,
}) => {
  const { currentLearner } = useApp();

  if (!recommendation) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800">Why This Next?</h3>
        <p className="text-xs text-slate-500 mt-1">
          Complete the diagnostic assessment to generate your personalized deterministic recommendation.
        </p>
      </div>
    );
  }

  const { action, conceptId, conceptName, reason, evidenceSummary, isOverridden, overrideDetails } =
    recommendation;

  const conceptMasteryState = currentLearner?.conceptMasteries[conceptId];
  const mlPred = conceptMasteryState?.mlPrediction;
  const bktMastery = conceptMasteryState?.bktMastery;

  const getActionTheme = (act: RecommendationAction) => {
    switch (act) {
      case 'ADVANCE':
        return {
          accentColor: 'text-emerald-700',
          borderColor: 'border-emerald-500',
          bgHighlight: 'bg-emerald-50/50',
          label: 'Advance to Next Concept',
          btnText: `Advance to ${conceptName}`,
          btnColor: 'bg-emerald-700 hover:bg-emerald-800 text-white',
        };
      case 'PRACTICE':
        return {
          accentColor: 'text-blue-700',
          borderColor: 'border-blue-500',
          bgHighlight: 'bg-blue-50/50',
          label: 'Structured Practice',
          btnText: `Practice ${conceptName}`,
          btnColor: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
      case 'REVIEW':
        return {
          accentColor: 'text-amber-700',
          borderColor: 'border-amber-500',
          bgHighlight: 'bg-amber-50/50',
          label: 'Spaced Retrieval Review',
          btnText: `Review ${conceptName}`,
          btnColor: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
      case 'REMEDIATE_PREREQUISITE':
        return {
          accentColor: 'text-amber-800',
          borderColor: 'border-amber-600',
          bgHighlight: 'bg-amber-50/60',
          label: 'Remediate Prerequisite',
          btnText: `Remediate ${conceptName}`,
          btnColor: 'bg-amber-700 hover:bg-amber-800 text-white',
        };
      case 'CHALLENGE':
        return {
          accentColor: 'text-purple-700',
          borderColor: 'border-purple-500',
          bgHighlight: 'bg-purple-50/50',
          label: 'Mastery Challenge',
          btnText: `Challenge ${conceptName}`,
          btnColor: 'bg-purple-700 hover:bg-purple-800 text-white',
        };
      case 'TEACHER_INTERVENTION':
        return {
          accentColor: 'text-rose-700',
          borderColor: 'border-rose-500',
          bgHighlight: 'bg-rose-50/60',
          label: 'Teacher Intervention Required',
          btnText: `Request Guidance on ${conceptName}`,
          btnColor: 'bg-rose-600 hover:bg-rose-700 text-white',
        };
    }
  };

  const theme = getActionTheme(action);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      
      {/* Top Header Row */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-medium">
            <span>Adaptive Decision Model</span>
            <span aria-hidden="true">·</span>
            <span>Deterministic Rationale</span>
            {isOverridden && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 font-semibold flex items-center space-x-1">
                  <UserCheck className="w-3 h-3" />
                  <span>Faculty Override</span>
                </span>
              </>
            )}
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-0.5">Why This Next?</h2>
        </div>

        {/* Clean Unboxed Action Indicator */}
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Selected Action
          </div>
          <div className={`text-xs font-bold uppercase tracking-wide ${theme.accentColor}`}>
            {action.replace('_', ' ')}: {conceptName}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Core Rationale Callout with Hairline Left Border */}
        <div className={`p-4 rounded-lg border-l-4 ${theme.borderColor} ${theme.bgHighlight}`}>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Target Unit: {conceptName} ({theme.label})
          </div>
          <p className="text-sm font-medium leading-relaxed text-slate-800">
            "{reason}"
          </p>
        </div>

        {/* Evidence Signals Grid (Clean tabular format) */}
        <div>
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-semibold text-slate-700">Multi-Signal Evidence State</span>
            <span className="text-slate-400 font-mono text-[11px]">Formula: 0.45(Acc) + 0.20(Conf) + 0.15(Diff) + 0.10(Speed) + 0.10(Indep)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            
            {/* 1. Mastery */}
            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/60">
              <span className="text-[11px] text-slate-500 font-medium block">Current Mastery</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5 block">
                {(evidenceSummary.mastery * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Threshold: ≥ 75%</span>
            </div>

            {/* 2. Retention */}
            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/60">
              <span className="text-[11px] text-slate-500 font-medium block">Retention Decay</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5 block">
                {(evidenceSummary.retention * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono tabular-nums">
                {evidenceSummary.daysSinceReview}d since practice
              </span>
            </div>

            {/* 3. Uncertainty */}
            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/60">
              <span className="text-[11px] text-slate-500 font-medium block">Model Uncertainty</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5 block">
                {(evidenceSummary.uncertainty * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {evidenceSummary.uncertainty < 0.25 ? 'High confidence' : 'Calibrating'}
              </span>
            </div>

            {/* 4. Prerequisite Status */}
            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/60">
              <span className="text-[11px] text-slate-500 font-medium block">Prerequisites</span>
              <span className="text-xs font-bold text-slate-900 mt-1 block truncate">
                {evidenceSummary.prerequisiteStatus}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Gating: ≥ 70%</span>
            </div>

            {/* 5. Recent Accuracy */}
            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/60">
              <span className="text-[11px] text-slate-500 font-medium block">Recent Accuracy</span>
              <span className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-1 block">
                {evidenceSummary.recentAccuracy}
              </span>
            </div>

            {/* 6. Hints Used */}
            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/60">
              <span className="text-[11px] text-slate-500 font-medium block">Hints Incurred</span>
              <span className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-1 block">
                {evidenceSummary.hintsUsed} hints
              </span>
            </div>

            {/* 7. Transfer Performance */}
            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/60">
              <span className="text-[11px] text-slate-500 font-medium block">Transfer Gate</span>
              <span className="text-sm font-bold text-slate-900 mt-1 block truncate">
                {evidenceSummary.transferPerformance}
              </span>
            </div>

            {/* 8. Guessing Risk */}
            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/60">
              <span className="text-[11px] text-slate-500 font-medium block">Guessing Risk</span>
              <span className="text-sm font-bold text-slate-900 mt-1 block truncate">
                {evidenceSummary.guessingRisk}
              </span>
            </div>

          </div>
        </div>

        {/* PHASE 8: ML Predictive Signal Explainability Callout */}
        {mlPred && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-slate-50 border border-indigo-200/70 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                    <span>ML Predicted Mastery:</span>
                    <span className="text-indigo-700 font-mono">{(mlPred.probability * 100).toFixed(0)}%</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      mlPred.category === 'Mastered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : mlPred.category === 'Strong'
                        ? 'bg-indigo-100 text-indigo-800'
                        : mlPred.category === 'Developing'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {mlPred.category}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-[11px] text-slate-600">
                      Hybrid: <strong className="font-mono text-slate-900">{((mlPred.hybridMastery ?? evidenceSummary.mastery) * 100).toFixed(0)}%</strong>
                    </span>
                    {bktMastery !== undefined && (
                      <>
                        <span className="text-slate-400">·</span>
                        <span className="text-[11px] text-slate-600">
                          BKT: <strong className="font-mono text-slate-900">{(bktMastery * 100).toFixed(0)}%</strong>
                        </span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-medium">
                <span>Model: <strong className="text-slate-700">{mlPred.modelVersion}</strong></span>
                <span>·</span>
                <span>Status: <strong className="text-emerald-700">{mlPred.modelVersion.includes('baseline') ? 'FALLBACK' : 'TRAINED'}</strong></span>
                <span>·</span>
                <span>Confidence: <strong className="text-slate-700">{(mlPred.confidence * 100).toFixed(0)}%</strong></span>
              </div>
            </div>

            {/* Top Influencing Features */}
            {mlPred.topContributingFeatures && mlPred.topContributingFeatures.length > 0 && (
              <div className="pt-2 border-t border-indigo-100/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Top Cognitive Drivers (Supervised Logistic Weights):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {mlPred.topContributingFeatures.map((f, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                        f.direction === 'positive'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      <span>
                        {f.name === 'recentAccuracy'
                          ? 'Recent Accuracy'
                          : f.name === 'prerequisiteMasteryRatio'
                          ? 'Prerequisites Foundation'
                          : f.name === 'flashcardReviewScore'
                          ? 'Active Recall Retention'
                          : f.name === 'transferAccuracy'
                          ? 'Transfer Problem Solving'
                          : f.name === 'incorrectCount'
                          ? 'Cumulative Errors'
                          : f.name === 'antiGuessingFrequency'
                          ? 'Cognitive Deliberation'
                          : f.name}
                      </span>
                      <span className="font-bold text-[10px] font-mono">
                        {f.direction === 'positive' ? '▲' : '▼'}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Teacher override notification if active */}
        {isOverridden && overrideDetails && (
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-md text-xs text-amber-900">
            <span className="font-bold">Faculty Directive: </span>
            <span>
              {overrideDetails.teacherName} overrode autonomous engine output ({overrideDetails.previousAction}) with reason: "{overrideDetails.reason}" at {new Date(overrideDetails.timestamp).toLocaleTimeString()}.
            </span>
          </div>
        )}

        {/* CTA Button */}
        {onExecuteAction && (
          <div className="pt-2 flex items-center justify-end">
            <button
              onClick={() => onExecuteAction(conceptId, action)}
              className={`flex items-center space-x-2 px-5 py-2 rounded-md font-semibold text-xs shadow-xs transition-colors cursor-pointer ${theme.btnColor}`}
            >
              <span>{theme.btnText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
