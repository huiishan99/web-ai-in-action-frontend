// src/app/me/page.tsx
'use client';

import { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import EmotionMeter from '@/components/emotion/EmotionMeter';
import PreferenceSlider from '@/components/emotion/PreferenceSlider';

export default function MePage() {
  // 三个滑块状态
  const [calm, setCalm] = useState(50);
  const [happy, setHappy] = useState(50);
  const [focus, setFocus] = useState(50);

  // 实时计算平均值
  const average = useMemo(() => Math.round((calm + happy + focus) / 3), [calm, happy, focus]);

  // 根据平均值判断情绪类型
  const emotion: 'happy' | 'neutral' | 'sad' =
    average >= 66 ? 'happy' : average <= 33 ? 'sad' : 'neutral';

  return (
    <main className="flex">
      <Sidebar />
      <section className="flex-1 p-8 bg-[#f9fafb]">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Emotion Overview</h1>

        <div className="grid grid-cols-2 gap-8">
          {/* 左边：情绪仪表盘 */}
          <div className="bg-white p-6 rounded-xl shadow">
            <EmotionMeter emotion={emotion} level={average} />
          </div>

          {/* 右边：用户滑块偏好 */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Your Current Preference</h2>
            <PreferenceSlider label="Calm → Excited" value={calm} onChange={setCalm} />
            <PreferenceSlider label="Sad → Happy" value={happy} onChange={setHappy} />
            <PreferenceSlider label="Distracted → Focus" value={focus} onChange={setFocus} />
          </div>
        </div>
      </section>
    </main>
  );
}
