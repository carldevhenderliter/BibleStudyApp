import { useState, useEffect } from "react";
import { BibleVerse, Highlight, Note } from "@shared/schema";
import { VerseDisplay } from "./VerseDisplay";
import { NoteEditor } from "./NoteEditor";
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

type SelectedStrong = {
  strongNumber: string;      // single Strong’s number (e.g. "G3056")
  verseReference: string;    // e.g. "John 1:1"
  verseText: string;         // full verse text
  matchText: string;         // the English word you clicked
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

export function BibleReader({
  book,
  chapter,
  showStrongsNumbers,
  showInterlinear,
  showNotes,
  fontSize,
  displayMode,
  selectedTranslation,
}: BibleReaderProps) {
  const [verses, setVerses] = useState<BibleVerseWithTokens[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
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
  const [strongOccurrences, setStrongOccurrences] = useState<StrongOccurrence[]>(
    []
  );
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
          setVerses(loadedVerses);

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
            const parsedNotes = JSON.parse(savedNotes);
            setNotes(
              parsedNotes.map((n: Note) => ({
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
    if (selection && text) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setHighlightToolbar({
        show: true,
        position: { x: rect.left, y: rect.top },
        verseId,
        text,
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

  const handleSaveNote = (content: string) => {
    if (!addingNote) return;

    const wordIndex =
      addingNote.wordIndex != null ? Number(addingNote.wordIndex) : undefined;

    const newNote: Note = {
      id: `note-${Date.now()}`,
      verseId: addingNote.verseId,
      content,
      timestamp: Date.now(),
      wordIndex,
      wordText: addingNote.wordText,
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

  const handleUpdateNote = (noteId: string, content: string) => {
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

  const handleSaveWordNote = (wordIndex: number, content: string) => {
    if (!addingNote) return;

    const existingNote = notes.find(
      (n) =>
        n.verseId === addingNote.verseId &&
        n.wordIndex === Number(wordIndex)
    );
    if (existingNote) {
      handleUpdateNote(existingNote.id, content);
    } else {
      handleSaveNote(content);
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

  // 🧠 Handle Strong's click: toggle panel + scan NT for occurrences
  const handleStrongClick = async (verseId: string, strongNumber: string) => {
    const normalized = strongNumber.toUpperCase().trim();

    // If you click the same Strong's again, close it
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

          {/* Sleek search bar (future: book/verse + word/Strong’s search) */}
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
            <div className="rounded-xl bg-background/95 border px-4 py-3 md:px-5 md:py-4 shadow-sm">
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

            {/* Definition (bigger font now) */}
            <StrongDefinitionInline strongNumber={selectedStrong.strongNumber} />

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
                  {showOccurrences ? "Hide occurrences" : "Show occurrences"}
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
                        className="w-full text-left rounded-lg bg-background/80 px-3 py-3 md:px-4 md:py-3 hover:bg-accent/70 hover:shadow-sm transition-colors"
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
          className="max-w-3xl mx-auto px-6 py-8 pb-24"
          style={{ fontSize: `${fontSize}px` }}
        >
          {verses.map((verse) => {
            const verseNotes = notes.filter(
              (n) => n.verseId === verse.id && n.wordIndex === undefined
            );
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

            return (
              <div key={verse.id}>
                <VerseDisplay
                  verse={verse}
                  highlight={verseHighlight}
                  wordHighlights={wordHighlights}
                  showStrongsNumbers={showStrongsNumbers}
                  showInterlinear={showInterlinear}
                  showNotes={showNotes}
                  displayMode={displayMode}
                  showWordByWord={showWordByWord}
                  onAddNote={() => setAddingNote({ verseId: verse.id })}
                  onAddWordNote={(wordIndex, wordText) =>
                    handleAddWordNote(verse.id, wordIndex, wordText)
                  }
                  onSaveWordNote={handleSaveWordNote}
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

                {/* Verse-level notes */}
                {showNotes &&
                  verseNotes.map((note) => (
                    <NoteEditor
                      key={note.id}
                      note={note}
                      verseId={verse.id}
                      verseReference={`${verse.book} ${verse.chapter}:${verse.verse}`}
                      onSave={(content) => handleUpdateNote(note.id, content)}
                      onDelete={() => handleDeleteNote(note.id)}
                      onCancel={() => {}}
                    />
                  ))}

                {/* Word-level notes */}
                {showNotes &&
                  wordNotes.map((note) => (
                    <NoteEditor
                      key={note.id}
                      note={note}
                      verseId={verse.id}
                      verseReference={`${verse.book} ${verse.chapter}:${verse.verse}`}
                      wordText={note.wordText}
                      onSave={(content) => handleUpdateNote(note.id, content)}
                      onDelete={() => handleDeleteNote(note.id)}
                      onCancel={() => {}}
                    />
                  ))}

                {/* Active Note Editor */}
                {addingNote?.verseId === verse.id && (
                  <NoteEditor
                    note={
                      addingNote.wordIndex !== undefined
                        ? wordNotes.find(
                            (n) => n.wordIndex === addingNote.wordIndex
                          )
                        : undefined
                    }
                    verseId={verse.id}
                    verseReference={`${verse.book} ${verse.chapter}:${verse.verse}`}
                    wordText={addingNote.wordText}
                    onSave={(content) => {
                      if (addingNote.wordIndex !== undefined) {
                        const existingNote = wordNotes.find(
                          (n) => n.wordIndex === addingNote.wordIndex
                        );
                        if (existingNote) {
                          handleUpdateNote(existingNote.id, content);
                        } else {
                          handleSaveNote(content);
                        }
                      } else {
                        handleSaveNote(content);
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
                  />
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
