from sqlalchemy import Column, Integer, String, DateTime, func
from app.database import Base


class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, unique=True, index=True)
    voice_id = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    def __repr__(self):
        return f"<UserSetting user_id={self.user_id} voice_id={self.voice_id}>"


