import { useState } from 'react';
import { BibleReader } from '../BibleReader';
import { ToolsPanel } from '../ToolsPanel';
import { Translation } from '@/lib/bibleData';

export default function BibleReaderExample() {
  const [showStrongsNumbers, setShowStrongsNumbers] = useState(false);
  const [showInterlinear, setShowInterlinear] = useState(false);
  const [showStrongsEnglishOnly, setShowStrongsEnglishOnly] = useState(false);
  const [hideAllEnglish, setHideAllEnglish] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState<"serif" | "sans" | "mono" | "gentium">("serif");
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
          showStrongsEnglishOnly={showStrongsEnglishOnly}
          hideAllEnglish={hideAllEnglish}
          showNotes={showNotes}
          fontSize={fontSize}
          fontFamily={fontFamily}
          displayMode={displayMode}
          selectedTranslation={selectedTranslation}
        />
      </div>
      <div className="w-80 border-l">
        <ToolsPanel
          showStrongsNumbers={showStrongsNumbers}
          showInterlinear={showInterlinear}
          showStrongsEnglishOnly={showStrongsEnglishOnly}
          hideAllEnglish={hideAllEnglish}
          showNotes={showNotes}
          fontSize={fontSize}
          fontFamily={fontFamily}
          displayMode={displayMode}
          selectedTranslation={selectedTranslation}
          onToggleStrongsNumbers={setShowStrongsNumbers}
          onToggleInterlinear={setShowInterlinear}
          onToggleStrongsEnglishOnly={setShowStrongsEnglishOnly}
          onToggleHideAllEnglish={setHideAllEnglish}
          onToggleNotes={setShowNotes}
          onFontSizeChange={setFontSize}
          onFontFamilyChange={setFontFamily}
          onDisplayModeChange={setDisplayMode}
          onTranslationChange={setSelectedTranslation}
        />
      </div>
    </div>
  );
}
