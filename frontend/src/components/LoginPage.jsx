import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { translations } from '../i18n/translations';
import './AuthPages.css';

const LoginPage = ({ onLoginSuccess, onForgotPassword }) => {
    const navigate = useNavigate();
    const [language, setLanguage] = useState('EN');
    const [username, setUsername] = useState('');
    const [secretAnswer, setSecretAnswer] = useState('');
    const [showSecretAnswer, setShowSecretAnswer] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const t = translations[language]?.auth || translations.EN.auth;
    const common = translations[language]?.common || translations.EN.common;
    const isRTL = language === 'AR';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!username.trim() || !secretAnswer.trim()) {
            setError(t.invalidCredentials);
            return;
        }

        setIsLoading(true);
        try {
            await authAPI.login(username, secretAnswer);
            if (onLoginSuccess) {
                onLoginSuccess();
            }
        } catch (err) {
            setError(err.message || t.invalidCredentials);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`auth-page ${isRTL ? 'rtl' : ''}`}>
            <section className="auth-card card">
                <div className="auth-hero">
                    <div className="auth-copy">
                        <span className="eyebrow">{t.login}</span>
                        <h1 className="auth-title">{t.loginTitle}</h1>
                        <p className="auth-subtitle">{t.loginSubtitle}</p>
                    </div>
                    <div className="language-toggle" aria-label="Language selector">
                        {Object.keys(translations).map((lang) => (
                            <button
                                key={lang}
                                className={`lang-pill ${language === lang ? 'active' : ''}`}
                                onClick={() => setLanguage(lang)}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="helper-row">
                    <span className="badge">Mobile-first, multi-language, secure</span>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <div className="label-row">
                            <label className="label" htmlFor="login-username">{common.username}</label>
                            <span className="hint">required</span>
                        </div>
                        <input
                            id="login-username"
                            className="input-field"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={t.usernamePlaceholder}
                            dir={isRTL ? 'rtl' : 'ltr'}
                        />
                    </div>

                    <div className="form-group">
                        <div className="label-row">
                            <label className="label" htmlFor="login-secret-answer">{t.secretAnswer}</label>
                            <span className="hint">required</span>
                        </div>
                        <div className="input-with-toggle">
                            <input
                                id="login-secret-answer"
                                className="input-field"
                                type={showSecretAnswer ? 'text' : 'password'}
                                value={secretAnswer}
                                onChange={(e) => setSecretAnswer(e.target.value)}
                                placeholder={t.secretAnswerPlaceholder}
                                dir={isRTL ? 'rtl' : 'ltr'}
                            />
                            <button
                                type="button"
                                className="toggle-visibility"
                                onClick={() => setShowSecretAnswer(!showSecretAnswer)}
                                aria-label={showSecretAnswer ? t.hidePassword : t.showPassword}
                            >
                                {showSecretAnswer ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    {error && <div className="error-banner" role="alert">{error}</div>}

                    <button type="submit" className="primary-btn" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : t.login}
                    </button>
                </form>

                <div
                    className="secondary-link"
                    onClick={() => onForgotPassword && onForgotPassword()}
                    style={{ cursor: 'pointer', marginBottom: '1rem' }}
                >
                    {t.forgotPassword}
                </div>

                {/* Navigation buttons */}
                <div className="auth-nav-buttons">
                    <button 
                        onClick={() => navigate('/signup')}
                        className="nav-btn signup-btn"
                    >
                        {t.noAccount} <strong>{t.signup}</strong>
                    </button>
                    <button 
                        onClick={() => navigate('/home')}
                        className="nav-btn home-btn"
                    >
                        {common.backToHome}
                    </button>
                </div>
            </section>
        </div>
    );
};

export default LoginPage;
