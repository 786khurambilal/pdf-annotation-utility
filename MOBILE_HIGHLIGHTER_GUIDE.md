# How to Open Highlighter in Mobile Responsive View

## Step-by-Step Instructions

### 1. **Access Mobile View**
- **Option A**: Resize your browser window to mobile width (less than 768px)
- **Option B**: Use browser developer tools:
  - Press `F12` or right-click → "Inspect"
  - Click the device toggle icon (📱) in dev tools
  - Select a mobile device preset (iPhone, Android, etc.)
- **Option C**: Use an actual mobile device

### 2. **Load a PDF Document**
- Click the upload area or drag a PDF file
- Wait for the PDF to load completely
- You should see the PDF pages displayed

### 3. **Select Text to Highlight**
This is the key step that opens the highlighter:

#### **Method 1: Press and Hold (Recommended for Mobile)**
1. **Press and hold** your finger on any text in the PDF
2. **Drag** to select the text you want to highlight
3. **Release** your finger when you've selected the desired text
4. The highlighter modal should appear automatically

#### **Method 2: Double-tap and Drag**
1. **Double-tap** on a word to start selection
2. **Drag** the selection handles to expand the selection
3. The highlighter should appear when selection is complete

### 4. **Using the Highlighter Modal**
Once the highlighter appears:
1. Choose a color from the available options (Yellow, Green, Blue, Pink, Orange, Purple)
2. Click "Create Highlight" to save
3. Or click "Cancel" to dismiss without highlighting

## Visual Indicators (Development Mode)

When running in development mode, you'll see debug indicators:
- **Green "MOBILE"** badge: Confirms you're in mobile mode
- **Purple "HIGHLIGHT: SHOWING"** badge: Confirms highlighter is open
- **Console logs**: Check browser console for detailed selection info

## Troubleshooting

### **Problem**: Text selection doesn't work
**Solutions**:
1. Make sure you're pressing and holding (not just tapping)
2. Try selecting text in the middle of a paragraph (not at edges)
3. Ensure the PDF has loaded completely
4. Check that you're not accidentally triggering zoom gestures

### **Problem**: Highlighter modal doesn't appear
**Solutions**:
1. Check console logs for text selection events
2. Make sure you've selected actual text (not empty space)
3. Try selecting a longer piece of text (at least a few words)
4. Ensure you're not in the middle of a zoom or scroll gesture

### **Problem**: Double-tap zooms instead of selecting
**Solutions**:
1. Use press-and-hold method instead
2. Wait a moment between taps if double-tapping
3. Try selecting text that's already visible without zooming

## Mobile-Specific Tips

### **iOS Safari**:
- Use a firm press-and-hold gesture
- The text selection handles should appear
- Drag the handles to adjust selection

### **Android Chrome**:
- Press and hold until selection starts
- Use the selection handles to fine-tune
- The highlighter should appear automatically

### **Mobile Firefox**:
- Similar to Chrome, press and hold
- May need slightly longer hold time
- Selection highlight should be visible

## Alternative Methods

### **Using the Sidebar**:
1. Tap the "📋" or "Show Annotations" button to open sidebar
2. Navigate to the "Highlights" tab
3. This shows existing highlights but doesn't create new ones

### **Desktop Mode Fallback**:
If mobile highlighting isn't working:
1. Switch to desktop view temporarily
2. Create highlights using mouse selection
3. Switch back to mobile view to see the highlights

## Expected Behavior Flow

```
1. Press and hold text → 
2. Drag to select → 
3. Release finger → 
4. Highlighter modal appears → 
5. Choose color → 
6. Click "Create Highlight" → 
7. Highlight is saved and visible
```

## Debug Information

### Console Logs to Look For:
```
📝 Touch start - setting selecting to true
📝 Text selection change: {hasSelection: true, selectedText: "your text"}
🖍️ Text selected for highlighting: {text: "your text", pageNumber: 1}
```

### Visual Debug Indicators:
- Mobile detection badge should show "MOBILE"
- Highlight status should change to "SHOWING" when modal appears
- Selected text should be displayed in the debug info

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| No text selection | Touch gestures disabled | Check CSS `user-select` and `touch-action` |
| Selection clears immediately | Event conflicts | Increase touch delay in useTextSelection |
| Modal doesn't appear | Selection not detected | Check handleTextSelected callback |
| Zoom interferes | Double-tap conflicts | Use press-and-hold instead |

## Browser Compatibility

- ✅ **iOS Safari 13+**: Full support with webkit prefixes
- ✅ **Android Chrome 80+**: Full support
- ✅ **Mobile Firefox 75+**: Full support with moz prefixes
- ⚠️ **Older browsers**: May have limited text selection support

## Performance Notes

- Text selection uses debounced processing (300ms delay)
- Touch events use passive listeners for better performance
- Selection coordinates are calculated relative to PDF scale