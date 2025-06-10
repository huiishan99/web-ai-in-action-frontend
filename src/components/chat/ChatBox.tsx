// src/components/chat/ChatBox.tsx
'use client';

import ContactList from './ContactList';
import ChatMessage from './ChatMessage';
import { useState } from 'react';
import MicButton from './MicButton';

type Message = {
  id: number;
  from: 'me' | 'other';
  text: string;
};

const CONTACTS = [
  { name: 'Alicia', avatar: '/avatars/alicia.jpg' },
  { name: 'Bob', avatar: '/avatars/bob.jpg' },
  { name: 'Charlie', avatar: '/avatars/charlie.jpg' },
];

export default function ChatBox() {
  const [currentUser, setCurrentUser] = useState('Alicia');

  // 聊天记录映射：每个用户有自己的消息数组
  const [chatMap, setChatMap] = useState<Record<string, Message[]>>({
    Alicia: [
      { id: 1, from: 'other', text: '嗨，我是 Alicia！' },
      { id: 2, from: 'me', text: '你好呀～' },
    ],
    Bob: [{ id: 3, from: 'other', text: '我是 Bob，有什么事？' }],
    Charlie: [],
  });

  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage: Message = {
      id: Date.now(),
      from: 'me',
      text: input,
    };
    setChatMap((prev) => ({
      ...prev,
      [currentUser]: [...(prev[currentUser] || []), newMessage],
    }));
    setInput('');
  };

  return (
    <div className="flex flex-1 h-screen">
      <ContactList
        contacts={CONTACTS}
        current={currentUser}
        onSelect={setCurrentUser}
      />

      <div className="flex flex-col flex-1 bg-gray-50 p-4">
        <h2 className="text-xl font-bold mb-2 text-blue-800">
          与 {currentUser} 的对话
        </h2>

        <div className="flex-1 overflow-y-auto space-y-2">
          {(chatMap[currentUser] || []).map((msg) => (
            <ChatMessage key={msg.id} from={msg.from} text={msg.text} />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2"
            placeholder="输入消息..."
          />

          {/* 语音输入按钮 */}
          <MicButton onResult={(text) => setInput(text)} />

          <button
            onClick={handleSend}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </div>

    </div>



  );
}
