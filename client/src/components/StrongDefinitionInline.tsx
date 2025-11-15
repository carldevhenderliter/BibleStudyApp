import { useMemo } from "react";
import { getStrongsDefinition, StrongsDefinition } from "@/lib/strongsData";

export type StrongOccurrence = {
  verseId: string;
  reference: string;   // "John 1:1"
  english: string;     // English token
  original?: string;   // Greek/Hebrew
};

interface StrongDefinitionInlineProps {
  strongNumber: string;
  occurrences?: StrongOccurrence[];
  isLoadingOccurrences?: boolean;
}

export function StrongDefinitionInline({
  strongNumber,
  occurrences = [],
  isLoadingOccurrences = false,
}: StrongDefinitionInlineProps) {
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

  const displayNumber = number || strongNumber;

  return (
    <div className="mt-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm shadow-sm">
      {/* Definition header */}
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-xs font-semibold text-primary">
          {displayNumber}
        </span>

        {lemma && (
          <span className="text-base font-semibold font-serif">
            {lemma}
          </span>
        )}

        {transliteration && (
          <span className="text-sm font-medium text-foreground/90">
            {transliteration}
          </span>
        )}

        {pronunciation && (
          <span className="text-xs italic text-muted-foreground">
            ({pronunciation})
          </span>
        )}

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

      {/* Usage */}
      {usage && (
        <p className="mt-1 text-xs text-muted-foreground leading-snug">
          {usage}
        </p>
      )}

      {/* 🔁 All occurrences in the New Testament */}
      <div className="mt-3 border-t pt-2">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center justify-between">
          <span>
            Occurrences in the New Testament
            {occurrences.length > 0 && ` (${occurrences.length})`}
          </span>
          {isLoadingOccurrences && (
            <span className="text-[10px] italic">
              Scanning…
            </span>
          )}
        </div>

        {isLoadingOccurrences && occurrences.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic">
            Scanning the New Testament for this Strong&apos;s number…
          </p>
        )}

        {!isLoadingOccurrences && occurrences.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic">
            No occurrences found in the New Testament.
          </p>
        )}

        {!isLoadingOccurrences && occurrences.length > 0 && (
          <div className="max-h-52 overflow-y-auto pr-1 space-y-1 text-xs">
            {occurrences.map((occ, idx) => (
              <div
                key={`${occ.verseId}-${idx}`}
                className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2"
              >
                <span className="font-mono text-[11px] text-primary/80 min-w-[80px]">
                  {occ.reference}
                </span>
                <span className="text-xs">
                  <span className="font-semibold">{occ.english}</span>
                  {occ.original && (
                    <span className="ml-1 italic text-muted-foreground">
                      ({occ.original})
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
