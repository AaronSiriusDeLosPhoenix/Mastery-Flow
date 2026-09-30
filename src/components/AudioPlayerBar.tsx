import React from 'react';
import { useApp } from '../context/AppContext.js';
import { Volume2, VolumeX, Square, Play, Sparkles, AudioLines } from 'lucide-react';

export const AudioPlayerBar: React.FC = () => {
  const { isAudioPlaying, activeSpokenText, stopAudio, language } = useApp();

  if (!isAudioPlaying || !activeSpokenText) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md border border-indigo-500/30 text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30 animate-pulse">
            <AudioLines className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Audio-Ready Narrator
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                {language.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate max-w-sm mt-0.5">
              {activeSpokenText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={stopAudio}
            className="p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Stop audio playback"
          >
            <Square className="w-4 h-4 fill-rose-300" />
            <span>Stop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
