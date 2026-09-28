import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { Bot, ChevronDown, ChevronUp, User } from 'lucide-react';

export default function ChatMessage({ message }) {
  const { role, text, author, event_type, sources, timestamp } = message;
  const isUser = role === 'user';
  const [showSources, setShowSources] = useState(false);

  const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`relative max-w-[88%] sm:max-w-[80%] px-5 py-4 ${
          isUser
            ? 'bg-indigo-600 text-white rounded-3xl rounded-br-sm shadow-md shadow-indigo-500/20 border border-indigo-500 font-medium'
            : 'bg-white backdrop-blur-xl border border-slate-200/90 rounded-3xl rounded-bl-sm text-slate-800 shadow-sm'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 text-xs font-bold text-indigo-700">
            <div className="w-5 h-5 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
              <Bot size={12} className="text-indigo-600" />
            </div>
            <span>{author || 'SkillSetu Assistant'}</span>
            {event_type && <span className="text-slate-400 font-mono text-[10px]">({event_type})</span>}
          </div>
        )}

        {isUser && (
          <div className="flex items-center gap-1.5 mb-1 justify-end text-[11px] font-bold text-indigo-100">
            <span>You</span>
            <User size={12} />
          </div>
        )}
        
        <div className={`prose-chat text-sm leading-relaxed ${isUser ? 'text-white' : 'text-slate-800'}`}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{text}</div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          )}
        </div>

        {!isUser && sources && sources.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <button 
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition-colors cursor-pointer"
            >
              {showSources ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              RAG Sources Grounding ({sources.length})
            </button>
            {showSources && (
              <ul className="mt-2 space-y-1">
                {sources.map((src, i) => (
                  <li key={i} className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 truncate font-mono">
                    {src.title || src.url || src}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {timeStr && (
          <div className={`text-[10px] mt-2 text-right font-mono font-medium ${isUser ? 'text-indigo-100' : 'text-slate-400'}`}>
            {timeStr}
          </div>
        )}
      </div>

    </motion.div>
  );
}

