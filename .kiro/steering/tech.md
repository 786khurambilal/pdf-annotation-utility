# Technology Stack

## Frontend Framework
- **React 18+** with TypeScript for type safety and better developer experience
- **React Context API** for state management (user sessions, annotations)
- **CSS-in-JS** or **Styled Components** for dynamic styling of annotations

## Core Libraries
- **react-pdf**: Primary PDF rendering and display library
- **pdf-lib**: PDF manipulation, text extraction, and coordinate mapping
- **Local Storage API**: Persistent storage for user annotations and preferences

## Development Tools
- **TypeScript**: Static typing for better code quality and IDE support
- **React Testing Library**: Component testing framework
- **Jest**: Unit testing framework
- **ESLint + Prettier**: Code formatting and linting

## Build System
- **Vite** or **Create React App**: Development server and build tooling
- **npm/yarn**: Package management

## Common Commands

### Development
```bash
npm start          # Start development server
npm run dev        # Alternative dev command (if using Vite)
npm test           # Run test suite
npm run test:watch # Run tests in watch mode
```

### Build & Deploy
```bash
npm run build      # Create production build
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

### Testing
```bash
npm test -- --coverage    # Run tests with coverage report
npm run test:e2e          # Run end-to-end tests
npm run test:integration  # Run integration tests
```

## Browser Support
- Modern browsers with ES6+ support
- Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- Mobile browsers on iOS Safari and Chrome Mobile