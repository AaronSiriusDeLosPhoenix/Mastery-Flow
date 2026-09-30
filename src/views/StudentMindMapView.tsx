import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { DomainId, MindMapData, MindMapNode, SummaryNote } from '../types.js';
import * as api from '../api/client.js';
import { MindMapCanvas } from '../components/MindMapCanvas.js';
import { MindMapDetailsPanel } from '../components/MindMapDetailsPanel.js';
import { SummaryNotesModal } from '../components/SummaryNotesModal.js';
import { TutorChat } from '../components/TutorChat.js';
import {
  Layers,
  Search,
  Sparkles,
  Filter,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Bot,
  RotateCcw,
  Compass,
  X,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const StudentMindMapView: React.FC = () => {
  const {
    currentLearner,
    domains,
    activeDomainId,
    setActiveDomainId,
    setActiveLessonId,
    setTargetConceptId,
    setActiveView,
    concepts,
    lessons,
  } = useApp();

  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Node State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  // Filters & Views
  const [viewMode, setViewMode] = useState<'all' | 'modules' | 'concepts' | 'prerequisites' | 'focus'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // AI Discover connections
  const [discoveringAi, setDiscoveringAi] = useState<boolean>(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  // Phase 1 Modals: Summary Notes & AI Tutor
  const [activeConceptForNotes, setActiveConceptForNotes] = useState<any>(null);
  const [activeSummaryNotes, setActiveSummaryNotes] = useState<SummaryNote | null>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState<boolean>(false);

  const [activeConceptForTutor, setActiveConceptForTutor] = useState<any>(null);
  const [isTutorDrawerOpen, setIsTutorDrawerOpen] = useState<boolean>(false);

  // Load Mind Map Data
  const loadMindMap = async () => {
    if (!currentLearner) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchMindMap(currentLearner.id, activeDomainId);
      setMindMapData(data);

      // Default select the first concept or subject
      if (data.nodes.length > 0 && !selectedNodeId) {
        const firstConcept = data.nodes.find((n) => n.type === 'concept') || data.nodes[0];
        setSelectedNodeId(firstConcept.id);
      }
    } catch (err: any) {
      console.error('Failed to load mind map data:', err);
      setError(err.message || 'Error loading Mind Map');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMindMap();
  }, [currentLearner?.id, activeDomainId]);

  const selectedNode = mindMapData?.nodes.find((n) => n.id === selectedNodeId) || null;

  // Handle Node selection
  const handleSelectNode = (node: MindMapNode) => {
    setSelectedNodeId(node.id);
    setIsDetailsOpen(true);
  };

  // Navigate to Lesson
  const handleNavigateToLesson = (lessonId: string, conceptId?: string) => {
    if (lessonId) {
      setActiveLessonId(lessonId);
    }
    if (conceptId) {
      setTargetConceptId(conceptId);
    }
    setActiveView('student_learn');
  };

  // Open Summary Notes Modal
  const handleOpenSummaryNotes = async (conceptId: string) => {
    const conceptObj = concepts.find((c) => c.id === conceptId);
    if (!conceptObj) return;

    setActiveConceptForNotes(conceptObj);
    try {
      const summary = await api.fetchSummaryNotes(conceptId);
      setActiveSummaryNotes(summary);
    } catch (err) {
      setActiveSummaryNotes(null);
    }
    setIsNotesModalOpen(true);
  };

  // Open AI Tutor
  const handleOpenTutor = (conceptId: string) => {
    const conceptObj = concepts.find((c) => c.id === conceptId);
    if (!conceptObj) return;

    setActiveConceptForTutor(conceptObj);
    setIsTutorDrawerOpen(true);
  };

  // AI Discover Connections
  const handleDiscoverAi = async () => {
    if (!activeDomainId) return;
    try {
      setDiscoveringAi(true);
      setAiMessage(null);
      const res = await api.discoverAiMindMapConnections(activeDomainId, selectedNode?.conceptId);
      setAiMessage(res.message);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
      await loadMindMap();
    } catch (err: any) {
      setAiMessage('Could not discover connections at this moment.');
    } finally {
      setDiscoveringAi(false);
      setTimeout(() => setAiMessage(null), 5000);
    }
  };

  const activeDomain = domains.find((d) => d.id === activeDomainId) || domains[0];

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
              Interactive Syllabus DAG
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {activeDomain?.shortLabel}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${activeDomain?.badgeColor}`}>
              {activeDomain?.category}
            </span>
          </div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            <span>AI-Powered Interactive Mind Map</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            <strong>“How are concepts connected?”</strong> Explore the multi-tier knowledge structure of subjects, modules, lessons, concepts, and prerequisite dependencies.
          </p>
        </div>

        {/* Quick Subject Switcher & Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              if (selectedNode?.conceptId) {
                setTargetConceptId(selectedNode.conceptId);
              }
              setActiveView('student_roadmap');
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Open Personalized Roadmap →
          </button>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Select Subject:
            </label>
            <select
              value={activeDomainId}
              onChange={(e) => setActiveDomainId(e.target.value as DomainId)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Metrics summary pill */}
          {mindMapData?.summary && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Mastered:</span>
                <span className="font-extrabold text-emerald-600 font-mono">
                  {mindMapData.summary.masteredCount}/{mindMapData.summary.conceptsCount}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px]">Gaps:</span>
                <span className={`font-extrabold font-mono ${mindMapData.summary.gapsCount > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                  {mindMapData.summary.gapsCount}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FILTER & CONTROL BAR (PART 14, 15, 16) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mr-1 hidden sm:inline">
            View:
          </span>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Full Syllabus
          </button>
          <button
            onClick={() => setViewMode('modules')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'modules'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Modules
          </button>
          <button
            onClick={() => setViewMode('concepts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'concepts'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Concepts
          </button>
          <button
            onClick={() => setViewMode('prerequisites')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'prerequisites'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Prerequisites
          </button>
          <button
            onClick={() => setViewMode('focus')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'focus'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            My Progress Focus
          </button>
        </div>

        {/* Right: Search & Status Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Concepts</option>
              <option value="mastered">✓ Mastered (≥75%)</option>
              <option value="in_progress">◐ In Progress</option>
              <option value="not_started">○ Not Started</option>
              <option value="gaps">⚠ Knowledge Gaps</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts, modules..."
              className="pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl w-44 sm:w-56 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Notification Banner if any */}
      {aiMessage && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center justify-between animate-in fade-in duration-200">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            <span>{aiMessage}</span>
          </span>
          <button onClick={() => setAiMessage(null)} className="text-purple-500 hover:text-purple-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MAIN CANVAS + DETAILS PANEL LAYOUT */}
      {loading ? (
        <div className="w-full h-[600px] bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 font-semibold text-xs animate-pulse">
          Building Interactive Mind Map from authoritative syllabus...
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-sm font-bold text-rose-900">Failed to render Mind Map</h3>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={loadMindMap}
            className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : mindMapData ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Canvas View */}
          <div className={`${isDetailsOpen ? 'lg:col-span-8' : 'lg:col-span-12'} transition-all duration-300`}>
            <MindMapCanvas
              data={mindMapData}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              viewMode={viewMode}
              statusFilter={statusFilter}
              searchQuery={searchQuery}
              onDiscoverAiConnections={handleDiscoverAi}
              discoveringAi={discoveringAi}
            />
          </div>

          {/* Right Details Panel View */}
          {isDetailsOpen && (
            <div className="lg:col-span-4 sticky top-4">
              <MindMapDetailsPanel
                node={selectedNode}
                onClose={() => setIsDetailsOpen(false)}
                onNavigateToLesson={handleNavigateToLesson}
                onOpenSummaryNotes={handleOpenSummaryNotes}
                onOpenTutor={handleOpenTutor}
                onSelectNodeById={(id) => {
                  const target = mindMapData.nodes.find((n) => n.id === id);
                  if (target) handleSelectNode(target);
                }}
                onOpenInRoadmap={(conceptId) => {
                  setTargetConceptId(conceptId);
                  setActiveView('student_roadmap');
                }}
              />
            </div>
          )}
        </div>
      ) : null}

      {/* Summary Notes Modal (Phase 1 Reuse) */}
      {activeConceptForNotes && (
        <SummaryNotesModal
          isOpen={isNotesModalOpen}
          onClose={() => setIsNotesModalOpen(false)}
          concept={activeConceptForNotes}
          summaryNotes={activeSummaryNotes}
          onSummaryGenerated={(newSummary) => {
            setActiveSummaryNotes(newSummary);
            loadMindMap();
          }}
          onAskTutorAboutNote={(_topic) => {
            setIsNotesModalOpen(false);
            if (activeConceptForNotes) {
              handleOpenTutor(activeConceptForNotes.id);
            }
          }}
        />
      )}

      {/* AI Tutor Slide-over Drawer (Phase 1 Reuse) */}
      {isTutorDrawerOpen && activeConceptForTutor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-4 flex flex-col space-y-3 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    AI Academic Tutor
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Context: {activeConceptForTutor.name} ({activeConceptForTutor.code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTutorDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TutorChat
                concept={activeConceptForTutor}
                currentLearner={currentLearner}
                summaryNotes={activeSummaryNotes}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
