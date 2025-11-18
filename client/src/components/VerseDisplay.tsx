// src/components/VerseDisplay.tsx
import { useState } from "react";
import { BibleVerse, Highlight, Note } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus, StickyNote } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BibleVerseWithTokens } from "@/lib/bibleData";
import { getStrongsDefinition } from "@/lib/strongsData";

interface VerseDisplayProps {
  verse: BibleVerse;
  highlight?: Highlight;
  wordHighlights: Highlight[];
  showStrongsNumbers: boolean;
  showInterlinear: boolean;
  showStrongsEnglishOnly?: boolean; // only show tokens with Strong's
  hideAllEnglish?: boolean; // hide all English words
  showNotes: boolean;
  displayMode: "verse" | "book";
  showWordByWord: boolean;
  onAddNote: () => void;
  onAddWordNote: (wordIndex: number, wordText: string) => void;
  onSaveWordNote: (
    wordIndex: number,
    content: string,
    options?: any
  ) => void;
  onCancelWordNote: () => void;
  onHighlightWord: (wordIndex: number, wordText: string, color: string) => void;
  onTextSelect: (text: string) => void;
  onStrongClick: (strongNumber: string) => void;
  wordNotes: Note[];
  activeWordNote: { verseId: string; wordIndex: number; wordText?: string } | null;
  activeStrongNumber?: string;
}

const highlightColorMap = {
  yellow: "bg-yellow-200/60 dark:bg-yellow-500/30",
  blue: "bg-blue-200/60 dark:bg-blue-500/30",
  green: "bg-green-200/60 dark:bg-green-500/30",
  pink: "bg-pink-200/60 dark:bg-pink-500/30",
  purple: "bg-purple-200/60 dark:bg-purple-500/30",
  orange: "bg-orange-200/60 dark:bg-orange-500/30",
  red: "bg-red-200/60 dark:bg-red-500/30",
  cyan: "bg-cyan-200/60 dark:bg-cyan-500/30",
  gray: "bg-gray-200/60 dark:bg-gray-500/30",
};

export function VerseDisplay(props: VerseDisplayProps) {
  const {
    verse,
    highlight,
    wordHighlights,
    showStrongsNumbers,
    showInterlinear,
    showStrongsEnglishOnly = false,
    hideAllEnglish = false,
    showNotes,
    displayMode,
    showWordByWord,
    onAddNote,
    onAddWordNote,
    onSaveWordNote, // not used directly, but kept for typing
    onCancelWordNote, // not used directly, but kept for typing
    onHighlightWord,
    onTextSelect,
    onStrongClick,
    wordNotes,
    activeWordNote, // not used directly, but available if you want to style the active one
    activeStrongNumber,
  } = props;

  const [showAddButton, setShowAddButton] = useState(false);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text) {
      onTextSelect(text);
    }
  };

  const highlightClass = highlight ? highlightColorMap[highlight.color] : "";
  const verseWithTokens = verse as BibleVerseWithTokens;

  const getWordNote = (wordIndex: number) =>
    wordNotes.find((note) => Number(note.wordIndex) === wordIndex);

  const getWordHighlight = (wordIndex: number) =>
    wordHighlights.find((h) => h.wordIndex === wordIndex);

  const isTokenStrongActive = (tokenStrong: string | string[] | undefined) => {
    if (!activeStrongNumber || !tokenStrong) return false;
    if (Array.isArray(tokenStrong)) {
      return tokenStrong.includes(activeStrongNumber);
    }
    return tokenStrong === activeStrongNumber;
  };

  const getLemmaForToken = (token: any): string | null => {
    if (!showInterlinear) return null;

    const strongKey = Array.isArray(token.strongs)
      ? token.strongs?.[0]
      : token.strongs;

    if (strongKey) {
      const def = getStrongsDefinition(strongKey);
      if (def?.lemma) return def.lemma as string;
    }

    return token.original || null;
  };

  // BOOK MODE, plain text
  if (displayMode === "book" && !showWordByWord) {
    return (
      <span
        className={`font-serif text-base leading-relaxed ${highlightClass} inline`}
        onMouseUp={handleMouseUp}
        data-testid={`verse-${verse.id}`}
      >
        {verse.text}{" "}
      </span>
    );
  }

  // BOOK MODE, word-by-word
  if (displayMode === "book" && showWordByWord) {
    return (
      <div
        className="inline-flex flex-wrap gap-x-3 gap-y-6 mr-2"
        data-testid={`verse-${verse.id}`}
        onMouseUp={handleMouseUp}
      >
        {verseWithTokens.tokens!.map((token, idx) => {
          // Strong's English-only → skip tokens without Strong's
          if (showStrongsEnglishOnly && !token.strongs) {
            return null;
          }

          const wordNote = showNotes ? getWordNote(idx) : undefined;
          const wordHighlight = getWordHighlight(idx);
          const wordHighlightClass = wordHighlight
            ? highlightColorMap[wordHighlight.color]
            : "";

          const strongActive = isTokenStrongActive(token.strongs);
          const lemma = getLemmaForToken(token);
          const showEnglishWord = !hideAllEnglish;

          return (
            <div
              key={idx}
              className="inline-flex flex-col items-center gap-1"
            >
              <Popover>
                <PopoverTrigger asChild>
                  <div
                    className="inline-flex flex-col items-center gap-0.5 group cursor-pointer relative"
                    data-testid={`word-${verse.id}-${idx}`}
                  >
                    {/* Greek lemma on top */}
                    {lemma && (
                      <span className="text-sm italic font-serif text-foreground">
                        {lemma}
                      </span>
                    )}

                    {/* Strong's numbers */}
                    {showStrongsNumbers && token.strongs && (
                      <div className="flex gap-1 flex-wrap justify-center">
                        {(Array.isArray(token.strongs)
                          ? token.strongs
                          : [token.strongs]
                        ).map((strongNum, sIdx) => (
                          <Tooltip key={sIdx}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onStrongClick(strongNum);
                                }}
                                className={`text-xs text-primary cursor-pointer font-mono hover-elevate active-elevate-2 px-1 rounded ${
                                  strongActive
                                    ? "ring-2 ring-primary/60 bg-primary/10"
                                    : ""
                                }`}
                                data-testid={`button-strong-${strongNum}`}
                              >
                                {strongNum}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                Strong&apos;s {strongNum} - Click to view
                                definition
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    )}

                    {/* English (if not globally hidden) */}
                    {showEnglishWord && (
                      <span
                        className={[
                          "font-serif text-base rounded transition-colors",
                          wordHighlightClass,
                          strongActive
                            ? "ring-2 ring-primary/60 bg-primary/10"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {token.english}
                      </span>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 p-2 space-y-2"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  {showNotes && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => onAddWordNote(idx, token.english)}
                      data-testid={`button-add-word-note-${verse.id}-${idx}`}
                    >
                      <StickyNote className="h-3 w-3 mr-2" />
                      {wordNote ? "View/Edit Note" : "Add Note"}
                    </Button>
                  )}
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground px-2">
                      Highlight Color:
                    </div>
                    <div className="flex gap-1 flex-wrap px-2">
                      {(
                        [
                          "yellow",
                          "blue",
                          "green",
                          "pink",
                          "purple",
                          "orange",
                          "red",
                          "cyan",
                          "gray",
                        ] as const
                      ).map((color) => (
                        <button
                          key={color}
                          onClick={(e) => {
                            e.preventDefault();
                            onHighlightWord(idx, token.english, color);
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          className={`w-6 h-6 rounded ${
                            highlightColorMap[color]
                          } border-2 ${
                            wordHighlight?.color === color
                              ? "border-foreground"
                              : "border-transparent"
                          } hover:scale-110 transition-transform`}
                          data-testid={`button-highlight-${color}-${verse.id}-${idx}`}
                          aria-label={`Highlight ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {showNotes && wordNote && (
                <div
                  className="text-xs text-muted-foreground bg-muted/50 border rounded px-2 py-1 max-w-[200px]"
                  data-testid={`word-note-${verse.id}-${idx}`}
                >
                  <div className="flex items-start gap-1">
                    <StickyNote className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-left break-words">
                      {wordNote.content}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // VERSE MODE
  return (
    <div
      className="group relative py-3 scroll-mt-24"
      data-verse-id={verse.id}
      onMouseEnter={() => setShowAddButton(true)}
      onMouseLeave={() => setShowAddButton(false)}
    >
      <div className="flex gap-4">
        <div className="text-sm text-muted-foreground font-mono w-8 flex-shrink-0 text-right pt-1">
          {verse.verse}
        </div>

        <div className="flex-1" onMouseUp={handleMouseUp}>
          {showWordByWord ? (
            <div
              className="flex flex-wrap gap-x-3 gap-y-6"
              data-testid={`verse-${verse.id}`}
            >
              {verseWithTokens.tokens!.map((token, idx) => {
                // Strong's English-only → skip tokens without Strong's
                if (showStrongsEnglishOnly && !token.strongs) {
                  return null;
                }

                const wordNote = showNotes ? getWordNote(idx) : undefined;
                const wordHighlight = getWordHighlight(idx);
                const wordHighlightClass = wordHighlight
                  ? highlightColorMap[wordHighlight.color]
                  : "";

                const strongActive = isTokenStrongActive(token.strongs);
                const lemma = getLemmaForToken(token);
                const showEnglishWord = !hideAllEnglish;

                return (
                  <div
                    key={idx}
                    className="inline-flex flex-col items-center gap-1"
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <div
                          className="inline-flex flex-col items-center gap-0.5 group/word cursor-pointer relative"
                          data-testid={`word-${verse.id}-${idx}`}
                        >
                          {/* Greek lemma on top */}
                          {lemma && (
                            <span className="text-sm italic font-serif text-foreground">
                              {lemma}
                            </span>
                          )}

                          {/* Strong's numbers */}
                          {showStrongsNumbers && token.strongs && (
                            <div className="flex gap-1 flex-wrap justify-center">
                              {(Array.isArray(token.strongs)
                                ? token.strongs
                                : [token.strongs]
                              ).map((strongNum, sIdx) => (
                                <Tooltip key={sIdx}>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onStrongClick(strongNum);
                                      }}
                                      className={`text-xs text-primary cursor-pointer font-mono hover-elevate active-elevate-2 px-1 rounded ${
                                        strongActive
                                          ? "ring-2 ring-primary/60 bg-primary/10"
                                          : ""
                                      }`}
                                      data-testid={`button-strong-${strongNum}`}
                                    >
                                      {strongNum}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      Strong&apos;s {strongNum} - Click to view
                                      definition
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          )}

                          {/* English (if not globally hidden) */}
                          {showEnglishWord && (
                            <span
                              className={[
                                "font-serif text-base rounded transition-colors",
                                wordHighlightClass,
                                strongActive
                                  ? "ring-2 ring-primary/60 bg-primary/10"
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {token.english}
                            </span>
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-56 p-2 space-y-2"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        {showNotes && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => onAddWordNote(idx, token.english)}
                            data-testid={`button-add-word-note-${verse.id}-${idx}`}
                          >
                            <StickyNote className="h-3 w-3 mr-2" />
                            {wordNote ? "View/Edit Note" : "Add Note"}
                          </Button>
                        )}
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground px-2">
                            Highlight Color:
                          </div>
                          <div className="flex gap-1 flex-wrap px-2">
                            {(
                              [
                                "yellow",
                                "blue",
                                "green",
                                "pink",
                                "purple",
                                "orange",
                                "red",
                                "cyan",
                                "gray",
                              ] as const
                            ).map((color) => (
                              <button
                                key={color}
                                onClick={(e) => {
                                  e.preventDefault();
                                  onHighlightWord(idx, token.english, color);
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                className={`w-6 h-6 rounded ${
                                  highlightColorMap[color]
                                } border-2 ${
                                  wordHighlight?.color === color
                                    ? "border-foreground"
                                    : "border-transparent"
                                } hover:scale-110 transition-transform`}
                                data-testid={`button-highlight-${color}-${verse.id}-${idx}`}
                                aria-label={`Highlight ${color}`}
                              />
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    {showNotes && wordNote && (
                      <div
                        className="text-xs text-muted-foreground bg-muted/50 border rounded px-2 py-1 max-w-[200px]"
                        data-testid={`word-note-${verse.id}-${idx}`}
                      >
                        <div className="flex items-start gap-1">
                          <StickyNote className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-left break-words">
                            {wordNote.content}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <span
              className={`font-serif text-base leading-relaxed ${highlightClass} rounded-sm px-1 -mx-1`}
              data-testid={`verse-${verse.id}`}
            >
              {verse.text}
            </span>
          )}
        </div>

        <div className="w-8 flex-shrink-0">
          {showAddButton && showNotes && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onAddNote}
              data-testid={`button-add-note-${verse.id}`}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
