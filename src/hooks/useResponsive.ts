import { useState, useEffect } from 'react';
import { theme } from '../styles/theme';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLarge: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
}

// Parse breakpoint values to numbers
const breakpointValues = {
  mobile: parseInt(theme.breakpoints.mobile),
  tablet: parseInt(theme.breakpoints.tablet),
  desktop: parseInt(theme.breakpoints.desktop),
  large: parseInt(theme.breakpoints.large),
};

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(() => {
    // Initialize with safe defaults for SSR
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLarge: false,
        isTouchDevice: false,
        screenWidth: 1024,
        screenHeight: 768,
        orientation: 'landscape',
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      isMobile: width < breakpointValues.tablet,
      isTablet: width >= breakpointValues.tablet && width < breakpointValues.desktop,
      isDesktop: width >= breakpointValues.desktop,
      isLarge: width >= breakpointValues.large,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      screenWidth: width,
      screenHeight: height,
      orientation: width > height ? 'landscape' : 'portrait',
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setState({
        isMobile: width < breakpointValues.tablet,
        isTablet: width >= breakpointValues.tablet && width < breakpointValues.desktop,
        isDesktop: width >= breakpointValues.desktop,
        isLarge: width >= breakpointValues.large,
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? 'landscape' : 'portrait',
      });
    };

    // Update on resize
    window.addEventListener('resize', updateState);
    
    // Update on orientation change
    window.addEventListener('orientationchange', () => {
      // Delay to ensure dimensions are updated after orientation change
      setTimeout(updateState, 100);
    });

    // Initial update
    updateState();

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, []);

  return state;
};

// Hook for specific breakpoint queries
export const useBreakpoint = (breakpoint: keyof typeof breakpointValues): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const query = `(min-width: ${theme.breakpoints[breakpoint]})`;
    const mediaQuery = window.matchMedia(query);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [breakpoint]);

  return matches;
};

// Hook for detecting touch gestures
export const useTouchGestures = () => {
  const [touchState, setTouchState] = useState({
    isTouch: false,
    touchCount: 0,
    lastTouchTime: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      setTouchState({
        isTouch: true,
        touchCount: e.touches.length,
        lastTouchTime: Date.now(),
      });
    };

    const handleTouchEnd = () => {
      setTouchState(prev => ({
        ...prev,
        isTouch: false,
        touchCount: 0,
      }));
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return touchState;
};