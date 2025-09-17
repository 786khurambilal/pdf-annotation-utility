# Call-to-Action (CTA) Functionality Guide

## Problem Fixed
The Call-to-Action (CTA) functionality was not working because the CTACreator component was not integrated into the PDF display components.

## What Was Missing
1. **CTACreator not imported** in PdfDisplay component
2. **No CTA creation trigger** in the UI
3. **Missing CTA creation handlers** in PDFViewerContainer
4. **No way for users to create CTAs** through the interface

## Implementation Added

### 1. CTACreator Integration
**File**: `src/components/pdf/PdfDisplay.tsx`

- Added CTACreator import
- Added CTA creation props to interface
- Added CTA creation state management
- Added CTA creation handlers
- Integrated CTACreator component in render

### 2. CTA Creation Trigger
**Method**: Shift + Click on PDF

- **Normal Click**: Creates a comment
- **Shift + Click**: Creates a CTA
- Converts area coordinates to rectangle coordinates for CTA placement

### 3. Handler Integration
**File**: `src/components/pdf/PDFViewerContainer.tsx`

- Added `handleCTACreateFromPDF` function
- Connected to annotation context's `createCallToAction`
- Passed handler to PdfDisplay component

### 4. Debug Indicators
Added visual debug indicator:
- **Red "CTA: SHOWING"** when CTA creator is visible
- Shows coordinates when CTA creation is active

## How to Use CTAs

### Creating a CTA:
1. **Hold Shift key**
2. **Click on any area** of the PDF where you want to place the CTA
3. **CTA Creator modal** will appear
4. **Enter URL** (required) - e.g., "https://example.com"
5. **Enter Label** (optional) - e.g., "Visit Website"
6. **Click "Create Call-to-Action"**

### Viewing CTAs:
1. **Open sidebar** (click 📋 button)
2. **Go to "Links" tab**
3. **See list of all CTAs** for the current document
4. **Click on a CTA** to navigate to its page

### CTA Behavior:
- **CTAs appear as clickable areas** on the PDF
- **Clicking a CTA** opens the URL in a new tab
- **CTAs are user-specific** (isolated per user)
- **CTAs persist** across browser sessions

## Visual Indicators (Development Mode)

When running in development mode, you'll see:
- **Red "CTA: SHOWING"** badge when CTA creator is open
- **Coordinates display** showing CTA placement position
- **Console logs** for CTA creation events

## Testing Steps

### 1. Basic CTA Creation:
```
1. Upload a PDF document
2. Hold Shift key and click anywhere on the PDF
3. Verify CTA creator modal appears (red debug indicator)
4. Enter URL: "https://google.com"
5. Enter Label: "Search Google"
6. Click "Create Call-to-Action"
7. Verify CTA is created and modal closes
```

### 2. CTA Navigation:
```
1. Create CTAs on different pages
2. Open sidebar → Links tab
3. Click on a CTA from a different page
4. Verify navigation to correct page
5. Verify sidebar closes on mobile
```

### 3. CTA Interaction:
```
1. Look for CTA visual indicators on PDF
2. Click on a CTA area
3. Verify URL opens in new tab
4. Verify original page remains open
```

## Console Logs to Check

When creating CTAs, look for these logs:
```
🔗 Setting up CTA creation (Shift+Click)
🔗 Creating CTA: {url: "...", label: "...", coordinates: {...}}
🔗 PDFViewerContainer handleCTACreate called
```

When clicking CTAs in sidebar:
```
🔗 CTA clicked: {ctaId: "...", pageNumber: X}
🔗 Navigating to page: X
```

## CTA Data Structure

CTAs are stored with:
```typescript
interface CallToAction {
  id: string;
  userId: string;
  documentId: string;
  pageNumber: number;
  url: string;           // Required - the link URL
  label: string;         // Optional - display text
  coordinates: {         // Rectangle coordinates
    x: number;
    y: number;
    width: number;       // Default: 100px
    height: number;      // Default: 30px
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile browsers**: Full support with touch events

## Limitations & Future Improvements

### Current Limitations:
1. **Fixed size CTAs** (100x30px) - no resize functionality
2. **No visual CTA editor** - coordinates are set by click position
3. **No CTA preview** before creation
4. **No bulk CTA operations**

### Planned Improvements:
1. **Resizable CTA areas** with drag handles
2. **Visual CTA placement** with preview
3. **CTA templates** for common link types
4. **CTA analytics** (click tracking)
5. **CTA validation** (broken link detection)

## Troubleshooting

### Issue: CTA Creator doesn't appear
**Solution**: Make sure you're holding Shift while clicking

### Issue: CTA creation fails
**Check**: Console logs for error messages
**Verify**: User is logged in and document is loaded

### Issue: CTAs don't appear on PDF
**Check**: CTAOverlay component is rendering
**Verify**: CTAs exist in the current document

### Issue: CTA links don't work
**Check**: URL format is valid (includes http:// or https://)
**Verify**: Browser allows popup windows

## Security Considerations

- **URL validation** prevents malicious links
- **External link warning** (opens in new tab)
- **User-specific isolation** prevents CTA sharing between users
- **No script execution** in CTA URLs