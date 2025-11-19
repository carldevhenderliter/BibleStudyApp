import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings2,
  Languages,
  Hash,
  Type,
  BookOpen,
  Eye,
  StickyNote,
  EyeOff,
} from "lucide-react";
import { Translation, translations } from "@/lib/bibleData";

interface ToolsPanelProps {
  showStrongsNumbers: boolean;
  showInterlinear: boolean;
  showStrongsEnglishOnly: boolean;
  hideAllEnglish: boolean;
  showNotes: boolean;
  fontSize: number;
  fontFamily: "serif" | "sans" | "mono" | "gentium";
  displayMode: "verse" | "book";
  selectedTranslation: Translation;
  onToggleStrongsNumbers: (value: boolean) => void;
  onToggleInterlinear: (value: boolean) => void;
  onToggleStrongsEnglishOnly: (value: boolean) => void;
  onToggleHideAllEnglish: (value: boolean) => void;
  onToggleNotes: (value: boolean) => void;
  onFontSizeChange: (value: number) => void;
  onFontFamilyChange: (value: "serif" | "sans" | "mono" | "gentium") => void;
  onDisplayModeChange: (mode: "verse" | "book") => void;
  onTranslationChange: (translation: Translation) => void;
}

export function ToolsPanel({
  showStrongsNumbers,
  showInterlinear,
  showStrongsEnglishOnly,
  hideAllEnglish,
  showNotes,
  fontSize,
  fontFamily,
  displayMode,
  selectedTranslation,
  onToggleStrongsNumbers,
  onToggleInterlinear,
  onToggleStrongsEnglishOnly,
  onToggleHideAllEnglish,
  onToggleNotes,
  onFontSizeChange,
  onFontFamilyChange,
  onDisplayModeChange,
  onTranslationChange,
}: ToolsPanelProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Settings2 className="h-4 w-4" />
        Reading Settings
      </div>

      {/* Translation */}
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

      {/* Display mode */}
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
              checked={displayMode === "verse"}
              onCheckedChange={(checked) =>
                onDisplayModeChange(checked ? "verse" : "book")
              }
              data-testid="switch-display-mode"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {displayMode === "verse"
              ? "Show verse numbers"
              : "Read like a book (no verse numbers)"}
          </p>
        </CardContent>
      </Card>

      {/* Study tools */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Study Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strong's numbers */}
          <div className="flex items-center justify-between">
            <Label
              htmlFor="strongs-toggle"
              className="text-sm flex items-center gap-2 cursor-pointer"
            >
              Strong&apos;s Numbers
            </Label>
            <Switch
              id="strongs-toggle"
              checked={showStrongsNumbers}
              onCheckedChange={onToggleStrongsNumbers}
              data-testid="switch-strongs-numbers"
            />
          </div>

          {/* Interlinear */}
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

          {/* Strong's English only */}
          <div className="flex items-center justify-between">
            <Label
              htmlFor="strongs-english-only-toggle"
              className="text-sm flex items-center gap-2 cursor-pointer"
            >
              Strong&apos;s only (hide non-Strong&apos;s English)
            </Label>
            <Switch
              id="strongs-english-only-toggle"
              checked={showStrongsEnglishOnly}
              onCheckedChange={onToggleStrongsEnglishOnly}
            />
          </div>

          {/* Hide all English */}
          <div className="flex items-center justify-between">
            <Label
              htmlFor="hide-all-english-toggle"
              className="text-sm flex items-center gap-2 cursor-pointer"
            >
              <EyeOff className="h-4 w-4" />
              Hide all English (Strong&apos;s only)
            </Label>
            <Switch
              id="hide-all-english-toggle"
              checked={hideAllEnglish}
              onCheckedChange={onToggleHideAllEnglish}
            />
          </div>

          {/* Notes */}
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

      {/* Font size */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Type className="h-4 w-4" />
            Fonts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
            <Select
              value={fontFamily}
              onValueChange={(value) =>
                onFontFamilyChange(value as "serif" | "sans" | "mono" | "gentium")
              }
            >
              <SelectTrigger data-testid="select-font-family">
                <SelectValue placeholder="Choose font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="serif">Crimson Pro (Serif)</SelectItem>
                <SelectItem value="gentium">Gentium Book (Serif)</SelectItem>
                <SelectItem value="sans">Inter (Sans)</SelectItem>
                <SelectItem value="mono">JetBrains Mono</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
