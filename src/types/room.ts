// src/types/rooms.ts
export interface RoomCardInfo {
  title: string;
  description: string;
  color: string;
}

export interface RoomColors {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
  text: string;
}

export interface RoomBackground {
  type: 'gradient' | 'image' | 'pattern';
  value: string;
  overlay?: string;
}

export interface RoomDecorations {
  icons?: string[];
  effects?: string[];
  particles?: boolean;
  ambientElements?: string[];
}

export interface RoomFeatures {
  ambientSounds?: boolean;
  musicPlayer?: boolean;
  breathingGuide?: boolean;
  filters?: string[];
  specialEffects?: boolean;
}

export interface RoomTheme {
  id: string;
  title: string;
  description: string;
  videoRoomId: string;

  // 视觉主题
  colors: RoomColors;
  background: RoomBackground;
  decorations?: RoomDecorations;

  // 功能特性
  features?: RoomFeatures;

  // UI 配置
  headerStyle?: 'minimal' | 'decorated' | 'immersive';
  controlsStyle?: 'modern' | 'classic' | 'themed';
}

export interface RoomConfig {
  // 首页卡片信息
  card: RoomCardInfo;

  // RoomCall 主题信息
  theme: RoomTheme;
}

export type RoomId = 'neutral' | 'positive' | 'negative';

export interface RoomConfigs {
  [key: string]: RoomConfig;
}