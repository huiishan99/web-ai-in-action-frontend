// src/app/emotion/page.tsx
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import EmotionMeter from "@/components/emotion/EmotionMeter";
import PreferenceSlider from "@/components/emotion/PreferenceSlider";

export default function EmotionPage() {
  // State for preference sliders
  const [preferences, setPreferences] = useState({
    calmExcited: 50,
    happySad: 50,
    focusedDistracted: 50,
  });

  // Handler functions for each slider
  const handleCalmExcitedChange = (value: number) => {
    setPreferences((prev) => ({ ...prev, calmExcited: value }));
  };

  const handleHappySadChange = (value: number) => {
    setPreferences((prev) => ({ ...prev, happySad: value }));
  };

  const handleFocusedDistractedChange = (value: number) => {
    setPreferences((prev) => ({ ...prev, focusedDistracted: value }));
  };

  return (
    <main className="flex">
      <Sidebar />
      <section className="flex-1 p-8 bg-[#f9fafb]">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Emotion Overview
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左边：情绪仪表盘 */}
          <div className="bg-white p-6 rounded-xl shadow">
            <EmotionMeter emotion="happy" level={75} />
          </div>

          {/* 右边：用户滑块偏好 */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">
              Your Current Preference
            </h2>
            <div className="space-y-6">
              <PreferenceSlider
                label="Calm → Excited"
                value={preferences.calmExcited}
                onChange={handleCalmExcitedChange}
              />
              <PreferenceSlider
                label="Happy → Sad"
                value={preferences.happySad}
                onChange={handleHappySadChange}
              />
              <PreferenceSlider
                label="Focused → Distracted"
                value={preferences.focusedDistracted}
                onChange={handleFocusedDistractedChange}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
