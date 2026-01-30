from datetime import datetime
import enum
import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.db.database import Base


class MessageStatus(str, enum.Enum):
    inbox = "inbox"
    public = "public"
    favorite = "favorite"


class LinkStatus(str, enum.Enum):
    active = "active"
    expired = "expired"
    deleted = "deleted"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)  # Optional display name
    secret_phrase = Column(String(255), nullable=False)  # Stored as hint/question
    secret_answer = Column(String(255), nullable=False)  # Hashed answer for auth
    language = Column(String(2), nullable=False, default="EN")  # EN, AR, ES
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(String, nullable=False)
    status = Column(Enum(MessageStatus), nullable=False, default=MessageStatus.inbox)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Link(Base):
    __tablename__ = "links"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(36), unique=True, nullable=False, index=True)  # UUID
    private_id = Column(String(36), unique=True, nullable=False, index=True)  # UUID
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    display_name = Column(String(255), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)  # NULL = permanent
    status = Column(Enum(LinkStatus), nullable=False, default=LinkStatus.active)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LinkMessage(Base):
    __tablename__ = "link_messages"

    id = Column(Integer, primary_key=True, index=True)
    link_id = Column(Integer, ForeignKey("links.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(String, nullable=False)  # Encrypted
    status = Column(Enum(MessageStatus), nullable=False, default=MessageStatus.inbox)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
