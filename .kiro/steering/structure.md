---
inclusion: always
---

# Project Structure & Architecture

## Required Directory Structure
```
src/
├── components/
│   ├── common/          # Generic UI components (Button, Modal)
│   ├── pdf/             # PDF components (Viewer, Controls, Navigation)
│   └── annotations/     # Annotation components (Highlight, Comment, Bookmark)
├── hooks/               # Custom React hooks
├── contexts/            # React Context providers
├── utils/               # Utility functions
├── types/               # TypeScript definitions
└── styles/              # Global styles
```

## Naming Conventions
- **Components**: PascalCase files (`PdfViewer.tsx`)
- **Hooks**: `use{Name}.ts` format (`useAnnotations.ts`)
- **Types**: `{domain}.types.ts` (`annotation.types.ts`)
- **Context Providers**: Suffix with "Provider" (`AnnotationProvider`)

## Component Structure Template
```typescript
interface ComponentProps {
  // Props interface first
}

export const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // 1. Hooks at top
  // 2. Event handlers
  // 3. Render logic
  return (/* JSX */);
};
```

## State Management Rules
- **UserContext**: User auth and preferences
- **AnnotationContext**: All annotation data (highlights, comments, bookmarks)
- **PdfContext**: PDF document state and navigation
- **Local Storage Keys**: `ebook-utility-{userId}-{documentId}-{dataType}`

## Import Order (Enforce Strictly)
1. React imports
2. Third-party libraries
3. Internal components/hooks
4. Types/interfaces
5. Utils/constants

## Performance Requirements
- Lazy load PDF pages outside viewport
- Debounce annotation saves (300ms minimum)
- Use React.memo for PDF-related components
- Virtualize annotation lists if >50 items

## Error Handling
- Always wrap PDF viewer in error boundary
- Provide fallback UI for PDF load failures
- Log all PDF-related errors for debugging

## Testing Placement
- Component tests: `Component.test.tsx` alongside component
- Mock PDFs: `src/mocks/` directory
- Test utilities: `src/test-utils/`