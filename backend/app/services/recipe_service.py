from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.models.recipe import Recipe
from app.schemas.recipe import RecipeCreate, RecipeResponse
from app.services.tts_service import get_tts_service


class RecipeService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_recipe(self, recipe_data: RecipeCreate) -> Recipe:
        # Convert pydantic models to dicts for JSON storage
        ingredients = [ing.model_dump() for ing in recipe_data.ingredients]
        steps = [step.model_dump() for step in recipe_data.steps]
        
        recipe = Recipe(
            title=recipe_data.title,
            source_url=recipe_data.source_url,
            source_type=recipe_data.source_type,
            description=recipe_data.description,
            image_url=recipe_data.image_url,
            prep_time=recipe_data.prep_time,
            cook_time=recipe_data.cook_time,
            total_time=recipe_data.total_time,
            servings=recipe_data.servings,
            ingredients=ingredients,
            steps=steps,
            tags=recipe_data.tags or [],
            raw_content=recipe_data.raw_content,
            intro_text=recipe_data.intro_text,
            outro_text=recipe_data.outro_text,
            intro_audio_url=recipe_data.intro_audio_url,
            outro_audio_url=recipe_data.outro_audio_url
        )
        
        self.db.add(recipe)
        await self.db.commit()
        await self.db.refresh(recipe)
        
        return recipe
    
    async def get_recipe(self, recipe_id: int) -> Optional[Recipe]:
        result = await self.db.execute(
            select(Recipe).where(Recipe.id == recipe_id)
        )
        return result.scalar_one_or_none()
    
    async def get_all_recipes(self, skip: int = 0, limit: int = 100) -> List[Recipe]:
        result = await self.db.execute(
            select(Recipe)
            .order_by(Recipe.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    async def search_recipes(self, query: str, skip: int = 0, limit: int = 100) -> List[Recipe]:
        search_term = f"%{query}%"
        result = await self.db.execute(
            select(Recipe)
            .where(
                or_(
                    Recipe.title.ilike(search_term),
                    Recipe.description.ilike(search_term)
                )
            )
            .order_by(Recipe.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    async def delete_recipe(self, recipe_id: int) -> bool:
        recipe = await self.get_recipe(recipe_id)
        if recipe:
            # Delete associated audio files
            tts_service = get_tts_service()
            
            # Delete intro/outro
            if recipe.intro_audio_url:
                tts_service.delete_audio(recipe.intro_audio_url)
            if recipe.outro_audio_url:
                tts_service.delete_audio(recipe.outro_audio_url)
                
            if recipe.steps:
                for step in recipe.steps:
                    # step is a dict here because it's loaded from JSONB
                    if isinstance(step, dict):
                        audio_url = step.get("audio_url")
                        if audio_url:
                            tts_service.delete_audio(audio_url)

            await self.db.delete(recipe)
            await self.db.commit()
            return True
        return False
    
    async def count_recipes(self) -> int:
        result = await self.db.execute(select(func.count(Recipe.id)))
        return result.scalar()
    
    async def get_recipe_by_url(self, url: str) -> Optional[Recipe]:
        result = await self.db.execute(
            select(Recipe).where(Recipe.source_url == url)
        )
        return result.scalar_one_or_none()

