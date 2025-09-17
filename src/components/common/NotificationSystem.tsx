import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/theme';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number; // in milliseconds, 0 for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationSystemProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const slideAnimations = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;

const NotificationContainer = styled.div<{ position: string }>`
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  max-width: 400px;
  
  ${props => {
    switch (props.position) {
      case 'top-right':
        return `
          top: ${theme.spacing.lg};
          right: ${theme.spacing.lg};
        `;
      case 'top-left':
        return `
          top: ${theme.spacing.lg};
          left: ${theme.spacing.lg};
        `;
      case 'bottom-right':
        return `
          bottom: ${theme.spacing.lg};
          right: ${theme.spacing.lg};
        `;
      case 'bottom-left':
        return `
          bottom: ${theme.spacing.lg};
          left: ${theme.spacing.lg};
        `;
      case 'top-center':
        return `
          top: ${theme.spacing.lg};
          left: 50%;
          transform: translateX(-50%);
        `;
      case 'bottom-center':
        return `
          bottom: ${theme.spacing.lg};
          left: 50%;
          transform: translateX(-50%);
        `;
      default:
        return `
          top: ${theme.spacing.lg};
          right: ${theme.spacing.lg};
        `;
    }
  }}

  @media (max-width: ${theme.breakpoints.mobile}) {
    left: ${theme.spacing.md};
    right: ${theme.spacing.md};
    max-width: none;
    transform: none;
  }
`;

const NotificationItem = styled.div<{ type: 'success' | 'error' | 'warning' | 'info'; isExiting: boolean }>`
  display: flex;
  align-items: flex-start;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.lg};
  animation: ${props => props.isExiting ? 'slideOut' : 'slideIn'} 0.3s ease-out;
  cursor: pointer;
  
  ${slideAnimations}
  
  ${props => {
    switch (props.type) {
      case 'success':
        return `
          background-color: #d4edda;
          border-left: 4px solid ${theme.colors.success};
          color: #155724;
        `;
      case 'error':
        return `
          background-color: #f8d7da;
          border-left: 4px solid ${theme.colors.danger};
          color: #721c24;
        `;
      case 'warning':
        return `
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          color: #856404;
        `;
      case 'info':
        return `
          background-color: #d1ecf1;
          border-left: 4px solid ${theme.colors.info};
          color: #0c5460;
        `;
      default:
        return `
          background-color: #f8f9fa;
          border-left: 4px solid ${theme.colors.gray400};
          color: ${theme.colors.gray800};
        `;
    }
  }}

  &:hover {
    opacity: 0.9;
  }
`;

const NotificationIcon = styled.div<{ type: 'success' | 'error' | 'warning' | 'info' }>`
  margin-right: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  line-height: 1;
  
  &::before {
    content: ${props => {
      switch (props.type) {
        case 'success':
          return '"✓"';
        case 'error':
          return '"✕"';
        case 'warning':
          return '"⚠"';
        case 'info':
          return '"ℹ"';
        default:
          return '"ℹ"';
      }
    }};
  }
`;

const NotificationContent = styled.div`
  flex: 1;
`;

const NotificationTitle = styled.div`
  font-weight: 600;
  margin-bottom: ${theme.spacing.xs};
  font-size: ${theme.fontSizes.md};
`;

const NotificationMessage = styled.div`
  font-size: ${theme.fontSizes.sm};
  line-height: 1.4;
  margin-bottom: ${theme.spacing.sm};
`;

const NotificationActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
`;

const NotificationAction = styled.button`
  background: none;
  border: 1px solid currentColor;
  color: inherit;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
  margin-left: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.lg};
  line-height: 1;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
`;

const NotificationItemComponent: React.FC<{
  notification: Notification;
  onDismiss: (id: string) => void;
}> = ({ notification, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300); // Match animation duration
  }, [notification.id, onDismiss]);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(handleDismiss, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, handleDismiss]);

  return (
    <NotificationItem
      type={notification.type}
      isExiting={isExiting}
      onClick={handleDismiss}
    >
      <NotificationIcon type={notification.type} />
      <NotificationContent>
        {notification.title && (
          <NotificationTitle>{notification.title}</NotificationTitle>
        )}
        <NotificationMessage>{notification.message}</NotificationMessage>
        {notification.action && (
          <NotificationActions>
            <NotificationAction
              onClick={(e) => {
                e.stopPropagation();
                notification.action!.onClick();
              }}
            >
              {notification.action.label}
            </NotificationAction>
          </NotificationActions>
        )}
      </NotificationContent>
      <DismissButton
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        aria-label="Dismiss notification"
      >
        ×
      </DismissButton>
    </NotificationItem>
  );
};

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onDismiss,
  position = 'top-right',
}) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <NotificationContainer position={position}>
      {notifications.map((notification) => (
        <NotificationItemComponent
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </NotificationContainer>
  );
};