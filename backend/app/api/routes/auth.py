from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import re

from app.core.dependencies import get_current_user, get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.models import User
from app.schemas.schemas import (
    PasswordRecovery,
    PasswordRecoveryVerify,
    Token,
    UserLogin,
    UserResponse,
    UserSettingsUpdate,
    UserSignup,
)

router = APIRouter()


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup, db: Session = Depends(get_db)) -> dict:
    """
    Create a new user account with backend validation.
    
    Validation:
    - Username: Instagram-style (letters, numbers, underscores only, no spaces)
    - Username must be 3-50 characters
    - Secret phrase must be 6+ characters
    - Secret answer must be 3+ characters
    - Username must be unique
    
    Returns: Access token for immediate login after signup
    """
    
    # Re-validate username on backend (additional safety check)
    if not re.match(r'^[a-zA-Z0-9_]+$', user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username can only contain letters, numbers, and underscores"
        )
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Create new user with hashed secret answer
    # Secret phrase is stored as plain hint for password recovery
    # Secret answer is hashed for verification during login/recovery
    hashed_answer = get_password_hash(user_data.secret_answer)
    new_user = User(
        username=user_data.username,
        name=user_data.name,
        secret_phrase=user_data.secret_phrase,  # Store as hint/question
        secret_answer=hashed_answer,  # Hashed for verification
        language="EN"  # Default language
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate access token
    access_token = create_access_token(subject=str(new_user.id))
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)) -> dict:
    # Find user by username
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or secret answer"
        )
    
    # Verify secret answer (not phrase!)
    if not verify_password(credentials.secret_answer, user.secret_answer):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or secret answer"
        )
    
    # Generate access token
    access_token = create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/recover", response_model=dict)
async def recover_password(recovery_data: PasswordRecovery, db: Session = Depends(get_db)) -> dict:
    # Find user by username
    user = db.query(User).filter(User.username == recovery_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Return secret phrase as hint (not the hashed answer)
    return {"secret_phrase": user.secret_phrase}


@router.post("/recover/verify", response_model=Token)
async def verify_recovery(verify_data: PasswordRecoveryVerify, db: Session = Depends(get_db)) -> dict:
    # Find user by username
    user = db.query(User).filter(User.username == verify_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify secret answer
    if not verify_password(verify_data.secret_answer, user.secret_answer):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect answer"
        )
    
    # Generate access token (successful recovery = login)
    access_token = create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/settings", response_model=UserResponse)
async def update_settings(
    settings_data: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    # Update language if provided
    if settings_data.language:
        current_user.language = settings_data.language
    
    # Update secret phrase and answer if both provided
    if settings_data.secret_phrase and settings_data.secret_answer:
        current_user.secret_phrase = settings_data.secret_phrase
        current_user.secret_answer = get_password_hash(settings_data.secret_answer)
    elif settings_data.secret_phrase or settings_data.secret_answer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both secret phrase and answer must be provided together"
        )
    
    db.commit()
    db.refresh(current_user)
    return current_user
