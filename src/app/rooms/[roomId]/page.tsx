// src/app/rooms/[roomId]/page.tsx

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRoomTheme, isValidRoomId } from '@/config/rooms';
import RoomPageClient from './RoomPageClient';
import type { PageProps } from '@/types/next'; // 使用你定义的类型

export default async function RoomPage({ params }: PageProps<{ roomId: string }>) {
  const { roomId } = await params;

  if (!isValidRoomId(roomId)) {
    notFound();
  }

  const roomTheme = getRoomTheme(roomId);
  if (!roomTheme) {
    notFound();
  }

  return <RoomPageClient roomTheme={roomTheme} />;
}

// 静态参数
export async function generateStaticParams() {
  return [
    { roomId: 'neutral' },
    { roomId: 'positive' },
    { roomId: 'negative' },
  ];
}

// 元数据
export async function generateMetadata(
  { params }: PageProps<{ roomId: string }>
): Promise<Metadata> {
  const { roomId } = await params;

  if (!isValidRoomId(roomId)) {
    return {
      title: 'Room Not Found',
    };
  }

  const roomTheme = getRoomTheme(roomId);

  return {
    title: `${roomTheme?.title || 'Room'} - Silver Game`,
    description: roomTheme?.description || 'Join our themed chat room',
  };
}
