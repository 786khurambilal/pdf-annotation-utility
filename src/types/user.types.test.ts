import { User, validateUser, createUser } from './user.types';

describe('User Types', () => {
  describe('validateUser', () => {
    it('should validate a valid user with all fields', () => {
      const user = {
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com'
      };
      expect(validateUser(user)).toBe(true);
    });

    it('should validate a valid user without email', () => {
      const user = {
        id: 'user123',
        name: 'John Doe'
      };
      expect(validateUser(user)).toBe(true);
    });

    it('should reject user with empty id', () => {
      const user = {
        id: '',
        name: 'John Doe'
      };
      expect(validateUser(user)).toBe(false);
    });

    it('should reject user with whitespace-only id', () => {
      const user = {
        id: '   ',
        name: 'John Doe'
      };
      expect(validateUser(user)).toBe(false);
    });

    it('should reject user with empty name', () => {
      const user = {
        id: 'user123',
        name: ''
      };
      expect(validateUser(user)).toBe(false);
    });

    it('should reject user with whitespace-only name', () => {
      const user = {
        id: 'user123',
        name: '   '
      };
      expect(validateUser(user)).toBe(false);
    });

    it('should reject user with invalid email', () => {
      const user = {
        id: 'user123',
        name: 'John Doe',
        email: 'invalid-email'
      };
      expect(validateUser(user)).toBe(false);
    });

    it('should reject null user', () => {
      expect(validateUser(null)).toBe(false);
    });

    it('should reject undefined user', () => {
      expect(validateUser(undefined)).toBe(false);
    });

    it('should reject non-object user', () => {
      expect(validateUser('string')).toBe(false);
      expect(validateUser(123)).toBe(false);
      expect(validateUser([])).toBe(false);
    });

    it('should reject user with missing required fields', () => {
      expect(validateUser({ id: 'user123' })).toBe(false);
      expect(validateUser({ name: 'John Doe' })).toBe(false);
      expect(validateUser({})).toBe(false);
    });
  });

  describe('createUser', () => {
    it('should create a valid user with all fields', () => {
      const user = createUser('user123', 'John Doe', 'john@example.com');
      expect(user).toEqual({
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    it('should create a valid user without email', () => {
      const user = createUser('user123', 'John Doe');
      expect(user).toEqual({
        id: 'user123',
        name: 'John Doe',
        email: undefined
      });
    });

    it('should trim whitespace from fields', () => {
      const user = createUser('  user123  ', '  John Doe  ', '  john@example.com  ');
      expect(user).toEqual({
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    it('should throw error for invalid user data', () => {
      expect(() => createUser('', 'John Doe')).toThrow('Invalid user data provided');
      expect(() => createUser('user123', '')).toThrow('Invalid user data provided');
      expect(() => createUser('user123', 'John Doe', 'invalid-email')).toThrow('Invalid user data provided');
    });
  });
});