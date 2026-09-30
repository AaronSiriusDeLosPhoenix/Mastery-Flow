import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { WhyNextCard } from '../components/WhyNextCard.js';
import {
  GitCompare,
  TrendingUp,
  Brain,
  HelpCircle,
  Clock,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { MasteryProgress } from '../components/MasteryProgress.js';

export const SimulationView: React.FC = () => {
  const { allLearners, concepts } = useApp();

  const studentA = allLearners.find((l) => l.id === 'student_a') || allLearners[0];
  const studentB = allLearners.find((l) => l.id === 'student_b') || allLearners[1];

  const [replayStep, setReplayStep] = useState<number>(0);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

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
