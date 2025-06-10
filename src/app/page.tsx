// src/app/page.tsx
import Sidebar from '@/components/Sidebar';
import HomePageContent from '@/components/home/HomePageContent';

export default function HomePage() {
  return (
    <main className="flex">
      <Sidebar />
      <HomePageContent />
    </main>
  );
}
