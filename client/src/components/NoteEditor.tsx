import { useEffect, useState } from "react";
import { Note } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Trash2 } from "lucide-react";

export type NoteTheme =
  | "yellow"
  | "blue"
  | "green"
  | "purple"
  | "pink"
  | "gray";

export type NoteSaveOptions = {
  range?: { startVerse: number; endVerse: number };
  theme?: NoteTheme;
  crossReferences?: string;
  title?: string;
};

export interface RangeNote extends Note {
  startVerse?: number;
  endVerse?: number;
  noteTheme?: NoteTheme;
  crossReferences?: string;
  title?: string;
}

interface NoteEditorProps {
  note?: RangeNote;
  verseId: string;
  verseReference: string;
  wordText?: string;
  enableRange?: boolean;
  onSave: (content: string, options?: NoteSaveOptions) => void;
  onDelete?: () => void;
  onCancel: () => void;
  // Used to handle clickable cross references
  onCrossReferenceClick?: (ref: string) => void;
}

const themeButtonStyles: Record<NoteTheme, string> = {
  yellow: "bg-amber-500/70 border-amber-500/80",
  blue: "bg-sky-500/70 border-sky-500/80",
  green: "bg-emerald-500/70 border-emerald-500/80",
  purple: "bg-violet-500/70 border-violet-500/80",
  pink: "bg-rose-500/70 border-rose-500/80",
  gray: "bg-slate-500/70 border-slate-500/80",
};

export function NoteEditor({
  note,
  verseId,
  verseReference,
  wordText,
  enableRange = true,
  onSave,
  onDelete,
  onCancel,
  onCrossReferenceClick,
}: NoteEditorProps) {
  const [content, setContent] = useState(note?.content ?? "");
  const [title, setTitle] = useState(note?.title ?? "");
  const [theme, setTheme] = useState<NoteTheme>(note?.noteTheme ?? "yellow");
  const [crossRefs, setCrossRefs] = useState(note?.crossReferences ?? "");

  // scope: this verse only vs range of verses within the same chapter
  const [scopeMode, setScopeMode] = useState<"single" | "range">("single");
  const [startVerse, setStartVerse] = useState<number>(1);
  const [endVerse, setEndVerse] = useState<number>(1);

  // Parse verse number from something like "John 3:16" or "John 3:16–18"
  useEffect(() => {
    const [, ref] = verseReference.split(" ");
    const [, versePart] = (ref ?? "").split(":");
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
  }, [verseReference]);

  const handleSaveClick = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const opts: NoteSaveOptions = {
      theme,
      crossReferences: crossRefs.trim() || undefined,
      title: title.trim() || undefined,
    };

    if (scopeMode === "range" && enableRange && !wordText) {
      const start = Math.min(startVerse, endVerse);
      const end = Math.max(startVerse, endVerse);
      opts.range = { startVerse: start, endVerse: end };
    }

    onSave(trimmed, opts);
  };

  const disableScopeControls = !enableRange;

  const crossRefList = (crossRefs || "")
    .split(/[;,]/)
    .map((r) => r.trim())
    .filter(Boolean);

  return (
    <div className="mt-3 rounded-lg border bg-card px-3 py-3 text-sm shadow-sm">
      {/* Header row: title + close */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title…"
            className="w-full text-sm font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Selected verses text (top, non-clickable) */}
      <div className="text-[11px] text-muted-foreground mb-2">
        Verses: {verseReference}
        {wordText && (
          <>
            {" "}
            · <span className="italic">“{wordText}”</span>
          </>
        )}
      </div>

      {/* Theme selector */}
      <div className="mb-2">
        <div className="text-[11px] text-muted-foreground mb-1">
          Note color
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            ["yellow", "blue", "green", "purple", "pink", "gray"] as NoteTheme[]
          ).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`h-6 px-2 rounded-full border flex items-center gap-1 text-[11px] ${
                theme === t
                  ? `${themeButtonStyles[t]} text-background`
                  : "border-border text-muted-foreground hover:bg-accent/60"
              }`}
            >
              <span
                className={`h-3 w-3 rounded-full ${
                  themeButtonStyles[t].split(" ")[0]
                }`}
              />
              <span className="capitalize">{t}</span>
            </button>
          ))}
        </div>
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

      {/* Textarea */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        placeholder="Write your note…"
        className="mb-2 text-sm"
      />

      {/* Cross references (input) */}
      <div className="mb-2">
        <div className="text-[11px] text-muted-foreground mb-1">
          Cross references (e.g. "John 3:16; Romans 5:1")
        </div>
        <input
          type="text"
          value={crossRefs}
          onChange={(e) => setCrossRefs(e.target.value)}
          className="w-full rounded border border-border bg-background px-2 py-1 text-[12px]"
          placeholder="Type references separated by ; or ,"
        />
      </div>

      {/* Cross reference chips (clickable) */}
      {crossRefList.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {crossRefList.map((ref) => (
            <button
              key={ref}
              type="button"
              className="text-[11px] px-2 py-1 rounded-full border border-dashed border-primary/50 text-primary hover:bg-primary/10"
              onClick={() => onCrossReferenceClick?.(ref)}
            >
              {ref}
            </button>
          ))}
        </div>
      )}

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
