import React, { useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Square, Circle, Flower, MarginNote } from '@prose/tiptap-extensions';
import type { TipTapEditorRef, EditorState, EditorContent as EditorContentType, AnchorPosition, SquareAttributes, CircleAttributes, FlowerAttributes } from './TipTapEditor';

export interface TipTapEditorWebProps {
  initialContent?: string;
  onContentChange?: (content: EditorContentType) => void;
  onSelectionChange?: (state: EditorState) => void;
  onReady?: () => void;
  onAnchorPositions?: (positions: AnchorPosition[]) => void;
  onMarginNoteDeleted?: (id: string) => void;
  style?: ViewStyle;
}

export const TipTapEditorWeb = forwardRef<TipTapEditorRef, TipTapEditorWebProps>(
  ({ initialContent, onContentChange, onSelectionChange, onReady, onAnchorPositions, onMarginNoteDeleted, style }, ref) => {
    // Track previous anchor IDs to detect deletions
    const previousAnchorIdsRef = React.useRef<Set<string>>(new Set());

    // Get anchor positions from the editor document
    const getAnchorPositionsFromEditor = React.useCallback((editorInstance: any) => {
      if (!editorInstance) return [];
      
      const positions: AnchorPosition[] = [];
      let blockIndex = 0;
      let line = 0;
      
      editorInstance.state.doc.descendants((node: any, pos: number) => {
        if (node.isBlock) {
          blockIndex++;
          line++;
        }
        
        if (node.type.name === 'marginNote') {
          positions.push({
            id: node.attrs.id,
            noteIndex: node.attrs.noteIndex,
            line,
            blockIndex,
          });
        }
        
        return true;
      });
      
      return positions;
    }, []);

    // Send anchor positions and detect deletions
    const sendAnchorPositions = React.useCallback((editorInstance: any) => {
      const positions = getAnchorPositionsFromEditor(editorInstance);
      
      // Detect deleted anchors
      const currentIds = new Set(positions.map(p => p.id));
      previousAnchorIdsRef.current.forEach(id => {
        if (!currentIds.has(id)) {
          onMarginNoteDeleted?.(id);
        }
      });
      previousAnchorIdsRef.current = currentIds;
      
      onAnchorPositions?.(positions);
    }, [getAnchorPositionsFromEditor, onAnchorPositions, onMarginNoteDeleted]);

    const editor = useEditor({
      extensions: [StarterKit, Square, Circle, Flower, MarginNote],
      content: initialContent || '<p>Start typing...</p>',
      onUpdate: ({ editor }) => {
        onContentChange?.({
          html: editor.getHTML(),
          json: editor.getJSON(),
        });
        // Send anchor positions on update
        sendAnchorPositions(editor);
      },
      onSelectionUpdate: ({ editor }) => {
        onSelectionChange?.({
          isBold: editor.isActive('bold'),
          isItalic: editor.isActive('italic'),
          isStrike: editor.isActive('strike'),
          isCode: editor.isActive('code'),
          isBulletList: editor.isActive('bulletList'),
          isOrderedList: editor.isActive('orderedList'),
          isHeading: editor.isActive('heading'),
        });
      },
      onCreate: () => {
        onReady?.();
      },
    });

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      setContent: (content: string) => {
        editor?.commands.setContent(content);
      },
      getContent: () => {
        // Web version is synchronous, but wrapped in Promise for API consistency
        if (editor) {
          return Promise.resolve({
            html: editor.getHTML(),
            json: editor.getJSON(),
          });
        }
        return Promise.resolve(null);
      },
      focus: () => {
        editor?.commands.focus();
      },
      blur: () => {
        editor?.commands.blur();
      },
      toggleBold: () => {
        editor?.chain().focus().toggleBold().run();
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
      insertMarginNote: (id: string, noteIndex: number) => {
        editor?.chain().focus().insertMarginNote(id, noteIndex).run();
        if (editor) {
          sendAnchorPositions(editor);
        }
      },
      deleteMarginNote: (id: string) => {
        editor?.chain().focus().deleteMarginNote(id).run();
        if (editor) {
          sendAnchorPositions(editor);
        }
      },
      getAnchorPositions: () => {
        if (editor) {
          sendAnchorPositions(editor);
        }
      },
    }), [editor, sendAnchorPositions]);

    return (
      <View style={[styles.container, style]}>
        <EditorContent editor={editor} style={styles.editorContent} />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  editorContent: {
    flex: 1,
    padding: 16,
  } as any,
});

export default TipTapEditorWeb;
