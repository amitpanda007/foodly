import {
  Recipe,
  RecipeListResponse,
  ProcessRecipeRequest,
  VoiceListResponse,
  UserVoiceResponse,
  RecipeSaveRequest,
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

// Helper to get auth headers
function getAuthHeaders(accessToken?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return headers;
}

export const api = {
  async processRecipe(
    request: ProcessRecipeRequest,
    accessToken?: string | null
  ): Promise<Recipe> {
    const response = await fetch(`${API_URL}/api/recipes/process`, {
      method: 'POST',
      headers: getAuthHeaders(accessToken),
      body: JSON.stringify(request),
    });
    return handleResponse<Recipe>(response);
  },

  async getRecipes(
    skip = 0,
    limit = 50,
    anonymousUserId?: string,
    accessToken?: string | null
  ): Promise<RecipeListResponse> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    // Pass anonymous_user_id for non-authenticated users
    if (anonymousUserId && !accessToken) {
      params.append('anonymous_user_id', anonymousUserId);
    }
    
    const headers: HeadersInit = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch(
      `${API_URL}/api/recipes?${params}`,
      { headers }
    );
    return handleResponse<RecipeListResponse>(response);
  },

  async getRecipe(id: number): Promise<Recipe> {
    const response = await fetch(`${API_URL}/api/recipes/${id}`);
    return handleResponse<Recipe>(response);
  },

  async searchRecipes(
    query: string,
    anonymousUserId?: string,
    accessToken?: string | null
  ): Promise<RecipeListResponse> {
    const params = new URLSearchParams({ q: query });
    if (anonymousUserId && !accessToken) {
      params.append('anonymous_user_id', anonymousUserId);
    }
    
    const response = await fetch(
      `${API_URL}/api/recipes/search?${params}`,
      {
        headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
      }
    );
    return handleResponse<RecipeListResponse>(response);
  },

  async deleteRecipe(
    id: number,
    anonymousUserId?: string,
    accessToken?: string | null
  ): Promise<void> {
    const params = new URLSearchParams();
    if (anonymousUserId && !accessToken) {
      params.append('anonymous_user_id', anonymousUserId);
    }
    
    const url = params.toString() 
      ? `${API_URL}/api/recipes/${id}?${params}`
      : `${API_URL}/api/recipes/${id}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
    });
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to delete recipe');
    }
  },

  async saveRecipe(
    request: RecipeSaveRequest,
    anonymousUserId?: string,
    accessToken?: string | null
  ): Promise<Recipe> {
    const params = new URLSearchParams();
    if (anonymousUserId && !accessToken) {
      params.append('anonymous_user_id', anonymousUserId);
    }
    
    const url = params.toString()
      ? `${API_URL}/api/recipes/save?${params}`
      : `${API_URL}/api/recipes/save`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(accessToken),
      body: JSON.stringify(request),
    });
    return handleResponse<Recipe>(response);
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
