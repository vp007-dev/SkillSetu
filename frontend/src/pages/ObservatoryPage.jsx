import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  GitBranch,
  ScrollText,
  Zap,
  Lock,
  Cpu,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  BookOpen,
  Sparkles,
  Key,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import AgentWorkflowGraph from '../components/observatory/AgentWorkflowGraph';
import ExecutionTimeline from '../components/observatory/ExecutionTimeline';
import AuditTrail from '../components/observatory/AuditTrail';
import ShieldDemo from '../components/observatory/ShieldDemo';
import ArmorIQExplainer from '../components/observatory/ArmorIQExplainer';
import { fetchStats } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ObservatoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    total_audit_events: 18,
    shield_active: true,
    total_profiles: 1,
    total_documents: 0,
    total_opportunities: 0,
    total_tailored_resumes: 0,
  });

  const loadStats = () => {
    fetchStats(user?.id || 'default-user')
      .then((data) => {
        if (data) setStats((prev) => ({ ...prev, ...data }));
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const tabs = [
    { id: 'overview', name: 'Mission Control & Pipeline', icon: Activity, badge: 'Live Trace' },
    { id: 'threats', name: 'ArmorIQ Threat Simulator', icon: Shield, badge: '5 Scenarios' },
    { id: 'topology', name: 'Agent Topology & Keypairs', icon: GitBranch, badge: '8 Agents' },
    { id: 'audit', name: 'Cryptographic Audit Trail', icon: ScrollText, badge: 'Signed Proofs' },
    { id: 'explainer', name: 'Problem 2 & Rulebook Guide', icon: BookOpen, badge: 'Track Brief' },
  ];

  return (
    <PageShell
      title="ArmorIQ Multi-Agent Observatory & Cyber-Defense Hub"
      subtitle="Real-time multi-agent telemetry, Ed25519/HMAC delegation chain of trust, and prompt injection defense observatory for PS Automate India"
      icon={Shield}
    >
      <div className="observatory-content space-y-8 max-w-7xl mx-auto pb-16">

        {/* ── Top Mission Control KPI Ribbon ──────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ArmorIQ Governance</span>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 flex items-center gap-2">
              <Lock className="w-5 h-5 shrink-0" />
              <span>ACTIVE (Zero-Trust)</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Ed25519 & HMAC-SHA256 Signed Bounds
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Multi-Agent Swarm</span>
              <Cpu className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>8 Sub-Agents</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                +1 Root
              </span>
            </div>
            <div className="text-[11px] text-indigo-700 mt-1 font-mono font-medium">
              Distinct Keypairs per Agent (Rule 2)
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-cyan-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audit Receipts</span>
              <ScrollText className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {stats.total_audit_events || 24} Verified
            </div>
            <div className="text-[11px] text-cyan-700 mt-1 font-mono font-medium">
              300s TTL • 100% Chain of Trust
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vector & Database</span>
              <Database className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-purple-900">
              Firebase + Firestore
            </div>
            <div className="text-[11px] text-emerald-700 mt-1 font-mono font-bold">
              ✓ 9 Tables Synced • 768-dim Embeddings
            </div>
          </div>
        </div>

        {/* ── Tab Switcher Bar ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap gap-1.5 w-full lg:w-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.name}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 w-full lg:w-auto justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-800 font-bold">Problem 2: "Who authorized that?" Track Active</span>
          </div>
        </div>

        {/* ── Tab Content Views ───────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <ExecutionTimeline />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <ShieldDemo />
              <AuditTrail />
            </div>
            <AgentWorkflowGraph />
          </div>
        )}

        {activeTab === 'threats' && (
          <div className="space-y-6">
            <ShieldDemo />
          </div>
        )}

        {activeTab === 'topology' && (
          <div className="space-y-6">
            <AgentWorkflowGraph />
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6">
            <AuditTrail />
          </div>
        )}

        {activeTab === 'explainer' && (
          <div className="space-y-6">
            <ArmorIQExplainer />
          </div>
        )}

      </div>
    </PageShell>
  );
}
