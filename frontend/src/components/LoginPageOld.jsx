import { useState } from 'react';
import { authAPI } from '../services/api';
import './AuthPages.css';

const translations = {
    EN: {
        eyebrow: 'Login',
        title: 'Welcome back',
        subtitle: 'Enter your username and secret answer to continue.',
        username: 'Username',
        secretAnswer: 'Secret Answer',
        login: 'Login',
        forgot: 'Forgot secret phrase?',
        helper: 'Secure login with secret answer.',
        error: 'Invalid credentials. Try again.',
    },
    AR: {
        eyebrow: 'تسجيل الدخول',
        title: 'مرحبًا بعودتك',
        subtitle: 'أدخل اسم المستخدم والإجابة السرية للمتابعة.',
        username: 'اسم المستخدم',
        secretAnswer: 'الإجابة السرية',
        login: 'دخول',
        forgot: 'نسيت العبارة السرية؟',
        helper: 'تسجيل دخول آمن بالإجابة السرية.',
        error: 'بيانات الدخول غير صحيحة.',
    },
    ES: {
        eyebrow: 'Ingresar',
        title: 'Bienvenido de nuevo',
        subtitle: 'Ingresa tu usuario y respuesta secreta para continuar.',
        username: 'Usuario',
        secretAnswer: 'Respuesta secreta',
        login: 'Entrar',
        forgot: '¿Olvidaste la frase secreta?',
        helper: 'Inicio seguro con respuesta secreta.',
        error: 'Credenciales inválidas. Intenta de nuevo.',
    },
};

const LoginPage = ({ onLoginSuccess, onForgotPassword }) => {
    const [language, setLanguage] = useState('EN');
    const [username, setUsername] = useState('');
    const [secretAnswer, setSecretAnswer] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const t = translations[language];
    const isRTL = language === 'AR';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!username.trim() || !secretAnswer.trim()) {
            setError(t.error);
            return;
        }

        setIsLoading(true);
        try {
            await authAPI.login(username, secretAnswer);
            if (onLoginSuccess) {
                onLoginSuccess();
            }
        } catch (err) {
            setError(err.message || t.error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`auth-page ${isRTL ? 'rtl' : ''}`}>
            <section className="auth-card card">
                <div className="auth-hero">
                    <div className="auth-copy">
                        <span className="eyebrow">{t.eyebrow}</span>
                        <h1 className="auth-title">{t.title}</h1>
                        <p className="auth-subtitle">{t.subtitle}</p>
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
                    <span className="badge">{t.helper}</span>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <div className="label-row">
                            <label className="label" htmlFor="login-username">{t.username}</label>
                            <span className="hint">required</span>
                        </div>
                        <input
                            id="login-username"
                            className="input-field"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={t.username}
                            dir={isRTL ? 'rtl' : 'ltr'}
                        />
                    </div>

                    <div className="form-group">
                        <div className="label-row">
                            <label className="label" htmlFor="login-secret-answer">{t.secretAnswer}</label>
                            <span className="hint">required</span>
                        </div>
                        <input
                            id="login-secret-answer"
                            className="input-field"
                            type="password"
                            value={secretAnswer}
                            onChange={(e) => setSecretAnswer(e.target.value)}
                            placeholder={t.secretAnswer}
                            dir={isRTL ? 'rtl' : 'ltr'}
                        />
                    </div>

                    {error && <div className="error-banner" role="alert">{error}</div>}

                    <button type="submit" className="primary-btn" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : t.login}
                    </button>
                </form>

                <div
                    className="secondary-link"
                    onClick={() => onForgotPassword && onForgotPassword()}
                    style={{ cursor: 'pointer' }}
                >
                    {t.forgot}
                </div>
            </section>
        </div>
    );
};

export default LoginPage;
