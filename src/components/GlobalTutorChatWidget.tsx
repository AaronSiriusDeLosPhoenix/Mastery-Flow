import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { TutorChat } from './TutorChat.js';
import {
  Bot,
  X,
  Minimize2,
  Sparkles,
  BookOpen,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import { Concept } from '../types.js';

export const GlobalTutorChatWidget: React.FC = () => {
  const {
    isGlobalChatOpen,
    setIsGlobalChatOpen,
    currentLearner,
    concepts,
    targetConceptId,
    setTargetConceptId,
    activeView,
  } = useApp();

  // If the user is already on student_learn, the chat bot is already natively embedded on that page
  // But having the floating toggle makes it universally accessible everywhere
  const [selectedConceptId, setSelectedConceptId] = useState<string>('');

  useEffect(() => {
    if (targetConceptId && concepts.some((c) => c.id === targetConceptId)) {
      setSelectedConceptId(targetConceptId);
    } else if (currentLearner?.currentRecommendation?.conceptId) {
      setSelectedConceptId(currentLearner.currentRecommendation.conceptId);
    } else if (concepts.length > 0) {
      setSelectedConceptId(concepts[0].id);
    }
  }, [targetConceptId, currentLearner?.currentRecommendation?.conceptId, concepts]);

  const activeConcept = concepts.find((c) => c.id === selectedConceptId) || concepts[0];

  return (
    <>
      {/* Floating launcher trigger (when closed) */}
      {!isGlobalChatOpen && (
        <button
          onClick={() => setIsGlobalChatOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center space-x-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group border border-white/20"
          title="Chat with AI Socratic Tutor"
          aria-label="Open AI Socratic Tutor Chat"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-indigo-700 animate-pulse" />
          </div>
          <span className="text-xs font-bold tracking-wide">Ask AI Tutor</span>
          <Sparkles className="w-3.5 h-3.5 text-indigo-200 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Floating Chat Window (when open) */}
      {isGlobalChatOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[480px] h-[640px] max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white px-5 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs font-bold tracking-tight">AI Socratic Tutor</h3>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/20 text-white">
                    Gemini Live
                  </span>
                </div>
                <p className="text-[10px] text-indigo-100 truncate">
                  Personalized 1:1 guidance & conceptual mastery
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsGlobalChatOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                title="Minimize Tutor Chat"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsGlobalChatOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                title="Close Tutor Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Concept Topic Selector Bar */}
          {concepts.length > 0 && (
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center space-x-1">
                <BookOpen className="w-3 h-3 text-indigo-600" />
                <span>Topic:</span>
              </span>
              <div className="relative flex-1">
                <select
                  value={activeConcept?.id || ''}
                  onChange={(e) => {
                    setSelectedConceptId(e.target.value);
                    setTargetConceptId(e.target.value);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 pr-7 appearance-none cursor-pointer focus:ring-1 focus:ring-indigo-500 truncate"
                >
                  {concepts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.bloomTarget || 'Understand'})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Embedded Chat Body */}
          <div className="flex-1 overflow-hidden bg-slate-50">
            {activeConcept ? (
              <TutorChat
                concept={activeConcept}
                currentLearner={currentLearner}
                isCompact={true}
              />
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Please select a curriculum track to begin chatting with the AI Tutor.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
