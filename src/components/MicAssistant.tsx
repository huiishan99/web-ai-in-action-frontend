'use client';

import { Mic } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  WebSpeechRecognizer,
  SpeechRecognitionEvent,
} from '@/lib/speechTypes'; // ✅ 引入统一类型

export default function MicAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState('');
  const recognitionRef = useRef<WebSpeechRecognizer | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.webkitSpeechRecognition) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0][0].transcript;
      setText(result);
      setIsListening(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setText(''), 3000);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  };

  return (
    <div className="w-full mt-auto flex flex-col items-center">
      {text && (
        <div className="text-xs text-gray-500 mb-2 text-center px-2">{text}</div>
      )}
      <button
        onClick={toggleMic}
        className={`w-10 h-10 flex items-center justify-center rounded-full mb-4 shadow-lg transition 
          ${isListening ? 'bg-red-500 text-white' : 'bg-white text-gray-700'}`}
        title={isListening ? '停止识别' : '开始语音识别'}
      >
        <Mic size={20} />
      </button>
    </div>
  );
}
