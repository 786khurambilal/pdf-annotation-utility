import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { UserLogin } from './UserLogin';

export const UserManager: React.FC = () => {
  const { 
    currentUser, 
    users, 
    isLoading, 
    error, 
    switchUser, 
    removeUser, 
    logout, 
    clearError 
  } = useUser();
  
  const [showLogin, setShowLogin] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleSwitchUser = async (userId: string) => {
    try {
      await switchUser(userId);
      setShowUserList(false);
    } catch (err) {
      // Error handled by context
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (confirmDelete === userId) {
      try {
        await removeUser(userId);
        setConfirmDelete(null);
      } catch (err) {
        // Error handled by context
      }
    } else {
      setConfirmDelete(userId);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      // Error handled by context
    }
  };

  if (showLogin) {
    return <UserLogin onClose={() => setShowLogin(false)} />;
  }

  return (
    <div className="user-manager">
      {error && (
        <div className="user-manager__error" role="alert">
          {error}
          <button onClick={clearError} className="user-manager__error-close">
            ×
          </button>
        </div>
      )}

      {currentUser ? (
        <div className="user-manager__current-user">
          <div className="user-manager__user-info">
            <div className="user-manager__user-name">{currentUser.name}</div>
            <div className="user-manager__user-id">ID: {currentUser.id}</div>
          </div>
          
          <div className="user-manager__actions">
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="user-manager__action-btn"
              disabled={isLoading}
            >
              Switch User
            </button>
            <button
              onClick={() => setShowLogin(true)}
              className="user-manager__action-btn"
              disabled={isLoading}
            >
              Add User
            </button>
            <button
              onClick={handleLogout}
              className="user-manager__action-btn user-manager__logout"
              disabled={isLoading}
            >
              Logout
            </button>
          </div>

          {showUserList && users.length > 1 && (
            <div className="user-manager__user-list">
              <h3>Switch to User:</h3>
              {users
                .filter(user => user.id !== currentUser.id)
                .map(user => (
                  <div key={user.id} className="user-manager__user-item">
                    <div 
                      className="user-manager__user-info"
                      onClick={() => handleSwitchUser(user.id)}
                    >
                      <div className="user-manager__user-name">{user.name}</div>
                      <div className="user-manager__user-id">ID: {user.id}</div>
                      {user.email && (
                        <div className="user-manager__user-email">{user.email}</div>
                      )}
                    </div>
                    
                    <div className="user-manager__user-actions">
                      <button
                        onClick={() => handleSwitchUser(user.id)}
                        className="user-manager__switch-btn"
                        disabled={isLoading}
                      >
                        Switch
                      </button>
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className={`user-manager__remove-btn ${
                          confirmDelete === user.id ? 'confirm' : ''
                        }`}
                        disabled={isLoading}
                      >
                        {confirmDelete === user.id ? 'Confirm Delete' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        <div className="user-manager__no-user">
          <p>No user logged in</p>
          <button
            onClick={() => setShowLogin(true)}
            className="user-manager__login-btn"
            disabled={isLoading}
          >
            Login / Create User
          </button>
        </div>
      )}
    </div>
  );
};