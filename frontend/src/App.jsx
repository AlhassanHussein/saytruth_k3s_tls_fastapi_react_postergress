import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { authAPI } from './services/api';
import { getInitialLanguage, saveLanguage, translations } from './i18n/translations';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LinksTab from './components/LinksTab';
import SearchTab from './components/SearchTab';
import MessagesTab from './components/MessagesTab';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import PasswordRecoveryPage from './components/PasswordRecoveryPage';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';
import UserProfilePage from './components/UserProfilePage';
import CreateLinkSection from './components/CreateLinkSection';
import ActiveLinksSection from './components/ActiveLinksSection';
import HomeTab from './components/HomeTab';
import PublicLinkPage from './components/PublicLinkPage';
import PrivateLinkPage from './components/PrivateLinkPage';
import './App.css';

// Wrapper components for link pages to extract params
const PublicLinkPageWrapper = ({ language }) => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  return (
    <div>
      <PublicLinkPage publicId={publicId} language={language} />
      <div className="link-page-close">
        <button onClick={() => navigate('/home')} className="btn secondary">
          ← Back To Home Page
        </button>
      </div>
    </div>
  );
};

const PrivateLinkPageWrapper = ({ language }) => {
  const { privateId } = useParams();
  const navigate = useNavigate();
  return (
    <div>
      <PrivateLinkPage privateId={privateId} language={language} />
      <div className="link-page-close">
        <button onClick={() => navigate('/home')} className="btn secondary">
          ← Back To Home Page
        </button>
      </div>
    </div>
  );
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeLinks, setActiveLinks] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [language, setLanguage] = useState(getInitialLanguage()); // Auto-detect or load saved
  const [authLoading, setAuthLoading] = useState(true); // Gate initial render until auth is restored

  // Determine active tab based on URL
  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path === '/' || path === '/home') return 'home';
    if (path === '/links') return 'links';
    if (path === '/search') return 'search';
    if (path === '/messages') return 'messages';
    if (path === '/profile' || path.startsWith('/profile/')) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTabFromPath();

  const ProfileRouteWrapper = ({ isAuthenticated, currentUser }) => {
    const { userId } = useParams();
    
    // If trying to access own profile as public profile, redirect to /profile/me
    if (isAuthenticated && currentUser && userId === currentUser.id.toString()) {
      return <Navigate to="/profile/me" replace />;
    }
    
    // Special case: guest profile - show a guest-friendly profile page
    if (userId === 'guest') {
      const t = translations[language] || translations.EN;
      return (
        <div style={{ padding: '1rem', maxWidth: '520px', margin: '0 auto' }}>
          <section className="empty-state-card">
            <div className="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 className="empty-state-title">{t.profile.guestBrowsingTitle}</h2>
            <p className="empty-state-subtitle">
              {t.profile.guestBrowsingSubtitle}
            </p>
            <div className="empty-state-actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/login')}
              >
                {t.buttons.login}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/signup')}
              >
                {t.buttons.signup}
              </button>
            </div>
          </section>
        </div>
      );
    }
    
    // Public profile view - show UserProfilePage for any user_id
    return (
      <UserProfilePage
        userId={userId}
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        language={language}
        onBack={() => navigate('/search')}
        onLoginClick={() => navigate('/login')}
      />
    );
  };

  const MyProfileRouteWrapper = ({ isAuthenticated, currentUser }) => {
    // Personal profile - only accessible if authenticated
    if (!isAuthenticated) {
      return <Navigate to="/profile/guest" replace />;
    }
    
    return (
      <ProfilePage
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        language={language}
        onLogout={handleLogout}
        onLoginClick={() => navigate('/login')}
        onSignupClick={() => navigate('/signup')}
        onSettingsClick={() => navigate('/settings')}
      />
    );
  };

  useEffect(() => {
    // Global auth restoration on app startup (prevents guest flicker)
    const initAuth = async () => {
      const token = localStorage.getItem('authToken');

      // No token → treat as guest and finish fast
      if (!token) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }

      try {
        // Validate token with backend; if valid, hydrate user
        const user = await authAPI.getCurrentUser();
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Auth restore failed; clearing token.', err);
        authAPI.logout();
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleCreateLink = (newLink) => {
    setActiveLinks([newLink, ...activeLinks]);
  };

  const handleDeleteLink = (linkId) => {
    setActiveLinks(activeLinks.filter((link) => link.id !== linkId));
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    authAPI.getCurrentUser().then(user => setCurrentUser(user)).catch(() => {});
    navigate('/home');
  };

  const handleSignupSuccess = () => {
    setIsAuthenticated(true);
    authAPI.getCurrentUser().then(user => setCurrentUser(user)).catch(() => {});
    navigate('/home');
  };

  const handleRecoverySuccess = () => {
    setIsAuthenticated(true);
    authAPI.getCurrentUser().then(user => setCurrentUser(user)).catch(() => {});
    navigate('/home');
  };

  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    navigate('/login');
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    saveLanguage(newLang); // Persist to localStorage
    authAPI.getCurrentUser().then(user => setCurrentUser(user)).catch(() => {});
  };

  // Skeleton cards shown while auth is being restored (partial UI only)
  const CardsSkeleton = () => (
    <div className="cards-skeleton" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', maxWidth: '720px', margin: '0 auto' }}>
      {[1, 2, 3].map((idx) => (
        <div
          key={idx}
          className="card skeleton-card"
          style={{
            borderRadius: '16px',
            padding: '1.25rem',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 37%, rgba(255,255,255,0.04) 63%)',
            backgroundSize: '400% 100%',
            animation: 'shimmer 1.4s ease-in-out infinite',
            minHeight: '120px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 12, width: '55%', background: 'rgba(255,255,255,0.14)', borderRadius: 8, marginBottom: 8 }} />
              <div style={{ height: 10, width: '38%', background: 'rgba(255,255,255,0.12)', borderRadius: 8 }} />
            </div>
            <div style={{ width: 80, height: 32, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <div style={{ marginTop: 14, height: 10, width: '92%', background: 'rgba(255,255,255,0.08)', borderRadius: 8 }} />
          <div style={{ marginTop: 10, height: 10, width: '76%', background: 'rgba(255,255,255,0.08)', borderRadius: 8 }} />
        </div>
      ))}
    </div>
  );

  // Auth guard
  const requireAuth = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const handleTabChange = (tab) => {
    const pathMap = {
      home: '/home',
      links: '/links',
      search: '/search',
      messages: '/messages',
      profile: isAuthenticated ? '/profile/me' : '/profile/guest',
    };
    navigate(pathMap[tab] || '/home');
  };

  // Only show BottomNav and Header when not on auth pages
  const isAuthPage = location.pathname === '/login' || 
                     location.pathname === '/signup' || 
                     location.pathname === '/recover';
  const isLinkPage = location.pathname.startsWith('/link/');

  return (
    <div className="app">
      {!isAuthPage && !isLinkPage && (
        <Header 
          isAuthenticated={isAuthenticated} 
          currentUser={currentUser}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      )}

      <main className="main-content">
          {authLoading ? (
            <CardsSkeleton />
          ) : (
            <Routes>
          {/* Auth Routes */}
          <Route
            path="/login"
            element={
              <LoginPage
                onLoginSuccess={handleLoginSuccess}
                onForgotPassword={() => navigate('/recover')}
                language={language}
              />
            }
          />
          <Route
            path="/signup"
            element={<SignupPage onSignupSuccess={handleSignupSuccess} language={language} />}
          />
          <Route
            path="/recover"
            element={
              <PasswordRecoveryPage
                onRecoverySuccess={handleRecoverySuccess}
                onBackToLogin={() => navigate('/login')}
                language={language}
              />
            }
          />

          {/* Link Pages */}
          <Route
            path="/link/public/:publicId"
            element={<PublicLinkPageWrapper language={language} />}
          />
          <Route
            path="/link/private/:privateId"
            element={<PrivateLinkPageWrapper language={language} />}
          />

          {/* Main App Routes */}
          <Route
            path="/home"
            element={
              <HomeTab 
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                language={language} 
                onLinkCreated={handleCreateLink} 
              />
            }
          />
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
          <Route path="/links" element={<LinksTab isAuthenticated={isAuthenticated} language={language} />} />
          <Route
            path="/search"
            element={
              <SearchTab
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                language={language}
                onUserClick={(user) => {
                  setSelectedUser(user);
                  navigate(`/profile/${user.id}`);
                }}
              />
            }
          />
          <Route
            path="/messages"
            element={<MessagesTab isAuthenticated={isAuthenticated} onLoginClick={() => navigate('/login')} onSignupClick={() => navigate('/signup')} language={language} />}
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                currentUser={currentUser}
                language={language}
                onLogout={handleLogout}
                onLanguageChange={handleLanguageChange}
              />
            }
          />
          <Route
            path="/profile"
            element={<Navigate to={isAuthenticated ? '/profile/me' : '/profile/guest'} replace />}
          />
          <Route
            path="/profile/me"
            element={<MyProfileRouteWrapper isAuthenticated={isAuthenticated} currentUser={currentUser} />}
          />
          <Route
            path="/profile/:userId"
            element={<ProfileRouteWrapper isAuthenticated={isAuthenticated} currentUser={currentUser} />}
          />
          </Routes>
        )}
      </main>

      {!isAuthPage && !isLinkPage && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} language={language} />
      )}
    </div>
  );
}

export default App;
