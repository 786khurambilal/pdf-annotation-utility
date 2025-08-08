---
inclusion: always
---

# Product Requirements & Conventions

## Application Overview
React-based PDF reader with annotation capabilities. Focus on clean, distraction-free reading experience with persistent user annotations.

## Core Feature Requirements

### PDF Handling
- Support PDF upload via drag-drop and file picker
- Implement page-by-page rendering with navigation controls
- Ensure responsive display across desktop, tablet, and mobile
- Handle large PDFs with lazy loading and virtualization

### Annotation System
- **Highlighting**: Color-coded text selection with persistence
- **Bookmarks**: Named page markers with quick navigation
- **Comments**: Contextual notes attached to specific document areas
- **Call-to-Action Links**: Clickable regions linking to external resources
- **Data Isolation**: User-specific annotations with no cross-user visibility

## User Experience Principles
- Minimize UI chrome to maximize reading space
- Provide intuitive annotation tools that don't interrupt reading flow
- Ensure all features work offline with local storage
- Maintain fast performance even with heavily annotated documents

## Technical Constraints
- Use local storage for all user data (no backend required)
- Support modern browsers (Chrome 80+, Firefox 75+, Safari 13+)
- Implement proper error handling for PDF load failures
- Ensure accessibility compliance for screen readers

## Development Priorities
1. Core PDF viewing functionality first
2. Basic highlighting and bookmarking
3. Comments and advanced features
4. Mobile responsiveness and performance optimization

## Quality Standards
- All annotation operations must be reversible
- Data persistence must be reliable across browser sessions
- UI should remain responsive during PDF processing
- Error states must provide clear user guidance