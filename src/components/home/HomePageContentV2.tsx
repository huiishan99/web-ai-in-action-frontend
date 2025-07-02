// src/components/home/HomePageContentV2.tsx
'use client';
import RoomCard from '@/components/rooms/RoomCard';
import AIChatBox from '@/components/chat/AIChatBox';
import { getAllRooms } from '@/config/rooms';
import React from "react";

export default function HomePageContentV2() {
  // 从统一配置获取房间数据
  const rooms = getAllRooms();

  return (
    <section className="flex-1 p-6 grid grid-cols-2 gap-6 bg-[#f9fafb]">
      {/* Left side: Theme rooms */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Choose a Theme Chat Room</h2>
        <div className="grid grid-cols-1 gap-4">
          {rooms.map((room) => (
            <RoomCard key={room.id} {...room} />
          ))}
        </div>
      </div>

      {/* Right side: AI Chat Box */}
      <div className="bg-white rounded-xl shadow-md p-4 flex flex-col h-[500px]">
        <h2 className="text-xl font-bold text-gray-800 mb-4">AI Chat Assistant</h2>
        <div className="flex-1">
          <AIChatBox
            geminiApiKey={process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''}
          />
          {/* 移除了 FloatingVideoButton，因为每个房间都有独立的视频通话功能 */}
        </div>
      </div>
    </section>
  );
}