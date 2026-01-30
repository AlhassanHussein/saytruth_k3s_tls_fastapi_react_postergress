import { useState, useEffect } from 'react';
import { linksAPI } from '../services/api';
import { translations } from '../i18n/translations';
import './LinksTab.css';

const LinksTab = ({ isAuthenticated, language = 'EN' }) => {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState(null);

    // Creation states
    const [displayName, setDisplayName] = useState('');
    const [expiration, setExpiration] = useState('24h');
    const [creating, setCreating] = useState(false);
    const [createdLink, setCreatedLink] = useState(null);
    const [copiedPublic, setCopiedPublic] = useState(false);
    const [copiedPrivate, setCopiedPrivate] = useState(false);
    const [showGuestWarning, setShowGuestWarning] = useState(false);

    // Delete confirmation state
    const [deletingLinkId, setDeletingLinkId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const t = translations[language] || translations.EN;
    const guestExpirations = ['6h', '12h', '24h'];
    const loggedInExpirations = ['6h', '12h', '24h', '7d', '30d'];
    const availableExpirations = isAuthenticated ? loggedInExpirations : guestExpirations;

    useEffect(() => {
        if (isAuthenticated) {
            fetchUserLinks();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const fetchUserLinks = async () => {
        try {
            setLoading(true);
            const userLinks = await linksAPI.getUserLinks();
            setLinks(userLinks);
        } catch (err) {
            console.error('Failed to load links:', err);
            setLinks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        if (!isAuthenticated && !guestExpirations.includes(expiration)) {
            setShowGuestWarning(true);
            setTimeout(() => setShowGuestWarning(false), 5000);
            return;
        }

        setCreating(true);
        setShowGuestWarning(false);

        try {
            const link = await linksAPI.createLink({
                display_name: displayName || 'Anonymous',
                expiration_option: expiration,
            });
            setCreatedLink(link);
            setDisplayName('');
            if (isAuthenticated) {
                fetchUserLinks();
            }
        } catch (err) {
            console.error('Failed to create link:', err);
            alert(t.errors.generic);
        } finally {
            setCreating(false);
        }
    };

    const handleCopy = async (url, id) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const copyCreated = async (url, type) => {
        try {
            await navigator.clipboard.writeText(url);
            if (type === 'public') {
                setCopiedPublic(true);
                setTimeout(() => setCopiedPublic(false), 2000);
            } else {
                setCopiedPrivate(true);
                setTimeout(() => setCopiedPrivate(false), 2000);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const getPublicUrl = (publicId) => `${window.location.origin}/link/public/${publicId}`;
    const getPrivateUrl = (privateId) => `${window.location.origin}/link/private/${privateId}`;

    const getTimeRemaining = (expiresAt) => {
        if (!expiresAt) return t.links.permanent;

        const now = new Date();
        const expires = new Date(expiresAt);
        const remaining = expires - now;

        if (remaining <= 0) return t.links.expired;

        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const isExpired = (expiresAt) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) <= new Date();
    };

    const formatExpiration = (expiresAt) => {
        if (!expiresAt) return t.links.permanent;
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires - now;
        if (diff <= 0) return t.links.expired;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days} ${t.links.days}`;
        if (hours > 0) return `${hours} ${t.links.hours}`;
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (minutes > 0) return `${minutes} min`;
        return t.links.lessThanHour;
    };

    const handleDeleteLink = async () => {
        if (!deletingLinkId) return;
        
        try {
            await linksAPI.deleteLink(deletingLinkId);
            setLinks(links.filter(link => link.id !== deletingLinkId));
            setShowDeleteModal(false);
            setDeletingLinkId(null);
        } catch (err) {
            console.error('Failed to delete link:', err);
            alert(t.errors?.generic || 'Failed to delete link');
        }
    };

    const confirmDelete = (linkId) => {
        setDeletingLinkId(linkId);
        setShowDeleteModal(true);
    };

    if (loading) {
        return (
            <div className="links-tab" style={{ padding: '2rem', maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
                <div className="card" style={{ padding: '2rem' }}>
                    <p>{t.common.loading}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="links-tab" style={{ padding: '1rem', maxWidth: '520px', margin: '0 auto', paddingBottom: '6rem' }}>
            {/* Intro Hero Card */}
            <section className="card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 700 }}>{t.nav.links}</span>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.5rem 0' }}>{t.links.introTitle}</h1>
                <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', marginBottom: '1rem' }}>{t.links.introSubtitle}</p>
                
                <p style={{ color: 'var(--gray-700)', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '1rem' }}>
                    {t.links.introDescription}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-150)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1rem', marginTop: '-2px' }}>•</span>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--gray-700)', lineHeight: '1.5' }}>
                            {t.links.introBullets?.generate}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1rem', marginTop: '-2px' }}>•</span>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--gray-700)', lineHeight: '1.5' }}>
                            {t.links.introBullets?.public}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1rem', marginTop: '-2px' }}>•</span>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--gray-700)', lineHeight: '1.5' }}>
                            {t.links.introBullets?.private}
                        </p>
                    </div>
                </div>
            </section>

            {/* Create link section */}
            <section className="card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>{t.links.createLinkTitle}</h2>
                <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', marginBottom: '1rem' }}>{t.links.generateSubtitle}</p>
                <form onSubmit={handleCreate}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>{t.links.displayNameLabel}</label>
                        <input
                            type="text"
                            placeholder={t.links.displayNamePlaceholder}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)' }}
                            maxLength="50"
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>{t.links.durationLabel}</label>
                        <select
                            value={expiration}
                            onChange={(e) => setExpiration(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--gray-200)' }}
                        >
                            {availableExpirations.map((exp) => (
                                <option key={exp} value={exp}>{
                                    {
                                        '6h': t.links.duration6h,
                                        '12h': t.links.duration12h,
                                        '24h': t.links.duration24h,
                                        '7d': t.links.duration7d,
                                        '30d': t.links.duration30d
                                    }[exp]
                                }</option>
                            ))}
                        </select>
                    </div>

                    {showGuestWarning && (
                        <div style={{ padding: '0.75rem', background: 'var(--warning-light)', color: 'var(--warning)', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            ⚠️ {t.links.guestWarning}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={creating}
                        className="action primary"
                        style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}
                    >
                        {creating ? t.common.loading : t.links.createBtn}
                    </button>
                </form>
            </section>

            {createdLink && (
                <section className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t.links.linksGenerated}</h2>
                        <div style={{ padding: '0.5rem 0.75rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                            {t.links.expiresIn} {formatExpiration(createdLink.expires_at)}
                        </div>
                    </div>

                    <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: '0.75rem', marginBottom: '1rem', border: '1px solid var(--gray-100)' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>🌍</span>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{t.links.publicLinkTitle}</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>{t.links.publicLinkDesc}</p>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                                    /link/public/{createdLink.public_id}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => copyCreated(getPublicUrl(createdLink.public_id), 'public')}
                            className="action primary"
                            style={{ width: '100%' }}
                        >
                            {copiedPublic ? t.links.copied : t.links.copyPublic}
                        </button>
                    </div>

                    <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: '0.75rem', border: '1px solid var(--gray-100)' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>🔒</span>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{t.links.privateLinkTitle}</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>{t.links.privateLinkDesc}</p>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                                    /link/private/{createdLink.private_id}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => copyCreated(getPrivateUrl(createdLink.private_id), 'private')}
                                className="action outline"
                                style={{ flex: 1 }}
                            >
                                {copiedPrivate ? t.links.copied : t.links.copyPrivate}
                            </button>
                            <a
                                href={`/link/private/${createdLink.private_id}`}
                                className="action primary"
                                style={{ flex: 1, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {t.links.viewInbox}
                            </a>
                        </div>
                    </div>
                </section>
            )}

            {/* My links (auth only) */}
            <section className="card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{t.links.myLinksTitle}</h1>
                <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>{t.links.myLinksSubtitle}</p>
            </section>

            {!isAuthenticated && (
                <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                    <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{t.links.loginToView}</h3>
                    <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                        {t.links.guestLinksWarning}
                    </p>
                </div>
            )}

            {isAuthenticated && (
                links.length === 0 ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                        <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{t.links.noLinksYet}</h3>
                        <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                            {t.links.noLinksDesc}
                        </p>
                    </div>
                ) : (
                    links.map((link) => {
                        const expired = isExpired(link.expires_at);
                        const publicUrl = getPublicUrl(link.public_id);
                        const privateUrl = getPrivateUrl(link.private_id);

                        return (
                            <div key={link.public_id} className="card" style={{ marginBottom: '1rem', padding: '1.5rem', opacity: expired ? 0.6 : 1 }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>{link.display_name || t.links.anonymous}</h3>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '1rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            background: expired ? 'var(--gray-200)' : 'var(--primary-light)',
                                            color: expired ? 'var(--gray-600)' : 'var(--primary)'
                                        }}>
                                            {expired ? t.links.expired : `⏱ ${getTimeRemaining(link.expires_at)}`}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                        {t.links.created} {new Date(link.created_at).toLocaleDateString()}
                                    </p>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '1rem' }}>🌍</span>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-700)' }}>{t.links.publicLinkTitle}</label>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            value={publicUrl}
                                            readOnly
                                            style={{
                                                flex: 1,
                                                padding: '0.5rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid var(--gray-200)',
                                                fontSize: '0.75rem',
                                                fontFamily: 'monospace',
                                                background: 'var(--gray-50)'
                                            }}
                                        />
                                        <button
                                            onClick={() => handleCopy(publicUrl, `public-${link.public_id}`)}
                                            disabled={expired}
                                            className="action outline"
                                            style={{ whiteSpace: 'nowrap', fontSize: '0.875rem' }}
                                        >
                                            {copiedId === `public-${link.public_id}` ? t.links.copied : t.links.copy}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '1rem' }}>🔒</span>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-700)' }}>{t.links.privateLinkTitle}</label>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            value={privateUrl}
                                            readOnly
                                            style={{
                                                flex: 1,
                                                padding: '0.5rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid var(--gray-200)',
                                                fontSize: '0.75rem',
                                                fontFamily: 'monospace',
                                                background: 'var(--gray-50)'
                                            }}
                                        />
                                        <button
                                            onClick={() => handleCopy(privateUrl, `private-${link.private_id}`)}
                                            className="action outline"
                                            style={{ whiteSpace: 'nowrap', fontSize: '0.875rem' }}
                                        >
                                            {copiedId === `private-${link.private_id}` ? t.links.copied : t.links.copy}
                                        </button>
                                        <a
                                            href={privateUrl}
                                            className="action primary"
                                            style={{ whiteSpace: 'nowrap', fontSize: '0.875rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                                        >
                                            {t.links.view}
                                        </a>
                                    </div>
                                </div>

                                {/* Delete button */}
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-100)' }}>
                                    <button
                                        onClick={() => confirmDelete(link.id)}
                                        className="action"
                                        style={{ 
                                            width: '100%', 
                                            fontSize: '0.875rem',
                                            color: 'var(--danger)',
                                            background: 'transparent',
                                            border: '1px solid var(--danger)',
                                        }}
                                    >
                                        🗑️ {t.links.deleteLink}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )
            )}

            {/* Delete confirmation modal */}
            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div className="card" style={{ 
                        maxWidth: '400px', 
                        width: '100%',
                        padding: '1.5rem'
                    }}>
                        <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                            {t.links.confirmDeleteLink}
                        </h3>
                        <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            {t.links.confirmDeleteLinkMessage}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeletingLinkId(null);
                                }}
                                className="action outline"
                                style={{ flex: 1 }}
                            >
                                {t.common.cancel}
                            </button>
                            <button
                                onClick={handleDeleteLink}
                                className="action primary"
                                style={{ 
                                    flex: 1,
                                    background: 'var(--danger)',
                                    borderColor: 'var(--danger)'
                                }}
                            >
                                {t.common.delete}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LinksTab;
