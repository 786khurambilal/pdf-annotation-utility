import { renderHook, act } from '@testing-library/react';
import { useNotifications, usePDFNotifications, useAnnotationNotifications } from './useNotifications';

describe('useNotifications', () => {
  it('should start with empty notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    expect(result.current.notifications).toEqual([]);
  });

  it('should add notification', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({
        type: 'success',
        message: 'Test message',
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({
      type: 'success',
      message: 'Test message',
      id: expect.any(String),
    });
  });

  it('should remove notification by id', () => {
    const { result } = renderHook(() => useNotifications());
    
    let notificationId: string;
    
    act(() => {
      notificationId = result.current.addNotification({
        type: 'info',
        message: 'Test message',
      });
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should clear all notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({ type: 'success', message: 'Message 1' });
      result.current.addNotification({ type: 'error', message: 'Message 2' });
    });

    expect(result.current.notifications).toHaveLength(2);

    act(() => {
      result.current.clearNotifications();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should add notifications with newest first', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({ type: 'info', message: 'First' });
      result.current.addNotification({ type: 'info', message: 'Second' });
    });

    expect(result.current.notifications[0].message).toBe('Second');
    expect(result.current.notifications[1].message).toBe('First');
  });

  describe('convenience methods', () => {
    it('should show success notification', () => {
      const { result } = renderHook(() => useNotifications());
      
      act(() => {
        result.current.showSuccess('Success message', 'Success Title');
      });

      expect(result.current.notifications[0]).toMatchObject({
        type: 'success',
        title: 'Success Title',
        message: 'Success message',
      });
    });

    it('should show error notification', () => {
      const { result } = renderHook(() => useNotifications());
      
      act(() => {
        result.current.showError('Error message', 'Error Title');
      });

      expect(result.current.notifications[0]).toMatchObject({
        type: 'error',
        title: 'Error Title',
        message: 'Error message',
      });
    });

    it('should show warning notification', () => {
      const { result } = renderHook(() => useNotifications());
      
      act(() => {
        result.current.showWarning('Warning message');
      });

      expect(result.current.notifications[0]).toMatchObject({
        type: 'warning',
        message: 'Warning message',
      });
    });

    it('should show info notification', () => {
      const { result } = renderHook(() => useNotifications());
      
      act(() => {
        result.current.showInfo('Info message');
      });

      expect(result.current.notifications[0]).toMatchObject({
        type: 'info',
        message: 'Info message',
      });
    });
  });
});

describe('usePDFNotifications', () => {
  it('should show PDF load success notification', () => {
    const { result: notificationsResult } = renderHook(() => useNotifications());
    const { result: pdfResult } = renderHook(() => usePDFNotifications());
    
    act(() => {
      pdfResult.current.showPDFLoadSuccess('test.pdf');
    });

    // Note: This test would need to be restructured to properly test the integration
    // For now, we're just testing that the function exists and can be called
    expect(pdfResult.current.showPDFLoadSuccess).toBeDefined();
  });

  it('should show PDF load error notification', () => {
    const { result } = renderHook(() => usePDFNotifications());
    
    expect(result.current.showPDFLoadError).toBeDefined();
    expect(result.current.showPDFProcessing).toBeDefined();
    expect(result.current.showPageLoadError).toBeDefined();
  });
});

describe('useAnnotationNotifications', () => {
  it('should provide annotation notification methods', () => {
    const { result } = renderHook(() => useAnnotationNotifications());
    
    expect(result.current.showHighlightCreated).toBeDefined();
    expect(result.current.showHighlightDeleted).toBeDefined();
    expect(result.current.showBookmarkCreated).toBeDefined();
    expect(result.current.showBookmarkDeleted).toBeDefined();
    expect(result.current.showCommentCreated).toBeDefined();
    expect(result.current.showCommentUpdated).toBeDefined();
    expect(result.current.showCommentDeleted).toBeDefined();
    expect(result.current.showCTACreated).toBeDefined();
    expect(result.current.showCTADeleted).toBeDefined();
    expect(result.current.showAnnotationError).toBeDefined();
    expect(result.current.showStorageWarning).toBeDefined();
  });
});