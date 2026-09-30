import React from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle,
  Play,
  ArrowRight,
} from 'lucide-react';

interface DemoStepInfo {
  step: number;
  title: string;
  description: string;
  actionLabel: string;
  execute: (helpers: any) => Promise<void> | void;
}

export const DemoModal: React.FC = () => {
  const {
    isDemoModalOpen,
    setIsDemoModalOpen,
    demoStep,
    setDemoStep,
    setActiveStudentId,
    setCurrentRole,
    setActiveView,
    setTargetConceptId,
    refreshLearner,
  } = useApp();

  if (!isDemoModalOpen) return null;

  const demoSteps: DemoStepInfo[] = [
    {
      step: 1,
      title: '1. The Problem: Static One-Size-Fits-All Learning',
      description: 'Traditional learning systems give every learner the same fixed path. MasteryFlow builds a dynamic multi-model representation of each learner to personalize what they learn, practice, review, remediate, or challenge next.',
      actionLabel: 'Open Alex Rivera (Scenario A — Strong Learner)',
      execute: () => {
        setCurrentRole('STUDENT');
        setActiveStudentId('student_a');
        setActiveView('student_dashboard');
      },
    },
    {
      step: 2,
      title: '2. Student Dashboard: What Do I Know & What Am I Forgetting?',
      description: 'Inspect the Student Dashboard answering: "What do I know?", "What am I forgetting?", "What should I do next?", and "Why am I being asked to do this?"',
      actionLabel: 'Inspect Student Dashboard',
      execute: () => {
        setCurrentRole('STUDENT');
        setActiveStudentId('student_a');
        setActiveView('student_dashboard');
      },
    },
    {
      step: 3,
      title: '3. Start a Learning Activity',
      description: 'Enter the interactive practice and learning workspace on Compiler Design or Trees where lessons, AI summary notes, and adaptive questions are integrated.',
      actionLabel: 'Start Learning Activity on Trees',
      execute: () => {
        setTargetConceptId('trees');
        setActiveView('student_learn');
      },
    },
    {
      step: 4,
      title: '4. Submit an Answer & Collect Multi-Signal Evidence',
      description: 'When a learner submits an answer, the system records correctness, self-reported confidence, item difficulty, response duration, hint usage, and retry count.',
      actionLabel: 'Open Interactive Assessment Item',
      execute: () => {
        setTargetConceptId('trees');
        setActiveView('student_learn');
      },
    },
    {
      step: 5,
      title: '5. Evidence Collection & Anti-Guessing Filter',
      description: 'Evidence is computed via E = 0.45(correct) + 0.20(confidence) + 0.15(difficulty) + 0.10(speed) + 0.10(independence), with 0.50x anti-guessing damping on rapid clicks (<3s) or repeated retries.',
      actionLabel: 'Inspect Evidence Breakdown on Dashboard',
      execute: () => {
        setActiveView('student_dashboard');
      },
    },
    {
      step: 6,
      title: '6. Mastery Update & Exponential Smoothing',
      description: 'Bayesian mastery updates incrementally via M_t = (1 - α)M_{t-1} + αE while model uncertainty shrinks with consistent independent performance.',
      actionLabel: 'View Mastery Update on Dashboard',
      execute: () => {
        setActiveView('student_dashboard');
      },
    },
    {
      step: 7,
      title: '7. BKT Knowledge Estimate (Sequential Acquisition)',
      description: 'Corbett & Anderson (1995) 4-parameter Bayesian Knowledge Tracing estimates latent concept acquisition P(L_t) using prior, learn, guess, and slip parameters.',
      actionLabel: 'View BKT Knowledge Estimate',
      execute: () => {
        setActiveView('student_dashboard');
      },
    },
    {
      step: 8,
      title: '8. IRT Ability vs. Item Difficulty Alignment',
      description: 'Models estimated learner ability (θ) relative to item difficulty across Easy, Medium, Hard, and high-order Transfer problems.',
      actionLabel: 'Inspect IRT Ability & Difficulty Profile',
      execute: () => {
        setActiveView('student_dashboard');
      },
    },
    {
      step: 9,
      title: '9. FSFR Forgetting Risk & Spaced Retrieval',
      description: 'Models memory retention R(t) = M × exp(-λ × Δt) over days elapsed since last review to proactively detect forgetting risk before knowledge collapses.',
      actionLabel: 'Inspect FSFR Forgetting Risk',
      execute: () => {
        setActiveView('student_dashboard');
      },
    },
    {
      step: 10,
      title: '10. Supervised ML Mastery Probability (Logistic Regression)',
      description: 'A calibrated L2-regularized Logistic Regression model predicts P(Mastery) ∈ [0,1] from 16 structured behavioral features without future or target leakage.',
      actionLabel: 'Inspect ML Prediction & Feature Drivers',
      execute: () => {
        setActiveView('student_dashboard');
      },
    },
    {
      step: 11,
      title: '11. Hybrid Mastery & Model Disagreement Resolution',
      description: 'Combines 45% Bayesian Evidence + 25% BKT + 30% Supervised ML into Hybrid Mastery, safely falling back to Bayesian + BKT if ML is unavailable.',
      actionLabel: 'View Hybrid Mastery & Disagreement Resolution',
      execute: () => {
        setActiveView('simulation');
      },
    },
    {
      step: 12,
      title: '12. "Why This Next?" Explainable Recommendation',
      description: 'Provides concise, non-causal, evidence-based explanations for why ADVANCE, PRACTICE, REVIEW, REMEDIATE_PREREQUISITE, CHALLENGE, or TEACHER_INTERVENTION was selected.',
      actionLabel: 'Inspect "Why This Next?" Card',
      execute: () => {
        setActiveView('student_dashboard');
      },
    },
    {
      step: 13,
      title: '13. Personalized Roadmap vs. Knowledge Mind Map',
      description: 'The Adaptive Roadmap dynamically reorders the learner journey on the Dashboard, while the Mind Map visualizes the domain prerequisite DAG structure.',
      actionLabel: 'Open Interactive Mind Map (Knowledge Structure)',
      execute: () => {
        setActiveView('student_mindmap');
      },
    },
    {
      step: 14,
      title: '14. Change Learner Behavior (Scenarios A–E)',
      description: 'Switch between Scenario A (Strong Learner), Scenario B (Struggling Practice), Scenario C (Prerequisite Deficit — Blake Chen), Scenario D (18-Day Forgetting Risk), and Scenario E (Stuck Learner — Maya Patel).',
      actionLabel: 'Open 5-Scenario Judge Switcher',
      execute: () => {
        setActiveView('simulation');
      },
    },
    {
      step: 15,
      title: '15. Demonstrate Live Recommendation Changes',
      description: 'Switch to Student B (Blake Chen) or Student C (Maya Patel) to observe the engine dynamically change from ADVANCE to REMEDIATE_PREREQUISITE or TEACHER_INTERVENTION.',
      actionLabel: 'Switch to Blake Chen (REMEDIATE_PREREQUISITE)',
      execute: () => {
        setCurrentRole('STUDENT');
        setActiveStudentId('student_b');
        setActiveView('student_dashboard');
      },
    },
    {
      step: 16,
      title: '16. Open Teacher Dashboard & Intervention Audit',
      description: 'Switch to Educator View (Prof. Alistair Vance) to inspect cohort bottlenecks, struggling learners, ML diagnostics, and immutable faculty overrides.',
      actionLabel: 'Open Teacher Dashboard',
      execute: () => {
        setCurrentRole('TEACHER');
        setActiveView('teacher_dashboard');
      },
    },
    {
      step: 17,
      title: '17. Show ML Model Health & Holdout Evaluation',
      description: 'Inspect actual stored training/validation sample counts, holdout Accuracy, Precision, Recall, F1, Log Loss, confusion matrix, and 16 feature weights.',
      actionLabel: 'Open ML Model Health & Evaluation Center',
      execute: () => {
        setActiveView('evaluation');
      },
    },
    {
      step: 18,
      title: '18. Honest ML Limitations & Safe Fallback Verification',
      description: 'Review explicit dataset size limitations (101 historical examples: 76 train / 25 holdout validation), class balance, and zero-crash fallback guarantees.',
      actionLabel: 'View Limitations & Full System Audit',
      execute: () => {
        setActiveView('evaluation');
      },
    },
  ];

  const currentStepInfo = demoSteps[demoStep - 1] || demoSteps[0];

  const handleNext = async () => {
    if (demoStep < demoSteps.length) {
      const nextStep = demoStep + 1;
      setDemoStep(nextStep);
      const nextStepInfo = demoSteps[nextStep - 1];
      await nextStepInfo.execute({});
    } else {
      setIsDemoModalOpen(false);
    }
  };

  const handlePrev = async () => {
    if (demoStep > 1) {
      const prevStep = demoStep - 1;
      setDemoStep(prevStep);
      const prevStepInfo = demoSteps[prevStep - 1];
      await prevStepInfo.execute({});
    }
  };

  const handleStepJump = async (stepNum: number) => {
    setDemoStep(stepNum);
    const stepInfo = demoSteps[stepNum - 1];
    if (stepInfo) {
      await stepInfo.execute({});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                YUVA Megathon 2026 Judge Walkthrough
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                MasteryFlow Track 4 Prototype — Step {demoStep} of {demoSteps.length}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDemoModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Dots */}
        <div className="py-3 flex items-center justify-between gap-1 overflow-x-auto">
          {demoSteps.map((s) => (
            <button
              key={s.step}
              onClick={() => handleStepJump(s.step)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                s.step === demoStep
                  ? 'w-7 bg-blue-600'
                  : s.step < demoStep
                  ? 'w-2.5 bg-emerald-500'
                  : 'w-2.5 bg-slate-200'
              }`}
              title={s.title}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="p-5 my-2 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800">
            Milestone {currentStepInfo.step}
          </div>
          <h2 className="text-lg font-bold text-slate-900">{currentStepInfo.title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {currentStepInfo.description}
          </p>
        </div>

        {/* Action Button trigger */}
        <div className="py-2">
          <button
            onClick={() => currentStepInfo.execute({})}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Navigate Now: {currentStepInfo.actionLabel}</span>
          </button>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
          <button
            onClick={handlePrev}
            disabled={demoStep === 1}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              demoStep === 1
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-bold text-slate-400">
            {demoStep} / {demoSteps.length}
          </span>

          <button
            onClick={handleNext}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
          >
            <span>{demoStep === demoSteps.length ? 'Finish Tour' : 'Next Step'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
