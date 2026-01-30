import { useMemo, useState, useEffect } from 'react';
import './MessagesTab.css';
import { messagesAPI } from '../services/api';
import { translations } from '../i18n/translations';

const MessagesTab = ({ isAuthenticated, onLoginClick, onSignupClick, language = 'EN' }) => {
    const [activeTab, setActiveTab] = useState('inbox');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [operatingIds, setOperatingIds] = useState(new Set());
    const [deleteConfirm, setDeleteConfirm] = useState(null); // For bulk delete confirmation
    const [pageOffset, setPageOffset] = useState(0);
    const MESSAGES_PER_PAGE = 10;

    const t = translations[language] || translations.EN;
    const isRTL = language === 'AR';

    // Load messages on mount - ONLY if authenticated
    useEffect(() => {
        const fetchMessages = async () => {
            // CRITICAL: Never call protected endpoints as guest
            if (!isAuthenticated) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // Fetch grouped inbox data
                const inboxData = await messagesAPI.getInbox();
                
                // Flatten and add status to each message
                const allMessages = [];
                if (inboxData.inbox) {
                    allMessages.push(...inboxData.inbox.map(msg => ({ ...msg, status: 'inbox' })));
                }
                if (inboxData.public) {
                    allMessages.push(...inboxData.public.map(msg => ({ ...msg, status: 'public' })));
                }
                if (inboxData.favorite) {
                    allMessages.push(...inboxData.favorite.map(msg => ({ ...msg, status: 'favorite' })));
                }
                
                setMessages(allMessages);
                setPageOffset(0);
            } catch (error) {
                console.error('Failed to load messages:', error);
                setMessages([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [isAuthenticated]); // Re-fetch when auth state changes

    const counts = useMemo(() => {
        return messages.reduce(
            (acc, msg) => {
                acc[msg.status] = (acc[msg.status] || 0) + 1;
                return acc;
            },
            { inbox: 0, public: 0, favorite: 0 }
        );
    }, [messages]);

    const filteredMessages = useMemo(() => {
        return messages.filter((msg) => msg.status === activeTab);
    }, [messages, activeTab]);

    const paginatedMessages = useMemo(() => {
        const start = pageOffset * MESSAGES_PER_PAGE;
        const end = start + MESSAGES_PER_PAGE;
        return filteredMessages.slice(start, end);
    }, [filteredMessages, pageOffset]);

    const totalPages = Math.ceil(filteredMessages.length / MESSAGES_PER_PAGE);

    // Optimistic update for state changes
    const updateMessageStatus = async (id, newStatus) => {
        // Add to operating set
        setOperatingIds(prev => new Set([...prev, id]));

        // Optimistic update
        const oldMessages = messages;
        setMessages(prev => prev.map(msg => 
            msg.id === id ? { ...msg, status: newStatus } : msg
        ));

        try {
            if (newStatus === 'public') {
                await messagesAPI.makeMessagePublic(id);
            } else if (newStatus === 'inbox') {
                await messagesAPI.makeMessagePrivate(id);
            } else if (newStatus === 'favorite') {
                await messagesAPI.addToFavorite(id);
            }
        } catch (error) {
            console.error('Failed to update message:', error);
            // Rollback on error
            setMessages(oldMessages);
        } finally {
            setOperatingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleDelete = async (id) => {
        // Add to operating set
        setOperatingIds(prev => new Set([...prev, id]));

        try {
            await messagesAPI.deleteMessage(id);
            // Remove from local state
            setMessages(prev => prev.filter(msg => msg.id !== id));
        } catch (error) {
            console.error('Failed to delete message:', error);
        } finally {
            setOperatingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleDeleteAll = async () => {
        if (!deleteConfirm) return;

        try {
            await messagesAPI.deleteAllInSection(activeTab);
            // Remove all messages with this status from local state
            setMessages(prev => prev.filter(msg => msg.status !== activeTab));
            setDeleteConfirm(null);
            setPageOffset(0);
        } catch (error) {
            console.error('Failed to delete all messages:', error);
            setDeleteConfirm(null);
        }
    };

    const handleMakePublic = (id) => {
        updateMessageStatus(id, 'public');
    };

    const handleMakePrivate = (id) => {
        updateMessageStatus(id, 'inbox');
    };

    const handleAddFavorite = (id) => {
        updateMessageStatus(id, 'favorite');
    };

    // GUEST MODE: Show locked UI instead of calling protected endpoints
    if (!isAuthenticated) {
        return (
            <div className={`messages-tab ${isRTL ? 'rtl' : ''}`} style={{ padding: '1rem', maxWidth: '520px', margin: '0 auto' }}>
                <section className="empty-state-card">
                    <div className="empty-state-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                    <h2 className="empty-state-title">{t.messages.lockedTitle}</h2>
                    <p className="empty-state-subtitle">
                        {t.messages.lockedSubtitle}
                    </p>
                    <div className="empty-state-actions">
                        <button
                            className="btn btn-primary"
                            onClick={onLoginClick}
                        >
                            {t.buttons.login}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={onSignupClick}
                        >
                            {t.buttons.signup}
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className={`messages-tab ${isRTL ? 'rtl' : ''}`}>
            <section className="messages-hero card">
                <div className="hero-row">
                    <div className="hero-copy">
                        <span className="eyebrow">{t.nav.messages}</span>
                        <h1 className="hero-title">{t.messages.introTitle}</h1>
                        <p className="hero-subtitle">{t.messages.introSubtitle}</p>
                    </div>
                </div>
                
                <p className="hero-description">{t.messages.introDescription}</p>
                
                <div className="hero-bullets">
                    <div className="bullet-item">
                        <span className="bullet-dot">•</span>
                        <p>{t.messages.introBullets?.inbox}</p>
                    </div>
                    <div className="bullet-item">
                        <span className="bullet-dot">•</span>
                        <p>{t.messages.introBullets?.public}</p>
                    </div>
                    <div className="bullet-item">
                        <span className="bullet-dot">•</span>
                        <p>{t.messages.introBullets?.favorite}</p>
                    </div>
                </div>
            </section>

            <section className="page-tabs">
                {['inbox', 'public', 'favorite'].map((tab) => (
                    <button
                        key={tab}
                        className={`page-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab(tab);
                            setPageOffset(0);
                        }}
                    >
                        <span>{t.messages.tabs?.[tab] || tab}</span>
                        <span className="count-badge">{counts[tab] || 0}</span>
                    </button>
                ))}
            </section>

            <section className="messages-list card">
                <div className="list-header">
                    <div>
                        <p className="eyebrow subtle">{t.messages.tabs?.[activeTab] || activeTab}</p>
                        <h2 className="list-title">{filteredMessages.length} {filteredMessages.length === 1 ? t.messages.messageSingular : t.messages.messagePlural}</h2>
                    </div>
                    {filteredMessages.length > 0 && (
                        <button 
                            className="btn btn-danger-small"
                            onClick={() => setDeleteConfirm(activeTab)}
                        >
                            {t.buttons.deleteAll || 'Delete All'}
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="empty-state">
                        <div className="empty-icon">⏳</div>
                        <h3 className="empty-title">{t.common.loading}</h3>
                    </div>
                ) : filteredMessages.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <h3 className="empty-title">{t.messages.noMessages}</h3>
                        <p className="empty-description">{t.messages.noMessagesText}</p>
                    </div>
                ) : (
                    <>
                        {/* Section Header Card */}
                        <div className="section-header-card">
                            <p>{t.messages.sectionHeaders?.[activeTab] || ''}</p>
                        </div>
                        
                        <div className="message-stack">
                            {paginatedMessages.map((msg) => (
                                <article key={msg.id} className="message-card animate-slideUp">
                                    <div className="message-top">
                                        <div className="chip primary">{t.messages.anonymous}</div>
                                        <span className="timestamp">{msg.created_at ? new Date(msg.created_at).toLocaleDateString() : t.common.loading}</span>
                                    </div>

                                    <p className="message-body">{msg.content}</p>

                                    <div className="message-actions">
                                        <button 
                                            className="btn btn-small btn-danger" 
                                            onClick={() => handleDelete(msg.id)}
                                            disabled={operatingIds.has(msg.id)}
                                        >
                                            {t.buttons.delete || 'Delete'}
                                        </button>

                                        {activeTab === 'inbox' && (
                                            <>
                                                <button 
                                                    className="btn btn-small" 
                                                    onClick={() => handleMakePublic(msg.id)}
                                                    disabled={operatingIds.has(msg.id)}
                                                >
                                                    {t.buttons.makePublic || 'Make Public'}
                                                </button>
                                                <button 
                                                    className="btn btn-small" 
                                                    onClick={() => handleAddFavorite(msg.id)}
                                                    disabled={operatingIds.has(msg.id)}
                                                >
                                                    {t.buttons.addToFavorite || 'Add to Favorite'}
                                                </button>
                                            </>
                                        )}

                                        {activeTab === 'public' && (
                                            <button 
                                                className="btn btn-small" 
                                                onClick={() => handleAddFavorite(msg.id)}
                                                disabled={operatingIds.has(msg.id)}
                                            >
                                                {t.buttons.addToFavorite || 'Add to Favorite'}
                                            </button>
                                        )}

                                        {activeTab === 'favorite' && (
                                            <button 
                                                className="btn btn-small" 
                                                onClick={() => handleMakePublic(msg.id)}
                                                disabled={operatingIds.has(msg.id)}
                                            >
                                                {t.buttons.moveToPublic || 'Move to Public'}
                                            </button>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="pagination-controls">
                                <button 
                                    onClick={() => setPageOffset(Math.max(0, pageOffset - 1))}
                                    disabled={pageOffset === 0}
                                    className="btn btn-small"
                                >
                                    ← {t.buttons.previous || 'Previous'}
                                </button>
                                <span className="pagination-info">
                                    {pageOffset + 1} / {totalPages}
                                </span>
                                <button 
                                    onClick={() => setPageOffset(Math.min(totalPages - 1, pageOffset + 1))}
                                    disabled={pageOffset >= totalPages - 1}
                                    className="btn btn-small"
                                >
                                    {t.buttons.next || 'Next'} →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* Delete All Confirmation Modal */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{t.messages.confirmDelete || 'Confirm Delete All'}</h2>
                        <p>
                            {t.messages.confirmDeleteMessage || `Are you sure you want to permanently delete all messages in ${activeTab}? This cannot be undone.`}
                        </p>
                        <div className="modal-actions">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setDeleteConfirm(null)}
                            >
                                {t.buttons.cancel}
                            </button>
                            <button 
                                className="btn btn-danger"
                                onClick={handleDeleteAll}
                            >
                                {t.buttons.delete}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagesTab;
