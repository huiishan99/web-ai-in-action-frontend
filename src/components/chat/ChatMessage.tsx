// src/components/chat/ChatMessage.tsx
'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function ChatMessage({
  from,
  text,
  time = new Date(),
  avatar,
}: {
  from: 'me' | 'other';
  text: string;
  time?: Date;
  avatar?: string; // 增加动态头像支持
}) {
  const isMe = from === 'me';

  // 本地格式化时间，仅在客户端生成，避免 SSR 不一致
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    const str = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTimeString(str);
  }, [time]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}
    >
      {/* 对方消息左侧头像 */}
      {!isMe && avatar && (
        <Image
          src={avatar}
          alt="avatar"
          width={32}
          height={32}
          className="w-8 h-8 rounded-full shadow-sm"
        />
      )}

      <div className="max-w-xs">
        <div
          className={`px-4 py-2 rounded-xl shadow text-sm whitespace-pre-wrap break-words ${
            isMe
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-white text-gray-800 rounded-bl-none'
          }`}
        >
          {text}
        </div>
        {/* 只在客户端渲染时间 */}
        {timeString && (
          <p className="text-xs text-gray-400 mt-1 ml-1">{timeString}</p>
        )}
      </div>

      {/* 自己消息右侧头像 */}
      {isMe && (
        <Image
          src="/avatars/avatar.jpg"
          alt="avatar"
          width={32}
          height={32}
          className="w-8 h-8 rounded-full shadow-sm"
        />
      )}
    </motion.div>
  );
}
