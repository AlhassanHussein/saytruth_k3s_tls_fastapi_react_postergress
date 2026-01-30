from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_current_user_optional, get_db
from app.core.security import decrypt_message, encrypt_message
from app.models.models import Link, LinkMessage, LinkStatus, MessageStatus, User
from app.schemas.schemas import (
    LinkCreate,
    LinkResponse,
    LinkPublicInfo,
    LinkMessageCreate,
    LinkMessageResponse,
    LinkMessagesWithMeta,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Mapping of expiration options to hours
EXPIRATION_MAP = {
    "6h": 6,
    "12h": 12,
    "24h": 24,
    "7d": 7 * 24,
    "30d": 30 * 24,
    "permanent": None,
}


def cleanup_expired_links(db: Session) -> None:
    """Delete expired links and their messages"""
    now = datetime.utcnow()
    expired_links = db.query(Link).filter(
        Link.expires_at.isnot(None),
        Link.expires_at <= now,
        Link.status != LinkStatus.deleted
    ).all()
    
    for link in expired_links:
        link.status = LinkStatus.deleted
    db.commit()


@router.post("/create", response_model=LinkResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/hour")
async def create_link(
    request: Request,
    link_data: LinkCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> Link:
    """
    Create a temporary anonymous messaging link.
    Guest or logged-in users can create links.
    """
    # Generate unique public and private IDs
    public_id = str(uuid.uuid4())
    private_id = str(uuid.uuid4())
    
    # Calculate expiration
    expires_at = None
    if link_data.expiration_option != "permanent":
        hours = EXPIRATION_MAP.get(link_data.expiration_option, 24)
        expires_at = datetime.utcnow() + timedelta(hours=hours)
    
    # Create link
    new_link = Link(
        public_id=public_id,
        private_id=private_id,
        user_id=current_user.id if current_user else None,
        display_name=link_data.display_name,
        expires_at=expires_at,
        status=LinkStatus.active
    )
    
    db.add(new_link)
    db.commit()
    db.refresh(new_link)
    
    return new_link


@router.get("/{public_id}/info", response_model=LinkPublicInfo)
async def get_link_info(
    public_id: str,
    db: Session = Depends(get_db)
) -> Link:
    """
    Get public info about a link (name, expiration).
    No authentication required.
    """
    # Cleanup expired links
    cleanup_expired_links(db)
    
    # Find link
    link = db.query(Link).filter(Link.public_id == public_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # Check if expired
    if link.expires_at and datetime.utcnow() > link.expires_at:
        link.status = LinkStatus.deleted
        db.commit()
        raise HTTPException(status_code=404, detail="Link expired")
    
    if link.status == LinkStatus.deleted:
        raise HTTPException(status_code=404, detail="Link not found")
    
    return link


@router.post("/{public_id}/send", response_model=dict, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def send_message_to_link(
    request: Request,
    public_id: str,
    message_data: LinkMessageCreate,
    db: Session = Depends(get_db)
) -> dict:
    """
    Send an anonymous message to a public link.
    No authentication required.
    """
    # Cleanup expired links
    cleanup_expired_links(db)
    
    # Find link
    link = db.query(Link).filter(Link.public_id == public_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # Check if expired
    if link.expires_at and datetime.utcnow() > link.expires_at:
        link.status = LinkStatus.deleted
        db.commit()
        raise HTTPException(status_code=404, detail="Link expired")
    
    if link.status == LinkStatus.deleted:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # Encrypt message
    encrypted_content = encrypt_message(message_data.content)
    
    # Store message
    new_message = LinkMessage(
        link_id=link.id,
        content=encrypted_content,
        status=MessageStatus.inbox
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return {"message_id": new_message.id, "status": "created"}


@router.get("/{private_id}/messages", response_model=LinkMessagesWithMeta)
async def get_link_messages(
    private_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> dict:
    """
    Get messages sent to a private link, with link metadata for UI countdown.
    Only accessible with the private link.
    """
    # Cleanup expired links
    cleanup_expired_links(db)
    
    # Find link by private_id
    link = db.query(Link).filter(Link.private_id == private_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # Check if expired
    if link.expires_at and datetime.utcnow() > link.expires_at:
        link.status = LinkStatus.deleted
        db.commit()
        raise HTTPException(status_code=404, detail="Link expired")
    
    if link.status == LinkStatus.deleted:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # If link belongs to user, verify ownership
    # If link is for guest, private_id acts as access token
    if link.user_id and current_user and link.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Fetch all messages for this link
    messages = db.query(LinkMessage).filter(
        LinkMessage.link_id == link.id
    ).order_by(LinkMessage.created_at.desc()).all()
    
    # Decrypt messages
    for message in messages:
        message.content = decrypt_message(message.content)
    
    return {
        "messages": messages,
        "display_name": link.display_name,
        "expires_at": link.expires_at,
        "status": link.status,
    }


@router.patch("/{private_id}/messages/{message_id}/make-public", response_model=LinkMessageResponse)
async def make_link_message_public(
    private_id: str,
    message_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> LinkMessage:
    """
    Make a link message public (visible on link display).
    """
    # Find link
    link = db.query(Link).filter(Link.private_id == private_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # Ownership/access check
    if link.user_id and current_user and link.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Find message
    message = db.query(LinkMessage).filter(
        LinkMessage.id == message_id,
        LinkMessage.link_id == link.id
    ).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Update status
    message.status = MessageStatus.public
    db.commit()
    db.refresh(message)
    
    # Decrypt for response
    message.content = decrypt_message(message.content)
    
    return message


@router.patch("/{private_id}/messages/{message_id}/make-private", response_model=LinkMessageResponse)
async def make_link_message_private(
    private_id: str,
    message_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> LinkMessage:
    """
    Make a link message private (only visible via private link).
    """
    # Find link
    link = db.query(Link).filter(Link.private_id == private_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # Ownership/access check
    if link.user_id and current_user and link.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Find message
    message = db.query(LinkMessage).filter(
        LinkMessage.id == message_id,
        LinkMessage.link_id == link.id
    ).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Update status
    message.status = MessageStatus.inbox
    db.commit()
    db.refresh(message)
    
    # Decrypt for response
    message.content = decrypt_message(message.content)
    
    return message


@router.delete("/{private_id}/messages/{message_id}", status_code=status.HTTP_200_OK)
async def delete_link_message(
    private_id: str,
    message_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> dict:
    """
    Soft delete a link message.
    """
    # Find link
    link = db.query(Link).filter(Link.private_id == private_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # Ownership/access check
    if link.user_id and current_user and link.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Find message
    message = db.query(LinkMessage).filter(
        LinkMessage.id == message_id,
        LinkMessage.link_id == link.id
    ).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Delete message from database
    db.delete(message)
    db.commit()
    
    return {"message": "Message deleted"}


@router.get("/my-links", response_model=List[LinkResponse])
async def get_my_links(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Link]:
    """
    Get all links created by the authenticated user.
    Only returns active and non-expired links.
    """
    # Cleanup expired links
    cleanup_expired_links(db)
    
    # Fetch user's links
    links = db.query(Link).filter(
        Link.user_id == current_user.id,
        Link.status == LinkStatus.active
    ).order_by(Link.created_at.desc()).all()
    
    return links


@router.delete("/{link_id}/delete", status_code=status.HTTP_200_OK)
async def delete_link(
    link_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Delete a link and all its associated messages.
    Only the link owner can delete.
    """
    # Find link
    link = db.query(Link).filter(
        Link.id == link_id,
        Link.user_id == current_user.id
    ).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Link not found or unauthorized")
    
    # Delete all messages associated with this link
    db.query(LinkMessage).filter(LinkMessage.link_id == link.id).delete()
    
    # Delete the link
    db.delete(link)
    db.commit()
    
    return {"message": "Link and all messages deleted successfully"}
