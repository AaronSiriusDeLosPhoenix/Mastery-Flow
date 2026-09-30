import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Search,
  Mic,
  MicOff,
  Calendar as CalendarIcon,
  X,
  BookOpen,
  Layers,
  Sparkles,
  SlidersHorizontal,
  GraduationCap,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Volume2,
  FileText,
  Flame,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { DomainId } from '../types.js';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'concept' | 'module' | 'action' | 'setting' | 'resource';
  icon: React.ReactNode;
  badge?: string;
  onSelect: () => void;
}

export const SuperSearchModal: React.FC = () => {
  const {
    isSuperSearchOpen,
    setIsSuperSearchOpen,
    concepts,
    modules,
    lessons,
    activeDomainId,
    setActiveDomainId,
    setActiveView,
    setTargetConceptId,
    setActiveLessonId,
    openSettingsWithTab,
    dyslexiaMode,
    setDyslexiaMode,
    bionicReading,
    setBionicReading,
    setIsGlobalChatOpen,
    currentLearner,
    speakText,
  } = useApp();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'concepts' | 'modules' | 'settings' | 'calendar'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);

  // Calendar & Study Schedule State
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number>(29);
  const [studyReminders, setStudyReminders] = useState<
    Array<{ id: string; day: number; title: string; type: 'revision' | 'exam' | 'goal'; time: string }>
  >([
    { id: '1', day: 29, title: 'TOC: Pumping Lemma Regularity Review', type: 'revision', time: '10:00 AM' },
    { id: '2', day: 29, title: 'Complete GATE Mock Exam (15 questions)', type: 'exam', time: '04:30 PM' },
    { id: '3', day: 30, title: 'Compiler Design: LR(1) Parser Flashcards', type: 'revision', time: '11:00 AM' },
    { id: '4', day: 2, title: 'Database Indexing & B-Trees Assessment', type: 'exam', time: '02:00 PM' },
  ]);
  const [newReminderTitle, setNewReminderTitle] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isSuperSearchOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      stopListening();
    }
  }, [isSuperSearchOpen]);

  // Voice Assistance Recognition
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Browser doesn't support Web Speech API, run simulated voice dictation
      setIsListening(true);
      setVoiceTranscript('Listening... Speak a topic or command');
      setTimeout(() => {
        const samples = ['Pumping Lemma', 'Theory of Computation', 'Passkeys security', 'Voice tutor settings'];
        const chosen = samples[Math.floor(Math.random() * samples.length)];
        setQuery(chosen);
        setVoiceTranscript(`Captured: "${chosen}"`);
        setIsListening(false);
        speakText(`Searching for ${chosen}`);
      }, 2000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceTranscript('Listening to voice input...');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setVoiceTranscript(transcript);
        setQuery(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setVoiceTranscript(null);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  if (!isSuperSearchOpen) return null;

  // Build Results
  const allResults: SearchResultItem[] = [];

  // 1. Concepts
  concepts.forEach((c) => {
    allResults.push({
      id: `concept_${c.id}`,
      title: c.name,
      subtitle: `${c.code} • Concept & Knowledge Graph Node`,
      category: 'concept',
      badge: 'Concept',
      icon: <BookOpen className="w-4 h-4 text-blue-600" />,
      onSelect: () => {
        setTargetConceptId(c.id);
        setActiveView('student_learn');
        setIsSuperSearchOpen(false);
      },
    });
  });

  // 2. Modules & Lessons
  modules.forEach((m) => {
    allResults.push({
      id: `module_${m.id}`,
      title: m.title,
      subtitle: `${m.code} • Module Track (${m.targetCompetency})`,
      category: 'module',
      badge: 'Module',
      icon: <Layers className="w-4 h-4 text-indigo-600" />,
      onSelect: () => {
        setActiveView('student_modules');
        setIsSuperSearchOpen(false);
      },
    });
  });

  lessons.forEach((l) => {
    allResults.push({
      id: `lesson_${l.id}`,
      title: l.title,
      subtitle: `Lesson • ${l.estimatedMinutes} mins • ${l.learningObjectives?.[0] || 'Core syllabus'}`,
      category: 'module',
      badge: 'Lesson',
      icon: <FileText className="w-4 h-4 text-emerald-600" />,
      onSelect: () => {
        setActiveLessonId(l.id);
        setActiveView('student_learn');
        setIsSuperSearchOpen(false);
      },
    });
  });

  // 3. Quick Actions
  allResults.push(
    {
      id: 'action_govt_benefits',
      title: 'Government Benefits, Scholarships & Credit Hub (NSP, IIT PAL, PM e-Vidya)',
      subtitle: 'Check scholarship eligibility, PM-Vidyalaxmi 3% loan subsidy & free NTA e-Abhyas prep',
      category: 'action',
      badge: 'Govt Hub',
      icon: <GraduationCap className="w-4 h-4 text-blue-700" />,
      onSelect: () => {
        setActiveView('student_govt_benefits');
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'action_mindmap',
      title: 'Interactive Knowledge Mind Map',
      subtitle: 'Inspect concept prerequisite dependencies & gaps',
      category: 'action',
      badge: 'Graph',
      icon: <Sparkles className="w-4 h-4 text-violet-600" />,
      onSelect: () => {
        setActiveView('student_mindmap');
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'action_flashcards',
      title: 'Adaptive Flashcards Deck',
      subtitle: 'Spaced repetition memory review with Leitner intervals',
      category: 'action',
      badge: 'Cards',
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      onSelect: () => {
        setActiveView('student_flashcards');
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'action_mock_exam',
      title: 'Timed Adaptive Mock Exam',
      subtitle: 'Simulate full exam conditions with auto-scoring & analytics',
      category: 'action',
      badge: 'Exam',
      icon: <GraduationCap className="w-4 h-4 text-indigo-600" />,
      onSelect: () => {
        setActiveView('student_mock_exam');
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'action_tutor',
      title: 'Ask AI Socratic Tutor',
      subtitle: 'Real-time conversational mentor on current topic',
      category: 'action',
      badge: 'AI',
      icon: <Volume2 className="w-4 h-4 text-blue-500" />,
      onSelect: () => {
        setIsGlobalChatOpen(true);
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'action_dyslexia',
      title: `Toggle Dyslexia Mode (${dyslexiaMode ? 'Turn OFF' : 'Turn ON'})`,
      subtitle: 'Weighted OpenDyslexic letterforms and warm background',
      category: 'action',
      badge: 'Accessibility',
      icon: <SlidersHorizontal className="w-4 h-4 text-amber-600" />,
      onSelect: () => {
        setDyslexiaMode(!dyslexiaMode);
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'action_bionic',
      title: `Toggle Bionic Reading (${bionicReading ? 'Turn OFF' : 'Turn ON'})`,
      subtitle: 'Bold initial word fixation points for fast reading',
      category: 'action',
      badge: 'Accessibility',
      icon: <SlidersHorizontal className="w-4 h-4 text-emerald-600" />,
      onSelect: () => {
        setBionicReading(!bionicReading);
        setIsSuperSearchOpen(false);
      },
    }
  );

  // 4. Settings Subdivisions Quick Links
  allResults.push(
    {
      id: 'set_general',
      title: 'Settings: General & Personal Details',
      subtitle: 'Name, username, mobile, email, institution & roll number',
      category: 'setting',
      badge: 'Settings',
      icon: <SlidersHorizontal className="w-4 h-4 text-slate-700" />,
      onSelect: () => {
        openSettingsWithTab('general');
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'set_appearance',
      title: 'Settings: Appearance, Text Fonts & Colors',
      subtitle: 'Accent palette, font family, typography size & contrast',
      category: 'setting',
      badge: 'Settings',
      icon: <SlidersHorizontal className="w-4 h-4 text-pink-600" />,
      onSelect: () => {
        openSettingsWithTab('appearance');
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'set_security',
      title: 'Settings: Security, Passkeys & 2-Step Verification',
      subtitle: 'FIDO2 biometric passkeys, password, active sessions & 2FA',
      category: 'setting',
      badge: 'Security',
      icon: <Shield className="w-4 h-4 text-emerald-600" />,
      onSelect: () => {
        openSettingsWithTab('security');
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'set_voice',
      title: 'Settings: Voice Assistant & Speech Options',
      subtitle: 'TTS speech rate, pitch, voice accent & microphone testing',
      category: 'setting',
      badge: 'Voice',
      icon: <Volume2 className="w-4 h-4 text-cyan-600" />,
      onSelect: () => {
        openSettingsWithTab('voice');
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'set_storage',
      title: 'Settings: Data & Persistent Storage, Downloads',
      subtitle: 'Atomic file store, database status, data downloads & export JSON',
      category: 'setting',
      badge: 'Storage',
      icon: <SlidersHorizontal className="w-4 h-4 text-indigo-600" />,
      onSelect: () => {
        openSettingsWithTab('storage');
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'set_languages',
      title: 'Settings: Languages & Localization',
      subtitle: 'English, Hindi, Spanish, Tamil, Telugu, Mandarin & bilingual hints',
      category: 'setting',
      badge: 'Language',
      icon: <SlidersHorizontal className="w-4 h-4 text-blue-600" />,
      onSelect: () => {
        openSettingsWithTab('languages');
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'set_usage',
      title: 'Settings: Usage & Activity Tracker',
      subtitle: 'Daily study goals, study streaks, question velocity & Pomodoro',
      category: 'setting',
      badge: 'Tracker',
      icon: <Flame className="w-4 h-4 text-amber-500" />,
      onSelect: () => {
        openSettingsWithTab('usage');
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'set_hyperparams',
      title: 'Settings: Cognitive Thresholds & Hyperparameters',
      subtitle: 'Mastery certification, forgetting decay rate & signal weights',
      category: 'setting',
      badge: 'Engine',
      icon: <SlidersHorizontal className="w-4 h-4 text-purple-600" />,
      onSelect: () => {
        openSettingsWithTab('hyperparameters');
        setIsSuperSearchOpen(false);
      },
    },
    {
      id: 'set_help',
      title: 'Settings: Help, Documentation & About',
      subtitle: 'Shortcuts cheatsheet, guided tour, version info v2.6.4',
      category: 'setting',
      badge: 'Help',
      icon: <SlidersHorizontal className="w-4 h-4 text-slate-500" />,
      onSelect: () => {
        openSettingsWithTab('help');
        setIsSuperSearchOpen(false);
      },
    }
  );

  // Filter items
  const cleanQ = query.trim().toLowerCase();
  const filteredResults = allResults.filter((item) => {
    if (activeCategory === 'concepts' && item.category !== 'concept') return false;
    if (activeCategory === 'modules' && item.category !== 'module') return false;
    if (activeCategory === 'settings' && item.category !== 'setting') return false;

    if (!cleanQ) return true;
    return (
      item.title.toLowerCase().includes(cleanQ) ||
      item.subtitle.toLowerCase().includes(cleanQ) ||
      item.badge?.toLowerCase().includes(cleanQ)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        filteredResults[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      setIsSuperSearchOpen(false);
    }
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim()) return;
    setStudyReminders([
      ...studyReminders,
      {
        id: `rem_${Date.now()}`,
        day: selectedCalendarDate,
        title: newReminderTitle.trim(),
        type: 'revision',
        time: '03:00 PM',
      },
    ]);
    setNewReminderTitle('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 md:p-12 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsSuperSearchOpen(false);
      }}
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden mt-6 flex flex-col">
        {/* Search Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center space-x-3 bg-slate-50/60">
          <Search className="w-5 h-5 text-slate-400 shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search concepts, modules, settings, topics..."
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium"
          />

          {/* Voice Search Button */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
              isListening
                ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse ring-2 ring-rose-200'
                : 'border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title={isListening ? 'Stop listening' : 'Voice Search'}
          >
            {isListening ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4 text-indigo-600" />}
            <span className="text-[11px] font-bold hidden sm:inline">
              {isListening ? 'Listening...' : 'Voice'}
            </span>
          </button>

          {/* Schedule View Toggle */}
          <button
            type="button"
            onClick={() => setActiveCategory(activeCategory === 'calendar' ? 'all' : 'calendar')}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeCategory === 'calendar'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                : 'border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
            title="Study Schedule"
          >
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
            <span className="text-[11px] font-bold hidden sm:inline">Schedule</span>
          </button>

          {/* Close Button */}
          <button
            onClick={() => setIsSuperSearchOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Voice Transcript Banner */}
        {voiceTranscript && (
          <div className="px-4 py-2 bg-indigo-50/80 border-b border-indigo-100 text-xs text-indigo-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              <span className="font-semibold">{voiceTranscript}</span>
            </div>
            <button
              onClick={() => setVoiceTranscript(null)}
              className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}

        {/* Category Filter Chips */}
        <div className="flex items-center space-x-1 px-4 py-2 border-b border-slate-100 bg-white text-xs overflow-x-auto">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'concepts', label: 'Concepts' },
            { id: 'modules', label: 'Modules & Lessons' },
            { id: 'settings', label: 'Settings' },
            { id: 'calendar', label: 'Study Calendar' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* CALENDAR & STUDY SCHEDULE VIEW */}
        {activeCategory === 'calendar' ? (
          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Study Calendar & Retention Schedule</h3>
                <p className="text-xs text-slate-500">
                  Target syllabus: {activeDomainId.toUpperCase()} • Spaced repetition revision roadmap
                </p>
              </div>
              <div className="flex items-center space-x-1 text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>12 Day Streak</span>
              </div>
            </div>

            {/* Calendar Grid (September 2026) */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">September 2026</span>
                <span className="text-[11px] text-slate-500 font-medium">Academic Term Active</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-1">
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
                <span>Su</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 30 }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === 29;
                  const isSelected = day === selectedCalendarDate;
                  const hasReminders = studyReminders.some((r) => r.day === day);

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedCalendarDate(day)}
                      className={`h-9 rounded-xl text-xs font-bold transition-all relative flex flex-col items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isToday
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-300'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                      }`}
                    >
                      <span>{day}</span>
                      {hasReminders && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-amber-300' : 'bg-indigo-500'
                          } -mt-0.5`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Agenda */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800">
                  Agenda for September {selectedCalendarDate}, 2026
                </h4>
                <span className="text-[11px] text-slate-500">
                  {studyReminders.filter((r) => r.day === selectedCalendarDate).length} scheduled items
                </span>
              </div>

              {studyReminders.filter((r) => r.day === selectedCalendarDate).length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  No revision tasks scheduled for this day. Add a reminder below!
                </div>
              ) : (
                <div className="space-y-2">
                  {studyReminders
                    .filter((r) => r.day === selectedCalendarDate)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.type === 'exam'
                                ? 'bg-indigo-600'
                                : item.type === 'revision'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">{item.title}</span>
                            <span className="text-[11px] text-slate-400">{item.time}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {item.type}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {/* Add Quick Reminder Form */}
              <form onSubmit={handleAddReminder} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newReminderTitle}
                  onChange={(e) => setNewReminderTitle(e.target.value)}
                  placeholder={`Add study session for Sep ${selectedCalendarDate}...`}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* RESULTS LIST VIEW */
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 p-2">
            {filteredResults.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No matching results found for &ldquo;{query}&rdquo;. Try another topic, concept, or setting.
              </div>
            ) : (
              filteredResults.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/80 text-indigo-950' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-white shadow-2xs' : 'bg-slate-100'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs sm:text-sm font-bold truncate">{item.title}</h4>
                          {item.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↓</kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↵</kbd>{' '}
              Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">Esc</kbd>{' '}
              Close
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-600">MasteryFlow Engine v2.6</span>
          </div>
        </div>
      </div>
    </div>
  );
};
