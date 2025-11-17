import { useEffect, useRef, useState } from "react";
import { Note } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Trash2 } from "lucide-react";

export type NoteTheme = "yellow" | "blue" | "green" | "purple" | "pink" | "gray";

export type ExtendedNote = Note & {
  startVerse?: number;
  endVerse?: number;
  noteTheme?: NoteTheme;
  crossReferences?: string;
};

type ScopeMode = "single" | "range";

export type EditorSaveOptions = {
  range?: { startVerse: number; endVerse: number };
  theme?: NoteTheme;
  crossReferences?: string;
};

interface NoteEditorProps {
  note?: ExtendedNote;
  verseId: string;
  verseReference: string;
  wordText?: string;
  /**
   * If true, allow choosing a verse range for this note.
   * For word notes we pass false so it only applies to that single verse.
   */
  enableRange?: boolean;
  onSave: (content: string, options?: EditorSaveOptions) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

/**
 * For interpreting short cross refs like "3:16" or "16" in the context of the
 * current verseReference (e.g. "John 3:16").
 */
function parseContextFromVerseRef(verseReference: string): {
  book: string;
  chapter: number;
} {
  // Examples: "John 3:16" or "John 3:16-18"
  const lastSpace = verseReference.lastIndexOf(" ");
  if (lastSpace === -1) {
    return { book: verseReference, chapter: 1 };
  }

  const book = verseReference.slice(0, lastSpace);
  const rest = verseReference.slice(lastSpace + 1); // "3:16-18"
  const chapterPart = rest.split(":")[0] ?? "1";
  const chapter = parseInt(chapterPart, 10) || 1;
  return { book, chapter };
}

/**
 * Normalize a cross ref for matching against `[data-ref="Book chap:verse"]`.
 * - "John 3:16" → "John 3:16" (unchanged)
 * - "3:16"      → "<same book> 3:16"
 * - "16"        → "<same book> <same chapter>:16"
 */
function normalizeRefForCurrentChapter(
  rawRef: string,
  verseReference: string
): string | null {
  const ref = rawRef.trim();
  if (!ref) return null;

  const context = parseContextFromVerseRef(verseReference);

  // Case 1: full "Book 3:16"
  if (ref.includes(" ")) {
    return ref;
  }

  // Case 2: "3:16" – assume same book
  if (ref.includes(":")) {
    return `${context.book} ${ref}`;
  }

  // Case 3: just "16" – assume same book & chapter
  const verseNum = parseInt(ref, 10);
  if (!Number.isFinite(verseNum)) return null;

  return `${context.book} ${context.chapter}:${verseNum}`;
}

/**
 * Parse a normalized ref like "John 3:16" into parts.
 */
function parseNormalizedRef(normalized: string): {
  book: string;
  chapter: number;
  verse: number;
} | null {
  const lastSpace = normalized.lastIndexOf(" ");
  if (lastSpace === -1) return null;

  const book = normalized.slice(0, lastSpace);
  const rest = normalized.slice(lastSpace + 1); // "3:16" or "3:16-18"
  const [chapStr, verseSegment] = rest.split(":");
  const [verseStr] = (verseSegment ?? "1").split("-");
  const chapter = parseInt(chapStr ?? "1", 10) || 1;
  const verse = parseInt(verseStr ?? "1", 10) || 1;

  return { book, chapter, verse };
}

const THEME_SWATCH_BG: Record<NoteTheme, string> = {
  yellow: "bg-amber-500",
  blue: "bg-sky-500",
  green: "bg-emerald-500",
  purple: "bg-violet-500",
  pink: "bg-rose-500",
  gray: "bg-slate-500",
};

export function NoteEditor({
  note,
  verseId: _verseId,
  verseReference,
  wordText,
  enableRange = true,
  onSave,
  onDelete,
  onCancel,
}: NoteEditorProps) {
  // Are we editing an existing note, or creating a new one?
  const isNew = !note;
  const [isEditing, setIsEditing] = useState<boolean>(isNew);

  // Title + body are stored together in note.content as:
  //   first line = title
  //   rest       = body
  const [title, setTitle] = useState<string>(() => {
    if (!note?.content) return "";
    const [firstLine] = note.content.split(/\r?\n/);
    return firstLine ?? "";
  });

  const [body, setBody] = useState<string>(() => {
    if (!note?.content) return "";
    const lines = note.content.split(/\r?\n/);
    if (lines.length <= 1) return "";
    return lines.slice(1).join("\n");
  });

  useEffect(() => {
    if (!note?.content) {
      setTitle("");
      setBody("");
      return;
    }
    const lines = note.content.split(/\r?\n/);
    setTitle(lines[0] ?? "");
    setBody(lines.length > 1 ? lines.slice(1).join("\n") : "");
  }, [note?.content]);

  const [crossRefs, setCrossRefs] = useState<string>(
    note?.crossReferences ?? ""
  );

  // Theme selection for this note
  const [theme, setTheme] = useState<NoteTheme>(note?.noteTheme ?? "yellow");
  useEffect(() => {
    if (note?.noteTheme) {
      setTheme(note.noteTheme);
    }
  }, [note?.noteTheme]);

  // Editor height persistence (applies to the body Textarea)
  const [editorHeight, setEditorHeight] = useState<number>(() => {
    if (typeof window === "undefined") return 160;
    const stored = window.localStorage.getItem("note-editor-height");
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 80 ? parsed : 160;
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    if (!textareaRef.current) return;

    const el = textareaRef.current;
    const observer = new ResizeObserver(() => {
      const newHeight = el.offsetHeight;
      setEditorHeight(newHeight);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "note-editor-height",
          String(newHeight)
        );
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Scope: this verse only vs range of verses within the same chapter
  const [scopeMode, setScopeMode] = useState<ScopeMode>("single");
  const [startVerse, setStartVerse] = useState<number>(1);
  const [endVerse, setEndVerse] = useState<number>(1);

  // Initialize verse range from verseReference (e.g. "John 3:16-18")
  useEffect(() => {
    const [, refPart] = verseReference.split(" ");
    const [chapterPart, verseSegmentRaw] = (refPart ?? "").split(":");
    const verseSegment = verseSegmentRaw ?? "1";
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

  const disableScopeControls = !enableRange || !!wordText;

  const parseCrossRefsList = (value: string): string[] => {
    if (!value.trim()) return [];
    return value
      .split(/[;,]/)
      .map((r) => r.trim())
      .filter(Boolean);
  };

  const scrollToReference = (ref: string) => {
    const normalized = normalizeRefForCurrentChapter(
      ref,
      verseReference
    );
    if (!normalized) return;

    const target = parseNormalizedRef(normalized);
    if (!target) return;

    const context = parseContextFromVerseRef(verseReference);

    // Same book + chapter: just scroll within the currently loaded chapter
    if (
      target.book === context.book &&
      target.chapter === context.chapter
    ) {
      const el = document.querySelector<HTMLElement>(
        `[data-ref="${normalized}"]`
      );
      if (!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary/60", "bg-accent/20");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary/60", "bg-accent/20");
      }, 1500);
      return;
    }

    // Different book or chapter: dispatch a global navigation event.
    // Home.tsx will listen to this and change selectedBook / selectedChapter.
    window.dispatchEvent(
      new CustomEvent("bible:navigate", {
        detail: {
          book: target.book,
          chapter: target.chapter,
          verse: target.verse,
        },
      })
    );
  };

  const handleSaveClick = () => {
    const combined = [title, body].filter((x) => x.trim().length > 0).join("\n");
    if (!combined.trim()) return;

    const opts: EditorSaveOptions = {
      crossReferences: crossRefs.trim() || undefined,
      theme,
    };

    if (enableRange && scopeMode === "range" && !wordText) {
      const start = Math.min(startVerse, endVerse);
      const end = Math.max(startVerse, endVerse);
      opts.range = { startVerse: start, endVerse: end };
    }

    onSave(combined, opts);

    if (!isNew) {
      // existing note: stay mounted but go back to view mode
      setIsEditing(false);
    }
  };

  const crossRefList = parseCrossRefsList(crossRefs);

  // VIEW MODE (saved note, not editing)
  if (!isEditing && note) {
    const lines = note.content.split(/\r?\n/);
    const viewTitle = (lines[0] ?? "").trim();
    const viewBody =
      lines.length > 1 ? lines.slice(1).join("\n") : "";

    const viewCrossRefs = parseCrossRefsList(
      note.crossReferences ?? ""
    );

    return (
      <div className="rounded-lg border bg-card px-3 py-3 text-sm shadow-sm">
        {/* Title + verse range */}
        <div className="mb-2">
          {viewTitle && (
            <div className="text-sm font-semibold leading-snug">
              {viewTitle}
            </div>
          )}
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {verseReference}
            {wordText && (
              <>
                {" "}
                · <span className="italic">“{wordText}”</span>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        {viewBody && (
          <div className="text-sm whitespace-pre-wrap mb-2">
            {viewBody}
          </div>
        )}

        {/* Cross references */}
        {viewCrossRefs.length > 0 && (
          <div className="mt-2">
            <div className="text-[11px] text-muted-foreground mb-1">
              Cross references
            </div>
            <div className="flex flex-wrap gap-1.5">
              {viewCrossRefs.map((ref) => (
                <button
                  key={ref}
                  type="button"
                  onClick={() => scrollToReference(ref)}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:border-primary/70 hover:bg-accent/60 transition-colors"
                >
                  {ref}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        </div>
      </div>
    );
  }

  // EDIT MODE (new note or editing existing)
  return (
    <div className="rounded-lg border bg-card px-3 py-3 text-sm shadow-sm">
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
          onClick={() => {
            if (isNew) {
              onCancel();
            } else {
              setIsEditing(false);
            }
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Scope controls – hidden for word notes or when enableRange=false */}
      {!disableScopeControls && (
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
                    setStartVerse(
                      parseInt(e.target.value || "1", 10)
                    )
                  }
                />
                <span>–</span>
                <input
                  type="number"
                  className="w-12 rounded border border-border bg-background px-1 py-0.5 text-[11px]"
                  value={endVerse}
                  min={1}
                  onChange={(e) =>
                    setEndVerse(
                      parseInt(e.target.value || "1", 10)
                    )
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Note color / theme controls */}
      <div className="mb-2">
        <div className="text-[11px] text-muted-foreground mb-1">
          Note color
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["yellow", "blue", "green", "purple", "pink", "gray"] as NoteTheme[]).map(
            (t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`px-2 py-0.5 rounded-full border text-[11px] capitalize flex items-center gap-1 ${
                  theme === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent/60"
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full ${THEME_SWATCH_BG[t]}`}
                />
                {t}
              </button>
            )
          )}
        </div>
      </div>

      {/* Title input */}
      <div className="mb-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-border bg-background px-2 py-1 text-sm mb-1"
          placeholder="Note title…"
        />
      </div>

      {/* Body textarea */}
      <Textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        placeholder="Write your note…"
        className="mb-2 text-sm resize-y"
        style={{ minHeight: editorHeight }}
      />

      {/* Cross refs input */}
      <div className="mb-2">
        <div className="text-[11px] text-muted-foreground mb-1">
          Cross references (e.g. John 3:16; 3:17; 16)
        </div>
        <input
          type="text"
          value={crossRefs}
          onChange={(e) => setCrossRefs(e.target.value)}
          className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
          placeholder="Type references separated by ; or ,"
        />
        {crossRefList.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {crossRefList.map((ref) => (
              <button
                key={ref}
                type="button"
                onClick={() => scrollToReference(ref)}
                className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:border-primary/70 hover:bg-accent/60 transition-colors"
              >
                {ref}
              </button>
            ))}
          </div>
        )}
      </div>

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
            onClick={() => {
              if (isNew) {
                onCancel();
              } else {
                setIsEditing(false);
              }
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveClick}
            disabled={
              ![title, body].some((x) => x.trim().length > 0)
            }
          >
            Save note
          </Button>
        </div>
      </div>
    </div>
  );
}
