import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { BloomLevel, Question, QuestionFormat, LearningResource, SummaryNote } from '../types.js';
import * as api from '../api/client.js';
import { TutorChat } from '../components/TutorChat.js';
import { SummaryNotesModal } from '../components/SummaryNotesModal.js';
import { LearningMaterialViewer } from '../components/LearningMaterialViewer.js';
import {
  Brain,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  RotateCcw,
  BookOpen,
  Volume2,
  VolumeX,
  Globe,
  Sliders,
  Code,
  Bug,
  HelpCircle,
  FileCode,
  Tag,
  Building2,
  Award,
  Bot,
  FileText,
  PanelRightOpen,
  PanelRightClose,
  Maximize2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const StudentLearn: React.FC = () => {
  const {
    currentLearner,
    concepts,
    targetConceptId,
    setTargetConceptId,
    refreshLearner,
    setActiveView,
    readingLevel,
    setReadingLevel,
    language,
    setLanguage,
    dyslexiaMode,
    bionicReading,
    speakText,
    isAudioPlaying,
    stopAudio,
    institutions,
    activeInstitutionId,
    domains,
    activeDomainId,
    modules,
    lessons,
    activeLessonId,
    setActiveLessonId,
    progressData,
    markLessonComplete,
    refreshProgress,
  } = useApp();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number>(0.80);
  const [hintShown, setHintShown] = useState<boolean>(false);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [retries, setRetries] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [attemptResult, setAttemptResult] = useState<any>(null);

  // Transformed Pedagogical Content (Multilingual + Reading Level)
  const [transformedContent, setTransformedContent] = useState<any>(null);
  const [loadingTransform, setLoadingTransform] = useState<boolean>(false);

  // Phase 1: Learning Resources, AI Summary Notes & AI Tutor
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [activeResource, setActiveResource] = useState<LearningResource | null>(null);
  const [summaryNotes, setSummaryNotes] = useState<SummaryNote | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);
  const [isTutorOpen, setIsTutorOpen] = useState<boolean>(true);
  const [activeMobileTab, setActiveMobileTab] = useState<'material' | 'practice' | 'tutor'>('material');

  const activeConcept = concepts.find((c) => c.id === targetConceptId) || concepts[0];
  const activeMastery = currentLearner?.conceptMasteries[activeConcept?.id || ''];

  // Load questions for concept
  useEffect(() => {
    async function loadConceptQuestions() {
      if (!activeConcept) return;
      try {
        const qList = await api.fetchQuestionsByConcept(activeConcept.id);
        setQuestions(qList);
        setCurrentQuestionIndex(0);
        resetQuestionState();
      } catch (err) {
        console.error('Failed to load concept questions:', err);
      }
    }
    loadConceptQuestions();
  }, [activeConcept?.id]);

  // Load transformed concept content (reading level + multilingual)
  useEffect(() => {
    async function loadTransformation() {
      if (!activeConcept) return;
      try {
        setLoadingTransform(true);
        const data = await api.transformContent({
          conceptId: activeConcept.id,
          language,
          readingLevel,
          institutionId: activeInstitutionId,
        });
        setTransformedContent(data);
      } catch (err) {
        console.error('Failed to transform content:', err);
      } finally {
        setLoadingTransform(false);
      }
    }
    loadTransformation();
  }, [activeConcept?.id, language, readingLevel, activeInstitutionId]);

  // Load Learning Resources for active concept
  useEffect(() => {
    async function loadResources() {
      if (!activeConcept) return;
      try {
        const resList = await api.fetchLearningResources(activeConcept.id);
        setResources(resList);
        if (resList.length > 0) {
          setActiveResource(resList[0]);
        } else {
          setActiveResource(null);
        }
      } catch (err) {
        console.error('Failed to load resources:', err);
      }
    }
    loadResources();
  }, [activeConcept?.id]);

  // Load existing Summary Notes for active concept
  useEffect(() => {
    async function loadSummary() {
      if (!activeConcept) return;
      try {
        const summary = await api.fetchSummaryNotes(activeConcept.id);
        setSummaryNotes(summary);
      } catch (err) {
        console.error('Failed to load summary notes:', err);
      }
    }
    loadSummary();
  }, [activeConcept?.id]);

  const resetQuestionState = () => {
    setSelectedOption(null);
    setConfidence(0.80);
    setHintShown(false);
    setHintsUsed(0);
    setRetries(0);
    setStartTime(Date.now());
    setAttemptResult(null);
  };

  const currentQuestion = questions[currentQuestionIndex];

  const handleSubmitAttempt = async () => {
    if (selectedOption === null || !currentQuestion || !currentLearner) return;

    const responseTimeSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    try {
      setSubmitting(true);
      const res = await api.submitAttempt({
        learnerId: currentLearner.id,
        questionId: currentQuestion.id,
        selectedOptionIndex: selectedOption,
        confidence,
        responseTimeSeconds,
        hintsUsed,
        retries,
      });

      setAttemptResult(res);
      await refreshLearner();

      if (res.attempt.isCorrect) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      }
    } catch (err) {
      console.error('Failed to submit attempt:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      resetQuestionState();
    } else {
      setActiveView('student_dashboard');
    }
  };

  const handleRetry = () => {
    setRetries((prev) => prev + 1);
    setSelectedOption(null);
    setAttemptResult(null);
  };

  // Helper for Bionic Reading formatting
  const renderBionic = (text: string) => {
    if (!bionicReading || !text) return text;
    return text.split(' ').map((word, idx) => {
      const mid = Math.ceil(word.length / 2);
      const first = word.slice(0, mid);
      const rest = word.slice(mid);
      return (
        <span key={idx} className="inline-block mr-1">
          <strong className="font-extrabold text-slate-950">{first}</strong>
          <span>{rest}</span>
        </span>
      );
    });
  };

  const activeInstitution = institutions.find((i) => i.id === activeInstitutionId) || institutions[0];
  const activeDomain = domains.find((d) => d.id === activeDomainId) || domains[0];
  const activeLesson = lessons.find((l) => l.id === activeLessonId) || lessons.find((l) => l.conceptIds.includes(activeConcept?.id)) || lessons[0];
  const activeModule = modules.find((m) => m.id === activeLesson?.moduleId) || modules[0];
  const activeLessonProgress = progressData?.lessonProgressList?.find((lp) => lp.lessonId === activeLesson?.id);
  const isLessonCompleted = activeLessonProgress?.status === 'COMPLETED';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Syllabus / Module / Lesson Path Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 bg-white/70 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveView('student_modules')}
            className="font-medium text-slate-600 hover:text-indigo-600 cursor-pointer flex items-center gap-1"
          >
            <span>{activeDomain?.name || 'Syllabus'}</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-700">{activeModule?.title || 'Current Module'}</span>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-indigo-700">{activeLesson?.title || 'Current Lesson'}</span>
        </div>

        <div className="flex items-center gap-2.5">
          {isLessonCompleted ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Lesson Completed
            </span>
          ) : (
            <button
              onClick={async () => {
                if (activeLesson) {
                  await markLessonComplete(activeLesson.id, {
                    questionsAttempted: questions.length > 0 ? currentQuestionIndex + 1 : 1,
                    questionsCorrect: attemptResult?.attempt?.isCorrect ? 1 : 0,
                    timeSpentSeconds: Math.max(30, Math.round((Date.now() - startTime) / 1000)),
                  });
                  confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
                }
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Lesson Complete</span>
            </button>
          )}

          <button
            onClick={() => setActiveView('student_mindmap')}
            className="text-xs text-purple-600 hover:text-purple-800 font-bold cursor-pointer flex items-center gap-1"
          >
            <span>Mind Map</span>
            <Brain className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveView('student_modules')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer flex items-center gap-1"
          >
            <span>Modules View</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Top Breadcrumb & Concept Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-sm shadow-xs">
            {activeConcept.code}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {transformedContent?.name || activeConcept.name}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {activeConcept.category}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Bloom Target: {activeConcept.bloomTarget}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${activeInstitution?.badgeColor}`}>
                {activeInstitution?.shortCode} Style
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Current Mastery: <strong className="text-indigo-600 font-semibold">{((activeMastery?.mastery || 0) * 100).toFixed(0)}%</strong> • Retention: <strong className="text-slate-700">{((activeMastery?.retention || 0) * 100).toFixed(0)}%</strong> • Status: <span className="capitalize font-medium">{activeMastery?.status || 'developing'}</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Concept Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* AI Summary Notes Button */}
          <button
            onClick={() => setIsSummaryModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              summaryNotes
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{summaryNotes ? 'Summary Notes Ready' : '⚡ AI Summary Notes'}</span>
          </button>

          {/* AI Tutor Toggle Button */}
          <button
            onClick={() => setIsTutorOpen(!isTutorOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isTutorOpen
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Tutor</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Quick Concept Switcher Dropdown */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Topic:</span>
            <select
              value={targetConceptId}
              onChange={(e) => setTargetConceptId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({((currentLearner?.conceptMasteries[c.id]?.mastery || 0) * 100).toFixed(0)}%)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Tab Switcher */}
      <div className="flex lg:hidden items-center p-1 bg-slate-200/80 rounded-xl gap-1 text-xs font-bold">
        <button
          onClick={() => setActiveMobileTab('material')}
          className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'material' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Learning Material</span>
        </button>
        <button
          onClick={() => setActiveMobileTab('practice')}
          className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'practice' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Practice ({questions.length})</span>
        </button>
        <button
          onClick={() => setActiveMobileTab('tutor')}
          className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'tutor' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI Tutor</span>
        </button>
      </div>

      {/* Responsive Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Learning Material Viewer (Core Lesson, PDF Handout, Video Transcript, Uploads) */}
        <div
          className={`${
            isTutorOpen ? 'lg:col-span-5' : 'lg:col-span-6'
          } ${activeMobileTab !== 'material' ? 'hidden lg:block' : 'block'} space-y-4`}
        >
          <LearningMaterialViewer
            concept={activeConcept}
            resources={resources}
            activeResource={activeResource}
            setActiveResource={setActiveResource}
            transformedContent={transformedContent}
            readingLevel={readingLevel}
            language={language}
            bionicReading={bionicReading}
            isAudioPlaying={isAudioPlaying}
            onToggleAudio={() => {
              if (isAudioPlaying) {
                stopAudio();
              } else {
                const textToSpeak =
                  transformedContent?.audioScript ||
                  activeConcept.audioScript ||
                  activeConcept.description;
                speakText(textToSpeak, language);
              }
            }}
            onOpenSummaryNotes={() => setIsSummaryModalOpen(true)}
            onOpenTutor={() => {
              setIsTutorOpen(true);
              setActiveMobileTab('tutor');
            }}
            hasSummaryNotes={!!summaryNotes}
            onResourceAdded={(newRes) => setResources((prev) => [...prev, newRes])}
          />
        </div>

        {/* Middle Column: Question Practice with Format Diversity & Bloom Tagging */}
        <div
          className={`${
            isTutorOpen ? 'lg:col-span-4' : 'lg:col-span-6'
          } ${activeMobileTab !== 'practice' ? 'hidden lg:block' : 'block'} space-y-4`}
        >
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
            {/* Question Header & Meta */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                  Q {currentQuestionIndex + 1} of {questions.length}
                </span>

                {/* Question Format Badge */}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  {currentQuestion?.questionFormat === 'CODE_OUTPUT' && <Code className="w-3 h-3" />}
                  {currentQuestion?.questionFormat === 'DEBUG_BUG' && <Bug className="w-3 h-3" />}
                  {currentQuestion?.questionFormat === 'FILL_BLANK' && <FileCode className="w-3 h-3" />}
                  {currentQuestion?.questionFormat || 'MCQ'}
                </span>

                {/* Bloom's Taxonomy Badge */}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                  <Award className="w-3 h-3 text-purple-500" />
                  Bloom: {currentQuestion?.bloomLevel || 'Understand'}
                </span>

                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {currentQuestion?.difficulty}
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>Est: {currentQuestion?.expectedTimeSeconds || 25}s</span>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 leading-snug">
                {renderBionic(currentQuestion?.questionText || '')}
              </h2>

              {/* Code Snippet for CODE_OUTPUT / DEBUG_BUG */}
              {currentQuestion?.codeSnippet && (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-emerald-300 shadow-inner">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] mb-2 pb-1 border-b border-slate-800 font-sans">
                    <span className="flex items-center gap-1">
                      <Code className="w-3 h-3" />
                      {currentQuestion.questionFormat === 'DEBUG_BUG'
                        ? 'Source with Potential Bug'
                        : 'Execution Trace'}
                    </span>
                    <span>TypeScript</span>
                  </div>
                  <pre className="overflow-x-auto leading-relaxed">
                    <code>{currentQuestion.codeSnippet}</code>
                  </pre>
                </div>
              )}
            </div>

            {/* Options List */}
            <div className="space-y-2.5">
              {currentQuestion?.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isRevealed = attemptResult !== null;
                const isCorrect = idx === currentQuestion.correctOptionIndex;

                let cardStyle =
                  'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 bg-white text-slate-800';
                if (isSelected && !isRevealed) {
                  cardStyle =
                    'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20';
                } else if (isRevealed) {
                  if (isCorrect) {
                    cardStyle =
                      'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20';
                  } else if (isSelected && !isCorrect) {
                    cardStyle =
                      'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-500/20';
                  } else {
                    cardStyle = 'border-slate-200 opacity-60 bg-slate-50 text-slate-600';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isRevealed || submitting}
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-start gap-2.5 cursor-pointer ${cardStyle}`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1 leading-relaxed">{opt}</span>
                    {isRevealed && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    {isRevealed && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Confidence Slider before submitting */}
            {!attemptResult && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                    Confidence:
                  </span>
                  <span className="font-mono font-bold text-indigo-600">
                    {(confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="1.0"
                  step="0.05"
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            )}

            {/* Hint Box */}
            {hintShown && (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" /> Pedagogical Hint:
                </span>
                <p className="text-amber-800 leading-relaxed">{currentQuestion?.hint}</p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div>
                {!hintShown && !attemptResult && (
                  <button
                    onClick={() => {
                      setHintShown(true);
                      setHintsUsed((prev) => prev + 1);
                    }}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Need a Hint?</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!attemptResult ? (
                  <button
                    disabled={selectedOption === null || submitting}
                    onClick={handleSubmitAttempt}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {submitting ? 'Evaluating...' : 'Submit Attempt'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {!attemptResult.attempt.isCorrect && (
                      <button
                        onClick={handleRetry}
                        className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    )}
                    <button
                      onClick={handleNextQuestion}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Post-Attempt Detailed Feedback */}
            {attemptResult && (
              <div
                className={`p-4 rounded-xl border space-y-2.5 ${
                  attemptResult.attempt.isCorrect
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {attemptResult.attempt.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span className="font-bold text-xs text-slate-900">
                      {attemptResult.attempt.isCorrect
                        ? 'Mastery Evidence Confirmed!'
                        : 'Conceptual Misconception Detected'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-700">
                    Evidence: {attemptResult.evidence?.evidenceScore.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {currentQuestion?.explanation}
                </p>

                {/* Evidence & Multi-Model Learning Loop Update Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-[10px] font-mono tabular-nums">
                  <div className="bg-white/80 p-2 rounded-lg border border-slate-200/60">
                    <span className="text-slate-500 block text-[9px] font-sans font-semibold">Hybrid Mastery</span>
                    <span className="font-bold text-indigo-700">
                      {(attemptResult.masteryBefore * 100).toFixed(0)}% ➔{' '}
                      {(attemptResult.masteryAfter * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-slate-200/60">
                    <span className="text-slate-500 block text-[9px] font-sans font-semibold">BKT Knowledge</span>
                    <span className="font-bold text-violet-700">
                      {(((activeMastery?.bktMastery ?? attemptResult.masteryAfter) || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-slate-200/60">
                    <span className="text-slate-500 block text-[9px] font-sans font-semibold">ML Prediction</span>
                    <span className="font-bold text-indigo-700">
                      {(((attemptResult.mlPrediction?.probability ?? activeMastery?.mlPrediction?.probability ?? attemptResult.masteryAfter) || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-slate-200/60">
                    <span className="text-slate-500 block text-[9px] font-sans font-semibold">FSFR Retention</span>
                    <span className="font-bold text-emerald-700">
                      {(((attemptResult.retentionAfter ?? activeMastery?.retention ?? 0.85) || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {attemptResult.newRecommendation && (
                  <div className="bg-white/85 p-2.5 rounded-lg border border-slate-200/70 text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-600">Updated Next Action:</span>
                      <span className="font-mono font-bold text-indigo-700">
                        {attemptResult.newRecommendation.action} → {attemptResult.newRecommendation.conceptName}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      {attemptResult.newRecommendation.reason}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Learning Tutor Chat */}
        {isTutorOpen && (
          <div
            className={`lg:col-span-3 ${
              activeMobileTab !== 'tutor' ? 'hidden lg:block' : 'block'
            } space-y-4`}
          >
            <TutorChat
              concept={activeConcept}
              currentLearner={currentLearner}
              summaryNotes={summaryNotes}
              activeQuestion={currentQuestion}
              activeResource={activeResource}
              onAskAboutSummary={() => setIsSummaryModalOpen(true)}
              isCompact={true}
            />
          </div>
        )}
      </div>

      {/* Summary Notes Modal */}
      <SummaryNotesModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        concept={activeConcept}
        activeResource={activeResource}
        summaryNotes={summaryNotes}
        onSummaryGenerated={(newSum) => setSummaryNotes(newSum)}
        onAskTutorAboutNote={(topic) => {
          setIsTutorOpen(true);
          setActiveMobileTab('tutor');
        }}
      />
    </div>
  );
};
