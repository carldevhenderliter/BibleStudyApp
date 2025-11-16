import { useEffect, useState } from "react";
import { Note } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Trash2, Palette, Link2, List, AlignLeft } from "lucide-react";

type NoteTheme = "yellow" | "blue" | "green" | "purple" | "pink" | "gray";

type NoteSaveOptions = {
  range?: { startVerse: number; endVerse: number };
  theme?: NoteTheme;
  crossReferences?: string;
};

/**
 * We extend Note at runtime with optional range + theme + crossRef fields.
 * This matches what BibleReader is storing in localStorage.
 */
type RangeNote = Note & {
  startVerse?: number;
  endVerse?: number;
  noteTheme?: NoteTheme;
  crossReferences?: string;
};

interface NoteEditorProps {
  note?: RangeNote;
  verseId: string;
  verseReference: string;
  wordText?: string;
  /**
   * If true, allow choosing a verse range for this note.
   * For word notes we pass false so it only applies to that single verse.
   */
  enableRange?: boolean;
  onSave: (content: string, options?: NoteSaveOptions) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function NoteEditor({
  note,
  verseId,
  verseReference,
  wordText,
  enableRange = true,
  onSave,
  onDelete,
  onCancel,
}: NoteEditorProps) {
  const [content, setContent] = useState(note?.content ?? "");

  // scope: this verse only vs range of verses within the same chapter
  const [scopeMode, setScopeMode] = useState<"single" | "range">("single");
  const [startVerse, setStartVerse] = useState<number>(1);
  const [endVerse, setEndVerse] = useState<number>(1);

  // Theme + cross-references
  const [selectedTheme, setSelectedTheme] = useState<NoteTheme>(
    note?.noteTheme ?? "yellow"
  );
  const [crossRefs, setCrossRefs] = useState<string>(
    note?.crossReferences ?? ""
  );

  // Simple "formatting mode" toggle – just a visual hint for now
  const [formatMode, setFormatMode] = useState<"plain" | "bullets">("plain");

  // Parse verse number from something like "John 3:16" or "John 3:16–18"
  useEffect(() => {
    const [, ref] = verseReference.split(" ");
    const [chapterPart, versePart] = (ref ?? "").split(":");
    const verseSegment = versePart ?? "1";
    const [startStr, endStr] = verseSegment.split("-");

    const startNum = parseInt(startStr ?? "1", 10);
    const endNum = parseInt(endStr ?? startStr ?? "1", 10);

    if (!Number.isNaN(startNum)) {
      setStartVerse(startNum);
    } else {
      setStartVerse(1);
    }

    if (!Number.isNaN(endNum)) {
      setEndVerse(endNum);
    } else {
      setEndVerse(startNum || 1);
    }

    // If the existing note has an explicit range, prefer that
    if (
      note &&
      typeof note.startVerse === "number" &&
      typeof note.endVerse === "number"
    ) {
      setStartVerse(note.startVerse);
      setEndVerse(note.endVerse);
      if (note.startVerse !== note.endVerse) {
        setScopeMode("range");
      }
    } else {
      setScopeMode("single");
    }
  }, [verseReference, note]);

  const handleSaveClick = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const options: NoteSaveOptions = {
      theme: selectedTheme,
      crossReferences: crossRefs.trim() || undefined,
    };

    if (scopeMode === "range" && enableRange) {
      const start = Math.min(startVerse, endVerse);
      const end = Math.max(startVerse, endVerse);
      options.range = { startVerse: start, endVerse: end };
    }

    onSave(trimmed, options);
  };

  const disableScopeControls = !enableRange;

  // Theme buttons share Tailwind-friendly border colors (dark + light ok)
  const themeButtonClasses: Record<NoteTheme, string> = {
    yellow: "border-amber-500/70 bg-amber-500/10",
    blue: "border-sky-500/70 bg-sky-500/10",
    green: "border-emerald-500/70 bg-emerald-500/10",
    purple: "border-violet-500/70 bg-violet-500/10",
    pink: "border-rose-500/70 bg-rose-500/10",
    gray: "border-slate-500/70 bg-slate-500/10",
  };

  return (
    <div className="mt-3 rounded-lg border bg-card px-3 py-3 text-sm shadow-sm">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] text-muted-foreground">
          {verseReference}
          {wordText && (
            <>
              {" "}
              · <span className="italic">“{wordText}”</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Scope controls – hidden for word notes or when enableRange=false */}
      {!disableScopeControls && !wordText && (
        <div className="mb-2">
          <div className="text-[11px] text-muted-foreground mb-1">
            This note applies to:
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setScopeMode("single")}
              className={`px-2 py-1 rounded-full border ${
                scopeMode === "single"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent/60"
              }`}
            >
              This verse only
            </button>

            <button
              type="button"
              onClick={() => setScopeMode("range")}
              className={`px-2 py-1 rounded-full border ${
                scopeMode === "range"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent/60"
              }`}
            >
              Verse range
            </button>

            {scopeMode === "range" && (
              <div className="flex items-center gap-1 text-[11px]">
                <span>vv.</span>
                <input
                  type="number"
                  className="w-12 rounded border border-border bg-background px-1 py-0.5 text-[11px]"
                  value={startVerse}
                  min={1}
                  onChange={(e) =>
                    setStartVerse(parseInt(e.target.value || "1", 10))
                  }
                />
                <span>–</span>
                <input
                  type="number"
                  className="w-12 rounded border border-border bg-background px-1 py-0.5 text-[11px]"
                  value={endVerse}
                  min={1}
                  onChange={(e) =>
                    setEndVerse(parseInt(e.target.value || "1", 10))
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toolbar: theme + format + cross refs */}
      <div className="mb-2 flex flex-wrap items-center gap-2 justify-between">
        {/* Theme pills */}
        <div className="flex items-center gap-1">
          <Palette className="h-3 w-3 text-muted-foreground" />
          {(["yellow", "blue", "green", "purple", "pink", "gray"] as NoteTheme[]).map(
            (theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setSelectedTheme(theme)}
                className={`h-4 w-4 rounded-full border transition-transform ${
                  selectedTheme === theme
                    ? `${themeButtonClasses[theme]} scale-110`
                    : "border-border bg-background hover:bg-accent/60"
                }`}
                aria-label={theme}
              />
            )
          )}
        </div>

        {/* Tiny "format mode" toggle (visual hint only) */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <button
            type="button"
            onClick={() => setFormatMode("plain")}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
              formatMode === "plain"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-accent/60"
            }`}
          >
            <AlignLeft className="h-3 w-3" />
            Plain
          </button>
          <button
            type="button"
            onClick={() => setFormatMode("bullets")}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
              formatMode === "bullets"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-accent/60"
            }`}
          >
            <List className="h-3 w-3" />
            Bullets
          </button>
        </div>
      </div>

      {/* Cross references */}
      <div className="mb-2">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
          <Link2 className="h-3 w-3" />
          Cross references (e.g. “James 2:14–26; Luke 6:46”)
        </div>
        <input
          type="text"
          value={crossRefs}
          onChange={(e) => setCrossRefs(e.target.value)}
          className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
          placeholder="Optional: related passages for this note"
        />
      </div>

      {/* Textarea */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={formatMode === "bullets" ? 5 : 4}
        placeholder={
          formatMode === "bullets"
            ? "• Start each line with a bullet style note…"
            : "Write your note…"
        }
        className="mb-2 text-sm"
      />

      {/* Actions */}
      <div className="flex justify-between items-center mt-1">
        {onDelete && note && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}

        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveClick}
            disabled={!content.trim()}
          >
            Save note
          </Button>
        </div>
      </div>
    </div>
  );
}
