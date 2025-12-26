import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  bibleBooks,
} from "@/lib/bibleData";
import { useToast } from "@/hooks/use-toast";
import { Search, ChevronDown } from "lucide-react";

interface BibleReaderProps {
  book: string;
  chapter: number;
  showStrongsNumbers: boolean;
  showInterlinear: boolean;
  showStrongsEnglishOnly: boolean; // 🔹 new
  hideAllEnglish: boolean;
  showNotes: boolean;
  inkEnabled: boolean;
  onToggleInkEnabled: (value: boolean) => void;
  fontSize: number;
  fontFamily: "serif" | "sans" | "mono" | "gentium";
  displayMode: "verse" | "book";
  selectedTranslation: Translation;
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

type Notebook = {
  id: string;
  name: string;
  createdAt: number;
};

type InkTool = "pen" | "highlighter";

type InkPoint = {
  x: number;
  y: number;
  pressure?: number;
};

type InkStroke = {
  id: string;
  tool: InkTool;
  color: string;
  baseWidth: number;
  alpha: number;
  points: InkPoint[];
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

const normalizeBook = (name: string) =>
  name.replace(/[^a-z0-9]/gi, "").toLowerCase();

const findBookName = (raw: string) => {
  const target = normalizeBook(raw);
  return (
    bibleBooks.find(({ name }) =>
      normalizeBook(name).startsWith(target)
    )?.name || null
  );
};

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
  showStrongsEnglishOnly,
  hideAllEnglish,
  showNotes,
  inkEnabled,
  onToggleInkEnabled,
  fontSize,
  fontFamily,
  displayMode,
  selectedTranslation,
  onNavigate,
}: BibleReaderProps) {
  const [verses, setVerses] = useState<BibleVerseWithTokens[]>([]);
  const [chapterStack, setChapterStack] = useState<
    { chapter: number; verses: BibleVerseWithTokens[] }[]
  >([]);
  const [isLoadingPrevChapter, setIsLoadingPrevChapter] = useState(false);
  const [isLoadingNextChapter, setIsLoadingNextChapter] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [notesByNotebook, setNotesByNotebook] = useState<
    Record<string, RangeNote[]>
  >({});
  const [addingNote, setAddingNote] = useState<AddingNote | null>(null);
  const [activeNotesVerseId, setActiveNotesVerseId] = useState<string | null>(
    null
  );
  const [inkTool, setInkTool] = useState<InkTool>("pen");
  const [inkColor, setInkColor] = useState("#facc15");
  const [inkStrokes, setInkStrokes] = useState<InkStroke[]>([]);
  const [highlightToolbar, setHighlightToolbar] = useState<{
    show: boolean;
    position: { x: number; y: number };
    verseId: string;
    text: string;
  } | null>(null);

  const [selectedStrong, setSelectedStrong] = useState<SelectedStrong | null>(
    null
  );
  const [activeStrongNumber, setActiveStrongNumber] = useState<string>();
  const [strongOccurrences, setStrongOccurrences] =
    useState<StrongOccurrence[]>([]);
  const [isScanningOccurrences, setIsScanningOccurrences] = useState(false);
  const [showOccurrences, setShowOccurrences] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPreview, setSearchPreview] = useState<{
    ref: string;
    text: string;
  } | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<
    { label: string; value: string }[]
  >([]);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const inkStrokesRef = useRef<InkStroke[]>([]);
  const rafRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);

  const hasSelectedStrong = !!selectedStrong;
  const { toast } = useToast();
  const notebookStorageKey = "bible-notebooks";
  const legacyNotesKey = "bible-notes";
  const inkStorageKey = "bible-ink";
  const chapterCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    bibleBooks.forEach(({ name, chapters }) => {
      map[name] = chapters;
    });
    return map;
  }, []);

  const activeNotes = useMemo(() => {
    if (!activeNotebookId) return [];
    return notesByNotebook[activeNotebookId] ?? [];
  }, [activeNotebookId, notesByNotebook]);

  const setActiveNotes = useCallback(
    (nextNotes: RangeNote[]) => {
      if (!activeNotebookId) return;
      setNotesByNotebook((prev) => ({
        ...prev,
        [activeNotebookId]: nextNotes,
      }));
    },
    [activeNotebookId]
  );

  const chapterKey = useMemo(() => `${book}::${chapter}`, [book, chapter]);
  const inkToolSettings = useMemo(
    () => ({
      pen: { baseWidth: 2.5, alpha: 1 },
      highlighter: { baseWidth: 14, alpha: 0.35 },
    }),
    []
  );
  const inkColors = useMemo(
    () => [
      { name: "Yellow", value: "#facc15" },
      { name: "Pink", value: "#f472b6" },
      { name: "Blue", value: "#60a5fa" },
      { name: "Green", value: "#34d399" },
      { name: "Orange", value: "#fb923c" },
      { name: "Purple", value: "#a78bfa" },
    ],
    []
  );

  const handleCreateNotebook = useCallback(() => {
    if (typeof window === "undefined") return;
    const name = window.prompt("Notebook name");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `notebook-${Date.now()}`;
    const nextNotebook: Notebook = {
      id,
      name: trimmed,
      createdAt: Date.now(),
    };
    setNotebooks((prev) => [...prev, nextNotebook]);
    setNotesByNotebook((prev) => ({ ...prev, [id]: [] }));
    setActiveNotebookId(id);
  }, []);

  const handleRenameNotebook = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!activeNotebookId) return;
    const current = notebooks.find((n) => n.id === activeNotebookId);
    const name = window.prompt("Rename notebook", current?.name ?? "");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setNotebooks((prev) =>
      prev.map((n) => (n.id === activeNotebookId ? { ...n, name: trimmed } : n))
    );
  }, [activeNotebookId, notebooks]);

  const redrawInk = useCallback(() => {
    const canvas = inkCanvasRef.current;
    const vp = scrollViewportRef.current;
    if (!canvas || !vp) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const scrollTop = vp.scrollTop;
    for (const stroke of inkStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.globalAlpha = stroke.alpha;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.baseWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      stroke.points.forEach((pt, idx) => {
        const x = pt.x;
        const y = pt.y - scrollTop;
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [inkStrokes]);

  const drawStrokeSegment = useCallback((stroke: InkStroke) => {
    const canvas = inkCanvasRef.current;
    const vp = scrollViewportRef.current;
    if (!canvas || !vp) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (stroke.points.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = stroke.alpha;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.baseWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const lastIndex = stroke.points.length - 1;
    const prev = stroke.points[lastIndex - 1];
    const curr = stroke.points[lastIndex];
    const scrollTop = vp.scrollTop;

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y - scrollTop);
    ctx.lineTo(curr.x, curr.y - scrollTop);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, []);

  const handleClearInk = useCallback(() => {
    inkStrokesRef.current = [];
    setInkStrokes([]);
    redrawInk();
  }, [redrawInk]);

  const resizeInkCanvas = useCallback(() => {
    const canvas = inkCanvasRef.current;
    const vp = scrollViewportRef.current;
    if (!canvas || !vp) return;
    const dpr = window.devicePixelRatio || 1;
    const width = vp.clientWidth;
    const height = vp.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    redrawInk();
  }, [redrawInk]);

  const flattenChapters = useCallback(
    (stack: { chapter: number; verses: BibleVerseWithTokens[] }[]) =>
      stack.flatMap((c) => c.verses),
    []
  );

  const findFirstStrongOccurrence = useCallback(
    async (strongCode: string) => {
      const target = strongCode.toUpperCase();
      for (const { name: bookName, chapters } of bibleBooks) {
        for (let ch = 1; ch <= chapters; ch++) {
          try {
            const vs = (await getVersesByChapter(
              bookName,
              ch,
              selectedTranslation
            )) as BibleVerseWithTokens[];
            for (const v of vs) {
              const tokens = v.tokens || [];
              for (const token of tokens) {
                if (!token.strongs) continue;
                const vals = Array.isArray(token.strongs)
                  ? token.strongs
                  : [token.strongs];
                const hit = vals.some(
                  (s) => (s || "").toString().toUpperCase() === target
                );
                if (hit) {
                  return {
                    book: v.book,
                    chapter: v.chapter,
                    verse: v.verse,
                    text: v.text,
                    match: token.english,
                  };
                }
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
      return null;
    },
    [selectedTranslation]
  );

  // Build autocomplete suggestions for refs like "John", "John 3", "Matt 5:"
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchSuggestions([]);
      setSearchPreview(null);
      return;
    }

    const refMatch = q.match(/^([1-3]?\s*[A-Za-z]+)?\s*(\d*)/i);
    const bookPart = refMatch?.[1]?.trim() || "";
    const chapPart = refMatch?.[2] ? parseInt(refMatch[2], 10) : NaN;

    const candidates = bibleBooks.filter(({ name }) =>
      normalizeBook(name).startsWith(normalizeBook(bookPart || q))
    );

    const suggestions: { label: string; value: string }[] = [];

    candidates.slice(0, 5).forEach(({ name: book, chapters }) => {
      // Base book suggestion
      suggestions.push({ label: book, value: book });

      if (!Number.isNaN(chapPart) && chapPart > 0) {
        const start = Math.max(1, chapPart);
        for (
          let c = start;
          c <= Math.min(chapters, start + 4) && c <= chapters;
          c++
        ) {
          suggestions.push({
            label: `${book} ${c}`,
            value: `${book} ${c}`,
          });
        }
      }
    });

    setSearchSuggestions(suggestions);
  }, [searchQuery]);

  // Live verse preview below search
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const q = searchQuery.trim();
      if (!q) {
        setSearchPreview(null);
        return;
      }

      // Strong's preview
      const strongMatch = q.match(/^#\s*([gh])\s*0*([0-9]+)$/i);
      if (strongMatch) {
        const prefix = strongMatch[1].toUpperCase();
        const num = strongMatch[2];
        try {
          const occ = await findFirstStrongOccurrence(`${prefix}${num}`);
          if (occ) {
            setSearchPreview({
              ref: `Strong's ${prefix}${num} · ${occ.book} ${occ.chapter}:${occ.verse}`,
              text: occ.text,
            });
          } else {
            setSearchPreview({
              ref: `Strong's ${prefix}${num}`,
              text: "No occurrence found.",
            });
          }
        } catch (e) {
          setSearchPreview({
            ref: `Strong's ${prefix}${num}`,
            text: "No occurrence found.",
          });
        }
        return;
      }

      const match = q.match(/^([1-3]?\s*[A-Za-z]+)\s+(\d+)(?::(\d+))?$/i);
      if (!match) {
        setSearchPreview(null);
        return;
      }

      const [, bookRaw, chapterStr, verseStr] = match;
      const bookName = findBookName(bookRaw);
      if (!bookName) {
        setSearchPreview(null);
        return;
      }

      const chapterNum = parseInt(chapterStr, 10);
      const verseNum = verseStr ? parseInt(verseStr, 10) : undefined;
      try {
        const vs = (await getVersesByChapter(
          bookName,
          chapterNum,
          selectedTranslation
        )) as BibleVerseWithTokens[];
        const target = verseNum
          ? vs.find((v) => v.verse === verseNum)
          : vs[0];
        if (!cancelled) {
          setSearchPreview(
            target
              ? {
                  ref: `${bookName} ${chapterNum}${
                    verseNum ? `:${verseNum}` : ""
                  }`,
                  text: target.text,
                }
              : {
                  ref: `${bookName} ${chapterNum}${
                    verseNum ? `:${verseNum}` : ""
                  }`,
                  text: "No preview available for that verse.",
                }
          );
        }
      } catch (e) {
        if (!cancelled) setSearchPreview(null);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [searchQuery, selectedTranslation, findFirstStrongOccurrence]);

  const loadNextChapter = useCallback(async () => {
    if (isLoadingNextChapter) return;
    if (!chapterStack.length) return;

    const lastChapter = chapterStack[chapterStack.length - 1].chapter;
    const maxChapter = chapterCountMap[book];
    if (maxChapter && lastChapter >= maxChapter) return;

    const nextChapter = lastChapter + 1;
    setIsLoadingNextChapter(true);
    try {
      const nextVerses = await getVersesByChapter(
        book,
        nextChapter,
        selectedTranslation
      );
      setChapterStack((prev) => {
        if (prev.some((c) => c.chapter === nextChapter)) return prev;
        const updated = [...prev, { chapter: nextChapter, verses: nextVerses as BibleVerseWithTokens[] }];
        setVerses(flattenChapters(updated));
        return updated;
      });
    } finally {
      setIsLoadingNextChapter(false);
    }
  }, [book, chapterStack, chapterCountMap, flattenChapters, isLoadingNextChapter, selectedTranslation]);

  const loadPrevChapter = useCallback(async () => {
    if (isLoadingPrevChapter) return;
    if (!chapterStack.length) return;

    const firstChapter = chapterStack[0].chapter;
    if (firstChapter <= 1) return;

    const viewport = scrollViewportRef.current;
    const prevScrollTop = viewport?.scrollTop ?? 0;
    const prevHeight = viewport?.scrollHeight ?? 0;

    const prevChapter = firstChapter - 1;
    setIsLoadingPrevChapter(true);
    try {
      const prevVerses = await getVersesByChapter(
        book,
        prevChapter,
        selectedTranslation
      );
      setChapterStack((prev) => {
        if (prev.some((c) => c.chapter === prevChapter)) return prev;
        const updated = [
          { chapter: prevChapter, verses: prevVerses as BibleVerseWithTokens[] },
          ...prev,
        ];
        setVerses(flattenChapters(updated));

        // Maintain scroll position so content doesn't jump when prepending.
        requestAnimationFrame(() => {
          const vp = scrollViewportRef.current;
          if (!vp) return;
          const newHeight = vp.scrollHeight;
          const delta = newHeight - prevHeight;
          vp.scrollTop = prevScrollTop + delta;
        });

        return updated;
      });
    } finally {
      setIsLoadingPrevChapter(false);
    }
  }, [book, chapterStack, flattenChapters, isLoadingPrevChapter, selectedTranslation]);

  const updateActiveVerseFromScroll = useCallback(() => {
    const vp = scrollViewportRef.current;
    if (!vp) return;

    const viewportRect = vp.getBoundingClientRect();
    const verseElements = Array.from(
      vp.querySelectorAll<HTMLElement>("[data-verse-id]")
    );

    let bestId: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const el of verseElements) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom <= viewportRect.top || rect.top >= viewportRect.bottom) {
        continue;
      }
      const distance = Math.abs(rect.top - viewportRect.top);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestId = el.getAttribute("data-verse-id");
      }
    }

    if (bestId && bestId !== activeNotesVerseId) {
      setActiveNotesVerseId(bestId);
    }
  }, [activeNotesVerseId]);

  const handleScroll = useCallback(() => {
    const vp = scrollViewportRef.current;
    if (!vp) return;

    const threshold = 200;
    if (!isLoadingNextChapter && vp.scrollTop + vp.clientHeight > vp.scrollHeight - threshold) {
      void loadNextChapter();
    }
    if (!isLoadingPrevChapter && vp.scrollTop < threshold) {
      void loadPrevChapter();
    }
    updateActiveVerseFromScroll();
    if (inkEnabled) {
      if (scrollRafRef.current === null) {
        scrollRafRef.current = window.requestAnimationFrame(() => {
          scrollRafRef.current = null;
          redrawInk();
        });
      }
    }
  }, [
    isLoadingNextChapter,
    isLoadingPrevChapter,
    loadNextChapter,
    loadPrevChapter,
    inkEnabled,
    redrawInk,
    updateActiveVerseFromScroll,
  ]);

  useEffect(() => {
    updateActiveVerseFromScroll();
  }, [verses, updateActiveVerseFromScroll]);

  useEffect(() => {
    if (addingNote?.verseId) {
      setActiveNotesVerseId(addingNote.verseId);
    }
  }, [addingNote?.verseId]);

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
          const initialStack = [
            {
              chapter,
              verses: loadedVerses as BibleVerseWithTokens[],
            },
          ];
          setChapterStack(initialStack);
          setVerses(initialStack.flatMap((c) => c.verses));

          const savedHighlights = localStorage.getItem("bible-highlights");
          const savedNotebookState = localStorage.getItem(notebookStorageKey);
          const legacyNotes = localStorage.getItem(legacyNotesKey);

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

          if (savedNotebookState) {
            const parsed = JSON.parse(savedNotebookState) as {
              notebooks?: Notebook[];
              activeNotebookId?: string;
              notesByNotebook?: Record<string, RangeNote[]>;
            };
            const loadedNotebooks = parsed.notebooks ?? [];
            const loadedNotes = parsed.notesByNotebook ?? {};
            const activeId =
              parsed.activeNotebookId ??
              (loadedNotebooks[0]?.id ?? null);

            setNotebooks(loadedNotebooks);
            setNotesByNotebook(loadedNotes);
            setActiveNotebookId(activeId);
          } else {
            const defaultNotebook: Notebook = {
              id: `notebook-${Date.now()}`,
              name: "My Notes",
              createdAt: Date.now(),
            };
            const migratedNotes = legacyNotes
              ? (JSON.parse(legacyNotes) as RangeNote[]).map((n: RangeNote) => ({
                  ...n,
                  wordIndex:
                    typeof n.wordIndex === "string"
                      ? parseInt(n.wordIndex, 10)
                      : n.wordIndex,
                }))
              : [];

            setNotebooks([defaultNotebook]);
            setNotesByNotebook({ [defaultNotebook.id]: migratedNotes });
            setActiveNotebookId(defaultNotebook.id);
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
  }, [book, chapter, selectedTranslation, toast, displayMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        notebookStorageKey,
        JSON.stringify({
          notebooks,
          activeNotebookId,
          notesByNotebook,
        })
      );
    } catch (e) {
      console.warn("Failed to save notebook state", e);
    }
  }, [activeNotebookId, notebooks, notesByNotebook, notebookStorageKey]);

  useEffect(() => {
    if (!notebooks.length) return;
    if (activeNotebookId && notebooks.some((n) => n.id === activeNotebookId)) {
      return;
    }
    setActiveNotebookId(notebooks[0].id);
  }, [activeNotebookId, notebooks]);

  useEffect(() => {
    setAddingNote(null);
  }, [activeNotebookId]);

  useEffect(() => {
    if (!activeNotebookId) {
      setInkStrokes([]);
      inkStrokesRef.current = [];
      return;
    }
    try {
      const raw = localStorage.getItem(inkStorageKey);
      if (!raw) {
        setInkStrokes([]);
        inkStrokesRef.current = [];
        return;
      }
      const parsed = JSON.parse(raw) as Record<
        string,
        Record<string, InkStroke[]>
      >;
      const next = parsed?.[activeNotebookId]?.[chapterKey] ?? [];
      setInkStrokes(next);
      inkStrokesRef.current = next;
    } catch (e) {
      console.warn("Failed to load ink strokes", e);
      setInkStrokes([]);
      inkStrokesRef.current = [];
    }
  }, [activeNotebookId, chapterKey, inkStorageKey]);

  useEffect(() => {
    if (!activeNotebookId) return;
    try {
      const raw = localStorage.getItem(inkStorageKey);
      const parsed = raw
        ? (JSON.parse(raw) as Record<string, Record<string, InkStroke[]>>)
        : {};
      const next = {
        ...parsed,
        [activeNotebookId]: {
          ...(parsed[activeNotebookId] ?? {}),
          [chapterKey]: inkStrokesRef.current,
        },
      };
      localStorage.setItem(inkStorageKey, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save ink strokes", e);
    }
  }, [activeNotebookId, chapterKey, inkStorageKey]);

  useEffect(() => {
    resizeInkCanvas();
  }, [resizeInkCanvas]);

  useEffect(() => {
    const handleResize = () => resizeInkCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resizeInkCanvas]);

  useEffect(() => {
    inkStrokesRef.current = inkStrokes;
    if (!isDrawingRef.current) {
      redrawInk();
    }
  }, [inkStrokes, redrawInk]);

  const scrollToVerse = useCallback((verseNumber: number) => {
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
  }, []);

  // Apply any pending Strong's navigation after verses load
  useEffect(() => {
    if (!verses.length) return;
    if (typeof window === "undefined") return;
    const pending = localStorage.getItem("pending-strong-nav");
    if (!pending) return;
    try {
      const parsed = JSON.parse(pending);
      if (
        parsed.book === book &&
        parsed.chapter === chapter &&
        parsed.strongCode
      ) {
        setActiveStrongNumber(parsed.strongCode.toUpperCase());
        if (parsed.verse) {
          scrollToVerse(parsed.verse);
        }
      }
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem("pending-strong-nav");
    }
  }, [verses, book, chapter, scrollToVerse]);

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

  const handleSearchSubmit = useCallback(
    async (query: string) => {
      const cleaned = query.trim();
      if (!cleaned) return;

      // Strong's search: "#g1234" or "#h052"
      const strongMatch = cleaned.match(/^#\s*([gh])\s*0*([0-9]+)$/i);
      if (strongMatch) {
        const prefix = strongMatch[1].toUpperCase();
        const num = strongMatch[2];
        const strongCode = `${prefix}${num}`;
        setSearchQuery("");

        const occurrence = await findFirstStrongOccurrence(strongCode);
        if (occurrence) {
          if (
            occurrence.book === book &&
            occurrence.chapter === chapter
          ) {
            setActiveStrongNumber(strongCode);
            if (occurrence.verse) {
              scrollToVerse(occurrence.verse);
            }
          } else {
            try {
              localStorage.setItem(
                "pending-strong-nav",
                JSON.stringify({
                  book: occurrence.book,
                  chapter: occurrence.chapter,
                  verse: occurrence.verse,
                  strongCode,
                })
              );
            } catch (_) {
              // ignore
            }
            onNavigate?.(
              occurrence.book,
              occurrence.chapter,
              occurrence.verse
            );
          }
        } else {
          toast({
            title: `Strong's ${strongCode} not found`,
            variant: "default",
          });
        }
        return;
      }

      const match = cleaned.match(/^([1-3]?\s*[A-Za-z]+)\s+(\d+)(?::(\d+))?$/i);
      if (!match) {
        toast({
          title: "Try a reference like 'John 3' or 'Matt 5:9'",
          variant: "default",
        });
        return;
      }

      const [, bookRaw, chapterStr, verseStr] = match;
      const bookName = findBookName(bookRaw);
      if (!bookName) {
        toast({
          title: "Book not found",
          description: "Use names like John, Matthew, Romans, etc.",
          variant: "destructive",
        });
        return;
      }

      const chapterNum = parseInt(chapterStr, 10);
      const verseNum = verseStr ? parseInt(verseStr, 10) : undefined;

      setSearchQuery("");

      if (bookName === book && chapterNum === chapter) {
        if (verseNum) {
          scrollToVerse(verseNum);
        }
      } else {
        onNavigate?.(bookName, chapterNum, verseNum);
      }
    },
    [book, chapter, onNavigate, scrollToVerse, toast, findFirstStrongOccurrence]
  );

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

    const updatedNotes = [...activeNotes, newNote];
    setActiveNotes(updatedNotes);
    setAddingNote(null);
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = activeNotes.filter((n) => n.id !== noteId);
    setActiveNotes(updatedNotes);
  };

  const handleUpdateNote = (
    noteId: string,
    content: string,
    options?: NoteSaveOptions
  ) => {
    const updatedNotes = activeNotes.map((n) =>
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
    setActiveNotes(updatedNotes);
  };

  const handleAddWordNote = (
    verseId: string,
    wordIndex: number,
    wordText: string
  ) => {
    const normalizedIndex = Number(wordIndex);
    const existingNote = activeNotes.find(
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
   * These always apply to a single verse, no range,
   * but still can have theme + crossReferences + title.
   */
  const handleSaveWordNote = (
    wordIndex: number,
    content: string,
    options?: NoteSaveOptions
  ) => {
    if (!addingNote) return;

    const theme: NoteTheme = options?.theme ?? "yellow";

    const existingNote = activeNotes.find(
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

      const updatedNotes = [...activeNotes, newNote];
      setActiveNotes(updatedNotes);
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

  const getInkPointFromEvent = (event: PointerEvent) => {
    const canvas = inkCanvasRef.current;
    const vp = scrollViewportRef.current;
    if (!canvas || !vp) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top + vp.scrollTop,
      pressure: event.pressure,
    };
  };

  const startInkStroke = (point: InkPoint) => {
    const settings = inkToolSettings[inkTool];
    const stroke: InkStroke = {
      id: `ink-${Date.now()}`,
      tool: inkTool,
      color: inkColor,
      baseWidth: settings.baseWidth,
      alpha: settings.alpha,
      points: [point],
    };
    activeStrokeRef.current = stroke;
    isDrawingRef.current = true;
    inkStrokesRef.current = [...inkStrokesRef.current, stroke];
    setInkStrokes(inkStrokesRef.current);
  };

  const appendInkPoint = (point: InkPoint) => {
    const strokes = inkStrokesRef.current;
    if (!strokes.length) return;
    const lastIndex = strokes.length - 1;
    const last = strokes[lastIndex];
    if (activeStrokeRef.current?.id !== last.id) return;
    const updated = {
      ...last,
      points: [...last.points, point],
    };
    strokes[lastIndex] = updated;
    inkStrokesRef.current = strokes;
    activeStrokeRef.current = updated;
    drawStrokeSegment(updated);
    if (rafRef.current === null) {
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        setInkStrokes([...inkStrokesRef.current]);
      });
    }
  };

  const endInkStroke = () => {
    isDrawingRef.current = false;
    activeStrokeRef.current = null;
  };

  const isInkPointerEvent = (event: PointerEvent) => {
    if (event.pointerType === "pen") return true;
    if (event.pointerType !== "touch") return false;
    const hasPressure = typeof event.pressure === "number" && event.pressure > 0.1;
    const narrowTip =
      typeof event.width === "number" &&
      typeof event.height === "number" &&
      event.width <= 8 &&
      event.height <= 8;
    return hasPressure || narrowTip;
  };

  const handleInkPointerDown = (event: PointerEvent) => {
    if (!inkEnabled) return;
    if (!isInkPointerEvent(event)) return;
    const point = getInkPointFromEvent(event);
    if (!point) return;
    startInkStroke(point);
  };

  const handleInkPointerMove = (event: PointerEvent) => {
    if (!inkEnabled || !isDrawingRef.current) return;
    if (!isInkPointerEvent(event)) return;
    const point = getInkPointFromEvent(event);
    if (!point) return;
    appendInkPoint(point);
  };

  const handleInkPointerUp = (event: PointerEvent) => {
    if (!inkEnabled) return;
    if (!isInkPointerEvent(event)) return;
    endInkStroke();
  };

  useEffect(() => {
    const vp = scrollViewportRef.current;
    if (!vp) return;

    const onPointerDown = (event: PointerEvent) => handleInkPointerDown(event);
    const onPointerMove = (event: PointerEvent) => handleInkPointerMove(event);
    const onPointerUp = (event: PointerEvent) => handleInkPointerUp(event);

    vp.addEventListener("pointerdown", onPointerDown);
    vp.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      vp.removeEventListener("pointerdown", onPointerDown);
      vp.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [handleInkPointerDown, handleInkPointerMove, handleInkPointerUp]);

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

    // If you click the same Strong's again, close it
    if (selectedStrong && selectedStrong.strongNumber === normalized) {
      setSelectedStrong(null);
      setStrongOccurrences([]);
      setShowOccurrences(false);
      setActiveStrongNumber(undefined);
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
    setActiveStrongNumber(normalized);

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

  for (const n of activeNotes) {
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

  const panelVerseId = addingNote?.verseId ?? activeNotesVerseId;
  const verseById = useMemo(() => {
    const map = new Map<string, BibleVerseWithTokens>();
    verses.forEach((v) => map.set(v.id, v));
    return map;
  }, [verses]);

  const rangeGroups = useMemo(
    () => Array.from(rangeNoteMap.values()),
    [rangeNoteMap]
  );

  const rangeGroupForPanel = useMemo(() => {
    if (!panelVerseId) return null;
    return (
      rangeGroups.find((group) =>
        group.verses.some((v) => v.id === panelVerseId)
      ) ?? null
    );
  }, [panelVerseId, rangeGroups]);

  const rangeNoteForPanel = rangeGroupForPanel?.note ?? null;
  const rangeRefForPanel = useMemo(() => {
    if (!rangeGroupForPanel) return null;
    const { verses: groupVerses, note } = rangeGroupForPanel;
    const start = note.startVerse ?? groupVerses[0]?.verse ?? 1;
    const end =
      note.endVerse ?? groupVerses[groupVerses.length - 1]?.verse ?? start;
    const bookName = groupVerses[0]?.book ?? "";
    const chapterNum = groupVerses[0]?.chapter ?? 0;
    return start === end
      ? `${bookName} ${chapterNum}:${start}`
      : `${bookName} ${chapterNum}:${start}-${end}`;
  }, [rangeGroupForPanel]);

  const verseNotesForPanel = useMemo(() => {
    if (!panelVerseId) return [];
    return activeNotes.filter((n) => {
      if (n.wordIndex !== undefined) return false;
      if (rangeNoteForPanel && n.id === rangeNoteForPanel.id) return false;
      return n.verseId === panelVerseId;
    });
  }, [activeNotes, panelVerseId, rangeNoteForPanel]);

  const wordNotesForPanel = useMemo(() => {
    if (!panelVerseId) return [];
    return activeNotes.filter(
      (n) => n.wordIndex !== undefined && n.verseId === panelVerseId
    );
  }, [activeNotes, panelVerseId]);

  const panelVerse = panelVerseId ? verseById.get(panelVerseId) ?? null : null;
  const panelVerseRef = panelVerse
    ? `${panelVerse.book} ${panelVerse.chapter}:${panelVerse.verse}`
    : "";

  const getVerseNoteRef = (note: RangeNote) => {
    if (!panelVerse) return "";
    const start =
      typeof note.startVerse === "number" ? note.startVerse : panelVerse.verse;
    const end =
      typeof note.endVerse === "number" ? note.endVerse : start;
    return start === end
      ? `${panelVerse.book} ${panelVerse.chapter}:${start}`
      : `${panelVerse.book} ${panelVerse.chapter}:${start}-${end}`;
  };

  const hasPanelNotes =
    !!rangeNoteForPanel ||
    verseNotesForPanel.length > 0 ||
    wordNotesForPanel.length > 0 ||
    (!!addingNote && addingNote.verseId === panelVerseId);

  return (
    <div className="h-full min-h-0 flex flex-col">
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
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:justify-end">
            {showNotes && (
              <div className="flex items-center gap-2">
                <select
                  className="min-w-[180px] rounded-md border border-border bg-background px-2 py-1 text-xs md:text-sm"
                  value={activeNotebookId ?? ""}
                  onChange={(e) => setActiveNotebookId(e.target.value)}
                >
                  {notebooks.length === 0 && (
                    <option value="" disabled>
                      No notebooks
                    </option>
                  )}
                  {notebooks.map((notebook) => (
                    <option key={notebook.id} value={notebook.id}>
                      {notebook.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="text-xs md:text-sm px-2 py-1 rounded-md border border-border hover:border-primary/60 hover:bg-accent/40 transition-colors"
                  onClick={handleRenameNotebook}
                  disabled={!activeNotebookId}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="text-xs md:text-sm px-2 py-1 rounded-md border border-border hover:border-primary/60 hover:bg-accent/40 transition-colors"
                  onClick={handleCreateNotebook}
                >
                  New
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`text-xs md:text-sm px-2 py-1 rounded-md border transition-colors ${
                  inkEnabled
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/60 hover:bg-accent/40"
                }`}
                onClick={() => onToggleInkEnabled(!inkEnabled)}
              >
                Ink {inkEnabled ? "On" : "Off"}
              </button>
              {inkEnabled && (
                <>
                  <button
                    type="button"
                    className={`text-xs md:text-sm px-2 py-1 rounded-md border transition-colors ${
                      inkTool === "pen"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/60 hover:bg-accent/40"
                    }`}
                    onClick={() => setInkTool("pen")}
                  >
                    Pen
                  </button>
                  <button
                    type="button"
                    className={`text-xs md:text-sm px-2 py-1 rounded-md border transition-colors ${
                      inkTool === "highlighter"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/60 hover:bg-accent/40"
                    }`}
                    onClick={() => setInkTool("highlighter")}
                  >
                    Highlighter
                  </button>
                  <div className="flex items-center gap-1">
                    {inkColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`h-5 w-5 rounded-full border ${
                          inkColor === color.value
                            ? "border-foreground"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setInkColor(color.value)}
                        aria-label={`Ink color ${color.name}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="text-xs md:text-sm px-2 py-1 rounded-md border border-border hover:border-primary/60 hover:bg-accent/40 transition-colors"
                    onClick={handleClearInk}
                    disabled={inkStrokes.length === 0}
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
            <div className="relative w-full md:w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 h-4 w-4 pointer-events-none" />
              <input
                type="text"
                className="w-full rounded-full border border-border bg-background/80 px-9 py-1.5 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="E.g. John 3 or Matt 5:4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSearchSubmit(searchQuery);
                  }
                }}
              />
              {(searchSuggestions.length > 0 || searchPreview) && (
                <div className="absolute left-0 right-0 mt-1 rounded-xl border bg-popover shadow-sm z-10 overflow-hidden">
                  {searchSuggestions.slice(0, 8).map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void handleSearchSubmit(s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                  {searchPreview && (
                    <div className="border-t px-3 py-2 text-sm bg-card">
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {searchPreview.ref}
                      </div>
                      <div className="text-sm text-foreground/90 leading-snug">
                        {searchPreview.text}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Strong’s dictionary moved into the main column */}
      </div>

      {/* MAIN SCROLL AREA */}
      <div className="relative flex-1 min-h-0">
        <ScrollArea
          className="h-full flex-1 min-h-0"
          viewportRef={scrollViewportRef}
          onViewportScroll={handleScroll}
        >
          <div
            className="max-w-none w-full px-3 py-4 pb-4"
            style={{
              fontSize: `${fontSize}px`,
              fontFamily:
                fontFamily === "serif"
                  ? "var(--font-serif)"
                  : fontFamily === "gentium"
                    ? "var(--font-gentium)"
                    : fontFamily === "mono"
                      ? "var(--font-mono)"
                      : "var(--font-sans)",
            }}
          >
          <div className="md:flex md:items-start md:gap-6">
            {/* Left: Strong's dictionary */}
            {hasSelectedStrong && selectedStrong && (
              <div className="md:w-80 lg:w-96 md:sticky md:top-6 mb-6 md:mb-0 h-[80vh] overflow-y-auto pr-2 space-y-3">
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

                <StrongDefinitionInline
                  strongNumber={selectedStrong.strongNumber}
                />

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
                      {showOccurrences
                        ? "Close occurrences"
                        : "Show occurrences"}
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

            {/* Right: verses */}
            <div className="flex-1 min-w-[50%]">
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

                  const groupWordNotes = activeNotes.filter(
                    (n) =>
                      n.wordIndex !== undefined &&
                      groupedVerses.some((v) => v.id === n.verseId)
                  );

              return (
                <div
                  key={`range-${rangeNote.id}`}
                  className={
                    displayMode === "book" && !showNotes
                      ? "inline"
                      : `md:flex md:items-start md:gap-6 mb-6 rounded-lg border bg-card px-3 py-3 md:px-4 md:py-4 shadow-sm ${borderClass}`
                  }
                >
                  {/* LEFT: all verses in the range */}
                  <div
                    className={
                      displayMode === "book" && !showNotes
                        ? "inline"
                        : "flex-1 space-y-2"
                    }
                  >
                    {groupedVerses.map((v) => {
                      const verseHighlight = highlights.find(
                        (h) =>
                          h.verseId === v.id && h.wordIndex === undefined
                      );
                      const wordHighlights = highlights.filter(
                        (h) => h.verseId === v.id && h.wordIndex !== undefined
                      );
                      const verseWithTokens = v as BibleVerseWithTokens;
                      const hasTokens = Boolean(
                        verseWithTokens.tokens &&
                          verseWithTokens.tokens.length > 0
                      );
                      const showWordByWord =
                        hasTokens &&
                        (showStrongsNumbers ||
                          showInterlinear ||
                          showStrongsEnglishOnly ||
                          hideAllEnglish);

                      const thisWordNotes = groupWordNotes.filter(
                        (n) => n.verseId === v.id && n.wordIndex !== undefined
                      );

                      return (
                        <div
                          key={v.id}
                          data-verse-id={v.id}
                          data-verse-number={v.verse}
                          className={
                            displayMode === "book" && !showNotes
                              ? "inline"
                              : "md:flex md:items-start md:gap-4"
                          }
                        >
                          <div
                            className={
                              displayMode === "book" && !showNotes
                                ? "inline"
                                : "flex-1"
                            }
                          >
                            <VerseDisplay
                              verse={v}
                              highlight={verseHighlight}
                              wordHighlights={wordHighlights}
                              showStrongsNumbers={showStrongsNumbers}
                              showInterlinear={showInterlinear}
                              showStrongsEnglishOnly={showStrongsEnglishOnly}
                              hideAllEnglish={hideAllEnglish}
                              showNotes={showNotes}
                              fontSize={fontSize}
                              fontFamily={fontFamily}
                              displayMode={displayMode}
                              showWordByWord={showWordByWord}
                              activeStrongNumber={activeStrongNumber}
                              onAddNote={() =>
                                setAddingNote({ verseId: v.id })
                              }
                              onAddWordNote={(wordIndex, wordText) =>
                                handleAddWordNote(v.id, wordIndex, wordText)
                              }
                              onSaveWordNote={(wordIndex, content, options) =>
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

                </div>
              );
            }

            // Normal single-verse case
                const verseNotes = activeNotes.filter((n) => {
              if (n.wordIndex !== undefined) return false;
              const rn = n as RangeNote;

              const anchorVerse = verses.find((v) => v.id === n.verseId);
              if (!anchorVerse) return false;

              // If it has a range > 1, it's handled above in rangeNoteMap
              if (
                typeof rn.startVerse === "number" &&
                typeof rn.endVerse === "number" &&
                rn.endVerse > rn.startVerse
              ) {
                return false;
              }

              return n.verseId === verse.id;
            });

                const wordNotes = activeNotes.filter(
                  (n) => n.verseId === verse.id && n.wordIndex !== undefined
                );

            const verseHighlight = highlights.find(
              (h) => h.verseId === verse.id && h.wordIndex === undefined
            );
            const wordHighlights = highlights.filter(
              (h) => h.verseId === verse.id && h.wordIndex !== undefined
            );
            const verseWithTokens = verse as BibleVerseWithTokens;
            const hasTokens = Boolean(
              verseWithTokens.tokens && verseWithTokens.tokens.length > 0
            );
            const showWordByWord =
              hasTokens &&
              (showStrongsNumbers ||
                showInterlinear ||
                showStrongsEnglishOnly ||
                hideAllEnglish);

            const verseHasNote = showNotes && verseNotes.length > 0;
            const verseTheme: NoteTheme | null = verseHasNote
              ? verseNotes[0].noteTheme ?? "yellow"
              : null;
            const verseBorderClass = verseTheme
              ? noteThemeBorderClasses[verseTheme]
              : "";

            const rowContainerClass =
              displayMode === "book" && !showNotes
                ? "inline"
                : verseHasNote
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
                <div
                  className={
                    displayMode === "book" && !showNotes ? "inline" : "flex-1"
                  }
                >
                  <VerseDisplay
                    verse={verse}
                    highlight={verseHighlight}
                    wordHighlights={wordHighlights}
                    showStrongsNumbers={showStrongsNumbers}
                    showInterlinear={showInterlinear}
                    showStrongsEnglishOnly={showStrongsEnglishOnly}
                    hideAllEnglish={hideAllEnglish}
                    showNotes={showNotes}
                    fontSize={fontSize}
                    fontFamily={fontFamily}
                    displayMode={displayMode}
                    showWordByWord={showWordByWord}
                    activeStrongNumber={activeStrongNumber}
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

            {showNotes && (
              <div className="mt-0 md:mt-0 md:w-80 lg:w-96 md:sticky md:top-[-2px] h-[80vh] overflow-y-auto pr-2 space-y-3">
                {panelVerseId && hasPanelNotes && (
                  <>
                    {rangeNoteForPanel && rangeRefForPanel && (
                      <NoteEditor
                        note={rangeNoteForPanel}
                        verseId={rangeNoteForPanel.verseId}
                        verseReference={rangeRefForPanel}
                        fontSize={fontSize}
                        enableRange={false}
                        onSave={(content, opts) =>
                          handleUpdateNote(rangeNoteForPanel.id, content, {
                            theme: opts?.theme,
                            crossReferences: opts?.crossReferences,
                            title: opts?.title,
                          })
                        }
                        onDelete={() => handleDeleteNote(rangeNoteForPanel.id)}
                        onCancel={() => {}}
                        onCrossReferenceClick={handleCrossReferenceClick}
                      />
                    )}

                    {verseNotesForPanel.map((note) => (
                      <NoteEditor
                        key={note.id}
                        note={note}
                        verseId={note.verseId}
                        verseReference={getVerseNoteRef(note)}
                        fontSize={fontSize}
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

                    {wordNotesForPanel.map((note) => (
                      <NoteEditor
                        key={note.id}
                        note={note as RangeNote}
                        verseId={note.verseId}
                        verseReference={panelVerseRef}
                        fontSize={fontSize}
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

                    {addingNote?.verseId === panelVerseId && (
                      <NoteEditor
                        note={
                          addingNote.wordIndex !== undefined
                            ? (wordNotesForPanel.find(
                                (n) => n.wordIndex === addingNote.wordIndex
                              ) as RangeNote | undefined)
                            : undefined
                        }
                        verseId={panelVerseId}
                        verseReference={panelVerseRef}
                        fontSize={fontSize}
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
                            const existingNote = wordNotesForPanel.find(
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
                  </>
                )}
              </div>
            )}
          </div>
          </div>
        </ScrollArea>
        {inkEnabled && (
          <canvas
            ref={inkCanvasRef}
            className="absolute inset-0 z-20 pointer-events-none"
          />
        )}
      </div>

    </div>
  );
}
