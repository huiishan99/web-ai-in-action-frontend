// src/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Users, User } from 'lucide-react';
import MicAssistant from './MicAssistant'; // ✅ 添加引用

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 h-screen bg-gradient-to-b from-blue-100 to-white p-4 flex flex-col items-center shadow-md">
      {/* 头像与菜单部分 */}
      <div className="mb-8 text-center">
        <img
          src="/avatars/avatar.jpg"
          alt="User Avatar"
          className="w-16 h-16 rounded-full mx-auto"
        />
        <h2 className="mt-2 text-sm text-gray-700 font-semibold">
          Good morning,<br />
          <span className="text-black font-bold">Nikta</span>
        </h2>
      </div>

      <nav className="w-full space-y-4 mb-auto">
        <SidebarItem icon={<Home size={20} />} label="Home" href="/" active={pathname === '/new-home'} />
        <SidebarItem icon={<BookOpen size={20} />} label="Study" href="/study" active={pathname === '/study'} />
        <SidebarItem icon={<Users size={20} />} label="Community" href="/community" active={pathname === '/community'} />
        <SidebarItem icon={<User size={20} />} label="Me" href="/me" active={pathname === '/me'} />
      </nav>

      {/* ✅ 底部语音识别按钮 */}
      <MicAssistant />
    </aside>
  );
}

function SidebarItem({
  icon,
  label,
  href,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <div
        className={`flex items-center px-4 py-2 rounded-md shadow-sm hover:bg-blue-50 cursor-pointer transition
          ${active ? 'bg-white text-blue-700 font-semibold' : 'bg-white text-gray-700'}`}
      >
        <div className="mr-3">{icon}</div>
        <span className="text-sm font-medium">{label}</span>
      </div>
    </Link>
  );
}
