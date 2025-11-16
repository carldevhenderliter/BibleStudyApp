import { useEffect, useState } from "react";
import { Note } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Trash2 } from "lucide-react";

/**
 * These should match the types used in BibleReader.
 */
type NoteTheme = "yellow" | "blue" | "green" | "purple" | "pink" | "gray";

type NoteSaveOptions = {
  range?: { startVerse: number; endVerse: number };
  theme?: NoteTheme;
  crossReferences?: string;
  title?: string;
};

interface NoteEditorProps {
  note?: Note & {
    startVerse?: number;
    endVerse?: number;
    noteTheme?: NoteTheme;
    crossReferences?: string;
    title?: string;
  };
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
  }, [verseReference]);

  // If the note prop changes (editing existing note), sync content/title/theme/refs
  useEffect(() => {
    if (note) {
      setContent(note.content ?? "");
      setTitle(note.title ?? "");
      setTheme(note.noteTheme ?? "yellow");
      setCrossRefs(note.crossReferences ?? "");
    }
  }, [note]);

  const handleSaveClick = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    let rangeOpt: { startVerse: number; endVerse: number } | undefined;

    if (scopeMode === "range" && enableRange) {
      const start = Math.min(startVerse, endVerse);
      const end = Math.max(startVerse, endVerse);
      rangeOpt = { startVerse: start, endVerse: end };
    }

    onSave(trimmed, {
      ...(rangeOpt ? { range: rangeOpt } : {}),
      theme,
      crossReferences: crossRefs,
      title: title.trim() || undefined,
    });
  };

  const disableScopeControls = !enableRange;

  // theme → small color dots
  const themeOptions: { id: NoteTheme; label: string; color: string }[] = [
    { id: "yellow", label: "Yellow", color: "bg-amber-500" },
    { id: "blue", label: "Blue", color: "bg-sky-500" },
    { id: "green", label: "Green", color: "bg-emerald-500" },
    { id: "purple", label: "Purple", color: "bg-violet-500" },
    { id: "pink", label: "Pink", color: "bg-rose-500" },
    { id: "gray", label: "Gray", color: "bg-slate-500" },
  ];

  return (
    <div className="mt-3 rounded-lg border bg-card px-3 py-3 text-sm shadow-sm">
      {/* Header row: title + verse reference + wordText */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="text-xs text-muted-foreground">
          <div className="font-semibold">
            {title ? `${title} · ${verseReference}` : verseReference}
          </div>
          {wordText && (
            <div className="mt-0.5">
              <span className="italic text-[11px]">
                Word: “{wordText}”
              </span>
            </div>
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

      {/* Title input */}
      <input
        type="text"
        className="w-full mb-2 px-2 py-1 border border-border rounded text-sm bg-background"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

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

      {/* Theme + cross refs */}
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Note color:</span>
          <div className="flex items-center gap-1.5">
            {themeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`h-4 w-4 rounded-full border border-border flex items-center justify-center ${
                  theme === opt.id ? "ring-2 ring-primary" : ""
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${opt.color}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[140px]">
          <input
            type="text"
            className="w-full px-2 py-1 border border-border rounded text-[11px] bg-background"
            placeholder="Cross references (e.g. John 15:1–5; Rom 6)"
            value={crossRefs}
            onChange={(e) => setCrossRefs(e.target.value)}
          />
        </div>
      </div>

      {/* Textarea – taller by default */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        placeholder="Write your note…"
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
