import { Platform } from 'react-native';

export type { TipTapEditorRef, TipTapEditorProps, EditorState, EditorContent, AnchorPosition } from './TipTapEditor';
export type { MarginEditorRef, MarginEditorProps } from './MarginEditor';
export { editorHtml } from './editorHtml';
export { EditorFocusProvider, useEditorFocus, type FocusedEditor } from './EditorFocusContext';

// Platform-specific exports
export const TipTapEditor = Platform.select({
  web: () => require('./TipTapEditor.web').TipTapEditorWeb,
  default: () => require('./TipTapEditor').TipTapEditor,
})();

export const MarginEditor = Platform.select({
  web: () => require('./MarginEditor.web').MarginEditor,
  default: () => require('./MarginEditor').MarginEditor,
})();
