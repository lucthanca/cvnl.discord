export enum Engine {
  GEMINI = 'gemini',
  CLAUDE = 'claude',
}

export const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';