import React, { useImperativeHandle, forwardRef, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { StyleSheet, View, ViewStyle, Text } from 'react-native';
import { Square, Circle, Flower, MarginNoteBlock } from '@prose/tiptap-extensions';
import type { EditorState, EditorContent as EditorContentType, SquareAttributes, CircleAttributes, FlowerAttributes } from './TipTapEditor';
import { useEditorFocus } from './EditorFocusContext';

// Ref interface for the margin editor
export interface MarginEditorRef {
  // Content management
  getContent: () => Promise<EditorContentType | null>;
  setContent: (content: string) => void;
  
  // Note block management
  insertNoteBlock: (noteId: string, noteIndex: number) => void;
  deleteNoteBlock: (noteId: string) => void;
  updateNoteBlockIndex: (noteId: string, noteIndex: number) => void;
  updateAllNoteBlockIndices: (indices: { noteId: string; noteIndex: number }[]) => void;
  
  // Focus management
  focus: () => void;
  blur: () => void;
  focusNoteBlock: (noteId: string) => void;
  
  // Formatting
  toggleBold: () => void;
  toggleItalic: () => void;
  insertSquare: (attrs?: SquareAttributes) => void;
  insertCircle: (attrs?: CircleAttributes) => void;
  insertFlower: (attrs?: FlowerAttributes) => void;
}

export interface MarginEditorProps {
  initialContent?: string;
  onContentChange?: (content: EditorContentType) => void;
  onSelectionChange?: (state: EditorState) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onNoteBlockFocus?: (noteId: string | null) => void;
  style?: ViewStyle;
}

export const MarginEditor = forwardRef<MarginEditorRef, MarginEditorProps>(
  ({ initialContent, onContentChange, onSelectionChange, onFocus, onBlur, onNoteBlockFocus, style }, ref) => {
    const { setFocusedEditor } = useEditorFocus();
    const lastFocusedNoteId = useRef<string | null>(null);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        Square,
        Circle,
        Flower,
        MarginNoteBlock,
      ],
      content: initialContent || '',
      onUpdate: ({ editor }) => {
        onContentChange?.({
          html: editor.getHTML(),
          json: editor.getJSON(),
        });
      },
      onSelectionUpdate: ({ editor }) => {
        onSelectionChange?.({
          isBold: editor.isActive('bold'),
          isItalic: editor.isActive('italic'),
          isStrike: editor.isActive('strike'),
          isCode: editor.isActive('code'),
          isBulletList: editor.isActive('bulletList'),
          isOrderedList: editor.isActive('orderedList'),
          isHeading: false,
        });

        // Detect which note block has the cursor
        const { $from } = editor.state.selection;
        let currentNoteId: string | null = null;
        
        // Walk up the tree to find the marginNoteBlock
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d);
          if (node.type.name === 'marginNoteBlock') {
            currentNoteId = node.attrs.noteId;
            break;
          }
        }

        if (currentNoteId !== lastFocusedNoteId.current) {
          lastFocusedNoteId.current = currentNoteId;
          onNoteBlockFocus?.(currentNoteId);
          if (currentNoteId) {
            setFocusedEditor(currentNoteId);
          }
        }
      },
      onFocus: ({ editor }) => {
        onFocus?.();
        
        // When margin editor gets focus, detect which note block and set focus
        const { $from } = editor.state.selection;
        let currentNoteId: string | null = null;
        
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d);
          if (node.type.name === 'marginNoteBlock') {
            currentNoteId = node.attrs.noteId;
            break;
          }
        }

        if (currentNoteId) {
          lastFocusedNoteId.current = currentNoteId;
          onNoteBlockFocus?.(currentNoteId);
          setFocusedEditor(currentNoteId);
        }
      },
      onBlur: () => {
        onBlur?.();
        // Don't clear focusedEditor on blur - let the next focus event set it
        // This prevents toolbar clicks from losing the focus state
        lastFocusedNoteId.current = null;
        onNoteBlockFocus?.(null);
        // setFocusedEditor(null); // Removed - causes toolbar to not work
      },
      editorProps: {
        attributes: {
          class: 'margin-editor-content',
        },
      },
    });

    // Focus a specific note block by noteId
    const focusNoteBlock = useCallback((noteId: string) => {
      if (!editor) return;
      
      const { doc } = editor.state;
      let targetPos: number | null = null;

      doc.descendants((node, pos) => {
        if (node.type.name === 'marginNoteBlock' && node.attrs.noteId === noteId) {
          // Position inside the first child (paragraph)
          targetPos = pos + 2; // +1 for entering the block, +1 for entering paragraph
          return false;
        }
        return true;
      });

      if (targetPos !== null) {
        editor.chain().focus().setTextSelection(targetPos).run();
      }
    }, [editor]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getContent: () => {
        if (editor) {
          return Promise.resolve({
            html: editor.getHTML(),
            json: editor.getJSON(),
          });
        }
        return Promise.resolve(null);
      },
      setContent: (content: string) => {
        editor?.commands.setContent(content);
      },
      insertNoteBlock: (noteId: string, noteIndex: number) => {
        if (editor) {
          // Insert the note block
          editor.chain().insertMarginNoteBlock(noteId, noteIndex).run();
          
          // After insertion, find and focus the new note block
          // Need to search for it since position changed
          const { doc } = editor.state;
          let targetPos: number | null = null;

          doc.descendants((node, pos) => {
            if (node.type.name === 'marginNoteBlock' && node.attrs.noteId === noteId) {
              targetPos = pos + 2; // +1 for block, +1 for paragraph
              return false;
            }
            return true;
          });

          if (targetPos !== null) {
            editor.chain().focus().setTextSelection(targetPos).run();
            // Manually set the focused editor since we know which note
            lastFocusedNoteId.current = noteId;
            onNoteBlockFocus?.(noteId);
            setFocusedEditor(noteId);
            console.log('insertNoteBlock: set focusedEditor to', noteId);
          } else {
            console.log('insertNoteBlock: could not find note block', noteId);
          }
        }
      },
      deleteNoteBlock: (noteId: string) => {
        editor?.commands.deleteMarginNoteBlock(noteId);
      },
      updateNoteBlockIndex: (noteId: string, noteIndex: number) => {
        editor?.commands.updateMarginNoteBlockIndex(noteId, noteIndex);
      },
      updateAllNoteBlockIndices: (indices: { noteId: string; noteIndex: number }[]) => {
        if (!editor) return;
        // Update all in a single transaction
        const { tr, doc } = editor.state;
        
        doc.descendants((node, pos) => {
          if (node.type.name === 'marginNoteBlock') {
            const update = indices.find(i => i.noteId === node.attrs.noteId);
            if (update && update.noteIndex !== node.attrs.noteIndex) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                noteIndex: update.noteIndex,
              });
            }
          }
          return true;
        });
        
        if (tr.docChanged) {
          editor.view.dispatch(tr);
        }
      },
      focus: () => {
        editor?.commands.focus();
      },
      blur: () => {
        editor?.commands.blur();
      },
      focusNoteBlock,
      toggleBold: () => {
        console.log('MarginEditor.toggleBold called, editor:', !!editor);
        if (editor) {
          const result = editor.chain().focus().toggleBold().run();
          console.log('toggleBold result:', result);
        }
      },
      toggleItalic: () => {
        editor?.chain().focus().toggleItalic().run();
      },
      insertSquare: (attrs?: SquareAttributes) => {
        editor?.chain().focus().insertSquare(attrs || {}).run();
      },
      insertCircle: (attrs?: CircleAttributes) => {
        editor?.chain().focus().insertCircle(attrs || {}).run();
      },
      insertFlower: (attrs?: FlowerAttributes) => {
        editor?.chain().focus().insertFlower(attrs || {}).run();
      },
    }), [editor, focusNoteBlock]);

    // Check if editor has any marginNoteBlock content
    const hasNotes = editor?.state.doc.content.size > 4; // Empty doc has size 4 (<doc><p></p></doc>)

    return (
      <View style={[styles.container, style]}>
        {!hasNotes && (
          <View style={styles.emptyState} pointerEvents="none">
            <Text style={styles.emptyText}>No notes</Text>
            <Text style={styles.emptyHint}>Click 📝 to add a note</Text>
          </View>
        )}
        <View style={styles.editorWrapper}>
          <EditorContent editor={editor} style={styles.editorContent} />
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
    padding: 8,
    position: 'relative',
  },
  editorWrapper: {
    flex: 1,
  },
  editorContent: {
    flex: 1,
  } as any,
  emptyState: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  } as any,
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 12,
    color: '#999',
  },
});

export default MarginEditor;
