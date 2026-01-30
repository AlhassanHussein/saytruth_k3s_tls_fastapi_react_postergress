import { useState, useEffect } from 'react';
import { linksAPI } from '../services/api';
import { translations } from '../i18n/translations';

const PublicLinkPage = ({ publicId, language = 'EN' }) => {
  const [linkInfo, setLinkInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(null);

  const t = translations[language]?.publicLinkPage || translations.EN.publicLinkPage;
  const isRTL = language === 'AR';

  // Countdown display for sender
  const formatTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  };

  useEffect(() => {
    const fetchLinkInfo = async () => {
      try {
        setLoading(true);
        const info = await linksAPI.getLinkInfo(publicId);
        setLinkInfo(info);
      } catch (err) {
        if (err.message.includes('404')) {
          setError(t.notFound);
        } else if (err.message.includes('expired')) {
          setError(t.expired);
        } else {
          setError(t.error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLinkInfo();
  }, [publicId, t]);

  useEffect(() => {
    if (!linkInfo?.expires_at) return;
    const update = () => setCountdown(formatTimeRemaining(linkInfo.expires_at));
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [linkInfo]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    setError(null);

    try {
      await linksAPI.sendLinkMessage(publicId, message);
      setSent(true);
      setMessage('');
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      setError(t.errors);
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className={`public-link-page ${isRTL ? 'rtl' : ''}`}>
        <div className="loading">{t.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`public-link-page ${isRTL ? 'rtl' : ''}`} style={{ padding: '2rem', maxWidth: '520px', margin: '0 auto' }}>
        <section className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏰</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--gray-900)' }}>{error}</h2>
          {error.includes('expired') && (
            <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>This link can no longer accept messages.</p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className={`public-link-page ${isRTL ? 'rtl' : ''}`} style={{ padding: '1rem', maxWidth: '520px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Intro Hero Card */}
      <section className="card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>{t.introTitle}</h1>
        <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', marginBottom: '1rem' }}>{t.introSubtitle}</p>
        
        <p style={{ color: 'var(--gray-700)', fontSize: '0.875rem', lineHeight: '1.6' }}>
          {t.introDescription}
        </p>
      </section>

      {/* Link Info Card */}
      <section className="card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 700 }}>{t.eyebrow}</span>
        {linkInfo?.display_name && (
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.5rem 0' }}>{linkInfo.display_name}</h2>
        )}
        <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>
          {t.multipleAllowed}
        </p>
        {countdown && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-block', fontWeight: 700, fontSize: '0.875rem' }}>
            ⏱ {t.timeLeft}: {countdown}
          </div>
        )}
      </section>

      <section className="card" style={{ padding: '1.5rem' }}>
        <form onSubmit={handleSendMessage}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>{t.yourMessage}</label>
            <textarea
              placeholder={t.placeholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength="5000"
              rows="8"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--gray-200)',
                fontFamily: 'inherit',
                fontSize: '1rem',
                resize: 'vertical'
              }}
              disabled={sending}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem', textAlign: 'right' }}>
              {message.length} / 5000 {t.characterCount}
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'var(--error-light)', color: 'var(--error)', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          {sent && (
            <div style={{ padding: '0.75rem', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {t.success}
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="action primary"
            style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}
          >
            {sending ? t.sending : t.send}
          </button>
        </form>
      </section>
    </div>
  );
};

export default PublicLinkPage;
