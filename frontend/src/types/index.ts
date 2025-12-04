export interface Ingredient {
  name: string;
  amount?: string | null;
  unit?: string | null;
  notes?: string | null;
}

export interface Step {
  number: number;
  instruction: string;
  duration?: string | null;
  tips?: string | null;
  audio_url?: string | null;
}

export interface Recipe {
  id: number;
  title: string;
  source_url: string;
  source_type: 'website' | 'youtube';
  description?: string | null;
  image_url?: string | null;
  prep_time?: string | null;
  cook_time?: string | null;
  total_time?: string | null;
  servings?: string | null;
  ingredients: Ingredient[];
  steps: Step[];
  tags?: string[] | null;
  created_at: string;
  updated_at?: string | null;
  intro_text?: string | null;
  outro_text?: string | null;
  intro_audio_url?: string | null;
  outro_audio_url?: string | null;
}

export interface RecipeListResponse {
  recipes: Recipe[];
  total: number;
}

export interface ProcessRecipeRequest {
  url: string;
  user_id: string;
}

export type Theme = 'light' | 'dark';

export interface VoiceCommand {
  command: string;
  action: () => void;
}

export interface VoiceOption {
  id: string;
  name: string;
  locale: string;
  gender: string;
  description: string;
  sample_url?: string | null;
}

export interface VoiceListResponse {
  voices: VoiceOption[];
}

export interface UserVoiceResponse {
  user_id: string;
  voice_id: string;
}

