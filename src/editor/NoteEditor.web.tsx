import React, { useImperativeHandle, forwardRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Square, Circle, Flower, NoteHighlight } from '@prose/tiptap-extensions';
import type { EditorState, EditorContent as EditorContentType, SquareAttributes, CircleAttributes, FlowerAttributes } from './TipTapEditor';

// Simplified ref interface for note editors (no margin note commands)
export interface NoteEditorRef {
  setContent: (content: string) => void;
  getContent: () => Promise<EditorContentType | null>;
  focus: () => void;
  blur: () => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  insertSquare: (attrs?: SquareAttributes) => void;
  insertCircle: (attrs?: CircleAttributes) => void;
  insertFlower: (attrs?: FlowerAttributes) => void;
  getEditor: () => any; // Access the raw editor for toolbar state
}

export interface NoteEditorProps {
  noteId: string;
  initialContent?: string;
  onContentChange?: (content: EditorContentType) => void;
  onSelectionChange?: (state: EditorState) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: ViewStyle;
  placeholder?: string;
}

export const NoteEditor = forwardRef<NoteEditorRef, NoteEditorProps>(
  ({ noteId, initialContent, onContentChange, onSelectionChange, onFocus, onBlur, style, placeholder }, ref) => {
    const editor = useEditor({
      // Use StarterKit + shapes but NOT MarginNote (no nesting)
      extensions: [
        StarterKit.configure({
          // Simpler config for notes
          heading: false, // No headings in notes
          codeBlock: false, // No code blocks
          horizontalRule: false,
        }),
        Square,
        Circle,
        Flower,
        NoteHighlight,
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
      },
      onFocus: () => {
        onFocus?.();
      },
      onBlur: () => {
        onBlur?.();
      },
      editorProps: {
        attributes: {
          class: 'note-editor-content',
          'data-placeholder': placeholder || 'Add note...',
        },
      },
    });

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      setContent: (content: string) => {
        editor?.commands.setContent(content);
      },
      getContent: () => {
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
      getEditor: () => editor,
    }), [editor]);

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
    minHeight: 40,
  },
  editorContent: {
    flex: 1,
  } as any,
});

export default NoteEditor;
