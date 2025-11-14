import { useMemo } from "react";
import { getStrongsDefinition, StrongsDefinition } from "@/lib/strongsData";
import { BookOpen } from "lucide-react";

interface StrongDefinitionInlineProps {
  strongNumber: string;
}

export function StrongDefinitionInline({
  strongNumber,
}: StrongDefinitionInlineProps) {
  const definition = useMemo<StrongsDefinition | null>(
    () => getStrongsDefinition(strongNumber),
    [strongNumber]
  );

  if (!definition) {
    return (
      <div className="border-l-4 border-muted pl-3 py-2 text-sm text-muted-foreground">
        No Strong&apos;s definition found for {strongNumber}.
      </div>
    );
  }

  return (
    <div className="border-l-4 border-primary/40 bg-primary/5 rounded-r-md pl-3 pr-3 py-2 text-sm space-y-1">
      <div className="flex items-baseline gap-2 flex-wrap">
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="text-sm font-mono text-primary font-semibold">
          {definition.number}
        </span>
        {definition.lemma && (
          <span className="text-sm font-semibold">{definition.lemma}</span>
        )}
        {definition.transliteration && (
          <span className="text-sm text-muted-foreground">
            {definition.transliteration}
          </span>
        )}
      </div>

      {definition.partOfSpeech && (
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {definition.partOfSpeech}
        </div>
      )}

      {definition.definition && (
        <p className="text-sm leading-snug">
          <span className="font-semibold">Definition: </span>
          {definition.definition}
        </p>
      )}

      {definition.usage && (
        <p className="text-xs text-muted-foreground leading-snug">
          {definition.usage}
        </p>
      )}
    </div>
  );
}
