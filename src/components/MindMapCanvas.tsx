import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MindMapData,
  MindMapNode,
  MindMapEdge,
  MindMapNodeType,
  ConceptMasteryCategory,
} from '../types.js';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Plus,
  Minus,
  Brain,
  Layers,
  BookOpen,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface MindMapCanvasProps {
  data: MindMapData;
  selectedNodeId: string | null;
  onSelectNode: (node: MindMapNode) => void;
  viewMode: 'all' | 'modules' | 'concepts' | 'prerequisites' | 'focus';
  statusFilter: string;
  searchQuery: string;
  onDiscoverAiConnections: () => void;
  discoveringAi: boolean;
}

interface NodePosition {
  node: MindMapNode;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  data,
  selectedNodeId,
  onSelectNode,
  viewMode,
  statusFilter,
  searchQuery,
  onDiscoverAiConnections,
  discoveringAi,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 30, y: 60 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Node expand / collapse state
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const toggleCollapse = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Check if a node is hidden because an ancestor is collapsed
  const isAncestorCollapsed = (node: MindMapNode, nodeMap: Map<string, MindMapNode>): boolean => {
    let curr = node;
    while (curr.parentId) {
      if (collapsedNodes.has(curr.parentId)) return true;
      const parent = nodeMap.get(curr.parentId);
      if (!parent) break;
      curr = parent;
    }
    return false;
  };

  // Layout calculation
  const { layoutNodes, layoutEdges, bounds } = useMemo(() => {
    const nodeMap = new Map<string, MindMapNode>(data.nodes.map((n) => [n.id, n]));

    // Hierarchy grouping
    const subjectNode = data.nodes.find((n) => n.type === 'subject') || data.nodes[0];
    const moduleNodes = data.nodes.filter((n) => n.type === 'module');
    const lessonNodes = data.nodes.filter((n) => n.type === 'lesson');
    const conceptNodes = data.nodes.filter((n) => n.type === 'concept');
    const subConceptNodes = data.nodes.filter((n) => n.type === 'subconcept');

    const positions = new Map<string, NodePosition>();

    // Dynamic horizontal spacing by level
    const X_SUBJECT = 40;
    const X_MODULE = 340;
    const X_LESSON = 680;
    const X_CONCEPT = 1040;
    const X_SUBCONCEPT = 1420;

    let runningY = 40;

    // Track visible nodes based on viewMode and collapsed state
    moduleNodes.forEach((mod) => {
      const modLessons = lessonNodes.filter((l) => l.moduleId === mod.id);
      const modStartY = runningY;

      modLessons.forEach((les) => {
        const lesConcepts = conceptNodes.filter((c) => c.lessonId === les.id);
        const lesStartY = runningY;

        lesConcepts.forEach((con) => {
          const conSubs = subConceptNodes.filter((s) => s.conceptId === con.id);
          const conStartY = runningY;

          // Position sub-concepts
          const showSubs = viewMode === 'all' && !collapsedNodes.has(con.id) && !isAncestorCollapsed(con, nodeMap);
          if (showSubs && conSubs.length > 0) {
            conSubs.forEach((sub, sIdx) => {
              positions.set(sub.id, {
                node: sub,
                x: X_SUBCONCEPT,
                y: runningY,
                width: 200,
                height: 38,
                visible: true,
              });
              runningY += 46;
            });
          }

          // Position Concept
          const conceptY = showSubs && conSubs.length > 0 ? (conStartY + runningY - 46) / 2 : runningY;
          const showConcept = viewMode !== 'modules' && !isAncestorCollapsed(con, nodeMap);
          positions.set(con.id, {
            node: con,
            x: X_CONCEPT,
            y: conceptY,
            width: 260,
            height: 84,
            visible: showConcept,
          });

          if (!showSubs || conSubs.length === 0) {
            runningY += 96;
          } else {
            runningY += 16;
          }
        });

        // Position Lesson
        const showLesson = viewMode !== 'modules' && !isAncestorCollapsed(les, nodeMap);
        const lessonY = lesConcepts.length > 0 ? (lesStartY + runningY - 96) / 2 : runningY;
        positions.set(les.id, {
          node: les,
          x: X_LESSON,
          y: Math.max(lesStartY, lessonY),
          width: 250,
          height: 78,
          visible: showLesson,
        });

        if (lesConcepts.length === 0) {
          runningY += 90;
        }
      });

      // Position Module
      const moduleY = modLessons.length > 0 ? (modStartY + runningY - 90) / 2 : runningY;
      positions.set(mod.id, {
        node: mod,
        x: X_MODULE,
        y: Math.max(modStartY, moduleY),
        width: 260,
        height: 88,
        visible: true,
      });

      if (modLessons.length === 0) {
        runningY += 100;
      }
      runningY += 24;
    });

    // Position Subject root at center of all modules
    if (subjectNode) {
      const subjectY = runningY > 40 ? runningY / 2 : 120;
      positions.set(subjectNode.id, {
        node: subjectNode,
        x: X_SUBJECT,
        y: subjectY,
        width: 240,
        height: 100,
        visible: true,
      });
    }

    // Filter nodes by status and search if needed
    const finalNodes: NodePosition[] = [];
    positions.forEach((pos) => {
      let isVisible = pos.visible;

      // Status Filter
      if (statusFilter !== 'all' && isVisible) {
        if (statusFilter === 'mastered') {
          isVisible = pos.node.status === 'MASTERED' || pos.node.status === 'COMPLETED';
        } else if (statusFilter === 'in_progress') {
          isVisible = pos.node.status === 'DEVELOPING' || pos.node.status === 'IN_PROGRESS' || pos.node.status === 'LEARNING';
        } else if (statusFilter === 'not_started') {
          isVisible = pos.node.status === 'NOT_STARTED';
        } else if (statusFilter === 'gaps') {
          isVisible = Boolean(pos.node.hasKnowledgeGap);
        }
      }

      finalNodes.push({ ...pos, visible: isVisible });
    });

    // Filter visible edges
    const visibleNodeIds = new Set(finalNodes.filter((n) => n.visible).map((n) => n.node.id));
    const finalEdges = data.edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    return {
      layoutNodes: finalNodes,
      layoutEdges: finalEdges,
      bounds: {
        width: X_SUBCONCEPT + 350,
        height: Math.max(700, runningY + 120),
      },
    };
  }, [data, viewMode, statusFilter, collapsedNodes]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(2.0, Math.max(0.35, prev * zoomFactor)));
  };

  const resetView = () => {
    setZoom(0.85);
    setPan({ x: 30, y: 60 });
  };

  const fitView = () => {
    setZoom(0.65);
    setPan({ x: 20, y: 20 });
  };

  // Center on searched node
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase();
    const match = layoutNodes.find(
      (n) =>
        n.node.label.toLowerCase().includes(query) ||
        (n.node.code && n.node.code.toLowerCase().includes(query))
    );
    if (match) {
      setPan({
        x: -match.x * zoom + 300,
        y: -match.y * zoom + 250,
      });
      onSelectNode(match.node);
    }
  }, [searchQuery]);

  const posMap = useMemo(() => {
    const map = new Map<string, NodePosition>();
    layoutNodes.forEach((n) => map.set(n.node.id, n));
    return map;
  }, [layoutNodes]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className={`relative w-full h-[680px] bg-slate-900 rounded-2xl overflow-hidden select-none border border-slate-800 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Background Dot Grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <defs>
          <pattern id="mindmap-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#64748b" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mindmap-grid)" />
      </svg>

      {/* Floating Canvas Controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-slate-800/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-md">
        <button
          onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.35, z - 0.15))}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-700" />
        <button
          onClick={resetView}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
          title="Reset Zoom & Pan"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={fitView}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
          title="Fit Full Syllabus"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono text-slate-400 px-1 font-bold">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* AI Discover Button on Canvas */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={onDiscoverAiConnections}
          disabled={discoveringAi}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-bold text-xs shadow-lg backdrop-blur-md border border-purple-400/40 transition-all cursor-pointer disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${discoveringAi ? 'animate-spin' : ''}`} />
          <span>{discoveringAi ? 'Discovering Connections...' : 'AI Discover Bridges'}</span>
        </button>
      </div>

      {/* MAIN SVG CANVAS FOR EDGES AND NODES */}
      <svg
        className="w-full h-full absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          {/* Arrowhead marker for prerequisite edges */}
          <marker
            id="prereq-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
          </marker>

          {/* Arrowhead marker for gap edges */}
          <marker
            id="gap-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
          </marker>

          {/* Arrowhead marker for AI suggested edges */}
          <marker
            id="ai-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" />
          </marker>
        </defs>

        {/* 1. RENDER EDGES */}
        <g className="edges-layer">
          {layoutEdges.map((edge) => {
            const src = posMap.get(edge.source);
            const tgt = posMap.get(edge.target);
            if (!src || !tgt) return null;

            // Start from right of source to left of target
            const x1 = src.x + src.width;
            const y1 = src.y + src.height / 2;
            const x2 = tgt.x;
            const y2 = tgt.y + tgt.height / 2;

            const dx = Math.abs(x2 - x1) * 0.5;
            const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

            if (edge.type === 'hierarchy') {
              return (
                <path
                  key={edge.id}
                  d={pathD}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="transition-colors duration-300"
                />
              );
            }

            if (edge.type === 'prerequisite') {
              const isGap = edge.isGap;
              return (
                <g key={edge.id} className="prerequisite-edge">
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isGap ? '#ef4444' : '#f59e0b'}
                    strokeWidth={isGap ? '2.5' : '2'}
                    strokeDasharray="6,4"
                    markerEnd={isGap ? 'url(#gap-arrow)' : 'url(#prereq-arrow)'}
                    className={isGap ? 'animate-pulse' : ''}
                  />
                  {edge.label && (
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 6}
                      fill={isGap ? '#fca5a5' : '#fcd34d'}
                      fontSize="10"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="select-none pointer-events-none"
                    >
                      {isGap ? '⚠ ' + edge.label : edge.label}
                    </text>
                  )}
                </g>
              );
            }

            if (edge.type === 'ai_suggested') {
              return (
                <g key={edge.id} className="ai-edge">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    markerEnd="url(#ai-arrow)"
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 6}
                    fill="#d8b4fe"
                    fontSize="10"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    ✨ {edge.label || 'AI Bridge'}
                  </text>
                </g>
              );
            }

            return null;
          })}
        </g>

        {/* 2. RENDER NODES */}
        <g className="nodes-layer">
          {layoutNodes
            .filter((n) => n.visible)
            .map((pos) => {
              const { node, x, y, width, height } = pos;
              const isSelected = selectedNodeId === node.id;
              const isSearchMatch =
                searchQuery.trim().length > 0 &&
                (node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  Boolean(node.code && node.code.toLowerCase().includes(searchQuery.toLowerCase())));

              const isCollapsed = collapsedNodes.has(node.id);
              const hasChildren = (node.childrenCount ?? 0) > 0;

              return (
                <g
                  key={node.id}
                  transform={`translate(${x}, ${y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNode(node);
                  }}
                  className="cursor-pointer group"
                >
                  {/* Glowing Search Highlight or Selection Halo */}
                  {(isSelected || isSearchMatch) && (
                    <rect
                      x="-4"
                      y="-4"
                      width={width + 8}
                      height={height + 8}
                      rx="16"
                      fill="none"
                      stroke={isSearchMatch ? '#fbbf24' : '#6366f1'}
                      strokeWidth="3"
                      className="animate-pulse"
                    />
                  )}

                  {/* NODE CARD: SUBJECT ROOT */}
                  {node.type === 'subject' && (
                    <g>
                      <rect
                        width={width}
                        height={height}
                        rx="16"
                        fill="#1e1b4b"
                        stroke={isSelected ? '#818cf8' : '#4338ca'}
                        strokeWidth="2"
                        className="transition-all duration-200 group-hover:stroke-indigo-400 shadow-xl"
                      />
                      <foreignObject width={width} height={height} className="pointer-events-none p-3.5">
                        <div className="h-full flex flex-col justify-between text-white">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-600/80 text-indigo-100">
                              Curriculum Track
                            </span>
                            <span className="text-xs font-mono font-bold text-indigo-300">
                              {node.progress}%
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white tracking-tight line-clamp-1">
                              {node.label}
                            </div>
                            <div className="text-[11px] text-indigo-200/80 truncate">
                              {node.childrenCount} Modules In Syllabus
                            </div>
                          </div>
                        </div>
                      </foreignObject>
                    </g>
                  )}

                  {/* NODE CARD: MODULE */}
                  {node.type === 'module' && (
                    <g>
                      <rect
                        width={width}
                        height={height}
                        rx="14"
                        fill="#0f172a"
                        stroke={isSelected ? '#60a5fa' : '#1e293b'}
                        strokeWidth="2"
                        className="transition-all duration-200 group-hover:stroke-blue-400 shadow-md"
                      />
                      <foreignObject width={width} height={height} className="pointer-events-none p-3">
                        <div className="h-full flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800">
                              {node.code || 'MODULE'}
                            </span>
                            <span className="text-[11px] font-bold text-blue-400 font-mono">
                              {node.progress}%
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-100 line-clamp-1">
                            {node.label}
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${node.progress}%` }}
                            />
                          </div>
                        </div>
                      </foreignObject>

                      {/* Collapse / Expand Toggle Button */}
                      {hasChildren && (
                        <circle
                          cx={width}
                          cy={height / 2}
                          r="10"
                          fill="#1e293b"
                          stroke="#60a5fa"
                          strokeWidth="1.5"
                          onClick={(e) => toggleCollapse(node.id, e)}
                          className="hover:fill-blue-600 transition-colors"
                        />
                      )}
                      {hasChildren && (
                        <text
                          x={width}
                          y={height / 2 + 3}
                          fill="#ffffff"
                          fontSize="12"
                          fontWeight="bold"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {isCollapsed ? '+' : '−'}
                        </text>
                      )}
                    </g>
                  )}

                  {/* NODE CARD: LESSON */}
                  {node.type === 'lesson' && (
                    <g>
                      <rect
                        width={width}
                        height={height}
                        rx="12"
                        fill="#18181b"
                        stroke={isSelected ? '#a78bfa' : '#27272a'}
                        strokeWidth="2"
                        className="transition-all duration-200 group-hover:stroke-violet-400 shadow-xs"
                      />
                      <foreignObject width={width} height={height} className="pointer-events-none p-2.5">
                        <div className="h-full flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono font-bold text-violet-300 bg-violet-950/80 px-1.5 py-0.5 rounded">
                              {node.code || 'LESSON'}
                            </span>
                            <span className="text-slate-400 font-medium">
                              {node.estimatedMinutes || 25}m
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-100 line-clamp-1">
                            {node.label}
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span
                              className={`font-semibold ${
                                node.status === 'COMPLETED'
                                  ? 'text-emerald-400'
                                  : node.status === 'IN_PROGRESS'
                                  ? 'text-amber-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {node.status === 'COMPLETED'
                                ? '✓ Completed'
                                : node.status === 'IN_PROGRESS'
                                ? '◐ In Progress'
                                : '○ Not Started'}
                            </span>
                            <span className="text-slate-500">
                              {node.childrenCount} Concepts
                            </span>
                          </div>
                        </div>
                      </foreignObject>

                      {hasChildren && (
                        <circle
                          cx={width}
                          cy={height / 2}
                          r="9"
                          fill="#27272a"
                          stroke="#a78bfa"
                          strokeWidth="1.5"
                          onClick={(e) => toggleCollapse(node.id, e)}
                          className="hover:fill-violet-600 transition-colors"
                        />
                      )}
                      {hasChildren && (
                        <text
                          x={width}
                          y={height / 2 + 3}
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {isCollapsed ? '+' : '−'}
                        </text>
                      )}
                    </g>
                  )}

                  {/* NODE CARD: CONCEPT (CORE PEDAGOGICAL UNIT) */}
                  {node.type === 'concept' && (
                    <g>
                      <rect
                        width={width}
                        height={height}
                        rx="12"
                        fill={
                          node.hasKnowledgeGap
                            ? '#2c1214'
                            : node.status === 'MASTERED'
                            ? '#06281e'
                            : '#0f172a'
                        }
                        stroke={
                          node.hasKnowledgeGap
                            ? '#ef4444'
                            : isSelected
                            ? '#34d399'
                            : node.status === 'MASTERED'
                            ? '#059669'
                            : '#334155'
                        }
                        strokeWidth="2"
                        className="transition-all duration-200 group-hover:stroke-emerald-400 shadow-sm"
                      />
                      <foreignObject width={width} height={height} className="pointer-events-none p-2.5">
                        <div className="h-full flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              {node.code}
                            </span>
                            <div className="flex items-center gap-1">
                              {node.hasKnowledgeGap && (
                                <span className="text-[10px] font-bold text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800 flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Gap
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  node.status === 'MASTERED'
                                    ? 'bg-emerald-900/60 text-emerald-300'
                                    : node.status === 'DEVELOPING'
                                    ? 'bg-amber-900/60 text-amber-300'
                                    : node.status === 'LEARNING'
                                    ? 'bg-indigo-900/60 text-indigo-300'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {node.status === 'MASTERED'
                                  ? '✓ Mastered'
                                  : node.status === 'DEVELOPING'
                                  ? '◐ Developing'
                                  : node.status === 'LEARNING'
                                  ? '▶ Learning'
                                  : '○ Unstarted'}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs font-bold text-slate-100 line-clamp-1">
                            {node.label}
                          </div>

                          {/* Progress bar */}
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                node.status === 'MASTERED'
                                  ? 'bg-emerald-400'
                                  : node.status === 'DEVELOPING'
                                  ? 'bg-amber-400'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${node.progress}%` }}
                            />
                          </div>
                        </div>
                      </foreignObject>

                      {hasChildren && (
                        <circle
                          cx={width}
                          cy={height / 2}
                          r="8"
                          fill="#1e293b"
                          stroke="#34d399"
                          strokeWidth="1.5"
                          onClick={(e) => toggleCollapse(node.id, e)}
                          className="hover:fill-emerald-600 transition-colors"
                        />
                      )}
                      {hasChildren && (
                        <text
                          x={width}
                          y={height / 2 + 3}
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {isCollapsed ? '+' : '−'}
                        </text>
                      )}
                    </g>
                  )}

                  {/* NODE CARD: SUB-CONCEPT */}
                  {node.type === 'subconcept' && (
                    <g>
                      <rect
                        width={width}
                        height={height}
                        rx="8"
                        fill="#090d16"
                        stroke={isSelected ? '#94a3b8' : '#1e293b'}
                        strokeWidth="1.5"
                        className="transition-all duration-200 group-hover:stroke-slate-400"
                      />
                      <foreignObject width={width} height={height} className="pointer-events-none p-2">
                        <div className="h-full flex items-center justify-between text-[11px] text-slate-300">
                          <span className="truncate max-w-[150px]">• {node.label}</span>
                          <span className="text-[9px] font-mono text-slate-500">Sub-topic</span>
                        </div>
                      </foreignObject>
                    </g>
                  )}
                </g>
              );
            })}
        </g>
      </svg>

      {/* ACCESSIBLE BOTTOM LEGEND BAR (PART 8 & 19) */}
      <div className="absolute bottom-3 left-4 right-4 z-20 bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/80 shadow-lg flex items-center justify-between gap-4 flex-wrap text-xs text-slate-300">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
            Legend:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>✓ Mastered (≥75%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>◐ Developing (50-74%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>▶ Learning (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
            <span>○ Not Started</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>⚠ Knowledge Gap</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400 border-l border-slate-700 pl-3">
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-slate-400 inline-block" />
            <span>Hierarchy</span>
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <span className="w-3 h-0.5 border-t border-dashed border-amber-400 inline-block" />
            <span>Prerequisite</span>
          </div>
          <div className="flex items-center gap-1 text-purple-400">
            <span className="w-3 h-0.5 border-t border-dotted border-purple-400 inline-block" />
            <span>AI Bridge</span>
          </div>
        </div>
      </div>
    </div>
  );
};
