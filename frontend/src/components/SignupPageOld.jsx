import { useState } from 'react';
import { authAPI } from '../services/api';
import './AuthPages.css';

const translations = {
    EN: {
        eyebrow: 'Signup',
        title: 'Join SayTruth',
        subtitle: 'Create your account with a secret phrase and answer for recovery.',
        username: 'Username',
        name: 'Display Name (optional)',
        secretPhrase: 'Secret Phrase (hint/question)',
        secretAnswer: 'Secret Answer',
        terms: 'I agree to the Terms & Conditions',
        signup: 'Create account',
        errorTaken: 'This username is already taken.',
        success: 'Account created. Redirecting...',
        helper: 'Mobile-first, multi-language, secure.',
        phrasePlaceholder: 'e.g., "What is your favorite color?"',
        answerPlaceholder: 'Your answer to the secret phrase',
    },
    AR: {
        eyebrow: 'إنشاء حساب',
        title: 'انضم إلى SayTruth',
        subtitle: 'أنشئ حسابك بعبارة سرية وإجابة للاسترداد.',
        username: 'اسم المستخدم',
        name: 'الاسم المعروض (اختياري)',
        secretPhrase: 'العبارة السرية (تلميح/سؤال)',
        secretAnswer: 'الإجابة السرية',
        terms: 'أوافق على الشروط والأحكام',
        signup: 'إنشاء حساب',
        errorTaken: 'اسم المستخدم محجوز.',
        success: 'تم إنشاء الحساب. جارٍ التحويل...',
        helper: 'محمول أولاً، متعدد اللغات، آمن.',
        phrasePlaceholder: 'مثال: "ما هو لونك المفضل؟"',
        answerPlaceholder: 'إجابتك على العبارة السرية',
    },
    ES: {
        eyebrow: 'Registro',
        title: 'Únete a SayTruth',
        subtitle: 'Crea tu cuenta con una frase secreta y respuesta para recuperación.',
        username: 'Usuario',
        name: 'Nombre para mostrar (opcional)',
        secretPhrase: 'Frase secreta (pista/pregunta)',
        secretAnswer: 'Respuesta secreta',
        terms: 'Acepto los Términos y Condiciones',
        signup: 'Crear cuenta',
        errorTaken: 'Ese usuario ya existe.',
        success: 'Cuenta creada. Redirigiendo...',
        helper: 'Móvil primero, multilingüe, seguro.',
        phrasePlaceholder: 'ej. "¿Cuál es tu color favorito?"',
        answerPlaceholder: 'Tu respuesta a la frase secreta',
    },
};

const SignupPage = ({ onSignupSuccess }) => {
    const [language, setLanguage] = useState('EN');
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [secretPhrase, setSecretPhrase] = useState('');
    const [secretAnswer, setSecretAnswer] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const t = translations[language];
    const isRTL = language === 'AR';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!username.trim() || !secretPhrase.trim() || !secretAnswer.trim()) {
            setError('Username, secret phrase, and secret answer are required');
            return;
        }
        if (!acceptTerms) {
            setError(t.terms);
            return;
        }

        setIsLoading(true);
        try {
            await authAPI.signup(username, name || null, secretPhrase, secretAnswer);
            setSuccess(t.success);
            setTimeout(() => {
                if (onSignupSuccess) {
                    onSignupSuccess();
                }
            }, 1000);
        } catch (err) {
            setError(err.message || t.errorTaken);
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
                    <span className="badge">Docker-ready UI mock</span>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <div className="label-row">
                            <label className="label" htmlFor="username">{t.username}</label>
                            <span className="hint">required</span>
                        </div>
                        <input
                            id="username"
                            className="input-field"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={t.username}
                            dir={isRTL ? 'rtl' : 'ltr'}
                        />
                    </div>

                    <div className="form-group">
                        <div className="label-row">
                            <label className="label" htmlFor="name">{t.name}</label>
                            <span className="hint">optional</span>
                        </div>
                        <input
                            id="name"
                            className="input-field"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t.name}
                            dir={isRTL ? 'rtl' : 'ltr'}
                        />
                    </div>

                    <div className="form-group">
                        <div className="label-row">
                            <label className="label" htmlFor="secret-phrase">{t.secretPhrase}</label>
                            <span className="hint">required</span>
                        </div>
                        <input
                            id="secret-phrase"
                            className="input-field"
                            type="text"
                            value={secretPhrase}
                            onChange={(e) => setSecretPhrase(e.target.value)}
                            placeholder={t.phrasePlaceholder}
                            dir={isRTL ? 'rtl' : 'ltr'}
                        />
                    </div>

                    <div className="form-group">
                        <div className="label-row">
                            <label className="label" htmlFor="secret-answer">{t.secretAnswer}</label>
                            <span className="hint">required</span>
                        </div>
                        <input
                            id="secret-answer"
                            className="input-field"
                            type="password"
                            value={secretAnswer}
                            onChange={(e) => setSecretAnswer(e.target.value)}
                            placeholder={t.answerPlaceholder}
                            dir={isRTL ? 'rtl' : 'ltr'}
                        />
                    </div>

                    <label className="checkbox-row">
                        <input
                            type="checkbox"
                            checked={acceptTerms}
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                        />
                        {t.terms}
                    </label>

                    {error && <div className="error-banner" role="alert">{error}</div>}
                    {success && <div className="success-banner" role="status">{success}</div>}

                    <button type="submit" className="primary-btn" disabled={isLoading}>
                        {isLoading ? 'Creating account...' : t.signup}
                    </button>
                </form>
            </section>
        </div>
    );
};

export default SignupPage;
