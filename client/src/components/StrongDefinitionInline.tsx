import { useMemo } from "react";
import { getStrongsDefinition, StrongsDefinition } from "@/lib/strongsData";

interface StrongDefinitionInlineProps {
  strongsNumbers: string[];
  activeIndex: number;                  // kept to match BibleReader
  onActiveIndexChange?: (index: number) => void; // unused now but safe to keep
}

export function StrongDefinitionInline({
  strongsNumbers,
  activeIndex,
}: StrongDefinitionInlineProps) {
  // Safely pick the active Strong's number
  const strongNumber = strongsNumbers[activeIndex] ?? strongsNumbers[0];

  const def = useMemo(() => {
    if (!strongNumber) return null;
    try {
      return getStrongsDefinition(strongNumber);
    } catch (err) {
      console.error("Error getting Strong's definition for", strongNumber, err);
      return null;
    }
  }, [strongNumber]);

  // If we still don't have a valid definition, render nothing
  if (!strongNumber || !def || typeof def !== "object") {
    return null;
  }

  // Make this tolerant of both:
  // - normalized StrongsDefinition
  // - raw JSON with fields: strongs_def, kjv_def, translit, lemma, etc.
  const d = def as StrongsDefinition & {
    lemma?: string;
    translit?: string;
    strongs_def?: string;
    kjv_def?: string;
    derivation?: string;
    pronunciation?: string;
    partOfSpeech?: string;
    pos?: string;
  };

  const number =
    (d as any).number ?? strongNumber;
  const lemma = d.lemma;
  const transliteration =
    (d as any).transliteration ?? d.translit;
  const pronunciation = (d as any).pronunciation;
  const partOfSpeech =
    (d as any).partOfSpeech ?? d.pos;
  const gloss =
    (d as any).definition ?? d.strongs_def;
  const usage =
    (d as any).usage ?? d.kjv_def;
  const derivation = d.derivation;

  return (
    <div className="mt-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm shadow-sm">
      <div className="flex flex-wrap items-baseline gap-2">
        {/* Strong's number */}
        <span className="font-mono text-xs font-semibold text-primary">
          {number}
        </span>

        {/* Lemma (Greek/Hebrew) */}
        {lemma && (
          <span className="text-base font-semibold font-serif">
            {lemma}
          </span>
        )}

        {/* Transliteration */}
        {transliteration && (
          <span className="text-sm font-medium text-foreground/90">
            {transliteration}
          </span>
        )}

        {/* Pronunciation */}
        {pronunciation && (
          <span className="text-xs italic text-muted-foreground">
            ({pronunciation})
          </span>
        )}

        {/* Part of speech */}
        {partOfSpeech && (
          <span className="rounded bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {partOfSpeech}
          </span>
        )}
      </div>

      {/* Derivation */}
      {derivation && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold">From: </span>
          {derivation}
        </p>
      )}

      {/* Main definition */}
      {gloss && (
        <p className="mt-2 text-sm leading-snug">
          <span className="font-semibold">Definition: </span>
          {gloss}
        </p>
      )}

      {/* KJV usage / gloss list */}
      {usage && (
        <p className="mt-1 text-xs text-muted-foreground leading-snug">
          {usage}
        </p>
      )}
    </div>
  );
}
