import { validateAreaCoordinates } from './annotation.types';

describe('Annotation Types', () => {
  it('should validate area coordinates', () => {
    expect(validateAreaCoordinates({ x: 10, y: 20 })).toBe(true);
    expect(validateAreaCoordinates({ x: -1, y: 20 })).toBe(false);
  });
});