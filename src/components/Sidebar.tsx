import React from 'react';
import { useApp } from '../context/AppContext.js';
import {
  LayoutDashboard,
  GitFork,
  ClipboardCheck,
  BookOpen,
  Users,
  GitCompare,
  FlaskConical,
  Database,
  FileCheck,
  Layers,
  Network,
  Brain,
  GraduationCap,
  Bot,
  FileText,
  X,
  Award,
  Sliders,
  Landmark,
  Compass,
} from 'lucide-react';
import { AppView } from '../types.js';

interface NavItem {
  id: AppView;
  label: string;
  icon: React.ElementType;
  metaText?: string;
  category: 'student' | 'teacher' | 'system';
}

export const Sidebar: React.FC = () => {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    currentRole,
    activeView,
    setActiveView,
    currentLearner,
    setIsGlobalChatOpen,
    setIsProgressReportModalOpen,
  } = useApp();

  const navItems: NavItem[] = [
    // Student links
    { id: 'student_dashboard', label: 'Learner Dashboard', icon: LayoutDashboard, category: 'student' },
    {
      id: 'student_roadmap',
      label: 'Personalized Roadmap',
      icon: Compass,
      metaText: 'Next',
      category: 'student',
    },
    { id: 'student_mindmap', label: 'Interactive Mind Map', icon: Network, metaText: 'DAG', category: 'student' },
    { id: 'student_modules', label: 'Modules & Lessons', icon: Layers, category: 'student' },
    { id: 'student_learn', label: 'Practice & Feedback', icon: BookOpen, category: 'student' },
    { id: 'student_flashcards', label: 'Adaptive Flashcards', icon: Brain, metaText: 'Recall', category: 'student' },
    { id: 'student_mock_exam', label: 'Adaptive Mock Exam', icon: GraduationCap, metaText: 'Exam', category: 'student' },
    { id: 'student_concepts', label: 'Concept Graph (DAG)', icon: GitFork, category: 'student' },
    {
      id: 'student_govt_benefits',
      label: 'Govt Benefits & Hub',
      icon: Landmark,
      metaText: 'NSP',
      category: 'student',
    },
    {
      id: 'student_diagnostic',
      label: 'Diagnostic Test',
      icon: ClipboardCheck,
      metaText: currentLearner?.diagnosticCompleted ? 'Passed' : 'Pending',
      category: 'student',
    },

    // Teacher links
    { id: 'teacher_dashboard', label: 'Cohort Overview', icon: Users, category: 'teacher' },
    { id: 'teacher_student_detail', label: 'Student Inspection', icon: Award, category: 'teacher' },
    {
      id: 'teacher_approval',
      label: 'Approval & QA Lab',
      icon: FileCheck,
      metaText: 'AI QA',
      category: 'teacher',
    },

    // Database & Innovations
    {
      id: 'evaluation',
      label: 'ML & Audit Lab',
      icon: FlaskConical,
      metaText: 'ML / BKT',
      category: 'system',
    },
    { id: 'simulation', label: 'Two-Learner Sim', icon: GitCompare, metaText: 'Sim', category: 'system' },
    {
      id: 'database_explorer',
      label: 'Database Explorer',
      icon: Database,
      metaText: '9 Entities',
      category: 'system',
    },
  ];

  const visibleItems = navItems.filter((item) => {
    if (item.category === 'system') return true;
    if (currentRole === 'STUDENT' && item.category === 'student') return true;
    if (currentRole === 'TEACHER' && item.category === 'teacher') return true;
    return false;
  });

  const handleSelectView = (id: AppView) => {
    setActiveView(id);
    setIsSidebarOpen(false);
  };

  const renderSidebarContent = (isMobile: boolean = false) => (
    <div className="flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Top: Just the Logo icon (no text "MasteryFlow" near the logo) */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div
            onClick={() => handleSelectView(currentRole === 'STUDENT' ? 'student_dashboard' : 'teacher_dashboard')}
            className="cursor-pointer select-none"
            title="Dashboard"
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xs hover:bg-slate-800 transition">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
          </div>

          {isMobile && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Directly UNDER the Logo: The Navigation Menu */}
        <div className="space-y-0.5">
          {visibleItems
            .filter((item) => item.category !== 'system')
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.metaText && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 font-bold'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.metaText}
                    </span>
                  )}
                </button>
              );
            })}

          {/* Quick Action Utilities: Ask AI Tutor & Progress Report */}
          <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
            <button
              onClick={() => {
                if (isMobile) setIsSidebarOpen(false);
                setIsGlobalChatOpen(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 transition-colors cursor-pointer group border border-blue-100"
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Bot className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate">Ask AI Tutor</span>
              </div>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-200/60 text-blue-800 font-bold">
                CHAT
              </span>
            </button>

            <button
              onClick={() => {
                if (isMobile) setIsSidebarOpen(false);
                setIsProgressReportModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50/70 hover:bg-amber-100/70 text-amber-900 transition-colors cursor-pointer group border border-amber-100"
            >
              <div className="flex items-center space-x-2.5 truncate">
                <FileText className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate">Progress Report</span>
              </div>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-800 font-bold">
                PDF
              </span>
            </button>
          </div>
        </div>

        {/* Database & Innovations section */}
        <div className="space-y-0.5 pt-2 border-t border-slate-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1.5">
            DATABASE & INNOVATIONS
          </div>
          {visibleItems
            .filter((item) => item.category === 'system')
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.metaText && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 font-bold'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.metaText}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Settings shortcut & Footer */}
      <div className="pt-3 border-t border-slate-100 space-y-1">
        <button
          onClick={() => handleSelectView('settings')}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
            activeView === 'settings'
              ? 'bg-blue-50 text-blue-700 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders className={`w-4 h-4 shrink-0 ${activeView === 'settings' ? 'text-blue-600' : 'text-slate-400'}`} />
          <span>Settings</span>
        </button>
        <div className="pt-1.5 text-[10px] text-slate-400 flex items-center justify-between px-2">
          <span>v2.6</span>
          <span className="text-emerald-600 font-bold">● Active Engine</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar: Always visible on desktop with logo on top and menu under it */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/90 h-screen sticky top-0 shrink-0 p-4 overflow-y-auto z-20 select-none">
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Mobile Drawer: Opens on mobile when toggled */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-150"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside className="relative z-50 w-72 bg-white border-r border-slate-200 shadow-2xl flex flex-col justify-between p-4 overflow-y-auto animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
