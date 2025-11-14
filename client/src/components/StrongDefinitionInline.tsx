import { useMemo } from "react";
import { getStrongsDefinition } from "@/lib/strongsData";

// Be flexible about the shape coming back from your JSON
export type StrongDefinitionShape = {
  number?: string;
  lemma?: string;
  transliteration?: string;
  pronunciation?: string;
  partOfSpeech?: string;
  // some JSONs use `definition`, some `strongs_def`
  definition?: string;
  strongs_def?: string;
  // some use `usage`, some `kjv_def`
  usage?: string;
  kjv_def?: string;
  derivation?: string;
};

interface StrongDefinitionInlineProps {
  strongsNumbers: string[];
  activeIndex: number;
  onActiveIndexChange?: (index: number) => void; // kept for future use
}

export function StrongDefinitionInline({
  strongsNumbers,
  activeIndex,
}: StrongDefinitionInlineProps) {
  // Safely pick a Strong’s number
  const strongNumber = strongsNumbers[activeIndex] ?? strongsNumbers[0];

  const definition = useMemo<StrongDefinitionShape | null>(() => {
    if (!strongNumber) return null;
    try {
      const def = getStrongsDefinition(strongNumber);
      if (!def) return null;
      return def as StrongDefinitionShape;
    } catch (err) {
      console.error("Error loading Strong's definition for", strongNumber, err);
      return null;
    }
  }, [strongNumber]);

  // If we have no number or no definition, render nothing (but don’t crash)
  if (!strongNumber || !definition) {
    return null;
  }

  const {
    number,
    lemma,
    transliteration,
    pronunciation,
    partOfSpeech,
    definition: gloss1,
    strongs_def: gloss2,
    usage,
    kjv_def,
    derivation,
  } = definition;

  const gloss = gloss1 ?? gloss2;
  const usageText = usage ?? kjv_def;

  return (
    <div className="mt-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm shadow-sm">
      <div className="flex flex-wrap items-baseline gap-2">
        {/* Strong's number */}
        <span className="font-mono text-xs font-semibold text-primary">
          {number || strongNumber}
        </span>

        {/* Lemma (Greek/Hebrew script) */}
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

      {/* Usage / KJV gloss list */}
      {usageText && (
        <p className="mt-1 text-xs text-muted-foreground leading-snug whitespace-pre-line">
          {usageText}
        </p>
      )}
    </div>
  );
}
