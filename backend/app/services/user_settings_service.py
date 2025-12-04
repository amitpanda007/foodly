from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user_setting import UserSetting
from app.services.tts_service import DEFAULT_VOICE


class UserSettingsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_record(self, user_id: str) -> Optional[UserSetting]:
        result = await self.db.execute(
            select(UserSetting).where(UserSetting.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_user_voice(self, user_id: Optional[str]) -> str:
        """Return the stored voice for the user or the default voice."""
        if not user_id:
            return DEFAULT_VOICE

        record = await self._get_record(user_id)
        if record:
            return record.voice_id

        # Create a default record for new users to avoid repeated inserts
        record = UserSetting(user_id=user_id, voice_id=DEFAULT_VOICE)
        self.db.add(record)
        await self.db.flush()
        return record.voice_id

    async def set_user_voice(self, user_id: str, voice_id: str) -> str:
        record = await self._get_record(user_id)
        if record:
            record.voice_id = voice_id
        else:
            record = UserSetting(user_id=user_id, voice_id=voice_id)
            self.db.add(record)

        await self.db.flush()
        return record.voice_id


