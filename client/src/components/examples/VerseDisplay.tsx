import { useEffect, useState } from 'react';
import { VerseDisplay } from '../VerseDisplay';
import { BibleVerseWithTokens, getVersesByChapter } from '@/lib/bibleData';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function VerseDisplayExample() {
  const [showStrongsNumbers, setShowStrongsNumbers] = useState(false);
  const [showInterlinear, setShowInterlinear] = useState(false);
  const [showStrongsEnglishOnly, setShowStrongsEnglishOnly] = useState(false);
  const [hideAllEnglish, setHideAllEnglish] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [fontSize, setFontSize] = useState(17);
  const [fontFamily, setFontFamily] = useState<"serif" | "sans" | "mono" | "gentium">("serif");
  const [displayMode, setDisplayMode] = useState<'verse' | 'book'>('verse');
  const [verses, setVerses] = useState<BibleVerseWithTokens[]>([]);

  useEffect(() => {
    getVersesByChapter('John', 1, 'KJV').then((list) => {
      setVerses(list as BibleVerseWithTokens[]);
    });
  }, []);

  const verse = verses[0];
  const showWordByWord =
    !!(verse?.tokens && verse.tokens.length) &&
    (showStrongsNumbers ||
      showInterlinear ||
      showStrongsEnglishOnly ||
      hideAllEnglish);

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <h2 className="text-2xl font-semibold">Verse Display Example</h2>
      
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="strongs"
            checked={showStrongsNumbers}
            onCheckedChange={setShowStrongsNumbers}
            data-testid="switch-strongs"
          />
          <Label htmlFor="strongs">Strong's Numbers</Label>
        </div>
        
        <div className="flex items-center gap-2">
          <Switch
            id="interlinear"
            checked={showInterlinear}
            onCheckedChange={setShowInterlinear}
            data-testid="switch-interlinear"
          />
          <Label htmlFor="interlinear">Interlinear</Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="strongs-english-only"
            checked={showStrongsEnglishOnly}
            onCheckedChange={setShowStrongsEnglishOnly}
            data-testid="switch-strongs-english-only"
          />
          <Label htmlFor="strongs-english-only">Strong's English Only</Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="hide-all-english"
            checked={hideAllEnglish}
            onCheckedChange={setHideAllEnglish}
          />
          <Label htmlFor="hide-all-english">Hide All English</Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="show-notes"
            checked={showNotes}
            onCheckedChange={setShowNotes}
            data-testid="switch-show-notes"
          />
          <Label htmlFor="show-notes">Show Notes</Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="display-mode"
            checked={displayMode === 'book'}
            onCheckedChange={(checked) => setDisplayMode(checked ? 'book' : 'verse')}
            data-testid="switch-display-mode"
          />
          <Label htmlFor="display-mode">Book Mode</Label>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-48">
          <p className="text-xs text-muted-foreground">Font size</p>
          <Slider
            value={[fontSize]}
            onValueChange={(vals) => setFontSize(vals[0])}
            min={14}
            max={24}
          />
          <div className="text-xs mt-1 text-muted-foreground">{fontSize}px</div>
        </div>
        <div className="w-56">
          <p className="text-xs text-muted-foreground mb-1">Font family</p>
          <Select
            value={fontFamily}
            onValueChange={(value) => setFontFamily(value as "serif" | "sans" | "mono" | "gentium")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="serif">Crimson Pro (Serif)</SelectItem>
              <SelectItem value="gentium">Gentium Book (Serif)</SelectItem>
              <SelectItem value="sans">Inter (Sans)</SelectItem>
              <SelectItem value="mono">JetBrains Mono</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md p-4 bg-card">
        {verse && (
          <VerseDisplay
            verse={verse}
            wordHighlights={[]}
            showStrongsNumbers={showStrongsNumbers}
            showInterlinear={showInterlinear}
            showStrongsEnglishOnly={showStrongsEnglishOnly}
            hideAllEnglish={hideAllEnglish}
            showNotes={showNotes}
            displayMode={displayMode}
            showWordByWord={showWordByWord}
            fontSize={fontSize}
            fontFamily={fontFamily}
            onAddNote={() => console.log('Add note clicked')}
            onAddWordNote={(wordIndex, wordText) => console.log('Add word note:', wordIndex, wordText)}
            onSaveWordNote={() => {}}
            onCancelWordNote={() => {}}
            onHighlightWord={(wordIndex, wordText, color) =>
              console.log('Highlight word:', wordIndex, wordText, color)
            }
            onTextSelect={(text) => console.log('Selected text:', text)}
            wordNotes={[]}
            onStrongClick={(strongNumber) =>
              console.log('Strong number clicked:', strongNumber)
            }
            highlight={undefined}
            activeWordNote={null}
            activeStrongNumber={undefined}
          />
        )}
      </div>
    </div>
  );
}
