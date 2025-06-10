// src/components/chat/MicButton.tsx
'use client';

import { Mic, MicOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/* 类型声明（局部声明 Web Speech API 类型） */
type SpeechRecognitionResult = {
  readonly isFinal: boolean;
  readonly length: number;
  item: (index: number) => SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionAlternative = {
  readonly transcript: string;
  readonly confidence: number;
};

type SpeechRecognitionResultList = {
  readonly length: number;
  item: (index: number) => SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEvent = {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
};

type WebkitSpeechRecognition = {
  start: () => void;
  stop: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    webkitSpeechRecognition: {
      new (): WebkitSpeechRecognition;
    };
  }
}

interface MicButtonProps {
  onResult: (text: string) => void;
}

export default function MicButton({ onResult }: MicButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<WebkitSpeechRecognition | null>(null); // 类型明确

  useEffect(() => {
    if (typeof window === 'undefined' || !window.webkitSpeechRecognition) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
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
