// src/components/emotion/PreferenceSlider.tsx
'use client';

export default function PreferenceSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
      />
      <p className="text-xs text-gray-500 mt-1">Current: {value}</p>
    </div>
  );
}
