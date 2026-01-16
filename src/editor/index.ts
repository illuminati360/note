import { Platform } from 'react-native';

export type { TipTapEditorRef, TipTapEditorProps, EditorState, EditorContent, MarginNoteData } from './TipTapEditor';
export type { MarginEditorRef, MarginEditorProps } from './MarginEditor';
export { editorHtml } from './editorHtml';

// Focus context (from margin-notes module)
export {
  MarginNotesProvider,
  useMarginNotes,
  useFocus,
  type MarginNotesContextType,
  type MarginNotesProviderProps,
} from '../margin-notes';

// Platform-specific exports
export const TipTapEditor = Platform.select({
  web: () => require('./TipTapEditor.web').TipTapEditorWeb,
  default: () => require('./TipTapEditor').TipTapEditor,
})();

export const MarginEditor = Platform.select({
  web: () => require('./MarginEditor.web').MarginEditor,
  default: () => require('./MarginEditor').MarginEditor,
})();
