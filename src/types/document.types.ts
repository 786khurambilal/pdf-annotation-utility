// Document types and validation functions
export interface Document {
  id: string;
  filename: string;
  uploadDate: Date;
  totalPages: number;
  fileHash: string; // For identifying same documents
}

// Document validation function
export const validateDocument = (document: any): document is Document => {
  return (
    typeof document === 'object' &&
    document !== null &&
    typeof document.id === 'string' &&
    document.id.trim().length > 0 &&
    typeof document.filename === 'string' &&
    document.filename.trim().length > 0 &&
    document.filename.toLowerCase().endsWith('.pdf') &&
    document.uploadDate instanceof Date &&
    !isNaN(document.uploadDate.getTime()) &&
    typeof document.totalPages === 'number' &&
    document.totalPages > 0 &&
    Number.isInteger(document.totalPages) &&
    typeof document.fileHash === 'string' &&
    document.fileHash.trim().length > 0
  );
};

// Document creation helper
export const createDocument = (
  id: string,
  filename: string,
  totalPages: number,
  fileHash: string
): Document => {
  const document = {
    id: id.trim(),
    filename: filename.trim(),
    uploadDate: new Date(),
    totalPages,
    fileHash: fileHash.trim()
  };
  
  if (!validateDocument(document)) {
    throw new Error('Invalid document data provided');
  }
  
  return document;
};