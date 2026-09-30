import React, { useState } from 'react';
import { Concept, LearningResource, ReadingLevel, LanguageCode } from '../types.js';
import * as api from '../api/client.js';
import {
  BookOpen,
  FileText,
  Video,
  Upload,
  Brain,
  Lightbulb,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Clock,
  CheckCircle2,
  Download,
  Search,
  Eye,
  Plus,
  Loader2,
  Bot,
} from 'lucide-react';

interface LearningMaterialViewerProps {
  concept: Concept;
  resources: LearningResource[];
  activeResource: LearningResource | null;
  setActiveResource: (res: LearningResource) => void;
  transformedContent: any;
  readingLevel: ReadingLevel;
  language: LanguageCode;
  bionicReading: boolean;
  isAudioPlaying: boolean;
  onToggleAudio: () => void;
  onOpenSummaryNotes: () => void;
  onOpenTutor: () => void;
  hasSummaryNotes: boolean;
  onResourceAdded?: (res: LearningResource) => void;
}

export const LearningMaterialViewer: React.FC<LearningMaterialViewerProps> = ({
  concept,
  resources,
  activeResource,
  setActiveResource,
  transformedContent,
  readingLevel,
  language,
  bionicReading,
  isAudioPlaying,
  onToggleAudio,
  onOpenSummaryNotes,
  onOpenTutor,
  hasSummaryNotes,
  onResourceAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'core_lesson' | 'pdf' | 'video' | 'upload'>('core_lesson');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadType, setUploadType] = useState<'pdf' | 'uploaded_doc'>('pdf');
  const [uploadContent, setUploadContent] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  // Active video timestamp state
  const [activeVideoTime, setActiveVideoTime] = useState<number>(0);

  // Bionic reading formatter
  const renderBionic = (text: string) => {
    if (!bionicReading || !text) return text;
    return text.split(' ').map((word, idx) => {
      const mid = Math.ceil(word.length / 2);
      const first = word.slice(0, mid);
      const rest = word.slice(mid);
      return (
        <span key={idx} className="inline-block mr-1">
          <strong className="font-extrabold text-slate-950">{first}</strong>
          <span>{rest}</span>
        </span>
      );
    });
  };

  // Find resources by type
  const pdfResources = resources.filter((r) => r.type === 'pdf');
  const videoResources = resources.filter((r) => r.type === 'video');

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadContent.trim()) return;

    try {
      setUploading(true);
      const newRes = await api.uploadLearningResource({
        conceptId: concept.id,
        title: uploadTitle || (uploadType === 'pdf' ? `${concept.name} Handout.pdf` : `${concept.name} Custom Notes`),
        type: uploadType,
        content: uploadContent,
        fileName: uploadType === 'pdf' ? `${concept.code}_Notes.pdf` : 'notes.txt',
        fileSize: `${(uploadContent.length / 1024).toFixed(1)} KB`,
      });

      if (onResourceAdded) {
        onResourceAdded(newRes);
      }
      setActiveResource(newRes);
      setUploadSuccess(true);
      setUploadContent('');
      setUploadTitle('');
      setTimeout(() => {
        setUploadSuccess(false);
        setActiveTab(uploadType === 'pdf' ? 'pdf' : 'core_lesson');
      }, 1200);
    } catch (err) {
      console.error('Failed to upload resource:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Top Resource Type Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <button
            onClick={() => setActiveTab('core_lesson')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'core_lesson'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Core Lesson</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('pdf');
              if (pdfResources[0]) setActiveResource(pdfResources[0]);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'pdf'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span>PDF Handout</span>
            {pdfResources.length > 0 && (
              <span className="text-[10px] px-1.5 rounded-full bg-slate-100 text-slate-600">
                {pdfResources.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('video');
              if (videoResources[0]) setActiveResource(videoResources[0]);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'video'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-rose-500" />
            <span>Lecture Video</span>
            {videoResources.length > 0 && (
              <span className="text-[10px] px-1.5 rounded-full bg-slate-100 text-slate-600">
                {videoResources.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Material</span>
          </button>
        </div>

        {/* Action Buttons: AI Summary & Audio Reader */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSummaryNotes}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
              hasSummaryNotes
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{hasSummaryNotes ? 'View AI Summary' : '⚡ Generate Summary'}</span>
          </button>

          <button
            onClick={onToggleAudio}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isAudioPlaying
                ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
          >
            {isAudioPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isAudioPlaying ? 'Stop' : 'Audio'}</span>
          </button>
        </div>
      </div>

      {/* Main Material Display Body */}
      <div className="p-5 flex-1 overflow-y-auto space-y-4">
        {/* TAB 1: CORE CONCEPTUAL LESSON */}
        {activeTab === 'core_lesson' && (
          <div className="space-y-4">
            {/* Reading Level Analogy Card */}
            <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/40 p-4 rounded-xl border border-indigo-100/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-indigo-900 uppercase">
                    {readingLevel === 'middle_school' && 'Middle School Intuitive Analogy'}
                    {readingLevel === 'high_school' && 'High School Visual Bridge'}
                    {readingLevel === 'undergraduate' && 'Undergraduate Formal Definition'}
                    {readingLevel === 'executive' && 'Systems Architecture Context'}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  Level: {readingLevel}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {renderBionic(transformedContent?.analogy || concept.readingLevelVariants?.[readingLevel]?.analogy || concept.description)}
              </p>
            </div>

            {/* Core Explanation */}
            <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                How It Works & Mechanism:
              </h3>
              <p className="leading-relaxed">
                {renderBionic(transformedContent?.coreExplanation || concept.readingLevelVariants?.[readingLevel]?.coreExplanation || concept.description)}
              </p>
            </div>

            {/* Real World Production Example */}
            {(transformedContent?.realWorldExample || concept.readingLevelVariants?.[readingLevel]?.realWorldExample) && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="font-semibold text-slate-900 block text-xs">Real-World Application:</span>
                <p className="text-slate-600 leading-relaxed">
                  {renderBionic(transformedContent?.realWorldExample || concept.readingLevelVariants?.[readingLevel]?.realWorldExample || '')}
                </p>
              </div>
            )}

            {/* Key Takeaways */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Core Invariants & Bounds:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {(transformedContent?.keyPoints || concept.keyTakeaways || []).map((k: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: PDF DOCUMENT READER */}
        {activeTab === 'pdf' && (
          <div className="space-y-4">
            {pdfResources.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs">No PDF handouts uploaded yet for this concept.</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="text-xs font-semibold text-indigo-600 underline cursor-pointer"
                >
                  Upload a PDF document
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* PDF Header Info */}
                <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold truncate max-w-sm sm:max-w-md">
                        {activeResource?.title || pdfResources[0].title}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {activeResource?.fileName || 'handout.pdf'} • {activeResource?.fileSize || '3.2 MB'} • {activeResource?.pageCount || 12} Pages
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-semibold border border-slate-700">
                    PDF Document
                  </span>
                </div>

                {/* PDF Reader Canvas Simulator */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 font-serif text-xs leading-relaxed text-slate-800 shadow-inner max-h-[380px] overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-sans text-[10px] text-slate-400">
                    <span>Page 1 of {activeResource?.pageCount || 12}</span>
                    <span>Standard Academic Format (100% Zoom)</span>
                  </div>
                  <div className="whitespace-pre-wrap font-sans text-xs text-slate-700 space-y-2">
                    {renderBionic(activeResource?.content || pdfResources[0].content)}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    You can generate structured summary notes directly from this PDF!
                  </span>
                  <button
                    onClick={onOpenSummaryNotes}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] cursor-pointer"
                  >
                    Summarize PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LECTURE VIDEO & TRANSCRIPT */}
        {activeTab === 'video' && (
          <div className="space-y-4">
            {videoResources.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Video className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs">No lecture videos linked for this concept.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Video Mock Player Screen */}
                <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 text-white p-6 flex flex-col items-center justify-center space-y-3 shadow-md relative min-h-[180px]">
                  <div className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-105">
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  </div>
                  <div className="text-center space-y-1">
                    <h4 className="text-xs font-bold text-slate-200">{videoResources[0].title}</h4>
                    <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      Duration: {videoResources[0].durationFormatted || '42:15'}
                    </span>
                  </div>
                </div>

                {/* Timestamped Sections & Transcript */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Interactive Video Transcript & Sections:
                  </span>
                  <div className="space-y-1.5">
                    {(videoResources[0].timestamps || []).map((t, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveVideoTime(t.timeSeconds)}
                        className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-2.5 ${
                          activeVideoTime === t.timeSeconds
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-950 ring-1 ring-indigo-400/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                          {t.timeFormatted}
                        </span>
                        <div className="space-y-0.5 flex-1">
                          <span className="font-bold text-slate-900 block text-xs">{t.title}</span>
                          <p className="text-slate-500 text-[11px]">{t.transcriptSnippet}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: UPLOAD / IMPORT RESOURCE */}
        {activeTab === 'upload' && (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-900">Upload or Import Learning Material</h3>
              <p className="text-[11px] text-slate-500">
                Add an excerpt from your textbook, lecture handout, or notes. The AI Tutor and Summary Notes engine will ingest this material.
              </p>
            </div>

            {uploadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Learning resource successfully added and indexed!</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Document / Material Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder={`e.g. ${concept.name} Chapter 4 Excerpt`}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Resource Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadType('pdf')}
                    className={`flex-1 p-2 rounded-xl text-xs font-semibold border text-center cursor-pointer ${
                      uploadType === 'pdf'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    📄 PDF Document
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadType('uploaded_doc')}
                    className={`flex-1 p-2 rounded-xl text-xs font-semibold border text-center cursor-pointer ${
                      uploadType === 'uploaded_doc'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    📝 Lecture Text / Notes
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Paste Readable Content / Text
                </label>
                <textarea
                  rows={6}
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  placeholder="Paste textbook excerpt, lecture transcript, or study notes here..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono leading-relaxed"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !uploadContent.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing & Indexing Material...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Add Material for AI Summary & Tutoring</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
