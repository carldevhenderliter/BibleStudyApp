import { useState, useEffect } from 'react';
import { BibleVerse, Highlight, Note } from '@shared/schema';
import { VerseDisplay } from './VerseDisplay';
import { NoteEditor } from './NoteEditor';
import { HighlightToolbar } from './HighlightToolbar';
import { StrongDefinitions } from './StrongDefinitions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getVersesByChapter, BibleVerseWithTokens, Translation } from '@/lib/bibleData';
import { getStrongsDefinition } from '@/lib/strongsData';
import { useToast } from '@/hooks/use-toast';

interface BibleReaderProps {
  book: string;
  chapter: number;
  showStrongsNumbers: boolean;
  showInterlinear: boolean;
  showNotes: boolean;
  fontSize: number;
  displayMode: 'verse' | 'book';
  selectedTranslation: Translation;
}

type HighlightColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange' | 'red' | 'cyan' | 'gray';

type AddingNote = {
  verseId: string;
  wordIndex?: number;
  wordText?: string;
};

type SelectedStrong = {
  verseId: string;
  strongsNumbers: string[];
  activeIndex: number;
  verseReference: string;
};

export function BibleReader({
  book,
  chapter,
  showStrongsNumbers,
  showInterlinear,
  showNotes,
  fontSize,
  displayMode,
  selectedTranslation,
}: BibleReaderProps) {
  const [verses, setVerses] = useState<BibleVerseWithTokens[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [addingNote, setAddingNote] = useState<AddingNote | null>(null);
  const [highlightToolbar, setHighlightToolbar] = useState<{
    show: boolean;
    position: { x: number; y: number };
    verseId: string;
    text: string;
  } | null>(null);
  const [selectedStrong, setSelectedStrong] = useState<SelectedStrong | null>(null);
  const [isStrongDialogOpen, setIsStrongDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      // Load verses (now async)
      const loadedVerses = await getVersesByChapter(
        book,
        chapter,
        selectedTranslation
      );

      if (!cancelled) {
        setVerses(loadedVerses);

        // Then load highlights / notes from localStorage
        const savedHighlights = localStorage.getItem("bible-highlights");
        const savedNotes = localStorage.getItem("bible-notes");

        if (savedHighlights) {
          const parsedHighlights = JSON.parse(savedHighlights);
          setHighlights(
            parsedHighlights.map((h: Highlight) => ({
              ...h,
              wordIndex:
                typeof h.wordIndex === "string"
                  ? parseInt(h.wordIndex, 10)
                  : h.wordIndex,
            }))
          );
        }

        if (savedNotes) {
          const parsedNotes = JSON.parse(savedNotes);
          setNotes(
            parsedNotes.map((n: Note) => ({
              ...n,
              wordIndex:
                typeof n.wordIndex === "string"
                  ? parseInt(n.wordIndex, 10)
                  : n.wordIndex,
            }))
          );
        }
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error loading verses",
        description:
          err instanceof Error ? err.message : "Failed to load Bible text.",
        variant: "destructive",
      });
    }
  })();

  return () => {
    cancelled = true;
  };
}, [book, chapter, selectedTranslation, toast]);

  const handleTextSelect = (verseId: string, text: string) => {
    const selection = window.getSelection();
    if (selection && text) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setHighlightToolbar({
        show: true,
        position: { x: rect.left, y: rect.top },
        verseId,
        text,
      });
    }
  };

  const handleHighlight = (color: HighlightColor) => {
    if (!highlightToolbar) return;

    const newHighlight: Highlight = {
      id: `${highlightToolbar.verseId}-${Date.now()}`,
      verseId: highlightToolbar.verseId,
      color,
      text: highlightToolbar.text,
    };

    const updatedHighlights = [...highlights.filter(h => h.verseId !== highlightToolbar.verseId), newHighlight];
    setHighlights(updatedHighlights);
    localStorage.setItem('bible-highlights', JSON.stringify(updatedHighlights));
    setHighlightToolbar(null);
  };

  const handleSaveNote = (content: string) => {
    if (!addingNote) return;

    const wordIndex = addingNote.wordIndex != null ? Number(addingNote.wordIndex) : undefined;

    const newNote: Note = {
      id: `note-${Date.now()}`,
      verseId: addingNote.verseId,
      content,
      timestamp: Date.now(),
      wordIndex,
      wordText: addingNote.wordText,
    };

    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    localStorage.setItem('bible-notes', JSON.stringify(updatedNotes));
    setAddingNote(null);
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);
    localStorage.setItem('bible-notes', JSON.stringify(updatedNotes));
  };

  const handleUpdateNote = (noteId: string, content: string) => {
    const updatedNotes = notes.map(n => n.id === noteId ? {
      ...n,
      content,
      wordIndex: typeof n.wordIndex === 'number' ? n.wordIndex : (typeof n.wordIndex === 'string' ? parseInt(n.wordIndex, 10) : undefined)
    } : n);
    setNotes(updatedNotes);
    localStorage.setItem('bible-notes', JSON.stringify(updatedNotes));
  };

  const handleAddWordNote = (verseId: string, wordIndex: number, wordText: string) => {
    const normalizedIndex = Number(wordIndex);
    const existingNote = notes.find(n => n.verseId === verseId && n.wordIndex === normalizedIndex);
    if (existingNote) {
      setAddingNote({ verseId, wordIndex: normalizedIndex, wordText });
    } else {
      setAddingNote({ verseId, wordIndex: normalizedIndex, wordText });
    }
  };

  const handleSaveWordNote = (wordIndex: number, content: string) => {
    if (!addingNote) return;
    
    const existingNote = notes.find(n => n.verseId === addingNote.verseId && n.wordIndex === Number(wordIndex));
    if (existingNote) {
      handleUpdateNote(existingNote.id, content);
    } else {
      handleSaveNote(content);
    }
  };

  const handleCancelWordNote = () => {
    setAddingNote(null);
  };

  const handleHighlightWord = (verseId: string, wordIndex: number, wordText: string, color: HighlightColor) => {
    const existingHighlight = highlights.find(h => h.verseId === verseId && h.wordIndex === wordIndex);
    
    if (existingHighlight && existingHighlight.color === color) {
      const updatedHighlights = highlights.filter(h => !(h.verseId === verseId && h.wordIndex === wordIndex));
      setHighlights(updatedHighlights);
      localStorage.setItem('bible-highlights', JSON.stringify(updatedHighlights));
    } else {
      const newHighlight: Highlight = {
        id: `${verseId}-word-${wordIndex}-${Date.now()}`,
        verseId,
        color,
        text: wordText,
        wordIndex,
        wordText,
      };

      const updatedHighlights = [
        ...highlights.filter(h => !(h.verseId === verseId && h.wordIndex === wordIndex)),
        newHighlight
      ];
      setHighlights(updatedHighlights);
      localStorage.setItem('bible-highlights', JSON.stringify(updatedHighlights));
    }
  };

  const handleStrongClick = (verseId: string, strongNumber: string) => {
    const verse = verses.find(v => v.id === verseId) as BibleVerseWithTokens;
    if (!verse) return;

    const strongsNumbers = new Set<string>();
    if (verse.tokens) {
      verse.tokens.forEach(token => {
        if (token.strongs) {
          if (Array.isArray(token.strongs)) {
            token.strongs.forEach(num => {
              if (num && num.trim()) {
                strongsNumbers.add(num.trim());
              }
            });
          } else if (token.strongs.trim()) {
            strongsNumbers.add(token.strongs.trim());
          }
        }
      });
    }

    const strongsList = Array.from(strongsNumbers);
    
    // Filter to only Strong's numbers that have definitions
    const strongsWithDefinitions = strongsList.filter(num => getStrongsDefinition(num) !== null);
    
    if (strongsWithDefinitions.length === 0) {
      toast({
        title: "Definition Not Available",
        description: `Strong's definition for ${strongNumber} is not currently in our database.`,
        variant: "default",
      });
      return;
    }

    // Find the index of the clicked number in the filtered list
    let clickedIndex = strongsWithDefinitions.indexOf(strongNumber);
    
    // If clicked number doesn't have a definition, show the first available one
    if (clickedIndex < 0) {
      clickedIndex = 0;
      toast({
        title: "Showing Available Definition",
        description: `${strongNumber} definition not available. Showing ${strongsWithDefinitions[0]} instead.`,
        variant: "default",
      });
    }

    setSelectedStrong({
      verseId,
      strongsNumbers: strongsWithDefinitions,
      activeIndex: clickedIndex,
      verseReference: `${verse.book} ${verse.chapter}:${verse.verse}`,
    });
    setIsStrongDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-3xl font-serif font-semibold" data-testid="text-chapter-title">
          {book} {chapter}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{selectedTranslation}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-8" style={{ fontSize: `${fontSize}px` }}>
          {displayMode === 'book' ? (
            <div className="font-serif text-base leading-relaxed">
              {verses.map((verse) => {
                const verseNotes = notes.filter(n => n.verseId === verse.id && n.wordIndex === undefined);
                const wordNotes = notes.filter(n => n.verseId === verse.id && n.wordIndex !== undefined);
                const verseHighlight = highlights.find(h => h.verseId === verse.id && h.wordIndex === undefined);
                const wordHighlights = highlights.filter(h => h.verseId === verse.id && h.wordIndex !== undefined);
                const verseWithTokens = verse as BibleVerseWithTokens;
                const hasTokens = verseWithTokens.tokens && verseWithTokens.tokens.length > 0;
                const showWordByWord = (showStrongsNumbers || showInterlinear) && hasTokens;

                return (
                  <span key={verse.id}>
                    <VerseDisplay
                      verse={verse}
                      highlight={verseHighlight}
                      wordHighlights={wordHighlights}
                      showStrongsNumbers={showStrongsNumbers}
                      showInterlinear={showInterlinear}
                      showNotes={showNotes}
                      displayMode={displayMode}
                      showWordByWord={showWordByWord}
                      onAddNote={() => setAddingNote({ verseId: verse.id })}
                      onAddWordNote={(wordIndex, wordText) => handleAddWordNote(verse.id, wordIndex, wordText)}
                      onSaveWordNote={handleSaveWordNote}
                      onCancelWordNote={handleCancelWordNote}
                      onHighlightWord={(wordIndex, wordText, color) => handleHighlightWord(verse.id, wordIndex, wordText, color as HighlightColor)}
                      onTextSelect={(text) => handleTextSelect(verse.id, text)}
                      onStrongClick={(strongNumber) => handleStrongClick(verse.id, strongNumber)}
                      wordNotes={wordNotes}
                      activeWordNote={addingNote?.verseId === verse.id && addingNote.wordIndex !== undefined ? { verseId: addingNote.verseId, wordIndex: addingNote.wordIndex, wordText: addingNote.wordText } : null}
                    />

                    {showNotes && (
                      <>
                        {verseNotes.map(note => (
                          <div key={note.id} className="block my-4">
                            <NoteEditor
                              note={note}
                              verseId={verse.id}
                              verseReference={`${verse.book} ${verse.chapter}:${verse.verse}`}
                              onSave={(content) => handleUpdateNote(note.id, content)}
                              onDelete={() => handleDeleteNote(note.id)}
                              onCancel={() => {}}
                            />
                          </div>
                        ))}

                        {!showWordByWord && wordNotes.map(note => (
                          <div key={note.id} className="block my-4">
                            <NoteEditor
                              note={note}
                              verseId={verse.id}
                              verseReference={`${verse.book} ${verse.chapter}:${verse.verse}`}
                              wordText={note.wordText}
                              onSave={(content) => handleUpdateNote(note.id, content)}
                              onDelete={() => handleDeleteNote(note.id)}
                              onCancel={() => {}}
                            />
                          </div>
                        ))}

                        {!showWordByWord && addingNote?.verseId === verse.id && (
                          <div className="block my-4">
                            <NoteEditor
                              note={addingNote.wordIndex !== undefined ? wordNotes.find(n => n.wordIndex === addingNote.wordIndex) : undefined}
                              verseId={verse.id}
                              verseReference={`${verse.book} ${verse.chapter}:${verse.verse}`}
                              wordText={addingNote.wordText}
                              onSave={(content) => {
                                if (addingNote.wordIndex !== undefined) {
                                  const existingNote = wordNotes.find(n => n.wordIndex === addingNote.wordIndex);
                                  if (existingNote) {
                                    handleUpdateNote(existingNote.id, content);
                                  } else {
                                    handleSaveNote(content);
                                  }
                                } else {
                                  handleSaveNote(content);
                                }
                                setAddingNote(null);
                              }}
                              onDelete={() => {
                                if (addingNote.wordIndex !== undefined) {
                                  const existingNote = wordNotes.find(n => n.wordIndex === addingNote.wordIndex);
                                  if (existingNote) {
                                    handleDeleteNote(existingNote.id);
                                  }
                                }
                                setAddingNote(null);
                              }}
                              onCancel={() => setAddingNote(null)}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            <>
              {verses.map((verse) => {
                const verseNotes = notes.filter(n => n.verseId === verse.id && n.wordIndex === undefined);
                const wordNotes = notes.filter(n => n.verseId === verse.id && n.wordIndex !== undefined);
                const verseHighlight = highlights.find(h => h.verseId === verse.id && h.wordIndex === undefined);
                const wordHighlights = highlights.filter(h => h.verseId === verse.id && h.wordIndex !== undefined);
                const verseWithTokens = verse as BibleVerseWithTokens;
                const hasTokens = verseWithTokens.tokens && verseWithTokens.tokens.length > 0;
                const showWordByWord = (showStrongsNumbers || showInterlinear) && hasTokens;

                return (
                  <div key={verse.id}>
                    <VerseDisplay
                      verse={verse}
                      highlight={verseHighlight}
                      wordHighlights={wordHighlights}
                      showStrongsNumbers={showStrongsNumbers}
                      showInterlinear={showInterlinear}
                      showNotes={showNotes}
                      displayMode={displayMode}
                      showWordByWord={showWordByWord}
                      onAddNote={() => setAddingNote({ verseId: verse.id })}
                      onAddWordNote={(wordIndex, wordText) => handleAddWordNote(verse.id, wordIndex, wordText)}
                      onSaveWordNote={handleSaveWordNote}
                      onCancelWordNote={handleCancelWordNote}
                      onHighlightWord={(wordIndex, wordText, color) => handleHighlightWord(verse.id, wordIndex, wordText, color as HighlightColor)}
                      onTextSelect={(text) => handleTextSelect(verse.id, text)}
                      onStrongClick={(strongNumber) => handleStrongClick(verse.id, strongNumber)}
                      wordNotes={wordNotes}
                      activeWordNote={addingNote?.verseId === verse.id && addingNote.wordIndex !== undefined ? { verseId: addingNote.verseId, wordIndex: addingNote.wordIndex, wordText: addingNote.wordText } : null}
                    />

                    {showNotes && (
                      <>
                        {verseNotes.map(note => (
                          <NoteEditor
                            key={note.id}
                            note={note}
                            verseId={verse.id}
                            verseReference={`${verse.book} ${verse.chapter}:${verse.verse}`}
                            onSave={(content) => handleUpdateNote(note.id, content)}
                            onDelete={() => handleDeleteNote(note.id)}
                            onCancel={() => {}}
                          />
                        ))}

                        {!showWordByWord && wordNotes.map(note => (
                          <NoteEditor
                            key={note.id}
                            note={note}
                            verseId={verse.id}
                            verseReference={`${verse.book} ${verse.chapter}:${verse.verse}`}
                            wordText={note.wordText}
                            onSave={(content) => handleUpdateNote(note.id, content)}
                            onDelete={() => handleDeleteNote(note.id)}
                            onCancel={() => {}}
                          />
                        ))}

                        {addingNote?.verseId === verse.id && (
                          <NoteEditor
                            note={addingNote.wordIndex !== undefined ? wordNotes.find(n => n.wordIndex === addingNote.wordIndex) : undefined}
                            verseId={verse.id}
                            verseReference={`${verse.book} ${verse.chapter}:${verse.verse}`}
                            wordText={addingNote.wordText}
                            onSave={(content) => {
                              if (addingNote.wordIndex !== undefined) {
                                const existingNote = wordNotes.find(n => n.wordIndex === addingNote.wordIndex);
                                if (existingNote) {
                                  handleUpdateNote(existingNote.id, content);
                                } else {
                                  handleSaveNote(content);
                                }
                              } else {
                                handleSaveNote(content);
                              }
                              setAddingNote(null);
                            }}
                            onDelete={() => {
                              if (addingNote.wordIndex !== undefined) {
                                const existingNote = wordNotes.find(n => n.wordIndex === addingNote.wordIndex);
                                if (existingNote) {
                                  handleDeleteNote(existingNote.id);
                                }
                              }
                              setAddingNote(null);
                            }}
                            onCancel={() => setAddingNote(null)}
                          />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {verses.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <p>No verses available for this chapter.</p>
              <p className="text-sm mt-2">Try selecting a different book or chapter.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {highlightToolbar?.show && (
        <HighlightToolbar
          position={highlightToolbar.position}
          onHighlight={handleHighlight}
          onClose={() => setHighlightToolbar(null)}
        />
      )}

      {selectedStrong && (
        <StrongDefinitions
          open={isStrongDialogOpen}
          strongsNumbers={selectedStrong.strongsNumbers}
          activeIndex={selectedStrong.activeIndex}
          onActiveIndexChange={(index) => setSelectedStrong({ ...selectedStrong, activeIndex: index })}
          verseReference={selectedStrong.verseReference}
          onClose={() => {
            setIsStrongDialogOpen(false);
            setSelectedStrong(null);
          }}
        />
      )}
    </div>
  );
}
