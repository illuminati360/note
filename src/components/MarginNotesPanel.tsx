import React, { forwardRef, useImperativeHandle, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { MarginEditor, MarginEditorRef, EditorContent, useEditorFocus } from '../editor';

export interface MarginNoteData {
  id: string;
  noteIndex: number;
  line: number;
  blockIndex: number;
}

// Export ref type for parent to access the margin editor
export interface MarginNotesPanelRef {
  // Get the margin editor ref for toolbar actions
  getMarginEditorRef: () => MarginEditorRef | null;
  // Insert a new note block
  insertNoteBlock: (noteId: string, noteIndex: number) => void;
  // Delete a note block
  deleteNoteBlock: (noteId: string) => void;
  // Update indices after reordering
  updateNoteIndices: (notes: MarginNoteData[]) => void;
  // Focus a specific note
  focusNote: (noteId: string) => void;
}

interface MarginNotesPanelProps {
  notes: MarginNoteData[];
  onContentChange?: (content: string) => void;
  onNoteBlockFocus?: (noteId: string | null) => void;
  style?: ViewStyle;
}

export const MarginNotesPanel = forwardRef<MarginNotesPanelRef, MarginNotesPanelProps>(
  function MarginNotesPanel({ notes, onContentChange, onNoteBlockFocus, style }, ref) {
    const marginEditorRef = useRef<MarginEditorRef>(null);
    const { focusedNoteId } = useEditorFocus();

    // Update note block indices when notes change
    useEffect(() => {
      if (marginEditorRef.current && notes.length > 0) {
        const indices = notes.map(note => ({
          noteId: note.id,
          noteIndex: note.noteIndex,
        }));
        marginEditorRef.current.updateAllNoteBlockIndices(indices);
      }
    }, [notes]);

    const handleContentChange = useCallback((content: EditorContent) => {
      onContentChange?.(content.html);
    }, [onContentChange]);

    const handleNoteBlockFocus = useCallback((noteId: string | null) => {
      onNoteBlockFocus?.(noteId);
    }, [onNoteBlockFocus]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getMarginEditorRef: () => marginEditorRef.current,
      insertNoteBlock: (noteId: string, noteIndex: number) => {
        // Insert note block - this will also focus it
        marginEditorRef.current?.insertNoteBlock(noteId, noteIndex);
      },
      deleteNoteBlock: (noteId: string) => {
        marginEditorRef.current?.deleteNoteBlock(noteId);
      },
      updateNoteIndices: (updatedNotes: MarginNoteData[]) => {
        if (marginEditorRef.current) {
          const indices = updatedNotes.map(note => ({
            noteId: note.id,
            noteIndex: note.noteIndex,
          }));
          marginEditorRef.current.updateAllNoteBlockIndices(indices);
        }
      },
      focusNote: (noteId: string) => {
        marginEditorRef.current?.focusNoteBlock(noteId);
      },
    }), []);

    return (
      <View style={[styles.container, style]}>
        <MarginEditor
          ref={marginEditorRef}
          onContentChange={handleContentChange}
          onNoteBlockFocus={handleNoteBlockFocus}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
});

export default MarginNotesPanel;
