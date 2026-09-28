import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Building2, ArrowRight, ExternalLink, Wand2, Sparkles, Clock, CheckCircle2, Target, Video } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import Badge from '../ui/Badge';
import ScoreGauge from '../ui/ScoreGauge';
import { useAuth } from '../../context/AuthContext';

export default function OpportunityCard({ opportunity, onClick, candidateId = 'candidate_mohit' }) {
  const navigate = useNavigate();
  const { candidates, activeCandidate } = useAuth();
  if (!opportunity) return null;

  const matchedCand = candidates?.find(c => c.id === opportunity.matched_candidate_id || c.user_id === opportunity.matched_candidate_id) || activeCandidate;
  const rawName = opportunity.matched_candidate_name || matchedCand?.name || 'Candidate';
  const firstName = rawName.split(' ')[0];
  const clusterColor = matchedCand?.cluster_color || '#818cf8';

  const getCategoryBadgeVariant = (category) => {
    switch (category?.toLowerCase()) {
      case 'job': return 'primary';
      case 'internship': return 'success';
      case 'hackathon': return 'warning';
      case 'competition': return 'danger';
      case 'conclave': return 'info';
      default: return 'secondary';
    }
  };

  const handleOpenInStudio = (e) => {
    e.stopPropagation();
    const cand = opportunity.matched_candidate_id || candidateId || 'candidate_mohit';
    navigate(`/studio?candidateId=${cand}&oppId=${opportunity.id}`);
  };

  const handleOpenInterview = (e) => {
    e.stopPropagation();
    const cand = opportunity.matched_candidate_id || candidateId || 'candidate_mohit';
    navigate(`/interview?company=${encodeURIComponent(opportunity.company || opportunity.company_name || 'Tech Organization')}&role=${encodeURIComponent(opportunity.title || 'Software Engineer')}&candidateId=${cand}&oppId=${opportunity.id}`);
  };

  return (
    <GlassCard 
      hover 
      onClick={() => onClick && onClick(opportunity)}
      className="cursor-pointer group flex flex-col justify-between h-full bg-white border border-slate-200 hover:border-indigo-300 transition-all duration-200 shadow-xs hover:shadow-md rounded-2xl p-5"
      padding="none"
    >
      <div className="flex flex-col flex-1">
        {/* Header Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={getCategoryBadgeVariant(opportunity.category)} size="sm">
              {opportunity.category?.toUpperCase() || 'OPPORTUNITY'}
            </Badge>
            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {opportunity.application_status || 'Actively Hiring'}
            </span>
          </div>

          {firstName && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-200 bg-indigo-50/80 text-indigo-700 font-mono shadow-2xs shrink-0">
              {firstName} Match
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-black text-slate-900 mb-3 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
          {opportunity.title}
        </h3>

        {/* Metadata Details */}
        <div className="space-y-2 mb-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
            <Building2 className="w-4 h-4 shrink-0 text-indigo-600" />
            <span className="truncate">{opportunity.company || opportunity.company_name || 'Tech Organization'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
            <span className="truncate">{opportunity.location || 'Remote / Hybrid'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-800 font-bold">
            <Clock className="w-4 h-4 shrink-0 text-amber-500" />
            <span>Deadline: {opportunity.deadline || 'Open / Rolling'}</span>
          </div>
        </div>

        {/* Candidate Interest Alignment Pill */}
        {opportunity.interest_alignment && (
          <div className="mb-4 p-2.5 bg-indigo-50/40 border border-indigo-100 rounded-xl flex items-start gap-2">
            <Target className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span className="text-xs text-slate-700 leading-snug font-medium">
              <span className="font-bold text-indigo-900">Aligned Interest: </span>
              {opportunity.interest_alignment}
            </span>
          </div>
        )}
      </div>

      {/* Action Strip Footer */}
      <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 mt-auto gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <ScoreGauge score={opportunity.relevance_score || 85} size={36} strokeWidth={3.5} />
          <div className="flex flex-col">
            <span className="text-xs font-extrabold text-slate-900">Vector Fit</span>
            {opportunity.semantic_cosine_similarity && (
              <span className="text-[10px] font-mono text-indigo-600 font-bold">
                cos: {opportunity.semantic_cosine_similarity}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleOpenInterview}
            className="btn-aesthetic-secondary text-[11px] py-1.5 px-2.5 font-bold flex items-center gap-1"
            title="Take Real-Time AI Interview"
          >
            <Video className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden xs:inline">Interview</span>
          </button>
          {opportunity.url && (
            <a
              href={opportunity.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 transition-colors"
              title="Direct Apply Link"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={handleOpenInStudio}
            className="btn-aesthetic-primary text-[11px] py-1.5 px-3 font-extrabold flex items-center gap-1"
            title="Open & Tailor Resume for this Role"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Tailor
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

