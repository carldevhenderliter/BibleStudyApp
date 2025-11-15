import { useEffect, useState } from "react";
import { Note } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Trash2 } from "lucide-react";

interface NoteEditorProps {
  note?: Note;
  verseId: string;
  verseReference: string;
  wordText?: string;
  /**
   * If true, allow choosing a verse range for this note.
   * For word notes we pass false so it only applies to that single verse.
   */
  enableRange?: boolean;
  onSave: (content: string, range?: { startVerse: number; endVerse: number }) => void;
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

  const handleSaveClick = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    // If range is enabled and selected, return the range, otherwise single-verse
    if (scopeMode === "range" && enableRange) {
      const start = Math.min(startVerse, endVerse);
      const end = Math.max(startVerse, endVerse);
      onSave(trimmed, { startVerse: start, endVerse: end });
    } else {
      onSave(trimmed);
    }
  };

  const disableScopeControls = !enableRange;

  return (
    <div className="mt-3 rounded-lg border bg-card px-3 py-3 text-sm shadow-sm">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">
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

      {/* Textarea */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
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
