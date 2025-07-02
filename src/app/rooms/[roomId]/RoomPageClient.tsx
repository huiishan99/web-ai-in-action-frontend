// src/app/rooms/[roomId]/RoomPageClient.tsx
'use client';

import dynamic from 'next/dynamic';
import { RoomTheme } from '@/types/room';

// 动态导入 RoomCall 组件，避免 SSR 问题
const RoomCall = dynamic(() => import('@/components/RoomCall'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">正在加载房间...</p>
      </div>
    </div>
  )
});

interface RoomPageClientProps {
  roomTheme: RoomTheme;
}

export default function RoomPageClient({ roomTheme }: RoomPageClientProps) {
  return <RoomCall roomTheme={roomTheme} />;
}