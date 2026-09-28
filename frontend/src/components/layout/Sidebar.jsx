import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, Bot, BriefcaseBusiness, FileText, GitBranch, LayoutDashboard, LogOut, Menu, ShieldCheck, Sparkles, UserRound, Video, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import CandidateSelector from './CandidateSelector';

const groups = [
  { label: 'WORKSPACE', items: [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'AI copilot', path: '/chat', icon: Bot },
    { name: 'Opportunity radar', path: '/opportunities', icon: BriefcaseBusiness },
    { name: 'Resume studio', path: '/studio', icon: FileText },
  ] },
  { label: 'PREPARATION', items: [
    { name: 'Live interview', path: '/interview', icon: Video, live: true },
    { name: 'Documents', path: '/documents', icon: FileText },
    { name: 'Career profile', path: '/profile', icon: UserRound },
  ] },
  { label: 'INTELLIGENCE', items: [
    { name: 'Agent observatory', path: '/observatory', icon: Activity },
    { name: 'Knowledge graph', path: '/knowledge-graph', icon: GitBranch },
  ] },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initials = (user?.name || user?.email || 'U').split(/[\s@]+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return <>
    <button className="mobile-menu-button" onClick={() => setIsOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
    {isOpen && <button className="nav-scrim" onClick={() => setIsOpen(false)} aria-label="Close navigation" />}
    <aside className={`app-sidebar ${isOpen ? 'app-sidebar-open' : ''}`}>
      <div className="brand-lockup">
        <div className="brand-mark"><Sparkles size={19} strokeWidth={2.4} /></div>
        <div><strong>SkillSetu</strong><span>CAREER INTELLIGENCE</span></div>
        <button className="nav-close" onClick={() => setIsOpen(false)} aria-label="Close navigation"><X size={18} /></button>
      </div>

      <div className="candidate-switcher"><span className="eyebrow">ACTIVE PROFILE</span><CandidateSelector compact /></div>

      <nav className="sidebar-navigation" aria-label="Main navigation">
        {groups.map((group) => <section className="nav-group" key={group.label}>
          <h2>{group.label}</h2>
          {group.items.map(({ name, path, icon: Icon, live }) => <NavLink key={path} to={path} end={path === '/'} onClick={() => setIsOpen(false)} className={({ isActive }) => `nav-link ${isActive || (path === '/chat' && location.pathname === '/') ? 'nav-link-active' : ''}`}>
            <Icon size={17} strokeWidth={1.8} /><span>{name}</span>
            {live && <span className="live-indicator"><i />LIVE</span>}
            {path === '/interview' && <ArrowUpRight className="nav-trailing" size={14} />}
          </NavLink>)}
        </section>)}
      </nav>

      <div className="sidebar-footnote"><ShieldCheck size={15} /><span>Your data stays yours</span><span className="status-dot" /></div>
      <div className="sidebar-user">
        <div className="user-avatar">{initials}</div>
        <div className="user-copy"><strong>{user?.name || 'Your account'}</strong><span>{user?.email || user?.role || 'SkillSetu member'}</span></div>
        <button onClick={async () => { await logout(); navigate('/login'); }} aria-label="Sign out" title="Sign out" className="signout-button"><LogOut size={16} /></button>
      </div>
    </aside>
  </>;
}
