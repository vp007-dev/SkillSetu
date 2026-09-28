import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Search, BarChart3, Target, Rocket, ShieldCheck } from 'lucide-react';

const actions = [
  { icon: Sparkles, text: 'Analyze my active resume markdown', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { icon: Search, text: 'Find top matching job opportunities', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { icon: BarChart3, text: 'Evaluate my core skills & experience', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { icon: Target, text: 'Tailor resume for target role', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { icon: Rocket, text: 'Simulate AI live interview room', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { icon: ShieldCheck, text: 'Run RAG knowledge graph analysis', color: 'text-rose-600 bg-rose-50 border-rose-200' }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 }
};

export default function QuickActions({ onAction }) {
  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full max-w-4xl mx-auto mt-6 px-2"
    >
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={i}
            variants={item}
            onClick={() => onAction(action.text)}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-400 hover:bg-slate-50 transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md text-left group cursor-pointer"
          >
            <div className={`p-2.5 rounded-xl border ${action.color} shrink-0`}>
              <Icon size={18} />
            </div>
            <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors leading-snug">
              {action.text}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}


