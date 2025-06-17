// src/components/home/HomePageContentV2.tsx
'use client';

import RoomCard from '@/components/rooms/RoomCard';
import AIChatBox from '@/components/chat/AIChatBox';

const rooms = [
  {
    id: 'neutral',
    title: 'Neutral 茶房',
    description: '来一杯茶，静静说话',
    color: 'bg-gray-100',
  },
  {
    id: 'positive',
    title: 'Positive KTV',
    description: '分享好消息 🎤',
    color: 'bg-yellow-100',
  },
  {
    id: 'negative',
    title: 'Negative 冥想室',
    description: '倾诉与治愈 🌙',
    color: 'bg-blue-100',
  },
];

export default function HomePageContentV2() {
  return (
    <section className="flex-1 p-6 grid grid-cols-2 gap-6 bg-[#f9fafb]">
      {/* 左侧：主题房 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">选择一个主题交流房</h2>
        <div className="grid grid-cols-1 gap-4">
          {rooms.map((room) => (
            <RoomCard key={room.id} {...room} />
          ))}
        </div>
      </div>

      {/* 右侧：AI 聊天框 */}
      <div className="bg-white rounded-xl shadow-md p-4 flex flex-col justify-between h-[500px]">
        <h2 className="text-xl font-bold text-gray-800 mb-2">AI 助手</h2>
        <AIChatBox />
      </div>
    </section>
  );
}
