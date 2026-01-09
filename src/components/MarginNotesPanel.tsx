import React, { useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NoteEditor, NoteEditorRef, EditorContent, useEditorFocus } from '../editor';

export interface MarginNoteData {
  id: string;
  noteIndex: number; // Will be dynamically calculated based on document order
  content: string;   // HTML content
  line: number;
  blockIndex: number;
}

// Export ref type for parent to access focused note editor
export interface MarginNotesPanelRef {
  getFocusedNoteEditorRef: () => NoteEditorRef | null;
  getNoteEditorRef: (id: string) => NoteEditorRef | null;
}

interface MarginNotesPanelProps {
  notes: MarginNoteData[];
  onNoteChange: (id: string, content: string) => void;
  onNoteDelete: (id: string) => void;
  selectedNoteId: string | null;
  onNoteSelect: (id: string) => void;
}

// Line height in the editor (approximate, for alignment)
const LINE_HEIGHT = 24;
const MIN_NOTE_GAP = 8;

interface NoteLayout {
  id: string;
  top: number;
  displayIndex: number; // Dynamic index based on document order
}

export const MarginNotesPanel = forwardRef<MarginNotesPanelRef, MarginNotesPanelProps>(
  function MarginNotesPanel({
    notes,
    onNoteChange,
    onNoteDelete,
    selectedNoteId,
    onNoteSelect,
  }, ref) {
    const noteEditorRefs = useRef<Map<string, NoteEditorRef>>(new Map());
    const [noteHeights, setNoteHeights] = React.useState<Map<string, number>>(new Map());
    const { setFocusedEditor, focusedNoteId } = useEditorFocus();

    // Get ref for a note editor
    const setNoteRef = useCallback((id: string, editorRef: NoteEditorRef | null) => {
      if (editorRef) {
        noteEditorRefs.current.set(id, editorRef);
      } else {
        noteEditorRefs.current.delete(id);
      }
    }, []);

    // Get the currently focused note editor ref
    const getFocusedNoteEditorRef = useCallback((): NoteEditorRef | null => {
      if (focusedNoteId) {
        return noteEditorRefs.current.get(focusedNoteId) || null;
      }
      return null;
    }, [focusedNoteId]);

    // Get a specific note editor ref
    const getNoteEditorRef = useCallback((id: string): NoteEditorRef | null => {
      return noteEditorRefs.current.get(id) || null;
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getFocusedNoteEditorRef,
      getNoteEditorRef,
    }), [getFocusedNoteEditorRef, getNoteEditorRef]);

    // Recalculate layouts with actual heights
    const layouts = useMemo(() => {
      const result: NoteLayout[] = [];
      let currentBottom = 0;

      const sortedNotes = [...notes].sort((a, b) => a.line - b.line);

      sortedNotes.forEach((note, index) => {
        const targetTop = note.line * LINE_HEIGHT;
        const minTop = currentBottom + MIN_NOTE_GAP;
        const actualTop = Math.max(targetTop, minTop);

        result.push({
          id: note.id,
          top: actualTop,
          displayIndex: index + 1, // 1-based index based on document order
        });

        const height = noteHeights.get(note.id) || 60;
        currentBottom = actualTop + height;
      });

      return result;
    }, [notes, noteHeights]);

    const handleNoteLayout = (id: string, height: number) => {
      setNoteHeights(prev => {
        const next = new Map(prev);
        next.set(id, height);
        return next;
      });
    };

    const handleDeletePress = (id: string, content: string) => {
      // Only delete if content is empty (strip HTML tags for check)
      const textContent = content.replace(/<[^>]*>/g, '').trim();
      if (textContent === '') {
        onNoteDelete(id);
      }
    };

    const handleNoteFocus = (id: string) => {
      setFocusedEditor(id);
      onNoteSelect(id);
    };

    const handleNoteBlur = (_id: string) => {
      // Don't clear focus immediately - let the next focus event set it
    };

    const handleNoteContentChange = (id: string, content: EditorContent) => {
      onNoteChange(id, content.html);
    };

    if (notes.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notes</Text>
          <Text style={styles.emptyHint}>Click 📝 to add a note</Text>
        </View>
      );
    }

    // Calculate total height needed
    const lastLayout = layouts[layouts.length - 1];
    const lastNoteHeight = lastLayout ? (noteHeights.get(lastLayout.id) || 60) : 0;
    const totalHeight = lastLayout ? lastLayout.top + lastNoteHeight + 20 : 100;

    return (
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[styles.contentContainer, { minHeight: totalHeight }]}
      >
        {layouts.map(layout => {
          const note = notes.find(n => n.id === layout.id);
          if (!note) return null;

          const isSelected = note.id === selectedNoteId;
          const isFocused = note.id === focusedNoteId;

          return (
            <View
              key={note.id}
              style={[
                styles.noteItem,
                { top: layout.top },
                isSelected && styles.noteItemSelected,
                isFocused && styles.noteItemFocused,
              ]}
              onLayout={(e) => handleNoteLayout(note.id, e.nativeEvent.layout.height)}
            >
              <TouchableOpacity
                style={styles.noteIndexButton}
                onPress={() => handleDeletePress(note.id, note.content)}
              >
                <View style={[styles.noteIndexCircle, isFocused && styles.noteIndexCircleFocused]}>
                  <Text style={styles.noteIndexText}>{layout.displayIndex}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.editorContainer}>
                <NoteEditor
                  ref={(editorRef: NoteEditorRef | null) => setNoteRef(note.id, editorRef)}
                  noteId={note.id}
                  initialContent={note.content}
                  onContentChange={(content: EditorContent) => handleNoteContentChange(note.id, content)}
                  onFocus={() => handleNoteFocus(note.id)}
                  onBlur={() => handleNoteBlur(note.id)}
                  placeholder="Add note..."
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  contentContainer: {
    position: 'relative',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fafafa',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 12,
    color: '#999',
  },
  noteItem: {
    position: 'absolute',
    left: 4,
    right: 4,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteItemSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  noteItemFocused: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#f8fbff',
  },
  noteIndexButton: {
    marginRight: 8,
  },
  noteIndexCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteIndexCircleFocused: {
    backgroundColor: '#0056b3',
  },
  noteIndexText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  editorContainer: {
    flex: 1,
    minHeight: 40,
  },
});

export default MarginNotesPanel;
