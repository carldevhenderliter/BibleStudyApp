import { useState } from 'react';
import { NoteEditor } from '../NoteEditor';
import { Button } from '@/components/ui/button';
import { Note } from '@shared/schema';

export default function NoteEditorExample() {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      verseId: 'john-1-1',
      content: 'This is a sample note about the Word being with God from the beginning.',
      timestamp: Date.now(),
    }
  ]);
  const [showNewNote, setShowNewNote] = useState(false);

  const handleSaveNew = (content: string) => {
    const newNote: Note = {
      id: String(Date.now()),
      verseId: 'john-1-1',
      content,
      timestamp: Date.now(),
    };
    setNotes([...notes, newNote]);
    setShowNewNote(false);
  };

  const handleSaveEdit = (noteId: string, content: string) => {
    setNotes(notes.map(n => n.id === noteId ? { ...n, content } : n));
  };

  const handleDelete = (noteId: string) => {
    setNotes(notes.filter(n => n.id !== noteId));
  };

  return (
    <div className="p-8 space-y-4 max-w-2xl">
      <h2 className="text-2xl font-semibold">Note Editor Example</h2>
      
      {notes.map(note => (
        <NoteEditor
          key={note.id}
          note={note}
          verseId={note.verseId}
          verseReference="John 1:1"
          onSave={(content) => handleSaveEdit(note.id, content)}
          onDelete={() => handleDelete(note.id)}
          onCancel={() => {}}
        />
      ))}

      {showNewNote && (
        <NoteEditor
          verseId="john-1-1"
          verseReference="John 1:1"
          onSave={handleSaveNew}
          onCancel={() => setShowNewNote(false)}
        />
      )}

      {!showNewNote && (
        <Button onClick={() => setShowNewNote(true)} data-testid="button-add-note">
          Add New Note
        </Button>
      )}
    </div>
  );
}
