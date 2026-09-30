import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Lock,
  Mail,
  User,
  Sparkles,
  X,
  LogIn,
  UserPlus,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Shield,
  Layers,
  ArrowRight,
  School,
  ExternalLink,
} from 'lucide-react';
import { DomainId, LanguageCode, ReadingLevel } from '../types.js';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalTab,
    setAuthModalTab,
    login,
    register,
    demoLogin,
    googleAuth,
    domains,
    institutions,
    currentUser,
  } = useApp();

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpDomain, setSignUpDomain] = useState<DomainId>('gate_cs');
  const [signUpInstitution, setSignUpInstitution] = useState('iit_madras');
  const [signUpReadingLevel, setSignUpReadingLevel] = useState<ReadingLevel>('undergraduate');
  const [signUpLanguage, setSignUpLanguage] = useState<LanguageCode>('en');
  const [signUpDyslexia, setSignUpDyslexia] = useState(false);
  const [signUpBionic, setSignUpBionic] = useState(false);

  // Google Sign-In Interactive Selector State
  const [showGoogleAccountSelector, setShowGoogleAccountSelector] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  // Status & Error
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await login({ email: signInEmail, password: signInPassword });
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await register({
        name: signUpName,
        email: signUpEmail,
        password: signUpPassword,
        activeDomainId: signUpDomain,
        institutionId: signUpInstitution,
        preferredReadingLevel: signUpReadingLevel,
        preferredLanguage: signUpLanguage,
        dyslexiaModeEnabled: signUpDyslexia,
        bionicReadingEnabled: signUpBionic,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check form fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (userId: string) => {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await demoLogin(userId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async (email: string, name?: string, avatar?: string) => {
    setErrorMessage(null);
    setSubmitting(true);
    setShowGoogleAccountSelector(false);
    try {
      await googleAuth({
        email,
        name: name || email.split('@')[0],
        avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Sign-In failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8 relative">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">MasteryFlow Authentication</h2>
              <p className="text-xs text-slate-300">Sign in to sync your adaptive learning trajectory & memory curves</p>
            </div>
          </div>
          {currentUser && (
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1 text-xs font-semibold">
          <button
            onClick={() => {
              setAuthModalTab('signin');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              authModalTab === 'signin'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-blue-600" />
            <span>Sign In</span>
          </button>

          <button
            onClick={() => {
              setAuthModalTab('signup');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              authModalTab === 'signup'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Create Account</span>
          </button>

          <button
            onClick={() => {
              setAuthModalTab('demo');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              authModalTab === 'demo'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>1-Click Personas</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Interactive Google Account Chooser Modal Overlay */}
        {showGoogleAccountSelector && (
          <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-xs p-6 flex items-center justify-center animate-in fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 max-w-sm w-full space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  <span className="text-xs font-bold text-slate-800">Choose a Google Account</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleAccountSelector(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {/* Account 1: SRMIST Student Account (from user session) */}
                <div
                  onClick={() =>
                    handleGoogleSignIn(
                      'ad9829@srmist.edu.in',
                      'SRMIST Student',
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                    )
                  }
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition cursor-pointer flex items-center space-x-3 text-xs"
                >
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                    alt="Account"
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-300"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block truncate">SRMIST Engineering Account</span>
                    <span className="text-[11px] text-slate-500 truncate block">ad9829@srmist.edu.in</span>
                  </div>
                </div>

                {/* Account 2: Alex Rivera */}
                <div
                  onClick={() =>
                    handleGoogleSignIn(
                      'alex.rivera@masteryflow.edu',
                      'Alex Rivera',
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                    )
                  }
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition cursor-pointer flex items-center space-x-3 text-xs"
                >
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                    alt="Alex Rivera"
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-300"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block truncate">Alex Rivera</span>
                    <span className="text-[11px] text-slate-500 truncate block">alex.rivera@masteryflow.edu</span>
                  </div>
                </div>
              </div>

              {/* Custom Google Email Option */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-semibold text-slate-600 block">Use another Google email:</span>
                <input
                  type="email"
                  placeholder="student@gmail.com"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!customGoogleEmail.includes('@')}
                  onClick={() => handleGoogleSignIn(customGoogleEmail, customGoogleName || customGoogleEmail.split('@')[0])}
                  className="w-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                >
                  Continue with this Google Email
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* TAB 1: Sign In with Email & Password or Google */}
          {authModalTab === 'signin' && (
            <div className="space-y-4">
              {/* GOOGLE SIGN IN BUTTON */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowGoogleAccountSelector(true)}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center justify-center space-x-3 group"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span>Sign in with Google</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2 text-[11px] font-semibold text-slate-400 absolute">
                  or sign in with password
                </span>
              </div>

              <form onSubmit={handleSignIn} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="alex.rivera@masteryflow.edu"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    For seed accounts, you may enter any password (e.g. &quot;mastery2026&quot;).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{submitting ? 'Verifying Credentials...' : 'Sign In to Account'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Create New Student Account with Google or Form */}
          {authModalTab === 'signup' && (
            <div className="space-y-4">
              {/* GOOGLE SIGN IN WHILE CREATING ACCOUNT */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowGoogleAccountSelector(true)}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center justify-center space-x-3 group"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span>Sign up with Google (Fast 1-Click Setup)</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2 text-[11px] font-semibold text-slate-400 absolute">
                  or fill student enrollment profile
                </span>
              </div>

              <form onSubmit={handleSignUp} className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Student Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      placeholder="Jordan Lee"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      placeholder="jordan.lee@university.edu"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password (min. 6 characters)</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Curriculum Track</label>
                    <select
                      value={signUpDomain}
                      onChange={(e) => setSignUpDomain(e.target.value as DomainId)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                    >
                      {domains.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.shortLabel} ({d.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Affiliated Institution</label>
                    <select
                      value={signUpInstitution}
                      onChange={(e) => setSignUpInstitution(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                    >
                      {institutions.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Accessibility Toggles */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Accessibility Setup</span>
                  <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signUpDyslexia}
                      onChange={(e) => setSignUpDyslexia(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>OpenDyslexic high-contrast layout & warm background</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signUpBionic}
                      onChange={(e) => setSignUpBionic(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Bionic Reading (bolded initial word fixation points)</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{submitting ? 'Creating Persistent Account...' : 'Register Student & Start Learning'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: 1-Click Demo Personas */}
          {authModalTab === 'demo' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Select an instantiated student or faculty persona. Real session tokens and disk-backed learner profiles are activated instantly.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Persona: Alex Rivera */}
                <div
                  onClick={() => handleDemoLogin('student_a')}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-amber-400 bg-amber-50/30 hover:bg-amber-50/70 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                      alt="Alex Rivera"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/50"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-800">Alex Rivera</h4>
                      <p className="text-[11px] text-amber-700 font-medium">GATE CS (High Mastery 86%)</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2">
                    Mastered Theory of Computation & Automata; practicing Compiler Design.
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-amber-700">
                    <span>1-Click Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Persona: Blake Chen */}
                <div
                  onClick={() => handleDemoLogin('student_b')}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/70 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
                      alt="Blake Chen"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-400/50"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800">Blake Chen</h4>
                      <p className="text-[11px] text-emerald-700 font-medium">UPSC Civil Services (Dyslexic Mode)</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2">
                    Has prerequisite bottleneck in Directive Principles; high-contrast font enabled.
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-emerald-700">
                    <span>1-Click Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Persona: Maya Patel */}
                <div
                  onClick={() => handleDemoLogin('student_c')}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-sky-400 bg-sky-50/30 hover:bg-sky-50/70 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
                      alt="Maya Patel"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-sky-400/50"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-sky-800">Maya Patel</h4>
                      <p className="text-[11px] text-sky-700 font-medium">School STEM (Hindi & Middle School)</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2">
                    Class 12 student. Physics & Math mechanics; uses intuitive analogies and Hindi localization.
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-sky-700">
                    <span>1-Click Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Persona: Prof. Vance */}
                <div
                  onClick={() => handleDemoLogin('teacher_vance')}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-purple-400 bg-purple-50/30 hover:bg-purple-50/70 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <img
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
                      alt="Prof. Vance"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-400/50"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-800">Prof. Vance</h4>
                      <p className="text-[11px] text-purple-700 font-medium">Faculty & Curriculum Director</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2">
                    Faculty access to curriculum review, clinical overrides, and multi-student learning trajectories.
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-purple-700">
                    <span>1-Click Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Persistent Disk Storage Active</span>
          </span>
          <span>Phase 6 Production Persistence</span>
        </div>
      </div>
    </div>
  );
};
