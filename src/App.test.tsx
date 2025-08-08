import { render, screen } from '@testing-library/react';
import App from './App';

test('renders ebook utility header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Ebook Utility/i);
  expect(headerElement).toBeInTheDocument();
});