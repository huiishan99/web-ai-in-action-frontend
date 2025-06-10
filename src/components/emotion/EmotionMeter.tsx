// src/components/emotion/EmotionMeter.tsx
export default function EmotionMeter({
  emotion,
  level,
}: {
  emotion: 'happy' | 'sad' | 'neutral';
  level: number;
}) {
  const emoji = {
    happy: '😊',
    sad: '😢',
    neutral: '😐',
  }[emotion];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full">
          <circle
            className="text-gray-200"
            strokeWidth="10"
            stroke="currentColor"
            fill="transparent"
            r="60"
            cx="80"
            cy="80"
          />
          <circle
            className="text-green-500"
            strokeWidth="10"
            strokeDasharray={`${(level / 100) * 377} 377`}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="60"
            cx="80"
            cy="80"
            transform="rotate(-90 80 80)"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-4xl">{emoji}</span>
      </div>
      <p className="mt-4 text-sm text-gray-500">Emotion level: {level}%</p>
    </div>
  );
}
