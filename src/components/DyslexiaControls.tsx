import React from 'react';
import { useApp } from '../context/AppContext.js';
import { Eye, BookOpen, Globe, Building2, Sliders, Type, Check } from 'lucide-react';
import { LanguageCode, ReadingLevel } from '../types.js';

export const DyslexiaControls: React.FC = () => {
  const {
    dyslexiaMode,
    setDyslexiaMode,
    bionicReading,
    setBionicReading,
    readingLevel,
    setReadingLevel,
    language,
    setLanguage,
    institutions,
    activeInstitutionId,
    setActiveInstitutionId,
  } = useApp();

  const readingLevels: { id: ReadingLevel; label: string; desc: string }[] = [
    { id: 'middle_school', label: 'Middle School', desc: 'Vivid physical analogies' },
    { id: 'high_school', label: 'High School', desc: 'Step-by-step visual foundation' },
    { id: 'undergraduate', label: 'Undergraduate CS', desc: 'Formal Big-O & invariants' },
    { id: 'executive', label: 'Systems & Executive', desc: 'CPU cache line & scalability' },
  ];

  const languages: { id: LanguageCode; label: string }[] = [
    { id: 'en', label: 'English' },
    { id: 'es', label: 'Español' },
    { id: 'hi', label: 'हिन्दी (Hindi)' },
    { id: 'ta', label: 'தமிழ் (Tamil)' },
    { id: 'te', label: 'తెలుగు (Telugu)' },
    { id: 'fr', label: 'Français' },
    { id: 'de', label: 'Deutsch' },
    { id: 'zh', label: '中文 (Mandarin)' },
  ];

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Dyslexia Mode Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={dyslexiaMode}
            onChange={(e) => setDyslexiaMode(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
          />
          <span className="font-semibold text-slate-700 flex items-center gap-1.5 group-hover:text-indigo-600">
            <Eye className="w-3.5 h-3.5 text-indigo-500" />
            Dyslexia-Friendly Mode
          </span>
        </label>

        {/* Bionic Reading Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={bionicReading}
            onChange={(e) => setBionicReading(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
          />
          <span className="font-semibold text-slate-700 flex items-center gap-1.5 group-hover:text-indigo-600">
            <Type className="w-3.5 h-3.5 text-purple-500" />
            Bionic Reading
          </span>
        </label>

        {/* Reading Level Selector */}
        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium">Reading Level:</span>
          <select
            value={readingLevel}
            onChange={(e) => setReadingLevel(e.target.value as ReadingLevel)}
            className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {readingLevels.map((lvl) => (
              <option key={lvl.id} value={lvl.id}>
                {lvl.label} ({lvl.desc})
              </option>
            ))}
          </select>
        </div>

        {/* Multilingual Selector */}
        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium">Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Institution Style Guide Selector */}
      <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
        <Building2 className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-500 font-medium">Style Guide:</span>
        <select
          value={activeInstitutionId}
          onChange={(e) => setActiveInstitutionId(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-semibold text-indigo-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          {institutions.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.shortCode} — {inst.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
