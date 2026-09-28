import { ArrowDownRight, ArrowRight, ArrowUpRight, AudioLines, Bot, BriefcaseBusiness, Check, ChevronRight, CircleDashed, FileText, Fingerprint, Gauge, ShieldCheck, Sparkles, Waypoints } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const workflows = [
  { title: 'Find your next move', description: 'Discover roles that fit your experience and goals.', path: '/opportunities', icon: BriefcaseBusiness, tag: 'DISCOVER', tone: 'violet' },
  { title: 'Make your resume count', description: 'Tailor your story to the role you actually want.', path: '/studio', icon: FileText, tag: 'BUILD', tone: 'lime' },
  { title: 'Practice out loud', description: 'Meet your AI interviewer in a live voice session.', path: '/interview', icon: AudioLines, tag: 'REHEARSE', tone: 'blue' },
];

export default function ChatPage({ stats = {} }) {
  const { user, activeCandidate, candidates = [] } = useAuth();
  const candidate = activeCandidate || candidates[0];
  const name = candidate?.name || user?.name?.split(' ')[0] || 'there';
  const skills = candidate?.skills || candidate?.tech_stack || [];

  return <div className="overview-page">
    <header className="overview-topbar"><div className="breadcrumb"><span>WORKSPACE</span><ChevronRight size={13} /><strong>Overview</strong></div><div className="topbar-right"><span className="topbar-date">SKILLSETU · PERSONAL INTELLIGENCE</span></div></header>

    <section className="overview-hero">
      <div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" />
      <div className="hero-copy">
        <div className="hero-kicker"><Sparkles size={13} /> YOUR CAREER, IN MOTION</div>
        <h1 aria-label={`Career overview for ${name}`}>Make your next move<br /><span>your best one.</span></h1>
        <p>Your experience is the starting point. SkillSetu brings the research, preparation, and momentum to help you move forward.</p>
        <div className="hero-actions"><Link to="/opportunities" className="hero-primary">Explore opportunities <ArrowRight size={16} /></Link><Link to="/studio" className="hero-secondary">Shape my resume <ArrowUpRight size={15} /></Link></div>
      </div>
      <div className="hero-profile-card">
        <div className="profile-orbit"><div className="orbit-ring orbit-ring-outer"/><div className="orbit-ring orbit-ring-inner"/><div className="orbit-core"><Fingerprint size={28} /></div><span className="orbit-node node-one"/><span className="orbit-node node-two"/><span className="orbit-node node-three"/></div>
        <div className="profile-card-caption"><span className="profile-card-label">YOUR CAREER GRAPH</span><span className="profile-card-value"><i /> Profile intelligence</span></div>
      </div>
      <div className="hero-index">01 <span>/</span> 04</div>
    </section>

    <section className="overview-metrics" aria-label="Your workspace at a glance">
      <div className="metric-cell"><span className="metric-icon metric-violet"><Fingerprint size={16} /></span><div><strong>{candidates.length || 0}</strong><span>Career profile{candidates.length === 1 ? '' : 's'}</span></div><small>Your perspective</small></div>
      <div className="metric-cell"><span className="metric-icon metric-lime"><FileText size={16} /></span><div><strong>{stats.total_documents || 0}</strong><span>Source documents</span></div><small>Your foundation</small></div>
      <div className="metric-cell"><span className="metric-icon metric-blue"><Waypoints size={16} /></span><div><strong>{skills.length}</strong><span>Profiled strengths</span></div><small>{skills.length ? 'From your experience' : 'Add a resume to begin'}</small></div>
      <Link to="/observatory" className="metric-cell metric-link"><span className="metric-icon metric-peach"><Gauge size={16} /></span><div><strong>Explore</strong><span>Agent observatory</span></div><small>See your AI at work <ArrowUpRight size={12} /></small></Link>
    </section>

    <section className="workflow-section"><div className="section-heading"><div><span className="eyebrow">A LITTLE MOMENTUM GOES A LONG WAY</span><h2>Pick up where you want to go.</h2></div><span className="section-aside">YOUR NEXT STEPS <ArrowDownRight size={14} /></span></div>
      <div className="workflow-grid">{workflows.map(({ title, description, path, icon: Icon, tag, tone }, index) => <Link to={path} key={path} className={`workflow-card workflow-${tone}`}><div className="workflow-card-top"><span className="workflow-icon"><Icon size={19} /></span><span className="workflow-tag">0{index + 1} / {tag}</span></div><h3>{title}</h3><p>{description}</p><div className="workflow-card-bottom"><span>Open workspace</span><span className="workflow-arrow"><ArrowUpRight size={15} /></span></div></Link>)}</div>
    </section>

    <section className="grounding-strip"><div className="grounding-mark"><Bot size={19} /></div><div className="grounding-copy"><span className="eyebrow">YOUR AI COPILOT</span><h2>A second brain for the next step.</h2><p>Ask for advice grounded in your own career profile and uploaded documents.</p></div><Link to="/chat" className="grounding-link">Start a conversation <ArrowRight size={15} /></Link><div className="grounding-proof"><span><Check size={12} /> Profile aware</span><span><Check size={12} /> Source grounded</span><span><CircleDashed size={12} /> Ready when you are</span></div></section>

      <footer className="overview-footer"><span>Designed around your next chapter.</span><span><ShieldCheck size={13} /> SKILLSETU INTELLIGENCE</span></footer>
  </div>;
}
