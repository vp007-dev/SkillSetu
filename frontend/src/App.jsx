import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import { fetchStats } from './api/client';
const ChatCopilotPage = lazy(() => import('./pages/ChatCopilotPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const OpportunityPage = lazy(() => import('./pages/OpportunityPage'));
const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage'));
const ObservatoryPage = lazy(() => import('./pages/ObservatoryPage'));
const KnowledgeGraphPage = lazy(() => import('./pages/KnowledgeGraphPage'));
const ResumeStudioPage = lazy(() => import('./pages/ResumeStudioPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const InterviewRoomPage = lazy(() => import('./pages/InterviewRoomPage'));

function AppLayout() {
  const [stats, setStats] = useState({ total_documents: 0, total_profiles: 0 });
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats().then(setStats).catch(console.error);
    }
  }, [isAuthenticated]);

  return (
    <div className="app-frame">
      <Sidebar stats={stats} />
      <main id="main-content" className="app-main">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <Suspense fallback={<div className="route-loading" role="status"><span className="route-loader" />Loading workspace</div>}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><ChatPage stats={stats} /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatCopilotPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/studio" element={<ProtectedRoute><ResumeStudioPage /></ProtectedRoute>} />
          <Route path="/resume-studio" element={<ProtectedRoute><ResumeStudioPage /></ProtectedRoute>} />
          <Route path="/opportunities" element={<ProtectedRoute><OpportunitiesPage /></ProtectedRoute>} />
          <Route path="/interview" element={<ProtectedRoute><InterviewRoomPage /></ProtectedRoute>} />
          <Route path="/interview/:id" element={<ProtectedRoute><InterviewRoomPage /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
          <Route path="/opportunity/:id" element={<ProtectedRoute><OpportunityPage /></ProtectedRoute>} />
          <Route path="/observatory" element={<ProtectedRoute><ObservatoryPage /></ProtectedRoute>} />
          <Route path="/knowledge-graph" element={<ProtectedRoute><KnowledgeGraphPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="auth-loading" role="status"><span className="route-loader" />Opening SkillSetu</div>}><Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes></Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

