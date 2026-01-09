export interface Vocabulary {
  word: string;
  phonetic: string;
  translation: string;
  coordinates?: {
    x: number;
    y: number;
  };
}

export interface Sentence {
  english: string;
  chinese: string;
}

export interface LessonContent {
  topic: string;
  vocabulary: Vocabulary[];
  sentences: Sentence[];
  imagePrompt: string;
  fullPrompt?: string; // To store the exact prompt used for debugging/copying
}

export enum DifficultyLevel {
  Preschool = 'Preschool',
  K12 = 'K12',
  CET4 = 'CET-4',
  CET6 = 'CET-6',
  TOEFL = 'TOEFL',
  IELTS = 'IELTS',
  Professional = 'Professional',
}

export type ModelType = 'flash' | 'pro';

export interface AppState {
  topic: string;
  difficulty: DifficultyLevel;
  modelType: ModelType;
  isLoading: boolean;
  loadingStep?: string; // 'generating_text', 'drawing_image', 'locating_objects'
  content: LessonContent | null;
  imageUrl: string | null;
  error: string | null;
}