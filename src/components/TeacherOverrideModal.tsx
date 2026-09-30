import React, { useState } from 'react';
import { Concept, LearnerProfile, RecommendationAction } from '../types.js';
import { X, ShieldAlert, Check, UserCheck } from 'lucide-react';
import * as api from '../api/client.js';
import { useApp } from '../context/AppContext.js';

interface TeacherOverrideModalProps {
  learner: LearnerProfile;
  concepts: Concept[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TeacherOverrideModal: React.FC<TeacherOverrideModalProps> = ({
  learner,
  concepts,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { refreshAll } = useApp();
  const [action, setAction] = useState<RecommendationAction>('ADVANCE');
  const [targetConceptId, setTargetConceptId] = useState<string>(concepts[0]?.id || 'arrays');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A clinical justification/reason is required for faculty audit logs.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.applyTeacherOverride({
        learnerId: learner.id,
        teacherId: 'prof_vance',
        teacherName: 'Prof. Alistair Vance',
        newAction: action,
        newConceptId: targetConceptId,
        reason: reason.trim(),
      });
      await refreshAll();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit teacher override');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Faculty Override Authority</h3>
              <p className="text-xs text-slate-500">
                Override autonomous recommendation for {learner.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current State */}
        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
          <div className="font-semibold text-slate-700">Current Autonomous Recommendation:</div>
          <div className="text-slate-600">
            Action: <span className="font-bold text-slate-900">{learner.currentRecommendation?.action}</span> on{' '}
            <span className="font-bold text-slate-900">{learner.currentRecommendation?.conceptName}</span>
          </div>
          <p className="text-[11px] text-slate-500 italic mt-0.5">
            "{learner.currentRecommendation?.reason}"
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Target Action */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              New Pedagogical Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as RecommendationAction)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ADVANCE">ADVANCE (Clear learner for subsequent topic)</option>
              <option value="PRACTICE">PRACTICE (Assign targeted reinforcement)</option>
              <option value="REVIEW">REVIEW (Spaced retrieval review session)</option>
              <option value="REMEDIATE_PREREQUISITE">REMEDIATE PREREQUISITE (Address foundational gaps)</option>
              <option value="CHALLENGE">CHALLENGE (Promote to high-order synthesis)</option>
              <option value="TEACHER_INTERVENTION">TEACHER INTERVENTION (Hold for 1-on-1 tutoring)</option>
            </select>
          </div>

          {/* Target Concept */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Target Concept
            </label>
            <select
              value={targetConceptId}
              onChange={(e) => setTargetConceptId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}: {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rationale / Audit Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Clinical Justification & Audit Note
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Student demonstrated complete oral mastery during recitation; approved advance to Stacks."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition cursor-pointer flex items-center space-x-1.5"
            >
              {submitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Enforce Override</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
