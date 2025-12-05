from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, and_, cast, String
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.models.recipe import Recipe
from app.schemas.recipe import RecipeCreate, RecipeResponse
from app.services.tts_service import get_tts_service


class RecipeService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_recipe(
        self,
        recipe_data: RecipeCreate,
        user_id: Optional[int] = None,
        anonymous_user_id: Optional[str] = None,
        commit: bool = True
    ) -> Recipe:
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
            outro_audio_url=recipe_data.outro_audio_url,
            ingredients_audio_url=recipe_data.ingredients_audio_url,
            user_id=user_id or recipe_data.user_id,
            anonymous_user_id=anonymous_user_id or recipe_data.anonymous_user_id
        )
        
        self.db.add(recipe)
        if commit:
            await self.db.commit()
            await self.db.refresh(recipe)
        else:
            await self.db.flush()
            await self.db.refresh(recipe)
        
        return recipe
    
    async def get_recipe(self, recipe_id: str) -> Optional[Recipe]:
        result = await self.db.execute(
            select(Recipe).where(Recipe.id == recipe_id)
        )
        return result.scalar_one_or_none()
    
    async def get_all_recipes(self, skip: int = 0, limit: int = 100) -> List[Recipe]:
        """Get all recipes (admin use only)"""
        result = await self.db.execute(
            select(Recipe)
            .order_by(Recipe.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    async def get_user_recipes(
        self,
        user_id: Optional[int] = None,
        anonymous_user_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Recipe]:
        """Get recipes for a specific user (authenticated or anonymous)"""
        conditions = []
        
        if user_id:
            conditions.append(Recipe.user_id == user_id)
        if anonymous_user_id:
            conditions.append(Recipe.anonymous_user_id == anonymous_user_id)
        
        if not conditions:
            return []
        
        result = await self.db.execute(
            select(Recipe)
            .where(or_(*conditions))
            .order_by(Recipe.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    async def search_user_recipes(
        self,
        query: str,
        user_id: Optional[int] = None,
        anonymous_user_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Recipe]:
        """Search recipes for a specific user"""
        search_term = f"%{query}%"
        
        # Build ownership conditions
        ownership_conditions = []
        if user_id:
            ownership_conditions.append(Recipe.user_id == user_id)
        if anonymous_user_id:
            ownership_conditions.append(Recipe.anonymous_user_id == anonymous_user_id)
        
        if not ownership_conditions:
            return []
        
        result = await self.db.execute(
            select(Recipe)
            .where(
                and_(
                    or_(*ownership_conditions),
                    or_(
                        Recipe.title.ilike(search_term),
                        Recipe.description.ilike(search_term)
                    )
                )
            )
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
    
    async def delete_recipe(
        self,
        recipe_id: str,
        user_id: Optional[int] = None,
        anonymous_user_id: Optional[str] = None
    ) -> bool:
        """Delete a recipe only if owned by the requester (or legacy unowned)."""
        recipe = await self.get_recipe(recipe_id)
        if not recipe:
            return False
        
        # Ownership check
        if user_id or anonymous_user_id:
            is_owner = False
            if user_id and recipe.user_id == user_id:
                is_owner = True
            if anonymous_user_id and recipe.anonymous_user_id == anonymous_user_id:
                is_owner = True
            if not is_owner:
                return False
        else:
            # If recipe is associated to a user/anonymous owner, disallow deletion without identity
            if recipe.user_id or recipe.anonymous_user_id:
                return False

        # Identify audio files to potentially delete
        audio_urls = set()
        if recipe.intro_audio_url:
            audio_urls.add(recipe.intro_audio_url)
        if recipe.outro_audio_url:
            audio_urls.add(recipe.outro_audio_url)
        if recipe.ingredients_audio_url:
            audio_urls.add(recipe.ingredients_audio_url)
            
        if recipe.steps:
            for step in recipe.steps:
                if isinstance(step, dict) and step.get("audio_url"):
                    audio_urls.add(step.get("audio_url"))
        
        # Delete recipe record first
        await self.db.delete(recipe)
        await self.db.commit()
        
        # Check if audio files are still in use by other recipes before deleting from disk
        tts_service = get_tts_service()
        
        for url in audio_urls:
            # Check usage in other recipes
            # Cast JSON steps to string for searching
            stmt = select(func.count(Recipe.id)).where(
                or_(
                    Recipe.intro_audio_url == url,
                    Recipe.outro_audio_url == url,
                    Recipe.ingredients_audio_url == url,
                    cast(Recipe.steps, String).like(f'%{url}%')
                )
            )
            result = await self.db.execute(stmt)
            count = result.scalar()
            
            if count == 0:
                tts_service.delete_audio(url)

        return True
    
    async def count_recipes(self) -> int:
        result = await self.db.execute(select(func.count(Recipe.id)))
        return result.scalar()
    
    async def count_user_recipes(
        self,
        user_id: Optional[int] = None,
        anonymous_user_id: Optional[str] = None
    ) -> int:
        """Count recipes for a specific user"""
        conditions = []
        if user_id:
            conditions.append(Recipe.user_id == user_id)
        if anonymous_user_id:
            conditions.append(Recipe.anonymous_user_id == anonymous_user_id)
        
        if not conditions:
            return 0
        
        result = await self.db.execute(
            select(func.count(Recipe.id)).where(or_(*conditions))
        )
        return result.scalar()
    
    async def get_recipe_by_url(
        self,
        url: str,
        user_id: Optional[int] = None,
        anonymous_user_id: Optional[str] = None
    ) -> Optional[Recipe]:
        """Get recipe by URL, optionally filtering by user"""
        conditions = [Recipe.source_url == url]
        
        ownership = []
        if user_id:
            ownership.append(Recipe.user_id == user_id)
        if anonymous_user_id:
            ownership.append(Recipe.anonymous_user_id == anonymous_user_id)
        
        if ownership:
            conditions.append(or_(*ownership))
        
        result = await self.db.execute(
            select(Recipe).where(and_(*conditions))
        )
        return result.scalar_one_or_none()
    
    async def copy_recipe_to_user(
        self,
        recipe_id: str,
        user_id: Optional[int] = None,
        anonymous_user_id: Optional[str] = None,
        commit: bool = True
    ) -> Optional[Recipe]:
        """Copy a shared recipe to user's profile"""
        original = await self.get_recipe(recipe_id)
        if not original:
            return None
        
        # Create a copy for the user
        new_recipe = Recipe(
            title=original.title,
            source_url=original.source_url,
            source_type=original.source_type,
            description=original.description,
            image_url=original.image_url,
            prep_time=original.prep_time,
            cook_time=original.cook_time,
            total_time=original.total_time,
            servings=original.servings,
            ingredients=original.ingredients,
            steps=original.steps,
            tags=original.tags,
            raw_content=original.raw_content,
            intro_text=original.intro_text,
            outro_text=original.outro_text,
            intro_audio_url=original.intro_audio_url,
            outro_audio_url=original.outro_audio_url,
            ingredients_audio_url=original.ingredients_audio_url,
            user_id=user_id,
            anonymous_user_id=anonymous_user_id,
            is_public=False
        )
        
        self.db.add(new_recipe)
        if commit:
            await self.db.commit()
            await self.db.refresh(new_recipe)
        else:
            await self.db.flush()
            await self.db.refresh(new_recipe)
        
        return new_recipe
    
    async def migrate_anonymous_recipes(
        self,
        anonymous_user_id: str,
        user_id: int
    ) -> int:
        """Migrate recipes from anonymous user to authenticated user"""
        result = await self.db.execute(
            select(Recipe).where(Recipe.anonymous_user_id == anonymous_user_id)
        )
        recipes = result.scalars().all()
        
        count = 0
        for recipe in recipes:
            recipe.user_id = user_id
            recipe.anonymous_user_id = None
            count += 1
        
        await self.db.commit()
        return count
