import React from 'react';
import { useApp } from '../context/AppContext.js';
import { WhyNextCard } from '../components/WhyNextCard.js';
import { GovtBenefitsHub } from '../components/GovtBenefitsHub.js';
import {
  TrendingUp,
  Flame,
  Clock,
  ArrowRight,
  CheckCircle2,
  Brain,
  Landmark,
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
  const domainConcepts = concepts.filter((c) => !activeDomainId || c.domainId === activeDomainId);
  const activeConceptsList = domainConcepts.length > 0 ? domainConcepts : concepts;

  // Compute genuine learner concept breakdown from currentLearner.conceptMasteries
  const masteriesList = activeConceptsList
    .map((c) => currentLearner.conceptMasteries[c.id])
    .filter(Boolean);
  const allMasteriesList = Object.values(currentLearner.conceptMasteries);

  const overallMasteryPct = Math.round((currentLearner.overallMastery || 0) * 100);
  const overallRetentionPct = Math.round((currentLearner.overallRetention || 0) * 100);

  const masteredConcepts = masteriesList.filter((m) => m.mastery >= 0.75 && m.retention >= 0.65);
  const forgettingRiskConcepts = masteriesList.filter(
    (m) => (m.mastery >= 0.65 && m.retention < 0.65) || m.daysSinceLastReview >= 10
  );
  const developingConcepts = masteriesList.filter(
    (m) => m.mastery >= 0.50 && m.mastery < 0.75 && m.retention >= 0.65
  );
  const needsPracticeConcepts = masteriesList.filter(
    (m) => m.attemptsCount > 0 && m.mastery < 0.50
  );

  // Target concept for the Learner AI Intelligence View
  const targetConceptIdForIntel =
    currentLearner.currentRecommendation?.conceptId || activeConceptsList[0]?.id || 'arrays';
  const targetConceptObj =
    concepts.find((c) => c.id === targetConceptIdForIntel) || activeConceptsList[0];
  const targetMasteryState = currentLearner.conceptMasteries[targetConceptIdForIntel];

  const bktScore = targetMasteryState?.bktMastery ?? targetMasteryState?.mastery ?? 0.20;
  const mlScore = targetMasteryState?.mlPrediction?.probability ?? targetMasteryState?.mastery ?? 0.50;
  const hybridScore =
    targetMasteryState?.mlPrediction?.hybridMastery ?? targetMasteryState?.mastery ?? 0.40;
  const fsfrRetention = targetMasteryState?.retention ?? 0.50;
  const forgettingRisk = Math.max(0, Math.min(1, 1 - fsfrRetention));

  // IRT Ability vs Item Difficulty Estimate (weighted across Easy, Medium, Hard, Transfer items)
  const easyAcc = targetMasteryState?.easyAccuracy ?? 0.5;
  const medAcc = targetMasteryState?.mediumAccuracy ?? 0.5;
  const hardAcc = targetMasteryState?.hardAccuracy ?? 0.5;
  const transferAcc = targetMasteryState?.transferAccuracy ?? 0.5;
  const irtAbilityEstimate = Math.max(
    0,
    Math.min(1, 0.15 * easyAcc + 0.25 * medAcc + 0.35 * hardAcc + 0.25 * transferAcc)
  );
  const irtTheta = ((irtAbilityEstimate - 0.5) * 4).toFixed(2);

  // Build Personalized Adaptive Roadmap across domain concepts
  const personalizedRoadmap = activeConceptsList.map((concept) => {
    const cm = currentLearner.conceptMasteries[concept.id];
    const masteryVal = cm?.mastery ?? 0;
    const retentionVal = cm?.retention ?? 0;
    const mlProb = cm?.mlPrediction?.probability ?? masteryVal;
    const missingPrereqs = concept.prerequisites.filter((pId) => {
      const pState = currentLearner.conceptMasteries[pId];
      return !pState || pState.mastery < 0.70;
    });
    const isCurrentRec = currentLearner.currentRecommendation?.conceptId === concept.id;

    let roadAction: RecommendationAction = 'PRACTICE';
    let roadReason = 'Build fluency through adaptive practice items.';

    if (isCurrentRec && currentLearner.currentRecommendation) {
      roadAction = currentLearner.currentRecommendation.action;
      roadReason = currentLearner.currentRecommendation.reason;
    } else if (missingPrereqs.length > 0) {
      roadAction = 'REMEDIATE_PREREQUISITE';
      const prereqNames = missingPrereqs
        .map((id) => concepts.find((c) => c.id === id)?.name || id)
        .join(', ');
      roadReason = `Blocked until prerequisite (${prereqNames}) reaches 70% mastery.`;
    } else if (masteryVal >= 0.70 && retentionVal < 0.65) {
      roadAction = 'REVIEW';
      roadReason = `Retention declined to ${(retentionVal * 100).toFixed(0)}% (${cm?.daysSinceLastReview || 0}d gap); spaced retrieval recommended.`;
    } else if (masteryVal >= 0.88 && (cm?.transferAccuracy ?? 0) >= 0.75) {
      roadAction = 'CHALLENGE';
      roadReason = `High mastery (${(masteryVal * 100).toFixed(0)}%) and strong transfer accuracy support advanced challenge items.`;
    } else if (masteryVal >= 0.75) {
      roadAction = 'ADVANCE';
      roadReason = `Concept mastered (${(masteryVal * 100).toFixed(0)}%); cleared to advance to dependent topics.`;
    } else if ((cm?.incorrectCount ?? 0) >= 5 && masteryVal < 0.40) {
      roadAction = 'TEACHER_INTERVENTION';
      roadReason = `Persistent difficulty detected (${cm?.incorrectCount} errors); educator guidance recommended.`;
    } else {
      roadAction = 'PRACTICE';
      roadReason = `Current hybrid mastery (${(masteryVal * 100).toFixed(0)}%) is below the 75% mastery threshold.`;
    }

    return {
      concept,
      cm,
      masteryVal,
      retentionVal,
      mlProb,
      missingPrereqs,
      isCurrentRec,
      roadAction,
      roadReason,
    };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Clean Welcome & Domain Context Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
            {currentLearner.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AS'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {currentLearner.name}
              </h1>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs font-semibold text-emerald-700">
                {activeDomain?.name || 'Adaptive Curriculum'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cohort {currentLearner.cohort} · {allMasteriesList.length} curriculum concepts tracked across 5 domains
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveView('student_govt_benefits')}
            className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Govt Scholarships & Credit Hub</span>
          </button>
          <button
            onClick={() => setIsProgressReportModalOpen(true)}
            className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            Transcript & Report
          </button>
        </div>
      </div>

      {/* 2. Key Questions Answered: What Do I Know? & What Am I Forgetting? */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Overall Hybrid Mastery */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Current Hybrid Mastery</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {overallMasteryPct}%
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              {overallMasteryPct >= 75 ? 'Strong' : overallMasteryPct >= 50 ? 'Developing' : 'Needs Focus'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${overallMasteryPct}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Concepts Mastered vs Developing */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">What Do I Know?</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-emerald-700 font-mono tabular-nums">
              {masteredConcepts.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              / {activeConceptsList.length} Mastered
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {developingConcepts.length} developing · {needsPracticeConcepts.length} need practice
          </p>
        </div>

        {/* Metric 3: What Am I Forgetting? (FSFR Retention & Risk) */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">What Am I Forgetting?</span>
            <Brain className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {forgettingRiskConcepts.length}
            </span>
            <span className="text-xs font-semibold text-amber-700">
              {forgettingRiskConcepts.length === 1 ? 'Concept at Risk' : 'Concepts at Risk'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Overall FSFR Retention: <strong className="font-mono text-slate-700">{overallRetentionPct}%</strong>
          </p>
        </div>

        {/* Metric 4: Recent Performance & Activity */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Recent Performance</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {currentLearner.recentAttempts.length > 0
                ? `${Math.round(
                    (currentLearner.recentAttempts.slice(-5).filter((a) => a.isCorrect).length /
                      Math.min(5, currentLearner.recentAttempts.length)) *
                      100
                  )}%`
                : 'N/A'}
            </span>
            <span className="text-[11px] text-slate-500">last 5 attempts</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {currentLearner.recentAttempts.length} logged attempts in profile
          </p>
        </div>
      </div>

      {/* 3. What Should I Do Next? & Why Am I Being Asked To Do This? */}
      <section>
        <WhyNextCard
          recommendation={currentLearner.currentRecommendation}
          onExecuteAction={handleExecuteAction}
        />
      </section>

      {/* 4. Mastery & AI Intelligence State View (BKT, IRT, FSFR, ML, Hybrid) */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Multi-Model Learner Intelligence State</span>
              <span aria-hidden="true">·</span>
              <span>Target Focus: <strong className="text-slate-800">{targetConceptObj?.name}</strong></span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              How MasteryFlow Estimates Your Knowledge
            </h3>
          </div>
          <button
            onClick={() => handleExecuteAction(targetConceptIdForIntel, 'PRACTICE')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Practice {targetConceptObj?.name}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Signal 1: BKT */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">BKT</span>
              <span className="text-base font-extrabold font-mono tabular-nums text-violet-700">
                {(bktScore * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-700">
              Estimated concept knowledge
            </p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Tracks sequential knowledge acquisition using prior, learn, guess, and slip probabilities.
            </p>
          </div>

          {/* Signal 2: IRT */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">IRT Alignment</span>
              <span className="text-base font-extrabold font-mono tabular-nums text-blue-700">
                {(irtAbilityEstimate * 100).toFixed(0)}% (θ={Number(irtTheta) >= 0 ? `+${irtTheta}` : irtTheta})
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-700">
              Estimated learner ability relative to item difficulty
            </p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Weights performance across Easy ({(easyAcc * 100).toFixed(0)}%), Medium ({(medAcc * 100).toFixed(0)}%), Hard ({(hardAcc * 100).toFixed(0)}%), and Transfer ({(transferAcc * 100).toFixed(0)}%) items.
            </p>
          </div>

          {/* Signal 3: FSFR */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">FSFR</span>
              <span className={`text-base font-extrabold font-mono tabular-nums ${forgettingRisk > 0.35 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {(fsfrRetention * 100).toFixed(0)}% Ret
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-700">
              Forgetting risk: {(forgettingRisk * 100).toFixed(0)}%
            </p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Models memory decay over time ({targetMasteryState?.daysSinceLastReview ?? 0}d since last review) to schedule spaced retrieval.
            </p>
          </div>

          {/* Signal 4: Supervised ML */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Supervised ML</span>
              <span className="text-base font-extrabold font-mono tabular-nums text-indigo-700">
                {(mlScore * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-700">
              Predicted mastery from learner behavior
            </p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Calibrated Logistic Regression over 16 behavioral, fluency, confidence, and prerequisite features.
            </p>
          </div>

          {/* Signal 5: Hybrid Mastery */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950">Hybrid Mastery</span>
              <span className="text-base font-extrabold font-mono tabular-nums text-indigo-700">
                {(hybridScore * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-[11px] font-semibold text-indigo-900">
              Combined mastery estimate
            </p>
            <p className="text-[10px] text-indigo-900/80 leading-relaxed">
              Blends 45% Bayesian Evidence + 25% BKT + 30% Supervised ML with safe fallback if any signal is unavailable.
            </p>
          </div>
        </div>

        {/* AI & ML Transparency Distinction Callout */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <strong className="text-slate-800">Model Transparency: </strong>
            <span>
              <strong>Gemini AI</strong> is used strictly for generative tutoring, explanations, and reading-level adaptation — never to guess or fabricate mastery scores. Mastery and recommendations are computed deterministically by <strong>BKT</strong>, <strong>IRT</strong>, <strong>FSFR</strong>, and <strong>Calibrated Logistic Regression</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* 5. Personalized Adaptive Roadmap (Distinct from Mind Map Knowledge Structure) */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Personalized Learning Journey</span>
              <span aria-hidden="true">·</span>
              <span>Dynamically Reordered by Mastery, Prerequisites, Retention & ML</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Adaptive Curriculum Roadmap ({activeDomain?.shortLabel || 'Active Track'})
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('student_mindmap')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              View Mind Map (Knowledge Structure) →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {personalizedRoadmap.map((item, idx) => {
            const actionColors: Record<RecommendationAction, string> = {
              ADVANCE: 'border-l-emerald-500 bg-emerald-50/30',
              CHALLENGE: 'border-l-purple-500 bg-purple-50/30',
              PRACTICE: 'border-l-blue-500 bg-blue-50/30',
              REVIEW: 'border-l-amber-500 bg-amber-50/30',
              REMEDIATE_PREREQUISITE: 'border-l-amber-600 bg-amber-50/40',
              TEACHER_INTERVENTION: 'border-l-rose-500 bg-rose-50/40',
            };
            return (
              <div
                key={item.concept.id}
                className={`p-3.5 rounded-xl border border-slate-200/80 border-l-4 ${
                  actionColors[item.roadAction]
                } flex flex-col justify-between gap-2.5`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {idx + 1}. {item.concept.name}
                      {item.isCurrentRec && (
                        <span className="ml-2 text-[10px] font-bold text-indigo-700 uppercase">
                          · Next Recommended
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-slate-700">
                      {item.roadAction.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {item.roadReason}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span>Hybrid: <strong className="text-slate-800">{(item.masteryVal * 100).toFixed(0)}%</strong></span>
                    <span>·</span>
                    <span>ML: <strong className="text-indigo-700">{(item.mlProb * 100).toFixed(0)}%</strong></span>
                    <span>·</span>
                    <span>Ret: <strong className="text-slate-800">{(item.retentionVal * 100).toFixed(0)}%</strong></span>
                  </div>
                  <button
                    onClick={() => handleExecuteAction(item.concept.id, item.roadAction)}
                    className="text-xs font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Start</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Government Benefits, Scholarships & Credit Hub */}
      <GovtBenefitsHub compact={true} />
    </div>
  );
};
