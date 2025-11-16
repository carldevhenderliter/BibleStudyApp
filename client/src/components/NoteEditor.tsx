import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, X, Edit, Trash2, StickyNote } from 'lucide-react';
import { Note } from '@shared/schema';

interface NoteEditorProps {
  note?: Note;
  verseId: string;
  verseReference: string;
  wordText?: string;
  onSave: (content: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function NoteEditor({ note, verseId, verseReference, wordText, onSave, onDelete, onCancel }: NoteEditorProps) {
  const [content, setContent] = useState(note?.content || '');
  const [isEditing, setIsEditing] = useState(!note);

  const handleSave = () => {
    if (content.trim()) {
      onSave(content);
      if (!note) {
        onCancel();
      } else {
        setIsEditing(false);
      }
    }
  };

  const noteType = wordText || note?.wordText ? 'word' : 'verse';
  const displayWordText = wordText || note?.wordText;

  if (note && !isEditing) {
    return (
      <Card className="my-2 p-3 bg-accent/30 border-l-4 border-l-primary">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <StickyNote className="h-3 w-3" />
            <span>
              {noteType === 'word' ? (
                <>Note on word: <span className="font-semibold italic">"{displayWordText}"</span> ({verseReference})</>
              ) : (
                <>Note on {verseReference}</>
              )}
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setIsEditing(true)}
              data-testid="button-edit-note"
            >
              <Edit className="h-3 w-3" />
            </Button>
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={onDelete}
                data-testid="button-delete-note"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <div className="text-sm whitespace-pre-wrap" data-testid="text-note-content">
          {note.content}
        </div>
      </Card>
    );
  }

  return (
    <Card className="my-2 p-3 bg-accent/30 border-l-4 border-l-primary">
      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
        <StickyNote className="h-3 w-3" />
        {note ? 'Edit note' : 'Add note'} {noteType === 'word' ? (
          <>for word: <span className="font-semibold italic">"{displayWordText}"</span> ({verseReference})</>
        ) : (
          <>for {verseReference}</>
        )}
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type your note here..."
        className="mb-2 min-h-24 resize-none"
        data-testid="input-note-content"
        autoFocus
      />
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (note) {
              setIsEditing(false);
              setContent(note.content);
            } else {
              onCancel();
            }
          }}
          data-testid="button-cancel-note"
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!content.trim()}
          data-testid="button-save-note"
        >
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
      </div>
    </Card>
  );
}
