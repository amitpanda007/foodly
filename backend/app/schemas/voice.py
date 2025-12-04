from typing import List, Optional
from pydantic import BaseModel


class VoiceSchema(BaseModel):
    id: str
    name: str
    locale: str
    gender: str
    description: str
    sample_url: Optional[str] = None


class VoiceListResponse(BaseModel):
    voices: List[VoiceSchema]


class UserVoiceResponse(BaseModel):
    user_id: str
    voice_id: str


class UserVoiceUpdateRequest(BaseModel):
    voice_id: str


