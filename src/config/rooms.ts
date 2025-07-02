// src/config/rooms.ts
import { RoomConfigs } from '@/types/room';

export const ROOM_CONFIGS: RoomConfigs = {
  neutral: {
    // 首页卡片信息
    card: {
      title: 'Tea Room',
      description: 'Have a cup of tea and chat quietly',
      color: 'bg-gray-100',
    },
    // RoomCall 主题信息
    theme: {
      id: 'neutral',
      title: '🍵 Tea Room',
      description: 'A peaceful space for quiet conversations and reflection',
      videoRoomId: 'NEUTRAL_ROOM',

      colors: {
        primary: '#6b7280',      // 灰色主调
        secondary: '#9ca3af',    // 浅灰色
        background: '#f9fafb',   // 极浅灰背景
        accent: '#d97706',       // 茶色强调
        text: '#374151'          // 深灰文字
      },

      background: {
        type: 'gradient',
        value: 'from-amber-50 via-orange-50 to-yellow-50',
        overlay: 'bg-white bg-opacity-10'
      },

      decorations: {
        icons: ['🍵', '🌿', '📖', '☕'],
        effects: ['gentle-glow', 'soft-shadow'],
        particles: false,
        ambientElements: ['floating-leaves', 'warm-light']
      },

      features: {
        ambientSounds: true,
        filters: ['warm', 'soft'],
        specialEffects: false
      },

      headerStyle: 'minimal',
      controlsStyle: 'classic'
    }
  },

  positive: {
    // 首页卡片信息
    card: {
      title: 'Positive KTV',
      description: 'Share good news 🎤',
      color: 'bg-yellow-100',
    },
    // RoomCall 主题信息
    theme: {
      id: 'positive',
      title: '🎤 Positive KTV',
      description: 'A vibrant space to celebrate and share good vibes',
      videoRoomId: 'POSITIVE_ROOM',

      colors: {
        primary: '#f59e0b',      // 金黄色主调
        secondary: '#fbbf24',    // 亮黄色
        background: '#fffbeb',   // 浅黄背景
        accent: '#ec4899',       // 粉色强调
        text: '#92400e'          // 深橙文字
      },

      background: {
        type: 'gradient',
        value: 'from-pink-500 via-red-500 to-yellow-500',
        overlay: 'bg-gradient-to-r from-purple-600 to-blue-600 bg-opacity-20'
      },

      decorations: {
        icons: ['🎤', '🎵', '🎉', '⭐', '🌟'],
        effects: ['neon-glow', 'disco-lights', 'sparkle'],
        particles: true,
        ambientElements: ['disco-ball', 'stage-lights', 'confetti']
      },

      features: {
        musicPlayer: true,
        filters: ['vibrant', 'disco', 'rainbow'],
        specialEffects: true
      },

      headerStyle: 'decorated',
      controlsStyle: 'themed'
    }
  },

  negative: {
    // 首页卡片信息
    card: {
      title: 'Meditation Room',
      description: 'Pour your heart out & heal 🌙',
      color: 'bg-blue-100',
    },
    // RoomCall 主题信息
    theme: {
      id: 'negative',
      title: '🌙 Meditation Room',
      description: 'A serene sanctuary for healing and emotional release',
      videoRoomId: 'NEGATIVE_ROOM',

      colors: {
        primary: '#3b82f6',      // 蓝色主调
        secondary: '#60a5fa',    // 浅蓝色
        background: '#eff6ff',   // 极浅蓝背景
        accent: '#8b5cf6',       // 紫色强调
        text: '#1e40af'          // 深蓝文字
      },

      background: {
        type: 'gradient',
        value: 'from-blue-900 via-purple-900 to-indigo-900',
        overlay: 'bg-black bg-opacity-30'
      },

      decorations: {
        icons: ['🌙', '⭐', '🕯️', '🧘‍♀️', '💜'],
        effects: ['moon-glow', 'gentle-pulse', 'ethereal'],
        particles: true,
        ambientElements: ['floating-stars', 'gentle-waves', 'candle-light']
      },

      features: {
        ambientSounds: true,
        breathingGuide: true,
        filters: ['calm', 'ethereal', 'moonlight'],
        specialEffects: false
      },

      headerStyle: 'immersive',
      controlsStyle: 'modern'
    }
  }
};

// 工具函数
export function getRoomConfig(roomId: string) {
  return ROOM_CONFIGS[roomId];
}

export function getRoomTheme(roomId: string) {
  const config = getRoomConfig(roomId);
  return config?.theme;
}

export function getRoomCardInfo(roomId: string) {
  const config = getRoomConfig(roomId);
  return config?.card;
}

export function getAllRooms() {
  return Object.entries(ROOM_CONFIGS).map(([id, config]) => ({
    id,
    ...config.card
  }));
}

// 类型守卫
export function isValidRoomId(roomId: string): roomId is (keyof typeof ROOM_CONFIGS & string) {
  return roomId in ROOM_CONFIGS;
}