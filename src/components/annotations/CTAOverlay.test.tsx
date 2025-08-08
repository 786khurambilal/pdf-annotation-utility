import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CTAOverlay } from './CTAOverlay';
import { CallToAction } from '../../types/annotation.types';

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen
});

const mockCTAs: CallToAction[] = [
  {
    id: 'cta-1',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    url: 'https://example.com',
    label: 'Visit Example',
    coordinates: { x: 100, y: 200, width: 150, height: 50 },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  {
    id: 'cta-2',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    url: 'https://test.com/path?param=value',
    label: 'Test Link',
    coordinates: { x: 300, y: 400, width: 100, height: 30 },
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02')
  },
  {
    id: 'cta-3',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 2,
    url: 'https://other.com',
    label: 'Other Page',
    coordinates: { x: 50, y: 100, width: 200, height: 40 },
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03')
  }
];

const defaultProps = {
  callToActions: mockCTAs,
  pageNumber: 1,
  onCTAClick: jest.fn(),
  onCTAEdit: jest.fn(),
  onCTADelete: jest.fn()
};

describe('CTAOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders CTAs for the current page only', () => {
    render(<CTAOverlay {...defaultProps} />);
    
    // Should render 2 CTAs for page 1
    const ctaElements = screen.getAllByRole('button');
    expect(ctaElements).toHaveLength(2);
    
    // Check that the CTAs have the correct labels
    expect(screen.getByLabelText('Call to action: Visit Example')).toBeInTheDocument();
    expect(screen.getByLabelText('Call to action: Test Link')).toBeInTheDocument();
    expect(screen.queryByLabelText('Call to action: Other Page')).not.toBeInTheDocument();
  });

  it('does not render anything when no CTAs exist for the page', () => {
    render(<CTAOverlay {...defaultProps} callToActions={[]} />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not render CTAs for different pages', () => {
    render(<CTAOverlay {...defaultProps} pageNumber={3} />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens URL in new tab when CTA is clicked', async () => {
    const user = userEvent.setup();
    render(<CTAOverlay {...defaultProps} />);
    
    const ctaElement = screen.getByLabelText('Call to action: Visit Example');
    await user.click(ctaElement);
    
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener,noreferrer'
    );
    expect(defaultProps.onCTAClick).toHaveBeenCalledWith(mockCTAs[0]);
  });

  it('opens URL with complex path and parameters', async () => {
    const user = userEvent.setup();
    render(<CTAOverlay {...defaultProps} />);
    
    const ctaElement = screen.getByLabelText('Call to action: Test Link');
    await user.click(ctaElement);
    
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://test.com/path?param=value',
      '_blank',
      'noopener,noreferrer'
    );
    expect(defaultProps.onCTAClick).toHaveBeenCalledWith(mockCTAs[1]);
  });

  it('handles keyboard navigation with Enter key', async () => {
    const user = userEvent.setup();
    render(<CTAOverlay {...defaultProps} />);
    
    const ctaElement = screen.getByLabelText('Call to action: Visit Example');
    ctaElement.focus();
    await user.keyboard('{Enter}');
    
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener,noreferrer'
    );
    expect(defaultProps.onCTAClick).toHaveBeenCalledWith(mockCTAs[0]);
  });

  it('handles keyboard navigation with Space key', async () => {
    const user = userEvent.setup();
    render(<CTAOverlay {...defaultProps} />);
    
    const ctaElement = screen.getByLabelText('Call to action: Visit Example');
    ctaElement.focus();
    await user.keyboard(' ');
    
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener,noreferrer'
    );
    expect(defaultProps.onCTAClick).toHaveBeenCalledWith(mockCTAs[0]);
  });

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup();
    render(<CTAOverlay {...defaultProps} />);
    
    const ctaElement = screen.getByLabelText('Call to action: Visit Example');
    await user.hover(ctaElement);
    
    await waitFor(() => {
      expect(screen.getByText('Visit Example')).toBeInTheDocument();
    });
  });

  it('hides tooltip on mouse leave', async () => {
    const user = userEvent.setup();
    render(<CTAOverlay {...defaultProps} />);
    
    const ctaElement = screen.getByLabelText('Call to action: Visit Example');
    await user.hover(ctaElement);
    
    await waitFor(() => {
      expect(screen.getByText('Visit Example')).toBeInTheDocument();
    });
    
    await user.unhover(ctaElement);
    
    await waitFor(() => {
      expect(screen.queryByText('Visit Example')).not.toBeInTheDocument();
    });
  });

  it('shows context menu on right click', async () => {
    const user = userEvent.setup();
    render(<CTAOverlay {...defaultProps} />);
    
    const ctaElement = screen.getByLabelText('Call to action: Visit Example');
    await user.pointer({ keys: '[MouseRight]', target: ctaElement });
    
    await waitFor(() => {
      expect(screen.getByText('Edit CTA')).toBeInTheDocument();
      expect(screen.getByText('Delete CTA')).toBeInTheDocument();
    });
  });

  it('calls onCTAEdit when edit is clicked in context menu', async () => {
    const user = userEvent.setup();
    render(<CTAOverlay {...defaultProps} />);
    
    const ctaElement = screen.getByLabelText('Call to action: Visit Example');
    await user.pointer({ keys: '[MouseRight]', target: ctaElement });
    
    await waitFor(() => {
      expect(screen.getByText('Edit CTA')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Edit CTA'));
    
    expect(defaultProps.onCTAEdit).toHaveBeenCalledWith(mockCTAs[0]);
  });

  it('calls onCTADelete when delete is clicked in context menu', async () => {
    const user = userEvent.setup();
    render(<CTAOverlay {...defaultProps} />);
    
    const ctaElement = screen.getByLabelText('Call to action: Visit Example');
    await user.pointer({ keys: '[MouseRight]', target: ctaElement });
    
    await waitFor(() => {
      expect(screen.getByText('Delete CTA')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Delete CTA'));
    
    expect(defaultProps.onCTADelete).toHaveBeenCalledWith('cta-1');
  });

  it('closes context menu when clicking outside', async () => {
    const user = userEvent.setup();
    const { container } = render(<CTAOverlay {...defaultProps} />);
    
    const ctaElement = screen.getByLabelText('Call to action: Visit Example');
    await user.pointer({ keys: '[MouseRight]', target: ctaElement });
    
    await waitFor(() => {
      expect(screen.getByText('Edit CTA')).toBeInTheDocument();
    });
    
    // Now the overlay container should have pointer-events: auto, so we can click it
    const overlayContainer = container.firstChild as Element;
    await user.click(overlayContainer);
    
    await waitFor(() => {
      expect(screen.queryByText('Edit CTA')).not.toBeInTheDocument();
    });
  });

  it('closes context menu when pressing Escape key', async () => {
    const user = userEvent.setup();
    render(<CTAOverlay {...defaultProps} />);
    
    const ctaElement = screen.getByLabelText('Call to action: Visit Example');
    await user.pointer({ keys: '[MouseRight]', target: ctaElement });
    
    await waitFor(() => {
      expect(screen.getByText('Edit CTA')).toBeInTheDocument();
    });
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    await waitFor(() => {
      expect(screen.queryByText('Edit CTA')).not.toBeInTheDocument();
    });
  });

  it('positions CTAs correctly based on coordinates', () => {
    render(<CTAOverlay {...defaultProps} />);
    
    const ctaElements = screen.getAllByRole('button');
    
    // Check first CTA positioning
    expect(ctaElements[0]).toHaveStyle({
      left: '100px',
      top: '200px',
      width: '150px',
      height: '50px'
    });
    
    // Check second CTA positioning
    expect(ctaElements[1]).toHaveStyle({
      left: '300px',
      top: '400px',
      width: '100px',
      height: '30px'
    });
  });

  it('works without optional callback props', async () => {
    const user = userEvent.setup();
    render(
      <CTAOverlay 
        callToActions={mockCTAs} 
        pageNumber={1} 
      />
    );
    
    const ctaElement = screen.getByLabelText('Call to action: Visit Example');
    await user.click(ctaElement);
    
    // Should still open the URL even without callbacks
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('prevents event propagation when CTA is clicked', async () => {
    const user = userEvent.setup();
    const overlayClickHandler = jest.fn();
    
    render(
      <div onClick={overlayClickHandler}>
        <CTAOverlay {...defaultProps} />
      </div>
    );
    
    const ctaElement = screen.getByLabelText('Call to action: Visit Example');
    await user.click(ctaElement);
    
    // The overlay click handler should not be called
    expect(overlayClickHandler).not.toHaveBeenCalled();
    expect(mockWindowOpen).toHaveBeenCalled();
  });

  it('handles HTTP URLs correctly', async () => {
    const httpCTA: CallToAction = {
      ...mockCTAs[0],
      url: 'http://insecure-example.com',
      label: 'HTTP Link'
    };
    
    const user = userEvent.setup();
    render(
      <CTAOverlay 
        callToActions={[httpCTA]} 
        pageNumber={1} 
        onCTAClick={defaultProps.onCTAClick}
      />
    );
    
    const ctaElement = screen.getByLabelText('Call to action: HTTP Link');
    await user.click(ctaElement);
    
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'http://insecure-example.com',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('displays link icon in CTA areas', () => {
    render(<CTAOverlay {...defaultProps} />);
    
    const ctaElements = screen.getAllByRole('button');
    
    // Check that each CTA contains the link icon
    ctaElements.forEach(cta => {
      expect(cta).toHaveTextContent('🔗');
    });
  });

  it('has proper accessibility attributes', () => {
    render(<CTAOverlay {...defaultProps} />);
    
    const ctaElements = screen.getAllByRole('button');
    
    ctaElements.forEach((cta, index) => {
      expect(cta).toHaveAttribute('tabIndex', '0');
      expect(cta).toHaveAttribute('role', 'button');
      expect(cta).toHaveAttribute('aria-label');
      expect(cta).toHaveAttribute('title');
    });
  });
});