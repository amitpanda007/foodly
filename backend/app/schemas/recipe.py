from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict
from uuid import UUID
from datetime import datetime


class IngredientSchema(BaseModel):
    name: str
    amount: Optional[str] = None
    unit: Optional[str] = None
    notes: Optional[str] = None


class StepSchema(BaseModel):
    number: int
    instruction: str
    duration: Optional[str] = None
    tips: Optional[str] = None
    audio_url: Optional[str] = None


class RecipeProcessRequest(BaseModel):
    url: str
    user_id: Optional[int] = None  # Authenticated user ID
    anonymous_user_id: Optional[str] = None  # Anonymous user ID from localStorage


class RecipeCreate(BaseModel):
    title: str
    source_url: str
    source_type: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    total_time: Optional[str] = None
    servings: Optional[str] = None
    ingredients: List[IngredientSchema]
    steps: List[StepSchema]
    tags: Optional[List[str]] = []
    raw_content: Optional[str] = None
    intro_text: Optional[str] = None
    outro_text: Optional[str] = None
    intro_audio_url: Optional[str] = None
    outro_audio_url: Optional[str] = None
    ingredients_audio_url: Optional[str] = None
    user_id: Optional[int] = None  # Authenticated user ID
    anonymous_user_id: Optional[str] = None  # Anonymous user ID


class RecipeResponse(BaseModel):
    id: UUID
    title: str
    source_url: str
    source_type: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    total_time: Optional[str] = None
    servings: Optional[str] = None
    ingredients: List[IngredientSchema]
    steps: List[StepSchema]
    tags: Optional[List[str]] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    intro_text: Optional[str] = None
    outro_text: Optional[str] = None
    intro_audio_url: Optional[str] = None
    outro_audio_url: Optional[str] = None
    ingredients_audio_url: Optional[str] = None
    user_id: Optional[int] = None
    anonymous_user_id: Optional[str] = None
    is_public: bool = False
    
    class Config:
        from_attributes = True


class RecipeSaveRequest(BaseModel):
    """Request to save a shared recipe to user's profile"""
    recipe_id: UUID


class RecipeListResponse(BaseModel):
    recipes: List[RecipeResponse]
    total: int


class ProductLink(BaseModel):
    title: Optional[str] = None
    link: Optional[str] = None
    source: Optional[str] = None
    price: Optional[str] = None


class ShoppingItem(BaseModel):
    ingredient_name: str
    products: List[ProductLink]


class ShoppingListResponse(BaseModel):
    items: List[ShoppingItem]
