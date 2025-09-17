import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getMobileSelectionInfo, debugTextSelection, testTextSelection, hasKnownTextSelectionIssues, manuallySelectText } from '../../utils/mobileTextSelection';
import { useResponsive } from '../../hooks/useResponsive';

const DebugContainer = styled.div`
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 5px;
  font-size: 12px;
  max-width: 300px;
  z-index: 10000;
  
  @media (max-width: 768px) {
    top: 5px;
    right: 5px;
    font-size: 10px;
    padding: 5px;
    max-width: 200px;
  }
`;

const DebugSection = styled.div`
  margin-bottom: 8px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
`;

const DebugTitle = styled.div`
  font-weight: bold;
  margin-bottom: 3px;
  color: #4CAF50;
`;

const DebugButton = styled.button`
  background: #2196F3;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 10px;
  margin: 2px;
  cursor: pointer;
  
  &:hover {
    background: #1976D2;
  }
`;

const StatusIndicator = styled.span<{ status: 'good' | 'warning' | 'error' }>`
  color: ${props => 
    props.status === 'good' ? '#4CAF50' :
    props.status === 'warning' ? '#FF9800' : '#F44336'
  };
  font-weight: bold;
`;

interface MobileTextSelectionDebugProps {
  visible?: boolean;
}

export const MobileTextSelectionDebug: React.FC<MobileTextSelectionDebugProps> = ({ 
  visible = process.env.NODE_ENV === 'development' 
}) => {
  const [selectionInfo, setSelectionInfo] = useState(getMobileSelectionInfo());
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({});
  const responsive = useResponsive();

  useEffect(() => {
    const updateSelectionInfo = () => {
      setSelectionInfo(getMobileSelectionInfo());
    };

    // Update selection info when selection changes
    document.addEventListener('selectionchange', updateSelectionInfo);
    
    // Also update periodically
    const interval = setInterval(updateSelectionInfo, 1000);

    return () => {
      document.removeEventListener('selectionchange', updateSelectionInfo);
      clearInterval(interval);
    };
  }, []);

  const runTextSelectionTest = () => {
    const textLayers = document.querySelectorAll('.react-pdf__Page__textContent, .textLayer');
    const results: { [key: string]: boolean } = {};
    
    textLayers.forEach((layer, index) => {
      if (layer instanceof HTMLElement) {
        results[`layer-${index}`] = testTextSelection(layer);
      }
    });
    
    setTestResults(results);
    debugTextSelection('Manual Test');
  };

  const runManualSelection = () => {
    const textLayers = document.querySelectorAll('.react-pdf__Page__textContent, .textLayer');
    if (textLayers.length > 0) {
      const firstLayer = textLayers[0] as HTMLElement;
      const success = manuallySelectText(firstLayer, 0, 20);
      console.log('📱 Manual selection result:', success);
      
      // Update test results
      setTestResults(prev => ({
        ...prev,
        'manual-selection': success
      }));
    }
  };

  const testCustomSelection = () => {
    // Simulate a long press and drag
    const textLayers = document.querySelectorAll('.react-pdf__Page__textContent');
    if (textLayers.length > 0) {
      const layer = textLayers[0] as HTMLElement;
      const rect = layer.getBoundingClientRect();
      
      // Create touch events
      const touchStart = new TouchEvent('touchstart', {
        touches: [new Touch({
          identifier: 0,
          target: layer,
          clientX: rect.left + 50,
          clientY: rect.top + 50
        })]
      });
      
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [new Touch({
          identifier: 0,
          target: layer,
          clientX: rect.left + 150,
          clientY: rect.top + 50
        })]
      });
      
      layer.dispatchEvent(touchStart);
      
      setTimeout(() => {
        layer.dispatchEvent(touchEnd);
      }, 600); // Simulate long press
      
      console.log('📱 Simulated custom touch selection');
    }
  };

  const issues = hasKnownTextSelectionIssues();

  if (!visible) return null;

  return (
    <DebugContainer>
      <DebugSection>
        <DebugTitle>Mobile Detection</DebugTitle>
        <div>Mobile: <StatusIndicator status={responsive.isMobile ? 'good' : 'warning'}>
          {responsive.isMobile ? 'YES' : 'NO'}
        </StatusIndicator></div>
        <div>Touch: <StatusIndicator status={selectionInfo.touchSupport ? 'good' : 'warning'}>
          {selectionInfo.touchSupport ? 'YES' : 'NO'}
        </StatusIndicator></div>
      </DebugSection>

      <DebugSection>
        <DebugTitle>Text Selection</DebugTitle>
        <div>Has Selection: <StatusIndicator status={selectionInfo.hasSelection ? 'good' : 'warning'}>
          {selectionInfo.hasSelection ? 'YES' : 'NO'}
        </StatusIndicator></div>
        <div>Selected Text: {selectionInfo.selectedText.substring(0, 20)}{selectionInfo.selectedText.length > 20 ? '...' : ''}</div>
        <div>Range Count: {selectionInfo.rangeCount}</div>
      </DebugSection>

      <DebugSection>
        <DebugTitle>PDF Text Layers</DebugTitle>
        <div>Layers: {document.querySelectorAll('.react-pdf__Page__textContent, .textLayer').length}</div>
        {Object.entries(testResults).map(([key, result]) => (
          <div key={key}>
            {key}: <StatusIndicator status={result ? 'good' : 'error'}>
              {result ? 'PASS' : 'FAIL'}
            </StatusIndicator>
          </div>
        ))}
      </DebugSection>

      {issues.hasIssues && (
        <DebugSection>
          <DebugTitle>Known Issues</DebugTitle>
          {issues.issues.map((issue, index) => (
            <div key={index} style={{ fontSize: '10px', color: '#FF9800' }}>
              • {issue}
            </div>
          ))}
        </DebugSection>
      )}

      <DebugSection>
        <DebugButton onClick={runTextSelectionTest}>
          Test Selection
        </DebugButton>
        <DebugButton onClick={runManualSelection}>
          Manual Select
        </DebugButton>
        <DebugButton onClick={testCustomSelection}>
          Custom Touch
        </DebugButton>
        <DebugButton onClick={() => debugTextSelection('Manual Debug')}>
          Debug Console
        </DebugButton>
      </DebugSection>
    </DebugContainer>
  );
};