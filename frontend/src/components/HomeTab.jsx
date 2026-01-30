import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import { translations } from '../i18n/translations';
import UserFollowingCard from './UserFollowingCard';
import './HomeTab.css';

const HomeTab = ({ isAuthenticated, currentUser, language = 'EN' }) => {
  const [followingUsers, setFollowingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const t = translations[language] || translations.EN;

  useEffect(() => {
    if (isAuthenticated) {
      fetchFollowingUsers();
    }
  }, [isAuthenticated]);

  const fetchFollowingUsers = async () => {
    setLoading(true);
    try {
      console.log('Fetching my following list...');
      // Get list of users the current user is following
      const followingList = await userAPI.getMyFollowing();
      console.log('My following list:', followingList);
      
      // For each following user, get their public profile data with messages
      const enrichedUsers = await Promise.all(
        followingList.map(async (user) => {
          try {
            const profile = await userAPI.getUserProfile(user.id);
            console.log('Profile for following user', user.id, ':', profile);
            return profile;
          } catch (error) {
            console.error(`Error fetching profile for user ${user.id}:`, error);
            return user;
          }
        })
      );
      console.log('Enriched following users:', enrichedUsers);
      setFollowingUsers(enrichedUsers);
    } catch (error) {
      console.error('Error fetching following users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserCardClick = (userId) => {
    // Always navigate to public profile by user_id, never to personal profile
    navigate(`/profile/${userId}`);
  };

  if (!isAuthenticated) {
    return (
      <div className="home-tab" style={{ padding: '1rem', maxWidth: '520px', margin: '0 auto' }}>
        <section className="empty-state-card">
          <div className="empty-state-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 className="empty-state-title">{t.home.emptyTitle}</h2>
          <p className="empty-state-subtitle">
            {t.home.emptySubtitle}
          </p>
          <div className="empty-state-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/signup')}
            >
              {t.home.getStarted}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="home-tab" style={{ padding: '1rem', maxWidth: '520px', margin: '0 auto' }}>
      <div className="home-header">
        <div>
          <span className="eyebrow">{t.home.eyebrow}</span>
          <h1 className="page-title">{t.home.title}</h1>
          <p className="page-subtitle">
            {t.home.subtitle}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t.home.loadingFollowing}</p>
        </div>
      ) : followingUsers && followingUsers.length > 0 ? (
        <div className="following-list">
          {followingUsers.map((user) => (
            <UserFollowingCard
              key={user.id}
              user={user}
              onCardClick={() => handleUserCardClick(user.id, user.username)}
              language={language}
            />
          ))}
        </div>
      ) : (
        <section className="empty-following-card">
          <div className="empty-following-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h3 className="empty-following-title">{t.home.noFollowing}</h3>
          <p className="empty-following-text">
            {t.search.startText}
          </p>
        </section>
      )}
    </div>
  );
};

export default HomeTab;
