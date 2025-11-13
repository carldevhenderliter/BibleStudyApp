import { Button } from '@/components/ui/button';
import { Highlighter } from 'lucide-react';

type HighlightColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple';

interface HighlightToolbarProps {
  position: { x: number; y: number };
  onHighlight: (color: HighlightColor) => void;
  onClose: () => void;
}

const highlightColors: { color: HighlightColor; bg: string; label: string }[] = [
  { color: 'yellow', bg: 'bg-yellow-200', label: 'Yellow' },
  { color: 'blue', bg: 'bg-blue-200', label: 'Blue' },
  { color: 'green', bg: 'bg-green-200', label: 'Green' },
  { color: 'pink', bg: 'bg-pink-200', label: 'Pink' },
  { color: 'purple', bg: 'bg-purple-200', label: 'Purple' },
];

export function HighlightToolbar({ position, onHighlight, onClose }: HighlightToolbarProps) {
  return (
    <div
      className="fixed z-50 bg-popover border border-popover-border rounded-md shadow-lg p-2 flex gap-1"
      style={{ left: position.x, top: position.y - 60 }}
    >
      {highlightColors.map(({ color, bg, label }) => (
        <Button
          key={color}
          size="sm"
          variant="ghost"
          className={`w-8 h-8 p-0 ${bg} hover:${bg}`}
          onClick={() => {
            onHighlight(color);
            onClose();
          }}
          title={label}
          data-testid={`button-highlight-${color}`}
        >
          <Highlighter className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}
