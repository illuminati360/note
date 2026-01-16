/**
 * Margin Notes Module
 * 
 * This module provides the core logic for managing margin notes:
 * - Focus state machine for deterministic focus tracking
 * - Reconciler for syncing anchors with note blocks
 * - React context for state management
 * - Type definitions
 */

// Focus State Machine
export {
  focusReducer,
  initialFocusState,
  isMainFocused,
  isNoteFocused,
  getFocusedNoteId,
  isSpecificNoteFocused,
  getToolbarTarget,
  hasAnyFocus,
  formatFocusState,
  formatFocusEvent,
  createLoggingReducer,
  type FocusState,
  type FocusEvent,
} from './FocusStateMachine';

// Reconciler
export {
  reconcile,
  getNoteById,
  getNextNoteIndex,
  hasNote,
  formatReconcilerOutput,
  createLoggingReconciler,
  type ReconcilerInput,
  type ReconcilerOutput,
  type ReconcilerDiff,
} from './MarginNoteReconciler';

// React Context
export {
  MarginNotesProvider,
  useMarginNotes,
  useFocus,
  type MarginNotesContextType,
  type MarginNotesProviderProps,
} from './MarginNotesContext';

// Types
export type { NoteData, AnchorData } from './types';
