from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_current_user_optional, get_db
from app.core.security import decrypt_message, encrypt_message
from app.models.models import Message, MessageStatus, User
from app.schemas.schemas import MessageCreate, MessageResponse, MessageStatusUpdate

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get("/", response_model=List[MessageResponse])
async def get_messages(
    current_user: User = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
) -> List[Message]:
    """
    Get messages for current user.
    Optional status filter: inbox, public, deleted
    By default excludes deleted messages
    """
    query = db.query(Message).filter(Message.receiver_id == current_user.id)
    
    # Apply status filter
    if status_filter:
        if status_filter not in ['inbox', 'public', 'deleted']:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        query = query.filter(Message.status == status_filter)
    else:
        # By default, exclude deleted messages
        query = query.filter(Message.status != MessageStatus.deleted)
    
    messages = query.order_by(Message.created_at.desc()).all()
    
    # Decrypt messages before returning
    for message in messages:
        message.content = decrypt_message(message.content)
    
    return messages


@router.get("/inbox", response_model=dict)
async def get_inbox(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get all messages grouped by status: inbox, public, favorite
    inbox = db.query(Message).filter(
        Message.receiver_id == current_user.id,
        Message.status == MessageStatus.inbox
    ).order_by(Message.created_at.desc()).all()
    
    public = db.query(Message).filter(
        Message.receiver_id == current_user.id,
        Message.status == MessageStatus.public
    ).order_by(Message.created_at.desc()).all()
    
    favorite = db.query(Message).filter(
        Message.receiver_id == current_user.id,
        Message.status == MessageStatus.favorite
    ).order_by(Message.created_at.desc()).all()
    
    # Decrypt all messages
    for msg_list in [inbox, public, favorite]:
        for msg in msg_list:
            msg.content = decrypt_message(msg.content)
    
    return {
        "inbox": [{"id": m.id, "receiver_id": m.receiver_id, "content": m.content, "status": m.status.value, "created_at": m.created_at} for m in inbox],
        "public": [{"id": m.id, "receiver_id": m.receiver_id, "content": m.content, "status": m.status.value, "created_at": m.created_at} for m in public],
        "favorite": [{"id": m.id, "receiver_id": m.receiver_id, "content": m.content, "status": m.status.value, "created_at": m.created_at} for m in favorite]
    }


@router.post("/send", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def send_message(
    request: Request,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> Message:
    # Find receiver by username
    receiver = db.query(User).filter(User.username == message_data.receiver_username).first()
    if not receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receiver not found"
        )
    
    # Encrypt message content before storing
    encrypted_content = encrypt_message(message_data.content)
    
    # Create message (anonymous if no current_user)
    new_message = Message(
        receiver_id=receiver.id,
        content=encrypted_content,
        status=MessageStatus.inbox
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    # Decrypt for response
    new_message.content = decrypt_message(new_message.content)
    
    return new_message


@router.patch("/{message_id}/status", response_model=MessageResponse)
async def update_message_status(
    message_id: int,
    status_update: MessageStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Message:
    # Find message
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    
    # Verify ownership
    if message.receiver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Update status
    message.status = MessageStatus(status_update.status)
    db.commit()
    db.refresh(message)
    
    # Decrypt for response
    message.content = decrypt_message(message.content)
    
    return message


@router.patch("/{message_id}/make-public", response_model=MessageResponse)
async def make_message_public(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Message:
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    
    # Verify ownership
    if message.receiver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    message.status = MessageStatus.public
    db.commit()
    db.refresh(message)
    
    # Decrypt for response
    message.content = decrypt_message(message.content)
    
    return message


@router.patch("/{message_id}/make-private", response_model=MessageResponse)
async def make_message_private(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Message:
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    
    # Verify ownership
    if message.receiver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    message.status = MessageStatus.inbox
    db.commit()
    db.refresh(message)
    
    # Decrypt for response
    message.content = decrypt_message(message.content)
    
    return message


@router.delete("/{message_id}", status_code=status.HTTP_200_OK)
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Hard delete a message. Permanently removes it from the database.
    """
    # Find message
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    
    # Verify ownership
    if message.receiver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Hard delete
    db.delete(message)
    db.commit()
    
    return {"message": "Message permanently deleted"}


@router.patch("/{message_id}/add-favorite", response_model=MessageResponse)
async def add_to_favorite(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Message:
    """
    Move message to favorite. Only works for inbox messages.
    """
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    
    # Verify ownership
    if message.receiver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    message.status = MessageStatus.favorite
    db.commit()
    db.refresh(message)
    
    # Decrypt for response
    message.content = decrypt_message(message.content)
    
    return message


@router.patch("/{message_id}/remove-favorite", response_model=MessageResponse)
async def remove_from_favorite(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Message:
    """
    Move message from favorite back to inbox.
    """
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    
    # Verify ownership
    if message.receiver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    message.status = MessageStatus.inbox
    db.commit()
    db.refresh(message)
    
    # Decrypt for response
    message.content = decrypt_message(message.content)
    
    return message


@router.delete("/section/{section}/all", status_code=status.HTTP_200_OK)
async def delete_all_in_section(
    section: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Hard delete all messages in a section (inbox, public, favorite).
    """
    if section not in ['inbox', 'public', 'favorite']:
        raise HTTPException(status_code=400, detail="Invalid section")
    
    # Convert section string to MessageStatus enum
    status_enum = MessageStatus(section)
    
    # Find all messages in section for this user
    messages = db.query(Message).filter(
        Message.receiver_id == current_user.id,
        Message.status == status_enum
    ).all()
    
    # Delete all messages
    for msg in messages:
        db.delete(msg)
    
    db.commit()
    
    return {"message": f"Deleted {len(messages)} messages from {section}"}
