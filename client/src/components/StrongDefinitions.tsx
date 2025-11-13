import { useMemo } from 'react';
import { getStrongsDefinition, StrongsDefinition } from '@/lib/strongsData';
import { Button } from '@/components/ui/button';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const definitions = useMemo(() => {
    return strongsNumbers
      .map(num => getStrongsDefinition(num))
      .filter((def): def is StrongsDefinition => def !== null);
  }, [strongsNumbers]);

  if (definitions.length === 0) {
    return null;
  }

  const currentDef = definitions[activeIndex];
  
  if (!currentDef) {
    return null;
  }
  
  const totalCount = definitions.length;

  const handlePrevious = () => {
    onActiveIndexChange(activeIndex > 0 ? activeIndex - 1 : totalCount - 1);
  };

  const handleNext = () => {
    onActiveIndexChange(activeIndex < totalCount - 1 ? activeIndex + 1 : 0);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl" data-testid="dialog-strong-definition">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Strong's Concordance - {verseReference}</span>
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

        <div 
          className="border-l-4 border-primary/30 pl-4 py-2"
          data-testid={`strong-def-${currentDef.number}`}
        >
          <div className="flex items-baseline gap-2 flex-wrap mb-3">
            <span className="text-lg font-mono text-primary font-semibold">{currentDef.number}</span>
            <span className="text-lg font-semibold">{currentDef.transliteration}</span>
            <span className="text-sm text-muted-foreground italic">({currentDef.pronunciation})</span>
            <span className="text-sm text-muted-foreground px-2 py-0.5 bg-muted rounded">{currentDef.partOfSpeech}</span>
          </div>
          <p className="text-base mb-2">
            <span className="font-semibold">Definition:</span> {currentDef.definition}
          </p>
          <p className="text-sm text-muted-foreground">{currentDef.usage}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
