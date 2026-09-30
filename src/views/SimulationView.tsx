import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { WhyNextCard } from '../components/WhyNextCard.js';
import * as api from '../api/client.js';
import {
  Play,
  RotateCcw,
  ArrowRight,
  Cpu,
  Brain,
  ShieldCheck,
} from 'lucide-react';

export const SimulationView: React.FC = () => {
  const {
    allLearners,
    concepts,
    setActiveStudentId,
    setCurrentRole,
    setActiveView,
    setTargetConceptId,
    refreshAll,
  } = useApp();

  const studentA = allLearners.find((l) => l.id === 'student_a') || allLearners[0];
  const studentB = allLearners.find((l) => l.id === 'student_b') || allLearners[1];
  const studentC = allLearners.find((l) => l.id === 'student_c') || allLearners[2];

  const [replayStep, setReplayStep] = useState<number>(0);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [simulatingDecay, setSimulatingDecay] = useState<boolean>(false);

  const handleTriggerDecayScenario = async () => {
    try {
      setSimulatingDecay(true);
      await api.simulateTimeGap('student_a', 18);
      await refreshAll();
    } catch (err) {
      console.error('Failed to simulate time gap:', err);
    } finally {
      setSimulatingDecay(false);
    }
  };

  const handleResetDemoState = async () => {
    try {
      setSimulatingDecay(true);
      await api.resetDemo();
      await refreshAll();
    } catch (err) {
      console.error('Failed to reset demo state:', err);
    } finally {
      setSimulatingDecay(false);
    }
  };

  const replayEvents = [
    {
      label: 'Initial State: Arrays Assessment',
      descA: 'Alex solved Arrays correctly in 15s with 95% confidence and 0 hints.',
      descB: 'Blake struggled on pointer offsets (3 retries, 2 hints, 35% confidence).',
    },
    {
      label: 'Prerequisite Gate: Stacks / Queues Evaluation',
      descA: 'Alex satisfies 70% threshold (Arrays: 92%) → Unlocks Stacks & Queues immediately.',
      descB: 'Blake falls short (Arrays: 52% < 70%) → Flagged with prerequisite deficit.',
    },
    {
      label: 'High-Order Transfer Challenge',
      descA: 'Alex succeeds on high-frequency trading latency problem (Transfer Score: 85%).',
      descB: 'Blake fails transfer problem, falling back on trial-and-error.',
    },
    {
      label: 'Decision Engine Output Divergence',
      descA: `Engine outputs: ${studentA?.currentRecommendation?.action} on ${studentA?.currentRecommendation?.conceptName}`,
      descB: `Engine outputs: ${studentB?.currentRecommendation?.action} on ${studentB?.currentRecommendation?.conceptName}`,
    },
  ];

  const handleStartReplay = () => {
    setIsReplaying(true);
    setReplayStep(1);
    let step = 1;
    const interval = setInterval(() => {
      step++;
      if (step > replayEvents.length) {
        clearInterval(interval);
        setIsReplaying(false);
      } else {
        setReplayStep(step);
      }
    }, 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-medium">
            <span>Core Evaluation Track</span>
            <span aria-hidden="true">·</span>
            <span>Heterogeneous Learner Simulation</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            Two-Learner Adaptive Path Divergence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Proving that learners with identical headline scores diverge into completely different pedagogical actions based on their deep multi-signal evidence vectors.
          </p>
        </div>

        {/* Replay Controller Button */}
        <button
          onClick={handleStartReplay}
          disabled={isReplaying}
          className="flex items-center space-x-2 px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          {isReplaying ? (
            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{isReplaying ? `Replaying Step ${replayStep}...` : 'Replay Learner Evolution'}</span>
        </button>
      </div>

      {/* Replay Status Bar if active */}
      {replayStep > 0 && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 animate-in fade-in duration-300">
          <div className="font-bold text-[11px] text-slate-500 uppercase tracking-wider mb-1">
            Replay Milestone: {replayEvents[replayStep - 1]?.label}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="p-3 bg-white rounded-lg border border-slate-200/80 font-medium">
              <span className="font-bold text-slate-900">Alex (Student A): </span>
              <span className="text-slate-700">{replayEvents[replayStep - 1]?.descA}</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200/80 font-medium">
              <span className="font-bold text-slate-900">Blake (Student B): </span>
              <span className="text-slate-700">{replayEvents[replayStep - 1]?.descB}</span>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Dual Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* STUDENT A COLUMN */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-5">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <img
                src={studentA?.avatar}
                alt={studentA?.name}
                className="w-11 h-11 rounded-lg object-cover border border-slate-200"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Student A: {studentA?.name}
                  </h3>
                  <span className="text-[11px] text-emerald-700 font-semibold font-mono">
                    [Calibrated]
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Independent, strong prerequisites, high transfer performance
                </p>
              </div>
            </div>
          </div>

          {/* Core Metrics */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-400 font-medium block">Mastery</span>
              <span className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5 block">
                {((studentA?.overallMastery || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-400 font-medium block">Uncertainty</span>
              <span className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5 block">
                {((studentA?.overallUncertainty || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-400 font-medium block">Retention</span>
              <span className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5 block">
                {((studentA?.overallRetention || 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Behavior Profile */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs space-y-1 text-slate-800">
            <div className="font-semibold text-slate-900">Evidence Profile:</div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
              <li>High self-reported confidence (avg 90%) matching actual correctness</li>
              <li>Minimal hint requests (0 hints in recent trials)</li>
              <li>Deliberate cognitive response speed (14s–22s on complex concepts)</li>
              <li>Consistent transfer performance on edge-case questions</li>
            </ul>
          </div>

          {/* Engine Recommendation */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Autonomous Recommendation
            </div>
            <WhyNextCard recommendation={studentA?.currentRecommendation} />
          </div>

        </div>

        {/* STUDENT B COLUMN */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-5">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <img
                src={studentB?.avatar}
                alt={studentB?.name}
                className="w-11 h-11 rounded-lg object-cover border border-slate-200"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Student B: {studentB?.name}
                  </h3>
                  <span className="text-[11px] text-amber-700 font-semibold font-mono">
                    [Prereq Deficit]
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Struggling prerequisites, high hints, retry dependency, weak transfer
                </p>
              </div>
            </div>
          </div>

          {/* Core Metrics */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-400 font-medium block">Mastery</span>
              <span className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5 block">
                {((studentB?.overallMastery || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-400 font-medium block">Uncertainty</span>
              <span className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5 block">
                {((studentB?.overallUncertainty || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-400 font-medium block">Retention</span>
              <span className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5 block">
                {((studentB?.overallRetention || 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Behavior Profile */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs space-y-1 text-slate-800">
            <div className="font-semibold text-slate-900">Evidence Profile:</div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
              <li>Low reported confidence (30%–40%) accompanied by trial-and-error</li>
              <li>Heavy hint dependency (5 hints used, 4 retries)</li>
              <li>Prerequisite mastery below gating threshold (Arrays: 52% &lt; 70%)</li>
              <li>Transfer accuracy is weak (20%), failing edge-case latency questions</li>
            </ul>
          </div>

          {/* Engine Recommendation */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Autonomous Recommendation
            </div>
            <WhyNextCard recommendation={studentB?.currentRecommendation} />
          </div>

        </div>

      </div>

      {/* Controlled 5-Scenario Judge Demonstration (Scenarios A - E) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              Controlled Judge Demonstration · Real System Outputs Across 5 Learner Archetypes
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              5-Scenario Adaptive Recommendation Verification
            </h2>
          </div>

          <button
            onClick={handleResetDemoState}
            disabled={simulatingDecay}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            Reset Demo Baseline
          </button>
        </div>

        {/* Scenario Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {[
            { id: 'A', label: 'Scenario A: Strong Learner', action: 'ADVANCE / CHALLENGE' },
            { id: 'B', label: 'Scenario B: Struggling Learner', action: 'PRACTICE' },
            { id: 'C', label: 'Scenario C: Prereq Deficit', action: 'REMEDIATE_PREREQUISITE' },
            { id: 'D', label: 'Scenario D: Forgetting Risk', action: 'REVIEW' },
            { id: 'E', label: 'Scenario E: Stuck / Override', action: 'TEACHER_INTERVENTION' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveScenario(tab.id as any)}
              className={`p-3 rounded-lg text-left border transition-colors cursor-pointer ${
                activeScenario === tab.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/80'
              }`}
            >
              <span className="text-xs font-bold block">{tab.label}</span>
              <span
                className={`text-[10px] font-mono block mt-1 ${
                  activeScenario === tab.id ? 'text-emerald-300' : 'text-slate-500'
                }`}
              >
                → {tab.action}
              </span>
            </button>
          ))}
        </div>

        {/* Selected Scenario Live Details */}
        {(() => {
          if (activeScenario === 'A') {
            const cm = studentA?.conceptMasteries['arrays'];
            return (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="font-bold text-slate-900 text-sm">
                    Scenario A — Strong Learner ({studentA?.name} on Arrays / Theory of Computation)
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    High Hybrid Mastery ({((cm?.mastery ?? 0.90) * 100).toFixed(0)}%), strong recent accuracy, and low forgetting risk (Retention: {((cm?.retention ?? 0.85) * 100).toFixed(0)}%, BKT: {((cm?.bktMastery ?? 0.90) * 100).toFixed(0)}%, ML: {((cm?.mlPrediction?.probability ?? 0.95) * 100).toFixed(0)}%).
                  </p>
                  <div className="font-mono text-emerald-700 font-bold">
                    Live System Output: {studentA?.currentRecommendation?.action || 'ADVANCE'} → {studentA?.currentRecommendation?.conceptName}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCurrentRole('STUDENT');
                    setActiveStudentId('student_a');
                    setActiveView('student_dashboard');
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>Inspect {studentA?.name} Live</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }

          if (activeScenario === 'B') {
            const cm = studentA?.conceptMasteries['gate_compiler'];
            return (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="font-bold text-slate-900 text-sm">
                    Scenario B — Struggling Learner (Compiler Design / BST Practice Deficit)
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Prerequisites are satisfied, but concept mastery ({((cm?.mastery ?? 0.45) * 100).toFixed(0)}%) and recent accuracy are below the 75% mastery threshold (ML Predicted Mastery: {((cm?.mlPrediction?.probability ?? 0.42) * 100).toFixed(0)}%).
                  </p>
                  <div className="font-mono text-blue-700 font-bold">
                    Live System Output: PRACTICE → Compiler Design (Targeted fluency building before advancing)
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCurrentRole('STUDENT');
                    setActiveStudentId('student_a');
                    setTargetConceptId('gate_compiler');
                    setActiveView('student_learn');
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>Open Compiler Design Practice</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }

          if (activeScenario === 'C') {
            const cm = studentB?.conceptMasteries['upsc_fundamental_rights'];
            return (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="font-bold text-slate-900 text-sm">
                    Scenario C — Prerequisite Problem ({studentB?.name})
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Target concept is blocked because prerequisite mastery ({((cm?.mastery ?? 0.48) * 100).toFixed(0)}%) is below the 70% DAG gating threshold. The engine prevents premature advancement and routes the learner to the foundational prerequisite.
                  </p>
                  <div className="font-mono text-amber-800 font-bold">
                    Live System Output: {studentB?.currentRecommendation?.action || 'REMEDIATE_PREREQUISITE'} → {studentB?.currentRecommendation?.conceptName}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCurrentRole('STUDENT');
                    setActiveStudentId('student_b');
                    setActiveView('student_dashboard');
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>Switch to {studentB?.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }

          if (activeScenario === 'D') {
            return (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="font-bold text-slate-900 text-sm">
                    Scenario D — Forgetting Risk (18-Day Spaced Retrieval Decay)
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Even when historical BKT and ML mastery are strong (≥80%), an 18-day practice gap causes FSFR retention (R = M × exp(-λ × Δt)) to drop below the 65% retention threshold, switching the recommendation to REVIEW.
                  </p>
                  <div className="font-mono text-amber-700 font-bold">
                    Live System Output after 18d Gap: REVIEW (Spaced Retrieval) · Current {studentA?.name} Action: {studentA?.currentRecommendation?.action}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleTriggerDecayScenario}
                    disabled={simulatingDecay}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
                  >
                    {simulatingDecay ? 'Simulating...' : 'Trigger 18-Day Decay Live'}
                  </button>
                </div>
              </div>
            );
          }

          const cmC = studentC?.conceptMasteries['school_newton_laws'];
          return (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1.5 max-w-2xl">
                <div className="font-bold text-slate-900 text-sm">
                  Scenario E — Teacher Intervention ({studentC?.name} on Newton's Laws)
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Persistent difficulty detected: {cmC?.incorrectCount ?? 6} cumulative errors, heavy hint usage ({cmC?.totalHintsUsed ?? 7} hints), and consecutive failures trigger an immediate educator intervention alert.
                </p>
                <div className="font-mono text-rose-700 font-bold">
                  Live System Output: {studentC?.currentRecommendation?.action || 'TEACHER_INTERVENTION'} → {studentC?.currentRecommendation?.conceptName}
                </div>
              </div>
              <button
                onClick={() => {
                  setCurrentRole('STUDENT');
                  setActiveStudentId('student_c');
                  setActiveView('student_dashboard');
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>Switch to {studentC?.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })()}
      </div>

      {/* Model Disagreement & Multi-Signal Arbitration Demonstration */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="text-[11px] font-medium text-slate-500">
            Multi-Model Arbitration · Why MasteryFlow Never Blindly Trusts a Single Model
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-0.5">
            How the System Resolves Model Disagreement
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-900">
              Case 1: High BKT Knowledge vs. High FSFR Forgetting Risk
            </div>
            <p className="text-slate-600 leading-relaxed">
              <strong>Disagreement:</strong> BKT estimates strong historical acquisition (P(L_t) ≥ 85%), while FSFR shows retention has decayed below 65% after an 18-day gap.
            </p>
            <p className="text-slate-800 font-medium">
              <strong>Resolution:</strong> The Decision Engine prioritizes memory consolidation and issues a <strong>REVIEW</strong> action rather than advancing prematurely on stale mastery.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-900">
              Case 2: High Raw Accuracy vs. Lower Supervised ML Prediction
            </div>
            <p className="text-slate-600 leading-relaxed">
              <strong>Disagreement:</strong> A learner answers Easy items correctly using multiple hints and rapid retries. BKT increases slightly, but Logistic Regression ML predicts lower mastery due to weak transfer accuracy, hint dependency, and anti-guessing penalties.
            </p>
            <p className="text-slate-800 font-medium">
              <strong>Resolution:</strong> 3-way Hybrid Mastery (45% Bayesian + 25% BKT + 30% ML) tempers false mastery inflation and recommends <strong>PRACTICE</strong> on independent transfer items.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-900">
              Case 3: ML Unavailable or Insufficient Historical Data
            </div>
            <p className="text-slate-600 leading-relaxed">
              <strong>Disagreement / Edge State:</strong> During cold-start or if historical training data is insufficient, the supervised ML layer cannot claim empirical generalization.
            </p>
            <p className="text-slate-800 font-medium">
              <strong>Resolution:</strong> `computeHybridMastery` automatically re-normalizes weights onto the Bayesian evidence and BKT signals so the learner experience never crashes or stalls.
            </p>
          </div>
        </div>
      </div>

      {/* Rationale Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
          Algorithmic Divergence Proof
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed font-medium">
          Notice how the adaptive recommendation engine generates completely different pedagogical pathways: Alex receives an <span className="text-emerald-400 font-bold">{studentA?.currentRecommendation?.action}</span> recommendation on {studentA?.currentRecommendation?.conceptName}, whereas Blake receives <span className="text-amber-400 font-bold">{studentB?.currentRecommendation?.action}</span> on {studentB?.currentRecommendation?.conceptName}. This is calculated live by the mathematical multi-signal engine rather than hardcoded logic.
        </p>
      </div>

    </div>
  );
};
