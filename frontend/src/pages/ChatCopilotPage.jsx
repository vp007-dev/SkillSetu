import { Bot } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import ChatInterface from '../components/chat/ChatInterface';

export default function ChatCopilotPage() {
  return <PageShell title="AI copilot" subtitle="A career assistant grounded in your profile and source documents" icon={Bot}>
    <ChatInterface />
  </PageShell>;
}
