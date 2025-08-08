// User types and validation functions
export interface User {
  id: string;
  name: string;
  email?: string;
}

// User validation function
export const validateUser = (user: any): user is User => {
  return (
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'string' &&
    user.id.trim().length > 0 &&
    typeof user.name === 'string' &&
    user.name.trim().length > 0 &&
    (user.email === undefined || (typeof user.email === 'string' && user.email.includes('@')))
  );
};

// User creation helper
export const createUser = (id: string, name: string, email?: string): User => {
  const user = { id: id.trim(), name: name.trim(), email: email?.trim() };
  if (!validateUser(user)) {
    throw new Error('Invalid user data provided');
  }
  return user;
};