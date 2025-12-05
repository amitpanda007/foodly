from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.schemas.recipe import (
    RecipeCreate,
    RecipeResponse,
    RecipeListResponse,
    RecipeProcessRequest,
    RecipeSaveRequest,
    IngredientSchema,
    StepSchema
)
from app.services.recipe_service import RecipeService
from app.services.scraper_service import ScraperService, get_scraper_service
from app.services.llm_service import LLMService, get_llm_service
from app.services.user_settings_service import UserSettingsService
from app.services.auth_service import AuthService
from app.models.user import User
from app.services.tts_service import get_tts_service

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Extract user from Authorization header if present"""
    if not authorization:
        return None
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
    except ValueError:
        return None
    
    auth_service = AuthService(db)
    return await auth_service.verify_token(token)


@router.post("/process", response_model=RecipeResponse)
async def process_recipe(
    request: RecipeProcessRequest,
    db: AsyncSession = Depends(get_db),
    scraper: ScraperService = Depends(get_scraper_service),
    llm: LLMService = Depends(get_llm_service),
    user: Optional[User] = Depends(get_optional_user)
):
    """Process a recipe URL (website or YouTube) and save it."""
    recipe_service = RecipeService(db)
    user_settings = UserSettingsService(db)
    tts_service = get_tts_service()
    
    # Determine user info
    user_id = user.id if user else request.user_id
    anonymous_user_id = request.anonymous_user_id if not user else None
    
    # Get voice preference
    voice_user_id = str(user_id) if user_id else request.anonymous_user_id
    voice_id = await user_settings.get_user_voice(voice_user_id) if voice_user_id else None
    
    # Check if recipe already exists for this user
    existing = await recipe_service.get_recipe_by_url(
        request.url,
        user_id=user_id,
        anonymous_user_id=anonymous_user_id
    )
    if existing:
        return existing
    
    # Collect audio URLs so we can clean them up on failure
    def collect_audio_urls(parsed: dict):
        urls = []
        for key in ("intro_audio_url", "outro_audio_url", "ingredients_audio_url"):
            if parsed.get(key):
                urls.append(parsed[key])
        for step in parsed.get("steps", []):
            if isinstance(step, dict) and step.get("audio_url"):
                urls.append(step["audio_url"])
        return urls

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
            outro_audio_url=parsed_recipe.get("outro_audio_url"),
            ingredients_audio_url=parsed_recipe.get("ingredients_audio_url")
        )
        
        audio_urls = collect_audio_urls(parsed_recipe)

        # Use a transaction to ensure we don't keep partial data
        tx_ctx = db.begin_nested() if db.in_transaction() else db.begin()
        async with tx_ctx:
            recipe = await recipe_service.create_recipe(
                recipe_data,
                user_id=user_id,
                anonymous_user_id=anonymous_user_id,
                commit=False  # commit handled by context manager
            )
        return recipe
        
    except Exception as e:
        # Clean up any generated audio if something failed
        try:
            for url in locals().get("audio_urls", []):
                tts_service.delete_audio(url)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to process recipe: {str(e)}")


@router.get("", response_model=RecipeListResponse)
async def get_recipes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    anonymous_user_id: Optional[str] = Query(None, description="Anonymous user ID from localStorage"),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """Get recipes for the current user."""
    recipe_service = RecipeService(db)
    
    # Get user-specific recipes
    user_id = user.id if user else None
    
    recipes = await recipe_service.get_user_recipes(
        user_id=user_id,
        anonymous_user_id=anonymous_user_id if not user else None,
        skip=skip,
        limit=limit
    )
    total = await recipe_service.count_user_recipes(
        user_id=user_id,
        anonymous_user_id=anonymous_user_id if not user else None
    )
    return RecipeListResponse(recipes=recipes, total=total)


@router.get("/search", response_model=RecipeListResponse)
async def search_recipes(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    anonymous_user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """Search recipes by title or description for the current user."""
    recipe_service = RecipeService(db)
    
    user_id = user.id if user else None
    
    recipes = await recipe_service.search_user_recipes(
        q,
        user_id=user_id,
        anonymous_user_id=anonymous_user_id if not user else None,
        skip=skip,
        limit=limit
    )
    return RecipeListResponse(recipes=recipes, total=len(recipes))


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(
    recipe_id: str,
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
    recipe_id: str,
    anonymous_user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """Delete a recipe."""
    recipe_service = RecipeService(db)
    
    user_id = user.id if user else None

    # Require identity to delete recipes
    if not user_id and not anonymous_user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication or anonymous user id required to delete recipe"
        )

    success = await recipe_service.delete_recipe(
        recipe_id,
        user_id=user_id,
        anonymous_user_id=anonymous_user_id if not user else None
    )
    if not success:
        raise HTTPException(status_code=404, detail="Recipe not found or not owned by user")
    return {"message": "Recipe deleted successfully"}


@router.post("/save", response_model=RecipeResponse)
async def save_shared_recipe(
    request: RecipeSaveRequest,
    anonymous_user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """Save a shared recipe to user's profile."""
    recipe_service = RecipeService(db)
    
    user_id = user.id if user else None
    anon_id = anonymous_user_id if not user else None
    
    if not user_id and not anon_id:
        raise HTTPException(
            status_code=400,
            detail="User identification required to save recipe"
        )
    
    # Check if recipe exists
    original = await recipe_service.get_recipe(request.recipe_id)
    if not original:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Check if user already has this recipe (by URL)
    existing = await recipe_service.get_recipe_by_url(
        original.source_url,
        user_id=user_id,
        anonymous_user_id=anon_id
    )
    if existing:
        return existing  # Already saved
    
    # Copy recipe to user's profile
    new_recipe = await recipe_service.copy_recipe_to_user(
        request.recipe_id,
        user_id=user_id,
        anonymous_user_id=anon_id
    )
    
    if not new_recipe:
        raise HTTPException(status_code=500, detail="Failed to save recipe")
    
    return new_recipe


@router.post("/migrate")
async def migrate_anonymous_recipes(
    anonymous_user_id: str = Query(..., description="Anonymous user ID to migrate from"),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """Migrate recipes from anonymous user to authenticated user."""
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required to migrate recipes"
        )
    
    recipe_service = RecipeService(db)
    count = await recipe_service.migrate_anonymous_recipes(anonymous_user_id, user.id)
    
    return {"message": f"Successfully migrated {count} recipes", "count": count}
