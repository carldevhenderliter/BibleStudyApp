import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "quote"
  | "bullet"
  | "ordered";

type AlignType = "left" | "center" | "right";

type Block = {
  id: string;
  type: BlockType;
  text: string;
  bgColor?: string | null;
  textColor?: string | null;
  fontSize?: number | null;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  align?: AlignType;
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
};

const buildId = () => `block-${Math.random().toString(36).slice(2, 9)}`;

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

const normalizeText = (node: Element) => {
  const raw =
    "innerText" in node
      ? (node as HTMLElement).innerText
      : node.textContent ?? "";
  return raw.replace(/\r/g, "").replace(/\n+$/g, "");
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
    const baseBg = el.getAttribute("data-block-bg");
    const baseText = el.getAttribute("data-block-text");
    const baseSizeRaw = el.getAttribute("data-block-size");
    const baseSize = baseSizeRaw ? Number(baseSizeRaw) : null;
    const baseBold = el.getAttribute("data-block-bold") === "1";
    const baseItalic = el.getAttribute("data-block-italic") === "1";
    const baseUnderline = el.getAttribute("data-block-underline") === "1";
    const baseAlign = (el.getAttribute("data-block-align") as AlignType) ?? "left";
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

export function BlockNotesEditor({
  value,
  onChange,
  placeholder = "Start writing…",
}: BlockNotesEditorProps) {
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
  const lastValueRef = useRef(value);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const styleButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const styleMenuRef = useRef<HTMLDivElement | null>(null);
  const ignoreBlurRef = useRef(false);
  const bgColors = ["#fde68a", "#bfdbfe", "#bbf7d0"];
  const textColors = ["#ffffff", "#111827"];

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
    return (element.innerText ?? "")
      .replace(/\u200E/g, "")
      .replace(/\u200B/g, "")
      .replace(/\r/g, "");
  }, []);

  const normalizeLtr = useCallback((element: HTMLElement) => {
    const text = element.textContent ?? "";
    const cleaned = text.replace(/[\u200E\u200F\u202A-\u202E]/g, "");
    if (!cleaned) {
      element.textContent = "";
      return;
    }
    element.textContent = `\u200E${cleaned}`;
    const selection = window.getSelection();
    if (!selection) return;
    const node = element.firstChild;
    if (!node) return;
    const range = document.createRange();
    const caretPos = Math.min(
      (node.textContent?.length ?? 1),
      Math.max(1, (selection.focusOffset ?? 0) + 1)
    );
    range.setStart(node, caretPos);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const focusBlock = useCallback((blockId: string, offset?: number) => {
    setFocusedBlockId(blockId);
    const el = blockRefs.current[blockId];
    if (!el) return;
    el.focus();
    normalizeLtr(el);
    if (typeof offset === "number") {
      const selection = window.getSelection();
      if (!selection) return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let currentOffset = 0;
      let node = walker.nextNode();
      while (node) {
        const length = node.textContent?.length ?? 0;
        if (currentOffset + length >= offset) {
          const range = document.createRange();
          range.setStart(node, Math.max(0, offset - currentOffset));
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
  }, [normalizeLtr]);

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
    return preRange.toString().length;
  }, []);

  const handleInput = useCallback(
    (blockId: string, element: HTMLElement) => {
      const text = getBlockText(element);
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === blockId ? { ...block, text } : block
        )
      );
      const match = text.match(/^\/(\S*)$/);
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
    [getBlockText, slashBlockId, updateSlashPosition]
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
      if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        const element = event.currentTarget;
        const text = getBlockText(element);
        const offset = getCaretOffset(element) ?? text.length;
        const nextText = `${text.slice(0, offset)}\n${text.slice(offset)}`;
        setBlocks((prev) =>
          prev.map((item) =>
            item.id === block.id ? { ...item, text: nextText } : item
          )
        );
        requestAnimationFrame(() => focusBlock(block.id, offset + 1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const element = event.currentTarget;
        const text = getBlockText(element);
        const offset = getCaretOffset(element) ?? text.length;
        const before = text.slice(0, offset);
        const after = text.slice(offset);
        setBlocks((prev) =>
          prev.map((item) =>
            item.id === block.id ? { ...item, text: before } : item
          )
        );
        insertBlockAfter(block.id, after, {
          bgColor: block.bgColor,
          textColor: block.textColor,
        });
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
    [focusBlock, getBlockText, getCaretOffset, insertBlockAfter, removeBlock]
  );

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
    const baseClass = "rounded-md px-2 py-1 outline-none";
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
        {focusedBlockId === block.id && (
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
          <span
            ref={(el) => {
              blockRefs.current[block.id] = el;
            }}
            contentEditable
            suppressContentEditableWarning
            spellCheck
            className="inline-block min-h-[1em] min-w-[0.5ch] whitespace-pre-wrap break-words outline-none focus:outline-none"
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
              unicodeBidi: "isolate-override",
              writingMode: "horizontal-tb",
            }}
            data-block-id={block.id}
            data-placeholder={placeholder}
            tabIndex={0}
            dir="ltr"
            onFocus={(event) => {
              setEditableBlockId(block.id);
              setFocusedBlockId(block.id);
              normalizeLtr(event.currentTarget);
            }}
            onBlur={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node)) return;
              if (stylePickerBlockId === block.id) return;
              if (ignoreBlurRef.current) return;
              if (!block.text.trim() && index > 0) {
                setBlocks((prev) => prev.filter((item) => item.id !== block.id));
              }
              setFocusedBlockId(null);
              setStylePickerBlockId(null);
              if (!block.text.trim()) {
                setEditableBlockId(null);
              }
            }}
            onBeforeInput={(event) => {
              if (stylePickerBlockId === block.id || editableBlockId !== block.id) {
                event.preventDefault();
              }
            }}
            onInput={(event) => {
              normalizeLtr(event.currentTarget);
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
            {block.text || "\u200B"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="block-notes-editor relative space-y-3 pb-6"
      dir="ltr"
      style={{ direction: "ltr" }}
      onPointerDown={(event) => {
        if (event.target !== containerRef.current) return;
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
}
