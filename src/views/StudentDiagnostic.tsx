import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { Question } from '../types.js';
import * as api from '../api/client.js';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  HelpCircle,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  Brain,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const StudentDiagnostic: React.FC = () => {
  const { currentLearner, refreshLearner, setActiveView, setTargetConceptId } = useApp();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number>(0.80);
  const [hintShown, setHintShown] = useState<boolean>(false);
  const [hintsCount, setHintsCount] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [responses, setResponses] = useState<
    {
      questionId: string;
      selectedOptionIndex: number;
      confidence: number;
      responseTimeSeconds: number;
      hintsUsed: number;
    }[]
  >([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completedProfile, setCompletedProfile] = useState<any>(null);

  useEffect(() => {
    async function loadQuestions() {
      try {
        const qList = await api.fetchDiagnosticQuestions();
        setQuestions(qList);
        setStartTime(Date.now());
      } catch (err) {
        console.error('Failed to load diagnostic questions:', err);
      }
    }
    loadQuestions();
  }, []);

  const currentQuestion = questions[currentIndex];

  const handleNextQuestion = () => {
    if (selectedOption === null || !currentQuestion) return;

    const responseTimeSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const newResponses = [
      ...responses,
      {
        questionId: currentQuestion.id,
        selectedOptionIndex: selectedOption,
        confidence,
        responseTimeSeconds,
        hintsUsed: hintsCount,
      },
    ];
    setResponses(newResponses);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setConfidence(0.80);
      setHintShown(false);
      setHintsCount(0);
      setStartTime(Date.now());
    } else {
      // Diagnostic completed! Submit to engine
      submitAll(newResponses);
    }
  };

  const submitAll = async (allResponses: typeof responses) => {
    if (!currentLearner) return;
    try {
      setSubmitting(true);
      const updatedLearner = await api.submitDiagnostic(currentLearner.id, allResponses);
      await refreshLearner();
      setCompletedProfile(updatedLearner);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Error submitting diagnostic:', err);
      alert('Error submitting diagnostic test');
    } finally {
      setSubmitting(false);
    }
  };

  if (completedProfile) {
    const diag = completedProfile.diagnosticResult;
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                Assessment Complete
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Your Initial Learning Profile
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-400 block">Initial Baseline Mastery</span>
              <span className="text-2xl font-extrabold text-blue-600 mt-1 block">
                {((diag?.initialMastery || 0) * 100).toFixed(0)}%
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Multi-signal baseline</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-400 block">Calibrated Uncertainty</span>
              <span className="text-2xl font-extrabold text-indigo-600 mt-1 block">
                {((completedProfile.overallUncertainty || 0) * 100).toFixed(0)}%
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Confidence & speed bounded</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-400 block">First Engine Action</span>
              <span className="text-base font-extrabold text-slate-900 mt-1 block uppercase">
                {completedProfile.currentRecommendation?.action.replace('_', ' ')}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Target: {completedProfile.currentRecommendation?.conceptName}
              </span>
            </div>
          </div>

          {/* Weak Prerequisites & Strong Concepts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-800 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Prerequisite Deficits Identified</span>
              </div>
              {diag?.weakPrerequisites && diag.weakPrerequisites.length > 0 ? (
                <ul className="text-xs text-amber-900 space-y-1 pl-4 list-disc">
                  {diag.weakPrerequisites.map((p: string) => (
                    <li key={p} className="font-semibold">{p}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-amber-700">No critical prerequisite gaps identified.</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Foundational Strengths</span>
              </div>
              {diag?.strongConcepts && diag.strongConcepts.length > 0 ? (
                <ul className="text-xs text-emerald-900 space-y-1 pl-4 list-disc">
                  {diag.strongConcepts.map((s: string) => (
                    <li key={s} className="font-semibold">{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-emerald-700">Baseline established across all fundamental topics.</p>
              )}
            </div>
          </div>

          {/* Engine Reason */}
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 mb-6">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-1">
              Autonomous Recommendation Rationale
            </div>
            <p className="text-xs text-blue-900 leading-relaxed font-medium">
              "{completedProfile.currentRecommendation?.reason}"
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setActiveView('student_dashboard')}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                if (completedProfile.currentRecommendation?.conceptId) {
                  setTargetConceptId(completedProfile.currentRecommendation.conceptId);
                }
                setActiveView('student_learn');
              }}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center space-x-1.5"
            >
              <span>Begin Recommended Action</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading diagnostic assessment questions...
      </div>
    );
  }

  const progressPct = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Top Diagnostic Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Cold-Start Diagnostic Assessment</h2>
            <p className="text-xs text-slate-500 font-medium">
              Question {currentIndex + 1} of {questions.length} • Concept & Prerequisite Gating
            </p>
          </div>
        </div>
        <div className="w-24 text-right">
          <div className="text-xs font-extrabold text-blue-600">{progressPct.toFixed(0)}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Badges */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            {currentQuestion.conceptId.toUpperCase()}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
            {currentQuestion.difficulty}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
            {currentQuestion.questionType}
          </span>
        </div>

        {/* Question Text */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
          {currentQuestion.questionText}
        </h3>

        {/* Options */}
        <div className="space-y-2.5">
          {currentQuestion.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            return (
              <button
                key={idx}
                onClick={() => setSelectedOption(idx)}
                className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm font-medium transition cursor-pointer flex items-start space-x-3 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 text-blue-950 shadow-xs ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-700'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="pt-0.5">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Confidence Selector */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Self-Assessed Confidence
            </span>
            <span className="text-xs font-extrabold text-slate-800">
              {(confidence * 100).toFixed(0)}% — {confidence >= 0.8 ? 'Confident' : confidence >= 0.5 ? 'Tentative' : 'Guess'}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: 0.25, label: '25% Guess' },
              { val: 0.50, label: '50% Unsure' },
              { val: 0.80, label: '80% Solid' },
              { val: 1.00, label: '100% Certain' },
            ].map((c) => (
              <button
                key={c.val}
                type="button"
                onClick={() => setConfidence(c.val)}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                  confidence === c.val
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hint Section */}
        <div className="flex items-center justify-between pt-2">
          {!hintShown ? (
            <button
              onClick={() => {
                setHintShown(true);
                setHintsCount(hintsCount + 1);
              }}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center space-x-1.5 cursor-pointer"
            >
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Need a Hint? (Affects independence signal)</span>
            </button>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex-1">
              <span className="font-bold">Hint: </span>
              <span>{currentQuestion.hint}</span>
            </div>
          )}
        </div>

        {/* Next Question / Submit CTA */}
        <div className="pt-4 flex items-center justify-end">
          <button
            onClick={handleNextQuestion}
            disabled={selectedOption === null || submitting}
            className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center space-x-2 transition cursor-pointer shadow-md ${
              selectedOption !== null && !submitting
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>{currentIndex + 1 === questions.length ? 'Finalize Diagnostic' : 'Next Question'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
