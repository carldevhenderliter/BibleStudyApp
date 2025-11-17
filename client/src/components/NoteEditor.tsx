import { useEffect, useState, useCallback } from "react";
import { Note } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Trash2 } from "lucide-react";

type NoteTheme = "yellow" | "blue" | "green" | "purple" | "pink" | "gray";

export type NoteSaveOptions = {
  range?: { startVerse: number; endVerse: number };
  theme?: NoteTheme;
  crossReferences?: string;
  title?: string;
};

export type RangeNote = Note & {
  startVerse?: number;
  endVerse?: number;
  noteTheme?: NoteTheme;
  crossReferences?: string;
  noteTitle?: string;
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

// Simple helper: parse something like "John 3:16; Rom 8:1-4, Eph 2:8"
function parseCrossRefs(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[;,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Scroll to a verse in the current chapter using [data-ref="Book 3:16"]
function scrollToReference(ref: string) {
  if (typeof document === "undefined") return;
  const el = document.querySelector<HTMLElement>(`[data-ref="${ref}"]`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-primary/60", "bg-accent/20");
  setTimeout(() => {
    el.classList.remove("ring-2", "ring-primary/60", "bg-accent/20");
  }, 1500);
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
  const [title, setTitle] = useState(note?.noteTitle ?? "");
  const [crossRefs, setCrossRefs] = useState(note?.crossReferences ?? "");

  // scope: this verse only vs range of verses within the same chapter
  const [scopeMode, setScopeMode] = useState<"single" | "range">("single");
  const [startVerse, setStartVerse] = useState<number>(1);
  const [endVerse, setEndVerse] = useState<number>(1);

  const [theme, setTheme] = useState<NoteTheme>(note?.noteTheme ?? "yellow");

  // Parse verse number(s) from something like "John 3:16" or "John 3:16-18"
  useEffect(() => {
    const parts = verseReference.trim().split(" ");
    const refPart = parts[parts.length - 1] ?? "";
    const [, versePart] = refPart.split(":");
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

  // When note changes (editing existing vs creating new), sync fields
  useEffect(() => {
    if (note) {
      setContent(note.content ?? "");
      setTitle(note.noteTitle ?? "");
      setCrossRefs(note.crossReferences ?? "");
      setTheme(note.noteTheme ?? "yellow");
    }
  }, [note]);

  const handleSaveClick = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const options: NoteSaveOptions = {
      theme,
      crossReferences: crossRefs.trim() || undefined,
      title: title.trim() || undefined,
    };

    if (scopeMode === "range" && enableRange) {
      const start = Math.min(startVerse, endVerse);
      const end = Math.max(startVerse, endVerse);
      options.range = { startVerse: start, endVerse: end };
    }

    onSave(trimmed, options);
  }, [content, theme, crossRefs, title, scopeMode, enableRange, startVerse, endVerse, onSave]);

  const disableScopeControls = !enableRange;

  const crossRefList = parseCrossRefs(crossRefs);

  return (
    <div className="mt-3 rounded-lg border bg-card px-3 pt-3 pb-2 text-sm shadow-sm">
      {/* Header row: title + close button */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex-1 space-y-1">
          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title…"
            className="w-full bg-transparent border-b border-border/60 pb-1 text-sm font-semibold outline-none focus:border-primary"
          />

          {/* Verse reference (top, just text) */}
          <div className="text-[11px] text-muted-foreground">
            Verses: <span className="font-mono">{verseReference}</span>
            {wordText && (
              <>
                {" "}
                · <span className="italic">“{wordText}”</span>
              </>
            )}
          </div>
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

      {/* Theme + Cross-refs controls */}
      <div className="mb-2 flex flex-wrap items-center gap-3">
        {/* Theme selector */}
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-muted-foreground">Color:</span>
          <div className="flex gap-1">
            {(
              ["yellow", "blue", "green", "purple", "pink", "gray"] as NoteTheme[]
            ).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`h-4 w-4 rounded-full border ${
                  theme === t
                    ? "border-primary ring-2 ring-primary/60"
                    : "border-border"
                } ${
                  t === "yellow"
                    ? "bg-amber-400"
                    : t === "blue"
                    ? "bg-sky-400"
                    : t === "green"
                    ? "bg-emerald-400"
                    : t === "purple"
                    ? "bg-violet-400"
                    : t === "pink"
                    ? "bg-rose-400"
                    : "bg-slate-400"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Cross refs input */}
        <div className="flex-1 min-w-[8rem]">
          <input
            type="text"
            value={crossRefs}
            onChange={(e) => setCrossRefs(e.target.value)}
            placeholder="Cross refs (e.g. John 3:16; Rom 8:1)"
            className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Textarea */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        placeholder="Write your note…"
        className="mb-2 text-sm"
      />

      {/* Actions + cross refs display */}
      <div className="flex flex-col gap-2 mt-1">
        {/* Buttons row */}
        <div className="flex justify-between items-center">
          {/* Delete only when editing an existing note */}
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

        {/* Cross references display (bottom, clickable, no reference at bottom) */}
        {crossRefList.length > 0 && (
          <div className="border-t border-border/60 pt-2 mt-1">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Cross references
            </div>
            <div className="flex flex-wrap gap-1">
              {crossRefList.map((ref) => (
                <button
                  key={ref}
                  type="button"
                  onClick={() => scrollToReference(ref)}
                  className="text-xs px-2 py-0.5 rounded-full border border-primary/60 text-primary hover:bg-primary/10"
                >
                  {ref}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
