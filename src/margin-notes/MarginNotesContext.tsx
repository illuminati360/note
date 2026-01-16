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
    }),
    [
      focusState,
      dispatchFocus,
      focusMainEditor,
      focusNote,
      blurMainEditor,
      blurNote,
      resetFocus,
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

export default MarginNotesContext;
