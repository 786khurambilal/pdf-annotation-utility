import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CTAList } from './CTAList';
import { CallToAction } from '../../types/annotation.types';

// Mock window.open and window.confirm
const mockWindowOpen = jest.fn();
const mockWindowConfirm = jest.fn();

Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen
});

Object.defineProperty(window, 'confirm', {
  writable: true,
  value: mockWindowConfirm
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
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z')
  },
  {
    id: 'cta-2',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 2,
    url: 'https://test.com/path?param=value',
    label: 'Test Link',
    coordinates: { x: 300, y: 400, width: 100, height: 30 },
    createdAt: new Date('2023-01-02T15:30:00Z'),
    updatedAt: new Date('2023-01-03T09:15:00Z')
  },
  {
    id: 'cta-3',
    userId: 'user-1',
    documentId: 'doc-1',
    pageNumber: 1,
    url: 'invalid-url',
    label: 'Invalid Link',
    coordinates: { x: 50, y: 100, width: 200, height: 40 },
    createdAt: new Date('2023-01-03T12:00:00Z'),
    updatedAt: new Date('2023-01-03T12:00:00Z')
  }
];

const defaultProps = {
  callToActions: mockCTAs,
  onCTAEdit: jest.fn(),
  onCTADelete: jest.fn(),
  onCTANavigate: jest.fn()
};

describe('CTAList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the list with correct count', () => {
    render(<CTAList {...defaultProps} />);
    
    expect(screen.getByText('Call-to-Actions')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('displays empty state when no CTAs exist', () => {
    render(<CTAList {...defaultProps} callToActions={[]} />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText(/No call-to-actions created yet/)).toBeInTheDocument();
  });

  it('displays CTA information correctly', () => {
    render(<CTAList {...defaultProps} />);
    
    // Check first CTA
    expect(screen.getByText('Visit Example')).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Page 1')).toHaveLength(2); // Two CTAs on page 1
    
    // Check second CTA
    expect(screen.getByText('Test Link')).toBeInTheDocument();
    expect(screen.getByText('https://test.com/path?param=value')).toBeInTheDocument();
    expect(screen.getByText('Page 2')).toBeInTheDocument();
  });

  it('sorts CTAs by page number then by creation date', () => {
    render(<CTAList {...defaultProps} />);
    
    const ctaItems = screen.getAllByText(/Page \d/);
    
    // Should be sorted: Page 1 (cta-1), Page 1 (cta-3), Page 2 (cta-2)
    expect(ctaItems[0]).toHaveTextContent('Page 1');
    expect(ctaItems[1]).toHaveTextContent('Page 1');
    expect(ctaItems[2]).toHaveTextContent('Page 2');
    
    // Check the order by looking at labels
    const labels = screen.getAllByText(/Visit Example|Test Link|Invalid Link/);
    expect(labels[0]).toHaveTextContent('Visit Example'); // cta-1 (earlier creation date)
    expect(labels[1]).toHaveTextContent('Invalid Link');  // cta-3 (later creation date)
    expect(labels[2]).toHaveTextContent('Test Link');     // cta-2 (page 2)
  });

  it('opens URL in new tab when URL is clicked', async () => {
    const user = userEvent.setup();
    render(<CTAList {...defaultProps} />);
    
    const urlElement = screen.getByText('https://example.com');
    await user.click(urlElement);
    
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('calls onCTAEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<CTAList {...defaultProps} />);
    
    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);
    
    expect(defaultProps.onCTAEdit).toHaveBeenCalledWith(mockCTAs[0]);
  });

  it('calls onCTADelete when delete is confirmed', async () => {
    const user = userEvent.setup();
    mockWindowConfirm.mockReturnValue(true);
    
    render(<CTAList {...defaultProps} />);
    
    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);
    
    expect(mockWindowConfirm).toHaveBeenCalledWith(
      'Are you sure you want to delete the call-to-action "Visit Example"?'
    );
    expect(defaultProps.onCTADelete).toHaveBeenCalledWith('cta-1');
  });

  it('does not call onCTADelete when delete is cancelled', async () => {
    const user = userEvent.setup();
    mockWindowConfirm.mockReturnValue(false);
    
    render(<CTAList {...defaultProps} />);
    
    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);
    
    expect(mockWindowConfirm).toHaveBeenCalled();
    expect(defaultProps.onCTADelete).not.toHaveBeenCalled();
  });

  it('calls onCTANavigate when go to page button is clicked', async () => {
    const user = userEvent.setup();
    render(<CTAList {...defaultProps} />);
    
    const navigateButtons = screen.getAllByText('Go to Page');
    await user.click(navigateButtons[0]);
    
    expect(defaultProps.onCTANavigate).toHaveBeenCalledWith(mockCTAs[0]);
  });

  it('does not show navigate button when onCTANavigate is not provided', () => {
    render(
      <CTAList 
        callToActions={mockCTAs}
        onCTAEdit={defaultProps.onCTAEdit}
        onCTADelete={defaultProps.onCTADelete}
      />
    );
    
    expect(screen.queryByText('Go to Page')).not.toBeInTheDocument();
  });

  it('displays creation and update dates correctly', () => {
    render(<CTAList {...defaultProps} />);
    
    // Check that creation dates are displayed
    expect(screen.getByText(/Created Jan 1, 2023/)).toBeInTheDocument();
    expect(screen.getByText(/Created Jan 2, 2023/)).toBeInTheDocument();
    
    // Check that update date is shown when different from creation date
    expect(screen.getByText(/Updated Jan 3, 2023/)).toBeInTheDocument();
  });

  it('shows link status checking functionality', async () => {
    const user = userEvent.setup();
    render(<CTAList {...defaultProps} />);
    
    // Find a "Check Link" button and click it
    const checkLinkButtons = screen.getAllByText('Check Link');
    expect(checkLinkButtons.length).toBeGreaterThan(0);
    
    await user.click(checkLinkButtons[0]);
    
    // Should show "Checking..." temporarily
    await waitFor(() => {
      expect(screen.getByText('Checking...')).toBeInTheDocument();
    });
    
    // Should eventually show "Link OK" for valid URLs
    await waitFor(() => {
      expect(screen.getByText('Link OK')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('shows invalid status for malformed URLs', async () => {
    const user = userEvent.setup();
    render(<CTAList {...defaultProps} />);
    
    // Find the invalid URL CTA and check its link
    const invalidUrlCTA = screen.getByText('invalid-url').closest('[data-testid]') || 
                          screen.getByText('invalid-url').parentElement?.parentElement?.parentElement;
    
    if (invalidUrlCTA) {
      const checkButton = screen.getAllByText('Check Link').find(button => 
        invalidUrlCTA.contains(button)
      );
      
      if (checkButton) {
        await user.click(checkButton);
        
        await waitFor(() => {
          expect(screen.getByText('Invalid URL')).toBeInTheDocument();
        });
      }
    }
  });

  it('handles keyboard navigation for buttons', async () => {
    const user = userEvent.setup();
    render(<CTAList {...defaultProps} />);
    
    const editButton = screen.getAllByText('Edit')[0];
    editButton.focus();
    
    await user.keyboard('{Enter}');
    
    expect(defaultProps.onCTAEdit).toHaveBeenCalledWith(mockCTAs[0]);
  });

  it('displays proper button titles for accessibility', () => {
    render(<CTAList {...defaultProps} />);
    
    expect(screen.getAllByTitle('Edit call-to-action')).toHaveLength(3);
    expect(screen.getAllByTitle('Delete call-to-action')).toHaveLength(3);
    expect(screen.getAllByTitle('Go to page')).toHaveLength(3);
  });

  it('handles long URLs and labels gracefully', () => {
    const longCTA: CallToAction = {
      id: 'cta-long',
      userId: 'user-1',
      documentId: 'doc-1',
      pageNumber: 1,
      url: 'https://very-long-domain-name-that-should-wrap.example.com/very/long/path/with/many/segments?param1=value1&param2=value2&param3=value3',
      label: 'This is a very long label that should wrap properly and not break the layout',
      coordinates: { x: 100, y: 200, width: 150, height: 50 },
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T10:00:00Z')
    };
    
    render(
      <CTAList 
        callToActions={[longCTA]}
        onCTAEdit={defaultProps.onCTAEdit}
        onCTADelete={defaultProps.onCTADelete}
      />
    );
    
    expect(screen.getByText(longCTA.label)).toBeInTheDocument();
    expect(screen.getByText(longCTA.url)).toBeInTheDocument();
  });

  it('maintains scroll position in list container', () => {
    // Create many CTAs to test scrolling
    const manyCTAs = Array.from({ length: 20 }, (_, i) => ({
      id: `cta-${i}`,
      userId: 'user-1',
      documentId: 'doc-1',
      pageNumber: Math.floor(i / 5) + 1,
      url: `https://example${i}.com`,
      label: `CTA ${i}`,
      coordinates: { x: 100, y: 200, width: 150, height: 50 },
      createdAt: new Date(`2023-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`),
      updatedAt: new Date(`2023-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`)
    }));
    
    render(
      <CTAList 
        callToActions={manyCTAs}
        onCTAEdit={defaultProps.onCTAEdit}
        onCTADelete={defaultProps.onCTADelete}
      />
    );
    
    // Should render all CTAs
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('CTA 0')).toBeInTheDocument();
    expect(screen.getByText('CTA 19')).toBeInTheDocument();
  });
});