import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  getVersesByChapter,
  bibleBooks,
  type Translation,
  type BibleVerseWithTokens,
} from "@/lib/bibleData";

type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "quote"
  | "bullet"
  | "ordered"
  | "verse";

type AlignType = "left" | "center" | "right";

type Block = {
  id: string;
  type: BlockType;
  text: string;
  linkedVerseId?: string;
  isVerseCollapsed?: boolean;
  bgColor?: string | null;
  textColor?: string | null;
  fontSize?: number | null;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  align?: AlignType;
  verseRefs?: { book: string; chapter: number; verse: number; endVerse?: number }[];
  verseText?: string;
};

type SlashItem = {
  key: string;
  label: string;
  description: string;
  matches: string[];
  apply: (block: Block, query: string) => Block;
};

type BlockNotesEditorProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  translation?: Translation;
  onUserEdit?: () => void;
  onUserBlur?: () => void;
  onFocusChange?: (focused: boolean) => void;
  onFocusedBlockStyleChange?: (style: FocusedBlockStyle | null) => void;
};

export type FocusedBlockStyle = {
  type: BlockType;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  bgColor?: string | null;
};

export type NotesFormatCommand =
  | { type: "setBlockType"; blockType: BlockType }
  | { type: "toggleBold" }
  | { type: "toggleItalic" }
  | { type: "toggleUnderline" }
  | { type: "setBlockColor"; color: string | null };

export type BlockNotesEditorHandle = {
  applyFormat: (command: NotesFormatCommand) => void;
};

export const NOTE_BLOCK_COLORS = ["#fde68a", "#bfdbfe", "#bbf7d0"];

const buildId = () => `block-${Math.random().toString(36).slice(2, 9)}`;

const encodeAttr = (value: string) => encodeURIComponent(value);
const decodeAttr = (value: string | null) => (value ? decodeURIComponent(value) : null);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildColorAttrs = (block: Block) => {
  const bgAttr = block.bgColor ? ` data-block-bg="${block.bgColor}"` : "";
  const textAttr = block.textColor ? ` data-block-text="${block.textColor}"` : "";
  const sizeAttr =
    typeof block.fontSize === "number"
      ? ` data-block-size="${block.fontSize}"`
      : "";
  const boldAttr = block.isBold ? ` data-block-bold="1"` : "";
  const italicAttr = block.isItalic ? ` data-block-italic="1"` : "";
  const underlineAttr = block.isUnderline ? ` data-block-underline="1"` : "";
  const alignAttr = block.align ? ` data-block-align="${block.align}"` : "";
  return `${bgAttr}${textAttr}${sizeAttr}${boldAttr}${italicAttr}${underlineAttr}${alignAttr}`;
};

const blockToHtml = (block: Block) => {
  const text = escapeHtml(block.text).replace(/\n/g, "<br>");
  const colorAttr = buildColorAttrs(block);
  switch (block.type) {
    case "verse": {
      const refsAttr = block.verseRefs
        ? ` data-block-refs="${encodeAttr(JSON.stringify(block.verseRefs))}"`
        : "";
      const verseAttr = block.verseText
        ? ` data-block-verse="${encodeAttr(block.verseText)}"`
        : "";
      return `<div data-block-type="verse"${refsAttr}${verseAttr}></div>`;
    }
    case "heading1":
      return `<h1${colorAttr}>${text}</h1>`;
    case "heading2":
      return `<h2${colorAttr}>${text}</h2>`;
    case "heading3":
      return `<h3${colorAttr}>${text}</h3>`;
    case "quote":
      return `<blockquote${colorAttr}>${text}</blockquote>`;
    case "bullet":
      return `<ul><li${colorAttr}>${text}</li></ul>`;
    case "ordered":
      return `<ol><li${colorAttr}>${text}</li></ol>`;
    default:
      return `<p${colorAttr}>${text}</p>`;
  }
};

const blocksToHtml = (blocks: Block[]) => blocks.map(blockToHtml).join("");

const LTR_ISOLATE = "\u2066";
const LTR_PDI = "\u2069";

const stripLtrMarkers = (value: string) =>
  value.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");

const applyLtrMarkers = (value: string) => {
  if (!value) return "";
  const cleaned = stripLtrMarkers(value);
  return `${LTR_ISOLATE}${cleaned}${LTR_PDI}`;
};

const toDomOffset = (value: string, rawOffset: number, hasMarkers: boolean) => {
  if (!value) return 0;
  const clampedOffset = Math.max(0, Math.min(rawOffset, value.length));
  return clampedOffset + (hasMarkers ? 1 : 0);
};

const normalizeText = (node: Element) => {
  const raw =
    "innerText" in node
      ? (node as HTMLElement).innerText
      : node.textContent ?? "";
  return raw
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\r/g, "")
    .replace(/\n+$/g, "");
};

const parseBlocksFromHtml = (html: string): Block[] => {
  if (!html || !html.trim()) {
    return [{ id: buildId(), type: "paragraph", text: "" }];
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;
  const blocks: Block[] = [];

  const pushBlock = (
    type: BlockType,
    text: string,
    bgColor?: string | null,
    textColor?: string | null,
    fontSize?: number | null
  ) => {
    blocks.push({
      id: buildId(),
      type,
      text,
      bgColor: bgColor ?? null,
      textColor: textColor ?? null,
      fontSize: fontSize ?? null,
      isBold: false,
      isItalic: false,
      isUnderline: false,
      align: "left",
    });
  };

  Array.from(body.children).forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const blockType = el.getAttribute("data-block-type");
    const baseBg = el.getAttribute("data-block-bg");
    const baseText = el.getAttribute("data-block-text");
    const baseSizeRaw = el.getAttribute("data-block-size");
    const baseSize = baseSizeRaw ? Number(baseSizeRaw) : null;
    const baseBold = el.getAttribute("data-block-bold") === "1";
    const baseItalic = el.getAttribute("data-block-italic") === "1";
    const baseUnderline = el.getAttribute("data-block-underline") === "1";
    const baseAlign = (el.getAttribute("data-block-align") as AlignType) ?? "left";
    if (blockType === "verse") {
      const refsRaw = decodeAttr(el.getAttribute("data-block-refs"));
      const verseRaw = decodeAttr(el.getAttribute("data-block-verse"));
      let refs: Block["verseRefs"] = [];
      if (refsRaw) {
        try {
          refs = JSON.parse(refsRaw) as Block["verseRefs"];
        } catch {
          refs = [];
        }
      }
      blocks.push({
        id: buildId(),
        type: "verse",
        text: "",
        verseRefs: refs ?? [],
        verseText: verseRaw ?? normalizeText(el),
      });
      return;
    }
    if (tag === "h1") {
      blocks.push({
        id: buildId(),
        type: "heading1",
        text: normalizeText(el),
        bgColor: baseBg ?? null,
        textColor: baseText ?? null,
        fontSize: baseSize ?? null,
        isBold: baseBold,
        isItalic: baseItalic,
        isUnderline: baseUnderline,
        align: baseAlign,
      });
    } else if (tag === "h2") {
      blocks.push({
        id: buildId(),
        type: "heading2",
        text: normalizeText(el),
        bgColor: baseBg ?? null,
        textColor: baseText ?? null,
        fontSize: baseSize ?? null,
        isBold: baseBold,
        isItalic: baseItalic,
        isUnderline: baseUnderline,
        align: baseAlign,
      });
    } else if (tag === "h3") {
      blocks.push({
        id: buildId(),
        type: "heading3",
        text: normalizeText(el),
        bgColor: baseBg ?? null,
        textColor: baseText ?? null,
        fontSize: baseSize ?? null,
        isBold: baseBold,
        isItalic: baseItalic,
        isUnderline: baseUnderline,
        align: baseAlign,
      });
    } else if (tag === "blockquote") {
      blocks.push({
        id: buildId(),
        type: "quote",
        text: normalizeText(el),
        bgColor: baseBg ?? null,
        textColor: baseText ?? null,
        fontSize: baseSize ?? null,
        isBold: baseBold,
        isItalic: baseItalic,
        isUnderline: baseUnderline,
        align: baseAlign,
      });
    } else if (tag === "ul") {
      Array.from(el.querySelectorAll("li")).forEach((li) => {
        const bg = li.getAttribute("data-block-bg") ?? baseBg;
        const text = li.getAttribute("data-block-text") ?? baseText;
        const sizeRaw = li.getAttribute("data-block-size");
        const size = sizeRaw ? Number(sizeRaw) : baseSize;
        const bold = li.getAttribute("data-block-bold") === "1" || baseBold;
        const italic = li.getAttribute("data-block-italic") === "1" || baseItalic;
        const underline = li.getAttribute("data-block-underline") === "1" || baseUnderline;
        const align = (li.getAttribute("data-block-align") as AlignType) ?? baseAlign;
        blocks.push({
          id: buildId(),
          type: "bullet",
          text: normalizeText(li),
          bgColor: bg ?? null,
          textColor: text ?? null,
          fontSize: size ?? null,
          isBold: bold,
          isItalic: italic,
          isUnderline: underline,
          align,
        });
      });
    } else if (tag === "ol") {
      Array.from(el.querySelectorAll("li")).forEach((li) => {
        const bg = li.getAttribute("data-block-bg") ?? baseBg;
        const text = li.getAttribute("data-block-text") ?? baseText;
        const sizeRaw = li.getAttribute("data-block-size");
        const size = sizeRaw ? Number(sizeRaw) : baseSize;
        const bold = li.getAttribute("data-block-bold") === "1" || baseBold;
        const italic = li.getAttribute("data-block-italic") === "1" || baseItalic;
        const underline = li.getAttribute("data-block-underline") === "1" || baseUnderline;
        const align = (li.getAttribute("data-block-align") as AlignType) ?? baseAlign;
        blocks.push({
          id: buildId(),
          type: "ordered",
          text: normalizeText(li),
          bgColor: bg ?? null,
          textColor: text ?? null,
          fontSize: size ?? null,
          isBold: bold,
          isItalic: italic,
          isUnderline: underline,
          align,
        });
      });
    } else if (tag === "p" || tag === "div") {
      blocks.push({
        id: buildId(),
        type: "paragraph",
        text: normalizeText(el),
        bgColor: baseBg ?? null,
        textColor: baseText ?? null,
        fontSize: baseSize ?? null,
        isBold: baseBold,
        isItalic: baseItalic,
        isUnderline: baseUnderline,
        align: baseAlign,
      });
    } else {
      blocks.push({
        id: buildId(),
        type: "paragraph",
        text: normalizeText(el),
        bgColor: baseBg ?? null,
        textColor: baseText ?? null,
        fontSize: baseSize ?? null,
        isBold: baseBold,
        isItalic: baseItalic,
        isUnderline: baseUnderline,
        align: baseAlign,
      });
    }
  });

  if (blocks.length === 0) {
    const fallbackText = (body.textContent ?? "").trim();
    blocks.push({
      id: buildId(),
      type: "paragraph",
      text: fallbackText,
      bgColor: null,
      textColor: null,
      fontSize: null,
      isBold: false,
      isItalic: false,
      isUnderline: false,
      align: "left",
    });
  }

  return blocks;
};

export const BlockNotesEditor = forwardRef<BlockNotesEditorHandle, BlockNotesEditorProps>(
({
  value,
  onChange,
  placeholder = "Start writing…",
  translation = "KJV",
  onUserEdit,
  onUserBlur,
  onFocusChange,
  onFocusedBlockStyleChange,
}, ref) => {
  const [blocks, setBlocks] = useState<Block[]>(() =>
    typeof window === "undefined" ? [{ id: buildId(), type: "paragraph", text: "" }] : parseBlocksFromHtml(value)
  );
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [slashBlockId, setSlashBlockId] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState<string>("");
  const [slashPosition, setSlashPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const [stylePickerBlockId, setStylePickerBlockId] = useState<string | null>(null);
  const [editableBlockId, setEditableBlockId] = useState<string | null>(null);
  const pendingVerseLookup = useRef<Set<string>>(new Set());
  const lastValueRef = useRef(value);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blockRefs = useRef<Record<string, HTMLElement | null>>({});
  const lastPointerTypeRef = useRef<Record<string, string | null>>({});
  const penFocusForcedRef = useRef<Record<string, boolean>>({});
  const lastRenderedTextRef = useRef<Record<string, string>>({});
  const pendingSyncTimeoutsRef = useRef<Record<string, number>>({});
  const pendingTextRef = useRef<Record<string, string>>({});
  const styleButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const styleMenuRef = useRef<HTMLDivElement | null>(null);
  const ignoreBlurRef = useRef(false);
  const bgColors = NOTE_BLOCK_COLORS;
  const textColors = ["#ffffff", "#111827"];
  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }, []);

  const normalizeBook = useCallback(
    (name: string) => name.replace(/[^a-z0-9]/gi, "").toLowerCase(),
    []
  );

  const findBookName = useCallback(
    (raw: string) => {
      const target = normalizeBook(raw);
      return (
        bibleBooks.find(({ name }) =>
          normalizeBook(name).startsWith(target)
        )?.name || null
      );
    },
    [normalizeBook]
  );

  const parseReference = useCallback(
    (text: string) => {
      const regex = /([1-3]?\s*[A-Za-z]+)\s+(\d+)(?::([0-9,\-\s;]+))?/;
      const match = text.match(regex);
      if (!match || match.index === undefined) return null;
      const [, bookRaw, chapterStr, versesRaw] = match;
      const book = findBookName(bookRaw);
      if (!book || !versesRaw) return null;
      const chapter = Number(chapterStr);
      if (!Number.isFinite(chapter)) return null;

      const refs: { book: string; chapter: number; verse: number; endVerse?: number }[] =
        [];
      const segments = versesRaw.split(/[;,]/).map((seg) => seg.trim()).filter(Boolean);
      if (!segments.length) return null;

      for (const segment of segments) {
        const rangeMatch = segment.match(/^(\d+)\s*-\s*(\d+)$/);
        if (rangeMatch) {
          const start = Number(rangeMatch[1]);
          const end = Number(rangeMatch[2]);
          if (Number.isFinite(start) && Number.isFinite(end)) {
            refs.push({
              book,
              chapter,
              verse: Math.min(start, end),
              endVerse: Math.max(start, end),
            });
          }
          continue;
        }
        const single = Number(segment);
        if (Number.isFinite(single)) {
          refs.push({ book, chapter, verse: single });
        }
      }

      if (!refs.length) return null;
      return {
        refs,
        matchStart: match.index,
        matchEnd: match.index + match[0].length,
      };
    },
    [findBookName]
  );

  const refsEqual = useCallback(
    (
      left: { book: string; chapter: number; verse: number; endVerse?: number }[] = [],
      right: { book: string; chapter: number; verse: number; endVerse?: number }[] = []
    ) => {
      if (left.length !== right.length) return false;
      return left.every((ref, index) => {
        const other = right[index];
        return (
          ref.book === other.book &&
          ref.chapter === other.chapter &&
          ref.verse === other.verse &&
          ref.endVerse === other.endVerse
        );
      });
    },
    []
  );

  const buildVerseText = useCallback(
    async (refs: { book: string; chapter: number; verse: number; endVerse?: number }[]) => {
      const grouped = new Map<string, { book: string; chapter: number; refs: typeof refs }>();
      for (const ref of refs) {
        const key = `${ref.book}-${ref.chapter}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.refs.push(ref);
        } else {
          grouped.set(key, { book: ref.book, chapter: ref.chapter, refs: [ref] });
        }
      }

      const lines: string[] = [];
      for (const group of grouped.values()) {
        const verses = (await getVersesByChapter(
          group.book,
          group.chapter,
          translation
        )) as BibleVerseWithTokens[];
        for (const ref of group.refs) {
          const start = ref.verse;
          const end = ref.endVerse ?? ref.verse;
          const slice = verses.filter(
            (v) => v.verse >= start && v.verse <= end
          );
          for (const verse of slice) {
            lines.push(`${verse.verse} ${verse.text}`);
          }
        }
      }

      return lines.join("\n");
    },
    [translation]
  );

  const commitBlockIfReference = useCallback(
    (blockId: string, text: string) => {
      if (!text || pendingVerseLookup.current.has(blockId)) return false;
      const parsed = parseReference(text);
      if (!parsed) return false;

      pendingVerseLookup.current.add(blockId);
      const { refs } = parsed;
      (async () => {
        try {
          const verseText = (await buildVerseText(refs)).trim();
          setBlocks((prev) => {
            const index = prev.findIndex((block) => block.id === blockId);
            if (index === -1) return prev;
            const current = prev[index];
            if (!current || current.type === "verse") return prev;
            const nextBlocks = prev.slice();
            const next = prev[index + 1];
            if (current.linkedVerseId) {
              const verseIndex = nextBlocks.findIndex(
                (block) => block.id === current.linkedVerseId
              );
              if (verseIndex !== -1) {
                const updatedVerse: Block = {
                  ...nextBlocks[verseIndex],
                  type: "verse",
                  verseRefs: refs,
                  verseText: verseText || "Verse not found.",
                };
                nextBlocks[verseIndex] = updatedVerse;
                if (verseIndex !== index + 1) {
                  nextBlocks.splice(verseIndex, 1);
                  const insertAt = verseIndex < index + 1 ? index : index + 1;
                  nextBlocks.splice(insertAt, 0, updatedVerse);
                }
                return nextBlocks;
              }
            }

            if (next?.type === "verse" && refsEqual(next.verseRefs ?? [], refs)) {
              nextBlocks[index] = { ...current, linkedVerseId: next.id };
              return nextBlocks;
            }

            const verseBlockId = buildId();
            const verseBlock: Block = {
              id: verseBlockId,
              type: "verse",
              text: "",
              verseRefs: refs,
              verseText: verseText || "Verse not found.",
            };
            nextBlocks[index] = { ...current, linkedVerseId: verseBlockId };
            nextBlocks.splice(index + 1, 0, verseBlock);
            return nextBlocks;
          });
        } finally {
          pendingVerseLookup.current.delete(blockId);
        }
      })();
      return true;
    },
    [buildVerseText, parseReference, refsEqual]
  );

  const removeLinkedVerseBlock = useCallback((blockId: string) => {
    setBlocks((prev) => {
      const source = prev.find((block) => block.id === blockId);
      if (!source?.linkedVerseId) return prev;
      const next = prev.filter((block) => block.id !== source.linkedVerseId);
      if (next.length === prev.length) return prev;
      return next.map((block) =>
        block.id === blockId ? { ...block, linkedVerseId: undefined } : block
      );
    });
  }, []);

  const slashItems = useMemo<SlashItem[]>(
    () => [
      {
        key: "h1",
        label: "Heading 1",
        description: "Large heading",
        matches: ["h1", "heading1", "title"],
        apply: (block) => ({ ...block, type: "heading1", text: "" }),
      },
      {
        key: "h2",
        label: "Heading 2",
        description: "Medium heading",
        matches: ["h2", "heading2"],
        apply: (block) => ({ ...block, type: "heading2", text: "" }),
      },
      {
        key: "h3",
        label: "Heading 3",
        description: "Small heading",
        matches: ["h3", "heading3"],
        apply: (block) => ({ ...block, type: "heading3", text: "" }),
      },
      {
        key: "quote",
        label: "Quote",
        description: "Block quote",
        matches: ["quote", "blockquote"],
        apply: (block) => ({ ...block, type: "quote", text: "" }),
      },
      {
        key: "p",
        label: "Paragraph",
        description: "Normal text",
        matches: ["p", "text", "paragraph"],
        apply: (block) => ({ ...block, type: "paragraph", text: "" }),
      },
      {
        key: "v",
        label: "Insert Verse",
        description: "Insert verse reference",
        matches: ["v", "verse", "ref"],
        apply: (block, query) => ({
          ...block,
          type: "paragraph",
          text: query.trim() || "John 1:1",
        }),
      },
    ],
    []
  );

  const filteredSlashItems = useMemo(() => {
    const q = slashQuery.trim().toLowerCase();
    if (!q) return slashItems;
    return slashItems.filter((item) =>
      item.matches.some((entry) => entry.toLowerCase().includes(q))
    );
  }, [slashItems, slashQuery]);

  useEffect(() => {
    if (value === lastValueRef.current) return;
    if (typeof window === "undefined") return;
    setBlocks(parseBlocksFromHtml(value));
    lastValueRef.current = value;
  }, [value]);

  useEffect(() => {
    const next = blocksToHtml(blocks);
    if (next === lastValueRef.current) return;
    lastValueRef.current = next;
    onChange(next);
  }, [blocks, onChange]);

  const activeStyleBlock = useMemo(
    () => blocks.find((block) => block.id === stylePickerBlockId) ?? null,
    [blocks, stylePickerBlockId]
  );
  const activeStyleDefaultSize = useMemo(() => {
    if (!activeStyleBlock) return 16;
    switch (activeStyleBlock.type) {
      case "heading1":
        return 36;
      case "heading2":
        return 28;
      case "heading3":
        return 22;
      case "quote":
        return 16;
      case "bullet":
      case "ordered":
      case "paragraph":
      default:
        return 16;
    }
  }, [activeStyleBlock]);
  const activeSize = activeStyleBlock
    ? activeStyleBlock.fontSize ?? activeStyleDefaultSize
    : 16;


  const toggleStyleMenu = useCallback((blockId: string) => {
    ignoreBlurRef.current = true;
    setStylePickerBlockId((current) => (current === blockId ? null : blockId));
    setTimeout(() => {
      ignoreBlurRef.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    if (!stylePickerBlockId) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const menu = styleMenuRef.current;
      const button = styleButtonRefs.current[stylePickerBlockId] ?? null;
      if (menu && menu.contains(target)) return;
      if (button && button.contains(target)) return;
      setStylePickerBlockId(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [stylePickerBlockId]);

  const updateSlashPosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return;
    setSlashPosition({
      left: rect.left - container.left,
      top: rect.bottom - container.top + 8,
    });
  }, []);

const getBlockText = useCallback((element: HTMLElement) => {
  const raw = isIOS
    ? (element.textContent ?? "")
    : (element.innerText ?? element.textContent ?? "");
  return raw
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\u200B/g, "")
    .replace(/\r/g, "");
}, [isIOS]);

const normalizeSingleLine = (value: string) => value.replace(/[\r\n]+/g, " ");

  const placeCaretAtEnd = useCallback((element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const focusBlock = useCallback((blockId: string, offset?: number) => {
    setFocusedBlockId(blockId);
    const el = blockRefs.current[blockId];
    if (!el) return;
    el.focus();
    if (typeof offset === "number") {
      const rawText = stripLtrMarkers(el.textContent ?? "");
      const hasMarkers = (el.textContent ?? "").startsWith(LTR_ISOLATE);
      const resolvedOffset = toDomOffset(rawText, offset, hasMarkers);
      const selection = window.getSelection();
      if (!selection) return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let currentOffset = 0;
      let node = walker.nextNode();
      while (node) {
        const length = node.textContent?.length ?? 0;
        if (currentOffset + length >= resolvedOffset) {
          const range = document.createRange();
          range.setStart(node, Math.max(0, resolvedOffset - currentOffset));
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
        currentOffset += length;
        node = walker.nextNode();
      }
    }
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  useEffect(() => {
    if (editableBlockId) {
      focusBlock(editableBlockId);
    }
  }, [editableBlockId, focusBlock]);

  const getCaretOffset = useCallback((element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer)) return null;
    const preRange = range.cloneRange();
    preRange.selectNodeContents(element);
    preRange.setEnd(range.startContainer, range.startOffset);
    const offset = stripLtrMarkers(preRange.toString()).length;
    return offset;
  }, []);

  const syncBlockText = useCallback(
    (blockId: string, text: string) => {
      onUserEdit?.();
      const normalizedText = normalizeSingleLine(text);
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === blockId ? { ...block, text: normalizedText } : block
        )
      );
      if (!parseReference(normalizedText)) {
        removeLinkedVerseBlock(blockId);
      }
      const match = normalizedText.match(/^\/(\S*)$/);
      if (match) {
        setSlashBlockId(blockId);
        setSlashQuery(match[1] ?? "");
        updateSlashPosition();
      } else if (slashBlockId === blockId) {
        setSlashBlockId(null);
        setSlashQuery("");
        setSlashPosition(null);
      }
    },
    [onUserEdit, parseReference, removeLinkedVerseBlock, slashBlockId, updateSlashPosition]
  );

  const clearPendingSync = useCallback((blockId: string) => {
    const pending = pendingSyncTimeoutsRef.current[blockId];
    if (pending) {
      window.clearTimeout(pending);
      pendingSyncTimeoutsRef.current[blockId] = 0;
    }
  }, []);

  const scheduleBlockSync = useCallback(
    (blockId: string, text: string) => {
      pendingTextRef.current[blockId] = text;
      clearPendingSync(blockId);
      pendingSyncTimeoutsRef.current[blockId] = window.setTimeout(() => {
        const pendingText = pendingTextRef.current[blockId] ?? "";
        syncBlockText(blockId, pendingText);
      }, 300);
    },
    [clearPendingSync, syncBlockText]
  );

  const flushBlockSync = useCallback(
    (blockId: string) => {
      clearPendingSync(blockId);
      const el = blockRefs.current[blockId];
      if (!el) return;
      const latestText = getBlockText(el);
      syncBlockText(blockId, latestText);
      commitBlockIfReference(blockId, latestText);
    },
    [clearPendingSync, commitBlockIfReference, getBlockText, syncBlockText]
  );

  useEffect(() => {
    if (!focusedBlockId) return;
    const handlePointerDown = (event: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      if (container.contains(event.target as Node)) return;
      flushBlockSync(focusedBlockId);
      setFocusedBlockId(null);
      setStylePickerBlockId(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [focusedBlockId, flushBlockSync]);

  const handleInput = useCallback(
    (blockId: string, element: HTMLElement) => {
      const text = normalizeSingleLine(getBlockText(element));
      scheduleBlockSync(blockId, text);
    },
    [getBlockText, scheduleBlockSync]
  );

  const insertBlockAfter = useCallback(
    (
      blockId: string,
      nextText = "",
      colors?: { bgColor?: string | null; textColor?: string | null }
    ) => {
      const nextBlock: Block = {
        id: buildId(),
        type: "paragraph",
        text: "",
        bgColor: colors?.bgColor ?? null,
        textColor: colors?.textColor ?? null,
        fontSize: null,
      };
      setBlocks((prev) => {
        const index = prev.findIndex((block) => block.id === blockId);
        if (index === -1) return [...prev, nextBlock];
        const clone = prev.slice();
        clone.splice(index + 1, 0, { ...nextBlock, text: nextText });
        return clone;
      });
      requestAnimationFrame(() => focusBlock(nextBlock.id, 0));
    },
    [focusBlock]
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      setBlocks((prev) => {
        if (prev.length === 1) return prev.map((block) => ({ ...block, text: "" }));
        const index = prev.findIndex((block) => block.id === blockId);
        const next = prev.filter((block) => block.id !== blockId);
        const removed = prev[index];
        if (removed?.linkedVerseId) {
          return next.filter((block) => block.id !== removed.linkedVerseId);
        }
        const target = next[Math.max(0, index - 1)];
        requestAnimationFrame(() => {
          if (target) focusBlock(target.id);
        });
        return next;
      });
    },
    [focusBlock]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, block: Block) => {
      if (event.key === "Enter") {
        event.preventDefault();
        flushBlockSync(block.id);
        insertBlockAfter(block.id, "");
        return;
      }
      if (event.key === "Backspace") {
        const element = event.currentTarget;
        const text = getBlockText(element);
        if (text.length > 0) return;
        event.preventDefault();
        removeBlock(block.id);
      }
      if (event.key === "Escape") {
        setSlashBlockId(null);
        setSlashQuery("");
        setSlashPosition(null);
      }
    },
    [clearPendingSync, commitBlockIfReference, getBlockText, insertBlockAfter, removeBlock, syncBlockText]
  );

  useImperativeHandle(ref, () => ({
    applyFormat: (command: NotesFormatCommand) => {
      if (!focusedBlockId) return;
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== focusedBlockId || block.type === "verse") return block;
          switch (command.type) {
            case "setBlockType":
              return { ...block, type: command.blockType };
            case "toggleBold":
              return { ...block, isBold: !block.isBold };
            case "toggleItalic":
              return { ...block, isItalic: !block.isItalic };
            case "toggleUnderline":
              return { ...block, isUnderline: !block.isUnderline };
            case "setBlockColor":
              return { ...block, bgColor: command.color };
            default:
              return block;
          }
        })
      );
    },
  }), [focusedBlockId]);

  useEffect(() => {
    if (!onFocusedBlockStyleChange) return;
    const current =
      focusedBlockId ? blocks.find((block) => block.id === focusedBlockId) ?? null : null;
    if (!current || current.type === "verse") {
      onFocusedBlockStyleChange(null);
      return;
    }
    onFocusedBlockStyleChange({
      type: current.type,
      isBold: current.isBold,
      isItalic: current.isItalic,
      isUnderline: current.isUnderline,
      bgColor: current.bgColor ?? null,
    });
  }, [blocks, focusedBlockId, onFocusedBlockStyleChange]);

  useEffect(() => {
    if (!onFocusChange) return;
    onFocusChange(Boolean(focusedBlockId));
  }, [focusedBlockId, onFocusChange]);

  const applySlashItem = useCallback(
    (item: SlashItem) => {
      if (!slashBlockId) return;
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === slashBlockId
            ? item.apply(block, slashQuery.replace(/^v\s*/i, ""))
            : block
        )
      );
      setSlashBlockId(null);
      setSlashQuery("");
      setSlashPosition(null);
      requestAnimationFrame(() => focusBlock(slashBlockId));
    },
    [focusBlock, slashBlockId, slashQuery]
  );

  const renderBlock = (block: Block, index: number) => {
    if (block.type === "verse") {
      return null;
    }
    const baseClass = "rounded-md px-2 py-1 outline-none whitespace-nowrap";
    const typeClass =
      block.type === "heading1"
        ? "text-4xl font-semibold"
        : block.type === "heading2"
          ? "text-3xl font-semibold"
          : block.type === "heading3"
            ? "text-2xl font-semibold"
            : block.type === "quote"
              ? "border-l-2 border-primary/50 pl-3 italic text-muted-foreground"
              : block.type === "bullet"
                ? "pl-6 relative before:absolute before:left-2 before:top-3 before:h-1.5 before:w-1.5 before:rounded-full before:bg-current"
                : block.type === "ordered"
                  ? "pl-6 relative before:absolute before:left-1.5 before:top-2 before:text-xs before:text-muted-foreground"
                  : "";
    const orderedLabel =
      block.type === "ordered" ? `${index + 1}.` : "";
    const accentClass = "";
    const highlightStyle = block.bgColor
      ? {
          backgroundColor: block.bgColor,
          boxDecorationBreak: "clone" as const,
          WebkitBoxDecorationBreak: "clone" as const,
          padding: "0 0.2em",
          borderRadius: "0.2em",
        }
      : undefined;
    const textStyle = block.textColor ? { color: block.textColor } : undefined;
    const sizeStyle =
      typeof block.fontSize === "number" ? { fontSize: block.fontSize } : undefined;
    const weightStyle = block.isBold ? { fontWeight: 700 } : undefined;
    const italicStyle = block.isItalic ? { fontStyle: "italic" } : undefined;
    const underlineStyle = block.isUnderline
      ? { textDecoration: "underline" }
      : undefined;
    const alignStyle = block.align ? { textAlign: block.align } : undefined;
    const focusPadding = focusedBlockId === block.id ? "pb-8" : "";
    return (
      <div key={block.id} className="relative">
        {block.type === "ordered" && (
          <span
            className="absolute left-0 top-2 text-xs text-muted-foreground"
            style={textStyle}
          >
            {orderedLabel}
          </span>
        )}
        {false && focusedBlockId === block.id && (
          <div className="absolute bottom-1 left-1 z-10">
            <button
              ref={(el) => {
                styleButtonRefs.current[block.id] = el;
              }}
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-[12px] font-semibold text-muted-foreground shadow-sm hover:bg-accent/60"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleStyleMenu(block.id);
              }}
              onTouchStart={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleStyleMenu(block.id);
              }}
              onClick={() => toggleStyleMenu(block.id)}
            >
              Aa
            </button>
          </div>
        )}
        <div
          className={`${baseClass} ${typeClass} ${accentClass} ${focusPadding}`}
          onPointerDown={() => {
            setFocusedBlockId(block.id);
            requestAnimationFrame(() => focusBlock(block.id));
          }}
          style={alignStyle}
          dir="ltr"
        >
          {(() => {
            const EditableTag = "bdo";
            const isFocused = focusedBlockId === block.id;
            if (!isFocused) {
              lastRenderedTextRef.current[block.id] = block.text;
            }
            const renderText = isFocused
              ? (lastRenderedTextRef.current[block.id] ?? block.text)
              : block.text;
            const displayText = renderText
              ? (isIOS ? stripLtrMarkers(renderText) : applyLtrMarkers(renderText))
              : "\u200B";
            const editableNode = (
              <EditableTag
                ref={(el) => {
                  blockRefs.current[block.id] = el;
                }}
                contentEditable
                suppressContentEditableWarning
                spellCheck
                className="block min-h-[1em] w-full min-w-[0.5ch] whitespace-nowrap overflow-x-auto outline-none focus:outline-none"
                style={{
                  ...highlightStyle,
                  ...textStyle,
                  ...sizeStyle,
                  ...weightStyle,
                  ...italicStyle,
                  ...underlineStyle,
                  caretColor: "currentColor",
                  direction: "ltr",
                  textAlign: "left",
                  lineHeight: "1.15",
                  unicodeBidi: "bidi-override",
                  writingMode: "horizontal-tb",
                }}
                data-block-id={block.id}
                data-placeholder={placeholder}
                tabIndex={0}
                dir="ltr"
                lang="en"
                onFocus={(event) => {
                  setEditableBlockId(block.id);
                  setFocusedBlockId(block.id);
                  const el = event.currentTarget;
                  const text = el.textContent ?? "";
                  if (text.startsWith("\u200F")) {
                    el.textContent = text.replace(/^\u200F+/, "");
                  }
                  if (
                    isIOS &&
                    lastPointerTypeRef.current[block.id] === "pen" &&
                    !penFocusForcedRef.current[block.id]
                  ) {
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0 && selection.isCollapsed) {
                      placeCaretAtEnd(el);
                      penFocusForcedRef.current[block.id] = true;
                    }
                  }
                }}
                onPointerDown={(event) => {
                  lastPointerTypeRef.current[block.id] = event.pointerType ?? null;
                }}
                onBlur={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                  if (stylePickerBlockId === block.id) return;
                  if (ignoreBlurRef.current) return;
                  onUserBlur?.();
                  flushBlockSync(block.id);
                  lastPointerTypeRef.current[block.id] = null;
                  penFocusForcedRef.current[block.id] = false;
                  const latestText = getBlockText(event.currentTarget);
                  if (!latestText.trim() && index > 0) {
                    setBlocks((prev) => prev.filter((item) => item.id !== block.id));
                  }
                  setFocusedBlockId(null);
                  setStylePickerBlockId(null);
                  if (!latestText.trim()) {
                    setEditableBlockId(null);
                  }
                }}
                onBeforeInput={(event) => {
                  if (stylePickerBlockId === block.id || editableBlockId !== block.id) {
                    event.preventDefault();
                    return;
                  }
                  if (!isIOS) return;
                  return;
                }}
                onInput={(event) => {
                  handleInput(block.id, event.currentTarget);
                }}
                onKeyDown={(event) => {
                  if (stylePickerBlockId === block.id) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                  }
                  handleKeyDown(event, block);
                }}
                onPaste={(event) => {
                  if (stylePickerBlockId === block.id) {
                    event.preventDefault();
                  }
                }}
              >
                {displayText}
              </EditableTag>
            );

            return editableNode;
          })()}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`block-notes-editor relative space-y-3 pb-6${
        isIOS ? " block-notes-editor--ios" : ""
      }`}
      dir="ltr"
      style={{ direction: "ltr", textAlign: "left" }}
      lang="en"
      onPointerDownCapture={(event) => {
        if (!focusedBlockId) return;
        const focusedEl = blockRefs.current[focusedBlockId];
        if (!focusedEl) return;
        if (focusedEl.contains(event.target as Node)) return;
        flushBlockSync(focusedBlockId);
      }}
      onPointerDown={(event) => {
        if (event.target !== containerRef.current) return;
        if (focusedBlockId) {
          flushBlockSync(focusedBlockId);
        }
        const lastId = blocks[blocks.length - 1]?.id;
        if (lastId) insertBlockAfter(lastId);
      }}
    >
      {blocks.map(renderBlock)}
      {activeStyleBlock &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
              ref={styleMenuRef}
              className="w-[320px] max-w-[92vw] rounded-2xl border border-border/70 bg-background/95 p-3 text-[11px] shadow-2xl backdrop-blur"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">Block Style</div>
                  <div className="text-[10px] text-muted-foreground">
                    Formatting + color in one place
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent/60"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setStylePickerBlockId(null);
                  }}
                >
                  Close
                </button>
              </div>
              <div className="mt-3">
                <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Blocks
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "paragraph", label: "Paragraph", badge: "P" },
                    { key: "heading1", label: "Heading 1", badge: "H1" },
                    { key: "heading2", label: "Heading 2", badge: "H2" },
                    { key: "heading3", label: "Heading 3", badge: "H3" },
                    { key: "quote", label: "Quote", badge: "Q" },
                    { key: "bullet", label: "Bullet", badge: "•" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`flex items-center justify-between rounded-lg border px-2 py-2 text-left transition ${
                        activeStyleBlock.type === item.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/70 text-foreground/80 hover:bg-accent/60"
                      }`}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setBlocks((prev) =>
                          prev.map((current) =>
                            current.id === activeStyleBlock.id
                              ? { ...current, type: item.key as BlockType }
                              : current
                          )
                        );
                      }}
                    >
                      <span>{item.label}</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border/70 text-[10px]">
                        {item.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                <div>
                  <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Highlight
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {bgColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-8 w-8 rounded-full border ${
                          activeStyleBlock.bgColor === color
                            ? "border-foreground"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setBlocks((prev) =>
                            prev.map((item) =>
                              item.id === activeStyleBlock.id
                                ? { ...item, bgColor: color }
                                : item
                            )
                          );
                        }}
                        aria-label={`Highlight ${color}`}
                      >
                        <span className="text-[11px] font-semibold text-foreground/70">
                          A
                        </span>
                      </button>
                    ))}
                    <label className="relative h-8 w-8 rounded-full border border-border">
                      <input
                        type="color"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        value={activeStyleBlock.bgColor ?? "#ffffff"}
                        onChange={(event) =>
                          setBlocks((prev) =>
                            prev.map((item) =>
                              item.id === activeStyleBlock.id
                                ? { ...item, bgColor: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                      <span
                        className="absolute inset-0 flex items-center justify-center rounded-full text-[11px] font-semibold text-foreground/70"
                        style={{ backgroundColor: activeStyleBlock.bgColor ?? "#ffffff" }}
                      >
                        A
                      </span>
                    </label>
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Text
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {textColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-8 w-8 rounded-full border ${
                          activeStyleBlock.textColor === color
                            ? "border-foreground"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setBlocks((prev) =>
                            prev.map((item) =>
                              item.id === activeStyleBlock.id
                                ? { ...item, textColor: color }
                                : item
                            )
                          );
                        }}
                        aria-label={`Text color ${color}`}
                      >
                        <span className="text-[11px] font-semibold text-background/80">
                          A
                        </span>
                      </button>
                    ))}
                    <label className="relative h-8 w-8 rounded-full border border-border">
                      <input
                        type="color"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        value={activeStyleBlock.textColor ?? "#111827"}
                        onChange={(event) =>
                          setBlocks((prev) =>
                            prev.map((item) =>
                              item.id === activeStyleBlock.id
                                ? { ...item, textColor: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                      <span
                        className="absolute inset-0 flex items-center justify-center rounded-full text-[11px] font-semibold text-background/80"
                        style={{ backgroundColor: activeStyleBlock.textColor ?? "#111827" }}
                      >
                        A
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                <div>
                  <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Style
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { key: "bold", label: "B" },
                      { key: "italic", label: "I" },
                      { key: "underline", label: "U" },
                    ].map((item) => {
                      const isActive =
                        (item.key === "bold" && activeStyleBlock.isBold) ||
                        (item.key === "italic" && activeStyleBlock.isItalic) ||
                        (item.key === "underline" && activeStyleBlock.isUnderline);
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={`h-8 w-8 rounded-full border text-[12px] font-semibold ${
                            isActive
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/70 text-muted-foreground hover:bg-accent/60"
                          }`}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setBlocks((prev) =>
                              prev.map((block) => {
                                if (block.id !== activeStyleBlock.id) return block;
                                if (item.key === "bold") {
                                  return { ...block, isBold: !block.isBold };
                                }
                                if (item.key === "italic") {
                                  return { ...block, isItalic: !block.isItalic };
                                }
                                return { ...block, isUnderline: !block.isUnderline };
                              })
                            );
                          }}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Align
                  </div>
                  <div className="flex items-center gap-2">
                    {(["left", "center", "right"] as AlignType[]).map((align) => (
                      <button
                        key={align}
                        type="button"
                        className={`h-8 w-8 rounded-full border text-[11px] ${
                          activeStyleBlock.align === align
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/70 text-muted-foreground hover:bg-accent/60"
                        }`}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setBlocks((prev) =>
                            prev.map((block) =>
                              block.id === activeStyleBlock.id
                                ? { ...block, align }
                                : block
                            )
                          );
                        }}
                      >
                        {align === "left" ? "L" : align === "center" ? "C" : "R"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 border-t border-border/60 pt-3">
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span>Size</span>
                  <span className="text-[11px] normal-case text-foreground">
                    {activeSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={48}
                  step={1}
                  value={activeSize}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setBlocks((prev) =>
                      prev.map((item) =>
                        item.id === activeStyleBlock.id
                          ? { ...item, fontSize: next }
                          : item
                      )
                    );
                  }}
                  className="h-2 w-full cursor-pointer accent-primary"
                />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                {(activeStyleBlock.bgColor ||
                  activeStyleBlock.textColor ||
                  activeStyleBlock.fontSize ||
                  activeStyleBlock.isBold ||
                  activeStyleBlock.isItalic ||
                  activeStyleBlock.isUnderline ||
                  (activeStyleBlock.align && activeStyleBlock.align !== "left")) && (
                  <button
                    type="button"
                    className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/60"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setBlocks((prev) =>
                        prev.map((item) =>
                          item.id === activeStyleBlock.id
                            ? {
                                ...item,
                                bgColor: null,
                                textColor: null,
                                fontSize: null,
                                isBold: false,
                                isItalic: false,
                                isUnderline: false,
                                align: "left",
                              }
                            : item
                        )
                      );
                    }}
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/60"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setStylePickerBlockId(null);
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      <div
        className="h-10 w-full"
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const lastId = blocks[blocks.length - 1]?.id;
          if (lastId) insertBlockAfter(lastId);
        }}
      />
      <button
        type="button"
        className="mt-2 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent/60"
        onClick={() => insertBlockAfter(blocks[blocks.length - 1]?.id ?? "")}
      >
        + Add block
      </button>
      {slashBlockId && slashPosition && filteredSlashItems.length > 0 && (
        <div
          className="absolute z-20 w-56 rounded-xl border border-border/70 bg-background/95 p-2 shadow-xl backdrop-blur"
          style={{ left: slashPosition.left, top: slashPosition.top }}
        >
          {filteredSlashItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-xs transition hover:bg-accent/60"
              onClick={() => applySlashItem(item)}
            >
              <span className="font-medium">{item.label}</span>
              <span className="text-[11px] text-muted-foreground">
                {item.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
