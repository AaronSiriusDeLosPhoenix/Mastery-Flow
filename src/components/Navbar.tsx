import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Menu,
  ChevronDown,
  Layers,
  Search,
  Check,
} from 'lucide-react';
import { ProfileDropdown } from './ProfileDropdown.js';
import { DomainId } from '../types.js';

export const Navbar: React.FC = () => {
  const {
    currentLearner,
    currentUser,
    domains,
    activeDomainId,
    setActiveDomainId,
    toggleSidebar,
    setIsSuperSearchOpen,
    currentRole,
    setCurrentRole,
    activeView,
    setActiveView,
  } = useApp();

  const viewTitles: Record<string, string> = {
    student_dashboard: 'Learner Dashboard',
    student_modules: 'Modules & Lessons',
    student_mindmap: 'Interactive Mind Map',
    student_flashcards: 'Adaptive Flashcards',
    student_mock_exam: 'Adaptive Mock Exam',
    student_concepts: 'Concept Graph (DAG)',
    student_learn: 'Practice & Feedback',
    student_diagnostic: 'Diagnostic Test',
    teacher_dashboard: 'Cohort Overview',
    teacher_student_detail: 'Student Inspection',
    teacher_approval: 'Approval & QA Lab',
    database_explorer: 'Database Explorer',
    simulation: 'Two-Learner Simulation',
    evaluation: 'Stress-Test Center',
    settings: 'Settings & Preferences',
  };

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isTrackDropdownOpen, setIsTrackDropdownOpen] = useState(false);
  const trackDropdownRef = useRef<HTMLDivElement>(null);

  // Close track dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (trackDropdownRef.current && !trackDropdownRef.current.contains(e.target as Node)) {
        setIsTrackDropdownOpen(false);
      }
    };
    if (isTrackDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTrackDropdownOpen]);

  // Current domain / track label (e.g. "JEE Track" or "GATE Track")
  const activeDomain = domains.find((d) => d.id === (currentLearner?.activeDomainId || activeDomainId));
  const trackLabel = activeDomain?.shortLabel?.includes('GATE')
    ? 'GATE Track'
    : activeDomain?.shortLabel?.includes('UPSC')
    ? 'UPSC Track'
    : activeDomain?.shortLabel?.includes('JEE')
    ? 'JEE Track'
    : 'JEE Track';

  // Circular avatar initials (AS or current user initials)
  const initials = currentLearner?.name
    ? currentLearner.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AS';

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
        {/* Left: On Mobile, Menu Button & Pure Logo Icon (no text). On Desktop, View Title */}
        <div className="flex items-center space-x-3">
          {/* Mobile Menu & Logo */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Toggle Menu (☰)"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>

            <div
              className="flex items-center cursor-pointer select-none"
              onClick={() => setActiveView(currentRole === 'STUDENT' ? 'student_dashboard' : 'teacher_dashboard')}
              title="Dashboard"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
                <Layers className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Desktop Active View Title */}
          <div className="hidden md:flex items-center space-x-2.5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              {viewTitles[activeView] || 'Learner Dashboard'}
            </h2>
          </div>
        </div>

        {/* Center: Clean Role Switch (Student / Faculty) */}
        <div className="hidden md:flex items-center space-x-2">
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setCurrentRole('STUDENT');
                setActiveView('student_dashboard');
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                currentRole === 'STUDENT'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => {
                setCurrentRole('TEACHER');
                setActiveView('teacher_dashboard');
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                currentRole === 'TEACHER'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Faculty
            </button>
          </div>
        </div>

        {/* Right: Clean Top-Right Corner (Track Selector + Clean Search Icon + Profile Avatar AS) */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* Track Selector Dropdown: "JEE Track ▾" */}
          <div className="relative" ref={trackDropdownRef}>
            <button
              onClick={() => setIsTrackDropdownOpen(!isTrackDropdownOpen)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              title="Curriculum Track"
            >
              <span>{trackLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {/* Track Switcher Popover */}
            {isTrackDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 block">
                  Switch Curriculum Track
                </span>
                <div className="space-y-0.5">
                  {[
                    { id: 'school_stem', name: 'JEE Track (Advanced)' },
                    { id: 'gate_cs', name: 'GATE Track (CS/IT)' },
                    { id: 'upsc_civil', name: 'UPSC Track (Civil Services)' },
                    { id: 'cs_foundations', name: 'Engineering Track (CS Core)' },
                  ].map((track) => {
                    const isSelected = (activeDomain?.id || 'school_stem') === track.id;
                    return (
                      <button
                        key={track.id}
                        onClick={() => {
                          setActiveDomainId(track.id as DomainId);
                          setIsTrackDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{track.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Clean Search Icon Button outside near the profile icon (clean magnifying glass, no watermark) */}
          <button
            onClick={() => setIsSuperSearchOpen(true)}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Search"
          >
            <Search className="w-4.5 h-4.5 text-slate-700" />
          </button>

          {/* Clean Circular Avatar Button: circle with initials "AS" */}
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="w-9 h-9 rounded-full bg-[#1b1c21] hover:bg-[#25272e] text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-900/10 hover:ring-slate-900/30 transition-all cursor-pointer shadow-xs"
              title="Account Menu"
            >
              {initials}
            </button>

            {/* Profile Dropdown */}
            <ProfileDropdown
              isOpen={isProfileDropdownOpen}
              onClose={() => setIsProfileDropdownOpen(false)}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
