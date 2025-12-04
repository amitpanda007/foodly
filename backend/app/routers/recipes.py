from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.schemas.recipe import (
    RecipeCreate,
    RecipeResponse,
    RecipeListResponse,
    RecipeProcessRequest,
    IngredientSchema,
    StepSchema
)
from app.services.recipe_service import RecipeService
from app.services.scraper_service import ScraperService, get_scraper_service
from app.services.llm_service import LLMService, get_llm_service
from app.services.user_settings_service import UserSettingsService

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


@router.post("/process", response_model=RecipeResponse)
async def process_recipe(
    request: RecipeProcessRequest,
    db: AsyncSession = Depends(get_db),
    scraper: ScraperService = Depends(get_scraper_service),
    llm: LLMService = Depends(get_llm_service)
):
    """Process a recipe URL (website or YouTube) and save it."""
    recipe_service = RecipeService(db)
    user_settings = UserSettingsService(db)
    voice_id = await user_settings.get_user_voice(request.user_id)
    
    # Check if recipe already exists
    existing = await recipe_service.get_recipe_by_url(request.url)
    if existing:
        return existing
    
    try:
        # Scrape the content
        scraped_data = await scraper.scrape(request.url)
        
        # Clean content length for debug logging
        content_len = len(scraped_data.get('content', ''))
        print(f"[DEBUG] Scraped Content Length: {content_len} chars")
        if content_len > 0:
            print(f"[DEBUG] Scraped Content Preview:\n{scraped_data['content'][:500]}...\n")
        else:
            print(f"[DEBUG] WARNING: Scraped content is empty!")
        
        # Parse with LLM
        parsed_recipe = await llm.parse_recipe(
            scraped_data["content"],
            scraped_data["source_type"],
            voice=voice_id
        )
        
        # Create ingredient schemas
        ingredients = []
        for ing in parsed_recipe.get("ingredients", []):
            if isinstance(ing, dict):
                ingredients.append(IngredientSchema(
                    name=ing.get("name", "Unknown"),
                    amount=ing.get("amount"),
                    unit=ing.get("unit"),
                    notes=ing.get("notes")
                ))
            elif isinstance(ing, str):
                ingredients.append(IngredientSchema(name=ing))
        
        # Create step schemas (including audio_url from TTS generation)
        steps = []
        for i, step in enumerate(parsed_recipe.get("steps", []), 1):
            if isinstance(step, dict):
                steps.append(StepSchema(
                    number=step.get("number", i),
                    instruction=step.get("instruction", str(step)),
                    duration=step.get("duration"),
                    tips=step.get("tips"),
                    audio_url=step.get("audio_url")  # Include generated audio URL
                ))
            elif isinstance(step, str):
                steps.append(StepSchema(number=i, instruction=step))
        
        # Use scraped title if LLM didn't provide one
        title = parsed_recipe.get("title") or scraped_data.get("title") or "Untitled Recipe"
        
        # Create recipe
        recipe_data = RecipeCreate(
            title=title,
            source_url=request.url,
            source_type=scraped_data["source_type"],
            description=parsed_recipe.get("description"),
            image_url=scraped_data.get("image_url"),
            prep_time=parsed_recipe.get("prep_time"),
            cook_time=parsed_recipe.get("cook_time"),
            total_time=parsed_recipe.get("total_time"),
            servings=parsed_recipe.get("servings"),
            ingredients=ingredients,
            steps=steps,
            tags=parsed_recipe.get("tags", []),
            raw_content=scraped_data["content"][:5000],  # Store first 5000 chars
            intro_text=parsed_recipe.get("intro_text"),
            outro_text=parsed_recipe.get("outro_text"),
            intro_audio_url=parsed_recipe.get("intro_audio_url"),
            outro_audio_url=parsed_recipe.get("outro_audio_url")
        )
        
        recipe = await recipe_service.create_recipe(recipe_data)
        return recipe
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process recipe: {str(e)}")


@router.get("", response_model=RecipeListResponse)
async def get_recipes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get all saved recipes."""
    recipe_service = RecipeService(db)
    recipes = await recipe_service.get_all_recipes(skip=skip, limit=limit)
    total = await recipe_service.count_recipes()
    return RecipeListResponse(recipes=recipes, total=total)


@router.get("/search", response_model=RecipeListResponse)
async def search_recipes(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Search recipes by title or description."""
    recipe_service = RecipeService(db)
    recipes = await recipe_service.search_recipes(q, skip=skip, limit=limit)
    return RecipeListResponse(recipes=recipes, total=len(recipes))


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(
    recipe_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific recipe by ID."""
    recipe_service = RecipeService(db)
    recipe = await recipe_service.get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a recipe."""
    recipe_service = RecipeService(db)
    success = await recipe_service.delete_recipe(recipe_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"message": "Recipe deleted successfully"}

