import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
import type { Editor, Range } from "@tiptap/core";

type SlashItem = {
  title: string;
  description: string;
  keywords: string[];
  command: (editor: Editor, range: Range, query: string) => void;
};

const baseItems: SlashItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    keywords: ["h1", "heading", "title"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    keywords: ["h2", "heading", "subtitle"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    keywords: ["h3", "heading"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: "Quote",
    description: "Blockquote",
    keywords: ["quote", "blockquote"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Bullet List",
    description: "Bulleted list",
    keywords: ["bullet", "list", "ul"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Insert Verse",
    description: "Insert verse reference",
    keywords: ["verse", "ref", "v"],
    command: (editor, range, query) => {
      const trimmed = query.trim();
      const value = trimmed.toLowerCase().startsWith("v ")
        ? trimmed.slice(2).trim()
        : trimmed;
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(value || "John 1:1")
        .run();
    },
  },
];

type MenuProps = {
  editor: Editor;
  items: SlashItem[];
  command: (item: SlashItem) => void;
};

const SlashMenuList = ({ editor, items, command }: MenuProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!editor.isFocused) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const item = items[selectedIndex];
        if (item) command(item);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [command, editor.isFocused, items, selectedIndex]);

  const hasItems = items.length > 0;
  if (!hasItems) return null;

  return (
    <div className="flex max-h-[260px] w-[240px] flex-col gap-1 overflow-auto rounded-xl border border-border/70 bg-background/95 p-2 shadow-xl backdrop-blur">
      {items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          className={`flex flex-col items-start rounded-lg px-3 py-2 text-left transition ${
            index === selectedIndex
              ? "bg-primary/10 text-primary"
              : "text-foreground/80 hover:bg-accent/60"
          }`}
          onClick={() => command(item)}
        >
          <span className="text-sm font-medium">{item.title}</span>
          <span className="text-[11px] text-muted-foreground">
            {item.description}
          </span>
        </button>
      ))}
    </div>
  );
};

export const SlashMenu = Extension.create({
  name: "slashMenu",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        items: (params?: { query?: string } | null) => {
          const query =
            typeof params?.query === "string" ? params.query : "";
          const q = query.trim().toLowerCase();
          if (!q) return baseItems;
          return baseItems.filter((item) =>
            [item.title, ...item.keywords].some((entry) =>
              entry.toLowerCase().includes(q)
            )
          );
        },
        render: () => {
          let component: ReactRenderer<MenuProps> | null = null;
          let popup: HTMLDivElement | null = null;
          return {
            onStart: (props) => {
              popup = document.createElement("div");
              popup.style.position = "absolute";
              popup.style.zIndex = "50";
              document.body.appendChild(popup);

              component = new ReactRenderer(SlashMenuList, {
                props: {
                  editor: props.editor,
                  items: props.items as SlashItem[],
                  command: (item) => {
                    item.command(props.editor, props.range, props.query);
                  },
                },
                editor: props.editor,
              });

              popup.appendChild(component.element);
              if (props.clientRect) {
                const rect = props.clientRect();
                if (rect) {
                  popup.style.left = `${rect.left}px`;
                  popup.style.top = `${rect.bottom + 6}px`;
                }
              }
            },
            onUpdate: (props) => {
              component?.updateProps({
                editor: props.editor,
                items: props.items as SlashItem[],
                command: (item) => {
                  item.command(props.editor, props.range, props.query);
                },
              });
              if (popup && props.clientRect) {
                const rect = props.clientRect();
                if (rect) {
                  popup.style.left = `${rect.left}px`;
                  popup.style.top = `${rect.bottom + 6}px`;
                }
              }
            },
            onExit: () => {
              component?.destroy();
              component = null;
              if (popup) {
                popup.remove();
                popup = null;
              }
            },
          };
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
