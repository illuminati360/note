import { Platform } from 'react-native';

export type { TipTapEditorRef, TipTapEditorProps, EditorState, EditorContent, AnchorPosition } from './TipTapEditor';
export { editorHtml } from './editorHtml';

// Platform-specific exports
export const TipTapEditor = Platform.select({
  web: () => require('./TipTapEditor.web').TipTapEditorWeb,
  default: () => require('./TipTapEditor').TipTapEditor,
})();
