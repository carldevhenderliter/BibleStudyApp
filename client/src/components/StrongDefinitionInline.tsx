import { useMemo } from "react";
import { getStrongsDefinition } from "@/lib/strongsData";

export interface StrongDefinitionInlineProps {
  // Make both props safe/optional so bad data can't crash us
  strongsNumbers?: string[];
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void; // kept for future use
}

export function StrongDefinitionInline({
  strongsNumbers,
  activeIndex = 0,
}: StrongDefinitionInlineProps) {
  // 🔒 Hard guard: if we don't have a proper array with at least one item, render nothing
  if (!Array.isArray(strongsNumbers) || strongsNumbers.length === 0) {
    return null;
  }

  // Clamp the index into a valid range
  const safeIndex =
    activeIndex >= 0 && activeIndex < strongsNumbers.length
      ? activeIndex
      : 0;

  const strongNumber = strongsNumbers[safeIndex];

  const def = useMemo(() => {
    if (!strongNumber) return null;
    try {
      return getStrongsDefinition(strongNumber);
    } catch (err) {
      console.error("Error getting Strong's definition for", strongNumber, err);
      return null;
    }
  }, [strongNumber]);

  // If we still don't have a valid definition, don't render anything
  if (!def || typeof def !== "object") {
    return null;
  }

  // Be tolerant of both:
  // 1) Normalized StrongsDefinition
  // 2) Raw JSON like:
  //    { strongs_def, kjv_def, translit, lemma, derivation, pos, ... }
  const d = def as any;

  const number = d.number ?? strongNumber;
  const lemma = d.lemma;
  const transliteration = d.transliteration ?? d.translit;
  const pronunciation = d.pronunciation;
  const partOfSpeech = d.partOfSpeech ?? d.pos;
  const gloss = d.definition ?? d.strongs_def;
  const usage = d.usage ?? d.kjv_def;
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
