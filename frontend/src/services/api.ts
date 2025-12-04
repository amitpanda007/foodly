import {
  Recipe,
  RecipeListResponse,
  ProcessRecipeRequest,
  VoiceListResponse,
  UserVoiceResponse,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new ApiError(response.status, error.detail || 'An error occurred');
  }
  return response.json();
}

export const api = {
  async processRecipe(request: ProcessRecipeRequest): Promise<Recipe> {
    const response = await fetch(`${API_URL}/api/recipes/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return handleResponse<Recipe>(response);
  },

  async getRecipes(skip = 0, limit = 50): Promise<RecipeListResponse> {
    const response = await fetch(
      `${API_URL}/api/recipes?skip=${skip}&limit=${limit}`
    );
    return handleResponse<RecipeListResponse>(response);
  },

  async getRecipe(id: number): Promise<Recipe> {
    const response = await fetch(`${API_URL}/api/recipes/${id}`);
    return handleResponse<Recipe>(response);
  },

  async searchRecipes(query: string): Promise<RecipeListResponse> {
    const response = await fetch(
      `${API_URL}/api/recipes/search?q=${encodeURIComponent(query)}`
    );
    return handleResponse<RecipeListResponse>(response);
  },

  async deleteRecipe(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/recipes/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to delete recipe');
    }
  },

  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${API_URL}/api/health`);
    return handleResponse(response);
  },

  async getVoices(): Promise<VoiceListResponse> {
    const response = await fetch(`${API_URL}/api/voices`);
    return handleResponse(response);
  },

  async getUserVoice(userId: string): Promise<UserVoiceResponse> {
    const response = await fetch(`${API_URL}/api/users/${userId}/voice`);
    return handleResponse(response);
  },

  async setUserVoice(userId: string, voiceId: string): Promise<UserVoiceResponse> {
    const response = await fetch(`${API_URL}/api/users/${userId}/voice`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ voice_id: voiceId }),
    });
    return handleResponse(response);
  },
};

