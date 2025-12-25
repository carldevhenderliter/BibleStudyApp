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
    <div className="mt-2 rounded-xl border bg-muted/40 px-4 py-3 md:px-5 md:py-4 text-[0.5em] shadow-sm">
      {/* Header row */}
      <div className="flex flex-wrap items-baseline gap-2 md:gap-3">
        {/* Strong's number */}
        <span className="font-mono text-[1em] font-semibold text-primary">
          {number || strongNumber}
        </span>

        {/* Lemma (Greek/Hebrew script) */}
        {lemma && (
          <span className="text-[1.2em] font-semibold font-serif">
            {lemma}
          </span>
        )}

        {/* Transliteration */}
        {transliteration && (
          <span className="text-[1em] font-medium text-foreground/90">
            {transliteration}
          </span>
        )}

        {/* Pronunciation */}
        {pronunciation && (
          <span className="text-[0.9em] italic text-muted-foreground">
            ({pronunciation})
          </span>
        )}

        {/* Part of speech */}
        {partOfSpeech && (
          <span className="rounded-full bg-background px-2 py-0.5 text-[0.85em] text-muted-foreground border border-border/60">
            {partOfSpeech}
          </span>
        )}
      </div>

      {/* Derivation (if present) */}
      {derivation && (
        <p className="mt-2 text-[0.9em] text-muted-foreground leading-snug">
          <span className="font-semibold mr-1">From:</span>
          {derivation}
        </p>
      )}

      {/* Main definition */}
      {gloss && (
        <p className="mt-3 text-[1em] leading-snug">
          <span className="font-semibold mr-1">Definition:</span>
          {gloss}
        </p>
      )}

      {/* KJV usage / gloss list */}
      {usage && (
        <p className="mt-2 text-[0.9em] text-muted-foreground leading-snug">
          {usage}
        </p>
      )}
    </div>
  );
}
