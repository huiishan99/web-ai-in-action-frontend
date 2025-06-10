// src/app/study/page.tsx
import Sidebar from '@/components/Sidebar';
import VirtualSpaceSelector from '@/components/virtual/VirtualSpaceSelector';

export default function StudyPage() {
  return (
    <main className="flex">
      <Sidebar />
      <section className="flex-1 p-8 bg-[#f9fafb]">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Virtual Space</h1>
        <VirtualSpaceSelector />
      </section>
    </main>
  );
}
