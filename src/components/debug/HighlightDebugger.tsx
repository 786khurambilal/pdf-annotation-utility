import React from 'react';
import { useAnnotations } from '../../contexts/AnnotationContext';
import { useUser } from '../../contexts/UserContext';

export const HighlightDebugger: React.FC = () => {
  const { annotations, currentDocumentId, createHighlight } = useAnnotations();
  const { currentUser } = useUser();

  const handleTestHighlight = async () => {
    if (!currentUser || !currentDocumentId) return;
    
    try {
      const testSelection = {
        text: 'Test highlight text',
        pageNumber: 1,
        startOffset: 0,
        endOffset: 18,
        coordinates: {
          x: 100,
          y: 100,
          width: 200,
          height: 20
        }
      };
      
      await createHighlight(testSelection, '#ffff00');
      console.log('Test highlight created');
    } catch (error) {
      console.error('Error creating test highlight:', error);
    }
  };

  if (!currentUser || !currentDocumentId) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: '10px', 
        right: '10px', 
        background: 'rgba(0,0,0,0.8)', 
        color: 'white', 
        padding: '10px', 
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 9999,
        maxWidth: '300px'
      }}>
        <h4>Debug Info</h4>
        <p>User: {currentUser?.name || 'None'}</p>
        <p>Document: {currentDocumentId || 'None'}</p>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px',
      maxHeight: '400px',
      overflow: 'auto'
    }}>
      <h4>Debug Info</h4>
      <p>User: {currentUser.name}</p>
      <p>Document: {currentDocumentId}</p>
      <p>Highlights: {annotations.highlights.length}</p>
      
      <button 
        onClick={handleTestHighlight}
        style={{
          padding: '4px 8px',
          fontSize: '10px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '2px',
          cursor: 'pointer',
          marginBottom: '8px'
        }}
      >
        Create Test Highlight
      </button>
      
      {annotations.highlights.length > 0 && (
        <div>
          <h5>Highlights:</h5>
          {annotations.highlights.map((highlight, index) => (
            <div key={highlight.id} style={{ marginBottom: '8px', fontSize: '10px' }}>
              <strong>#{index + 1}</strong>
              <br />
              Page: {highlight.pageNumber}
              <br />
              Text: {highlight.selectedText.substring(0, 30)}...
              <br />
              Coords: x={highlight.coordinates.x.toFixed(1)}, y={highlight.coordinates.y.toFixed(1)}, 
              w={highlight.coordinates.width.toFixed(1)}, h={highlight.coordinates.height.toFixed(1)}
              <br />
              Color: {highlight.color}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};