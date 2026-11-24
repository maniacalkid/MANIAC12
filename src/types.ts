export interface GameItem {
  id: number;
  name: string;
  author: string;
  category: string;
  tags: string[];
  featured: boolean;
  file: string;
  coverFile: string;
  cover: string;
  githubUrl: string;
  iframeSrc: string;
  iframe: string;
}

export interface ColorPreset {
  id: string;
  name: string;
  mode: 'dark' | 'light';
  hue: number;
  accentPrimary: string;
  accentSecondary: string;
  accentContrast: string;
  swatchGradient: string;
}

export interface SuggestedGame {
  id: number;
  name: string;
  category: string;
  file: string;
  cover: string;
  iframeSrc: string;
}

export interface ChatSource {
  title: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  suggestedGames?: SuggestedGame[];
  sources?: ChatSource[];
  error?: boolean;
}

export interface DdgWebResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface DdgSearchResponse {
  query: string;
  instantAnswer?: {
    heading: string;
    text: string;
    url: string;
    source: string;
    image?: string;
  };
  results: DdgWebResult[];
  relatedTopics: Array<{ text: string; url: string }>;
  provider: string;
}
