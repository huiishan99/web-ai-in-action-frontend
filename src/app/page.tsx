// src/app/page.tsx
import Sidebar from '@/components/Sidebar';
// import HomePageContent from '@/components/home/HomePageContent';
import HomePageContentV2 from '@/components/home/HomePageContentV2';

export default function HomePage() {
  return (
    <main className="flex">
      <Sidebar />
      <HomePageContentV2 />
    </main>
  );
}
