// src/app/rooms/[roomId]/page.tsx
import { notFound } from 'next/navigation';
import { Metadata, ResolvingMetadata } from 'next';
import { getRoomTheme, isValidRoomId } from '@/config/rooms';
import RoomPageClient from './RoomPageClient';

// 使用 Next.js 提供的标准类型
export interface RoomPageProps {
  params: {
    roomId: string;
  };
}

export default function RoomPage({ params }: RoomPageProps) {
  const { roomId } = params;

  // 验证房间ID是否有效
  if (!isValidRoomId(roomId)) {
    notFound();
  }

  // 获取房间主题配置
  const roomTheme = getRoomTheme(roomId);

  // 如果配置不存在，显示404
  if (!roomTheme) {
    notFound();
  }

  return <RoomPageClient roomTheme={roomTheme} />;
}

// 生成静态参数（用于静态生成）
export async function generateStaticParams() {
  return [
    { roomId: 'neutral' },
    { roomId: 'positive' },
    { roomId: 'negative' },
  ];
}

// 正确标注元数据生成函数的类型
export async function generateMetadata(
  { params }: RoomPageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { roomId } = params;

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
