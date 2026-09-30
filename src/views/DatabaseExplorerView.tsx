import React, { useState, useEffect } from 'react';
import {
  Database,
  Table,
  Search,
  RefreshCw,
  ExternalLink,
  Layers,
  Users,
  GitBranch,
  HelpCircle,
  Activity,
  Award,
  Clock,
  ShieldAlert,
  ChevronRight,
  Code,
  CheckCircle,
  HardDrive,
  Key,
  GraduationCap,
  Zap,
  CheckSquare,
  FileText,
  Download,
} from 'lucide-react';
import * as api from '../api/client.js';

interface DatabaseTable {
  name: string;
  count: number;
  description: string;
  records: any[];
}

export const DatabaseExplorerView: React.FC = () => {
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [persistenceInfo, setPersistenceInfo] = useState<any>(null);
  const [selectedTableName, setSelectedTableName] = useState<string>('User');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  const loadSnapshot = async () => {
    try {
      setLoading(true);
      const res = await api.fetchDatabaseSnapshot();
      setTables(res.tables);
      setStats(res.stats);
      if (res.persistence) {
        setPersistenceInfo(res.persistence);
      }
      if (res.tables.length > 0 && !selectedTableName) {
        setSelectedTableName(res.tables[0].name);
      }
    } catch (err) {
      console.error('Error loading database snapshot:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshot();
  }, []);

  const handleForceSync = async () => {
    try {
      setSyncing(true);
      await api.syncDatabaseToDisk();
      await loadSnapshot();
    } catch (err) {
      console.error('Error forcing sync:', err);
    } finally {
      setSyncing(false);
    }
  };

  const activeTable = tables.find((t) => t.name === selectedTableName) || tables[0];

  const getTableIcon = (name: string) => {
    switch (name) {
      case 'User': return Users;
      case 'Concept': return Layers;
      case 'Prerequisite': return GitBranch;
      case 'Question': return HelpCircle;
      case 'Attempt': return Activity;
      case 'MasteryState': return Award;
      case 'LearningSession': return Clock;
      case 'Recommendation': return ExternalLink;
      case 'TeacherOverride': return ShieldAlert;
      case 'AuthSession': return Key;
      case 'MockExamSession': return GraduationCap;
      case 'Flashcard': return Zap;
      case 'FlashcardProgress': return CheckSquare;
      case 'LessonProgress': return CheckCircle;
      case 'SummaryNote': return FileText;
      default: return Table;
    }
  };

  const filteredRecords = (activeTable?.records || []).filter((r) => {
    if (!searchQuery.trim()) return true;
    const jsonStr = JSON.stringify(r).toLowerCase();
    return jsonStr.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Database Schema & Model Explorer
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {tables.length} Entities Implemented
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Inspect live persistent state across all relational entities with disk-backed durable storage.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleForceSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer shrink-0"
            title="Force immediate synchronous disk write"
          >
            <HardDrive className={`w-3.5 h-3.5 ${syncing ? 'animate-pulse' : ''}`} />
            <span>{syncing ? 'Flushing...' : 'Flush to Disk'}</span>
          </button>

          <a
            href="/api/database/export"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all shrink-0"
            title="Download complete database JSON file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </a>

          <button
            onClick={loadSnapshot}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Production Persistence Status Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-emerald-900/50 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">Production Database Persistence Engine</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE & DURABLE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Storage Engine: <span className="font-mono text-emerald-300">{persistenceInfo?.storageType || 'Persistent File Store (Atomic JSON)'}</span> | Path: <span className="font-mono text-slate-300">{persistenceInfo?.filePath || 'data/masteryflow_database.json'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs shrink-0 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">File Size</span>
            <span className="font-mono font-bold text-white">
              {persistenceInfo?.sizeBytes ? `${(persistenceInfo.sizeBytes / 1024).toFixed(1)} KB` : 'Active'}
            </span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Last Auto-Sync</span>
            <span className="font-mono font-bold text-emerald-300">
              {persistenceInfo?.lastSavedAt ? new Date(persistenceInfo.lastSavedAt).toLocaleTimeString() : 'Just now'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Left Navigation Tables + Right Table View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Entity Selector */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
            Database Entities ({tables.length})
          </h2>
          <div className="space-y-1">
            {tables.map((t) => {
              const Icon = getTableIcon(t.name);
              const isSelected = t.name === selectedTableName;
              return (
                <button
                  key={t.name}
                  onClick={() => {
                    setSelectedTableName(t.name);
                    setSelectedRecord(null);
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-indigo-600'}`} />
                    <span>{t.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Table Data Records */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-[550px]">
          {/* Table Header & Search */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base">{activeTable?.name} Table</span>
                <span className="text-xs text-slate-500 font-mono">({activeTable?.count} records)</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{activeTable?.description}</p>
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search in ${activeTable?.name}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
              />
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-x-auto">
            {filteredRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No records match your query in {activeTable?.name}.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Primary ID / Ref</th>
                    <th className="py-2.5 px-4">Core Attributes</th>
                    <th className="py-2.5 px-4 text-right">Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredRecords.map((record, idx) => {
                    const idVal = record.id || record.code || `Row-${idx + 1}`;
                    const isRecordSelected = selectedRecord === record;
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-indigo-50/40 transition-colors ${
                          isRecordSelected ? 'bg-indigo-50/70' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-indigo-700 text-xs">
                          {idVal}
                        </td>
                        <td className="py-3 px-4 font-sans text-xs text-slate-700">
                          {activeTable?.name === 'User' && (
                            <div>
                              <span className="font-semibold text-slate-900">{record.name}</span>
                              <span className="text-slate-400 ml-2">({record.role})</span>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Lang: {record.preferredLanguage} • Reading: {record.preferredReadingLevel} • Dyslexia: {record.dyslexiaModeEnabled ? 'Yes' : 'No'}
                              </div>
                            </div>
                          )}

                          {activeTable?.name === 'Concept' && (
                            <div>
                              <span className="font-semibold text-slate-900">{record.name}</span>
                              <span className="text-slate-400 ml-2">[{record.code}]</span>
                              <p className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">{record.description}</p>
                            </div>
                          )}

                          {activeTable?.name === 'Prerequisite' && (
                            <div>
                              <span className="font-semibold text-indigo-600">{record.prerequisiteConceptId}</span>
                              <span className="text-slate-400 mx-1.5">➔</span>
                              <span className="font-semibold text-slate-900">{record.conceptId}</span>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Req Threshold: {(record.requiredThreshold * 100).toFixed(0)}% • Strength: {record.dependencyStrength}
                              </div>
                            </div>
                          )}

                          {activeTable?.name === 'Question' && (
                            <div>
                              <span className="font-semibold text-slate-900">{record.questionText?.substring(0, 70)}...</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                                  {record.questionFormat || 'MCQ'}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                                  Bloom: {record.bloomLevel || 'Understand'}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                  record.evaluationStatus === 'APPROVED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {record.evaluationStatus}
                                </span>
                              </div>
                            </div>
                          )}

                          {activeTable?.name === 'Attempt' && (
                            <div>
                              <span className="font-semibold text-slate-800">Learner: {record.learnerId}</span>
                              <span className="text-slate-400 ml-2">on {record.conceptId}</span>
                              <div className="flex items-center gap-2 mt-1 text-[11px]">
                                <span className={record.isCorrect ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                                  {record.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                </span>
                                <span>• Score: {record.evidenceScore?.toFixed(2)}</span>
                                <span>• Conf: {(record.confidence * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}

                          {activeTable?.name === 'MasteryState' && (
                            <div>
                              <span className="font-semibold text-slate-900">{record.conceptName}</span>
                              <span className="text-slate-400 ml-2">({record.learnerId})</span>
                              <div className="flex items-center gap-3 mt-1 text-[11px]">
                                <span>Mastery: <strong className="text-indigo-600">{(record.mastery * 100).toFixed(0)}%</strong></span>
                                <span>Retention: <strong>{(record.retention * 100).toFixed(0)}%</strong></span>
                                <span>Uncertainty: <strong>{(record.uncertainty * 100).toFixed(0)}%</strong></span>
                              </div>
                            </div>
                          )}

                          {activeTable?.name === 'LearningSession' && (
                            <div>
                              <span className="font-semibold text-indigo-700">{record.sessionType}</span>
                              <span className="text-slate-400 ml-2">({record.learnerId})</span>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Concept: {record.activeConceptId} • Duration: {record.durationSeconds || 1800}s • Attempts: {record.attemptsCount}
                              </div>
                            </div>
                          )}

                          {activeTable?.name === 'Recommendation' && (
                            <div>
                              <span className="font-semibold text-indigo-700">{record.action}</span>
                              <span className="text-slate-400 ml-2">for {record.conceptName}</span>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{record.reason}</p>
                            </div>
                          )}

                          {activeTable?.name === 'TeacherOverride' && (
                            <div>
                              <span className="font-semibold text-rose-700">Override: {record.newAction}</span>
                              <span className="text-slate-400 ml-2">by {record.teacherName}</span>
                              <p className="text-[11px] text-slate-500 mt-0.5">{record.reason}</p>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-all cursor-pointer"
                          >
                            <Code className="w-3 h-3" />
                            <span>JSON</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* JSON Record Inspector Modal / Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900 text-sm">
                  {selectedTableName} Record Inspector
                </span>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1 rounded bg-slate-200/60 cursor-pointer"
              >
                Close (ESC)
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed">
              <pre>{JSON.stringify(selectedRecord, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
