import { useState } from 'react';
import { VerseDisplay } from '../VerseDisplay';
import { getVersesByChapter } from '@/lib/bibleData';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function VerseDisplayExample() {
  const [showStrongsNumbers, setShowStrongsNumbers] = useState(false);
  const [showInterlinear, setShowInterlinear] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [displayMode, setDisplayMode] = useState<'verse' | 'book'>('verse');
  const verses = getVersesByChapter('John', 1, 'KJV');
  const verse = verses[0];

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

      <div className="border rounded-md p-4 bg-card">
        {verse && (
          <VerseDisplay
            verse={verse}
            showStrongsNumbers={showStrongsNumbers}
            showInterlinear={showInterlinear}
            showNotes={showNotes}
            displayMode={displayMode}
            onAddNote={() => console.log('Add note clicked')}
            onAddWordNote={(wordIndex, wordText) => console.log('Add word note:', wordIndex, wordText)}
            onTextSelect={(text) => console.log('Selected text:', text)}
            wordNotes={[]}
          />
        )}
      </div>
    </div>
  );
}
