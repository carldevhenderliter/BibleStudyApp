import { useState } from 'react';
import { BibleReader } from '../BibleReader';
import { ToolsPanel } from '../ToolsPanel';
import { Translation } from '@/lib/bibleData';

export default function BibleReaderExample() {
  const [showStrongsNumbers, setShowStrongsNumbers] = useState(false);
  const [showInterlinear, setShowInterlinear] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [displayMode, setDisplayMode] = useState<'verse' | 'book'>('verse');
  const [selectedTranslation, setSelectedTranslation] = useState<Translation>('KJV');

  return (
    <div className="flex h-screen">
      <div className="flex-1">
        <BibleReader
          book="John"
          chapter={1}
          showStrongsNumbers={showStrongsNumbers}
          showInterlinear={showInterlinear}
          showNotes={showNotes}
          fontSize={fontSize}
          displayMode={displayMode}
          selectedTranslation={selectedTranslation}
        />
      </div>
      <div className="w-80 border-l">
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
      </div>
    </div>
  );
}
