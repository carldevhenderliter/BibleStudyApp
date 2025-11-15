import { useMemo } from "react";
import { getStrongsDefinition, StrongsDefinition } from "@/lib/strongsData";

interface StrongDefinitionInlineProps {
  strongNumber: string;
}

export function StrongDefinitionInline({ strongNumber }: StrongDefinitionInlineProps) {
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
    <div className="mt-2 rounded-xl border bg-muted/40 px-4 py-3 md:px-5 md:py-4 text-sm md:text-base shadow-sm">
      {/* Header row */}
      <div className="flex flex-wrap items-baseline gap-2 md:gap-3">
        {/* Strong's number */}
        <span className="font-mono text-sm md:text-base font-semibold text-primary">
          {number || strongNumber}
        </span>

        {/* Lemma (Greek/Hebrew script) */}
        {lemma && (
          <span className="text-base md:text-lg font-semibold font-serif">
            {lemma}
          </span>
        )}

        {/* Transliteration */}
        {transliteration && (
          <span className="text-sm md:text-base font-medium text-foreground/90">
            {transliteration}
          </span>
        )}

        {/* Pronunciation */}
        {pronunciation && (
          <span className="text-xs md:text-sm italic text-muted-foreground">
            ({pronunciation})
          </span>
        )}

        {/* Part of speech */}
        {partOfSpeech && (
          <span className="rounded-full bg-background px-2 py-0.5 text-[11px] md:text-xs text-muted-foreground border border-border/60">
            {partOfSpeech}
          </span>
        )}
      </div>

      {/* Derivation (if present) */}
      {derivation && (
        <p className="mt-2 text-xs md:text-sm text-muted-foreground leading-snug">
          <span className="font-semibold mr-1">From:</span>
          {derivation}
        </p>
      )}

      {/* Main definition */}
      {gloss && (
        <p className="mt-3 text-sm md:text-base leading-snug">
          <span className="font-semibold mr-1">Definition:</span>
          {gloss}
        </p>
      )}

      {/* KJV usage / gloss list */}
      {usage && (
        <p className="mt-2 text-xs md:text-sm text-muted-foreground leading-snug">
          {usage}
        </p>
      )}
    </div>
  );
}
