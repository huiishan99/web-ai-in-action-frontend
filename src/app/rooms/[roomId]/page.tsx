import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRoomTheme, isValidRoomId } from '@/config/rooms';
import RoomPageClient from './RoomPageClient';

export default function RoomPage({ params }: { params: { roomId: string } }) {
  const { roomId } = params;

  if (!isValidRoomId(roomId)) {
    notFound();
  }

  const roomTheme = getRoomTheme(roomId);
  if (!roomTheme) {
    notFound();
  }

  return <RoomPageClient roomTheme={roomTheme} />;
}

export async function generateStaticParams() {
  return [
    { roomId: 'neutral' },
    { roomId: 'positive' },
    { roomId: 'negative' },
  ];
}

export async function generateMetadata(
  { params }: { params: { roomId: string } }
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
