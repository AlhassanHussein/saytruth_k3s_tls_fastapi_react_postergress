import { useState, useEffect } from 'react';
import { translations } from '../i18n/translations';
import './UserFollowingCard.css';

const UserFollowingCard = ({ user, onCardClick, language = 'EN' }) => {
    const [lastMessage, setLastMessage] = useState(null);
    const t = translations[language] || translations.EN;

    useEffect(() => {
        if (user.public_messages && user.public_messages.length > 0) {
            setLastMessage(user.public_messages[0]);
        }
    }, [user.public_messages]);

    const truncateText = (text, maxLines = 2) => {
        if (!text) return '';
        const lines = text.split('\n');
        if (lines.length > maxLines) {
            return lines.slice(0, maxLines).join('\n') + '...';
        }
        if (text.length > 150) {
            return text.substring(0, 150) + '...';
        }
        return text;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t.time.now;
        if (diffMins < 60) return `${diffMins}${t.time.minutesShort}`;
        if (diffHours < 24) return `${diffHours}${t.time.hoursShort}`;
        if (diffDays < 7) return `${diffDays}${t.time.daysShort}`;
        return date.toLocaleDateString();
    };

    return (
        <div className="user-following-card" onClick={onCardClick} style={{ cursor: 'pointer' }}>
            <div className="user-card-header">
                <div className="user-avatar">
                    <span className="avatar-initial">
                        {(user.name || user.username).charAt(0).toUpperCase()}
                    </span>
                </div>
                <div className="user-info">
                    <h3 className="user-name">{user.name || user.username}</h3>
                    <p className="user-username">@{user.username}</p>
                </div>
            </div>

            {lastMessage ? (
                <div className="user-last-message">
                    <p className="message-label">{t.userProfile.lastMessage}</p>
                    <p className="message-content">{truncateText(lastMessage.content)}</p>
                    <p className="message-time">{formatDate(lastMessage.created_at)}</p>
                </div>
            ) : (
                <div className="user-bio-empty">
                    <p className="bio-label">{t.userProfile.noMessagesYet}</p>
                </div>
            )}

            <div className="card-footer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>
    );
};

export default UserFollowingCard;
