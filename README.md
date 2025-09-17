# PDF Annotation Utility

A React-based PDF reader with comprehensive annotation capabilities. Features a clean, distraction-free reading experience with persistent user annotations stored locally.

## Features

### Core Functionality
- **PDF Upload & Display**: Drag-drop or file picker support with responsive rendering
- **Text Highlighting**: Color-coded text selection with persistence across sessions
- **Bookmarks**: Named page markers with quick navigation
- **Comments**: Contextual notes attached to specific document areas
- **Call-to-Action Links**: Clickable regions linking to external resources
- **Mobile Support**: Touch-friendly highlighting and navigation

### User Experience
- Distraction-free reading interface
- Smooth scroll-to-highlight navigation
- Offline functionality with local storage
- Cross-browser compatibility (Chrome 80+, Firefox 75+, Safari 13+)
- Responsive design for desktop, tablet, and mobile

## Technology Stack

- **React 18+** with TypeScript
- **react-pdf** for PDF rendering
- **pdf-lib** for PDF manipulation
- **Styled Components** for dynamic styling
- **Local Storage API** for data persistence
- **Vite** for development and build tooling

## Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- Modern browser with ES6+ support

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ebook-utility.git
cd ebook-utility

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Create production build
npm run preview  # Preview production build
npm test         # Run test suite
npm run lint     # Run ESLint
```

## Project Structure

```
src/
├── components/
│   ├── common/          # Generic UI components
│   ├── pdf/             # PDF viewer components
│   └── annotations/     # Annotation system components
├── hooks/               # Custom React hooks
├── contexts/            # React Context providers
├── utils/               # Utility functions
├── types/               # TypeScript definitions
└── styles/              # Global styles
```

## Key Features Implementation

### Annotation System
- **Highlighting**: Text selection with color coding and coordinate mapping
- **Persistence**: Local storage with user-specific data isolation
- **Navigation**: Click highlights in sidebar to scroll to location on PDF
- **Mobile Support**: Touch-friendly text selection and gesture handling

### Performance Optimizations
- Lazy loading for PDF pages outside viewport
- Debounced annotation saves (300ms)
- Virtualized rendering for large documents
- React.memo for PDF-related components

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.