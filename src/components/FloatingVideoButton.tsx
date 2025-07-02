// src/components/FloatingVideoButton.tsx
"use client";

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Video, X, Minimize2 } from 'lucide-react';

// 动态导入 RoomCall 组件，避免 SSR 问题
const RoomCall = dynamic(() => import('./RoomCall'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )
});

export default function FloatingVideoButton() {
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleClose = useCallback(() => {
    setShowVideoCall(false);
    setIsMinimized(false);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const handleMaximize = useCallback(() => {
    setIsMinimized(false);
  }, []);

  const handleOpenVideoCall = useCallback(() => {
    setShowVideoCall(true);
  }, []);

  return (
    <>
      {/* 浮动按钮 - 只在没有打开视频通话时显示 */}
      {!showVideoCall && (
        <button
          onClick={handleOpenVideoCall}
          className="fixed bottom-6 right-6 bg-blue-500 text-white p-4 rounded-full shadow-xl hover:bg-blue-600 transition-all duration-300 hover:scale-110 z-50 group"
          title="开始视频通话"
          type="button"
        >
          <Video size={24} />
          {/* 提示文字 */}
          <span className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-sm px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            开始视频通话
          </span>
        </button>
      )}

      {/* 最小化状态的小窗口 */}
      {showVideoCall && isMinimized && (
        <div className="fixed bottom-6 right-6 w-80 h-60 bg-white rounded-lg shadow-xl border-2 border-blue-500 z-50 overflow-hidden">
          {/* 最小化窗口的标题栏 */}
          <div className="bg-blue-500 text-white p-2 flex justify-between items-center">
            <span className="text-sm font-medium">视频通话</span>
            <div className="flex space-x-1">
              <button
                onClick={handleMaximize}
                className="hover:bg-blue-600 p-1 rounded"
                title="最大化"
                type="button"
              >
                <Video size={16} />
              </button>
              <button
                onClick={handleClose}
                className="hover:bg-red-500 p-1 rounded"
                title="关闭"
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          {/* 最小化的视频预览 */}
          <div className="h-full bg-gray-900 flex items-center justify-center">
            <span className="text-white text-sm">点击最大化继续通话</span>
          </div>
        </div>
      )}

      {/* 全屏视频通话弹窗 */}
      {showVideoCall && !isMinimized && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          {/* 顶部控制栏 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10 shadow-sm">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">视频通话</h1>
              <p className="text-sm text-gray-600">安全的端到端加密通话</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleMinimize}
                className="bg-yellow-500 text-white rounded-full p-2 hover:bg-yellow-600 transition"
                title="最小化"
                type="button"
              >
                <Minimize2 size={20} />
              </button>
              <button
                onClick={handleClose}
                className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition"
                title="关闭"
                type="button"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* 使用动态导入的 RoomCall 组件 */}
          <RoomCall />
        </div>
      )}
    </>
  );
}