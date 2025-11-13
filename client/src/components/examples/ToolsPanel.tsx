import { useState } from 'react';
import { ToolsPanel } from '../ToolsPanel';
import { Translation } from '@/lib/bibleData';

export default function ToolsPanelExample() {
  const [showStrongsNumbers, setShowStrongsNumbers] = useState(false);
  const [showInterlinear, setShowInterlinear] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [displayMode, setDisplayMode] = useState<'verse' | 'book'>('verse');
  const [selectedTranslation, setSelectedTranslation] = useState<Translation>('KJV');

  return (
    <div className="p-8 max-w-md">
      <h2 className="text-2xl font-semibold mb-4">Tools Panel Example</h2>
      <ToolsPanel
        showStrongsNumbers={showStrongsNumbers}
        showInterlinear={showInterlinear}
        showNotes={showNotes}
        fontSize={fontSize}
        displayMode={displayMode}
        selectedTranslation={selectedTranslation}
        onToggleStrongsNumbers={setShowStrongsNumbers}
        onToggleInterlinear={setShowInterlinear}
        onToggleNotes={setShowNotes}
        onFontSizeChange={setFontSize}
        onDisplayModeChange={setDisplayMode}
        onTranslationChange={setSelectedTranslation}
      />
      
      <div className="mt-6 p-4 bg-card rounded-md">
        <p className="text-sm text-muted-foreground mb-2">Current settings:</p>
        <ul className="text-sm space-y-1">
          <li>Translation: {selectedTranslation}</li>
          <li>Display Mode: {displayMode}</li>
          <li>Strong's Numbers: {showStrongsNumbers ? 'On' : 'Off'}</li>
          <li>Interlinear: {showInterlinear ? 'On' : 'Off'}</li>
          <li>Show Notes: {showNotes ? 'On' : 'Off'}</li>
          <li>Font Size: {fontSize}px</li>
        </ul>
      </div>
    </div>
  );
}
