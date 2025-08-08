# Mobile Highlighting Fixes

## Problem
Text highlighting was not working properly in responsive/mobile mode but worked fine in desktop/web view. Users couldn't select text or create highlights on mobile devices.

## Root Causes Identified

1. **Touch Action CSS Conflicts**: `touch-action: manipulation` was too restrictive and interfered with text selection
2. **Aggressive Touch Gesture Handling**: Double-tap and pinch gesture handlers were preventing text selection
3. **Mobile Browser Text Selection Differences**: Mobile browsers handle text selection differently than desktop
4. **Event Handler Conflicts**: Touch gesture handlers conflicted with text selection handlers

## Fixes Applied

### 1. CSS Touch Action Improvements
**File**: `src/components/pdf/PdfDisplay.tsx`

```css
/* Changed from: touch-action: manipulation; */
touch-action: pan-x pan-y pinch-zoom;

/* Added mobile-specific text selection improvements */
@media (max-width: ${theme.breakpoints.tablet}) {
  /* Better text selection on mobile */
  -webkit-touch-callout: default;
  -webkit-user-select: text;
  -khtml-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
  
  /* Ensure text is selectable on mobile Safari */
  -webkit-tap-highlight-color: transparent;
  
  /* More prominent selection highlight */
  ::selection {
    background-color: rgba(0, 123, 255, 0.6);
  }
}
```

### 2. Improved Touch Gesture Handling
**File**: `src/components/pdf/PdfDisplay.tsx`

- Made double-tap detection less aggressive
- Only prevent text selection when there's no active text selection
- Improved pinch-to-zoom to not interfere with single-touch text selection

```typescript
// Only handle double tap zoom if there's no active text selection
if (currentTime - lastTouchTime < 300) {
  const selection = window.getSelection();
  const hasTextSelection = selection && !selection.isCollapsed;
  
  // Only handle double tap zoom if there's no active text selection
  if (!hasTextSelection) {
    // Handle zoom...
    event.preventDefault();
  }
}
```

### 3. Enhanced Text Selection Hook
**File**: `src/hooks/useTextSelection.ts`

- Added comprehensive debugging logs
- Increased touch end delay from 100ms to 200ms for better mobile support
- Added passive event listeners for better mobile performance
- Improved touch event handling to be more mobile-friendly

### 4. Debug Indicators Added
- Visual indicator showing if highlight creator is visible
- Console logs for text selection events
- Mobile/desktop detection indicator

## Testing Steps

### Mobile Testing:
1. Open app on mobile device or resize browser to mobile width (< 768px)
2. Upload a PDF document
3. Try to select text by pressing and holding
4. Verify that:
   - Text selection highlight appears
   - Highlight creator modal shows up
   - You can choose colors and create highlights

### Debug Information:
Check browser console for logs like:
```
📝 Text selection change: {hasSelection: true, selectedText: "sample text", ...}
📝 Touch start - setting selecting to true
📝 Touch end - checking selection after delay
🖍️ Text selected for highlighting: {text: "sample text", ...}
```

Visual indicators show:
- Purple "HIGHLIGHT: SHOWING" when highlight creator is visible
- Green "MOBILE" badge on mobile devices

## Mobile-Specific Considerations

1. **Text Selection Timing**: Mobile devices need longer delays (200ms) for text selection to complete
2. **Touch Events**: Use passive listeners where possible for better performance
3. **CSS Properties**: Mobile Safari requires specific webkit prefixes for text selection
4. **Gesture Conflicts**: Carefully handle conflicts between text selection and zoom gestures

## Common Mobile Issues & Solutions

### Issue: Text selection doesn't work on iOS Safari
**Solution**: Added `-webkit-touch-callout: default` and `-webkit-tap-highlight-color: transparent`

### Issue: Double-tap zoom interferes with text selection
**Solution**: Check for active text selection before handling double-tap zoom

### Issue: Pinch gesture prevents text selection
**Solution**: Only prevent default for multi-touch gestures, allow single-touch text selection

### Issue: Text selection is too faint on mobile
**Solution**: Increased selection highlight opacity to 0.6 for better visibility

## Browser Compatibility

- **iOS Safari**: Requires webkit-specific CSS properties
- **Android Chrome**: Works with standard CSS properties
- **Mobile Firefox**: Requires moz-specific prefixes
- **Desktop browsers**: Unchanged behavior, all fixes are mobile-specific

## Performance Considerations

- Used passive event listeners for touch events
- Debounced text selection processing (300ms default)
- Avoided unnecessary DOM queries in touch handlers