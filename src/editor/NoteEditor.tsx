import React, { useImperativeHandle, forwardRef, useState, useRef } from 'react';
import { TextInput, StyleSheet, View, ViewStyle } from 'react-native';
import type { EditorState, EditorContent as EditorContentType, SquareAttributes, CircleAttributes, FlowerAttributes } from './TipTapEditor';

// Native fallback - uses TextInput (no rich text)
// For full TipTap support on native, would need individual WebViews per note

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
  getEditor: () => any;
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
    const [content, setContent] = useState(initialContent || '');
    const inputRef = useRef<TextInput>(null);

    const handleChange = (text: string) => {
      setContent(text);
      onContentChange?.({
        html: `<p>${text}</p>`,
        json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
      });
    };

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      setContent: (html: string) => {
        // Simple HTML stripping for native
        const text = html.replace(/<[^>]*>/g, '');
        setContent(text);
      },
      getContent: () => {
        return Promise.resolve({
          html: `<p>${content}</p>`,
          json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }] },
        });
      },
      focus: () => {
        inputRef.current?.focus();
      },
      blur: () => {
        inputRef.current?.blur();
      },
      // These are no-ops in native fallback
      toggleBold: () => {},
      toggleItalic: () => {},
      insertSquare: () => {},
      insertCircle: () => {},
      insertFlower: () => {},
      getEditor: () => null,
    }), [content]);

    return (
      <View style={[styles.container, style]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={content}
          onChangeText={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          multiline
          placeholder={placeholder || 'Add note...'}
          placeholderTextColor="#999"
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 0,
    textAlignVertical: 'top',
  },
});

export default NoteEditor;
