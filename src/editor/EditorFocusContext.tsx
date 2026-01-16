/**
 * EditorFocusContext - Backwards Compatibility Layer
 * 
 * This file is DEPRECATED. Use MarginNotesContext directly for new code.
 * 
 * This re-exports from the new MarginNotesContext to maintain backwards
 * compatibility during the migration period.
 * 
 * @deprecated Use MarginNotesContext instead
 */

export {
  // The new provider includes all focus functionality
  MarginNotesProvider as EditorFocusProvider,
  
  // Use the backwards-compatible hook
  useEditorFocus,
} from '../margin-notes/MarginNotesContext';

// Re-export the type for backwards compatibility
export type { FocusedEditor } from '../margin-notes/MarginNotesContext';
