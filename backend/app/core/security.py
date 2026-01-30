from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import os
import hashlib

from cryptography.fernet import Fernet
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Message encryption setup
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Generate a key for development (should be set in production)
    ENCRYPTION_KEY = Fernet.generate_key().decode()
    print(f"⚠️  WARNING: Using auto-generated encryption key. Set ENCRYPTION_KEY in production!")

cipher = Fernet(ENCRYPTION_KEY.encode())


def encrypt_message(content: str) -> str:
    """Encrypt message content for storage"""
    return cipher.encrypt(content.encode()).decode()


def decrypt_message(encrypted_content: str) -> str:
    """Decrypt message content for reading"""
    try:
        return cipher.decrypt(encrypted_content.encode()).decode()
    except Exception:
        # If decryption fails, return placeholder (corrupted data)
        return "[Message content unavailable]"


def _preprocess_for_bcrypt(password: str) -> str:
    """
    Preprocess password for bcrypt to avoid 72-byte limit.
    Truncate to 72 bytes before hashing to ensure bcrypt compatibility.
    """
    # Truncate to 72 bytes to respect bcrypt's password length limit
    truncated = password[:72]
    return truncated


def verify_password(plain_password: str, hashed_password: str) -> bool:
    preprocessed = _preprocess_for_bcrypt(plain_password)
    return pwd_context.verify(preprocessed, hashed_password)


def get_password_hash(password: str) -> str:
    preprocessed = _preprocess_for_bcrypt(password)
    return pwd_context.hash(preprocessed)


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode: dict[str, Any] = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)



def decode_access_token(token: str) -> Optional[str]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        return user_id
    except JWTError:
        return None
