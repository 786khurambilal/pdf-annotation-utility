# CTA Debug Guide

## Current Issue
Call-to-Action (CTA) functionality is not working - the sidebar shows "No call-to-actions created yet" even after attempting to create CTAs.

## Debug Steps to Follow

### 1. Test Manual CTA Creation
1. **Look for the red "Test CTA" button** in the debug panel (development mode)
2. **Click the "Test CTA" button**
3. **Check console logs** for:
   ```
   🧪 Manual test: Creating CTA
   🔗 PDFViewerContainer handleCTACreate called
   ```
4. **Check if CTA appears** in the sidebar Links tab

### 2. Test Shift+Click CTA Creation
1. **Upload a PDF document**
2. **Hold Shift key and click** anywhere on the PDF
3. **Check console logs** for:
   ```
   💬 handleAreaClick triggered
   🔍 Checking event keys: {shiftKey: true, ...}
   🔗 Setting up CTA creation (Shift+Click)
   ```
4. **Look for red "CTA: SHOWING" indicator**
5. **Verify CTA creator modal appears**

### 3. Test Ctrl+Select CTA Creation
1. **Hold Ctrl (or Cmd on Mac) while selecting text**
2. **Check console logs** for:
   ```
   🖍️ Text selected for highlighting/CTA
   🔗 Creating CTA from text selection (Ctrl/Cmd+Select)
   ```
3. **Look for red "CTA: SHOWING" indicator**

### 4. Check CTA Creation Flow
If CTA creator modal appears:
1. **Enter URL**: `https://google.com`
2. **Enter Label**: `Test Link`
3. **Click "Create Call-to-Action"**
4. **Check console logs** for:
   ```
   🔗 PdfDisplay: Creating CTA: {url: "...", label: "...", ...}
   🔗 PDFViewerContainer handleCTACreate called
   ```

## Expected Console Log Flow

### Successful CTA Creation:
```
1. 💬 handleAreaClick triggered (for Shift+Click)
2. 🔍 Checking event keys: {shiftKey: true}
3. 🔗 Setting up CTA creation (Shift+Click)
4. 🔗 PdfDisplay: Creating CTA: {url: "...", hasOnCTACreate: true}
5. 🔗 PDFViewerContainer handleCTACreate called
6. (Annotation context logs)
```

### Failed CTA Creation:
```
1. 💬 handleAreaClick triggered
2. 🔍 Checking event keys: {shiftKey: false}
3. 💬 Setting up comment creation (no Shift key)
```

## Visual Debug Indicators

### Development Mode Indicators:
- **Green/Blue "MOBILE/DESKTOP"**: Device detection
- **Orange/Gray "SIDEBAR: OPEN/CLOSED"**: Sidebar state
- **Blue "PAGE: X/Y"**: Current page number
- **Purple/Gray "HIGHLIGHT: SHOWING/HIDDEN"**: Highlight creator state
- **Red/Gray "CTA: SHOWING/HIDDEN"**: CTA creator state

### CTA Creator Modal:
- **Modal title**: "Create Call-to-Action"
- **URL field**: Required input
- **Label field**: Optional input
- **Create button**: "Create Call-to-Action"

## Common Issues & Solutions

### Issue 1: Shift+Click Not Detected
**Symptoms**: Console shows `shiftKey: false` even when holding Shift
**Solutions**:
- Try holding Shift before clicking (not during click)
- Check if browser/OS is intercepting Shift+Click
- Try on different browsers

### Issue 2: CTA Creator Modal Not Appearing
**Symptoms**: Console shows CTA setup but no modal
**Check**:
- Red "CTA: SHOWING" indicator should appear
- Check if modal is behind other elements (z-index issue)
- Verify `showCTACreator` state is true

### Issue 3: CTA Creation Fails
**Symptoms**: Modal appears but CTA not created
**Check**:
- Console logs for `hasOnCTACreate: true`
- User authentication status
- Document ID availability
- Annotation context errors

### Issue 4: CTAs Not Visible in Sidebar
**Symptoms**: CTAs created but not showing in Links tab
**Check**:
- Current document ID matches CTA document ID
- User ID matches CTA user ID
- Annotation context state
- Local storage data

## Manual Testing Commands

### Test in Browser Console:

```javascript
// Check current state
console.log('PDF State:', window.pdfState);
console.log('Current User:', window.currentUser);
console.log('Annotations:', window.annotations);

// Test CTA creation directly
if (window.createCallToAction) {
  window.createCallToAction(1, 'https://test.com', 'Test', {x: 100, y: 100, width: 100, height: 30});
}

// Check local storage
console.log('Local Storage:', localStorage.getItem('ebook-utility-annotations'));
```

## Browser Compatibility

### Known Working:
- Chrome 80+ (desktop/mobile)
- Firefox 75+ (desktop/mobile)
- Safari 13+ (desktop/mobile)
- Edge 80+ (desktop)

### Potential Issues:
- **Safari**: May not detect Shift+Click properly
- **Mobile browsers**: Touch events may not include shiftKey
- **Firefox**: Different event handling for modifier keys

## Next Steps Based on Results

### If Manual Test Button Works:
- Issue is with user interaction detection
- Focus on Shift+Click event handling
- Check modifier key detection

### If Manual Test Button Fails:
- Issue is with CTA creation pipeline
- Check annotation context
- Verify user authentication
- Check document state

### If Modal Appears But Creation Fails:
- Issue is with form submission
- Check CTA creation handler
- Verify data validation
- Check network/storage errors

### If Nothing Works:
- Check for JavaScript errors
- Verify all imports are correct
- Check component mounting
- Verify context providers are working