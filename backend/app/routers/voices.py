from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.voice import VoiceListResponse, UserVoiceResponse, UserVoiceUpdateRequest
from app.services.tts_service import get_tts_service, TTSService
from app.services.user_settings_service import UserSettingsService

voices_router = APIRouter(prefix="/api/voices", tags=["voices"])
users_router = APIRouter(prefix="/api/users", tags=["users"])


@voices_router.get("", response_model=VoiceListResponse)
async def list_available_voices(tts: TTSService = Depends(get_tts_service)):
    voices = await tts.get_available_voices(include_samples=True)
    return VoiceListResponse(voices=voices)


@users_router.get("/{user_id}/voice", response_model=UserVoiceResponse)
async def get_user_voice(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    user_settings = UserSettingsService(db)
    voice_id = await user_settings.get_user_voice(user_id)
    return UserVoiceResponse(user_id=user_id, voice_id=voice_id)


@users_router.put("/{user_id}/voice", response_model=UserVoiceResponse)
async def update_user_voice(
    user_id: str,
    payload: UserVoiceUpdateRequest,
    db: AsyncSession = Depends(get_db),
    tts: TTSService = Depends(get_tts_service),
):
    if not tts.is_supported_voice(payload.voice_id):
        raise HTTPException(status_code=400, detail="Voice is not supported.")

    user_settings = UserSettingsService(db)
    voice_id = await user_settings.set_user_voice(user_id, payload.voice_id)
    return UserVoiceResponse(user_id=user_id, voice_id=voice_id)


