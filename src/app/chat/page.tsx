// src/app/chat/page.tsx
import Sidebar from '@/components/Sidebar';
import ChatBox from '@/components/chat/ChatBox';

export default function ChatPage() {
  return (
    <main className="flex">
      <Sidebar />
      <ChatBox />
    </main>
  );
}
