import { Platform } from 'react-native';

export type { TipTapEditorRef, TipTapEditorProps, EditorState, EditorContent, AnchorPosition } from './TipTapEditor';
export type { NoteEditorRef, NoteEditorProps } from './NoteEditor';
export { editorHtml } from './editorHtml';
export { EditorFocusProvider, useEditorFocus, type FocusedEditor } from './EditorFocusContext';

// Platform-specific exports
export const TipTapEditor = Platform.select({
  web: () => require('./TipTapEditor.web').TipTapEditorWeb,
  default: () => require('./TipTapEditor').TipTapEditor,
})();

export const NoteEditor = Platform.select({
  web: () => require('./NoteEditor.web').NoteEditor,
  default: () => require('./NoteEditor').NoteEditor,
})();
