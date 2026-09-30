import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppView,
  Concept,
  CurriculumDomain,
  DomainId,
  InstitutionStyleGuide,
  KnowledgeGap,
  LanguageCode,
  LearnerProfile,
  LearningActivityEvent,
  Lesson,
  LessonProgress,
  Module,
  ModuleProgress,
  ReadingLevel,
  Role,
  SubjectProgress,
  SystemConfig,
  User,
} from '../types.js';
import * as api from '../api/client.js';

interface AppContextType {
  // PHASE 6: Production Auth & User State
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalTab: 'signin' | 'signup' | 'demo';
  setAuthModalTab: (tab: 'signin' | 'signup' | 'demo') => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  isProgressReportModalOpen: boolean;
  setIsProgressReportModalOpen: (open: boolean) => void;
  isGlobalChatOpen: boolean;
  setIsGlobalChatOpen: (open: boolean) => void;
  dbPersistenceStatus: {
    persistent: boolean;
    storageType: string;
    filePath: string;
    sizeBytes: number;
    lastModified: string;
    totalUsers: number;
    totalLearners: number;
    totalAttempts: number;
    totalMockExams: number;
  } | null;
  login: (payload: { email: string; password: string }) => Promise<void>;
  googleAuth: (payload: { email: string; name?: string; avatar?: string; googleId?: string }) => Promise<void>;
  register: (payload: any) => Promise<void>;
  demoLogin: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  changeUserPassword: (payload: { currentPassword?: string; newPassword: string }) => Promise<void>;
  syncDatabase: () => Promise<void>;

  // Search & Settings navigation
  isSuperSearchOpen: boolean;
  setIsSuperSearchOpen: (open: boolean) => void;
  activeSettingsTab: string;
  setActiveSettingsTab: (tab: string) => void;
  openSettingsWithTab: (tab?: string) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;

  // Sidebar Drawer state (stacked with three horizontal lines)
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  activeStudentId: string;
  setActiveStudentId: (id: string) => void;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  targetConceptId: string;
  setTargetConceptId: (id: string) => void;
  targetTeacherStudentId: string;
  setTargetTeacherStudentId: (id: string) => void;
  currentLearner: LearnerProfile | null;
  allLearners: LearnerProfile[];
  concepts: Concept[];
  systemConfig: SystemConfig | null;
  institutions: InstitutionStyleGuide[];
  activeInstitutionId: string;
  setActiveInstitutionId: (id: string) => Promise<void>;

  // Multi-Domain Syllabi (GATE, UPSC, School STEM, College Degree, CS)
  domains: CurriculumDomain[];
  activeDomainId: DomainId;
  setActiveDomainId: (domainId: DomainId) => Promise<void>;

  // PHASE 2: Modules, Lessons & Learning Paths
  modules: Module[];
  lessons: Lesson[];
  activeLessonId: string;
  setActiveLessonId: (id: string) => void;
  progressData: {
    subjectProgress: SubjectProgress;
    moduleProgresses: ModuleProgress[];
    lessonProgressList: LessonProgress[];
    conceptMasteryBreakdown: any[];
    knowledgeGaps: KnowledgeGap[];
    activityHistory: LearningActivityEvent[];
    nextRecommendation: any;
  } | null;
  refreshProgress: () => Promise<void>;
  markLessonComplete: (
    lessonId: string,
    meta?: { questionsAttempted?: number; questionsCorrect?: number; timeSpentSeconds?: number }
  ) => Promise<void>;
  
  // Accessibility & Innovations
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  readingLevel: ReadingLevel;
  setReadingLevel: (level: ReadingLevel) => void;
  dyslexiaMode: boolean;
  setDyslexiaMode: (enabled: boolean) => void;
  bionicReading: boolean;
  setBionicReading: (enabled: boolean) => void;

  // Audio Text-To-Speech Reader
  isAudioPlaying: boolean;
  activeSpokenText: string | null;
  speakText: (text: string, lang?: string) => void;
  stopAudio: () => void;

  loading: boolean;
  error: string | null;
  refreshLearner: () => Promise<void>;
  refreshAll: () => Promise<void>;
  isDemoModalOpen: boolean;
  setIsDemoModalOpen: (open: boolean) => void;
  demoStep: number;
  setDemoStep: (step: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // PHASE 6: Production Authentication & Database Persistence State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup' | 'demo'>('demo');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [dbPersistenceStatus, setDbPersistenceStatus] = useState<any>(null);

  const [currentRole, setCurrentRole] = useState<Role>('STUDENT');
  const [activeStudentId, setActiveStudentId] = useState<string>('student_a');
  const [activeView, setActiveView] = useState<AppView>('student_dashboard');
  const [targetConceptId, setTargetConceptId] = useState<string>('gate_toc');
  const [targetTeacherStudentId, setTargetTeacherStudentId] = useState<string>('student_b');

  const [currentLearner, setCurrentLearner] = useState<LearnerProfile | null>(null);
  const [allLearners, setAllLearners] = useState<LearnerProfile[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [allSystemConcepts, setAllSystemConcepts] = useState<Concept[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionStyleGuide[]>([]);
  const [activeInstitutionId, setActiveInstIdState] = useState<string>('iit_madras');

  // Domains state
  const [domains, setDomains] = useState<CurriculumDomain[]>([]);
  const [activeDomainId, setActiveDomainIdState] = useState<DomainId>('gate_cs');

  // Accessibility & Innovation Preferences
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [readingLevel, setReadingLevelState] = useState<ReadingLevel>('undergraduate');
  const [dyslexiaMode, setDyslexiaModeState] = useState<boolean>(false);
  const [bionicReading, setBionicReadingState] = useState<boolean>(false);

  // Audio Speech Reader State
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [activeSpokenText, setActiveSpokenText] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // PHASE 2: Modules, Lessons & Learning Paths state
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string>('les_gate_toc');
  const [progressData, setProgressData] = useState<any>(null);

  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(1);
  const [isProgressReportModalOpen, setIsProgressReportModalOpen] = useState<boolean>(false);
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState<boolean>(false);

  // Super Search & Comprehensive Settings State
  const [isSuperSearchOpen, setIsSuperSearchOpen] = useState<boolean>(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<string>('security');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Sidebar Drawer state (stacked behind 3 horizontal lines for clean front page)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const openSettingsWithTab = (tab = 'security') => {
    setActiveSettingsTab(tab);
    setIsSettingsModalOpen(true);
  };

  // Keyboard shortcut: Cmd+K / Ctrl+K opens Super Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSuperSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const refreshProgress = async () => {
    try {
      if (!activeStudentId) return;
      const data = await api.fetchLearnerProgress(activeStudentId, activeDomainId);
      setProgressData(data);
    } catch (err) {
      console.warn('Could not refresh student progress:', err);
    }
  };

  const markLessonComplete = async (
    lessonId: string,
    meta?: { questionsAttempted?: number; questionsCorrect?: number; timeSpentSeconds?: number }
  ) => {
    try {
      const res = await api.completeLesson(lessonId, {
        learnerId: activeStudentId,
        ...meta,
      });

      // Update current learner state
      await refreshLearner();
      await refreshProgress();
    } catch (err) {
      console.error('Failed to mark lesson complete:', err);
    }
  };

  const refreshAll = async () => {
    try {
      setLoading(true);
      const [fetchedConcepts, fetchedLearners, fetchedConfig, instData, domainsData, fetchedModules, fetchedLessons] =
        await Promise.all([
          api.fetchConcepts(),
          api.fetchLearners(),
          api.fetchSystemConfig(),
          api.fetchInstitutions().catch(() => ({ institutions: [], activeInstitutionId: 'iit_madras' })),
          api.fetchDomains().catch(() => ({ domains: [], activeDomainId: 'gate_cs' as DomainId })),
          api.fetchModules().catch(() => []),
          api.fetchLessons().catch(() => []),
        ]);

      setAllSystemConcepts(fetchedConcepts);
      setAllLearners(fetchedLearners);
      setSystemConfig(fetchedConfig);
      setInstitutions(instData.institutions);
      setActiveInstIdState(instData.activeInstitutionId || 'iit_madras');
      setDomains(domainsData.domains);

      // Rehydrate authenticated session if token exists
      let activeUserId = activeStudentId;
      try {
        const storedToken = api.getStoredToken();
        if (storedToken) {
          const meRes = await api.getMe();
          if (meRes) {
            setCurrentUser(meRes.user);
            activeUserId = meRes.user.id;
            setActiveStudentId(meRes.user.id);
            setCurrentRole(meRes.user.role);
          } else {
            setCurrentUser(null);
            setIsAuthModalOpen(true);
            setAuthModalTab('signin');
          }
        } else {
          // First time opening the application: prompt user to sign in or login
          setCurrentUser(null);
          setIsAuthModalOpen(true);
          setAuthModalTab('signin');
        }
      } catch (e) {
        console.warn('Session check failed:', e);
        setIsAuthModalOpen(true);
        setAuthModalTab('signin');
      }

      // Fetch persistent database status
      try {
        const dbStatus = await api.fetchDatabaseStatus();
        setDbPersistenceStatus(dbStatus);
      } catch (e) {
        console.warn('DB status fetch failed:', e);
      }

      const active = fetchedLearners.find((l: LearnerProfile) => l.id === activeUserId) || fetchedLearners[0];
      const targetDomain = active?.activeDomainId || domainsData.activeDomainId || 'gate_cs';
      setActiveDomainIdState(targetDomain);

      // Filter concepts, modules, and lessons by active domain
      const filteredConcepts = fetchedConcepts.filter((c) => c.domainId === targetDomain);
      setConcepts(filteredConcepts.length > 0 ? filteredConcepts : fetchedConcepts);

      const filteredModules = fetchedModules.filter((m) => m.domainId === targetDomain);
      setModules(filteredModules.length > 0 ? filteredModules : fetchedModules);

      const filteredLessons = fetchedLessons.filter((l) => l.domainId === targetDomain);
      setLessons(filteredLessons.length > 0 ? filteredLessons : fetchedLessons);

      if (filteredConcepts.length > 0) {
        setTargetConceptId(filteredConcepts[0].id);
      }

      if (filteredLessons.length > 0) {
        setActiveLessonId(filteredLessons[0].id);
      }

      if (active) {
        setCurrentLearner(active);
        setLanguageState(active.preferredLanguage || 'en');
        setReadingLevelState(active.preferredReadingLevel || 'undergraduate');
        setDyslexiaModeState(active.dyslexiaModeEnabled || false);
        setBionicReadingState(active.bionicReadingEnabled || false);

        // Fetch dynamic progress
        try {
          const prog = await api.fetchLearnerProgress(active.id, targetDomain);
          setProgressData(prog);
        } catch (e) {
          console.warn('Could not fetch initial progress:', e);
        }
      }
      setError(null);
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setError(err.message || 'Error connecting to MasteryFlow engine');
    } finally {
      setLoading(false);
    }
  };

  const refreshLearner = async () => {
    try {
      const learner = await api.fetchLearner(activeStudentId);
      setCurrentLearner(learner);
      setAllLearners((prev) => prev.map((l) => (l.id === learner.id ? learner : l)));
    } catch (err: any) {
      console.error(`Failed to refresh learner ${activeStudentId}:`, err);
    }
  };

  // PHASE 6: Production Auth Actions
  const login = async (payload: { email: string; password: string }) => {
    const res = await api.login(payload);
    setCurrentUser(res.user);
    setActiveStudentId(res.user.id);
    setCurrentRole(res.user.role);
    setCurrentLearner(res.learner);
    setIsAuthModalOpen(false);
    await refreshAll();
  };

  const googleAuth = async (payload: { email: string; name?: string; avatar?: string; googleId?: string }) => {
    const res = await api.googleLogin(payload);
    setCurrentUser(res.user);
    setActiveStudentId(res.user.id);
    setCurrentRole(res.user.role);
    setCurrentLearner(res.learner);
    setIsAuthModalOpen(false);
    await refreshAll();
  };

  const register = async (payload: any) => {
    const res = await api.register(payload);
    setCurrentUser(res.user);
    setActiveStudentId(res.user.id);
    setCurrentRole(res.user.role);
    setCurrentLearner(res.learner);
    setIsAuthModalOpen(false);
    await refreshAll();
  };

  const demoLogin = async (userId: string) => {
    const res = await api.demoLogin(userId);
    setCurrentUser(res.user);
    setActiveStudentId(res.user.id);
    setCurrentRole(res.user.role);
    setCurrentLearner(res.learner);
    setIsAuthModalOpen(false);
    await refreshAll();
  };

  const logout = async () => {
    await api.logout();
    setCurrentUser(null);
    setActiveStudentId('student_a');
    setCurrentRole('STUDENT');
    setIsProfileModalOpen(false);
    setIsAuthModalOpen(true);
    setAuthModalTab('signin');
    await refreshAll();
  };

  const changeUserPassword = async (payload: { currentPassword?: string; newPassword: string }) => {
    await api.changePassword(payload);
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    const res = await api.updateProfile(updates);
    setCurrentUser(res.user);
    setCurrentLearner(res.learner);
    if (res.user.preferredLanguage) setLanguageState(res.user.preferredLanguage);
    if (res.user.preferredReadingLevel) setReadingLevelState(res.user.preferredReadingLevel);
    if (res.user.dyslexiaModeEnabled !== undefined) setDyslexiaModeState(res.user.dyslexiaModeEnabled);
    if (res.user.bionicReadingEnabled !== undefined) setBionicReadingState(res.user.bionicReadingEnabled);
    if (res.user.activeDomainId && res.user.activeDomainId !== activeDomainId) {
      await setActiveDomainId(res.user.activeDomainId);
    }
    setAllLearners((prev) => prev.map((l) => (l.id === res.learner.id ? res.learner : l)));
  };

  const syncDatabase = async () => {
    await api.syncDatabaseToDisk();
    const status = await api.fetchDatabaseStatus();
    setDbPersistenceStatus(status);
  };

  const setActiveDomainId = async (domainId: DomainId) => {
    try {
      setActiveDomainIdState(domainId);
      const updatedLearner = await api.switchLearnerDomain(activeStudentId, domainId);
      setCurrentLearner(updatedLearner);
      setAllLearners((prev) => prev.map((l) => (l.id === updatedLearner.id ? updatedLearner : l)));

      // Update filtered concepts
      const filtered = allSystemConcepts.filter((c) => c.domainId === domainId);
      setConcepts(filtered.length > 0 ? filtered : allSystemConcepts);
      if (filtered.length > 0) {
        setTargetConceptId(filtered[0].id);
      }

      // Automatically pair recommended style guide for domain
      if (domainId === 'gate_cs') {
        setActiveInstitutionId('iit_madras');
      } else if (domainId === 'upsc_civil') {
        setActiveInstitutionId('upsc_commission');
      } else if (domainId === 'school_stem') {
        setActiveInstitutionId('cbse_board');
      } else {
        setActiveInstitutionId('mit_eecs');
      }
    } catch (err) {
      console.error('Error switching domain:', err);
    }
  };

  const setActiveInstitutionId = async (id: string) => {
    try {
      await api.setActiveInstitution(id);
      setActiveInstIdState(id);
      if (currentLearner) {
        await api.updateUserPreferences(currentLearner.id, { institutionId: id });
        setCurrentLearner((prev) => (prev ? { ...prev, institutionId: id } : null));
      }
    } catch (err) {
      console.error('Error setting active institution:', err);
    }
  };

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    if (currentLearner) {
      api.updateUserPreferences(currentLearner.id, { preferredLanguage: lang });
    }
  };

  const setReadingLevel = (level: ReadingLevel) => {
    setReadingLevelState(level);
    if (currentLearner) {
      api.updateUserPreferences(currentLearner.id, { preferredReadingLevel: level });
    }
  };

  const setDyslexiaMode = (enabled: boolean) => {
    setDyslexiaModeState(enabled);
    if (currentLearner) {
      api.updateUserPreferences(currentLearner.id, { dyslexiaModeEnabled: enabled });
    }
  };

  const setBionicReading = (enabled: boolean) => {
    setBionicReadingState(enabled);
    if (currentLearner) {
      api.updateUserPreferences(currentLearner.id, { bionicReadingEnabled: enabled });
    }
  };

  const speakText = (text: string, lang = 'en') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis is not supported on this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const langMap: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      fr: 'fr-FR',
      de: 'de-DE',
      zh: 'zh-CN',
    };
    utterance.lang = langMap[lang] || 'en-US';

    utterance.onstart = () => {
      setIsAudioPlaying(true);
      setActiveSpokenText(text);
    };

    utterance.onend = () => {
      setIsAudioPlaying(false);
      setActiveSpokenText(null);
    };

    utterance.onerror = () => {
      setIsAudioPlaying(false);
      setActiveSpokenText(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsAudioPlaying(false);
      setActiveSpokenText(null);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (allLearners.length > 0) {
      const active = allLearners.find((l) => l.id === activeStudentId);
      if (active) {
        setCurrentLearner(active);
        setLanguageState(active.preferredLanguage || 'en');
        setReadingLevelState(active.preferredReadingLevel || 'undergraduate');
        setDyslexiaModeState(active.dyslexiaModeEnabled || false);
        setBionicReadingState(active.bionicReadingEnabled || false);
        if (active.activeDomainId) {
          setActiveDomainIdState(active.activeDomainId);
          const filtered = allSystemConcepts.filter((c) => c.domainId === active.activeDomainId);
          setConcepts(filtered.length > 0 ? filtered : allSystemConcepts);
          if (filtered.length > 0) setTargetConceptId(filtered[0].id);
        }
        // Keep demo session token aligned when switching demo student personas
        if (
          currentUser &&
          currentUser.role === 'STUDENT' &&
          currentUser.id !== activeStudentId &&
          ['student_a', 'student_b', 'student_c'].includes(activeStudentId)
        ) {
          api
            .demoLogin(activeStudentId)
            .then((res) => setCurrentUser(res.user))
            .catch(() => {});
        }
      }
    }
  }, [activeStudentId, allSystemConcepts]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        isProfileModalOpen,
        setIsProfileModalOpen,
        dbPersistenceStatus,
        login,
        googleAuth,
        register,
        demoLogin,
        logout,
        updateUserProfile,
        changeUserPassword,
        syncDatabase,

        // Search & Settings navigation
        isSuperSearchOpen,
        setIsSuperSearchOpen,
        activeSettingsTab,
        setActiveSettingsTab,
        openSettingsWithTab,
        isSettingsModalOpen,
        setIsSettingsModalOpen,

        // Sidebar Drawer state
        isSidebarOpen,
        setIsSidebarOpen,
        toggleSidebar,

        currentRole,
        setCurrentRole,
        activeStudentId,
        setActiveStudentId,
        activeView,
        setActiveView,
        targetConceptId,
        setTargetConceptId,
        targetTeacherStudentId,
        setTargetTeacherStudentId,
        currentLearner,
        allLearners,
        concepts,
        systemConfig,
        institutions,
        activeInstitutionId,
        setActiveInstitutionId,
        domains,
        activeDomainId,
        setActiveDomainId,
        modules,
        lessons,
        activeLessonId,
        setActiveLessonId,
        progressData,
        refreshProgress,
        markLessonComplete,
        language,
        setLanguage,
        readingLevel,
        setReadingLevel,
        dyslexiaMode,
        setDyslexiaMode,
        bionicReading,
        setBionicReading,
        isAudioPlaying,
        activeSpokenText,
        speakText,
        stopAudio,
        loading,
        error,
        refreshLearner,
        refreshAll,
        isDemoModalOpen,
        setIsDemoModalOpen,
        demoStep,
        setDemoStep,
        isProgressReportModalOpen,
        setIsProgressReportModalOpen,
        isGlobalChatOpen,
        setIsGlobalChatOpen,
      }}
    >
      <div className={dyslexiaMode ? 'dyslexia-mode-active font-dyslexic bg-[#FAF8F5] text-slate-900' : ''}>
        {children}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
