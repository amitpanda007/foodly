import uuid
from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey, Boolean, Integer
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Recipe(Base):
    __tablename__ = "recipes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # User ownership - either authenticated user_id or anonymous_user_id (from localStorage)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    anonymous_user_id = Column(String(255), nullable=True, index=True)  # For non-logged-in users
    is_public = Column(Boolean, default=False)  # For shared recipes
    
    title = Column(String(500), nullable=False, index=True)
    source_url = Column(String(2000), nullable=False)
    source_type = Column(String(50), nullable=False)  # "website" or "youtube"
    description = Column(Text, nullable=True)
    image_url = Column(String(2000), nullable=True)
    prep_time = Column(String(100), nullable=True)
    cook_time = Column(String(100), nullable=True)
    total_time = Column(String(100), nullable=True)
    servings = Column(String(100), nullable=True)
    ingredients = Column(JSON, nullable=False, default=list)
    steps = Column(JSON, nullable=False, default=list)
    tags = Column(JSON, nullable=True, default=list)
    raw_content = Column(Text, nullable=True)
    intro_text = Column(Text, nullable=True)
    outro_text = Column(Text, nullable=True)
    intro_audio_url = Column(String(2000), nullable=True)
    outro_audio_url = Column(String(2000), nullable=True)
    ingredients_audio_url = Column(String(2000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Recipe(id={self.id}, title='{self.title}')>"

