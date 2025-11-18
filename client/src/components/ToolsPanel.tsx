import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Languages, Hash, Type, BookOpen, Eye, StickyNote } from 'lucide-react';
import { Translation, translations } from '@/lib/bibleData';

interface ToolsPanelProps {
  showStrongsNumbers: boolean;
  showInterlinear: boolean;
  showNotes: boolean;
  fontSize: number;
  displayMode: 'verse' | 'book';
  selectedTranslation: Translation;
  hideEnglishInterlinear: boolean;
  onToggleStrongsNumbers: (value: boolean) => void;
  onToggleInterlinear: (value: boolean) => void;
  onToggleNotes: (value: boolean) => void;
  onToggleHideEnglishInterlinear: (value: boolean) => void;
  onFontSizeChange: (value: number) => void;
  onDisplayModeChange: (mode: 'verse' | 'book') => void;
  onTranslationChange: (translation: Translation) => void;
}

export function ToolsPanel({
  showStrongsNumbers,
  showInterlinear,
  showNotes,
  fontSize,
  displayMode,
  selectedTranslation,
  hideEnglishInterlinear,
  onToggleStrongsNumbers,
  onToggleInterlinear,
  onToggleNotes,
  onToggleHideEnglishInterlinear,
  onFontSizeChange,
  onDisplayModeChange,
  onTranslationChange,
}: ToolsPanelProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Settings2 className="h-4 w-4" />
        Reading Settings
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Translation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedTranslation}
            onValueChange={(value) => onTranslationChange(value as Translation)}
          >
            <SelectTrigger data-testid="select-translation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {translations.map((trans) => (
                <SelectItem
                  key={trans.id}
                  value={trans.id}
                  data-testid={`option-translation-${trans.id.toLowerCase()}`}
                >
                  {trans.name} - {trans.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Display Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="verse-mode" className="text-sm cursor-pointer">
              Verse-by-verse
            </Label>
            <Switch
              id="verse-mode"
              checked={displayMode === 'verse'}
              onCheckedChange={(checked) => onDisplayModeChange(checked ? 'verse' : 'book')}
              data-testid="switch-display-mode"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {displayMode === 'verse'
              ? 'Show verse numbers'
              : 'Read like a book (no verse numbers)'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Study Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="strongs-toggle"
              className="text-sm flex items-center gap-2 cursor-pointer"
            >
              Strong's Numbers
            </Label>
            <Switch
              id="strongs-toggle"
              checked={showStrongsNumbers}
              onCheckedChange={onToggleStrongsNumbers}
              data-testid="switch-strongs-numbers"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label
              htmlFor="interlinear-toggle"
              className="text-sm flex items-center gap-2 cursor-pointer"
            >
              <Languages className="h-4 w-4" />
              Interlinear
            </Label>
            <Switch
              id="interlinear-toggle"
              checked={showInterlinear}
              onCheckedChange={onToggleInterlinear}
              data-testid="switch-interlinear"
            />
          </div>

          {/* NEW: Hide English line in interlinear */}
          <div className="flex items-center justify-between">
            <Label
              htmlFor="hide-english-interlinear"
              className="text-sm flex items-center gap-2 cursor-pointer"
            >
              Hide English (Interlinear)
            </Label>
            <Switch
              id="hide-english-interlinear"
              checked={hideEnglishInterlinear}
              onCheckedChange={onToggleHideEnglishInterlinear}
              disabled={!showInterlinear}
              data-testid="switch-hide-english-interlinear"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label
              htmlFor="notes-toggle"
              className="text-sm flex items-center gap-2 cursor-pointer"
            >
              <StickyNote className="h-4 w-4" />
              Show Notes
            </Label>
            <Switch
              id="notes-toggle"
              checked={showNotes}
              onCheckedChange={onToggleNotes}
              data-testid="switch-show-notes"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Type className="h-4 w-4" />
            Font Size
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Slider
              value={[fontSize]}
              onValueChange={(values) => onFontSizeChange(values[0])}
              min={14}
              max={24}
              step={1}
              className="w-full"
              data-testid="slider-font-size"
            />
            <div className="text-xs text-muted-foreground text-center">
              {fontSize}px
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
