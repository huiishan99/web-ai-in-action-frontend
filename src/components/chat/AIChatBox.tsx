'use client';

import { useState } from 'react';

export default function AIChatBox() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, `🧑‍💻 你：${input}`, `🤖 AI：${input}（模拟回答）`]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 mb-2">
        {messages.map((msg, i) => (
          <div key={i} className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-md">
            {msg}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="输入你的问题..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 text-sm"
        >
          发送
        </button>
      </div>
    </div>
  );
}
