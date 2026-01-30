import { useState, useEffect } from 'react';
import './LinkCard.css';

const LinkCard = ({ link, onDelete }) => {
    const [timeRemaining, setTimeRemaining] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const now = new Date();
            const created = new Date(link.createdAt);

            // Convert duration to milliseconds
            const durationMs = {
                '6h': 6 * 60 * 60 * 1000,
                '12h': 12 * 60 * 60 * 1000,
                '24h': 24 * 60 * 60 * 1000,
                '1w': 7 * 24 * 60 * 60 * 1000,
                '1m': 30 * 24 * 60 * 60 * 1000,
            }[link.duration];

            const expiresAt = new Date(created.getTime() + durationMs);
            const remaining = expiresAt - now;

            if (remaining <= 0) {
                setTimeRemaining('Expired');
                return;
            }

            const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) {
                setTimeRemaining(`${days}d ${hours}h remaining`);
            } else if (hours > 0) {
                setTimeRemaining(`${hours}h ${minutes}m remaining`);
            } else {
                setTimeRemaining(`${minutes}m remaining`);
            }
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [link]);

    const handleCopy = async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const getDurationLabel = (duration) => {
        const labels = {
            '6h': '6 Hours',
            '12h': '12 Hours',
            '24h': '24 Hours',
            '1w': '1 Week',
            '1m': '1 Month',
        };
        return labels[duration];
    };

    return (
        <div className="link-card animate-slideUp">
            <div className="link-card-header">
                <div className="link-info">
                    <h3 className="link-name">{link.name}</h3>
                    <div className="link-meta">
                        <span className="duration-badge">{getDurationLabel(link.duration)}</span>
                        <span className="time-remaining">{timeRemaining}</span>
                    </div>
                </div>
                <button
                    className="delete-btn"
                    onClick={() => onDelete(link.id)}
                    aria-label="Delete link"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            </div>

            <div className="link-actions">
                <button
                    className="action-btn public-link-btn"
                    onClick={() => handleCopy(link.publicUrl)}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    {copied ? 'Copied!' : 'Copy Public Link'}
                </button>

                <button className="action-btn private-link-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    View Messages
                </button>
            </div>
        </div>
    );
};

export default LinkCard;
