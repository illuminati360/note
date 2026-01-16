/**
 * EditorFocusContext - Re-exports from MarginNotesContext
 * 
 * All focus management has been moved to the margin-notes module.
 * This file re-exports the relevant APIs for editor-focused use cases.
 */

export {
  MarginNotesProvider,
  useMarginNotes,
  useFocus,
  type MarginNotesContextType,
  type MarginNotesProviderProps,
} from '../margin-notes';
