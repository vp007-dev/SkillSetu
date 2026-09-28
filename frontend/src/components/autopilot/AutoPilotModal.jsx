import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Upload,
  Link as LinkIcon,
  FileText,
  User,
  Users,
  ArrowRight,
  Briefcase,
  Trophy,
  Compass,
  FileCheck,
  Terminal,
  ShieldCheck,
  Download,
  ExternalLink,
  Cpu,
  Search,
  MapPin,
  Mail,
  Check,
  ChevronDown
} from 'lucide-react';
import {
  createAutoPilotWebSocket,
  fetchCandidates,
  fetchCandidateDetails,
  downloadResumePdf,
} from '../../api/client';
import GlassCard from '../ui/GlassCard';
import Badge from '../ui/Badge';

const AGENT_STAGES = [
  { id: 1, name: 'Candidate Ingestion & OCR', agent: 'document_processor', desc: 'Docling OCR parsing & 768-dim vector embeddings' },
  { id: 2, name: 'Resume Entity Extraction', agent: 'resume_extractor', desc: 'Parsing candidate skills, experience, and contact' },
  { id: 3, name: 'Skill & Trajectory Analysis', agent: 'resume_analyzer', desc: 'Analyzing strengths, gaps, and domain focus' },
  { id: 4, name: 'Candidate Profiler', agent: 'profile_maker', desc: 'Synthesizing multi-domain search strategies' },
  { id: 5, name: 'Live Opportunity Scouting', agent: 'opportunity_scout', desc: 'Scouting live web & Firecrawl MCP across Jobs & Hackathons' },
  { id: 6, name: 'AI Fit & ATS Ranking', agent: 'opportunity_ranker', desc: 'Scoring 0-100% relevance & evaluating keywords' },
  { id: 7, name: 'Autonomous Resume Tailoring', agent: 'resume_tailor', desc: 'Generating tailored ATS resumes & PDFs' },
];

import { useAuth } from '../../context/AuthContext';

export default function AutoPilotModal({
  isOpen,
  onClose,
  onComplete,
  candidateId = null,
  initialProfileId = null,
  initialResumeText = ''
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('candidate'); // 'candidate', 'text', 'file', 'url'
  
  const effectiveUserId = candidateId || user?.id || 'default-user';

  // Candidates State
  const [candidatesList, setCandidatesList] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(effectiveUserId);
  const [selectedCandidateDetails, setSelectedCandidateDetails] = useState(null);

  // Other Input State
  const [textInput, setTextInput] = useState(initialResumeText || '');
  const [urlInput, setUrlInput] = useState('');
  const [file, setFile] = useState(null);

  const [categories, setCategories] = useState(['job', 'internship', 'competition', 'hackathon']);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [liveLogs, setLiveLogs] = useState([]);
  const [discoveredItems, setDiscoveredItems] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const terminalBottomRef = useRef(null);

  // 1. Fetch Candidates List & Details
  useEffect(() => {
    if (!isOpen) return;

    async function loadCandidates() {
      try {
        const cRes = await fetchCandidates(effectiveUserId);
        const validList = (cRes.candidates || []).filter((c) => c.id !== 'candidate_all');
        setCandidatesList(validList);

        const initialTargetId = effectiveUserId;
        setSelectedCandidateId(initialTargetId);

        const detailsRes = await fetchCandidateDetails(initialTargetId);
        if (detailsRes.candidate) {
          setSelectedCandidateDetails(detailsRes.candidate);
          if (!initialResumeText && detailsRes.candidate.resume_markdown) {
            setTextInput(detailsRes.candidate.resume_markdown);
          }
        }
      } catch (err) {
        console.error('Failed to load candidates for AutoPilot:', err);
      }
    }

    loadCandidates();
  }, [isOpen, effectiveUserId, initialResumeText]);

  // Handle Candidate Change in dropdown
  const handleCandidateSelect = async (cid) => {
    setSelectedCandidateId(cid);
    try {
      const detailsRes = await fetchCandidateDetails(cid);
      if (detailsRes.candidate) {
        setSelectedCandidateDetails(detailsRes.candidate);
        setTextInput(detailsRes.candidate.resume_markdown || '');
      }
    } catch (err) {
      console.error('Failed to load candidate details:', err);
    }
  };

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLogs, discoveredItems]);

  // Cleanup WebSocket on unmount or close
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  if (!isOpen) return null;

  const toggleCategory = (cat) => {
    if (categories.includes(cat)) {
      if (categories.length > 1) {
        setCategories(categories.filter((c) => c !== cat));
      }
    } else {
      setCategories([...categories, cat]);
    }
  };

  const addLog = (agent, message, status = 'info') => {
    const timeStr = new Date().toLocaleTimeString();
    setLiveLogs((prev) => [...prev, { time: timeStr, agent, message, status }]);
  };

  const handleStartAutoPilot = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setLiveLogs([]);
    setDiscoveredItems([]);
    setCurrentStage(1);

    addLog('system', 'Establishing secure WebSocket handshake to Career Auto-Pilot Engine...', 'info');

    try {
      let inputType = 'candidate_id';
      let inputValue = selectedCandidateId;

      if (mode === 'candidate') {
        inputType = 'candidate_id';
        inputValue = selectedCandidateId;
      } else if (mode === 'file' && file) {
        inputType = 'file_base64';
        inputValue = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else if (mode === 'text') {
        inputType = 'text';
        inputValue = textInput.trim() || selectedCandidateDetails?.resume_markdown || '';
      } else if (mode === 'url') {
        if (!urlInput.trim()) {
          throw new Error('Please enter a target URL or portfolio.');
        }
        inputType = 'url';
        inputValue = urlInput.trim();
      }

      const sessionId = 'ap_' + Date.now();
      const ws = createAutoPilotWebSocket(sessionId);
      socketRef.current = ws;

      ws.onopen = () => {
        addLog('system', `WebSocket connection established [Session: ${sessionId}]`, 'success');
        addLog('system', `Initiating 7-stage multi-agent orchestration for ${selectedCandidateDetails?.name || 'Candidate'} across ${categories.join(', ')}...`, 'info');

        ws.send(
          JSON.stringify({
            user_id: 'default-user',
            input_type: inputType,
            input_value: inputValue,
            candidate_id: selectedCandidateId,
            filename: file ? file.name : (selectedCandidateDetails?.doc_name || 'resume.pdf'),
            categories: categories,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.stage) {
            setCurrentStage(msg.stage);
          }

          if (msg.status === 'item_discovered' && msg.item) {
            setDiscoveredItems((prev) => [msg.item, ...prev]);
            addLog(msg.agent || 'scout', msg.message || `Found opportunity: ${msg.item.title}`, 'item');
          } else if (msg.message) {
            addLog(msg.agent || 'agent', msg.message, msg.status || 'info');
          }

          if (msg.status === 'pipeline_complete') {
            setIsRunning(false);
            setResult(msg);
            addLog('system', 'Career Auto-Pilot completed successfully!', 'success');
            if (onComplete) onComplete(msg);
          } else if (msg.status === 'blocked') {
            setIsRunning(false);
            setError(`ArmorIQ Shield Blocked Request: ${msg.violation?.message || 'Unauthorized tool invocation'}`);
            addLog('armoriq_shield', `BLOCKED: ${msg.violation?.requested_tool}`, 'error');
          } else if (msg.status === 'error') {
            setIsRunning(false);
            setError(msg.message || 'Pipeline execution failed');
            addLog('system', `Error: ${msg.message}`, 'error');
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection error. Please ensure backend is running.');
        setIsRunning(false);
      };

      ws.onclose = () => {
        if (isRunning) {
          setIsRunning(false);
          addLog('system', 'WebSocket connection closed', 'info');
        }
      };
    } catch (err) {
      console.error('AutoPilot launch error:', err);
      setError(err.message || 'Failed to start AutoPilot');
      setIsRunning(false);
    }
  };

  const handleDownloadPdf = async (markdownText, filename = 'Tailored_Resume.pdf') => {
    try {
      await downloadResumePdf(null, markdownText, filename);
    } catch (err) {
      alert('Failed to download PDF: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Modal Header */}
        <div className="p-5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900">Autonomous Career Auto-Pilot</h2>
                <Badge variant="primary" size="sm">WEBSOCKET STREAM</Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Multi-agent pipeline: Ingestion → Profiling → Live Scouting → ATS Ranking → PDF Tailoring
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          {/* Setup Panel (Visible when NOT running or completed) */}
          {!isRunning && !result && (
            <div className="space-y-6">
              {/* Input Mode Switcher */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  SELECT INPUT SOURCE
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => setMode('candidate')}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      mode === 'candidate'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm'
                        : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Candidate Profile</div>
                      <div className="text-[10px] text-slate-500">Mohit / Krati / Vishnu</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('file')}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      mode === 'file'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm'
                        : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Upload Resume</div>
                      <div className="text-[10px] text-slate-500">PDF or DOCX [Docling]</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('text')}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      mode === 'text'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm'
                        : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Paste Resume Text</div>
                      <div className="text-[10px] text-slate-500">Raw text / Markdown</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('url')}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      mode === 'url'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm'
                        : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <LinkIcon className="w-4 h-4 text-cyan-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Scrape URL</div>
                      <div className="text-[10px] text-slate-500">LinkedIn / Portfolio</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Mode Input Details */}
              <div className="space-y-4">
                {mode === 'candidate' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Choose Candidate for Auto-Pilot
                      </label>
                      <span className="text-xs font-bold text-indigo-600">
                        Pre-loaded with Grounded Portfolio
                      </span>
                    </div>

                    <div className="relative">
                      <select
                        value={selectedCandidateId}
                        onChange={(e) => handleCandidateSelect(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 appearance-none pr-8 cursor-pointer shadow-xs"
                      >
                        {candidatesList.length === 0 ? (
                          <option value="candidate_mohit">Mohit Prasad Upraity (AI/IoT & Full-Stack)</option>
                        ) : (
                          candidatesList.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} — {c.role} ({c.location || 'Noida, India'})
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                    </div>

                    {/* Candidate Preview Card */}
                    {selectedCandidateDetails && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs"
                              style={{ backgroundColor: selectedCandidateDetails.cluster_color || '#6366f1' }}
                            >
                              {selectedCandidateDetails.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">{selectedCandidateDetails.name}</h4>
                              <p className="text-[11px] text-slate-500">{selectedCandidateDetails.role}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{selectedCandidateDetails.location || 'Noida, India'}</span>
                          </div>
                        </div>

                        {/* Top Skills Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Skills:</span>
                          {(selectedCandidateDetails.top_skills || []).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-0.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-mono font-semibold rounded-md shadow-2xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>

                        {/* Verified Document Tag */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 text-[11px]">
                          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            Source Document: <span className="font-mono text-slate-900 font-bold">{selectedCandidateDetails.doc_name || 'Resume.pdf'}</span>
                          </span>
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Vector Grounded
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {mode === 'file' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Upload PDF Resume</label>
                    <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-6 text-center transition-all bg-slate-50/50">
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="hidden"
                        id="modal-resume-file"
                      />
                      <label htmlFor="modal-resume-file" className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">
                          {file ? file.name : 'Click to browse or drop resume file here'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Supports PDF, DOCX, TXT, MD (Powered by Docling OCR & Gemini Embeddings)
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {mode === 'text' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Paste Resume / Markdown Text
                      </label>
                      <button
                        onClick={() => setTextInput(selectedCandidateDetails?.resume_markdown || '')}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold"
                      >
                        Reset to Candidate Resume
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Paste candidate resume markdown or plain text..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    />
                  </div>
                )}

                {mode === 'url' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">
                      LinkedIn Profile, Portfolio, or Job Post URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/username or https://portfolio.dev"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Target Discovery Categories */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  OPPORTUNITY CATEGORIES TO SCOUT
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'job', label: 'Full-Time Jobs', icon: Briefcase, color: 'text-indigo-600' },
                    { id: 'internship', label: 'Internships', icon: Compass, color: 'text-emerald-600' },
                    { id: 'hackathon', label: 'Hackathons', icon: Trophy, color: 'text-amber-600' },
                    { id: 'competition', label: 'Competitions', icon: Zap, color: 'text-purple-600' },
                  ].map((cat) => {
                    const isSelected = categories.includes(cat.id);
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-400 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${cat.color}`} />
                          <span>{cat.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Running Live Orchestration Terminal & Progress */}
          {isRunning && (
            <div className="space-y-5 animate-fade-in">
              {/* Stepper Progress Bar */}
              <div className="grid grid-cols-7 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                {AGENT_STAGES.map((stg) => {
                  const isDone = currentStage > stg.id;
                  const isCurrent = currentStage === stg.id;
                  return (
                    <div
                      key={stg.id}
                      className={`p-2 rounded-xl text-center transition-all ${
                        isDone
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold'
                          : isCurrent
                          ? 'bg-indigo-600 text-white font-black shadow-md animate-pulse'
                          : 'bg-white text-slate-400 border border-slate-200'
                      }`}
                    >
                      <div className="text-[10px] font-extrabold">Stage {stg.id}</div>
                      <div className="text-[9px] truncate font-medium">{stg.name.split(' ')[0]}</div>
                    </div>
                  );
                })}
              </div>

              {/* Terminal Logs & Live Discovered Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Real-time Agent Log Output */}
                <div className="lg:col-span-8 bg-slate-900 rounded-2xl p-4 border border-slate-800 font-mono text-xs text-slate-200 h-64 overflow-y-auto space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      Multi-Agent WebSocket Telemetry
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      LIVE STREAM
                    </span>
                  </div>

                  {liveLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-slate-500 shrink-0">[{log.time}]</span>
                      <span className="text-indigo-400 font-bold shrink-0">&lt;{log.agent}&gt;</span>
                      <span
                        className={
                          log.status === 'error'
                            ? 'text-rose-400 font-bold'
                            : log.status === 'success'
                            ? 'text-emerald-300 font-bold'
                            : log.status === 'item'
                            ? 'text-cyan-300'
                            : 'text-slate-200'
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={terminalBottomRef} />
                </div>

                {/* Discovered Items Stream */}
                <div className="lg:col-span-4 bg-slate-50 rounded-2xl p-3.5 border border-slate-200 h-64 overflow-y-auto space-y-2 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] text-slate-700 pb-2 border-b border-slate-200 font-bold">
                    <span>Live Discovered ({discoveredItems.length})</span>
                    <Badge variant="primary" size="sm">Firecrawl</Badge>
                  </div>

                  {discoveredItems.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-center text-slate-400 text-xs font-medium">
                      <Search className="w-6 h-6 mb-2 animate-spin text-indigo-500" />
                      <span>Agents scouting web...</span>
                    </div>
                  ) : (
                    discoveredItems.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-0.5 shadow-2xs">
                        <div className="font-bold text-slate-900 truncate">{item.title}</div>
                        <div className="text-[11px] text-slate-500 truncate">{item.company || item.source}</div>
                        <div className="text-[10px] text-indigo-600 font-extrabold">{item.category?.toUpperCase()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AutoPilot Complete Result View */}
          {result && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Career Auto-Pilot Completed for {selectedCandidateDetails?.name || 'Candidate'}!
                    </h3>
                    <p className="text-xs text-emerald-800 font-medium">
                      Scouted {result.total_scouted || discoveredItems.length} opportunities and generated {result.tailored_resumes?.length || 2} tailored ATS resumes with pure binary PDF export.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/studio')}
                  className="btn-aesthetic-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 shrink-0"
                >
                  Open Studio <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tailored Resumes List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Generated Tailored Resumes & Downloadable PDFs
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(result.tailored_resumes || []).map((t, idx) => (
                    <GlassCard key={idx} className="p-4 bg-white border border-slate-200 space-y-3 rounded-2xl shadow-xs">
                      <div className="flex items-center justify-between">
                        <Badge variant={t.category === 'competition' ? 'warning' : 'primary'} size="sm">
                          {t.category?.toUpperCase() || 'TAILORED RESUME'}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-emerald-700">%PDF-1.4</span>
                      </div>

                      <div>
                        <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{t.target_role || 'Engineering Role'}</h5>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{t.target_company || 'Industry Partner'}</p>
                      </div>

                      <button
                        onClick={() => handleDownloadPdf(t.tailored_markdown, `${selectedCandidateDetails?.name?.replace(/\s+/g, '_') || 'Resume'}_Tailored_${t.category || idx}.pdf`)}
                        className="btn-aesthetic-primary w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </button>
                    </GlassCard>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>ArmorIQ Cryptographic Multi-Agent Token Shield Active</span>
          </div>

          <div className="flex items-center gap-2">
            {!isRunning && !result ? (
              <>
                <button
                  onClick={onClose}
                  className="btn-aesthetic-secondary text-xs py-2 px-4 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartAutoPilot}
                  className="btn-aesthetic-primary text-xs py-2 px-5 font-extrabold flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Launch Career Auto-Pilot
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="btn-aesthetic-secondary text-xs py-2 px-4 font-bold"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
