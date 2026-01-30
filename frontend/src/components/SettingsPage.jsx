import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { translations } from '../i18n/translations';
import './AuthPages.css';

// Username validation: Instagram-style (letters, numbers, underscores only, no spaces)
const validateUsername = (username) => {
  if (!username.trim()) return { valid: false, error: 'usernameRequired' };
  if (username.length < 3) return { valid: false, error: 'usernameMinLength' };
  if (username.includes(' ')) return { valid: false, error: 'usernameNoSpaces' };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return { valid: false, error: 'usernameInvalidChars' };
  return { valid: true, error: null };
};

const validateSecretAnswer = (answer) => {
  if (!answer.trim()) return { valid: false, error: 'secretAnswerRequired' };
  return { valid: true, error: null };
};

const SignupPage = ({ onSignupSuccess }) => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('EN');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [secretPhrase, setSecretPhrase] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [secretAnswerConfirm, setSecretAnswerConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [showSecretAnswer, setShowSecretAnswer] = useState(false);
  const [showSecretAnswerConfirm, setShowSecretAnswerConfirm] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const t = translations[language]?.auth || translations.EN.auth;
  const isRTL = language === 'AR';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSuccess('');

    const newFieldErrors = {};

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      newFieldErrors.username = usernameValidation.error;
    }

    // Validate secret phrase
    if (!secretPhrase.trim()) {
      newFieldErrors.secretPhrase = 'secretPhraseRequired';
    }

    // Validate secret answer
    const answerValidation = validateSecretAnswer(secretAnswer);
    if (!answerValidation.valid) {
      newFieldErrors.secretAnswer = answerValidation.error;
    }

    // Validate secret answer confirmation
    if (secretAnswer !== secretAnswerConfirm) {
      newFieldErrors.secretAnswerConfirm = 'secretAnswerMismatch';
    }

    // Validate terms
    if (!acceptTerms) {
      newFieldErrors.terms = 'termsRequired';
    }

    // If there are field errors, display them
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError(t.usernameRequired); // Generic error message
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.signup(username, name || null, secretPhrase, secretAnswer);
      setSuccess(t.signupSuccess);
      setTimeout(() => {
        navigate('/links');
      }, 800);
    } catch (err) {
      // Handle backend errors with translations
      const errorMessage = err.message || 'Request failed';
      if (errorMessage.includes('already') || errorMessage.includes('existing')) {
        setError(t.userExists);
        setFieldErrors({ username: 'userExists' });
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`auth-page ${isRTL ? 'rtl' : ''}`}>
      <section className="auth-card card">
        <div className="auth-hero">
          <div className="auth-copy">
            <span className="eyebrow">{t.signup}</span>
            <h1 className="auth-title">{t.signupTitle}</h1>
            <p className="auth-subtitle">{t.signupSubtitle}</p>
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
          {/* Username Field */}
          <div className="form-group">
            <div className="label-row">
              <label className="label" htmlFor="signup-username">Username</label>
              <span className="hint">required</span>
            </div>
            <input
              id="signup-username"
              className={`input-field ${fieldErrors.username ? 'error' : ''}`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe_123"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            {fieldErrors.username && (
              <div className="field-error">{t[fieldErrors.username] || fieldErrors.username}</div>
            )}
          </div>

          {/* Display Name Field */}
          <div className="form-group">
            <div className="label-row">
              <label className="label" htmlFor="signup-name">Display Name</label>
              <span className="hint">optional</span>
            </div>
            <input
              id="signup-name"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Secret Phrase Field */}
          <div className="form-group">
            <div className="label-row">
              <label className="label" htmlFor="signup-phrase">{t.secretPhrase}</label>
              <span className="hint">required</span>
            </div>
            <input
              id="signup-phrase"
              className={`input-field ${fieldErrors.secretPhrase ? 'error' : ''}`}
              value={secretPhrase}
              onChange={(e) => setSecretPhrase(e.target.value)}
              placeholder='e.g., "What is your favorite color?"'
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            {fieldErrors.secretPhrase && (
              <div className="field-error">{t[fieldErrors.secretPhrase] || fieldErrors.secretPhrase}</div>
            )}
            <small className="field-tooltip">{t.secretAnswerTooltip}</small>
          </div>

          {/* Secret Answer Field */}
          <div className="form-group">
            <div className="label-row">
              <label className="label" htmlFor="signup-answer">{t.secretAnswer}</label>
              <span className="hint">required</span>
            </div>
            <div className="input-with-toggle">
              <input
                id="signup-answer"
                className={`input-field ${fieldErrors.secretAnswer ? 'error' : ''}`}
                type={showSecretAnswer ? 'text' : 'password'}
                value={secretAnswer}
                onChange={(e) => setSecretAnswer(e.target.value)}
                placeholder="Your answer"
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
            {fieldErrors.secretAnswer && (
              <div className="field-error">{t[fieldErrors.secretAnswer] || fieldErrors.secretAnswer}</div>
            )}
          </div>

          {/* Secret Answer Confirmation Field */}
          <div className="form-group">
            <div className="label-row">
              <label className="label" htmlFor="signup-answer-confirm">{t.secretAnswerConfirm}</label>
              <span className="hint">required</span>
            </div>
            <div className="input-with-toggle">
              <input
                id="signup-answer-confirm"
                className={`input-field ${fieldErrors.secretAnswerConfirm ? 'error' : ''}`}
                type={showSecretAnswerConfirm ? 'text' : 'password'}
                value={secretAnswerConfirm}
                onChange={(e) => setSecretAnswerConfirm(e.target.value)}
                placeholder="Confirm your answer"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowSecretAnswerConfirm(!showSecretAnswerConfirm)}
                aria-label={showSecretAnswerConfirm ? t.hidePassword : t.showPassword}
              >
                {showSecretAnswerConfirm ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {fieldErrors.secretAnswerConfirm && (
              <div className="field-error">{t[fieldErrors.secretAnswerConfirm] || fieldErrors.secretAnswerConfirm}</div>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <label htmlFor="terms">I agree to the Terms & Conditions</label>
            {fieldErrors.terms && (
              <div className="field-error">{t[fieldErrors.terms] || fieldErrors.terms}</div>
            )}
          </div>

          {error && <div className="error-banner" role="alert">{error}</div>}
          {success && <div className="success-banner" role="status">{success}</div>}

          <button type="submit" className="primary-btn" disabled={isLoading}>
            {isLoading ? 'Creating account...' : t.createAccount}
          </button>
        </form>

        {/* Navigation buttons */}
        <div className="auth-nav-buttons">
          <button 
            onClick={() => navigate('/login')}
            className="nav-btn login-btn"
          >
            {t.haveAccount} <strong>{t.login}</strong>
          </button>
          <button 
            onClick={() => navigate('/home')}
            className="nav-btn home-btn"
          >
            Back to home
          </button>
        </div>
      </section>
    </div>
  );
};

export default SignupPage;
