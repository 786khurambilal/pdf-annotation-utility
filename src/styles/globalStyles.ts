import { createGlobalStyle } from 'styled-components';
import { theme } from './theme';

// Global styles with responsive design support
export const GlobalStyles = createGlobalStyle`
  /* Reset and base styles */
  * {
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: ${theme.fontSizes.md};
    line-height: 1.5;
    color: ${theme.colors.gray800};
    background-color: ${theme.colors.light};
    overflow-x: hidden;
  }

  /* Touch-friendly interactive elements */
  button, 
  [role="button"],
  input[type="button"],
  input[type="submit"],
  input[type="reset"] {
    min-height: ${theme.touch.minSize};
    min-width: ${theme.touch.minSize};
    touch-action: manipulation;
    -webkit-appearance: none;
    appearance: none;
  }

  /* Improve touch scrolling on iOS */
  .scrollable {
    -webkit-overflow-scrolling: touch;
    overflow-scrolling: touch;
  }

  /* Focus styles for accessibility */
  :focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  /* Responsive typography */
  @media (max-width: ${theme.breakpoints.tablet}) {
    html {
      font-size: 14px;
    }
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    html {
      font-size: 13px;
    }
  }

  /* Utility classes for responsive design */
  .hide-mobile {
    @media (max-width: ${theme.breakpoints.tablet}) {
      display: none !important;
    }
  }

  .hide-desktop {
    @media (min-width: ${theme.breakpoints.tablet}) {
      display: none !important;
    }
  }

  .show-mobile {
    display: none !important;
    @media (max-width: ${theme.breakpoints.tablet}) {
      display: block !important;
    }
  }

  .show-desktop {
    display: block !important;
    @media (max-width: ${theme.breakpoints.tablet}) {
      display: none !important;
    }
  }

  /* Responsive spacing utilities */
  .p-responsive {
    padding: ${theme.spacing.md};
    @media (max-width: ${theme.breakpoints.tablet}) {
      padding: ${theme.spacing.sm};
    }
  }

  .m-responsive {
    margin: ${theme.spacing.md};
    @media (max-width: ${theme.breakpoints.tablet}) {
      margin: ${theme.spacing.sm};
    }
  }

  /* Prevent horizontal scroll on mobile */
  .container-responsive {
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
  }

  /* Touch-friendly form elements */
  input, textarea, select {
    font-size: 16px; /* Prevents zoom on iOS */
    @media (max-width: ${theme.breakpoints.mobile}) {
      font-size: 16px !important;
    }
  }

  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }

  /* Print styles */
  @media print {
    .no-print {
      display: none !important;
    }
  }
`;

// Export theme for use in components
export { theme };