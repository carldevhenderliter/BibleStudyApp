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

  // Utility: get current book + chapter from the main verseReference ("John 3:16-18")
  const getCurrentBookAndChapter = () => {
    const [bookPart, rest] = verseReference.split(" ");
    if (!bookPart || !rest) return { book: "", chapter: 1 };
    const [chapterStr] = rest.split(":");
    const chapterNum = parseInt(chapterStr ?? "1", 10) || 1;
    return { book: bookPart, chapter: chapterNum };
  };

  // Parse a cross-ref fragment like "John 3:16" or "3:16" or "16"
  const normalizeCrossRef = (raw: string): string | null => {
    const rawTrim = raw.trim();
    if (!rawTrim) return null;

    const { book: currentBook, chapter: currentChapter } =
      getCurrentBookAndChapter();

    // Has a space: assume "Book X:Y"
    if (rawTrim.includes(" ")) {
      return rawTrim;
    }

    // No space but has ":" => same book, explicit chapter:verse
    if (rawTrim.includes(":")) {
      return `${currentBook} ${rawTrim}`;
    }

    // Just a verse number
