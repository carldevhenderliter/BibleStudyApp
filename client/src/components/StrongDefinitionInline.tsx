import { useMemo } from "react";
import { getStrongsDefinition, StrongsDefinition } from "@/lib/strongsData";

interface StrongDefinitionInlineProps {
  strongsNumbers: string[];
  activeIndex: number;                  // we still accept this to match BibleReader
  onActiveIndexChange?: (index: number) => void; // kept optional for future use
}

export function StrongDefinitionInline({
  strongsNumbers,
  activeIndex,
}: StrongDefinitionInlineProps) {
  // We expect only one Strong's, but this keeps it safe
  const strongNumber = strongsNumbers[activeIndex] ?? strongsNumbers[0];

  const definition = useMemo<StrongsDefinition | null>(() => {
    if (!strongNumber) return null;
    return getStrongsDefinition(strongNumber);
  }, [strongNumber]);

  if (!strongNumber || !definition) {
    return null;
  }

  const {
    number,
    lemma,
    transliteration,
    pronunciation,
    partOfSpeech,
    definition: gloss,
    usage,
    derivation,
  } = definition as any;

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

      {/* Derivation (if present) */}
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
