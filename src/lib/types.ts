// === Graph Entity Types ===

export interface World {
  id: string;
  name: string;
  genre: string;
  magicSystem: string;
  rules: string;
  description: string;
}

export interface Region {
  id: string;
  name: string;
  description: string;
  climate: string;
  dangerLevel: number; // 1-10
}

export interface Location {
  id: string;
  name: string;
  type: string; // "town", "dungeon", "forest", "tavern", etc.
  description: string;
}

export interface NPC {
  id: string;
  name: string;
  race: string;
  role: string;
  personality: string;
  status: string; // "alive", "dead", "missing", etc.
}

export interface Faction {
  id: string;
  name: string;
  goals: string;
  alignment: string;
}

export interface Player {
  id: string;
  name: string;
  class: string;
  level: number;
  hp: number;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  status: string; // "active", "completed", "failed"
}

export interface Item {
  id: string;
  name: string;
  type: string;
  description: string;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  timestamp: string;
}

// === Chat Types ===

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent: 'game-master' | 'world-builder' | 'system';
  timestamp: number;
}

export type AgentMode = 'game-master' | 'world-builder';

// === Voice Types ===

export interface VoiceSettings {
  ttsEnabled: boolean;
}
