// src/app/emotion/page.tsx
import Sidebar from '@/components/Sidebar';
import EmotionMeter from '@/components/emotion/EmotionMeter';
import PreferenceSlider from '@/components/emotion/PreferenceSlider';

export default function EmotionPage() {
  return (
    <main className="flex">
      <Sidebar />
      <section className="flex-1 p-8 bg-[#f9fafb]">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Emotion Overview</h1>

        <div className="grid grid-cols-2 gap-8">
          {/* 左边：情绪仪表盘 */}
          <div className="bg-white p-6 rounded-xl shadow">
            <EmotionMeter emotion="happy" level={75} />
          </div>

          {/* 右边：用户滑块偏好 */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Your Current Preference</h2>
            <PreferenceSlider label="Calm → Excited" />
            <PreferenceSlider label="Happy → Sad" />
            <PreferenceSlider label="Focused → Distracted" />
          </div>
        </div>
      </section>
    </main>
  );
}
