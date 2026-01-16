/**
 * Focus State Machine
 * 
 * A deterministic finite automaton (DFA) for managing focus state
 * across the main editor and margin notes.
 * 
 * States:
 * - IDLE: No editor is focused
 * - MAIN_FOCUSED: Main editor has focus
 * - NOTE_FOCUSED: A specific margin note has focus
 * 
 * This replaces scattered conditionals with a single, testable state machine.
 */

// ============================================
// STATE TYPES
// ============================================

export type FocusState =
  | { type: 'IDLE' }
  | { type: 'MAIN_FOCUSED' }
  | { type: 'NOTE_FOCUSED'; noteId: string };

// ============================================
// EVENT TYPES
// ============================================

export type FocusEvent =
  | { type: 'MAIN_EDITOR_FOCUS' }
  | { type: 'MAIN_EDITOR_BLUR' }
  | { type: 'NOTE_FOCUS'; noteId: string }
  | { type: 'NOTE_BLUR' }
  | { type: 'RESET' };

// ============================================
// INITIAL STATE
// ============================================

export const initialFocusState: FocusState = { type: 'IDLE' };

// ============================================
// REDUCER (State Machine Transition Function)
// ============================================

/**
 * Focus state reducer - implements the DFA transition function.
 * 
 * Transition Table:
 * 
 * | Current State  | Event              | Next State           |
 * |----------------|--------------------|-----------------------|
 * | IDLE           | MAIN_EDITOR_FOCUS  | MAIN_FOCUSED         |
 * | IDLE           | NOTE_FOCUS         | NOTE_FOCUSED         |
 * | IDLE           | *                  | IDLE                 |
 * | MAIN_FOCUSED   | MAIN_EDITOR_BLUR   | IDLE                 |
 * | MAIN_FOCUSED   | NOTE_FOCUS         | NOTE_FOCUSED         |
 * | MAIN_FOCUSED   | *                  | MAIN_FOCUSED         |
 * | NOTE_FOCUSED   | NOTE_BLUR          | IDLE                 |
 * | NOTE_FOCUSED   | MAIN_EDITOR_FOCUS  | MAIN_FOCUSED         |
 * | NOTE_FOCUSED   | NOTE_FOCUS         | NOTE_FOCUSED (new id)|
 * | NOTE_FOCUSED   | *                  | NOTE_FOCUSED         |
 * | *              | RESET              | IDLE                 |
 */
export function focusReducer(state: FocusState, event: FocusEvent): FocusState {
  // RESET always goes to IDLE
  if (event.type === 'RESET') {
    return { type: 'IDLE' };
  }

  switch (state.type) {
    case 'IDLE':
      switch (event.type) {
        case 'MAIN_EDITOR_FOCUS':
          return { type: 'MAIN_FOCUSED' };
        case 'NOTE_FOCUS':
          return { type: 'NOTE_FOCUSED', noteId: event.noteId };
        default:
          return state;
      }

    case 'MAIN_FOCUSED':
      switch (event.type) {
        case 'MAIN_EDITOR_BLUR':
          return { type: 'IDLE' };
        case 'NOTE_FOCUS':
          return { type: 'NOTE_FOCUSED', noteId: event.noteId };
        default:
          return state;
      }

    case 'NOTE_FOCUSED':
      switch (event.type) {
        case 'NOTE_BLUR':
          return { type: 'IDLE' };
        case 'MAIN_EDITOR_FOCUS':
          return { type: 'MAIN_FOCUSED' };
        case 'NOTE_FOCUS':
          // Transition to same state with new noteId
          return { type: 'NOTE_FOCUSED', noteId: event.noteId };
        default:
          return state;
      }

    default:
      return state;
  }
}

// ============================================
// SELECTOR FUNCTIONS
// ============================================

/**
 * Check if the main editor is focused.
 */
export function isMainFocused(state: FocusState): boolean {
  return state.type === 'MAIN_FOCUSED';
}

/**
 * Check if any note is focused.
 */
export function isNoteFocused(state: FocusState): boolean {
  return state.type === 'NOTE_FOCUSED';
}

/**
 * Get the focused note ID, or null if no note is focused.
 */
export function getFocusedNoteId(state: FocusState): string | null {
  return state.type === 'NOTE_FOCUSED' ? state.noteId : null;
}

/**
 * Check if a specific note is focused.
 */
export function isSpecificNoteFocused(state: FocusState, noteId: string): boolean {
  return state.type === 'NOTE_FOCUSED' && state.noteId === noteId;
}

/**
 * Determine which editor should receive toolbar actions.
 * Returns null if no editor is focused (toolbar should be disabled).
 */
export function getToolbarTarget(state: FocusState): 'main' | 'margin' | null {
  switch (state.type) {
    case 'MAIN_FOCUSED':
      return 'main';
    case 'NOTE_FOCUSED':
      return 'margin';
    case 'IDLE':
      return null;
  }
}

/**
 * Check if any editor is focused (toolbar should be enabled).
 */
export function hasAnyFocus(state: FocusState): boolean {
  return state.type !== 'IDLE';
}

// ============================================
// DEBUG HELPERS
// ============================================

/**
 * Format state for logging.
 */
export function formatFocusState(state: FocusState): string {
  switch (state.type) {
    case 'IDLE':
      return 'IDLE';
    case 'MAIN_FOCUSED':
      return 'MAIN_FOCUSED';
    case 'NOTE_FOCUSED':
      return `NOTE_FOCUSED(${state.noteId})`;
  }
}

/**
 * Format event for logging.
 */
export function formatFocusEvent(event: FocusEvent): string {
  switch (event.type) {
    case 'MAIN_EDITOR_FOCUS':
      return 'MAIN_EDITOR_FOCUS';
    case 'MAIN_EDITOR_BLUR':
      return 'MAIN_EDITOR_BLUR';
    case 'NOTE_FOCUS':
      return `NOTE_FOCUS(${event.noteId})`;
    case 'NOTE_BLUR':
      return 'NOTE_BLUR';
    case 'RESET':
      return 'RESET';
  }
}

/**
 * Create a logging wrapper for the reducer.
 * Use this in development to trace state transitions.
 */
export function createLoggingReducer(
  prefix: string = '[Focus]'
): (state: FocusState, event: FocusEvent) => FocusState {
  return (state: FocusState, event: FocusEvent): FocusState => {
    const nextState = focusReducer(state, event);
    
    if (nextState !== state) {
      console.log(
        prefix,
        formatFocusState(state),
        '→',
        formatFocusState(nextState),
        `(${formatFocusEvent(event)})`
      );
    }
    
    return nextState;
  };
}
