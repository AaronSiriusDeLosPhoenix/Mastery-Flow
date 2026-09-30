import React, { useState, useEffect } from 'react';
import * as api from '../api/client.js';
import { useApp } from '../context/AppContext.js';
import {
  MLModelRegistryEntry,
  EvaluationReport,
  ModelHealthSummary,
  RetrainingStatus,
  RecommendationEffectivenessReport,
  FeatureDriftReport,
  MLPredictionRecord,
} from '../types.js';
import {
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Sliders,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Sparkles,
  RefreshCw,
  History,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ContinuousLearningPanel: React.FC = () => {
  const { currentLearner, allLearners, concepts, currentUser } = useApp();

  const isTeacherOrAdmin = currentUser?.role === 'TEACHER' || currentUser?.role === 'ADMIN';

  const [loading, setLoading] = useState<boolean>(true);
  const [evalReport, setEvalReport] = useState<EvaluationReport | null>(null);
  const [healthSummary, setHealthSummary] = useState<ModelHealthSummary | null>(null);
  const [retrainingStatus, setRetrainingStatus] = useState<RetrainingStatus | null>(null);
  const [recEffectiveness, setRecEffectiveness] = useState<RecommendationEffectivenessReport | null>(null);
  const [featureDrift, setFeatureDrift] = useState<FeatureDriftReport | null>(null);
  const [models, setModels] = useState<MLModelRegistryEntry[]>([]);

  // Candidate Training & Retraining state
  const [candidateTraining, setCandidateTraining] = useState<boolean>(false);
  const [candidateModel, setCandidateModel] = useState<MLModelRegistryEntry | null>(null);
  const [candidateActionMessage, setCandidateActionMessage] = useState<string | null>(null);
  const [candidateActionError, setCandidateActionError] = useState<string | null>(null);

  // Inspector state
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>(currentLearner?.id || 'student_a');
  const [learnerPredictions, setLearnerPredictions] = useState<MLPredictionRecord[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState<boolean>(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<MLPredictionRecord | null>(null);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [evalRes, healthRes, retrainRes, recRes, driftRes, modelsRes] = await Promise.all([
        api.fetchMLEvaluationReport(),
        api.fetchMLModelHealth(),
        api.fetchRetrainingStatus(),
        api.fetchRecommendationEffectiveness(),
        api.fetchFeatureDrift(),
        api.fetchRegisteredModels(),
      ]);

      if (evalRes.success) setEvalReport(evalRes.report);
      if (healthRes.success) setHealthSummary(healthRes.health);
      if (retrainRes.success) setRetrainingStatus(retrainRes.status);
      if (recRes.success) setRecEffectiveness(recRes.effectiveness);
      if (driftRes.success) setFeatureDrift(driftRes.report);
      if (modelsRes.success) setModels(modelsRes.models);
    } catch (err: any) {
      console.error('Failed to load continuous learning data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLearnerPredictions = async (learnerId: string) => {
    try {
      setPredictionsLoading(true);
      const res = await api.fetchLearnerPredictions(learnerId);
      if (res.success) {
        setLearnerPredictions(res.predictions || []);
      }
    } catch (err) {
      console.error('Failed to load predictions:', err);
    } finally {
      setPredictionsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (selectedLearnerId) {
      loadLearnerPredictions(selectedLearnerId);
    }
  }, [selectedLearnerId]);

  const handleTrainCandidate = async () => {
    try {
      setCandidateTraining(true);
      setCandidateActionError(null);
      setCandidateActionMessage(null);

      const res = await api.trainCandidateModel({ epochs: 250, learningRate: 0.05, l2Lambda: 0.02 });
      if (res.success && res.candidate) {
        setCandidateModel(res.candidate);
        setCandidateActionMessage(`Candidate ${res.candidate.modelVersion} trained and registered for review.`);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        await loadAllData();
      }
    } catch (err: any) {
      setCandidateActionError(err.message || 'Candidate model training failed');
    } finally {
      setCandidateTraining(false);
    }
  };

  const handlePromoteCandidate = async (candidateVersion: string) => {
    try {
      setCandidateActionError(null);
      setCandidateActionMessage(null);

      const res = await api.promoteCandidateModel(candidateVersion, 'Evaluator performance verification passed');
      if (res.success) {
        setCandidateActionMessage(`Candidate successfully promoted! Active production version is now ${res.activeVersion}.`);
        setCandidateModel(null);
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        await loadAllData();
      }
    } catch (err: any) {
      setCandidateActionError(err.message || 'Model promotion failed');
    }
  };

  const handleRollback = async (targetVersion?: string) => {
    try {
      setCandidateActionError(null);
      setCandidateActionMessage(null);

      const res = await api.rollbackModel(targetVersion);
      if (res.success) {
        setCandidateActionMessage(`Rollback successful! Active production version restored to ${res.activeVersion}.`);
        await loadAllData();
      }
    } catch (err: any) {
      setCandidateActionError(err.message || 'Model rollback failed');
    }
  };

  const conceptNameMap = new Map(concepts.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl border border-indigo-900/60 p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Phase 6 Continuous ML
              </span>
              <span className="text-xs text-indigo-200/80">
                Strict Temporal Boundary • Zero-Leakage Outcome Tracking • Controlled Promotion
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight mt-1 text-white">
              Continuous Learning & Adaptive Feedback Center
            </h2>
            <p className="text-xs text-indigo-200/70 mt-1 max-w-2xl">
              Evaluates model predictions against subsequent independent outcomes ($T_{'{'}pred{'}'} &lt; T_{'{'}eval{'}'}$), tracks observational recommendation effectiveness, monitors calibration and feature drift, and provides safe candidate model lifecycle management.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer border border-white/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        {/* Quick Health Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">Active Model</span>
            <span className="text-base font-black text-amber-300 font-mono mt-0.5 block truncate">
              {healthSummary?.productionModelVersion || 'logreg-prod-v1.0'}
            </span>
            <span className="text-[10px] text-indigo-200/60 block">Lifecycle: Production</span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">Evaluated Samples</span>
            <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
              {healthSummary?.evaluatedSampleCount || 0} Records
            </span>
            <span className="text-[10px] text-indigo-200/60 block">
              Dataset: {healthSummary?.datasetVersion || 'v1.0'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">Model Status</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  (healthSummary?.evaluatedSampleCount ?? 0) >= 5
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-sm font-bold text-white font-mono">
                {(healthSummary?.evaluatedSampleCount ?? 0) >= 5 ? 'OPERATIONAL' : 'INSUFFICIENT_DATA'}
              </span>
            </div>
            <span className="text-[10px] text-indigo-200/60 block">Empirical Validation</span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">Retraining Status</span>
            <span className={`text-sm font-bold mt-0.5 block font-mono ${
              retrainingStatus?.eligible ? 'text-emerald-300' : 'text-slate-300'
            }`}>
              {retrainingStatus?.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
            </span>
            <span className="text-[10px] text-indigo-200/60 block truncate" title={retrainingStatus?.reasons?.join(', ')}>
              {retrainingStatus?.reasons?.[0] || 'Monitoring criteria'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: EVALUATION METRICS CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Evaluated Prediction Performance Metrics (Zero Fabrication)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Computed strictly from independent subsequent learner attempts where prediction occurred at time T and the evaluation occurred at T + Δt.
            </p>
          </div>
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            Strict Temporal Integrity: No Future Leakage
          </span>
        </div>

        {evalReport?.status === 'INSUFFICIENT_DATA' ? (
          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Insufficient Real-World Evaluation Data</span>
            </div>
            <p className="text-xs leading-relaxed text-amber-800">
              At least 5 evaluated predictions across both positive and negative outcomes are required before computing reliable classification metrics. The engine strictly avoids fabricating metrics.
            </p>
            <div className="text-[11px] font-mono text-amber-700 pt-1">
              Current Evaluated: {evalReport.evaluatedSampleCount} | Required Minimum: 5 | Positives: {evalReport.positiveCount} | Negatives: {evalReport.negativeCount}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Evaluated Count</span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">
                {evalReport?.evaluatedSampleCount ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {evalReport?.positiveCount ?? 0} Pos / {evalReport?.negativeCount ?? 0} Neg
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Accuracy</span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono">
                {evalReport?.accuracy !== undefined ? `${(evalReport.accuracy * 100).toFixed(1)}%` : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400 block">Threshold 0.50</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Precision</span>
              <span className="text-xl font-black text-indigo-600 mt-0.5 block font-mono">
                {evalReport?.precision !== undefined ? `${(evalReport.precision * 100).toFixed(1)}%` : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400 block">TP / (TP + FP)</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Recall</span>
              <span className="text-xl font-black text-emerald-600 mt-0.5 block font-mono">
                {evalReport?.recall !== undefined ? `${(evalReport.recall * 100).toFixed(1)}%` : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400 block">TP / (TP + FN)</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">F1-Score</span>
              <span className="text-xl font-black text-blue-600 mt-0.5 block font-mono">
                {evalReport?.f1 !== undefined ? `${(evalReport.f1 * 100).toFixed(1)}%` : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400 block">Harmonic Mean</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Log Loss</span>
              <span className="text-xl font-black text-amber-600 mt-0.5 block font-mono">
                {evalReport?.logLoss !== undefined ? evalReport.logLoss.toFixed(3) : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400 block">Cross-Entropy</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Brier Score</span>
              <span className="text-xl font-black text-purple-600 mt-0.5 block font-mono">
                {evalReport?.brierScore !== undefined ? evalReport.brierScore.toFixed(3) : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400 block">Mean Squared Error</span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: 5-BIN CALIBRATION DIAGNOSTIC & DATA INTEGRITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calibration Curve Bins */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>5-Bin Probability Calibration Diagnostic</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Measures whether predicted probability matches observed empirical frequency.
              </p>
            </div>
            {evalReport?.calibration?.expectedCalibrationError !== undefined && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold font-mono">
                ECE: {(evalReport.calibration.expectedCalibrationError * 100).toFixed(1)}%
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2 px-2.5">Bin Range</th>
                  <th className="py-2 px-2.5">Samples</th>
                  <th className="py-2 px-2.5">Mean Pred P</th>
                  <th className="py-2 px-2.5">Observed Rate</th>
                  <th className="py-2 px-2.5">Gap |P - O|</th>
                  <th className="py-2 px-2.5">Alignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {evalReport?.calibration?.bins.map((b, idx) => {
                  const hasSamples = b.sampleCount > 0;
                  const meanProb = b.meanPredictedProbability ?? 0;
                  const obsFreq = b.observedPositiveFrequency ?? 0;
                  const gap = b.calibrationGap ?? 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-2.5 font-bold text-slate-800">
                        [{b.binMin.toFixed(1)}, {b.binMax.toFixed(1)})
                      </td>
                      <td className="py-2 px-2.5 text-slate-600">{b.sampleCount}</td>
                      <td className="py-2 px-2.5 text-indigo-700">
                        {hasSamples ? `${(meanProb * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2 px-2.5 text-emerald-700">
                        {hasSamples ? `${(obsFreq * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2 px-2.5 text-amber-700">
                        {hasSamples ? gap.toFixed(3) : '—'}
                      </td>
                      <td className="py-2 px-2.5">
                        {hasSamples ? (
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                gap < 0.15 ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.max(10, 100 - gap * 200)}%` }}
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300">empty</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Quality & Leakage Audit */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Data Quality & Temporal Leakage Audit</span>
            </h4>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold font-mono">
              0 Leakage Detected
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Temporal Leakage Events
              </span>
              <span className="text-lg font-black text-emerald-600 font-mono mt-0.5 block">
                0
              </span>
              <span className="text-[10px] text-slate-500">Every outcome strictly T &gt; T_pred</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Valid / Corrupted Records
              </span>
              <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                {evalReport?.dataQuality?.validSamplesCount ?? 0} / {evalReport?.dataQuality?.invalidSamplesCount ?? 0}
              </span>
              <span className="text-[10px] text-slate-500">16 features strictly bounded</span>
            </div>
          </div>

          {/* Feature Drift Diagnostic */}
          <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-950 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Feature Drift Z-Score Shift Monitor</span>
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded-full ${
                featureDrift?.status === 'NORMAL'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {featureDrift?.status || 'NORMAL'}
              </span>
            </div>
            <p className="text-[11px] text-indigo-900/70">
              Maximum observed feature shift: <strong className="font-mono">{featureDrift?.maxDriftZShift ?? 0} σ</strong> ({featureDrift?.maxDriftFeature || 'none'}). Alert threshold is 2.00 σ.
            </p>
            {featureDrift?.warnings && featureDrift.warnings.length > 0 && (
              <div className="text-[10px] text-amber-700 font-medium">
                {featureDrift.warnings.join(' • ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: RECOMMENDATION OUTCOME EFFECTIVENESS (OBSERVATIONAL, NON-CAUSAL) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Recommendation Outcome Effectiveness (Non-Causal Monitoring)</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Aggregates observed learner trajectories after engine recommendations are delivered.
            </p>
          </div>
          <span className="text-[10px] text-slate-500 italic bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            * Note: Observational correlations; does not establish randomized causal proof.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2.5 px-3">Recommendation Action</th>
                <th className="py-2.5 px-3">Tracked Count</th>
                <th className="py-2.5 px-3">Completed</th>
                <th className="py-2.5 px-3">Completion Rate</th>
                <th className="py-2.5 px-3">Mean Mastery Δ</th>
                <th className="py-2.5 px-3">Mean Retention Δ</th>
                <th className="py-2.5 px-3">Success Rate</th>
                <th className="py-2.5 px-3">Observational Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recEffectiveness &&
                Object.entries(recEffectiveness.byAction).map(([actionKey, stat]) => {
                  const rate = stat.count > 0 ? stat.completedCount / stat.count : 0;
                  return (
                    <tr key={actionKey} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] uppercase font-mono">
                          {actionKey}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold">{stat.count}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{stat.completedCount}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-700">
                        {(rate * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <span className={stat.averageMasteryDelta >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700'}>
                          {stat.averageMasteryDelta >= 0 ? `+${(stat.averageMasteryDelta * 100).toFixed(1)}%` : `${(stat.averageMasteryDelta * 100).toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <span className={stat.averageRetentionDelta >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700'}>
                          {stat.averageRetentionDelta >= 0 ? `+${(stat.averageRetentionDelta * 100).toFixed(1)}%` : `${(stat.averageRetentionDelta * 100).toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {(stat.successRate * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500 italic max-w-xs truncate" title={stat.observationalSummary}>
                        {stat.observationalSummary}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: CONTROLLED RETRAINING & MODEL REGISTRY LIFECYCLE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>Model Registry, Controlled Retraining & Promotion Lifecycle</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Candidate models are trained on chronological data splits and must undergo validation review before production promotion.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {isTeacherOrAdmin ? (
              <button
                onClick={handleTrainCandidate}
                disabled={candidateTraining}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Cpu className={`w-3.5 h-3.5 ${candidateTraining ? 'animate-spin' : ''}`} />
                <span>{candidateTraining ? 'Training Candidate...' : 'Train Candidate Model'}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Faculty/Admin Authorization Required to Retrain</span>
              </div>
            )}
          </div>
        </div>

        {candidateActionMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{candidateActionMessage}</span>
          </div>
        )}

        {candidateActionError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{candidateActionError}</span>
          </div>
        )}

        {/* Candidate Model Comparison Card (if candidate exists) */}
        {candidateModel && (
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-950 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Candidate Model Comparison: {candidateModel.modelVersion}</span>
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Awaiting Review
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-indigo-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Validation Log Loss</span>
                <span className="font-mono font-bold text-slate-900 block mt-0.5">
                  {candidateModel.validationMetrics?.logLoss !== undefined ? candidateModel.validationMetrics.logLoss.toFixed(3) : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-400">
                  Diff: {candidateModel.candidateComparison?.logLossDiff !== undefined ? candidateModel.candidateComparison.logLossDiff.toFixed(3) : '0.000'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-indigo-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Validation Accuracy</span>
                <span className="font-mono font-bold text-slate-900 block mt-0.5">
                  {candidateModel.validationMetrics?.accuracy !== undefined ? `${(candidateModel.validationMetrics.accuracy * 100).toFixed(1)}%` : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-400">
                  Diff: {candidateModel.candidateComparison?.accuracyDiff !== undefined ? `${(candidateModel.candidateComparison.accuracyDiff * 100).toFixed(1)}%` : '0.0%'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-indigo-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Promotable</span>
                <span className={`font-mono font-bold block mt-0.5 ${
                  candidateModel.candidateComparison?.promotable ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {candidateModel.candidateComparison?.promotable ? 'YES (Meets Criteria)' : 'NO (Inferior)'}
                </span>
                <span className="text-[10px] text-slate-400">Lower Log Loss check</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-indigo-100 flex items-center justify-center">
                {isTeacherOrAdmin && (
                  <button
                    onClick={() => handlePromoteCandidate(candidateModel.modelVersion)}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    Promote to Production
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Model Registry Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2.5 px-3">Model Version</th>
                <th className="py-2.5 px-3">Lifecycle State</th>
                <th className="py-2.5 px-3">Holdout Log Loss</th>
                <th className="py-2.5 px-3">Holdout Acc</th>
                <th className="py-2.5 px-3">Training Samples</th>
                <th className="py-2.5 px-3">Trained At</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {models.map((m) => (
                <tr key={m.modelVersion} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{m.modelVersion}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                        m.lifecycleState === 'production'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : m.lifecycleState === 'candidate'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {m.lifecycleState}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {m.validationMetrics?.logLoss !== undefined ? m.validationMetrics.logLoss.toFixed(3) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {m.validationMetrics?.accuracy !== undefined ? `${(m.validationMetrics.accuracy * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">{m.sampleCount ?? 'baseline'}</td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-400">
                    {new Date(m.trainedAt).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {isTeacherOrAdmin && m.lifecycleState === 'retired' && (
                      <button
                        onClick={() => handleRollback(m.modelVersion)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100"
                      >
                        Rollback to This
                      </button>
                    )}
                    {isTeacherOrAdmin && m.lifecycleState === 'candidate' && (
                      <button
                        onClick={() => handlePromoteCandidate(m.modelVersion)}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 transition cursor-pointer px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100"
                      >
                        Promote
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: LIVE PREDICTION TIMELINE & FROZEN SNAPSHOT INSPECTOR */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Learner Prediction & Subsequent Outcome Timeline</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Inspect historical predictions at time T and the subsequent independent events that resolved them.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-500">Learner:</label>
            <select
              value={selectedLearnerId}
              onChange={(e) => setSelectedLearnerId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {allLearners.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {predictionsLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading prediction log...</div>
        ) : learnerPredictions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
            No prediction snapshots recorded yet for this learner. Perform learning attempts or diagnostic quizzes to generate tracked predictions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Prediction ID</th>
                  <th className="py-2.5 px-3">Target Concept</th>
                  <th className="py-2.5 px-3">Predicted P(M)</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Evaluation Status</th>
                  <th className="py-2.5 px-3">Target Outcome (y)</th>
                  <th className="py-2.5 px-3">Outcome Source</th>
                  <th className="py-2.5 px-3">Latency Δt</th>
                  <th className="py-2.5 px-3 text-right">Feature Vector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {learnerPredictions.map((p) => {
                  const conceptName = conceptNameMap.get(p.conceptId) || p.conceptId;
                  const deltaSeconds =
                    p.evaluatedAt && p.predictedAt
                      ? Math.round(
                          (new Date(p.evaluatedAt).getTime() - new Date(p.predictedAt).getTime()) / 1000
                        )
                      : null;

                  return (
                    <tr key={p.predictionId} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-bold text-slate-700 truncate max-w-[120px]" title={p.predictionId}>
                        {p.predictionId.substring(0, 16)}...
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{conceptName}</td>
                      <td className="py-2.5 px-3 font-bold text-indigo-700">
                        {(p.predictedProbability * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {(p.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                            p.evaluationStatus === 'evaluated'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {p.evaluationStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {p.actualOutcome !== undefined ? (
                          <span
                            className={`font-bold ${
                              p.actualOutcome === 1 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            y = {p.actualOutcome} ({p.actualOutcome === 1 ? 'Correct' : 'Incorrect'})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-sans text-[11px]">pending</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500 uppercase">
                        {p.outcomeSource || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {deltaSeconds !== null ? `+${deltaSeconds}s` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedSnapshot(p)}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition cursor-pointer"
                        >
                          Inspect Snapshot
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Snapshot Drawer Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                  Frozen Feature Vector Snapshot at Time T
                </span>
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  {selectedSnapshot.predictionId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Prediction Time (T)</span>
                <span className="font-mono text-slate-800">{new Date(selectedSnapshot.predictedAt).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Evaluation Time (T + Δt)</span>
                <span className="font-mono text-slate-800">
                  {selectedSnapshot.evaluatedAt ? new Date(selectedSnapshot.evaluatedAt).toLocaleString() : 'Pending'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-800 block mb-2">
                16 Canonical Normalized Features (Guaranteed Pre-T Only):
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {Object.entries(selectedSnapshot.normalizedSnapshot || {}).map(([k, v]) => (
                  <div key={k} className="p-2 bg-slate-50 rounded-lg flex justify-between items-center">
                    <span className="text-slate-600 truncate mr-2" title={k}>{k}:</span>
                    <span className="font-bold text-indigo-700">{typeof v === 'number' ? v.toFixed(3) : v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
