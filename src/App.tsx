import React, { useEffect } from 'react';
import { PDFViewerContainer } from './components/pdf/PDFViewerContainer';
import { UserProvider } from './contexts/UserContext';
import { AnnotationProvider } from './contexts/AnnotationContext';
import { PdfProvider } from './contexts/PdfContext';
import { GlobalStyles } from './styles/globalStyles';
import ErrorBoundary from './components/common/ErrorBoundary';
import { NotificationSystem } from './components/common/NotificationSystem';
import { useNotifications } from './hooks/useNotifications';
import { setupGlobalErrorHandling, handleReactError } from './utils/errorHandling';
import './App.css';

function App() {
  const { notifications, removeNotification } = useNotifications();

  useEffect(() => {
    // Set up global error handling
    setupGlobalErrorHandling();
  }, []);

  return (
    <>
      <GlobalStyles />
      <ErrorBoundary onError={handleReactError}>
        <UserProvider>
          <ErrorBoundary onError={handleReactError}>
            <AnnotationProvider>
              <ErrorBoundary onError={handleReactError}>
                <PdfProvider>
                  <ErrorBoundary onError={handleReactError}>
                    <PDFViewerContainer enableVirtualization={false} />
                  </ErrorBoundary>
                </PdfProvider>
              </ErrorBoundary>
            </AnnotationProvider>
          </ErrorBoundary>
        </UserProvider>
      </ErrorBoundary>
      
      {/* Global notification system */}
      <NotificationSystem
        notifications={notifications}
        onDismiss={removeNotification}
        position="top-right"
      />
    </>
  );
}

export default App;