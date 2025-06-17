// src/components/rooms/RoomCard.tsx
'use client';

import { useRouter } from 'next/navigation';

interface RoomCardProps {
  id: string;
  title: string;
  description: string;
  color: string;
}

export default function RoomCard({ id, title, description, color }: RoomCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/rooms/${id}`)}
      className={`p-6 rounded-xl shadow-md cursor-pointer hover:scale-105 transition transform ${color}`}
    >
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-gray-700">{description}</p>
    </div>
  );
}
