import React, { useState, useEffect, useRef } from 'react';
import {
  TutorMessage,
  TutorContext,
  SummaryNote,
  Concept,
  LearnerProfile,
} from '../types.js';
import * as api from '../api/client.js';
import {
  Bot,
  User,
  Send,
  Sparkles,
  RotateCcw,
  Trash2,
  HelpCircle,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Brain,
  MessageSquare,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface TutorChatProps {
  concept: Concept;
  currentLearner: LearnerProfile | null;
  summaryNotes?: SummaryNote | null;
  activeQuestion?: any;
  activeResource?: any;
  onAskAboutSummary?: () => void;
  isCompact?: boolean;
}

export const TutorChat: React.FC<TutorChatProps> = ({
  concept,
  currentLearner,
  summaryNotes,
  activeQuestion,
  activeResource,
  onAskAboutSummary,
  isCompact = false,
}) => {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history for learner & concept
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      if (!concept) return;
      try {
        setInitialLoading(true);
        setError(null);
        const history = await api.fetchTutorHistory(concept.id, currentLearner?.id);
        if (isMounted) {
          setMessages(history);
        }
      } catch (err: any) {
        console.warn('Could not load tutor chat history:', err);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [concept?.id, currentLearner?.id]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Build clean context object
  const buildCurrentContext = (): TutorContext => {
    const masteryState = currentLearner?.conceptMasteries[concept.id];
    const prereqList = (concept.prerequisites || []).map((pid) => {
      const pState = currentLearner?.conceptMasteries[pid];
      return {
        id: pid,
        name: pState?.conceptName || pid,
        masteryPercent: Math.round((pState?.mastery || 0) * 100),
        satisfied: (pState?.mastery || 0) >= 0.70,
      };
    });

    return {
      domainId: concept.domainId,
      domainName: concept.domainId.toUpperCase(),
      category: concept.category,
      conceptId: concept.id,
      conceptName: concept.name,
      conceptCode: concept.code,
      bloomTarget: concept.bloomTarget,
      learningMaterial: {
        title: concept.name,
        analogy: concept.readingLevelVariants?.[currentLearner?.preferredReadingLevel || 'undergraduate']?.analogy || concept.description,
        coreExplanation: concept.readingLevelVariants?.[currentLearner?.preferredReadingLevel || 'undergraduate']?.coreExplanation || concept.description,
        realWorldExample: concept.readingLevelVariants?.[currentLearner?.preferredReadingLevel || 'undergraduate']?.realWorldExample,
        keyTakeaways: concept.keyTakeaways || [],
        resourceTitle: activeResource?.title,
        resourceType: activeResource?.type,
        resourceContentSnippet: activeResource?.content?.slice(0, 800),
        activeQuestionText: activeQuestion?.questionText,
        activeQuestionFormat: activeQuestion?.questionFormat,
        activeQuestionHint: activeQuestion?.hint,
        activeCodeSnippet: activeQuestion?.codeSnippet,
      },
      summaryNotes: summaryNotes
        ? {
            overview: summaryNotes.overview,
            keyPoints: summaryNotes.keyPoints,
            rawMarkdown: summaryNotes.rawMarkdown,
          }
        : null,
      prerequisites: prereqList,
      studentState: {
        learnerId: currentLearner?.id || 'student_a',
        name: currentLearner?.name || 'Student',
        mastery: masteryState?.mastery || 0.40,
        retention: masteryState?.retention || 0.50,
        status: masteryState?.status || 'developing',
        confidence: masteryState?.averageConfidence || 0.80,
        preferredReadingLevel: currentLearner?.preferredReadingLevel || 'undergraduate',
        preferredLanguage: currentLearner?.preferredLanguage || 'en',
      },
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    setError(null);
    setInputText('');

    // Optimistically show user message
    const tempUserMsg: TutorMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
      conceptId: concept.id,
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const context = buildCurrentContext();
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.sendTutorChatMessage({
        learnerId: currentLearner?.id || 'student_a',
        message: query,
        history: historyPayload,
        context,
      });

      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
      }
    } catch (err: any) {
      console.error('Tutor chat failed:', err);
      setError(err.message || 'Failed to connect to AI Tutor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await api.clearTutorChatHistory(concept.id, currentLearner?.id);
      setMessages([]);
      setError(null);
    } catch (err) {
      console.error('Failed to clear tutor history:', err);
    }
  };

  // Starter prompts tailored to the concept
  const starterPrompts = [
    `Why is ${concept.name} important in this syllabus?`,
    `Explain the intuition step-by-step with a beginner-friendly analogy`,
    summaryNotes ? `Explain point 2 from the summary notes` : `What are the common exam pitfalls for this topic?`,
    concept.prerequisites && concept.prerequisites.length > 0
      ? `What prerequisite knowledge do I need before solving questions?`
      : `Give me a real-world engineering example of this`,
  ];

  // Helper to render formatted markdown
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bold headers
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="font-bold text-slate-900 mt-2 mb-1 text-xs">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="font-bold text-indigo-950 mt-2.5 mb-1 text-xs">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="font-extrabold text-indigo-950 mt-3 mb-1.5 text-sm">{line.replace('# ', '')}</h2>;
      }

      // Code blocks
      if (line.startsWith('```')) {
        return null;
      }

      // Bullets
      if (line.trim().startsWith('• ') || line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const clean = line.trim().replace(/^[•*-]\s*/, '');
        return (
          <li key={idx} className="flex items-start gap-1.5 ml-2 my-0.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
            <span>{renderInlineFormatting(clean)}</span>
          </li>
        );
      }

      // Numbered lists
      const numMatch = line.trim().match(/^(\d+)\.\s*(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-1.5 ml-2 my-0.5 text-xs">
            <span className="font-bold text-indigo-600 shrink-0">{numMatch[1]}.</span>
            <span>{renderInlineFormatting(numMatch[2])}</span>
          </div>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="text-xs leading-relaxed my-0.5">
          {renderInlineFormatting(line)}
        </p>
      );
    });
  };

  const renderInlineFormatting = (str: string) => {
    // Process bold and code tags
    const parts = str.split(/(\*\*.*?\*\*|`.*?`|\$.*?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-950">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[11px] font-semibold">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return <span key={i} className="font-mono text-purple-700 font-semibold px-1 bg-purple-50 rounded text-[11px]">{part.slice(1, -1)}</span>;
      }
      return part;
    });
  };

  return (
    <div
      className={`flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-300 ${
        isExpanded
          ? 'fixed inset-4 sm:inset-10 z-50 shadow-2xl flex flex-col'
          : isCompact
          ? 'h-[540px]'
          : 'h-[620px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/60 border border-indigo-400/40 flex items-center justify-center text-white shadow-inner">
            <Bot className="w-4 h-4 text-indigo-200" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs tracking-wide">AI Learning Tutor</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-[10px] text-indigo-200/80 truncate max-w-[200px] sm:max-w-xs">
              Context: <strong className="text-white">{concept.name}</strong> ({concept.code})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {summaryNotes && (
            <span
              title="Summary notes attached to tutor context"
              className="hidden sm:flex items-center gap-1 text-[10px] font-semibold bg-indigo-700/60 text-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-500/40 mr-1"
            >
              <FileText className="w-3 h-3 text-amber-300" />
              <span>Notes Synced</span>
            </span>
          )}

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              title="Clear conversation"
              className="p-1.5 text-indigo-300 hover:text-rose-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
            className="p-1.5 text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Context Banner */}
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600 gap-2">
        <div className="flex items-center gap-2 truncate">
          <Brain className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="truncate">
            Syllabus: <strong className="text-slate-800">{concept.domainId.toUpperCase()}</strong> • Bloom: <strong className="text-purple-700">{concept.bloomTarget}</strong>
          </span>
        </div>
        {summaryNotes ? (
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Notes Loaded
          </span>
        ) : (
          <button
            onClick={onAskAboutSummary}
            className="text-[10px] font-semibold text-indigo-600 hover:underline shrink-0 cursor-pointer"
          >
            + Generate Summary
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-slate-50/50 to-white">
        {initialLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-xs font-medium">Connecting to personal AI Tutor...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-6 px-2 space-y-4">
            {/* Empty State Card */}
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Hi {currentLearner?.name || 'there'}! I'm your Academic Tutor.</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                I am here to help you master <strong className="text-indigo-950 font-semibold">{concept.name}</strong>.
                Ask me to explain any step, breakdown confusing formulas, clarify mistakes on practice questions, or connect this with your prerequisites.
              </p>
            </div>

            {/* Quick Starter Prompts */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Suggested Questions to Get Started:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {starterPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-left p-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 text-xs text-slate-700 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                  >
                    <span className="line-clamp-2">{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-3.5 rounded-2xl text-xs shadow-2xs ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="space-y-1">{renderMessageContent(msg.content)}</div>
                    )}
                  </div>

                  {/* Follow-up suggestions on AI messages */}
                  {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && index === messages.length - 1 && (
                    <div className="pt-2 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Suggested Follow-ups:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestedFollowUps.map((fu, fIdx) => (
                          <button
                            key={fIdx}
                            onClick={() => handleSendMessage(fu)}
                            className="text-[11px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            {fu}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <span className={`block text-[10px] text-slate-400 ${isUser ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-2xl rounded-bl-xs shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI Tutor is thinking...</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span>Analyzing lesson context & prerequisite graph</span>
                <span className="animate-pulse">...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleSendMessage()}
              className="text-xs font-bold underline ml-2 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-200 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Ask about ${concept.name}, mistakes, formulas, notes...`}
            disabled={loading}
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 transition-all disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span>Press Enter to send • Tutor grounded in lesson & notes</span>
          <span>{inputText.length} chars</span>
        </div>
      </div>
    </div>
  );
};
