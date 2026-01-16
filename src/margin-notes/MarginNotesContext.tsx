/**
 * Margin Notes Context
 * 
 * Provides the focus state machine and note management to the React tree.
 * This replaces the scattered focus logic with a deterministic state machine.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

import {
  focusReducer,
  initialFocusState,
  isMainFocused,
  getFocusedNoteId,
  getToolbarTarget,
  hasAnyFocus,
  formatFocusState,
  formatFocusEvent,
  FocusState,
  FocusEvent,
} from './FocusStateMachine';

// ============================================
// CONTEXT TYPES
// ============================================

/**
 * Represents which editor is currently focused.
 * - 'main' = main editor
 * - string (other) = note ID
 * - null = nothing focused
 */
export type FocusedEditor = 'main' | string | null;

export interface MarginNotesContextType {
  // Focus state (read-only)
  focusState: FocusState;
  
  // Focus derived values
  isMainEditorFocused: boolean;
  focusedNoteId: string | null;
  toolbarTarget: 'main' | 'margin' | null;
  hasAnyEditorFocus: boolean;
  
  // Focus actions
  dispatchFocus: (event: FocusEvent) => void;
  
  // Convenience methods for common focus transitions
  focusMainEditor: () => void;
  focusNote: (noteId: string) => void;
  blurMainEditor: () => void;
  blurNote: () => void;
  resetFocus: () => void;
  
  // Legacy compatibility (maps to state machine)
  /** @deprecated Use focusState directly */
  focusedEditor: FocusedEditor;
  /** @deprecated Use dispatchFocus with appropriate event */
  setFocusedEditor: (editor: FocusedEditor) => void;
}

// ============================================
// CONTEXT
// ============================================

const MarginNotesContext = createContext<MarginNotesContextType | null>(null);

// ============================================
// DEBUG FLAG
// ============================================

// __DEV__ is a React Native global; fallback to false for Jest/other environments
const DEBUG_FOCUS = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

// ============================================
// PROVIDER
// ============================================

export interface MarginNotesProviderProps {
  children: ReactNode;
  /** Enable debug logging for focus transitions */
  debugFocus?: boolean;
}

export function MarginNotesProvider({
  children,
  debugFocus = DEBUG_FOCUS,
}: MarginNotesProviderProps) {
  // Focus state machine
  const [focusState, dispatch] = useReducer(focusReducer, initialFocusState);

  // Dispatch with optional logging
  const dispatchFocus = useCallback(
    (event: FocusEvent) => {
      if (debugFocus) {
        const prevState = focusState;
        // We can't know the next state here without running the reducer,
        // but we'll log the event. The actual transition will be logged on next render.
        console.log(
          '[Focus]',
          formatFocusState(prevState),
          '+ event:',
          formatFocusEvent(event)
        );
      }
      dispatch(event);
    },
    [focusState, debugFocus]
  );

  // Convenience methods
  const focusMainEditor = useCallback(() => {
    dispatchFocus({ type: 'MAIN_EDITOR_FOCUS' });
  }, [dispatchFocus]);

  const focusNote = useCallback(
    (noteId: string) => {
      dispatchFocus({ type: 'NOTE_FOCUS', noteId });
    },
    [dispatchFocus]
  );

  const blurMainEditor = useCallback(() => {
    dispatchFocus({ type: 'MAIN_EDITOR_BLUR' });
  }, [dispatchFocus]);

  const blurNote = useCallback(() => {
    dispatchFocus({ type: 'NOTE_BLUR' });
  }, [dispatchFocus]);

  const resetFocus = useCallback(() => {
    dispatchFocus({ type: 'RESET' });
  }, [dispatchFocus]);

  // Legacy compatibility: convert state to old format
  const focusedEditor = useMemo((): FocusedEditor => {
    switch (focusState.type) {
      case 'MAIN_FOCUSED':
        return 'main';
      case 'NOTE_FOCUSED':
        return focusState.noteId;
      case 'IDLE':
        return null;
    }
  }, [focusState]);

  // Legacy compatibility: convert old setter to state machine events
  const setFocusedEditor = useCallback(
    (editor: FocusedEditor) => {
      if (editor === null) {
        // Blur current editor
        if (focusState.type === 'MAIN_FOCUSED') {
          dispatchFocus({ type: 'MAIN_EDITOR_BLUR' });
        } else if (focusState.type === 'NOTE_FOCUSED') {
          dispatchFocus({ type: 'NOTE_BLUR' });
        }
      } else if (editor === 'main') {
        dispatchFocus({ type: 'MAIN_EDITOR_FOCUS' });
      } else {
        dispatchFocus({ type: 'NOTE_FOCUS', noteId: editor });
      }
    },
    [focusState, dispatchFocus]
  );

  // Derived values
  const contextValue = useMemo(
    (): MarginNotesContextType => ({
      focusState,
      isMainEditorFocused: isMainFocused(focusState),
      focusedNoteId: getFocusedNoteId(focusState),
      toolbarTarget: getToolbarTarget(focusState),
      hasAnyEditorFocus: hasAnyFocus(focusState),
      dispatchFocus,
      focusMainEditor,
      focusNote,
      blurMainEditor,
      blurNote,
      resetFocus,
      // Legacy
      focusedEditor,
      setFocusedEditor,
    }),
    [
      focusState,
      dispatchFocus,
      focusMainEditor,
      focusNote,
      blurMainEditor,
      blurNote,
      resetFocus,
      focusedEditor,
      setFocusedEditor,
    ]
  );

  return (
    <MarginNotesContext.Provider value={contextValue}>
      {children}
    </MarginNotesContext.Provider>
  );
}

// ============================================
// HOOKS
// ============================================

/**
 * Access the margin notes context.
 * Must be used within a MarginNotesProvider.
 */
export function useMarginNotes(): MarginNotesContextType {
  const context = useContext(MarginNotesContext);
  if (!context) {
    throw new Error('useMarginNotes must be used within a MarginNotesProvider');
  }
  return context;
}

/**
 * Access only the focus-related state and actions.
 * Lighter weight than useMarginNotes if you only need focus.
 */
export function useFocus() {
  const {
    focusState,
    isMainEditorFocused,
    focusedNoteId,
    toolbarTarget,
    hasAnyEditorFocus,
    dispatchFocus,
    focusMainEditor,
    focusNote,
    blurMainEditor,
    blurNote,
    resetFocus,
  } = useMarginNotes();

  return {
    focusState,
    isMainEditorFocused,
    focusedNoteId,
    toolbarTarget,
    hasAnyEditorFocus,
    dispatchFocus,
    focusMainEditor,
    focusNote,
    blurMainEditor,
    blurNote,
    resetFocus,
  };
}

/**
 * Legacy hook for backwards compatibility.
 * @deprecated Use useMarginNotes() or useFocus() instead.
 */
export function useEditorFocus() {
  const { focusedEditor, setFocusedEditor, isMainEditorFocused, focusedNoteId } =
    useMarginNotes();

  return {
    focusedEditor,
    setFocusedEditor,
    isMainEditorFocused,
    focusedNoteId,
  };
}

export default MarginNotesContext;
