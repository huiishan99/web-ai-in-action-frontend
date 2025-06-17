// src/lib/speechTypes.ts

export type SpeechRecognitionAlternative = {
  readonly transcript: string;
  readonly confidence: number;
};

export type SpeechRecognitionResult = {
  readonly isFinal: boolean;
  readonly length: number;
  item: (index: number) => SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
};

export type SpeechRecognitionResultList = {
  readonly length: number;
  item: (index: number) => SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

export type SpeechRecognitionEvent = {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
};

export interface WebSpeechRecognizer {
  start: () => void;
  stop: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition: {
      new (): WebSpeechRecognizer;
    };
  }
}
