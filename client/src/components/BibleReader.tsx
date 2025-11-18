import { useState, useEffect } from "react";
import { BibleVerse, Highlight, Note } from "@shared/schema";
import { VerseDisplay } from "./VerseDisplay";
import { NoteEditor, NoteTheme, NoteSaveOptions } from "./NoteEditor";
import { HighlightToolbar } from "./HighlightToolbar";
import { StrongDefinitionInline } from "./StrongDefinitionInline";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getVersesByChapter,
  BibleVerseWithTokens,
  Translation,
} from "@/lib/bibleData";
import { useToast } from "@/hooks/use-toast";
import { Search, ChevronDown } from "lucide-react";

interface BibleReaderProps {
  book: string;
  chapter: number;
  showStrongsNumbers: boolean;
  showInterlinear: boolean;
  showNotes: boolean;
  fontSize: number;
  displayMode: "verse" | "book";
  selectedTranslation: Translation;
  // NEW: hide English line when in interlinear mode
  hideEnglishInterlinear: boolean;
  // From Home, used for cross-reference navigation
  onNavigate?: (book: string, chapter: number, verse?: number) => void;
}

type HighlightColor =
  | "yellow"
  | "blue"
  | "green"
  | "pink"
  | "purple"
  | "orange"
  | "red"
  | "cyan"
  | "gray";

type AddingNote = {
  verseId: string;
  wordIndex?: number;
  wordText?: string;
};

type RangeNote = Note & {
  startVerse?: number;
  endVerse?: number;
  noteTheme?: NoteTheme;
  crossReferences?: string;
  title?: string;
};

type SelectedStrong = {
  strongNumber: string;
  verseReference: string;
  verseText: string;
  matchText: string;
};

type StrongOccurrence = {
  verseId: string;
  reference: string;
  verseText: string;
  matchText: string;
  book: string;
  chapter: number;
  verse: number;
};

// New Testament book/chapter map for scanning
const NT_BOOK_CHAPTERS = [
  { book: "Matthew", chapters: 28 },
  { book: "Mark", chapters: 16 },
  { book: "Luke", chapters: 24 },
  { book: "John", chapters: 21 },
  { book: "Acts", chapters: 28 },
  { book: "Romans", chapters: 16 },
  { book: "1 Corinthians", chapters: 16 },
  { book: "2 Corinthians", chapters: 13 },
  { book: "Galatians", chapters: 6 },
  { book: "Ephesians", chapters: 6 },
  { book: "Philippians", chapters: 4 },
  { book: "Colossians", chapters: 4 },
  { book: "1 Thessalonians", chapters: 5 },
  { book: "2 Thessalonians", chapters: 3 },
  { book: "1 Timothy", chapters: 6 },
  { book: "2 Timothy", chapters: 4 },
  { book: "Titus", chapters: 3 },
  { book: "Philemon", chapters: 1 },
  { book: "Hebrews", chapters: 13 },
  { book: "James", chapters: 5 },
  { book: "1 Peter", chapters: 5 },
  { book: "2 Peter", chapters: 3 },
  { book: "1 John", chapters: 5 },
  { book: "2 John", chapters: 1 },
  { book: "3 John", chapters: 1 },
  { book: "Jude", chapters: 1 },
  { book: "Revelation", chapters: 22 },
];

// Theme → border accent classes (works in dark & light)
const noteThemeBorderClasses: Record<NoteTheme, string> = {
  yellow: "border-amber-500/70",
  blue: "border-sky-500/70",
  green: "border-emerald-500/70",
  purple: "border-violet-500/70",
  pink: "border-rose-500/70",
  gray: "border-slate-500/70",
};

export function BibleReader({
  book,
  chapter,
  showStrongsNumbers,
  showInterlinear,
  showNotes,
  fontSize,
  displayMode,
  selectedTranslation,
  hideEnglishInterlinear,
  onNavigate,
}: BibleReaderProps) {
  const [verses, setVerses] = useState<BibleVerseWithTokens[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<RangeNote[]>([]);
  const [addingNote, setAddingNote] = useState<AddingNote | null>(null);
  const [highlightToolbar, setHighlightToolbar] = useState<{
    show: boolean;
    position: { x: number; y: number };
    verseId: string;
    text: string;
  } | null>(null);

  const [selectedStrong, setSelectedStrong] = useState<SelectedStrong | null>(
    null
  );
  const [strongOccurrences, setStrongOccurrences] =
    useState<StrongOccurrence[]>([]);
  const [isScanningOccurrences, setIsScanningOccurrences] = useState(false);
  const [showOccurrences, setShowOccurrences] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const hasSelectedStrong = !!selectedStrong;
  const { toast } = useToast();

  // Load verses + saved highlights/notes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const loadedVerses = await getVersesByChapter(
          book,
          chapter,
          selectedTranslation
        );

        if (!cancelled) {
          setVerses(loadedVerses as BibleVerseWithTokens[]);

          const savedHighlights = localStorage.getItem("bible-highlights");
          const savedNotes = localStorage.getItem("bible-notes");

          if (savedHighlights) {
            const parsedHighlights = JSON.parse(savedHighlights);
            setHighlights(
              parsedHighlights.map((h: Highlight) => ({
                ...h,
                wordIndex:
                  typeof h.wordIndex === "string"
                    ? parseInt(h.wordIndex, 10)
                    : h.wordIndex,
              }))
            );
          }

          if (savedNotes) {
            const parsedNotes: RangeNote[] = JSON.parse(savedNotes);
            setNotes(
              parsedNotes.map((n: RangeNote) => ({
                ...n,
                wordIndex:
                  typeof n.wordIndex === "string"
                    ? parseInt(n.wordIndex, 10)
                    : n.wordIndex,
              }))
            );
          }
        }
      } catch (err) {
        console.error(err);
        toast({
          title: "Error loading verses",
          description:
            err instanceof Error
              ? err.message
              : "Failed to load Bible text.",
          variant: "destructive",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [book, chapter, selectedTranslation, toast]);

  const handleTextSelect = (verseId: string, text: string) => {
    const selection = window.getSelection();
    const trimmed = text.trim();
    if (selection && trimmed) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setHighlightToolbar({
        show: true,
        position: { x: rect.left, y: rect.top },
        verseId,
        text: trimmed,
      });
    }
  };

  const handleHighlight = (color: HighlightColor) => {
    if (!highlightToolbar) return;

    const newHighlight: Highlight = {
      id: `${highlightToolbar.verseId}-${Date.now()}`,
      verseId: highlightToolbar.verseId,
      color,
      text: highlightToolbar.text,
    };

    const updatedHighlights = [
      ...highlights.filter((h) => h.verseId !== highlightToolbar.verseId),
      newHighlight,
    ];
    setHighlights(updatedHighlights);
    localStorage.setItem("bible-highlights", JSON.stringify(updatedHighlights));
    setHighlightToolbar(null);
  };

  /**
   * Scroll to a specific verse in the current chapter.
   */
  const scrollToVerse = (verseNumber: number) => {
    if (!verseNumber) return;
    const el = document.querySelector<HTMLElement>(
      `[data-verse-number="${verseNumber}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary/60", "bg-accent/20");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary/60", "bg-accent/20");
      }, 1500);
    }
  };

  /**
   * Save a *verse-level* note.
   * If range is provided, attach that range to a single note object,
   * anchored at the first verse in the range.
   */
  const handleSaveNote = (content: string, options?: NoteSaveOptions) => {
    if (!addingNote) return;

    const baseVerse = verses.find((v) => v.id === addingNote.verseId);
    if (!baseVerse) return;

    const timestamp = Date.now();

    let startVerse = baseVerse.verse;
    let endVerse = baseVerse.verse;

    if (options?.range) {
      startVerse = Math.min(options.range.startVerse, options.range.endVerse);
      endVerse = Math.max(options.range.startVerse, options.range.endVerse);
    }

    // Anchor note to the first verse in the range
    const anchorVerse =
      verses.find(
        (v) =>
          v.book === baseVerse.book &&
          v.chapter === baseVerse.chapter &&
          v.verse === startVerse
      ) ?? baseVerse;

    const theme: NoteTheme = options?.theme ?? "yellow";

    const newNote: RangeNote = {
      id: `note-${anchorVerse.id}-${timestamp}`,
      verseId: anchorVerse.id,
      content,
      timestamp,
      wordIndex: undefined,
      wordText: undefined,
      startVerse,
      endVerse,
      noteTheme: theme,
      crossReferences: options?.crossReferences,
      title: options?.title,
    };

    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    localStorage.setItem("bible-notes", JSON.stringify(updatedNotes));
    setAddingNote(null);
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = notes.filter((n) => n.id !== noteId);
    setNotes(updatedNotes);
    localStorage.setItem("bible-notes", JSON.stringify(updatedNotes));
  };

  const handleUpdateNote = (
    noteId: string,
    content: string,
    options?: NoteSaveOptions
  ) => {
    const updatedNotes = notes.map((n) =>
      n.id === noteId
        ? {
            ...n,
            content,
            wordIndex:
              typeof n.wordIndex === "number"
                ? n.wordIndex
                : typeof n.wordIndex === "string"
                ? parseInt(n.wordIndex, 10)
                : undefined,
            noteTheme: options?.theme ?? n.noteTheme ?? "yellow",
            crossReferences:
              options?.crossReferences !== undefined
                ? options.crossReferences
                : n.crossReferences,
            title:
              options?.title !== undefined ? options.title : (n as RangeNote).title,
          }
        : n
    );
    setNotes(updatedNotes);
    localStorage.setItem("bible-notes", JSON.stringify(updatedNotes));
  };

  const handleAddWordNote = (
    verseId: string,
    wordIndex: number,
    wordText: string
  ) => {
    const normalizedIndex = Number(wordIndex);
    const existingNote = notes.find(
      (n) => n.verseId === verseId && n.wordIndex === normalizedIndex
    );
    if (existingNote) {
      setAddingNote({ verseId, wordIndex: normalizedIndex, wordText });
    } else {
      setAddingNote({ verseId, wordIndex: normalizedIndex, wordText });
    }
  };

  /**
   * Save a *word-level* note.
   */
  const handleSaveWordNote = (
    wordIndex: number,
    content: string,
    options?: NoteSaveOptions
  ) => {
    if (!addingNote) return;

    const theme: NoteTheme = options?.theme ?? "yellow";

    const existingNote = notes.find(
      (n) =>
        n.verseId === addingNote.verseId &&
        n.wordIndex === Number(wordIndex)
    );

    if (existingNote) {
      handleUpdateNote(existingNote.id, content, {
        theme,
        crossReferences: options?.crossReferences,
        title: options?.title,
      });
    } else {
      const newNote: RangeNote = {
        id: `note-${addingNote.verseId}-word-${wordIndex}-${Date.now()}`,
        verseId: addingNote.verseId,
        content,
        timestamp: Date.now(),
        wordIndex: Number(wordIndex),
        wordText: addingNote.wordText,
        noteTheme: theme,
        crossReferences: options?.crossReferences,
        title: options?.title,
      };

      const updatedNotes = [...notes, newNote];
      setNotes(updatedNotes);
      localStorage.setItem("bible-notes", JSON.stringify(updatedNotes));
      setAddingNote(null);
    }
  };

  const handleCancelWordNote = () => {
    setAddingNote(null);
  };

  const handleHighlightWord = (
    verseId: string,
    wordIndex: number,
    wordText: string,
    color: HighlightColor
  ) => {
    const existingHighlight = highlights.find(
      (h) => h.verseId === verseId && h.wordIndex === wordIndex
    );

    if (existingHighlight && existingHighlight.color === color) {
      const updatedHighlights = highlights.filter(
        (h) => !(h.verseId === verseId && h.wordIndex === wordIndex)
      );
      setHighlights(updatedHighlights);
      localStorage.setItem("bible-highlights", JSON.stringify(updatedHighlights));
    } else {
      const newHighlight: Highlight = {
        id: `${verseId}-word-${wordIndex}-${Date.now()}`,
        verseId,
        color,
        text: wordText,
        wordIndex,
        wordText,
      };

      const updatedHighlights = [
        ...highlights.filter(
          (h) => !(h.verseId === verseId && h.wordIndex === wordIndex)
        ),
        newHighlight,
      ];
      setHighlights(updatedHighlights);
      localStorage.setItem("bible-highlights", JSON.stringify(updatedHighlights));
    }
  };

  // 🔍 Scroll to a verse when you click an occurrence
  const handleJumpToOccurrence = (occ: StrongOccurrence) => {
    if (occ.book === book && occ.chapter === chapter) {
      const el = document.querySelector<HTMLElement>(
        `[data-verse-id="${occ.verseId}"]`
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary/60", "bg-accent/20");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary/60", "bg-accent/20");
        }, 1500);
      }
    } else {
      toast({
        title: "Go to verse",
        description: `Navigation to ${occ.reference} across books/chapters isn't wired up yet.`,
        variant: "default",
      });
    }
  };

  // Highlight a word inside text (for selected verse + occurrences)
  const renderHighlightedText = (verseText: string, matchText: string) => {
    if (!matchText) return verseText;

    const lowerText = verseText.toLowerCase();
    const lowerMatch = matchText.toLowerCase();
    const idx = lowerText.indexOf(lowerMatch);

    if (idx === -1) return verseText;

    const before = verseText.slice(0, idx);
    const match = verseText.slice(idx, idx + matchText.length);
    const after = verseText.slice(idx + matchText.length);

    return (
      <>
        {before}
        <span className="bg-primary/25 font-semibold rounded px-0.5">
          {match}
        </span>
        {after}
      </>
    );
  };

  // 🧠 Strong's click: toggle panel + scan NT for occurrences
  const handleStrongClick = async (verseId: string, strongNumber: string) => {
    const normalized = strongNumber.toUpperCase().trim();

    if (selectedStrong && selectedStrong.strongNumber === normalized) {
      setSelectedStrong(null);
      setStrongOccurrences([]);
      setShowOccurrences(false);
      return;
    }

    const verse = verses.find(
      (v) => v.id === verseId
    ) as BibleVerseWithTokens | undefined;
    if (!verse) return;

    const tokens = verse.tokens || [];
    let matchText = "";

    for (const token of tokens) {
      if (!token.strongs) continue;
      const strongsArray = Array.isArray(token.strongs)
        ? token.strongs
        : [token.strongs];
      if (
        strongsArray.some(
          (s) => s.toUpperCase().trim() === normalized
        )
      ) {
        matchText = token.english;
        break;
      }
    }

    setSelectedStrong({
      strongNumber: normalized,
      verseReference: `${verse.book} ${verse.chapter}:${verse.verse}`,
      verseText: verse.text,
      matchText,
    });

    setIsScanningOccurrences(true);
    setStrongOccurrences([]);
    setShowOccurrences(false);

    const allOccurrences: StrongOccurrence[] = [];

    for (const entry of NT_BOOK_CHAPTERS) {
      for (let ch = 1; ch <= entry.chapters; ch++) {
        try {
          const chapterVerses = await getVersesByChapter(
            entry.book,
            ch,
            selectedTranslation
          );

          const asTokens = chapterVerses as BibleVerseWithTokens[];

          for (const v of asTokens) {
            const verseTokens = v.tokens || [];
            verseTokens.forEach((token) => {
              if (!token.strongs) return;

              const strongsArray = Array.isArray(token.strongs)
                ? token.strongs
                : [token.strongs];

              if (
                strongsArray.some(
                  (s) => s.toUpperCase().trim() === normalized
                )
              ) {
                allOccurrences.push({
                  verseId: v.id,
                  reference: `${v.book} ${v.chapter}:${v.verse}`,
                  verseText: v.text,
                  matchText: token.english,
                  book: v.book,
                  chapter: v.chapter,
                  verse: v.verse,
                });
              }
            });
          }
        } catch (err) {
          console.warn(
            `Failed to load occurrences for ${entry.book} ${ch}:`,
            err
          );
          continue;
        }
      }
    }

    setStrongOccurrences(allOccurrences);
    setIsScanningOccurrences(false);
  };

  // Parse "John 3:16" or "1 John 4:8"
  const parseCrossReference = (
    ref: string
  ): { book: string; chapter: number; verse?: number } | null => {
    if (!ref) return null;
    const trimmed = ref.trim();

    const match = trimmed.match(/^(\d?\s?[A-Za-z]+)\s+(\d+)(?::(\d+))?/);
    if (!match) return null;

    const bookName = match[1].trim();
    const chapterNum = parseInt(match[2], 10);
    const verseNum = match[3] ? parseInt(match[3], 10) : undefined;

    if (!chapterNum || Number.isNaN(chapterNum)) return null;

    return {
      book: bookName,
      chapter: chapterNum,
      verse: verseNum,
    };
  };

  // Handle a click on a cross-reference chip in a note
  const handleCrossReferenceClick = (ref: string) => {
    const target = parseCrossReference(ref);
    if (!target) return;

    // Same book & chapter → just scroll
    if (target.book === book && target.chapter === chapter && target.verse) {
      scrollToVerse(target.verse);
      return;
    }

    // Different chapter or book → ask parent to navigate there
    if (onNavigate) {
      onNavigate(target.book, target.chapter, target.verse);

      if (target.verse) {
        setTimeout(() => {
          scrollToVerse(target.verse!);
        }, 300);
      }
    }
  };

  // Build range groups: one sticky note + one big verse block per range
  const rangeNoteMap = new Map<
    string,
    { note: RangeNote; verses: BibleVerseWithTokens[] }
  >();
  const rangeCoveredVerseIds = new Set<string>();

  for (const n of notes) {
    if (n.wordIndex !== undefined) continue;
    const rn = n as RangeNote;
    if (
      typeof rn.startVerse === "number" &&
      typeof rn.endVerse === "number" &&
      rn.endVerse > rn.startVerse
    ) {
      const anchor = verses.find((v) => v.id === rn.verseId);
      if (!anchor) continue;

      const groupVerses = verses.filter(
        (v) =>
          v.book === anchor.book &&
          v.chapter === anchor.chapter &&
          v.verse >= rn.startVerse! &&
          v.verse <= rn.endVerse!
      );

      if (groupVerses.length === 0) continue;

      rangeNoteMap.set(anchor.id, {
        note: rn,
        verses: groupVerses,
      });
      groupVerses.forEach((v) => rangeCoveredVerseIds.add(v.id));
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* HEADER */}
      <div
        className={`border-b px-6 transition-all ${
          hasSelectedStrong ? "py-4 space-y-4" : "py-3 space-y-2"
        }`}
      >
        {/* Title + Search row */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-semibold">
              {book} {chapter}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {selectedTranslation}
            </p>
          </div>

          {/* Search bar (future: book/verse + word/Strong’s search) */}
          <div className="w-full max-w-xs md:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 h-4 w-4 pointer-events-none" />
              <input
                type="text"
                className="w-full rounded-full border border-border bg-background/80 px-9 py-1.5 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Matt 5:4 or search (coming soon)…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Strong’s inline definition + selected verse + NT occurrences */}
        {hasSelectedStrong && selectedStrong && (
          <div className="pt-1 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between text-[11px] md:text-xs uppercase tracking-wide text-muted-foreground">
              <span>
                Strong&apos;s {selectedStrong.strongNumber} ·{" "}
                {selectedStrong.verseReference}
              </span>
              {isScanningOccurrences && (
                <span className="text-[11px] md:text-xs text-muted-foreground/80">
                  Scanning NT…
                </span>
              )}
            </div>

            {/* Selected verse with highlighted word */}
            <div className="rounded-xl bg-card border px-4 py-3 md:px-5 md:py-4 shadow-sm">
              <div className="text-[11px] md:text-xs font-mono text-primary/80 mb-1">
                {selectedStrong.verseReference}
              </div>
              <div className="text-sm md:text-base leading-snug">
                {renderHighlightedText(
                  selectedStrong.verseText,
                  selectedStrong.matchText
                )}
              </div>
            </div>

            {/* Definition: only visible when occurrences are HIDDEN */}
            {!showOccurrences && (
              <StrongDefinitionInline
                strongNumber={selectedStrong.strongNumber}
              />
            )}

            {/* Occurrences toggle + panel */}
            <div className="pt-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] md:text-xs text-muted-foreground">
                  New Testament occurrences:{" "}
                  {isScanningOccurrences
                    ? "scanning…"
                    : strongOccurrences.length}
                </span>

                <button
                  type="button"
                  onClick={() => setShowOccurrences((prev) => !prev)}
                  className="text-[11px] md:text-xs px-2 py-1 rounded-full border border-border hover:border-primary/60 hover:bg-accent/40 transition-colors"
                >
                  {showOccurrences ? "Close occurrences" : "Show occurrences"}
                </button>
              </div>

              {showOccurrences && (
                <div className="max-h-[58vh] overflow-y-auto space-y-2 pr-1 border-t border-border/70 pt-3 pb-2">
                  {isScanningOccurrences && (
                    <p className="text-[11px] md:text-xs text-muted-foreground">
                      Scanning New Testament for Strong&apos;s{" "}
                      {selectedStrong.strongNumber}…
                    </p>
                  )}

                  {!isScanningOccurrences &&
                    strongOccurrences.length > 0 &&
                    strongOccurrences.map((occ) => (
                      <button
                        key={`${occ.verseId}-${occ.matchText}-${occ.reference}`}
                        type="button"
                        onClick={() => handleJumpToOccurrence(occ)}
                        className="w-full text-left rounded-lg bg-card px-3 py-3 md:px-4 md:py-3 hover:bg-accent/70 hover:shadow-sm transition-colors"
                      >
                        <div className="text-[11px] md:text-xs font-mono text-primary mb-1">
                          {occ.reference}
                        </div>
                        <div className="text-sm md:text-base text-foreground/90 leading-snug">
                          {renderHighlightedText(
                            occ.verseText,
                            occ.matchText
                          )}
                        </div>
                      </button>
                    ))}

                  {!isScanningOccurrences &&
                    strongOccurrences.length === 0 && (
                      <p className="text-[11px] md:text-xs text-muted-foreground">
                        No New Testament occurrences found (or Strong&apos;s
                        tagging is missing in this dataset).
                      </p>
                    )}
                </div>
              )}
            </div>

            {/* Close Strong's */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] md:text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={() => {
                  setSelectedStrong(null);
                  setStrongOccurrences([]);
                  setShowOccurrences(false);
                }}
              >
                <ChevronDown className="h-3 w-3" />
                <span>Close Strong&apos;s</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MAIN SCROLL AREA */}
      <ScrollArea className="flex-1">
        <div
          className="max-w-5xl mx-auto px-6 py-8 pb-8"
          style={{ fontSize: `${fontSize}px` }}
        >
          {verses.map((verse) => {
            // If this verse is only part of a range and NOT the anchor, skip it
            if (
              rangeCoveredVerseIds.has(verse.id) &&
              !rangeNoteMap.has(verse.id)
            ) {
              return null;
            }

            const rangeGroup = rangeNoteMap.get(verse.id);

            if (rangeGroup) {
              // Multi-verse range group
              const groupedVerses = rangeGroup.verses;
              const rangeNote = rangeGroup.note;
              const start = rangeNote.startVerse ?? groupedVerses[0].verse;
              const end =
                rangeNote.endVerse ??
                groupedVerses[groupedVerses.length - 1].verse;

              const rangeRef =
                start === end
                  ? `${groupedVerses[0].book} ${groupedVerses[0].chapter}:${start}`
                  : `${groupedVerses[0].book} ${groupedVerses[0].chapter}:${start}-${end}`;

              const theme: NoteTheme = rangeNote.noteTheme ?? "yellow";
              const borderClass = noteThemeBorderClasses[theme];

              const groupWordNotes = notes.filter(
                (n) =>
                  n.wordIndex !== undefined &&
                  groupedVerses.some((v) => v.id === n.verseId)
              );

              return (
                <div
                  key={`range-${rangeNote.id}`}
                  className={`md:flex md:items-start md:gap-6 mb-6 rounded-lg border bg-card px-3 py-3 md:px-4 md:py-4 shadow-sm ${borderClass}`}
                >
                  {/* LEFT: all verses in the range */}
                  <div className="flex-1 space-y-2">
                    {groupedVerses.map((v) => {
                      const verseHighlight = highlights.find(
                        (h) =>
                          h.verseId === v.id && h.wordIndex === undefined
                      );
                      const wordHighlights = highlights.filter(
                        (h) => h.verseId === v.id && h.wordIndex !== undefined
                      );
                      const verseWithTokens = v as BibleVerseWithTokens;
                      const hasTokens =
                        verseWithTokens.tokens &&
                        verseWithTokens.tokens.length > 0;
                      const showWordByWord =
                        (showStrongsNumbers || showInterlinear) && hasTokens;

                      const thisWordNotes = groupWordNotes.filter(
                        (n) => n.verseId === v.id && n.wordIndex !== undefined
                      );

                      return (
                        <div
                          key={v.id}
                          data-verse-id={v.id}
                          data-verse-number={v.verse}
                          className="md:flex md:items-start md:gap-4"
                        >
                          <div className="flex-1">
                            <VerseDisplay
                              verse={v}
                              highlight={verseHighlight}
                              wordHighlights={wordHighlights}
                              showStrongsNumbers={showStrongsNumbers}
                              showInterlinear={showInterlinear}
                              hideEnglishInterlinear={hideEnglishInterlinear}
                              showNotes={showNotes}
                              displayMode={displayMode}
                              showWordByWord={showWordByWord}
                              onAddNote={() =>
                                setAddingNote({ verseId: v.id })
                              }
                              onAddWordNote={(wordIndex, wordText) =>
                                handleAddWordNote(v.id, wordIndex, wordText)
                              }
                              onSaveWordNote={(
                                wordIndex,
                                content,
                                options
                              ) =>
                                handleSaveWordNote(
                                  wordIndex,
                                  content,
                                  options
                                )
                              }
                              onCancelWordNote={handleCancelWordNote}
                              onHighlightWord={(
                                wordIndex,
                                wordText,
                                color
                              ) =>
                                handleHighlightWord(
                                  v.id,
                                  wordIndex,
                                  wordText,
                                  color as HighlightColor
                                )
                              }
                              onTextSelect={(text) =>
                                handleTextSelect(v.id, text)
                              }
                              onStrongClick={(strongNumber) =>
                                handleStrongClick(v.id, strongNumber)
                              }
                              wordNotes={thisWordNotes}
                              activeWordNote={
                                addingNote?.verseId === v.id &&
                                addingNote.wordIndex !== undefined
                                  ? {
                                      verseId: addingNote.verseId,
                                      wordIndex: addingNote.wordIndex,
                                      wordText: addingNote.wordText,
                                    }
                                  : null
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* RIGHT: sticky notes column (range note + active editor if in this group) */}
                  {showNotes && (
                    <div className="mt-3 md:mt-0 md:w-72 lg:w-80 space-y-3 md:sticky md:top-20">
                      {/* The single range note for this whole group */}
                      <NoteEditor
                        note={rangeNote}
                        verseId={rangeNote.verseId}
                        verseReference={rangeRef}
                        enableRange={false}
                        onSave={(content, opts) =>
                          handleUpdateNote(rangeNote.id, content, {
                            theme: opts?.theme,
                            crossReferences: opts?.crossReferences,
                            title: opts?.title,
                          })
                        }
                        onDelete={() => handleDeleteNote(rangeNote.id)}
                        onCancel={() => {}}
                        onCrossReferenceClick={handleCrossReferenceClick}
                      />

                      {/* Active Note Editor (if addingNote belongs to any verse in this group) */}
                      {addingNote &&
                        groupedVerses.some(
                          (v) => v.id === addingNote.verseId
                        ) && (
                          <NoteEditor
                            note={
                              addingNote.wordIndex !== undefined
                                ? (notes.find(
                                    (n) =>
                                      n.verseId === addingNote.verseId &&
                                      n.wordIndex === addingNote.wordIndex
                                  ) as RangeNote | undefined)
                                : undefined
                            }
                            verseId={addingNote.verseId}
                            verseReference={rangeRef}
                            wordText={addingNote.wordText}
                            enableRange={addingNote.wordIndex === undefined}
                            onSave={(content, opts) => {
                              if (addingNote.wordIndex !== undefined) {
                                handleSaveWordNote(
                                  addingNote.wordIndex,
                                  content,
                                  opts
                                );
                              } else {
                                handleSaveNote(content, opts);
                              }
                              setAddingNote(null);
                            }}
                            onDelete={() => {
                              if (addingNote.wordIndex !== undefined) {
                                const existingNote = notes.find(
                                  (n) =>
                                    n.verseId === addingNote.verseId &&
                                    n.wordIndex === addingNote.wordIndex
                                );
                                if (existingNote) {
                                  handleDeleteNote(existingNote.id);
                                }
                              }
                              setAddingNote(null);
                            }}
                            onCancel={() => setAddingNote(null)}
                            onCrossReferenceClick={handleCrossReferenceClick}
                          />
                        )}
                    </div>
                  )}
                </div>
              );
            }

            // Normal single-verse case
            const verseNotes = notes.filter((n) => {
              if (n.wordIndex !== undefined) return false;
              const rn = n as RangeNote;

              const anchorVerse = verses.find((v) => v.id === n.verseId);
              if (!anchorVerse) return false;

              if (
                typeof rn.startVerse === "number" &&
                typeof rn.endVerse === "number" &&
                rn.endVerse > rn.startVerse
              ) {
                return false;
              }

              return n.verseId === verse.id;
            });

            const wordNotes = notes.filter(
              (n) => n.verseId === verse.id && n.wordIndex !== undefined
            );

            const verseHighlight = highlights.find(
              (h) => h.verseId === verse.id && h.wordIndex === undefined
            );
            const wordHighlights = highlights.filter(
              (h) => h.verseId === verse.id && h.wordIndex !== undefined
            );
            const verseWithTokens = verse as BibleVerseWithTokens;
            const hasTokens =
              verseWithTokens.tokens && verseWithTokens.tokens.length > 0;
            const showWordByWord =
              (showStrongsNumbers || showInterlinear) && hasTokens;

            const verseHasNote = showNotes && verseNotes.length > 0;
            const verseTheme: NoteTheme | null = verseHasNote
              ? verseNotes[0].noteTheme ?? "yellow"
              : null;
            const verseBorderClass = verseTheme
              ? noteThemeBorderClasses[verseTheme]
              : "";

            const rowContainerClass = verseHasNote
              ? `md:flex md:items-start md:gap-6 mb-6 rounded-lg border bg-card px-3 py-3 md:px-4 md:py-4 shadow-sm ${verseBorderClass}`
              : "md:flex md:items-start md:gap-6 mb-6";

            return (
              <div
                key={verse.id}
                data-verse-id={verse.id}
                data-verse-number={verse.verse}
                className={rowContainerClass}
              >
                {/* Left: verse text */}
                <div className="flex-1">
                  <VerseDisplay
                    verse={verse}
                    highlight={verseHighlight}
                    wordHighlights={wordHighlights}
                    showStrongsNumbers={showStrongsNumbers}
                    showInterlinear={showInterlinear}
                    hideEnglishInterlinear={hideEnglishInterlinear}
                    showNotes={showNotes}
                    displayMode={displayMode}
                    showWordByWord={showWordByWord}
                    onAddNote={() => setAddingNote({ verseId: verse.id })}
                    onAddWordNote={(wordIndex, wordText) =>
                      handleAddWordNote(verse.id, wordIndex, wordText)
                    }
                    onSaveWordNote={(wordIndex, content, options) =>
                      handleSaveWordNote(wordIndex, content, options)
                    }
                    onCancelWordNote={handleCancelWordNote}
                    onHighlightWord={(wordIndex, wordText, color) =>
                      handleHighlightWord(
                        verse.id,
                        wordIndex,
                        wordText,
                        color as HighlightColor
                      )
                    }
                    onTextSelect={(text) => handleTextSelect(verse.id, text)}
                    onStrongClick={(strongNumber) =>
                      handleStrongClick(verse.id, strongNumber)
                    }
                    wordNotes={wordNotes}
                    activeWordNote={
                      addingNote?.verseId === verse.id &&
                      addingNote.wordIndex !== undefined
                        ? {
                            verseId: addingNote.verseId,
                            wordIndex: addingNote.wordIndex,
                            wordText: addingNote.wordText,
                          }
                        : null
                    }
                  />
                </div>

                {/* Right: notes column on desktop, below on mobile */}
                {showNotes && (
                  <div className="mt-3 md:mt-0 md:w-72 lg:w-80 space-y-3 md:sticky md:top-20">
                    {/* Verse-level notes */}
                    {verseNotes.map((note) => {
                      const rn = note as RangeNote;
                      const start =
                        typeof rn.startVerse === "number"
                          ? rn.startVerse
                          : verse.verse;
                      const end =
                        typeof rn.endVerse === "number"
                          ? rn.endVerse
                          : start;

                      const rangeRef =
                        start === end
                          ? `${verse.book} ${verse.chapter}:${start}`
                          : `${verse.book} ${verse.chapter}:${start}-${end}`;

                      return (
                        <NoteEditor
                          key={note.id}
                          note={note}
                          verseId={verse.id}
                          verseReference={rangeRef}
                          enableRange={false}
                          onSave={(content, opts) =>
                            handleUpdateNote(note.id, content, {
                              theme: opts?.theme,
                              crossReferences: opts?.crossReferences,
                              title: opts?.title,
                            })
                          }
                          onDelete={() => handleDeleteNote(note.id)}
                          onCancel={() => {}}
                          onCrossReferenceClick={handleCrossReferenceClick}
                        />
                      );
                    })}

                    {/* Word-level notes */}
                    {wordNotes.map((note) => (
                      <NoteEditor
                        key={note.id}
                        note={note as RangeNote}
                        verseId={verse.id}
                        verseReference={`${verse.book} ${verse.chapter}:${verse.verse}`}
                        wordText={note.wordText}
                        enableRange={false}
                        onSave={(content, opts) =>
                          handleUpdateNote(note.id, content, {
                            theme: opts?.theme,
                            crossReferences: opts?.crossReferences,
                            title: opts?.title,
                          })
                        }
                        onDelete={() => handleDeleteNote(note.id)}
                        onCancel={() => {}}
                        onCrossReferenceClick={handleCrossReferenceClick}
                      />
                    ))}

                    {/* Active Note Editor (new note) */}
                    {addingNote?.verseId === verse.id && (
                      <NoteEditor
                        note={
                          addingNote.wordIndex !== undefined
                            ? (wordNotes.find(
                                (n) => n.wordIndex === addingNote.wordIndex
                              ) as RangeNote | undefined)
                            : undefined
                        }
                        verseId={verse.id}
                        verseReference={`${verse.book} ${verse.chapter}:${verse.verse}`}
                        wordText={addingNote.wordText}
                        enableRange={addingNote.wordIndex === undefined}
                        onSave={(content, opts) => {
                          if (addingNote.wordIndex !== undefined) {
                            handleSaveWordNote(
                              addingNote.wordIndex,
                              content,
                              opts
                            );
                          } else {
                            handleSaveNote(content, opts);
                          }
                          setAddingNote(null);
                        }}
                        onDelete={() => {
                          if (addingNote.wordIndex !== undefined) {
                            const existingNote = wordNotes.find(
                              (n) => n.wordIndex === addingNote.wordIndex
                            );
                            if (existingNote) {
                              handleDeleteNote(existingNote.id);
                            }
                          }
                          setAddingNote(null);
                        }}
                        onCancel={() => setAddingNote(null)}
                        onCrossReferenceClick={handleCrossReferenceClick}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {verses.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <p>No verses available for this chapter.</p>
              <p className="text-sm mt-2">
                Try selecting a different book or chapter.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {highlightToolbar?.show && (
        <HighlightToolbar
          position={highlightToolbar.position}
          onHighlight={handleHighlight}
          onClose={() => setHighlightToolbar(null)}
        />
      )}
    </div>
  );
}
