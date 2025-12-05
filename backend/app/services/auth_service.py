import hashlib
import hmac
import secrets
import base64
import json
import time
from typing import Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.auth import UserCreate, UserResponse
from app.config import get_settings

settings = get_settings()


class PasswordHasher:
    """Simple but secure password hashing using PBKDF2-SHA256"""
    
    ITERATIONS = 390000  # OWASP recommendation for PBKDF2-SHA256
    SALT_LENGTH = 32
    KEY_LENGTH = 32
    
    @classmethod
    def hash(cls, password: str) -> str:
        """Hash a password with a random salt"""
        salt = secrets.token_bytes(cls.SALT_LENGTH)
        key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt,
            cls.ITERATIONS,
            dklen=cls.KEY_LENGTH
        )
        # Format: iterations$salt$key (all base64 encoded)
        return f"{cls.ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(key).decode()}"
    
    @classmethod
    def verify(cls, password: str, hashed: str) -> bool:
        """Verify a password against a hash"""
        try:
            iterations_str, salt_b64, key_b64 = hashed.split('$')
            iterations = int(iterations_str)
            salt = base64.b64decode(salt_b64)
            stored_key = base64.b64decode(key_b64)
            
            computed_key = hashlib.pbkdf2_hmac(
                'sha256',
                password.encode('utf-8'),
                salt,
                iterations,
                dklen=len(stored_key)
            )
            return hmac.compare_digest(stored_key, computed_key)
        except (ValueError, TypeError):
            return False


class JWTHandler:
    """Simple JWT implementation using HMAC-SHA256"""
    
    SECRET_KEY = settings.jwt_secret_key
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS = 30
    
    @classmethod
    def _base64url_encode(cls, data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')
    
    @classmethod
    def _base64url_decode(cls, data: str) -> bytes:
        padding = 4 - len(data) % 4
        if padding != 4:
            data += '=' * padding
        return base64.urlsafe_b64decode(data)
    
    @classmethod
    def create_token(cls, user_id: int, token_type: str = "access") -> str:
        """Create a JWT token"""
        if token_type == "access":
            exp = datetime.utcnow() + timedelta(minutes=cls.ACCESS_TOKEN_EXPIRE_MINUTES)
        else:
            exp = datetime.utcnow() + timedelta(days=cls.REFRESH_TOKEN_EXPIRE_DAYS)
        
        header = {"alg": "HS256", "typ": "JWT"}
        payload = {
            "sub": str(user_id),
            "exp": int(exp.timestamp()),
            "type": token_type,
            "iat": int(datetime.utcnow().timestamp())
        }
        
        header_b64 = cls._base64url_encode(json.dumps(header).encode())
        payload_b64 = cls._base64url_encode(json.dumps(payload).encode())
        
        signature_input = f"{header_b64}.{payload_b64}".encode()
        signature = hmac.new(
            cls.SECRET_KEY.encode(),
            signature_input,
            hashlib.sha256
        ).digest()
        signature_b64 = cls._base64url_encode(signature)
        
        return f"{header_b64}.{payload_b64}.{signature_b64}"
    
    @classmethod
    def verify_token(cls, token: str) -> Optional[dict]:
        """Verify a JWT token and return the payload"""
        try:
            parts = token.split('.')
            if len(parts) != 3:
                return None
            
            header_b64, payload_b64, signature_b64 = parts
            
            # Verify signature
            signature_input = f"{header_b64}.{payload_b64}".encode()
            expected_signature = hmac.new(
                cls.SECRET_KEY.encode(),
                signature_input,
                hashlib.sha256
            ).digest()
            actual_signature = cls._base64url_decode(signature_b64)
            
            if not hmac.compare_digest(expected_signature, actual_signature):
                return None
            
            # Decode payload
            payload = json.loads(cls._base64url_decode(payload_b64))
            
            # Check expiration
            if payload.get('exp', 0) < time.time():
                return None
            
            return payload
        except Exception:
            return None
    
    @classmethod
    def create_token_pair(cls, user_id: int) -> Tuple[str, str]:
        """Create both access and refresh tokens"""
        access_token = cls.create_token(user_id, "access")
        refresh_token = cls.create_token(user_id, "refresh")
        return access_token, refresh_token


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.hasher = PasswordHasher()
        self.jwt = JWTHandler()
    
    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        hashed_password = self.hasher.hash(user_data.password)
        
        user = User(
            email=user_data.email.lower(),
            hashed_password=hashed_password
        )
        
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        return user
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def authenticate(self, email: str, password: str) -> Optional[User]:
        """Authenticate a user by email and password"""
        user = await self.get_user_by_email(email)
        if not user:
            return None
        if not self.hasher.verify(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        return user
    
    async def change_password(self, user: User, new_password: str) -> bool:
        """Change user's password"""
        user.hashed_password = self.hasher.hash(new_password)
        await self.db.commit()
        return True
    
    def create_tokens(self, user: User) -> Tuple[str, str]:
        """Create access and refresh tokens for a user"""
        return self.jwt.create_token_pair(user.id)
    
    async def verify_token(self, token: str) -> Optional[User]:
        """Verify a token and return the user"""
        payload = self.jwt.verify_token(token)
        if not payload:
            return None
        
        user_id = int(payload.get('sub', 0))
        return await self.get_user_by_id(user_id)
    
    async def refresh_access_token(self, refresh_token: str) -> Optional[Tuple[str, User]]:
        """Generate new access token from refresh token"""
        payload = self.jwt.verify_token(refresh_token)
        if not payload or payload.get('type') != 'refresh':
            return None
        
        user_id = int(payload.get('sub', 0))
        user = await self.get_user_by_id(user_id)
        if not user or not user.is_active:
            return None
        
        new_access_token = self.jwt.create_token(user.id, "access")
        return new_access_token, user

