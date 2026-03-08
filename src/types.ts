import { LucideIcon } from 'lucide-react';

export type Screen = 'landing' | 'graph' | 'submit' | 'synthesis';

export interface Session {
  id: string;
  title: string;
  status: 'LIVE' | 'SYNTHESIZING' | 'COMPLETE';
  progress: number;
  reasoningChains?: number;
  contributions?: number;
  image: string;
  tag?: string;
}

export interface Premise {
  id: number;
  title: string;
  content: string;
}
