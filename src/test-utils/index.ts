import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { UserProvider } from '../contexts/UserContext';
import { AnnotationProvider } from '../contexts/AnnotationContext';
import { PdfProvider } from '../contexts/PdfContext';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Mock PDF file for testing
export const createMockPdfFile = (name = 'test.pdf', size = 1024): File => {
  const content = new Uint8Array(size);
  return new File([content], name, { type: 'application/pdf' });
};

// Mock text selection for testing
export const createMockTextSelection = (overrides = {}) => ({
  text: 'Sample selected text',
  pageNumber: 1,
  startOffset: 0,
  endOffset: 20,
  coordinates: {
    x: 100,
    y: 200,
    width: 150,
    height: 20,
  },
  ...overrides,
});

// Mock area coordinates for testing
export const createMockAreaCoordinates = (overrides = {}) => ({
  x: 100,
  y: 200,
  width: 50,
  height: 30,
  ...overrides,
});

// Custom render function with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialUser?: { id: string; name: string };
}

const AllTheProviders: React.FC<{ children: React.ReactNode; initialUser?: { id: string; name: string } }> = ({ 
  children, 
  initialUser 
}) => {
  return React.createElement(ErrorBoundary, { onError: jest.fn() },
    React.createElement(UserProvider, { initialUser },
      React.createElement(AnnotationProvider, {},
        React.createElement(PdfProvider, {},
          children
        )
      )
    )
  );
};

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialUser, ...renderOptions } = options;
  
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(AllTheProviders, { initialUser }, children);

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Wait for async operations to complete
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock localStorage for testing
export const mockLocalStorage = () => {
  const store: { [key: string]: string } = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get store() {
      return { ...store };
    }
  };
};

// Mock window.getSelection for text selection tests
export const mockWindowSelection = (selectedText = '') => {
  const mockSelection = {
    toString: () => selectedText,
    getRangeAt: jest.fn(() => ({
      getBoundingClientRect: () => ({
        x: 100,
        y: 200,
        width: 150,
        height: 20,
        top: 200,
        left: 100,
        right: 250,
        bottom: 220,
      }),
      startOffset: 0,
      endOffset: selectedText.length,
    })),
    rangeCount: selectedText ? 1 : 0,
    removeAllRanges: jest.fn(),
  };
  
  Object.defineProperty(window, 'getSelection', {
    writable: true,
    value: jest.fn(() => mockSelection),
  });
  
  return mockSelection;
};

// Helper to simulate file drop
export const createFileDropEvent = (files: File[]) => {
  const event = new Event('drop', { bubbles: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      files,
      items: files.map(file => ({ kind: 'file', type: file.type, getAsFile: () => file })),
    },
  });
  return event;
};

// Helper to simulate keyboard events
export const createKeyboardEvent = (key: string, options: KeyboardEventInit = {}) => {
  return new KeyboardEvent('keydown', { key, ...options });
};

export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';
export * from './performanceMonitor';