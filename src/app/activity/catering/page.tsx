// src/app/activity/catering/page.tsx
import Sidebar from '@/components/Sidebar';

export default function CateringPage() {
  return (
    <main className="flex">
      <Sidebar />
      <section className="flex-1 p-8">
        <h1 className="text-2xl font-bold">Catering 活动页面</h1>
        <p>这里可以放详细介绍或组件。</p>
      </section>
    </main>
  );
}
