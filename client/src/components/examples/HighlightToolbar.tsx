import { useState } from 'react';
import { HighlightToolbar } from '../HighlightToolbar';
import { Button } from '@/components/ui/button';

export default function HighlightToolbarExample() {
  const [showToolbar, setShowToolbar] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-semibold">Highlight Toolbar Example</h2>
      <p className="text-muted-foreground">Click the button to show the highlight color picker.</p>
      
      <Button onClick={() => setShowToolbar(!showToolbar)} data-testid="button-show-toolbar">
        {showToolbar ? 'Hide' : 'Show'} Toolbar
      </Button>

      {selectedColor && (
        <p className="text-sm">Selected color: <span className="font-semibold">{selectedColor}</span></p>
      )}

      {showToolbar && (
        <HighlightToolbar
          position={{ x: 100, y: 200 }}
          onHighlight={(color) => {
            setSelectedColor(color);
            console.log('Highlighted with color:', color);
          }}
          onClose={() => setShowToolbar(false)}
        />
      )}
    </div>
  );
}
