import '@testing-library/jest-dom';
import React from 'react';

// Mock styled-components globally
jest.mock('styled-components', () => {
  const React = require('react');
  
  const createStyledComponent = (tag: string) => {
    const Component = (props: any) => React.createElement(tag, props);
    Component.withConfig = (config: any) => (styles: any) => Component;
    return Component;
  };

  const styled = new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return Object.assign((styles: any) => createStyledComponent(prop), {
          withConfig: (config: any) => (styles: any) => createStyledComponent(prop)
        });
      }
      return undefined;
    }
  });
  
  return {
    __esModule: true,
    default: styled,
  };
});

// Mock react-pdf globally
jest.mock('react-pdf', () => ({
  Document: ({ children, onLoadSuccess }: any) => {
    React.useEffect(() => {
      onLoadSuccess?.({ numPages: 5 });
    }, [onLoadSuccess]);
    return React.createElement('div', { 'data-testid': 'pdf-document' }, children);
  },
  Page: ({ pageNumber, onLoadSuccess }: any) => {
    React.useEffect(() => {
      onLoadSuccess?.({
        getViewport: () => ({ width: 600, height: 800 })
      });
    }, [onLoadSuccess]);
    return React.createElement('div', { 'data-testid': `pdf-page-${pageNumber}` }, `Page ${pageNumber}`);
  },
  pdfjs: {
    GlobalWorkerOptions: { workerSrc: '' },
    version: '3.0.0'
  }
}));