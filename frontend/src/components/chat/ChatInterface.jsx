import React, { useState, useEffect, useRef } from 'react';
import { SendHorizontal, RotateCcw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import ChatMessage from './ChatMessage';
import QuickActions from './QuickActions';
import { executeAdkAgent } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function ChatInterface() {
  const { user, selectedCandidateId, setSelectedCandidateId, activeCandidate, candidates } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('skillsetu_session_id');
    if (stored) {
      setSessionId(stored);
    } else {
      const newId = crypto.randomUUID();
      setSessionId(newId);
      localStorage.setItem('skillsetu_session_id', newId);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg = {
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const targetUserOrCand = selectedCandidateId === 'all' ? (user?.id || 'default-user') : selectedCandidateId;
      const response = await executeAdkAgent(trimmed, sessionId, targetUserOrCand);
      
      if (response?.session_id) {
        setSessionId(response.session_id);
        localStorage.setItem('skillsetu_session_id', response.session_id);
      }

      const events = response?.events || [];
      const newMessages = events
        .filter(ev => ev.text && ev.text.trim().length > 0)
        .map(ev => ({
          role: 'assistant',
          text: ev.text,
          author: ev.author,
          event_type: ev.event_type,
          sources: ev.sources,
          timestamp: new Date().toISOString()
        }));

      if (newMessages.length > 0) {
        setMessages(prev => [...prev, ...newMessages]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: 'No response was returned.',
          author: 'system',
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Sorry, I encountered an error while processing your request.',
        author: 'system',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSession = () => {
    const newId = crypto.randomUUID();
    setSessionId(newId);
    localStorage.setItem('skillsetu_session_id', newId);
    setMessages([]);
  };

  return (
    <div className="chat-interface flex flex-col h-full bg-[#f8fafc] text-slate-800 overflow-hidden relative">
      {/* Header with Candidate Selector */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200/90 bg-white/90 backdrop-blur-2xl z-10 flex-wrap gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black font-heading bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-700">
            SkillSetu AI Hub
          </h1>
          <span className="text-xs font-semibold text-slate-500 hidden md:inline">• RAG Career Copilot</span>
        </div>

        {/* Candidate Grounding Selector & New Session Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 max-w-full">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Grounding:</span>
            <div className="relative w-full sm:w-64 max-w-full">
              <select
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500 appearance-none pr-8 cursor-pointer shadow-sm truncate"
              >
                <option value="all">🌐 All Personas (Multi-Profile RAG)</option>
                {candidates.map((c) => {
                  const cleanRole = c.role ? c.role.split(' at ')[0].split('(')[0].split('|')[0].trim() : '';
                  const shortRole = cleanRole.length > 25 ? cleanRole.slice(0, 23) + '...' : cleanRole;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} {shortRole ? `(${shortRole})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <button
            onClick={handleResetSession}
            className="btn-aesthetic-secondary text-xs py-1.5 px-3 rounded-xl"
            title="New Chat Session"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">New Session</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto py-8">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center mb-8 space-y-3"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 border border-indigo-200">
                <span className="text-4xl">🚀</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-700 bg-clip-text text-transparent">
                How can I boost your career today?
              </h2>
              <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto font-medium">
                Autonomous RAG copilot ready to tailor resumes, simulate interviews, and analyze target roles.
              </p>
            </motion.div>
            <QuickActions onAction={handleSend} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full space-y-4">
            {messages.map((msg, i) => (
              <ChatMessage key={msg.id || `msg-${i}-${msg.timestamp || ''}`} message={msg} />
            ))}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full mb-4 justify-start"
              >
                <div className="bg-white backdrop-blur-md border border-slate-200 rounded-2xl rounded-bl-sm px-5 py-4 flex items-center gap-3 shadow-md">
                  <span className="text-xs font-bold text-indigo-700">AI Thinking</span>
                  <span className="flex gap-1.5">
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 rounded-full bg-indigo-500 block" />
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 rounded-full bg-cyan-500 block" />
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 rounded-full bg-emerald-500 block" />
                  </span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 bg-white/95 backdrop-blur-2xl border-t border-slate-200/90 shadow-sm">
        <div className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="Ask me anything about your career, resumes, or interviews..."
            className="w-full pl-6 pr-16 py-4 rounded-2xl bg-white border border-slate-300 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-sm text-slate-800 placeholder:text-slate-400 font-medium"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-aesthetic-primary p-2.5 rounded-xl disabled:opacity-40"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
          </button>
        </div>
        <div className="text-center mt-3 text-[10px] text-slate-400 font-semibold tracking-wider uppercase font-mono">
          SkillSetu AI Grounded Intelligence • Always verify important details
        </div>
      </div>
    </div>
  );

}

