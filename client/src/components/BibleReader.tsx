import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { DragEvent } from "react";
import { BibleVerse, Highlight, Note } from "@shared/schema";
import { VerseDisplay } from "./VerseDisplay";
import { NoteTheme, NoteSaveOptions } from "./NoteEditor";
import { HighlightToolbar } from "./HighlightToolbar";
import { StrongDefinitionInline } from "./StrongDefinitionInline";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  getVersesByChapter,
  BibleVerseWithTokens,
  Translation,
  bibleBooks,
  translations,
} from "@/lib/bibleData";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  PenTool,
  Highlighter,
  Type,
  Eraser,
  Settings,
  BookOpen,
  MousePointer2,
  Lasso,
} from "lucide-react";

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
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  onToggleStrongsNumbers: (value: boolean) => void;
  onToggleInterlinear: (value: boolean) => void;
  onToggleStrongsEnglishOnly: (value: boolean) => void;
  onToggleHideAllEnglish: (value: boolean) => void;
  onToggleNotes: (value: boolean) => void;
  onFontSizeChange: (value: number) => void;
  onFontFamilyChange: (value: "serif" | "sans" | "mono" | "gentium") => void;
  onDisplayModeChange: (mode: "verse" | "book") => void;
  onTranslationChange: (translation: Translation) => void;
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

type InkTool = "pen" | "highlighter" | "textbox" | "eraser" | "select" | "lasso";

type InkPoint = {
  x: number;
  y: number;
  pressure?: number;
};

type TouchLike = Touch | React.Touch;

type InkStroke = {
  id: string;
  tool: InkTool;
  color: string;
  baseWidth: number;
  alpha: number;
  points: InkPoint[];
};

type InkText = {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
};

type InkTextBox = {
  id: string;
  verseIds: string[];
  noteMode: "single" | "range";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  borderWidth: number;
  text: string;
  noteId?: string;
  isEditing: boolean;
};

type SelectedStrong = {
  strongNumber: string;
  verseReference: string;
  verseText: string;
  matchText: string;
};

type LassoWord = {
  id: string;
  verseId: string;
  text: string;
  kind: "english" | "greek";
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
  theme,
  onToggleTheme,
  onToggleStrongsNumbers,
  onToggleInterlinear,
  onToggleStrongsEnglishOnly,
  onToggleHideAllEnglish,
  onToggleNotes,
  onFontSizeChange,
  onFontFamilyChange,
  onDisplayModeChange,
  onTranslationChange,
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
  const [noteLinkVerseIds, setNoteLinkVerseIds] = useState<string[]>([]);
  const [noteLinkRangeEndVerse, setNoteLinkRangeEndVerse] = useState<number | null>(null);
  const [noteLinkRangeMode, setNoteLinkRangeMode] = useState(false);
  const [notesPanelTab, setNotesPanelTab] = useState<
    "notes" | "definition" | "occurrences"
  >("notes");
  const [inkTool, setInkTool] = useState<InkTool>("select");
  const [inkColor, setInkColor] = useState("#facc15");
  const [penSize, setPenSize] = useState(2.5);
  const [highlighterSize, setHighlighterSize] = useState(14);
  const [highlighterOpacity, setHighlighterOpacity] = useState(0.35);
  const [eraserSize, setEraserSize] = useState(16);
  const [inkStrokes, setInkStrokes] = useState<InkStroke[]>([]);
  const [inkTexts, setInkTexts] = useState<InkText[]>([]);
  const [inkTextBoxes, setInkTextBoxes] = useState<InkTextBox[]>([]);
  const [showInkSettings, setShowInkSettings] = useState(false);
  const [inkOverlayScrollTop, setInkOverlayScrollTop] = useState(0);
  const [isInkScrolling, setIsInkScrolling] = useState(false);
  const [bookPopoverOpen, setBookPopoverOpen] = useState(false);
  const [bookPickerBook, setBookPickerBook] = useState(book);
  const [bookPickerChapter, setBookPickerChapter] = useState(chapter);
  const [bookPickerOldOpen, setBookPickerOldOpen] = useState(true);
  const [bookPickerNewOpen, setBookPickerNewOpen] = useState(false);
  const [lassoRect, setLassoRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [lassoSelectedWords, setLassoSelectedWords] = useState<LassoWord[]>([]);
  const [lassoSelectionBounds, setLassoSelectionBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
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
  const verseContentRef = useRef<HTMLDivElement | null>(null);
  const notesPanelRef = useRef<HTMLDivElement | null>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lassoStartRef = useRef<InkPoint | null>(null);
  const lassoEndRef = useRef<InkPoint | null>(null);
  const isDrawingRef = useRef(false);
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const inkStrokesRef = useRef<InkStroke[]>([]);
  const inkTextsRef = useRef<InkText[]>([]);
  const inkTextBoxesRef = useRef<InkTextBox[]>([]);
  const activeTextBoxRef = useRef<InkTextBox | null>(null);
  const textBoxStartRef = useRef<InkPoint | null>(null);
  const notesAreaRef = useRef<HTMLDivElement | null>(null);
  const textBoxResizeRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    startLeft: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const notesPanelResizeRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);
  const stylusTouchActiveRef = useRef(false);
  const pointerInkActiveRef = useRef(false);
  const touchInkActiveRef = useRef(false);
  const stylusTouchIdRef = useRef<number | null>(null);
  const inkRectRef = useRef<{ left: number; top: number } | null>(null);
  const skipNextInkRedrawRef = useRef(false);
  const lastInkPointTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const inkScrollHideTimeoutRef = useRef<number | null>(null);
  const prevStrongNumberRef = useRef<string | null>(null);
  const eraserCursorRef = useRef<HTMLDivElement | null>(null);

  const hasSelectedStrong = !!selectedStrong;
  const { toast } = useToast();
  const notebookStorageKey = "bible-notebooks";
  const legacyNotesKey = "bible-notes";
  const inkStorageKey = "bible-ink";
  const inkTextStorageKey = "bible-ink-texts";
  const [notesPanelWidth, setNotesPanelWidth] = useState<number | null>(null);
  const [isResizingNotesPanel, setIsResizingNotesPanel] = useState(false);
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
    const dpr = 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const scrollTop = vp.scrollTop;
    const drawSmoothStroke = (stroke: InkStroke, scrollTop: number) => {
      if (stroke.points.length < 2) return;
      const points = stroke.points;
      ctx.beginPath();
      const start = points[0];
      ctx.moveTo(start.x, start.y - scrollTop);
      for (let i = 1; i < points.length - 1; i += 1) {
        const curr = points[i];
        const next = points[i + 1];
        const midX = (curr.x + next.x) / 2;
        const midY = (curr.y + next.y) / 2;
        ctx.quadraticCurveTo(curr.x, curr.y - scrollTop, midX, midY - scrollTop);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y - scrollTop);
      ctx.stroke();
    };

    for (const stroke of inkStrokesRef.current) {
      if (stroke.points.length < 2) continue;
      ctx.globalAlpha = stroke.alpha;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.baseWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (stroke.tool === "highlighter") {
        drawSmoothStroke(stroke, scrollTop);
      } else {
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
    }

    if (inkTextsRef.current.length > 0) {
      ctx.fillStyle = "#111827";
      for (const text of inkTextsRef.current) {
        ctx.font = `${text.size}px serif`;
        ctx.fillStyle = text.color;
        ctx.fillText(text.text, text.x, text.y - scrollTop);
      }
    }
    ctx.globalAlpha = 1;
  }, []);

  const drawStrokeSegment = useCallback((stroke: InkStroke) => {
    const canvas = inkCanvasRef.current;
    const vp = scrollViewportRef.current;
    if (!canvas || !vp) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (stroke.points.length < 2) return;
    const dpr = 1;
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
    if (stroke.tool === "highlighter" && stroke.points.length >= 3) {
      const prevPrev = stroke.points[lastIndex - 2];
      const mid1 = {
        x: (prevPrev.x + prev.x) / 2,
        y: (prevPrev.y + prev.y) / 2,
      };
      const mid2 = {
        x: (prev.x + curr.x) / 2,
        y: (prev.y + curr.y) / 2,
      };
      ctx.moveTo(mid1.x, mid1.y - scrollTop);
      ctx.quadraticCurveTo(prev.x, prev.y - scrollTop, mid2.x, mid2.y - scrollTop);
    } else {
      ctx.moveTo(prev.x, prev.y - scrollTop);
      ctx.lineTo(curr.x, curr.y - scrollTop);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, []);

  const drawStrokeFromIndex = useCallback((stroke: InkStroke, fromIndex: number) => {
    const canvas = inkCanvasRef.current;
    const vp = scrollViewportRef.current;
    if (!canvas || !vp) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = stroke.alpha;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.baseWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const scrollTop = vp.scrollTop;
    const points = stroke.points;
    if (points.length < 2 || fromIndex >= points.length) return;
    const startIndex = Math.max(1, fromIndex);
    const start = points[startIndex - 1];
    ctx.beginPath();
    ctx.moveTo(start.x, start.y - scrollTop);
    for (let i = startIndex; i < points.length; i += 1) {
      const pt = points[i];
      ctx.lineTo(pt.x, pt.y - scrollTop);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, []);

  const eraseAtPoint = useCallback(
    (inkPoint: InkPoint | null, textBoxPoint?: InkPoint | null) => {
      if (!inkPoint && !textBoxPoint) return;
      const radius = Math.max(4, eraserSize);
      const radiusSq = radius * radius;
      let didErase = false;

      if (inkPoint && inkStrokesRef.current.length > 0) {
        const remaining = inkStrokesRef.current.filter((stroke) =>
          !stroke.points.some((pt) => {
            const dx = pt.x - inkPoint.x;
            const dy = pt.y - inkPoint.y;
            return dx * dx + dy * dy <= radiusSq;
          })
        );
        if (remaining.length !== inkStrokesRef.current.length) {
          inkStrokesRef.current = remaining;
          setInkStrokes(remaining);
          didErase = true;
        }
      }

      if (textBoxPoint && inkTextBoxesRef.current.length > 0) {
        const remaining = inkTextBoxesRef.current.filter((box) => {
          const left = box.x - radius;
          const right = box.x + box.width + radius;
          const top = box.y - radius;
          const bottom = box.y + box.height + radius;
          return (
            textBoxPoint.x < left ||
            textBoxPoint.x > right ||
            textBoxPoint.y < top ||
            textBoxPoint.y > bottom
          );
        });
        if (remaining.length !== inkTextBoxesRef.current.length) {
          inkTextBoxesRef.current = remaining;
          setInkTextBoxes(remaining);
          didErase = true;
        }
      }

      if (inkPoint && inkTextsRef.current.length > 0) {
        const canvas = inkCanvasRef.current;
        const ctx = canvas?.getContext("2d") ?? null;
        const remaining = inkTextsRef.current.filter((text) => {
          const size = Math.max(1, text.size);
          let width = text.text.length * size * 0.6;
          if (ctx) {
            ctx.font = `${size}px serif`;
            width = ctx.measureText(text.text).width;
          }
          const left = text.x - radius;
          const right = text.x + width + radius;
          const top = text.y - size - radius;
          const bottom = text.y + radius;
          return (
            inkPoint.x < left ||
            inkPoint.x > right ||
            inkPoint.y < top ||
            inkPoint.y > bottom
          );
        });
        if (remaining.length !== inkTextsRef.current.length) {
          inkTextsRef.current = remaining;
          setInkTexts(remaining);
          didErase = true;
        }
      }

      if (didErase) {
        redrawInk();
      }
    },
    [eraserSize, redrawInk]
  );

  const updateEraserCursor = useCallback(
    (point: InkPoint | null) => {
      const cursor = eraserCursorRef.current;
      if (!cursor || !point) return;
      const size = eraserSize;
      const half = size / 2;
      cursor.style.width = `${size}px`;
      cursor.style.height = `${size}px`;
      cursor.style.transform = `translate3d(${point.x - half}px, ${point.y - half}px, 0)`;
      cursor.style.opacity = "1";
    },
    [eraserSize]
  );

  const hideEraserCursor = useCallback(() => {
    const cursor = eraserCursorRef.current;
    if (!cursor) return;
    cursor.style.opacity = "0";
  }, []);

  const handleClearInk = useCallback(() => {
    inkStrokesRef.current = [];
    setInkStrokes([]);
    inkTextsRef.current = [];
    setInkTexts([]);
    inkTextBoxesRef.current = [];
    setInkTextBoxes([]);
    redrawInk();
  }, [redrawInk]);

  const updateTextBoxById = useCallback(
    (id: string, updater: (box: InkTextBox) => InkTextBox) => {
      inkTextBoxesRef.current = inkTextBoxesRef.current.map((box) =>
        box.id === id ? updater(box) : box
      );
      setInkTextBoxes(inkTextBoxesRef.current);
    },
    []
  );

  const resizeInkCanvas = useCallback(() => {
    const canvas = inkCanvasRef.current;
    const vp = scrollViewportRef.current;
    if (!canvas || !vp) return;
    const dpr = 1;
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
    setInkOverlayScrollTop(vp.scrollTop);
    if (inkEnabled) {
      if (inkScrollHideTimeoutRef.current !== null) {
        window.clearTimeout(inkScrollHideTimeoutRef.current);
      }
      setIsInkScrolling(true);
      inkScrollHideTimeoutRef.current = window.setTimeout(() => {
        inkScrollHideTimeoutRef.current = null;
        setIsInkScrolling(false);
      }, 80);
      if (isDrawingRef.current) {
        return;
      }
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
    return () => {
      if (inkScrollHideTimeoutRef.current !== null) {
        window.clearTimeout(inkScrollHideTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    updateActiveVerseFromScroll();
  }, [verses, updateActiveVerseFromScroll]);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    if (inkTool === "lasso") {
      viewport.style.overflowY = "hidden";
      viewport.style.touchAction = "none";
      viewport.style.overscrollBehavior = "none";
    } else {
      viewport.style.overflowY = "";
      viewport.style.touchAction = "";
      viewport.style.overscrollBehavior = "";
    }
  }, [inkTool]);

  useEffect(() => {
    if (addingNote?.verseId) {
      setActiveNotesVerseId(addingNote.verseId);
    }
  }, [addingNote?.verseId]);

  useEffect(() => {
    const currentStrong = selectedStrong?.strongNumber ?? null;
    if (currentStrong && currentStrong !== prevStrongNumberRef.current) {
      setNotesPanelTab("definition");
    }
    if (!currentStrong && notesPanelTab !== "notes") {
      setNotesPanelTab("notes");
    }
    prevStrongNumberRef.current = currentStrong;
  }, [notesPanelTab, selectedStrong]);

  useEffect(() => {
    if (!verses.length) return;
    if (noteLinkRangeEndVerse === null) return;
    const lastVerseNumber = verses[verses.length - 1]?.verse ?? 1;
    if (noteLinkRangeEndVerse > lastVerseNumber) {
      setNoteLinkRangeEndVerse(lastVerseNumber);
    }
  }, [noteLinkRangeEndVerse, verses]);

  useEffect(() => {
    if (!activeNotesVerseId) {
      setNoteLinkVerseIds([]);
      return;
    }
    const currentIndex = verses.findIndex((verse) => verse.id === activeNotesVerseId);
    if (currentIndex === -1) {
      setNoteLinkVerseIds([activeNotesVerseId]);
      return;
    }
    const currentVerseNumber = verses[currentIndex]?.verse ?? 1;
    if (!noteLinkRangeMode) {
      setNoteLinkVerseIds([activeNotesVerseId]);
      return;
    }
    const endVerseNumber = Math.max(
      currentVerseNumber,
      noteLinkRangeEndVerse ?? currentVerseNumber
    );
    const endIndex = verses.findIndex((verse) => verse.verse === endVerseNumber);
    const resolvedEndIndex = Math.max(
      currentIndex,
      endIndex === -1 ? currentIndex : endIndex
    );
    const nextIds = verses
      .slice(currentIndex, resolvedEndIndex + 1)
      .map((verse) => verse.id);
    setNoteLinkVerseIds(nextIds.length ? nextIds : [activeNotesVerseId]);
  }, [activeNotesVerseId, noteLinkRangeEndVerse, noteLinkRangeMode, verses]);

  useEffect(() => {
    if (!activeNotesVerseId || noteLinkRangeEndVerse !== null) return;
    const currentVerse = verses.find((verse) => verse.id === activeNotesVerseId);
    if (currentVerse) {
      setNoteLinkRangeEndVerse(currentVerse.verse);
      setNoteLinkRangeMode(false);
    }
  }, [activeNotesVerseId, noteLinkRangeEndVerse, verses]);

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
            if (loadedNotebooks.length === 0) {
              const fallbackNotebook: Notebook = {
                id: `notebook-${Date.now()}`,
                name: "My Notes",
                createdAt: Date.now(),
              };
              setNotebooks([fallbackNotebook]);
              setNotesByNotebook({ [fallbackNotebook.id]: loadedNotes[fallbackNotebook.id] ?? [] });
              setActiveNotebookId(fallbackNotebook.id);
            } else {
              const activeId =
                parsed.activeNotebookId ??
                (loadedNotebooks[0]?.id ?? null);
              setNotebooks(loadedNotebooks);
              setNotesByNotebook(loadedNotes);
              setActiveNotebookId(activeId);
            }
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
    const vp = scrollViewportRef.current;
    if (!vp) return;
    setInkOverlayScrollTop(vp.scrollTop);
  }, [activeNotebookId, chapterKey]);

  useEffect(() => {
    if (!activeNotebookId) {
      setInkStrokes([]);
      inkStrokesRef.current = [];
      setInkTextBoxes([]);
      inkTextBoxesRef.current = [];
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
    if (!activeNotebookId) {
      setInkTexts([]);
      inkTextsRef.current = [];
      return;
    }
    try {
      const raw = localStorage.getItem(inkTextStorageKey);
      if (!raw) {
        setInkTexts([]);
        inkTextsRef.current = [];
        return;
      }
      const parsed = JSON.parse(raw) as Record<
        string,
        Record<string, InkText[]>
      >;
      const next = parsed?.[activeNotebookId]?.[chapterKey] ?? [];
      setInkTexts(next);
      inkTextsRef.current = next;
    } catch (e) {
      console.warn("Failed to load ink texts", e);
      setInkTexts([]);
      inkTextsRef.current = [];
    }
  }, [activeNotebookId, chapterKey, inkTextStorageKey]);

  useEffect(() => {
    setInkTextBoxes([]);
    inkTextBoxesRef.current = [];
  }, [activeNotebookId, chapterKey]);

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
          [chapterKey]: inkStrokes,
        },
      };
      localStorage.setItem(inkStorageKey, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save ink strokes", e);
    }
  }, [activeNotebookId, chapterKey, inkStorageKey, inkStrokes]);

  useEffect(() => {
    if (!activeNotebookId) return;
    try {
      const raw = localStorage.getItem(inkTextStorageKey);
      const parsed = raw
        ? (JSON.parse(raw) as Record<string, Record<string, InkText[]>>)
        : {};
      const next = {
        ...parsed,
        [activeNotebookId]: {
          ...(parsed[activeNotebookId] ?? {}),
          [chapterKey]: inkTexts,
        },
      };
      localStorage.setItem(inkTextStorageKey, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save ink texts", e);
    }
  }, [activeNotebookId, chapterKey, inkTextStorageKey, inkTexts]);

  useEffect(() => {
    resizeInkCanvas();
  }, [resizeInkCanvas]);

  useEffect(() => {
    if (!inkEnabled) return;
    const id = window.requestAnimationFrame(() => {
      resizeInkCanvas();
      redrawInk();
    });
    return () => window.cancelAnimationFrame(id);
  }, [inkEnabled, redrawInk, resizeInkCanvas]);

  useEffect(() => {
    const handleResize = () => resizeInkCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resizeInkCanvas]);

  useEffect(() => {
    const vp = scrollViewportRef.current;
    if (!vp || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      resizeInkCanvas();
    });
    observer.observe(vp);
    return () => observer.disconnect();
  }, [resizeInkCanvas]);

  useEffect(() => {
    inkStrokesRef.current = inkStrokes;
    if (!isDrawingRef.current) {
      if (skipNextInkRedrawRef.current) {
        skipNextInkRedrawRef.current = false;
        return;
      }
      redrawInk();
    }
  }, [inkStrokes, redrawInk]);

  useEffect(() => {
    inkTextsRef.current = inkTexts;
    if (!isDrawingRef.current) {
      redrawInk();
    }
  }, [inkTexts, redrawInk]);

  useEffect(() => {
    inkTextBoxesRef.current = inkTextBoxes;
    if (!isDrawingRef.current) {
      redrawInk();
    }
  }, [inkTextBoxes, redrawInk]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const active = textBoxResizeRef.current;
      if (!active) return;
      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;
      const minWidth = 40;
      const minHeight = 30;
      const maxDx = active.startWidth - minWidth;
      const clampedDx = Math.min(dx, maxDx);
      updateTextBoxById(active.id, (box) => ({
        ...box,
        x: active.startLeft + clampedDx,
        width: Math.max(minWidth, active.startWidth - clampedDx),
        height: Math.max(minHeight, active.startHeight + dy),
      }));
    };

    const handlePointerUp = () => {
      if (!textBoxResizeRef.current) return;
      textBoxResizeRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [updateTextBoxById]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const active = notesPanelResizeRef.current;
      if (!active) return;
      const dx = active.startX - event.clientX;
      const nextWidth = Math.max(240, Math.min(720, active.startWidth + dx));
      setNotesPanelWidth(nextWidth);
    };

    const handlePointerUp = () => {
      if (!notesPanelResizeRef.current) return;
      notesPanelResizeRef.current = null;
      setIsResizingNotesPanel(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

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
    const rect = inkRectRef.current ?? canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top + vp.scrollTop,
      pressure: undefined,
    };
  };

  const getInkPointFromTouch = (touch: TouchLike) => {
    const canvas = inkCanvasRef.current;
    const vp = scrollViewportRef.current;
    if (!canvas || !vp) return null;
    const rect = inkRectRef.current ?? canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top + vp.scrollTop,
      pressure: undefined,
    };
  };

  const getInkViewportPointFromEvent = (event: PointerEvent) => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return null;
    const rect = inkRectRef.current ?? canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      pressure: undefined,
    };
  };

  const getInkViewportPointFromTouch = (touch: TouchLike) => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return null;
    const rect = inkRectRef.current ?? canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
      pressure: undefined,
    };
  };

  const getTextBoxPointFromEvent = (event: PointerEvent) => {
    const area = notesAreaRef.current;
    if (!area) return null;
    const rect = area.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      return null;
    }
    return {
      x: event.clientX - rect.left + area.scrollLeft,
      y: event.clientY - rect.top + area.scrollTop,
      pressure: undefined,
    };
  };

  const getTextBoxPointFromTouch = (touch: TouchLike) => {
    const area = notesAreaRef.current;
    if (!area) return null;
    const rect = area.getBoundingClientRect();
    if (
      touch.clientX < rect.left ||
      touch.clientX > rect.right ||
      touch.clientY < rect.top ||
      touch.clientY > rect.bottom
    ) {
      return null;
    }
    return {
      x: touch.clientX - rect.left + area.scrollLeft,
      y: touch.clientY - rect.top + area.scrollTop,
      pressure: undefined,
    };
  };

  const getTextBoxPointFromDragEvent = (event: DragEvent<HTMLDivElement>) => {
    const area = notesAreaRef.current;
    if (!area) return null;
    const rect = area.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      return null;
    }
    return {
      x: event.clientX - rect.left + area.scrollLeft,
      y: event.clientY - rect.top + area.scrollTop,
      pressure: undefined,
    };
  };

  const getContentPointFromEvent = (
    event: PointerEvent | React.PointerEvent<HTMLDivElement>
  ) => {
    const content = verseContentRef.current;
    const vp = scrollViewportRef.current;
    if (!content || !vp) return null;
    const rect = content.getBoundingClientRect();
    return {
      x: event.clientX - rect.left + vp.scrollLeft,
      y: event.clientY - rect.top + vp.scrollTop,
      pressure: undefined,
    };
  };

  const getContentPointFromTouch = (touch: TouchLike) => {
    const content = verseContentRef.current;
    const vp = scrollViewportRef.current;
    if (!content || !vp) return null;
    const rect = content.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left + vp.scrollLeft,
      y: touch.clientY - rect.top + vp.scrollTop,
      pressure: undefined,
    };
  };

  const normalizeRect = (start: InkPoint, end: InkPoint) => {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.max(1, Math.abs(end.x - start.x));
    const height = Math.max(1, Math.abs(end.y - start.y));
    return { x, y, width, height };
  };

  const normalizeTextBox = (start: InkPoint, end: InkPoint) => {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.max(1, Math.abs(end.x - start.x));
    const height = Math.max(1, Math.abs(end.y - start.y));
    return { x, y, width, height };
  };

  const handleNotesDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    []
  );

  const addTextBoxFromPayload = useCallback(
    (rawPayload: string, point?: InkPoint | null) => {
      const area = notesAreaRef.current;
      if (!area) return;

      let droppedText = "";
      let verseId: string | null = null;
      if (rawPayload) {
        try {
          const parsed = JSON.parse(rawPayload) as {
            text?: string;
            verseId?: string;
            words?: { text?: string; verseId?: string }[];
          };
          if (parsed.words?.length) {
            droppedText = parsed.words
              .map((word) => word.text?.trim())
              .filter(Boolean)
              .join(" ");
            verseId = parsed.verseId ?? parsed.words[0]?.verseId ?? null;
          } else {
            droppedText = parsed.text?.trim() ?? "";
            verseId = parsed.verseId ?? null;
          }
        } catch {
          droppedText = "";
        }
      }

      if (!droppedText) {
        return;
      }

      const targetVerseId = verseId ?? activeNotesVerseId;
      if (!targetVerseId) return;

      const boxWidth = Math.max(160, Math.min(320, droppedText.length * 10));
      const boxHeight = 72;
      const maxX = Math.max(0, area.scrollWidth - boxWidth);
      const maxY = Math.max(0, area.scrollHeight - boxHeight);
      const fallbackPoint = {
        x: area.scrollLeft + 24,
        y: area.scrollTop + 24,
        pressure: undefined,
      };
      const resolvedPoint = point ?? fallbackPoint;
      const x = Math.min(Math.max(0, resolvedPoint.x), maxX);
      const y = Math.min(Math.max(0, resolvedPoint.y), maxY);

      const box: InkTextBox = {
        id: `ink-textbox-${Date.now()}`,
        verseIds: [targetVerseId],
        noteMode: noteLinkRangeMode ? "range" : "single",
        x,
        y,
        width: boxWidth,
        height: boxHeight,
        color: inkColor,
        borderWidth: Math.max(1, penSize),
        text: droppedText,
        isEditing: true,
      };

      inkTextBoxesRef.current = [...inkTextBoxesRef.current, box];
      setInkTextBoxes(inkTextBoxesRef.current);
      redrawInk();

      if (targetVerseId !== activeNotesVerseId) {
        setActiveNotesVerseId(targetVerseId);
      }
    },
    [activeNotesVerseId, inkColor, penSize, redrawInk]
  );

  const handleNotesDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const area = notesAreaRef.current;
      if (!area) return;

      const point = getTextBoxPointFromDragEvent(event);
      if (!point) return;
      addTextBoxFromPayload(
        event.dataTransfer.getData("application/x-bible-word"),
        point
      );
    },
    [addTextBoxFromPayload, getTextBoxPointFromDragEvent]
  );

  const handleLassoPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (inkTool !== "lasso") return;
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest("[data-lasso-control]")) return;
      const point = getContentPointFromEvent(event);
      if (!point) return;
      event.preventDefault();
      lassoStartRef.current = point;
      lassoEndRef.current = point;
      setLassoRect({ x: point.x, y: point.y, width: 1, height: 1 });
      setLassoSelectedWords([]);
    },
    [getContentPointFromEvent, inkTool]
  );

  const handleLassoPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!lassoStartRef.current) return;
      const point = getContentPointFromEvent(event);
      if (!point) return;
      lassoEndRef.current = point;
      const rect = normalizeRect(lassoStartRef.current, point);
      setLassoRect(rect);
    },
    [getContentPointFromEvent, normalizeRect]
  );

  const finalizeLassoSelection = useCallback(() => {
    const start = lassoStartRef.current;
    const end = lassoEndRef.current;
    const content = verseContentRef.current;
    const vp = scrollViewportRef.current;
    lassoStartRef.current = null;
    lassoEndRef.current = null;

    if (!start || !end || !content || !vp) {
      setLassoRect(null);
      return;
    }

    const rect = normalizeRect(start, end);
    if (rect.width < 6 && rect.height < 6) {
      setLassoRect(null);
      setLassoSelectedWords([]);
      return;
    }

    const contentRect = content.getBoundingClientRect();
    const words = Array.from(
      content.querySelectorAll<HTMLElement>("[data-lasso-word]")
    );
    const selected: LassoWord[] = [];
    for (const el of words) {
      const wordRect = el.getBoundingClientRect();
      const wordX = wordRect.left - contentRect.left + vp.scrollLeft;
      const wordY = wordRect.top - contentRect.top + vp.scrollTop;
      const intersects =
        wordX < rect.x + rect.width &&
        wordX + wordRect.width > rect.x &&
        wordY < rect.y + rect.height &&
        wordY + wordRect.height > rect.y;
      if (!intersects) continue;
      const id = el.dataset.wordId;
      const verseId = el.dataset.verseId;
      const text = el.dataset.wordText;
      const kind = el.dataset.wordKind as "english" | "greek" | undefined;
      if (!id || !verseId || !text || !kind) continue;
      selected.push({ id, verseId, text, kind });
    }
    setLassoSelectedWords(selected);
    setLassoRect(null);
  }, [normalizeRect]);

  const handleLassoPointerUp = useCallback(() => {
    finalizeLassoSelection();
  }, [finalizeLassoSelection]);

  const handleLassoTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (inkTool !== "lasso") return;
      const target = event.target as HTMLElement;
      if (target.closest("[data-lasso-control]")) return;
      const touch = event.touches[0];
      if (!touch) return;
      const point = getContentPointFromTouch(touch);
      if (!point) return;
      if (event.cancelable) event.preventDefault();
      lassoStartRef.current = point;
      lassoEndRef.current = point;
      setLassoRect({ x: point.x, y: point.y, width: 1, height: 1 });
      setLassoSelectedWords([]);
    },
    [getContentPointFromTouch, inkTool]
  );

  const handleLassoTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!lassoStartRef.current) return;
      const touch = event.touches[0];
      if (!touch) return;
      const point = getContentPointFromTouch(touch);
      if (!point) return;
      lassoEndRef.current = point;
      const rect = normalizeRect(lassoStartRef.current, point);
      setLassoRect(rect);
      if (event.cancelable) event.preventDefault();
    },
    [getContentPointFromTouch, normalizeRect]
  );

  const handleLassoTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!lassoStartRef.current) return;
      const touch = event.changedTouches[0];
      if (touch) {
        const point = getContentPointFromTouch(touch);
        if (point) {
          lassoEndRef.current = point;
        }
      }
      finalizeLassoSelection();
      if (event.cancelable) event.preventDefault();
    },
    [finalizeLassoSelection, getContentPointFromTouch]
  );



  const startTextBox = (point: InkPoint) => {
    const linkIds =
      noteLinkVerseIds.length > 0
        ? noteLinkVerseIds
        : activeNotesVerseId
          ? [activeNotesVerseId]
          : [];
    if (!linkIds.length) {
      return;
    }
    textBoxStartRef.current = point;
    const box: InkTextBox = {
      id: `ink-textbox-${Date.now()}`,
      verseIds: linkIds,
      noteMode: noteLinkRangeMode ? "range" : "single",
      x: point.x,
      y: point.y,
      width: 1,
      height: 1,
      color: inkColor,
      borderWidth: Math.max(1, penSize),
      text: "",
      isEditing: true,
    };
    activeTextBoxRef.current = box;
    isDrawingRef.current = true;
    inkTextBoxesRef.current = [...inkTextBoxesRef.current, box];
    setInkTextBoxes(inkTextBoxesRef.current);
    redrawInk();
  };

  const updateTextBox = (point: InkPoint) => {
    const start = textBoxStartRef.current;
    const active = activeTextBoxRef.current;
    if (!start || !active) return;
    const { x, y, width, height } = normalizeTextBox(start, point);
    activeTextBoxRef.current = {
      ...active,
      x,
      y,
      width,
      height,
    };
    const boxes = inkTextBoxesRef.current.slice(0, -1);
    inkTextBoxesRef.current = [...boxes, activeTextBoxRef.current];
    setInkTextBoxes(inkTextBoxesRef.current);
    redrawInk();
  };

  const endTextBox = () => {
    const active = activeTextBoxRef.current;
    if (!active) return;
    if (active.width < 6 || active.height < 6) {
      inkTextBoxesRef.current = inkTextBoxesRef.current.filter(
        (box) => box.id !== active.id
      );
      setInkTextBoxes(inkTextBoxesRef.current);
    }
    activeTextBoxRef.current = null;
    textBoxStartRef.current = null;
    isDrawingRef.current = false;
    redrawInk();
    setInkTool("select");
    setShowInkSettings(false);
  };

  const startInkStroke = (point: InkPoint) => {
    const settings =
      inkTool === "pen"
        ? { baseWidth: penSize, alpha: 1 }
        : { baseWidth: highlighterSize, alpha: highlighterOpacity };
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
    lastInkPointTimeRef.current = performance.now();
    inkStrokesRef.current = [...inkStrokesRef.current, stroke];
    setInkStrokes(inkStrokesRef.current);
  };

  const setInkScrollLock = (locked: boolean) => {
    if (typeof document !== "undefined") {
      document.documentElement.style.overflow = locked ? "hidden" : "auto";
      document.documentElement.style.touchAction = locked ? "none" : "auto";
      document.body.style.overflow = locked ? "hidden" : "auto";
      document.body.style.touchAction = locked ? "none" : "auto";
    }
    const vp = scrollViewportRef.current;
    if (vp) {
      vp.style.overflowY = locked ? "hidden" : "auto";
      vp.style.touchAction = locked ? "none" : "pan-y";
    }
  };

  useEffect(() => {
    if (!inkEnabled || inkTool === "select") {
      setInkScrollLock(false);
      setShowInkSettings(false);
    }
  }, [inkEnabled, inkTool]);

  useEffect(() => {
    if (!inkEnabled) return;
    if (inkTool === "lasso") {
      setInkScrollLock(true);
    } else {
      setInkScrollLock(false);
    }
  }, [inkEnabled, inkTool]);

  useEffect(() => {
    if (!inkEnabled || inkTool !== "eraser") {
      hideEraserCursor();
    }
  }, [hideEraserCursor, inkEnabled, inkTool]);

  useEffect(() => {
    if (!bookPopoverOpen) return;
    setBookPickerBook(book);
    setBookPickerChapter(chapter);
  }, [bookPopoverOpen, book, chapter]);

  useEffect(() => {
    setInkScrollLock(false);
  }, []);

  useEffect(() => {
    if (!inkEnabled) {
      onToggleInkEnabled(true);
    }
  }, [inkEnabled, onToggleInkEnabled]);

  const appendInkPoint = (point: InkPoint) => {
    const strokes = inkStrokesRef.current;
    if (!strokes.length) return;
    const lastIndex = strokes.length - 1;
    const last = strokes[lastIndex];
    if (activeStrokeRef.current?.id !== last.id) return;
    const prev = last.points[last.points.length - 1];
    if (prev) {
      lastInkPointTimeRef.current = performance.now();
    }
    last.points.push(point);
    inkStrokesRef.current = strokes;
    activeStrokeRef.current = last;
    drawStrokeSegment(last);
    if (rafRef.current === null) {
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
      });
    }
  };

  const appendInkPointsFromPointer = (event: PointerEvent) => {
    const point = getInkPointFromEvent(event);
    if (point) appendInkPoint(point);
  };

  const endInkStroke = () => {
    const stroke = activeStrokeRef.current;
    if (stroke) {
      if (stroke.points.length === 1) {
        const base = stroke.points[0];
        stroke.points.push({ x: base.x + 0.5, y: base.y + 0.5 });
      }
      redrawInk();
    }
    isDrawingRef.current = false;
    activeStrokeRef.current = null;
    skipNextInkRedrawRef.current = true;
    setInkStrokes([...inkStrokesRef.current]);
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

  const isTextBoxTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("[data-ink-textbox]"));
  };

  const handleInkPointerDown = (event: PointerEvent) => {
    if (!inkEnabled) return;
    if (inkTool === "select" || inkTool === "lasso") return;
    if (inkTool !== "textbox" && !isInkPointerEvent(event)) return;
    if (inkTool !== "eraser" && isTextBoxTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    pointerInkActiveRef.current = true;
    setInkScrollLock(true);
    const vp = scrollViewportRef.current;
    if (vp) {
      try {
        vp.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture errors on unsupported browsers.
      }
    }
    const canvas = inkCanvasRef.current;
    inkRectRef.current = canvas ? canvas.getBoundingClientRect() : null;
    const point =
      inkTool === "textbox"
        ? getTextBoxPointFromEvent(event)
        : getInkPointFromEvent(event);
    if (!point) return;
    if (inkTool === "textbox") {
      startTextBox(point);
      return;
    }
    if (inkTool === "eraser") {
      isDrawingRef.current = true;
      const textBoxPoint = getTextBoxPointFromEvent(event);
      eraseAtPoint(point, textBoxPoint);
      const cursorPoint = getInkViewportPointFromEvent(event);
      if (cursorPoint) updateEraserCursor(cursorPoint);
      return;
    }
    startInkStroke(point);
  };

  const handleInkPointerMove = (event: PointerEvent) => {
    if (!inkEnabled || !isDrawingRef.current) return;
    if (inkTool === "select" || inkTool === "lasso") return;
    if (inkTool !== "textbox" && !isInkPointerEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (inkTool === "textbox" && activeTextBoxRef.current) {
      const point = getTextBoxPointFromEvent(event);
      if (point) updateTextBox(point);
      return;
    }
    if (inkTool === "eraser") {
      const point = getInkPointFromEvent(event);
      const textBoxPoint = getTextBoxPointFromEvent(event);
      if (point || textBoxPoint) eraseAtPoint(point, textBoxPoint);
      const cursorPoint = getInkViewportPointFromEvent(event);
      if (cursorPoint) updateEraserCursor(cursorPoint);
      return;
    }
    appendInkPointsFromPointer(event);
  };

  const handleInkPointerUp = (event: PointerEvent) => {
    if (!inkEnabled) return;
    if (inkTool === "select" || inkTool === "lasso") return;
    if (inkTool !== "textbox" && !isInkPointerEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    pointerInkActiveRef.current = false;
    setInkScrollLock(false);
    const vp = scrollViewportRef.current;
    if (vp) {
      try {
        vp.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore capture errors on unsupported browsers.
      }
    }
    inkRectRef.current = null;
    if (inkTool === "textbox" && activeTextBoxRef.current) {
      endTextBox();
      return;
    }
    if (inkTool === "eraser") {
      isDrawingRef.current = false;
      activeStrokeRef.current = null;
      hideEraserCursor();
      return;
    }
    endInkStroke();
  };

  const getStylusTouchFromEvent = (event: TouchEvent) => {
    for (const touch of Array.from(event.changedTouches)) {
      const anyTouch = touch as Touch & { touchType?: string };
      if (anyTouch.touchType === "stylus") return touch;
      const radiusX = typeof touch.radiusX === "number" ? touch.radiusX : 0;
      const radiusY = typeof touch.radiusY === "number" ? touch.radiusY : 0;
      const radius = Math.max(radiusX || 0, radiusY || 0);
      if (radius > 0 && radius <= 6) return touch;
    }
    for (const touch of Array.from(event.touches)) {
      const anyTouch = touch as Touch & { touchType?: string };
      if (anyTouch.touchType === "stylus") return touch;
      const radiusX = typeof touch.radiusX === "number" ? touch.radiusX : 0;
      const radiusY = typeof touch.radiusY === "number" ? touch.radiusY : 0;
      const radius = Math.max(radiusX || 0, radiusY || 0);
      if (radius > 0 && radius <= 6) return touch;
    }
    return null;
  };

  const isStylusTouchEvent = (event: TouchEvent) =>
    Boolean(getStylusTouchFromEvent(event));

  const getTouchById = (event: TouchEvent, id: number | null) => {
    if (id === null) return null;
    for (const touch of Array.from(event.touches)) {
      if (touch.identifier === id) return touch;
    }
    for (const touch of Array.from(event.changedTouches)) {
      if (touch.identifier === id) return touch;
    }
    return null;
  };

  useEffect(() => {
    const vp = scrollViewportRef.current;
    if (!vp) return;

    const onPointerDown = (event: PointerEvent) => handleInkPointerDown(event);
    const onPointerMove = (event: PointerEvent) => handleInkPointerMove(event);
    const onPointerUp = (event: PointerEvent) => handleInkPointerUp(event);

    const onTouchStart = (event: TouchEvent) => {
      if (!inkEnabled) return;
      if (inkTool === "select" || inkTool === "lasso") return;
      if (pointerInkActiveRef.current) return;
      if (inkTool !== "eraser" && isTextBoxTarget(event.target)) return;
      if (inkTool !== "textbox" && !isStylusTouchEvent(event)) return;
      stylusTouchActiveRef.current = true;
      touchInkActiveRef.current = true;
      const stylusTouch =
        inkTool === "textbox" ? event.changedTouches[0] : getStylusTouchFromEvent(event);
      stylusTouchIdRef.current = stylusTouch ? stylusTouch.identifier : null;
      setInkScrollLock(true);
      const canvas = inkCanvasRef.current;
      inkRectRef.current = canvas ? canvas.getBoundingClientRect() : null;
      const touch = stylusTouch ?? getTouchById(event, stylusTouchIdRef.current);
      const point = touch
        ? inkTool === "textbox"
          ? getTextBoxPointFromTouch(touch)
          : getInkPointFromTouch(touch)
        : null;
      if (point) {
        if (inkTool === "textbox") {
          startTextBox(point);
        } else if (inkTool === "eraser") {
          isDrawingRef.current = true;
          const textBoxPoint = touch ? getTextBoxPointFromTouch(touch) : null;
          eraseAtPoint(point, textBoxPoint);
          const cursorPoint = touch ? getInkViewportPointFromTouch(touch) : null;
          if (cursorPoint) updateEraserCursor(cursorPoint);
        } else {
          startInkStroke(point);
        }
      }
      event.preventDefault();
      event.stopPropagation();
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!inkEnabled) return;
      if (inkTool === "select" || inkTool === "lasso") return;
      if (pointerInkActiveRef.current) return;
      const isStylus =
        inkTool === "textbox"
          ? true
          : stylusTouchActiveRef.current || isStylusTouchEvent(event);
      if (isStylus && touchInkActiveRef.current) {
        const touch =
          getTouchById(event, stylusTouchIdRef.current) ??
          (inkTool === "textbox" ? event.changedTouches[0] : getStylusTouchFromEvent(event));
        const point = touch
          ? inkTool === "textbox"
            ? getTextBoxPointFromTouch(touch)
            : getInkPointFromTouch(touch)
          : null;
        if (point) {
          if (inkTool === "textbox" && activeTextBoxRef.current) {
            updateTextBox(point);
          } else if (inkTool === "eraser") {
            const textBoxPoint = touch ? getTextBoxPointFromTouch(touch) : null;
            eraseAtPoint(point, textBoxPoint);
            const cursorPoint = touch ? getInkViewportPointFromTouch(touch) : null;
            if (cursorPoint) updateEraserCursor(cursorPoint);
          } else {
            appendInkPoint(point);
          }
        }
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onTouchEnd = () => {
      if (inkTool === "select" || inkTool === "lasso") return;
      if (!stylusTouchActiveRef.current && !touchInkActiveRef.current) return;
      stylusTouchActiveRef.current = false;
      touchInkActiveRef.current = false;
      stylusTouchIdRef.current = null;
      setInkScrollLock(false);
      inkRectRef.current = null;
      if (inkTool === "textbox" && activeTextBoxRef.current) {
        endTextBox();
      } else if (inkTool === "eraser") {
        isDrawingRef.current = false;
        activeStrokeRef.current = null;
        hideEraserCursor();
      } else {
        endInkStroke();
      }
    };

    const onWindowTouchMove = (event: TouchEvent) => {
      if (!inkEnabled) return;
      if (inkTool === "select" || inkTool === "lasso") return;
      if (!touchInkActiveRef.current && !pointerInkActiveRef.current) return;
      if (touchInkActiveRef.current) {
        const touch =
          getTouchById(event, stylusTouchIdRef.current) ??
          (inkTool === "textbox" ? event.changedTouches[0] : getStylusTouchFromEvent(event));
        const point = touch
          ? inkTool === "textbox"
            ? getTextBoxPointFromTouch(touch)
            : getInkPointFromTouch(touch)
          : null;
        if (point) {
          if (inkTool === "textbox" && activeTextBoxRef.current) {
            updateTextBox(point);
          } else if (inkTool === "eraser") {
            const textBoxPoint = touch ? getTextBoxPointFromTouch(touch) : null;
            eraseAtPoint(point, textBoxPoint);
            const cursorPoint = touch ? getInkViewportPointFromTouch(touch) : null;
            if (cursorPoint) updateEraserCursor(cursorPoint);
          } else {
            appendInkPoint(point);
          }
        }
      }
      event.preventDefault();
      event.stopPropagation();
    };

    const onWindowTouchEnd = () => {
      if (!inkEnabled) return;
      if (inkTool === "select" || inkTool === "lasso") return;
      if (!touchInkActiveRef.current) return;
      stylusTouchActiveRef.current = false;
      touchInkActiveRef.current = false;
      stylusTouchIdRef.current = null;
      setInkScrollLock(false);
      inkRectRef.current = null;
      if (inkTool === "textbox" && activeTextBoxRef.current) {
        endTextBox();
      } else if (inkTool === "eraser") {
        isDrawingRef.current = false;
        activeStrokeRef.current = null;
        hideEraserCursor();
      } else {
        endInkStroke();
      }
    };

    vp.addEventListener("pointerdown", onPointerDown, { passive: false });
    vp.addEventListener("pointermove", onPointerMove, { passive: false });
    vp.addEventListener("touchstart", onTouchStart, { passive: false, capture: true });
    vp.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    vp.addEventListener("touchend", onTouchEnd, { passive: true });
    vp.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("touchmove", onWindowTouchMove, { passive: false });
    window.addEventListener("touchend", onWindowTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onWindowTouchEnd, { passive: true });

    return () => {
      vp.removeEventListener("pointerdown", onPointerDown);
      vp.removeEventListener("pointermove", onPointerMove);
      vp.removeEventListener("touchstart", onTouchStart, { capture: true } as AddEventListenerOptions);
      vp.removeEventListener("touchmove", onTouchMove, { capture: true } as AddEventListenerOptions);
      vp.removeEventListener("touchend", onTouchEnd);
      vp.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("touchmove", onWindowTouchMove);
      window.removeEventListener("touchend", onWindowTouchEnd);
      window.removeEventListener("touchcancel", onWindowTouchEnd);
    };
  }, [handleInkPointerDown, handleInkPointerMove, handleInkPointerUp, inkEnabled]);


  useEffect(() => {
    if (typeof document === "undefined") return;
    const bodyStyle = document.body.style;
    const prevUserSelect = bodyStyle.userSelect;
    const prevWebkitUserSelect = (bodyStyle as CSSStyleDeclaration & {
      WebkitUserSelect?: string;
    }).WebkitUserSelect;
    if (inkEnabled) {
      bodyStyle.userSelect = "none";
      (bodyStyle as CSSStyleDeclaration & { WebkitUserSelect?: string }).WebkitUserSelect = "none";
    } else {
      bodyStyle.userSelect = prevUserSelect;
      (bodyStyle as CSSStyleDeclaration & { WebkitUserSelect?: string }).WebkitUserSelect =
        prevWebkitUserSelect;
    }
    return () => {
      bodyStyle.userSelect = prevUserSelect;
      (bodyStyle as CSSStyleDeclaration & { WebkitUserSelect?: string }).WebkitUserSelect =
        prevWebkitUserSelect;
    };
  }, [inkEnabled]);

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
  const noteLinkStartVerseNumber = useMemo(() => {
    if (!activeNotesVerseId) return 1;
    const current = verses.find((verse) => verse.id === activeNotesVerseId);
    return current?.verse ?? 1;
  }, [activeNotesVerseId, verses]);
  const noteLinkRangeDisplay = useMemo(() => {
    if (!activeNotesVerseId) return "Link range";
    const startVerse = verses.find((verse) => verse.id === activeNotesVerseId);
    if (!startVerse) return "Link range";
    const endVerseNumber = noteLinkRangeEndVerse ?? startVerse.verse;
    const inRange = noteLinkRangeMode && endVerseNumber >= startVerse.verse;
    const resolvedEndVerse = Math.max(startVerse.verse, endVerseNumber);
    return inRange
      ? `${startVerse.book} ${startVerse.chapter}:${startVerse.verse}-${resolvedEndVerse}`
      : `${startVerse.book} ${startVerse.chapter}:${startVerse.verse}`;
  }, [activeNotesVerseId, noteLinkRangeEndVerse, noteLinkRangeMode, verses]);
  const noteLinkRangeOptions = useMemo(() => {
    if (!activeNotesVerseId) return [];
    const currentIndex = verses.findIndex(
      (verse) => verse.id === activeNotesVerseId
    );
    if (currentIndex === -1) return [];
    const startVerse = verses[currentIndex];
    if (!startVerse) return [];
    return verses.slice(currentIndex).map((verse) => ({
      value: verse.verse,
      label: `${verse.verse}`,
    }));
  }, [activeNotesVerseId, verses]);
  const firstNewTestamentIndex = useMemo(
    () => bibleBooks.findIndex((entry) => entry.name === "Matthew"),
    []
  );
  const oldTestamentBooks =
    firstNewTestamentIndex > 0
      ? bibleBooks.slice(0, firstNewTestamentIndex)
      : bibleBooks;
  const newTestamentBooks =
    firstNewTestamentIndex > 0 ? bibleBooks.slice(firstNewTestamentIndex) : [];
  const bookPickerMeta = useMemo(
    () => bibleBooks.find((entry) => entry.name === bookPickerBook) ?? null,
    [bookPickerBook]
  );
  const bookPickerChapterCount = bookPickerMeta?.chapters ?? 1;
  const bookPickerChapterOptions = useMemo(
    () =>
      Array.from({ length: bookPickerChapterCount }, (_, idx) => idx + 1),
    [bookPickerChapterCount]
  );
  const handleBookPickerBookChange = (nextBook: string) => {
    setBookPickerBook(nextBook);
    const nextMeta = bibleBooks.find((entry) => entry.name === nextBook);
    const maxChapters = nextMeta?.chapters ?? 1;
    setBookPickerChapter((prev) => Math.min(prev, maxChapters));
  };
  const currentBookIndex = useMemo(
    () => bibleBooks.findIndex((entry) => entry.name === book),
    [book]
  );
  const currentBookMeta = currentBookIndex >= 0 ? bibleBooks[currentBookIndex] : null;
  const canGoPrevChapter = Boolean(onNavigate) && (chapter > 1 || currentBookIndex > 0);
  const canGoNextChapter = Boolean(onNavigate) && Boolean(
    currentBookMeta && (chapter < currentBookMeta.chapters || currentBookIndex < bibleBooks.length - 1)
  );
  const handlePrevChapter = () => {
    if (!onNavigate) return;
    if (chapter > 1) {
      onNavigate(book, chapter - 1);
      return;
    }
    if (currentBookIndex > 0) {
      const prevBook = bibleBooks[currentBookIndex - 1];
      onNavigate(prevBook.name, prevBook.chapters);
    }
  };
  const handleNextChapter = () => {
    if (!onNavigate || !currentBookMeta) return;
    if (chapter < currentBookMeta.chapters) {
      onNavigate(book, chapter + 1);
      return;
    }
    if (currentBookIndex < bibleBooks.length - 1) {
      const nextBook = bibleBooks[currentBookIndex + 1];
      onNavigate(nextBook.name, 1);
    }
  };
  const visibleInkTextBoxes = useMemo(() => {
    if (!activeNotesVerseId) return [];
    return inkTextBoxes.filter((box) => {
      const mode = box.noteMode ?? "single";
      if (noteLinkRangeMode && mode !== "range") return false;
      if (!noteLinkRangeMode && mode !== "single") return false;
      return box.verseIds.includes(activeNotesVerseId);
    });
  }, [activeNotesVerseId, inkTextBoxes, noteLinkRangeMode]);
  const notesScrollHeight = useMemo(() => {
    if (!visibleInkTextBoxes.length) return 1;
    return (
      Math.max(
        ...visibleInkTextBoxes.map((box) => box.y + box.height + 24)
      ) || 1
    );
  }, [visibleInkTextBoxes]);
  const lassoSelectedWordIds = useMemo(() => {
    return new Set(lassoSelectedWords.map((word) => word.id));
  }, [lassoSelectedWords]);
  const lassoSelectedPayload = useMemo(() => {
    if (!lassoSelectedWords.length) return null;
    const text = lassoSelectedWords.map((word) => word.text).join(" ");
    const verseId = lassoSelectedWords[0]?.verseId ?? null;
    return { text, verseId, words: lassoSelectedWords };
  }, [lassoSelectedWords]);

  const handleLassoDragStart = useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      if (!lassoSelectedPayload) return;
      event.dataTransfer.setData(
        "application/x-bible-word",
        JSON.stringify(lassoSelectedPayload)
      );
      event.dataTransfer.setData("text/plain", lassoSelectedPayload.text);
      event.dataTransfer.effectAllowed = "copy";
    },
    [lassoSelectedPayload]
  );

  const handleLassoAddToNotes = useCallback(() => {
    if (!lassoSelectedPayload) return;
    addTextBoxFromPayload(JSON.stringify(lassoSelectedPayload), null);
  }, [addTextBoxFromPayload, lassoSelectedPayload]);

  useEffect(() => {
    const content = verseContentRef.current;
    const vp = scrollViewportRef.current;
    if (!content || !vp || !lassoSelectedWords.length) {
      setLassoSelectionBounds(null);
      return;
    }
    const contentRect = content.getBoundingClientRect();
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    lassoSelectedWords.forEach((word) => {
      const el = content.querySelector<HTMLElement>(
        `[data-word-id="${word.id}"]`
      );
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = rect.left - contentRect.left + vp.scrollLeft;
      const y = rect.top - contentRect.top + vp.scrollTop;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + rect.width);
      maxY = Math.max(maxY, y + rect.height);
    });
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      setLassoSelectionBounds(null);
      return;
    }
    setLassoSelectionBounds({
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    });
  }, [lassoSelectedWords]);

  useEffect(() => {
    if (inkTool !== "lasso" && lassoSelectedWords.length) {
      setLassoSelectedWords([]);
    }
  }, [inkTool, lassoSelectedWords.length]);

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
    <div className={`h-full min-h-0 flex flex-col ${inkEnabled ? "select-none" : ""}`}>
      {/* MAIN SCROLL AREA */}
      <div className="relative flex-1 min-h-0">
        <ScrollArea
          className="h-full flex-1 min-h-0 relative z-10"
          viewportRef={scrollViewportRef}
          onViewportScroll={handleScroll}
          onWheelCapture={(event) => {
            if (inkTool === "lasso") {
              event.preventDefault();
            }
          }}
          onTouchMove={(event) => {
            if (inkTool === "lasso") {
              if (event.cancelable) event.preventDefault();
            }
          }}
        >
          <div
            ref={verseContentRef}
            className={`relative max-w-none w-full px-3 py-4 pb-4 ${
              inkEnabled && inkTool !== "select" && inkTool !== "lasso"
                ? "select-none pointer-events-none"
                : ""
            }`}
            onPointerDown={handleLassoPointerDown}
            onPointerMove={handleLassoPointerMove}
            onPointerUp={handleLassoPointerUp}
            onPointerLeave={handleLassoPointerUp}
            onTouchStart={handleLassoTouchStart}
            onTouchMove={handleLassoTouchMove}
            onTouchEnd={handleLassoTouchEnd}
            style={{
              touchAction: inkTool === "lasso" ? "none" : undefined,
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
          {lassoRect && (
            <div
              className="pointer-events-none absolute z-20 rounded-md border border-primary/60 bg-primary/10"
              style={{
                left: lassoRect.x,
                top: lassoRect.y,
                width: lassoRect.width,
                height: lassoRect.height,
              }}
            />
          )}
          {inkTool === "lasso" && lassoSelectedPayload && lassoSelectionBounds && (
            <div
              className="absolute z-20"
              style={{
                left: lassoSelectionBounds.x,
                top: Math.max(0, lassoSelectionBounds.y - 28),
              }}
            >
              <button
                type="button"
                className="cursor-grab active:cursor-grabbing rounded-full border border-primary/60 bg-primary/10 px-3 py-1 text-[11px] text-primary shadow"
                draggable
                data-lasso-control
                onDragStart={handleLassoDragStart}
              >
                Drag selection
              </button>
            </div>
          )}
          <div className="md:flex md:items-start md:gap-6">
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
                              selectedWordIds={lassoSelectedWordIds}
                              selectedWordsPayload={lassoSelectedPayload}
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
                    selectedWordIds={lassoSelectedWordIds}
                    selectedWordsPayload={lassoSelectedPayload}
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
              <div className="flex items-start gap-3 md:sticky md:top-0 self-start">
                <div className="flex flex-col items-center gap-2 rounded-full border border-border/60 bg-background/80 px-1.5 py-2 shadow-sm backdrop-blur">
                  <button
                    type="button"
                    className={`rounded-full border px-2 py-2 text-[10px] uppercase tracking-[0.2em] transition [writing-mode:vertical-rl] ${
                      notesPanelTab === "notes"
                        ? "border-primary bg-primary/15 text-primary shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/60 hover:bg-accent/40"
                    }`}
                    onClick={() => setNotesPanelTab("notes")}
                  >
                    Notes
                  </button>
                  {hasSelectedStrong && (
                    <>
                      <button
                        type="button"
                        className={`rounded-full border px-2 py-2 text-[10px] uppercase tracking-[0.2em] transition [writing-mode:vertical-rl] ${
                          notesPanelTab === "definition"
                            ? "border-primary bg-primary/15 text-primary shadow-sm"
                            : "border-border text-muted-foreground hover:border-primary/60 hover:bg-accent/40"
                        }`}
                        onClick={() => setNotesPanelTab("definition")}
                      >
                        Definition
                      </button>
                      <button
                        type="button"
                        className={`rounded-full border px-2 py-2 text-[10px] uppercase tracking-[0.2em] transition [writing-mode:vertical-rl] ${
                          notesPanelTab === "occurrences"
                            ? "border-primary bg-primary/15 text-primary shadow-sm"
                            : "border-border text-muted-foreground hover:border-primary/60 hover:bg-accent/40"
                        }`}
                        onClick={() => setNotesPanelTab("occurrences")}
                      >
                        Occurrences
                      </button>
                    </>
                  )}
                </div>
                <div
                  ref={notesPanelRef}
                  className="relative mt-0 md:mt-0 md:w-[320px] lg:w-[380px] h-[calc(100vh-220px)] max-h-[calc(100vh-220px)] pr-2 space-y-3 min-w-[240px] max-w-[720px] overflow-visible"
                  style={notesPanelWidth ? { width: notesPanelWidth } : undefined}
                >
                  <div
                    className="absolute left-0 top-1/2 z-10 h-14 w-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border border-border bg-background shadow"
                    style={{ touchAction: "none" }}
                    onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const panel = notesPanelRef.current;
                    if (!panel) return;
                    setIsResizingNotesPanel(true);
                    notesPanelResizeRef.current = {
                      startX: e.clientX,
                      startWidth: panel.getBoundingClientRect().width,
                    };
                  }}
                />
                {notesPanelTab === "notes" && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-full border border-border/70 bg-background/90 text-[10px] text-muted-foreground shadow-sm">
                        <button
                          type="button"
                          className={`px-2 py-0.5 transition ${
                            !noteLinkRangeMode
                              ? "rounded-full bg-primary text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                          onClick={() => {
                            setNoteLinkRangeMode(false);
                            setNoteLinkRangeEndVerse(noteLinkStartVerseNumber);
                          }}
                        >
                          Single
                        </button>
                        <button
                          type="button"
                          className={`px-2 py-0.5 transition ${
                            noteLinkRangeMode
                              ? "rounded-full bg-primary text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                          onClick={() => {
                            setNoteLinkRangeMode(true);
                            setNoteLinkRangeEndVerse(noteLinkStartVerseNumber);
                          }}
                        >
                          Multiple
                        </button>
                      </div>
                      <div className="relative inline-flex">
                        <div
                          className={`flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-2 py-0.5 text-[11px] text-foreground shadow-sm ${
                            noteLinkRangeOptions.length === 0 ? "opacity-50" : ""
                          }`}
                        >
                          <span>{noteLinkRangeDisplay}</span>
                          {noteLinkRangeMode && (
                            <span className="text-[10px] text-muted-foreground">
                              ▾
                            </span>
                          )}
                        </div>
                        {noteLinkRangeMode && (
                          <select
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            value={noteLinkRangeEndVerse ?? noteLinkStartVerseNumber}
                            onChange={(e) =>
                              setNoteLinkRangeEndVerse(Number(e.target.value))
                            }
                            disabled={!noteLinkRangeOptions.length}
                          >
                            {noteLinkRangeOptions.length === 0 && (
                              <option value={noteLinkStartVerseNumber}>1</option>
                            )}
                            {noteLinkRangeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <select
                        className="min-w-[160px] rounded-md border border-border bg-background px-2 py-1 text-xs"
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
                        className="text-[11px] md:text-xs px-2 py-1 rounded-md border border-border hover:border-primary/60 hover:bg-accent/40 transition-colors"
                        onClick={handleRenameNotebook}
                        disabled={!activeNotebookId}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="text-[11px] md:text-xs px-2 py-1 rounded-md border border-border hover:border-primary/60 hover:bg-accent/40 transition-colors"
                        onClick={handleCreateNotebook}
                      >
                        New
                      </button>
                    </div>
                    <div
                      ref={notesAreaRef}
                      className={`relative h-full rounded-xl border border-dashed border-border/70 bg-card/50 px-3 py-3 ${isResizingNotesPanel ? "overflow-hidden" : "overflow-y-auto"}`}
                      onDragOver={handleNotesDragOver}
                      onDrop={handleNotesDrop}
                    >
                      <div
                        className="min-h-full"
                        style={{ height: notesScrollHeight }}
                      />
                      <div className="absolute inset-0 pointer-events-none">
                        {visibleInkTextBoxes.map((box) => (
                          <div
                            key={box.id}
                            data-ink-textbox
                            className="absolute pointer-events-auto border border-primary/60 bg-transparent"
                            style={{
                              left: box.x,
                              top: box.y,
                              width: box.width,
                              height: box.height,
                              borderWidth: box.borderWidth,
                              touchAction: "pan-y",
                            }}
                          >
                            <textarea
                              className="h-full w-full resize-none bg-transparent px-2 py-1 text-foreground outline-none"
                              readOnly={!box.isEditing}
                              style={{ touchAction: "pan-y" }}
                              value={box.text}
                              onChange={(e) =>
                                updateTextBoxById(box.id, (current) => ({
                                  ...current,
                                  text: e.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-border bg-background/90 px-2 py-0.5 text-[10px] text-muted-foreground shadow"
                              onClick={() =>
                                updateTextBoxById(box.id, (current) => ({
                                  ...current,
                                  isEditing: !current.isEditing,
                                }))
                              }
                            >
                              {box.isEditing ? "Done" : "Edit"}
                            </button>
                            {box.isEditing && (
                              <div
                                className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 cursor-ew-resize rounded-full border border-border bg-background shadow"
                                style={{ touchAction: "none" }}
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  textBoxResizeRef.current = {
                                    id: box.id,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    startLeft: box.x,
                                    startWidth: box.width,
                                    startHeight: box.height,
                                  };
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {notesPanelTab === "definition" && hasSelectedStrong && selectedStrong && (
                  <div className="h-full rounded-xl border border-border/70 bg-card/50 px-3 py-3 overflow-y-auto space-y-3">
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

                    <div className="flex justify-center pt-1">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] md:text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => {
                          setSelectedStrong(null);
                          setStrongOccurrences([]);
                          setShowOccurrences(false);
                          setNotesPanelTab("notes");
                        }}
                      >
                        <ChevronDown className="h-3 w-3" />
                        <span>Close Strong&apos;s</span>
                      </button>
                    </div>
                  </div>
                )}
                {notesPanelTab === "occurrences" && hasSelectedStrong && selectedStrong && (
                  <div className="h-full rounded-xl border border-border/70 bg-card/50 px-3 py-3 overflow-y-auto space-y-3">
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

                    <div className="text-[11px] md:text-xs text-muted-foreground">
                      New Testament occurrences:{" "}
                      {isScanningOccurrences
                        ? "scanning…"
                        : strongOccurrences.length}
                    </div>

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

                    <div className="flex justify-center pt-1">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] md:text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => {
                          setSelectedStrong(null);
                          setStrongOccurrences([]);
                          setNotesPanelTab("notes");
                        }}
                      >
                        <ChevronDown className="h-3 w-3" />
                        <span>Close Strong&apos;s</span>
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
          </div>
        </ScrollArea>
        {inkEnabled && (
          <canvas
            ref={inkCanvasRef}
            className={`absolute inset-0 z-0 pointer-events-none ${
              isInkScrolling ? "opacity-0" : "opacity-100"
            }`}
          />
        )}
        {inkEnabled && inkTool === "eraser" && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            <div
              ref={eraserCursorRef}
              className="absolute rounded-full border border-primary/70 bg-primary/10"
              style={{
                width: eraserSize,
                height: eraserSize,
                left: 0,
                top: 0,
                opacity: 0,
                transform: "translate3d(-9999px, -9999px, 0)",
                willChange: "transform",
              }}
            />
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-1/2 z-50 w-[min(100%-1.5rem,860px)] -translate-x-1/2">
        <div className="relative flex justify-center">
          {showInkSettings && inkTool !== "select" && (
            <div className="absolute bottom-full mb-3 w-[min(100%,520px)]">
              <div className="rounded-2xl border border-border/70 bg-background/95 px-3 py-2 shadow-xl backdrop-blur">
                {inkTool !== "eraser" && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {inkColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`h-6 w-6 rounded-full border transition-all ${
                          inkColor === color.value
                            ? "border-foreground shadow-md scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => {
                          setInkColor(color.value);
                          setShowInkSettings(false);
                        }}
                        aria-label={`Ink color ${color.name}`}
                      />
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[10px] md:text-xs">
                  <label className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {inkTool === "pen"
                        ? "Pen size"
                        : inkTool === "highlighter"
                          ? "HL size"
                          : inkTool === "eraser"
                            ? "Eraser"
                            : "Border"}
                    </span>
                    <input
                      type="range"
                      min={inkTool === "highlighter" ? 6 : inkTool === "eraser" ? 6 : 1}
                      max={inkTool === "highlighter" ? 40 : inkTool === "eraser" ? 60 : 12}
                      step={inkTool === "pen" ? 0.5 : 1}
                      value={
                        inkTool === "highlighter"
                          ? highlighterSize
                          : inkTool === "eraser"
                            ? eraserSize
                            : penSize
                      }
                      onChange={(e) =>
                        inkTool === "highlighter"
                          ? setHighlighterSize(parseFloat(e.target.value))
                          : inkTool === "eraser"
                            ? setEraserSize(parseFloat(e.target.value))
                            : setPenSize(parseFloat(e.target.value))
                      }
                      onPointerUp={() => setShowInkSettings(false)}
                      className="w-28"
                    />
                    <span className="w-8 text-right">
                      {inkTool === "highlighter"
                        ? Math.round(highlighterSize)
                        : inkTool === "eraser"
                          ? Math.round(eraserSize)
                          : penSize.toFixed(1)}
                    </span>
                  </label>
                  {inkTool === "highlighter" && (
                    <label className="flex items-center gap-2">
                      <span className="text-muted-foreground">Opacity</span>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={highlighterOpacity}
                        onChange={(e) =>
                          setHighlighterOpacity(parseFloat(e.target.value))
                        }
                        onPointerUp={() => setShowInkSettings(false)}
                        className="w-28"
                      />
                      <span className="w-8 text-right">
                        {Math.round(highlighterOpacity * 100)}%
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}
          <div
            className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/95 px-3 py-2 shadow-xl backdrop-blur"
          >
            <div className="flex items-center justify-center gap-2">
              <button
              type="button"
              className={`h-9 w-9 rounded-full border transition-colors flex items-center justify-center ${
                inkTool === "select"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/60 hover:bg-accent/40"
              }`}
              onClick={() => {
                setInkTool("select");
                setShowInkSettings(false);
              }}
              aria-label="Select tool"
            >
              <MousePointer2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`h-9 w-9 rounded-full border transition-colors flex items-center justify-center ${
                inkTool === "lasso"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/60 hover:bg-accent/40"
              }`}
              onClick={() => {
                setInkTool("lasso");
                setShowInkSettings(false);
              }}
              aria-label="Lasso tool"
            >
              <Lasso className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`h-9 w-9 rounded-full border transition-colors flex items-center justify-center ${
                inkTool === "pen"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/60 hover:bg-accent/40"
              }`}
              onClick={() => {
                setInkTool("pen");
                setShowInkSettings(true);
              }}
              aria-label="Pen tool"
            >
              <PenTool className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`h-9 w-9 rounded-full border transition-colors flex items-center justify-center ${
                inkTool === "highlighter"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/60 hover:bg-accent/40"
              }`}
              onClick={() => {
                setInkTool("highlighter");
                setShowInkSettings(true);
              }}
              aria-label="Highlighter tool"
            >
              <Highlighter className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`h-9 w-9 rounded-full border transition-colors flex items-center justify-center ${
                inkTool === "textbox"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/60 hover:bg-accent/40"
              }`}
              onClick={() => {
                setInkTool("textbox");
                setShowInkSettings(true);
              }}
              aria-label="Text box tool"
            >
              <Type className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`h-9 w-9 rounded-full border transition-colors flex items-center justify-center ${
                inkTool === "eraser"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/60 hover:bg-accent/40"
              }`}
              onClick={() => {
                setInkTool("eraser");
                setShowInkSettings(true);
              }}
              aria-label="Eraser tool"
            >
              <Eraser className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="text-[11px] md:text-xs px-2 py-1 rounded-full border border-border hover:border-primary/60 hover:bg-accent/40 transition-colors"
              onClick={handleClearInk}
              disabled={
                inkStrokes.length === 0 &&
                inkTextBoxes.length === 0 &&
                inkTexts.length === 0
              }
            >
              Clear
            </button>
            </div>
            <div className="mx-3 h-8 w-px bg-border/70" />
            <div className="flex items-center justify-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-accent/40 flex items-center justify-center"
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="end"
                  className="w-[min(90vw,320px)] rounded-2xl border border-border/70 bg-background/95 p-3 shadow-xl backdrop-blur"
                >
                  <div className="relative w-full">
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
                      <div className="mt-1 rounded-xl border bg-popover shadow-sm overflow-hidden">
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
                </PopoverContent>
              </Popover>
              {onToggleTheme && theme && (
                <button
                  type="button"
                  className="h-9 w-9 rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-accent/40 flex items-center justify-center"
                  onClick={onToggleTheme}
                  aria-label="Toggle theme"
                >
                  {theme === "light" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                className="h-9 w-9 rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-accent/40 flex items-center justify-center disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-transparent"
                onClick={handlePrevChapter}
                disabled={!canGoPrevChapter}
                aria-label="Previous chapter"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-[170px] text-center text-xs font-medium text-foreground/80">
                {book} {chapter} · {selectedTranslation}
              </div>
              <button
                type="button"
                className="h-9 w-9 rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-accent/40 flex items-center justify-center disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-transparent"
                onClick={handleNextChapter}
                disabled={!canGoNextChapter}
                aria-label="Next chapter"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            <Popover open={bookPopoverOpen} onOpenChange={setBookPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-9 w-9 rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-accent/40 flex items-center justify-center"
                  aria-label="Choose book and chapter"
                >
                  <BookOpen className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="center"
                className="w-72 rounded-2xl border border-border/70 bg-background/95 p-3 shadow-xl backdrop-blur"
              >
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Jump to
                </div>
                <div className="mt-2 space-y-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Book</Label>
                    <div className="rounded-md border border-border bg-background">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-2 py-1 text-left text-xs font-medium"
                        onClick={() => setBookPickerOldOpen((prev) => !prev)}
                      >
                        <span>Old Testament</span>
                        <span className="text-muted-foreground">
                          {bookPickerOldOpen ? "−" : "+"}
                        </span>
                      </button>
                      {bookPickerOldOpen && (
                        <div className="max-h-40 overflow-y-auto border-t border-border/70">
                          {oldTestamentBooks.map((entry) => (
                            <button
                              key={entry.name}
                              type="button"
                              className={`w-full px-2 py-1 text-left text-xs transition-colors hover:bg-accent ${
                                entry.name === bookPickerBook
                                  ? "bg-accent/60 text-primary"
                                  : ""
                              }`}
                              onClick={() => handleBookPickerBookChange(entry.name)}
                            >
                              {entry.name}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="border-t border-border/70" />
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-2 py-1 text-left text-xs font-medium"
                        onClick={() => setBookPickerNewOpen((prev) => !prev)}
                      >
                        <span>New Testament</span>
                        <span className="text-muted-foreground">
                          {bookPickerNewOpen ? "−" : "+"}
                        </span>
                      </button>
                      {bookPickerNewOpen && (
                        <div className="max-h-40 overflow-y-auto border-t border-border/70">
                          {newTestamentBooks.map((entry) => (
                            <button
                              key={entry.name}
                              type="button"
                              className={`w-full px-2 py-1 text-left text-xs transition-colors hover:bg-accent ${
                                entry.name === bookPickerBook
                                  ? "bg-accent/60 text-primary"
                                  : ""
                              }`}
                              onClick={() => handleBookPickerBookChange(entry.name)}
                            >
                              {entry.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Chapter
                    </Label>
                    <select
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                      value={bookPickerChapter}
                      onChange={(e) =>
                        setBookPickerChapter(Number(e.target.value))
                      }
                    >
                      {bookPickerChapterOptions.map((chapterNumber) => (
                        <option key={chapterNumber} value={chapterNumber}>
                          {chapterNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-md border border-border bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20 disabled:opacity-50"
                    onClick={() => {
                      onNavigate?.(bookPickerBook, bookPickerChapter);
                      setBookPopoverOpen(false);
                    }}
                    disabled={!onNavigate}
                  >
                    Go
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-9 w-9 rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-accent/40 flex items-center justify-center"
                  aria-label="App settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="end"
                className="w-[min(90vw,360px)] rounded-2xl border border-border/70 bg-background/95 p-3 shadow-xl backdrop-blur"
              >
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Settings
                </div>
                <div className="mt-2 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Translation
                    </Label>
                    <Select
                      value={selectedTranslation}
                      onValueChange={(value) =>
                        onTranslationChange(value as Translation)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {translations.map((trans) => (
                          <SelectItem key={trans.id} value={trans.id}>
                            {trans.name} - {trans.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label
                        htmlFor="display-mode-toggle"
                        className="text-xs"
                      >
                        Book mode
                      </Label>
                      <Switch
                        id="display-mode-toggle"
                        checked={displayMode === "book"}
                        onCheckedChange={(checked) =>
                          onDisplayModeChange(checked ? "book" : "verse")
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="notes-toggle" className="text-xs">
                        Show notes
                      </Label>
                      <Switch
                        id="notes-toggle"
                        checked={showNotes}
                        onCheckedChange={onToggleNotes}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Study tools
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="strongs-toggle" className="text-xs">
                        Strong&apos;s numbers
                      </Label>
                      <Switch
                        id="strongs-toggle"
                        checked={showStrongsNumbers}
                        onCheckedChange={onToggleStrongsNumbers}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="interlinear-toggle" className="text-xs">
                        Interlinear
                      </Label>
                      <Switch
                        id="interlinear-toggle"
                        checked={showInterlinear}
                        onCheckedChange={onToggleInterlinear}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Label
                        htmlFor="strongs-english-only-toggle"
                        className="text-xs"
                      >
                        Strong&apos;s only
                      </Label>
                      <Switch
                        id="strongs-english-only-toggle"
                        checked={showStrongsEnglishOnly}
                        onCheckedChange={onToggleStrongsEnglishOnly}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Label
                        htmlFor="hide-all-english-toggle"
                        className="text-xs"
                      >
                        Hide all English
                      </Label>
                      <Switch
                        id="hide-all-english-toggle"
                        checked={hideAllEnglish}
                        onCheckedChange={onToggleHideAllEnglish}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Fonts
                    </div>
                    <Slider
                      value={[fontSize]}
                      onValueChange={(values) => onFontSizeChange(values[0])}
                      min={10}
                      max={40}
                      step={1}
                    />
                    <div className="text-[11px] text-muted-foreground">
                      Size: {fontSize}px
                    </div>
                    <Select
                      value={fontFamily}
                      onValueChange={(value) =>
                        onFontFamilyChange(
                          value as "serif" | "sans" | "mono" | "gentium"
                        )
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="serif">Crimson Pro (Serif)</SelectItem>
                        <SelectItem value="gentium">
                          Gentium Book (Serif)
                        </SelectItem>
                        <SelectItem value="sans">Inter (Sans)</SelectItem>
                        <SelectItem value="mono">JetBrains Mono</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
