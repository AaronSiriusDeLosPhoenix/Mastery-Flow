import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { PrerequisiteGraph } from '../components/PrerequisiteGraph.js';
import { ConceptCard } from '../components/ConceptCard.js';
import { GitFork, Layers, ShieldCheck, Brain, ArrowRight } from 'lucide-react';

export const StudentConcepts: React.FC = () => {
  const { concepts, currentLearner, setActiveView, setTargetConceptId } = useApp();
  const [selectedConceptId, setSelectedConceptId] = useState<string>('trees');

  if (!currentLearner) return null;

  const handlePractice = (conceptId: string) => {
    setTargetConceptId(conceptId);
    setActiveView('student_learn');
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              Curriculum Architecture
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {concepts.length} Foundational Units
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Concept Dependency Graph
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Prerequisite relationships are enforced by the engine to prevent ungrounded progression.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 text-xs flex-wrap">
          <button
            onClick={() => setActiveView('student_mindmap')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Interactive Mind Map</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold">
            Prereq Threshold: ≥ 70%
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
            Mastery Threshold: ≥ 75%
          </span>
        </div>
      </div>

      {/* Interactive SVG Prerequisite Graph */}
      <PrerequisiteGraph
        concepts={concepts}
        conceptMasteries={currentLearner.conceptMasteries}
        selectedConceptId={selectedConceptId}
        onSelectConcept={(id) => {
          setSelectedConceptId(id);
          handlePractice(id);
        }}
      />

      {/* Grid of all concepts */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3">All Concepts & Prerequisites</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {concepts.map((c) => {
            const mastery = currentLearner.conceptMasteries[c.id];
            const prereqsMet = c.prerequisites.every((pId) => {
              const pMastery = currentLearner.conceptMasteries[pId];
              return pMastery && pMastery.mastery >= 0.70;
            });

            return (
              <ConceptCard
                key={c.id}
                concept={c}
                mastery={mastery}
                prerequisitesMet={prereqsMet}
                onPractice={handlePractice}
              />
            );
          })}
        </div>
      </div>

    </div>
  );
};
