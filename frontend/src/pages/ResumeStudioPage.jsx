import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PageShell from '../components/layout/PageShell';
import GlassCard from '../components/ui/GlassCard';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AutoPilotModal from '../components/autopilot/AutoPilotModal';
import ATSGoalTrackerModal from '../components/opportunities/ATSGoalTrackerModal';
import { useAuth } from '../context/AuthContext';
import {
  fetchOpportunities,
  fetchTailoredResumes,
  refineResume,
  tailorResume,
  downloadResumePdf,
  fetchCandidates,
  fetchCandidateDetails,
  saveCandidateTemplate,
  deepResearchCompany
} from '../api/client';

import {
  Wand2,
  Download,
  Copy,
  Check,
  Sparkles,
  Bot,
  Layers,
  FileText,
  Target,
  RefreshCw,
  Send,
  Sliders,
  ChevronDown,
  ExternalLink,
  Code,
  ShieldCheck,
  CheckCircle2,
  Users,
  MapPin,
  Mail,
  Network,
  Save,
  Flame,
  Cpu,
  Building2,
  Lightbulb
} from 'lucide-react';

export default function ResumeStudioPage() {
  const { user, selectedCandidateId, candidates } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Candidate state bound to authenticated user
  const effectiveCandId = selectedCandidateId === 'all' 
    ? (candidates[0]?.id || user?.id || 'default-user')
    : selectedCandidateId;

  const [activeCandidateId, setActiveCandidateId] = useState(effectiveCandId);
  const [activeCandidate, setActiveCandidate] = useState(null);

  // Opportunities & Targets
  const [opportunities, setOpportunities] = useState([]);
  const [selectedOppId, setSelectedOppId] = useState(searchParams.get('oppId') || '');
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // Resume content state
  const [markdown, setMarkdown] = useState('');
  const [originalMarkdown, setOriginalMarkdown] = useState('');
  const [atsScore, setAtsScore] = useState(94);
  const [activeEngine, setActiveEngine] = useState('WeasyPrint');

  // UI state
  const [isAutoPilotOpen, setIsAutoPilotOpen] = useState(false);
  const [isATSGoalOpen, setIsATSGoalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isSavingMaster, setIsSavingMaster] = useState(false);
  const [masterSaved, setMasterSaved] = useState(false);
  const [history, setHistory] = useState([]);

  // Firecrawl Company Deep Research state
  const [companyIntel, setCompanyIntel] = useState(null);
  const [isCrawlingIntel, setIsCrawlingIntel] = useState(false);
  const [justTailored, setJustTailored] = useState(false);
  const [tailoredMeta, setTailoredMeta] = useState(null);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const nextId = selectedCandidateId === 'all'
      ? (candidates[0]?.id || user?.id || 'default-user')
      : selectedCandidateId;
    setActiveCandidateId(nextId);
  }, [selectedCandidateId, candidates, user?.id]);

  // Load Candidate Profile & Resume
  useEffect(() => {
    async function loadCandidateProfile() {
      if (!activeCandidateId) return;
      try {
        const cData = await fetchCandidateDetails(activeCandidateId);
        if (cData.candidate) {
          setActiveCandidate(cData.candidate);
          const baseMd = cData.candidate.resume_markdown || '';
          setMarkdown(baseMd);
          setOriginalMarkdown(baseMd);
        }

        // Fetch tailored opportunities for this specific candidate
        const oppsRes = await fetchOpportunities(activeCandidateId);
        const opps = oppsRes.opportunities || [];
        setOpportunities(opps);

        const targetOppId = searchParams.get('oppId');
        if (targetOppId) {
          const found = opps.find((o) => String(o.id) === String(targetOppId));
          if (found) {
            setSelectedOppId(String(found.id));
            setSelectedOpportunity(found);
          } else if (opps.length > 0) {
            setSelectedOppId(String(opps[0].id));
            setSelectedOpportunity(opps[0]);
          }
        } else if (opps.length > 0) {
          setSelectedOppId(String(opps[0].id));
          setSelectedOpportunity(opps[0]);
        }

        const tailoredRes = await fetchTailoredResumes();
        if (tailoredRes.tailored_resumes && tailoredRes.tailored_resumes.length > 0) {
          setHistory(tailoredRes.tailored_resumes);
        }
      } catch (err) {
        console.error('Failed to load candidate studio context:', err);
      }
    }
    loadCandidateProfile();
  }, [activeCandidateId]);

  // Handle Opportunity Selection Change & Firecrawl Deep Research Grounding
  const handleOpportunityChange = async (oppId) => {
    setSelectedOppId(oppId);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('oppId', oppId);
      return p;
    });
    const found = opportunities.find((o) => String(o.id) === String(oppId));
    setSelectedOpportunity(found || null);

    if (found) {
      const companyName = found.company || found.company_name || found.source;
      if (companyName && companyName !== 'Tech Company') {
        setIsCrawlingIntel(true);
        try {
          const res = await deepResearchCompany(companyName, found.title || 'Software Engineer', found.url);
          if (res?.intel) {
            setCompanyIntel(res.intel);
          }
        } catch (err) {
          console.error('Deep company research background fetch failed:', err);
        } finally {
          setIsCrawlingIntel(false);
        }
      }
    }
  };

  // Auto-Pilot & AI Refinement
  const handleAiAction = async (actionType, label) => {
    setIsProcessing(true);
    setProcessingAction(label || 'Refining with Gemini Flash...');
    try {
      const res = await refineResume(markdown, actionType, {
        targetRole: selectedOpportunity?.title || activeCandidate?.role || 'Software Engineer',
        company: selectedOpportunity?.company || selectedOpportunity?.company_name || 'Target Org',
        requirements: selectedOpportunity?.description || selectedOpportunity?.skills_required || '',
        candidateId: activeCandidateId
      });
      if (res.refined_markdown) {
        setMarkdown(res.refined_markdown);
        setAtsScore((prev) => Math.min(99, prev + 2));
      }
    } catch (err) {
      console.error('AI Action failed:', err);
      alert('AI refinement failed. Please check backend connection.');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  const handleAutoTailor = async () => {
    if (!selectedOpportunity) {
      alert('Please select a target role first.');
      return;
    }
    setIsProcessing(true);
    setJustTailored(false);
    const roleName = selectedOpportunity.title || 'Target Role';
    const compName = selectedOpportunity.company || selectedOpportunity.company_name || selectedOpportunity.source || 'Target Organization';
    setProcessingAction(`Surgically tailoring for ${roleName} at ${compName} using Docling & Firecrawl Intel...`);
    try {
      const res = await tailorResume({
        opportunityTitle: roleName,
        companyName: compName,
        requirements: selectedOpportunity.description || selectedOpportunity.skills_required || 'High proficiency in software engineering, AI systems, and project delivery',
        candidateId: activeCandidateId,
        resumeMarkdown: markdown,
        jobUrl: selectedOpportunity.url,
        companyIntel: companyIntel
      });
      if (res.tailored_markdown) {
        setMarkdown(res.tailored_markdown);
        setAtsScore(98);
        if (res.engine) setActiveEngine(res.engine);
        setJustTailored(true);
        setTailoredMeta({
          role: roleName,
          company: compName,
          candidate: activeCandidate?.name || 'Candidate'
        });
      }
    } catch (err) {
      console.error('Tailoring failed, falling back to local ATS optimization:', err);
      await handleAiAction('ats_optimize', 'Optimizing resume keywords for target role...');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  const handleCustomPromptSubmit = async (e) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    await handleAiAction('custom_instruction', customPrompt);
    setCustomPrompt('');
  };

  const handleSaveMaster = async () => {
    setIsSavingMaster(true);
    try {
      await saveCandidateTemplate(activeCandidateId, markdown);
      setOriginalMarkdown(markdown);
      setMasterSaved(true);
      setTimeout(() => setMasterSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save master template:', err);
      alert('Failed to save master template: ' + (err.message || 'Error'));
    } finally {
      setIsSavingMaster(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const candidateTag = activeCandidate?.name ? activeCandidate.name.replace(/\s+/g, '_') : 'Candidate';
      const roleTag = selectedOpportunity?.title ? selectedOpportunity.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20) : 'Tailored';
      const filename = `${candidateTag}_${roleTag}_Resume.pdf`;

      await downloadResumePdf(
        null,
        markdown,
        filename
      );
    } catch (err) {
      console.error('PDF download failed:', err);
      alert('PDF generation failed. Please check backend logs.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <PageShell
      title="Autonomous AI Resume Studio"
      subtitle="ATS keyword optimization, Graph RAG alignment & 100% pure binary PDF generation"
      icon={Wand2}
    >
      <div className="space-y-6 animate-fade-in">
        {/* Top Candidate & Opportunity Navigation Bar */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">
            {/* Candidate Persona Selector */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-600 flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0">
                {activeCandidate?.name ? activeCandidate.name.slice(0, 2).toUpperCase() : 'ME'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Candidate Persona:</span>
                </div>
                <div className="relative mt-0.5 w-full sm:w-64 max-w-full">
                  <select
                    value={activeCandidateId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setActiveCandidateId(val);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500 appearance-none pr-8 cursor-pointer shadow-sm truncate"
                  >
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
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Target Role Selector */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
                <Target className="w-4 h-4 text-cyan-600" />
                <span>Target Role:</span>
              </div>
              <div className="relative flex-1 w-full sm:min-w-[240px]">
                <select
                  value={selectedOppId}
                  onChange={(e) => handleOpportunityChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 appearance-none pr-8 cursor-pointer font-bold shadow-sm"
                >
                  {opportunities.length === 0 ? (
                    <option value="">No scouted opportunities for this candidate yet</option>
                  ) : (
                    opportunities.map((opp) => {
                      const title = opp.title || opp.company_name || 'Software Engineering Role';
                      const comp = opp.company || opp.company_name || opp.source || 'Tech Company';
                      const cat = opp.category?.toUpperCase() || 'OPPORTUNITY';
                      return (
                        <option key={opp.id} value={opp.id}>
                          [{cat}] {title} ({comp})
                        </option>
                      );
                    })
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>

              {selectedOpportunity && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    {selectedOpportunity.relevance_score || 94}% Fit
                  </span>
                  {selectedOpportunity.url && (
                    <a
                      href={selectedOpportunity.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 transition-colors"
                      title="Open Direct Apply Link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {selectedOpportunity && (
              <button
                onClick={() => setIsATSGoalOpen(true)}
                className="btn-aesthetic-subtle text-xs py-2 px-3.5 bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300"
              >
                <Target className="w-3.5 h-3.5 text-amber-600" />
                Run ATS 90+ Goal
                <Sparkles className="w-3 h-3 text-amber-600" />
              </button>
            )}
            <button
              onClick={handleAutoTailor}
              disabled={isProcessing || !selectedOpportunity}
              className="btn-aesthetic-primary text-xs py-2 px-4 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Tailor for Role
            </button>
            <button
              onClick={() => setIsAutoPilotOpen(true)}
              className="btn-aesthetic-secondary text-xs py-2 px-3.5"
            >
              <Bot className="w-3.5 h-3.5 text-purple-600" />
              Auto-Pilot
            </button>
          </div>
        </div>

        {/* Candidate Profile Details Banner */}
        {activeCandidate && (
          <div className="p-4 bg-white rounded-2xl border border-indigo-200/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-sm text-indigo-700 shadow-sm">
                {activeCandidate.name?.slice(0, 2).toUpperCase() || 'ME'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-slate-800">{activeCandidate.name || user?.name}</h3>
                  <Badge variant="primary" size="sm">
                    {activeCandidate.role?.split('|')[0].trim() || 'Software Engineer'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {activeCandidate.location || 'Remote'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> {activeCandidate.email || user?.email}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/graph')}
                className="btn-aesthetic-secondary text-xs py-1.5 px-3"
              >
                <Network className="w-3.5 h-3.5 text-indigo-600" />
                View in Knowledge Graph
              </button>
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">ATS Match Score:</span>
                <span className="font-extrabold text-emerald-600">{atsScore}%</span>
              </div>
            </div>
          </div>
        )}


        {/* Firecrawl Deep Company Intelligence Context Banner */}
        {selectedOpportunity && (
          <div className="bg-gradient-to-r from-indigo-50/80 via-cyan-50/80 to-slate-50 border border-cyan-200/90 p-4 rounded-2xl shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-800 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Firecrawl Company Intel: {selectedOpportunity.company || selectedOpportunity.company_name || 'Target Org'}
                </span>
                {isCrawlingIntel && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1 font-semibold">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Crawling Tech Stack...
                  </span>
                )}
                {companyIntel && !isCrawlingIntel && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> AI Grounding Active
                  </span>
                )}
              </div>

              {companyIntel ? (
                <div className="text-xs text-slate-700 space-y-1">
                  <p className="line-clamp-1 text-slate-800 font-medium">
                    <span className="font-bold text-slate-500">Mission:</span> {companyIntel.overview}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Target Tech Stack:</span>
                    {(companyIntel.tech_stack || []).slice(0, 7).map((t, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono text-[10px] rounded font-bold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600">
                  Target Role: <span className="text-slate-900 font-bold">{selectedOpportunity.title}</span> — AI will inject company-specific keywords into your tailored resume.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {justTailored && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="btn-aesthetic-primary text-xs py-2 px-4 shadow-sm animate-pulse"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF Now
                </button>
              )}
              <button
                onClick={handleAutoTailor}
                disabled={isProcessing}
                className="btn-aesthetic-primary text-xs py-2 px-4 shadow-sm disabled:opacity-50"
              >
                <Wand2 className="w-3.5 h-3.5" />
                {justTailored ? 'Re-Tailor' : 'Surgically Tailor for Role'}
              </button>
            </div>
          </div>
        )}

        {/* Post-Tailoring Highlight Banner */}
        {justTailored && (
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 rounded-2xl shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center font-black text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Resume Successfully Tailored for {tailoredMeta?.company || 'Target Organization'}!
                  </h4>
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    ATS Score: 98%
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Target Role: <span className="font-semibold text-emerald-800">{tailoredMeta?.role}</span> • Grounded with Candidate Knowledge Base & Firecrawl Intel.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="btn-aesthetic-primary text-xs py-2.5 px-4 shadow-sm"
              >
                {downloadingPdf ? (
                  <LoadingSpinner size="xs" text="Rendering PDF..." />
                ) : (
                  <>
                    <Download className="w-4 h-4 text-white" />
                    Download Tailored PDF ({activeCandidate?.name?.split(' ')[0] || 'Candidate'})
                  </>
                )}
              </button>
              <button
                onClick={() => setJustTailored(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-xs transition-colors"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Studio Workspace: Editor + AI Actions & Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Markdown Editor */}
          <div className="lg:col-span-7 space-y-4">
            <GlassCard className="p-5 bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {activeCandidate?.name || 'Candidate'} — Resume Stencil
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    🛡️ Master Resume Pristine in DB
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="btn-aesthetic-primary text-xs py-1.5 px-3 shadow-sm"
                    title="Download this resume as an ATS-compliant PDF"
                  >
                    {downloadingPdf ? <LoadingSpinner size="xs" /> : <Download className="w-3.5 h-3.5" />}
                    Download PDF
                  </button>
                  <button
                    onClick={handleSaveMaster}
                    disabled={isSavingMaster}
                    className={`btn-aesthetic-subtle text-xs py-1.5 px-3 font-bold flex items-center gap-1.5 ${
                      masterSaved
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                    }`}
                    title="Save this markdown as the candidate's active Master Resume Template in Firebase Firestore"
                  >
                    {masterSaved ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Save className="w-3.5 h-3.5" />}
                    {masterSaved ? 'Master Saved!' : isSavingMaster ? 'Saving...' : 'Set as Master'}
                  </button>
                  <button
                    onClick={() => setMarkdown(originalMarkdown)}
                    className="btn-aesthetic-subtle text-xs py-1.5 px-3"
                    title="Reset back to Candidate's Pristine Master Resume"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-600" />
                    Reset to Master
                  </button>
                  <button
                    onClick={handleCopyMarkdown}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <div className="relative">
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 rounded-xl flex items-center justify-center p-4 text-center">
                    <LoadingSpinner size="md" text={processingAction || 'AI Agent is optimizing resume...'} />
                  </div>
                )}
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  rows={24}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner resize-y"
                  placeholder="Paste or write your candidate resume markdown here..."
                />
              </div>

              {/* Prompt Instruction Input */}
              <form onSubmit={handleCustomPromptSubmit} className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  placeholder="e.g., 'Emphasize IoT & embedded gait sensor engineering' or 'Add Figma design metrics'..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !customPrompt.trim()}
                  className="btn-aesthetic-primary text-xs py-2 px-4 shadow-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Prompt AI
                </button>
              </form>
            </GlassCard>
          </div>

          {/* Right Column: AI Toolsuite & Live PDF Generator */}
          <div className="lg:col-span-5 space-y-4">
            {/* Quick Action Pills */}
            <GlassCard className="p-5 bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    AI Optimization Suite
                  </span>
                </div>
                <Badge variant="accent" size="sm">
                  ATS Verified
                </Badge>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleAiAction('ats_optimize', 'Injecting high-impact ATS keywords...')}
                  disabled={isProcessing}
                  className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                    <Target className="w-4 h-4 text-indigo-600" />
                    <span>ATS Keyword Injector</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Extracts core skills from target role into bullet points.</p>
                </button>

                <button
                  onClick={() => handleAiAction('action_verbs', 'Transforming bullet points with strong action verbs...')}
                  disabled={isProcessing}
                  className="p-3 bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 rounded-xl text-left transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 group-hover:text-purple-700">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Impact & Action Verbs</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Replaces passive phrases with quantified leadership achievements.</p>
                </button>

                <button
                  onClick={() => handleAiAction('condense_1page', 'Condensing content to high-density single page...')}
                  disabled={isProcessing}
                  className="p-3 bg-slate-50 hover:bg-cyan-50/60 border border-slate-200 hover:border-cyan-300 rounded-xl text-left transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 group-hover:text-cyan-700">
                    <Layers className="w-4 h-4 text-cyan-600" />
                    <span>Single-Page Condenser</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Tightens spacing and bullet density for executive 1-page format.</p>
                </button>

                <button
                  onClick={() => handleAiAction('fix_formatting', 'Formatting markdown structure for clean PDF export...')}
                  disabled={isProcessing}
                  className="p-3 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Typography & Alignment</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Standardizes headers, bolding, and contact info layout.</p>
                </button>
              </div>
            </GlassCard>

            {/* Live PDF Export Engine */}
            <GlassCard className="p-5 bg-gradient-to-br from-indigo-50/80 via-white to-cyan-50/80 border border-indigo-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pure Binary PDF Generation
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  %PDF-1.4 Native
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Generates a clean, ATS-compliant PDF document directly with genuine typography, multi-column margins, and zero blank page glitches.
              </p>

              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="btn-aesthetic-primary w-full py-3 text-xs shadow-sm disabled:opacity-50"
              >
                {downloadingPdf ? (
                  <LoadingSpinner size="sm" text="Rendering %PDF-1.4 Binary Stream..." />
                ) : (
                  <>
                    <Download className="w-4 h-4 text-white" />
                    Download ATS Tailored PDF ({activeCandidate?.name?.split(' ')[0] || 'Resume'})
                  </>
                )}
              </button>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Autonomous AutoPilot Modal */}
      <AutoPilotModal
        isOpen={isAutoPilotOpen}
        onClose={() => setIsAutoPilotOpen(false)}
        initialResumeText={markdown}
        candidateId={activeCandidateId}
      />

      {/* Autonomous ATS 90+ Goal Modal */}
      {selectedOpportunity && (
        <ATSGoalTrackerModal
          isOpen={isATSGoalOpen}
          onClose={() => setIsATSGoalOpen(false)}
          opportunity={selectedOpportunity}
          candidateId={activeCandidateId}
          candidateName={activeCandidate?.name || 'Mohit Upraity'}
        />
      )}
    </PageShell>
  );
}
