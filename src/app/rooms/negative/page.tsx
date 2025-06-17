// src/app/rooms/negative/page.tsx
import Sidebar from '@/components/Sidebar';

export default function NeutralRoomPage() {
  return (
    <main className="flex">
      <Sidebar />
      <section className="flex-1 p-8 bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">🍵 茶房</h1>
        <p className="text-gray-600">欢迎来到中性交流房。你可以在这里轻松地聊天、放松、约定时间。</p>

        {/* 可添加聊天模块、互动区占位 */}
        <div className="mt-6 border border-dashed rounded-md p-8 text-center text-gray-400">
          聊天功能即将上线...
        </div>
      </section>
    </main>
  );
}
