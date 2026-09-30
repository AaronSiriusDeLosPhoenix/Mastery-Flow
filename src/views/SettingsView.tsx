import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import * as api from '../api/client.js';
import {
  Sliders,
  Save,
  Check,
  RotateCcw,
  ShieldCheck,
  Search,
  User,
  SlidersHorizontal,
  Palette,
  Shield,
  Volume2,
  HardDrive,
  Globe,
  Flame,
  HelpCircle,
  Info,
  LogOut,
  KeyRound,
  Download,
  Smartphone,
  Mail,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Mic,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Trash2,
  Copy,
} from 'lucide-react';
import { DomainId, LanguageCode, ReadingLevel, SystemConfig } from '../types.js';

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  masteryThreshold: 0.75,
  challengeThreshold: 0.88,
  prerequisiteThreshold: 0.70,
  forgettingDecayRate: 0.045,
  uncertaintyThreshold: 0.40,
  interventionThresholdFailures: 3,
  learningRateAlpha: 0.35,
  activeDomainId: 'gate_cs',
  activeInstitutionId: 'iit_madras',
  autoApproveScoreThreshold: 85,
  weights: {
    correctness: 0.45,
    confidence: 0.20,
    difficulty: 0.15,
    responseTime: 0.10,
    independence: 0.10,
  },
  mlConfig: {
    enabled: true,
    weight: 0.30,
    thresholds: {
      weakMax: 0.39,
      developingMax: 0.69,
      strongMax: 0.84,
      masteredMin: 0.85,
    },
  },
  bktConfig: {
    enabled: true,
    weight: 0.25,
    defaultPInit: 0.15,
    defaultPLearn: 0.15,
    defaultPGuess: 0.20,
    defaultPSlip: 0.10,
  },
};

export const SettingsView: React.FC = () => {
  const {
    systemConfig,
    refreshAll,
    currentUser,
    currentLearner,
    updateUserProfile,
    changeUserPassword,
    logout,
    activeSettingsTab,
    setActiveSettingsTab,
    dbPersistenceStatus,
    syncDatabase,
    domains,
    institutions,
    dyslexiaMode,
    setDyslexiaMode,
    bionicReading,
    setBionicReading,
    speakText,
    allLearners,
    setActiveStudentId,
    setIsDemoModalOpen,
  } = useApp();

  // Search filter inside settings
  const [searchQuery, setSearchQuery] = useState('');

  // General tab state
  const [name, setName] = useState(currentUser?.name || currentLearner?.name || '');
  const [username, setUsername] = useState(currentUser?.username || 'alex_rivera');
  const [email, setEmail] = useState(currentUser?.email || currentLearner?.email || '');
  const [secondaryEmail, setSecondaryEmail] = useState(currentUser?.secondaryEmail || 'alex.backup@gmail.com');
  const [mobile, setMobile] = useState(currentUser?.mobile || '+91 98765 43210');
  const [rollNumber, setRollNumber] = useState(currentUser?.studentRollNumber || 'CS-2026-GATE-042');
  const [bio, setBio] = useState(currentUser?.bio || 'Undergraduate CS student preparing for GATE 2026. Focus: Algorithms & Theory of Computation.');
  const [selectedDomain, setSelectedDomain] = useState<DomainId>(currentLearner?.activeDomainId || 'gate_cs');
  const [selectedInstitution, setSelectedInstitution] = useState(currentLearner?.institutionId || 'iit_madras');
  const [cohort, setCohort] = useState(currentUser?.cohort || '2026 Adaptive Cohort');

  // Appearance tab state
  const [themeColor, setThemeColor] = useState<'indigo' | 'blue' | 'emerald' | 'violet' | 'amber' | 'rose'>(
    currentUser?.themeColor || 'indigo'
  );
  const [fontFamily, setFontFamily] = useState<'sans' | 'inter' | 'mono' | 'dyslexic' | 'serif'>(
    currentUser?.fontFamily || 'sans'
  );
  const [fontSize, setFontSize] = useState<'compact' | 'normal' | 'comfortable' | 'large'>(
    currentUser?.fontSize || 'normal'
  );
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Security tab state
  const [passkeys, setPasskeys] = useState<Array<{ id: string; name: string; device: string; createdAt: string }>>([
    { id: 'pk_1', name: 'MacBook Touch ID / Chrome', device: 'Apple Biometrics', createdAt: '2026-08-15' },
    { id: 'pk_2', name: 'iPhone Face ID Passkey', device: 'iCloud Keychain', createdAt: '2026-09-02' },
  ]);
  const [twoStepEnabled, setTwoStepEnabled] = useState(currentUser?.twoStepEnabled ?? true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Voice Assistant tab state
  const [voiceEnabled, setVoiceEnabled] = useState(currentUser?.voiceAssistantEnabled ?? true);
  const [speechRate, setSpeechRate] = useState(currentUser?.speechRate ?? 1.0);
  const [voicePersona, setVoicePersona] = useState(currentUser?.voicePersona || 'en-US-Natural');
  const [autoReadQuestions, setAutoReadQuestions] = useState(false);
  const [isMicTesting, setIsMicTesting] = useState(false);

  // Languages tab state
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>(currentLearner?.preferredLanguage || 'en');
  const [readingLevel, setPreferredReadingLevel] = useState<ReadingLevel>(
    currentLearner?.preferredReadingLevel || 'undergraduate'
  );
  const [bilingualSubtitles, setBilingualSubtitles] = useState(true);

  // Usage tracker tab state
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(currentUser?.dailyGoalMinutes || 45);
  const [pomodoroLength, setPomodoroLength] = useState(25);
  const [studyRemindersEnabled, setStudyRemindersEnabled] = useState(true);

  // Hyperparameters
  const [config, setConfig] = useState(systemConfig || DEFAULT_SYSTEM_CONFIG);

  // UI state
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser || currentLearner) {
      setName(currentUser?.name || currentLearner?.name || '');
      setUsername(currentUser?.username || 'alex_rivera');
      setEmail(currentUser?.email || currentLearner?.email || '');
      setSecondaryEmail(currentUser?.secondaryEmail || 'alex.backup@gmail.com');
      setMobile(currentUser?.mobile || '+91 98765 43210');
      setRollNumber(currentUser?.studentRollNumber || 'CS-2026-GATE-042');
      setBio(currentUser?.bio || 'Undergraduate CS student preparing for GATE 2026.');
      setSelectedDomain(currentLearner?.activeDomainId || 'gate_cs');
      setSelectedInstitution(currentLearner?.institutionId || 'iit_madras');
      setCohort(currentUser?.cohort || '2026 Adaptive Cohort');
      setPreferredLanguage(currentLearner?.preferredLanguage || 'en');
      setPreferredReadingLevel(currentLearner?.preferredReadingLevel || 'undergraduate');
    }
  }, [currentUser, currentLearner]);

  const handleSaveGeneral = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setErrorMessage(null);
      await updateUserProfile({
        name,
        username,
        secondaryEmail,
        mobile,
        studentRollNumber: rollNumber,
        bio,
        activeDomainId: selectedDomain,
        institutionId: selectedInstitution,
        cohort,
        themeColor,
        fontFamily,
        fontSize,
        twoStepEnabled,
        voiceAssistantEnabled: voiceEnabled,
        speechRate,
        voicePersona,
        preferredLanguage,
        preferredReadingLevel: readingLevel,
        dailyGoalMinutes,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    try {
      await changeUserPassword({ currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    }
  };

  const handleAddPasskey = () => {
    const newPk = {
      id: `pk_${Date.now()}`,
      name: 'FIDO2 WebAuthn Key (Biometric)',
      device: 'Hardware Authenticator / Security Key',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPasskeys([...passkeys, newPk]);
    handleSaveGeneral();
  };

  const handleRemovePasskey = (id: string) => {
    setPasskeys(passkeys.filter((p) => p.id !== id));
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

  const handleSaveHyperparameters = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateSystemConfig(config);
      await refreshAll();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to update engine parameters');
    } finally {
      setSaving(false);
    }
  };

  // Setting subdivision list with search tags
  const tabList = [
    { id: 'general', label: 'General & Profile', icon: <User className="w-4 h-4" />, tags: 'name username email mobile personal roll institution bio' },
    { id: 'appearance', label: 'Appearance & Fonts', icon: <Palette className="w-4 h-4" />, tags: 'font text colors theme size dyslexia bionic contrast' },
    { id: 'security', label: 'Security & Logins', icon: <Shield className="w-4 h-4" />, tags: 'passkeys password two-step 2fa google sessions logins' },
    { id: 'voice', label: 'Voice Assistant', icon: <Volume2 className="w-4 h-4" />, tags: 'voice assistant speech rate pitch tts dictation mic' },
    { id: 'storage', label: 'Data & Storage', icon: <HardDrive className="w-4 h-4" />, tags: 'data storage disk backup download export json files cache' },
    { id: 'languages', label: 'Languages', icon: <Globe className="w-4 h-4" />, tags: 'language localization hindi spanish reading level undergraduate' },
    { id: 'usage', label: 'Usage & Tracker', icon: <Flame className="w-4 h-4" />, tags: 'usage tracker streak daily goal pomodoro hours analytics' },
    { id: 'hyperparameters', label: 'Pedagogical Controls', icon: <SlidersHorizontal className="w-4 h-4" />, tags: 'mastery decay threshold bayesian hyperparameters weights' },
    { id: 'help', label: 'Help & Shortcuts', icon: <HelpCircle className="w-4 h-4" />, tags: 'help shortcuts guide faq demo contact support' },
    { id: 'about', label: 'About Engine', icon: <Info className="w-4 h-4" />, tags: 'about version licenses engine release megathon 2026' },
    { id: 'account', label: 'Account & Logout', icon: <LogOut className="w-4 h-4" />, tags: 'logout switch account sign out delete reset' },
  ];

  const filteredTabs = tabList.filter((tab) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return tab.label.toLowerCase().includes(q) || tab.tags.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
              System & Profile Preferences
            </span>
            <span className="text-xs font-semibold text-slate-500">
              MasteryFlow v2.6.4 Production
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Standard Application Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure personal details, passkeys, security credentials, fonts, colors, voice assistant, and storage.
          </p>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center space-x-2">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1 animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>Saved!</span>
            </span>
          )}
          <button
            onClick={() => handleSaveGeneral()}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* NORMAL SEARCH BAR INSIDE SETTINGS */}
      <div className="relative">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-2 sm:p-2.5 flex items-center space-x-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all settings: passkeys, emails, password, fonts, colors, voice assistant, storage, tracker..."
            className="flex-1 text-xs sm:text-sm bg-transparent border-none focus:outline-none text-slate-800 placeholder:text-slate-400 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Settings Layout: Sidebar Tabs + Settings Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Settings Navigation Sidebar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-3 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5 block">
            Subdivisions ({filteredTabs.length})
          </span>

          {filteredTabs.map((tab) => {
            const isActive = activeSettingsTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className={isActive ? 'text-indigo-300' : 'text-slate-400'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-300'}`} />
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          {/* TAB 1: GENERAL & BASIC PERSONAL DETAILS */}
          {activeSettingsTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">General Profile & Personal Details</h2>
                <p className="text-xs text-slate-500">Manage identity, contact points, roll number, and curriculum affinity.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username Handle</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">@</span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Academic Email</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Secondary / Backup Email</label>
                  <input
                    type="email"
                    value={secondaryEmail}
                    onChange={(e) => setSecondaryEmail(e.target.value)}
                    placeholder="backup@gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone Number</label>
                  <div className="relative">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student Roll Number / Enrollment ID</label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Curriculum Domain</label>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value as DomainId)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  >
                    {domains.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.shortLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Affiliated Institution</label>
                  <select
                    value={selectedInstitution}
                    onChange={(e) => setSelectedInstitution(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  >
                    {institutions.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bio & Learning Objectives</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Save Profile Details
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: APPEARANCE, TEXT FONTS & COLORS */}
          {activeSettingsTab === 'appearance' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Appearance, Typography & Colors</h2>
                <p className="text-xs text-slate-500">Fine-tune font families, accessibility styling, and visual theme palettes.</p>
              </div>

              {/* Theme Accent Colors */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Accent Theme Color</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {[
                    { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-600', ring: 'ring-indigo-400' },
                    { id: 'blue', name: 'Cobalt', bg: 'bg-blue-600', ring: 'ring-blue-400' },
                    { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-600', ring: 'ring-emerald-400' },
                    { id: 'violet', name: 'Violet', bg: 'bg-purple-600', ring: 'ring-purple-400' },
                    { id: 'amber', name: 'Amber', bg: 'bg-amber-500', ring: 'ring-amber-300' },
                    { id: 'rose', name: 'Crimson', bg: 'bg-rose-600', ring: 'ring-rose-400' },
                  ].map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setThemeColor(color.id as any)}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center space-y-1.5 ${
                        themeColor === color.id
                          ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full ${color.bg}`} />
                      <span className="text-[11px] font-bold text-slate-800">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Text Font Family</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'sans', name: 'Plus Jakarta Sans', note: 'Modern geometric UI', sample: 'Aa Bb Cc' },
                    { id: 'inter', name: 'Inter Display', note: 'High legibility screens', sample: 'Aa Bb Cc' },
                    { id: 'mono', name: 'JetBrains Mono', note: 'Code & technical math', sample: '01 02 03' },
                    { id: 'dyslexic', name: 'OpenDyslexic', note: 'Weighted letter bottoms', sample: 'Aa Bb Cc' },
                    { id: 'serif', name: 'Merriweather Serif', note: 'Editorial book reading', sample: 'Aa Bb Cc' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setFontFamily(f.id as any);
                        if (f.id === 'dyslexic') setDyslexiaMode(true);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        fontFamily === f.id
                          ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base font-bold block text-slate-900">{f.sample}</span>
                      <span className="text-xs font-bold text-slate-800">{f.name}</span>
                      <span className="text-[10px] text-slate-400 block">{f.note}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Scaling */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Interface Font Size</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'compact', label: 'Compact (13px)' },
                    { id: 'normal', label: 'Standard (15px)' },
                    { id: 'comfortable', label: 'Comfortable (17px)' },
                    { id: 'large', label: 'Large (19px)' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFontSize(s.id as any)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                        fontSize === s.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accessibility Toggles */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Cognitive & Visual Accessibility
                </span>

                <label className="flex items-center justify-between text-xs text-slate-800 cursor-pointer">
                  <div>
                    <span className="font-bold block">OpenDyslexic Layout Mode</span>
                    <span className="text-[11px] text-slate-500">Increases letter spacing and applies warm #FAF8F5 background</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dyslexiaMode}
                    onChange={(e) => setDyslexiaMode(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-800 cursor-pointer">
                  <div>
                    <span className="font-bold block">Bionic Reading Mode</span>
                    <span className="text-[11px] text-slate-500">Bold initial syllables of concepts and study passages</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={bionicReading}
                    onChange={(e) => setBionicReading(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-800 cursor-pointer">
                  <div>
                    <span className="font-bold block">High Contrast Mode</span>
                    <span className="text-[11px] text-slate-500">Increases border and text contrast for low-vision environments</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveGeneral()}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Save Appearance Preferences
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & LOGINS (PASSKEYS, 2FA, PASSWORD, SESSIONS) */}
          {activeSettingsTab === 'security' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Security, Passkeys & Credentials</h2>
                <p className="text-xs text-slate-500">FIDO2 passkey credentials, two-step verification, password updates, and session devices.</p>
              </div>

              {/* Passkeys Subdivision */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Biometric Passkeys (FIDO2 / WebAuthn)</h4>
                      <p className="text-[11px] text-slate-500">Sign in securely using Touch ID, Face ID, Windows Hello, or hardware keys.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPasskey}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center space-x-1"
                  >
                    <span>+ Add Passkey</span>
                  </button>
                </div>

                <div className="space-y-2 mt-2">
                  {passkeys.map((pk) => (
                    <div
                      key={pk.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 block">{pk.name}</span>
                          <span className="text-[11px] text-slate-400">{pk.device} • Created {pk.createdAt}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePasskey(pk.id)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Two-Step Verification (2FA) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Two-Step Verification (2FA)</span>
                  <span className="text-[11px] text-slate-500">Require an authenticator code (TOTP) or SMS token when signing in from new devices.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={twoStepEnabled}
                    onChange={(e) => setTwoStepEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              {/* Change Password Form */}
              <form onSubmit={handlePasswordChange} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span>Change Password</span>
                </h4>

                {passwordSuccess && (
                  <div className="p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Password updated successfully!</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-2.5 bg-rose-100/70 border border-rose-300 rounded-xl text-xs text-rose-800 font-semibold">
                    {passwordError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 chars"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Update Password
                  </button>
                </div>
              </form>

              {/* Connected Accounts */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Connected Social & Enterprise Accounts
                </span>
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-[11px]">
                      G
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">Google Account</span>
                      <span className="text-[11px] text-slate-400">
                        {currentUser?.email || 'ad9829@srmist.edu.in'} (OAuth 2.0 / Workspace Verified)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                    Connected
                  </span>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Active Logged-in Devices
                </span>
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">Chrome on macOS (Current Browser)</span>
                      <span className="text-[11px] text-emerald-600 font-semibold">Active now • IP 127.0.0.1</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      This Device
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VOICE ASSISTANT & SPEECH OPTIONS */}
          {activeSettingsTab === 'voice' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Voice Assistant & Speech Synthesis</h2>
                <p className="text-xs text-slate-500">Configure text-to-speech audio reader, playback speed, and voice dictation options.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Voice Tutor Reader</span>
                  <span className="text-[11px] text-slate-500">Enable real-time audio narration for concept lessons, quiz hints, and formulas.</span>
                </div>
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
              </div>

              {/* Speech Rate Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <label className="text-slate-800">Speech Rate / Narration Speed</label>
                  <span className="text-indigo-600 font-mono">{speechRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.50"
                  step="0.05"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>0.75x (Deliberate)</span>
                  <span>1.0x (Normal)</span>
                  <span>1.50x (Speed study)</span>
                </div>
              </div>

              {/* Voice Persona / Accent Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Voice Accent & Persona</label>
                <select
                  value={voicePersona}
                  onChange={(e) => setVoicePersona(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none"
                >
                  <option value="en-US-Natural">English (US) - Natural Socratic Mentor</option>
                  <option value="en-IN-Academic">English (India) - Academic Faculty Instructor</option>
                  <option value="en-GB-Formal">English (UK) - Formal Cambridge Lecturer</option>
                  <option value="hi-IN-Bilingual">Hindi (हिंदी) - Bilingual Hindi/English Accent</option>
                  <option value="es-ES-Spanish">Spanish (Español) - European Castilian</option>
                </select>
              </div>

              {/* Microphone & Voice Test Bar */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-900 block">Test Audio Narration & Speech</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => speakText("Theory of Computation models deterministic finite automata and formal language grammar.")}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Play Sample Voice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMicTesting(true);
                      setTimeout(() => setIsMicTesting(false), 2500);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 cursor-pointer ${
                      isMicTesting ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse' : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5 text-rose-600" />
                    <span>{isMicTesting ? 'Mic Level: 84% (Clear)' : 'Test Microphone'}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveGeneral()}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Save Voice Settings
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: DATA & STORAGE, DOWNLOADS */}
          {activeSettingsTab === 'storage' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Data, Persistent Storage & Downloads</h2>
                <p className="text-xs text-slate-500">Atomic disk persistence metrics, data downloads, and export options.</p>
              </div>

              {/* Database Persistence Status Badge */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Disk Storage Status: Active</h4>
                      <p className="text-[11px] text-slate-500">
                        File path: <code className="font-mono text-[10px] bg-slate-200 px-1 py-0.5 rounded">{dbPersistenceStatus?.filePath || './data/masteryflow_database.json'}</code>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={syncing}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? 'Flushing...' : 'Flush to Disk'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Store Size</span>
                    <span className="font-bold text-slate-800">
                      {((dbPersistenceStatus?.sizeBytes || 45200) / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Registered Users</span>
                    <span className="font-bold text-slate-800">{dbPersistenceStatus?.totalUsers || allLearners.length}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Logged Attempts</span>
                    <span className="font-bold text-slate-800">{dbPersistenceStatus?.totalAttempts || 84}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Mock Exams</span>
                    <span className="font-bold text-slate-800">{dbPersistenceStatus?.totalMockExams || 12}</span>
                  </div>
                </div>
              </div>

              {/* Downloads & Data Export Section */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-900 block">Downloads & Data Portability</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href="/api/database/export"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 transition-all flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block group-hover:text-indigo-600">
                          Export Full Database (JSON)
                        </span>
                        <span className="text-[11px] text-slate-400">Complete raw schema and learner models</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      alert('Progress report generated. Ready for print/PDF export.');
                    }}
                    className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 transition-all flex items-center justify-between text-xs group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-slate-900 block group-hover:text-emerald-600">
                          Download Progress Report (PDF)
                        </span>
                        <span className="text-[11px] text-slate-400">Comprehensive syllabus mastery report</span>
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: LANGUAGES & LOCALIZATION */}
          {activeSettingsTab === 'languages' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Languages & Regional Localization</h2>
                <p className="text-xs text-slate-500">Configure native display language and academic reading tiers.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Native Interface Language</label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value as LanguageCode)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none"
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Reading Level Tier</label>
                  <select
                    value={readingLevel}
                    onChange={(e) => setPreferredReadingLevel(e.target.value as ReadingLevel)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none"
                  >
                    <option value="middle_school">Middle School (Intuitive Analogies)</option>
                    <option value="high_school">High School (Structured Academic)</option>
                    <option value="undergraduate">Undergraduate (Rigorous Invariants)</option>
                    <option value="executive">Executive (Systems & Engineering Architecture)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">Bilingual In-Line Translation</span>
                  <span className="text-[11px] text-slate-500">Display secondary native language glosses over complex technical invariants.</span>
                </div>
                <input
                  type="checkbox"
                  checked={bilingualSubtitles}
                  onChange={(e) => setBilingualSubtitles(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveGeneral()}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Save Language Settings
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: USAGE & ACTIVITY TRACKER */}
          {activeSettingsTab === 'usage' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Study Usage & Activity Tracker</h2>
                <p className="text-xs text-slate-500">Set daily time commitments, Pomodoro intervals, and inspect learning velocity.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <Flame className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <span className="text-xl font-black text-amber-900">12 Days</span>
                  <span className="text-[11px] text-amber-700 font-semibold block">Active Daily Streak</span>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
                  <Clock className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                  <span className="text-xl font-black text-indigo-900">18.4 Hours</span>
                  <span className="text-[11px] text-indigo-700 font-semibold block">Total Time Logged</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <span className="text-xl font-black text-emerald-900">86.2%</span>
                  <span className="text-[11px] text-emerald-700 font-semibold block">Average Accuracy</span>
                </div>
              </div>

              {/* Daily Target Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <label className="text-slate-800">Daily Study Goal Target</label>
                  <span className="text-indigo-600 font-mono">{dailyGoalMinutes} minutes / day</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="5"
                  value={dailyGoalMinutes}
                  onChange={(e) => setDailyGoalMinutes(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveGeneral()}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Save Tracker Goals
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: HYPERPARAMETERS & COGNITIVE CONTROLS */}
          {activeSettingsTab === 'hyperparameters' && (
            <form onSubmit={handleSaveHyperparameters} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Engine Calibration & Gating Thresholds</h2>
                  <p className="text-xs text-slate-500">Mathematical parameters governing Bayesian evidence, decay curves, and unlock gates.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...DEFAULT_SYSTEM_CONFIG })}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Mastery Threshold</span>
                    <span className="text-blue-600">{(config.masteryThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="0.95"
                    step="0.05"
                    value={config.masteryThreshold}
                    onChange={(e) => setConfig({ ...config, masteryThreshold: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Prerequisite Unlock Threshold</span>
                    <span className="text-blue-600">{(config.prerequisiteThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="0.90"
                    step="0.05"
                    value={config.prerequisiteThreshold}
                    onChange={(e) => setConfig({ ...config, prerequisiteThreshold: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Forgetting Decay Rate (per day)</span>
                    <span className="text-amber-600">{(config.forgettingDecayRate * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.10"
                    step="0.005"
                    value={config.forgettingDecayRate}
                    onChange={(e) => setConfig({ ...config, forgettingDecayRate: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Learning Rate Alpha</span>
                    <span className="text-indigo-600">{config.learningRateAlpha.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.60"
                    step="0.05"
                    value={config.learningRateAlpha}
                    onChange={(e) => setConfig({ ...config, learningRateAlpha: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Bayesian Knowledge Tracing (BKT) 4-Parameter Configuration */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                      <span>Bayesian Knowledge Tracing (BKT) 4-Parameter Model</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Configures Corbett & Anderson (1995) knowledge tracing parameters and tri-signal hybrid blend weight.
                    </p>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-600">BKT Layer</span>
                    <input
                      type="checkbox"
                      checked={config.bktConfig?.enabled ?? true}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          bktConfig: {
                            ...(config.bktConfig || {
                              weight: 0.25,
                              defaultPInit: 0.15,
                              defaultPLearn: 0.15,
                              defaultPGuess: 0.20,
                              defaultPSlip: 0.10,
                            }),
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="rounded accent-purple-600 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>BKT Hybrid Weight</span>
                      <span className="text-purple-600">{((config.bktConfig?.weight ?? 0.25) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.50"
                      step="0.05"
                      value={config.bktConfig?.weight ?? 0.25}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          bktConfig: {
                            ...(config.bktConfig || { enabled: true, defaultPInit: 0.15, defaultPLearn: 0.15, defaultPGuess: 0.20, defaultPSlip: 0.10 }),
                            weight: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>P(L₀) Initial Knowledge</span>
                      <span className="text-purple-600">{(config.bktConfig?.defaultPInit ?? 0.15).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.40"
                      step="0.01"
                      value={config.bktConfig?.defaultPInit ?? 0.15}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          bktConfig: {
                            ...(config.bktConfig || { enabled: true, weight: 0.25, defaultPLearn: 0.15, defaultPGuess: 0.20, defaultPSlip: 0.10 }),
                            defaultPInit: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>P(T) Learn Transition</span>
                      <span className="text-emerald-600">{(config.bktConfig?.defaultPLearn ?? 0.15).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.40"
                      step="0.01"
                      value={config.bktConfig?.defaultPLearn ?? 0.15}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          bktConfig: {
                            ...(config.bktConfig || { enabled: true, weight: 0.25, defaultPInit: 0.15, defaultPGuess: 0.20, defaultPSlip: 0.10 }),
                            defaultPLearn: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>P(G) Guess Probability</span>
                      <span className="text-amber-600">{(config.bktConfig?.defaultPGuess ?? 0.20).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.45"
                      step="0.01"
                      value={config.bktConfig?.defaultPGuess ?? 0.20}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          bktConfig: {
                            ...(config.bktConfig || { enabled: true, weight: 0.25, defaultPInit: 0.15, defaultPLearn: 0.15, defaultPSlip: 0.10 }),
                            defaultPGuess: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>P(S) Slip Probability</span>
                      <span className="text-rose-600">{(config.bktConfig?.defaultPSlip ?? 0.10).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="0.30"
                      step="0.01"
                      value={config.bktConfig?.defaultPSlip ?? 0.10}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          bktConfig: {
                            ...(config.bktConfig || { enabled: true, weight: 0.25, defaultPInit: 0.15, defaultPLearn: 0.15, defaultPGuess: 0.20 }),
                            defaultPSlip: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Save Engine Hyperparameters
                </button>
              </div>
            </form>
          )}

          {/* TAB 9: HELP & SHORTCUTS */}
          {activeSettingsTab === 'help' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Help, Documentation & Shortcuts</h2>
                <p className="text-xs text-slate-500">Quick keyboard reference, guided tour launcher, and assistance resources.</p>
              </div>

              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">Launch Interactive Judge Demo Tour</h4>
                  <p className="text-[11px] text-indigo-700">Step-by-step walkthrough of Bayesian inference, gap remediation, and faculty overrides.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  Start Tour
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 block">Keyboard Shortcuts</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-700">Open Super Search & Calendar</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px]">⌘K / Ctrl+K</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-700">Toggle Dyslexia Font</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px]">Alt + D</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-700">Flip Flashcard Deck</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px]">Spacebar</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-700">Submit Quiz / Question</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px]">Enter</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: ABOUT */}
          {activeSettingsTab === 'about' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">About MasteryFlow Engine</h2>
                <p className="text-xs text-slate-500">Architecture, citations, and version specifications.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-700">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-semibold text-slate-500">Platform Version</span>
                  <span className="font-mono font-bold text-slate-900">MasteryFlow v2.6.4 Production</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-semibold text-slate-500">Pedagogical Framework</span>
                  <span className="font-bold text-slate-900">Deterministic Bayesian Knowledge Tracing (BKT)</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-semibold text-slate-500">Challenge</span>
                  <span className="font-bold text-slate-900">YUVA Megathon 2026 EduGenAI Challenge</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Persistence Store</span>
                  <span className="font-mono font-bold text-emerald-700">Disk-backed JSON Atomic Store</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: ACCOUNT SWITCH & LOGOUT */}
          {activeSettingsTab === 'account' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Account Switch & Session Termination</h2>
                <p className="text-xs text-slate-500">Switch current active student persona or sign out of your account.</p>
              </div>

              {/* Persona Switcher */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-900 block">Switch Active Student Profile</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allLearners.map((learner) => (
                    <div
                      key={learner.id}
                      onClick={() => setActiveStudentId(learner.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        learner.id === currentLearner?.id
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={learner.avatar}
                          alt={learner.name}
                          className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-300"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{learner.name}</span>
                          <span className="text-[11px] text-slate-500">{learner.email}</span>
                        </div>
                      </div>
                      {learner.id === currentLearner?.id && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Logout Action */}
              <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-rose-900">Sign Out of Current Account</h4>
                  <p className="text-[11px] text-rose-700">Clears current auth session and returns to login screen.</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
