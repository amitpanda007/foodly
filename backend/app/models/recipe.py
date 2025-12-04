from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base


class Recipe(Base):
    __tablename__ = "recipes"
    
    id = Column(Integer, primary_key=True, index=True)
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Recipe(id={self.id}, title='{self.title}')>"

