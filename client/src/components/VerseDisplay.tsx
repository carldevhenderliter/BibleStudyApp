// src/components/VerseDisplay.tsx
import { useState } from "react";
import type { DragEvent } from "react";
import { BibleVerse, Highlight, Note } from "@shared/schema";
import { Button } from "@/components/ui/button";
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
import greekSyllables from "@/Strongs_Definitions/strongs-greek-syllables.json";

interface VerseDisplayProps {
  verse: BibleVerse;
  highlight?: Highlight;
  wordHighlights: Highlight[];
  showStrongsNumbers: boolean;
  showInterlinear: boolean;
  showStrongsEnglishOnly?: boolean; // only show tokens with Strong's
  hideAllEnglish?: boolean; // hide all English words
  showNotes: boolean;
  fontSize: number;
  displayMode: "verse" | "book";
  showWordByWord: boolean;
  fontFamily: "serif" | "sans" | "mono" | "gentium";
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
  selectedWordIds?: Set<string>;
  selectedWordsPayload?: {
    text: string;
    verseId: string | null;
    words: { id: string; verseId: string; text: string; kind: "english" | "greek" }[];
  } | null;
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

const fontFamilyMap: Record<"serif" | "sans" | "mono" | "gentium", string> = {
  serif: "var(--font-serif)",
  gentium: "var(--font-gentium)",
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
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
  fontSize,
  displayMode,
  showWordByWord,
  fontFamily,
    onHighlightWord,
    onTextSelect,
    onStrongClick,
    wordNotes,
    activeWordNote, // not used directly, but available if you want to style the active one
    activeStrongNumber,
    selectedWordIds,
    selectedWordsPayload,
  } = props;

  const handleWordDragStart = (
    event: DragEvent<HTMLElement>,
    wordText: string,
    verseId: string,
    kind: "english" | "greek",
    wordId?: string
  ) => {
    const hasSelection =
      !!selectedWordsPayload?.words?.length &&
      !!wordId &&
      selectedWordIds?.has(wordId);
    event.dataTransfer.setData(
      "application/x-bible-word",
      JSON.stringify(
        hasSelection
          ? selectedWordsPayload
          : { verseId, text: wordText, kind }
      )
    );
    event.dataTransfer.setData(
      "text/plain",
      hasSelection ? selectedWordsPayload?.text ?? wordText : wordText
    );
    event.dataTransfer.effectAllowed = "copy";
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text) {
      onTextSelect(text);
    }
  };

  const highlightClass = highlight ? highlightColorMap[highlight.color] : "";
  const verseWithTokens = verse as BibleVerseWithTokens;
  const baseFont = fontFamilyMap[fontFamily];
  const englishFontSize = `${fontSize}px`;
  const lemmaFontSize = `${Math.max(12, fontSize - 2)}px`;
  const strongsFontSize = `${Math.max(10, Math.round(fontSize * 0.5))}px`;
  const syllableFontSize = `${Math.max(11, Math.round(fontSize * 0.6))}px`;
  const greekSyllableMap = greekSyllables as Record<
    string,
    { lemma: string; syllables: string[] }
  >;

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

  const getSyllablesForToken = (token: any): string[] | null => {
    if (!showInterlinear) return null;

    const strongKey = Array.isArray(token.strongs)
      ? token.strongs?.[0]
      : token.strongs;

    if (!strongKey) return null;
    const entry = greekSyllableMap[strongKey];
    if (!entry?.syllables?.length) return null;
    return entry.syllables;
  };

  // BOOK MODE, plain text
  if (displayMode === "book" && !showWordByWord) {
    return (
      <span
        className={`font-serif text-base leading-relaxed ${highlightClass} inline`}
        onMouseUp={handleMouseUp}
        data-testid={`verse-${verse.id}`}
        style={{ fontFamily: baseFont, fontSize: englishFontSize }}
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
        style={{ fontFamily: baseFont, fontSize: englishFontSize }}
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
          const syllables = getSyllablesForToken(token);
          const showEnglishWord = !hideAllEnglish;
          const englishWordId = `word-en-${verse.id}-${idx}`;
          const greekWordId = `word-gr-${verse.id}-${idx}`;
          const isEnglishSelected = selectedWordIds?.has(englishWordId);
          const isGreekSelected = selectedWordIds?.has(greekWordId);

          return (
            <div key={idx} className="inline-flex items-start">
              <div className="inline-flex flex-col items-center gap-1">
                <Popover>
                <PopoverTrigger asChild>
                  <div
                    className="inline-flex flex-col items-center gap-0.5 group cursor-pointer relative"
                    data-testid={`word-${verse.id}-${idx}`}
                  >
                    {/* Greek lemma on top */}
                    {lemma && (
                      <span
                        className={`italic text-foreground cursor-grab active:cursor-grabbing ${
                          isGreekSelected ? "ring-2 ring-primary/60 bg-primary/10 rounded" : ""
                        }`}
                        style={{ fontSize: lemmaFontSize, fontFamily: baseFont }}
                        draggable
                        onDragStart={(event) =>
                          handleWordDragStart(event, lemma, verse.id, "greek", greekWordId)
                        }
                        data-lasso-word
                        data-word-id={greekWordId}
                        data-word-text={lemma}
                        data-word-kind="greek"
                        data-verse-id={verse.id}
                      >
                        {lemma}
                      </span>
                    )}
                    {lemma && syllables && (
                      <span
                        className="text-red-600 font-semibold"
                        style={{ fontSize: syllableFontSize, fontFamily: baseFont }}
                      >
                        {syllables.map((syllable, sIdx) => (
                          <span key={sIdx}>
                            {syllable}
                            {sIdx < syllables.length - 1 && (
                              <span className="text-yellow-500">|</span>
                            )}
                          </span>
                        ))}
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
                                style={{ fontSize: strongsFontSize }}
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
                          "font-serif rounded transition-colors cursor-grab active:cursor-grabbing",
                          wordHighlightClass,
                          strongActive
                            ? "ring-2 ring-primary/60 bg-primary/10"
                            : "",
                          isEnglishSelected ? "ring-2 ring-primary/60 bg-primary/10" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{ fontSize: englishFontSize, fontFamily: baseFont }}
                        draggable
                        onDragStart={(event) =>
                          handleWordDragStart(
                            event,
                            token.english,
                            verse.id,
                            "english",
                            englishWordId
                          )
                        }
                        data-lasso-word
                        data-word-id={englishWordId}
                        data-word-text={token.english}
                        data-word-kind="english"
                        data-verse-id={verse.id}
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
                  {/* Note creation removed */}
                </PopoverContent>
              </Popover>

                {/* Word note display removed */}
              </div>
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
    >
      <div className="flex gap-4">
        <div className="text-sm text-muted-foreground font-mono w-8 flex-shrink-0 text-right pt-1">
          {verse.verse}
        </div>

        <div
          className="flex-1"
          onMouseUp={handleMouseUp}
          style={{ fontFamily: baseFont, fontSize: englishFontSize }}
        >
          {showWordByWord ? (
            <div
              className="flex flex-wrap gap-x-3 gap-y-6"
              data-testid={`verse-${verse.id}`}
              style={{ fontFamily: baseFont, fontSize: englishFontSize }}
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
                const syllables = getSyllablesForToken(token);
                const showEnglishWord = !hideAllEnglish;
                const englishWordId = `word-en-${verse.id}-${idx}`;
                const greekWordId = `word-gr-${verse.id}-${idx}`;
                const isEnglishSelected = selectedWordIds?.has(englishWordId);
                const isGreekSelected = selectedWordIds?.has(greekWordId);

                return (
                  <div key={idx} className="inline-flex items-start">
                    <div className="inline-flex flex-col items-center gap-1">
                      <Popover>
                      <PopoverTrigger asChild>
                        <div
                          className="inline-flex flex-col items-center gap-0.5 group/word cursor-pointer relative"
                          data-testid={`word-${verse.id}-${idx}`}
                        >
                          {/* Greek lemma on top */}
                          {lemma && (
                            <span
                              className={`italic text-foreground cursor-grab active:cursor-grabbing ${
                                isGreekSelected ? "ring-2 ring-primary/60 bg-primary/10 rounded" : ""
                              }`}
                              style={{ fontSize: lemmaFontSize, fontFamily: baseFont }}
                              draggable
                              onDragStart={(event) =>
                                handleWordDragStart(
                                  event,
                                  lemma,
                                  verse.id,
                                  "greek",
                                  greekWordId
                                )
                              }
                              data-lasso-word
                              data-word-id={greekWordId}
                              data-word-text={lemma}
                              data-word-kind="greek"
                              data-verse-id={verse.id}
                            >
                              {lemma}
                            </span>
                          )}
                          {lemma && syllables && (
                            <span
                              className="text-red-600 font-semibold"
                              style={{
                                fontSize: syllableFontSize,
                                fontFamily: baseFont,
                              }}
                            >
                              {syllables.map((syllable, sIdx) => (
                                <span key={sIdx}>
                                  {syllable}
                                  {sIdx < syllables.length - 1 && (
                                    <span className="text-yellow-500">|</span>
                                  )}
                                </span>
                              ))}
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
                                      style={{ fontSize: strongsFontSize }}
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
                                "font-serif rounded transition-colors cursor-grab active:cursor-grabbing",
                                wordHighlightClass,
                                strongActive
                                  ? "ring-2 ring-primary/60 bg-primary/10"
                                  : "",
                                isEnglishSelected ? "ring-2 ring-primary/60 bg-primary/10" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              style={{
                                fontSize: englishFontSize,
                                fontFamily: baseFont,
                              }}
                              draggable
                              onDragStart={(event) =>
                                handleWordDragStart(
                                  event,
                                  token.english,
                                  verse.id,
                                  "english",
                                  englishWordId
                                )
                              }
                              data-lasso-word
                              data-word-id={englishWordId}
                              data-word-text={token.english}
                              data-word-kind="english"
                              data-verse-id={verse.id}
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
                        {/* Note creation removed */}
                      </PopoverContent>
                    </Popover>

                      {/* Word note display removed */}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <span
              className={`font-serif text-base leading-relaxed ${highlightClass} rounded-sm px-1 -mx-1`}
              data-testid={`verse-${verse.id}`}
              style={{ fontFamily: baseFont, fontSize: englishFontSize }}
            >
              {verse.text}
            </span>
          )}
        </div>

        <div className="w-8 flex-shrink-0" />
      </div>
    </div>
  );
}
