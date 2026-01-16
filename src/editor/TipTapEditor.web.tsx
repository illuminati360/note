import { useImperativeHandle, forwardRef, useRef, useCallback, CSSProperties } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ViewStyle } from 'react-native';
import { Square, Circle, Flower, MarginNote, NoteHighlight } from '@prose/tiptap-extensions';
import type { TipTapEditorRef, EditorState, EditorContent as EditorContentType, MarginNoteData, SquareAttributes, CircleAttributes, FlowerAttributes } from './TipTapEditor';
import styles from './TipTapEditor.module.css';

export interface TipTapEditorWebProps {
  initialContent?: string;
  onContentChange?: (content: EditorContentType) => void;
  onSelectionChange?: (state: EditorState) => void;
  onReady?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onAnchorPositions?: (positions: MarginNoteData[]) => void;
  onMarginNoteDeleted?: (id: string) => void;
  style?: ViewStyle;
}

export const TipTapEditorWeb = forwardRef<TipTapEditorRef, TipTapEditorWebProps>(
  ({ initialContent, onContentChange, onSelectionChange, onReady, onFocus, onBlur, onAnchorPositions, onMarginNoteDeleted, style }, ref) => {
    // Track previous anchor IDs to detect deletions
    const previousAnchorIdsRef = useRef<Set<string>>(new Set());

    // Get anchor positions from the editor document
    const getAnchorPositionsFromEditor = useCallback((editorInstance: any) => {
      if (!editorInstance) return [];
      
      const positions: MarginNoteData[] = [];
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
    const sendAnchorPositions = useCallback((editorInstance: any) => {
      const positions = getAnchorPositionsFromEditor(editorInstance);
      
      // Detect deleted anchors
      const currentIds = new Set(positions.map(p => p.id));
      previousAnchorIdsRef.current.forEach(id => {
        if (!currentIds.has(id)) {
          // Clean up the highlight associated with this deleted anchor
          // (the anchor is already deleted, but the highlight may remain)
          editorInstance.commands.deleteMarginNote(id);
          
          onMarginNoteDeleted?.(id);
        }
      });
      previousAnchorIdsRef.current = currentIds;
      
      onAnchorPositions?.(positions);
    }, [getAnchorPositionsFromEditor, onAnchorPositions, onMarginNoteDeleted]);

    const editor = useEditor({
      extensions: [StarterKit, Square, Circle, Flower, MarginNote, NoteHighlight],
      content: initialContent || '',
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
      onFocus: () => {
        onFocus?.();
      },
      onBlur: () => {
        onBlur?.();
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
      <div 
        className={styles.wrapper}
        style={style as CSSProperties}
      >
        <EditorContent editor={editor} />
      </div>
    );
  }
);

export default TipTapEditorWeb;
