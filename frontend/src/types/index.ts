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
  id: string;
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
  ingredients_audio_url?: string | null;
  user_id?: number | null;
  anonymous_user_id?: string | null;
  is_public?: boolean;
}

export interface RecipeListResponse {
  recipes: Recipe[];
  total: number;
}

export interface ProcessRecipeRequest {
  url: string;
  user_id?: number;
  anonymous_user_id?: string;
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

// Authentication types
export interface User {
  id: number;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface RecipeSaveRequest {
  recipe_id: string;
}

