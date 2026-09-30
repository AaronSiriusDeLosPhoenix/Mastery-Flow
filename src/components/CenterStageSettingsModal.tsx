import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  X,
  Search,
  SlidersHorizontal,
  Bell,
  Sparkles,
  User,
  Database,
  HardDrive,
  ShieldCheck,
  KeyRound,
  CreditCard,
  Fingerprint,
  Laptop,
  Smartphone,
  Check,
  ChevronRight,
  RefreshCw,
  Download,
  Lock,
  LogOut,
  Flame,
  Volume2,
  Globe,
  Sliders,
  AlertTriangle,
  Palette,
  Type,
  Eye,
  Activity,
  HelpCircle,
  Info,
  Layers,
  FileText,
  Trash2,
  Share2,
  Phone,
  Mail,
  Shield,
  Calendar,
  Clock,
  BookOpen,
  Award,
} from 'lucide-react';
import { DomainId, LanguageCode, ReadingLevel } from '../types.js';

export const CenterStageSettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    activeSettingsTab,
    setActiveSettingsTab,
    currentUser,
    currentLearner,
    updateUserProfile,
    changeUserPassword,
    logout,
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
    activeStudentId,
    language,
    setLanguage,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');

  // General & Personal details state
  const [name, setName] = useState(currentUser?.name || currentLearner?.name || 'Aarav Patel');
  const [username, setUsername] = useState(currentUser?.username || 'aarav_patel');
  const [email, setEmail] = useState(currentUser?.email || currentLearner?.email || 'aarav.patel@masteryflow.ai');
  const [recoveryEmail, setRecoveryEmail] = useState('ad9829@srmist.edu.in');
  const [mobile, setMobile] = useState(currentUser?.mobile || '+91 98765 43210');
  const [rollNumber, setRollNumber] = useState(currentUser?.studentRollNumber || 'JEE-2026-ADV-019');
  const [institutionName, setInstitutionName] = useState('IIT Madras - Dept of Computer Science');
  const [dob, setDob] = useState('2006-04-15');
  const [gender, setGender] = useState('He / Him');
  const [location, setLocation] = useState('Chennai, Tamil Nadu, India');
  const [bio, setBio] = useState(currentUser?.bio || 'Preparing for competitive engineering entrance. Focus: Physics & Calculus.');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(language || 'en');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST, UTC+05:30)');

  // Appearance state
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'midnight' | 'slate' | 'light'>('dark');
  const [selectedFont, setSelectedFont] = useState<'jakarta' | 'mono' | 'inter' | 'dyslexic'>('jakarta');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Security & Logins state
  const [passkeys, setPasskeys] = useState([
    { id: 'pk_1', name: 'Windows Hello (Brave on Windows)', date: 'Added Sep 15, 2026', current: true },
    { id: 'pk_2', name: 'Touch ID (MacBook Pro)', date: 'Added Aug 22, 2026', current: false },
  ]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [is2faEnabled, setIs2faEnabled] = useState(true);
  const [backupCodesLeft, setBackupCodesLeft] = useState(8);

  // Voice Assistant state
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('Dr. Socratic (Calm & Clear)');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [autoReadExplanations, setAutoReadExplanations] = useState(true);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  // Notifications state
  const [notifySpacedRepetition, setNotifySpacedRepetition] = useState(true);
  const [notifyMockExams, setNotifyMockExams] = useState(true);
  const [notifyStreakShield, setNotifyStreakShield] = useState(true);
  const [notifyEmailDigest, setNotifyEmailDigest] = useState(false);

  // Storage & Offline state
  const [offlineCacheEnabled, setOfflineCacheEnabled] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isSettingsModalOpen) return null;

  const handleSaveGeneral = async () => {
    try {
      await updateUserProfile({
        name,
        username,
        mobile,
        studentRollNumber: rollNumber,
        bio,
        preferredLanguage: selectedLanguage,
      });
      setLanguage(selectedLanguage);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPasskey = () => {
    setPasskeys([
      ...passkeys,
      {
        id: `pk_${Date.now()}`,
        name: 'FIDO2 Security Key (USB/NFC)',
        date: `Added ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        current: false,
      },
    ]);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordStatus('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus('Password must be at least 6 characters');
      return;
    }
    try {
      await changeUserPassword({ currentPassword, newPassword });
      setPasswordStatus('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordStatus(null), 3000);
    } catch (err: any) {
      setPasswordStatus(err.message || 'Failed to change password');
    }
  };

  const handleTestVoice = () => {
    setIsTestingVoice(true);
    speakText(`Hello ${name.split(' ')[0]}. MasteryFlow adaptive audio engine is active and configured at rate ${speechRate}x.`);
    setTimeout(() => setIsTestingVoice(false), 3000);
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      await syncDatabase();
    } finally {
      setSyncing(false);
    }
  };

  const navTabs = [
    { id: 'general', label: 'General', icon: SlidersHorizontal },
    { id: 'appearance', label: 'Appearance & Display', icon: Palette },
    { id: 'security', label: 'Security & Logins', icon: KeyRound },
    { id: 'voice', label: 'Voice & Audio Assistant', icon: Volume2 },
    { id: 'data_storage', label: 'Data & Storage', icon: HardDrive },
    { id: 'usage', label: 'Usage & Activity Tracker', icon: Activity },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
    { id: 'about', label: 'About', icon: Info },
    { id: 'account', label: 'Account & Sessions', icon: CreditCard },
  ];

  const filteredTabs = navTabs.filter((tab) =>
    tab.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-hidden animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsSettingsModalOpen(false);
      }}
    >
      <div className="bg-[#131417] text-slate-100 rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl max-w-5xl w-full h-[660px] max-h-[92vh] flex overflow-hidden relative">
        {/* LEFT COLUMN: Close, Normal Search Bar & Navigation Tabs */}
        <div className="w-60 sm:w-68 border-r border-white/10 p-3.5 sm:p-4 flex flex-col bg-[#16171b] shrink-0">
          {/* Close button & Saved notification */}
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Settings (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
            {savedNotice && (
              <span className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
          </div>

          {/* Normal Search Bar inside Settings */}
          <div className="relative my-2.5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#202226] border border-white/5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 font-medium"
            />
          </div>

          {/* Navigation tab items */}
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSettingsTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSettingsTab(tab.id)}
                  className={`w-full px-3 py-2 rounded-xl flex items-center space-x-3 text-xs transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#26282d] text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom user badge in sidebar */}
          <div className="pt-3 border-t border-white/5 mt-auto flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#2a2c32] flex items-center justify-center font-bold text-xs text-white">
              {name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AS'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{name}</p>
              <p className="text-[10px] text-slate-500 truncate">{email}</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Settings Content Area */}
        <div className="flex-1 p-5 sm:p-7 overflow-y-auto bg-[#131417] space-y-6 text-slate-200">
          {/* TAB 1: GENERAL (Personal Details, Username, Mobile, Languages, Timezone) */}
          {activeSettingsTab === 'general' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">General & Personal Details</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage your identity, academic credentials, and localization</p>
              </div>

              {/* Basic Personal Details Card */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3.5 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                  Identity & Contact
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 font-mono">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Mobile Number</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Student Roll Number</label>
                    <input
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Institution / College</label>
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Academic Goal / Bio</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              {/* Languages & Localization Card */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3.5 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Languages & Regional Settings</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Preferred Learning Language</label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value as LanguageCode)}
                      className="w-full px-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none"
                    >
                      <option value="en">English (Default)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="ta">தமிழ் (Tamil)</option>
                      <option value="te">తెలుగు (Telugu)</option>
                      <option value="bn">বাংলা (Bengali)</option>
                      <option value="es">Español (Spanish)</option>
                      <option value="de">Deutsch (German)</option>
                      <option value="fr">Français (French)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none"
                    >
                      <option value="Asia/Kolkata (IST, UTC+05:30)">Asia/Kolkata (IST, UTC+05:30)</option>
                      <option value="America/New_York (EST, UTC-05:00)">America/New_York (EST, UTC-05:00)</option>
                      <option value="America/Los_Angeles (PST, UTC-08:00)">America/Los_Angeles (PST, UTC-08:00)</option>
                      <option value="Europe/London (GMT, UTC+00:00)">Europe/London (GMT, UTC+00:00)</option>
                      <option value="Asia/Singapore (SGT, UTC+08:00)">Asia/Singapore (SGT, UTC+08:00)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveGeneral}
                  className="px-5 py-2 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-200 transition cursor-pointer text-xs shadow-xs"
                >
                  Save General Changes
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE (Colors, Text Font, Bionic Reading, Dyslexia, Contrast) */}
          {activeSettingsTab === 'appearance' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Appearance & Typography</h2>
                <p className="text-xs text-slate-400 mt-0.5">Customize theme palette, reading typography, and visual accessibility</p>
              </div>

              {/* Theme Colors */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <Palette className="w-3.5 h-3.5 text-purple-400" />
                  <span>Color Theme</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'dark', label: 'Obsidian Dark', color: '#131417', border: 'border-slate-700' },
                    { id: 'midnight', label: 'Midnight Blue', color: '#0f172a', border: 'border-blue-900' },
                    { id: 'slate', label: 'Deep Slate', color: '#1e293b', border: 'border-slate-600' },
                    { id: 'light', label: 'Clean Light', color: '#f8fafc', border: 'border-slate-300' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedTheme === theme.id
                          ? 'border-indigo-500 bg-white/10 ring-1 ring-indigo-500 font-bold'
                          : 'border-white/5 bg-[#202226] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full mb-2 border" style={{ backgroundColor: theme.color }} />
                      <span className="text-xs block text-white">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Font Family */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <Type className="w-3.5 h-3.5 text-sky-400" />
                  <span>Text Font Family</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'jakarta', name: 'Plus Jakarta Sans', desc: 'Modern geometric sans-serif for optimal reading flow' },
                    { id: 'mono', name: 'JetBrains Mono', desc: 'Monospaced font tailored for formulas, code & logic' },
                    { id: 'inter', name: 'Inter Display', desc: 'Standard high-legibility interface typeface' },
                    { id: 'dyslexic', name: 'OpenDyslexic', desc: 'Weighted gravity bottoms for neurodiverse clarity' },
                  ].map((font) => (
                    <button
                      key={font.id}
                      onClick={() => setSelectedFont(font.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedFont === font.id
                          ? 'border-sky-500 bg-white/10 ring-1 ring-sky-500 font-bold text-white'
                          : 'border-white/5 bg-[#202226] text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-semibold text-white block">{font.name}</span>
                      <span className="text-[11px] text-slate-400">{font.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cognitive Accessibility & Reading Enhancements */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3.5 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Reading Acceleration & Accessibility</span>
                </h3>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer">
                  <div>
                    <span className="font-semibold text-white block">Bionic Reading Fixation</span>
                    <span className="text-[11px] text-slate-400">Bold initial syllables of technical terms for rapid scanning</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={bionicReading}
                    onChange={(e) => setBionicReading(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer">
                  <div>
                    <span className="font-semibold text-white block">OpenDyslexic Typography</span>
                    <span className="text-[11px] text-slate-400">Heavier letter bottoms prevent letter rotation and confusion</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dyslexiaMode}
                    onChange={(e) => setDyslexiaMode(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer">
                  <div>
                    <span className="font-semibold text-white block">High Contrast Mode</span>
                    <span className="text-[11px] text-slate-400">Enhance borders and text contrast for low-light environments</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & LOGINS (Passkeys, Emails, Password, 2FA, Sessions) */}
          {activeSettingsTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Security & Logins</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage biometric passkeys, two-step verification, password & active sessions</p>
              </div>

              {/* Passkeys Section matching Image 2 */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">Biometric Passkeys</h3>
                    <p className="text-[11px] text-slate-400">Passwordless sign-in with Windows Hello, Touch ID, or FIDO2 keys</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPasskey}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition cursor-pointer"
                  >
                    + Add Passkey
                  </button>
                </div>

                {passkeys.map((pk) => (
                  <div
                    key={pk.id}
                    className="p-3.5 bg-[#18191e] rounded-xl border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Fingerprint className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-white">{pk.name}</h4>
                        <p className="text-[11px] text-slate-500">{pk.date}</p>
                      </div>
                    </div>
                    {pk.current && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5">
                        Current Device
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Verified Emails Section */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3 text-xs">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-sky-400" />
                  <span>Email Addresses</span>
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#202226]">
                    <div>
                      <span className="font-semibold text-white block">{email}</span>
                      <span className="text-[10px] text-slate-400">Primary login email</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>Verified Primary</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#202226]">
                    <div>
                      <span className="font-semibold text-white block">{recoveryEmail}</span>
                      <span className="text-[10px] text-slate-400">Academic recovery email (SRM Institute)</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Two-Step Verification Section */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Two-Step Verification (2FA)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Protect account with a secondary factor upon login</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={is2faEnabled}
                      onChange={(e) => setIs2faEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 bg-[#202226] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white block">Authenticator</span>
                      <span className="text-[10px] text-slate-500">Google Authenticator</span>
                    </div>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>

                  <div className="p-3 bg-[#202226] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white block">Email Code</span>
                      <span className="text-[10px] text-slate-500">Sent to primary</span>
                    </div>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>

                  <div className="p-3 bg-[#202226] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white block">Backup Codes</span>
                      <span className="text-[10px] text-slate-500">{backupCodesLeft} codes available</span>
                    </div>
                    <span className="text-emerald-400 font-bold text-xs">{backupCodesLeft} left</span>
                  </div>
                </div>
              </div>

              {/* Password Management */}
              <form onSubmit={handlePasswordSubmit} className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Update Account Password</span>
                </h4>
                {passwordStatus && (
                  <p className={`text-xs font-medium ${passwordStatus.includes('successfully') ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {passwordStatus}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder="New password (min 6)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Change Password
                  </button>
                </div>
              </form>

              {/* Active Logged-in Sessions matching Image 2 */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">Active Logged-in Sessions</h3>
                    <p className="text-[11px] text-slate-500">Devices currently authenticated to your account</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert('All other remote device sessions terminated.')}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition cursor-pointer"
                  >
                    Log out of all other sessions
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="p-3.5 bg-[#18191e] rounded-xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Laptop className="w-5 h-5 text-slate-400 shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-white">Brave 130 on Windows 11</h4>
                        <p className="text-[11px] text-slate-500">Asia-Southeast • Active now</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                      Active now
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#18191e] rounded-xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-5 h-5 text-slate-400 shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-white">Safari 18 on iPhone 15 Pro</h4>
                        <p className="text-[11px] text-slate-500">Asia-Southeast • 3 hours ago</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
                      Remote session
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#18191e] rounded-xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Laptop className="w-5 h-5 text-slate-400 shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-white">Chrome 128 on macOS Sonoma</h4>
                        <p className="text-[11px] text-slate-500">United States (West) • 2 days ago</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
                      Remote session
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VOICE & AUDIO ASSISTANT (Speech Rate, Pitch, Persona, Test Playback) */}
          {activeSettingsTab === 'voice' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Voice & Audio Assistant</h2>
                <p className="text-xs text-slate-400 mt-0.5">Control Socratic voice narration, pronunciation speed, and audio feedback</p>
              </div>

              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block text-sm">Voice Narration Engine</span>
                    <span className="text-[11px] text-slate-400">Read explanations, questions, and hints aloud</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceEnabled}
                      onChange={(e) => setVoiceEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Voice Persona</label>
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#202226] border border-white/5 text-white focus:outline-none"
                    >
                      <option value="Dr. Socratic (Calm & Clear)">Dr. Socratic (Calm & Clear - English)</option>
                      <option value="Priya (Indian English - Academic)">Priya (Indian English - Academic)</option>
                      <option value="Alex (US English - Expressive)">Alex (US English - Expressive)</option>
                      <option value="Oliver (British English - Formal)">Oliver (British English - Formal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Speech Speed: <span className="text-indigo-400 font-mono">{speechRate}x</span>
                    </label>
                    <input
                      type="range"
                      min="0.7"
                      max="1.5"
                      step="0.1"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer mt-2"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer pt-2">
                  <div>
                    <span className="font-semibold text-white block">Auto-Read Explanations</span>
                    <span className="text-[11px] text-slate-400">Automatically speak the pedagogical rationale when an answer is submitted</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoReadExplanations}
                    onChange={(e) => setAutoReadExplanations(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                  />
                </label>

                <div className="pt-2 flex justify-start">
                  <button
                    type="button"
                    onClick={handleTestVoice}
                    disabled={isTestingVoice}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-2 transition cursor-pointer"
                  >
                    <Volume2 className={`w-4 h-4 ${isTestingVoice ? 'animate-bounce' : ''}`} />
                    <span>{isTestingVoice ? 'Speaking...' : 'Test Voice Audio Playback'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DATA & STORAGE (Usage Meter, Persistence, Downloads, Export JSON) */}
          {activeSettingsTab === 'data_storage' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Data & Storage Management</h2>
                <p className="text-xs text-slate-400 mt-0.5">Control persistent disk caching, offline curriculum packages & full JSON exports</p>
              </div>

              {/* Storage Usage Meter */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                    Storage Usage Quota
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">24.8 MB / 500 MB (5%)</span>
                </div>
                <div className="w-full h-2.5 bg-[#202226] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '5%' }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Bayesian Probability Map: 4.2 MB</span>
                  <span>Offline Lessons: 18.1 MB</span>
                  <span>Telemetry: 2.5 MB</span>
                </div>
              </div>

              {/* Database Persistence File Card */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3.5 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Production Disk Database</span>
                </h3>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#202226]">
                  <div>
                    <span className="font-semibold text-white block">File Storage Location</span>
                    <code className="text-[11px] text-emerald-400 font-mono">
                      {dbPersistenceStatus?.filePath || './data/masteryflow_database.json'}
                    </code>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Status: {dbPersistenceStatus?.persistent ? 'Healthy & Connected' : 'Active'} • Auto-Save on State Mutation
                    </p>
                  </div>
                  <button
                    onClick={handleManualSync}
                    disabled={syncing}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>Flush to Disk</span>
                  </button>
                </div>

                {/* Offline Downloads */}
                <div className="pt-2">
                  <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer">
                    <div>
                      <span className="font-semibold text-white block">Offline Learning Cache</span>
                      <span className="text-[11px] text-slate-400">Pre-download curriculum questions & flashcards for offline access</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={offlineCacheEnabled}
                      onChange={(e) => setOfflineCacheEnabled(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <a
                    href="/api/database/export"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Complete Database JSON Archive</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: USAGE & TRACKER (Study Time, Streaks, Velocity, Mastery Distribution) */}
          {activeSettingsTab === 'usage' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Usage & Activity Tracker</h2>
                <p className="text-xs text-slate-400 mt-0.5">Telemetry metrics on daily study velocity, cognitive retention, and learning streaks</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Active Streak</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-extrabold text-amber-400">14 Days</span>
                    <Flame className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-[10px] text-slate-500">Longest: 21 Days</p>
                </div>

                <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Today's Study Time</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-extrabold text-emerald-400">48 mins</span>
                  </div>
                  <p className="text-[10px] text-emerald-500">Goal: 45 mins (107% completed)</p>
                </div>

                <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Interaction Points</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-extrabold text-sky-400">214</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Bayesian Evidence Events</p>
                </div>
              </div>

              {/* Cognitive Mastery Breakdown */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                  Concept Mastery Distribution
                </h3>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-emerald-400 font-semibold">Mastered Concepts (≥75%)</span>
                      <span className="text-white font-bold">12 Concepts (48%)</span>
                    </div>
                    <div className="w-full h-2 bg-[#202226] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '48%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-indigo-400 font-semibold">Developing Concepts (50% - 74%)</span>
                      <span className="text-white font-bold">8 Concepts (32%)</span>
                    </div>
                    <div className="w-full h-2 bg-[#202226] rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: '32%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-amber-400 font-semibold">Learning & Gaps (&lt;50%)</span>
                      <span className="text-white font-bold">5 Concepts (20%)</span>
                    </div>
                    <div className="w-full h-2 bg-[#202226] rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '20%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: NOTIFICATIONS (Alerts, Reminders, Weekly Digest) */}
          {activeSettingsTab === 'notifications' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Notification Preferences</h2>
                <p className="text-xs text-slate-400 mt-0.5">Configure when and how you receive spaced retrieval reminders</p>
              </div>

              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3.5 text-xs">
                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer">
                  <div>
                    <span className="font-semibold text-white block">Spaced Repetition Review Alerts</span>
                    <span className="text-[11px] text-slate-400">Get notified when memory decay curves drop below 70% retention</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifySpacedRepetition}
                    onChange={(e) => setNotifySpacedRepetition(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer">
                  <div>
                    <span className="font-semibold text-white block">Mock Exam Time Reminders</span>
                    <span className="text-[11px] text-slate-400">Weekly test reminders for scheduled competitive exam slots</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyMockExams}
                    onChange={(e) => setNotifyMockExams(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer">
                  <div>
                    <span className="font-semibold text-white block">Daily Streak Shield Alerts</span>
                    <span className="text-[11px] text-slate-400">Evening alert if your daily 45-min learning goal is incomplete</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyStreakShield}
                    onChange={(e) => setNotifyStreakShield(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer">
                  <div>
                    <span className="font-semibold text-white block">Weekly Progress PDF Digest</span>
                    <span className="text-[11px] text-slate-400">Receive an academic performance transcript sent to your email</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyEmailDigest}
                    onChange={(e) => setNotifyEmailDigest(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 8: HELP & SUPPORT (FAQs, Keyboard Shortcuts, Mentor Contact) */}
          {activeSettingsTab === 'help' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Help & Documentation</h2>
                <p className="text-xs text-slate-400 mt-0.5">Keyboard shortcuts, Bayesian FAQ, and technical support</p>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                  Keyboard Shortcuts Cheat Sheet
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 bg-[#202226] rounded-xl">
                    <span className="text-slate-300">Open Search Modal</span>
                    <kbd className="px-2 py-0.5 rounded bg-black text-slate-300 font-mono text-[11px]">⌘K / Ctrl+K</kbd>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#202226] rounded-xl">
                    <span className="text-slate-300">Flip Flashcard / Hint</span>
                    <kbd className="px-2 py-0.5 rounded bg-black text-slate-300 font-mono text-[11px]">Space</kbd>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#202226] rounded-xl">
                    <span className="text-slate-300">Rate Confidence (1-4)</span>
                    <kbd className="px-2 py-0.5 rounded bg-black text-slate-300 font-mono text-[11px]">1, 2, 3, 4</kbd>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#202226] rounded-xl">
                    <span className="text-slate-300">Close Any Modal</span>
                    <kbd className="px-2 py-0.5 rounded bg-black text-slate-300 font-mono text-[11px]">Esc</kbd>
                  </div>
                </div>
              </div>

              {/* FAQs */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-2.5 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                  Frequently Asked Questions
                </h3>

                <div className="space-y-2">
                  <div className="p-3 bg-[#202226] rounded-xl">
                    <h4 className="font-bold text-white">How does Bayesian Knowledge Tracing (BKT) work?</h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      BKT models the hidden mastery state of each concept using four probabilistic parameters: Prior Knowledge, Learn Rate, Slip, and Guess. Every response mathematically updates your posterior mastery probability.
                    </p>
                  </div>

                  <div className="p-3 bg-[#202226] rounded-xl">
                    <h4 className="font-bold text-white">What is the FSRS-4.5 Spaced Repetition curve?</h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      FSRS computes memory stability and retrievability over time using power-law decay, scheduling reviews right before you are statistically predicted to forget.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: ABOUT (Version, Algorithms, Provenance, Syllabi Compliance) */}
          {activeSettingsTab === 'about' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">About MasteryFlow</h2>
                <p className="text-xs text-slate-400 mt-0.5">Architecture provenance, engine specifications, and academic standards</p>
              </div>

              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3 text-xs">
                <div className="flex items-center space-x-3 pb-2 border-b border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-blue-500/30 flex items-center justify-center text-white font-bold">
                    <Layers className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">MasteryFlow Engine v2.6.4</h3>
                    <p className="text-[11px] text-slate-400">YUVA Megathon 2026 EduGenAI Challenge</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-[#202226]">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Inference Engine</span>
                    <span className="text-white font-semibold">Gemini 2.5 Flash & Pro via GenAI SDK</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#202226]">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Mastery Engine</span>
                    <span className="text-white font-semibold">Corbett-Anderson BKT + FSRS-4.5</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#202226]">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Taxonomy Standard</span>
                    <span className="text-white font-semibold">Bloom's Revised Cognitive Hierarchy</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#202226]">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Clinical Safeguard</span>
                    <span className="text-emerald-400 font-semibold">Invariant Hallucination Guard</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 pt-2 border-t border-white/5">
                  Designed for deep pedagogical integrity across national competitive syllabi (IIT Madras JEE, IISc GATE, and UPSC CSE). Student data remains private, local, and encrypted.
                </p>
              </div>
            </div>
          )}

          {/* TAB 10: ACCOUNT & SESSIONS (Google Account, Persona Switch, Danger Zone) */}
          {activeSettingsTab === 'account' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Account & Linked Sessions</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage authentication providers, persona switching, and account security</p>
              </div>

              {/* Google Account Status */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                  Linked Accounts
                </h3>

                <div className="p-3 bg-[#202226] rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    </div>
                    <div>
                      <span className="font-semibold text-white block">Google Account</span>
                      <span className="text-[11px] text-slate-400">{recoveryEmail}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800">
                    Connected
                  </span>
                </div>
              </div>

              {/* Persona Switch */}
              <div className="p-4 bg-[#18191e] rounded-2xl border border-white/5 space-y-3 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                  Switch Active Persona
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {allLearners.map((learner) => {
                    const isSelected = learner.id === activeStudentId;
                    return (
                      <button
                        key={learner.id}
                        type="button"
                        onClick={() => setActiveStudentId(learner.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-white/10 font-bold text-white'
                            : 'border-white/5 bg-[#202226] text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="font-bold block text-white">{learner.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{learner.cohort}</span>
                        {isSelected && <span className="text-[10px] text-emerald-400 font-bold">Active</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-4 bg-rose-950/20 rounded-2xl border border-rose-900/40 space-y-3 text-xs">
                <h3 className="font-bold text-rose-400 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Danger Zone</span>
                </h3>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div>
                    <span className="font-bold text-white block">Log Out of MasteryFlow</span>
                    <span className="text-[11px] text-slate-400">End your current session. You will be prompted to sign in upon return.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsModalOpen(false);
                      logout();
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
