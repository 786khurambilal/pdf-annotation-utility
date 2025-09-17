import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, validateUser, createUser } from '../types/user.types';

// Local storage key for user session
const USER_SESSION_KEY = 'ebook-utility-user-session';
const CURRENT_USER_KEY = 'ebook-utility-current-user';

// User session state interface
interface UserSession {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  error: string | null;
}

// User actions
type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_USER'; payload: User | null }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'REMOVE_USER'; payload: string }
  | { type: 'LOAD_SESSION'; payload: { users: User[]; currentUser: User | null } };

// Initial state
const initialState: UserSession = {
  currentUser: null,
  users: [],
  isLoading: true,
  error: null,
};

// User reducer
const userReducer = (state: UserSession, action: UserAction): UserSession => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload, error: null };
    
    case 'ADD_USER':
      return {
        ...state,
        users: [...state.users.filter(u => u.id !== action.payload.id), action.payload],
        error: null,
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(u => u.id === action.payload.id ? action.payload : u),
        currentUser: state.currentUser?.id === action.payload.id ? action.payload : state.currentUser,
        error: null,
      };
    
    case 'REMOVE_USER':
      return {
        ...state,
        users: state.users.filter(u => u.id !== action.payload),
        currentUser: state.currentUser?.id === action.payload ? null : state.currentUser,
        error: null,
      };
    
    case 'LOAD_SESSION':
      return {
        ...state,
        users: action.payload.users,
        currentUser: action.payload.currentUser,
        isLoading: false,
        error: null,
      };
    
    default:
      return state;
  }
};

// Context interface
interface UserContextType {
  // State
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loginUser: (id: string, name: string, email?: string) => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Create context
const UserContext = createContext<UserContextType | undefined>(undefined);

// User session service
class UserSessionService {
  static saveUsers(users: User[]): void {
    try {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Failed to save users to localStorage:', error);
    }
  }

  static loadUsers(): User[] {
    try {
      const stored = localStorage.getItem(USER_SESSION_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      
      return parsed.filter(validateUser);
    } catch (error) {
      console.error('Failed to load users from localStorage:', error);
      return [];
    }
  }

  static saveCurrentUser(user: User | null): void {
    try {
      if (user) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    } catch (error) {
      console.error('Failed to save current user to localStorage:', error);
    }
  }

  static loadCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      return validateUser(parsed) ? parsed : null;
    } catch (error) {
      console.error('Failed to load current user from localStorage:', error);
      return null;
    }
  }

  static clearSession(): void {
    try {
      localStorage.removeItem(USER_SESSION_KEY);
      localStorage.removeItem(CURRENT_USER_KEY);
    } catch (error) {
      console.error('Failed to clear user session:', error);
    }
  }
}

// Provider component
interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const users = UserSessionService.loadUsers();
        const currentUser = UserSessionService.loadCurrentUser();
        
        // Validate current user exists in users list
        const validCurrentUser = currentUser && users.find(u => u.id === currentUser.id) 
          ? currentUser 
          : null;
        
        dispatch({
          type: 'LOAD_SESSION',
          payload: { users, currentUser: validCurrentUser }
        });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load user session' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadSession();
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (!state.isLoading) {
      UserSessionService.saveUsers(state.users);
      UserSessionService.saveCurrentUser(state.currentUser);
    }
  }, [state.users, state.currentUser, state.isLoading]);

  const loginUser = async (id: string, name: string, email?: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const user = createUser(id, name, email);
      
      dispatch({ type: 'ADD_USER', payload: user });
      dispatch({ type: 'SET_CURRENT_USER', payload: user });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to login user' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const switchUser = async (userId: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const user = state.users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      dispatch({ type: 'SET_CURRENT_USER', payload: user });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to switch user' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateCurrentUser = async (updates: Partial<User>): Promise<void> => {
    try {
      if (!state.currentUser) {
        throw new Error('No current user to update');
      }
      
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const updatedUser = { ...state.currentUser, ...updates };
      if (!validateUser(updatedUser)) {
        throw new Error('Invalid user data');
      }
      
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update user' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const removeUser = async (userId: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'REMOVE_USER', payload: userId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to remove user' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_CURRENT_USER', payload: null });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to logout' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: UserContextType = {
    currentUser: state.currentUser,
    users: state.users,
    isLoading: state.isLoading,
    error: state.error,
    loginUser,
    switchUser,
    updateCurrentUser,
    removeUser,
    logout,
    clearError,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use user context
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Alias for consistency with other contexts
export const useUserContext = useUser;