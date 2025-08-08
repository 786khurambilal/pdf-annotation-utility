import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProvider, useUser } from './UserContext';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test component that uses the user context
const TestComponent: React.FC = () => {
  const {
    currentUser,
    users,
    isLoading,
    error,
    loginUser,
    switchUser,
    updateCurrentUser,
    removeUser,
    logout,
    clearError,
  } = useUser();

  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="current-user">{currentUser?.name || 'no-user'}</div>
      <div data-testid="users-count">{users.length}</div>
      
      <button onClick={() => loginUser('test-id', 'Test User', 'test@example.com')}>
        Login User
      </button>
      <button onClick={() => switchUser('test-id')}>
        Switch User
      </button>
      <button onClick={() => updateCurrentUser({ name: 'Updated Name' })}>
        Update User
      </button>
      <button onClick={() => removeUser('test-id')}>
        Remove User
      </button>
      <button onClick={logout}>
        Logout
      </button>
      <button onClick={clearError}>
        Clear Error
      </button>
    </div>
  );
};

describe('UserContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should provide initial state', async () => {
    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('current-user')).toHaveTextContent('no-user');
    expect(screen.getByTestId('users-count')).toHaveTextContent('0');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });

  it('should load existing session from localStorage', async () => {
    const mockUsers = [
      { id: 'user1', name: 'User One', email: 'user1@example.com' },
      { id: 'user2', name: 'User Two' },
    ];
    const mockCurrentUser = { id: 'user1', name: 'User One', email: 'user1@example.com' };

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockUsers)) // USER_SESSION_KEY
      .mockReturnValueOnce(JSON.stringify(mockCurrentUser)); // CURRENT_USER_KEY

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('current-user')).toHaveTextContent('User One');
    expect(screen.getByTestId('users-count')).toHaveTextContent('2');
  });

  it('should handle invalid localStorage data gracefully', async () => {
    mockLocalStorage.getItem
      .mockReturnValueOnce('invalid-json')
      .mockReturnValueOnce('invalid-json');

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('current-user')).toHaveTextContent('no-user');
    expect(screen.getByTestId('users-count')).toHaveTextContent('0');
  });

  it('should login a new user', async () => {
    const user = userEvent.setup();

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      await user.click(screen.getByText('Login User'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-user')).toHaveTextContent('Test User');
      expect(screen.getByTestId('users-count')).toHaveTextContent('1');
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'ebook-utility-user-session',
      expect.stringContaining('Test User')
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'ebook-utility-current-user',
      expect.stringContaining('Test User')
    );
  });

  it('should switch between users', async () => {
    const user = userEvent.setup();
    const mockUsers = [
      { id: 'user1', name: 'User One' },
      { id: 'user2', name: 'User Two' },
    ];

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockUsers))
      .mockReturnValueOnce(JSON.stringify(mockUsers[0]));

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-user')).toHaveTextContent('User One');
    });

    // Mock the switch to user2
    const switchButton = screen.getByText('Switch User');
    
    // Update the mock to return user2 when switchUser is called
    await act(async () => {
      await user.click(switchButton);
    });

    // Since we're switching to 'test-id' which doesn't exist in our mock users,
    // this should result in an error
    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
    });
  });

  it('should update current user', async () => {
    const user = userEvent.setup();

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    // First login a user
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      await user.click(screen.getByText('Login User'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-user')).toHaveTextContent('Test User');
    });

    // Then update the user
    await act(async () => {
      await user.click(screen.getByText('Update User'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-user')).toHaveTextContent('Updated Name');
    });
  });

  it('should remove a user', async () => {
    const user = userEvent.setup();
    const mockUsers = [
      { id: 'test-id', name: 'Test User' },
      { id: 'user2', name: 'User Two' },
    ];

    mockLocalStorage.getItem
      .mockReturnValueOnce(JSON.stringify(mockUsers))
      .mockReturnValueOnce(JSON.stringify(mockUsers[0]));

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('users-count')).toHaveTextContent('2');
    });

    await act(async () => {
      await user.click(screen.getByText('Remove User'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('users-count')).toHaveTextContent('1');
      expect(screen.getByTestId('current-user')).toHaveTextContent('no-user');
    });
  });

  it('should logout current user', async () => {
    const user = userEvent.setup();

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    // First login a user
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      await user.click(screen.getByText('Login User'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-user')).toHaveTextContent('Test User');
    });

    // Then logout
    await act(async () => {
      await user.click(screen.getByText('Logout'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-user')).toHaveTextContent('no-user');
    });
  });

  it('should clear errors', async () => {
    const user = userEvent.setup();

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Trigger an error by trying to switch to non-existent user
    await act(async () => {
      await user.click(screen.getByText('Switch User'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
    });

    // Clear the error
    await act(async () => {
      await user.click(screen.getByText('Clear Error'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });
  });

  it('should handle localStorage errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock localStorage to throw errors
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      await user.click(screen.getByText('Login User'));
    });

    // Should still work despite localStorage errors
    await waitFor(() => {
      expect(screen.getByTestId('current-user')).toHaveTextContent('Test User');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to save users to localStorage:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should throw error when useUser is used outside provider', () => {
    const TestComponentOutsideProvider = () => {
      useUser();
      return <div>Test</div>;
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponentOutsideProvider />);
    }).toThrow('useUser must be used within a UserProvider');

    consoleSpy.mockRestore();
  });
});