import { useMemo, useState } from 'react';
import { translations } from '../i18n/translations';
import './ProfilePage.css';

const ProfilePage = ({ isAuthenticated, currentUser, onLogout, onLoginClick, onSignupClick, onSettingsClick, language = 'EN' }) => {
    const t = translations[language] || translations.EN;
    const [copied, setCopied] = useState(false);
    const username = isAuthenticated ? currentUser?.username || 'User' : t.auth.login;
    const targetUsername = isAuthenticated && currentUser?.username ? currentUser.username : 'guest';
    const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
    const canonicalUrl = `${origin}/profile/${targetUsername}`;

    const mockLinks = [
        { id: 1, label: 'Confession board', status: 'active', timeLeft: '2h 14m' },
        { id: 2, label: 'Feedback form', status: 'expiring', timeLeft: '28m' },
    ];

    const mockFollowing = [
        { id: 1, name: 'alex_johnson' },
        { id: 2, name: 'maria_garcia' },
        { id: 3, name: 'sarah_smith' },
    ];

    const isRTL = language === 'AR';

 
    return (
        <div className={`profile-page ${isRTL ? 'rtl' : ''}`}>
            <section className="profile-hero card">
               

               
                    <div
                        className="chip subtle clickable"
                        role="button"
                        aria-label="Copy profile URL"
                        onClick={() => {
                            if (navigator?.clipboard?.writeText) {
                                navigator.clipboard.writeText(canonicalUrl).then(() => {
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                }).catch(() => {});
                            }
                        }}
                    >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            <span>Profile URL:</span>
                        </span>
                        <a href={`/profile/${targetUsername}`} style={{ marginLeft: '0.35rem' }}>/profile/{targetUsername}</a>
                        <span className="copy-pill" style={{ marginLeft: '0.35rem' }}>Copy</span>
                        {copied && <span style={{ marginLeft: '0.5rem', fontWeight: 700 }}>Copied!</span>}
                    </div>
               

             
                <div className="action-row">
                    {isAuthenticated ? (
                        <>
                            <button className="action primary" onClick={onSettingsClick}>
                                {t.nav.settings}
                            </button>
                            <button className="action outline danger" onClick={onLogout}>
                                {t.buttons.logout}
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="action primary" onClick={onLoginClick}>
                                {t.buttons.login}
                            </button>
                            <button className="action soft" onClick={onSignupClick}>
                                {t.buttons.signup}
                            </button>
                        </>
                    )}
                </div>
            </section>

           
          
            {/* Guest Mode: Show login/signup buttons */}
            {/* Guest Mode info */}
            {!isAuthenticated && (
                <section className="profile-card card">
                    <div className="card-header">
                        <div>
                            <p className="eyebrow subtle">{t.profile.guestTitle}</p>
                            <h2 className="card-title">{t.profile.guestSubtitle}</h2>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
export default ProfilePage;
