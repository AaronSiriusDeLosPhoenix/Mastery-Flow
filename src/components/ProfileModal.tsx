import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  User,
  Mail,
  School,
  BookOpen,
  Globe,
  Sliders,
  X,
  Save,
  LogOut,
  ShieldCheck,
  HardDrive,
  Award,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { DomainId, LanguageCode, ReadingLevel } from '../types.js';

export const ProfileModal: React.FC = () => {
  const {
    isProfileModalOpen,
    setIsProfileModalOpen,
    currentUser,
    currentLearner,
    domains,
    institutions,
    updateUserProfile,
    logout,
    dbPersistenceStatus,
    syncDatabase,
    setIsAuthModalOpen,
    setAuthModalTab,
  } = useApp();

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [activeDomainId, setActiveDomainId] = useState<DomainId>('gate_cs');
  const [institutionId, setInstitutionId] = useState('iit_madras');
  const [preferredReadingLevel, setPreferredReadingLevel] = useState<ReadingLevel>('undergraduate');
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>('en');
  const [dyslexiaModeEnabled, setDyslexiaModeEnabled] = useState(false);
  const [bionicReadingEnabled, setBionicReadingEnabled] = useState(false);

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentLearner) {
      setName(currentLearner.name || '');
      setAvatar(currentLearner.avatar || '');
      setActiveDomainId(currentLearner.activeDomainId || 'gate_cs');
      setInstitutionId(currentLearner.institutionId || 'iit_madras');
      setPreferredReadingLevel(currentLearner.preferredReadingLevel || 'undergraduate');
      setPreferredLanguage(currentLearner.preferredLanguage || 'en');
      setDyslexiaModeEnabled(currentLearner.dyslexiaModeEnabled || false);
      setBionicReadingEnabled(currentLearner.bionicReadingEnabled || false);
    }
  }, [currentLearner, isProfileModalOpen]);

  if (!isProfileModalOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaving(true);
    setSaveSuccess(false);

    try {
      await updateUserProfile({
        name,
        avatar,
        activeDomainId,
        institutionId,
        preferredReadingLevel,
        preferredLanguage,
        dyslexiaModeEnabled,
        bionicReadingEnabled,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save profile changes');
    } finally {
      setSaving(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      await syncDatabase();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    setIsProfileModalOpen(false);
    await logout();
  };

  const activeDomain = domains.find((d) => d.id === (currentLearner?.activeDomainId || activeDomainId));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <img
                src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={name || 'Student'}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-400/50 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[9px] text-white">
                ✓
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold tracking-tight text-white">{name || 'Student Profile'}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {currentLearner?.role || 'STUDENT'}
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">{currentLearner?.email || 'student@masteryflow.edu'}</p>
            </div>
          </div>

          <button
            onClick={() => setIsProfileModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Persistence Status Badge Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">Production Persistence:</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-[11px] font-bold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>Synced (Atomic File Store)</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-white text-slate-700 transition-colors cursor-pointer"
            >
              {syncing ? 'Syncing...' : 'Flush to Disk'}
            </button>
            <a
              href="/api/database/export"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
            >
              Export JSON
            </a>
          </div>
        </div>

        {/* Feedback Messages */}
        {saveSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">Profile preferences saved and written to disk successfully!</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[62vh] overflow-y-auto">
          {/* Key Metrics Summary */}
          {currentLearner && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Mastery</span>
                <span className="text-base font-extrabold text-indigo-700">
                  {((currentLearner.overallMastery || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Target Track</span>
                <span className="text-xs font-bold text-slate-800 truncate block">
                  {activeDomain?.shortLabel || 'GATE CS'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Diagnostic</span>
                <span className="text-xs font-bold text-emerald-700">
                  {currentLearner.diagnosticCompleted ? 'Completed' : 'Pending'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Attempts Logged</span>
                <span className="text-base font-extrabold text-slate-700">
                  {currentLearner.recentAttempts?.length || 0}
                </span>
              </div>
            </div>
          )}

          {/* Identity Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Avatar Photo URL</label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Curriculum & Institution Setup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Curriculum Track & Syllabus</label>
              <select
                value={activeDomainId}
                onChange={(e) => setActiveDomainId(e.target.value as DomainId)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer bg-white font-medium"
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.shortLabel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Examination Board / Institution</label>
              <select
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer bg-white font-medium"
              >
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multilingual & Reading Level Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Reading Level Tier</label>
              <select
                value={preferredReadingLevel}
                onChange={(e) => setPreferredReadingLevel(e.target.value as ReadingLevel)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer bg-white font-medium"
              >
                <option value="middle_school">Middle School (Intuitive Analogies)</option>
                <option value="high_school">High School (Structured Academic)</option>
                <option value="undergraduate">Undergraduate (Rigorous Invariants)</option>
                <option value="executive">Executive (Systems & Engineering Architecture)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Native Interface Language</label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as LanguageCode)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer bg-white font-medium"
              >
                <option value="en">English (Global)</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="es">Spanish (Español)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="fr">French (Français)</option>
                <option value="de">German (Deutsch)</option>
                <option value="zh">Mandarin (中文)</option>
              </select>
            </div>
          </div>

          {/* Accessibility Configurations */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Accessibility & Cognitive Comfort
            </span>

            <label className="flex items-start space-x-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={dyslexiaModeEnabled}
                onChange={(e) => setDyslexiaModeEnabled(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold block">OpenDyslexic Font & Warm Tint</span>
                <span className="text-[11px] text-slate-500">
                  Activates weighted letterforms, increased letter spacing, and warm #FAF8F5 background.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={bionicReadingEnabled}
                onChange={(e) => setBionicReadingEnabled(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold block">Bionic Fixation Guides</span>
                <span className="text-[11px] text-slate-500">
                  Emphasizes starting syllables to guide eye fixation points across paragraphs.
                </span>
              </div>
            </label>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200">
            <button
              type="button"
              onClick={handleLogout}
              className="py-2 px-3.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsProfileModalOpen(false);
                  setIsAuthModalOpen(true);
                  setAuthModalTab('demo');
                }}
                className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                Switch Account
              </button>

              <button
                type="submit"
                disabled={saving}
                className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
