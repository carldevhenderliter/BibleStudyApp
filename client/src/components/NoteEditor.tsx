import { useEffect, useState } from "react";
import { Note } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { X, Trash2, Pencil } from "lucide-react";

type NoteTheme = "yellow" | "blue" | "green" | "purple" | "pink" | "gray";

type NoteSaveOptions = {
  range?: { startVerse: number; endVerse: number };
  theme?: NoteTheme;
  crossReferences?: string;
  title?: string;
};

type RangeNote = Note & {
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
  const [theme, setTheme] = useState<NoteTheme>(note?.noteTheme ?? "yellow");

  // scope: this verse only vs range of verses within the same chapter
  const [scopeMode, setScopeMode] = useState<"single" | "range">("single");
  const [startVerse, setStartVerse] = useState<number>(1);
  const [endVerse, setEndVerse] = useState<number>(1);

  // view vs edit mode:
  // - existing note => start in view mode
  // - new note (no note prop) => start in edit mode
  const [isEditing, setIsEditing] = useState<boolean>(() => !note);

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

  // If the incoming note changes (e.g., edited elsewhere), sync local state
  useEffect(() => {
    if (note) {
      setContent(note.content ?? "");
      setTitle(note.noteTitle ?? "");
      setCrossRefs(note.crossReferences ?? "");
      setTheme(note.noteTheme ?? "yellow");
    }
  }, [note]);

  const handleSaveClick = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const options: NoteSaveOptions = {
      theme,
      crossReferences: crossRefs.trim() || undefined,
      title: title.trim() || "",
    };

    if (scopeMode === "range" && enableRange && !wordText) {
      const start = Math.min(startVerse, endVerse);
      const end = Math.max(startVerse, endVerse);
      options.range = { startVerse: start, endVerse: end };
    }

    onSave(trimmed, options);

    // For existing notes, stay mounted but switch to view mode
    if (note) {
      setIsEditing(false);
    }
  };

  const disableScopeControls = !enableRange;

  const handleClickReference = () => {
    const el = document.querySelector<HTMLElement>(
      `[data-verse-id="${verseId}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary/60", "bg-accent/20");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary/60", "bg-accent/20");
      }, 1200);
    }
  };

  const themeChipClasses: Record<NoteTheme, string> = {
    yellow:
      "border-amber-500/70 bg-amber-500/10 data-[active=true]:bg-amber-500/20",
    blue: "border-sky-500/70 bg-sky-500/10 data-[active=true]:bg-sky-500/20",
    green:
      "border-emerald-500/70 bg-emerald-500/10 data-[active=true]:bg-emerald-500/20",
    purple:
      "border-violet-500/70 bg-violet-500/10 data-[active=true]:bg-violet-500/20",
    pink: "border-rose-500/70 bg-rose-500/10 data-[active=true]:bg-rose-500/20",
    gray:
      "border-slate-500/70 bg-slate-500/10 data-[active=true]:bg-slate-500/20",
  };

  // VIEW MODE
  if (!isEditing && note) {
    const displayTitle = note.noteTitle?.trim() || "Untitled note";

    return (
      <div className="rounded-lg border bg-card px-3 py-3 text-sm shadow-sm">
        {/* Header row: title + edit button */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex flex-col">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Note
            </div>
            <div className="font-semibold text-sm">
              {displayTitle}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>

        {/* Selected verses (top, non-clickable text) */}
        <div className="text-[11px] text-muted-foreground mb-2">
          {verseReference}
          {wordText && (
            <>
              {" "}
              · <span className="italic">“{wordText}”</span>
            </>
          )}
        </div>

        {/* Content */}
        <div className="text-sm whitespace-pre-wrap mb-2">
          {note.content}
        </div>

        {/* Cross refs at bottom, link-styled but no navigation yet */}
        {note.crossReferences && (
          <div className="pt-1 border-t border-border/60 mt-2">
            <button
              type="button"
              className="text-[11px] text-primary/80 hover:underline underline-offset-2"
            >
              Cross reference: {note.crossReferences}
            </button>
          </div>
        )}

        {/* Reference at very bottom, clickable to scroll */}
        <div className="mt-1">
          <button
            type="button"
            onClick={handleClickReference}
            className="text-[11px] text-muted-foreground hover:text-primary hover:underline underline-offset-2"
          >
            {verseReference}
          </button>
        </div>
      </div>
    );
  }

  // EDIT MODE
  return (
    <div className="mt-3 rounded-lg border bg-card px-3 py-3 text-sm shadow-sm">
      {/* Header row: title input + close / delete */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 mr-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title…"
            className="h-8 text-sm font-semibold"
          />
        </div>

        <div className="flex items-center gap-1">
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
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
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

      {/* Theme picker */}
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
              data-active={theme === t}
              className={`h-6 px-2 rounded-full border text-[11px] capitalize transition-colors ${themeChipClasses[t]} ${
                theme === t ? "ring-1 ring-primary/60" : ""
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        placeholder="Write your note…"
        className="mb-2 text-sm resize-y"
      />

      {/* Cross references */}
      <div className="mb-2">
        <div className="text-[11px] text-muted-foreground mb-1">
          Cross references (optional)
        </div>
        <Input
          value={crossRefs}
          onChange={(e) => setCrossRefs(e.target.value)}
          placeholder="e.g. Matt 28:19; Acts 2:38"
          className="h-8 text-xs"
        />
      </div>

      {/* Reference at bottom, clickable */}
      <div className="mt-2 border-t border-border/60 pt-1 flex justify-between items-center">
        <button
          type="button"
          onClick={handleClickReference}
          className="text-[11px] text-muted-foreground hover:text-primary hover:underline underline-offset-2"
        >
          {verseReference}
          {wordText && (
            <>
              {" "}
              · <span className="italic">“{wordText}”</span>
            </>
          )}
        </button>

        <div className="flex gap-2">
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
