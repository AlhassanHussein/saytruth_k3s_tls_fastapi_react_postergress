import { useState, useEffect } from 'react';
import { authAPI } from './services/api';
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

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activeLinks, setActiveLinks] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthPage, setShowAuthPage] = useState(null); // 'login', 'signup', 'recovery', 'settings'
  const [linkPageType, setLinkPageType] = useState(null); // 'public' or 'private'
  const [linkId, setLinkId] = useState(null); // public_id or private_id
  const [language, setLanguage] = useState('EN');

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const user = await authAPI.getCurrentUser();
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (err) {
        // Not authenticated
        setIsAuthenticated(false);
      }
    };
    checkAuth();

    // Parse URL for link pages
    const path = window.location.pathname;
    if (path.startsWith('/link/private/')) {
      const privateId = path.split('/link/private/')[1];
      if (privateId) {
        handleViewPrivateLink(privateId);
      }
    } else if (path.startsWith('/link/')) {
      const publicId = path.split('/link/')[1];
      if (publicId) {
        handleViewPublicLink(publicId);
      }
    }
  }, []);

  const handleCreateLink = (newLink) => {
    setActiveLinks([newLink, ...activeLinks]);
  };

  const handleDeleteLink = (linkId) => {
    setActiveLinks(activeLinks.filter((link) => link.id !== linkId));
  };

  const handleLoginSuccess = () => {
    setShowAuthPage(null);
    setIsAuthenticated(true);
    setActiveTab('home');
    // Reload user info
    authAPI.getCurrentUser().then(user => setCurrentUser(user)).catch(() => {});
  };

  const handleSignupSuccess = () => {
    setShowAuthPage(null);
    setIsAuthenticated(true);
    setActiveTab('home');
    // Reload user info
    authAPI.getCurrentUser().then(user => setCurrentUser(user)).catch(() => {});
  };

  const handleRecoverySuccess = () => {
    setShowAuthPage(null);
    setIsAuthenticated(true);
    setActiveTab('home');
    // Reload user info
    authAPI.getCurrentUser().then(user => setCurrentUser(user)).catch(() => {});
  };

  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('home');
    setShowAuthPage('login'); // Redirect to login after logout
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    // Reload user info after language change
    authAPI.getCurrentUser().then(user => setCurrentUser(user)).catch(() => {});
  };

  // Handle link page navigation
  const handleViewPublicLink = (publicId) => {
    setLinkPageType('public');
    setLinkId(publicId);
  };

  const handleViewPrivateLink = (privateId) => {
    setLinkPageType('private');
    setLinkId(privateId);
  };

  const handleCloseLinkPage = () => {
    setLinkPageType(null);
    setLinkId(null);
    setActiveTab('home');
  };

  // Auth guard: redirect to login/signup if trying to access protected features
  const requireAuth = (callback) => {
    if (!isAuthenticated) {
      setShowAuthPage('login');
      return false;
    }
    callback();
    return true;
  };

  // Render auth pages
  if (showAuthPage === 'login') {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onForgotPassword={() => setShowAuthPage('recovery')}
      />
    );
  }
  if (showAuthPage === 'signup') {
    return <SignupPage onSignupSuccess={handleSignupSuccess} />;
  }
  if (showAuthPage === 'recovery') {
    return (
      <PasswordRecoveryPage
        onRecoverySuccess={handleRecoverySuccess}
        onBackToLogin={() => setShowAuthPage('login')}
      />
    );
  }
  if (showAuthPage === 'settings') {
    return (
      <SettingsPage
        currentUser={currentUser}
        onLogout={handleLogout}
        onLanguageChange={handleLanguageChange}
      />
    );
  }

  const renderTabContent = () => {
    // Show link pages if active
    if (linkPageType === 'public' && linkId) {
      return (
        <div>
          <PublicLinkPage publicId={linkId} language={language} />
          <div className="link-page-close">
            <button onClick={handleCloseLinkPage} className="btn secondary">
              ← Back f
            </button>
          </div>
        </div>
      );
    }

    if (linkPageType === 'private' && linkId) {
      return (
        <div>
          <PrivateLinkPage privateId={linkId} language={language} />
          <div className="link-page-close">
            <button onClick={handleCloseLinkPage} className="btn secondary">
              ← Back ff
            </button>
          </div>
        </div>
      );
    }

    // Show user profile page if selected
    if (activeTab === 'user-profile' && selectedUserId) {
      return (
        <UserProfilePage
          userId={selectedUserId}
          isAuthenticated={isAuthenticated}
          currentUser={currentUser}
          onBack={() => setActiveTab('search')}
          onLoginClick={() => setShowAuthPage('login')}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <>
            <HomeTab language={language} onLinkCreated={handleViewPrivateLink} />
            <CreateLinkSection onCreateLink={handleCreateLink} />
            <ActiveLinksSection links={activeLinks} onDeleteLink={handleDeleteLink} />
          </>
        );
      case 'links':
        return <LinksTab links={activeLinks} />;
      case 'search':
        return (
          <SearchTab
            isAuthenticated={isAuthenticated}
            onUserClick={(userId) => {
              setSelectedUserId(userId);
              setActiveTab('user-profile');
            }}
          />
        );
      case 'messages':
        return (
          <MessagesTab
            onMessageClick={() => requireAuth(() => {})} // Trigger auth check
          />
        );
      case 'profile':
        return (
          <ProfilePage
            isAuthenticated={isAuthenticated}
            currentUser={currentUser}
            onLogout={handleLogout}
            onLoginClick={() => setShowAuthPage('login')}
            onSignupClick={() => setShowAuthPage('signup')}
            onSettingsClick={() => requireAuth(() => setShowAuthPage('settings'))}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        {renderTabContent()}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
