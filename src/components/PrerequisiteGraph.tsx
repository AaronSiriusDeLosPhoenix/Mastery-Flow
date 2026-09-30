import React, { useState } from 'react';
import { Concept, ConceptMastery } from '../types.js';
import { CheckCircle2, Lock, AlertTriangle, Clock, BookOpen, Sparkles } from 'lucide-react';

interface NodeLayout {
  id: string;
  x: number;
  y: number;
}

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  arrays: { x: 200, y: 70 },
  recursion: { x: 620, y: 70 },
  linked_lists: { x: 80, y: 190 },
  stacks: { x: 190, y: 190 },
  queues: { x: 300, y: 190 },
  searching_sorting: { x: 420, y: 190 },
  trees: { x: 620, y: 190 },
  hashing: { x: 420, y: 310 },
  bst: { x: 550, y: 310 },
  graphs: { x: 690, y: 310 },
};

interface PrerequisiteGraphProps {
  concepts: Concept[];
  conceptMasteries: Record<string, ConceptMastery>;
  onSelectConcept?: (conceptId: string) => void;
  selectedConceptId?: string;
}

export const PrerequisiteGraph: React.FC<PrerequisiteGraphProps> = ({
  concepts,
  conceptMasteries,
  onSelectConcept,
  selectedConceptId,
}) => {
  const [hoveredConcept, setHoveredConcept] = useState<string | null>(null);

  const getNodeState = (c: Concept) => {
    const cm = conceptMasteries[c.id];
    if (!cm || cm.attemptsCount === 0) {
      // Check if prerequisites are satisfied
      const prereqsMet = c.prerequisites.every((pId) => {
        const pCm = conceptMasteries[pId];
        return pCm && pCm.mastery >= 0.70;
      });
      return prereqsMet ? 'ready' : 'blocked';
    }

    if (cm.status === 'review_needed' || (cm.mastery >= 0.75 && cm.retention < 0.65)) {
      return 'review_needed';
    }
    if (cm.mastery >= 0.75) return 'mastered';
    if (cm.mastery >= 0.50) return 'developing';
    return 'struggling';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
      
      {/* Header and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <span>Knowledge Dependency DAG</span>
            <span className="text-xs font-normal text-slate-400 font-mono">
              [Direct Acyclic Graph]
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Prerequisites dictate cognitive unlocking thresholds (≥ 70%).
          </p>
        </div>

        {/* Clean Unboxed Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-slate-700">Mastered (≥75%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-slate-700">In Progress</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-700">Review Due</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="text-slate-400">Locked Prereq</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto">
        <svg viewBox="0 0 780 370" className="w-full min-w-[700px] h-[370px] select-none">
          
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>

          {/* Render Prerequisite Dependency Edges */}
          {concepts.map((c) => {
            const targetPos = NODE_POSITIONS[c.id];
            if (!targetPos) return null;

            return c.prerequisites.map((pId) => {
              const srcPos = NODE_POSITIONS[pId];
              if (!srcPos) return null;

              const isHighlighted = hoveredConcept === c.id || hoveredConcept === pId;

              // Quadratic bezier curve for smooth organic arrows
              const midY = (srcPos.y + targetPos.y) / 2;
              const pathD = `M ${srcPos.x} ${srcPos.y + 22} C ${srcPos.x} ${midY}, ${targetPos.x} ${midY}, ${targetPos.x} ${targetPos.y - 22}`;

              return (
                <path
                  key={`${pId}->${c.id}`}
                  d={pathD}
                  fill="none"
                  stroke={isHighlighted ? '#3b82f6' : '#cbd5e1'}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  strokeDasharray={isHighlighted ? 'none' : '4 3'}
                  markerEnd={isHighlighted ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                  className="transition-all duration-300"
                />
              );
            });
          })}

          {/* Render Nodes */}
          {concepts.map((c) => {
            const pos = NODE_POSITIONS[c.id];
            if (!pos) return null;

            const state = getNodeState(c);
            const cm = conceptMasteries[c.id];
            const isSelected = selectedConceptId === c.id;
            const isHovered = hoveredConcept === c.id;

            let strokeColor = '#cbd5e1';
            let fillColor = '#ffffff';
            let textColor = '#334155';
            let badgeBg = '#f1f5f9';

            if (state === 'mastered') {
              strokeColor = '#10b981';
              fillColor = '#ecfdf5';
              textColor = '#065f46';
              badgeBg = '#d1fae5';
            } else if (state === 'developing') {
              strokeColor = '#3b82f6';
              fillColor = '#eff6ff';
              textColor = '#1e40af';
              badgeBg = '#dbeafe';
            } else if (state === 'review_needed') {
              strokeColor = '#f59e0b';
              fillColor = '#fffbeb';
              textColor = '#92400e';
              badgeBg = '#fef3c7';
            } else if (state === 'struggling') {
              strokeColor = '#ef4444';
              fillColor = '#fef2f2';
              textColor = '#991b1b';
              badgeBg = '#fee2e2';
            } else if (state === 'blocked') {
              strokeColor = '#e2e8f0';
              fillColor = '#f8fafc';
              textColor = '#94a3b8';
              badgeBg = '#f1f5f9';
            }

            return (
              <g
                key={c.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer transition-transform duration-200"
                onMouseEnter={() => setHoveredConcept(c.id)}
                onMouseLeave={() => setHoveredConcept(null)}
                onClick={() => onSelectConcept && onSelectConcept(c.id)}
              >
                {/* Outer shadow card */}
                <rect
                  x="-75"
                  y="-26"
                  width="150"
                  height="52"
                  rx="12"
                  fill={fillColor}
                  stroke={isSelected ? '#2563eb' : strokeColor}
                  strokeWidth={isSelected ? 3 : 1.8}
                  className="filter drop-shadow-xs transition-colors"
                />

                {/* Concept Code Badge */}
                <rect x="-65" y="-18" width="46" height="15" rx="4" fill={badgeBg} />
                <text
                  x="-42"
                  y="-8"
                  textAnchor="middle"
                  className="text-[9px] font-bold fill-slate-600"
                >
                  {c.code}
                </text>

                {/* Concept Title */}
                <text
                  x="-65"
                  y="12"
                  textAnchor="start"
                  className="text-[11px] font-bold"
                  fill={textColor}
                >
                  {c.name.length > 18 ? c.name.substring(0, 16) + '..' : c.name}
                </text>

                {/* Mastery Percentage or Lock Icon */}
                {state === 'blocked' ? (
                  <g transform="translate(48, -4)">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </g>
                ) : (
                  <text
                    x="56"
                    y="12"
                    textAnchor="end"
                    className="text-[11px] font-extrabold"
                    fill={textColor}
                  >
                    {cm ? `${(cm.mastery * 100).toFixed(0)}%` : '0%'}
                  </text>
                )}

                {/* Review Needed Pulse dot */}
                {state === 'review_needed' && (
                  <circle cx="65" cy="-18" r="4" fill="#f59e0b" className="animate-ping" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 text-[11px] text-slate-400 text-center">
        Tip: Hover over any node to highlight direct prerequisite pipelines. Click any concept to launch targeted practice.
      </div>
    </div>
  );
};
