import { useState } from 'react';
import { authAPI } from '../services/api';
import { translations } from '../i18n/translations';
import './AuthPages.css';

const PasswordRecoveryPage = ({ onRecoverySuccess, onBackToLogin, language = 'EN' }) => {
    const [step, setStep] = useState(1); // Step 1: Get hint, Step 2: Verify answer
    const [username, setUsername] = useState('');
    const [secretPhrase, setSecretPhrase] = useState('');
    const [secretAnswer, setSecretAnswer] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const t = translations[language] || translations.EN;
    const isRTL = language === 'AR';

    const handleGetHint = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!username.trim()) {
            setError(t.common.username);
            return;
        }

        setIsLoading(true);
        try {
            const response = await authAPI.recoverPassword(username);
            setSecretPhrase(response.secret_phrase);
            setStep(2);
        } catch (err) {
            setError(err.message || t.errors.notFound);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyAnswer = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!secretAnswer.trim()) {
            setError(t.auth.secretAnswer);
            return;
        }

        setIsLoading(true);
        try {
            await authAPI.verifyRecovery(username, secretAnswer);
            setSuccess(t.auth.loginSuccess);
            setTimeout(() => {
                if (onRecoverySuccess) {
                    onRecoverySuccess();
                }
            }, 1000);
        } catch (err) {
            setError(err.message || t.errors.unauthorized);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`auth-page ${isRTL ? 'rtl' : ''}`}>
            <section className="auth-card card">
                <div className="auth-hero">
                    <div className="auth-copy">
                        <span className="eyebrow">{t.auth.recoverTitle}</span>
                        <h1 className="auth-title">{t.auth.recoverTitle}</h1>
                        <p className="auth-subtitle">{t.auth.recoverSubtitle}</p>
                    </div>
                </div>

                <div className="helper-row">
                    <span className="badge">{t.auth.notAuthenticated}</span>
                    <span className="badge">Step {step} of 2</span>
                </div>

                {step === 1 ? (
                    <form className="auth-form" onSubmit={handleGetHint}>
                        <h3 className="eyebrow" style={{ marginBottom: '16px' }}>{t.common.name}</h3>
                        <div className="form-group">
                            <label className="label" htmlFor="username">{t.common.username}</label>
                            <input
                                id="username"
                                className="input-field"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={t.common.username}
                                dir={isRTL ? 'rtl' : 'ltr'}
                            />
                        </div>

                        {error && <div className="error-banner" role="alert">{error}</div>}

                        <button type="submit" className="primary-btn" disabled={isLoading}>
                            {isLoading ? t.common.loading : t.common.submit}
                        </button>
                    </form>
                ) : (
                    <form className="auth-form" onSubmit={handleVerifyAnswer}>
                        <h3 className="eyebrow" style={{ marginBottom: '16px' }}>{t.auth.secretPhrase}</h3>
                        
                        <div className="form-group">
                            <label className="label">{t.auth.secretPhrase}</label>
                            <div className="success-banner" role="status" style={{ marginTop: '8px' }}>
                                {secretPhrase}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label" htmlFor="secret-answer">{t.auth.secretAnswer}</label>
                            <input
                                id="secret-answer"
                                className="input-field"
                                type="password"
                                value={secretAnswer}
                                onChange={(e) => setSecretAnswer(e.target.value)}
                                placeholder={t.auth.secretAnswer}
                                dir={isRTL ? 'rtl' : 'ltr'}
                            />
                        </div>

                        {error && <div className="error-banner" role="alert">{error}</div>}
                        {success && <div className="success-banner" role="status">{success}</div>}

                        <button type="submit" className="primary-btn" disabled={isLoading}>
                            {isLoading ? t.common.loading : t.auth.recoverButton}
                        </button>
                    </form>
                )}

                <div
                    className="secondary-link"
                    onClick={() => onBackToLogin && onBackToLogin()}
                    style={{ cursor: 'pointer', marginTop: '16px' }}
                >
                    {t.auth.backToLogin}
                </div>
            </section>
        </div>
    );
};

export default PasswordRecoveryPage;
