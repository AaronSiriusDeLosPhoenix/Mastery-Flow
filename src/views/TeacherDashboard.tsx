import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { MetricCard } from '../components/MetricCard.js';
import {
  Users,
  Brain,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Search,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import { TeacherOverrideModal } from '../components/TeacherOverrideModal.js';
import { LearnerProfile } from '../types.js';

export const TeacherDashboard: React.FC = () => {
  const { allLearners, concepts, setActiveView, setTargetTeacherStudentId } = useApp();
  const [selectedLearnerForOverride, setSelectedLearnerForOverride] = useState<LearnerProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const totalLearners = allLearners.length;
  const avgMastery =
    totalLearners > 0
      ? (allLearners.reduce((sum, l) => sum + l.overallMastery, 0) / totalLearners) * 100
      : 0;

  const stuckLearners = allLearners.filter((l) => l.needsAttention);
  const retentionRiskCount = allLearners.filter((l) => l.overallRetention < 0.60).length;

  const filteredLearners = allLearners.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              Instructor Intelligence Suite
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Prof. Alistair Vance
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Teacher Overview & Intervention Command
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time cohort monitoring, stuck learner diagnostics, and human-in-the-loop override authority.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Enrolled Learners"
          value={totalLearners}
          subtitle="Cohort: Fall 2026 CS-Foundation"
          icon={Users}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Cohort Avg Mastery"
          value={`${avgMastery.toFixed(0)}%`}
          subtitle="Multi-signal weighted score"
          icon={Brain}
          iconColor="text-emerald-600"
        />
        <MetricCard
          title="Stuck / Needs Intervention"
          value={stuckLearners.length}
          subtitle={stuckLearners.length > 0 ? 'Requires immediate faculty action' : 'All learners progressing'}
          icon={AlertTriangle}
          iconColor="text-rose-600"
          trend={{ value: `${stuckLearners.length} Active`, isPositive: stuckLearners.length === 0 }}
        />
        <MetricCard
          title="Retention Risk Alert"
          value={retentionRiskCount}
          subtitle="Decayed retention below 60%"
          icon={Clock}
          iconColor="text-amber-500"
        />
      </div>

      {/* Stuck Learners Alert Banner if any */}
      {stuckLearners.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-rose-900 font-bold">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span className="text-sm">Stuck Learners Requiring Pedagogical Intervention</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stuckLearners.map((learner) => (
              <div
                key={learner.id}
                className="p-4 bg-white rounded-2xl border border-rose-200/80 shadow-2xs flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={learner.avatar}
                    alt={learner.name}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{learner.name}</h4>
                    <p className="text-[11px] text-rose-600 font-medium line-clamp-1">
                      {learner.attentionReason || 'Repeated consecutive failures detected.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLearnerForOverride(learner)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Intervene
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learners Roster Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Student Roster</h3>
            <p className="text-xs text-slate-500">
              Click any student to view timeline, mastery curves, and issue overrides
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search learner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-bold">Learner</th>
                <th className="pb-3 font-bold">Mastery</th>
                <th className="pb-3 font-bold">Retention</th>
                <th className="pb-3 font-bold">Uncertainty</th>
                <th className="pb-3 font-bold">Engine Next Action</th>
                <th className="pb-3 font-bold">Overrides</th>
                <th className="pb-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLearners.map((learner) => {
                const rec = learner.currentRecommendation;
                return (
                  <tr key={learner.id} className="hover:bg-slate-50/60 transition">
                    
                    {/* Learner Info */}
                    <td className="py-3.5">
                      <div className="flex items-center space-x-3">
                        <img
                          src={learner.avatar}
                          alt={learner.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{learner.name}</div>
                          <div className="text-[11px] text-slate-400">{learner.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Mastery */}
                    <td className="py-3.5">
                      <div className="font-bold text-slate-800">
                        {(learner.overallMastery * 100).toFixed(0)}%
                      </div>
                      <div className="w-20 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            learner.overallMastery >= 0.75
                              ? 'bg-emerald-500'
                              : learner.overallMastery >= 0.50
                              ? 'bg-blue-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${learner.overallMastery * 100}%` }}
                        />
                      </div>
                    </td>

                    {/* Retention */}
                    <td className="py-3.5 font-semibold text-slate-700">
                      {(learner.overallRetention * 100).toFixed(0)}%
                    </td>

                    {/* Uncertainty */}
                    <td className="py-3.5 font-semibold text-slate-700">
                      {(learner.overallUncertainty * 100).toFixed(0)}%
                    </td>

                    {/* Next Action */}
                    <td className="py-3.5">
                      {rec ? (
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              rec.action === 'ADVANCE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : rec.action === 'REVIEW'
                                ? 'bg-amber-50 text-amber-700'
                                : rec.action === 'REMEDIATE_PREREQUISITE'
                                ? 'bg-amber-50 text-amber-800'
                                : rec.action === 'TEACHER_INTERVENTION'
                                ? 'bg-rose-50 text-rose-700 font-extrabold'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {rec.action}
                          </span>
                          <span className="text-[11px] font-medium text-slate-600 truncate max-w-[120px]">
                            {rec.conceptName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Diagnostic Pending</span>
                      )}
                    </td>

                    {/* Overrides Count */}
                    <td className="py-3.5">
                      {learner.overrides.length > 0 ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {learner.overrides.length} logged
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedLearnerForOverride(learner)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold transition cursor-pointer"
                        >
                          Override
                        </button>
                        <button
                          onClick={() => {
                            setTargetTeacherStudentId(learner.id);
                            setActiveView('teacher_student_detail');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition cursor-pointer flex items-center space-x-1"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Teacher Override Modal */}
      {selectedLearnerForOverride && (
        <TeacherOverrideModal
          learner={selectedLearnerForOverride}
          concepts={concepts}
          isOpen={true}
          onClose={() => setSelectedLearnerForOverride(null)}
          onSuccess={() => setSelectedLearnerForOverride(null)}
        />
      )}

    </div>
  );
};
