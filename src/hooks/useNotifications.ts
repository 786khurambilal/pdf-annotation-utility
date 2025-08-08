import { useState, useCallback } from 'react';
import { Notification } from '../components/common/NotificationSystem';

export interface UseNotificationsReturn {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  showSuccess: (message: string, title?: string, duration?: number) => string;
  showError: (message: string, title?: string, duration?: number) => string;
  showWarning: (message: string, title?: string, duration?: number) => string;
  showInfo: (message: string, title?: string, duration?: number) => string;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const generateId = useCallback((): string => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>): string => {
    const id = generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000, // Default 5 seconds
    };

    setNotifications(prev => [newNotification, ...prev]);
    return id;
  }, [generateId]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const showSuccess = useCallback((
    message: string,
    title?: string,
    duration: number = 5000
  ): string => {
    return addNotification({
      type: 'success',
      title,
      message,
      duration,
    });
  }, [addNotification]);

  const showError = useCallback((
    message: string,
    title?: string,
    duration: number = 8000 // Errors stay longer
  ): string => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration,
    });
  }, [addNotification]);

  const showWarning = useCallback((
    message: string,
    title?: string,
    duration: number = 6000
  ): string => {
    return addNotification({
      type: 'warning',
      title,
      message,
      duration,
    });
  }, [addNotification]);

  const showInfo = useCallback((
    message: string,
    title?: string,
    duration: number = 5000
  ): string => {
    return addNotification({
      type: 'info',
      title,
      message,
      duration,
    });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

// Specific notification hooks for common scenarios
export const usePDFNotifications = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();

  return {
    showPDFLoadSuccess: (fileName: string) =>
      showSuccess(`Successfully loaded ${fileName}`, 'PDF Loaded'),
    
    showPDFLoadError: (fileName: string, error?: string) =>
      showError(
        error || 'Failed to load PDF file. Please check the file and try again.',
        `Failed to load ${fileName}`
      ),
    
    showPDFProcessing: (fileName: string) =>
      showInfo(`Processing ${fileName}...`, 'PDF Processing', 0), // Persistent until dismissed
    
    showPageLoadError: (pageNumber: number) =>
      showError(`Failed to load page ${pageNumber}`, 'Page Load Error'),
  };
};

export const useAnnotationNotifications = () => {
  const { showSuccess, showError, showWarning } = useNotifications();

  return {
    showHighlightCreated: () =>
      showSuccess('Highlight created successfully', 'Highlight Added'),
    
    showHighlightDeleted: () =>
      showSuccess('Highlight removed', 'Highlight Deleted'),
    
    showBookmarkCreated: (title: string) =>
      showSuccess(`Bookmark "${title}" created`, 'Bookmark Added'),
    
    showBookmarkDeleted: (title: string) =>
      showSuccess(`Bookmark "${title}" removed`, 'Bookmark Deleted'),
    
    showCommentCreated: () =>
      showSuccess('Comment added successfully', 'Comment Added'),
    
    showCommentUpdated: () =>
      showSuccess('Comment updated', 'Comment Saved'),
    
    showCommentDeleted: () =>
      showSuccess('Comment removed', 'Comment Deleted'),
    
    showCTACreated: (label: string) =>
      showSuccess(`Call-to-action "${label}" created`, 'CTA Added'),
    
    showCTADeleted: (label: string) =>
      showSuccess(`Call-to-action "${label}" removed`, 'CTA Deleted'),
    
    showAnnotationError: (operation: string, error?: string) =>
      showError(
        error || `Failed to ${operation}. Please try again.`,
        'Annotation Error'
      ),
    
    showStorageWarning: () =>
      showWarning(
        'Your browser storage is getting full. Consider removing old annotations.',
        'Storage Warning',
        10000
      ),
  };
};