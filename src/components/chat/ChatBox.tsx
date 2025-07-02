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
      { id: 1, from: 'other', text: 'Hi，I am Alicia!' },
      { id: 2, from: 'me', text: 'Hello, how are you?' },
    ],
    Bob: [{ id: 3, from: 'other', text: 'I am Bob. How are you?' }],
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

  // 当前聊天对象头像（用于 ChatMessage 显示）
  const currentContact = CONTACTS.find((c) => c.name === currentUser);

  return (
    <div className="flex flex-1 h-screen">
      <ContactList
        contacts={CONTACTS}
        current={currentUser}
        onSelect={setCurrentUser}
      />

      <div className="flex flex-col flex-1 bg-gray-50 p-4">
        <h2 className="text-xl font-bold mb-2 text-blue-800">
          {currentUser}
        </h2>

        <div className="flex-1 overflow-y-auto space-y-2">
          {(chatMap[currentUser] || []).map((msg) => (
            <ChatMessage
              key={msg.id}
              from={msg.from}
              text={msg.text}
              avatar={msg.from === 'other' ? currentContact?.avatar : undefined}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2"
            placeholder="Enter message...
"
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
