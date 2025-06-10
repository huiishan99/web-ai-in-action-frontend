// src/components/virtual/VirtualSpaceSelector.tsx
'use client';

export default function VirtualSpaceSelector() {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-md flex flex-col items-center space-y-6 max-w-xl mx-auto">
      {/* AR 模拟占位图标 */}
      <div className="w-40 h-40 border-2 border-dashed rounded-lg flex items-center justify-center text-4xl text-gray-400">
        <div className="text-6xl select-none">▢</div>
      </div>

      {/* 场景选择图示（占位） */}
      <div className="flex gap-4">
        <div className="w-20 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-md shadow-inner transform -rotate-3" />
        <div className="w-20 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-md shadow-inner" />
        <div className="w-20 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-md shadow-inner transform rotate-3" />
      </div>

      {/* 提示文字 */}
      <p className="text-sm text-gray-500">Please select a scene!</p>
    </div>
  );
}
