// src/components/home/ActivityCard.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function ActivityCard({
  icon,
  title,
  description,
  route,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  route: string;
}) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(route)}
      className="bg-white p-4 rounded-xl shadow border border-gray-100 cursor-pointer transition-all hover:scale-[1.02] hover:bg-green-50 hover:shadow-md"
    >
      <div className="text-green-500 mb-2">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
