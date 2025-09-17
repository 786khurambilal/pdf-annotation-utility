import { Document, validateDocument, createDocument } from './document.types';

describe('Document Types', () => {
  describe('validateDocument', () => {
    it('should validate a valid document', () => {
      const document = {
        id: 'doc123',
        filename: 'test.pdf',
        uploadDate: new Date(),
        totalPages: 10,
        fileHash: 'abc123hash'
      };
      expect(validateDocument(document)).toBe(true);
    });

    it('should reject document with empty id', () => {
      const document = {
        id: '',
        filename: 'test.pdf',
        uploadDate: new Date(),
        totalPages: 10,
        fileHash: 'abc123hash'
      };
      expect(validateDocument(document)).toBe(false);
    });

    it('should reject document with whitespace-only id', () => {
      const document = {
        id: '   ',
        filename: 'test.pdf',
        uploadDate: new Date(),
        totalPages: 10,
        fileHash: 'abc123hash'
      };
      expect(validateDocument(document)).toBe(false);
    });

    it('should reject document with empty filename', () => {
      const document = {
        id: 'doc123',
        filename: '',
        uploadDate: new Date(),
        totalPages: 10,
        fileHash: 'abc123hash'
      };
      expect(validateDocument(document)).toBe(false);
    });

    it('should reject document with non-PDF filename', () => {
      const document = {
        id: 'doc123',
        filename: 'test.txt',
        uploadDate: new Date(),
        totalPages: 10,
        fileHash: 'abc123hash'
      };
      expect(validateDocument(document)).toBe(false);
    });

    it('should accept PDF filename with different cases', () => {
      const document1 = {
        id: 'doc123',
        filename: 'test.PDF',
        uploadDate: new Date(),
        totalPages: 10,
        fileHash: 'abc123hash'
      };
      const document2 = {
        id: 'doc123',
        filename: 'test.Pdf',
        uploadDate: new Date(),
        totalPages: 10,
        fileHash: 'abc123hash'
      };
      expect(validateDocument(document1)).toBe(true);
      expect(validateDocument(document2)).toBe(true);
    });

    it('should reject document with invalid upload date', () => {
      const document = {
        id: 'doc123',
        filename: 'test.pdf',
        uploadDate: new Date('invalid'),
        totalPages: 10,
        fileHash: 'abc123hash'
      };
      expect(validateDocument(document)).toBe(false);
    });

    it('should reject document with non-Date upload date', () => {
      const document = {
        id: 'doc123',
        filename: 'test.pdf',
        uploadDate: '2023-01-01',
        totalPages: 10,
        fileHash: 'abc123hash'
      };
      expect(validateDocument(document)).toBe(false);
    });

    it('should reject document with zero or negative total pages', () => {
      const document1 = {
        id: 'doc123',
        filename: 'test.pdf',
        uploadDate: new Date(),
        totalPages: 0,
        fileHash: 'abc123hash'
      };
      const document2 = {
        id: 'doc123',
        filename: 'test.pdf',
        uploadDate: new Date(),
        totalPages: -1,
        fileHash: 'abc123hash'
      };
      expect(validateDocument(document1)).toBe(false);
      expect(validateDocument(document2)).toBe(false);
    });

    it('should reject document with non-integer total pages', () => {
      const document = {
        id: 'doc123',
        filename: 'test.pdf',
        uploadDate: new Date(),
        totalPages: 10.5,
        fileHash: 'abc123hash'
      };
      expect(validateDocument(document)).toBe(false);
    });

    it('should reject document with empty file hash', () => {
      const document = {
        id: 'doc123',
        filename: 'test.pdf',
        uploadDate: new Date(),
        totalPages: 10,
        fileHash: ''
      };
      expect(validateDocument(document)).toBe(false);
    });

    it('should reject document with whitespace-only file hash', () => {
      const document = {
        id: 'doc123',
        filename: 'test.pdf',
        uploadDate: new Date(),
        totalPages: 10,
        fileHash: '   '
      };
      expect(validateDocument(document)).toBe(false);
    });

    it('should reject null or undefined document', () => {
      expect(validateDocument(null)).toBe(false);
      expect(validateDocument(undefined)).toBe(false);
    });

    it('should reject non-object document', () => {
      expect(validateDocument('string')).toBe(false);
      expect(validateDocument(123)).toBe(false);
      expect(validateDocument([])).toBe(false);
    });
  });

  describe('createDocument', () => {
    it('should create a valid document', () => {
      const beforeCreate = Date.now();
      const document = createDocument('doc123', 'test.pdf', 10, 'abc123hash');
      const afterCreate = Date.now();

      expect(document.id).toBe('doc123');
      expect(document.filename).toBe('test.pdf');
      expect(document.totalPages).toBe(10);
      expect(document.fileHash).toBe('abc123hash');
      expect(document.uploadDate.getTime()).toBeGreaterThanOrEqual(beforeCreate);
      expect(document.uploadDate.getTime()).toBeLessThanOrEqual(afterCreate);
    });

    it('should trim whitespace from string fields', () => {
      const document = createDocument('  doc123  ', '  test.pdf  ', 10, '  abc123hash  ');
      expect(document.id).toBe('doc123');
      expect(document.filename).toBe('test.pdf');
      expect(document.fileHash).toBe('abc123hash');
    });

    it('should throw error for invalid document data', () => {
      expect(() => createDocument('', 'test.pdf', 10, 'abc123hash')).toThrow('Invalid document data provided');
      expect(() => createDocument('doc123', 'test.txt', 10, 'abc123hash')).toThrow('Invalid document data provided');
      expect(() => createDocument('doc123', 'test.pdf', 0, 'abc123hash')).toThrow('Invalid document data provided');
      expect(() => createDocument('doc123', 'test.pdf', 10, '')).toThrow('Invalid document data provided');
    });
  });
});