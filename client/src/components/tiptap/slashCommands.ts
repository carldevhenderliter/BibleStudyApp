import { Extension } from "@tiptap/core";

type SlashCommand =
  | { type: "heading"; level: 1 | 2 | 3 }
  | { type: "blockquote" }
  | { type: "verse"; value: string };

const parseSlashCommand = (raw: string): SlashCommand | null => {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  const lower = trimmed.toLowerCase();

  if (lower === "/h1") return { type: "heading", level: 1 };
  if (lower === "/h2") return { type: "heading", level: 2 };
  if (lower === "/h3") return { type: "heading", level: 3 };
  if (lower === "/quote") return { type: "blockquote" };

  if (lower.startsWith("/v ")) {
    const value = trimmed.slice(3).trim();
    if (!value) return null;
    return { type: "verse", value };
  }

  return null;
};

export const SlashCommands = Extension.create({
  name: "slashCommands",
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor;
        const { $from } = state.selection;
        const text = $from.parent.textContent || "";
        const command = parseSlashCommand(text);
        if (!command) return false;

        const from = $from.start();
        const to = $from.end();
        this.editor.commands.deleteRange({ from, to });

        if (command.type === "heading") {
          return this.editor.commands.setHeading({ level: command.level });
        }

        if (command.type === "blockquote") {
          return this.editor.commands.toggleBlockquote();
        }

        if (command.type === "verse") {
          return this.editor.commands.insertContent(command.value);
        }

        return false;
      },
    };
  },
});
