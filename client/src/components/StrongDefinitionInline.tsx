// src/components/StrongDefinitionInline.tsx
import { useMemo } from "react";
import { getStrongsDefinition, StrongsDefinition } from "@/lib/strongsData";

interface StrongDefinitionInlineProps {
  strongNumber: string; // e.g. "G3056"
}

export function StrongDefinitionInline({
  strongNumber,
}: StrongDefinitionInlineProps) {
  const def = useMemo<StrongsDefinition | null>(() => {
    if (!strongNumber) return null;
    try {
      return getStrongsDefinition(strongNumber);
    } catch (err) {
      console.error("Error getting Strong's definition for", strongNumber, err);
      return null;
    }
  }, [strongNumber]);

  if (!def) return null;

  const {
    number,
    lemma,
    transliteration,
    pronunciation,
    partOfSpeech,
    definition,
    usage,
    derivation,
  } = def;

  return (
    <div className="mt-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm shadow-sm">
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
      {definition && (
        <p className="mt-2 text-sm leading-snug">
          <span className="font-semibold">Definition: </span>
          {definition}
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
