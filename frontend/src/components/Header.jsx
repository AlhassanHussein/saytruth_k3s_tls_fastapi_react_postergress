import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import './Header.css';

const Header = ({ isAuthenticated, currentUser, language, onLanguageChange }) => {
    const navigate = useNavigate();
    const t = translations[language] || translations.EN;
    const username = isAuthenticated && currentUser?.username ? currentUser.username : t.auth.login;

    const languages = ['EN', 'AR', 'ES'];

    const handleProfileClick = () => {
        navigate(isAuthenticated ? '/profile/me' : '/profile/guest');
    };

    return (
        <header className={`header ${language === 'AR' ? 'rtl' : ''}`}>
            <div className="header-content">
                <div className="header-left">
                    <div className="logo">
                        <span className="logo-icon">💬</span>
                        <span className="logo-text">SayTruth</span>
                    </div>
                    <span className="username">{username}</span>
                </div>

                <div className="header-right">
                    <div className="language-selector">
                        {languages.map((lang) => (
                            <button
                                key={lang}
                                className={`lang-btn ${language === lang ? 'active' : ''}`}
                                onClick={() => onLanguageChange(lang)}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>

                    <button
                        className="profile-btn"
                        aria-label={t.nav.profile}
                        type="button"
                        onClick={handleProfileClick}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
