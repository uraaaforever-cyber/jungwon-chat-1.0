export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64
  name?: string;
}

export type VisualEffectType = 'heart' | 'butterfly' | 'cat' | 'firework';

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  translation?: string; // Stores the Chinese translation
  showTranslation?: boolean; // Toggles visibility
  attachments?: Attachment[];
  timestamp: number;
  visualEffect?: VisualEffectType; // Active visual effect
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}