import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext';

interface UserLoginProps {
  onClose?: () => void;
}

export const UserLogin: React.FC<UserLoginProps> = ({ onClose }) => {
  const { loginUser, switchUser, users, isLoading, error, clearError } = useUser();
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
  });
  const [isNewUser, setIsNewUser] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const handleNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id.trim() || !formData.name.trim()) {
      return;
    }

    try {
      await loginUser(
        formData.id.trim(),
        formData.name.trim(),
        formData.email.trim() || undefined
      );
      onClose?.();
    } catch (err) {
      // Error is handled by context
    }
  };

  const handleExistingUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      return;
    }

    try {
      await switchUser(selectedUserId);
      onClose?.();
    } catch (err) {
      // Error is handled by context
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    if (error) clearError();
  };

  return (
    <div className="user-login">
      <div className="user-login__header">
        <h2>User Login</h2>
        {onClose && (
          <button 
            className="user-login__close"
            onClick={onClose}
            aria-label="Close login dialog"
          >
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="user-login__error" role="alert">
          {error}
        </div>
      )}

      <div className="user-login__tabs">
        <button
          className={`user-login__tab ${isNewUser ? 'active' : ''}`}
          onClick={() => setIsNewUser(true)}
          disabled={isLoading}
        >
          New User
        </button>
        <button
          className={`user-login__tab ${!isNewUser ? 'active' : ''}`}
          onClick={() => setIsNewUser(false)}
          disabled={isLoading || users.length === 0}
        >
          Existing User ({users.length})
        </button>
      </div>

      {isNewUser ? (
        <form onSubmit={handleNewUserSubmit} className="user-login__form">
          <div className="user-login__field">
            <label htmlFor="userId">User ID *</label>
            <input
              id="userId"
              name="id"
              type="text"
              value={formData.id}
              onChange={handleInputChange}
              placeholder="Enter unique user ID"
              required
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="user-login__field">
            <label htmlFor="userName">Name *</label>
            <input
              id="userName"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your name"
              required
              disabled={isLoading}
              autoComplete="name"
            />
          </div>

          <div className="user-login__field">
            <label htmlFor="userEmail">Email (optional)</label>
            <input
              id="userEmail"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            className="user-login__submit"
            disabled={isLoading || !formData.id.trim() || !formData.name.trim()}
          >
            {isLoading ? 'Creating User...' : 'Create & Login'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleExistingUserSubmit} className="user-login__form">
          <div className="user-login__field">
            <label>Select User</label>
            <div className="user-login__user-list">
              {users.map(user => (
                <div
                  key={user.id}
                  className={`user-login__user-item ${selectedUserId === user.id ? 'selected' : ''}`}
                  onClick={() => handleUserSelect(user.id)}
                >
                  <div className="user-login__user-info">
                    <div className="user-login__user-name">{user.name}</div>
                    <div className="user-login__user-id">ID: {user.id}</div>
                    {user.email && (
                      <div className="user-login__user-email">{user.email}</div>
                    )}
                  </div>
                  <input
                    type="radio"
                    name="selectedUser"
                    value={user.id}
                    checked={selectedUserId === user.id}
                    onChange={() => handleUserSelect(user.id)}
                    disabled={isLoading}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="user-login__submit"
            disabled={isLoading || !selectedUserId}
          >
            {isLoading ? 'Switching User...' : 'Switch User'}
          </button>
        </form>
      )}
    </div>
  );
};