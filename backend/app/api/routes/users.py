from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_current_user_optional, get_db
from app.core.security import decrypt_message
from app.models.models import Follow, Message, MessageStatus, User
from app.schemas.schemas import FollowResponse, UserPublicProfile, UserResponse, UserSearch

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/search", response_model=List[UserResponse])
@limiter.limit("10/minute")
async def search_users(
    request: Request,
    search_data: UserSearch,
    db: Session = Depends(get_db)
) -> List[User]:
    # Search users by username or name (case-insensitive partial match)
    users = db.query(User).filter(
        (User.username.ilike(f"%{search_data.username}%")) |
        (User.name.ilike(f"%{search_data.username}%"))
    ).limit(20).all()
    return users


@router.get("/username/{username}", response_model=dict)
async def get_public_profile_by_username(
    username: str,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Public profile lookup by username for shareable links.
    Mirrors the /{user_id} response.
    """
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    public_messages = db.query(Message).filter(
        Message.receiver_id == user.id,
        Message.status == MessageStatus.public
    ).order_by(Message.created_at.desc()).limit(20).all()

    for msg in public_messages:
        msg.content = decrypt_message(msg.content)

    is_following = False
    if current_user:
        follow = db.query(Follow).filter(
            Follow.follower_id == current_user.id,
            Follow.following_id == user.id
        ).first()
        is_following = bool(follow)

    return {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "public_messages": [
            {
                "id": m.id,
                "receiver_id": m.receiver_id,
                "content": m.content,
                "status": m.status.value,
                "created_at": m.created_at
            } for m in public_messages
        ],
        "is_following": is_following
    }


@router.get("/{user_id}", response_model=dict)
async def get_public_profile(
    user_id: int,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Get public messages
    public_messages = db.query(Message).filter(
        Message.receiver_id == user_id,
        Message.status == MessageStatus.public
    ).order_by(Message.created_at.desc()).limit(20).all()
    
    # Decrypt messages
    for msg in public_messages:
        msg.content = decrypt_message(msg.content)
    
    # Check if current user is following (if logged in)
    is_following = False
    if current_user:
        follow = db.query(Follow).filter(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id
        ).first()
        is_following = bool(follow)
    
    return {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "public_messages": [
            {
                "id": m.id,
                "receiver_id": m.receiver_id,
                "content": m.content,
                "status": m.status.value,
                "created_at": m.created_at
            } for m in public_messages
        ],
        "is_following": is_following
    }


@router.get("/{user_id}/follow-status", response_model=dict)
async def check_follow_status(
    user_id: int,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Check if current user is following the given user.
    Returns {"is_following": true/false}
    """
    if not current_user:
        return {"is_following": False}
    
    if user_id == current_user.id:
        return {"is_following": False}
    
    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id
    ).first()
    
    return {"is_following": bool(follow)}


@router.post("/follow/{user_id}", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/hour")
async def follow_user(
    request: Request,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Cannot follow yourself
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself")
    
    # Check if user exists
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Check if already following
    existing = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already following")
    
    # Create follow
    new_follow = Follow(
        follower_id=current_user.id,
        following_id=user_id
    )
    db.add(new_follow)
    db.commit()
    db.refresh(new_follow)
    
    return {"message": "Now following", "follow_id": new_follow.id}


@router.delete("/unfollow/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id
    ).first()
    
    if not follow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not following this user")
    
    db.delete(follow)
    db.commit()


@router.get("/me/following", response_model=List[UserResponse])
async def get_my_following(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[User]:
    """
    Get list of users that the current user is following.
    """
    follows = db.query(Follow).filter(Follow.follower_id == current_user.id).all()
    following_ids = [f.following_id for f in follows]
    
    if not following_ids:
        return []
    
    users = db.query(User).filter(User.id.in_(following_ids)).all()
    return users


@router.get("/following", response_model=List[UserResponse])
async def get_following(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[User]:
    # Deprecated - use /me/following instead
    # Get all users current user follows
    follows = db.query(Follow).filter(Follow.follower_id == current_user.id).all()
    following_ids = [f.following_id for f in follows]
    
    if not following_ids:
        return []
    
    users = db.query(User).filter(User.id.in_(following_ids)).all()
    return users


@router.get("/followers", response_model=List[UserResponse])
async def get_followers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[User]:
    # Get all users following current user
    follows = db.query(Follow).filter(Follow.following_id == current_user.id).all()
    follower_ids = [f.follower_id for f in follows]
    
    if not follower_ids:
        return []
    
    users = db.query(User).filter(User.id.in_(follower_ids)).all()
    return users
