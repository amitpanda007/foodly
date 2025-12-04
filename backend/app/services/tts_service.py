import asyncio
import edge_tts
import uuid
from pathlib import Path
from typing import List, Optional

# Paths for generated audio
BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_ROOT = BASE_DIR / "static"
STATIC_DIR = STATIC_ROOT / "audio"
SAMPLE_DIR = STATIC_DIR / "samples"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

AVAILABLE_VOICES = [
    {
        "id": "en-US-ChristopherNeural",
        "name": "Christopher",
        "locale": "en-US",
        "gender": "Male",
        "description": "Warm and encouraging — great for calm, guided cooking.",
    },
    {
        "id": "en-US-JennyNeural",
        "name": "Jenny",
        "locale": "en-US",
        "gender": "Female",
        "description": "Friendly and upbeat with crisp pronunciation.",
    },
    {
        "id": "en-GB-SoniaNeural",
        "name": "Sonia",
        "locale": "en-GB",
        "gender": "Female",
        "description": "Relaxed British tone, ideal for narrated stories.",
    },
    {
        "id": "en-AU-NatashaNeural",
        "name": "Natasha",
        "locale": "en-AU",
        "gender": "Female",
        "description": "Bright Australian lilt with a friendly tempo.",
    },
]

DEFAULT_VOICE = AVAILABLE_VOICES[0]["id"]
SAMPLE_TEXT = (
    "Hi! I'm your Foodly cooking companion. I'm here to walk you through every "
    "recipe step with confidence."
)


class TTSService:
    def __init__(self):
        self.default_voice = DEFAULT_VOICE

    def is_supported_voice(self, voice_id: Optional[str]) -> bool:
        if not voice_id:
            return False
        return any(voice["id"] == voice_id for voice in AVAILABLE_VOICES)

    async def generate_audio(self, text: str, voice: Optional[str] = None, filename: Optional[str] = None) -> str:
        """Generate audio and return the static URL path."""
        voice_id = voice if self.is_supported_voice(voice) else self.default_voice
        target_name = filename or f"{uuid.uuid4()}.mp3"
        target_path = STATIC_DIR / target_name
        target_path.parent.mkdir(parents=True, exist_ok=True)

        communicate = edge_tts.Communicate(text, voice_id)
        await communicate.save(str(target_path))

        relative = target_path.relative_to(STATIC_ROOT)
        return f"/static/{relative.as_posix()}"

    async def _ensure_sample_audio(self, voice_id: str) -> str:
        sample_path = SAMPLE_DIR / f"{voice_id}.mp3"
        if not sample_path.exists():
            communicate = edge_tts.Communicate(SAMPLE_TEXT, voice_id)
            await communicate.save(str(sample_path))
        relative = sample_path.relative_to(STATIC_ROOT)
        return f"/static/{relative.as_posix()}"

    async def get_available_voices(self, include_samples: bool = False) -> List[dict]:
        voices = []
        samples: List[Optional[str]] = [None] * len(AVAILABLE_VOICES)

        if include_samples:
            samples = await asyncio.gather(
                *[self._ensure_sample_audio(voice["id"]) for voice in AVAILABLE_VOICES]
            )

        for voice, sample in zip(AVAILABLE_VOICES, samples):
            voice_data = dict(voice)
            voice_data["sample_url"] = sample
            voices.append(voice_data)

        return voices
    
    def delete_audio(self, audio_url: str) -> bool:
        """Delete an audio file given its static URL."""
        if not audio_url or not audio_url.startswith("/static/"):
            return False
            
        try:
            # Remove '/static/' prefix
            relative_path = audio_url.replace("/static/", "", 1)
            file_path = STATIC_ROOT / relative_path
            
            if file_path.exists() and file_path.is_file():
                file_path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Error deleting audio file {audio_url}: {e}")
            return False


def get_tts_service() -> TTSService:
    return TTSService()

