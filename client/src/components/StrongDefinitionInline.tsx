import { useEffect, useState } from "react";
import { loadStrongsDefinition, StrongsDefinition } from "@/lib/strongs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface StrongDefinitionInlineProps {
  strongsNumbers: string[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}

export function StrongDefinitionInline({
  strongsNumbers,
  activeIndex,
  onActiveIndexChange,
}: StrongDefinitionInlineProps) {
  const [currentDef, setCurrentDef] = useState<StrongsDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalCount = strongsNumbers.length;

  useEffect(() => {
    if (totalCount === 0) {
      setCurrentDef(null);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setCurrentDef(null);
      setError(null);

      const safeIndex =
        activeIndex >= 0 && activeIndex < totalCount ? activeIndex : 0;
      const number = strongsNumbers[safeIndex];

      const def = await loadStrongsDefinition(number);

      if (cancelled) return;

      if (!def) {
        setError(`No definition found for ${number}`);
      } else {
        setCurrentDef(def);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeIndex, strongsNumbers, totalCount]);

  const handlePrevious = () => {
    if (totalCount === 0) return;
    onActiveIndexChange(activeIndex > 0 ? activeIndex - 1 : totalCount - 1);
  };

  const handleNext = () => {
    if (totalCount === 0) return;
    onActiveIndexChange(activeIndex < totalCount - 1 ? activeIndex + 1 : 0);
  };

  if (totalCount === 0) return null;

  return (
    <div className="mt-2 mb-4 border-l-4 border-primary/30 pl-4 py-2 rounded bg-muted/40 text-sm">
      {totalCount > 1 && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            {activeIndex + 1} of {totalCount}
          </span>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={handlePrevious}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleNext}
              className="h-7 w-7"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : !currentDef ? (
        <p className="text-xs text-muted-foreground">Loading Strong&apos;s definition…</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 flex-wrap mb-1">
            <span className="font-mono text-primary font-semibold">
              {currentDef.number}
            </span>

            {currentDef.lemma && (
              <span className="font-semibold">{currentDef.lemma}</span>
            )}

            {currentDef.transliteration && (
              <span className="font-semibold">{currentDef.transliteration}</span>
            )}

            {currentDef.pronunciation && (
              <span className="text-muted-foreground italic">
                ({currentDef.pronunciation})
              </span>
            )}

            {currentDef.partOfSpeech && (
              <span className="text-[0.7rem] text-muted-foreground px-1.5 py-0.5 bg-background rounded">
                {currentDef.partOfSpeech}
              </span>
            )}
          </div>

          {currentDef.definition && (
            <p className="mb-1">
              <span className="font-semibold">Definition:</span>{" "}
              {currentDef.definition}
            </p>
          )}

          {currentDef.usage && (
            <p className="text-muted-foreground mb-1">{currentDef.usage}</p>
          )}

          {currentDef.derivation && (
            <p className="text-muted-foreground italic">
              <span className="font-semibold not-italic">Derivation:</span>{" "}
              {currentDef.derivation}
            </p>
          )}
        </>
      )}
    </div>
  );
}
