import { useEffect, useState } from "react";
import { loadStrongsDefinition, StrongsDefinition } from "@/lib/strongs";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StrongDefinitionsProps {
  open: boolean;
  strongsNumbers: string[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  verseReference: string;
  onClose: () => void;
}

export function StrongDefinitions({
  open,
  strongsNumbers,
  activeIndex,
  onActiveIndexChange,
  verseReference,
  onClose,
}: StrongDefinitionsProps) {
  const [currentDef, setCurrentDef] = useState<StrongsDefinition | null>(null);
  const totalCount = strongsNumbers.length;

  // Load the current Strong's definition whenever dialog opens or index changes
  useEffect(() => {
    if (!open || totalCount === 0) {
      setCurrentDef(null);
      return;
    }

    let cancelled = false;

    (async () => {
      // Guard against out-of-range index
      const safeIndex =
        activeIndex >= 0 && activeIndex < totalCount ? activeIndex : 0;
      const number = strongsNumbers[safeIndex];

      const def = await loadStrongsDefinition(number);

      if (!cancelled) {
        setCurrentDef(def);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, activeIndex, strongsNumbers, totalCount]);

  // If there are no Strong's numbers at all, don't render the dialog
  if (totalCount === 0) {
    return null;
  }

  const handlePrevious = () => {
    if (totalCount === 0) return;
    onActiveIndexChange(activeIndex > 0 ? activeIndex - 1 : totalCount - 1);
  };

  const handleNext = () => {
    if (totalCount === 0) return;
    onActiveIndexChange(activeIndex < totalCount - 1 ? activeIndex + 1 : 0);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-2xl"
        data-testid="dialog-strong-definition"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Strong&apos;s Concordance - {verseReference}</span>
          </DialogTitle>
        </DialogHeader>

        {totalCount > 1 && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              {activeIndex + 1} of {totalCount}
            </span>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={handlePrevious}
                data-testid="button-strong-previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleNext}
                data-testid="button-strong-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {!currentDef ? (
          <p className="text-sm text-muted-foreground py-4">
            Loading Strong&apos;s definition…
          </p>
        ) : (
          <div
            className="border-l-4 border-primary/30 pl-4 py-2"
            data-testid={`strong-def-${currentDef.number}`}
          >
            <div className="flex items-baseline gap-2 flex-wrap mb-3">
              <span className="text-lg font-mono text-primary font-semibold">
                {currentDef.number}
              </span>
              {currentDef.lemma && (
    <span className="text-lg font-semibold">{currentDef.lemma}</span>
              <span className="text-lg font-semibold">
                {currentDef.transliteration}
              </span>
              {currentDef.pronunciation && (
                <span className="text-sm text-muted-foreground italic">
                  ({currentDef.pronunciation})
                </span>
              )}
              {currentDef.partOfSpeech && (
                <span className="text-sm text-muted-foreground px-2 py-0.5 bg-muted rounded">
                  {currentDef.partOfSpeech}
                </span>
              )}
            </div>
            <p className="text-base mb-2">
              <span className="font-semibold">Definition:</span>{" "}
              {currentDef.definition}
            </p>
            {currentDef.usage && (
              <p className="text-sm text-muted-foreground">
                {currentDef.usage}
              </p>
            )}
      {currentDef.derivation && (
  <p className="text-sm text-muted-foreground italic">
    <span className="font-semibold not-italic">Derivation:</span>{" "}
    {currentDef.derivation}
  </p>
)}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
