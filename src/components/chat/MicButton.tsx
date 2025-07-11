'use client';

import { Mic, MicOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  WebSpeechRecognizer,
  SpeechRecognitionEvent,
} from '@/lib/speechTypes'; // ✅ 引入统一类型

interface MicButtonProps {
  onResult: (text: string) => void;
}

export default function MicButton({ onResult }: MicButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<WebSpeechRecognizer | null>(null); // ✅ 使用统一类型

  useEffect(() => {
    if (typeof window === 'undefined' || !window.webkitSpeechRecognition) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0][0].transcript;
      onResult(result);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [onResult]);

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
    <button
      onClick={toggleMic}
      className={`p-2 rounded-full transition ${
        isListening ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
      }`}
      title={isListening ? '点击停止录音' : '点击开始录音'}
    >
      {isListening ? <MicOff size={20} /> : <Mic size={20} />}
    </button>
  );
}
