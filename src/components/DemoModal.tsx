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
      title: '1. Select Student A (Alex Rivera)',
      description: 'Observe a high-performing learner with strong prerequisite foundations, high self-assessed confidence, and low hint reliance.',
      actionLabel: 'Switch to Alex Rivera & Dashboard',
      execute: () => {
        setCurrentRole('STUDENT');
        setActiveStudentId('student_a');
        setActiveView('student_dashboard');
      },
    },
    {
      step: 2,
      title: '2. Inspect the Learner Model',
      description: 'See the multidimensional profile: historical mastery, uncertainty, retention, and per-concept status badges (Mastered vs Developing).',
      actionLabel: 'View Concept Graph & Masteries',
      execute: () => {
        setActiveView('student_concepts');
      },
    },
    {
      step: 3,
      title: '3. Inspect Cold-Start Diagnostic',
      description: 'MasteryFlow evaluates new learners across difficulties and prerequisite concepts to initialize baseline mastery and uncertainty without cold-start bias.',
      actionLabel: 'Inspect Diagnostic View',
      execute: () => {
        setActiveView('student_diagnostic');
      },
    },
    {
      step: 4,
      title: '4. Submit an Interactive Attempt',
      description: 'Navigate to interactive problem solving where answers capture response time, confidence, hints used, and retry counts in real time.',
      actionLabel: 'Go to Interactive Practice on Trees',
      execute: () => {
        setTargetConceptId('trees');
        setActiveView('student_learn');
      },
    },
    {
      step: 5,
      title: '5. Multi-Signal Evidence Score (E)',
      description: 'Evidence is mathematically calculated via: E = 0.45(correct) + 0.20(confidence) + 0.15(difficulty) + 0.10(speed) + 0.10(independence).',
      actionLabel: 'View Practice Evaluation Panel',
      execute: () => {
        setActiveView('student_learn');
      },
    },
    {
      step: 6,
      title: '6. Mastery & Uncertainty Updating',
      description: 'Exponential smoothing (alpha=0.35) updates mastery incrementally while uncertainty shrinks upon consistent independent performance.',
      actionLabel: 'View Updated Dashboard',
      execute: () => {
        setActiveView('student_dashboard');
      },
    },
    {
      step: 7,
      title: '7. "Why This Next?" Transparent Card',
      description: 'Every recommendation is completely explainable. The system displays exact metrics, prerequisite status, and reasoning behind the recommendation.',
      actionLabel: 'Inspect "Why This Next?" Card',
      execute: () => {
        setActiveView('student_dashboard');
      },
    },
    {
      step: 8,
      title: '8. Prerequisite Dependency Graph Influence',
      description: 'The prerequisite DAG prevents premature progression. Binary Search Trees and Graphs cannot be attempted unless Trees mastery meets the 70% threshold.',
      actionLabel: 'Open Interactive Prerequisite DAG',
      execute: () => {
        setActiveView('student_concepts');
      },
    },
    {
      step: 9,
      title: '9. Simulate Time Gap (18-Day Decay)',
      description: 'Click "Simulate 18d Gap" in the top bar to simulate time passing. The Ebbinghaus forgetting model retention = mastery * exp(-decay * days) decays stored memory.',
      actionLabel: 'Simulate 18-Day Gap on Alex',
      execute: async () => {
        setActiveView('student_dashboard');
      },
    },
    {
      step: 10,
      title: '10. Trigger Spaced REVIEW Action',
      description: 'When retention drops below threshold despite strong historical mastery, the Decision Engine automatically issues a REVIEW action rather than ADVANCE.',
      actionLabel: 'Observe REVIEW Recommendation',
      execute: () => {
        setActiveView('student_dashboard');
      },
    },
    {
      step: 11,
      title: '11. Select Student B (Blake Chen)',
      description: 'Now switch to Student B: has prerequisite deficits on Arrays & Recursion, high hint dependency, and frequent retries.',
      actionLabel: 'Switch to Blake Chen',
      execute: () => {
        setActiveStudentId('student_b');
        setActiveView('student_dashboard');
      },
    },
    {
      step: 12,
      title: '12. Side-by-Side Two-Learner Simulation',
      description: 'Inspect the dedicated Hackathon simulation comparison: Alex and Blake side-by-side with divergent learning pathways and replays.',
      actionLabel: 'Open Two-Learner Simulation View',
      execute: () => {
        setActiveView('simulation');
      },
    },
    {
      step: 13,
      title: '13. Divergent Recommendation Verification',
      description: 'Even when both students obtain identical raw scores on a quiz, their divergent histories produce ADVANCE for Alex and REMEDIATE_PREREQUISITE for Blake.',
      actionLabel: 'Compare Divergent Actions',
      execute: () => {
        setActiveView('simulation');
      },
    },
    {
      step: 14,
      title: '14. Faculty Override Authority',
      description: 'Switch to Teacher mode. Prof. Alistair Vance can inspect Blake Chen and override the system recommendation with reasoned clinical judgment.',
      actionLabel: 'Switch to Teacher Dashboard',
      execute: () => {
        setCurrentRole('TEACHER');
        setActiveView('teacher_dashboard');
      },
    },
    {
      step: 15,
      title: '15. Immutable Teacher Audit Log',
      description: 'Every faculty override is captured in the permanent audit trail with timestamp, previous action, new action, and educator rationale.',
      actionLabel: 'Inspect Student Detail & Audit Log',
      execute: () => {
        setCurrentRole('TEACHER');
        setActiveView('teacher_student_detail');
      },
    },
    {
      step: 16,
      title: '16. Automated Stress Test Center (All 6 Tests)',
      description: 'Execute the comprehensive 6-scenario benchmark suite: transfer protection, anti-guessing resistance, prerequisite gating, retention decay, override audit, and path divergence.',
      actionLabel: 'Run All 6 Stress Tests Live',
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
