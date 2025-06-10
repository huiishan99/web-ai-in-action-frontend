// src/app/community/page.tsx
import Sidebar from '@/components/Sidebar';
import ChatBox from '@/components/chat/ChatBox';

export default function CommunityPage() {
  return (
    <main className="flex">
      <Sidebar />
      <ChatBox />
    </main>
  );
}
