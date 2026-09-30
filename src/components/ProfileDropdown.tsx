import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  User,
  Sliders,
  Users,
  LogOut,
  ChevronRight,
  Check,
  Plus,
  Eye,
  Type,
} from 'lucide-react';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ isOpen, onClose }) => {
  const {
    currentLearner,
    currentUser,
    allLearners,
    setActiveStudentId,
    activeStudentId,
    setIsProfileModalOpen,
    openSettingsWithTab,
    logout,
    setIsAuthModalOpen,
    setAuthModalTab,
    dyslexiaMode,
    setDyslexiaMode,
    bionicReading,
    setBionicReading,
  } = useApp();

  const [showSwitchSubmenu, setShowSwitchSubmenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
        setShowSwitchSubmenu(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const initials = currentLearner?.name
    ? currentLearner.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AS';

  const displayName = currentLearner?.name || currentUser?.name || 'Aarav Patel';
  const displayEmail = currentLearner?.email || currentUser?.email || 'aarav.patel@masteryflow.ai';

  const handleProfileClick = () => {
    onClose();
    openSettingsWithTab('general');
  };

  const handleSettingsClick = () => {
    onClose();
    openSettingsWithTab('security');
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-64 bg-[#16171b] text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50 p-2 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Top User Header Card matching Image 1 */}
      <div className="p-2.5 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-[#2a2c32] border border-white/10 flex items-center justify-center font-bold text-sm text-white shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
            {displayName}
          </h4>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {displayEmail}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10 my-1.5" />

      {/* Primary Actions matching Image 1 */}
      <div className="space-y-0.5 text-xs">
        {/* Profile */}
        <button
          onClick={handleProfileClick}
          className="w-full px-3 py-2 rounded-xl hover:bg-white/5 text-slate-200 hover:text-white transition-colors flex items-center space-x-3 cursor-pointer"
        >
          <User className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="font-medium">Profile</span>
        </button>

        {/* Settings */}
        <button
          onClick={handleSettingsClick}
          className="w-full px-3 py-2 rounded-xl hover:bg-white/5 text-slate-200 hover:text-white transition-colors flex items-center space-x-3 cursor-pointer"
        >
          <Sliders className="w-4 h-4 text-slate-300 shrink-0" />
          <span className="font-medium">Settings</span>
        </button>

        {/* Switch account */}
        <div className="relative">
          <button
            onClick={() => setShowSwitchSubmenu(!showSwitchSubmenu)}
            className="w-full px-3 py-2 rounded-xl hover:bg-white/5 text-slate-200 hover:text-white transition-colors flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">Switch account</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          {/* Submenu for Account Switching */}
          {showSwitchSubmenu && (
            <div className="mt-1 p-1 bg-[#1f2127] rounded-xl border border-white/10 space-y-1">
              {allLearners.map((learner) => {
                const isSelected = learner.id === activeStudentId;
                const lInitials = learner.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <button
                    key={learner.id}
                    onClick={() => {
                      setActiveStudentId(learner.id);
                      setShowSwitchSubmenu(false);
                      onClose();
                    }}
                    className={`w-full p-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isSelected ? 'bg-white/10 text-white font-bold' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
                        {lInitials}
                      </span>
                      <span className="truncate">{learner.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  onClose();
                  setIsAuthModalOpen(true);
                  setAuthModalTab('signin');
                }}
                className="w-full text-left px-2 py-1 text-[11px] text-sky-400 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add new student / account</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Accessibility Section */}
        <div className="px-3 py-2 bg-white/5 rounded-xl space-y-2 text-xs mt-1.5 border border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Accessibility & Reading
          </span>
          <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer select-none">
            <span className="flex items-center space-x-2 text-[11px]">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dyslexia Font</span>
            </span>
            <input
              type="checkbox"
              checked={dyslexiaMode}
              onChange={(e) => setDyslexiaMode(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-500 cursor-pointer accent-indigo-500"
            />
          </label>
          <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer select-none">
            <span className="flex items-center space-x-2 text-[11px]">
              <Type className="w-3.5 h-3.5 text-purple-400" />
              <span>Bionic Reading</span>
            </span>
            <input
              type="checkbox"
              checked={bionicReading}
              onChange={(e) => setBionicReading(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-500 cursor-pointer accent-indigo-500"
            />
          </label>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10 my-1.5" />

      {/* Logout matching Image 1 */}
      <div>
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors flex items-center space-x-3 cursor-pointer text-xs font-medium"
        >
          <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
};
