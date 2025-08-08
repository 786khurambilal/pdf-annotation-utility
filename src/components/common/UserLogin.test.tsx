import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserLogin } from './UserLogin';
import { UserProvider } from '../../contexts/UserContext';

// Mock the UserContext
const mockUserContext = {
  currentUser: null,
  users: [
    { id: 'user1', name: 'Existing User', email: 'user1@example.com' },
    { id: 'user2', name: 'Another User' },
  ],
  isLoading: false,
  error: null,
  loginUser: jest.fn(),
  switchUser: jest.fn(),
  updateCurrentUser: jest.fn(),
  removeUser: jest.fn(),
  logout: jest.fn(),
  clearError: jest.fn(),
};

jest.mock('../../contexts/UserContext', () => ({
  useUser: () => mockUserContext,
  UserProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('UserLogin', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserContext.isLoading = false;
    mockUserContext.error = null;
  });

  it('should render new user form by default', () => {
    render(<UserLogin onClose={mockOnClose} />);

    expect(screen.getByText('User Login')).toBeInTheDocument();
    expect(screen.getByLabelText('User ID *')).toBeInTheDocument();
    expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Email (optional)')).toBeInTheDocument();
    expect(screen.getByText('Create & Login')).toBeInTheDocument();
  });

  it('should switch to existing user tab', async () => {
    const user = userEvent.setup();
    render(<UserLogin onClose={mockOnClose} />);

    await user.click(screen.getByText('Existing User (2)'));

    expect(screen.getByText('Select User')).toBeInTheDocument();
    expect(screen.getByText('Existing User')).toBeInTheDocument();
    expect(screen.getByText('Another User')).toBeInTheDocument();
    expect(screen.getByText('Switch User')).toBeInTheDocument();
  });

  it('should handle new user form submission', async () => {
    const user = userEvent.setup();
    mockUserContext.loginUser.mockResolvedValue(undefined);

    render(<UserLogin onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('User ID *'), 'new-user');
    await user.type(screen.getByLabelText('Name *'), 'New User');
    await user.type(screen.getByLabelText('Email (optional)'), 'new@example.com');

    await user.click(screen.getByText('Create & Login'));

    expect(mockUserContext.loginUser).toHaveBeenCalledWith(
      'new-user',
      'New User',
      'new@example.com'
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle new user form submission without email', async () => {
    const user = userEvent.setup();
    mockUserContext.loginUser.mockResolvedValue(undefined);

    render(<UserLogin onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('User ID *'), 'new-user');
    await user.type(screen.getByLabelText('Name *'), 'New User');

    await user.click(screen.getByText('Create & Login'));

    expect(mockUserContext.loginUser).toHaveBeenCalledWith(
      'new-user',
      'New User',
      undefined
    );
  });

  it('should not submit new user form with empty required fields', async () => {
    const user = userEvent.setup();
    render(<UserLogin onClose={mockOnClose} />);

    const submitButton = screen.getByText('Create & Login');
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText('User ID *'), 'new-user');
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText('Name *'), 'New User');
    expect(submitButton).not.toBeDisabled();
  });

  it('should handle existing user selection and submission', async () => {
    const user = userEvent.setup();
    mockUserContext.switchUser.mockResolvedValue(undefined);

    render(<UserLogin onClose={mockOnClose} />);

    await user.click(screen.getByText('Existing User (2)'));
    await user.click(screen.getByText('Existing User'));

    await user.click(screen.getByText('Switch User'));

    expect(mockUserContext.switchUser).toHaveBeenCalledWith('user1');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle user selection via radio button', async () => {
    const user = userEvent.setup();
    render(<UserLogin onClose={mockOnClose} />);

    await user.click(screen.getByText('Existing User (2)'));
    
    const radioButton = screen.getByDisplayValue('user2');
    await user.click(radioButton);

    expect(radioButton).toBeChecked();
  });

  it('should not submit existing user form without selection', async () => {
    const user = userEvent.setup();
    render(<UserLogin onClose={mockOnClose} />);

    await user.click(screen.getByText('Existing User (2)'));

    const submitButton = screen.getByText('Switch User');
    expect(submitButton).toBeDisabled();
  });

  it('should display error messages', () => {
    mockUserContext.error = 'Test error message';

    render(<UserLogin onClose={mockOnClose} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Test error message');
  });

  it('should clear error when typing in form', async () => {
    const user = userEvent.setup();
    mockUserContext.error = 'Test error';

    render(<UserLogin onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('User ID *'), 'test');

    expect(mockUserContext.clearError).toHaveBeenCalled();
  });

  it('should clear error when selecting existing user', async () => {
    const user = userEvent.setup();
    mockUserContext.error = 'Test error';

    render(<UserLogin onClose={mockOnClose} />);

    await user.click(screen.getByText('Existing User (2)'));
    await user.click(screen.getByText('Existing User'));

    expect(mockUserContext.clearError).toHaveBeenCalled();
  });

  it('should show loading states', () => {
    mockUserContext.isLoading = true;

    render(<UserLogin onClose={mockOnClose} />);

    expect(screen.getByText('Creating User...')).toBeInTheDocument();
    expect(screen.getByLabelText('User ID *')).toBeDisabled();
    expect(screen.getByLabelText('Name *')).toBeDisabled();
    expect(screen.getByLabelText('Email (optional)')).toBeDisabled();
  });

  it('should disable existing user tab when no users exist', () => {
    const originalUsers = mockUserContext.users;
    mockUserContext.users = [];

    render(<UserLogin onClose={mockOnClose} />);

    const existingUserTab = screen.getByText('Existing User (0)');
    expect(existingUserTab).toBeDisabled();

    // Restore original users
    mockUserContext.users = originalUsers;
  });

  it('should handle close button click', async () => {
    const user = userEvent.setup();
    render(<UserLogin onClose={mockOnClose} />);

    await user.click(screen.getByLabelText('Close login dialog'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not render close button when onClose is not provided', () => {
    render(<UserLogin />);

    expect(screen.queryByLabelText('Close login dialog')).not.toBeInTheDocument();
  });

  it('should trim whitespace from form inputs', async () => {
    const user = userEvent.setup();
    mockUserContext.loginUser.mockResolvedValue(undefined);

    render(<UserLogin onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('User ID *'), '  new-user  ');
    await user.type(screen.getByLabelText('Name *'), '  New User  ');
    await user.type(screen.getByLabelText('Email (optional)'), '  new@example.com  ');

    await user.click(screen.getByText('Create & Login'));

    expect(mockUserContext.loginUser).toHaveBeenCalledWith(
      'new-user',
      'New User',
      'new@example.com'
    );
  });

  it('should handle login errors gracefully', async () => {
    const user = userEvent.setup();
    mockUserContext.loginUser.mockRejectedValue(new Error('Login failed'));

    render(<UserLogin onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('User ID *'), 'new-user');
    await user.type(screen.getByLabelText('Name *'), 'New User');

    await user.click(screen.getByText('Create & Login'));

    expect(mockUserContext.loginUser).toHaveBeenCalled();
    // onClose should not be called on error
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should handle switch user errors gracefully', async () => {
    const user = userEvent.setup();
    mockUserContext.switchUser.mockRejectedValue(new Error('Switch failed'));

    // Ensure users are available for this test
    const originalUsers = mockUserContext.users;
    mockUserContext.users = [
      { id: 'user1', name: 'Existing User', email: 'user1@example.com' },
      { id: 'user2', name: 'Another User' },
    ];

    render(<UserLogin onClose={mockOnClose} />);

    await user.click(screen.getByText('Existing User (2)'));
    await user.click(screen.getByText('Existing User'));
    await user.click(screen.getByText('Switch User'));

    expect(mockUserContext.switchUser).toHaveBeenCalled();
    // onClose should not be called on error
    expect(mockOnClose).not.toHaveBeenCalled();

    // Restore original users
    mockUserContext.users = originalUsers;
  });
});